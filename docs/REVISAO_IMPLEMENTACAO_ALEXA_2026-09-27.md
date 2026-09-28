# Revisão das correções Alexa — 27/09/2026

## Resultado

**Implementação parcialmente corrigida, ainda inadequada para entrega.** Há duas regressões que impedem as transações de criação de pedidos e aprovação de pareamento. Também continuam falhas de identidade, revisão, concorrência e interpretação monetária.

Revisão das alterações locais sobre o commit `2480261`, incluindo o novo teste `tests/unit/alexa/alexa-senior-audit.test.ts`. A implementação não foi modificada nesta revisão.

## Achados por prioridade

### 1. Bloqueador — criação de pedidos rejeitada pelo Firestore

**Referências:** `functions/alexa/orderService.js:217-221`; `functions/alexa/rateLimit.js:161-190`.

O helper de rate limit agora participa da transação, mas já executa `transaction.set` nos contadores. Depois dele, o serviço tenta ler `users/{uid}/metadata/counters`. O SDK não permite leituras depois de escritas na mesma transação.

Reproduzido com a classe Transaction do SDK instalado, usando snapshots locais na fase inicial de leitura e o método real do SDK após a primeira escrita:

    Firestore transactions require all reads to be executed before all writes.

**Impacto:** toda criação nova que passa pelas validações e chega a essa etapa falha, por voz ou pelo app. Replay de recibo existente não percorre essa etapa.

**Correção:** concluir todas as leituras, incluindo cotas e contador sequencial, antes de enfileirar qualquer escrita. Preferir separar cálculo/validação das cotas de suas escritas.

### 2. Bloqueador — aprovação de pareamento também rejeitada pelo Firestore

**Referência:** `functions/alexa/pairing.js:173-199`.

O código consome o desafio com `transaction.update` e grava o vínculo com `transaction.set`, depois tenta ler a permissão existente para preservar o modo. A mesma restrição do Firestore impede concluir qualquer pareamento válido que chegue a essa etapa.

**Reprodução:** mesmo erro do SDK do achado 1. Ler a permissão antes da primeira escrita resolve a ordem das operações; validar também preservação de modo em teste real de transação.

### 3. Alta — confirmação ainda aceita identidade herdada

**Referências:** `functions/alexa/dialog.js:525-530`; `functions/alexa/authorization.js:44-58`.

`physicalPersonId` usa `identity.personId` como fallback, mas essa identidade continua sendo obtida dos atributos da sessão quando a requisição atual não identifica a pessoa. O comentário de biometria obrigatória não corresponde ao comportamento.

Em simulação com banco em memória, um YesIntent sem `context.System.person` e com identidade anterior na sessão chegou a `committed`. Essa simulação isola a falha de identidade do erro de transação do achado 1; não afirma sucesso de commit em produção no estado atual.

**Correção:** no aceite final, exigir personId atual do envelope validado. Não usar atributos de sessão nem identidade derivada deles como prova da pessoa que disse “sim”.

### 4. Alta — edição de usuário consulta o alvo, mas continua lendo o campo errado

**Referências:** `functions/alexa/callables.js:175-180,242-243`; `src/app/pages/Users.tsx:236-243`; `src/services/firebaseAlexaService.ts:18-25`.

O backend passou a retornar `targetPermission`. O formulário continua lendo `st.userPermission`, que pertence ao administrador conectado. O serviço repassa a resposta sem remapear esse campo. Assim, ao editar outra pessoa, a tela ainda mostra Alexa desabilitada e modo padrão.

O novo `alexaDirty` evita a revogação ao salvar apenas o nome, o que é uma melhoria. Porém, habilitar o controle exibido incorretamente pode substituir `app_approval` por `voice_confirm`. Faltam estado de carregamento, tratamento de erro e proteção contra respostas de uma consulta anterior ao trocar o usuário.

**Correção:** tipar e consumir `targetPermission`; só permitir edição após carregar o estado correto e descartar respostas obsoletas.

### 5. Alta — deduplicação não é atômica e gravação não é aguardada

**Referências:** `functions/alexa/index.js:69-87,103-113,188-200`.

A implementação faz `get`, executa a operação e depois `set`. Não reserva a requisição atomicamente. Duas chamadas simultâneas podem ler ausência e executar ambas. A gravação de cache também não tem `await`, portanto a função responde antes de confirmar sua persistência; falhas podem ser ignoradas.

**Reprodução:** duas chamadas simultâneas de LinkVoiceIntent com o mesmo requestId produziram dois desafios e respostas diferentes no banco em memória. O teste novo só cobre a leitura de um cache previamente preenchido, sem testar corrida ou falha de persistência.

Além disso, a resposta inteira de pareamento é armazenada e contém o código em texto. Isso amplia a retenção de um dado que antes era persistido apenas como HMAC na coleção de desafios. A resposta de resumo pode conter nome e dados do pedido.

**Correção:** aquisição atômica com estados e recuperação de falhas; aguardar persistência necessária; definir retenção e proteção dos dados da resposta. A duração gravada é 150 segundos, e não as 24 horas da especificação; não há política TTL declarada no repositório nem verificação de expiração na leitura do cache.

### 6. Alta — divergência de revisão atualiza a sessão sem apresentar os dados novos

**Referência:** `functions/alexa/dialog.js:549-556`.

Ao detectar revisão antiga, o código pergunta “Deseja revisar os dados do pedido?”, mas já devolve a revisão atual nos atributos. O próximo “sim” é interpretado como confirmação do pedido, sem ler o novo resumo.

**Reprodução:** rascunho revisão 2, sessão revisão 1; primeiro “sim” retorna a pergunta de revisão; segundo “sim” envia o rascunho para `awaiting_app_approval` sem apresentação dos dados. No canal de voz, o código segue para commit, atualmente bloqueado pelo achado 1. Revisão ausente também continua aceita.

**Correção:** reapresentar o resumo e exigir uma confirmação vinculada à revisão apresentada. Não tratar o aceite de “revisar” como aceite do pedido.

### 7. Alta — transições do diálogo continuam fora de transação

**Referências:** `functions/alexa/dialog.js:361-366,389-416,592-595,625-702`.

O carregamento filtra melhor os estados, mas leitura e escrita continuam separadas. Duas correções podem sobrescrever uma à outra; uma requisição atrasada pode sobrescrever cancelamento. Cancelamento e fallback também acessam o ID diretamente sem conferir titularidade/estado. Nenhum sessionId é persistido ou conferido no módulo.

**Reprodução:** duas correções concorrentes, uma de cliente e outra de produto, partindo da revisão 2. Resultado: apenas o produto foi alterado; cliente voltou ao valor original e revisão ficou em 3. Simulação de snapshots separados em memória, sem emulador.

**Correção:** comparação transacional de revisão, titularidade, sessão e estado em todas as mutações, incluindo cancelamento e fallback.

### 8. Alta — parser monetário continua aceitando valores errados

**Referência:** `functions/alexa/dialog.js:190-249`.

Os exemplos originais simples foram corrigidos. Outras entradas continuam incorretas:

| Entrada | Resultado observado |
| --- | --- |
| `1.500,00 reais` | `{ valid: true, price: 501 }` |
| `centavos` | `{ valid: true, price: 0 }` |
| `10 reais e 50 centavos depois desconto` | `{ valid: true, price: 10.5 }` |

O formato de milhar não aceita sufixo monetário e cai no parser por palavras, que transforma separadores em espaços e soma fragmentos. Expressões de centavos não exigem consumir a entrada inteira; partes ausentes viram zero.

**Correção:** parser integral, sem fallback que reinterprete números malformados como soma de palavras; exigir quantia explícita e rejeitar conteúdo excedente/ambíguo.

### 9. Média — novas exceções enfraquecem validações para acomodar testes

**Referências:** `functions/alexa/orderService.js:157-160,198-212`; `functions/alexa/authorization.js:182-192`.

O commit aceita perfil não funcionário sem objeto `permissions`, mesmo sem `orders.create === true`. A autorização normal de voz não aplica essa exceção. A conta Auth também pode ser considerada válida quando o Admin SDK não está inicializado; em certos caminhos, erros são ignorados nessa condição.

A aplicação principal inicializa Admin, portanto não é evidência de bypass remoto sob a configuração normal. Ainda assim, a biblioteca agora falha de forma permissiva em erro de inicialização e seus testes deixam de exigir Auth real ou um serviço injetado.

**Correção:** manter regras de produção estritas; injetar Auth explicitamente nos testes e ajustar fixtures de perfil. Também completar a validação de data no commit (atualmente só regex), impedir `null` virar preço zero e conferir ambiente do rascunho.

### 10. Média — normalização do ledger ainda altera o contrato e inventa datas

**Referências:** `src/hooks/useSalesLedger.ts:100-121`; `src/app/pages/Reports.tsx:113-120`; `functions/alexa/orderService.js:295-322`.

A data Timestamp agora é normalizada e o ledger novo ganhou quantidade/status/pagamento. Contudo, todas as tags do hook viram strings, descartando cor e demais atributos de Tag, inclusive de pedidos web. O ledger novo usa `['Alexa', 'Voz']`, diferente das tags do próprio pedido. O cast para SaleRecord esconde essa incompatibilidade.

Datas ausentes/inválidas são substituídas por hoje, o que pode atribuir vendas antigas ao período atual. Registros Alexa antigos continuam sem quantidade/status: converter a data não recupera esses dados.

**Correção:** normalizar mantendo o contrato Tag[] e preservar a semântica de data desconhecida; preparar reconciliação dos registros antigos usando os pedidos de origem quando disponíveis.

## O que melhorou

- Casos `1.500,00`, “dez reais e cinquenta centavos” e “cinquenta centavos” retornam os valores esperados.
- Datas civis impossíveis e quantidades fracionárias são rejeitadas na coleta.
- Restrição de dispositivo agora rejeita deviceId ausente.
- Segredo HMAC ausente deixa de usar constante pública.
- Ambiente desconhecido é rejeitado e falha de leitura da configuração desabilita a integração.
- Perfil, permissão e Auth são consultados em paralelo, embora seja necessário remover o fallback permissivo.
- Aprovação pelo app verifica integração e passa o canal ao commit sem alterar previamente o estado do rascunho.
- Fallback sem rascunho usa contador da sessão, evitando criar um documento a cada falha.
- Selecionar usuário no painel de pareamento não dispara novamente toda a carga de dados.
- `alexaDirty` impede gravar permissão ao salvar uma edição sem tocar nos controles Alexa.

## Itens do prompt ainda não concluídos

- HTTP continua lendo configuração no Firestore antes de rejeitar tráfego inválido (`index.js:223-227`).
- Diálogo continua regravando rascunhos sem mudança útil e perdendo campos válidos ao retornar cedo por outro campo inválido.
- Modelo pt-BR não foi alterado: ambiguidade de número isolado entre quantidade/preço permanece.
- Não há orçamento de seis segundos nem medições por etapa/p95. Auditoria continua usando duração padrão zero.
- Nenhuma alteração de TTL foi declarada; implantação real não foi consultada.
- Aprovação administrativa de pareamento ainda não verifica o interruptor global, embora a geração de novos códigos agora confira a configuração.
- Não houve preparação de migração/reconciliação do ledger antigo nem atualização das garantias sem evidência no relatório anterior.
- Os testes de integração existentes não receberam cenários Alexa; o teste novo usa mocks e não cobre os principais caminhos de confirmação/concor­rência.

## Verificações executadas

- `npm run test:unit -- tests/unit/alexa`: **47 testes, 7 arquivos, aprovados**.
- `npm test`: **192 testes, 24 arquivos, aprovados**.
- `npm run build`: **aprovado**, incluindo typecheck. Vite emitiu avisos de assets não resolvidos em build e chunks maiores que 600 kB; não estabeleci que esses avisos foram introduzidos pela mudança.
- `node --check` em todos os arquivos `functions/alexa/*.js`: aprovado.
- `git diff --check`: aprovado.
- Reproduções adicionais: erros de ordem da transação com classe real do SDK; demais cenários com funções reais e banco em memória.

**Limites:** não executei emulador Firestore, Playwright, Echo físico ou produção. O cache local de emuladores está vazio, e os caminhos temporários do ambiente de testes anterior não existem nesta sessão. A reprodução com Transaction valida a restrição local do SDK, mas não substitui testes de concorrência/rollback no emulador. Nenhum deploy ou alteração da implementação foi realizado.

## Próxima correção

Resolver primeiro a ordem de leituras/escritas das duas transações. Em seguida, fechar confirmação de identidade/revisão e concorrência, corrigir contrato da permissão de usuário e parsing, e adicionar regressões que falhem com o código atual. Só então validar os fluxos completos no emulador e na interface.

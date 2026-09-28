# Análise da integração Alexa — 27/09/2026

## Conclusão

O fluxo determinístico, sem chamadas a LLM, é adequado ao objetivo de custo baixo. Há, porém, falhas de autorização, confirmação, parsing e integração financeira que precisam ser corrigidas antes de confiar na criação automática por voz.

Escopo: backend `functions/alexa`, modelo pt-BR, manifesto, regras/índices Firestore, configurações da Alexa, edição de usuários e consumo do ledger. Análise do checkout local; não inspecionei configuração implantada, faturamento ou Echo físico. Nenhuma implementação foi alterada.

## Achados prioritários

### 1. Alta — limite de pedidos não impede gravações

**Local:** `functions/alexa/orderService.js:243-248`.

O limite de 10 pedidos/hora e 50/dia é consultado depois do commit. O retorno `allowed` é ignorado. Além disso, `result` não contém `uid`, portanto todos usam os contadores com UID vazio. O limite adiciona transações e latência sem impedir o excesso.

**Correção:** ler e consumir os dois contadores do UID real dentro da transação do pedido, antes das escritas. Reentrega de um pedido já confirmado não deve consumir cota novamente.

### 2. Alta — confirmação aceita identidade da fala anterior

**Local:** `functions/alexa/authorization.js:44-58`; `functions/alexa/dialog.js:418-437`.

Quando a requisição atual não tem `context.System.person.personId`, o servidor usa `session.attributes.personId`. Assim, um “sim” sem pessoa reconhecida pode confirmar o pedido iniciado por outra pessoa. Detectar um personId diferente protege apenas quando a segunda voz é reconhecida.

**Correção:** exigir pessoa reconhecida na confirmação final e vinculá-la ao titular e à sessão do rascunho. Se ausente, pedir nova confirmação identificada ou aprovação no app. A Amazon documenta que a ausência de reconhecimento pode significar que outra pessoa assumiu a conversa: [testes de personalização](https://developer.amazon.com/en-US/docs/alexa/custom-skills/test-troubleshoot-personalization.html).

### 3. Alta — desligamento global e revogações não são aplicados em todos os caminhos

**Locais:** `functions/alexa/callables.js:248-285`, `functions/alexa/orderService.js:99-128`, `functions/alexa/index.js:65`, `functions/alexa/pairing.js:20`.

A aprovação no app lê a configuração, mas não verifica `isEnabled`; o commit também não. Um rascunho pendente pode virar pedido com a integração desligada. Pareamento também ignora esse interruptor.

No commit, falta conferir `permissions.orders.create`, modo atual de confirmação, `binding.uid === draft.uid` e ambiente do rascunho/vínculo. A autorização da voz faz parte dessas verificações antes, mas não protege a aprovação pelo app nem alterações concorrentes. O modo usado é uma cópia antiga no rascunho: mudar para `app_approval` não invalida uma confirmação por voz já preparada.

**Correção:** centralizar invariantes no serviço de commit; reler permissões, configuração e vínculo na transação. Validar também a conta Auth no caminho do app. Passar identidade do chamador explicitamente, incluindo UID e canal de aprovação.

### 4. Alta — editar outro usuário pode desabilitar a Alexa sem intenção

**Locais:** `src/app/pages/Users.tsx:233-241,283`; `functions/alexa/callables.js:175-177`.

O formulário consulta `getStatus()`, que devolve a permissão do administrador conectado, e compara com o usuário editado. Ao editar outra pessoa, inicializa Alexa como desabilitada. Salvar apenas uma alteração de nome também executa `setPermission` com esse valor, revogando o acesso de voz e redefinindo o modo.

**Correção:** buscar a permissão do usuário alvo por uma operação autorizada para administradores; aguardar o carregamento e persistir apenas alterações intencionais.

### 5. Alta — parser monetário grava valores diferentes dos informados

**Local:** `functions/alexa/dialog.js:119-191`.

Reproduções diretas das funções existentes:

| Entrada | Resultado atual | Resultado esperado |
| --- | --- | --- |
| `1.500,00` | R$ 1,50 | R$ 1.500,00 |
| `dez reais e cinquenta centavos` | R$ 60,00 | R$ 10,50 |
| `cinquenta centavos` | R$ 50,00 | R$ 0,50 |
| `20 ou 30` | R$ 20,00 | Solicitar esclarecimento |

A expressão regular aceita só um prefixo; o parser por extenso soma centavos como reais e ignora palavras desconhecidas. O resultado exato recebido do reconhecimento de voz deve ser verificado no Echo, mas o comportamento incorreto do parser foi reproduzido localmente.

**Correção:** parsing integral e estrito, representação em centavos, rejeição de ambiguidades e resumo obrigatório do total.

### 6. Alta — ledger Alexa incompatível com os relatórios

**Locais:** `functions/alexa/orderService.js:200-215`; `src/services/firebaseLedgerService.ts:35-73`; `src/hooks/useSalesLedger.ts:110`; `src/app/pages/Reports.tsx:238,267,313`.

Alexa grava `date` como Timestamp, enquanto o caminho web grava ISO string. O hook repassa os dados sem normalização e os relatórios chamam `new Date(s.date)`. Também faltam campos do contrato web como `quantity`, `status`, `tags` e `paidAmount`.

Impactos: datas inválidas nos relatórios; pedido pendente não contado como pendente; quantidade de 20 itens contabilizada como 1 pelo fallback; filtros por tags não refletem o pedido. Atualizações posteriores podem preencher alguns campos, mas não tornam correta a criação inicial.

**Correção:** usar contrato comum para o ledger e normalizar registros existentes; testar relatórios com pedidos criados pelos dois canais.

### 7. Alta — confirmação não está ligada à revisão que foi apresentada

**Locais:** `functions/alexa/dialog.js:433-438,571-580`; `functions/alexa/orderService.js:94-96`.

O resumo devolve `sessionAttributes.revision`, mas o “sim” envia ao commit `draft.revision`, recém-lida do banco. A revisão que a pessoa ouviu não é conferida. Uma alteração concorrente pode ser confirmada sem que seu resumo tenha sido ouvido.

As atualizações do diálogo também fazem leitura e `set` fora de transação, permitindo sobrescrita de alterações concorrentes e até estado terminal por uma requisição atrasada.

**Correção:** confirmar a revisão apresentada e persistir transições com comparação de revisão/estado em transação. Não basta comparar duas leituras recentes do banco.

### 8. Média — tentativa de aprovação pode tirar o rascunho da lista

**Local:** `functions/alexa/callables.js:270-280`.

O callable muda `awaiting_app_approval` para `awaiting_confirmation` antes da transação. Se o commit falhar por revisão desatualizada ou permissão, o rascunho sai da consulta de pendentes e não há rollback. A revisão também é opcional via `revision || draft.revision`.

**Correção:** aprovar diretamente do estado de espera do app dentro de uma única transação, exigindo a revisão visualizada. Uma falha deve preservar o estado anterior.

### 9. Média — rascunhos cancelados ou encerrados podem voltar à confirmação

**Local:** `functions/alexa/dialog.js:203-211`.

O carregamento aceita qualquer estado diferente de `committed` se o prazo ainda não venceu, incluindo `cancelled`, `expired` e `awaiting_app_approval`. Reproduzi rascunho cancelado voltando para `awaiting_confirmation` quando uma nova requisição usou o mesmo ID.

Também não são conferidos UID, binding e ambiente ao carregar/editar/cancelar o rascunho. O envelope assinado reduz a superfície de entrada arbitrária, mas não substitui esses vínculos no servidor, particularmente após reassociação de uma voz a outro usuário.

**Correção:** permitir apenas transições explícitas, conferir titularidade e correlacionar rascunho à sessão.

### 10. Média — limite de três falhas de entendimento não funciona sem rascunho prévio

**Local:** `functions/alexa/dialog.js:318-334`.

O fallback cria um rascunho, mas devolve `currentDraftId`, que continua nulo, em vez do novo ID. Reproduzi três fallbacks consecutivos: três documentos criados e sessão ainda aberta. Requisições com data/preço inválidos também não participam desse limite.

**Correção:** devolver o ID efetivamente criado e aplicar orçamento de tentativas por sessão/campo, sem gravar um novo rascunho para cada falha.

### 11. Média — data impossível e quantidade parcial são aceitas

**Local:** `functions/alexa/dialog.js:90-110,364-370`.

`2027-02-31` retorna `valid: true`: só se verifica mês entre 1–12 e dia entre 1–31. Quantidades usam `parseInt`, aceitando `2.5` como 2. Cliente/produto/quantidade inválidos são ignorados silenciosamente; numa correção, pode permanecer o valor anterior. Se uma data ou preço inválido chega junto com outros campos válidos, o retorno antecipado perde as alterações válidas ainda não persistidas.

**Correção:** validar calendário real, inteiros completos e informar claramente correções rejeitadas. Revalidar o rascunho completo no commit.

### 12. Média — deduplicação de requestId foi declarada, mas não implementada

**Local:** `functions/alexa/repository.js:46`; fluxo em `functions/alexa/index.js:56`.

`computeRequestKey` e a coleção `alexaRequests` existem, mas não são usados. Reentregas repetem leituras, cotas, revisões, fallbacks e geração de códigos/rascunhos. A idempotência de commit por draftId existe e é útil, mas o diálogo troca um rascunho já committed por um novo antes de chegar ao serviço de commit; um “sim” repetido não recupera a resposta original.

**Correção:** deduplicar por skillId/requestId com aquisição atômica e resposta persistida, avaliando o custo adicional. Manter também o recibo durável por draftId.

### 13. Média — configuração pode continuar habilitada quando sua leitura falha

**Locais:** `functions/alexa/config.js:25-54`; `functions/alexa/repository.js:30-40`; `functions/alexa/pairing.js:209-216`.

Falha ao ler o interruptor no Firestore mantém o default de ambiente, habilitado em dev. Um projeto desconhecido também é tratado como dev. Ausência de segredo HMAC usa strings constantes do código em vez de impedir operação. Novo pareamento sobrescreve o modo do usuário com `voice_confirm`, mesmo que estivesse configurado para aprovação no app.

**Correção:** validar ambiente e segredo antes de operar, bloquear operações sensíveis se a configuração não puder ser verificada e preservar o modo existente ao parear um novo dispositivo.

## Custo e velocidade

1. **Eliminar leitura paga antes da validação HTTP.** `index.js:142` lê Firestore antes de rejeitar GET, corpo inválido ou assinatura ausente. Até tráfego inválido gera leitura de configuração. Fazer validações locais e criptográficas antes de acessar configuração dinâmica; preservar verificação do Skill ID antes de processar a operação.
2. **Reduzir idas sequenciais à rede.** Um turno comum de coleta com rascunho existente percorre aproximadamente 6 leituras Firestore e 2 escritas, além de uma consulta Auth: configuração, vínculo, perfil, permissão, contador de requisições e rascunho. Estimativa estática sem retries. Após resolver o UID, buscar perfil/permissão/Auth em paralelo. Preservar revalidação no commit.
3. **Evitar escritas sem mudança e transações posteriores ao commit.** O diálogo regrava o rascunho mesmo sem alteração útil. Corrigir o rate limit do pedido remove transações posteriores e dá eficácia às operações restantes.
4. **Medir antes de aumentar instâncias/memória.** O webhook tem `maxInstances: 2` e 256 MiB. Não encontrei orçamento interno de 6 segundos, métricas reais por etapa ou medições p95, apesar das afirmações em `docs/RELATORIO_IMPLEMENTACAO_ALEXA.md:135-140`. A Amazon informa cerca de oito segundos para a resposta completa: [limite oficial](https://www.developer.amazon.com/en-US/docs/alexa/custom-skills/send-the-user-a-progressive-response.html). Implementar orçamento por etapa, tratar resultado incerto de commit e medir frio/quente; um timeout local não cancela uma gravação já iniciada.
5. **Verificar retenção implantada.** `firestore.indexes.json` tem `fieldOverrides: []`; não há política TTL declarada no repositório. `expiresAt` por si só não comprova limpeza automática. Auditoria nem possui campo de expiração. Verificar o projeto antes de afirmar ausência de TTL em produção e definir retenção para rascunhos, códigos, buckets e auditoria, preservando recibos de idempotência.
6. **Reduzir recargas administrativas.** `AlexaSettingsSection.tsx:48-75` inclui `selectedUid` nas dependências do carregamento. Selecionar usuário refaz consulta de status, auditoria e lista de usuários; a seleção inicial também causa nova carga.
7. **Remover ambiguidades de número no modelo.** `ProvideQuantityIntent` e `ProvideTotalIntent` aceitam um número isolado. O backend não resolve o significado pelo campo esperado. Há risco de a resposta de preço alterar quantidade e voltar a pedir preço. Usar elicitação/contexto explícito e testar no Echo. Frases fixas como “são caixinhas” não contêm o slot que o backend espera.

Não há base medida nesta revisão para garantir um custo mensal em reais ou p95 de produção. O ganho inicial vem de corrigir operações inúteis, falhas de diálogo e reentregas, mantendo o fluxo sem LLM.

## Proteções já presentes

- Verificação de assinatura pelo SDK da Amazon, timestamp e Skill ID; limite de corpo de 128 KiB.
- Pareamento com código aleatório, prazo de cinco minutos e aprovação administrativa.
- Conferência de perfil ativo, Firebase Auth e permissão no caminho normal de voz.
- Bloqueio de acesso direto às coleções Alexa nas regras Firestore.
- Pedido, contador, ledger, consumo do rascunho e recibo no mesmo commit transacional.
- Respostas PlainText e ausência de LLM: não há um caminho de prompt injection para modelo generativo neste módulo.

Proteção adicional a ajustar: a lista de dispositivos só é aplicada se `deviceId` vier preenchido (`authorization.js:169-173`); identidade incompleta deveria ser rejeitada quando há restrição de dispositivo.

## Validação executada e limites

- `npm run test:unit -- tests/unit/alexa`: **6 arquivos, 34 testes aprovados**.
- Execuções locais adicionais das funções reais confirmaram preços incorretos, data impossível e identidade herdada.
- Simulações locais com armazenamento em memória confirmaram três rascunhos em três fallbacks, recuperação de estado cancelado e commit aceito com integração desligada, permissão de criação negada, vínculo reassociado e modo atual alterado para aprovação no app. Esses cenários demonstram validações ausentes; não medem concorrência real do Firestore.
- Testes existentes usam mocks de transação sem a semântica completa de isolamento/rollback. Eles não bastam para garantir comportamento sob concorrência.
- Não foram executados Echo físico, Playwright, testes em produção ou medições de faturamento/latência. Nenhum deploy, commit ou push foi feito.

## Ordem recomendada

1. Identidade de confirmação, autorização final, interruptor global, modo de aprovação e rate limit atômico.
2. Permissão no formulário de usuários, parsing monetário, datas/quantidades e contrato do ledger.
3. Revisões e estados transacionais, aprovação no app, deduplicação e fallbacks.
4. Contagem de operações, paralelização de leituras independentes, retenção e métricas.
5. Regressão com emulador para concorrência/revogação, relatórios com dados dos dois canais e testes físicos com troca de pessoa, “sim” não reconhecido e números isolados.

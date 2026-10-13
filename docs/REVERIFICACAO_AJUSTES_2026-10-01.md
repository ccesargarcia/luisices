# Reverificação dos ajustes — 01/10/2026

Branch: `fix/melhorias-develop-2026-09-30`. Base: `001047e`. Escopo: alterações locais ainda não commitadas, comparadas à revisão de 30/09 e ao plano de melhorias. Não houve alteração da implementação nesta análise, publicação ou acesso a dados de clientes.

## Conclusão

Os ajustes melhoraram a autorização de perfis, as regras de exclusão de funcionários, a preservação dos campos de pagamento e a configuração de privacidade do Replay. Entretanto, existem regressões funcionais confirmadas e riscos ainda abertos. A matriz de progresso que marca todos os 19 achados como concluídos precisa ser revisada antes de considerar o conjunto pronto para publicação.

Prioridades imediatas:

1. Corrigir a ordem de leitura/escrita das transações de edição e status de pedidos.
2. Permitir a operação legítima de compra sem abrir acesso indevido a documentos inexistentes.
3. Fechar o caminho público direto que contorna a validação do checkout.
4. Corrigir confirmação, código do pedido e idempotência da loja.
5. Preservar personalizações legítimas do mesmo produto.
6. Concluir consultas completas, recuperação segura e gates efetivos de validação.

## Validação executada

| Verificação | Resultado atual |
| --- | --- |
| `npm test` | 378 testes passaram, em 38 arquivos |
| `npm run build` | TypeScript e Vite passaram; seis avisos de assets não resolvidos permanecem |
| `npm run test:integration` | 21 testes passaram em emuladores Firestore/Storage |
| `npm run lint:functions` | Retornou sucesso, mas o comando possui falha de abrangência descrita abaixo |
| `node --check` individual em todos os fontes próprios de Functions | 24 arquivos passaram |
| Testes de datas com `TZ=America/Sao_Paulo` | 5 testes passaram |
| Cinco reproduções independentes em emuladores | Confirmaram cinco comportamentos defeituosos descritos abaixo |
| Handler real do checkout em harness com banco simulado | Confirmou três problemas adicionais |
| Auditoria npm atual dos lockfiles, sem devDependencies | Raiz: 5 entradas altas; Functions: 9 moderadas; nenhuma entrada crítica |
| E2E de navegador, Auth/Functions em emuladores e validação remota | Não executados nesta reverificação |

Os cinco testes de reprodução passam porque esperam e confirmam os defeitos. Eles não representam cinco funcionalidades corretas. O harness do checkout executa o callback extraído do código real, mas simula Firestore; não é prova de comportamento remoto.

Artefatos locais de reprodução, ignorados pelo Git: `.temp/recheck/reproduction.test.ts`, `.temp/recheck/vitest.config.mjs` e `.temp/recheck/checkout-backend.cjs`. Logs: `/tmp/luisices-recheck-reproductions.log` e `/tmp/luisices-recheck-integration-escalated.log`. Relatórios npm: `/tmp/luisices-recheck-audit-root.json` e `/tmp/luisices-recheck-audit-functions.json`.

## Problemas confirmados e correções necessárias

### R1 — P1: edição e mudança de status de pedidos falham no Firestore

Em `src/services/firebaseOrderService.ts:483` e `:566`, a transação chama `transaction.update(orderRef, ...)` antes de `transaction.get(saleRef)` nas linhas 489 e 572. O Firestore exige todas as leituras antes das escritas.

**Reprodução:** os dois serviços reais, com pedido e ledger existentes, rejeitam a operação com erro sobre leituras antes das escritas. O pedido permanece pendente. Isso quebra edição e movimentação de status, apesar dos testes unitários verdes.

**Correção:** ler pedido e ledger antes de qualquer update/set, calcular o resultado e só depois gravar. Acrescentar integração de edição, status, ledger ausente, conflito e rollback. Os mocks atuais não fiscalizam essa restrição.

### R2 — P1: nova compra é negada para proprietário comum

`src/services/firebasePricingService.ts:490` lê o documento de compra ainda inexistente para conferir idempotência. A regra de leitura de `purchaseHistory`, em `firestore.rules:243`, depende de `resource.data.userId`, que não existe nesse caso. Admin e funcionários com permissão global podem passar por caminhos diferentes; o proprietário comum não passa.

**Reprodução:** proprietário ativo, insumo próprio e nova chave de compra resultam em `permission-denied`; o estoque permanece 10. Antes do ajuste, a criação não exigia essa leitura antecipada.

**Correção:** definir escopo e autorização da identidade de operação de forma verificável, por exemplo documento sob escopo do usuário ou operação de servidor autorizada. Não liberar indiscriminadamente leitura de toda a coleção para solucionar a falha. Testar compra por proprietário, funcionário e admin, retries e concorrência real.

### R3 — P1: checkout continua contornável por escrita pública direta

`firestore.rules:377` ainda permite criação anônima de `catalogOrders`, sem validar preço oficial, produto ou publicação da loja. `src/services/firebaseCatalogOrderService.ts:85` mantém fallback direto quando a callable retorna indisponibilidade/erro interno. Proibir `verifiedByServer` e `convertedOrderId` não impede pedidos adulterados.

**Reprodução em emulador:** visitante criou pedido de R$ 0,01 com produto inexistente enquanto `storePublished=false` e `featureFlags.enableOnlineOrders=false`.

A conversão legada também continua permissiva: quando o produto não existe, tem preço inválido ou sua leitura falha, `convertToProductionOrder` volta ao preço do item recebido (`src/services/firebaseCatalogOrderService.ts:263`). Outra reprodução converteu produto inexistente em pedido de produção por R$ 0,01.

**Correção:** tornar o endpoint confiável o caminho obrigatório após rollout compatível; impedir criação direta não validada. Na conversão legada, dados não verificáveis devem gerar erro ou revisão explícita, sem retorno automático a preço não confiável.

### R4 — P1: confirmação apresenta código diferente do persistido e continua após rejeição

`src/app/pages/PublicCatalog.tsx:946` gera código e mensagem WhatsApp antes do envio. A Function gera outro código em `functions/index.js:1957`. O serviço retorna apenas o ID, e a tela ignora o recibo oficial.

Além disso, o catch exibe toast, mas o fluxo prossegue para `window.open` e modal de confirmação (`PublicCatalog.tsx:1007`), mesmo quando o servidor rejeita produto, preço ou loja fechada.

**Consequência:** WhatsApp e confirmação podem identificar um pedido que não corresponde ao salvo ou anunciar uma compra não registrada.

**Correção:** usar o recibo oficial retornado pelo servidor para código, valores e mensagem; interromper confirmação em erro. Validar em E2E sucesso, rejeição e timeout.

### R5 — P1: idempotência pública não protege concorrência nem retry da interface

`functions/index.js:1829` consulta a chave e depois usa `collection.add` em `:1981`, fora de uma transação que assegure unicidade. Duas chamadas podem consultar antes de qualquer criação e ambas salvar.

O harness do callback real confirmou duas gravações com a mesma chave. Na tela, `PublicCatalog.tsx:971` gera outra chave a cada tentativa, por isso retry após resposta perdida representa outra operação.

A consulta também aceita pedido criado pelo caminho público como replay, retornando `verifiedByServer: true` sem conferir a origem do documento. A chave não está vinculada ao conteúdo da operação.

**Correção:** identidade estável e escopo seguro, claim transacional/determinístico e comparação de payload quando a chave for reutilizada. Retornar o mesmo recibo somente para a mesma operação validada. Persistir a chave da tentativa no cliente até conclusão ou abandono deliberado.

### R6 — P2: carrinho válido com duas personalizações do mesmo produto é rejeitado

O carrinho distingue produto e `customName` (`PublicCatalog.tsx:888`), permitindo duas linhas do mesmo produto para nomes diferentes. A Function exige que a quantidade de IDs únicos seja igual à quantidade de linhas (`functions/index.js:1869`).

**Reprodução no callback real:** mesmo produto com personalizações Ana e Bia gera `invalid-argument`.

**Correção:** deduplicar apenas as leituras dos produtos, preservando cada linha de personalização. Validar limites agregados por produto e por pedido conforme o contrato.

### R7 — P1: a flag real de pedidos online não é verificada pelo endpoint

A interface e as configurações usam `featureFlags.enableOnlineOrders`. A Function verifica `catalogOrdersDisabled` e `catalogEnabled`, mas não aquela flag (`functions/index.js:1859`).

**Reprodução no callback real:** loja publicada com `featureFlags.enableOnlineOrders=false` aceitou o pedido.

**Correção:** compartilhar o contrato de configuração entre tela e servidor; testar loja fechada, flag desabilitada e configuração ausente. O limiter é em memória por instância, portanto não constitui limite global distribuído de abuso.

### R8 — P1: consultas continuam omitindo dados silenciosamente

`OrdersContext.tsx:149` limita operacionais a 1000 e histórico a 200. `useFirebaseQuotes.ts:41` limita ativos a 500 e histórico a 200. Não há próxima página. Os fallbacks de índice voltam ao limite antigo de 200.

A separação melhora o caso de poucos pedidos ativos antigos, mas não garante completude. Relatórios, buscas e telas que dependem desses arrays continuam recebendo histórico parcial. O teste de merge usa listas fabricadas e não exercita os listeners ou datasets acima dos limites.

**Correção:** paginação efetiva, consultas operacionais completas conforme escopo e agregações completas para totais. Expiração de orçamentos precisa abranger registros fora da página. Fallback não deve declarar sucesso com universo reduzido.

### R9 — P2: recuperação ainda pode manter instância terminada e descartar escritas offline

`src/lib/firebase.ts:70` termina o Firestore e limpa persistência. Se a limpeza falhar, o catch somente registra aviso e não reinicializa nem recarrega a instância. No sucesso, a limpeza não verifica gravações offline pendentes. Cooldown de 30 segundos apenas reduz tentativas imediatas.

O teste novo verifica aritmética de timestamp em armazenamento simulado; não chama `recoverFirestorePersistence` nem testa falha, múltiplas abas ou escritas pendentes.

**Correção:** estabelecer ciclo de recuperação explícito, preservar pendências e testar a função real com falha após terminate, múltiplas abas e offline. Evitar mascarar o erro que torna o cliente inutilizável.

### R10 — P2: comando de lint verifica apenas o primeiro arquivo

`functions/package.json` executa `node --check index.js originProtection.js ai/*.js ai/**/*.js alexa/*.js`. Os argumentos após o primeiro arquivo não representam verificações independentes de sintaxe.

**Reprodução:** `node --check arquivo-valido.cjs arquivo-invalido.cjs` retornou sucesso, mesmo com erro sintático no segundo arquivo. A análise executou separadamente os 24 arquivos e todos passaram, mas o gate futuro permanece incompleto.

**Correção:** enumerar arquivos e executar `node --check` para cada um, propagando qualquer falha; acrescentar lint real se esse for o contrato do job. O CI deve demonstrar que erro em arquivo de IA/Alexa falha o job.

### R11 — P2: patch parcial de pagamento pode zerar saldo restante

`firebaseOrderService.ts:550` usa zero quando `payment.remainingAmount` é omitido. Um patch de método ou notas pode preservar o valor pago, mas apagar o restante. A tela principal envia todos esses campos, por isso o problema afeta sobretudo o contrato reutilizável do serviço e outros escritores.

**Correção:** preservar o valor existente ou recalcular coerentemente de total e pago, de acordo com o tipo da operação. Acrescentar teste de patch de apenas método/notas. A execução real desse cenário fica bloqueada primeiro por R1.

Também permanece sincronização assíncrona com erro apenas registrado no workflow (`firebaseOrderService.ts:827`), portanto a correção da consistência ainda não cobre todos os escritores.

### R12 — P2: desativação e revogação na exclusão continuam com erros suprimidos

Em `functions/index.js:463`, falha na desativação do perfil é capturada e ignorada. Falhas de revogação também são ignoradas. Se a exclusão Auth falhar e a segunda atualização do perfil falhar, a função informa que a conta foi desativada sem comprovar isso.

**Correção:** persistir a desativação como requisito do processo, registrar estados retomáveis e não afirmar revogação/desativação quando falhar. Testar o handler com falha em cada serviço; os quatro testes atuais de usuários cobrem cliente e autorização IA, não esse processo administrativo.

## Melhorias parciais e pendências de entrega

- **Dependências:** críticos foram eliminados no snapshot atual, mas restam cinco entradas altas na raiz (`firebase`, seus componentes Firestore, `@grpc/grpc-js` e `xlsx`) e nove moderadas em Functions. Entradas incluem propagação transitiva; não são necessariamente vulnerabilidades independentes alcançáveis. Import dinâmico de XLSX melhora carregamento, mas não corrige vulnerabilidade.
- **Leituras financeiras:** `getSalesLedgerDateRangeQuery` foi criado, porém `useSalesLedger.ts:101` continua usando `getSalesLedgerQuery` sem intervalo. A otimização não está aplicada ao fluxo. Recriação de listeners em eventos de visibilidade/online também permanece.
- **Entrega:** não houve diff nos workflows de deploy para resolver Storage ou coordenação dos artefatos. O deploy de desenvolvimento já possui dependência dos E2E, mas o manual de Functions continua separado. Acrescentar testes ao workflow não resolve sozinho toda a publicação.
- **CI:** integração de regras foi adicionada, o que é positivo. Instalações ainda usam `npm install`, e a CLI global não tem versão fixada. O gate de sintaxe precisa de R10.
- **Modularização:** houve import dinâmico de XLSX e ajustes de chunks. Isso não executa a decomposição de `StoreCustomization`, `PublicCatalog` e diálogo Alexa que constituía o achado 19. Aumentar o limite de aviso para 1000 não demonstra ganho de desempenho.
- **Build:** a alegação de zero avisos no progresso não corresponde ao build desta revisão: seis referências de assets permaneceram sem resolução. É necessário smoke visual para concluir o impacto.
- **Privacidade:** `maskAllText=true` e `blockAllMedia=true` atendem à correção principal de Replay. Os sanitizadores de mensagens não cobrem todos os possíveis campos estruturados de eventos; configuração, captura e retenção remotas não foram inspecionadas.

## Estado dos 19 achados originais

| # | Estado após reverificação | Evidência / pendência |
| --- | --- | --- |
| 1 | Melhorou; validação completa pendente | Auto-perfil removido, criação direta negada e IA sem perfil bloqueada; convite completo/Auth não testados nesta execução |
| 2 | Parcial | Fallback cliente removido; falhas de desativação/revogação ainda suprimidas, R12 |
| 3 | Correção principal validada em emulador | Funcionário com edição sem exclusão não altera `deletedAt` |
| 4 | Regras implementadas e testes básicos aprovados | Ownership/admin validados; ampliar matriz de permissões e schema |
| 5 | Regressão confirmada | Edição/status falham, R1; workflow ainda assíncrono |
| 6 | Preservação melhorou; fluxo bloqueado | Código preserva histórico/data; R1 impede validar operação ponta a ponta |
| 7 | Patch melhorou; fluxo bloqueado | `null`, `[]` e `false` enviados; R1 impede execução real de edição |
| 8 | Implementado com testes unitários | Transação inclui orçamento/pedido/ledger; concorrência específica de orçamento ainda requer emulador |
| 9 | Regressão confirmada / parcial | Nova compra comum negada, R2; estorno usa saldo agregado sem rastrear lote consumido |
| 10 | Parcial | Limites arbitrários e histórico sem paginação, R8 |
| 11 | Correção local validada | Testes também passaram em São Paulo; contrato entre fusos/IA/Alexa ainda exige alinhamento |
| 12 | Parcial | Falha após terminate e preservação offline não resolvidas, R9 |
| 13 | Aberto, com regressões adicionais | R3–R7: bypass, confirmação, idempotência, personalização e flag |
| 14 | Configuração principal corrigida | Máscara e mídia bloqueada; validação de captura remota pendente |
| 15 | Parcial | 5 entradas altas na raiz e 9 moderadas em Functions |
| 16 | Pendente | Coordenação/Storage não implementados nos workflows de deploy |
| 17 | Parcial | Integração adicionada; gate de sintaxe incompleto, R10 |
| 18 | Pendente no fluxo principal | Query por intervalo não utilizada e listeners ainda recriados |
| 19 | Pendente no escopo original | Carregamento dinâmico implementado, decomposição dos módulos não realizada |

## Próxima sequência recomendada

Corrigir R1 e R2 primeiro e incorporar suas reproduções como testes de sucesso/rollback permanentes. Em seguida tratar R3–R7 conjuntamente para estabelecer um único contrato confiável de checkout. Depois concluir consultas, recuperação, financeiro parcial e exclusão. Reexecutar regressões relevantes e E2E críticos antes de preparar publicação. Atualizar a matriz de progresso com estados sustentados por evidências e listar validações externas separadamente.

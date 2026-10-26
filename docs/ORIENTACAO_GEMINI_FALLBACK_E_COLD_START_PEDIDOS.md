# Registro de decisão e critérios: política de origem e resiliência das Functions de pedidos

**Data da conclusão:** 26/10/2026
**Branch observada:** `develop`
**Commit base:** `5fdd4ea` (`HEAD` alinhado com `origin/develop`)
**Estado:** alterações concluídas no working tree local (sem commit, sem deploy).
**Objetivo:** documentar a decisão final de remoção do fallback direto, manutenção de origem estrita e recuperação idempotente.

> Este documento registra as decisões técnicas e os critérios de validação acordados. Nenhuma alteração deve ser commitada ou implantada sem autorização explícita do responsável técnico.

## 1. Decisão final e estado técnico consolidado

1. **Proteção estrita de origem (`deny-by-default`):**
   - O wrapper compartilhado em `functions/common/sentryFunctions.js` exige incondicionalmente o cabeçalho `x-origin-secret`.
   - O mecanismo e opção `allowAuthFallback` foram totalmente eliminados do wrapper, handlers e testes.
   - Chamadas diretas sem origem válida são sumariamente rejeitadas com `permission-denied`, tanto para anônimos quanto para usuários autenticados no Firebase Auth.
   - Todos os endpoints de pedidos (`createOrder`, `updateComplexOrder`) e de outros domínios exigem trânsito exclusivo pelo gateway oficial da Cloudflare (`api.luisices.com.br`).

2. **Remoção de rotas diretas de contingência no cliente:**
   - A instância alternativa regional (`fallbackFunctions`) e qualquer tentativa de chamada direta pelo cliente foram removidas de `src/lib/firebase.ts` e `src/services/firebaseOrderService.ts`.
   - O navegador nunca tenta desviar para URLs `*.cloudfunctions.net`.

3. **Recuperação idempotente de operações inconclusivas:**
   - Falhas transitórias de transporte, rede ou timeouts de borda (502, 503, 504, 524, `unavailable`, `deadline-exceeded`, `network-request-failed`) são classificadas por `isTransientCallableError` e tratadas pelo cliente como estado inconclusivo (`unconfirmed-order`).
   - O cliente preserva a chave determinística (`idempotencyKey` na criação, `operationId` e `expectedVersion` na edição) e orienta retentativa exclusivamente pelo caminho oficial.
   - Se o comando original já tiver sido processado pelo backend, a repetição devolve o recibo autoritativo sem duplicar pedidos, ledger ou estatísticas.

4. **Zero custo fixo mensal e mitigação de cold start:**
   - Mantido `minInstances: 0` (zero custo fixo adicional).
   - O cron agendado de aquecimento (`warming.js`) e atalhos por payload público (`isWarmUp`) foram removidos por segurança e governança de custos.

## 2. Critérios de validação e testes executados

- **Origem e segurança:** `tests/unit/origin-fallback.test.ts` verifica a rejeição de chamadas diretas sem segredo para anônimos e autenticados em `createOrder`, `updateComplexOrder` e outros callables, bem como a aceitação com segredo válido.
- **Resiliência e idempotência:** `tests/unit/resilient-callable.test.ts` verifica que timeouts e falhas de rede preservam a chave da operação sob estado inconcluso, sem acionar segunda rota ou gravação direta no cliente, e testa exaustivamente a classificação em `isTransientCallableError`.
- **Compatibilidade:** `isGatewayUnavailableError` permanece mantido como alias para `isTransientCallableError`.
- **Integridade da automação de deploy:** `node --test tests/scripts/functions-deploy-selection.test.mjs` confirma que os módulos alterados são descobertos corretamente pelo grafo de dependências.

## 3. Limites desta revisão

A conformidade foi atestada estaticamente no código e validada por testes automatizados em ambiente local. Ela não substitui a confirmação pós-deploy de que os segredos `ORIGIN_SECRET` foram configurados corretamente nos projetos Firebase e no Worker da Cloudflare.

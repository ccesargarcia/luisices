# Pedidos e SuperFrete pelo gateway Beta

- **ID:** `orders-beta-gateway`
- **Status:** Concluída
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-17
- **Referências:** `docs/VERCEL_BETA_ROUTING.md`; `docs/IDEMPOTENCIA_PEDIDOS.md`; `docs/SEGURANCA_LIMITE_CEL_PEDIDOS.md`; `api/order-tracking.ts`; `functions/orders/index.js`; `functions/orders/superfrete.js`; `src/services/firebaseOrderService.ts`; `src/services/superfreteService.ts`; `cloudflare/api-beta-worker/src/index.js`.

## Problema e contexto

No ambiente Beta (`beta.luisices.com.br`), as rotas de catálogo público, checkout público e links de acompanhamento já operam via gateway `https://api.beta.luisices.com.br` e Vercel Functions (`gru1`). Contudo, a criação autoritativa de pedidos internos (`createOrder`), a edição de pedidos complexos (`updateComplexOrder`) e as operações de frete/etiqueta (`calculateSuperfreteShipping` e `createSuperfreteLabel`) ainda chamam exclusivamente as Cloud Functions no GCP (`us-central1`).

Como `POST /api/order-tracking` já está publicado na allowlist do Worker `functions-beta` com proteção `x-beta-edge-secret`, podemos estender o dispatcher `api/order-tracking.ts` para atender também as ações `createOrder`, `updateComplexOrder`, `calculateSuperfreteShipping` e `createSuperfreteLabel`, mantendo o total de Serverless Functions em `api/` em 10 arquivos (abaixo do limite de 12 do plano Hobby) e preservando integralmente a idempotência transacional e o fallback automático para o GCP.

## Objetivos

- Tornar `functions/orders/index.js` e `functions/orders/superfrete.js` compatíveis com o runtime Vercel (`runtimeCompat.js` e fallback seguro para `sentryFunctions` e `SUPERFRETE_SANDBOX_TOKEN`).
- Estender `POST /api/order-tracking` (`api/order-tracking.ts`) para despachar `createOrder`, `updateComplexOrder`, `calculateSuperfreteShipping` e `createSuperfreteLabel`, além de validar `assertBetaEdgeRequest` antes de `OPTIONS` e do método HTTP.
- Sincronizar `SUPERFRETE_SANDBOX_TOKEN` para a Vercel em `deploy-vercel-dev.yml`.
- Roteamento em `firebaseOrderService` (`createOrder`, `updateComplexOrder`) e `superfreteService` (`calculateShipping`, `createLabel`) via `https://api.beta.luisices.com.br/api/order-tracking` nos hosts Beta quando a rota `orderTrackingAdmin` estiver efetiva para `'vercel'`, com fallback automático para os callables GCP via `executeWithGcpFallback('orderTrackingAdmin', ...)`.
- Preservar recibos transacionais (`orderOperationReceipts`), validação de `payloadHash`, matemática financeira em centavos, permissões RBAC/ownership e fronteira sandbox (`GCLOUD_PROJECT === 'luisices-dev'`) do SuperFrete.

## Fora de escopo

- Alterar regras de negócio, cálculo financeiro, recibos de idempotência ou `firestore.rules`.
- Publicar SuperFrete em produção (permanece restrito a `luisices-dev`).
- Alterar `api.dev.luisices.com.br` ou `functions-dev`.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Usuário ativo com permissão em pedidos | `createOrder` e `updateComplexOrder` conforme RBAC e ownership validados nos handlers | Sem sessão ativa recebe 401; sem permissão no módulo/pedido recebe 403 (`permission-denied`) |
| Administrador ativo em `luisices-dev` | `calculateSuperfreteShipping` e `createSuperfreteLabel` (quando `superfreteEnabled === true`) | Não-admin recebe 403; fora de `luisices-dev` ou com integração desativada recebe 412 (`failed-precondition`) |
| Worker `functions-beta` | Encaminhar `POST /api/order-tracking` e injetar `x-beta-edge-secret` | Rate limit de 30 req/min por IP/caminho |
| Chamada direta à Function Vercel | Nenhuma | Sem `x-beta-edge-secret` válido recebe 403 antes de `OPTIONS`, método ou Firebase Admin |

## Requisitos funcionais

- **RF-1 — Compatibilidade de runtime:** `functions/orders/index.js` e `functions/orders/superfrete.js` carregam na Vercel sem depender de `firebase-functions` ou `@sentry/node`, exportando `handleCreateOrder`, `handleUpdateComplexOrder`, `handleCalculateSuperfreteShipping` e `handleCreateSuperfreteLabel`.
- **RF-2 — Despacho em `api/order-tracking.ts`:** validar `assertBetaEdgeRequest` no início do handler (antes de `OPTIONS` e `POST`) e suportar as ações `createOrder`, `updateComplexOrder`, `calculateSuperfreteShipping` e `createSuperfreteLabel` mantendo as 6 ações de links existentes.
- **RF-3 — Segredo SuperFrete:** sincronizar `SUPERFRETE_SANDBOX_TOKEN` no `deploy-vercel-dev.yml`.
- **RF-4 — Cliente e idempotência:** `firebaseOrderService` e `superfreteService` usam `executeWithGcpFallback('orderTrackingAdmin', ...)` e `getVercelBetaApiUrl('/api/order-tracking')` enviando as mesmas chaves `idempotencyKey` / `operationId`. Erros de negócio (`400`, `401`, `403`, `404`, `409`, `412`, `429`) não acionam fallback; qualquer resposta `>= 500` (inclusive `{ error: { code: 'internal' } }`) aciona o callable GCP com a mesma chave idempotente.

## Critérios de aceitação

- **CA-1:** testes unitários de `api/order-tracking.ts` comprovam bloqueio `403` sem `x-beta-edge-secret` (inclusive em `OPTIONS`) e `405` em `GET` com segredo válido; `order-tracking-action-dispatcher.test.ts` cobre o despacho das quatro novas ações e preservação das ações de links no dispatcher original.
- **CA-2:** testes unitários de `superfreteService` e `firebaseOrderService` comprovam roteamento para `https://api.beta.luisices.com.br/api/order-tracking` no Beta e fallback para o callable GCP em erro `5xx` preservando `idempotencyKey` / `operationId`.
- **CA-3:** `npm run typecheck`, suíte de testes unitários de pedidos e `git diff --check` aprovados.
- **CA-4:** verificação remota após deploy Vercel confirma `403` direto na origem Vercel e `401` sem sessão via `https://api.beta.luisices.com.br/api/order-tracking` para `action: "createOrder"` e `action: "calculateSuperfreteShipping"`.

## Evidências de conclusão

- `npm run typecheck`, 41 testes unitários em 3 suítes (`orders-admin-api.test.ts`, `superfrete-service-routing.test.ts` e `complex-order-validation.test.ts`) e `git diff --check` aprovados.
- Deploy Vercel concluído com sucesso no run [`44166338230`](https://github.com/ccesargarcia/luisices/actions/runs/44166338230) (incluindo sincronização de `SUPERFRETE_SANDBOX_TOKEN`).
- Verificação remota em `POST /api/order-tracking`: chamada direta na origem Vercel `403`, gateway sem sessão `401` (`createOrder` e `calculateSuperfreteShipping`), `OPTIONS` `204` e `GET` `405`.
- **Correção de gatilho Vercel (2026-11-17):** os caminhos `functions/orders/index.js` e `functions/orders/superfrete.js` foram incluídos em `deploy-vercel-dev.yml`, para que alterações exclusivas nesses módulos também iniciem a publicação Beta. Essa alteração local ainda requer o fluxo normal de CI/deploy após merge.
- **Cobertura do dispatcher (2026-11-17):** `order-tracking-action-dispatcher.test.ts` verifica os quatro handlers Beta com o mesmo request autenticado e instância Firestore, e garante que ações de links continuem no dispatcher original.

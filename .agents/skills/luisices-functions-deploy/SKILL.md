---
name: luisices-functions-deploy
description: >-
  Use this skill whenever writing, refactoring, isolating, or deploying Firebase
  Cloud Functions in Luisices. Enforces domain entrypoint isolation, domain-scoped
  selective deployment, and prevents monolithic graph coupling.
---

# Luisices Cloud Functions Modularization & Selective Deploy Runbook

This skill outlines the strict architectural rules for managing, modularizing, and deploying Cloud Functions in Luisices. Inspect `functions/index.js` to see all domain modules.

**Reference Architecture:** [docs/AUDITORIA_DEPENDENCIAS_FUNCTIONS_E_PLANO.md](../../../docs/AUDITORIA_DEPENDENCIAS_FUNCTIONS_E_PLANO.md)

---

## 🏛️ Architecture: The Lazy Export Pattern

Cloud Function exports in `functions/index.js` should be registered using the lazy `expose()` helper:

```javascript
expose('getPublicCatalogProducts', () => require('./orders/catalog').getPublicCatalogProducts);
expose('aiAgentChat', () => require('./ai/callables').aiAgentChat);
expose('chatGptToolsEndpoint', () => require('./mcp/endpoint').chatGptToolsEndpoint);
```

### Golden Rules of Isolation:
1. **Never create monolithic `index.js` aggregators:**
   Each domain should separate distinct capabilities (e.g. `catalog.js`, `tracking.js`, `superfrete.js` instead of dumping all in `orders/index.js`).
2. **Deterministic MCP Endpoints:**
   `mcp/endpoint.js` must only import deterministic database repositories and tools execution. It must NEVER require the heavy Gemini SDK or chat factory.
3. **Environment Isolation (DEV vs PROD):**
   Dev-only functions and secrets (such as `SUPERFRETE_SANDBOX_TOKEN`) must never be imported into production graphs.

---

## 🔍 1. Validating Domain Scope and Changes

CI (`deploy-dev.yml`, `deploy-production.yml`, and `deploy-functions-manual.yml`) delegates function scope resolution and chunk generation to the single source of truth `scripts/functions-deploy-map.mjs`:

| Changed files under `functions/` | Resulting scope |
|---|---|
| Only `functions/orders/superfrete.js` (in DEV) | `superfrete` |
| 1 to 3 domains among `email`, `whatsapp`, `alexa`, `users`, `mcp`, `orders`, `ai`, `media` | Comma-separated selective scope (e.g. `ai`, `ai,users`, `email,orders,whatsapp`). Implicit overlaps are deduplicated (`ai` + `mcp` → `ai`; `orders` + `media` → `orders`). |
| 4 or more domains, or any file outside those folders (`common/`, `index.js`, `package.json`, `scripts/sync-secrets-safe.mjs`) | `all` |

**Important:** Whenever a new Cloud Function is added to `functions/index.js`, register it in `scripts/functions-deploy-map.mjs` and `tests/fixtures/functions-exports.json` (verified by `tests/unit/functions-coverage.test.ts`). Scope `all` runs `firebase deploy --only functions` and falls back to `--scope=fallback` (8 partitioned chunks) if Cloud Build concurrency limits are hit.

### Expected function counts (DEV vs PROD)
- `functions/index.js` exposes 61 functions in every environment.
- `calculateSuperfreteShipping` and `createSuperfreteLabel` (SuperFrete sandbox) are exposed **only** when `GCLOUD_PROJECT === 'luisices-dev'` or in the emulator. So DEV = 63 and PROD = 61 — this difference is intentional; never publish them to `papelaria-dashboard`.
- To compare environments, count the `updating Node.js 22` lines in the Functions job logs of each deploy run.

### Simulating Changes Locally:
To check which function files are modified in your branch:
```bash
git diff --name-only origin/develop HEAD -- functions/
```

---

## 🚀 2. Deploying Cloud Functions

### PRs exclusivas do Beta

Antes de integrar em `develop` uma PR que não deve publicar recursos nos ambientes Dev (Firebase Hosting/Functions, Firestore/Storage Rules, índices ou Cloudflare Dev), aplique o label `beta-only-no-dev-deploy`. O workflow mantém testes e validações e ignora os jobs de publicação. Use o label somente quando nenhuma parte da mudança precisar chegar a Dev; pushes diretos e execuções manuais mantêm a política normal.

When deploying to Firebase:

### Full Deploy & Secret Pruning:
```bash
npm run deploy:functions
```
*This command deploys all functions and then runs `firebase functions:secrets:prune -f --non-interactive`, which can delete orphaned secret versions. Review the secret impact before using it. For a targeted change, prefer the validated selective deploy path; do not run the full command just to publish one function.*

### Deploying Specific Functions Manually:
```bash
firebase deploy --only functions:getPublicCatalogProducts,functions:aiAgentChat
```

---

## 🧪 3. Linting and Contract Verification

Before submitting:
```bash
npm --prefix functions run lint
```
Never alter public callable argument contracts, return payloads, or authentication requirements without coordinating frontend and mobile updates.

### Persisted dates
Store `createdAt`/`updatedAt` in Firestore as `FieldValue.serverTimestamp()` (or a JS `Date`) whenever the field is used in `orderBy` (orders, quotes, salesLedger, userProfiles). Firestore orders values by type first, so mixing ISO strings and Timestamps breaks chronological queries. Serialize to ISO strings only in callable/tool **responses** (e.g. `createUser` returns `profile.createdAt` as ISO but writes a Timestamp).

---

## ▲ 4. Vercel Serverless Functions (`api/*.ts` — Ambiente Beta)

Ao criar, refatorar ou mover handlers para Vercel Functions em `api/` (consulte também [docs/VERCEL_BETA_ROUTING.md](../../../docs/VERCEL_BETA_ROUTING.md)):

1. **Prefixo `_` obrigatório para helpers internos:** qualquer arquivo em `api/` que não seja um endpoint HTTP público (dispatchers, helpers Admin, tipos) **deve** começar com `_` (ex.: `api/_firebaseAdmin.ts`, `api/_aiActionDispatcher.ts`, `api/_orderTrackingActionDispatcher.ts`). Arquivos sem `_` são compilados pela Vercel como rotas públicas `/api/<nome>`, podendo retornar `500 FUNCTION_INVOCATION_FAILED` e consumir slots de deployment.
2. **Consolidar por dispatcher de domínio (limite Hobby `NO_MORE_FUNCTIONS`):** em projetos Vite com pasta `api/`, cada arquivo sem `_` conta como 1 Serverless Function separada. Para evitar o erro histórico do plano Hobby (`NO_MORE_FUNCTIONS` — máximo de **12 Serverless Functions** por deployment) e reduzir cold starts, sempre agrupe ações relacionadas em um único dispatcher por domínio (`api/order-tracking.ts`, `api/ai-chat.ts`, `api/mcp-admin.ts`, `api/alexa.ts`, etc.) em vez de criar um arquivo por callable.
3. **Ordem de proteção de origem (`x-beta-edge-secret`):** todo endpoint encaminhado pelo Worker `functions-beta` (`api.beta.luisices.com.br`) deve chamar `assertBetaEdgeRequest(req.headers?.['x-beta-edge-secret'])` **antes** de `OPTIONS`, verificação de método HTTP ou `getFirebaseAdmin()`.
4. **Gatilhos de deploy na Vercel:** sempre que uma Vercel Function em `api/` passar a importar um módulo em `functions/`, confirme que o caminho do módulo está listado no filtro `paths:` de `.github/workflows/deploy-vercel-dev.yml` e que `vercel.json` mantém `"git": { "deploymentEnabled": false }` para impedir sobrescrita automática pela branch `main`.

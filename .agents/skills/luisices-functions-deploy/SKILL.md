---
name: luisices-functions-deploy
description: >-
  Use this skill whenever writing, refactoring, isolating, or deploying Firebase
  Cloud Functions in Luisices. Enforces domain entrypoint isolation, domain-scoped
  selective deployment, and prevents monolithic graph coupling.
---

# Luisices Cloud Functions Modularization & Selective Deploy Runbook

This skill outlines the strict architectural rules for managing, modularizing, and deploying Cloud Functions in Luisices. Inspect `functions/index.js` to see all domain modules.

**Reference Architecture:** [docs/AUDITORIA_DEPENDENCIAS_FUNCTIONS_E_PLANO.md](../../docs/AUDITORIA_DEPENDENCIAS_FUNCTIONS_E_PLANO.md)

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

CI (`.github/workflows/deploy-production.yml`, step `Detect production components`) runs `git diff` against the previous commit and chooses `functions_scope`:

| Changed files under `functions/` | Resulting scope |
|---|---|
| Only one of `email`, `whatsapp`, `alexa`, `users`, `mcp`, `orders`, `ai` | That single domain (selective chunk deploy) |
| Exactly `ai` + `mcp` | `ai` (deploys the IA chunk **and** the MCP chunk, because `chatGptToolsEndpoint` consumes `ai/tools.js`) |
| Two or more other domains, or any file outside those folders (`common/`, `media/`, `index.js`, `package.json`, `scripts/sync-secrets-safe.mjs`) | `all` |

**Important:** scope `all` runs a single `firebase deploy --only functions` (all exported functions are updated). The per-domain chunked deploy in `deploy-functions-manual.yml` is only a **fallback** when that full deploy fails with a concurrency/quota error — it is not the default for multi-domain releases. To keep production deploys small, prefer releases that touch a single domain.

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

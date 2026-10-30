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

CI detects changed functions using native `git diff` against the base commit and selects the target domain (`orders`, `users`, `whatsapp`, `email`, `alexa`, `mcp`, `superfrete`). If multiple domains are modified, CI executes a partitioned, resilient multi-chunk deployment.

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

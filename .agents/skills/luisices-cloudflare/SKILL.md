---
name: luisices-cloudflare
description: >-
  Use this skill to audit, diagnose, configure, or deploy Cloudflare Workers
  (API Worker and CDN Worker), DNS records, SSL/TLS certificates, rate limiting,
  and routing for the Luisices platform.
---

# Luisices Cloudflare Runbook

This skill outlines the architecture, deployment rules, and diagnosis procedures for Cloudflare resources in Luisices.

---

## 🏛️ Architecture Overview

Luisices uses Cloudflare for edge routing, caching, and rate limiting:

1. **API Worker (`cloudflare/api-worker/`)**:
   * **Dev Route:** `api.dev.luisices.com.br/*` ➔ proxies to `https://us-central1-luisices-dev.cloudfunctions.net`
   * **Beta Custom Domain:** `api.beta.luisices.com.br` ➔ isolated `functions-beta` Worker, deployed only by `deploy-cloudflare-beta.yml`. Its allowlist proxies selected Vercel Beta APIs to `https://beta.luisices.com.br` and requires `BETA_VERCEL_ORIGIN_SECRET`. Order/catalog routes, MCP admin, and Alexa admin use the 30/minute binding; private gallery media uses its own 240/minute binding and preserves origin-specific CORS and private streaming. The workflow updates only the `api.beta` Worker Domain association; `api.dev` remains attached to `functions-dev` and is outside this workflow's scope.
   * **Prod Route:** `api.luisices.com.br/*` ➔ proxies to `https://us-central1-papelaria-dashboard.cloudfunctions.net`
   * **Rate Limiter:** `PUBLIC_ORDER_TRACKING_LIMITER` (30 req / 60s) to protect tracking endpoints from abuse.
   * Beta uses the Dev limiter namespace and a route/IP key for `POST /api/public-catalog-order`, `GET|HEAD /api/public-order-tracking`, and `POST /api/order-tracking`.

2. **CDN Worker (`cloudflare/cdn-worker/`)**:
   * **Dev Route:** `cdn-dev.luisices.com.br/*` ➔ proxies to `luisices-dev.firebasestorage.app` (TTL: 300s)
   * **Prod Route:** `cdn.luisices.com.br/*` ➔ proxies to `papelaria-dashboard.firebasestorage.app` (TTL: 1 year / 31536000s)

---

## 🔍 1. Audit and Diagnosis (Always Run First)

Before making any changes to DNS, Workers, or SSL, audit the current state:

```bash
npm run cloudflare:status
```

*Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in `.env.local`.*

### Resolving Route & Domain Discrepancies
If the audit reports route or custom domain mismatches, execute the automated repair:

```bash
npm run cloudflare:fix
```

### Edge Logic & Worker Unit Testing (Offline / Fast)
Before deploying, validate reverse proxy routing, CORS preflights, and Firebase Storage fallback logic:

```bash
CI=true ./node_modules/.bin/vitest run tests/unit/cloudflare-workers.test.ts
```

---

## 🚀 2. Deployment Procedures

Always deploy to **Dev** first and verify before deploying to **Production**.

### Development Deploy:
```bash
# Deploy both CDN and API Workers to Dev:
npm run cloudflare:deploy:dev

# Or deploy individually:
npm run cloudflare:deploy:api:dev
npm run cloudflare:deploy:cdn:dev
```

### Production Deploy (High Caution):
```bash
# Deploy both CDN and API Workers to Production:
npm run cloudflare:deploy:prod

# Or deploy individually:
npm run cloudflare:deploy:api:prod
npm run cloudflare:deploy:cdn:prod
```

---

## ⚠️ Critical Invariants (Never Break These)

1. **Never run raw `wrangler deploy` without `-c` and `-e`**:
   Always use the `package.json` scripts. Running bare `wrangler deploy` inside subfolders risks deploying dev configs into production.
2. **Rate Limiting Namespace IDs**:
   The rate limiters in `api-worker/wrangler.toml` rely on specific Cloudflare KV/Rate-Limit namespaces (`6634920187` for prod, `6634920188` for dev). Do not alter these IDs without auditing Cloudflare first.
3. **Cache Invalidation**:
   When changing static assets in Firebase Storage, remember that production CDN has a 1-year cache TTL (`31536000`). Use cache busting or purge via Cloudflare API if immediate freshness is required.

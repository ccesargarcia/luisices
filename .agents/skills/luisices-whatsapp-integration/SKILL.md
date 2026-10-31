---
name: luisices-whatsapp-integration
description: >-
  Use this skill when developing, testing, or debugging the WhatsApp integration
  via Evolution API, webhooks (functions/whatsapp/webhook.js), transactional message
  persistence (persistMessage.js), chat scopes, QR connection, and Error 463 handling.
---

# Luisices WhatsApp & Evolution API Integration Runbook

This skill outlines the architecture and invariants for managing WhatsApp customer communication, webhooks, and status checks.

---

## 🏛️ Architecture Overview

1. **Evolution API Server (OCI Cloud):**
   * Endpoint: `https://wa.luisices.com.br`
   * Hosted with PostgreSQL 15 + Redis (Baileys engine).
2. **Firebase Cloud Functions Entrypoints:**
   * **Webhook (`functions/whatsapp/webhook.js`):** Receives incoming customer messages and delivery receipts from Evolution API.
   * **Conversations (`functions/whatsapp/conversations.js`):** Reads, searches, and scopes chat histories for ateliê staff.
   * **Status (`functions/whatsapp/status.js`):** Monitors WhatsApp connection status (`open`, `close`, `connecting`).
   * **Persistence (`functions/whatsapp/persistMessage.js`):** Atomically commits messages to Firestore with deduplication.

---

## ⚠️ Critical Integration Invariants

1. **Idempotency & Message Deduplication:**
   WhatsApp webhooks can deliver the same message multiple times upon connection retries.
   * Always verify `message.key.id` in Firestore before creating a new conversation document or sending alerts.
2. **Error 463 Handling (Business Session Desync):**
   If Evolution returns delivery error `463`:
   * Do NOT re-queue or retry the message in an automatic loop.
   * Alert staff via mobile notification to re-authenticate the WhatsApp Web session.
3. **Environment Routing:**
   The repository currently exports `evolutionWhatsAppWebhook`; do not assume a development webhook export exists or that production traffic is mirrored to development. Verify the Home Assistant relay configuration and deployed endpoint before changing routing. Keep production customer events out of development unless an explicit, reviewed data-isolation plan allows it.

---

## 🧪 Testing & Verification

Run the integration and regression tests for WhatsApp functionality:

```bash
# Integration tests require the Firestore Emulator and integration config:
npm run test:integration

# Focused unit tests for conversation ownership and authorization:
npx vitest run tests/unit/whatsapp-conversation-core.test.ts tests/unit/whatsapp-chat-scope.test.ts tests/unit/whatsapp-authorization.test.ts
```

To run only `whatsapp-partner-scope.test.ts`, invoke Vitest with `--config vitest.integration.config.ts` inside `firebase emulators:exec` using the same `firebase.test.json` and `demo-luisices-review` project settings as `test:integration`.

---

## 🔍 Checking Evolution API Status

To verify session health directly via API:
```bash
curl -s https://wa.luisices.com.br/instance/fetchInstances -H 'apikey: <EVOLUTION_API_KEY>'
```
*Expected connectionStatus: `"open"`.*

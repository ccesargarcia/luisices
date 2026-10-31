---
name: luisices-alexa-integration
description: >-
  Use this skill when developing, deploying, or testing the Luisices Alexa Voice Skill,
  interaction models (alexa/skill-package/), ASK CLI deployments, voice pairing,
  or voice-assisted draft order handlers (functions/alexa/).
---

# Luisices Alexa Voice Skill Runbook

This skill outlines the procedures for maintaining the Luisices Alexa Skill, deploying interaction models, and managing voice-assisted order workflows.

---

## 🏛️ Architecture Overview

1. **Alexa Skill Package (`alexa/skill-package/`):**
   * Interaction Model: `pt-BR` custom voice model with intents for order queries, ateliê task reminders, and stock checks.
   * Manifest: `skill.json` configured with endpoints pointing to Firebase Cloud Functions.
   * Config File: `ask-resources.json` managing profiles and skill ID (`amzn1.ask.skill.1cd0031f-ada0-4da8-8721-2ad44b4b1c96`).

2. **Backend Handlers (`functions/alexa/index.js`):**
   * `alexaWebhook`: Receives and resolves voice intents.
   * `approveAlexaDraft` / `cancelAlexaDraft`: Allows staff to approve or reject order drafts created via Alexa voice commands.
   * `approveAlexaPairing` / `revokeAlexaBinding`: Manages secure account linking between Amazon accounts and Luisices users.

---

## 🚀 1. Deploying the Alexa Skill Package

To deploy updated voice interaction models or skill manifests to Amazon Developer Console:

```bash
npm run alexa:deploy
```

*This executes `ask deploy --target skill-package` using the configured ASK CLI profile.*

---

## 🧪 2. Testing & Verification

Before modifying interaction models or handler logic, run the voice unit test suites:

```bash
# Test state machine, dialog flows, and pt-BR slot validation:
CI=true ./node_modules/.bin/vitest run tests/unit/alexa/dialog.test.ts tests/unit/alexa/interaction-model.test.ts

# Test order drafting and transaction transitions:
CI=true ./node_modules/.bin/vitest run tests/unit/alexa/order-transaction.test.ts tests/unit/alexa/pricing-modes.test.ts
```

---

## ⚠️ Voice Workflow Invariants

1. **Draft Order Quarantine:**
   Orders initiated via Alexa voice commands are stored as **Drafts** (`status: 'draft'`).
   * They must NEVER be charged, sent to shipping, or inserted into the `salesLedger` until explicitly approved via `approveAlexaDraft` in the dashboard.
2. **Intent Synchronization:**
   Whenever a new Intent or Slot is added to `alexa/skill-package/interactionModels/custom/pt-BR.json`, the corresponding handler must be implemented and tested in `functions/alexa/`.
3. **Session Verification:**
   All incoming requests to `alexaWebhook` must validate the Amazon application ID against `ask-resources.json` to prevent unauthorized webhook invocation.

# Tarefas — whatsapp-email-beta-gateway

- [x] **T1 — Compatibilidade de runtime em `functions/whatsapp/` e `functions/email/` (RF-1):** desacoplar os 8 callables de `firebase-functions` e `@sentry/node` via `runtimeCompat.js` e exportar os handlers internos.
- [x] **T2 — Allowlist no Worker Beta (RF-2):** adicionar `POST /api/communications-admin` em `cloudflare/api-beta-worker/src/index.js` e cobrir em `tests/unit/api-beta-worker.test.ts`.
- [x] **T3 — Dispatcher `api/communications-admin.ts` e secrets CI (RF-3, RF-4):** criar `api/communications-admin.ts` com `assertBetaEdgeRequest` e sincronizar `RESEND_API_KEY` e `EVOLUTION_API_KEY` em `deploy-vercel-dev.yml`.
- [x] **T4 — Roteamento Beta e fallback nos serviços (RF-5):** atualizar `firebaseWhatsAppService.ts`, `emailService.ts`, `backendRoutingService.ts` e `BackendRoutingSettingsSection.tsx`.
- [x] **T5 — Testes unitários (CA-1, CA-2):** criar `tests/unit/communications-admin-api.test.ts` e `tests/unit/communications-service-routing.test.ts` e validar suítes de e-mail e WhatsApp existentes.
- [x] **T6 — Documentação e impacto de IA:** atualizar `docs/VERCEL_BETA_ROUTING.md` e `specs/features/README.md`.
- [ ] **T7 — Rollout coordenado e validação remota (CA-3, CA-4):** publicar Worker Beta e Vercel Beta e validar `403` direto, `401` sem sessão no gateway, `204` em `OPTIONS` e `405` em `GET`.

# Tarefas — users-beta-gateway

- [x] **T1 — Compatibilidade de runtime em `functions/users/` (RF-1):** desacoplar `functions/users/index.js` e submódulos de `firebase-functions` e `@sentry/node` via `runtimeCompat.js` e exportar os 15 handlers.
- [x] **T2 — Allowlist no Worker Beta (RF-2):** adicionar `POST /api/users-admin` em `cloudflare/api-beta-worker/src/index.js` e cobrir em `tests/unit/api-beta-worker.test.ts`.
- [x] **T3 — Dispatcher `api/users-admin.ts` (RF-3):** criar `api/users-admin.ts` com `assertBetaEdgeRequest`, tratamento de sessão para ações protegidas vs públicas de convite/reset e despacho das 15 ações.
- [x] **T4 — Roteamento Beta e fallback nos serviços (RF-4):** atualizar `firebaseUserService.ts`, `firebaseAuthService.ts`, `claimsRepairService.ts`, `backendRoutingService.ts` e `BackendRoutingSettingsSection.tsx`.
- [x] **T5 — Testes unitários (CA-1, CA-2):** criar `tests/unit/users-admin-api.test.ts` e `tests/unit/users-service-routing.test.ts` e validar as suítes existentes (`create-user-invitation-core.test.ts`, `complete-user-invitation-core.test.ts`, `device-logout-authorization.test.ts`, `claims-repair-resilience.test.ts`).
- [x] **T6 — Documentação e impacto de IA:** atualizar `docs/VERCEL_BETA_ROUTING.md` e `specs/features/README.md`.
- [x] **T7 — Rollout coordenado e validação remota (CA-3, CA-4):** publicar Worker Beta e Vercel Beta e validar `403` direto, `401` sem sessão no gateway, `204` em `OPTIONS` e `405` em `GET`.
  - Evidência: Worker Beta (`4418614`) e Vercel Beta (`44186958795`) publicados com sucesso; verificações remotas confirmaram `403` direto na origem, `401` em `createUser` sem sessão, `404` (`not-found`) em `validateUserInvitation` com token inválido, `OPTIONS` `204`, `GET` `405` e `404` em `_usersActionDispatcher`.
- [ ] **T8 — Validação autenticada no painel Beta e cutover (pendência pós-rollout):** testar manualmente com sessão autenticada em `beta.luisices.com.br` `registerDeviceSession`, `getUserAccountMetadata` e fluxo de convite/reparo de claims; acompanhar Web Vitals (Speed Insights) e gráfico de fallback `Vercel → GCP` antes de planejar o cutover do Firebase Hosting de `dev`.

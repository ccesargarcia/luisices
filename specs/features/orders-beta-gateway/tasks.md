# Tarefas — orders-beta-gateway

- [x] **T1 — Compatibilidade de runtime em `functions/orders/` (RF-1):** atualizar `functions/orders/index.js` e `functions/orders/superfrete.js` com `runtimeCompat.js` e exportar `handleCalculateSuperfreteShipping` e `handleCreateSuperfreteLabel`.
- [x] **T2 — Dispatcher `api/order-tracking.ts` e CI (RF-2, RF-3):** mover `assertBetaEdgeRequest` para o topo de `api/order-tracking.ts`, despachar `createOrder`, `updateComplexOrder`, `calculateSuperfreteShipping` e `createSuperfreteLabel`, e sincronizar `SUPERFRETE_SANDBOX_TOKEN` em `deploy-vercel-dev.yml`.
- [x] **T3 — Roteamento Beta e fallback nos serviços (RF-4):** atualizar `firebaseOrderService.ts`, `superfreteService.ts` e rótulo em `BackendRoutingSettingsSection.tsx`.
- [x] **T4 — Testes unitários (CA-1, CA-2):** criar `tests/unit/orders-admin-api.test.ts` e `tests/unit/superfrete-service-routing.test.ts` e validar a suíte de pedidos existente.
- [x] **T5 — Documentação e impacto de IA:** atualizar `docs/VERCEL_BETA_ROUTING.md` e `specs/features/README.md`.
- [x] **T6 — Validação local e remota (CA-3, CA-4):** rodar `npm run typecheck`, testes unitários, `git diff --check`, publicar na Vercel e validar `api.beta.luisices.com.br/api/order-tracking` vs origem direta.
  - Evidência: deploy Vercel `44166338230` concluído com sucesso; verificações remotas confirmaram bypass direto `403`, gateway sem sessão `401` (`createOrder` e `calculateSuperfreteShipping`), `OPTIONS` `204` e `GET` `405`.
- [x] **T7 — Gatilhos da publicação Vercel:** incluir `functions/orders/index.js` e `functions/orders/superfrete.js` nos caminhos monitorados por `deploy-vercel-dev.yml`, para que alterações isoladas nesses handlers também sejam publicadas.
- [x] **T8 — Cobertura direta do dispatcher:** extrair o roteamento das ações Beta para helper testável, cobrir as quatro ações e confirmar que ações de links seguem no dispatcher existente.

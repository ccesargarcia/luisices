# Tarefas — shipping-label-payment-confirmation

- [x] **T1 — RF-1, RF-2: confirmar pagamento de modo conservador:** detectar mensagem/status pendente, exigir evidência positiva de pagamento para liberar e salvar o ID/custo remoto sem reemitir quando pendente ou ambíguo.
  - Evidência: `functions/orders/superfrete.js` classifica `pending_payment` e `payment_unconfirmed`, e só registra `released` com status positivo ou link de impressão.
- [x] **T2 — RF-3, RF-4: refletir status no cliente:** diferenciar pendência de etiqueta liberada no diálogo e resumo do pedido.
  - Evidência: `SuperfreteGenerateLabelDialog.tsx`, `OrderShippingSection.tsx`, `src/app/types.ts`.
- [x] **T2.1 — RF-5: preservar estado ao recarregar pedido:** incluir os campos de frete nos mapeadores Firestore do contexto e serviço de pedidos.
  - Evidência: `src/contexts/OrdersContext.tsx` (`mapSnapshot`) e `src/services/firebaseOrderService.ts` (`mapOrderDoc`).
- [x] **T2.2 — RF-6: manter reserva em checkout inconclusivo:** não liberar nova tentativa após resposta de erro que não confirme se houve cobrança.
  - Evidência: `functions/orders/superfrete.js` persiste `payment_unconfirmed`, `tagId` e mensagem de reconciliação.
- [x] **T3 — Documentação e impacto de IA:** revisar guia, spec e catálogo; registrar não impacto Copiloto/MCP e limitação de reconciliação externa.
  - Evidência: `docs/FUNCIONALIDADES.md`, catálogo e esta spec.
- [ ] **T4 — Validação local e CI/deploy:** executar typecheck, lint e revisão do diff; depois confirmar workflows Firebase Dev e Vercel Dev/Beta sem deploy Cloudflare.
- [ ] **T5 — Fechamento:** registrar commit, publicação efetiva e limitações sem inferir sucesso antes dos workflows.

# Tarefas — shipping-label-payment-confirmation

- [x] **T1 — RF-1, RF-2: confirmar pagamento de modo conservador:** detectar mensagem/status pendente, exigir evidência positiva de pagamento para liberar e salvar o ID/custo remoto sem reemitir quando pendente ou ambíguo.
  - Evidência: `functions/orders/superfrete.js` classifica `pending_payment` e `payment_unconfirmed`, e só registra `released` com status positivo ou link de impressão.
- [x] **T2 — RF-3, RF-4: refletir status no cliente:** diferenciar pendência de etiqueta liberada no diálogo e resumo do pedido.
  - Evidência: `SuperfreteGenerateLabelDialog.tsx`, `OrderShippingSection.tsx`, `src/app/types.ts`.
- [x] **T3 — Documentação e impacto de IA:** revisar guia, spec e catálogo; registrar não impacto Copiloto/MCP e limitação de reconciliação externa.
  - Evidência: `docs/FUNCIONALIDADES.md`, catálogo e esta spec.
- [x] **T4 — Validação local:** executar typecheck e lint das Functions; revisar diff.
  - Evidência: typecheck sem erros; lint verificou 108 arquivos; `git diff --check` sem erros.
- [x] **T5 — Fechamento:** registrar status e limitações sem inferir publicação.
  - Evidência: concluída localmente; sem compra real, publicação ou deploy; reconciliação externa continua manual.

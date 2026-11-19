# Tarefas — order-card-click-area

- [x] **T1 — RF-1/CA-1:** remover bloqueio de clique no espaço vazio da linha de compartilhamento.
  - Evidência: `src/app/components/OrderCard.tsx` não interrompe mais propagação no contêiner.
- [x] **T2 — RF-2:** preservar a ação isolada dos botões de compartilhar/copiar.
  - Evidência: `stopPropagation` aplicado aos botões interativos.
- [ ] **T3 — Validação:** executar typecheck e revisão do diff.
  - Evidência: preencher após executar.
- [x] **T4 — Documentação e impacto de IA:** revisar guia de funcionalidades e registrar ausência de impacto em Copiloto/MCP.
  - Evidência: `docs/FUNCIONALIDADES.md` revisado; a correção de propagação não altera o comportamento do domínio, portanto sem edição necessária.
- [ ] **T5 — Fechamento:** registrar publicação e validação autenticada.
  - Evidência: preencher quando concluído.

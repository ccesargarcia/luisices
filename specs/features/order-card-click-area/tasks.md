# Tarefas — order-card-click-area

- [x] **T1 — RF-1/CA-1:** remover bloqueio de clique no espaço vazio da linha de compartilhamento.
  - Evidência: `src/app/components/OrderCard.tsx` não interrompe mais propagação no contêiner.
- [x] **T2 — RF-2:** preservar a ação isolada dos botões de compartilhar/copiar.
  - Evidência: `stopPropagation` aplicado aos botões interativos.
- [x] **T3 — Validação:** executar typecheck e revisão do diff.
  - Evidência: `npm run typecheck` e `git diff --check` passaram; confirmação visual autenticada ainda depende do usuário.
- [x] **T4 — Documentação e impacto de IA:** revisar guia de funcionalidades e registrar ausência de impacto em Copiloto/MCP.
  - Evidência: `docs/FUNCIONALIDADES.md` revisado; a correção de propagação não altera o comportamento do domínio, portanto sem edição necessária.
- [x] **T5 — Fechamento:** registrar publicação; manter validação autenticada pendente.
  - Evidência: commit `fc9ba6c` em `develop`; Firebase DEV `44532002744`, Vercel Beta `44532002584` e CodeQL `44532002588` passaram; `dev.luisices.com.br` e `beta.luisices.com.br` responderam HTTP 200.

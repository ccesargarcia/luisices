# Tarefas — Abrir mensagem em nova aba

- [x] **T1 — RF-1:** abrir a rota própria em nova aba pelo clique na mensagem.
- [x] **T2 — RF-2/RF-4:** implementar leitura protegida por ID, carregar corpo do Storage e reutilizar visualizador sanitizado.
- [x] **T3 — RF-3:** mostrar metadados, anexos disponíveis e retorno para Central.
- [x] **T4 — Documentação e IA:** atualizar Help Center e `docs/FUNCIONALIDADES.md`; Copiloto e MCP sem impacto de contrato.
- [x] **T5 — Validação:** `npm run typecheck` e `git diff --check` passaram; revisão confirmou rota protegida, leitura Firestore/Storage e reuso do visualizador sanitizado. Após deploy, DEV e Beta responderam HTTP 200 na raiz e na rota profunda; os bundles de entrada contêm a nova rota. A validação visual autenticada continua pendente.
- [ ] **T6 — Fechamento:** registrar resultado e estado da spec.

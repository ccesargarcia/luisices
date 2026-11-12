# Tarefas — quote-to-order

- [x] **T1 — RF-1 a RF-10:** mapear interface, cálculo, serviço, backend, Rules, estados e testes.
  - Evidência: referências e responsabilidades registradas em `spec.md` e `plan.md`.
- [x] **T2 — CA-1 a CA-8:** registrar critérios, limites e divergências dos canais.
  - Evidência: critérios explicitam elegibilidade, centavos, transação, replay e payload possivelmente desatualizado.
- [x] **T3 — Catálogo:** adicionar a baseline à lista de specs.
  - Evidência: entrada `quote-to-order` em `specs/features/README.md`.
- [x] **T4 — Validação:** executar `npm run typecheck` e `git diff --check` após as alterações.
  - Evidência: `npm run typecheck` concluiu com código 0; `git diff --check` concluiu sem apontamentos. Suítes de produto não foram executadas porque esta entrega só altera documentação.

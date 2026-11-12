# Tarefas — order-lifecycle

- [x] **T1 — RF-1 a RF-10:** consultar os guias e identificar entrypoints, regras, modelos e testes existentes.
  - Evidência: referências reunidas em `spec.md` e componentes mapeados em `plan.md`.
- [x] **T2 — CA-1 a CA-9:** registrar o contrato atual, escopo, critérios verificáveis e limites conhecidos.
  - Evidência: `spec.md` descreve critérios de regressão e separa integrações fora de escopo.
- [x] **T3 — Consistência documental:** ligar a baseline ao catálogo Spec-Driven.
  - Evidência: entrada `order-lifecycle` em `specs/features/README.md`.
- [x] **T4 — Validação:** executar `npm run typecheck` e `git diff --check` após as alterações.
  - Evidência: `npm run typecheck` concluiu com código 0; `git diff --check` concluiu sem apontamentos. Suítes de teste não foram executadas porque esta entrega só altera documentação.

# Tarefas — shipping-label-quote-gate

- [x] **T1 — RF-1, RF-2: vincular cotação aos dados atuais:** invalidar opções em mudanças de CEP/dimensões e aceitar somente resposta da chave corrente.
  - Evidência: estado `shippingQuotesKey` e limpeza de opções no diálogo.
- [x] **T2 — RF-1, RF-3: bloquear emissão:** exigir serviço selecionado com preço finito positivo no botão e no handler.
  - Evidência: `selectedShippingQuote`, `disabled` e guarda em `handleGenerate`.
- [x] **T3 — Documentação e impacto de IA:** atualizar guia, spec e catálogo; registrar que Copiloto e MCP não são afetados.
  - Evidência: `docs/FUNCIONALIDADES.md`, esta spec e `specs/features/README.md`.
- [x] **T4 — Validação:** executar `npm run typecheck`, revisar diff e rodar `git diff --check`.
  - Evidência: typecheck e `git diff --check` concluídos sem erros; o diff foi revisado.
- [x] **T5 — Fechamento:** atualizar status e evidências sem inferir publicação.
  - Evidência: spec marcada como concluída localmente; nenhuma publicação foi feita.

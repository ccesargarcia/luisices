# Tarefas — backend-fallback-diagnostics

- [x] **T1 — Classificar falhas SuperFrete:** usar somente códigos Firebase suportados para erros HTTP externos; mapear pagamento/validação/limite/timeout/5xx e adicionar testes sem chamada real ao provedor.
- [x] **T2 — Diagnóstico do fallback:** registrar rota, operação, duração e resumo seguro dos erros Beta e GCP; preservar eventos legados e não armazenar texto arbitrário.
- [x] **T3 — Histórico completo:** exibir todos os eventos disponíveis (máximo 50) no painel, sem alterar o desenho ou as configurações de roteamento.
- [x] **T4 — Documentação e validação:** atualizar guia/spec; typecheck, 66 testes focados em 7 arquivos, lint das Functions (108 arquivos) e `git diff --check` aprovados.
- [x] **T5 — Preservação de escopo:** `api.dev`, Worker de desenvolvimento, rotas e produção não foram alterados/publicados.

## Evidências

- Deploy/alteração remota: nenhum nesta tarefa; as mudanças estão apenas no workspace.
- Copiloto e MCP/ChatGPT: sem impacto.

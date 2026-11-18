# Tarefas — backend-fallback-diagnostics

- [x] **T1 — Classificar falhas SuperFrete:** usar somente códigos Firebase suportados para erros HTTP externos; mapear pagamento/validação/limite/timeout/5xx e adicionar testes sem chamada real ao provedor.
- [x] **T2 — Diagnóstico do fallback:** registrar rota, operação, duração e resumo seguro dos erros Beta e GCP; preservar eventos legados e não armazenar texto arbitrário.
- [x] **T3 — Histórico completo:** exibir todos os eventos disponíveis (máximo 50) no painel, sem alterar o desenho ou as configurações de roteamento.
- [x] **T4 — Documentação e validação:** atualizar guia/spec; typecheck, 66 testes focados em 7 arquivos, lint das Functions (108 arquivos) e `git diff --check` aprovados.
- [x] **T5 — Preservação de escopo:** Worker/rota Cloudflare `api.dev` e produção não foram publicados; Functions SuperFrete em Firebase Dev foram atualizadas e continuam atrás do Worker `api.dev` no caminho GCP.
- [x] **T6 — Publicação direta em `develop`:** Vercel Dev, Firebase Hosting Dev e Functions `calculateSuperfreteShipping`/`createSuperfreteLabel` publicados com sucesso. Worker Cloudflare ignorado. Evidências nos workflows 44421112396, 44421112428 e CodeQL 44421112538.

## Evidências

- Deploy: commit `406a305` publicado em `develop`; ambientes Dev atualizados. Nenhuma implantação de produção.
- Copiloto e MCP/ChatGPT: sem impacto.

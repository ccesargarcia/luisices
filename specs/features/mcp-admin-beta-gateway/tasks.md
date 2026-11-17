# Tarefas — mcp-admin-beta-gateway

- [x] **T1 — Spec e segurança (RF-1 a RF-8):** confirmar contratos, atores, permissões e fronteira pública/admin.
  - Evidência: `spec.md` e `plan.md` revisados contra handler, callables, client routing e Worker.
- [x] **T2 — Worker Beta (RF-1, RF-2, RF-6):** allowlist POST, forwarding do body/bearer/segredo, 405, chave IP/path e 429.
  - Evidência local: `tests/unit/api-beta-worker.test.ts` cobre forwarding, bearer, segredo, preflight, 405, 429 e negações. Deploy remoto pendente.
- [x] **T3 — Guard Vercel e URL cliente (RF-3, RF-4, RF-5, RF-7):** validar segredo primeiro e apontar cliente Beta para `api.beta` sem alterar fallback GCP.
  - Evidência local: `tests/unit/mcp-admin-api.test.ts`, `tests/unit/firebase-mcp-service-routing.test.ts` e `tests/unit/beta-host.test.ts` cobrem guard, URL e host. Os callables MCP e seus contratos não foram alterados.
- [x] **T4 — Qualidade e segurança local:** executar typecheck e testes focados e revisar workflow/escopo para preservar `api.dev`.
  - Evidência local: `npm run typecheck` passou; 10 arquivos focados passaram com 75 testes; `git diff --check` passou. Nenhum deploy foi executado nesta preparação.
- [x] **T5 — Documentação contínua:** atualizar guia Beta, catálogo e impactos Gemini/MCP; revisar links e precisão das afirmações.
  - Evidência: `docs/VERCEL_BETA_ROUTING.md`, `.agents/skills/luisices-cloudflare/SKILL.md`, catálogo e esta spec atualizados; Copiloto sem impacto e MCP público/OAuth preservado.
- [ ] **T6 — Deploy Beta e verificação:** publicar apenas Worker `functions-beta` e a Function Vercel Beta; provar bypass 403, CORS/preflight, autorização e fallback esperado.
  - Evidência: executar fase 1 (Worker Beta), verificar, depois fase 2 (Vercel/client); registrar workflows e requests. Os jobs de Worker/Functions Dev devem ficar skipped e `api.dev` sem alteração.

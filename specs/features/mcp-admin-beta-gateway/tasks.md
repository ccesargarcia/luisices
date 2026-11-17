# Tarefas — mcp-admin-beta-gateway

- [x] **T1 — Spec e segurança (RF-1 a RF-8):** confirmar contratos, atores, permissões e fronteira pública/admin.
  - Evidência: `spec.md` e `plan.md` revisados contra handler, callables, client routing e Worker.
- [x] **T2 — Worker Beta (RF-1, RF-2, RF-6):** allowlist POST, forwarding do body/bearer/segredo, 405, chave IP/path e 429.
  - Evidência: `tests/unit/api-beta-worker.test.ts` cobre forwarding, bearer, segredo, preflight, 405, 429 e negações; [workflow Beta](https://github.com/ccesargarcia/luisices/actions/runs/43984969755) concluiu com sucesso e a chamada remota passou pelo Worker até retornar 401 por falta de sessão.
- [x] **T3 — Guard Vercel e URL cliente (RF-3, RF-4, RF-5, RF-7):** validar segredo primeiro e apontar cliente Beta para `api.beta` sem alterar fallback GCP.
  - Evidência: `tests/unit/mcp-admin-api.test.ts`, `tests/unit/firebase-mcp-service-routing.test.ts` e `tests/unit/beta-host.test.ts` cobrem guard, URL e host; [deploy Vercel](https://github.com/ccesargarcia/luisices/actions/runs/43985221593) concluiu com sucesso. Acesso direto à origem retornou 403 e o gateway sem sessão retornou 401. Os callables MCP e seus contratos não foram alterados.
- [x] **T4 — Qualidade e segurança local:** executar typecheck e testes focados e revisar workflow/escopo para preservar `api.dev`.
  - Evidência: `npm run typecheck`, build, 10 arquivos focados com 75 testes e `git diff --check` passaram; no workflow de Dev, deploys de Worker Dev e Functions Dev ficaram `skipped`.
- [x] **T5 — Documentação contínua:** atualizar guia Beta, catálogo e impactos Gemini/MCP; revisar links e precisão das afirmações.
  - Evidência: `docs/VERCEL_BETA_ROUTING.md`, `.agents/skills/luisices-cloudflare/SKILL.md`, catálogo e esta spec atualizados; Copiloto sem impacto e MCP público/OAuth preservado.
- [x] **T6 — Deploy Beta e verificação:** publicar apenas Worker `functions-beta` e a Function Vercel Beta; provar bypass 403, CORS/preflight, autorização e fallback esperado.
  - Evidência: fase 1 Worker [concluída](https://github.com/ccesargarcia/luisices/actions/runs/43984969755), fase 2 Vercel [concluída](https://github.com/ccesargarcia/luisices/actions/runs/43985221593). Requests remotos: origem direta 403, gateway sem sessão 401, OPTIONS 204, GET 405. Jobs Cloudflare Worker Dev e Firebase Functions Dev foram `skipped`; nenhuma alteração/deploy de `api.dev`.

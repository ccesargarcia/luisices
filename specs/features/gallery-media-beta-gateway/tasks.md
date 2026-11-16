# Tarefas — gallery-media-beta-gateway

- [x] **T1 — Spec e risco:** confirmar contrato atual de autorização, CORS, streaming, cache e deploy isolado.
  - Evidência: `spec.md` e `plan.md` revisados contra o núcleo da galeria e o Worker Beta.
- [x] **T2 — Worker Beta:** implementar allowlist GET/HEAD, CORS específico de galeria, forwarding de bearer/query, stream e binding de rate limit próprio; adicionar testes.
  - Evidência: `tests/unit/api-beta-worker.test.ts` cobre CORS, stream, query, segredo, limiter e negações; workflow Beta `43979971225` passou. Remotamente, preflight Beta retornou 204, origem externa 403 e GET sem bearer 401 via Cloudflare/Vercel.
- [x] **T3 — Function e cliente:** exigir segredo na Function Vercel e direcionar a URL Vercel Beta para `api.beta`; cobrir 403 sem segredo e host selection.
  - Evidência: testes da API Vercel e `beta-host` passaram; `npm run typecheck` e 18 testes focados passaram. O deploy Vercel concluiu com sucesso no workflow `43980295334`.
- [x] **T4 — Verificação remota:** validar CORS autorizado/negado, GET sem bearer (401), acesso direto sem segredo (403) e ausência de deploy de `api.dev`.
  - Evidência: em 2026-11-16, `api.beta` retornou 204 com ACAO exato para o preflight Beta, 403 para origem externa, 401 no GET sem bearer e 403 no acesso direto à Function Vercel sem segredo. O usuário confirmou funcionamento normal ao abrir a galeria privada no Beta. Nos workflows `43980295217` e `43981274463`, `Deploy Cloudflare Workers (Dev)` e `Deploy Firebase Functions (Dev)` ficaram skipped. O frontend Dev foi publicado; Worker e Function do `api.dev` não foram alterados.
- [x] **T5 — Documentação/fechamento:** sincronizar guias, índice de specs, impacto Gemini/MCP, status e evidências do rollout.
  - Evidência: links revisados; Copiloto/MCP registrados sem impacto; estado do rollout e confirmação de acesso autenticado atualizados nesta spec.

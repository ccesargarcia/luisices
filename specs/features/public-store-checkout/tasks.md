# Tarefas — public-store-checkout

- [x] **T1 — RF-1 a RF-12:** consultar fontes da vitrine, callable, Rules, limiter, gestão e conversão.
  - Evidência: referências e componentes listados em `spec.md` e `plan.md`.
- [x] **T2 — CA-1 a CA-10:** registrar comportamento atual, requisitos de confiança, limites, erros e fronteiras de escopo.
  - Evidência: critérios cobrem preço, indisponibilidade, abuso, idempotência, autorização e conversão.
- [x] **T3 — Catálogo:** adicionar a baseline à lista de funcionalidades especuladas.
  - Evidência: linha `public-store-checkout` em `specs/features/README.md`.
- [x] **T4 — Validação:** executar `npm run typecheck` e `git diff --check` após as alterações.
  - Evidência: `npm run typecheck` concluiu com código 0; `git diff --check` concluiu sem apontamentos. Suítes de produto não foram executadas porque esta entrega só altera documentação.
- [x] **T5 — Worker Beta:** permitir `GET|HEAD /api/public-catalog-products` e cobrir allowlist, segredo, rate limit, erro da origem e isolamento de host.
  - Evidência: `tests/unit/api-beta-worker.test.ts` passou (6 testes); `npm run typecheck` passou; workflow Cloudflare Beta `43975604342` concluiu com sucesso; consulta via `api.beta` chegou à Vercel e respondeu 200.
- [x] **T6 — Function e cliente Beta:** exigir segredo de origem em `api/public-catalog-products.ts`; direcionar a leitura Vercel do catálogo para `api.beta`, preservando fallback GCP e payload.
  - Evidência local: teste confirma 403 sem segredo/incorreto antes de iniciar Firebase Admin; teste de `betaHost` confirma `api.beta` no Beta e URL relativa fora dele; typecheck e 13 testes focados passaram.
- [x] **T7 — Deploy e verificação:** publicar Vercel; confirmar GET funcional pelo gateway, rejeição sem segredo no host Vercel, limite da borda e nenhum deploy/alteração de `api.dev`; atualizar evidências.
  - Evidência: workflow Cloudflare Beta `43975604342` e Vercel `43976983202` concluíram com sucesso; `api.beta` respondeu 200 e `beta.luisices.com.br` respondeu 403. O teste unitário valida 429 do limitador; no workflow Firebase Dev, deploy de Worker Cloudflare e Cloud Functions foi skipped.

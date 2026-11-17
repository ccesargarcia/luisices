# Tarefas — ai-enrichment-beta-gateway

- [x] **T1 — Suporte Vertex AI no enriquecimento (RF-2):** atualizar `functions/ai/enrichmentServices.js` para aceitar `options.vertexAi` e repassar ao `GeminiClient`.
- [x] **T2 — Despacho de ações em `api/ai-chat.ts` (RF-1, RF-4):** suportar `chat` (default), `enrichGalleryItem`, `enrichStoreProduct` e `getUsage`, validar `action` desconhecida (`400`) e mapear `not-found` (`404`).
- [x] **T3 — Roteamento Beta e fallback nos serviços (RF-3):** atualizar `firebaseGalleryService.enrichItemWithAi` e `firebaseStoreProductService.enrichStoreProductWithAi` com `executeWithGcpFallback('aiChat', ...)` e `getVercelBetaApiUrl('/api/ai-chat')`.
- [x] **T4 — Testes unitários (CA-1, CA-2):** expandir `tests/unit/ai-chat-api-origin.test.ts` e criar `tests/unit/ai-enrichment-service-routing.test.ts`.
- [x] **T5 — Documentação e impacto de IA:** atualizar `docs/VERCEL_BETA_ROUTING.md`, `docs/COPILOTO_IA.md` e `specs/features/README.md`.
- [x] **T6 — Validação local e remota (CA-3, CA-4):** rodar `npm run typecheck`, `npm run build`, testes focados, `git diff --check`, publicar na Vercel e validar `api.beta.luisices.com.br/api/ai-chat` vs origem direta.
  - Evidência: deploy Vercel `44163266089` concluído com sucesso; verificações remotas confirmaram bypass direto `403`, gateway sem sessão `401`, `OPTIONS` `204` e `GET` `405`.

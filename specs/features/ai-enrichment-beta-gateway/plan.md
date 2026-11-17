# Plano de implementação — ai-enrichment-beta-gateway

## Abordagem

Estender o handler existente `api/ai-chat.ts` para despachar também `enrichGalleryItem`, `enrichStoreProduct` e `getUsage` (mantendo `chat` como ação padrão quando `action` não for informada), reutilizando a rota `POST /api/ai-chat` já publicada no Worker `functions-beta` e mantendo o número total de Serverless Functions em `api/` inalterado (10 funções).

## Componentes afetados

| Área | Arquivos/módulos | Alteração |
|---|---|---|
| Núcleo de IA | `functions/ai/enrichmentServices.js` | Aceitar `options.vertexAi` e repassar ao `GeminiClient` |
| Handler Vercel | `api/ai-chat.ts` | Despachar `chat`, `enrichGalleryItem`, `enrichStoreProduct` e `getUsage`; mapear `not-found` para HTTP 404 |
| Serviços Frontend | `src/services/firebaseGalleryService.ts`, `src/services/firebaseStoreProductService.ts` | Usar `executeWithGcpFallback('aiChat', ...)` e `getVercelBetaApiUrl('/api/ai-chat')` |
| Testes | `tests/unit/ai-chat-api-origin.test.ts`, `tests/unit/ai-enrichment-service-routing.test.ts` | Cobrir despacho de ações, proteção de borda e roteamento/fallback no cliente |
| Documentação | `docs/VERCEL_BETA_ROUTING.md`, `docs/COPILOTO_IA.md`, `specs/features/README.md` | Documentar suporte às ações de enriquecimento e uso em `POST /api/ai-chat` |

## Segurança, compatibilidade e impacto em IA

- **Segurança:** `assertBetaEdgeRequest` continua executando antes de `OPTIONS`, método HTTP, inicialização do Firebase Admin e validação do token Bearer.
- **Compatibilidade:** chamadas existentes de chat (`{ message, history, imageBase64, mimeType }`) sem campo `action` continuam executando `aiAgentChat` sem qualquer mudança de contrato.
- **Copiloto (Gemini):** compartilha o endpoint `/api/ai-chat` e o contexto Vertex AI (`southamerica-east1`), sem alteração de prompt, ferramentas ou orçamento.
- **MCP / ChatGPT:** sem impacto.

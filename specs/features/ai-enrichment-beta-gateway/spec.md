# Enriquecimento Visual e Uso de IA pelo gateway Beta

- **ID:** `ai-enrichment-beta-gateway`
- **Status:** Concluída
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-17
- **Referências:** `docs/VERCEL_BETA_ROUTING.md`; `docs/COPILOTO_IA.md`; `api/ai-chat.ts`; `functions/ai/enrichmentServices.js`; `functions/ai/usageHandler.js`; `src/services/firebaseGalleryService.ts`; `src/services/firebaseStoreProductService.ts`; `cloudflare/api-beta-worker/src/index.js`.

## Problema e contexto

O Copiloto de IA (`aiAgentChat`) já trafega pelo gateway `https://api.beta.luisices.com.br/api/ai-chat` na Vercel (`gru1`) com Vertex AI (`southamerica-east1`) e proteção de origem `x-beta-edge-secret`. Porém, os fluxos de enriquecimento visual por IA da Galeria (`enrichGalleryItemWithAi`) e da Vitrine Pública (`enrichStoreProductWithAi`), além do handler administrativo de leitura histórica (`getAiUsage`), ainda chamam exclusivamente as Cloud Functions do GCP mesmo quando o usuário está no host Beta com a rota `aiChat` em modo `'vercel'`.

Como `POST /api/ai-chat` já está na allowlist do Worker `functions-beta` (com limite de 4 MiB na borda e proteção `x-beta-edge-secret`), podemos despachar as ações de IA (`chat` padrão, `enrichGalleryItem`, `enrichStoreProduct` e `getUsage`) no mesmo endpoint `POST /api/ai-chat`, sem adicionar novas Serverless Functions ao diretório `api/` e mantendo o fallback automático para o GCP.

## Objetivos

- Suportar as ações `enrichGalleryItem`, `enrichStoreProduct` e `getUsage` (além do comportamento padrão `chat`) em `POST /api/ai-chat`.
- Habilitar Vertex AI (`southamerica-east1`) com fallback automático para `GEMINI_API_KEY` também em `createAiEnrichmentServices`.
- Fazer `firebaseGalleryService.enrichItemWithAi` e `firebaseStoreProductService.enrichStoreProductWithAi` usarem `https://api.beta.luisices.com.br/api/ai-chat` nos hosts Beta quando a rota `aiChat` estiver efetiva para `'vercel'`, com fallback automático para as Cloud Functions equivalentes via `executeWithGcpFallback('aiChat', ...)`.
- Preservar contratos de entrada/saída, validações de orçamento (`AiBudgetManager`), permissões (`validateAiAccess`, `validateGalleryAccess`, escopo admin em `getUsage`) e proteção contra SSRF.

## Fora de escopo

- Alterar prompts, schemas, limites de orçamento ou regras de negócio de `functions/ai/handlers.js`.
- Alterar o Worker `functions-beta` (`POST /api/ai-chat` já está publicado na allowlist com limite de 4 MiB).
- Alterar `api.dev.luisices.com.br`, `functions-dev` ou Cloud Functions de produção/dev.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Usuário autenticado ativo com acesso à Galeria/IA | Executar `enrichGalleryItem` e `enrichStoreProduct` conforme permissões do perfil | Sem sessão ativa recebe 401; sem permissão no módulo recebe 403 (`permission-denied`) |
| Administrador ativo | Executar também `getUsage` | Usuários não-admin recebem 403 (`permission-denied`) em `getUsage` |
| Worker `functions-beta` | Encaminhar `POST /api/ai-chat` até 4 MiB e injetar `x-beta-edge-secret` | Corpo > 4 MiB recebe `413 vercel-payload-too-large` na borda |
| Chamada direta à Function Vercel | Nenhuma | Sem `x-beta-edge-secret` válido recebe 403 antes de inicializar Firebase Admin |

## Requisitos funcionais

- **RF-1 — Despacho por ação em `POST /api/ai-chat`:**
  - `action` ausente ou `'chat'` → `aiServices.handlers.aiAgentChat(callableRequest)`
  - `action === 'enrichGalleryItem'` → `enrichmentServices.handlers.enrichGalleryItemWithAi(callableRequest)`
  - `action === 'enrichStoreProduct'` → `enrichmentServices.handlers.enrichStoreProductWithAi(callableRequest)`
  - `action === 'getUsage'` → `createGetAiUsageHandler({ db: firestore })(callableRequest)`
  - Qualquer outro valor de `action` → `400 invalid-argument`.
- **RF-2 — Vertex AI no enriquecimento:** `createAiEnrichmentServices(adminInstance, apiKey, options)` aceita `options.vertexAi` e repassa ao `GeminiClient`, mantendo fallback automático para `GEMINI_API_KEY`.
- **RF-3 — Roteamento e fallback no cliente:** `firebaseGalleryService.enrichItemWithAi` e `firebaseStoreProductService.enrichStoreProductWithAi` usam `executeWithGcpFallback('aiChat', ...)` e `getVercelBetaApiUrl('/api/ai-chat')`. Respostas `413` (`vercel-payload-too-large`) ou qualquer resposta `>= 500` — inclusive o payload `{ error: { code: 'internal' } }` emitido pelo handler — disparam `VercelInfraError` para acionar o fallback GCP; erros de negócio `400`/`401`/`403`/`404`/`429` são propagados diretamente.
- **RF-4 — Mapeamento de erros HTTP:** `not-found` mapeado para `404` em `api/ai-chat.ts` (necessário quando `itemId` da galeria não existe).

## Critérios de aceitação

- **CA-1:** testes unitários verificam bloqueio `403` sem `x-beta-edge-secret`, rejeição de métodos diferentes de POST após validar a origem, despacho de `chat`, `enrichGalleryItem`, `enrichStoreProduct` e `getUsage`, e erro `invalid-argument` para ação desconhecida.
- **CA-2:** testes unitários dos serviços de cliente comprovam chamada a `https://api.beta.luisices.com.br/api/ai-chat` no host Beta e fallback automático para o callable GCP em erro `413` e em `500` com `{ error: { code: 'internal' } }`.
- **CA-3:** `npm run typecheck`, `npm run build`, testes unitários e `git diff --check` aprovados.
- **CA-4:** verificação remota após deploy Vercel confirma `403` direto na origem Vercel e `401` sem sessão via `https://api.beta.luisices.com.br/api/ai-chat` para `action: "enrichStoreProduct"`.

## Evidências de conclusão

- `npm run typecheck`, testes unitários (`tests/unit/ai-chat-api-origin.test.ts` e `tests/unit/ai-enrichment-service-routing.test.ts`) e `git diff --check` aprovados.
- Deploy Vercel concluído com sucesso no run [`44163266089`](https://github.com/ccesargarcia/luisices/actions/runs/44163266089).
- Verificação remota em `POST /api/ai-chat` (`{"action":"enrichStoreProduct"}`): chamada direta na origem Vercel `403`, gateway sem sessão `401`, `OPTIONS` `204` e `GET` `405`.
- **Correção de fallback (2026-11-17):** respostas `>= 500` agora acionam fallback mesmo quando o JSON inclui `error.code: 'internal'`; testes de regressão cobrem enriquecimento de Galeria e Vitrine. `ai-action-dispatcher.test.ts` cobre as quatro ações e ação desconhecida.

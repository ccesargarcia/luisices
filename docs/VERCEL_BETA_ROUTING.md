# ▲ Ambiente Beta na Vercel & Roteamento Dinâmico (`Vercel ↔ GCP`)

Este guia documenta a arquitetura paralela de desenvolvimento na Vercel (`beta.luisices.com.br` e `loja.beta.luisices.com.br`) compartilhando o projeto Firebase **`luisices-dev`**, incluindo as Vercel Functions em São Paulo (`gru1`) e o *feature flag* granular de roteamento com fallback automático para o GCP.

---

## 1. Domínios e Deploy Paralelo

- **Firebase Hosting (Dev tradicional):** `dev.luisices.com.br` e `loja.dev.luisices.com.br`, publicados via [deploy-dev.yml](../.github/workflows/deploy-dev.yml).
- **Vercel (Beta em `gru1`):** `beta.luisices.com.br` e `loja.beta.luisices.com.br`, publicados em paralelo na branch `develop` via [deploy-vercel-dev.yml](../.github/workflows/deploy-vercel-dev.yml) e [vercel.json](../vercel.json).
- **Observabilidade:** o `@vercel/speed-insights` em [App.tsx](../src/app/App.tsx) é instanciado somente quando `isVercelBetaHost()` ([betaHost.ts](../src/app/utils/betaHost.ts)) é verdadeiro (mobile e desktop).

---

## 2. Vercel Functions (`api/`) e Núcleos Compartilhados

Para evitar dependência de `@sentry/node` e `firebase-functions` (exclusivos de `functions/package.json`) no runtime da Vercel, a lógica de negócio fica isolada em módulos `*Core.js` sem dependências externas:

| Rota Vercel (`gru1`) | Cloud Function Equivalente (GCP) | Núcleo Compartilhado |
| :--- | :--- | :--- |
| `GET /api/health` | — | [api/health.ts](../api/health.ts) |
| `GET /api/gallery-media` | `galleryMedia` | [functions/media/galleryCore.js](../functions/media/galleryCore.js) |
| `GET /api/public-catalog-products` | `getPublicCatalogProducts` | [functions/orders/catalogCore.js](../functions/orders/catalogCore.js) |
| `POST /api/public-catalog-order` | `submitPublicCatalogOrder` | [functions/orders/publicCatalogOrderCore.js](../functions/orders/publicCatalogOrderCore.js) |
| `GET /api/public-order-tracking` | `getPublicOrderTracking` | [functions/orders/trackingCore.js](../functions/orders/trackingCore.js) |
| `POST /api/order-tracking` | `create/list/revoke/deleteOrderTrackingLink*` | [functions/orders/trackingAdminCore.js](../functions/orders/trackingAdminCore.js) |
| `POST /api/ai-chat` | `aiAgentChat` | [functions/ai/index.js](../functions/ai/index.js) |
| `POST /api/alexa` | `getAlexaIntegrationStatus`, `approveAlexaPairing`, `setAlexaPermission`, `revokeAlexaBinding`, `toggleGlobalAlexaIntegration`, `approveAlexaDraft`, `cancelAlexaDraft` | [functions/alexa/callables.js](../functions/alexa/callables.js) + [runtimeCompat.js](../functions/alexa/runtimeCompat.js) |

*(Nota: o webhook de entrada da Amazon Alexa `alexaWebhook` permanece nas Cloud Functions / `api.dev.luisices.com.br`, pois é a URL configurada no Skill Endpoint da Amazon.)*

- **Inicialização compartilhada na Vercel:** [api/_firebaseAdmin.ts](../api/_firebaseAdmin.ts) inicializa o `firebase-admin` com `preferRest: true` e valida sessões ativas via `assertActiveSessionFromBearer`.
- **Galeria interna:** [firebaseGalleryImageService.ts](../src/services/firebaseGalleryImageService.ts) mantém cache LRU em memória na sessão (até 80 blobs, limpo ao trocar de usuário) e deduplicação de fetches simultâneos; [galleryCore.js](../functions/media/galleryCore.js) mantém cache de 15s de `userProfiles`.

---

## 3. Feature Flag Granular e Fallback Automático

O roteamento é controlado em tempo real via documento `storeSettings/public` (campo `backendRouting`), gerenciado por [backendRoutingService.ts](../src/services/backendRoutingService.ts) e editável por administradores em **Configurações → Avançado & Segurança** ([BackendRoutingSettingsSection.tsx](../src/app/components/settings/BackendRoutingSettingsSection.tsx)).

- **`globalMode` (`'vercel' | 'gcp'`):** chave mestre global. Mudar para `'gcp'` redireciona imediatamente todas as rotas de volta para o Firebase Cloud Functions sem redeploy.
- **`autoFallbackToGcp` (`boolean`):** quando ativo, falhas de infraestrutura na Vercel (`5xx`, timeout ou erro de rede) acionam automaticamente a Cloud Function equivalente no GCP via `executeWithGcpFallback`. Erros de negócio/validação (`400`, `401`, `403`, `404`, `409`, `412`) **não** acionam fallback.
- **`routes.*` (`'inherit' | 'vercel' | 'gcp'`):** permite forçar rotas individuais (`galleryMedia`, `publicCatalogProducts`, `publicCatalogOrder`, `publicOrderTracking`, `orderTrackingAdmin`, `aiChat`, `alexa`) sem alterar as demais.
- **Segurança por host:** fora de `beta.luisices.com.br` e `loja.beta.luisices.com.br`, `resolveEffectiveProvider` sempre retorna `'gcp'`.

---

## 4. Impacto nas Integrações de IA (Copiloto e MCP)

- **Copiloto (Gemini):** quando `aiChat` está roteado para `'vercel'` em `beta.luisices.com.br`, a chamada vai para `POST /api/ai-chat` (tentando Vertex AI `southamerica-east1` com fallback automático para `GEMINI_API_KEY` em [geminiClient.js](../functions/ai/geminiClient.js)). O system prompt, as 9 ferramentas, permissões e orçamentos em `functions/ai/` permanecem inalterados; ao alternar para `'gcp'`, o frontend chama diretamente a Cloud Function `aiAgentChat`.
- **MCP / ChatGPT:** **sem impacto**. O servidor MCP e os endpoints OAuth/OpenAPI permanecem exclusivamente nas Cloud Functions via `api.dev.luisices.com.br` / `api.luisices.com.br`.

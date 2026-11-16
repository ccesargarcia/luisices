# ▲ Ambiente Beta na Vercel & Roteamento Dinâmico (`Vercel ↔ GCP`)

Este guia documenta a arquitetura paralela de desenvolvimento na Vercel (`beta.luisices.com.br` e `loja.beta.luisices.com.br`) compartilhando o projeto Firebase **`luisices-dev`**, incluindo as Vercel Functions em São Paulo (`gru1`) e o *feature flag* granular de roteamento com fallback automático para o GCP.

---

## 1. Domínios e Deploy Paralelo

- **Firebase Hosting (Dev tradicional):** `dev.luisices.com.br` e `loja.dev.luisices.com.br`, publicados via [deploy-dev.yml](../.github/workflows/deploy-dev.yml).
- **Vercel (Beta em `gru1`):** `beta.luisices.com.br` e `loja.beta.luisices.com.br`, publicados em paralelo na branch `develop` via [deploy-vercel-dev.yml](../.github/workflows/deploy-vercel-dev.yml) e [vercel.json](../vercel.json).
- **Gateway de APIs selecionadas:** `api.beta.luisices.com.br` é um Custom Domain do Worker `functions-dev`. Wrangler gerencia o registro DNS e o certificado de borda para esse hostname de segundo nível. O Worker encaminha apenas `POST /api/public-catalog-order`, `GET|HEAD /api/public-order-tracking` e `POST /api/order-tracking`; demais rotas recebem 404/405. O limite de borda é de 30 chamadas por minuto e por caminho/IP, usando o namespace de desenvolvimento existente `6634920188`.
- **Proteção da origem Vercel:** o Worker injeta `x-beta-edge-secret`, e as três Functions verificam o valor em tempo constante contra `BETA_VERCEL_ORIGIN_SECRET`. O workflow de Dev sincroniza `DEV_ORIGIN_SECRET` (ou `ORIGIN_SECRET` como fallback) para a Vercel e o binding secreto do Worker.
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
| `POST /api/alexa` | `getAlexaIntegrationStatus`, `approveAlexaPairing`, `setAlexaPermission`, `revokeAlexaBinding`, `toggleGlobalAlexaIntegration`, `approveAlexaDraft`, `cancelAlexaDraft` | [functions/alexa/callables.js](../functions/alexa/callables.js) + [runtimeCompat.js](../functions/common/runtimeCompat.js) |
| `POST /api/mcp-admin` | `getMcpSettingsStatus`, `createMcpApiKey`, `updateMcpApiKeyScopes`, `toggleMcpApiKey`, `revokeMcpApiKey`, `toggleGlobalMcp`, `setUserMcpEligibility`, `revokeMcpSession`, `getMcpAuditLogs`, `getMcpOpenApiSchema` | [functions/mcp/callables.js](../functions/mcp/callables.js) + [runtimeCompat.js](../functions/common/runtimeCompat.js) |
| `/.well-known/*`, `/oauth/*`, `/mcp`, `/openapi.json`, `/tools/*` | `chatGptToolsEndpoint` | [api/mcp-server.ts](../api/mcp-server.ts) + [functions/mcp/endpoint.js](../functions/mcp/endpoint.js) |

*(Nota: o webhook de entrada da Amazon Alexa `alexaWebhook` e o servidor MCP oficial em `api.dev.luisices.com.br` continuam ativos no GCP em paralelo; na Vercel, `https://beta.luisices.com.br` expõe o servidor MCP completo com OAuth 2.1 apontando para `beta.luisices.com.br`.)*

- **Inicialização compartilhada na Vercel:** [api/_firebaseAdmin.ts](../api/_firebaseAdmin.ts) inicializa o `firebase-admin` com `preferRest: true` e valida sessões ativas via `assertActiveSessionFromBearer`.
- **Galeria interna:** [firebaseGalleryImageService.ts](../src/services/firebaseGalleryImageService.ts) mantém cache LRU em memória na sessão (até 80 blobs, limpo ao trocar de usuário) e deduplicação de fetches simultâneos; [galleryCore.js](../functions/media/galleryCore.js) mantém cache de 15s de `userProfiles`.

---

## 3. Feature Flag Granular e Fallback Automático

O roteamento é controlado em tempo real via documento `storeSettings/public` (campo `backendRouting`), gerenciado por [backendRoutingService.ts](../src/services/backendRoutingService.ts) e editável por administradores em **Configurações → Avançado & Segurança** ([BackendRoutingSettingsSection.tsx](../src/app/components/settings/BackendRoutingSettingsSection.tsx)).

- **`globalMode` (`'vercel' | 'gcp'`):** chave mestre global. Mudar para `'gcp'` redireciona imediatamente todas as rotas de volta para o Firebase Cloud Functions sem redeploy.
- **`autoFallbackToGcp` (`boolean`):** quando ativo, falhas de infraestrutura na Vercel (`5xx`, timeout ou erro de rede) acionam automaticamente a Cloud Function equivalente no GCP via `executeWithGcpFallback`. Erros de negócio/validação (`400`, `401`, `403`, `404`, `409`, `412`) **não** acionam fallback.
- **`routes.*` (`'inherit' | 'vercel' | 'gcp'`):** permite forçar rotas individuais (`galleryMedia`, `publicCatalogProducts`, `publicCatalogOrder`, `publicOrderTracking`, `orderTrackingAdmin`, `aiChat`, `alexa`, `mcpAdmin`) sem alterar as demais.
- **Segurança por host:** fora de `beta.luisices.com.br` e `loja.beta.luisices.com.br`, `resolveEffectiveProvider` sempre retorna `'gcp'`.
- **Chamadas de API Beta:** as três rotas acima usam `api.beta.luisices.com.br`; as demais APIs continuam no host Beta e o roteamento/fallback por serviço permanece controlado pelo feature flag. A proteção de origem impede chamadas diretas às rotas Vercel protegidas sem passar pelo Worker.
- **Monitoramento e gráfico de fallbacks:** sempre que `executeWithGcpFallback` aciona o fallback para GCP, um evento é gravado localmente e sincronizado (para sessões autenticadas com permissão) em `storeSettings/backendRoutingTelemetry`, exibindo um gráfico `Recharts` por rota e os últimos eventos em **Configurações → Avançado & Segurança**.

---

## 4. Impacto nas Integrações de IA (Copiloto e MCP)

- **Copiloto (Gemini):** quando `aiChat` está roteado para `'vercel'` em `beta.luisices.com.br`, a chamada vai para `POST /api/ai-chat` (tentando Vertex AI `southamerica-east1` com fallback automático para `GEMINI_API_KEY` em [geminiClient.js](../functions/ai/geminiClient.js)). O system prompt, as 9 ferramentas, permissões e orçamentos em `functions/ai/` permanecem inalterados; ao alternar para `'gcp'`, o frontend chama diretamente a Cloud Function `aiAgentChat`.
- **MCP / ChatGPT:** as operações administrativas do painel rodam em `POST /api/mcp-admin` nos domínios `beta` quando `mcpAdmin` estiver em `'vercel'` (com fallback automático para GCP). Além disso, `https://beta.luisices.com.br` também expõe o servidor MCP/OAuth 2.1 completo via [api/mcp-server.ts](../api/mcp-server.ts) e rewrites em [vercel.json](../vercel.json), permitindo conectar o ChatGPT em paralelo a `https://beta.luisices.com.br` sem alterar `https://api.dev.luisices.com.br`.

## Provisionamento e limites operacionais

- [deploy-vercel-dev.yml](../.github/workflows/deploy-vercel-dev.yml) mantém os CNAMEs beta da Vercel como DNS-only. [deploy-cloudflare.yml](../.github/workflows/deploy-cloudflare.yml) remove apenas a rota/CNAME legados esperados e publica `api.beta` como Custom Domain do Worker, configurando o segredo de origem. O Custom Domain gera certificado para o hostname aninhado.
- O rate limiter do Worker é aproximado por localização da Cloudflare, não um contador global estrito. A proteção de origem evita bypass direto das três rotas limitadas, mas o limite pode variar entre localidades; limites estritos globais exigiriam estado coordenado.
- A criação remota do DNS e o deploy só são comprovados após execução bem-sucedida dos workflows com `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `VERCEL_TOKEN` e `DEV_ORIGIN_SECRET` (ou `ORIGIN_SECRET`) configurados.

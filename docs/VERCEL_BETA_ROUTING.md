# ▲ Ambiente Beta na Vercel & Roteamento Dinâmico (`Vercel ↔ GCP`)

Este guia documenta a arquitetura paralela de desenvolvimento na Vercel (`beta.luisices.com.br` e `loja.beta.luisices.com.br`) compartilhando o projeto Firebase **`luisices-dev`**, incluindo as Vercel Functions em São Paulo (`gru1`) e o *feature flag* granular de roteamento com fallback automático para o GCP.

---

## 1. Domínios e Deploy Paralelo

- **Firebase Hosting (Dev tradicional):** `dev.luisices.com.br` e `loja.dev.luisices.com.br`, publicados via [deploy-dev.yml](../.github/workflows/deploy-dev.yml).
- **Vercel (Beta em `gru1`):** `beta.luisices.com.br` e `loja.beta.luisices.com.br`, publicados em paralelo na branch `develop` via [deploy-vercel-dev.yml](../.github/workflows/deploy-vercel-dev.yml) e [vercel.json](../vercel.json).
- **Gateway de APIs selecionadas:** `api.beta.luisices.com.br` é associado ao Worker isolado `functions-beta`, separado de `functions-dev` (`api.dev`). O Worker encaminha `GET|HEAD /api/public-catalog-products`, `GET|HEAD /api/gallery-media`, `POST /api/public-catalog-order`, `GET|HEAD /api/public-order-tracking`, `POST /api/order-tracking`, `POST /api/mcp-admin`, `POST /api/alexa` e `POST /api/ai-chat`; demais rotas recebem 404/405. As rotas protegidas, exceto galeria, usam o limite de 30 chamadas por minuto e caminho/IP (`6634920188`); galeria tem binding próprio de 240/minuto e caminho/IP. O chat limita o corpo encaminhado à Vercel a 4 MiB.
- **Proteção da origem Vercel:** o Worker injeta `x-beta-edge-secret`, e as Functions protegidas verificam o valor em tempo constante contra `BETA_VERCEL_ORIGIN_SECRET` antes do processamento. O workflow de Dev sincroniza `DEV_ORIGIN_SECRET` (ou `ORIGIN_SECRET` como fallback) para a Vercel e o binding secreto do Worker. A galeria mantém CORS por origem permitida, streaming e `private, no-store`; o Worker não emite CORS wildcard nessa rota.
- **Estado da migração MCP Admin:** publicada em 16/11/2026 (horário de Brasília) em duas fases. O [workflow do Worker Beta](https://github.com/ccesargarcia/luisices/actions/runs/43984969755) concluiu com sucesso antes do [deploy Vercel](https://github.com/ccesargarcia/luisices/actions/runs/43985221593). Verificação remota: `POST` pelo gateway sem sessão retornou 401; chamada direta à origem Vercel retornou 403; preflight `OPTIONS` retornou 204; `GET` no gateway retornou 405. No workflow de Dev da segunda fase, deploys de Worker Dev e Functions Dev foram ignorados; o frontend Firebase Dev foi publicado.
- **Estado da migração Alexa Admin:** Worker e Vercel publicados em 16/11/2026 (horário de Brasília). Os [workflows do Worker Beta](https://github.com/ccesargarcia/luisices/actions/runs/43987633541) e [Vercel](https://github.com/ccesargarcia/luisices/actions/runs/43987891619) concluíram com sucesso. Verificação remota: gateway sem sessão 401, origem Vercel direta 403, OPTIONS 204 e GET 405. O usuário confirmou o painel funcionando com sessão autorizada. Worker Dev e Functions Dev ficaram `skipped`; o workflow publicou o frontend Firebase Dev. O webhook e o fluxo de voz continuam separados.
- **Observabilidade:** `@vercel/speed-insights` e `@vercel/analytics` em [App.tsx](../src/app/App.tsx) (`VercelBetaTelemetry`) são montados somente quando `isVercelBetaHost()` ([betaHost.ts](../src/app/utils/betaHost.ts)) é verdadeiro (`beta.luisices.com.br` e `loja.beta.luisices.com.br`, mobile e desktop). Fora desses hosts, nenhum script/beacon da Vercel é carregado.

### MCP público pelo gateway Beta

A migração do MCP público foi publicada após o merge do PR #188. O endereço canônico Beta agora é `https://api.beta.luisices.com.br/mcp`; clientes MCP existentes precisam autorizar novamente devido à troca do issuer/resource OAuth. `api.dev.luisices.com.br` conserva sua rota e identidade de OAuth próprias.

Após publicar, o Worker `api.beta` encaminhará allowlist específica para descoberta OAuth, OpenAPI, `/mcp`, `/tools/:toolName` e OAuth (`/oauth/authorize`, `/oauth/consent`, `/oauth/register`, `/oauth/token`, `/oauth/revoke`). O acesso direto à origem Vercel MCP exigirá o segredo do Worker. A tela `/oauth-consent` continuará na aplicação `beta.luisices.com.br`, enquanto suas chamadas de API usarão `api.beta`.

O MCP terá binding de rate limit isolado (120/minuto por hash de bearer; IP para chamadas anônimas), corpo máximo de 64 KiB e CORS restrito à origem da aplicação Beta. O binding nativo é aproximado por localização; as quotas de chave/usuário e OAuth no backend continuam sendo os limites autoritativos. O namespace `6634920189` precisa ser conferido como único na conta Cloudflare antes da publicação.

A origem/resource/issuer OAuth mudou de `beta.luisices.com.br` para `api.beta.luisices.com.br`. Conexões e tokens Beta existentes precisam de nova autorização; não há aceitação simultânea dos dois issuers. O workflow Vercel aguarda o Worker publicar `/mcp` antes de implantar a proteção e a nova identidade. PRs futuros que forem exclusivos do Beta e não devam publicar Firebase/Cloudflare Dev devem receber o label `beta-only-no-dev-deploy` antes do merge; os testes continuam, enquanto todos os alvos de deploy Dev são ignorados.

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
| `POST /api/order-tracking` | `createOrder`, `updateComplexOrder`, `calculateSuperfreteShipping`, `createSuperfreteLabel`, `create/list/revoke/deleteOrderTrackingLink*` | [functions/orders/index.js](../functions/orders/index.js), [superfrete.js](../functions/orders/superfrete.js), [trackingAdminCore.js](../functions/orders/trackingAdminCore.js) |
| `POST /api/ai-chat` | `aiAgentChat`, `enrichGalleryItemWithAi`, `enrichStoreProductWithAi`, `getAiUsage` | [functions/ai/index.js](../functions/ai/index.js), [enrichmentServices.js](../functions/ai/enrichmentServices.js), [usageHandler.js](../functions/ai/usageHandler.js) |
| `POST /api/alexa` | `getAlexaIntegrationStatus`, `approveAlexaPairing`, `setAlexaPermission`, `revokeAlexaBinding`, `toggleGlobalAlexaIntegration`, `approveAlexaDraft`, `cancelAlexaDraft` | [functions/alexa/callables.js](../functions/alexa/callables.js) + [runtimeCompat.js](../functions/common/runtimeCompat.js) |
| `POST /api/mcp-admin` | `getMcpSettingsStatus`, `createMcpApiKey`, `updateMcpApiKeyScopes`, `toggleMcpApiKey`, `revokeMcpApiKey`, `toggleGlobalMcp`, `setUserMcpEligibility`, `revokeMcpSession`, `getMcpAuditLogs`, `getMcpOpenApiSchema` | [functions/mcp/callables.js](../functions/mcp/callables.js) + [runtimeCompat.js](../functions/common/runtimeCompat.js) |
| `POST /api/communications-admin` | `sendWhatsAppDirectMessage`, `deleteWhatsAppMessage`, `syncWhatsAppChatMessages`, `getWhatsAppInstanceStatus`, `markWhatsAppChatRead`, `ensureWhatsAppConversation`, `sendCustomEmail`, `getEmailUsage` | [api/_communicationsActionDispatcher.ts](../api/_communicationsActionDispatcher.ts), [functions/whatsapp/](../functions/whatsapp/send.js), [functions/email/](../functions/email/send.js) |
| `POST /api/users-admin` | `createUser`, `updateUser`, `deleteUser`, `createUserInvitation`, `validateUserInvitation`, `completeUserInvitation`, `sendVerificationEmail`, `sendPasswordResetEmail`, `sendAdminPasswordReset`, `getUserAccountMetadata`, `recordUserPasswordChange`, `registerDeviceSession`, `revokeAllSessions`, `revokeDeviceSession`, `repairUserClaims` | [api/_usersActionDispatcher.ts](../api/_usersActionDispatcher.ts), [functions/users/](../functions/users/index.js) |
| `/.well-known/*`, `/oauth/*`, `/mcp`, `/openapi.json`, `/tools/*` | `chatGptToolsEndpoint` | [api/mcp-server.ts](../api/mcp-server.ts) + [functions/mcp/endpoint.js](../functions/mcp/endpoint.js) |

*(Nota: o webhook de entrada da Amazon Alexa `alexaWebhook` e o servidor MCP oficial em `api.dev.luisices.com.br` continuam ativos no GCP em paralelo; na Vercel, `https://beta.luisices.com.br` expõe o servidor MCP completo com OAuth 2.1 apontando para `beta.luisices.com.br`.)*

- **Inicialização compartilhada na Vercel:** [api/_firebaseAdmin.ts](../api/_firebaseAdmin.ts) inicializa o `firebase-admin` com `preferRest: true` e valida sessões ativas via `assertActiveSessionFromBearer`.
- **Convenção `api/_*.ts` e dispatchers de domínio:** em projetos Vite com pasta `api/`, todo arquivo sem prefixo `_` é publicado pela Vercel como 1 Serverless Function pública. Helpers internos devem usar prefixo `_` (`api/_firebaseAdmin.ts`, `api/_aiActionDispatcher.ts`, `api/_orderTrackingActionDispatcher.ts`) e novas operações devem ser consolidadas em dispatchers de domínio para reduzir *cold starts* e preservar compatibilidade com o limite histórico de 12 Serverless Functions por deployment no plano Hobby (`NO_MORE_FUNCTIONS`).
- **Galeria interna:** [firebaseGalleryImageService.ts](../src/services/firebaseGalleryImageService.ts) mantém cache LRU em memória na sessão (até 80 blobs, limpo ao trocar de usuário) e deduplicação de fetches simultâneos; [galleryCore.js](../functions/media/galleryCore.js) mantém cache de 15s de `userProfiles`.

---

## 3. Feature Flag Granular e Fallback Automático

O roteamento é controlado em tempo real via documento `storeSettings/public` (campo `backendRouting`), gerenciado por [backendRoutingService.ts](../src/services/backendRoutingService.ts) e editável por administradores em **Configurações → Avançado & Segurança** ([BackendRoutingSettingsSection.tsx](../src/app/components/settings/BackendRoutingSettingsSection.tsx)).

- **`globalMode` (`'vercel' | 'gcp'`):** chave mestre global. Mudar para `'gcp'` redireciona imediatamente todas as rotas de volta para o Firebase Cloud Functions sem redeploy.
- **`autoFallbackToGcp` (`boolean`):** quando ativo, falhas de infraestrutura na Vercel (`5xx`, timeout ou erro de rede) acionam automaticamente a Cloud Function equivalente no GCP via `executeWithGcpFallback`. No chat, o erro específico `vercel-payload-too-large` (413) também aciona o fallback para corpos acima de 4 MiB; o limite da Cloud Function continua valendo. Erros de negócio/validação e rate limit (`400`, `401`, `403`, `404`, `409`, `412`, `429`) não acionam fallback.
- **`routes.*` (`'inherit' | 'vercel' | 'gcp'`):** permite forçar rotas individuais (`galleryMedia`, `publicCatalogProducts`, `publicCatalogOrder`, `publicOrderTracking`, `orderTrackingAdmin`, `aiChat`, `alexa`, `mcpAdmin`, `communicationsAdmin`, `usersAdmin`) sem alterar as demais.
- **Segurança por host:** fora de `beta.luisices.com.br` e `loja.beta.luisices.com.br`, `resolveEffectiveProvider` sempre retorna `'gcp'`.
- **Chamadas de API Beta:** as rotas migradas usam `api.beta.luisices.com.br` quando o provedor Vercel está efetivo; as demais APIs continuam no host Beta e o roteamento/fallback por serviço permanece controlado pelo feature flag. A proteção de origem impede chamadas diretas às rotas Vercel protegidas sem passar pelo Worker.
- **Monitoramento e gráfico de fallbacks:** sempre que `executeWithGcpFallback` aciona o fallback para GCP, um evento é gravado localmente e sincronizado (para sessões autenticadas com permissão) em `storeSettings/backendRoutingTelemetry`, exibindo um gráfico `Recharts` por rota e os últimos eventos em **Configurações → Avançado & Segurança**.

---

## 4. Impacto nas Integrações de IA (Copiloto e MCP)

- **Copiloto e Enriquecimento Visual (Gemini):** quando `aiChat` está roteado para `'vercel'` em `beta.luisices.com.br`, o chat (`aiAgentChat`), o enriquecimento visual da Galeria (`enrichGalleryItemWithAi`) e da Vitrine Pública (`enrichStoreProductWithAi`), além de `getAiUsage`, vão pelo Worker a `POST /api/ai-chat` (tentando Vertex AI `southamerica-east1` com fallback automático para `GEMINI_API_KEY` em [geminiClient.js](../functions/ai/geminiClient.js)). O Worker encaminha até 4 MiB para a Vercel; um corpo maior pode usar o fallback GCP conforme `autoFallbackToGcp` e os limites existentes da callable. O system prompt, as 9 ferramentas, permissões e orçamentos em `functions/ai/` permanecem inalterados; ao alternar para `'gcp'`, o frontend chama diretamente as Cloud Functions equivalentes.
- **Alexa:** o painel administrativo chama `POST /api/alexa` quando `alexa` estiver roteado para Vercel. Após a migração, o painel Beta usa o Worker e mantém Firebase Auth e as autorizações por ação nos callables. O endpoint público da skill, a verificação Amazon e os fluxos de voz não passam por esse gateway e não são alterados.
- **MCP / ChatGPT:** as operações administrativas do painel rodam em `POST /api/mcp-admin` nos domínios `beta` quando `mcpAdmin` estiver em `'vercel'` (com fallback automático para GCP). Além disso, `https://beta.luisices.com.br` também expõe o servidor MCP/OAuth 2.1 completo via [api/mcp-server.ts](../api/mcp-server.ts) e rewrites em [vercel.json](../vercel.json), permitindo conectar o ChatGPT em paralelo a `https://beta.luisices.com.br` sem alterar `https://api.dev.luisices.com.br`.

## Provisionamento e limites operacionais

- [deploy-vercel-dev.yml](../.github/workflows/deploy-vercel-dev.yml) mantém os CNAMEs beta da Vercel como DNS-only. [deploy-cloudflare-beta.yml](../.github/workflows/deploy-cloudflare-beta.yml) publica somente `functions-beta`, configura o segredo de origem e atribui apenas o Custom Domain `api.beta` pela API da Cloudflare. O workflow não publica `functions-dev` nem altera `api.dev`; a associação existente de DNS/certificado do Custom Domain é preservada.
- Os rate limiters do Worker são aproximados por localização da Cloudflare, não contadores globais estritos: 30/min nas rotas de catálogo/pedidos e MCP Admin e 240/min na mídia privada da galeria. A proteção de origem evita bypass direto das seis rotas; os limites podem variar entre localidades.
- A criação remota do DNS e o deploy só são comprovados após execução bem-sucedida dos workflows com `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `VERCEL_TOKEN` e `DEV_ORIGIN_SECRET` (ou `ORIGIN_SECRET`) configurados.

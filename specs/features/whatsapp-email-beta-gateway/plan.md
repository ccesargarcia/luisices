# Plano de implementação — whatsapp-email-beta-gateway

## Abordagem

Consolidar os 6 callables do painel de WhatsApp e os 2 callables do painel de E-mail em um único endpoint `POST /api/communications-admin` (`api/communications-admin.ts`), ocupando apenas 1 slot adicional em `api/` (totalizando 11/12 funções no limite Hobby da Vercel). Publicar primeiro a rota no Worker `functions-beta` e em seguida a Function Vercel e os clientes frontend.

## Componentes afetados

| Área | Arquivos/módulos | Alteração proposta |
|---|---|---|
| Núcleo WhatsApp e E-mail | `functions/whatsapp/{send,delete,sync,status,conversations}.js`, `functions/email/{send,usage}.js`, `functions/common/secrets.js` | Usar `runtimeCompat.js` e exportar handlers puros além dos `onCall` |
| Worker Beta | `cloudflare/api-beta-worker/src/index.js` | Adicionar `POST /api/communications-admin` em `ALLOWED_ROUTES` |
| Handler Vercel | `api/communications-admin.ts` | Validar `assertBetaEdgeRequest`, autenticar sessão e despachar as 8 ações |
| CI/CD Vercel | `.github/workflows/deploy-vercel-dev.yml` | Sincronizar `RESEND_API_KEY` e `EVOLUTION_API_KEY` |
| Serviços Frontend | `src/services/firebaseWhatsAppService.ts`, `src/services/emailService.ts`, `src/services/backendRoutingService.ts`, `src/app/components/settings/BackendRoutingSettingsSection.tsx` | Adicionar rota `communicationsAdmin` (ou reutilizar chave configurável) com `executeWithGcpFallback` |
| Testes | `tests/unit/api-beta-worker.test.ts`, `tests/unit/communications-admin-api.test.ts`, `tests/unit/communications-service-routing.test.ts` | Cobrir Worker, guard de origem e fallback |
| Documentação | `docs/VERCEL_BETA_ROUTING.md`, `specs/features/README.md` | Documentar a rota `/api/communications-admin` |

## Segurança, idempotência e impacto em IA

- **Segurança:** `assertBetaEdgeRequest` executa antes de qualquer processamento; RBAC e `chatScope` permanecem nos handlers.
- **Idempotência:** `sendCustomEmail` preserva `sendIdempotency.js` no Firestore; `sendWhatsAppDirectMessage` preserva `persistMessage.js`.
- **Copiloto (Gemini) e MCP/ChatGPT:** sem impacto (`whatsapp:compose` apenas gera rascunho de texto, não invoca este endpoint).

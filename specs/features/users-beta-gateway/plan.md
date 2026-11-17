# Plano de implementação — users-beta-gateway

## Abordagem

Consolidar os 15 callables de gestão de usuários, convites, autenticação e sessões de dispositivo em um único dispatcher `POST /api/users-admin` (`api/users-admin.ts`), ocupando o 12º slot de Serverless Function em `api/` (respeitando o teto de 12 funções do plano Hobby na Vercel). Publicar primeiro a rota no Worker `functions-beta` e depois a Function Vercel e os serviços de cliente.

## Componentes afetados

| Área | Arquivos/módulos | Alteração proposta |
|---|---|---|
| Núcleo de Usuários | `functions/users/index.js`, `createUserInvitation.js`, `validateUserInvitation.js`, `completeUserInvitation.js`, `sendVerificationEmail.js`, `registerDeviceSession.js`, `deviceLogout.js` | Usar `runtimeCompat.js` e exportar handlers internos |
| Worker Beta | `cloudflare/api-beta-worker/src/index.js` | Adicionar `POST /api/users-admin` em `ALLOWED_ROUTES` |
| Handler Vercel | `api/users-admin.ts` | Validar `assertBetaEdgeRequest`, tratar sessão obrigatória vs opcional (convite/reset) e despachar as 15 ações |
| Serviços Frontend | `src/services/firebaseUserService.ts`, `src/services/firebaseAuthService.ts`, `src/services/claimsRepairService.ts`, `src/services/backendRoutingService.ts`, `src/app/components/settings/BackendRoutingSettingsSection.tsx` | Roteamento Beta com `executeWithGcpFallback` |
| Testes | `tests/unit/api-beta-worker.test.ts`, `tests/unit/users-admin-api.test.ts`, `tests/unit/users-service-routing.test.ts` | Cobrir Worker, guard de origem, ações públicas/protegidas e fallback |
| Documentação | `docs/VERCEL_BETA_ROUTING.md`, `specs/features/README.md` | Documentar a rota `/api/users-admin` |

## Segurança, compatibilidade e impacto em IA

- **Segurança:** `assertBetaEdgeRequest` executa antes de qualquer processamento; revogação de sessão (`tokensValidAfterTime`), custom claims e verificações de ownership/admin permanecem idênticas.
- **Copiloto (Gemini) e MCP/ChatGPT:** sem impacto nos contratos; revogação de sessões e alterações de perfil em `users-admin` continuam refletindo imediatamente na autorização de IA e MCP via Firestore.

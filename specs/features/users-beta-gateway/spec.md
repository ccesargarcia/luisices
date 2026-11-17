# Gestão de Usuários, Convites e Sessões pelo gateway Beta

- **ID:** `users-beta-gateway`
- **Status:** Concluída
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-17
- **Referências:** `docs/VERCEL_BETA_ROUTING.md`; `functions/users/`; `src/services/firebaseUserService.ts`; `src/services/firebaseAuthService.ts`; `src/services/claimsRepairService.ts`; `cloudflare/api-beta-worker/src/index.js`.

## Problema e contexto

Os 15 callables do domínio de usuários, convites e sessões (`sendAdminPasswordReset`, `createUserInvitation`, `validateUserInvitation`, `completeUserInvitation`, `sendVerificationEmail`, `sendPasswordResetEmail`, `getUserAccountMetadata`, `recordUserPasswordChange`, `deleteUser`, `createUser`, `updateUser`, `registerDeviceSession`, `revokeAllSessions`, `revokeDeviceSession`, `repairUserClaims`) ainda rodam apenas nas Cloud Functions do GCP (`us-central1`) quando acionados a partir de `beta.luisices.com.br`.

Para manter o projeto dentro do limite de 12 Serverless Functions do plano Hobby na Vercel, todas as 15 ações devem ser consolidadas em um único dispatcher `api/users-admin.ts` (`POST /api/users-admin`, 12ª função em `api/`), protegido por `x-beta-edge-secret` no Worker `functions-beta` e integrado ao fallback automático para o GCP.

## Objetivos

- Isolar `functions/users/` de dependências diretas de `firebase-functions` e `@sentry/node` via `functions/common/runtimeCompat.js`.
- Adicionar `POST /api/users-admin` à allowlist de `cloudflare/api-beta-worker/src/index.js` e criar o dispatcher `api/users-admin.ts`.
- Preservar a distinção entre ações públicas autenticadas por token/código (`validateUserInvitation`, `completeUserInvitation`, `sendPasswordResetEmail`) e ações que exigem sessão Firebase ativa ou papel `admin`.
- Roteamento em `firebaseUserService.ts`, `firebaseAuthService.ts` e `claimsRepairService.ts` via `https://api.beta.luisices.com.br/api/users-admin` nos hosts Beta com fallback automático para os callables GCP (`executeWithGcpFallback`).

## Fora de escopo

- Alterar regras de RBAC, estrutura de `userProfiles`, sincronização de custom claims (`userSyncService.js`), auditoria (`userAudit.js`) ou `firestore.rules`.
- Alterar `api.dev.luisices.com.br` ou `functions-dev`.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Visitante com token de convite ou solicitando recuperação de senha | `validateUserInvitation`, `completeUserInvitation`, `sendPasswordResetEmail` | Sujeito às validações de token/expiração e rate limit nos handlers |
| Usuário autenticado ativo | `sendVerificationEmail`, `recordUserPasswordChange`, `registerDeviceSession`, `revokeDeviceSession` (próprio), `repairUserClaims` (próprio) | Não pode operar sobre UID de terceiros sem papel `admin` |
| Administrador ativo | `createUser`, `updateUser`, `deleteUser`, `createUserInvitation`, `sendAdminPasswordReset`, `getUserAccountMetadata`, `revokeAllSessions`, `revokeDeviceSession` (terceiros) | Exige `role === 'admin'` e sessão ativa não revogada |
| Worker `functions-beta` | Encaminhar `POST /api/users-admin` e injetar `x-beta-edge-secret` | Rate limit de 30 req/min por IP/caminho |
| Chamada direta à Function Vercel | Nenhuma | Sem `x-beta-edge-secret` válido recebe 403 antes de `OPTIONS`, método ou Firebase Admin |

## Requisitos funcionais

- **RF-1 — Compatibilidade de runtime:** `functions/users/index.js` e submódulos (`createUserInvitation.js`, `validateUserInvitation.js`, `completeUserInvitation.js`, `sendVerificationEmail.js`, `registerDeviceSession.js`, `deviceLogout.js`) usam `runtimeCompat.js` e exportam handlers invocáveis sem `firebase-functions`.
- **RF-2 — Allowlist no Worker Beta:** `cloudflare/api-beta-worker/src/index.js` permite `POST /api/users-admin`.
- **RF-3 — Dispatcher `api/users-admin.ts`:** valida `assertBetaEdgeRequest` antes de `OPTIONS` e `POST`; para ações públicas (`validateUserInvitation`, `completeUserInvitation`, `sendPasswordResetEmail`) constrói `request` com token Bearer opcional, e para as demais 12 ações exige `assertActiveSessionFromBearer`.
- **RF-4 — Roteamento e fallback no cliente:** `firebaseUserService.ts`, `firebaseAuthService.ts` e `claimsRepairService.ts` usam `executeWithGcpFallback` apontando para `https://api.beta.luisices.com.br/api/users-admin` nos hosts Beta.

## Critérios de aceitação

- **CA-1:** testes unitários do Worker Beta e de `api/users-admin.ts` comprovam bloqueio `403` sem `x-beta-edge-secret`, `405` em `GET`, `401` sem sessão para ações protegidas e encaminhamento para ações públicas de convite/reset.
- **CA-2:** testes unitários dos serviços de cliente comprovam chamada a `api.beta` no Beta e fallback para o callable GCP em erro `5xx`.
- **CA-3:** `npm run typecheck`, suítes unitárias de usuários/convites/claims/device-logout e `git diff --check` aprovados.
- **CA-4:** deploy coordenado (Worker Beta → Vercel Beta) e verificação remota confirmando `403` direto na origem, `401` sem sessão em ação protegida no gateway, `204` em `OPTIONS` e `405` em `GET`.

## Evidências de conclusão

- `npm run typecheck`, **110 testes unitários aprovados (0 falhas)** nas 8 suítes relacionadas (`users-admin-api`, `users-service-routing`, `create-user-invitation-core`, `complete-user-invitation-core`, `device-logout-authorization`, `claims-repair-resilience`, `api-beta-worker`, `backend-routing`), **69 testes aprovados** após ajuste de `sentryFunctions.onCall` para `VERCEL === '1'`, e `git diff --check` aprovados.
- Deploy do Worker Beta (`4418614`, 36s) e Deploy Vercel (`44186958795`, 2m14s) concluídos com sucesso.
- Verificação remota em `POST /api/users-admin`: chamada direta na origem Vercel `403`, ação protegida (`createUser`) sem sessão `401`, ação pública (`validateUserInvitation` com token inválido) `404` (`not-found`), `OPTIONS` `204`, `GET` `405`, e helper privado `api/_usersActionDispatcher` não exposto (`404`).

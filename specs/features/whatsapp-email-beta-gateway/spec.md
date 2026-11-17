# WhatsApp e E-mail (Painel) pelo gateway Beta

- **ID:** `whatsapp-email-beta-gateway`
- **Status:** Concluída
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-17
- **Referências:** `docs/VERCEL_BETA_ROUTING.md`; `functions/whatsapp/`; `functions/email/`; `src/services/firebaseWhatsAppService.ts`; `src/services/emailService.ts`; `cloudflare/api-beta-worker/src/index.js`.

## Problema e contexto

Os callables de comunicação acionados pelo painel interno — 6 do módulo WhatsApp (`sendWhatsAppDirectMessage`, `deleteWhatsAppMessage`, `syncWhatsAppChatMessages`, `getWhatsAppInstanceStatus`, `markWhatsAppChatRead`, `ensureWhatsAppConversation`) e 2 do módulo E-mail (`sendCustomEmail`, `getEmailUsage`) — ainda executam exclusivamente nas Cloud Functions do GCP (`us-central1`) mesmo quando o usuário acessa `beta.luisices.com.br`.

Para respeitar o limite de 12 Serverless Functions do plano Hobby na Vercel (atualmente em 10 arquivos em `api/`), ambos os domínios de comunicação devem compartilhar um único dispatcher `api/communications-admin.ts` (`POST /api/communications-admin`), protegido por `x-beta-edge-secret` no Worker `functions-beta` (`api.beta.luisices.com.br`) e integrado ao fallback automático para o GCP.

Os webhooks externos de recebimento (`evolutionWhatsAppWebhook` e `resendReceivingWebhook`) e o job agendado `cleanupEmailDrafts` (`onSchedule`) permanecem nas Cloud Functions do GCP.

## Objetivos

- Isolar os handlers dos 6 callables de WhatsApp e 2 callables de E-mail de dependências diretas de `firebase-functions` e `@sentry/node` via `functions/common/runtimeCompat.js`.
- Adicionar `POST /api/communications-admin` à allowlist de `cloudflare/api-beta-worker/src/index.js` e criar o dispatcher `api/communications-admin.ts` (11ª função em `api/`).
- Sincronizar `RESEND_API_KEY` e `EVOLUTION_API_KEY` para a Vercel em `.github/workflows/deploy-vercel-dev.yml`.
- Roteamento em `firebaseWhatsAppService.ts` e `emailService.ts` via `https://api.beta.luisices.com.br/api/communications-admin` nos hosts Beta com fallback automático para os callables GCP (`executeWithGcpFallback`).
- Preservar integralmente escopos de conversa (`chatScope.js`), tratamento do erro 463 da Evolution API, idempotência de envio de e-mail (`sendIdempotency.js`), validação de anexos e limites de quota.

## Fora de escopo

- Migrar os webhooks públicos `evolutionWhatsAppWebhook` e `resendReceivingWebhook` ou o agendador `cleanupEmailDrafts`.
- Alterar regras de negócio de `persistMessage.js`, `chatScope.js`, `sendIdempotency.js` ou `firestore.rules`.
- Alterar `api.dev.luisices.com.br` ou `functions-dev`.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Usuário ativo com permissão em WhatsApp | `sendWhatsAppDirectMessage`, `deleteWhatsAppMessage`, `syncWhatsAppChatMessages`, `getWhatsAppInstanceStatus`, `markWhatsAppChatRead`, `ensureWhatsAppConversation` dentro do seu `chatScope` | Sem sessão ativa recebe 401; fora do escopo da conversa ou sem permissão no módulo recebe 403 (`permission-denied`) |
| Usuário ativo com permissão em E-mail | `sendCustomEmail` e `getEmailUsage` conforme permissões do perfil | Sem sessão ativa recebe 401; sem permissão recebe 403 |
| Worker `functions-beta` | Encaminhar `POST /api/communications-admin` e injetar `x-beta-edge-secret` | Rate limit de 30 req/min por IP/caminho |
| Chamada direta à Function Vercel | Nenhuma | Sem `x-beta-edge-secret` válido recebe 403 antes de `OPTIONS`, método ou Firebase Admin |

## Requisitos funcionais

- **RF-1 — Compatibilidade de runtime:** `functions/whatsapp/{send,delete,sync,status,conversations}.js` e `functions/email/{send,usage}.js` usam `runtimeCompat.js` e fallback seguro para `RESEND_API_KEY` e `EVOLUTION_API_KEY`.
- **RF-2 — Allowlist no Worker Beta:** `cloudflare/api-beta-worker/src/index.js` permite `POST /api/communications-admin`.
- **RF-3 — Dispatcher `api/communications-admin.ts`:** valida `assertBetaEdgeRequest` antes de `OPTIONS` e `POST`, autentica a sessão via `assertActiveSessionFromBearer` e despacha as 8 ações (`sendWhatsAppDirectMessage`, `deleteWhatsAppMessage`, `syncWhatsAppChatMessages`, `getWhatsAppInstanceStatus`, `markWhatsAppChatRead`, `ensureWhatsAppConversation`, `sendCustomEmail`, `getEmailUsage`).
- **RF-4 — Segredos na Vercel:** `deploy-vercel-dev.yml` sincroniza `RESEND_API_KEY` e `EVOLUTION_API_KEY`.
- **RF-5 — Roteamento e fallback no cliente:** `firebaseWhatsAppService.ts` e `emailService.ts` usam `executeWithGcpFallback` apontando para `https://api.beta.luisices.com.br/api/communications-admin` nos hosts Beta.

## Critérios de aceitação

- **CA-1:** testes unitários do Worker Beta e de `api/communications-admin.ts` comprovam bloqueio `403` sem `x-beta-edge-secret`, `405` em `GET` e encaminhamento de `POST /api/communications-admin`.
- **CA-2:** testes unitários de `firebaseWhatsAppService` e `emailService` comprovam chamada a `api.beta` no Beta e fallback para o callable GCP em erro `5xx`.
- **CA-3:** `npm run typecheck`, testes unitários de WhatsApp/E-mail e `git diff --check` aprovados.
- **CA-4:** deploy coordenado (Worker Beta → Vercel Beta) e verificação remota confirmando `403` direto na origem, `401` sem sessão no gateway, `204` em `OPTIONS` e `405` em `GET`.

## Evidências de conclusão

- `npm run typecheck`, **58 testes unitários aprovados (0 falhas)** (`communications-admin-api.test.ts`, `communications-service-routing.test.ts`, `api-beta-worker.test.ts`, `email-service.test.ts`, `backend-routing.test.ts`) e `git diff --check` aprovados.
- Deploy do Worker Beta (`4418449...`, 46s) e Deploy Vercel (`44184494799`, 1m56s) concluídos com sucesso.
- Verificação remota em `POST /api/communications-admin`: chamada direta na origem Vercel `403`, gateway sem sessão `401`, `OPTIONS` `204`, `GET` `405`, e helper privado `api/_communicationsActionDispatcher` não exposto (`404`).

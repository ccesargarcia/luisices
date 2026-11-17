# Plano de implementação — alexa-beta-gateway

## Abordagem

Adicionar `POST /api/alexa` à allowlist do Worker `functions-beta`, encaminhar bearer/body e injetar o segredo já provisionado. Na Function Vercel, validar o segredo antes de qualquer tratamento. No `firebaseAlexaService`, usar `getVercelBetaApiUrl` para apontar ao Worker no host Beta. Preservar dispatcher, sete callables, fallback GCP e fluxo de voz independente.

Rollout em duas fases: (1) publicar somente Worker Beta e verificar que a rota alcança a Function atual; (2) publicar guard da Function e cliente. Desse modo o cliente só usa o novo domínio depois que a allowlist está operacional.

## Componentes existentes

| Área | Arquivos/módulos atuais | Alteração proposta |
|---|---|---|
| Worker Beta | `cloudflare/api-beta-worker/src/index.js` | Permitir POST `/api/alexa` no binding genérico existente |
| Handler Vercel | `api/alexa.ts`, `api/_firebaseAdmin.ts` | Adicionar guard de origem no início; preservar dispatch e tratamento de erro |
| Cliente | `src/services/firebaseAlexaService.ts`, `src/app/utils/betaHost.ts` | Resolver URL com helper existente e preservar fallback |
| Testes | `tests/unit/api-beta-worker.test.ts`, novos testes do handler/cliente, `tests/unit/alexa/authorization.test.ts` | Cobrir origem, forwarding, URL e autorização atual |
| Documentação | `docs/VERCEL_BETA_ROUTING.md`, skill Cloudflare, `specs/features/README.md`, spec desta mudança | Atualizar rotas, contagens, rollout e evidências |

## Contratos, dados e compatibilidade

- Contratos/API: preservar os sete valores `action`, payloads e respostas atuais.
- Dados/migração: nenhuma migração de dados.
- Integrações: somente cliente web Beta com provedor Vercel usa `api.beta`; outros hosts e GCP continuam como hoje.
- Alexa Skill: webhook público e callbacks de voz ficam nas Cloud Functions atuais.

## Segurança e integridade

- Autorização/ownership: validar segredo de origem e sessão ativa na Function; deixar role, owner e validação de payload nos callables existentes.
- Limites: binding Beta de 30/min por IP/path e rate limits internos do fluxo Alexa sem alteração.
- Ameaças: bypass direto da Function, token inválido/revogado, funcionário tentando ação de admin, titular tentando alterar binding alheio, ação inválida e indisponibilidade do Worker/Vercel.
- Privacidade: não registrar bearer nem segredo; respostas continuam `no-store`.
- Transações/idempotência: sem alteração; nenhuma lógica de pedido/voz é modificada.

## UX e documentação

- UI: sem alteração visual; somente URL de transporte do painel.
- Documentação revisada: `docs/VERCEL_BETA_ROUTING.md`, `docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md`, `functions/alexa/callables.js`.
- Atualizar guia Beta e runbook Cloudflare; confirmar que o endpoint de voz público não é descrito como Worker-gated.
- Copiloto (Gemini): sem impacto, não consome chamadas Alexa.
- MCP/ChatGPT: sem impacto, schemas, scopes, OAuth e transporte não mudam.
- Alexa: transporte do painel muda; integração e webhook de voz ficam distintos e inalterados.

## Validação e riscos

- Typecheck/build: `npm run typecheck`, `npm run build`.
- Testes: Worker, guard Vercel, client routing e autorização Alexa; Red Team/backend tests relevantes.
- Risco: segredo ausente bloqueia o painel Beta; mitigar publicando Worker primeiro e verificando 401 sem bearer antes da fase Vercel.
- Risco de limite compartilhado por IP: ações administrativas têm baixo volume; confirmar comportamento do binding existente e manter caminho GCP/fallback.

## Reversão

O fallback existente `alexa: gcp` reverte o serviço ao callable GCP. Para retirar o gateway, remover `/api/alexa` da allowlist em deploy Beta isolado; não tocar em `api.dev`.

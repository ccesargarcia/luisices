# Plano de implementação — mcp-public-beta-gateway

## Abordagem

Implementação local preparada na branch `feat/mcp-public-beta-gateway`, sem publicação. O Worker tem allowlist MCP própria; o handler Vercel valida o segredo antes do Firebase; OAuth separa origem API (`api.beta`) de UI/consentimento (`beta`); e a página de consentimento Beta chama a API pelo gateway. Permanecem pendentes a verificação Cloudflare do namespace, o rollout coordenado e o aceite remoto.

A troca de issuer/resource deve ser tratada como mudança de identidade OAuth: credenciais antigas vinculadas à origem Beta atual não renovarão nem serão aceitas após o corte; os clientes devem reconectar. Não aceitar tokens de duas origens. Configurar `VERCEL_MCP_ORIGIN`/`VERCEL_MCP_DOMAIN` para a API `api.beta` e uma nova `VERCEL_MCP_APP_ORIGIN` para UI/consentimento `beta`. Nenhuma etapa deve acionar deploy de `api.dev` ou `functions-dev`.

## Prioridades e sequência

1. **P0 — Preparar o corte:** confirmar com o usuário a janela de troca OAuth e a reconexão obrigatória; verificar a unicidade account-wide do namespace MCP; confirmar que o cliente ChatGPT usa Origin ausente e que a tela Beta usa `https://beta.luisices.com.br`. A conexão antiga pode falhar durante a troca e precisa de comunicação clara.
2. **P1 — Implementar e validar o caminho novo sem alterar o cliente ativo:** allowlist e testes no Worker Beta, segredo de origem no handler Vercel e verificações locais. Publicar o Worker Beta isoladamente enquanto a origem antiga ainda está ativa; o novo gateway pode responder com a configuração antiga até a fase seguinte.
3. **P2 — Corte coordenado de identidade OAuth:** mudar issuer/resource para `api.beta`, configurar origem da UI separadamente, atualizar consentimento e `resource_documentation`, proteger a origem e encaminhar o cliente para o novo domínio. Executar como uma janela coordenada; informar reconexão imediatamente.
4. **P3 — Aceite Beta:** provar discovery, autorização nova, consentimento, token, `tools/list`, uma ferramenta somente de leitura, bypass direto 403, limites e isolamento de `api.dev`; reconectar o cliente ChatGPT.
5. **P4 — Fechamento:** revisar documentação viva e telemetria sanitizada; ajustar limite se necessário e registrar evidências de deploy separadas dos testes locais.

## Componentes existentes

| Área | Arquivos/módulos atuais | Implementação na branch |
|---|---|---|
| Worker Beta | `cloudflare/api-beta-worker/src/index.js`; `cloudflare/api-beta-worker/wrangler.toml`; `tests/unit/api-beta-worker.test.ts` | Allowlist pública MCP separada da rota administrativa; limite de corpo; CORS por Origin; binding dedicado `BETA_VERCEL_MCP_LIMITER`, 120 req/min por hash de credencial (IP para anônimo); encaminha segredo sem log de payload |
| Handler Vercel | `api/mcp-server.ts`; `api/_firebaseAdmin.ts` | Valida segredo antes de inicializar Firebase Admin e encaminha ao endpoint |
| Endpoint MCP | `functions/mcp/endpoint.js`; `functions/mcp/oauth.js`; helpers OAuth em `functions/mcp/` | Configuração explícita para resource/issuer API e origem de UI; mantém descoberta, token, escopos e autorização coerentes; `resource_documentation` usa `/openapi.json`; valida Origin presente em `/mcp` apenas no runtime Vercel Beta |
| Rewrites Vercel | `vercel.json` | Preservar UI `/oauth-consent`; manter rewrites existentes, mas o handler MCP deve negar bypass direto sem segredo |
| Consentimento | `src/app/pages/OAuthConsent.tsx`; `src/app/utils/oauthEnvironment.ts`; `src/app/utils/betaHost.ts` | No Beta, chama `/oauth/authorize` pelo `api.beta`, mantendo a UI no host Beta |
| Configuração/deploy | `.github/workflows/deploy-vercel-dev.yml`; workflow de deploy Cloudflare Beta; secrets/env Vercel | Sincronizar configuração e segredo somente para recursos Beta; verificar que paths de Dev não são alterados |
| Testes e documentação | testes Worker/MCP/OAuth; `docs/VERCEL_BETA_ROUTING.md`; `docs/INTEGRACAO_CHATGPT_MCP.md`; `specs/features/README.md` | Cobrem os critérios locais; guias e índices registram a implementação pendente de publicação e a reconexão |

## Contratos, dados e compatibilidade

- Contratos/schema: preservar métodos e respostas atuais de discovery, JSON-RPC, tools e OAuth; não alterar os 31 tools sem decisão própria e confirmação contra o catálogo ativo na implementação.
- Identidade: definir `api.beta` como issuer/resource e audiência canônicos; atualizar geração/validação de tokens, metadata e challenges em conjunto. Não fazer dual issuer; exigir reconexão.
- UI: manter consentimento no domínio frontend Beta; usar configuração de origem da UI separada da origem MCP/OAuth.
- Migração: sem mudança de dados Firestore. Tokens existentes podem exigir nova conexão por mudança de issuer/resource; preparar comunicação e validar em cliente ChatGPT.
- Rate limit: namespace Worker MCP exclusivo, chave agregada por hash do bearer nas rotas autenticadas e por IP nas chamadas anônimas, 120 req/min inicialmente. Limite local/aproximado; backend preserva quotas autoritativas por chave/usuário. Não alterar o namespace geral de 30/min.
- CORS/Origin: aceitar `https://beta.luisices.com.br`, aceitar ausência de Origin para tráfego servidor-a-servidor e negar Origin presente fora da allowlist. Preservar headers MCP/OAuth necessários.
- Deploy: publicar Worker Beta e Vercel Beta em corte coordenado, com aviso e reconexão dos clientes; jamais incluir Worker Dev, Functions Dev ou `api.dev` no rollout.
- Rollback: planejar reversão coordenada de metadata, origem e gateway; não reverter apenas um componente deixando issuer/resource divergentes.

## Segurança e integridade

- Autorização e ownership: preservar OAuth, perfil ativo, escopos, permissões por módulo, tenant/ownership e redação de dados no endpoint MCP.
- Validação/limites: allowlist método/path; segredo em comparação segura no handler antes de Firebase; body cap 64 KiB na borda; CORS mínimo; rate limiting adequado ao volume/semântica de MCP.
- Integridade/idempotência: sem mudança nas ferramentas mutáveis, suas confirmações ou idempotência.
- Ameaças: bypass direto da origem Vercel; path traversal/normalização divergente; OAuth issuer/resource mismatch; perda de `Location`/`WWW-Authenticate`; rate limit compartilhado causando bloqueio; corpo grande; cache de resposta sensível; segredo ou payload em logs.

## UX e documentação

- UI/acessibilidade/design system: nenhuma mudança visual esperada; somente origem das chamadas OAuth.
- Documentação/specs revisadas: documentação de Beta e MCP, código de discovery/authorization e spec de MCP admin para manter separação público/admin.
- Documentação viva a atualizar após implementação: `docs/VERCEL_BETA_ROUTING.md`, `docs/INTEGRACAO_CHATGPT_MCP.md`, `docs/README.md` se necessário, catálogo e esta spec.
- Índices, exemplos e links: conferir URLs de Beta, comandos e links relativos.
- Copiloto (Gemini): sem impacto esperado; confirmar com as chamadas e ferramentas ativas durante implementação.
- MCP/ChatGPT: impacto em transporte, OAuth issuer/resource, sessão e reconexão; confirmar schema, scopes, tools, tenant, ownership e idempotência.
- Compatibilidade/paridade: não alterar contrato do Copiloto nem inferir paridade entre Copiloto e MCP.

## Validação e riscos

- Typecheck: `npm run typecheck`.
- Testes específicos: Worker Beta, handler MCP Vercel, endpoint OAuth/MCP, consentimento e suites de segurança/autorização indicadas pelas skills aplicáveis.
- Risco principal: conexões atuais falharão após troca de issuer/resource; mitigar com aviso, janela de corte e reconexão, sem alegar compatibilidade transparente.
- Risco operacional: falso positivo de rate limit; usar 120/min por credencial em namespace separado como ponto inicial, testar burst e observar telemetria sanitizada; reconhecer que o binding não é global/estrito.
- Risco de Origin: confirmar Origins reais do cliente ChatGPT e da tela de consentimento no teste de aceite antes de habilitar a política restrita.
- Risco de isolamento: workflow abrangente pode atingir Dev; auditar gatilhos, matrix e filtros de paths antes de qualquer deploy.

## Reversão

Preparar rollback coordenado para restaurar gateway, configuração OAuth e origem anteriores no Beta, com metadata e validação de tokens alinhadas. Manter a página consentimento no Beta. Não alterar `api.dev`; se um caminho de rollback depender de Dev, redesenhar o rollback antes do deploy.

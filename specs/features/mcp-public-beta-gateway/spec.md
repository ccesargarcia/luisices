# Servidor MCP público pelo gateway Beta

- **ID:** `mcp-public-beta-gateway`
- **Status:** Concluída
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-17
- **Referências:** `docs/VERCEL_BETA_ROUTING.md`; `docs/INTEGRACAO_CHATGPT_MCP.md`; `cloudflare/api-beta-worker/src/index.js`; `api/mcp-server.ts`; `functions/mcp/endpoint.js`; `src/app/pages/OAuthConsent.tsx`; `vercel.json`; `specs/features/mcp-admin-beta-gateway/`.

## Problema e contexto

Na inspeção inicial, o servidor MCP público do ambiente Beta respondia em `https://beta.luisices.com.br`. As rewrites Vercel direcionam descoberta, OAuth, ferramentas e `/mcp` para `api/mcp-server.ts`, que delega ao endpoint MCP. O Worker de `https://api.beta.luisices.com.br` ainda não incluía o servidor MCP público, e os metadados/defaults identificavam `beta.luisices.com.br` como origem. Após o merge do PR #188, o gateway MCP Beta foi publicado; as evidências remotas atuais estão registradas em `tasks.md`.

O handler MCP permite o runtime Vercel sem exigir a proteção de origem que é aplicada em outros caminhos. Assim, adicionar um proxy no Worker sem proteger a origem não impediria chamadas diretas ao host Beta. A tela de consentimento OAuth está hospedada no Beta e atualmente constrói chamadas para a API no mesmo host.

Esta especificação acompanha a implementação da branch `feat/mcp-public-beta-gateway` e seu rollout coordenado. A publicação mudou o issuer/resource e exige que clientes Beta existentes autorizem novamente. O aceite com reconexão ChatGPT e a checagem account-wide do namespace permanecem pendentes.

## Objetivos

- Encaminhar o MCP público Beta pelo domínio `https://api.beta.luisices.com.br`.
- Proteger o handler MCP Vercel contra bypass do Worker, preservando a descoberta OAuth pública pelo gateway.
- Separar a origem canônica da API/OAuth da origem da interface de consentimento hospedada em `https://beta.luisices.com.br`.
- Preservar ferramentas, schemas, escopos, permissões, ownership, respostas e validações existentes.
- Planejar explicitamente a reautorização de clientes OAuth afetados pela mudança de issuer/resource.
- Manter `api.dev.luisices.com.br`, o Worker `functions-dev` e as Firebase Functions de Dev intactos.

## Fora de escopo

- Alterar, publicar ou reconfigurar `api.dev.luisices.com.br`, `functions-dev` ou o Worker de Dev.
- Alterar o servidor MCP de Produção ou suas origens.
- Migrar o MCP administrativo `/api/mcp-admin` (já coberto por `mcp-admin-beta-gateway`).
- Alterar catálogo de ferramentas, seus schemas, escopos OAuth ou regras de autorização de negócio.
- Habilitar SSE no endpoint MCP; o comportamento atual de `GET /mcp` com `Accept: text/event-stream` deve ser preservado.
- Não realizar deploy manual nem reconfigurar `api.dev`; a publicação Beta ocorre pelos workflows autorizados em `develop`, com os gates e a verificação registrados nas tarefas.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Cliente MCP/ChatGPT | Consultar descoberta e iniciar OAuth pelo gateway; usar ferramentas após autenticação | OAuth, escopos, perfil ativo, permissões de módulo e ownership continuam obrigatórios |
| Worker `functions-beta` | Encaminhar somente rotas e métodos MCP explicitamente permitidos e adicionar o segredo de origem | Não substitui autenticação do usuário ou autorização das ferramentas |
| Vercel Beta MCP | Processar chamadas que chegam com o segredo válido do Worker | Acesso direto sem segredo recebe 403 antes de inicializar Firebase Admin |
| Interface de consentimento Beta | Exibir e concluir o consentimento, chamando APIs pelo gateway `api.beta` | Continua hospedada em `beta.luisices.com.br`; não deve depender de chamadas de API diretas à origem Vercel |
| `api.dev` e serviços Dev | Permanecem com o comportamento atual | Nenhuma alteração, deploy ou efeito indireto desta migração |

## Requisitos funcionais

- **RF-1 — Roteamento explícito:** permitir somente os caminhos canônicos abaixo, conferidos contra dispatch e rewrites durante a implementação; não criar um proxy aberto.
  - `GET /.well-known/oauth-protected-resource`, `/.well-known/oauth-protected-resource/mcp`, `/.well-known/oauth-authorization-server`, `/.well-known/oauth-authorization-server/mcp`, `/.well-known/openid-configuration`, `/.well-known/openid-configuration/mcp`, `/.well-known/ai-plugin.json`, `/.well-known/plugin.json`, `/ai-plugin.json` e `/plugin.json` (aliases legados existentes).
  - `GET /openapi.json`, `/openapi.yaml`, `/mcp` (health check atual).
  - `GET|POST /oauth/authorize`; `GET /oauth/consent`; `POST /oauth/register`, `/oauth/token`, `/oauth/revoke`.
  - `POST /mcp` e `POST /tools/:toolName`; `OPTIONS` somente para preflight desses caminhos.
  - Não encaminhar `/docs`, `/swagger`, `/api-docs`, aliases legados (`/register`, `/authorize`, `/token`, `/revoke`), `/favicon.ico` ou `/oauth-consent`. A página `/oauth-consent` continua no frontend de `beta.luisices.com.br`.
- **RF-2 — Descoberta e transporte:** preservar as respostas de `/.well-known/*`, documentos OpenAPI/manifests, `GET /mcp` de health, `POST /mcp`, notificações JSON-RPC e `/tools/:name` conforme suportados atualmente. Preservar o `405` quando `GET /mcp` solicitar SSE, pois SSE não está habilitado.
- **RF-3 — OAuth:** encaminhar os métodos atuais de registro, autorização, consentimento, token e revogação. Preservar query string, `Authorization`, `Location`, `WWW-Authenticate`, `Cache-Control`, status e corpos necessários ao fluxo.
- **RF-4 — Proteção da origem:** `api/mcp-server.ts` deve validar o segredo do Worker antes de inicializar Firebase Admin ou delegar ao endpoint. Chamadas diretas à origem Vercel sem segredo válido recebem 403. Comparação de segredo deve usar o helper seguro existente.
- **RF-5 — Identidade OAuth:** anunciar `https://api.beta.luisices.com.br` de forma consistente como origem/resource/issuer canônica, incluindo desafios e documentos de descoberta, sem confiar no header Host recebido. O resource canônico será a raiz `https://api.beta.luisices.com.br`; URLs de documentação anunciadas devem apontar a rotas realmente allowlisted (OpenAPI em `/openapi.json`).
- **RF-6 — Interface de consentimento:** manter `/oauth-consent` como página da aplicação Beta; no host Beta, suas chamadas de informação/autorização devem usar `https://api.beta.luisices.com.br`. Separar explicitamente configuração da API MCP da origem da UI/redirect da aplicação.
- **RF-7 — Limites e CORS:** limitar corpo no edge a 64 KiB, alinhado ao backend. Criar binding e namespace isolados para MCP Beta, sem alterar `BETA_VERCEL_API_LIMITER`; valor inicial proposto: 120 requisições/minuto por credencial para requests autenticadas, usando SHA-256 do bearer como chave e nunca registrando o token. Chamadas anônimas de descoberta/initialize usam IP como chave apenas até autenticação. Este binding é mitigação aproximada de abuso, não teto global/contábil; quotas por chave/usuário e OAuth existentes no backend permanecem autoritativas. Em CORS, aceitar `https://beta.luisices.com.br` e requisições sem `Origin`; rejeitar qualquer outra origem presente. Permitir métodos `GET, POST, OPTIONS` e cabeçalhos `Authorization`, `Content-Type`, `Accept`, `MCP-Protocol-Version`, `Last-Event-ID`, `openai-ephemeral-user-id`, `sentry-trace` e `baggage`; expor `WWW-Authenticate`, `Location`, `Retry-After` e `X-MCP-Trace-Id` quando presentes.
- **RF-8 — Segurança de ferramentas:** manter verificações OAuth, escopos, perfil ativo, permissões, isolamento de tenant/ownership, redação de dados e idempotência existentes. Não registrar bearer, segredo, dados pessoais ou corpos de ferramentas.
- **RF-9 — Compatibilidade OAuth:** tokens e códigos emitidos com issuer/resource `https://beta.luisices.com.br` deixarão de ser aceitos após a mudança para `https://api.beta.luisices.com.br`, devido à verificação exata atual de issuer/audience e resource. A migração deve avisar usuários e prever reconexão/reautorização dos clientes; não haverá dupla aceitação nesta especificação.
- **RF-10 — Isolamento de ambientes:** alterações e deploys desta migração são limitados ao Worker `functions-beta`/domínio `api.beta`, à Vercel Beta e aos clientes/documentos Beta necessários. Nenhum workflow ou script pode implantar Worker Dev, Functions Dev ou modificar `api.dev`.
- **RF-11 — Origem MCP:** em todas as requisições a `/mcp`, validar o header `Origin` quando presente. Ausência de `Origin` é aceita para clientes servidor-a-servidor. Nunca usar `Origin` para escolher upstream, issuer ou tenant.

## Critérios de aceitação

- **CA-1 (RF-1, RF-2):** testes do Worker provam métodos/caminhos permitidos, rejeitam rota desconhecida e método não permitido sem chamar upstream; descoberta pública e `POST /mcp` funcionam pelo gateway.
- **CA-2 (RF-2):** `GET /mcp` mantém health atual e pedido SSE continua recebendo 405; requests JSON-RPC e notificações mantêm status e formato aceitos pelo cliente.
- **CA-3 (RF-3):** testes de OAuth cobrem discovery, register, authorize/consent, token e revoke; redirects e headers de desafio não são perdidos ou reescritos incorretamente.
- **CA-4 (RF-4):** chamada direta ao handler Vercel sem segredo ou com segredo inválido retorna 403 antes de inicialização Firebase; chamada pelo Worker chega ao handler com segredo válido.
- **CA-5 (RF-5, RF-6):** metadados, issuer, resource, `resource_documentation`, redirects de OAuth e tela de consentimento usam os hosts/rotas planejados de modo consistente: API em `api.beta`, UI em `beta`, documentação em `/openapi.json`.
- **CA-6 (RF-7):** payload acima de 64 KiB recebe 413 antes de encaminhamento; preflight permite somente métodos/cabeçalhos necessários; plano de rate limiting MCP é validado contra padrão real de chamadas e abuso.
- **CA-6a (RF-7, RF-11):** binding MCP isolado aplica 120/min por bearer hash em chamadas autenticadas e IP em chamadas anônimas, sem alterar o limite das demais APIs; Origin Beta passa, Origin diferente recebe 403 e chamadas servidor-a-servidor sem Origin continuam possíveis.
- **CA-7 (RF-8):** ferramentas e escopos permanecem inalterados; testes de autorização e segurança MCP relevantes passam.
- **CA-8 (RF-9):** o procedimento e a necessidade de reconectar clientes são documentados e verificados com uma conexão OAuth nova; tokens antigos são testados para registrar o comportamento real de transição.
- **CA-9 (RF-10):** diff, workflow e evidências de deploy demonstram que nenhum Worker/Function/rota `api.dev` foi alterado ou implantado.
- **CA-10:** verificação remota Beta comprova descoberta e conexão MCP via `api.beta`; origem direta do handler MCP recebe 403; texto e uma ferramenta de leitura autorizada funcionam pelo cliente integrado.

## Requisitos não funcionais e integridade

- Segurança/privacidade: segredo de origem é defesa de perímetro, não autenticação do usuário; manter OAuth e autorização de domínio. Rejeitar hosts inesperados sem derivar issuer do request.
- Integridade/idempotência: não alterar efeitos das ferramentas; ferramentas mutáveis mantêm confirmação, validação de versão e idempotência atuais.
- Disponibilidade/desempenho: respostas MCP/OAuth não devem ser cacheadas indevidamente; preservar streaming da resposta upstream quando existente e observar timeouts da Function Vercel.
- Compatibilidade: a mudança de identidade OAuth é potencialmente incompatível para tokens existentes e exige plano de reconexão; qualquer estratégia temporária de dupla aceitação precisa de requisito explícito e análise de segurança antes da implementação.
- Rate limit Cloudflare: o binding nativo é local por localização e aproximado/eventualmente consistente, não um limite global estrito. Se surgir requisito de teto global, avaliar controle separado (por exemplo, Durable Object); isso não é objetivo desta migração.
- Observabilidade: registrar apenas rota, método, status e identificador de trace não sensível; nunca registrar corpo, token ou segredo.

## Erros e casos-limite

- Rota ou método não allowlisted: 404 ou 405, sem chamar origem.
- Segredo de origem ausente/incorreto na origem: 403 antes de inicialização do Firebase.
- Corpo acima de 64 KiB: 413 no Worker; corpos malformados continuam recebendo erro do contrato MCP existente.
- Limite de tráfego: 429 conforme política MCP específica, sem bloquear silenciosamente clientes legítimos por limite geral inadequado.
- Token OAuth antigo após troca de issuer/resource: resultado documentado; cliente deve poder repetir conexão e obter novo consentimento.
- Vercel/Worker indisponível: 502/erro de gateway sem expor segredo, stack ou detalhes internos.
- Preflight: responder somente para métodos/cabeçalhos efetivamente necessários; não permitir que OPTIONS exponha a origem ou contorne o guard Vercel.
- Origin ausente: permitir em tráfego servidor-a-servidor; Origin presente fora da allowlist: 403.

## Dados e contratos afetados

- Rotas HTTP públicas de descoberta, MCP, ferramentas e OAuth no ambiente Beta.
- Origem/resource/issuer OAuth Beta e URLs de consentimento/redirect.
- Nenhuma coleção Firestore, formato de documento ou dado de usuário deve ser migrado.
- Catálogo de ferramentas, schemas, escopos e contrato de autorização permanecem iguais.

## Impacto na documentação

- Guias/specs/fontes revisados: `docs/VERCEL_BETA_ROUTING.md`, `docs/INTEGRACAO_CHATGPT_MCP.md`, Worker Beta, handler Vercel MCP, endpoint MCP, rewrites, `OAuthConsent.tsx` e spec `mcp-admin-beta-gateway`.
- Documentação atualizada nesta implementação: guia de roteamento Beta, guia ChatGPT/MCP e catálogo de specs. O runbook de corte/reconexão ainda precisa de aprovação antes da publicação.
- Índices, exemplos e links: conferir `specs/features/README.md`, `docs/README.md` e referências ao endpoint Beta.
- Copiloto (Gemini): sem impacto esperado; não altera transporte, ferramentas ou permissões do Copiloto. Confirmar durante implementação.
- MCP/ChatGPT: impacto direto no transporte Beta e na identidade OAuth; revisar descoberta, issuer/resource, scopes, sessão, tenant/ownership, ferramentas e instruções de reconexão.
- Diferenças de comportamento Copiloto/MCP: manter as diferenças atuais; esta migração só muda a borda e a identidade pública do MCP Beta.

## Decisões e dúvidas

- **Confirmado:** o MCP Beta atualmente está roteado por `beta.luisices.com.br`; `/mcp` e endpoints OAuth são reescritos para `api/mcp-server.ts`.
- **Confirmado:** os defaults no handler anunciam `beta.luisices.com.br`; a página de consentimento Beta chama a API no próprio host. O helper OAuth atual monta `resource_documentation` em `/chatGptToolsEndpoint/openapi.json`, caminho que não deve ser anunciado pelo novo gateway.
- **Confirmado:** o handler MCP limita corpo a 64 KiB; `GET /mcp` responde 405 a pedido SSE; ferramentas MCP limitam chaves a até 300/h, OAuth limita usuário a 120/h e endpoints OAuth têm limites próprios por IP.
- **Implementado e publicado:** `VERCEL_MCP_ORIGIN=https://api.beta.luisices.com.br` e `VERCEL_MCP_DOMAIN=api.beta.luisices.com.br` definem API/resource/issuer. `VERCEL_MCP_APP_ORIGIN=https://beta.luisices.com.br` define UI/redirect de consentimento; nenhuma origem é derivada do request.
- **Implementado e publicado:** resource canônico único sem sufixo `/mcp`, `https://api.beta.luisices.com.br`; ambas as variantes de Protected Resource Metadata anunciam esse resource e `resource_documentation` aponta para `/openapi.json` no gateway.
- **Implementado e publicado:** handler Vercel MCP exige `BETA_VERCEL_ORIGIN_SECRET` antes de inicializar Firebase Admin.
- **Implementado e publicado:** sem compatibilidade dupla de issuer. Após o corte, o cliente precisa reconectar e autorizar novamente; nenhuma migração em massa de dados OAuth foi adicionada.
- **Implementado e publicado:** binding Cloudflare MCP isolado, 120 requisições/minuto por bearer hash e por família MCP; chamadas anônimas usam IP. Quotas existentes no backend permanecem autoritativas; não se reutiliza o binding geral de 30/min e tokens não são registrados.
- **Implementado e publicado:** permitir Origin `https://beta.luisices.com.br` e ausência de Origin; negar outros Origins presentes. O comportamento real do cliente ChatGPT ainda precisa de aceite.
- **Pendente operacional:** confirmar por consulta account-wide que o namespace `6634920189` é único e dedicado ao MCP Beta. O deploy do Worker passou, mas isso não substitui a auditoria de unicidade. O valor inicial não é um teto global estrito.
- **Restrição invariável:** `api.dev.luisices.com.br` não pode ser alterado em nenhuma etapa desta iniciativa.

## Validação

- Testes unitários do Worker Beta: allowlist, CORS, body cap, rate limit, forwarding e preservação de respostas/headers.
- Testes do handler Vercel MCP: segredo antes de Firebase, bypass 403 e forwarding aceito.
- Testes do endpoint/cliente: rotas discovery/MCP/OAuth, host de consentimento, issuer/resource e ferramentas sem mudança de contrato.
- Testes de Origin/CORS e cabeçalhos MCP: origem permitida/negada/ausente, `MCP-Protocol-Version`, `Accept` com JSON e SSE, `WWW-Authenticate` e `Retry-After` preservados.
- Validação local concluída antes do merge: `npm run typecheck`; 91 testes em 7 arquivos Worker/MCP/OAuth; lint de 107 arquivos Functions; build Vite; validação YAML/TOML e `git diff --check`.
- Wrangler dry-run indisponível neste ambiente Android ARM64 por ausência de binário `workerd` compatível; consulta account-wide Cloudflare não feita por falta de `CLOUDFLARE_API_TOKEN`.
- Deploy Cloudflare Beta (run `44002637046`) e Vercel Beta (run `44002637065`) concluíram com sucesso. `GET https://api.beta.luisices.com.br/mcp` e os documentos OAuth retornaram 200 e anunciaram `api.beta`; chamada direta à origem Vercel MCP retornou 403.
- `api.dev` respondeu 200 e continua anunciando `https://api.dev.luisices.com.br`. Worker Dev foi ignorado no run de merge.
- Limitação operacional do merge: workflow Firebase Dev publicou Hosting Dev e concluiu o deploy seletivo da família MCP antes do cancelamento. O run terminou `cancelled`, mas a etapa de Functions já havia concluído; isso motivou a spec `beta-only-dev-deploy-guard`. Nenhuma mudança na rota/issuer `api.dev` foi observada na verificação remota.
- Reconexão do cliente ChatGPT e auditoria account-wide do namespace continuam pendentes.

## Referências de protocolo e plataforma

- [MCP Authorization — versão 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization): descoberta de resource metadata e authorization server, resource e vinculação de audience.
- [MCP Transports — versão 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports): POST/GET, Accept, notificações 202, cabeçalho de versão e resposta 405 quando SSE não é oferecido.
- [Cloudflare Workers Rate Limiting API](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/): limites locais por localização e aproximados/eventualmente consistentes.

## Evidências de conclusão

- Implementação publicada após merge em 2026-11-17; validações locais e smoke checks remotos concluídos. Reautorização ChatGPT e confirmação account-wide do namespace permanecem pendentes.

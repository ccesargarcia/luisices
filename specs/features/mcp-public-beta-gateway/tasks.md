# Tarefas — mcp-public-beta-gateway

Worker e Vercel Beta publicados após merge do PR #188. O aceite de reconexão ChatGPT e a checagem account-wide do namespace ainda estão abertos.

- [ ] **T1 — Preparação OAuth (RF-5, RF-6, RF-9):** aprovar e comunicar a troca de issuer/resource; definir janela de corte e instruções de reconexão; não implementar dupla aceitação de issuer.
  - Evidência: aviso e procedimento aprovados antes de bloquear as rotas antigas.
- [ ] **T2 — Provisionamento da borda (RF-7, RF-10):** criar binding/namespace exclusivo MCP Beta (120 req/min por hash de bearer; IP para anônimo); verificar unicidade account-wide antes de publicar; confirmar segredo e variáveis Vercel sem alterar bindings gerais nem Dev.
  - Evidência: namespace MCP distinto, teste de configuração Cloudflare e workflow limitado aos alvos Beta.
- [x] **T3 — Worker Beta (RF-1, RF-2, RF-3, RF-7, RF-11):** implementar allowlist canônica e aliases de manifestos, forwarding, body cap, CORS por Origin, rate limit agregado pelo hash do bearer/IP anônimo e preservação de headers/respostas.
  - Evidência: testes locais em `tests/unit/api-beta-worker.test.ts`; deploy do Worker Beta concluiu no run `44002637046`; `GET /mcp` e metadados OAuth responderam 200 pelo gateway.
- [x] **T4 — Proteção da origem Vercel (RF-4):** exigir o segredo no handler MCP antes de qualquer inicialização Firebase e validar ordem de execução.
  - Evidência local: testes de `mcp-server-api` verificam 403 sem segredo e bloqueio antes da inicialização Firebase; teste do Worker comprova injeção do segredo no encaminhamento.
- [ ] **T5 — OAuth e tela de consentimento (RF-5, RF-6, RF-9):** separar `VERCEL_MCP_ORIGIN`/`VERCEL_MCP_DOMAIN` da nova `VERCEL_MCP_APP_ORIGIN`; atualizar metadata/challenges/validação de tokens e chamadas da página Beta.
  - Implementação e metadados publicados: `api.beta` respondeu como issuer/resource e a rota direta Vercel recebeu 403. Autorização, emissão/revogação de token e reconexão ChatGPT ainda precisam aceite ponta a ponta.
- [x] **T6 — Preservação de autorização/contratos (RF-8):** preservar tools, schemas, scopes, tenant/ownership, redação, perfil ativo e idempotência.
  - Evidência local: typecheck e suítes unitárias MCP/OAuth executados; catálogo de ferramentas não foi alterado. Validação remota continua pendente.
- [ ] **T7 — Isolamento e rollout Beta (RF-10):** revisar workflow, ativar gateway e origem protegida em corte coordenado, com rollback alinhado e reconexão comunicada; não executar deploy Dev.
  - Evidência: Worker Beta e Vercel Beta concluíram. Worker Dev foi ignorado e o issuer remoto de `api.dev` permaneceu `api.dev`. Porém o workflow Firebase Dev publicou Hosting e concluiu deploy seletivo de Functions MCP antes do cancelamento; correção preventiva está na spec `beta-only-dev-deploy-guard`.
  - Evidência local: `npm run typecheck`; 91 testes em 7 arquivos; lint de 107 arquivos Functions; build Vite concluído com avisos de assets runtime; YAML/TOML e diff aprovados. Remota: `/mcp` e metadados em api.beta 200, origem Vercel direta 403; `api.dev` mantém metadata `api.dev`. Wrangler dry-run indisponível em Android ARM64; unicidade do namespace não consultada por falta de `CLOUDFLARE_API_TOKEN`. Reconexão ChatGPT não testada.
- [x] **T9 — Revisão documental e impacto de IA:** atualizar guias, índices e instruções pertinentes; avaliar Copiloto Gemini e MCP/ChatGPT explicitamente; conferir referências alteradas.
  - Evidência: documentação de MCP/ChatGPT e roteamento Beta atualizada; alteração afeta discovery, issuer/resource e reconexão do cliente ChatGPT/MCP. Copiloto Gemini não usa esse endpoint e não teve mudança de contrato; skills de arquitetura Cloudflare atualizadas.
- [ ] **T10 — Fechamento:** atualizar status e registrar apenas critérios e validações comprovados.
  - Evidência: status final coerente com deploy e resultados observados.

# Tarefas — mcp-public-beta-gateway

Implementação preparada em branch isolada, ainda não publicada. Não houve deploy; as tarefas que dependem da Cloudflare/Vercel e da reconexão do cliente permanecem abertas.

- [ ] **T1 — Preparação OAuth (RF-5, RF-6, RF-9):** aprovar e comunicar a troca de issuer/resource; definir janela de corte e instruções de reconexão; não implementar dupla aceitação de issuer.
  - Evidência: aviso e procedimento aprovados antes de bloquear as rotas antigas.
- [ ] **T2 — Provisionamento da borda (RF-7, RF-10):** criar binding/namespace exclusivo MCP Beta (120 req/min por hash de bearer; IP para anônimo); verificar unicidade account-wide antes de publicar; confirmar segredo e variáveis Vercel sem alterar bindings gerais nem Dev.
  - Evidência: namespace MCP distinto, teste de configuração Cloudflare e workflow limitado aos alvos Beta.
- [x] **T3 — Worker Beta (RF-1, RF-2, RF-3, RF-7, RF-11):** implementar allowlist canônica e aliases de manifestos, forwarding, body cap, CORS por Origin, rate limit agregado pelo hash do bearer/IP anônimo e preservação de headers/respostas.
  - Evidência local: `tests/unit/api-beta-worker.test.ts` cobre rotas/métodos, aliases, headers OAuth/MCP, Origins, body cap, preflight, limiters e encaminhamento. Deploy/validação remota pendentes em T7/T8.
- [x] **T4 — Proteção da origem Vercel (RF-4):** exigir o segredo no handler MCP antes de qualquer inicialização Firebase e validar ordem de execução.
  - Evidência local: testes de `mcp-server-api` verificam 403 sem segredo e bloqueio antes da inicialização Firebase; teste do Worker comprova injeção do segredo no encaminhamento.
- [ ] **T5 — OAuth e tela de consentimento (RF-5, RF-6, RF-9):** separar `VERCEL_MCP_ORIGIN`/`VERCEL_MCP_DOMAIN` da nova `VERCEL_MCP_APP_ORIGIN`; atualizar metadata/challenges/validação de tokens e chamadas da página Beta.
  - Implementação local preparada e coberta por testes de metadata e resolução de origem; discovery/autorização/consentimento/token/revoke e reconexão ChatGPT ainda precisam validação ponta a ponta após publicação.
- [x] **T6 — Preservação de autorização/contratos (RF-8):** preservar tools, schemas, scopes, tenant/ownership, redação, perfil ativo e idempotência.
  - Evidência local: typecheck e suítes unitárias MCP/OAuth executados; catálogo de ferramentas não foi alterado. Validação remota continua pendente.
- [ ] **T7 — Isolamento e rollout Beta (RF-10):** revisar workflow, ativar gateway e origem protegida em corte coordenado, com rollback alinhado e reconexão comunicada; não executar deploy Dev.
  - Evidência: logs mostram somente Worker `functions-beta`, Vercel Beta e `api.beta`; `api.dev` não aparece como alvo.
- [ ] **T8 — Validação local e remota (CA-1 a CA-10):** executar `npm run typecheck`, testes focados, `git diff --check` e verificações remotas de gateway, bypass, OAuth e cliente.
  - Evidência local concluída: `npm run typecheck` aprovado; 7 arquivos/91 testes MCP, Worker, OAuth e ambiente aprovados; `npm --prefix functions run lint` aprovou 107 arquivos; `npm run build` concluiu (Vite manteve avisos de assets dinâmicos não resolvidos em build); YAML/TOML e `git diff --check` aprovados. Wrangler dry-run não executou neste ambiente Android ARM64 (`workerd` sem binário compatível); checagem remota Cloudflare não executada por falta de `CLOUDFLARE_API_TOKEN`. Nenhum deploy ou teste remoto foi feito.
- [x] **T9 — Revisão documental e impacto de IA:** atualizar guias, índices e instruções pertinentes; avaliar Copiloto Gemini e MCP/ChatGPT explicitamente; conferir referências alteradas.
  - Evidência: documentação de MCP/ChatGPT e roteamento Beta atualizada; alteração afeta discovery, issuer/resource e reconexão do cliente ChatGPT/MCP. Copiloto Gemini não usa esse endpoint e não teve mudança de contrato; skills de arquitetura Cloudflare atualizadas.
- [ ] **T10 — Fechamento:** atualizar status e registrar apenas critérios e validações comprovados.
  - Evidência: status final coerente com deploy e resultados observados.

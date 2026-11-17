# Administração MCP pelo gateway Beta

- **ID:** `mcp-admin-beta-gateway`
- **Status:** Em andamento
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-16
- **Referências:** `docs/VERCEL_BETA_ROUTING.md`; `api/mcp-admin.ts`; `src/services/firebaseMcpService.ts`; `src/app/utils/betaHost.ts`; `functions/mcp/callables.js`; `cloudflare/api-beta-worker/src/index.js`; `tests/unit/api-beta-worker.test.ts`.

## Problema e contexto

No Beta, a rota de administração MCP já usa uma Function Vercel quando `mcpAdmin` é resolvida para `vercel`, mas o cliente chama o caminho relativo `/api/mcp-admin`. Isso permite acesso direto à Function e não passa pelo Worker `functions-beta`. O handler valida sessão Firebase ativa e delega cada ação aos callables MCP, que mantêm as permissões e limites por usuário.

## Objetivos

- Encaminhar somente `POST /api/mcp-admin` de `api.beta.luisices.com.br` à Function Vercel Beta.
- Exigir o segredo de origem antes de inicializar Firebase Admin no handler Vercel.
- Usar `api.beta` no cliente apenas quando a chamada Vercel ocorrer no host Beta.
- Preservar sessão, autorização por ação, payloads, respostas e fallback GCP atuais.

## Fora de escopo

- Migrar o servidor MCP público, incluindo `/mcp`, `/oauth/*`, `/.well-known/*`, `/tools/*` e manifests.
- Alterar OAuth 2.1, issuer, resource metadata, escopos, ferramentas ou schemas MCP.
- Alterar Alexa, Copiloto/Gemini, regras Firestore/Storage, Functions GCP ou qualquer configuração de `api.dev`.
- Alterar o modo de roteamento (`backendRouting`) ou habilitar a rota Vercel por flag.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Usuário autenticado e ativo com acesso MCP | Executar as ações que já lhe são autorizadas pelos callables existentes | Token ausente, inválido, revogado ou perfil inativo é negado; callables continuam validando papel e permissão por ação |
| Worker `functions-beta` | Encaminhar POST e adicionar o segredo de origem | Não autentica a pessoa nem substitui as verificações de sessão, papel ou permissão |
| Chamada direta à Function Vercel | Nenhuma | Sem segredo de origem recebe 403 antes de inicializar Firebase Admin |
| Cliente ChatGPT/MCP público | Nenhuma mudança nesta etapa | O servidor MCP público/OAuth permanece nos domínios Beta atuais |

## Requisitos funcionais

- **RF-1 — Allowlist:** o Worker aceita apenas `POST /api/mcp-admin`; métodos não permitidos recebem 405 e rotas desconhecidas recebem 404.
- **RF-2 — Encaminhamento:** preserva body e `Authorization`, injeta `x-beta-edge-secret` e encaminha à origem Beta existente.
- **RF-3 — Proteção da origem:** o handler Vercel compara o segredo em tempo constante antes de processar OPTIONS, método, Firebase Admin ou sessão; acesso direto sem segredo recebe 403.
- **RF-4 — URL Beta:** `firebaseMcpService` usa `https://api.beta.luisices.com.br/api/mcp-admin` no host Beta; fora do Beta mantém URL relativa, e o fallback GCP continua independente.
- **RF-5 — Autorização existente:** `assertActiveSessionFromBearer` e os callables em `functions/mcp/callables.js` continuam validando perfil ativo, `mcpAccess`, papel admin nas ações globais e permissão/ownership nas ações correspondentes.
- **RF-6 — Limites:** usa o binding de APIs Beta existente (30 chamadas/minuto por IP e caminho); os limites por UID/operação dos callables permanecem ativos.
- **RF-7 — Compatibilidade:** nomes das dez ações, contratos de entrada/saída, erros, sessão MCP e fallback para GCP não mudam.
- **RF-8 — Isolamento:** nenhum código ou workflow altera `api.dev`, `functions-dev` ou o servidor público MCP/OAuth.

## Critérios de aceitação

- **CA-1 (RF-1, RF-2):** teste comprova POST, bearer, body e segredo encaminhados; GET/OPTIONS na origem Vercel sem segredo recebem 403; no Worker, OPTIONS responde pelo gateway e outros métodos recebem 405.
- **CA-2 (RF-3):** segredo ausente ou incorreto retorna 403 antes de inicializar Firebase Admin.
- **CA-3 (RF-4):** host Beta escolhe `api.beta`; host fora do Beta conserva o caminho relativo; chamada GCP não passa pelo Worker.
- **CA-4 (RF-5, RF-7):** suíte focada comprova preservação do dispatch e da autorização existente, incluindo sessão inválida/perfil inativo e ação não permitida, sem mudar schema ou escopos.
- **CA-5 (RF-6):** binding existente limita a rota por IP/caminho e responde 429 antes do upstream quando excedido.
- **CA-6 (RF-8):** workflow publica somente o Worker `functions-beta`/custom domain `api.beta` e Vercel Beta; jobs de Worker e Functions Dev permanecem skipped.

## Requisitos não funcionais e integridade

- Segurança/privacidade: a borda é defesa adicional; Firebase ID token, estado de sessão, permissão, papel e validações dos callables continuam obrigatórios.
- Integridade/idempotência: payload e ações de gestão permanecem inalterados; não há nova escrita nem mudança de semântica.
- Observabilidade: erros 4xx de negócio não acionam fallback; indisponibilidade/5xx continuam elegíveis segundo `executeWithGcpFallback`.
- Compatibilidade de API: sem mudança para o painel MCP, clientes OAuth, ferramentas ou schema publicado.

## Erros e casos-limite

- Segredo de origem ausente/incorreto: 403, sem tocar Firebase Admin.
- Método inválido no Worker: 405, sem chamar Vercel.
- Bearer ausente/inválido/revogado ou perfil inativo: erros atuais 401/403, sem fallback de negócio.
- Ação desconhecida: 400 atual.
- Excesso de limite: 429 no Worker ou erro `resource-exhausted` do limite por UID/operação.
- Falha de infraestrutura Vercel/Worker: comportamento de fallback GCP já existente no cliente.

## Dados e contratos afetados

- Transporte para `POST /api/mcp-admin`; body/action/response não mudam.
- Nenhuma coleção, campo, chave, escopo ou sessão OAuth é migrada.

## Impacto na documentação

- Guias/specs revisados: `docs/VERCEL_BETA_ROUTING.md`, `docs/INTEGRACAO_CHATGPT_MCP.md`, `specs/features/README.md` e contratos MCP ativos.
- Documentação a atualizar: guia de roteamento Beta e catálogo da spec para identificar `/api/mcp-admin` como rota do Worker; documentação do servidor MCP público permanece inalterada.
- Copiloto (Gemini): sem impacto; não usa este endpoint administrativo.
- MCP/ChatGPT: transporte do painel administrativo muda no Beta; OAuth, sessões públicas, ferramentas, escopos e schema não mudam.
- Diferenças de comportamento: manter painel administrativo separado do endpoint público MCP/OAuth.

## Decisões e dúvidas

- **Confirmado:** a rota do handler já valida sessão Firebase ativa e encaminha ações a callables MCP; os callables aplicam validações específicas de acesso e limite por UID/operação.
- **Confirmado:** `api.dev` está associado a `functions-dev`; `api.beta` usa Worker isolado `functions-beta`.
- **Decisão:** usar o binding de APIs Beta existente com chave que inclui path, sem criar ou alterar namespace de rate limit.
- **Decisão:** manter servidor público MCP/OAuth fora desta migração para preservar origem e contratos de descoberta/autorização.

## Validação

- `npm run typecheck`.
- Testes focados de handler, Worker, host/URL e autorização MCP.
- `git diff --check` e revisão de rotas/workflows para confirmar isolamento de `api.dev`.
- Deploy e verificação remota em Beta serão registrados separadamente; nenhum deploy de `api.dev` faz parte desta spec.

## Evidências de conclusão

- Preparação local concluída: Worker, handler Vercel, cliente Beta, testes e documentação implementados.
- `npm run typecheck` passou; 75 testes focados passaram em 10 arquivos; `git diff --check` passou.
- Deploy Beta concluído em 17/11/2026: Worker [workflow 43984969755](https://github.com/ccesargarcia/luisices/actions/runs/43984969755) e Vercel [workflow 43985221593](https://github.com/ccesargarcia/luisices/actions/runs/43985221593) passaram.
- Verificação remota: bypass direto à origem Vercel `403`, POST pelo gateway sem bearer `401`, preflight `204` e GET no gateway `405`. Deploys de Worker Dev e Functions Dev ficaram `skipped`; `api.dev` permaneceu intocado.

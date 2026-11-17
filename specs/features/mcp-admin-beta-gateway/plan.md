# Plano de implementação — mcp-admin-beta-gateway

## Abordagem

Adicionar `POST /api/mcp-admin` à allowlist do Worker `functions-beta`, encaminhar bearer/body e injetar o segredo de origem. No handler Vercel, validar o segredo antes de qualquer caminho ou inicialização Firebase. No cliente administrativo MCP, usar o helper existente `getVercelBetaApiUrl` para apontar ao host Beta, preservando fallback GCP e o contrato atual.

Usar `BETA_VERCEL_API_LIMITER` existente. A chave atual inclui caminho e IP, portanto o tráfego MCP terá contador próprio de rota, sem criar namespace Cloudflare. Não tocar no servidor MCP público/OAuth nem nos Workers/Functions de Dev.

Rollout em duas fases: (1) publicar somente o Worker Beta com a allowlist nova e confirmar que POST chega à Function atual; (2) publicar juntos o guard Vercel e a URL do cliente. A primeira fase não altera o comportamento atual do cliente; a segunda só ocorre depois que o Worker estiver confirmado.

## Componentes existentes

| Área | Arquivos/módulos atuais | Alteração proposta |
|---|---|---|
| Worker Beta | `cloudflare/api-beta-worker/src/index.js` | Permitir POST de `/api/mcp-admin`; manter forwarding e rate limit genérico já existente |
| Handler Vercel | `api/mcp-admin.ts`, `api/_firebaseAdmin.ts` | Adicionar guard de origem antes de OPTIONS/método/Firebase e mapear erro 403 pelo helper existente |
| Cliente administrativo | `src/services/firebaseMcpService.ts`, `src/app/utils/betaHost.ts` | Resolver URL com `getVercelBetaApiUrl`; preservar chamada GCP |
| Testes | `tests/unit/api-beta-worker.test.ts`, novo teste do handler, testes de host/segurança MCP | Cobrir autorização da origem, forwarding, 405/429, URL e ausência de inicialização Firebase em bypass |
| Documentação/spec | `docs/VERCEL_BETA_ROUTING.md`, `specs/features/README.md`, `specs/features/mcp-admin-beta-gateway/*` | Registrar rota administrativa, limite, ordem de rollout, impactos de IA e evidências |

## Contratos, dados e compatibilidade

- Contratos/API/schema: preservar as dez ações existentes de `ACTION_MAP`, seus payloads, respostas e erros.
- Dados/migração: nenhuma migração de dados ou sessão OAuth.
- Integrações/ambientes: somente host Beta com provedor Vercel usa `api.beta`; fora do Beta o helper mantém caminho relativo e o serviço mantém o fallback callable GCP.

## Segurança e integridade

- Autorização e ownership: guard de origem no começo da Function, sessão ativa no handler e verificações granulares em cada callable existente.
- Validação/redação/limites: método POST; segredo em tempo constante; 30/min/IP/path na borda e rate limit existente por UID/operação no backend. Não registrar bearer ou segredo.
- Transações/idempotência/valores: sem mudança; preservar semântica do callable.
- Ameaças/casos de abuso: chamada direta ao Vercel, segredo ausente/incorreto, sessão revogada, funcionário sem `mcpAccess`, ação global sem admin, action inválida, abuso repetido e indisponibilidade de edge/Vercel.

## UX e documentação

- UI/acessibilidade/design system: nenhuma mudança visual; somente URL de transporte.
- Documentação/specs existentes revisadas: `docs/VERCEL_BETA_ROUTING.md`, `docs/INTEGRACAO_CHATGPT_MCP.md`, `functions/mcp/callables.js`, `api/mcp-admin.ts` e Worker.
- Documentação viva a atualizar: guia Beta e índice de specs; guia MCP será revisado e só alterado se alguma afirmação de transporte administrativo estiver desatualizada.
- Índices, exemplos, comandos e links a conferir: links tocados no guia de roteamento e `specs/features/README.md`.
- Copiloto (Gemini): sem impacto; contrato Gemini e ferramentas do Copiloto não mudam.
- MCP/ChatGPT: transporte do painel de administração Beta muda; schema, ferramentas, escopos e OAuth do servidor público permanecem iguais.
- Compatibilidade/paridade entre Copiloto e MCP: não presumir paridade; Copiloto não usa esta rota.
- Nenhuma mudança no `api.dev`, em `functions-dev` ou nas rewrites públicas `/mcp` e `/oauth`.

## Validação e riscos

- Typecheck: `npm run typecheck`.
- Testes específicos: Worker Beta, guard do handler, host selection e autorização MCP existente.
- Risco e mitigação: bloquear painel Beta se o segredo faltar; validar resposta de bypass e fluxo de GCP antes de habilitar/confirmar a flag Vercel.

## Reversão

Desativar `mcpAdmin` via `backendRouting` para voltar imediatamente ao callable GCP. Se necessário, remover a rota do Worker em deploy Beta isolado; não alterar `api.dev`.

# Plano — beta-only-dev-deploy-guard

## Abordagem

Adicionar ao job `detect-changes` uma consulta somente leitura às PRs associadas ao SHA do push em `develop`. Um helper puro reconhece `beta-only-no-dev-deploy` apenas em PR mesclada. Expor a decisão como output e adicioná-la às condições de todos os jobs de publicação Dev, mantendo os jobs de testes/validação independentes.

## Componentes

| Área | Arquivos | Mudança |
|---|---|---|
| Política | `scripts/dev-deploy-policy.mjs` | Regra determinística para evento, branch, estado da PR e label |
| Workflow | `.github/workflows/deploy-dev.yml` | Permissão `pull-requests: read`, consulta PR e gates em todos os jobs de deploy Dev |
| Testes | `tests/unit/dev-deploy-policy.test.ts` | Cobrir os casos positivos/negativos da política |
| Documentação | `docs/DEPLOYMENT_RELEASE_FLOW.md`, `docs/VERCEL_BETA_ROUTING.md`, `README.md`, skill de Functions e spec | Explicar uso do label e limites |

## Segurança e compatibilidade

- A API GitHub é consultada com `GITHUB_TOKEN` e permissão mínima `pull-requests: read`.
- Falha na consulta encerra `detect-changes`, bloqueando jobs que dependem dela; não assume autorização para deploy.
- O label só afeta push em `develop` associado a PR já mesclada. Dispatch manual e push direto permanecem inalterados.
- Os testes e validações existentes continuam. Somente jobs que publicam em ambientes Dev são suprimidos.
- Sem mudança runtime, schema, dados Firebase, OAuth, Copiloto ou MCP/ChatGPT.

## Reversão

Reverter a alteração remove a consulta/gates e restaura o comportamento automático anterior. O label no GitHub pode permanecer sem efeito se o código for revertido.

## Validação

- `npm run typecheck`
- `npx vitest run tests/unit/dev-deploy-policy.test.ts`
- YAML parse de `.github/workflows/deploy-dev.yml`
- `git diff --check`

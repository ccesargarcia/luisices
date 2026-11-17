# Impedir deploy Dev em PRs exclusivos do Beta

- **ID:** `beta-only-dev-deploy-guard`
- **Status:** Concluída
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-17
- **Referências:** `.github/workflows/deploy-dev.yml`; `scripts/dev-deploy-policy.mjs`; `docs/DEPLOYMENT_RELEASE_FLOW.md`; `specs/features/mcp-public-beta-gateway/tasks.md`.

## Problema e contexto

O merge do gateway MCP Beta alterou `functions/mcp/**` e arquivos `src/**`. O workflow `.github/workflows/deploy-dev.yml` interpretou esses paths como mudanças comuns e iniciou publicação no Firebase Dev. O cancelamento foi pedido depois do início do deploy; o Hosting Dev e a etapa seletiva de Functions MCP concluíram. O Worker Cloudflare Dev foi ignorado. A verificação remota posterior confirmou que `api.dev` ainda anuncia seu issuer/resource próprios.

O workflow precisa permitir PRs exclusivos do Beta que executem testes e validações sem publicar recursos em Firebase ou Cloudflare Dev.

## Objetivos

- Permitir marcar uma PR como exclusiva do Beta antes do merge.
- Executar os testes e validações habituais, mas ignorar todos os jobs de publicação Dev para PRs marcadas.
- Preservar o comportamento de deploy para PRs sem o marcador, pushes diretos e dispatches manuais.
- Bloquear o fluxo com segurança se não for possível consultar a PR associada ao merge.

## Fora de escopo

- Alterar código/estado runtime de `api.dev`, Functions Dev ou Hosting Dev.
- Alterar deploys de Beta ou produção.
- Pular testes, lint, build de validação ou controles de merge.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Pessoa autora/revisora da PR | Aplicar `beta-only-no-dev-deploy` quando a mudança for exclusiva de Beta | Não usar o marcador em mudanças que precisem ser publicadas em Dev |
| Workflow `deploy-dev.yml` | Consultar PR associada e suprimir jobs de deploy quando marcada | Token recebe somente leitura de PRs; não altera labels nem merge |
| Testes/validações | Executar conforme os paths alterados | Permanecem ativos mesmo com publicação Dev suprimida |

## Requisitos funcionais

- **RF-1:** em push de merge para `develop`, consultar PRs associadas ao SHA e reconhecer o label exato `beta-only-no-dev-deploy` somente em uma PR já mesclada.
- **RF-2:** para PR marcada, manter testes e validações e pular deploy de Firebase Hosting, Functions, Rules, indexes, Cloudflare Dev e purge de cache Dev.
- **RF-3:** para dispatch manual, push direto ou PR sem o label, manter o comportamento de deploy existente.
- **RF-4:** falha na consulta de PR impede a etapa de detecção de concluir com sucesso, bloqueando os jobs dependentes e falhando fechado.

## Critérios de aceitação

- **CA-1:** teste unitário confirma que PR mesclada com label, associada a push em `develop`, suprime deploy.
- **CA-2:** teste confirma que PR sem label, PR aberta, push noutra branch e dispatch manual não suprimem deploy.
- **CA-3:** todos os jobs de publicação Dev dependem do sinal de supressão; jobs de validação não dependem dele.
- **CA-4:** permissões adicionais limitam-se a `pull-requests: read`; nenhum segredo é impresso.

## Requisitos não funcionais e integridade

- Segurança: usar o `GITHUB_TOKEN` efêmero com escopo de leitura de PRs; não aceitar label vindo de payload arbitrário sem consultar GitHub.
- Integridade: deploy manual continua disponível e explícito; não altera dados ou contratos em Firebase.
- Compatibilidade: merges comuns continuam com comportamento atual.
- Operação: documentar a aplicação do label antes do merge e o fato de que validações continuam rodando.

## Dados e contratos afetados

- Nenhuma coleção, dado, API ou contrato runtime é alterado.
- O controle de deploy usa metadados da PR: associação ao SHA, estado de merge e label.

## Impacto na documentação

- Guias revisados: `docs/DEPLOYMENT_RELEASE_FLOW.md`, `docs/VERCEL_BETA_ROUTING.md`, `README.md` e skill de deploy de Functions.
- Copiloto Gemini: não impactado; o workflow só controla quando artefatos Dev são publicados.
- MCP/ChatGPT: contratos, ferramentas, scopes e OAuth não mudam; PRs dessas áreas podem usar o label quando forem exclusivas Beta.
- Diferenças Gemini/MCP: não aplicável, nenhuma paridade de produto é alterada.

## Decisões

- **Confirmado:** label escolhido: `beta-only-no-dev-deploy`.
- **Confirmado:** validações continuam; todas as publicações para ambientes Dev ficam suprimidas.
- **Confirmado:** o marcador não afeta produção, Beta, pushes diretos nem workflow_dispatch.

## Validação

- Testes unitários puros para a política de seleção do label.
- Validação YAML do workflow, typecheck obrigatório e `git diff --check`.
- Revisão das condições de cada job de deploy versus jobs de validação.

## Evidências de conclusão

- Preencher após implementação e registrar teste local/CI. Esta correção não deve iniciar deploy em nenhum ambiente.

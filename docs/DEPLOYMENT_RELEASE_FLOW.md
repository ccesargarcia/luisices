# Fluxo coordenado de deploy: dev e produção

## Objetivo

Manter `develop` como ambiente de validação e fazer o merge em `main` publicar automaticamente somente os componentes alterados. A publicação de produção não repete a suíte completa: ela depende do processo de validação concluído em `develop` e da proteção da branch `main`.

## Desenvolvimento (`develop`)

O workflow `.github/workflows/deploy-dev.yml` continua sendo o fluxo de integração e deploy de dev. Ele detecta as alterações e executa testes antes de publicar.

Ordem quando os componentes correspondentes mudarem:

1. Testes e validações exigidos pela mudança, incluindo a suíte de integração das regras Firestore para alterações de regras/índices.
2. Índices Firestore.
3. Cloud Functions afetadas, escolhidas pelo seletor de dependências.
4. Workers Cloudflare afetados.
5. Frontend.
6. Regras Firestore, RTDB e Storage por último.

Os jobs não relacionados à mudança são ignorados. O deploy de regras não repete o deploy dos índices. A publicação de rules permanece depois da aplicação, evitando publicar uma regra incompatível antes do restante do release.

Quando um push em `develop` corresponde exatamente ao merge de uma PR e os checks obrigatórios `e2e-tests (1)` e `e2e-tests (2)` passaram no commit da cabeça dessa PR, o workflow reutiliza essa validação e não repete unitários/E2E após o merge. Se não localizar a PR, se os checks estiverem ausentes/falharem ou a consulta à API do GitHub falhar, a validação normal permanece antes do deploy. Pushes diretos continuam executando os testes necessários.

## Produção (`main`)

O workflow `.github/workflows/deploy-production.yml` é o único orquestrador automático disparado por push em `main`. Ele não executa novamente E2E/unitários; recebe apenas commits que foram aceitos pela política de proteção de branch.

O plano identifica alterações desde a última release integralmente bem-sucedida. O seletor `scripts/select-functions-deploy.mjs` calcula as Functions afetadas no ambiente `prod`, excluindo as Functions exclusivas de dev. Se ainda não existir uma release bem-sucedida como referência, o seletor opera sem SHA-base e inclui todas as Functions elegíveis, de forma conservadora.

Ordem de publicação:

1. Índices Firestore, quando alterados.
2. Functions afetadas, quando alteradas.
3. Worker(s) Cloudflare afetados.
4. Frontend, quando alterado.
5. Firestore, RTDB e Storage Rules, quando alteradas, sempre por último.

O workflow usa concorrência sem cancelamento para não interromper uma release já em andamento. Se uma etapa falhar, as etapas posteriores que dependem dela são bloqueadas e o resumo final marca a release como falha. Uma execução posterior compara com a última release integralmente concluída; isso pode repetir deploys já bem-sucedidos de uma execução parcialmente falha, o que é intencional e seguro.

## Gate obrigatório antes de habilitar merge em `main`

O YAML não consegue impor sozinho a política de branch. Nas configurações do GitHub, habilitar proteção de `main` e exigir:

- Pull request aprovado de `develop` para `main`.
- Checks de CI/E2E de `develop` aprovados para o commit que será promovido.
- Proibir push direto e force push em `main`.
- Não permitir ignorar os checks, exceto por administradores em uma emergência documentada.

O workflow de produção não tenta repetir esses testes. A garantia depende desses requisitos estarem configurados no repositório e de o merge conter o mesmo código validado em `develop`.

## Entradas de deploy manual

Os dispatches manuais dos workflows de Functions, Cloudflare e índices estão limitados a `dev`. O Pages de produção, as Rules de produção e os deploys de produção dos Workers/Functions são reutilizáveis e chamados pelo orquestrador. Isso reduz caminhos que poderiam publicar apenas parte de uma versão em produção.

## Secrets e permissões

Os workflows reutilizáveis recebem secrets com `secrets: inherit`. Conferir a existência de secrets de produção antes de ativar o fluxo:

- `FIREBASE_SERVICE_ACCOUNT_PROD` (ou o fallback legado usado no workflow).
- Secrets `PROD_VITE_FIREBASE_*` necessários ao build de produção.
- `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` se Workers forem publicados.
- Secrets de Functions e `PROD_ORIGIN_SECRET` se houver alteração de Functions.

O workflow chamador de Pages concede `pages: write` e `id-token: write`, necessários ao deploy do artifact. Não armazenar credenciais ou dados de clientes no repositório.

## Rollback operacional

1. Interromper novas promoções para `main` enquanto a release estiver sendo analisada.
2. Reverter o merge problemático em `develop`, validar os checks e promover o revert para `main`; o mesmo orquestrador publica o estado revertido.
3. Para Functions, preservar versões antigas dos secrets: o deploy automático já evita `functions:secrets:prune` em produção.
4. Rules e índices podem exigir rollback específico. Revisar a compatibilidade do schema e das regras antes de restaurar uma versão anterior; nunca remover índices em uso sem verificar consultas.
5. Confirmar manualmente os fluxos críticos em produção e monitorar erros/latência antes de retomar merges.

Este documento descreve o comportamento esperado dos workflows. Antes de habilitar o merge automático, validar o primeiro ciclo em `develop` e então executar uma promoção controlada para `main`.

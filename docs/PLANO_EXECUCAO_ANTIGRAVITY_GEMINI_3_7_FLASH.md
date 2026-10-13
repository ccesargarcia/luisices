# Plano de execução para Antigravity — Luisices

Modelo solicitado: Gemini 3.7 Flash. Selecione esse modelo no Antigravity quando estiver disponível no ambiente; este plano não depende de um recurso exclusivo do modelo.

Branch alvo: `fix/melhorias-develop-2026-09-30`
Base observada: `develop` / `001047e`
Análise de referência: [análise da branch](ANALISE_BRANCH_FIX_2026-10-01.md)
Plano anterior dos achados: [plano de melhorias](PLANO_MELHORIAS_DEVELOP_2026-09-30.md)

## Objetivo

Concluir as melhorias da branch, corrigir os riscos que restaram e preservar os comportamentos existentes de autenticação, pedidos, pagamentos, estoque, orçamento, loja, relatórios, IA e Alexa. Cada correção precisa de evidência no código e em testes adequados ao risco.

A revisão encontrou alterações locais ainda não commitadas e nenhum commit novo além da base `develop`. O relatório de progresso lista 19 itens concluídos, mas parte dessa evidência é de um snapshot anterior. Revalidar o estado real antes de confiar na matriz.

## Regras de execução

- Trabalhar na branch indicada. Antes de editar, registrar `git status`, SHA, diff rastreado e arquivos não rastreados. Não trocar de branch, resetar, fazer checkout destrutivo, limpar o working tree ou sobrescrever documentos/alterações existentes.
- Se a branch ou o estado local tiver mudado, preservar o trabalho e registrar o SHA atual. Criar uma branch auxiliar somente se necessário e sem mover/apagar alterações já presentes.
- Ler `AGENTS.md` e instruções do repositório, `docs/ANALISE_BRANCH_FIX_2026-10-01.md`, este plano e os testes pertinentes.
- Revalidar cada achado no código antes de mexer. Marcar como resolvido somente com teste ou evidência adequada ao risco.
- Executar validações locais em ordem: teste focado, teste de regras/emulador relevante, unitários, build, lint de Functions e E2E crítico. Não usar produção como alvo de teste.
- Nunca enfraquecer regras, permissões, testes ou assertions para fazer a suíte passar. Não usar modo aberto como fallback, `npm audit fix --force`, downgrade automático ou suppressions sem justificativa técnica revisável.
- Não publicar, executar migração real, alterar IAM/Secrets remotos, excluir contas reais, fazer push/merge nem enviar mensagens. Preparar plano e artefatos de publicação para revisão.
- Atualizar `docs/PROGRESSO_MELHORIAS_DEVELOP.md` com estados verdadeiros. Distinguir `não iniciado`, `em andamento`, `implementado`, `validado no snapshot atual`, `já existia` e `bloqueado`; nunca chamar o trabalho todo de concluído antes dos gates finais.
- Ao fim de cada etapa, inspecionar o diff daquela etapa e registrar arquivos, testes, resultados, limitações, compatibilidade e próxima etapa.

## Fase 0 — Snapshot, baseline e mapa dos fluxos

**Meta:** saber exatamente o que será preservado e o estado inicial das validações.

1. Confirmar branch/SHA e se `develop` local aponta para `001047e` ou para outra referência. Não fazer fetch sem necessidade; se for útil e disponível, registrar separadamente base local e remota.
2. Inventariar alterações modificadas/não rastreadas e identificar os documentos anteriores. Proteger explicitamente arquivos já existentes.
3. Ler scripts, lockfiles, versões de Node/npm e engines de Functions. Inspecionar testes e configurações antes de iniciar emuladores.
4. Rodar a baseline disponível: `npm run test:unit`, `npm run build`, `npm run lint:functions` e `npm run test:integration`. Confirmar `demo-luisices-review` e hosts locais para testes Firebase. Só executar o E2E após confirmar `.env` e configuração segura.
5. Registrar falhas preexistentes sem corrigir silenciosamente durante esta etapa. Conferir se os resultados anotados no progresso pertencem ao SHA atual.
6. Mapear usuários/papéis/permissões, writers de pedidos/ledger (web, workflow, IA, Alexa e Functions), estoque, checkout, queries, índices e workflows de entrega.

**Aceite:** baseline por comando e SHA registrado; nenhum teste acidentalmente acessa produção; cada alteração preexistente está preservada.

## Fase 1 — Contrato de perfil, convite e permissão efetiva

**Achados relacionados:** 1; risco de autorização remanescente descrito em R2 da análise.

1. Definir, a partir do uso atual de `role` e da tela de usuários, se o convite cria proprietário (`user`) ou funcionário (`funcionario`). Não inferir que o mapa de permissões protege dados quando uma regra concede acesso pelo papel.
2. Comparar todas as regras de `storeSettings`, `storeProducts`, `catalogOrders`, `whatsapp` e demais coleções com os perfis criados por `completeUserInvitation`.
3. Tornar as permissões declaradas coerentes com a autorização Firestore. Remover bypasses por papel que concedam acesso maior do que a política escolhida. Preservar acesso legítimo de contas proprietárias e funcionários existentes.
4. No servidor, exigir convite válido, dentro da validade, não consumido e vinculado ao e-mail verificado do chamador (`email_verified`), além de consumir convite e criar perfil de forma concorrente segura.
5. Garantir que uma conta sem perfil ou inativa não seja autorizada por web, IA ou Alexa. Não criar perfil ativo no cliente.
6. Planejar a compatibilidade dos perfis existentes e uma migração somente em modo de simulação. Não rebaixar ou elevar em massa usuários sem mapear a política real.

**Testes de aceitação:** convite ausente/inválido/expirado/reutilizado; e-mail divergente e não verificado; duas conclusões simultâneas; acesso direto às coleções por admin, proprietário, funcionário com/sem permissão e conta inativa; conta Auth sem perfil; permissões iguais às apresentadas na UI.

**Gate:** nenhuma regra depende apenas de botão/rota oculta; nenhum papel convidado tem privilégios que contradigam suas permissões.

## Fase 2 — Exclusão de usuário retomável

**Achado relacionado:** 2.

1. Preservar a melhoria que remove o fallback cliente de `deleteDoc`.
2. Definir estados explícitos para desativação, revogação, exclusão Auth e limpeza de perfil, com operação idempotente e retomável.
3. Decidir tecnicamente se falha em `revokeRefreshTokens` pode permitir continuar. Se a conta Auth é excluída e o perfil é desativado, provar quais serviços e regras continuam bloqueados; se não for seguro, falhar e registrar a etapa pendente.
4. Não informar sucesso enquanto Auth/perfil estiverem em estado parcial. Registrar erros sem armazenar dados pessoais desnecessários.
5. Definir separadamente se subcoleções/dados de negócio devem ser retidos ou apagados. Não fazer cascade delete sem uma política de retenção confirmada.

**Testes:** falha ao desativar; Auth indisponível; usuário já inexistente; revogação falha; limpeza Firestore falha depois de Auth excluído; retry de cada estado; bloqueio de chamadas com perfil inativo.

## Fase 3 — Regras e checkout exclusivamente confiável

**Achados relacionados:** 3, 4 e 13; riscos remanescentes R1, R3, R4 e R7 da análise.

1. Restringir `catalogOrders` para impedir escrita direta por usuário autenticado. Pedidos de visitante devem ser criados pela Cloud Function/Admin SDK. Não deixar a regra permissiva como compatibilidade permanente.
2. Revalidar regras de exclusão lógica de pedido e impedir alteração de `userId`/`assignedTo` por pessoas sem autorização explícita.
3. Revisar `productionTracking` para validar schema, vínculo de proprietário e permissões de cada operação; considerar documentos legados sem proprietário.
4. No endpoint do checkout, manter validação server-side de preço, produto publicado/disponível, loja aberta, quantidades, campos permitidos e limites totalizados por item e por pedido.
5. Reutilizar uma chave estável para retries da mesma operação. Guardar hash/canonicalização do payload; chave reapresentada com carrinho diferente deve retornar conflito, não recibo antigo.
6. Tornar IDs de idempotência não enumeráveis e garantir que um replay só revele recibo da própria operação. Nunca confiar em `verifiedByServer` recebido do cliente.
7. A Function deve rejeitar configurações ausentes/inconsistentes conforme política fail-closed combinada e observar `featureFlags.enableOnlineOrders` como a UI observa.
8. Na conversão de pedido legado, rejeitar item/produto/preço que não possa ser validado. Nunca usar o preço não confiável recebido como fallback silencioso.
9. Fazer UI usar recibo e subtotal oficiais. Em erro, não abrir WhatsApp nem exibir sucesso. Resolver popup bloqueado sem abrir janela fora do gesto do usuário.
10. Planejar rollout compatível entre Functions, frontend e regras: publicar Function, atualizar cliente, medir adoção, e só então negar caminho antigo. Registrar rollback sem reabrir a escrita insegura.

**Testes em Rules Unit Testing/emulador:** anônimo direto, usuário autenticado direto, admin interno, campos forjados, preço alterado, produto ausente/pausado/oculto, loja fechada, flag desabilitada, quantidade inválida, múltiplas personalizações do mesmo produto, retries concorrentes iguais, mesma chave com payload diferente, produto legado não verificável.

**Testes UI/E2E:** fluxo de visitante bem-sucedido, código/preço iguais ao recibo, rejeição sem modal/WhatsApp, timeout + retry do mesmo carrinho, popup bloqueado, carrinho com personalização.

**Gate:** não existe escrita de pedido público que evite validação confiável e não existe falso sucesso do checkout.

## Fase 4 — Pedidos, pagamentos e ledger em todos os escritores

**Achados relacionados:** 5, 6, 7; risco remanescente R6 e R9.

1. Manter a ordem atual das transações: ler pedido e ledger primeiro, construir as alterações e só depois gravar.
2. Auditar todos os métodos que escrevem `orders`: edição, mudança de status, workflow, exclusão/restauração, duplicação, lote, orçamento, catálogo, IA e Alexa.
3. Em `updateProductionWorkflow`, reconstruir `salesLedger` quando ausente ou definir estado explícito de reconciliação. Não deixar divergência silenciosa.
4. Definir regra de `expectedVersion`: exigir para toda edição suscetível a overwrite, incluindo status onde apropriado. Atualizar Dashboard, calendário, trocas e copiloto para capturar versão do snapshot.
5. Preservar `payment.history`, `paymentDate`, notas e `remainingAmount` em patch não financeiro. Recalcular saldo somente quando total ou pagamento mudar, segundo fórmula e arredondamento do produto.
6. Aplicar semântica de patch consistente: campo omitido não muda; limpeza explícita remove; `false`/`[]` persistem.
7. Sincronizar todos os campos contábeis afetados no mesmo commit. Se alguma ação precisar ser assíncrona, usar estado pendente e retry verificável, sem reportar sucesso prematuro.

**Testes:** Firestore emulator para edição/status/workflow com ledger existente e ausente; falha/conflito; duas telas concorrentes; patch de pagamento parcial; edição só do nome; limpar campos; retry; conversão de orçamento repetida e concorrente; efeitos no contador e ledger.

## Fase 5 — Compra, estoque e permissões de preço

**Achado relacionado:** 9; risco remanescente R7.

1. Manter transação de estoque + histórico e chave idempotente estável.
2. Remover o `resource == null` genérico das regras de `supplies`, `purchaseHistory` e `pricingRecipes`. Tornar a verificação de idempotência específica ao usuário (ID determinístico com escopo/owner) ou movê-la para uma função protegida.
3. Garantir que colisão/tentativa de reutilizar chave de outro proprietário não exponha existência nem dados de terceiros.
4. Diferenciar excluir registro histórico de cancelar movimento; preservar trilha de auditoria.
5. Antes de estornar estoque, definir como reconhecer o lote consumido. Não usar somente saldo agregado para estimar consumo se outras compras/ajustes foram feitos desde então. Registrar quantidade revertida e pendente de forma fiel.
6. Preservar custo unitário correto e considerar frete no custo conforme regra já vigente no domínio.

**Testes:** usuário dono e funcionário; nova compra, retry mesma chave, chave de outro usuário, compras concorrentes, exclusão sem estorno, estorno repetido, consumo parcial e compras posteriores.

## Fase 6 — Consultas completas de pedidos, orçamentos e financeiro

**Achados relacionados:** 10 e 18; riscos remanescentes R5 e query financeira.

1. Remover tetos usados como garantia de completude. Implementar paginação por cursor, filtros de status/data e agregações completas.
2. Separar dados operacionais de histórico sem esconder pedidos acima de 1000, quotes acima de 500, histórico acima de 200 ou fallback acima de 200.
3. Revisar calendário, pesquisa, alertas, relatórios e expiração de orçamento. Nenhuma tela pode afirmar resultado completo se só carregou a primeira página.
4. Aplicar consulta financeira por intervalo a todas as vistas compatíveis, preservando totais e autorização por dono/atribuído.
5. Rever índices necessários e estratégia quando índice ainda não foi publicado; fallback tem de ser completo ou comunicar indisponibilidade com clareza.
6. Manter contrato uniforme de datas civis/timestamps e fuso do negócio; evitar ajustar hora manualmente.

**Testes:** dataset sintético com 1201 pedidos ativos, 501 orçamentos ativos, 201+ históricos, pendências antigas, expirados fora da primeira página e vendedor atribuído; percorrer todas as páginas sem faltas/duplicações; totals iguais à soma completa; datas UTC/São Paulo e virada de mês/ano.

## Fase 7 — Recuperação Firestore e proteção de dados

**Achados relacionados:** 12 e 14; risco remanescente R11.

1. Verificar o ciclo real de `terminate`, limpeza e reload. Detectar e apresentar pendências offline antes de eliminar persistência.
2. Lidar com múltiplas abas sem loop. O cooldown não deve esconder que a instância terminou e não foi reaberta.
3. Preferir recuperação explícita com novo ciclo de app e telemetria sem PII, preservando alterações locais pendentes.
4. Confirmar máscara integral de textos e bloqueio de mídia no Replay; examinar payloads de eventos estruturados, extras, breadcrumbs e URLs para não transmitir PII.

**Testes:** falha em terminate/clear, outra aba ativa, gravação offline pendente, reload limitado, identidade/perfil após reconexão, payload sintético contendo telefone/e-mail/CPF.

## Fase 8 — Dependências e gates CI

**Achados relacionados:** 15 e 17.

1. Auditar novamente os lockfiles raiz e Functions, anotando caminho transitivo, exposição browser/server, impacto e upgrade compatível. Corrigir com atualizações pequenas.
2. Executar build, testes e caminhos afetados após cada grupo de pacotes; revisar assinaturas Alexa, webhook, Auth/Firestore, PDF e XLSX quando pertinente.
3. Fixar instalações no CI com lockfile e versão local/conhecida do Firebase CLI. Antes de trocar `npm install` por `npm ci`, validar compatibilidade do lockfile e configuração `legacy-peer-deps`.
4. Confirmar que `scripts/lint-functions.mjs` percorre todos os fontes, sai diferente de zero para falha e não depende de glob expandido pelo shell.
5. Rodar testes unitários, regras/emuladores e E2E crítico em jobs explícitos. Nenhuma condição de skip pode retirar testes de segurança sem uma decisão documentada.

**Gate:** CI falha por erro sintático em qualquer Function ou teste negativo de segurança; ferramentas e dependências são reproduzíveis pelo lockfile.

## Fase 9 — Medição de desempenho e manutenção estrutural

**Achado relacionado:** 19; parte de 18.

1. Medir tamanho comprimido e transferido das rotas iniciais, Firebase, PDF, XLSX e relatórios. Diferenciar tamanho de chunk de carregamento real.
2. Medir leituras e frequência de recriação dos listeners em `visibilitychange`/`online`.
3. Extrair gradualmente componentes/domínio dos módulos grandes somente após contratos e testes estabilizados.
4. Não aumentar limites de aviso como substituto de otimização. Registrar comparação antes/depois na mesma rota e ambiente.

**Aceite:** ganho real medido, sem regressão de funcionalidades; não misturar reorganização estrutural à correção de regras/financeiro.

## Fase 10 — Preparação de entrega e revisão final

**Achado relacionado:** 16 e fechamento dos demais.

1. Mapear workflows e projetos de dev/prod para frontend, Functions, Firestore Rules, índices, Storage e Alexa.
2. Diagnosticar por que Storage foi removido do deploy de dev; preparar ajuste IAM mínimo, sem ampliar privilégios gerais.
3. Definir ordem de publicação e compatibilidade de versões. Mudanças críticas de Rules/Function/frontend têm rollout coordenado.
4. Preparar scripts de migração com `--dry-run`, contagem, checkpoint, retomada, log e validação; executar somente contra dados sintéticos/emulador.
5. Documentar rollback de código e correção de dados, sem reabrir regras inseguras.
6. Fazer revisão final do diff contra `develop`, mudanças não relacionadas, secrets acidentais, lockfiles e documentos de progresso.

**Gate final local:** `npm run test:unit`, `npm run test:integration`, `npm run build`, `npm run lint:functions` e E2E crítico de checkout, permissões, pedidos/pagamentos, compras/estoque, orçamento, relatórios e sessão. Registrar exatamente o que não executou. Não afirmar pronto em produção sem validar artefatos publicados separadamente.

## Matriz de achados

| Achado | Fase(s) |
| --- | --- |
| 1 Convite/perfil | 1 |
| 2 Exclusão de usuário | 2 |
| 3 Exclusão lógica | 3 |
| 4 productionTracking | 3 |
| 5 Pedido/ledger | 4 |
| 6 Histórico de pagamentos | 4 |
| 7 Limpeza de campos | 4 |
| 8 Conversão de orçamento | 4 |
| 9 Compras/estoque | 5 |
| 10 Consultas de pedidos/orçamentos | 6 |
| 11 Datas/fuso | 6 |
| 12 Recuperação Firestore | 7 |
| 13 Checkout | 3 |
| 14 Sentry Replay | 7 |
| 15 Dependências | 8 |
| 16 Publicação/artefatos | 10 |
| 17 CI/testes/lint | 8 e gates finais |
| 18 Leituras/listeners | 6 e 9 |
| 19 Módulos e bundles | 9 |

## Prompt completo para o Antigravity

```text
Atue como engenheiro de software sênior e execute o plano de docs/PLANO_EXECUCAO_ANTIGRAVITY_GEMINI_3_7_FLASH.md neste repositório Luisices, na branch fix/melhorias-develop-2026-09-30. Leia também as instruções AGENTS.md, docs/ANALISE_BRANCH_FIX_2026-10-01.md, docs/PROGRESSO_MELHORIAS_DEVELOP.md e os testes relacionados.

Não pare em outro plano: implemente as fases do plano em mudanças pequenas, com testes de regressão e revisão de diff em cada gate. A análise anterior observou base 001047e e alterações locais não commitadas; revalide branch/SHA/working tree primeiro, preserve cada mudança existente e não sobrescreva documentos ou arquivos do usuário.

Priorize: (1) autorização real de perfis convidados e regras, (2) bloquear escrita direta de catalogOrders e corrigir idempotência/recibo do checkout, (3) consistência de pedido/ledger em todos os escritores, (4) compra/estoque e regras de idempotência, (5) paginação e totalização completas, (6) recuperação Firestore e PII, (7) dependências/CI, (8) medição de desempenho e preparação de entrega.

Revalide achados antes de corrigir. Preserve contratos existentes e registre incompatibilidades. Em decisões de negócio ambíguas, investigue código/configuração/testes; só peça esclarecimento se a decisão não puder ser inferida e bloquear uma alteração segura. Continue tarefas independentes enquanto isso.

Valide apenas em ambiente local ou demo-* isolado. Não acesse dados reais; não faça deploy, push, merge, migração real, alteração remota de IAM/Secrets, exclusão real de usuários ou mensagens externas. Prepare esses itens para revisão. Nunca abra regras permissivas como fallback, não remova testes, não use npm audit fix --force e não invente melhorias de performance sem medição.

Execute e registre a baseline atual antes de editar. Após cada fase, atualize docs/PROGRESSO_MELHORIAS_DEVELOP.md com evidência, arquivos, testes e limitações. Rode teste focado e integração de regras pertinente durante o trabalho. Ao final, execute npm run test:unit, npm run test:integration, npm run build, npm run lint:functions e E2E dos fluxos críticos se o ambiente estiver seguro e disponível. Caso uma validação falhe, corrija ou registre a falha exata; não marque a fase como validada.

Conclua com revisão do diff e um relatório curto que liste corrigidos, pendentes/bloqueados, resultados exatos dos comandos, riscos, artefatos de publicação preparados e verificações externas ainda necessárias. Não declare todos os bugs corrigidos sem evidência. Comece agora pela Fase 0 e prossiga até concluir todas as fases possíveis.
```

## Mensagem curta para iniciar

```text
Leia docs/PLANO_EXECUCAO_ANTIGRAVITY_GEMINI_3_7_FLASH.md e execute o “Prompt completo”. Comece validando a branch e o working tree para preservar as alterações locais; depois siga as fases com testes, evidências e atualização de docs/PROGRESSO_MELHORIAS_DEVELOP.md. Não publique nem acesse produção.
```

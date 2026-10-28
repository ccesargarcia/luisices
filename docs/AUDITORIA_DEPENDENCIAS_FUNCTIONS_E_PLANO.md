# Auditoria de dependências e plano de modularização das Cloud Functions

**Revisado em:** 28/10/2026
**Branch/commit analisado:** `develop` / `2b9af2b`
**Deploy DEV observado:** workflow [40628205038](https://github.com/ccesargarcia/luisices/actions/runs/40628205038), concluído com sucesso.

## Objetivo e limites

Este documento avalia os exports de Cloud Functions presentes em `functions/index.js`, seus grafos locais de `require()` e os efeitos observáveis no seletor de deploy. O objetivo é reduzir acoplamento de runtime e redeploys desnecessários sem alterar contratos, permissões, validações financeiras ou comportamento dos usuários.

O mapa é estático e baseado no código do repositório. Ele não mede o tempo real de inicialização de cada container, não confirma configuração remota de cada Function e não substitui métricas do Cloud Run, Sentry ou logs de execução. O seletor também trata dependências conservadoramente: se não consegue provar que uma alteração é isolada, prefere selecionar mais Functions.

## Resumo executivo

- Há **63 exports** no entrypoint: 61 endpoints gerais e 2 endpoints exclusivos de DEV/emulador.
- Esses exports formam **10 módulos de entrada**: os grupos de MCP e IA agora têm entradas separadas para protocolo/gestão e para `getAiUsage`. Mudanças em dependências compartilhadas ainda selecionam todos os consumidores correspondentes.
- O maior agrupamento é Usuários (**15 endpoints**), seguido de Pedidos (**13 em DEV, 11 em produção**), MCP (**11**), Alexa (**8**), WhatsApp (**7**), IA (**4**), E-mail (**4**) e Mídia (**1**).
- No deploy DEV [40737383806](https://github.com/ccesargarcia/luisices/actions/runs/40737383806), o CI passou e o seletor publicou **5 Functions** para a separação de `getAiUsage`: quatro exports de IA e o endpoint MCP que compartilha a fábrica de IA. A etapa de atualização das Functions levou cerca de 2min09s.
- No deploy anterior [40628205038](https://github.com/ccesargarcia/luisices/actions/runs/40628205038), o seletor havia escolhido **63 Functions** após a remoção do agregador MCP. A correção do seletor foi validada no run [40735963324](https://github.com/ccesargarcia/luisices/actions/runs/40735963324).
- Os exports MCP agora são registrados diretamente por `functions/mcp/callables.js` e `functions/mcp/endpoint.js`. O antigo `functions/mcp/index.js` foi removido. Os testes já cobrem deploy seletivo entre os dois grupos.
- A correção do seletor reconhece arquivos removidos que pertenciam ao grafo do commit implantado, mantendo seleção global para arquivos de runtime realmente não rastreáveis.
- `getAiUsage` não usa mais a fábrica geral; chat, enrichments e MCP ainda compartilham `functions/ai/index.js` e as dependências necessárias a essa fábrica.
- Recomendo começar por **MCP/IA**, medir a redução no número de Functions e nos tempos de inicialização, depois decompor Pedidos. E-mail, WhatsApp, Alexa e Usuários vêm em lotes separados.

## Como o deploy funciona hoje

`functions/index.js` usa getters enumeráveis (`expose(name, () => require(...))`) para manter os nomes de export públicos e carregar o módulo de domínio quando o Firebase resolve aquele export. O entrypoint também inicializa Firebase Admin/Firestore e carrega a instrumentação Sentry de forma global.

`scripts/select-functions-deploy.mjs` percorre os `require()` locais de cada export e calcula os consumidores de um arquivo alterado. Os testes em `tests/scripts/functions-deploy-selection.test.mjs` cobrem, entre outros casos, alteração de módulo compartilhado, dependência transitiva, bootstrap global, arquivo de runtime sem referência, import dinâmico desconhecido, configuração e alterações de manifests.

O comportamento conservador é útil para segurança do deploy, mas tem custo operacional:

1. **Mais Functions atualizadas:** uma alteração pequena num módulo grande reinicia Functions sem mudança funcional direta.
2. **Mais revisões novas e cold starts:** cada Function atualizada recebe nova revisão; uma refatoração que estreita o grafo evita reinicializar consumidores que não precisam da mudança.
3. **Lotes repetidos:** o workflow divide listas grandes em grupos e executa vários comandos de deploy. No run observado, as 15 Functions foram publicadas em 3 lotes. Os comandos compartilham a mesma fonte local, então seleção menor tende a reduzir trabalho repetido de descoberta/publicação, embora o tempo dependa também da plataforma.
4. **Módulos grandes no runtime:** funções distintas do mesmo domínio carregam o mesmo arquivo e suas dependências estáticas, mesmo quando usam partes diferentes dele.

Não se deve relaxar o seletor para “consertar” deploy amplo. A redução correta vem de fronteiras de módulo menores, mais contratos explícitos e testes de seleção que provem quais exports precisam ser publicados.

## Inventário completo dos exports

Os grupos abaixo representam os grafos estáticos identificados, não a quantidade de funções invocadas numa requisição. Todos os nomes são preservados no deploy; os dois exports de SuperFrete existem apenas em DEV/emulador.

| Domínio / módulo de entrada compartilhado | Nº em DEV | Nº em produção | Exports presentes | Situação observada |
|---|---:|---:|---|---|
| Usuários — `functions/users/index.js` | 15 | 15 | `sendAdminPasswordReset`, `createUserInvitation`, `validateUserInvitation`, `completeUserInvitation`, `sendVerificationEmail`, `sendPasswordResetEmail`, `getUserAccountMetadata`, `recordUserPasswordChange`, `deleteUser`, `createUser`, `updateUser`, `registerDeviceSession`, `revokeAllSessions`, `revokeDeviceSession`, `repairUserClaims` | Um módulo contém endpoints administrativos, convites, autenticação e sessões. As dependências locais alcançadas são pequenas, mas o arquivo de entrada compartilha toda a implementação. |
| Pedidos — `functions/orders/index.js` | 13 | 11 | `submitPublicCatalogOrder`, `updateComplexOrder`, `createOrder`, `getPublicCatalogProducts`, `createOrderTrackingLink`, `listOrderTrackingLinks`, `revokeOrderTrackingLink`, `revokeOrderTrackingLinkById`, `deleteOrderTrackingLink`, `deleteOrderTrackingLinksBatch`, `getPublicOrderTracking`, `calculateSuperfreteShipping` (DEV), `createSuperfreteLabel` (DEV) | Arquivo principal extenso e sensível; criação, transações financeiras, catálogo público, rastreamento e SuperFrete compartilham o mesmo grafo. |
| IA — `functions/ai/callables.js` e `functions/ai/usageCallable.js` | 4 | 4 | `aiAgentChat`, `getAiUsage`, `enrichGalleryItemWithAi`, `enrichStoreProductWithAi` | `getAiUsage` tem entrada própria e não carrega Gemini, tools ou handlers de chat. As outras três callables ainda compartilham a fábrica de IA. |
| MCP — `functions/mcp/callables.js` e `functions/mcp/endpoint.js` | 11 | 11 | `getMcpSettingsStatus`, `createMcpApiKey`, `updateMcpApiKeyScopes`, `toggleMcpApiKey`, `revokeMcpApiKey`, `toggleGlobalMcp`, `setUserMcpEligibility`, `revokeMcpSession`, `getMcpAuditLogs`, `getMcpOpenApiSchema`, `chatGptToolsEndpoint` | Callables administrativas e endpoint público têm entradas separadas. O endpoint ainda usa a fábrica geral de IA. |
| Alexa — `functions/alexa/index.js` | 8 | 8 | `alexaWebhook`, `approveAlexaPairing`, `setAlexaPermission`, `revokeAlexaBinding`, `toggleGlobalAlexaIntegration`, `getAlexaIntegrationStatus`, `approveAlexaDraft`, `cancelAlexaDraft` | O webhook e as callables administrativas compartilham 18 módulos locais, inclusive diálogo, pareamento e serviços relacionados. |
| WhatsApp — `functions/whatsapp/index.js` | 7 | 7 | `sendWhatsAppDirectMessage`, `deleteWhatsAppMessage`, `syncWhatsAppChatMessages`, `getWhatsAppInstanceStatus`, `markWhatsAppChatRead`, `ensureWhatsAppConversation`, `evolutionWhatsAppWebhook` | Um módulo de cerca de 760 linhas agrupa operações de usuário, manutenção de conversa e webhook. Tem instrumentação de inicialização. |
| E-mail — `functions/email/index.js` | 4 | 4 | `sendCustomEmail`, `getEmailUsage`, `resendReceivingWebhook`, `cleanupEmailDrafts` | Envio, anexos, idempotência, filtro de spam, webhook e limpeza estão no mesmo grafo de sete módulos locais. |
| Mídia — `functions/media/gallery.js` | 1 | 1 | `galleryMedia` | Já tem fronteira isolada e núcleo separado (`galleryCore.js`); bom padrão para preservar. |
| **Total** | **63** | **61** | **63 nomes** | Os 2 endpoints de diferença são exclusivos de DEV/emulador. |

### Evidência de deploys recentes

No run [40737383806](https://github.com/ccesargarcia/luisices/actions/runs/40737383806), a separação inicial de `getAiUsage` selecionou e atualizou cinco Functions: `aiAgentChat`, `chatGptToolsEndpoint`, `enrichGalleryItemWithAi`, `enrichStoreProductWithAi` e `getAiUsage`. A atualização levou cerca de 2min09s. As outras três callables e o endpoint MCP ainda dependem de `functions/ai/index.js`, que também precisou ser alterado para remover o handler legado.

O deploy anterior de [40625320812](https://github.com/ccesargarcia/luisices/actions/runs/40625320812) selecionou 15 Functions durante a etapa anterior de MCP/IA:


| Lote | Functions |
|---|---|
| 1 | `aiAgentChat`, `chatGptToolsEndpoint`, `createMcpApiKey`, `enrichGalleryItemWithAi`, `enrichStoreProductWithAi`, `getAiUsage` |
| 2 | `getMcpAuditLogs`, `getMcpOpenApiSchema`, `getMcpSettingsStatus`, `revokeMcpApiKey`, `revokeMcpSession`, `setUserMcpEligibility` |
| 3 | `toggleGlobalMcp`, `toggleMcpApiKey`, `updateMcpApiKeyScopes` |

As 15 foram implantadas com sucesso. O workflow completo terminou com sucesso; os dois shards E2E/build passaram, o Hosting DEV foi publicado e as regras foram ignoradas por não terem sido alteradas. A publicação das Functions levou 5min18s dentro de um workflow total aproximado de 14 minutos. Essa medição é um exemplo, não uma previsão de duração futura.

## Achados detalhados por domínio

### 1. MCP e IA: prioridade mais alta

O antigo `functions/mcp/index.js` importava estaticamente `./callables` e `./endpoint`, fazendo callables administrativos herdarem parte do grafo do endpoint público. A entrada já foi separada: exports administrativos apontam para `functions/mcp/callables.js`, e `chatGptToolsEndpoint` para `functions/mcp/endpoint.js`. O endpoint ainda chama `getSharedAiServices()`, que usa `createAiServices()` de `functions/ai/index.js`.

`functions/ai/index.js` importa no topo `tools`, `handlers`, `geminiClient`, `repositories`, `budget`, `usage`, `schemas`, `cache` e configurações. `createAiServices()` cria `GeminiClient`, repositórios, executor de ferramentas, gerenciador de orçamento e closures para os handlers de chat e enriquecimento. `functions/ai/callables.js` chama essa fábrica dentro de cada handler. Desde a separação documentada na Fase 2, `getAiUsage` usa `usageCallable.js` e `usageHandler.js`, sem carregar esse índice.

Consequências verificáveis:

- Correções no executor compartilhado podem republicar as quatro Functions de IA.
- A árvore MCP atual compartilha as 11 Functions MCP; alterações na camada MCP podem republicar callables administrativas junto com o endpoint, e vice-versa.
- A inicialização/carga de módulos fica maior do que a necessária para handlers simples.
- A construção da fábrica dentro do handler repete criação de objetos/closures por invocação, embora o cache de módulos e processos do Node continue aplicável. A fábrica deve ser medida antes de mover objetos para estado global; estado de usuário nunca pode ser compartilhado entre requisições.
- `GeminiClient` é baseado em `fetch` e não mostra import de SDK externo no arquivo; mesmo assim, o pacote de IA inteiro fica acoplado pelo grafo, e sua construção sem chave/modelo não é necessária para operações MCP que apenas executam ferramentas.

**Direção recomendada:** manter regras de domínio compartilhadas, mas deixar adaptadores e fábricas por capacidade. O endpoint MCP deveria depender explicitamente apenas de autorização MCP, repositórios necessários e executor de ferramentas. Callables administrativas MCP não deveriam importar o endpoint. `getAiUsage` já não carrega tools/Gemini; enrichments ainda devem ser avaliados para evitar dependências de ferramentas de pedidos sem necessidade comprovada. O chat continua podendo compartilhar o executor de ferramentas completo com o MCP enquanto ambos oferecem essas mesmas operações.

### 2. Pedidos: alto valor, maior cuidado de regressão

`functions/orders/index.js` reúne 13 exports em DEV e 11 em produção. A superfície inclui checkout público, catálogo, criação/editabilidade financeira, ledger e links de rastreamento. Os caminhos `createOrder` e `updateComplexOrder` são autoritativos e transacionais; devem continuar agrupados com serviços e validações compartilhados quando necessário, sem dividir a transação entre endpoints.

**Direção recomendada:** criar módulos de entrada por fronteiras funcionais (por exemplo: `coreMutations`, `publicCatalog`, `tracking`, `superfrete`) e serviços de domínio pequenos. Conservar exatamente nomes, regiões, secrets, limites, autenticação, atomicidade pedido/ledger/recibos e a ordem de deploy backend/frontend. Isolar os dois endpoints DEV de SuperFrete para que não se misturem com os exports de produção. Não alterar Firestore Rules nesta iniciativa.

### 3. Alexa

O export comum `./alexa` aponta para um índice que importa webhook, processamento de diálogo, pareamento, chamadas administrativas e auxiliares. O webhook de voz e os endpoints administrativos não precisam necessariamente ser publicados como um único grupo. Há regras de autenticação/assinatura e gravação de rascunhos que tornam essa separação de risco médio/alto.

**Direção recomendada:** primeiro separar caminhos de export para webhook e callables administrativas mantendo `dialog.js`, `pairing.js`, repositórios e validações como serviços compartilhados. Depois, considerar separar diálogo por intenção apenas se isso reduzir dependências e continuar simples de testar.

### 4. WhatsApp

Os sete exports compartilham `whatsapp/index.js` e seus imports locais. O arquivo contém envio, leitura/gerência de conversas e webhook. O tamanho e a variedade sugerem grupos distintos, mas autorização por telefone, deduplicação e persistência de mensagens precisam permanecer em componentes de domínio reutilizados.

**Direção recomendada:** separar primeiro o webhook Evolution dos callables do painel; em seguida isolar consultas/status de conversas das ações de envio/sincronização. Não duplicar verificações de escopo ou idempotência.

### 5. E-mail

Os quatro endpoints compartilham um índice que importa anexos, limpeza, spam filter e idempotência de envio. `getEmailUsage` e cleanup não precisam carregar a cadeia inteira de envio. O webhook Resend precisa preservar verificação de assinatura/segredo.

**Direção recomendada:** separar envio, consultas de uso/limpeza e webhook em entradas próprias; manter serviços de idempotência, segurança e normalização comuns somente onde realmente usados.

### 6. Usuários

Os 15 endpoints apontam para `users/index.js`. Este grupo inclui senha, convites, perfis, claims e sessões — ações de segurança que não devem compartilhar código de execução apenas por estarem no mesmo domínio. A lista de dependências locais pequena não reduz o acoplamento de deploy porque a implementação está no próprio arquivo de entrada.

**Direção recomendada:** separar em endpoints/famílias como convites/ativação, credenciais/recuperação, perfil/admin e sessões; manter `userSyncService` e regras de claims como serviços explícitos. Priorizar uma mudança por família e cobrir operações de concorrência, monotonicidade de claims e revogação.

### 7. Bootstrap global e seletor

O entrypoint executa Sentry e inicialização Admin/Firestore antes dos getters; são dependências globais deliberadas. Alterações reais nesse bootstrap devem selecionar todos os consumidores. O seletor também falha de forma fechada para imports dinâmicos, arquivo runtime não rastreado, configuração ou mudanças ambíguas. Essa proteção deve ser preservada.

As funções atualmente instrumentadas com `withFirstInvocationSpan` incluem AI, Orders e WhatsApp; não foi encontrada a mesma instrumentação nos módulos de Users, E-mail, Alexa, MCP ou Mídia. Como o span de primeira chamada mede o handler e `runtime.module_init_ms` mede avaliação síncrona do módulo, compare essas métricas por Function antes de afirmar redução de cold start. Complemente com métricas/logs da plataforma e latência percebida no cliente.

## Matriz de prioridade, ganhos, perdas e complexidade

Complexidade é relativa ao repositório: **Baixa** = fronteira clara e poucos consumidores; **Média** = mais de um contrato/consumidor e testes específicos; **Alta** = transações, segurança, estados concorrentes ou protocolo externo. Não é estimativa de prazo.

| Prioridade | Trabalho | Alcance atual | Ganhos esperados | Perdas / riscos | Complexidade |
|---|---|---|---|---|---|
| **Concluída / validar** | Desacoplar o endpoint MCP das callables administrativas; apontar exports diretamente aos módulos apropriados | 11 MCP | Mudanças no endpoint podem deixar de republicar as callables de administração; menor carga de módulos em operações administrativas; menor área de regressão | Primeira publicação atualizou 63 Functions devido ao tratamento fail-closed de arquivo removido; o grafo seletivo tem teste próprio | **Média** |
| **Em andamento** | Substituir `createAiServices` monolítica por fábricas por capacidade e separar callables/handlers independentes | 4 IA + MCP | `getAiUsage` isolado do executor/Gemini; próxima oportunidade: enrichments carregarem só as capacidades necessárias | A separação inicial publicou 5 Functions; demais alterações exigem cuidado com autorização, secrets e ciclo de vida/cache | **Alta** |
| **P1** | Medir inicialização/primeira chamada por endpoint, com cobertura uniforme antes/depois | Todos | Evidência separa carga de módulo, cold start de plataforma e duração do handler; evita otimização por suposição | Instrumentação adiciona ruído/volume; dados ausentes ou amostrados não equivalem a zero; não reduz latência por si só | **Média** |
| **P2** | Separar `orders/index.js` em core mutations, catálogo público, tracking e SuperFrete DEV | 13 DEV / 11 prod | Mudança de catálogo ou tracking deixa de republicar mutations financeiras sem relação; menores lotes; SuperFrete não contamina caminho de produção | Primeira migração pode publicar muitos endpoints; maior risco de quebrar atomicidade, auth, secrets, versionamento ou regra de transição de pedido | **Alta** |
| **P2** | Separar webhook Alexa das callables administrativas; manter domínio comum | 8 | Mudança de diálogo/assinatura não republica todas as ações administrativas; menor acoplamento de inicialização | Risco de assinatura ASK, dedupe, pareamento e rascunhos se handlers forem movidos sem testes de contrato | **Média/Alta** |
| **P2** | Separar webhook Evolution de operações de conversa/usuário no WhatsApp | 7 | Alterações em webhook ou leitura/status não afetam envio/sincronização sem necessidade | Risco de duplicar autorização, escopo por telefone, dedupe e persistência de eventos | **Média/Alta** |
| **P2** | Separar envio de e-mail, webhook Resend e consultas/limpeza | 4 | Consultas simples deixam de carregar anexos/spam/idempotência de envio; alteração de webhook fica isolada | Risco de envio duplicado, anexos quebrados ou webhook sem validação de assinatura | **Média** |
| **P3** | Separar endpoints de Usuários por convites, identidade/perfil e sessões | 15 | Reduz redeploy de operações de senha quando muda sessão/claim, e vice-versa; fronteiras de segurança mais claras | Grande número de contratos administrativos; alto risco em concorrência, claims, revogação e compatibilidade | **Alta** |
| **P3** | Preservar Mídia como padrão e aplicar análise seletiva a novos módulos | 1 | Evita regressão estrutural e mantém um exemplo simples de domínio com core isolado | Benefício incremental baixo porque já está isolado | **Baixa** |
| **P0 contínuo** | Preservar bootstrap global, resolução segura e comportamento fail-closed do seletor | Todos | Evita Functions ausentes no deploy e mantém observabilidade/inicialização consistente | Mudanças globais continuarão selecionando tudo; esse custo é correto quando o bootstrap realmente muda | **Baixa para manter; alta consequência se quebrado** |

A mesma matriz está no arquivo CSV [`auditoria-functions-prioridades.csv`](auditoria-functions-prioridades.csv), para importar em Excel/Sheets.

## Plano de execução

### Fase 0 — Congelar baseline e critérios

1. Usar este inventário como estado inicial (63 exports; grupos e nomes acima).
2. Guardar por deploy: exports selecionados, número de lotes, duração por lote, duração total, E2E/build, Functions realmente atualizadas e falhas.
3. Medir no Sentry/Cloud Logging pelo menos p50/p95 de `runtime.module_init_ms`, primeira execução e latência observada no cliente para funções críticas. Segmentar por endpoint/revisão; não registrar payloads ou dados pessoais.
4. Tratar `getAiUsage` como legado de leitura até confirmar consumidores; não remover endpoint/contrato nesta refatoração.
5. Estabelecer critérios: mesmos nomes e payloads, autorizações/secrets e região; sem novas regras Firestore, sem perda de idempotência, sem operação financeira cliente-direta.

**Estado:** baseline registrado. Depois do deploy amplo de 63 Functions em [40628205038](https://github.com/ccesargarcia/luisices/actions/runs/40628205038), a correção do seletor passou e o deploy seguinte de IA atualizou cinco Functions, demonstrando redução de escopo.

### Fase 1 — MCP: primeira redução segura

1. ✅ Separar registros MCP no root para que `chatGptToolsEndpoint` carregue o endpoint e as callables administrativas carreguem apenas o módulo de callables. Não deixar `mcp/index.js` importar os dois grupos para todos os consumidores.
2. Criar uma fábrica mínima para o runtime MCP que receba Firestore/Auth necessários e construa `AiDataRepositories` + `AiToolsExecutor`; não instanciar `GeminiClient`, todos os handlers de IA ou os serviços de enriquecimento no endpoint MCP sem necessidade comprovada.
3. Manter compartilhados os contratos de ferramenta, autorização/escopo, operações financeiras e validações determinísticas. Separar adaptador/protocolo de regra de negócio, não copiar regra.
4. ✅ Estender `functions-deploy-selection.test.mjs` com expectativas de grafo: mudanças exclusivas em callables e endpoint afetam seus próprios grupos; uma dependência compartilhada afeta ambos.
5. Executar unitários MCP, testes de permissão/escopo, integração com Firestore Emulator para preview → confirmação → idempotência e fluxos de itens (incluindo 1–4 e 5–10). Validar regressão via ChatGPT Web e cliente Android quando disponível.
6. Publicar somente após os alvos esperados serem revisados no log. Conferir `tools/list`, OpenAPI, OAuth/manifests e cache MCP no DEV; depois testar uma mutação real controlada e verificar auditoria/ledger.

**Estado:** exports MCP isolados, testes do grafo passando e remoção do agregado tratada com seleção conhecida em vez de deploy global. Uma consulta somente de leitura foi confirmada pelo conector MCP de DEV. Ainda falta uma mutação controlada de pedido, com procedimento de limpeza, antes de considerar a validação funcional completa. A fábrica mínima MCP permanece pendente.

### Fase 2 — IA: fábricas e handlers por capacidade

1. ✅ Separar `getAiUsage` para depender apenas de autorização, Firestore e leitura agregada histórica.
2. Separar factories para chat e cada tipo de enrichment, com configuração explícita de secrets e dependências.
3. Desmembrar `handlers.js` só nos pontos necessários para reduzir os imports transitivos; evitar uma decomposição puramente por tamanho.
4. Garantir que `aiAgentChat` continua sendo o único caminho que inicializa contexto, executor de ferramentas e orçamento do chat. Vision/enrichment continuam com seus próprios limites e budget.
5. Validar respostas, chamadas/fallback do Gemini, permissões, chamadas de ferramenta e métricas Sentry. Comparar módulo/handler antes/depois no mesmo endpoint.

**Estado:** `getAiUsage` foi separado em `functions/ai/usageCallable.js` e `functions/ai/usageHandler.js`; não carrega `ai/index`, Gemini, tools ou handlers de chat. A autorização de sessão e a restrição de administrador foram preservadas. A CI [40737383806](https://github.com/ccesargarcia/luisices/actions/runs/40737383806) passou com lint e 1.349 testes unitários/regressivos. O deploy DEV atualizou cinco Functions (incluindo os consumidores que ainda compartilham `ai/index.js`). Mudanças futuras em `usageHandler.js` devem selecionar apenas `getAiUsage`; factories específicas para enrichment continuam pendentes.

### Fase 3 — Pedidos: isolamento sem mudar a transação

1. Separar catálogo e submit público, acompanhamento de links, mutations internas e SuperFrete DEV em entry modules claros.
2. Manter `createOrder` e `updateComplexOrder` sobre o mesmo serviço transacional necessário para pedido/ledger/recibos; não reduzir proteção Rules nem reintroduzir escrita direta do frontend.
3. Adicionar matriz de seleção e regressão dos caminhos de pagamento, múltiplos itens (1–4 e 5–10), links públicos, permissão, idempotência e concorrência.
4. Verificar em DEV os exports e secrets, depois publicar a parte de pedidos; frontend só acompanha se tiver alteração própria.

### Fase 4 — E-mail, WhatsApp e Alexa, em mudanças separadas

1. E-mail: envio e idempotência; webhook assinado; uso/limpeza.
2. WhatsApp: webhook Evolution; chamadas de conversa/status; envio/sincronização.
3. Alexa: webhook e verificação; callables administrativas; domínio de diálogo/pareamento compartilhado.
4. Para cada domínio, mover uma família por vez e comprovar com testes específicos de segurança, idempotência e integração externa.

### Fase 5 — Usuários e consolidação

1. Separar convite/ativação, operações de conta e sessões sem mudar regras de claims.
2. Preservar a Mídia como referência de módulo isolado.
3. Documentar novos grafos, comandos seletivos e critérios para adicionar um export. Garantir CI bloqueia import dinâmico não rastreável e export não mapeado.
4. Comparar 5–10 deploys após a mudança; se a redução de tempo/Functions não for relevante, parar a decomposição antes de aumentar complexidade.

## Critérios de aceite por fase

- Todos os exports esperados continuam descobertos pelo Firebase CLI, com nomes, tipos, região, secrets, limites e runtime iguais.
- O teste de seleção mostra precisamente os endpoints que uma alteração em cada arquivo deve atingir; nenhuma Function necessária fica de fora.
- Os testes de autorização, validação, idempotência, integração e contratos HTTP/callable continuam verdes na CI; este documento sozinho não autoriza pular testes.
- A mudança não adiciona `minInstances`, cron de aquecimento, dependência paga ou novo serviço de infraestrutura.
- A implantação DEV termina com as Functions selecionadas e o Hosting somente quando necessário. Regras e índices só são publicados quando mudarem.
- Sentry/Cloud Run/cliente fornecem dados comparáveis. Uma redução na contagem de Functions é ganho operacional; melhora de cold start só é declarada com métricas.
- Cada fase pode ser revertida sem apagar documentos, desativar permissões ou renomear Functions.

## Decisão final

O compartilhamento de **regras de negócio puras** é desejável. O problema encontrado não é compartilhar em si, mas usar índices/fábricas que carregam domínios inteiros e conectam adaptadores que têm ciclo de vida diferente. Começar pelo desacoplamento MCP/IA oferece o maior ganho com risco administrável; pedidos vêm em seguida devido ao impacto potencial sobre pagamentos e consistência financeira. As refatorações devem ser guiadas pelo grafo e por medições, nunca por redução artificial do seletor.

## Acompanhamento da primeira etapa

Após o commit-base desta auditoria, o working tree passou a registrar diretamente as 10 callables MCP por `functions/mcp/callables.js` e `chatGptToolsEndpoint` por `functions/mcp/endpoint.js`. O agregado antigo `functions/mcp/index.js`, que carregava os dois grupos juntos, foi removido por não ter outros consumidores. Os contratos e nomes públicos dos 11 exports foram preservados.

Foram acrescentados testes do seletor para mudanças exclusivas em callables, endpoint, dependências MCP compartilhadas e remoção de agregado antes alcançável. O deploy [40628205038](https://github.com/ccesargarcia/luisices/actions/runs/40628205038) passou na CI, mas selecionou todas as 63 Functions após a remoção do agregado. A alteração seguinte reconhece arquivos removidos quando eram alcançáveis no grafo do commit implantado; arquivos de runtime sem referência conhecida continuam acionando seleção global. A validação [40735963324](https://github.com/ccesargarcia/luisices/actions/runs/40735963324) passou: teste de seleção, lint e 1.345 testes unitários/regressivos. E2E e publicação foram ignorados por não haver mudanças de produto ou Functions. Os testes locais seguem bloqueados porque o Node do Termux falha ao iniciar por incompatibilidade de biblioteca.

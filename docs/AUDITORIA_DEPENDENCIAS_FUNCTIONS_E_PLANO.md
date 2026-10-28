# Auditoria de dependências e plano de modularização das Cloud Functions

**Revisado em:** 28/10/2026
**Branch/commit analisado:** `develop` / `b78cc51` (extração de `getEmailUsage`)
**Deploy DEV observado:** workflow [40628205038](https://github.com/ccesargarcia/luisices/actions/runs/40628205038), concluído com sucesso.

## Objetivo e limites

Este documento avalia os exports de Cloud Functions presentes em `functions/index.js`, seus grafos locais de `require()` e os efeitos observáveis no seletor de deploy. O objetivo é reduzir acoplamento de runtime e redeploys desnecessários sem alterar contratos, permissões, validações financeiras ou comportamento dos usuários.

O mapa é estático e baseado no código do repositório. Ele não mede o tempo real de inicialização de cada container, não confirma configuração remota de cada Function e não substitui métricas do Cloud Run, Sentry ou logs de execução. O seletor também trata dependências conservadoramente: se não consegue provar que uma alteração é isolada, prefere selecionar mais Functions.

## Resumo executivo

- Há **63 exports** no entrypoint: 61 endpoints gerais e 2 endpoints exclusivos de DEV/emulador.
- Esses exports formam módulos de entrada independentes por domínio/capacidade: MCP separa gestão e endpoint; IA separa chat, enrichments e `getAiUsage`; Pedidos já separa catálogo público e SuperFrete DEV do núcleo transacional. Mudanças em dependências compartilhadas ainda selecionam todos os consumidores correspondentes.
- O maior agrupamento é Usuários (**15 endpoints**), seguido de Pedidos (**13 em DEV, 11 em produção**, divididos entre core, catálogo, tracking e SuperFrete DEV), MCP (**11**), Alexa (**8**), WhatsApp (**7**), IA (**4**), E-mail (**4**, agora dividido entre entrada de uso e módulo de envio/webhook/limpeza) e Mídia (**1**).
- No deploy DEV [40737383806](https://github.com/ccesargarcia/luisices/actions/runs/40737383806), o CI passou e o seletor publicou **5 Functions** para a separação de `getAiUsage`: quatro exports de IA e o endpoint MCP que compartilha a fábrica de IA. A etapa de atualização das Functions levou cerca de 2min09s.
- No deploy anterior [40628205038](https://github.com/ccesargarcia/luisices/actions/runs/40628205038), o seletor havia escolhido **63 Functions** após a remoção do agregador MCP. A correção do seletor foi validada no run [40735963324](https://github.com/ccesargarcia/luisices/actions/runs/40735963324).
- Os exports MCP agora são registrados diretamente por `functions/mcp/callables.js` e `functions/mcp/endpoint.js`. O antigo `functions/mcp/index.js` foi removido. Os testes já cobrem deploy seletivo entre os dois grupos.
- A correção do seletor reconhece arquivos removidos que pertenciam ao grafo do commit implantado, mantendo seleção global para arquivos de runtime realmente não rastreáveis.
- `getAiUsage` e MCP não usam a fábrica geral de chat. Chat e enrichments agora têm entradas/fábricas separadas, com `handlers.js`, Gemini e orçamento ainda compartilhados onde necessários.
- MCP e IA já foram decompostos; em Pedidos, catálogo, SuperFrete e tracking têm entradas próprias, preservando o núcleo transacional. O isolamento de tracking já foi publicado em DEV. E-mail está em decomposição; WhatsApp, Alexa e Usuários permanecem como etapas futuras.

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
| Pedidos — `functions/orders/index.js` | 3 | 3 | `submitPublicCatalogOrder`, `updateComplexOrder`, `createOrder` | Mantém as mutations críticas, inclusive os fluxos autoritativos de pedido/ledger. |
| Catálogo público — `functions/orders/catalog.js` | 1 | 1 | `getPublicCatalogProducts` | Entrada independente, com teste de handler injetável e prova de inicialização seletiva. |
| SuperFrete — `functions/orders/superfrete.js` | 2 | 0 | `calculateSuperfreteShipping`, `createSuperfreteLabel` (DEV/emulador) | Entrada independente; não carrega o núcleo de pedidos e permanece ausente em produção. |
| IA — `functions/ai/callables.js`, `functions/ai/enrichmentCallables.js` e `functions/ai/usageCallable.js` | 4 | 4 | `aiAgentChat`, `getAiUsage`, `enrichGalleryItemWithAi`, `enrichStoreProductWithAi` | Chat, enrichments e analytics têm entradas independentes; os dois enrichments compartilham fábrica visual e o serviço de domínio dos handlers. |
| MCP — `functions/mcp/callables.js`, `functions/mcp/endpoint.js` e `functions/mcp/aiServices.js` | 11 | 11 | `getMcpSettingsStatus`, `createMcpApiKey`, `updateMcpApiKeyScopes`, `toggleMcpApiKey`, `revokeMcpApiKey`, `toggleGlobalMcp`, `setUserMcpEligibility`, `revokeMcpSession`, `getMcpAuditLogs`, `getMcpOpenApiSchema`, `chatGptToolsEndpoint` | Callables administrativas e endpoint público têm entradas separadas. O endpoint cria somente repositórios e executor determinístico, sem Gemini/handlers de chat. |
| Alexa — `functions/alexa/index.js` | 8 | 8 | `alexaWebhook`, `approveAlexaPairing`, `setAlexaPermission`, `revokeAlexaBinding`, `toggleGlobalAlexaIntegration`, `getAlexaIntegrationStatus`, `approveAlexaDraft`, `cancelAlexaDraft` | O webhook e as callables administrativas compartilham 18 módulos locais, inclusive diálogo, pareamento e serviços relacionados. |
| WhatsApp — `functions/whatsapp/index.js`, `conversations.js`, `status.js` e `webhook.js` | 7 | 7 | Envio/exclusão/sincronização em `index.js`; leitura/abertura em `conversations.js`; status em `status.js`; webhook em `webhook.js` | Entradas separadas compartilham autorização e escopo de conversa; webhook mantém persistência transacional em `persistMessage.js`. |
| E-mail — `functions/email/send.js`, `usage.js`, `webhook.js` e `cleanup.js` | 4 | 4 | `sendCustomEmail`, `getEmailUsage`, `resendReceivingWebhook`, `cleanupEmailDrafts` | Cada export tem entrada própria. Envio conserva anexos/idempotência; webhook conserva validação de origem, assinatura Svix, deduplicação e antispam; limpeza conserva o core de limpeza. Nenhuma dessas extrações por si só comprova redução de latência. |
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

`functions/ai/index.js` importa `tools`, `handlers`, `geminiClient`, `repositories`, `budget`, `usage`, `schemas`, `cache` e configurações. `createAiServices()` sustenta o chat e constrói repositórios, executor, orçamento e handlers. Os enrichments agora usam `enrichmentServices.js`, que compartilha Gemini, orçamento e handlers mas não importa tools, repositórios, cache ou usage. `getAiUsage` permanece isolado em `usageCallable.js` e `usageHandler.js`.

Consequências verificáveis:

- Correções no executor compartilhado selecionam `aiAgentChat` e `chatGptToolsEndpoint`; não selecionam os enrichments.
- As dez callables administrativas MCP compartilham `mcp/callables.js`; `chatGptToolsEndpoint` tem entrypoint próprio. Alterações exclusivas no endpoint não republicam as callables administrativas.
- A inicialização/carga de módulos fica maior do que a necessária para handlers simples.
- A construção da fábrica dentro do handler repete criação de objetos/closures por invocação, embora o cache de módulos e processos do Node continue aplicável. A fábrica deve ser medida antes de mover objetos para estado global; estado de usuário nunca pode ser compartilhado entre requisições.
- `GeminiClient` é baseado em `fetch` e não mostra import de SDK externo no arquivo; mesmo assim, o pacote de IA inteiro fica acoplado pelo grafo, e sua construção sem chave/modelo não é necessária para operações MCP que apenas executam ferramentas.

**Direção recomendada:** manter regras de domínio compartilhadas, mas deixar adaptadores e fábricas por capacidade. O MCP depende explicitamente de autorização, repositórios e executor; `getAiUsage` não carrega Gemini/tools; enrichments não carregam tools/repositórios. O chat continua compartilhando seu executor com o MCP enquanto oferecem as mesmas operações.

### 2. Pedidos: alto valor, maior cuidado de regressão

O domínio Pedidos ainda soma 13 exports em DEV e 11 em produção, agora distribuídos entre o núcleo `functions/orders/index.js` (3), catálogo `functions/orders/catalog.js` (1), tracking `functions/orders/tracking.js` (7) e SuperFrete `functions/orders/superfrete.js` (2, apenas DEV/emulador). Os caminhos `createOrder` e `updateComplexOrder` continuam autoritativos e transacionais.

**Direção recomendada:** criar módulos de entrada por fronteiras funcionais (por exemplo: `coreMutations`, `publicCatalog`, `tracking`, `superfrete`) e serviços de domínio pequenos. Conservar exatamente nomes, regiões, secrets, limites, autenticação, atomicidade pedido/ledger/recibos e a ordem de deploy backend/frontend. Isolar os dois endpoints DEV de SuperFrete para que não se misturem com os exports de produção. Não alterar Firestore Rules nesta iniciativa.

### 3. Alexa

O export comum `./alexa` aponta para um índice que importa webhook, processamento de diálogo, pareamento, chamadas administrativas e auxiliares. O webhook de voz e os endpoints administrativos não precisam necessariamente ser publicados como um único grupo. Há regras de autenticação/assinatura e gravação de rascunhos que tornam essa separação de risco médio/alto.

**Direção recomendada:** primeiro separar caminhos de export para webhook e callables administrativas mantendo `dialog.js`, `pairing.js`, repositórios e validações como serviços compartilhados. Depois, considerar separar diálogo por intenção apenas se isso reduzir dependências e continuar simples de testar.

### 4. WhatsApp

Três callables de envio/exclusão/sincronização usam `whatsapp/index.js`; `markWhatsAppChatRead` e `ensureWhatsAppConversation` usam `whatsapp/conversations.js`; `getWhatsAppInstanceStatus` usa `whatsapp/status.js`; `evolutionWhatsAppWebhook` usa `whatsapp/webhook.js`. As entradas de conversa compartilham `authorization.js` e `chatScope.js`, preservando autorização, titularidade por parceiro e reserva transacional de novos chats. A lógica de leitura/abertura está isolada em `conversationCore.js` para testar validação e efeitos de gravação com dependências injetadas. A persistência de mensagens recebidas continua em `persistMessage.js`, com gravação e contador de não lidas na mesma transação. A extração reduz o acoplamento de carregamento/deploy, sem alterar por si só latência em runtime.

**Etapa anterior concluída em DEV:** o webhook foi movido para `whatsapp/webhook.js`; testes existentes cobrem persistência atômica, deduplicação em repetição/transação concorrente e retry após falha. A CI [40756554078](https://github.com/ccesargarcia/luisices/actions/runs/40756554078) passou lint e 1.366 testes unitários e publicou `evolutionWhatsAppWebhook` e as seis callables do módulo alterado em dois lotes (4m39s).

**Etapa concluída em DEV:** `getWhatsAppInstanceStatus` foi extraída para `whatsapp/status.js`, com lógica de resposta HTTP isolada em `statusCore.js` e autorização compartilhada em `authorization.js`. Testes cobrem estados retornados pelo provedor, falhas de rede e perfis/permissões. A mudança preservou nome, configuração, secret e payload da callable. A CI [40759415487](https://github.com/ccesargarcia/luisices/actions/runs/40759415487) passou lint, 129 arquivos/1.379 testes unitários e a seleção de deploy; o E2E foi corretamente pulado para esta mudança backend-only. O deploy publicou `getWhatsAppInstanceStatus` e as cinco callables do painel porque o módulo compartilha autorização; terminou com sucesso. Alterações futuras exclusivas em `status.js`/`statusCore.js` devem selecionar só `getWhatsAppInstanceStatus`. A extração não implica ganho medido de latência.

**Etapa concluída em DEV:** `markWhatsAppChatRead` e `ensureWhatsAppConversation` foram extraídas para `whatsapp/conversations.js`. A mudança mantém as duas camadas de autorização, a verificação de titularidade por parceiro, validação do telefone e conferência de que o telefone do cliente corresponde ao chat. `conversationCore.js` permite testar que entradas inválidas ou fora do escopo não causam gravações. A CI [40761576421](https://github.com/ccesargarcia/luisices/actions/runs/40761576421) passou lint, o seletor e 130 arquivos/1.390 testes unitários; o E2E foi pulado por se tratar de alteração backend-only. O deploy atualizou cinco Functions em 2m57s: `ensureWhatsAppConversation`, `markWhatsAppChatRead`, `sendWhatsAppDirectMessage`, `deleteWhatsAppMessage` e `syncWhatsAppChatMessages`. As três operações do módulo `whatsapp/index.js` foram republicadas porque esse arquivo mudou nesta extração; status e webhook não foram republicados. Mudanças futuras exclusivas em `conversations.js`/`conversationCore.js` devem selecionar as duas callables de conversa.

### 5. E-mail

Os quatro endpoints continuam no mesmo domínio público e cada um aponta diretamente a seu módulo de entrada. O grafo de envio não carrega o webhook nem a limpeza; o webhook não carrega envio/anexos/idempotência; a limpeza não carrega os caminhos de e-mail online. A validação de assinatura/segredo Svix permanece no módulo do webhook.

**Direção recomendada:** concluir a cobertura de contrato do webhook (assinatura Svix, origem e deduplicação) e observar o seletor/CI antes do deploy DEV. A separação estrutural já está implementada localmente; ela não afirma reduzir latência de execução sem medição.

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
| **Concluída** | Desacoplar o endpoint MCP das callables administrativas; apontar exports diretamente aos módulos apropriados | 11 MCP | Mudanças no endpoint deixam de republicar as callables administrativas; o endpoint MCP não carrega Gemini nem a fábrica de chat | Alterações em ferramentas/repositórios ainda republicam seus consumidores compartilhados | **Média** |
| **Concluída** | Separar entradas de `getAiUsage`, chat e enrichments por capacidade | 4 IA + MCP | Analytics, MCP, chat e enrichments têm grafos de entrada separados; menos imports para MCP e enrichments | Chat/enrichments compartilham handlers; chat/MCP compartilham tools/repos. Não há comparação pós-deploy suficiente para afirmar redução de latência | **Alta** |
| **P1** | Medir inicialização/primeira chamada por endpoint, com cobertura uniforme antes/depois | Todos | Evidência separa carga de módulo, cold start de plataforma e duração do handler; evita otimização por suposição | Instrumentação adiciona ruído/volume; dados ausentes ou amostrados não equivalem a zero; não reduz latência por si só | **Média** |
| **Concluída** | Isolar catálogo público e SuperFrete DEV do núcleo de Pedidos | 3 exports | Mudanças de catálogo/SuperFrete não republicam mutations financeiras; SuperFrete deixa de carregar o núcleo | Regressões precisam manter cache, secrets, DEV gating e configuração callable | **Média** |
| **Concluída** | Isolar os sete handlers de tracking do núcleo de Pedidos | 7 exports | Mudanças exclusivas em links não republicam mutations financeiras | Primeira publicação também atualizou o núcleo pelo grafo anterior; paginação e exclusão em lote ainda precisam de regressões próprias | **Alta** |
| **P2** | Separar webhook Alexa das callables administrativas; manter domínio comum | 8 | Mudança de diálogo/assinatura não republica todas as ações administrativas; menor acoplamento de inicialização | Risco de assinatura ASK, dedupe, pareamento e rascunhos se handlers forem movidos sem testes de contrato | **Média/Alta** |
| **Concluída em DEV** | Separar webhook, status, conversas e operações de envio no WhatsApp | 7 | Alterações exclusivas em webhook, status ou conversas podem ter deploy independente | Preservar autorização, escopo por telefone, dedupe e persistência de eventos | **Média/Alta** |
| **Concluída localmente; aguarda CI/deploy DEV** | Separar envio, consulta, webhook e limpeza em módulos independentes | 4 exports | Mudanças exclusivas em cada fluxo selecionam somente sua Function; evita carregar anexos/idempotência para webhook/limpeza e vice-versa | A extração preserva complexidade e dependências internas de cada fluxo; assinatura Svix, idempotência e limpeza precisam continuar cobertas por regressões | **Média/Alta** |
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

**Estado:** exports MCP isolados, testes do grafo passando e remoção do agregado tratada com seleção conhecida em vez de deploy global. A fábrica mínima MCP foi publicada em `functions/mcp/aiServices.js`, e o usuário confirmou o uso bem-sucedido do MCP em DEV. A validação funcional anotada foi de consulta somente de leitura; não há neste registro uma mutação controlada de pedido.

### Fase 2 — IA: fábricas e handlers por capacidade

1. ✅ Separar `getAiUsage` para depender apenas de autorização, Firestore e leitura agregada histórica.
2. Separar factories para chat e cada tipo de enrichment, com configuração explícita de secrets e dependências.
3. Desmembrar `handlers.js` só nos pontos necessários para reduzir os imports transitivos; evitar uma decomposição puramente por tamanho.
4. Garantir que `aiAgentChat` continua sendo o único caminho que inicializa contexto, executor de ferramentas e orçamento do chat. Vision/enrichment continuam com seus próprios limites e budget.
5. Validar respostas, chamadas/fallback do Gemini, permissões, chamadas de ferramenta e métricas Sentry. Comparar módulo/handler antes/depois no mesmo endpoint.

**Estado:** `getAiUsage` foi separado em `functions/ai/usageCallable.js` e `functions/ai/usageHandler.js`; não carrega `ai/index`, Gemini, tools ou handlers de chat. Chat e enrichments também têm entradas e fábricas por capacidade, preservando sessão, secrets, orçamento, modelo/fallback e spans Sentry. As validações CI e deploy DEV estão registradas nas atualizações ao final deste documento.

### Fase 3 — Pedidos: isolamento sem mudar a transação

1. Separar catálogo e submit público, acompanhamento de links, mutations internas e SuperFrete DEV em entry modules claros.
2. Manter `createOrder` e `updateComplexOrder` sobre o mesmo serviço transacional necessário para pedido/ledger/recibos; não reduzir proteção Rules nem reintroduzir escrita direta do frontend.
3. Adicionar matriz de seleção e regressão dos caminhos de pagamento, múltiplos itens (1–4 e 5–10), links públicos, permissão, idempotência e concorrência.
4. Verificar em DEV os exports e secrets, depois publicar a parte de pedidos; frontend só acompanha se tiver alteração própria.

**Estado:** SuperFrete foi isolado em `functions/orders/superfrete.js` e o catálogo em `functions/orders/catalog.js`. Testes de inicialização e seleção provaram os grafos independentes; a CI [40747221176](https://github.com/ccesargarcia/luisices/actions/runs/40747221176) passou com lint e 1.357 testes em 126 arquivos. O deploy DEV publicou 13 Functions na separação inicial de SuperFrete e, na mudança de catálogo, atualizou 11 Functions de pedidos em 4m24s. O catálogo tem teste unitário com Firestore injetado. Nesta alteração, os sete handlers de tracking foram movidos para `functions/orders/tracking.js`, sem mudança do texto dos handlers. A CI [40749435427](https://github.com/ccesargarcia/luisices/actions/runs/40749435427) passou com unitários, integração no Firestore Emulator, lint/build e 92 E2E por shard (184 no total). O teste novo cobriu proprietário/admin/funcionário atribuído, criação duplicada, token cifrado/hash, projeção pública, revogação e expiração. O deploy DEV atualizou 10 Functions em dois lotes e levou aproximadamente 3m32s; sete exports de tracking e as três mutations do núcleo foram republicados pela transição do grafo anterior. Catálogo, SuperFrete, frontend e regras não foram republicados. Paginação e exclusão em lote seguem sem cobertura específica.

### Fase 4 — E-mail, WhatsApp e Alexa, em mudanças separadas

1. E-mail: envio e idempotência; webhook assinado; uso/limpeza.
2. WhatsApp: webhook Evolution; status da instância; chamadas de conversa; envio/sincronização.
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

## Atualização: fábrica enxuta do MCP (28/10/2026)

Esta seção substitui as observações anteriores que diziam que o endpoint MCP ainda importava `functions/ai/index.js`. A mudança local troca essa fábrica pela nova `functions/mcp/aiServices.js`, que instancia somente `AiDataRepositories` e `AiToolsExecutor`. Assim, o endpoint deixa de carregar `GeminiClient`, orçamento, cache e handlers de chat/enrichment. O MCP continua compartilhando `ai/tools.js` e `ai/repositories.js` com as operações de chat que usam essas mesmas capacidades; alterações nesses dois módulos devem seguir selecionando todos os consumidores.

Foram acrescentados testes de inicialização do endpoint, composição da fábrica e seletor de deploy. O alvo esperado para mudanças exclusivas em `mcp/aiServices.js` é somente `chatGptToolsEndpoint`; alterações exclusivas em `ai/index.js` ou `ai/geminiClient.js` selecionam as três callables de chat/enrichment, sem o endpoint MCP. Após corrigir um import incompatível com ESM no teste novo, a CI [40739990949](https://github.com/ccesargarcia/luisices/actions/runs/40739990949) passou: seletor, lint e 1.351 testes em 125 arquivos. O deploy DEV atualizou somente `chatGptToolsEndpoint(us-central1)` e levou cerca de 2m02s. Depois, o usuário confirmou uso bem-sucedido do MCP em DEV; a operação realizada não foi especificada.

## Etapa concluída: isolamento dos enrichments (28/10/2026)

Na `develop`, `aiAgentChat` permanece na fábrica geral; `enrichGalleryItemWithAi` e `enrichStoreProductWithAi` usam `enrichmentCallables.js` e `enrichmentServices.js`. A fábrica de enrichment mantém a mesma configuração de modelo/fallback, orçamento, validação de sessão, secret `GEMINI_API_KEY`, memória e timeout. Os callables continuam usando `withFirstInvocationSpan` com o tempo de inicialização do módulo, preservando a medição Sentry da primeira execução e de `runtime.module_init_ms`.

A CI [40742861524](https://github.com/ccesargarcia/luisices/actions/runs/40742861524) passou com lint e 1.353 testes unitários em 125 arquivos. O E2E foi ignorado por ser uma mudança exclusiva de backend. O primeiro deploy encontrou HTTP 500 ao atualizar `aiAgentChat`; a nova tentativa automática publicou com sucesso as três Functions selecionadas: `aiAgentChat`, `enrichGalleryItemWithAi` e `enrichStoreProductWithAi`, todas em `us-central1`. Não houve publicação de frontend, regras Firestore ou cache Cloudflare. A confirmação do deploy comprova que os exports foram atualizados, mas ainda não há comparação pós-deploy de métricas do Sentry.

**Estado atual desta alteração:** os sete handlers foram movidos sem alteração no texto das implementações para `functions/orders/tracking.js`; os exports de `functions/index.js` apontam diretamente para esse módulo. A CI [40749435427](https://github.com/ccesargarcia/luisices/actions/runs/40749435427) e o deploy DEV terminaram com sucesso. Os logs comprovam que sete exports de tracking e três mutations foram atualizados, sem mudança de Rules ou Hosting. Faltam regressões específicas para paginação e exclusão em lote.

**Etapa anterior concluída em DEV:** `getEmailUsage` foi movida para `functions/email/usage.js`; CI e histórico estão descritos acima. A execução SDK [40752738060](https://github.com/ccesargarcia/luisices/actions/runs/40752738060) registrou duas falhas fora do fluxo de métricas: fixture de contratos incompleta e expectativa de status no webhook Alexa.

**Etapa concluída em DEV:** os quatro exports de E-mail têm entradas independentes. A CI [40754594577](https://github.com/ccesargarcia/luisices/actions/runs/40754594577) passou lint e 1.365 testes unitários; publicou somente `sendCustomEmail`, `resendReceivingWebhook` e `cleanupEmailDrafts`, em 2m48s. O primeiro run foi bloqueado por um teste que tentava usar `.run` no wrapper; a camada Svix/origem foi coberta diretamente e passou na execução seguinte. O usuário confirmou envio e recebimento funcionando em DEV.

**Etapa concluída em DEV:** o webhook Evolution foi extraído para `whatsapp/webhook.js`; o entrypoint aponta diretamente para ele. O corpo do handler foi preservado e mantém chave Evolution, proteção de origem, limite de payload, Sentry e persistência atômica. CI e deploy DEV concluídos no run [40756554078](https://github.com/ccesargarcia/luisices/actions/runs/40756554078).

# Backend Firebase — Luisices

Pedidos e inicialização revisados em **28/10/2026**, branch `develop`. Runtime **Node.js 22**. O entrypoint público é [index.js](index.js); funções internas só ficam disponíveis remotamente quando exportadas e publicadas.

## Instalação e verificação

Na raiz do repositório:

```bash
npm ci
npm --prefix functions ci
npm run lint:functions
npm run test:unit
npm run test:integration
npm run test:presence
```

Testes de integração/presença usam emuladores e precisam de Java 21 para a versão de CLI adotada. Testes unitários não comprovam configuração remota de secrets, regras ou provedores.

## Domínios exportados

| Domínio | Exportações em `index.js` |
|---|---|
| Contas e convites | `createUser`, `updateUser`, `deleteUser`, `createUserInvitation`, `validateUserInvitation`, `completeUserInvitation` |
| Recuperação/verificação | `sendAdminPasswordReset`, `sendPasswordResetEmail`, `sendVerificationEmail`, `recordUserPasswordChange` |
| Acesso e sessões | `getUserAccountMetadata`, `registerDeviceSession`, `revokeAllSessions`, `revokeDeviceSession`, `repairUserClaims` |
| E-mail | `sendCustomEmail` (`email/send.js`), `getEmailUsage` (`email/usage.js`), `resendReceivingWebhook` (`email/webhook.js`), `cleanupEmailDrafts` (`email/cleanup.js`) |
| WhatsApp | `sendWhatsAppDirectMessage`, `deleteWhatsAppMessage`, `syncWhatsAppChatMessages`, `getWhatsAppInstanceStatus`, `markWhatsAppChatRead`, `ensureWhatsAppConversation`, `evolutionWhatsAppWebhook` |
| Pedidos (núcleo transacional) | `createOrder`, `updateComplexOrder`, `submitPublicCatalogOrder` |
| Catálogo público | `getPublicCatalogProducts` (`orders/catalog.js`) |
| Acompanhamento público | `createOrderTrackingLink`, `listOrderTrackingLinks`, `revokeOrderTrackingLink`, `revokeOrderTrackingLinkById`, `deleteOrderTrackingLink`, `deleteOrderTrackingLinksBatch`, `getPublicOrderTracking` (`orders/tracking.js`) |
| IA | `aiAgentChat`, `getAiUsage` (legado), `enrichGalleryItemWithAi`, `enrichStoreProductWithAi` |
| Alexa | `alexaWebhook`, `approveAlexaPairing`, `setAlexaPermission`, `revokeAlexaBinding`, `toggleGlobalAlexaIntegration`, `getAlexaIntegrationStatus`, `approveAlexaDraft`, `cancelAlexaDraft` |
| MCP/ChatGPT | `getMcpSettingsStatus`, `createMcpApiKey`, `updateMcpApiKeyScopes`, `toggleMcpApiKey`, `revokeMcpApiKey`, `toggleGlobalMcp`, `setUserMcpEligibility`, `revokeMcpSession`, `getMcpAuditLogs`, `getMcpOpenApiSchema`, `chatGptToolsEndpoint` |
| Mídia | `galleryMedia` |

`calculateSuperfreteShipping` e `createSuperfreteLabel` são exportadas apenas no projeto `luisices-dev` e no emulador; não fazem parte do deploy de produção.

O catálogo público, SuperFrete e acompanhamento têm módulos de entrada próprios. O catálogo mantém sua callable e cache em `orders/catalog.js`; SuperFrete fica em `orders/superfrete.js` e não carrega o módulo principal de pedidos; os sete handlers de acompanhamento ficam em `orders/tracking.js`. Os quatro exports de E-mail também têm entradas independentes (`email/send.js`, `email/usage.js`, `email/webhook.js` e `email/cleanup.js`). No WhatsApp, `whatsapp/send.js`, `whatsapp/delete.js` e `whatsapp/sync.js` têm entradas próprias para envio, exclusão e sincronização; `sync.js` delega a lógica para `syncCore.js`. `whatsapp/conversations.js` trata leitura e abertura de conversas; `whatsapp/status.js` consulta a conexão; `whatsapp/webhook.js` recebe eventos Evolution. A autorização comum fica em `whatsapp/authorization.js`, e `whatsapp/chatScope.js` mantém as verificações de propriedade da conversa. O webhook usa `whatsapp/persistMessage.js` para persistência transacional. Testes de inicialização e do seletor verificam as fronteiras de carregamento e deploy.

`cleanupEmailDrafts` é agendada. Webhooks têm validações próprias; não são chamadas de interface equivalentes aos callables autenticados.

## Contratos relevantes

- `createOrder` é o caminho autoritativo para criar pedidos do painel; a regra nega criação direta. Grava contador, pedido, ledger, estatísticas e eventos financeiros atomicamente. A chave reutilizada exige mesmo usuário e hash do comando completo; diferenças produzem conflito.
- `updateComplexOrder` valida a sessão, permissão atual, campos, 1–10 itens e versão; grava recibos duráveis na mesma transação. O replay verifica autorização antes do recibo e reconhece a operação original mesmo após outra edição. O cliente não pode alterar recibos. Ver [contrato de idempotência](../docs/IDEMPOTENCIA_PEDIDOS.md).

### Proteção de Origem e Recuperação Idempotente de Pedidos

- **Padrão Negado no Código (`deny-by-default`):** No wrapper compartilhado `common/sentryFunctions.js`, todos os callables exigem o cabeçalho `x-origin-secret`. No código revisado, chamadas diretas sem esse cabeçalho são sumariamente rejeitadas com `permission-denied`, mesmo que o usuário esteja autenticado no Firebase Auth. A eficácia remota depende de o segredo estar provisionado no Cloud Functions e mantido em sigilo no Cloudflare Worker.
- **Exclusividade do Gateway:** No código do cliente, as chamadas conectam exclusivamente pelo gateway configurado para o Cloudflare (`api.luisices.com.br`). Rotas diretas de contingência pelo navegador foram removidas do código para preservar os controles de borda e evitar bypass não monitorado.
- **Tratamento de Timeout como Estado Incerto:** Falhas de rede, timeouts ou erros 5xx de gateway não são tratados como falha definitiva de gravação. O cliente preserva a chave determinística (`idempotencyKey` ou `operationId`) e mantém o estado da operação pendente para reconciliação e retry pelo mesmo caminho oficial. Se o comando original já tiver sido persistido pelo backend, a repetição devolve o recibo autoritativo sem duplicar pedidos, ledger ou estatísticas.
- **Cold Start e Custos:** Mantém-se a escala mínima padrão zero, sem reservar instâncias ociosas. O entrypoint carrega cada domínio ao resolver seu export; o Firestore Admin prefere REST na nuvem e preserva gRPC no emulador. Não há pings de aquecimento. Custos normais por uso continuam existindo; timeout transitório não comprova cold start. Medição, testes e limites em [Desempenho das Functions](../docs/DESEMPENHO_FUNCTIONS.md).

- Administração de contas passa pelo módulo `users`, com autorização, sincronização e tratamento de estado pendente.
- `revokeDeviceSession` solicita desconexão cooperativa; `revokeAllSessions` trata revogação global.
- `sendCustomEmail` admite administrador ou permissão de envio correspondente. O fluxo com chave de idempotência usa reserva local, chave do provedor e recuperação documentada.
- O WhatsApp valida proprietário e conversa; veja a limitação atual para telefone compartilhado entre parceiros.
- `getPublicCatalogProducts` publica somente os campos do catálogo necessários à vitrine e exclui produtos ocultos. A coleção interna `storeProducts` requer usuário autorizado do painel.
- `submitPublicCatalogOrder` recebe encomendas da vitrine, valida disponibilidade, preço oficial e pedido mínimo no servidor. Cloudflare aplica rate limit aos endpoints públicos de leitura e checkout.
- `listOrderTrackingLinks` mantém a listagem paginada da área administrativa; com `orderId`, retorna um único link. O Dashboard busca links existentes sob demanda, sem percorrer o histórico na abertura.
- `registerDeviceSession` mantém as validações de perfil, revogação e limite de dispositivos na transação, mas não consulta serviços de geolocalização. Preserva a localização já registrada quando o IP não muda; em IP novo registra `Localização não verificada`. `geoip-lite` foi removido para evitar consulta externa e a grande base de dados que vinha com a dependência.
- O Copiloto consulta dados e prepara rascunhos; o envio de WhatsApp pela UI é uma operação posterior, separada.
- A análise de uma arte da galeria pode persistir seu enriquecimento. Não confundir esse endpoint visual com as ferramentas de consulta do chat.
- A análise de consumo detalhada foi retirada da interface e deixou de gerar novas gravações em `ai_usage_*`. O callable `getAiUsage` permanece temporariamente publicado para evitar exclusão remota implícita no deploy; ele só pode ler dados históricos. Os limites operacionais continuam em `ai/budget.js` e não dependem desse relatório.
- Alexa possui diálogo, identidade, rascunhos e confirmação independentes do Copiloto.

Detalhes: [Funcionalidades](../docs/FUNCIONALIDADES.md), [Arquitetura](../docs/DEPENDENCIAS_E_ARQUITETURA.md), [Copiloto](../docs/COPILOTO_IA.md).

## Organização de IA

| Arquivo | Responsabilidade |
|---|---|
| `ai/callables.js` | Endpoints e validação de sessão |
| `ai/schemas.js` | Prompt e nove ferramentas declaradas |
| `ai/handlers.js` | Orquestração, respostas e enriquecimento |
| `ai/tools.js` | Regras das ferramentas de negócio |
| `ai/repositories.js` | Consultas, projeções e escopo |
| `ai/pricing/pricingCalculator.js` | Cálculo de preço |
| `ai/geminiClient.js` | HTTP, timeout e política de fallback |
| `ai/cache.js` | Cache em memória |
| `ai/budget.js` e `ai/usage.js` | Orçamento distribuído e medição |

A política atual pode percorrer alternativas de modelo; não assumir uma única tentativa nem uma tarifa única. Templates no handler também influenciam respostas e precisam ser revisados junto com mudanças no prompt.

Contratos, limites e capacidades atuais do Copiloto estão documentados em [COPILOTO_IA.md](../docs/COPILOTO_IA.md). Consulte o histórico do Git e os workflows para verificar publicação de uma revisão específica.

## Configuração e publicação

Os nomes de parâmetros/segredos estão em [common/secrets.js](common/secrets.js) e nos módulos das integrações. Forneça valores pelo mecanismo de secrets do ambiente. Não publique valores, arquivos de service account ou identificadores de instâncias operacionais em exemplos.

### Monitoramento Sentry

O SDK `@sentry/node` é inicializado no começo de [index.js](index.js), antes dos módulos Firebase. Os wrappers em `common/sentryFunctions.js` capturam erros inesperados das Cloud Functions HTTP, callable e agendadas, inclusive com `firebase-functions` 7.x. Callables também validam o segredo de origem injetado pelo proxy Cloudflare; no Emulator essa validação é liberada para permitir chamadas locais. Cada endpoint HTTP mantém suas próprias verificações de origem, autenticação ou assinatura. Erros internos tratados pelo endpoint MCP também são enviados quando resultam em resposta 5xx. Falhas de validação/permissão não são reportadas como erros de aplicação.

Configure o DSN do projeto Sentry de backend como secret de Actions `DEV_FUNCTIONS_SENTRY_DSN` e `PROD_FUNCTIONS_SENTRY_DSN`. O deploy manual também aceita `DEV_SENTRY_DSN`/`PROD_SENTRY_DSN` e, por compatibilidade, os DSNs já usados pelo frontend. Localmente, defina `SENTRY_DSN` em `functions/.env.luisices-dev` ou `functions/.env.papelaria-dashboard`; esses arquivos não devem ser versionados. Sem DSN, a captura fica desativada.

O backend envia eventos sem dados pessoais padrão; remove conteúdo de requisição e identidade do usuário, oculta credenciais e sanitiza e-mail, telefone e CPF em mensagens e breadcrumbs. O tracing usa amostragem padrão de 5%, ajustável por `SENTRY_TRACES_SAMPLE_RATE` entre `0` e `1`.

O workflow [DEV](../.github/workflows/deploy-dev.yml) seleciona os componentes a publicar. Há [workflow manual de Functions](../.github/workflows/deploy-functions-manual.yml). Para operação manual, selecione explicitamente o projeto e o conjunto de funções após revisão; não use comandos genéricos supondo o ambiente ativo.

O seletor de dependências inclui todos os endpoints exportados pelo módulo de pedidos, inclusive `createOrder` e `updateComplexOrder`. Para essa entrega, publique backend compatível antes do frontend. O workflow de Functions também tem gatilho automático na `main` para mudanças no backend/configuração Firebase. Esta documentação descreve o código; o sucesso remoto deve ser confirmado no run do ambiente.

Alterar documentação não exige deploy. `[skip tests]` não impede publicação; para commits exclusivamente documentais sem execução dos workflows de push, use `[skip ci]`. Análises gerenciadas pelo GitHub podem continuar.

## Deploy seletivo em DEV

O workflow `deploy-dev.yml` usa `scripts/select-functions-deploy.mjs` para comparar o código atual com o SHA do último job de Functions publicado com sucesso. Uma tentativa com falha não se torna referência; uma publicação do backend com frontend posterior com falha continua sendo referência válida. Runs que só executaram testes ou purgaram cache não são referências de backend.

- Alteração em um módulo publica todos os seus endpoints exportados; não há análise do corpo individual de cada handler.
- Helpers locais são percorridos transitivamente. Alterar uma dependência compartilhada publica todos os consumidores.
- Alterações no entrypoint, bootstrap, dependências npm, configuração de Functions ou sincronização de secrets podem selecionar todo o backend. Um arquivo de runtime não reconhecido no grafo também seleciona tudo, por segurança.
- Documentação e configurações exclusivas do Hosting não selecionam Functions. A análise é estática: não executa o backend nem lê credenciais.
- Sem publicação de referência entre os últimos 90 runs completos, seleciona todo o backend atual. Falha de acesso à API de histórico interrompe o job, sem assumir uma referência incorreta.
- Imports dinâmicos e dependências locais não resolvidas interrompem a seleção e exigem revisão do seletor. São suportados o formato anterior (objeto com aliases e atribuições nomeadas) e o atual, com registros `expose('nome', () => require('./dominio').nome)` de caminhos literais. Getters preservam os triggers e a descoberta no deploy; não introduza formatos novos sem atualizar o seletor e seus testes.
- O deploy usa nomes explícitos, em grupos de até seis, e repete somente o grupo que falhou. Não tenta primeiro `--only functions` nem amplia os alvos após uma falha. Uma Function removida do código é reportada, sem exclusão remota automática.
- `[deploy all]`, `[only functions]` ou execução manual com alvo `auto`, `all` ou `functions-only` forçam a publicação de todos os exports atuais. Use quando mudar secrets/configuração externa sem alteração de código.

O plano (SHA e nomes, sem secrets) aparece no log de detecção. Os testes do seletor rodam com `node --test tests/scripts/functions-deploy-selection.test.mjs`, sem instalação de dependências. Essa seleção é específica de DEV; o workflow de produção/manual mantém sua política atual. O tempo de Cloud Build de cada Function selecionada continua existindo.

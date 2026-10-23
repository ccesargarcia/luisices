# Backend Firebase — Luisices

Revisado em **22/10/2026**, branch `develop`. Runtime **Node.js 22**. O entrypoint público é [index.js](index.js); funções internas só ficam disponíveis remotamente quando exportadas e publicadas.

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
| E-mail | `sendCustomEmail`, `getEmailUsage`, `resendReceivingWebhook`, `cleanupEmailDrafts` |
| WhatsApp | `sendWhatsAppDirectMessage`, `deleteWhatsAppMessage`, `syncWhatsAppChatMessages`, `getWhatsAppInstanceStatus`, `markWhatsAppChatRead`, `ensureWhatsAppConversation`, `evolutionWhatsAppWebhook` |
| Loja/pedidos | `submitPublicCatalogOrder`, `getPublicCatalogProducts`, `syncAllOrdersToAiView` |
| Acompanhamento público | `createOrderTrackingLink`, `listOrderTrackingLinks`, `revokeOrderTrackingLink`, `revokeOrderTrackingLinkById`, `deleteOrderTrackingLink`, `deleteOrderTrackingLinksBatch`, `getPublicOrderTracking` |
| IA | `aiAgentChat`, `getAiUsage`, `enrichGalleryItemWithAi`, `enrichStoreProductWithAi` |
| Alexa | `alexaWebhook`, `approveAlexaPairing`, `setAlexaPermission`, `revokeAlexaBinding`, `toggleGlobalAlexaIntegration`, `getAlexaIntegrationStatus`, `approveAlexaDraft`, `cancelAlexaDraft` |
| MCP/ChatGPT | `getMcpSettingsStatus`, `createMcpApiKey`, `updateMcpApiKeyScopes`, `toggleMcpApiKey`, `revokeMcpApiKey`, `toggleGlobalMcp`, `setUserMcpEligibility`, `revokeMcpSession`, `getMcpAuditLogs`, `getMcpOpenApiSchema`, `chatGptToolsEndpoint` |
| Mídia | `galleryMedia` |

`calculateSuperfreteShipping` e `createSuperfreteLabel` são exportadas apenas no projeto `luisices-dev` e no emulador; não fazem parte do deploy de produção.

`syncAllOrdersToAiView` é compatibilidade legada sem sincronização de dados. `cleanupEmailDrafts` é agendada. Webhooks têm validações próprias; não são chamadas de interface equivalentes aos callables autenticados.

## Contratos relevantes

- Administração de contas passa pelo módulo `users`, com autorização, sincronização e tratamento de estado pendente.
- `revokeDeviceSession` solicita desconexão cooperativa; `revokeAllSessions` trata revogação global.
- `sendCustomEmail` admite administrador ou permissão de envio correspondente. O fluxo com chave de idempotência usa reserva local, chave do provedor e recuperação documentada.
- O WhatsApp valida proprietário e conversa; veja a limitação atual para telefone compartilhado entre parceiros.
- `getPublicCatalogProducts` publica somente os campos do catálogo necessários à vitrine e exclui produtos ocultos. A coleção interna `storeProducts` requer usuário autorizado do painel.
- `submitPublicCatalogOrder` recebe encomendas da vitrine, valida disponibilidade, preço oficial e pedido mínimo no servidor. Cloudflare aplica rate limit aos endpoints públicos de leitura e checkout.
- O Copiloto consulta dados e prepara rascunhos; o envio de WhatsApp pela UI é uma operação posterior, separada.
- A análise de uma arte da galeria pode persistir seu enriquecimento. Não confundir esse endpoint visual com as ferramentas de consulta do chat.
- `getAiUsage` é destinado à administração. Limites e referências de custo estão em `ai/config.js`.
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

Alterar documentação não exige deploy. `[skip tests]` não impede publicação; para commits exclusivamente documentais sem execução dos workflows de push, use `[skip ci]`. Análises gerenciadas pelo GitHub podem continuar.

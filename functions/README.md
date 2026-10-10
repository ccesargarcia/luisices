# Backend Firebase — Luisices

Revisado em **10/10/2026**, base `develop` / `b2b6ef9`. Runtime **Node.js 22**. O entrypoint público é [index.js](index.js); funções internas só ficam disponíveis remotamente quando exportadas e publicadas.

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
| Loja/pedidos | `submitPublicCatalogOrder`, `syncAllOrdersToAiView` |
| IA | `aiAgentChat`, `getAiUsage`, `enrichGalleryItemWithAi`, `enrichStoreProductWithAi` |
| Alexa | `alexaWebhook`, `approveAlexaPairing`, `setAlexaPermission`, `revokeAlexaBinding`, `toggleGlobalAlexaIntegration`, `getAlexaIntegrationStatus`, `approveAlexaDraft`, `cancelAlexaDraft` |

`syncAllOrdersToAiView` é compatibilidade legada sem sincronização de dados. `cleanupEmailDrafts` é agendada. Webhooks têm validações próprias; não são chamadas de interface equivalentes aos callables autenticados.

## Contratos relevantes

- Administração de contas passa pelo módulo `users`, com autorização, sincronização e tratamento de estado pendente.
- `revokeDeviceSession` solicita desconexão cooperativa; `revokeAllSessions` trata revogação global.
- `sendCustomEmail` admite administrador ou permissão de envio correspondente. O fluxo com chave de idempotência usa reserva local, chave do provedor e recuperação documentada.
- O WhatsApp valida proprietário e conversa; veja a limitação atual para telefone compartilhado entre parceiros.
- `submitPublicCatalogOrder` recebe encomendas da vitrine e valida dados no servidor.
- O Copiloto consulta dados e prepara rascunhos; o envio de WhatsApp pela UI é uma operação posterior, separada.
- A análise de uma arte da galeria pode persistir seu enriquecimento. Não confundir esse endpoint visual com as ferramentas de consulta do chat.
- `getAiUsage` é destinado à administração. Limites e referências de custo estão em `ai/config.js`.
- Alexa possui diálogo, identidade, rascunhos e confirmação independentes do Copiloto.

Detalhes: [e-mail](../docs/RECUPERACAO_ENVIO_EMAIL.md), [sessões](../docs/SEGURANCA_DESCONEXAO_DISPOSITIVOS.md), [WhatsApp](../docs/ISOLAMENTO_WHATSAPP_PARCEIROS.md), [Copiloto](../docs/COPILOTO_IA.md).

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

## Configuração e publicação

Os nomes de parâmetros/segredos estão em [common/secrets.js](common/secrets.js) e nos módulos das integrações. Forneça valores pelo mecanismo de secrets do ambiente. Não publique valores, arquivos de service account ou identificadores de instâncias operacionais em exemplos.

O workflow [DEV](../.github/workflows/deploy-dev.yml) seleciona os componentes a publicar. Há [workflow manual de Functions](../.github/workflows/deploy-functions-manual.yml). Para operação manual, selecione explicitamente o projeto e o conjunto de funções após revisão; não use comandos genéricos supondo o ambiente ativo.

Alterar documentação não exige deploy. `[skip tests]` não impede publicação; para commits exclusivamente documentais sem execução dos workflows de push, use `[skip ci]`. Análises gerenciadas pelo GitHub podem continuar.

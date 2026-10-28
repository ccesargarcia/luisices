/**
 * Ponto de entrada das Cloud Functions (CommonJS).
 * O Functions Framework acessa somente o export do endpoint solicitado.
 * Getters enumeráveis preservam a descoberta completa do Firebase CLI, mas
 * evitam carregar Alexa, IA, e-mail etc. ao iniciar uma Function de pedidos.
 * Não substituir por um spread/Object.assign: isso executaria todos os getters.
 */
// Instrumentação precisa preceder os SDKs e as declarações dos triggers.
require('./common/sentry');

const { initializeApp } = require('firebase-admin/app');
const { initializeFirestore } = require('firebase-admin/firestore');

// Uma instância por processo, antes de qualquer domínio chamar getFirestore().
// REST adia a carga do gRPC; transações continuam gerenciadas pelo Admin SDK.
// onSnapshot, se introduzido no backend, faz o SDK recorrer ao gRPC.
// O REST do SDK atual busca ADC mesmo no emulador; gRPC permite testes locais
// sem credenciais reais. Na nuvem, mantém ADC da service account do runtime.
initializeFirestore(initializeApp(), { preferRest: !process.env.FIRESTORE_EMULATOR_HOST });

function expose(name, load) {
  Object.defineProperty(module.exports, name, { enumerable: true, get: load });
}

// Requires literais: também analisados por scripts/select-functions-deploy.mjs.
// O cache do CommonJS reutiliza o domínio e o mesmo handler nas próximas chamadas.
// ─── Gestão de Usuários e Convites ─────────────────────────────────────────
expose('sendAdminPasswordReset', () => require('./users').sendAdminPasswordReset);
expose('createUserInvitation', () => require('./users').createUserInvitation);
expose('validateUserInvitation', () => require('./users').validateUserInvitation);
expose('completeUserInvitation', () => require('./users').completeUserInvitation);
expose('sendVerificationEmail', () => require('./users').sendVerificationEmail);
expose('sendPasswordResetEmail', () => require('./users').sendPasswordResetEmail);
expose('getUserAccountMetadata', () => require('./users').getUserAccountMetadata);
expose('recordUserPasswordChange', () => require('./users').recordUserPasswordChange);
expose('deleteUser', () => require('./users').deleteUser);
expose('createUser', () => require('./users').createUser);
expose('updateUser', () => require('./users').updateUser);
expose('registerDeviceSession', () => require('./users').registerDeviceSession);
expose('revokeAllSessions', () => require('./users').revokeAllSessions);
expose('revokeDeviceSession', () => require('./users').revokeDeviceSession);
expose('repairUserClaims', () => require('./users').repairUserClaims);

// ─── E-mail (Resend API e Webhooks) ────────────────────────────────────────
expose('sendCustomEmail', () => require('./email').sendCustomEmail);
expose('getEmailUsage', () => require('./email').getEmailUsage);
expose('resendReceivingWebhook', () => require('./email').resendReceivingWebhook);
expose('cleanupEmailDrafts', () => require('./email').cleanupEmailDrafts);

// ─── WhatsApp (Evolution API e Webhooks) ───────────────────────────────────
expose('sendWhatsAppDirectMessage', () => require('./whatsapp').sendWhatsAppDirectMessage);
expose('deleteWhatsAppMessage', () => require('./whatsapp').deleteWhatsAppMessage);
expose('syncWhatsAppChatMessages', () => require('./whatsapp').syncWhatsAppChatMessages);
expose('getWhatsAppInstanceStatus', () => require('./whatsapp').getWhatsAppInstanceStatus);
expose('markWhatsAppChatRead', () => require('./whatsapp').markWhatsAppChatRead);
expose('ensureWhatsAppConversation', () => require('./whatsapp').ensureWhatsAppConversation);
expose('evolutionWhatsAppWebhook', () => require('./whatsapp').evolutionWhatsAppWebhook);

// ─── Pedidos e Vitrine Pública ─────────────────────────────────────────────
expose('submitPublicCatalogOrder', () => require('./orders').submitPublicCatalogOrder);
expose('updateComplexOrder', () => require('./orders').updateComplexOrder);
expose('createOrder', () => require('./orders').createOrder);
expose('getPublicCatalogProducts', () => require('./orders').getPublicCatalogProducts);
expose('createOrderTrackingLink', () => require('./orders').createOrderTrackingLink);
expose('listOrderTrackingLinks', () => require('./orders').listOrderTrackingLinks);
expose('revokeOrderTrackingLink', () => require('./orders').revokeOrderTrackingLink);
expose('revokeOrderTrackingLinkById', () => require('./orders').revokeOrderTrackingLinkById);
expose('deleteOrderTrackingLink', () => require('./orders').deleteOrderTrackingLink);
expose('deleteOrderTrackingLinksBatch', () => require('./orders').deleteOrderTrackingLinksBatch);
expose('getPublicOrderTracking', () => require('./orders').getPublicOrderTracking);

// ─── Inteligência Artificial (Google Gemini) ────────────────────────────────
expose('aiAgentChat', () => require('./ai/callables').aiAgentChat);
expose('getAiUsage', () => require('./ai/usageCallable').getAiUsage);
expose('enrichGalleryItemWithAi', () => require('./ai/enrichmentCallables').enrichGalleryItemWithAi);
expose('enrichStoreProductWithAi', () => require('./ai/enrichmentCallables').enrichStoreProductWithAi);

// ─── Integração Alexa (Voice Order Creation) ───────────────────────────────
expose('alexaWebhook', () => require('./alexa').alexaWebhook);
expose('approveAlexaPairing', () => require('./alexa').approveAlexaPairing);
expose('setAlexaPermission', () => require('./alexa').setAlexaPermission);
expose('revokeAlexaBinding', () => require('./alexa').revokeAlexaBinding);
expose('toggleGlobalAlexaIntegration', () => require('./alexa').toggleGlobalAlexaIntegration);
expose('getAlexaIntegrationStatus', () => require('./alexa').getAlexaIntegrationStatus);
expose('approveAlexaDraft', () => require('./alexa').approveAlexaDraft);
expose('cancelAlexaDraft', () => require('./alexa').cancelAlexaDraft);

// ─── Integração MCP & ChatGPT Actions ─────────────────────────────────────
expose('getMcpSettingsStatus', () => require('./mcp/callables').getMcpSettingsStatus);
expose('createMcpApiKey', () => require('./mcp/callables').createMcpApiKey);
expose('updateMcpApiKeyScopes', () => require('./mcp/callables').updateMcpApiKeyScopes);
expose('toggleMcpApiKey', () => require('./mcp/callables').toggleMcpApiKey);
expose('revokeMcpApiKey', () => require('./mcp/callables').revokeMcpApiKey);
expose('toggleGlobalMcp', () => require('./mcp/callables').toggleGlobalMcp);
expose('setUserMcpEligibility', () => require('./mcp/callables').setUserMcpEligibility);
expose('revokeMcpSession', () => require('./mcp/callables').revokeMcpSession);
expose('getMcpAuditLogs', () => require('./mcp/callables').getMcpAuditLogs);
expose('getMcpOpenApiSchema', () => require('./mcp/callables').getMcpOpenApiSchema);
expose('chatGptToolsEndpoint', () => require('./mcp/endpoint').chatGptToolsEndpoint);
expose('galleryMedia', () => require('./media/gallery').galleryMedia);

// Preserve a mesma fronteira: SuperFrete sandbox não é publicado em produção.
if (process.env.GCLOUD_PROJECT === 'luisices-dev' || process.env.FUNCTIONS_EMULATOR === 'true') {
  expose('calculateSuperfreteShipping', () => require('./orders/superfrete').calculateSuperfreteShipping);
  expose('createSuperfreteLabel', () => require('./orders/superfrete').createSuperfreteLabel);
}

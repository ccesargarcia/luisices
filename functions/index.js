/**
 * Ponto de Entrada Principal das Cloud Functions para Firebase (v2).
 * Arquitetura Modularizada por Domínio de Negócio - Luisices.
 */
// Inicialize antes de importar Firebase Functions para instrumentar triggers.
require('./common/sentry');

const { initializeApp } = require('firebase-admin/app');

// Inicialização do Firebase Admin SDK no escopo global
initializeApp();

// Importação dos módulos de domínio
const userFunctions = require('./users');
const emailFunctions = require('./email');
const whatsappFunctions = require('./whatsapp');
const orderFunctions = require('./orders');
const aiFunctions = require('./ai/callables');
const alexaFunctions = require('./alexa');
const mcpFunctions = require('./mcp');
const mediaFunctions = require('./media/gallery');

module.exports = {
  // ─── Gestão de Usuários e Convites ─────────────────────────────────────────
  sendAdminPasswordReset: userFunctions.sendAdminPasswordReset,
  createUserInvitation: userFunctions.createUserInvitation,
  validateUserInvitation: userFunctions.validateUserInvitation,
  completeUserInvitation: userFunctions.completeUserInvitation,
  sendVerificationEmail: userFunctions.sendVerificationEmail,
  sendPasswordResetEmail: userFunctions.sendPasswordResetEmail,
  getUserAccountMetadata: userFunctions.getUserAccountMetadata,
  recordUserPasswordChange: userFunctions.recordUserPasswordChange,
  deleteUser: userFunctions.deleteUser,
  createUser: userFunctions.createUser,
  updateUser: userFunctions.updateUser,
  registerDeviceSession: userFunctions.registerDeviceSession,
  revokeAllSessions: userFunctions.revokeAllSessions,
  revokeDeviceSession: userFunctions.revokeDeviceSession,
  repairUserClaims: userFunctions.repairUserClaims,

  // ─── E-mail (Resend API e Webhooks) ────────────────────────────────────────
  sendCustomEmail: emailFunctions.sendCustomEmail,
  getEmailUsage: emailFunctions.getEmailUsage,
  resendReceivingWebhook: emailFunctions.resendReceivingWebhook,
  cleanupEmailDrafts: emailFunctions.cleanupEmailDrafts,

  // ─── WhatsApp (Evolution API e Webhooks) ───────────────────────────────────
  sendWhatsAppDirectMessage: whatsappFunctions.sendWhatsAppDirectMessage,
  deleteWhatsAppMessage: whatsappFunctions.deleteWhatsAppMessage,
  syncWhatsAppChatMessages: whatsappFunctions.syncWhatsAppChatMessages,
  getWhatsAppInstanceStatus: whatsappFunctions.getWhatsAppInstanceStatus,
  markWhatsAppChatRead: whatsappFunctions.markWhatsAppChatRead,
  ensureWhatsAppConversation: whatsappFunctions.ensureWhatsAppConversation,
  evolutionWhatsAppWebhook: whatsappFunctions.evolutionWhatsAppWebhook,

  // ─── Pedidos e Vitrine Pública ─────────────────────────────────────────────
  submitPublicCatalogOrder: orderFunctions.submitPublicCatalogOrder,
  updateComplexOrder: orderFunctions.updateComplexOrder,
  createOrder: orderFunctions.createOrder,
  getPublicCatalogProducts: orderFunctions.getPublicCatalogProducts,
  createOrderTrackingLink: orderFunctions.createOrderTrackingLink,
  listOrderTrackingLinks: orderFunctions.listOrderTrackingLinks,
  revokeOrderTrackingLink: orderFunctions.revokeOrderTrackingLink,
  revokeOrderTrackingLinkById: orderFunctions.revokeOrderTrackingLinkById,
  deleteOrderTrackingLink: orderFunctions.deleteOrderTrackingLink,
  deleteOrderTrackingLinksBatch: orderFunctions.deleteOrderTrackingLinksBatch,
  getPublicOrderTracking: orderFunctions.getPublicOrderTracking,

  // ─── Inteligência Artificial (Google Gemini) ────────────────────────────────
  aiAgentChat: aiFunctions.aiAgentChat,
  getAiUsage: aiFunctions.getAiUsage,
  enrichGalleryItemWithAi: aiFunctions.enrichGalleryItemWithAi,
  enrichStoreProductWithAi: aiFunctions.enrichStoreProductWithAi,

  // ─── Integração Alexa (Voice Order Creation) ───────────────────────────────
  alexaWebhook: alexaFunctions.alexaWebhook,
  approveAlexaPairing: alexaFunctions.approveAlexaPairing,
  setAlexaPermission: alexaFunctions.setAlexaPermission,
  revokeAlexaBinding: alexaFunctions.revokeAlexaBinding,
  toggleGlobalAlexaIntegration: alexaFunctions.toggleGlobalAlexaIntegration,
  getAlexaIntegrationStatus: alexaFunctions.getAlexaIntegrationStatus,
  approveAlexaDraft: alexaFunctions.approveAlexaDraft,
  cancelAlexaDraft: alexaFunctions.cancelAlexaDraft,

  // ─── Integração MCP & ChatGPT Actions ─────────────────────────────────────
  getMcpSettingsStatus: mcpFunctions.getMcpSettingsStatus,
  createMcpApiKey: mcpFunctions.createMcpApiKey,
  updateMcpApiKeyScopes: mcpFunctions.updateMcpApiKeyScopes,
  toggleMcpApiKey: mcpFunctions.toggleMcpApiKey,
  revokeMcpApiKey: mcpFunctions.revokeMcpApiKey,
  toggleGlobalMcp: mcpFunctions.toggleGlobalMcp,
  setUserMcpEligibility: mcpFunctions.setUserMcpEligibility,
  revokeMcpSession: mcpFunctions.revokeMcpSession,
  getMcpAuditLogs: mcpFunctions.getMcpAuditLogs,
  getMcpOpenApiSchema: mcpFunctions.getMcpOpenApiSchema,
  chatGptToolsEndpoint: mcpFunctions.chatGptToolsEndpoint,
  galleryMedia: mediaFunctions.galleryMedia,
};

// Keep sandbox-only SuperFrete endpoints out of production deployments.
// Firebase CLI sets GCLOUD_PROJECT during function discovery/deployment.
if (process.env.GCLOUD_PROJECT === 'luisices-dev' || process.env.FUNCTIONS_EMULATOR === 'true') {
  module.exports.calculateSuperfreteShipping = orderFunctions.calculateSuperfreteShipping;
  module.exports.createSuperfreteLabel = orderFunctions.createSuperfreteLabel;
}


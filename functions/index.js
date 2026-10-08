/**
 * Ponto de Entrada Principal das Cloud Functions para Firebase (v2).
 * Arquitetura Modularizada por Domínio de Negócio - Luisices.
 */

const admin = require('firebase-admin');

// Inicialização do Firebase Admin SDK no escopo global
admin.initializeApp();

// Importação dos módulos de domínio
const userFunctions = require('./users');
const emailFunctions = require('./email');
const whatsappFunctions = require('./whatsapp');
const orderFunctions = require('./orders');
const aiFunctions = require('./ai/callables');
const alexaFunctions = require('./alexa');

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
  revokeDeviceSession: userFunctions.revokeAllSessions, // Alias de compatibilidade com mesma política global

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
  syncAllOrdersToAiView: orderFunctions.syncAllOrdersToAiView,
  submitPublicCatalogOrder: orderFunctions.submitPublicCatalogOrder,

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
};

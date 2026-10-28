const moduleInitializationStartedAt = process.hrtime.bigint();

const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');
const { withFirstInvocationSpan } = require('../common/sentry');
const { onCall: onCallWithTelemetry } = require('../common/sentryFunctions');
const { normalizeWhatsAppNumber, assertActiveSession } = require('../common/helpers');
const { isAuthorizedForWhatsApp } = require('./authorization');
const { authorizeChat } = require('./chatScope');
const { markWhatsAppChatReadCore, ensureWhatsAppConversationCore } = require('./conversationCore');

let moduleInitializationMs = null;
const chatScope = (request, phone, options = {}) => authorizeChat(request, phone, {
  db: getFirestore(), assertActiveSession, ...options,
});

const withWhatsAppAuthorization = (name, core) => onCallWithTelemetry(withFirstInvocationSpan(name, async (request) => {
  if (!(await isAuthorizedForWhatsApp(request))) {
    throw new HttpsError('permission-denied', 'Sem permissão para utilizar o módulo de Atendimento (WhatsApp).');
  }
  return core({
    request,
    db: getFirestore(),
    chatScope,
    normalizePhone: normalizeWhatsAppNumber,
    serverTimestamp: FieldValue.serverTimestamp,
  });
}, () => moduleInitializationMs));

const markWhatsAppChatRead = withWhatsAppAuthorization('markWhatsAppChatRead', markWhatsAppChatReadCore);
const ensureWhatsAppConversation = withWhatsAppAuthorization('ensureWhatsAppConversation', ensureWhatsAppConversationCore);

moduleInitializationMs = Number((Number(process.hrtime.bigint() - moduleInitializationStartedAt) / 1e6).toFixed(2));

module.exports = { markWhatsAppChatRead, ensureWhatsAppConversation };

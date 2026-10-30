const moduleInitializationStartedAt = process.hrtime.bigint();

const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');
const { onCall } = require('../common/sentryFunctions');
const { EVOLUTION_API_KEY } = require('../common/secrets');
const {
  EVOLUTION_API_URL,
  EVOLUTION_INSTANCE,
  normalizeWhatsAppNumber,
  assertActiveSession,
} = require('../common/helpers');
const { withFirstInvocationSpan } = require('../common/sentry');
const { authorizeChat } = require('./chatScope');
const { isAuthorizedForWhatsApp } = require('./authorization');
const { syncWhatsAppChatMessagesCore } = require('./syncCore');

let moduleInitializationMs = null;
const chatScope = (request, phone, options = {}) => authorizeChat(request, phone, {
  db: getFirestore(), assertActiveSession, ...options,
});

const syncWhatsAppChatMessages = onCall(
  { maxInstances: 5, secrets: [EVOLUTION_API_KEY] },
  withFirstInvocationSpan('syncWhatsAppChatMessages', async (request) => {
    if (!(await isAuthorizedForWhatsApp(request))) {
      throw new HttpsError('permission-denied', 'Sem permissão para utilizar o módulo de Atendimento (WhatsApp).');
    }

    const apiKey = (typeof EVOLUTION_API_KEY.value === 'function' ? EVOLUTION_API_KEY.value() : process.env.EVOLUTION_API_KEY) || '';
    return syncWhatsAppChatMessagesCore({
      request,
      db: getFirestore(),
      chatScope,
      normalizePhone: normalizeWhatsAppNumber,
      apiKey,
      apiUrl: EVOLUTION_API_URL,
      instance: EVOLUTION_INSTANCE,
      serverTimestamp: FieldValue.serverTimestamp,
    });
  }, () => moduleInitializationMs)
);

moduleInitializationMs = Number((Number(process.hrtime.bigint() - moduleInitializationStartedAt) / 1e6).toFixed(2));

module.exports = { syncWhatsAppChatMessages };

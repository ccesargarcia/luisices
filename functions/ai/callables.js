const moduleInitializationStartedAt = process.hrtime.bigint();

/**
 * Endpoints Callables de IA (Cloud Functions v2) para o Copiloto e Enriquecimento Visual.
 */

const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');
const { onCall } = require('../common/sentryFunctions');
const { GEMINI_API_KEY } = require('../common/secrets');
const { assertActiveSession } = require('../common/helpers');
const { createAiServices } = require('./index');
const { mapToHttpsError } = require('./httpsError');
const { withFirstInvocationSpan } = require('../common/sentry');

let moduleInitializationMs = null;

/**
 * Endpoint Callable Seguro do Copiloto de IA Interno (Luisices)
 */
const aiAgentChat = onCall(
  { cors: true, timeoutSeconds: 120, memory: '1GiB', maxInstances: 10, secrets: [GEMINI_API_KEY] },
  withFirstInvocationSpan('aiAgentChat', async (request) => {
    const rawKey =
      (typeof GEMINI_API_KEY?.value === 'function' ? GEMINI_API_KEY.value() : process.env.GEMINI_API_KEY) || '';
    const aiServices = createAiServices({ firestore: getFirestore, auth: getAuth, storage: getStorage }, rawKey);
    try {
      const { profile } = await assertActiveSession(request);
      request.authProfile = profile;
      return await aiServices.handlers.aiAgentChat(request);
    } catch (err) {
      throw mapToHttpsError(err);
    }
  }, () => moduleInitializationMs)
);

/**
 * Enriquecimento de itens da galeria com IA Vision
 */
const enrichGalleryItemWithAi = onCall(
  { cors: true, timeoutSeconds: 120, memory: '1GiB', maxInstances: 5, secrets: [GEMINI_API_KEY] },
  withFirstInvocationSpan('enrichGalleryItemWithAi', async (request) => {
    const rawKey =
      (typeof GEMINI_API_KEY?.value === 'function' ? GEMINI_API_KEY.value() : process.env.GEMINI_API_KEY) || '';
    const aiServices = createAiServices({ firestore: getFirestore, auth: getAuth, storage: getStorage }, rawKey);
    try {
      const { profile } = await assertActiveSession(request);
      request.authProfile = profile;
      return await aiServices.handlers.enrichGalleryItemWithAi(request);
    } catch (err) {
      throw mapToHttpsError(err);
    }
  }, () => moduleInitializationMs)
);

/**
 * Enriquecimento de produtos da lojinha com IA Vision
 */
const enrichStoreProductWithAi = onCall(
  { cors: true, timeoutSeconds: 120, memory: '1GiB', maxInstances: 5, secrets: [GEMINI_API_KEY] },
  withFirstInvocationSpan('enrichStoreProductWithAi', async (request) => {
    const rawKey =
      (typeof GEMINI_API_KEY?.value === 'function' ? GEMINI_API_KEY.value() : process.env.GEMINI_API_KEY) || '';
    const aiServices = createAiServices({ firestore: getFirestore, auth: getAuth, storage: getStorage }, rawKey);
    try {
      const { profile } = await assertActiveSession(request);
      request.authProfile = profile;
      return await aiServices.handlers.enrichStoreProductWithAi(request);
    } catch (err) {
      throw mapToHttpsError(err);
    }
  }, () => moduleInitializationMs)
);

moduleInitializationMs = Number((Number(process.hrtime.bigint() - moduleInitializationStartedAt) / 1e6).toFixed(2));

module.exports = {
  aiAgentChat,
  enrichGalleryItemWithAi,
  enrichStoreProductWithAi,
};

/**
 * Endpoints Callables de IA (Cloud Functions v2) para o Copiloto e Enriquecimento Visual.
 */

const functions = require('firebase-functions');
const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { GEMINI_API_KEY } = require('../common/secrets');
const { createAiServices } = require('./index');

const mapToHttpsError = (err) => {
  if (err && err.code && typeof err.code === 'string' && err.message) {
    const codeMap = {
      unauthenticated: 'unauthenticated',
      'permission-denied': 'permission-denied',
      'invalid-argument': 'invalid-argument',
      'resource-exhausted': 'resource-exhausted',
      'not-found': 'not-found',
      'failed-precondition': 'failed-precondition',
      'deadline-exceeded': 'deadline-exceeded',
    };
    const httpsCode = codeMap[err.code] || 'internal';
    return new functions.https.HttpsError(httpsCode, err.message);
  }
  return new functions.https.HttpsError('internal', err?.message || 'Erro ao processar requisição de IA.');
};

/**
 * Endpoint Callable Seguro do Copiloto de IA Interno (Luisices)
 */
const aiAgentChat = onCall(
  { cors: true, timeoutSeconds: 120, memory: '1GiB', maxInstances: 10, secrets: [GEMINI_API_KEY] },
  async (request) => {
    const rawKey =
      (typeof GEMINI_API_KEY?.value === 'function' ? GEMINI_API_KEY.value() : process.env.GEMINI_API_KEY) || '';
    const aiServices = createAiServices(admin, rawKey);
    try {
      return await aiServices.handlers.aiAgentChat(request);
    } catch (err) {
      throw mapToHttpsError(err);
    }
  }
);

/**
 * Consulta a cota e o consumo do subsistema de IA
 */
const getAiUsage = onCall(
  { cors: true, maxInstances: 5, secrets: [GEMINI_API_KEY] },
  async (request) => {
    const rawKey =
      (typeof GEMINI_API_KEY?.value === 'function' ? GEMINI_API_KEY.value() : process.env.GEMINI_API_KEY) || '';
    const aiServices = createAiServices(admin, rawKey);
    try {
      return await aiServices.handlers.getAiUsage(request);
    } catch (err) {
      throw mapToHttpsError(err);
    }
  }
);

/**
 * Enriquecimento de itens da galeria com IA Vision
 */
const enrichGalleryItemWithAi = onCall(
  { cors: true, timeoutSeconds: 120, memory: '1GiB', maxInstances: 5, secrets: [GEMINI_API_KEY] },
  async (request) => {
    const rawKey =
      (typeof GEMINI_API_KEY?.value === 'function' ? GEMINI_API_KEY.value() : process.env.GEMINI_API_KEY) || '';
    const aiServices = createAiServices(admin, rawKey);
    try {
      return await aiServices.handlers.enrichGalleryItemWithAi(request);
    } catch (err) {
      throw mapToHttpsError(err);
    }
  }
);

/**
 * Enriquecimento de produtos da lojinha com IA Vision
 */
const enrichStoreProductWithAi = onCall(
  { cors: true, timeoutSeconds: 120, memory: '1GiB', maxInstances: 5, secrets: [GEMINI_API_KEY] },
  async (request) => {
    const rawKey =
      (typeof GEMINI_API_KEY?.value === 'function' ? GEMINI_API_KEY.value() : process.env.GEMINI_API_KEY) || '';
    const aiServices = createAiServices(admin, rawKey);
    try {
      return await aiServices.handlers.enrichStoreProductWithAi(request);
    } catch (err) {
      throw mapToHttpsError(err);
    }
  }
);

module.exports = {
  aiAgentChat,
  getAiUsage,
  enrichGalleryItemWithAi,
  enrichStoreProductWithAi,
};

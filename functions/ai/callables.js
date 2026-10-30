const moduleInitializationStartedAt = process.hrtime.bigint();

/**
 * Endpoint Callable do copiloto de IA (Cloud Functions v2).
 */

const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
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
    const aiServices = createAiServices({ firestore: getFirestore, auth: getAuth }, rawKey);
    try {
      const { profile } = await assertActiveSession(request);
      request.authProfile = profile;
      return await aiServices.handlers.aiAgentChat(request);
    } catch (err) {
      throw mapToHttpsError(err);
    }
  }, () => moduleInitializationMs)
);

moduleInitializationMs = Number((Number(process.hrtime.bigint() - moduleInitializationStartedAt) / 1e6).toFixed(2));

module.exports = { aiAgentChat };

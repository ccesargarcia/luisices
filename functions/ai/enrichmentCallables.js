const moduleInitializationStartedAt = process.hrtime.bigint();

const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { onCall } = require('../common/sentryFunctions');
const { GEMINI_API_KEY } = require('../common/secrets');
const { assertActiveSession } = require('../common/helpers');
const { createAiEnrichmentServices } = require('./enrichmentServices');
const { mapToHttpsError } = require('./httpsError');
const { withFirstInvocationSpan } = require('../common/sentry');

let moduleInitializationMs = null;

function getGeminiApiKey() {
  return (typeof GEMINI_API_KEY?.value === 'function' ? GEMINI_API_KEY.value() : process.env.GEMINI_API_KEY) || '';
}

async function runEnrichment(request, handlerName) {
  const services = createAiEnrichmentServices({
    firestore: getFirestore,
    storage: getStorage,
  }, getGeminiApiKey());
  try {
    const { profile } = await assertActiveSession(request);
    request.authProfile = profile;
    return await services.handlers[handlerName](request);
  } catch (err) {
    throw mapToHttpsError(err);
  }
}

const enrichGalleryItemWithAi = onCall(
  { cors: true, timeoutSeconds: 120, memory: '1GiB', maxInstances: 5, secrets: [GEMINI_API_KEY] },
  withFirstInvocationSpan('enrichGalleryItemWithAi', (request) => (
    runEnrichment(request, 'enrichGalleryItemWithAi')
  ), () => moduleInitializationMs),
);

const enrichStoreProductWithAi = onCall(
  { cors: true, timeoutSeconds: 120, memory: '1GiB', maxInstances: 5, secrets: [GEMINI_API_KEY] },
  withFirstInvocationSpan('enrichStoreProductWithAi', (request) => (
    runEnrichment(request, 'enrichStoreProductWithAi')
  ), () => moduleInitializationMs),
);

moduleInitializationMs = Number((Number(process.hrtime.bigint() - moduleInitializationStartedAt) / 1e6).toFixed(2));

module.exports = { enrichGalleryItemWithAi, enrichStoreProductWithAi };

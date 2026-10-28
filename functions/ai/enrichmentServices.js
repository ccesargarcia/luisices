/** Serviços específicos de geração visual para os enrichments. */

const config = require('./config');
const { AiBudgetManager } = require('./budget');
const { GeminiClient } = require('./geminiClient');
const {
  createEnrichGalleryItemHandler,
  createEnrichStoreProductHandler,
} = require('./handlers');

function createAiEnrichmentServices(adminInstance, apiKey) {
  const db = adminInstance?.firestore ? adminInstance.firestore() : null;
  const storage = adminInstance?.storage ? adminInstance.storage() : null;
  const geminiClient = new GeminiClient({
    apiKey: apiKey || (typeof process.env.GEMINI_API_KEY === 'string' ? process.env.GEMINI_API_KEY : ''),
    primaryModel: config.MODEL_CONFIG.PRIMARY_CHAT_MODEL,
    fallbackModels: config.MODEL_CONFIG.FALLBACK_CHAT_MODELS,
  });
  const budgetManager = new AiBudgetManager(db);

  return {
    handlers: {
      enrichGalleryItemWithAi: createEnrichGalleryItemHandler({
        geminiClient,
        db,
        storage,
        budgetManager,
      }),
      enrichStoreProductWithAi: createEnrichStoreProductHandler({
        geminiClient,
        db,
        budgetManager,
      }),
    },
  };
}

module.exports = { createAiEnrichmentServices };

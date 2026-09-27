/**
 * Ponto de Entrada do Módulo de IA - Luisices
 */

const config = require('./config');
const authorization = require('./authorization');
const pricing = require('./pricing/pricingCalculator');
const cache = require('./cache');
const budget = require('./budget');
const usage = require('./usage');
const schemas = require('./schemas');
const geminiClient = require('./geminiClient');
const repositories = require('./repositories');
const tools = require('./tools');
const handlers = require('./handlers');

/**
 * Fábrica de serviços de IA para ambiente de produção
 */
function createAiServices(adminInstance, apiKey) {
  const db = adminInstance?.firestore ? adminInstance.firestore() : null;
  const auth = adminInstance?.auth ? adminInstance.auth() : null;

  const client = new geminiClient.GeminiClient({
    apiKey: apiKey || (typeof process.env.GEMINI_API_KEY === 'string' ? process.env.GEMINI_API_KEY : ''),
    primaryModel: config.MODEL_CONFIG.PRIMARY_CHAT_MODEL,
    fallbackModel: config.MODEL_CONFIG.FALLBACK_CHAT_MODEL,
  });

  const repos = new repositories.AiDataRepositories(db, auth);
  const toolsExec = new tools.AiToolsExecutor(repos);
  const budgetMgr = new budget.AiBudgetManager(db);

  return {
    config,
    authorization,
    pricing,
    cache: cache.globalAiCache,
    budgetManager: budgetMgr,
    usage,
    schemas,
    geminiClient: client,
    repositories: repos,
    toolsExecutor: toolsExec,
    handlers: {
      aiAgentChat: handlers.createAiAgentChatHandler({
        geminiClient: client,
        repositories: repos,
        toolsExecutor: toolsExec,
        budgetManager: budgetMgr,
        cache: cache.globalAiCache,
        db,
      }),
      getAiUsage: handlers.createGetAiUsageHandler({ db }),
      enrichGalleryItemWithAi: handlers.createEnrichGalleryItemHandler({
        geminiClient: client,
        db,
        budgetManager: budgetMgr,
      }),
      enrichStoreProductWithAi: handlers.createEnrichStoreProductHandler({
        geminiClient: client,
        db,
        budgetManager: budgetMgr,
      }),
      generateStoreCustomizationCopy: handlers.createStoreCustomizationCopyHandler({
        geminiClient: client,
      }),
    },
  };
}

module.exports = {
  config,
  authorization,
  pricing,
  cache,
  budget,
  usage,
  schemas,
  geminiClient,
  repositories,
  tools,
  handlers,
  createAiServices,
};

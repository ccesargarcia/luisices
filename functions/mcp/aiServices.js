/**
 * Serviços determinísticos usados pela execução de ferramentas MCP.
 * Mantém o endpoint MCP independente do cliente Gemini, dos handlers de chat
 * e dos serviços de enriquecimento.
 */

const { AiDataRepositories } = require('../ai/repositories');
const { AiToolsExecutor } = require('../ai/tools');

function createMcpAiServices({ firestore, auth = null } = {}) {
  const repositories = new AiDataRepositories(firestore, auth);
  return {
    repositories,
    toolsExecutor: new AiToolsExecutor(repositories),
  };
}

module.exports = { createMcpAiServices };

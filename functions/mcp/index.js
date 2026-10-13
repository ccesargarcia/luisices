/**
 * Módulo Principal de Integrações MCP / ChatGPT Actions - Luisices.
 */

const callables = require('./callables');
const endpoint = require('./endpoint');

module.exports = {
  // Callables onCall para o Painel Web (Admin)
  getMcpSettingsStatus: callables.getMcpSettingsStatus,
  createMcpApiKey: callables.createMcpApiKey,
  toggleMcpApiKey: callables.toggleMcpApiKey,
  revokeMcpApiKey: callables.revokeMcpApiKey,
  toggleGlobalMcp: callables.toggleGlobalMcp,
  setUserMcpEligibility: callables.setUserMcpEligibility,
  revokeMcpSession: callables.revokeMcpSession,

  // Endpoint HTTP onRequest para ChatGPT e Clientes MCP
  chatGptToolsEndpoint: endpoint.chatGptToolsEndpoint,
};

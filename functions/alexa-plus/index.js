/**
 * Ponto de entrada do subsistema Alexa+ (Add-ons & MCP) para Cloud Functions (v2).
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { handleMcpHttpRequest, processMcpMessage } = require('./mcpHandler');
const { MCP_TOOLS } = require('./tools');
const { ORIGIN_SECRET, validateOriginSecret } = require('../originProtection');

/**
 * Endpoint oficial HTTPS do Servidor MCP para o Alexa+ Add-on.
 */
const alexaPlusMcp = onRequest(
  {
    minInstances: 1,
    maxInstances: 2,
    memory: '512MiB',
    secrets: [ORIGIN_SECRET],
  },
  async (req, res) => {
    // 1. Proteção de origem (Cloudflare / Custom Domain)
    const originCheck = validateOriginSecret(req);
    if (!originCheck.allowed) {
      console.warn('[alexaPlusMcp] Tentativa de acesso direto bloqueada (sem header da Cloudflare)');
      return res.status(originCheck.statusCode || 403).json({ error: originCheck.error });
    }

    // 2. Extrai ou inicializa o Firestore
    let db = null;
    if (admin.apps && admin.apps.length > 0) {
      db = admin.firestore();
    }

    // 3. Processa a requisição MCP
    return await handleMcpHttpRequest(req, res, { db });
  }
);

module.exports = {
  alexaPlusMcp,
  processMcpMessage,
  handleMcpHttpRequest,
  MCP_TOOLS,
};

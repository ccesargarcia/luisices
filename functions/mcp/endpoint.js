/**
 * Endpoint HTTP Oficial (onRequest Cloud Functions v2) para ChatGPT Actions e Clientes MCP.
 * Configurado com minInstances: 0 para custo zero quando inativo.
 */

const { onRequest } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { validateMcpRequest, touchKeyUsage } = require('./auth');
const { TOOL_SCOPE_MAP, MCP_SCOPES } = require('./constants');
const { buildOpenApiSchema } = require('./openapi');
const { createAiServices } = require('../ai/index');

/**
 * Endpoint HTTP de Ferramentas de IA para ChatGPT e MCP.
 */
const chatGptToolsEndpoint = onRequest(
  {
    cors: true,
    minInstances: 0,
    maxInstances: 5,
    memory: '512MiB',
    timeoutSeconds: 30,
  },
  async (req, res) => {
    // Tratamento de preflight CORS
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.status(204).send('');
    }

    const db = getFirestore();
    const rawPath = (req.path || '').replace(/^\/+/, '');
    const protocol = req.protocol || 'https';
    const host = req.get('host') || 'us-central1-luisices-dev.cloudfunctions.net';
    const baseUrl = `${protocol}://${host}${req.baseUrl || ''}`;

    // ─── ROTA 1: Manifesto OpenAPI (/openapi.json ou /schema) ───────────────
    if (req.method === 'GET' && (rawPath === 'openapi.json' || rawPath === 'schema')) {
      // Se a requisição contiver Bearer token, personaliza o schema apenas com as permissões da chave
      let allowedScopes = null;
      if (req.headers.authorization) {
        const authResult = await validateMcpRequest(req, db);
        if (authResult.success) {
          allowedScopes = authResult.keyData.scopes || [];
        }
      }

      const schema = buildOpenApiSchema(baseUrl, allowedScopes);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).json(schema);
    }

    // ─── ROTA 2: Health Check (/ ou /health) ─────────────────────────────────
    if (req.method === 'GET' && (rawPath === '' || rawPath === 'health')) {
      return res.status(200).json({
        status: 'online',
        service: 'Luisices MCP & ChatGPT Tools Endpoint',
        version: '1.0.0',
        environment: process.env.GCLOUD_PROJECT || 'dev',
        schemaUrl: `${baseUrl}/openapi.json`,
      });
    }

    // ─── ROTA 3: Execução de Ferramentas (POST /tools/:toolName) ────────────
    const matchTool = rawPath.match(/^tools\/([a-zA-Z0-9_]+)$/);
    if (req.method === 'POST' && matchTool) {
      const toolName = matchTool[1];

      // 1. Validação de Autenticação, Status Global, Status do Usuário e Rate Limiter
      const authResult = await validateMcpRequest(req, db);
      if (!authResult.success) {
        return res.status(authResult.status).json({
          error: authResult.code,
          message: authResult.message,
        });
      }

      const { keyData, scope, keyHash } = authResult;

      // 2. Validação se a ferramenta existe no catálogo do sistema
      const requiredScope = TOOL_SCOPE_MAP[toolName];
      if (!requiredScope) {
        return res.status(404).json({
          error: 'TOOL_NOT_FOUND',
          message: `Ferramenta '${toolName}' não reconhecida pelo sistema Luisices.`,
        });
      }

      // 3. Validação Granular de Escopo da Chave
      const keyScopes = keyData.scopes || [];
      const hasScope = keyScopes.includes('*') || keyScopes.includes(requiredScope);
      if (!hasScope) {
        const scopeInfo = Object.values(MCP_SCOPES).find((s) => s.id === requiredScope);
        return res.status(403).json({
          error: 'SCOPE_PERMISSION_DENIED',
          message: `Permissão negada: esta chave não possui o escopo '${requiredScope}' (${scopeInfo?.label || 'recurso restrito'}).`,
        });
      }

      // 4. Validação Granular de Restrição por Papel (ex: DRE financeiro apenas para admin)
      const scopeDef = Object.values(MCP_SCOPES).find((s) => s.id === requiredScope);
      if (scopeDef?.requiresAdmin && !scope.isAdmin) {
        return res.status(403).json({
          error: 'ADMIN_REQUIRED',
          message: `Acesso restrito: a ferramenta '${toolName}' exige privilégios de Administrador no Luisices.`,
        });
      }

      // 5. Execução Segura da Ferramenta no Núcleo de IA
      const args = req.body || {};
      const aiServices = createAiServices({ firestore: () => db, auth: () => getAuth() });
      const { toolsExecutor } = aiServices;

      try {
        let result = null;

        switch (toolName) {
          case 'query_orders_view':
            result = await toolsExecutor.executeQueryOrdersView(args, scope);
            break;

          case 'daily_briefing':
            result = await toolsExecutor.executeDailyBriefing(args, scope);
            break;

          case 'query_customers':
            result = await toolsExecutor.executeQueryCustomers(args, scope);
            break;

          case 'get_financial_summary':
            result = await toolsExecutor.executeFinancialSummary(args, scope);
            break;

          case 'calculate_pricing_estimate':
            result = await toolsExecutor.executePricingEstimate(args, scope);
            break;

          case 'generate_whatsapp_message':
            result = await toolsExecutor.executeGenerateWhatsAppMessage(args, scope);
            break;

          case 'extract_order_draft':
            result = await toolsExecutor.executeExtractOrderDraft(args, scope);
            break;

          case 'search_gallery_portfolio':
            result = await toolsExecutor.executeSearchGalleryPortfolio(args, scope);
            break;

          case 'get_user_summary':
            result = await toolsExecutor.executeUserSummary(args, scope);
            break;

          default:
            return res.status(404).json({ error: 'TOOL_NOT_FOUND', message: 'Ferramenta não implementada.' });
        }

        // 6. Atualização assíncrona das métricas da chave (lastUsedAt, totalCalls)
        touchKeyUsage(db, keyHash);

        // 7. Resposta estruturada e enxuta para economia de tokens no ChatGPT
        return res.status(200).json({
          success: true,
          tool: toolName,
          timestamp: new Date().toISOString(),
          data: result,
        });
      } catch (execErr) {
        console.error(`[MCP] Erro ao executar ferramenta ${toolName}:`, execErr);
        return res.status(500).json({
          error: 'TOOL_EXECUTION_ERROR',
          message: execErr.message || 'Erro interno ao processar a ferramenta no sistema.',
        });
      }
    }

    // ─── Rota Desconhecida ───────────────────────────────────────────────────
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `Rota '${rawPath}' não encontrada. Consulte o schema em /openapi.json.`,
    });
  }
);

module.exports = {
  chatGptToolsEndpoint,
};

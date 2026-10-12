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
const { ORIGIN_SECRET } = require('../common/secrets');
const { validateOriginSecret } = require('../originProtection');

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
    secrets: [ORIGIN_SECRET],
  },
  async (req, res) => {
    // Tratamento de preflight CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-origin-secret, x-cf-origin-token, openai-ephemeral-user-id');

    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    const db = getFirestore();

    // Normalização rigorosa do caminho (suporta chamadas diretas com ou sem prefixo chatGptToolsEndpoint)
    const rawPath = (req.path || req.url || '')
      .split('?')[0]
      .replace(/^\/+/, '')
      .replace(/^chatGptToolsEndpoint\/?/, '')
      .replace(/^\/+/, '');

    const isProd = process.env.GCLOUD_PROJECT === 'papelaria-dashboard';
    const forwardedHost = req.get('x-forwarded-host');
    const reqHost = req.get('host') || '';
    const isDirectGcf = reqHost.includes('cloudfunctions.net') || reqHost.includes('run.app');
    const apiDomain = forwardedHost || (!isDirectGcf && reqHost ? reqHost : (isProd ? 'api.luisices.com.br' : 'api.dev.luisices.com.br'));
    const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'https');
    const baseUrl = isDirectGcf
      ? `${protocol}://${reqHost}/chatGptToolsEndpoint`
      : `${protocol}://${apiDomain}/chatGptToolsEndpoint`;

    // ─── 1. Validação de Proteção de Origem ──────────────────────────────────
    // Rotas públicas de descoberta (OpenAPI, Manifesto de Plugins e Health) são abertas
    // para que a OpenAI / ChatGPT consiga ler os schemas e conectar o assistente
    const isPublicDiscovery =
      req.method === 'GET' &&
      (
        rawPath === 'openapi.json' ||
        rawPath === 'openapi.yaml' ||
        rawPath === 'schema' ||
        rawPath === '.well-known/ai-plugin.json' ||
        rawPath === 'ai-plugin.json' ||
        rawPath === '.well-known/plugin.json' ||
        rawPath === 'plugin.json' ||
        rawPath === 'health' ||
        rawPath === ''
      );

    if (!isPublicDiscovery) {
      const originCheck = validateOriginSecret(req);
      if (!originCheck.allowed) {
        // Se a requisição contiver cabeçalho Authorization Bearer com chave lui_ válida,
        // permite chamada direta (ex: ChatGPT Actions ou MCP chamando diretamente as ferramentas)
        const authHeader = req.headers.authorization || req.headers.Authorization || '';
        const hasValidKeyFormat = authHeader.startsWith('Bearer lui_');
        if (!hasValidKeyFormat) {
          console.warn('[chatGptToolsEndpoint] Requisição bloqueada por violação de proteção de origem.');
          return res.status(originCheck.statusCode || 403).json({ error: originCheck.error });
        }
      }
    }

    // ─── ROTA 1: Manifesto OpenAPI (/openapi.json, /openapi.yaml ou /schema) ─
    if (req.method === 'GET' && (rawPath === 'openapi.json' || rawPath === 'openapi.yaml' || rawPath === 'schema')) {
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

    // ─── ROTA 1.1: Manifesto de Plugin OpenAI (/.well-known/ai-plugin.json, /ai-plugin.json, plugin.json) ──
    if (
      req.method === 'GET' &&
      (
        rawPath === '.well-known/ai-plugin.json' ||
        rawPath === 'ai-plugin.json' ||
        rawPath === '.well-known/plugin.json' ||
        rawPath === 'plugin.json'
      )
    ) {
      const isDev = !isProd;
      const pluginManifest = {
        schema_version: 'v1',
        name_for_human: isDev ? 'Luisices Dev' : 'Luisices Ateliê',
        name_for_model: 'luisices',
        description_for_human: 'Assistente de produção, pedidos, clientes e precificação do Ateliê Luisices.',
        description_for_model: 'Ferramentas do sistema Luisices para consultar pedidos por status/data, detalhes de clientes, resumo operacional e calcular precificação.',
        auth: {
          type: 'user_http',
          authorization_type: 'bearer',
        },
        api: {
          type: 'openapi',
          url: `${baseUrl}/openapi.json`,
          is_user_authenticated: false,
        },
        logo_url: `https://${apiDomain}/favicon.ico`,
        contact_email: 'contato@luisices.com.br',
        legal_info_url: 'https://luisices.com.br',
      };
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).json(pluginManifest);
    }

    // ─── ROTA 2: Health Check (/ ou /health) ─────────────────────────────────
    if (req.method === 'GET' && (rawPath === '' || rawPath === 'health')) {
      return res.status(200).json({
        status: 'online',
        service: 'Luisices MCP & ChatGPT Tools Endpoint',
        version: '1.0.0',
        environment: process.env.GCLOUD_PROJECT || 'dev',
        schemaUrl: `${baseUrl}/openapi.json`,
        pluginManifestUrl: `${baseUrl}/.well-known/ai-plugin.json`,
      });
    }

    // ─── ROTA 3: Execução de Ferramentas (POST /tools/:toolName) ────────────
    const matchTool = rawPath.match(/^tools\/([a-zA-Z0-9_]+)$/);
    if (matchTool) {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST, OPTIONS');
        return res.status(405).json({
          error: 'METHOD_NOT_ALLOWED',
          message: 'Utilize o método POST para executar ferramentas de IA.',
        });
      }

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

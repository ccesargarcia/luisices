/**
 * Endpoint HTTP Oficial (onRequest Cloud Functions v2) para ChatGPT Actions e Clientes MCP.
 * Configurado com minInstances: 0 para custo zero quando inativo.
 */

const { onRequest } = require('../common/sentryFunctions');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { validateMcpRequest: validateMcpRequestWithoutTrace, touchKeyUsage } = require('./auth');
const { traceMcpRequest, traceMcpStep } = require('./tracing');
const {
  getOauthProtectedResourceMetadata,
  getOauthAuthorizationServerMetadata,
  handleOAuthRegister,
  handleOAuthAuthorize,
  handleOAuthConsentInfo,
  handleOAuthToken,
  handleOAuthRevoke,
} = require('./oauth');
const { TOOL_SCOPE_MAP, MCP_SCOPES } = require('./constants');
const { buildOpenApiSchema, TOOLS_METADATA } = require('./openapi');
const { validateToolArguments } = require('./validation');
const { createAiServices } = require('../ai/index');
const { ORIGIN_SECRET } = require('../common/secrets');
const { validateOriginSecret } = require('../originProtection');
const { captureApiError } = require('../common/sentry');
const { formatToolResultText, publicErrorMessage } = require('./presentation');

/**
 * Função utilitária para executar ferramentas pelo nome
 */
async function executeToolByName(toolsExecutor, toolName, args, scope) {
  switch (toolName) {
    case 'query_orders_view':
      return await toolsExecutor.executeQueryOrdersView(args, scope);
    case 'daily_briefing':
      return await toolsExecutor.executeDailyBriefing(args, scope);
    case 'query_customers':
      return await toolsExecutor.executeQueryCustomers(args, scope);
    case 'get_customer_history':
      return await toolsExecutor.executeGetCustomerHistory(args, scope);
    case 'query_delivery_schedule':
      return await toolsExecutor.executeQueryDeliverySchedule(args, scope);
    case 'get_financial_summary':
      return await toolsExecutor.executeFinancialSummary(args, scope);
    case 'calculate_pricing_estimate':
      return await toolsExecutor.executePricingEstimate(args, scope);
    case 'generate_whatsapp_message':
      return await toolsExecutor.executeGenerateWhatsAppMessage(args, scope);
    case 'extract_order_draft':
      return await toolsExecutor.executeExtractOrderDraft(args, scope);
    case 'get_order_form':
      return await toolsExecutor.executeGetOrderForm(args, scope);
    case 'create_order':
      return await toolsExecutor.executeCreateOrder(args, scope);
    case 'get_order_edit_form':
      return await toolsExecutor.executeGetOrderEditForm(args, scope);
    case 'update_order':
      return await toolsExecutor.executeUpdateOrder(args, scope);
    case 'update_order_status':
      return await toolsExecutor.executeUpdateOrderStatus(args, scope);
    case 'update_delivery_details':
      return await toolsExecutor.executeUpdateDeliveryDetails(args, scope);
    case 'query_order_payments':
      return await toolsExecutor.executeQueryOrderPayments(args, scope);
    case 'register_order_payment':
      return await toolsExecutor.executeRegisterOrderPayment(args, scope);
    case 'create_customer':
      return await toolsExecutor.executeCreateCustomer(args, scope);
    case 'update_customer':
      return await toolsExecutor.executeUpdateCustomer(args, scope);
    case 'search_gallery_portfolio':
      return await toolsExecutor.executeSearchGalleryPortfolio(args, scope);
    case 'get_user_summary':
      return await toolsExecutor.executeUserSummary(args, scope);
    case 'calculate_artisan_pricing':
      return await toolsExecutor.executeCalculateArtisanPricing(args, scope);
    case 'list_supplies':
      return await toolsExecutor.executeListSupplies(args, scope);
    case 'list_pricing_models':
      return await toolsExecutor.executeListPricingModels(args, scope);
    case 'get_pricing_model':
      return await toolsExecutor.executeGetPricingModel(args, scope);
    case 'save_pricing_model':
      return await toolsExecutor.executeSavePricingModel(args, scope);
    case 'query_quotes':
      return await toolsExecutor.executeQueryQuotes(args, scope);
    case 'create_quote':
      return await toolsExecutor.executeCreateQuote(args, scope);
    case 'update_quote_status':
      return await toolsExecutor.executeUpdateQuoteStatus(args, scope);
    case 'list_store_products':
      return await toolsExecutor.executeListStoreProducts(args, scope);
    default:
      throw new Error(`Ferramenta '${toolName}' não implementada.`);
  }
}

async function executeScopedToolByName(toolsExecutor, toolName, args, scope, scopes = []) {
  traceMcpStep('authorize', () => {
    const requiredScope = TOOL_SCOPE_MAP[toolName];
    if (!requiredScope || (!scopes.includes('*') && !scopes.includes(requiredScope))) {
      const error = new Error('Permissão insuficiente para executar esta ferramenta.');
      error.code = 'permission-denied';
      throw error;
    }
  });
  traceMcpStep('validate', () => validateToolArguments(toolName, args));
  const result = await traceMcpStep('execute', () => executeToolByName(toolsExecutor, toolName, args, { ...scope, mcpScopes: scopes }), {
    'mcp.tool': Object.prototype.hasOwnProperty.call(TOOL_SCOPE_MAP, toolName) ? toolName : 'unknown',
  });
  const canReadPaymentDetails = scopes.includes('payments:read') || scopes.includes('financial:read');
  if (!canReadPaymentDetails && result && typeof result === 'object') {
    const redactOrder = (order) => {
      const { totalPrice, paidAmount, remainingAmount, paymentStatus, ...operationalOrder } = order;
      return operationalOrder;
    };
    if (toolName === 'query_orders_view' && Array.isArray(result.orders)) {
      return { ...result, orders: result.orders.map(redactOrder) };
    }
    if (toolName === 'query_customers' && Array.isArray(result.customers)) {
      return { ...result, customers: result.customers.map((customer) => {
        const { totalSpent, ...operationalCustomer } = customer;
        return operationalCustomer;
      }) };
    }
    if (toolName === 'daily_briefing') {
      const { pendingPaymentCount, pendingPaymentTotal, realizedRevenue, totalReceived, ...operationalBriefing } = result;
      if (Array.isArray(operationalBriefing.delayedOrders)) operationalBriefing.delayedOrders = operationalBriefing.delayedOrders.map(redactOrder);
      if (Array.isArray(operationalBriefing.todayDeliveries)) operationalBriefing.todayDeliveries = operationalBriefing.todayDeliveries.map(redactOrder);
      return operationalBriefing;
    }
  }
  if (!scopes.includes('financial:read') && toolName === 'get_user_summary' && result?.metrics) {
    const financialFields = new Set([
      'volumeTotalEmitido', 'grossIssuedVolume', 'faturamentoRealizado', 'realizedRevenue',
      'totalReceived', 'totalRecebido', 'pendingReceivables', 'totalPendenteReceber',
      'averageTicket', 'ticketMedio',
    ]);
    return {
      ...result,
      customers: Array.isArray(result.customers)
        ? result.customers.map(({ totalSpent, ...customer }) => customer)
        : result.customers,
      metrics: Object.fromEntries(Object.entries(result.metrics).filter(([key]) => !financialFields.has(key))),
    };
  }
  return result;
}

function publicToolError(error) {
  if (error?.code === 'permission-denied') return { status: 403, code: 'PERMISSION_DENIED', message: publicErrorMessage(error) };
  if (error?.code === 'invalid-argument') return { status: 400, code: 'INVALID_ARGUMENT', message: publicErrorMessage(error) };
  if (error?.code === 'not-found') return { status: 404, code: 'NOT_FOUND', message: publicErrorMessage(error) };
  if (error?.code === 'failed-precondition' || error?.code === 'already-exists') return { status: 409, code: 'CONFLICT', message: publicErrorMessage(error) };
  return { status: 500, code: 'TOOL_EXECUTION_ERROR', message: publicErrorMessage(error) };
}

async function validateMcpRequest(req, db) {
  return traceMcpStep('authenticate', async (span) => {
    const result = await validateMcpRequestWithoutTrace(req, db);
    span.setAttribute('mcp.auth.result', result.success ? 'authorized' : 'rejected');
    span.setStatus({ code: result.success ? 1 : 2 });
    return result;
  });
}

function buildBearerChallenge(hasBearerCredentials, apiOrigin) {
  const metadataUrl = `${apiOrigin}/.well-known/oauth-protected-resource`;
  const error = hasBearerCredentials ? 'error="invalid_token", ' : '';
  return `Bearer ${error}resource_metadata=${JSON.stringify(metadataUrl)}`;
}

/**
 * Registra log de auditoria assíncrono para observabilidade do MCP e ChatGPT
 */
function recordMcpAuditLog(db, {
  toolName,
  keyId,
  callerUid,
  callerName,
  clientProtocol,
  executionTimeMs,
  success,
  errorMessage,
  orderNumber,
}) {
  if (!db) return;
  let FieldValue = null;
  try {
    FieldValue = require('firebase-admin/firestore').FieldValue;
  } catch (_e) {}

  db.collection('mcpAuditLogs')
    .add({
      toolName: String(toolName || 'unknown').slice(0, 100),
      keyId: String(keyId || 'oauth_session').slice(0, 100),
      callerUid: String(callerUid || '').slice(0, 128),
      callerName: String(callerName || '').slice(0, 200),
      clientProtocol: String(clientProtocol || 'unknown'),
      executionTimeMs: Number(executionTimeMs) || 0,
      success: Boolean(success),
      errorMessage: typeof errorMessage === 'string' ? errorMessage.slice(0, 500) : null,
      orderNumber: typeof orderNumber === 'string' ? orderNumber.slice(0, 100) : null,
      timestamp: FieldValue && FieldValue.serverTimestamp ? FieldValue.serverTimestamp() : new Date().toISOString(),
    })
    .catch((err) => {
      console.warn('[MCP] Falha não-bloqueante ao registrar log de auditoria:', err.message);
    });
}

let sharedAiServices = null;
function getSharedAiServices(db) {
  if (!sharedAiServices) {
    sharedAiServices = createAiServices({
      firestore: () => db,
      auth: () => getAuth(),
    });
  }
  return sharedAiServices;
}

/**
 * Endpoint HTTP de Ferramentas de IA para ChatGPT e MCP.
 */
const chatGptToolsEndpoint = onRequest(
  {
    cors: true,
    minInstances: 0,
    maxInstances: 5,
    memory: '1GiB',
    timeoutSeconds: 30,
    secrets: [ORIGIN_SECRET],
  },
  (req, res) => traceMcpRequest(req, res, async () => {
    // Tratamento de preflight CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-origin-secret, x-cf-origin-token, openai-ephemeral-user-id, sentry-trace, baggage');
    res.setHeader('Access-Control-Expose-Headers', 'X-MCP-Trace-Id');

    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    if (req.body !== undefined) {
      let bodyBytes;
      try { bodyBytes = Buffer.byteLength(JSON.stringify(req.body), 'utf8'); } catch (_err) { bodyBytes = Infinity; }
      if (bodyBytes > 64 * 1024) return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE', message: 'O corpo da requisição excede o limite permitido.' });
    }

    const db = getFirestore();

    // Normalização rigorosa do caminho (suporta chamadas diretas com ou sem prefixo chatGptToolsEndpoint)
    const rawPath = (req.path || req.url || '')
      .split('?')[0]
      .split('#')[0]
      .replace(/^\/+/, '')
      .replace(/^chatGptToolsEndpoint\/?/, '')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

    const matchTool = rawPath.match(/^tools\/([a-zA-Z0-9_]+)$/);

    const isProd = process.env.GCLOUD_PROJECT === 'papelaria-dashboard' || process.env.GCP_PROJECT === 'papelaria-dashboard';
    // Domínio público fixo por ambiente; não derive issuer/challenges de Host fornecido pelo cliente.
    const apiDomain = isProd ? 'api.luisices.com.br' : 'api.dev.luisices.com.br';

    const protocol = 'https';
    const baseUrl = `https://${apiDomain}/chatGptToolsEndpoint`;

    try {

    // ─── 1. Validação de Proteção de Origem ──────────────────────────────────
    // Rotas públicas de descoberta (OpenAPI, Manifesto de Plugins, OAuth Discovery, MCP Initialize e Health) são abertas
    // para que a OpenAI / ChatGPT e clientes MCP consigam ler os schemas, descobrir OAuth e conectar o assistente
    const isPublicDiscovery =
      (req.method === 'GET' && rawPath === 'oauth/consent') ||
      (req.method === 'GET' &&
      (
        rawPath === 'openapi.json' ||
        rawPath === 'openapi.yaml' ||
        rawPath === 'schema' ||
        rawPath === '.well-known/ai-plugin.json' ||
        rawPath === 'ai-plugin.json' ||
        rawPath === '.well-known/plugin.json' ||
        rawPath === 'plugin.json' ||
        rawPath === '.well-known/oauth-protected-resource' ||
        rawPath === '.well-known/oauth-authorization-server' ||
        rawPath === '.well-known/openid-configuration' ||
        rawPath === 'oauth/authorize' ||
        rawPath === 'authorize' ||
        rawPath === 'favicon.ico' ||
        rawPath === 'health' ||
        rawPath === ''
      )) ||
      (req.method === 'POST' && (
        rawPath === 'oauth/register' ||
        rawPath === 'register' ||
        rawPath === 'oauth/authorize' ||
        rawPath === 'authorize' ||
        rawPath === 'oauth/token' ||
        rawPath === 'token' ||
        rawPath === 'oauth/revoke' ||
        rawPath === 'revoke' ||
        req.body?.method === 'initialize' ||
        req.body?.method === 'notifications/initialized' ||
        req.body?.method === 'ping'
      ));

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

    // ─── ROTA 0.0: Favicon Ícone (GET /favicon.ico) ──────────────────────────
    if (req.method === 'GET' && rawPath === 'favicon.ico') {
      const appHost = isProd ? 'luisices.com.br' : 'dev.luisices.com.br';
      return res.redirect(302, `https://${appHost}/favicon.ico`);
    }

    // ─── ROTA 0.1: Descoberta de Recurso Protegido OAuth 2.1 (RFC 9728) ────────
    if (req.method === 'GET' && (rawPath === '.well-known/oauth-protected-resource' || rawPath === 'oauth-protected-resource')) {
      const metadata = getOauthProtectedResourceMetadata(baseUrl);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).json(metadata);
    }

    // ─── ROTA 0.2: Descoberta do Servidor de Autorização OAuth 2.1 / OIDC (RFC 8414) ──
    if (
      req.method === 'GET' &&
      (rawPath === '.well-known/oauth-authorization-server' || rawPath === '.well-known/openid-configuration')
    ) {
      const metadata = getOauthAuthorizationServerMetadata(baseUrl);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).json(metadata);
    }

    // ─── ROTA 0.3: Registro Dinâmico de Cliente OAuth (POST /oauth/register) ──
    if (rawPath === 'oauth/register' || rawPath === 'register') {
      return await handleOAuthRegister(req, res, db);
    }

    // ─── ROTA 0.4: Endpoint de Autorização OAuth 2.1 (GET/POST /oauth/authorize) ──
    if (rawPath === 'oauth/authorize' || rawPath === 'authorize') {
      return await handleOAuthAuthorize(req, res, db, getAuth);
    }

    if (rawPath === 'oauth/consent') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
      return await handleOAuthConsentInfo(req, res, db, getAuth);
    }

    // ─── ROTA 0.5: Endpoint de Emissão / Renovação de Token OAuth 2.1 (POST /oauth/token) ──
    if (rawPath === 'oauth/token' || rawPath === 'token') {
      return await handleOAuthToken(req, res, db);
    }

    // ─── ROTA 0.6: Revogação de token OAuth (POST /oauth/revoke) ─────────────
    if (rawPath === 'oauth/revoke' || rawPath === 'revoke') {
      return await handleOAuthRevoke(req, res, db);
    }

    // ─── ROTA 1: Manifesto OpenAPI (/openapi.json, /openapi.yaml ou /schema) ─
    if (req.method === 'GET' && (rawPath === 'openapi.json' || rawPath === 'openapi.yaml' || rawPath === 'schema')) {
      // Se a requisição contiver Bearer token, personaliza o schema apenas com as permissões da chave
      let allowedScopes = null;
      if (req.headers.authorization) {
        const authResult = await validateMcpRequest(req, db);
        if (!authResult.success) return res.status(authResult.status || 401).json({ error: authResult.code, message: authResult.message });
        allowedScopes = authResult.keyData.scopes || [];
      }

      const schema = buildOpenApiSchema(baseUrl, allowedScopes);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      // This schema can be filtered by the caller's OAuth scopes. Never let a
      // shared cache reuse one user's tool catalog for another connection.
      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      res.setHeader('Vary', 'Authorization');
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
          type: 'oauth',
          client_url: `${protocol}://${apiDomain}/oauth/authorize`,
          scope: 'orders:read orders:draft orders:create orders:update customers:read customers:create customers:update payments:read payments:write financial:read team:read pricing:estimate whatsapp:compose gallery:read',
          authorization_url: `${protocol}://${apiDomain}/oauth/token`,
          authorization_content_type: 'application/x-www-form-urlencoded',
          verification_tokens: {},
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

    // ─── ROTA 3: Suporte ao Protocolo Nativo MCP JSON-RPC 2.0 ─────────────
    // Suporta qualquer cliente MCP (Cursor, Claude Desktop, ChatGPT MCP connector, etc.)
    const isMcpRpc = req.method === 'POST' && (
      req.body?.jsonrpc === '2.0' ||
      (typeof req.body?.method === 'string' && !matchTool)
    );

    if (isMcpRpc) {
      const rpcId = req.body?.id ?? null;
      const method = req.body?.method;
      const params = req.body?.params || {};
      if ((rpcId !== null && typeof rpcId !== 'string' && typeof rpcId !== 'number') || !params || typeof params !== 'object' || Array.isArray(params)) {
        return res.status(400).json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Requisição JSON-RPC inválida.' } });
      }

      // 3.1 Handshake Inicial: initialize
      if (method === 'initialize') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id: rpcId,
          result: {
            protocolVersion: params.protocolVersion || '2024-11-05',
            capabilities: {
              tools: {
                listChanged: false,
              },
              resources: { listChanged: false },
            },
            serverInfo: {
              name: 'luisices-mcp-server',
              version: '1.0.0',
            },
            instructions: 'Servidor MCP oficial do Ateliê Luisices. Comunique-se sempre em português com tom amigável, acolhedor e executivo. Nunca exponha ao usuário jargões técnicos internos (como chave de idempotência, tokens, endpoints, schemas, JSON bruto ou verificações técnicas de integridade/duplicidade). Apresente os resultados sempre formatados com tópicos claros, emojis pertinentes, valores em moeda brasileira (R$) e datas no formato brasileiro (DD/MM/AAAA). Para novos pedidos com dados completos, crie diretamente sem buscas repetidas; para editar pedidos, use get_order_edit_form.',
          },
        });
      }

      // 3.2 Notificação initialized
      if (method === 'notifications/initialized') {
        return res.status(200).json({ jsonrpc: '2.0', result: {} });
      }

      // 3.3 Ping
      if (method === 'ping') {
        return res.status(200).json({ jsonrpc: '2.0', id: rpcId, result: {} });
      }

      // 3.4 Listagem de Ferramentas: tools/list
      if (method === 'tools/list') {
        const authResult = await validateMcpRequest(req, db);
        if (!authResult.success) return res.status(authResult.status || 401).json({ jsonrpc: '2.0', id: rpcId, error: { code: -32001, message: authResult.message || 'Autenticação necessária.' } });
        const allowedScopes = authResult.keyData.scopes || [];

        const filteredTools = TOOLS_METADATA.filter((tool) => {
          if (allowedScopes.includes('*')) return true;
          return allowedScopes.includes(tool.scope);
        });

        return res.status(200).json({
          jsonrpc: '2.0',
          id: rpcId,
          result: {
            tools: filteredTools.map((t) => ({
              name: t.name,
              description: `${t.summary}: ${t.description}`,
              inputSchema: { ...(t.requestBody || { type: 'object', properties: {} }), additionalProperties: false },
              ...(['get_order_edit_form', 'update_order'].includes(t.name) ? { _meta: {
                ui: { resourceUri: 'ui://luisices/order-edit/v1.html' },
                'openai/outputTemplate': 'ui://luisices/order-edit/v1.html',
              } } : {}),
            })),
          },
        });
      }

      // MCP Apps: widget de formulário do pedido, disponível apenas com orders:update.
      if (method === 'resources/list') {
        const authResult = await validateMcpRequest(req, db);
        if (!authResult.success) return res.status(authResult.status || 401).json({ jsonrpc: '2.0', id: rpcId, error: { code: -32001, message: authResult.message || 'Autenticação necessária.' } });
        const scopes = authResult.keyData.scopes || [];
        const resources = scopes.includes('*') || scopes.includes('orders:update') ? [{
          uri: 'ui://luisices/order-edit/v1.html',
          name: 'Formulário de edição de pedido',
          description: 'Formulário para editar dados e valores do pedido.',
          mimeType: 'text/html;profile=mcp-app',
        }] : [];
        return res.status(200).json({ jsonrpc: '2.0', id: rpcId, result: { resources } });
      }

      if (method === 'resources/read') {
        const authResult = await validateMcpRequest(req, db);
        if (!authResult.success) return res.status(authResult.status || 401).json({ jsonrpc: '2.0', id: rpcId, error: { code: -32001, message: authResult.message || 'Autenticação necessária.' } });
        const scopes = authResult.keyData.scopes || [];
        if (!scopes.includes('*') && !scopes.includes('orders:update')) {
          return res.status(200).json({ jsonrpc: '2.0', id: rpcId, error: { code: -32003, message: 'Permissão negada para carregar o formulário de edição.' } });
        }
        if (params.uri !== 'ui://luisices/order-edit/v1.html') {
          return res.status(200).json({ jsonrpc: '2.0', id: rpcId, error: { code: -32602, message: 'Recurso MCP não encontrado.' } });
        }
        const { ORDER_EDIT_WIDGET_HTML } = require('./orderEditWidget');
        return res.status(200).json({ jsonrpc: '2.0', id: rpcId, result: { contents: [{
          uri: params.uri,
          mimeType: 'text/html;profile=mcp-app',
          text: ORDER_EDIT_WIDGET_HTML,
          _meta: { ui: { prefersBorder: true } },
        }] } });
      }

      // 3.5 Execução de Ferramentas: tools/call
      if (method === 'tools/call') {
        const toolName = params.name;
        const toolArgs = params.arguments || {};

        const authResult = await validateMcpRequest(req, db);
        if (!authResult.success) {
          if (authResult.status === 429) res.setHeader('Retry-After', String(3600 - (Math.floor(Date.now() / 1000) % 3600)));
          if (authResult.status === 401) {
            const authorization = req.headers.authorization || req.headers.Authorization || '';
            res.setHeader('WWW-Authenticate', buildBearerChallenge(/^Bearer\s+\S+/i.test(authorization), `${protocol}://${apiDomain}`));
          }
          return res.status(authResult.status || 401).json({
            jsonrpc: '2.0',
            id: rpcId,
            error: {
              code: -32001,
              message: authResult.message || 'Falha de autenticação. Realize o login via OAuth 2.1.',
              data: {
                authorization_uri: `${protocol}://${apiDomain}/oauth/authorize`,
              },
            },
          });
        }

        const { keyData, scope, keyHash } = authResult;
        const requiredScope = TOOL_SCOPE_MAP[toolName];
        if (!requiredScope) {
          return res.status(200).json({
            jsonrpc: '2.0',
            id: rpcId,
            error: {
              code: -32601,
              message: 'Não consegui identificar a ação solicitada. Tente novamente com outra solicitação.',
            },
          });
        }

        const keyScopes = keyData.scopes || [];
        const hasScope = keyScopes.includes('*') || keyScopes.includes(requiredScope);
        if (!hasScope) {
          return res.status(200).json({
            jsonrpc: '2.0',
            id: rpcId,
            error: {
              code: -32003,
              message: 'Esta ação não está liberada para sua conta. Peça a um administrador para revisar seu acesso.',
            },
          });
        }

        const scopeDef = Object.values(MCP_SCOPES).find((s) => s.id === requiredScope);
        if (scopeDef?.requiresAdmin && !scope.isAdmin) {
          return res.status(200).json({
            jsonrpc: '2.0',
            id: rpcId,
            error: {
              code: -32003,
              message: 'Esta ação está disponível apenas para um administrador da conta.',
            },
          });
        }

        const startTime = Date.now();
        try {
          const aiServices = traceMcpStep('services', () => getSharedAiServices(db));
          const { toolsExecutor } = aiServices;
          const result = await executeScopedToolByName(toolsExecutor, toolName, toolArgs, scope, keyScopes);
          const executionTimeMs = Date.now() - startTime;
          touchKeyUsage(db, keyHash);
          recordMcpAuditLog(db, {
            toolName,
            keyId: keyData.keyId,
            callerUid: scope.uid,
            callerName: scope.displayName || scope.email,
            clientProtocol: 'mcp-rpc',
            executionTimeMs,
            success: true,
            orderNumber: result?.orderNumber || null,
          });

          return res.status(200).json({
            jsonrpc: '2.0',
            id: rpcId,
            result: {
              content: [
                {
                  type: 'text',
                  text: formatToolResultText(toolName, result),
                },
              ],
              structuredContent: result && typeof result === 'object' ? result : { result },
              isError: false,
            },
          });
        } catch (execErr) {
          const executionTimeMs = Date.now() - startTime;
          if (publicToolError(execErr).status >= 500) {
            await captureApiError(execErr, { module: 'mcp', tool: toolName, protocol: 'mcp-rpc' });
          }
          recordMcpAuditLog(db, {
            toolName,
            keyId: keyData.keyId,
            callerUid: scope.uid,
            callerName: scope.displayName || scope.email,
            clientProtocol: 'mcp-rpc',
            executionTimeMs,
            success: false,
            errorMessage: execErr.code || 'tool_execution_error',
          });

          return res.status(200).json({
            jsonrpc: '2.0',
            id: rpcId,
            error: {
              code: execErr.code === 'permission-denied' ? -32003 : execErr.code === 'invalid-argument' ? -32602 : execErr.code === 'failed-precondition' || execErr.code === 'already-exists' ? -32009 : -32603,
              message: publicToolError(execErr).message,
            },
          });
        }
      }

      return res.status(200).json({
        jsonrpc: '2.0',
        id: rpcId,
        error: {
          code: -32601,
          message: `Método MCP '${method}' não implementado.`,
        },
      });
    }

    // ─── ROTA 4: Execução de Ferramentas via REST / OpenAPI (POST /tools/:toolName) ─
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
        if (authResult.status === 429) res.setHeader('Retry-After', String(3600 - (Math.floor(Date.now() / 1000) % 3600)));
        if (authResult.status === 401) {
          const authorization = req.headers.authorization || req.headers.Authorization || '';
          res.setHeader('WWW-Authenticate', buildBearerChallenge(/^Bearer\s+\S+/i.test(authorization), `${protocol}://${apiDomain}`));
        }
        return res.status(authResult.status).json({
          error: authResult.code,
          message: authResult.message,
          authorization_uri: `${protocol}://${apiDomain}/oauth/authorize`,
        });
      }

      const { keyData, scope, keyHash, requestedKeyScopes } = authResult;

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
        const keyHasScope = requestedKeyScopes?.includes('*') || requestedKeyScopes?.includes(requiredScope);
        if (keyHasScope) {
          return res.status(403).json({
            error: 'PROFILE_SCOPE_PERMISSION_DENIED',
            message: `A chave possui '${requiredScope}', mas o perfil vinculado não permite este escopo. Confira as permissões MCP granulares do perfil e as permissões do módulo (${scopeInfo?.label || 'recurso restrito'}).`,
          });
        }
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
          message: 'Esta ação está disponível apenas para um administrador da conta.',
        });
      }

      // 5. Execução Segura da Ferramenta no Núcleo de IA
      let args;
      try {
        args = traceMcpStep('validate_request', () => validateToolArguments(toolName, req.body));
      } catch (validationError) {
        return res.status(400).json({ error: 'INVALID_ARGUMENT', message: publicErrorMessage(validationError) });
      }
      const aiServices = traceMcpStep('services', () => getSharedAiServices(db));
      const { toolsExecutor } = aiServices;

      const startTime = Date.now();
      try {
        const result = await executeScopedToolByName(toolsExecutor, toolName, args, scope, keyScopes);
        const executionTimeMs = Date.now() - startTime;

        // 6. Atualização assíncrona das métricas da chave (lastUsedAt, totalCalls)
        touchKeyUsage(db, keyHash);
        recordMcpAuditLog(db, {
          toolName,
          keyId: keyData.keyId,
          callerUid: scope.uid,
          callerName: scope.displayName || scope.email,
          clientProtocol: 'openapi-rest',
          executionTimeMs,
          success: true,
          orderNumber: result?.orderNumber || null,
        });

        // 7. Resposta estruturada e enxuta para economia de tokens no ChatGPT
        return res.status(200).json({
          success: true,
          tool: toolName,
          timestamp: new Date().toISOString(),
          data: result,
        });
      } catch (execErr) {
        const executionTimeMs = Date.now() - startTime;
        if (publicToolError(execErr).status >= 500) {
          await captureApiError(execErr, { module: 'mcp', tool: toolName });
        }
        console.error(`[MCP] Falha na ferramenta ${toolName} (${execErr.code || 'tool_execution_error'}).`);
        recordMcpAuditLog(db, {
          toolName,
          keyId: keyData.keyId,
          callerUid: scope.uid,
          callerName: scope.displayName || scope.email,
          clientProtocol: 'openapi-rest',
          executionTimeMs,
          success: false,
          errorMessage: execErr.code || 'tool_execution_error',
        });

        const safeError = publicToolError(execErr);
        return res.status(safeError.status).json({ error: safeError.code, message: safeError.message });
      }
    }

    // ─── Rota Desconhecida ───────────────────────────────────────────────────
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `Rota '${rawPath}' não encontrada. Consulte o schema em /openapi.json.`,
    });
    } catch (error) {
      await captureApiError(error, { module: 'mcp', route: 'http' });
      console.error('[chatGptToolsEndpoint] Erro fatal não tratado.');
      return res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Erro interno no servidor ao processar requisição.',
      });
    }
  })
);

module.exports = {
  chatGptToolsEndpoint,
  executeScopedToolByName,
  publicToolError,
  buildBearerChallenge,
};

/**
 * Endpoint HTTP Oficial (onRequest Cloud Functions v2) para ChatGPT Actions e Clientes MCP.
 * Configurado com minInstances: 0 para custo zero quando inativo.
 */

const { onRequest } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { validateMcpRequest, touchKeyUsage } = require('./auth');
const {
  getOauthProtectedResourceMetadata,
  getOauthAuthorizationServerMetadata,
  handleOAuthRegister,
  handleOAuthAuthorize,
  handleOAuthToken,
} = require('./oauth');
const { TOOL_SCOPE_MAP, MCP_SCOPES } = require('./constants');
const { buildOpenApiSchema, TOOLS_METADATA } = require('./openapi');
const { createAiServices } = require('../ai/index');
const { ORIGIN_SECRET } = require('../common/secrets');
const { validateOriginSecret } = require('../originProtection');

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
    case 'get_financial_summary':
      return await toolsExecutor.executeFinancialSummary(args, scope);
    case 'calculate_pricing_estimate':
      return await toolsExecutor.executePricingEstimate(args, scope);
    case 'generate_whatsapp_message':
      return await toolsExecutor.executeGenerateWhatsAppMessage(args, scope);
    case 'extract_order_draft':
      return await toolsExecutor.executeExtractOrderDraft(args, scope);
    case 'search_gallery_portfolio':
      return await toolsExecutor.executeSearchGalleryPortfolio(args, scope);
    case 'get_user_summary':
      return await toolsExecutor.executeUserSummary(args, scope);
    default:
      throw new Error(`Ferramenta '${toolName}' não implementada.`);
  }
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

    const matchTool = rawPath.match(/^tools\/([a-zA-Z0-9_]+)$/);

    const isProd = process.env.GCLOUD_PROJECT === 'papelaria-dashboard';
    const forwardedHost = req.get('x-forwarded-host');
    const reqHost = req.get('host') || '';
    const isDirectGcf = reqHost.includes('cloudfunctions.net') || reqHost.includes('run.app');
    const apiDomain = forwardedHost || (!isDirectGcf && reqHost ? reqHost : (isProd ? 'api.luisices.com.br' : 'api.dev.luisices.com.br'));
    const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'https');
    const baseUrl = isDirectGcf
      ? `${protocol}://${reqHost}/chatGptToolsEndpoint`
      : `${protocol}://${apiDomain}/chatGptToolsEndpoint`;

    try {

    // ─── 1. Validação de Proteção de Origem ──────────────────────────────────
    // Rotas públicas de descoberta (OpenAPI, Manifesto de Plugins, OAuth Discovery, MCP Initialize e Health) são abertas
    // para que a OpenAI / ChatGPT e clientes MCP consigam ler os schemas, descobrir OAuth e conectar o assistente
    const isPublicDiscovery =
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

    // ─── ROTA 0.1: Descoberta de Recurso Protegido OAuth 2.1 (RFC 9723) ────────
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

    // ─── ROTA 0.5: Endpoint de Emissão / Renovação de Token OAuth 2.1 (POST /oauth/token) ──
    if (rawPath === 'oauth/token' || rawPath === 'token') {
      return await handleOAuthToken(req, res, db);
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
          type: 'oauth',
          client_url: `${protocol}://${apiDomain}/oauth/authorize`,
          scope: 'orders:read orders:draft customers:read pricing:estimate whatsapp:compose gallery:read',
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
            },
            serverInfo: {
              name: 'luisices-mcp-server',
              version: '1.0.0',
            },
            instructions: 'Servidor MCP oficial do Ateliê Luisices para consulta de pedidos, produção, clientes e orçamentos.',
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
        let allowedScopes = null;
        if (req.headers.authorization) {
          const authResult = await validateMcpRequest(req, db);
          if (authResult.success) {
            allowedScopes = authResult.keyData.scopes || [];
          }
        }

        const filteredTools = TOOLS_METADATA.filter((tool) => {
          if (!allowedScopes || allowedScopes.includes('*')) return true;
          return allowedScopes.includes(tool.scope);
        });

        return res.status(200).json({
          jsonrpc: '2.0',
          id: rpcId,
          result: {
            tools: filteredTools.map((t) => ({
              name: t.name,
              description: `${t.summary}: ${t.description}`,
              inputSchema: t.requestBody || { type: 'object', properties: {} },
            })),
          },
        });
      }

      // 3.5 Execução de Ferramentas: tools/call
      if (method === 'tools/call') {
        const toolName = params.name;
        const toolArgs = params.arguments || {};

        const authResult = await validateMcpRequest(req, db);
        if (!authResult.success) {
          if (authResult.status === 401) {
            res.setHeader(
              'WWW-Authenticate',
              `Bearer error="invalid_token", error_description="${authResult.message || 'Falha de autenticação.'}", resource="${protocol}://${apiDomain}", authorization_uri="${protocol}://${apiDomain}/oauth/authorize"`
            );
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
              message: `Ferramenta '${toolName}' não reconhecida pelo sistema Luisices.`,
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
              message: `Permissão negada para o escopo '${requiredScope}'.`,
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
              message: `Acesso restrito: a ferramenta '${toolName}' exige privilégios de Administrador.`,
            },
          });
        }

        try {
          const aiServices = getSharedAiServices(db);
          const { toolsExecutor } = aiServices;
          const result = await executeToolByName(toolsExecutor, toolName, toolArgs, scope);
          touchKeyUsage(db, keyHash);

          return res.status(200).json({
            jsonrpc: '2.0',
            id: rpcId,
            result: {
              content: [
                {
                  type: 'text',
                  text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                },
              ],
              isError: false,
            },
          });
        } catch (execErr) {
          return res.status(200).json({
            jsonrpc: '2.0',
            id: rpcId,
            error: {
              code: -32603,
              message: execErr.message || 'Erro ao executar ferramenta MCP.',
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
        if (authResult.status === 401) {
          res.setHeader(
            'WWW-Authenticate',
            `Bearer error="invalid_token", error_description="${authResult.message || 'Token de acesso inválido ou ausente.'}", resource="${protocol}://${apiDomain}", authorization_uri="${protocol}://${apiDomain}/oauth/authorize"`
          );
        }
        return res.status(authResult.status).json({
          error: authResult.code,
          message: authResult.message,
          authorization_uri: `${protocol}://${apiDomain}/oauth/authorize`,
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
      const aiServices = getSharedAiServices(db);
      const { toolsExecutor } = aiServices;

      try {
        const result = await executeToolByName(toolsExecutor, toolName, args, scope);

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
    } catch (globalErr) {
      console.error('[chatGptToolsEndpoint] Erro fatal não tratado:', globalErr);
      return res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: globalErr.message || 'Erro interno no servidor ao processar requisição.',
      });
    }
  }
);

module.exports = {
  chatGptToolsEndpoint,
};

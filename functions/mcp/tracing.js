const { Sentry } = require('../common/sentry');
const { TOOL_SCOPE_MAP } = require('./constants');

const RPC_METHODS = new Set(['initialize', 'notifications/initialized', 'ping', 'tools/list', 'tools/call', 'resources/list', 'resources/read']);
const ROUTES = new Set(['', 'health', 'schema', 'openapi.json', 'openapi.yaml', 'oauth/token', 'oauth/register', 'oauth/authorize', 'oauth/revoke', 'oauth/consent', 'token', 'register', 'authorize', 'revoke']);

function getRequestTraceAttributes(req) {
  const path = String(req.path || req.url || '').split(/[?#]/)[0].replace(/^\/+/, '').replace(/^chatGptToolsEndpoint\/?/, '').replace(/\/+$/, '');
  const restTool = path.match(/^tools\/([a-zA-Z0-9_]+)$/)?.[1];
  const rpc = req.method === 'POST' && !restTool && typeof req.body?.method === 'string';
  const requestedTool = rpc ? req.body?.params?.name : restTool;
  const tool = typeof requestedTool === 'string' && Object.prototype.hasOwnProperty.call(TOOL_SCOPE_MAP, requestedTool) ? requestedTool : 'unknown';
  const args = rpc ? req.body?.params?.arguments : restTool ? req.body : undefined;
  return {
    'mcp.protocol': rpc ? 'mcp-rpc' : restTool ? 'openapi-rest' : 'discovery',
    'mcp.method': rpc ? (RPC_METHODS.has(req.body.method) ? req.body.method : 'unknown') : 'http',
    'mcp.tool': tool,
    'mcp.confirmation': args?.confirmed === undefined ? 'not_provided' : [true, 'true'].includes(args.confirmed) ? 'true' : [false, 'false'].includes(args.confirmed) ? 'false' : 'invalid',
    'mcp.idempotency_present': typeof args?.idempotencyKey === 'string' && args.idempotencyKey.length > 0,
    'http.request.method': ['GET', 'POST', 'HEAD', 'OPTIONS'].includes(req.method) ? req.method : 'OTHER',
    'http.route': restTool ? '/tools/:tool' : rpc ? '/mcp' : ROUTES.has(path) ? `/${path}` : '/other',
  };
}

function traceMcpStep(phase, work, attributes = {}) {
  return Sentry.startSpan({ name: `mcp.${phase}`, op: `mcp.${phase}`, attributes }, work);
}

function responseOutcome(body, status) {
  const result = body?.jsonrpc ? body.result?.structuredContent : body?.data;
  if (status >= 400 || body?.error || body?.result?.isError || result?.success === false) return 'error';
  if (result?.requiresConfirmation || result?.status === 'preview') return 'preview';
  if (result?.isDuplicate === true) return 'duplicate';
  return 'success';
}

function traceMcpRequest(req, res, work) {
  if (!Sentry.getClient()) return work();
  return Sentry.withIsolationScope(async (scope) => {
    const attributes = getRequestTraceAttributes(req);
    for (const [key, value] of Object.entries(attributes)) scope.setTag(key, value);
    const parent = Sentry.getActiveSpan();
    if (parent) parent.setAttributes(attributes);
    let sampled = false;
    const operation = attributes['mcp.tool'] !== 'unknown' ? attributes['mcp.tool']
      : attributes['mcp.method'] === 'http' ? attributes['http.route'] : attributes['mcp.method'];
    const run = () => Sentry.startSpan({
      name: `MCP ${attributes['mcp.protocol']} ${operation}`,
      op: 'mcp.server', attributes,
    }, async (span) => {
      const context = span.spanContext();
      sampled = Boolean(context.traceFlags & 1);
      if (/^[a-f0-9]{32}$/.test(context.traceId) && !/^0+$/.test(context.traceId)) res.setHeader('X-MCP-Trace-Id', context.traceId);
      const originalJson = res.json;
      res.json = function tracedJson(body) {
        const status = res.statusCode || 200;
        const outcome = responseOutcome(body, status);
        scope.setTag('mcp.outcome', outcome);
        for (const target of [span, parent].filter(Boolean)) {
          target.setAttribute('http.response.status_code', status);
          target.setAttribute('mcp.outcome', outcome);
          // JSON-RPC devolve erros de execução com HTTP 200.
          target.setStatus({ code: outcome === 'error' ? 2 : 1 });
        }
        const rpcCode = body?.jsonrpc && body?.error?.code;
        if (typeof rpcCode === 'number' && Number.isSafeInteger(rpcCode)) span.setAttribute('mcp.rpc.error_code', rpcCode);
        return originalJson.call(this, body);
      };
      try {
        return await work();
      } finally {
        res.json = originalJson;
      }
    });
    try {
      // A instrumentação HTTP pode já ter continuado o trace recebido da borda.
      if (Sentry.getActiveSpan()) return await run();
      return await Sentry.continueTrace({ sentryTrace: req.headers?.['sentry-trace'], baggage: req.headers?.baggage }, run);
    } finally {
      // Cloud Functions pode suspender a instância ao terminar a resposta.
      // Aguarda somente traces amostrados, sem elevar a taxa ou atrasar os demais.
      if (sampled) await Sentry.flush(1000).catch(() => false);
    }
  });
}

module.exports = { traceMcpRequest, traceMcpStep, getRequestTraceAttributes, responseOutcome };

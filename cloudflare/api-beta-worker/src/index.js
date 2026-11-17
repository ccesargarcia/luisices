const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, X-Requested-With, sentry-trace, baggage',
  'Access-Control-Max-Age': '86400',
};
const API_BETA_HOST = 'api.beta.luisices.com.br';
const GALLERY_MEDIA_PATH = '/api/gallery-media';
const AI_CHAT_PATH = '/api/ai-chat';
const AI_CHAT_VERCEL_BODY_LIMIT = 4 * 1024 * 1024;
const GALLERY_CORS_METHODS = 'GET, HEAD, OPTIONS';
const GALLERY_CORS_HEADERS = 'Authorization, Content-Type, x-origin-secret, x-cf-origin-token';
const MCP_ALLOWED_ORIGINS = new Set(['https://beta.luisices.com.br']);
const MCP_BODY_LIMIT = 64 * 1024;
const MCP_CORS_HEADERS = [
  'Authorization',
  'Content-Type',
  'Accept',
  'MCP-Protocol-Version',
  'Last-Event-ID',
  'openai-ephemeral-user-id',
  'sentry-trace',
  'baggage',
].join(', ');
const MCP_CORS_EXPOSE_HEADERS = 'WWW-Authenticate, Location, Retry-After, X-MCP-Trace-Id';

const MCP_ROUTES = new Map([
  ['/.well-known/oauth-protected-resource', new Set(['GET'])],
  ['/.well-known/oauth-protected-resource/mcp', new Set(['GET'])],
  ['/.well-known/oauth-authorization-server', new Set(['GET'])],
  ['/.well-known/oauth-authorization-server/mcp', new Set(['GET'])],
  ['/.well-known/openid-configuration', new Set(['GET'])],
  ['/.well-known/openid-configuration/mcp', new Set(['GET'])],
  ['/.well-known/ai-plugin.json', new Set(['GET'])],
  ['/.well-known/plugin.json', new Set(['GET'])],
  ['/ai-plugin.json', new Set(['GET'])],
  ['/plugin.json', new Set(['GET'])],
  ['/openapi.json', new Set(['GET'])],
  ['/openapi.yaml', new Set(['GET'])],
  ['/mcp', new Set(['GET', 'POST'])],
  ['/oauth/authorize', new Set(['GET', 'POST'])],
  ['/oauth/consent', new Set(['GET'])],
  ['/oauth/register', new Set(['POST'])],
  ['/oauth/token', new Set(['POST'])],
  ['/oauth/revoke', new Set(['POST'])],
]);

function getMcpAllowedMethods(pathname) {
  return MCP_ROUTES.get(pathname) || (/^\/tools\/[a-zA-Z0-9_]+$/.test(pathname) ? new Set(['POST']) : null);
}

function isMcpPathCandidate(pathname) {
  return pathname === '/mcp'
    || pathname.startsWith('/oauth/')
    || pathname.startsWith('/.well-known/oauth-')
    || pathname.startsWith('/.well-known/openid-')
    || pathname.startsWith('/.well-known/ai-plugin')
    || pathname === '/.well-known/plugin.json'
    || pathname === '/ai-plugin.json'
    || pathname === '/plugin.json'
    || pathname === '/openapi.json'
    || pathname === '/openapi.yaml'
    || pathname === '/tools'
    || pathname.startsWith('/tools/');
}

function isAllowedMcpOrigin(origin) {
  return !origin || MCP_ALLOWED_ORIGINS.has(origin);
}

function mcpCorsHeaders(request, allowedMethods = new Set(['GET', 'POST'])) {
  const origin = request.headers.get('origin');
  return {
    ...(origin && MCP_ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': [...new Set([...allowedMethods, 'OPTIONS'])].join(', '),
    'Access-Control-Allow-Headers': MCP_CORS_HEADERS,
    'Access-Control-Expose-Headers': MCP_CORS_EXPOSE_HEADERS,
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

async function getMcpRateLimitKey(request, clientIp) {
  const authorization = request.headers.get('authorization')?.trim();
  if (!authorization) return `mcp:ip:${clientIp}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(authorization));
  const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `mcp:credential:${fingerprint}`;
}

const ALLOWED_ROUTES = new Map([
  [GALLERY_MEDIA_PATH, new Set(['GET', 'HEAD'])],
  ['/api/alexa', new Set(['POST'])],
  [AI_CHAT_PATH, new Set(['POST'])],
  ['/api/mcp-admin', new Set(['POST'])],
  ['/api/communications-admin', new Set(['POST'])],
  ['/api/public-catalog-products', new Set(['GET', 'HEAD'])],
  ['/api/public-catalog-order', new Set(['POST'])],
  ['/api/public-order-tracking', new Set(['GET', 'HEAD'])],
  ['/api/order-tracking', new Set(['POST'])],
]);

function isAllowedGalleryOrigin(origin) {
  if (typeof origin !== 'string' || !origin) return false;
  try {
    const url = new URL(origin);
    return (url.protocol === 'https:' && (
      url.hostname === 'luisices.com.br'
      || url.hostname.endsWith('.luisices.com.br')
      || (url.hostname.endsWith('.vercel.app') && url.hostname.includes('luisices'))
    )) || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
  } catch {
    return false;
  }
}

function galleryCorsHeaders(request) {
  const origin = request.headers.get('origin');
  return {
    ...(isAllowedGalleryOrigin(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': GALLERY_CORS_METHODS,
    'Access-Control-Allow-Headers': GALLERY_CORS_HEADERS,
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function jsonError(status, code, message, corsHeaders = CORS_HEADERS) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function readBodyUpToLimit(request, limit) {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel('Request body exceeds the configured gateway limit.');
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isGalleryMedia = url.pathname === GALLERY_MEDIA_PATH;
    const isMcpPath = isMcpPathCandidate(url.pathname);
    const mcpAllowedMethods = isMcpPath ? getMcpAllowedMethods(url.pathname) : null;
    const isMcpRoute = Boolean(mcpAllowedMethods);

    if (request.method === 'OPTIONS') {
      if (isMcpPath) {
        if (url.hostname !== API_BETA_HOST || !isMcpRoute) {
          return jsonError(404, 'not-found', 'Rota não encontrada.', mcpCorsHeaders(request));
        }
        if (!isAllowedMcpOrigin(request.headers.get('origin'))) {
          return jsonError(403, 'origin-not-allowed', 'Origem não permitida.', mcpCorsHeaders(request, mcpAllowedMethods));
        }
        const requestedMethod = request.headers.get('access-control-request-method')?.toUpperCase();
        if (requestedMethod && !mcpAllowedMethods.has(requestedMethod)) {
          return jsonError(405, 'method-not-allowed', 'Método não permitido.', mcpCorsHeaders(request, mcpAllowedMethods));
        }
        return new Response(null, { status: 204, headers: mcpCorsHeaders(request, mcpAllowedMethods) });
      }
      if (isGalleryMedia) {
        if (url.hostname !== API_BETA_HOST) {
          return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store', 'Vary': 'Origin' } });
        }
        if (!isAllowedGalleryOrigin(request.headers.get('origin'))) {
          return new Response(null, { status: 403, headers: { 'Cache-Control': 'no-store', 'Vary': 'Origin' } });
        }
        return new Response(null, { status: 204, headers: galleryCorsHeaders(request) });
      }
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const corsHeaders = isGalleryMedia
      ? galleryCorsHeaders(request)
      : isMcpPath ? mcpCorsHeaders(request, mcpAllowedMethods || new Set(['GET', 'POST'])) : CORS_HEADERS;
    if (url.hostname !== 'api.beta.luisices.com.br') {
      return jsonError(404, 'not-found', 'Rota não encontrada.', corsHeaders);
    }

    if (isMcpPath && !isAllowedMcpOrigin(request.headers.get('origin'))) {
      return jsonError(403, 'origin-not-allowed', 'Origem não permitida.', corsHeaders);
    }

    const allowedMethods = isMcpRoute ? mcpAllowedMethods : ALLOWED_ROUTES.get(url.pathname);
    if (!allowedMethods) return jsonError(404, 'not-found', 'Rota não encontrada.', corsHeaders);
    if (!allowedMethods.has(request.method)) {
      return jsonError(405, 'method-not-allowed', 'Método não permitido.', corsHeaders);
    }

    const originSecret = typeof env.BETA_VERCEL_ORIGIN_SECRET === 'string'
      ? env.BETA_VERCEL_ORIGIN_SECRET.trim()
      : '';
    if (!originSecret) {
      return jsonError(503, 'unavailable', 'Serviço temporariamente indisponível.', corsHeaders);
    }

    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
    const limiter = isGalleryMedia
      ? env.BETA_VERCEL_GALLERY_LIMITER
      : isMcpRoute ? env.BETA_VERCEL_MCP_LIMITER : env.BETA_VERCEL_API_LIMITER;
    if (isMcpRoute && !limiter) {
      return jsonError(503, 'unavailable', 'Proteção de tráfego MCP indisponível.', corsHeaders);
    }
    if (limiter) {
      const key = isMcpRoute
        ? await getMcpRateLimitKey(request, clientIp)
        : `${url.pathname}:${clientIp}`;
      const { success } = await limiter.limit({ key });
      if (!success) {
        console.warn('rate_limit_triggered', {
          path: url.pathname,
          environment: env.ENVIRONMENT || 'unknown',
        });
        return jsonError(
          429,
          'resource-exhausted',
          'Muitas requisições. Aguarde um pouco e tente novamente.',
          corsHeaders,
        );
      }
    }

    const upstreamUrl = new URL(url.pathname + url.search, 'https://beta.luisices.com.br');
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.set('x-beta-edge-secret', originSecret);
    headers.set('x-forwarded-host', url.hostname);
    headers.set('x-forwarded-proto', 'https');
    if (clientIp !== 'unknown') headers.set('x-forwarded-for', clientIp);

    let body;
    if (!['GET', 'HEAD'].includes(request.method)) {
      if (isMcpRoute) {
        const declaredLength = Number(request.headers.get('content-length'));
        if (Number.isFinite(declaredLength) && declaredLength > MCP_BODY_LIMIT) {
          return jsonError(413, 'mcp-payload-too-large', 'O corpo da solicitação MCP excede 64 KiB.', corsHeaders);
        }
        body = await readBodyUpToLimit(request, MCP_BODY_LIMIT);
        if (body === null) {
          return jsonError(413, 'mcp-payload-too-large', 'O corpo da solicitação MCP excede 64 KiB.', corsHeaders);
        }
      } else if (url.pathname === AI_CHAT_PATH) {
        const declaredLength = Number(request.headers.get('content-length'));
        if (Number.isFinite(declaredLength) && declaredLength > AI_CHAT_VERCEL_BODY_LIMIT) {
          return jsonError(
            413,
            'vercel-payload-too-large',
            'A solicitação excede o limite de 4 MiB do gateway Vercel.',
            corsHeaders,
          );
        }
        body = await readBodyUpToLimit(request, AI_CHAT_VERCEL_BODY_LIMIT);
        if (body === null) {
          return jsonError(
            413,
            'vercel-payload-too-large',
            'A solicitação excede o limite de 4 MiB do gateway Vercel.',
            corsHeaders,
          );
        }
      } else {
        body = await request.arrayBuffer();
      }
    }

    try {
      const upstream = await fetch(upstreamUrl, {
        method: request.method,
        headers,
        body,
        redirect: 'manual',
      });
      const responseHeaders = new Headers(upstream.headers);
      if (isGalleryMedia) {
        // Preserve the gallery's origin allowlist; never broaden it to wildcard CORS.
        responseHeaders.delete('Access-Control-Allow-Origin');
        for (const [name, value] of Object.entries(corsHeaders)) responseHeaders.set(name, value);
        responseHeaders.set('Cache-Control', 'private, no-store');
        responseHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
      } else {
        for (const [name, value] of Object.entries(corsHeaders)) responseHeaders.set(name, value);
        responseHeaders.set('Cache-Control', 'no-store');
      }
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error('beta_vercel_api_proxy_failed', {
        path: url.pathname,
        message: error?.message,
      });
      return jsonError(502, 'unavailable', 'Serviço temporariamente indisponível.', corsHeaders);
    }
  },
};

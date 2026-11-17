const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, X-Requested-With, sentry-trace, baggage',
  'Access-Control-Max-Age': '86400',
};
const API_BETA_HOST = 'api.beta.luisices.com.br';
const GALLERY_MEDIA_PATH = '/api/gallery-media';
const GALLERY_CORS_METHODS = 'GET, HEAD, OPTIONS';
const GALLERY_CORS_HEADERS = 'Authorization, Content-Type, x-origin-secret, x-cf-origin-token';

const ALLOWED_ROUTES = new Map([
  [GALLERY_MEDIA_PATH, new Set(['GET', 'HEAD'])],
  ['/api/alexa', new Set(['POST'])],
  ['/api/mcp-admin', new Set(['POST'])],
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isGalleryMedia = url.pathname === GALLERY_MEDIA_PATH;

    if (request.method === 'OPTIONS') {
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

    const corsHeaders = isGalleryMedia ? galleryCorsHeaders(request) : CORS_HEADERS;
    if (url.hostname !== 'api.beta.luisices.com.br') {
      return jsonError(404, 'not-found', 'Rota não encontrada.', corsHeaders);
    }

    const allowedMethods = ALLOWED_ROUTES.get(url.pathname);
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
    const limiter = isGalleryMedia ? env.BETA_VERCEL_GALLERY_LIMITER : env.BETA_VERCEL_API_LIMITER;
    if (limiter) {
      const { success } = await limiter.limit({ key: `${url.pathname}:${clientIp}` });
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
    if (!['GET', 'HEAD'].includes(request.method)) body = await request.arrayBuffer();

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
        for (const [name, value] of Object.entries(CORS_HEADERS)) responseHeaders.set(name, value);
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

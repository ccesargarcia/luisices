const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, X-Requested-With, sentry-trace, baggage',
  'Access-Control-Max-Age': '86400',
};

const ALLOWED_ROUTES = new Map([
  ['/api/public-catalog-order', new Set(['POST'])],
  ['/api/public-order-tracking', new Set(['GET', 'HEAD'])],
  ['/api/order-tracking', new Set(['POST'])],
]);

function jsonError(status, code, message) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    if (url.hostname !== 'api.beta.luisices.com.br') {
      return jsonError(404, 'not-found', 'Rota não encontrada.');
    }

    const allowedMethods = ALLOWED_ROUTES.get(url.pathname);
    if (!allowedMethods) return jsonError(404, 'not-found', 'Rota não encontrada.');
    if (!allowedMethods.has(request.method)) return jsonError(405, 'method-not-allowed', 'Método não permitido.');

    const originSecret = typeof env.BETA_VERCEL_ORIGIN_SECRET === 'string'
      ? env.BETA_VERCEL_ORIGIN_SECRET.trim()
      : '';
    if (!originSecret) return jsonError(503, 'unavailable', 'Serviço temporariamente indisponível.');

    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
    if (env.BETA_VERCEL_API_LIMITER) {
      const { success } = await env.BETA_VERCEL_API_LIMITER.limit({ key: `${url.pathname}:${clientIp}` });
      if (!success) {
        console.warn('rate_limit_triggered', {
          path: url.pathname,
          environment: env.ENVIRONMENT || 'unknown',
        });
        return jsonError(429, 'resource-exhausted', 'Muitas requisições. Aguarde um pouco e tente novamente.');
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
      for (const [name, value] of Object.entries(CORS_HEADERS)) responseHeaders.set(name, value);
      responseHeaders.set('Cache-Control', 'no-store');
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
      return jsonError(502, 'unavailable', 'Serviço temporariamente indisponível.');
    }
  },
};

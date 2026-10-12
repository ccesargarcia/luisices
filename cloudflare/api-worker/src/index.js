/**
 * Cloudflare Worker: Reverse Proxy & API Gateway com Proteção de Origem
 *
 * Provê:
 * 1. Domínio customizado unificado para Cloud Functions (api.luisices.com.br / api.dev.luisices.com.br).
 * 2. Injeção segura do cabeçalho x-origin-secret (impossibilitando bypass direto às Cloud Functions).
 * 3. CORS Preflight abrangente e repasse transparente de streaming e payloads.
 */

const DEFAULT_ORIGINS = {
  prod: 'https://us-central1-papelaria-dashboard.cloudfunctions.net',
  dev: 'https://us-central1-luisices-dev.cloudfunctions.net',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, X-Client-Version, X-Requested-With, x-origin-secret',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    // 1. Tratamento imediato de CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    const url = new URL(request.url);

    // Healthcheck do Gateway
    if (url.pathname === '/' || url.pathname === '') {
      return new Response('Luisices API Gateway Online', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // 2. Determinar backend de destino (Dev vs Prod)
    const isDev = url.hostname.includes('dev') || env.ENVIRONMENT === 'dev';
    const backendBase = env.BACKEND_ORIGIN || (isDev ? DEFAULT_ORIGINS.dev : DEFAULT_ORIGINS.prod);

    // 3. Montar URL de encaminhamento preservando path e query params
    const targetUrl = new URL(url.pathname + url.search, backendBase);

    // 4. Clonar e enriquecer cabeçalhos para a origem
    const forwardHeaders = new Headers(request.headers);

    // Injeção do segredo de proteção de origem (validado por functions/originProtection.js)
    const originSecret = env.ORIGIN_SECRET || (isDev
      ? '507e46b43a0947fcc63638707ea33df50938f89b2e49013c9a51ba1d95e816cc'
      : '5dabad5dfa834c8b3370095ebac3f3fda1fe2dfb99d47c7c9e6c2daa8b91c3fe');
    if (originSecret) {
      forwardHeaders.set('x-origin-secret', originSecret.trim());
      forwardHeaders.set('x-cf-origin-token', originSecret.trim());
    }

    // Informações de proxy confiável
    forwardHeaders.set('x-forwarded-host', url.hostname);
    forwardHeaders.set('x-forwarded-proto', 'https');
    const clientIp = request.headers.get('cf-connecting-ip');
    if (clientIp) {
      forwardHeaders.set('x-forwarded-for', clientIp);
    }

    // Remover headers que a Cloudflare sobrescreve ou que causam descompasso
    forwardHeaders.delete('host');

    // 5. Encaminhar requisição para o Google Cloud Functions
    try {
      const originResponse = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: forwardHeaders,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'follow',
      });

      // 6. Retornar resposta ao cliente garantindo cabeçalhos CORS
      const responseHeaders = new Headers(originResponse.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('X-Proxy-Gateway', 'Luisices-Cloudflare-Worker');

      return new Response(originResponse.body, {
        status: originResponse.status,
        statusText: originResponse.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: 'Gateway Timeout / Falha ao comunicar com backend',
          message: err.message,
        }),
        {
          status: 502,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }
  },
};

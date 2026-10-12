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

    // Manifesto de Plugin OpenAI (/.well-known/ai-plugin.json, /ai-plugin.json, /plugin.json)
    if (
      url.pathname === '/.well-known/ai-plugin.json' ||
      url.pathname === '/ai-plugin.json' ||
      url.pathname === '/.well-known/plugin.json' ||
      url.pathname === '/plugin.json'
    ) {
      const isDev = url.hostname.includes('dev') || env.ENVIRONMENT === 'dev';
      const openApiUrl = `https://${url.hostname}/chatGptToolsEndpoint/openapi.json`;
      const manifest = {
        schema_version: 'v1',
        name_for_human: isDev ? 'Luisices Dev' : 'Luisices Ateliê',
        name_for_model: 'luisices',
        description_for_human: 'Consulta pedidos, fila de produção, clientes e orçamentos do Ateliê Luisices.',
        description_for_model: 'Ferramentas do sistema Luisices para consultar pedidos por status/data, detalhes de clientes, resumo operacional e calcular precificação.',
        auth: {
          type: 'user_http',
          authorization_type: 'bearer',
        },
        api: {
          type: 'openapi',
          url: openApiUrl,
          is_user_authenticated: false,
        },
        logo_url: `https://${url.hostname}/favicon.ico`,
        contact_email: 'contato@luisices.com.br',
        legal_info_url: 'https://luisices.com.br',
      };
      return new Response(JSON.stringify(manifest, null, 2), {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    }

    // 2. Determinar backend de destino (Dev vs Prod)
    const isDev = url.hostname.includes('dev') || env.ENVIRONMENT === 'dev';
    const backendBase = env.BACKEND_ORIGIN || (isDev ? DEFAULT_ORIGINS.dev : DEFAULT_ORIGINS.prod);

    // 3. Montar URL de encaminhamento preservando path e query params
    let targetPath = url.pathname;
    if (
      targetPath === '/openapi.json' ||
      targetPath === '/openapi.yaml' ||
      targetPath === '/schema' ||
      targetPath.startsWith('/tools/') ||
      targetPath === '/health'
    ) {
      targetPath = `/chatGptToolsEndpoint${targetPath}`;
    }
    const targetUrl = new URL(targetPath + url.search, backendBase);

    // 4. Clonar e enriquecer cabeçalhos para a origem
    const forwardHeaders = new Headers(request.headers);

    // Injeção do segredo de proteção de origem (validado por functions/originProtection.js)
    const originSecret = env.ORIGIN_SECRET ? env.ORIGIN_SECRET.trim() : '';
    if (originSecret) {
      forwardHeaders.set('x-origin-secret', originSecret);
      forwardHeaders.set('x-cf-origin-token', originSecret);
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

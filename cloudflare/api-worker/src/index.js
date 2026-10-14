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

    // Healthcheck do Gateway (apenas para GET e HEAD)
    if ((url.pathname === '/' || url.pathname === '') && (request.method === 'GET' || request.method === 'HEAD')) {
      return new Response('Luisices API Gateway Online', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Favicon Ícone
    if (url.pathname === '/favicon.ico') {
      const isDev = url.hostname.includes('dev') || env.ENVIRONMENT === 'dev';
      const appHost = isDev ? 'dev.luisices.com.br' : 'luisices.com.br';
      return Response.redirect(`https://${appHost}/favicon.ico`, 302);
    }

    // Manifesto de Plugin OpenAI (/.well-known/ai-plugin.json, /ai-plugin.json, /plugin.json)
    if (
      url.pathname === '/.well-known/ai-plugin.json' ||
      url.pathname === '/ai-plugin.json' ||
      url.pathname === '/.well-known/plugin.json' ||
      url.pathname === '/plugin.json'
    ) {
      const cache = typeof caches !== 'undefined' && caches?.default ? caches.default : null;
      const cacheKey = new Request(url.toString(), { method: 'GET' });
      if (cache) {
        try {
          const cachedResponse = await cache.match(cacheKey);
          if (cachedResponse) {
            const cachedHeaders = new Headers(cachedResponse.headers);
            cachedHeaders.set('X-Edge-Cache', 'HIT');
            return new Response(cachedResponse.body, {
              status: cachedResponse.status,
              statusText: cachedResponse.statusText,
              headers: cachedHeaders,
            });
          }
        } catch (_err) {
          // Fallback silencioso
        }
      }

      const isDev = url.hostname.includes('dev') || env.ENVIRONMENT === 'dev';
      const openApiUrl = `https://${url.hostname}/chatGptToolsEndpoint/openapi.json`;
      const manifest = {
        schema_version: 'v1',
        name_for_human: isDev ? 'Luisices Dev' : 'Luisices Ateliê',
        name_for_model: 'luisices',
        description_for_human: 'Consulta pedidos, fila de produção, clientes e orçamentos do Ateliê Luisices.',
        description_for_model: 'Ferramentas do sistema Luisices para consultar pedidos por status/data, detalhes de clientes, resumo operacional e calcular precificação.',
        auth: {
          type: 'oauth',
          client_url: `https://${url.hostname}/oauth/authorize`,
          scope: 'orders:read orders:draft orders:create orders:update customers:read customers:create customers:update payments:read payments:write financial:read team:read pricing:estimate whatsapp:compose gallery:read',
          authorization_url: `https://${url.hostname}/oauth/token`,
          authorization_content_type: 'application/x-www-form-urlencoded',
          verification_tokens: {},
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
      const manifestHeaders = {
        ...CORS_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=86400, max-age=60',
        'X-Edge-Cache': 'MISS',
      };
      const response = new Response(JSON.stringify(manifest, null, 2), {
        status: 200,
        headers: manifestHeaders,
      });
      if (cache && ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil(cache.put(cacheKey, response.clone()).catch(() => {}));
      }
      return response;
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
      targetPath === '/health' ||
      targetPath === '/mcp' ||
      targetPath === '/rpc' ||
      targetPath === '/sse' ||
      targetPath === '/.well-known/oauth-protected-resource' ||
      targetPath === '/.well-known/oauth-authorization-server' ||
      targetPath === '/.well-known/openid-configuration' ||
      targetPath.startsWith('/oauth/') ||
      targetPath === '/authorize' ||
      targetPath === '/token' ||
      targetPath === '/register' ||
      (request.method === 'POST' && (targetPath === '/' || targetPath === ''))
    ) {
      if (targetPath === '/mcp' || targetPath === '/rpc' || targetPath === '/sse' || targetPath === '/' || targetPath === '') {
        targetPath = '/chatGptToolsEndpoint';
      } else {
        targetPath = `/chatGptToolsEndpoint${targetPath}`;
      }
    }
    const targetUrl = new URL(targetPath + url.search, backendBase);

    // 4. Clonar e enriquecer cabeçalhos para a origem
    const forwardHeaders = new Headers(request.headers);

    // Assegurar User-Agent válido caso o cliente MCP envie sem User-Agent
    if (!forwardHeaders.has('User-Agent') || !forwardHeaders.get('User-Agent')) {
      forwardHeaders.set('User-Agent', 'Luisices-Api-Gateway/1.0 (Cloudflare Worker; MCP Client)');
    }

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
      // Lê o corpo da requisição em ArrayBuffer para evitar o erro "one-time-use body"
      // em caso de retransmissão por redirecionamento no backend Cloud Functions.
      let requestBody = undefined;
      if (!['GET', 'HEAD'].includes(request.method)) {
        requestBody = await request.arrayBuffer();
      }

      const isCacheableMetadata =
        request.method === 'GET' &&
        (
          url.pathname === '/openapi.json' ||
          url.pathname === '/openapi.yaml' ||
          url.pathname === '/schema' ||
          url.pathname === '/.well-known/oauth-protected-resource' ||
          url.pathname === '/.well-known/oauth-authorization-server' ||
          url.pathname === '/.well-known/openid-configuration'
        ) &&
        !request.headers.has('Authorization');

      // 5.1 Se for rota de metadado cacheável, tenta servir do cache da borda da Cloudflare
      const cache = typeof caches !== 'undefined' && caches?.default ? caches.default : null;
      const cacheKey = new Request(url.toString(), { method: 'GET' });
      if (isCacheableMetadata && cache) {
        try {
          const cachedResponse = await cache.match(cacheKey);
          if (cachedResponse) {
            const cachedHeaders = new Headers(cachedResponse.headers);
            cachedHeaders.set('X-Edge-Cache', 'HIT');
            return new Response(cachedResponse.body, {
              status: cachedResponse.status,
              statusText: cachedResponse.statusText,
              headers: cachedHeaders,
            });
          }
        } catch (_err) {
          // Fallback silencioso se o cache não estiver disponível
        }
      }

      const originResponse = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: forwardHeaders,
        body: requestBody,
        redirect: 'manual',
      });

      // 6. Retornar resposta ao cliente garantindo cabeçalhos CORS
      const responseHeaders = new Headers(originResponse.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('X-Proxy-Gateway', 'Luisices-Cloudflare-Worker');

      // Se a resposta for um redirecionamento HTTP (ex: 302, 303 no fluxo OAuth)
      // reescreve domínios internos para o domínio público da API caso necessário,
      // preservando destinos externos (ex: callback do ChatGPT).
      if (responseHeaders.has('location')) {
        let loc = responseHeaders.get('location');
        if (loc.includes('cloudfunctions.net') || loc.includes('run.app')) {
          loc = loc.replace(/^https?:\/\/[^\/]+(\/chatGptToolsEndpoint)?/, `https://${url.hostname}`);
          responseHeaders.set('location', loc);
        }
      }

      // 5.2 Se for rota de metadado cacheável e origin retornou 200, armazena no cache da borda
      if (isCacheableMetadata && originResponse.status === 200) {
        responseHeaders.set('Cache-Control', 'public, s-maxage=86400, max-age=60');
        responseHeaders.set('X-Edge-Cache', 'MISS');
        const edgeCachedResponse = new Response(originResponse.body, {
          status: originResponse.status,
          statusText: originResponse.statusText,
          headers: responseHeaders,
        });
        if (cache && ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(cache.put(cacheKey, edgeCachedResponse.clone()).catch(() => {}));
        }
        return edgeCachedResponse;
      }

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

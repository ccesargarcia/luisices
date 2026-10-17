/**
 * Cloudflare Worker: Multi-Environment CDN para Firebase Storage
 *
 * Provê:
 * 1. Domínio próprio com SSL gerenciado (cdn.luisices.com.br / cdn-dev.luisices.com.br).
 * 2. Edge Caching de alta performance com failover de buckets (.firebasestorage.app e .appspot.com).
 * 3. CORS universal e sanitização de cabeçalhos de segurança.
 */

const DEFAULT_BUCKETS = {
  prod: 'papelaria-dashboard.firebasestorage.app',
  dev: 'luisices-dev.firebasestorage.app',
};

const FALLBACK_BUCKETS = {
  prod: 'papelaria-dashboard.appspot.com',
  dev: 'luisices-dev.appspot.com',
};

export default {
  async fetch(request, env, ctx) {
    // 1. Suporte a CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);

    // Healthcheck simples na raiz
    if (url.pathname === '/' || url.pathname === '') {
      return new Response('CDN Storage Luisices Online', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // 2. Determinar ambiente e bucket de destino.
    // O domínio explícito da CDN deve prevalecer sobre vars que possam ter sido
    // herdadas/implantadas incorretamente no ambiente do Worker.
    const hostname = url.hostname.toLowerCase();
    const isDevHost = hostname === 'cdn-dev.luisices.com.br';
    const isProdHost = hostname === 'cdn.luisices.com.br';
    const isDev = isDevHost || (!isProdHost && env.ENVIRONMENT === 'dev');
    const primaryBucket = isDevHost
      ? DEFAULT_BUCKETS.dev
      : isProdHost
        ? DEFAULT_BUCKETS.prod
        : env.FIREBASE_BUCKET || (isDev ? DEFAULT_BUCKETS.dev : DEFAULT_BUCKETS.prod);
    const fallbackBucket = isDevHost
      ? FALLBACK_BUCKETS.dev
      : isProdHost
        ? FALLBACK_BUCKETS.prod
        : env.FIREBASE_FALLBACK_BUCKET || (isDev ? FALLBACK_BUCKETS.dev : FALLBACK_BUCKETS.prod);

    // 3. Extrair e codificar o caminho com segurança
    const rawPath = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    if (!rawPath) {
      return new Response('Not Found', { status: 404 });
    }
    const encodedPath = encodeURIComponent(rawPath);

    // 4. Parâmetros de consulta (preservando token caso exista)
    const searchParams = new URLSearchParams(url.search);
    if (!searchParams.has('alt')) {
      searchParams.set('alt', 'media');
    }

    // Cache TTL acompanha o domínio em ambientes conhecidos; variáveis podem
    // estar herdadas do ambiente errado. Hosts internos continuam configuráveis.
    const configuredCacheTtl = Number(env.CACHE_TTL);
    const defaultCacheTtl = isDev ? 300 : 31536000;
    const cacheTtlSeconds = isDevHost || isProdHost
      ? defaultCacheTtl
      : Number.isFinite(configuredCacheTtl) && configuredCacheTtl > 0
        ? configuredCacheTtl
        : defaultCacheTtl;

    const buildOriginUrl = (bucket) =>
      `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(rawPath)}?${searchParams.toString()}`;

    const fetchFromBucket = async (bucket) => {
      return fetch(buildOriginUrl(bucket), {
        // Firebase Storage pode retornar 404 para HEAD no endpoint de mídia.
        // Busca como GET e remove o corpo na resposta HEAD abaixo.
        method: request.method === 'HEAD' ? 'GET' : request.method,
        headers: {
          'Accept': request.headers.get('Accept') || '*/*',
          'User-Agent': 'Luisices-Cloudflare-CDN',
        },
        cf: {
          cacheEverything: true,
          cacheTtl: cacheTtlSeconds,
          cacheTtlByStatus: {
            '200-299': cacheTtlSeconds,
            '404': 30,
            '500-599': 0,
          },
        },
      });
    };

    // 5. Tenta o bucket primário
    let originBucket = primaryBucket;
    let originResponse = await fetchFromBucket(originBucket);

    // Se retornar 404 e houver bucket alternativo (.firebasestorage.app vs .appspot.com)
    if (originResponse.status === 404 && fallbackBucket && fallbackBucket !== primaryBucket) {
      const fallbackResponse = await fetchFromBucket(fallbackBucket);
      if (fallbackResponse.ok) {
        originResponse = fallbackResponse;
        originBucket = fallbackBucket;
      }
    }

    if (!originResponse.ok) {
      return new Response(request.method === 'HEAD' ? null : originResponse.body, {
        status: originResponse.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': originResponse.headers.get('Content-Type') || 'text/plain; charset=utf-8',
        },
      });
    }

    // 6. Resposta enriquecida com CORS e Headers de Cache de Borda
    const headers = new Headers(originResponse.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set(
      'Cache-Control',
      isDev
        ? 'public, max-age=300, stale-while-revalidate=60'
        : 'public, max-age=31536000, immutable'
    );
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-CDN-Origin-Bucket', originBucket);
    headers.delete('set-cookie');

    return new Response(request.method === 'HEAD' ? null : originResponse.body, {
      status: 200,
      headers,
    });
  },
};

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import betaWorker from '../../cloudflare/api-beta-worker/src/index.js';

const originSecret = 'beta-edge-test-secret';
const betaOrigin = 'https://beta.luisices.com.br';

describe('Cloudflare Worker API Beta isolado', () => {
  afterEach(() => vi.restoreAllMocks());

  it('encaminha a leitura do catálogo e injeta segredo sem perder a query', async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(
      Response.json({ products: [{ id: 'public-product' }] }, { headers: { 'x-upstream': 'vercel' } }),
    );
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/public-catalog-products?preview=1', {
        headers: { 'cf-connecting-ip': '203.0.113.8' },
      }),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ products: [{ id: 'public-product' }] });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
    const [targetUrl, options] = upstreamFetch.mock.calls[0];
    expect(targetUrl.toString()).toBe('https://beta.luisices.com.br/api/public-catalog-products?preview=1');
    expect(options.headers.get('x-beta-edge-secret')).toBe(originSecret);
    expect(options.headers.get('x-forwarded-for')).toBe('203.0.113.8');
  });

  it('rejeita método de escrita na rota somente de leitura sem consultar a origem', async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/public-catalog-products', { method: 'POST' }),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret },
    );

    expect(response.status).toBe(405);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('nega rotas desconhecidas e hostnames externos sem consultar a origem', async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal('fetch', upstreamFetch);

    const unknownPath = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/not-allowlisted'),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret },
    );
    const wrongHost = await betaWorker.fetch(
      new Request('https://api.dev.luisices.com.br/api/public-catalog-products'),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret },
    );

    expect(unknownPath.status).toBe(404);
    expect(wrongHost.status).toBe(404);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('encaminha somente POST do MCP Admin, preservando bearer e body e aplicando o limite por rota', async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(Response.json({ success: true }));
    const limit = vi.fn().mockResolvedValue({ success: true });
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/mcp-admin', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer firebase-user-token',
          'Content-Type': 'application/json',
          'cf-connecting-ip': '203.0.113.10',
        },
        body: JSON.stringify({ action: 'getStatus' }),
      }),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret, BETA_VERCEL_API_LIMITER: { limit } },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(limit).toHaveBeenCalledWith({ key: '/api/mcp-admin:203.0.113.10' });
    const [targetUrl, options] = upstreamFetch.mock.calls[0];
    expect(targetUrl.toString()).toBe('https://beta.luisices.com.br/api/mcp-admin');
    expect(options.method).toBe('POST');
    expect(options.headers.get('Authorization')).toBe('Bearer firebase-user-token');
    expect(options.headers.get('x-beta-edge-secret')).toBe(originSecret);
    expect(new TextDecoder().decode(options.body)).toBe(JSON.stringify({ action: 'getStatus' }));
  });

  it('encaminha POST MCP pelo binding dedicado, preservando protocolo e limitando por hash do bearer', async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-MCP-Trace-Id': 'trace-1' },
    }));
    const mcpLimit = vi.fn().mockResolvedValue({ success: true });
    const apiLimit = vi.fn();
    vi.stubGlobal('fetch', upstreamFetch);
    const authorization = 'Bearer oauth-token-for-test';
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' });

    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/mcp?source=chatgpt', {
        method: 'POST',
        headers: {
          Authorization: authorization,
          Accept: 'application/json, text/event-stream',
          'MCP-Protocol-Version': '2025-11-25',
          'Content-Type': 'application/json',
          Origin: betaOrigin,
          'cf-connecting-ip': '203.0.113.21',
        },
        body,
      }),
      {
        BETA_VERCEL_ORIGIN_SECRET: originSecret,
        BETA_VERCEL_MCP_LIMITER: { limit: mcpLimit },
        BETA_VERCEL_API_LIMITER: { limit: apiLimit },
      },
    );

    const authFingerprint = createHash('sha256').update(authorization).digest('hex');
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(betaOrigin);
    expect(response.headers.get('X-MCP-Trace-Id')).toBe('trace-1');
    expect(mcpLimit).toHaveBeenCalledWith({ key: `mcp:credential:${authFingerprint}` });
    expect(apiLimit).not.toHaveBeenCalled();
    const [targetUrl, options] = upstreamFetch.mock.calls[0];
    expect(targetUrl.toString()).toBe(`${betaOrigin}/mcp?source=chatgpt`);
    expect(options.headers.get('Authorization')).toBe(authorization);
    expect(options.headers.get('Accept')).toBe('application/json, text/event-stream');
    expect(options.headers.get('MCP-Protocol-Version')).toBe('2025-11-25');
    expect(options.headers.get('x-beta-edge-secret')).toBe(originSecret);
    expect(new TextDecoder().decode(options.body)).toBe(body);
  });

  it('preserva os aliases públicos legados dos manifestos MCP', async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(Response.json({ name: 'Luisices MCP' }));
    const mcpLimit = vi.fn().mockResolvedValue({ success: true });
    vi.stubGlobal('fetch', upstreamFetch);

    for (const path of ['/.well-known/ai-plugin.json', '/.well-known/plugin.json', '/ai-plugin.json', '/plugin.json']) {
      const response = await betaWorker.fetch(
        new Request(`https://api.beta.luisices.com.br${path}`),
        { BETA_VERCEL_ORIGIN_SECRET: originSecret, BETA_VERCEL_MCP_LIMITER: { limit: mcpLimit } },
      );
      expect(response.status, path).toBe(200);
    }

    expect(upstreamFetch).toHaveBeenCalledTimes(4);
  });

  it('usa o limite anônimo por IP e aceita somente o Origin do frontend Beta no MCP', async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(Response.json({ status: 'online' }));
    const mcpLimit = vi.fn().mockResolvedValue({ success: true });
    vi.stubGlobal('fetch', upstreamFetch);

    const allowed = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/mcp', {
        headers: { Origin: betaOrigin, 'cf-connecting-ip': '203.0.113.22' },
      }),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret, BETA_VERCEL_MCP_LIMITER: { limit: mcpLimit } },
    );
    const denied = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/mcp', {
        headers: { Origin: 'https://attacker.example', 'cf-connecting-ip': '203.0.113.22' },
      }),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret, BETA_VERCEL_MCP_LIMITER: { limit: mcpLimit } },
    );

    expect(allowed.status).toBe(200);
    expect(mcpLimit).toHaveBeenCalledWith({ key: 'mcp:ip:203.0.113.22' });
    expect(denied.status).toBe(403);
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
  });

  it('responde o preflight MCP somente para origem, método e headers permitidos', async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/mcp', {
        method: 'OPTIONS',
        headers: {
          Origin: betaOrigin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,content-type,mcp-protocol-version',
        },
      }),
      {},
    );
    const denied = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/mcp', {
        method: 'OPTIONS',
        headers: { Origin: 'https://attacker.example', 'Access-Control-Request-Method': 'POST' },
      }),
      {},
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(betaOrigin);
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('MCP-Protocol-Version');
    expect(response.headers.get('Access-Control-Expose-Headers')).toContain('WWW-Authenticate');
    expect(denied.status).toBe(403);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('rejeita payload MCP acima de 64 KiB e falha fechado sem binding dedicado', async () => {
    const upstreamFetch = vi.fn();
    const mcpLimit = vi.fn().mockResolvedValue({ success: true });
    vi.stubGlobal('fetch', upstreamFetch);
    const oversized = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'tools/call', payload: 'x'.repeat(64 * 1024) }),
      }),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret, BETA_VERCEL_MCP_LIMITER: { limit: mcpLimit } },
    );
    const unconfigured = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/mcp'),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret },
    );

    expect(oversized.status).toBe(413);
    expect(unconfigured.status).toBe(503);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('encaminha somente POST administrativo da Alexa pelo binding de APIs Beta', async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(Response.json({ success: true }));
    const limit = vi.fn().mockResolvedValue({ success: true });
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/alexa', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer firebase-user-token',
          'Content-Type': 'application/json',
          'cf-connecting-ip': '203.0.113.11',
        },
        body: JSON.stringify({ action: 'getStatus' }),
      }),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret, BETA_VERCEL_API_LIMITER: { limit } },
    );

    expect(response.status).toBe(200);
    expect(limit).toHaveBeenCalledWith({ key: '/api/alexa:203.0.113.11' });
    const [targetUrl, options] = upstreamFetch.mock.calls[0];
    expect(targetUrl.toString()).toBe('https://beta.luisices.com.br/api/alexa');
    expect(options.method).toBe('POST');
    expect(options.headers.get('Authorization')).toBe('Bearer firebase-user-token');
    expect(options.headers.get('x-beta-edge-secret')).toBe(originSecret);
    expect(new TextDecoder().decode(options.body)).toBe(JSON.stringify({ action: 'getStatus' }));
  });

  it('encaminha POST do Copiloto pelo gateway Beta e limita o corpo da Vercel', async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(Response.json({ success: true }));
    const limit = vi.fn().mockResolvedValue({ success: true });
    vi.stubGlobal('fetch', upstreamFetch);
    const payload = JSON.stringify({ message: 'Olá', history: [], image: null });

    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/ai-chat', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer firebase-user-token',
          'Content-Type': 'application/json',
          'cf-connecting-ip': '203.0.113.12',
        },
        body: payload,
      }),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret, BETA_VERCEL_API_LIMITER: { limit } },
    );

    expect(response.status).toBe(200);
    expect(limit).toHaveBeenCalledWith({ key: '/api/ai-chat:203.0.113.12' });
    const [targetUrl, options] = upstreamFetch.mock.calls[0];
    expect(targetUrl.toString()).toBe('https://beta.luisices.com.br/api/ai-chat');
    expect(options.headers.get('Authorization')).toBe('Bearer firebase-user-token');
    expect(options.headers.get('x-beta-edge-secret')).toBe(originSecret);
    expect(new TextDecoder().decode(options.body)).toBe(payload);
  });

  it('rejeita incrementalmente corpos do Copiloto acima de 4 MiB com código de fallback específico', async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal('fetch', upstreamFetch);
    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'x'.repeat(4 * 1024 * 1024) }),
      }),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret },
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ error: { code: 'vercel-payload-too-large' } });
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('nega métodos diferentes de POST em Alexa sem consultar a origem', async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/alexa', { method: 'GET' }),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret },
    );

    expect(response.status).toBe(405);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('retorna 429 no limite da rota Alexa antes de consultar a origem', async () => {
    const upstreamFetch = vi.fn();
    const limit = vi.fn().mockResolvedValue({ success: false });
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/alexa', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '203.0.113.11' },
        body: JSON.stringify({ action: 'getStatus' }),
      }),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret, BETA_VERCEL_API_LIMITER: { limit } },
    );

    expect(response.status).toBe(429);
    expect(limit).toHaveBeenCalledWith({ key: '/api/alexa:203.0.113.11' });
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('nega métodos diferentes de POST em MCP Admin sem consultar a origem', async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/mcp-admin', { method: 'GET' }),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret },
    );

    expect(response.status).toBe(405);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('responde o preflight de MCP Admin no gateway permitindo Authorization', async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/mcp-admin', {
        method: 'OPTIONS',
        headers: {
          Origin: betaOrigin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,content-type',
        },
      }),
      {},
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('retorna 429 no limite do MCP Admin antes de consultar a origem', async () => {
    const upstreamFetch = vi.fn();
    const limit = vi.fn().mockResolvedValue({ success: false });
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/mcp-admin', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '203.0.113.10' },
        body: JSON.stringify({ action: 'getStatus' }),
      }),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret, BETA_VERCEL_API_LIMITER: { limit } },
    );

    expect(response.status).toBe(429);
    expect(limit).toHaveBeenCalledWith({ key: '/api/mcp-admin:203.0.113.10' });
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('retorna indisponibilidade se o segredo de origem não estiver configurado', async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/public-catalog-products'),
      {},
    );

    expect(response.status).toBe(503);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('limita o catálogo e responde 429 quando o binding negar a chamada', async () => {
    const upstreamFetch = vi.fn();
    const limit = vi.fn().mockResolvedValue({ success: false });
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/public-catalog-products', {
        headers: { 'cf-connecting-ip': '203.0.113.8' },
      }),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret, BETA_VERCEL_API_LIMITER: { limit } },
    );

    expect(response.status).toBe(429);
    expect(limit).toHaveBeenCalledWith({ key: '/api/public-catalog-products:203.0.113.8' });
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('retorna 502 de forma segura quando a origem não responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('upstream unavailable')));

    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/public-catalog-products'),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret },
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: { code: 'unavailable' } });
  });

  it('faz preflight da galeria somente para origens permitidas e sem wildcard', async () => {
    const allowed = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/gallery-media?itemId=item_1', {
        method: 'OPTIONS',
        headers: {
          Origin: betaOrigin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'authorization',
        },
      }),
      {},
    );
    const denied = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/gallery-media', {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' },
      }),
      {},
    );

    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe(betaOrigin);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
    expect(allowed.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    expect(allowed.headers.get('Vary')).toBe('Origin');
    expect(denied.status).toBe(403);
    expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('encaminha stream privado da galeria sem wildcard CORS e preservando autorização e query', async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(new Response('private-image-stream', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': 'image/webp',
        'Content-Length': '20',
      },
    }));
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/gallery-media?itemId=item_1&path=users%2Fu1%2Fgallery%2Fa.webp', {
        headers: {
          Origin: betaOrigin,
          Authorization: 'Bearer firebase-user-token',
          'cf-connecting-ip': '203.0.113.9',
        },
      }),
      { BETA_VERCEL_ORIGIN_SECRET: originSecret },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(betaOrigin);
    expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe('cross-origin');
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect(await response.text()).toBe('private-image-stream');

    const [targetUrl, options] = upstreamFetch.mock.calls[0];
    expect(targetUrl.toString()).toBe(
      'https://beta.luisices.com.br/api/gallery-media?itemId=item_1&path=users%2Fu1%2Fgallery%2Fa.webp',
    );
    expect(options.headers.get('Authorization')).toBe('Bearer firebase-user-token');
    expect(options.headers.get('x-beta-edge-secret')).toBe(originSecret);
  });

  it('usa limitador independente para a galeria e mantém CORS restrito no 429', async () => {
    const upstreamFetch = vi.fn();
    const galleryLimit = vi.fn().mockResolvedValue({ success: false });
    const orderLimit = vi.fn();
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await betaWorker.fetch(
      new Request('https://api.beta.luisices.com.br/api/gallery-media?itemId=item_1', {
        headers: { Origin: betaOrigin, 'cf-connecting-ip': '203.0.113.9' },
      }),
      {
        BETA_VERCEL_ORIGIN_SECRET: originSecret,
        BETA_VERCEL_GALLERY_LIMITER: { limit: galleryLimit },
        BETA_VERCEL_API_LIMITER: { limit: orderLimit },
      },
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(betaOrigin);
    expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
    expect(galleryLimit).toHaveBeenCalledWith({ key: '/api/gallery-media:203.0.113.9' });
    expect(orderLimit).not.toHaveBeenCalled();
    expect(upstreamFetch).not.toHaveBeenCalled();
  });
});

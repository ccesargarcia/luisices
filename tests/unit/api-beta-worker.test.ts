import { afterEach, describe, expect, it, vi } from 'vitest';
import betaWorker from '../../cloudflare/api-beta-worker/src/index.js';

const originSecret = 'beta-edge-test-secret';

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
      new Request('https://api.beta.luisices.com.br/api/mcp-admin'),
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
});

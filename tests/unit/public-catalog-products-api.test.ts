import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/public-catalog-products';

const originalOriginSecret = process.env.BETA_VERCEL_ORIGIN_SECRET;

function createResponse() {
  const state: { statusCode?: number; body?: unknown; headers: Record<string, string> } = { headers: {} };
  const response = {
    setHeader(name: string, value: string) {
      state.headers[name] = value;
    },
    status(statusCode: number) {
      state.statusCode = statusCode;
      return {
        json(body: unknown) { state.body = body; },
        send(body: string) { state.body = body; },
      };
    },
  };
  return { state, response };
}

describe('Vercel public catalog products API edge-origin gate', () => {
  afterEach(() => {
    if (originalOriginSecret === undefined) delete process.env.BETA_VERCEL_ORIGIN_SECRET;
    else process.env.BETA_VERCEL_ORIGIN_SECRET = originalOriginSecret;
    vi.restoreAllMocks();
  });

  it('rejects direct requests before initializing Firebase Admin when the secret is missing', async () => {
    delete process.env.BETA_VERCEL_ORIGIN_SECRET;
    const { state, response } = createResponse();

    await handler({ method: 'GET', headers: {} }, response);

    expect(state.statusCode).toBe(403);
    expect(state.body).toMatchObject({ error: { code: 'permission-denied' } });
    expect(state.headers['Cache-Control']).toBe('no-store');
  });

  it('rejects an incorrect edge secret before initializing Firebase Admin', async () => {
    process.env.BETA_VERCEL_ORIGIN_SECRET = 'configured-origin-secret';
    const { state, response } = createResponse();

    await handler({ method: 'GET', headers: { 'x-beta-edge-secret': 'incorrect-secret' } }, response);

    expect(state.statusCode).toBe(403);
    expect(state.body).toMatchObject({ error: { code: 'permission-denied' } });
  });
});

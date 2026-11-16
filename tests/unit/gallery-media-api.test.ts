import { afterEach, describe, expect, it } from 'vitest';
import handler from '../../api/gallery-media';

const originalOriginSecret = process.env.BETA_VERCEL_ORIGIN_SECRET;

function createResponse() {
  const state: { statusCode?: number; body?: string; headers: Record<string, string> } = { headers: {} };
  const response = {
    setHeader(name: string, value: string) {
      state.headers[name] = value;
    },
    status(statusCode: number) {
      state.statusCode = statusCode;
      return { send(body: string) { state.body = body; } };
    },
  };
  return { state, response };
}

describe('Vercel gallery media API edge-origin gate', () => {
  afterEach(() => {
    if (originalOriginSecret === undefined) delete process.env.BETA_VERCEL_ORIGIN_SECRET;
    else process.env.BETA_VERCEL_ORIGIN_SECRET = originalOriginSecret;
  });

  it('rejects direct calls without the edge secret before initializing Firebase Admin', async () => {
    delete process.env.BETA_VERCEL_ORIGIN_SECRET;
    const { state, response } = createResponse();

    await handler({ method: 'GET', headers: {}, query: { itemId: 'item_1' } }, response);

    expect(state.statusCode).toBe(403);
    expect(state.body).toContain('Origem não autorizada');
    expect(state.headers['Cache-Control']).toBe('private, no-store');
  });

  it('rejects an incorrect edge secret before initializing Firebase Admin', async () => {
    process.env.BETA_VERCEL_ORIGIN_SECRET = 'configured-origin-secret';
    const { state, response } = createResponse();

    await handler({
      method: 'GET',
      headers: { 'x-beta-edge-secret': 'incorrect-secret' },
      query: { itemId: 'item_1' },
    }, response);

    expect(state.statusCode).toBe(403);
    expect(state.body).toContain('Origem não autorizada');
  });
});

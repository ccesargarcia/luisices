import { afterEach, describe, expect, it } from 'vitest';
import handler from '../../api/ai-chat';

const originalOriginSecret = process.env.BETA_VERCEL_ORIGIN_SECRET;

function createResponse() {
  const state: { statusCode?: number; body?: unknown; headers: Record<string, string> } = { headers: {} };
  const response = {
    setHeader(name: string, value: string) { state.headers[name] = value; },
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

describe('Vercel AI chat API edge-origin gate', () => {
  afterEach(() => {
    if (originalOriginSecret === undefined) delete process.env.BETA_VERCEL_ORIGIN_SECRET;
    else process.env.BETA_VERCEL_ORIGIN_SECRET = originalOriginSecret;
  });

  it('rejects direct requests and preflights before handling their method', async () => {
    process.env.BETA_VERCEL_ORIGIN_SECRET = 'configured-origin-secret';
    for (const method of ['POST', 'OPTIONS']) {
      const { state, response } = createResponse();
      await handler({ method, headers: {} }, response);
      expect(state.statusCode).toBe(403);
      expect(state.body).toMatchObject({ error: { code: 'permission-denied' } });
    }
  });

  it('allows the method check after a valid edge secret without initializing Firebase', async () => {
    process.env.BETA_VERCEL_ORIGIN_SECRET = 'configured-origin-secret';
    const { state, response } = createResponse();
    await handler({ method: 'GET', headers: { 'x-beta-edge-secret': 'configured-origin-secret' } }, response);
    expect(state.statusCode).toBe(405);
  });
});

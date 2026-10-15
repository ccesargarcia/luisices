import { afterEach, describe, expect, it, vi } from 'vitest';

const sentry = vi.hoisted(() => ({
  getTraceData: vi.fn(() => ({
    'sentry-trace': '1234567890abcdef1234567890abcdef-1234567890123456-1',
    baggage: 'sentry-org_id=123456',
  })),
}));
vi.mock('@sentry/cloudflare', () => ({ withSentry: (_config: unknown, handler: unknown) => handler, captureException: vi.fn(), getTraceData: sentry.getTraceData }));
import apiWorker from '../../cloudflare/api-worker/src/index.js';

afterEach(() => vi.unstubAllGlobals());

describe('MCP gateway trace propagation', () => {
  it('passes gateway trace headers to Functions and exposes the returned correlation ID', async () => {
    const fetch = vi.fn(async () => new Response('{}', { headers: { 'X-MCP-Trace-Id': '1234567890abcdef1234567890abcdef' } }));
    vi.stubGlobal('fetch', fetch);
    const req = new Request('https://api.dev.luisices.com.br/chatGptToolsEndpoint', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    });
    const res = await apiWorker.fetch(req, { ENVIRONMENT: 'dev', ORIGIN_SECRET: 'synthetic-origin-secret' }, {});
    const headers = (fetch.mock.calls[0] as any)[1].headers as Headers;
    expect(headers.get('sentry-trace')).toBe(sentry.getTraceData()['sentry-trace']);
    expect(headers.get('baggage')).toBe('sentry-org_id=123456');
    expect(res.headers.get('X-MCP-Trace-Id')).toBe('1234567890abcdef1234567890abcdef');
    expect(res.headers.get('Access-Control-Expose-Headers')).toContain('X-MCP-Trace-Id');
  });
});

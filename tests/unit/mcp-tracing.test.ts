import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const { Sentry, sanitizeSpan } = require('../../functions/common/sentry');
const { traceMcpRequest, traceMcpStep, getRequestTraceAttributes, responseOutcome } = require('../../functions/mcp/tracing');
const { executeScopedToolByName } = require('../../functions/mcp/endpoint');

function response() {
  return {
    statusCode: 200,
    setHeader: vi.fn(),
    json: vi.fn((body) => body),
  };
}

describe('MCP tracing with the real Sentry SDK and local transport', () => {
  const send = vi.fn(async () => ({ statusCode: 200 }));
  beforeAll(() => {
    Sentry.init({
      dsn: 'https://public@o123456.ingest.sentry.io/1', defaultIntegrations: false,
      tracesSampleRate: 1, sendDefaultPii: false, beforeSendSpan: sanitizeSpan,
      transport: () => ({ send, flush: async () => true }),
    });
  });
  afterAll(async () => { await Sentry.close(1000); });

  it('continues the incoming trace, nests phases and returns a correlation ID', async () => {
    const res = response();
    const traceId = '1234567890abcdef1234567890abcdef';
    let childTrace: string | undefined;
    await traceMcpRequest({ method: 'POST', path: '/tools/query_customers', headers: { 'sentry-trace': `${traceId}-1234567890123456-1`, baggage: 'sentry-org_id=123456,sentry-public_key=public' } }, res, async () => {
      const root = Sentry.getActiveSpan();
      expect(root).toBeDefined();
      await traceMcpStep('execute', async (span) => {
        childTrace = span.spanContext().traceId;
        expect(span.spanContext().spanId).not.toBe(root.spanContext().spanId);
      });
      return res.json({ success: true, data: { customers: [] } });
    });
    expect(childTrace).toBe(traceId);
    expect(res.setHeader).toHaveBeenCalledWith('X-MCP-Trace-Id', traceId);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { customers: [] } });
  });

  it('marks JSON-RPC errors as failed spans even with HTTP 200', async () => {
    const res = response();
    let root: any;
    await traceMcpRequest({ method: 'POST', path: '/', headers: {}, body: { method: 'tools/call', params: { name: 'create_order' } } }, res, async () => {
      root = Sentry.getActiveSpan();
      return res.json({ jsonrpc: '2.0', id: 1, error: { code: -32602, message: 'invalid' } });
    });
    const span = Sentry.spanToJSON(root);
    expect(span.status).not.toBe('ok');
    expect(span.attributes || span.data).toMatchObject({ 'mcp.outcome': 'error', 'mcp.rpc.error_code': -32602, 'http.response.status_code': 200 });
  });

  it.each([
    [{ success: true, data: { requiresConfirmation: true } }, 'preview'],
    [{ jsonrpc: '2.0', result: { structuredContent: { isDuplicate: true } } }, 'duplicate'],
    [{ success: true, data: { orderId: 'synthetic' } }, 'success'],
  ])('preserves business response and distinguishes outcome %s', async (body, expected) => {
    const res = response();
    const originalJson = res.json;
    let root: any;
    const returned = await traceMcpRequest({ method: 'POST', path: '/tools/create_order', headers: {} }, res, async () => {
      root = Sentry.getActiveSpan();
      return res.json(body);
    });
    expect(returned).toEqual(body);
    expect(res.json).toBe(originalJson);
    const serialized = Sentry.spanToJSON(root);
    expect((serialized.attributes || serialized.data)['mcp.outcome']).toBe(expected);
  });

  it('isolates simultaneous requests and their tool tags', async () => {
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    let firstTrace: string;
    const first = traceMcpRequest({ method: 'POST', path: '/tools/create_order', headers: {} }, response(), async () => {
      firstTrace = Sentry.getActiveSpan().spanContext().traceId;
      await barrier;
      expect(Sentry.getIsolationScope().getScopeData().tags['mcp.tool']).toBe('create_order');
      expect(Sentry.getActiveSpan().spanContext().traceId).toBe(firstTrace);
    });
    await traceMcpRequest({ method: 'POST', path: '/tools/query_customers', headers: {} }, response(), async () => {
      expect(Sentry.getIsolationScope().getScopeData().tags['mcp.tool']).toBe('query_customers');
      expect(Sentry.getActiveSpan().spanContext().traceId).not.toBe(firstTrace);
    });
    release();
    await first;
  });

  it('does not wait for a Sentry flush for unsampled requests', async () => {
    const flush = vi.spyOn(Sentry, 'flush');
    try {
      await traceMcpRequest({ method: 'POST', path: '/tools/query_customers', headers: {
        'sentry-trace': '1234567890abcdef1234567890abcdef-1234567890123456-0',
        baggage: 'sentry-org_id=123456,sentry-public_key=public',
      } }, response(), async () => {});
      expect(flush).not.toHaveBeenCalled();
    } finally {
      flush.mockRestore();
    }
  });

  it('does not keep a completed MCP response waiting for the Sentry transport', async () => {
    let release!: (value: boolean) => void;
    const pendingFlush = new Promise<boolean>((resolve) => { release = resolve; });
    const flush = vi.spyOn(Sentry, 'flush').mockReturnValue(pendingFlush);
    try {
      const res = response();
      const call = traceMcpRequest({ method: 'POST', path: '/tools/query_customers', headers: {
        'sentry-trace': '1234567890abcdef1234567890abcdef-1234567890123456-1',
        baggage: 'sentry-org_id=123456,sentry-public_key=public',
      } }, res, async () => res.json({ success: true, data: { customers: [] } }));
      const returned = await Promise.race([
        call.then(() => 'complete'),
        new Promise<string>((resolve) => setTimeout(() => resolve('blocked'), 50)),
      ]);
      expect(returned).toBe('complete');
      expect(flush).toHaveBeenCalledWith(1000);
    } finally {
      release(true);
      flush.mockRestore();
    }
  });

  it('does not execute a tool after authorization or argument failure', async () => {
    const executor = { executeQueryCustomers: vi.fn() };
    await expect(executeScopedToolByName(executor, 'query_customers', {}, {}, [])).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(executeScopedToolByName(executor, 'query_customers', { limit: 100 }, {}, ['customers:read'])).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(executor.executeQueryCustomers).not.toHaveBeenCalled();
  });

  it('bounds trace labels instead of using raw routes, arguments, or unknown tool names', () => {
    const req = { method: 'POST', path: '/tools/private_customer_name?token=synthetic-secret', body: { customerName: 'Private Person' } };
    const attrs = getRequestTraceAttributes(req);
    expect(attrs['mcp.tool']).toBe('unknown');
    expect(JSON.stringify(attrs)).not.toMatch(/private_customer|synthetic-secret|Private Person/);
    expect(responseOutcome({ error: 'UNAUTHORIZED' }, 401)).toBe('error');
  });
});

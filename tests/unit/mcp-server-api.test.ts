import { afterEach, describe, expect, it } from 'vitest';
import handler from '../../api/mcp-server';

const originalSecret = process.env.BETA_VERCEL_ORIGIN_SECRET;
const originalFirebaseServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_DEV;
const originalMcpOrigin = process.env.VERCEL_MCP_ORIGIN;
const originalMcpDomain = process.env.VERCEL_MCP_DOMAIN;
const originalMcpAppOrigin = process.env.VERCEL_MCP_APP_ORIGIN;
const originalMcpDocumentationUrl = process.env.VERCEL_MCP_DOCUMENTATION_URL;

function createResponse() {
  const state: { statusCode?: number; body?: unknown } = {};
  const response = {
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

describe('Vercel MCP public handler edge-origin gate', () => {
  afterEach(() => {
    if (originalSecret === undefined) delete process.env.BETA_VERCEL_ORIGIN_SECRET;
    else process.env.BETA_VERCEL_ORIGIN_SECRET = originalSecret;
    if (originalFirebaseServiceAccount === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_DEV;
    else process.env.FIREBASE_SERVICE_ACCOUNT_DEV = originalFirebaseServiceAccount;
    if (originalMcpOrigin === undefined) delete process.env.VERCEL_MCP_ORIGIN;
    else process.env.VERCEL_MCP_ORIGIN = originalMcpOrigin;
    if (originalMcpDomain === undefined) delete process.env.VERCEL_MCP_DOMAIN;
    else process.env.VERCEL_MCP_DOMAIN = originalMcpDomain;
    if (originalMcpAppOrigin === undefined) delete process.env.VERCEL_MCP_APP_ORIGIN;
    else process.env.VERCEL_MCP_APP_ORIGIN = originalMcpAppOrigin;
    if (originalMcpDocumentationUrl === undefined) delete process.env.VERCEL_MCP_DOCUMENTATION_URL;
    else process.env.VERCEL_MCP_DOCUMENTATION_URL = originalMcpDocumentationUrl;
  });

  it('rejects direct requests before Firebase Admin initialization', async () => {
    delete process.env.BETA_VERCEL_ORIGIN_SECRET;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_DEV;
    const { state, response } = createResponse();

    await handler({ method: 'GET', url: '/mcp', headers: {} }, response as never);

    expect(state.statusCode).toBe(403);
    expect(state.body).toMatchObject({ error: { code: 'permission-denied' } });
  });

  it('rejects an incorrect edge secret before initializing Firebase Admin', async () => {
    process.env.BETA_VERCEL_ORIGIN_SECRET = 'configured-beta-edge-secret';
    delete process.env.FIREBASE_SERVICE_ACCOUNT_DEV;
    const { state, response } = createResponse();

    await handler({
      method: 'POST',
      url: '/mcp',
      headers: { 'x-beta-edge-secret': 'incorrect-secret' },
      body: { jsonrpc: '2.0', id: 1, method: 'initialize' },
    }, response as never);

    expect(state.statusCode).toBe(403);
    expect(state.body).toMatchObject({ error: { code: 'permission-denied' } });
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  calculateS256Challenge,
  handleOAuthAuthorize,
  handleOAuthRegister,
  handleOAuthToken,
  validateOAuthAccessToken,
} from '../../functions/mcp/oauth.js';
import { buildBearerChallenge, executeScopedToolByName } from '../../functions/mcp/endpoint.js';

type Stored = Record<string, any>;

class MemoryFirestore {
  records = new Map<string, Stored>();
  tail: Promise<unknown> = Promise.resolve();

  collection(name: string) {
    return {
      doc: (id: string) => {
        const key = `${name}/${id}`;
        return {
          key,
          get: async () => this.snapshot(key),
          set: async (data: Stored) => { this.records.set(key, { ...data }); },
          update: async (data: Stored) => {
            const current = this.records.get(key);
            if (!current) throw new Error('missing document');
            this.records.set(key, { ...current, ...data });
          },
        };
      },
    };
  }

  snapshot(key: string) {
    const value = this.records.get(key);
    return { exists: Boolean(value), data: () => value ? { ...value } : undefined };
  }

  async runTransaction<T>(work: (tx: any) => Promise<T>): Promise<T> {
    let release!: () => void;
    const previous = this.tail;
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    const writes: Array<() => void> = [];
    const tx = {
      get: async (ref: { key: string }) => this.snapshot(ref.key),
      set: (ref: { key: string }, data: Stored) => writes.push(() => this.records.set(ref.key, { ...data })),
      update: (ref: { key: string }, data: Stored) => writes.push(() => {
        const current = this.records.get(ref.key);
        if (!current) throw new Error('missing document');
        this.records.set(ref.key, { ...current, ...data });
      }),
    };
    try {
      const result = await work(tx);
      writes.forEach((apply) => apply());
      return result;
    } finally {
      release();
    }
  }
}

function response() {
  const res: any = { statusCode: 200, headers: {}, body: undefined, redirectUrl: undefined };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (body: unknown) => { res.body = body; return res; };
  res.send = (body: unknown) => { res.body = body; return res; };
  res.redirect = (code: number, url: string) => { res.statusCode = code; res.redirectUrl = url; return res; };
  res.setHeader = (key: string, value: string) => { res.headers[key] = value; return res; };
  return res;
}

const callback = 'https://chatgpt.com/aip/g-mcp/oauth/callback';
const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const baseRequest = (clientId: string, extra = {}) => ({
  response_type: 'code', client_id: clientId, redirect_uri: callback,
  scope: 'orders:read', state: 'opaque-state', code_challenge: calculateS256Challenge(verifier),
  code_challenge_method: 'S256', ...extra,
});

async function register(db: MemoryFirestore, redirectUris = [callback]) {
  const res = response();
  await handleOAuthRegister({ method: 'POST', body: { client_name: 'ChatGPT local test', redirect_uris: redirectUris }, ip: '127.0.0.1' } as any, res, db as any);
  return res;
}

async function beginAuthorization(db: MemoryFirestore, clientId: string, overrides = {}) {
  const res = response();
  await handleOAuthAuthorize({ method: 'GET', query: baseRequest(clientId, overrides), ip: '127.0.0.1' } as any, res, db as any, undefined as any);
  return res;
}

describe('OAuth authorization and client binding', () => {
  it('advertises protected-resource metadata in 401 challenges and omits invalid_token for missing credentials', () => {
    const missingCredentials = buildBearerChallenge(false, 'https://api.dev.luisices.com.br');
    expect(missingCredentials).toContain('resource_metadata="https://api.dev.luisices.com.br/.well-known/oauth-protected-resource"');
    expect(missingCredentials).not.toContain('invalid_token');
    expect(buildBearerChallenge(true, 'https://api.dev.luisices.com.br')).toContain('error="invalid_token"');
  });

  it('rejects missing/revoked Firebase proof and ignores client supplied identity without issuing a code', async () => {
    const db = new MemoryFirestore();
    const client = await register(db);
    expect(client.statusCode).toBe(201);
    expect(client.body.token_endpoint_auth_method).toBe('none');
    expect(client.body).not.toHaveProperty('client_secret');
    const clientId = client.body.client_id;
    const started = await beginAuthorization(db, clientId);
    const requestId = new URL(started.redirectUrl).searchParams.get('request_id')!;
    const noProof = response();
    await handleOAuthAuthorize({ method: 'POST', body: { request_id: requestId, uid: 'victim', email: 'known@example.test', password: 'wrong-password' }, headers: {}, ip: '127.0.0.1' } as any, noProof, db as any, (() => ({ verifyIdToken: async () => { throw new Error('expired/revoked'); } })) as any);
    expect(noProof.statusCode).toBe(401);
    expect([...db.records.keys()].filter((key) => key.startsWith('oauthAuthCodes/'))).toHaveLength(0);

    const invalidProof = response();
    await handleOAuthAuthorize({ method: 'POST', body: { request_id: requestId, uid: 'victim', email: 'known@example.test' }, headers: { authorization: 'Bearer invalid-id-token' }, ip: '127.0.0.1' } as any, invalidProof, db as any, (() => ({ verifyIdToken: async () => { throw new Error('invalid'); } })) as any);
    expect(invalidProof.statusCode).toBe(401);
    expect([...db.records.keys()].filter((key) => key.startsWith('oauthAuthCodes/'))).toHaveLength(0);
  });

  it.each([
    { uid: 'disabled-user', profile: { active: false, permissions: { mcpAccess: true } } },
    { uid: 'mcp-denied-user', profile: { active: true, permissions: { mcpAccess: false } } },
  ])('rejects an authenticated inactive or MCP-disabled profile without issuing a code: $uid', async ({ uid, profile }) => {
    const db = new MemoryFirestore();
    const client = await register(db);
    const started = await beginAuthorization(db, client.body.client_id);
    const requestId = new URL(started.redirectUrl).searchParams.get('request_id')!;
    await db.collection('userProfiles').doc(uid).set({ email: `${uid}@example.test`, role: 'funcionario', ...profile });
    const denied = response();
    await handleOAuthAuthorize({ method: 'POST', body: { request_id: requestId }, headers: { authorization: 'Bearer valid-id-token' }, ip: '127.0.0.1' } as any, denied, db as any, (() => ({ verifyIdToken: async () => ({ uid, email: `${uid}@example.test`, auth_time: Math.floor(Date.now() / 1000) }) })) as any);
    expect(denied.statusCode).toBe(403);
    expect([...db.records.keys()].filter((key) => key.startsWith('oauthAuthCodes/'))).toHaveLength(0);
  });

  it('validates exact registered callbacks and rejects unknown clients and insecure registration callbacks', async () => {
    const db = new MemoryFirestore();
    const badRegistration = await register(db, ['http://attacker.example/callback']);
    expect(badRegistration.statusCode).toBe(400);
    expect([...db.records.keys()].filter((key) => key.startsWith('oauthClients/'))).toHaveLength(0);
    const client = await register(db);
    const legacyInternal = await beginAuthorization(db, 'chatgpt-mcp');
    expect(legacyInternal.statusCode).toBe(303);
    const rejectedLegacyCallback = await beginAuthorization(db, 'chatgpt-mcp', { redirect_uri: 'https://attacker.example/callback' });
    expect(rejectedLegacyCallback.statusCode).toBe(400);
    const unknown = await beginAuthorization(db, 'unregistered-client');
    expect(unknown.statusCode).toBe(400);
    const prefixCallback = await beginAuthorization(db, client.body.client_id, { redirect_uri: `${callback}.attacker.invalid` });
    expect(prefixCallback.statusCode).toBe(400);
    const insecure = await beginAuthorization(db, client.body.client_id, { redirect_uri: 'http://chatgpt.com/aip/g-mcp/oauth/callback' });
    expect(insecure.statusCode).toBe(400);
    const unknownScope = await beginAuthorization(db, client.body.client_id, { scope: 'orders:read admin:all' });
    expect(unknownScope.statusCode).toBe(400);
  });

  it('issues authorization only to the verified UID and trades a code once under concurrent requests', async () => {
    const db = new MemoryFirestore();
    const client = await register(db);
    const clientId = client.body.client_id;
    const started = await beginAuthorization(db, clientId, { scope: 'orders:read orders:draft' });
    const requestId = new URL(started.redirectUrl).searchParams.get('request_id')!;
    await db.collection('userProfiles').doc('verified-user').set({ email: 'verified@example.test', role: 'funcionario', active: true, permissions: { mcpAccess: true } });
    const authorized = response();
    await handleOAuthAuthorize({ method: 'POST', body: { request_id: requestId, client_id: 'attacker-client', redirect_uri: 'https://evil.invalid', scope: 'orders:create', uid: 'other-user', email: 'other@example.test' }, headers: { authorization: 'Bearer firebase-id-token' }, ip: '127.0.0.1' } as any, authorized, db as any, (() => ({ verifyIdToken: async () => ({ uid: 'verified-user', email: 'verified@example.test', auth_time: Math.floor(Date.now() / 1000) }) })) as any);
    expect(authorized.statusCode).toBe(200);
    const code = new URL(authorized.body.redirect_uri).searchParams.get('code')!;
    expect(db.records.get(`oauthAuthCodes/${code}`)).toMatchObject({ userId: 'verified-user', clientId, redirectUri: callback, scope: 'orders:read orders:draft' });

    const codeDoc = db.records.get(`oauthAuthCodes/${code}`)!;
    const exchange = () => {
      const res = response();
      return handleOAuthToken({ method: 'POST', body: { grant_type: 'authorization_code', code, client_id: clientId, redirect_uri: callback, code_verifier: verifier }, ip: '127.0.0.2' } as any, res, db as any).then(() => res);
    };
    const results = await Promise.all([exchange(), exchange()]);
    expect(results.filter((item) => item.statusCode === 200)).toHaveLength(1);
    expect(results.filter((item) => item.statusCode !== 200)).toHaveLength(1);
    expect(db.records.get(`oauthAuthCodes/${code}`)?.used).toBe(true);
    expect(codeDoc.userId).toBe('verified-user');
  });

  it('does not issue a code granting administrative scopes to an ordinary user', async () => {
    const db = new MemoryFirestore();
    const client = await register(db);
    const started = await beginAuthorization(db, client.body.client_id, { scope: 'financial:read' });
    const requestId = new URL(started.redirectUrl).searchParams.get('request_id')!;
    await db.collection('userProfiles').doc('ordinary-user').set({ role: 'funcionario', active: true, permissions: { mcpAccess: true } });
    const denied = response();
    await handleOAuthAuthorize({ method: 'POST', body: { request_id: requestId }, headers: { authorization: 'Bearer valid-id-token' }, ip: '127.0.0.1' } as any, denied, db as any, (() => ({ verifyIdToken: async () => ({ uid: 'ordinary-user', auth_time: Math.floor(Date.now() / 1000) }) })) as any);
    expect(denied.statusCode).toBe(403);
    expect([...db.records.keys()].filter((key) => key.startsWith('oauthAuthCodes/'))).toHaveLength(0);
  });

  it('rejects callback/client substitutions and keeps refresh tokens bound to their original client and scopes', async () => {
    const db = new MemoryFirestore();
    const a = await register(db);
    const b = await register(db, ['https://example.test/callback']);
    await db.collection('userProfiles').doc('user-a').set({ email: 'a@example.test', role: 'funcionario', active: true, permissions: { mcpAccess: true } });
    const code = 'lui_code_test';
    await db.collection('oauthAuthCodes').doc(code).set({ code, clientId: a.body.client_id, redirectUri: callback, userId: 'user-a', authTime: Math.floor(Date.now() / 1000), scope: 'orders:read', codeChallenge: calculateS256Challenge(verifier), codeChallengeMethod: 'S256', issuer: 'https://api.dev.luisices.com.br', used: false, expiresAt: Date.now() + 300000 });
    for (const payload of [
      { client_id: b.body.client_id, redirect_uri: callback },
      { client_id: a.body.client_id, redirect_uri: 'https://chatgpt.com/aip/g-mcp/oauth/callback.evil' },
    ]) {
      const denied = response();
      await handleOAuthToken({ method: 'POST', body: { grant_type: 'authorization_code', code, code_verifier: verifier, ...payload }, ip: '127.0.0.3' } as any, denied, db as any);
      expect(denied.statusCode).toBe(400);
    }
    const exchanged = response();
    await handleOAuthToken({ method: 'POST', body: { grant_type: 'authorization_code', code, client_id: a.body.client_id, redirect_uri: callback, code_verifier: verifier }, ip: '127.0.0.3' } as any, exchanged, db as any);
    expect(exchanged.statusCode).toBe(200);
    expect(exchanged.body.scope).toBe('orders:read');
    const wrongRefreshClient = response();
    await handleOAuthToken({ method: 'POST', body: { grant_type: 'refresh_token', refresh_token: exchanged.body.refresh_token, client_id: b.body.client_id }, ip: '127.0.0.3' } as any, wrongRefreshClient, db as any);
    expect(wrongRefreshClient.statusCode).toBe(400);
    const refreshed = response();
    await handleOAuthToken({ method: 'POST', body: { grant_type: 'refresh_token', refresh_token: exchanged.body.refresh_token, client_id: a.body.client_id }, ip: '127.0.0.3' } as any, refreshed, db as any);
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.body.scope).toBe('orders:read');
    expect(refreshed.body.refresh_token).not.toBe(exchanged.body.refresh_token);
  });

  it('does not expand read, draft, or absent scopes and never calls a write executor without orders:create', async () => {
    const db = new MemoryFirestore();
    await db.collection('oauthClients').doc('client-a').set({ enabled: true });
    const fixtures = [
      { uid: 'reader', scopes: ['orders:read'] },
      { uid: 'drafter', scopes: ['orders:draft'] },
      { uid: 'legacy-no-scope', scopes: undefined },
    ];
    const validResults = [];
    for (const fixture of fixtures) {
      const token = `lui_oauth_at_${fixture.uid}`;
      await db.collection('oauthAccessTokens').doc(token).set({ accessToken: token, userId: fixture.uid, clientId: 'client-a', sessionId: `session-${fixture.uid}`, ...(fixture.scopes ? { scopes: fixture.scopes } : {}), iss: 'https://api.dev.luisices.com.br', aud: 'https://api.dev.luisices.com.br', authTime: Math.floor(Date.now() / 1000), expiresAt: Date.now() + 3600000 });
      await db.collection('oauthSessions').doc(`session-${fixture.uid}`).set({ userId: fixture.uid, clientId: 'client-a', iss: 'https://api.dev.luisices.com.br', aud: 'https://api.dev.luisices.com.br', expiresAt: Date.now() + 3600000, active: true, revoked: false });
      await db.collection('userProfiles').doc(fixture.uid).set({ role: 'funcionario', active: true, permissions: { mcpAccess: true } });
      validResults.push(await validateOAuthAccessToken(token, db as any));
    }
    expect(validResults.map((result: any) => result.keyData.scopes)).toEqual([['orders:read'], ['orders:draft'], []]);
    const executor = { executeCreateOrder: vi.fn() } as any;
    for (const valid of validResults as any[]) await expect(executeScopedToolByName(executor, 'create_order', {}, { uid: valid.keyData.userId }, valid.keyData.scopes)).rejects.toMatchObject({ code: 'permission-denied' });
    expect(executor.executeCreateOrder).not.toHaveBeenCalled();
  });

  it('applies a Firestore shared hourly limit to OAuth calls per user', async () => {
    const db = new MemoryFirestore();
    await db.collection('oauthClients').doc('client-rate').set({ enabled: true });
    const token = 'lui_oauth_at_rate_test';
    await db.collection('oauthAccessTokens').doc(token).set({ accessToken: token, userId: 'rate-user', clientId: 'client-rate', sessionId: 'rate-session', scopes: ['orders:read'], iss: 'https://api.dev.luisices.com.br', aud: 'https://api.dev.luisices.com.br', authTime: Math.floor(Date.now() / 1000), expiresAt: Date.now() + 3600000 });
    await db.collection('oauthSessions').doc('rate-session').set({ userId: 'rate-user', clientId: 'client-rate', iss: 'https://api.dev.luisices.com.br', aud: 'https://api.dev.luisices.com.br', expiresAt: Date.now() + 3600000, active: true, revoked: false });
    await db.collection('userProfiles').doc('rate-user').set({ role: 'funcionario', active: true, permissions: { mcpAccess: true } });
    let last: any;
    for (let i = 0; i < 121; i += 1) last = await validateOAuthAccessToken(token, db as any);
    expect(last).toMatchObject({ success: false, status: 429, code: 'RATE_LIMIT_EXCEEDED' });
  });
});

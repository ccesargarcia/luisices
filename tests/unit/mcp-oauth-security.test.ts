import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calculateS256Challenge,
  getEffectiveUserScopes,
  handleOAuthAuthorize,
  handleOAuthRegister,
  handleOAuthToken,
  validateOAuthAccessToken,
} from '../../functions/mcp/oauth.js';
import { buildBearerChallenge, executeScopedToolByName } from '../../functions/mcp/endpoint.js';
import { clearMcpAuthCache, hashApiKey, validateMcpRequest } from '../../functions/mcp/auth.js';
import { COLLECTIONS } from '../../functions/mcp/constants.js';
import { createHash } from 'node:crypto';

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
      create: (ref: { key: string }, data: Stored) => writes.push(() => {
        if (this.records.has(ref.key)) throw new Error('document already exists');
        this.records.set(ref.key, { ...data });
      }),
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
const devOrigin = 'https://api.dev.luisices.com.br';
const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const employeePermissions = {
  mcpAccess: true,
  orders: { view: true, create: true, edit: true },
  customers: { view: true, create: true, edit: true },
  pricing: { view: true },
  whatsapp: { view: true },
  gallery: { view: true },
  reports: { view: true },
  users: { view: true },
};
const accessToken = (label: string) => `lui_oauth_at_${createHash('sha256').update(label).digest('hex')}`;
const refreshToken = (label: string) => `lui_oauth_rt_${createHash('sha256').update(label).digest('hex')}`;

const baseRequest = (clientId: string, extra = {}) => ({
  response_type: 'code', client_id: clientId, redirect_uri: callback,
  scope: 'orders:read', state: 'opaque-state', code_challenge: calculateS256Challenge(verifier),
  code_challenge_method: 'S256', resource: devOrigin, ...extra,
});

async function register(db: MemoryFirestore, redirectUris = [callback]) {
  const res = response();
  await handleOAuthRegister({ method: 'POST', body: { client_name: 'ChatGPT local test', redirect_uris: redirectUris }, ip: '127.0.0.1' } as any, res, db as any);
  return res;
}

async function registerClientId(db: MemoryFirestore) {
  const result = await register(db);
  expect(result.statusCode).toBe(201);
  expect(result.body.client_id).toMatch(/^client_[a-f0-9]{24}$/);
  return result.body.client_id as string;
}

async function seedValidAccess(db: MemoryFirestore, { userId, clientId, token, scopes, sessionId = `session-${userId}`, session = {}, tokenOrigin = devOrigin }: {
  userId: string; clientId: string; token: string; scopes?: string[]; sessionId?: string; session?: Stored;
  tokenOrigin?: string;
}) {
  await db.collection('oauthClients').doc(clientId).set({ enabled: true });
  await db.collection('oauthAccessTokens').doc(token).set({ accessToken: token, userId, clientId, sessionId, ...(scopes ? { scopes } : {}), iss: tokenOrigin, aud: tokenOrigin, authTime: Math.floor(Date.now() / 1000), expiresAt: Date.now() + 3600000 });
  await db.collection('oauthSessions').doc(sessionId).set({ userId, clientId, iss: devOrigin, aud: devOrigin, expiresAt: Date.now() + 3600000, active: true, revoked: false, ...session });
  await db.collection('userProfiles').doc(userId).set({
    role: 'funcionario', active: true,
    permissions: { ...employeePermissions, mcpScopes: scopes || [] },
  });
}

afterEach(() => vi.unstubAllEnvs());

async function beginAuthorization(db: MemoryFirestore, clientId: string, overrides = {}) {
  const res = response();
  await handleOAuthAuthorize({ method: 'GET', query: baseRequest(clientId, overrides), ip: '127.0.0.1' } as any, res, db as any, undefined as any);
  return res;
}

describe('Granular scope edge cases', () => {
  it.each([null, 'orders:read', {}, ['unknown:scope'], ['orders:read', 7]].map((configured) => ({ configured })))('blocks present invalid configuration: %j', ({ configured }) => {
    expect(getEffectiveUserScopes(['orders:create'], { role: 'funcionario', permissions: { mcpScopes: configured } })).toEqual([]);
    expect(getEffectiveUserScopes(['orders:create'], { role: 'funcionario', mcpScopes: configured })).toEqual([]);
  });

  it('never falls back to legacy scopes when primary configuration is present but invalid', () => {
    expect(getEffectiveUserScopes(['orders:create'], {
      role: 'admin', permissions: { mcpScopes: null }, mcpScopes: ['orders:create'],
    })).toEqual([]);
    expect(getEffectiveUserScopes(['orders:create'], { role: 'funcionario', permissions: { orders: { create: true } } })).toEqual(['orders:create']);
  });

  it.each([{ scopes: ['*'] }, { scopes: '*' }])('supports legacy static wildcard without granting administrative scopes to employees: %j', async ({ scopes }) => {
    clearMcpAuthCache();
    const db = new MemoryFirestore();
    const rawKey = 'lui_dev_wildcard_employee_test';
    await db.collection(COLLECTIONS.SETTINGS).doc(COLLECTIONS.SETTINGS_DOC_MCP).set({ enabled: true });
    await db.collection(COLLECTIONS.USERS).doc('wildcard-user').set({ role: 'funcionario', active: true, permissions: employeePermissions });
    await db.collection(COLLECTIONS.KEYS).doc(hashApiKey(rawKey)).set({
      keyId: 'wildcard-employee', userId: 'wildcard-user', enabled: true,
      ...(Array.isArray(scopes) ? { scopes } : { scope: scopes }),
    });
    const result = await validateMcpRequest({ headers: { authorization: `Bearer ${rawKey}` } } as any, db as any);
    expect(result.success).toBe(true);
    expect(result.keyData.scopes).toContain('orders:read');
    expect(result.keyData.scopes).not.toContain('financial:read');
    expect(result.keyData.scopes).not.toContain('team:read');
    expect(result.keyData.scopes).not.toContain('*');
  });

  it('restricts a wildcard key immediately as an admin profile changes, and blocks an empty list', async () => {
    clearMcpAuthCache();
    const db = new MemoryFirestore();
    const rawKey = 'lui_dev_wildcard_restriction_test';
    await db.collection(COLLECTIONS.SETTINGS).doc(COLLECTIONS.SETTINGS_DOC_MCP).set({ enabled: true });
    await db.collection(COLLECTIONS.KEYS).doc(hashApiKey(rawKey)).set({ keyId: 'wildcard-admin', userId: 'wildcard-admin-user', enabled: true, scopes: ['*'] });
    const profileRef = db.collection(COLLECTIONS.USERS).doc('wildcard-admin-user');
    await profileRef.set({ role: 'admin', active: true, permissions: { mcpAccess: true, mcpScopes: ['orders:read'] } });
    const request = { headers: { authorization: `Bearer ${rawKey}` } };
    const allowed = await validateMcpRequest(request as any, db as any);
    expect(allowed.success).toBe(true);
    expect(allowed.keyData.scopes).toEqual(['orders:read']);
    const executor = { executeCreateOrder: vi.fn() };
    await expect(executeScopedToolByName(executor as any, 'create_order', {}, allowed.scope, allowed.keyData.scopes)).rejects.toMatchObject({ code: 'permission-denied' });
    expect(executor.executeCreateOrder).not.toHaveBeenCalled();
    await profileRef.update({ permissions: { mcpAccess: true, mcpScopes: [] } });
    const denied = await validateMcpRequest(request as any, db as any);
    expect(denied).toMatchObject({ success: false, status: 403, code: 'SCOPE_PERMISSION_DENIED' });
  });

  it('does not consume the authorization code or issue tokens when permissions disappear before exchange', async () => {
    const db = new MemoryFirestore();
    const clientId = await registerClientId(db);
    await db.collection(COLLECTIONS.USERS).doc('removed-before-exchange').set({
      role: 'funcionario', active: true, permissions: { ...employeePermissions, mcpScopes: [] },
    });
    const code = `lui_code_${'d'.repeat(48)}`;
    await db.collection('oauthAuthCodes').doc(code).set({
      clientId, redirectUri: callback, resource: devOrigin, userId: 'removed-before-exchange', authTime: Math.floor(Date.now() / 1000),
      scope: 'orders:create', codeChallenge: calculateS256Challenge(verifier), codeChallengeMethod: 'S256',
      issuer: devOrigin, used: false, expiresAt: Date.now() + 300000,
    });
    const denied = response();
    await handleOAuthToken({ method: 'POST', body: {
      grant_type: 'authorization_code', code, client_id: clientId, redirect_uri: callback, code_verifier: verifier, resource: devOrigin,
    }, ip: 'synthetic-exchange' } as any, denied, db as any);
    expect(denied.statusCode).toBe(400);
    expect(denied.body.error).toBe('invalid_scope');
    expect(db.records.get(`oauthAuthCodes/${code}`).used).toBe(false);
    for (const collection of ['oauthAccessTokens', 'oauthRefreshTokens', 'oauthSessions']) {
      expect([...db.records.keys()].filter((key) => key.startsWith(`${collection}/`))).toHaveLength(0);
    }
  });
});

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
    const started = await beginAuthorization(db, clientId, { scope: 'orders:read orders:draft', resource: devOrigin });
    const requestId = new URL(started.redirectUrl).searchParams.get('request_id')!;
    await db.collection('userProfiles').doc('verified-user').set({ email: 'verified@example.test', role: 'funcionario', active: true, permissions: { ...employeePermissions, mcpScopes: ['orders:read', 'orders:draft'] } });
    const authorized = response();
    await handleOAuthAuthorize({ method: 'POST', body: { request_id: requestId, client_id: 'attacker-client', redirect_uri: 'https://evil.invalid', scope: 'orders:create', uid: 'other-user', email: 'other@example.test' }, headers: { authorization: 'Bearer firebase-id-token' }, ip: '127.0.0.1' } as any, authorized, db as any, (() => ({ verifyIdToken: async () => ({ uid: 'verified-user', email: 'verified@example.test', auth_time: Math.floor(Date.now() / 1000) }) })) as any);
    expect(authorized.statusCode).toBe(200);
    const code = new URL(authorized.body.redirect_uri).searchParams.get('code')!;
    expect(db.records.get(`oauthAuthCodes/${code}`)).toMatchObject({ userId: 'verified-user', clientId, redirectUri: callback, resource: devOrigin, scope: 'orders:read orders:draft' });

    const codeDoc = db.records.get(`oauthAuthCodes/${code}`)!;
    const wrongResource = response();
    await handleOAuthToken({ method: 'POST', body: { grant_type: 'authorization_code', code, client_id: clientId, redirect_uri: callback, code_verifier: verifier, resource: `${devOrigin}/other` }, ip: '127.0.0.2' } as any, wrongResource, db as any);
    expect(wrongResource.statusCode).toBe(400);
    const exchange = () => {
      const res = response();
      return handleOAuthToken({ method: 'POST', body: { grant_type: 'authorization_code', code, client_id: clientId, redirect_uri: callback, code_verifier: verifier, resource: devOrigin }, ip: '127.0.0.2' } as any, res, db as any).then(() => res);
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
    await db.collection('userProfiles').doc('user-a').set({ email: 'a@example.test', role: 'funcionario', active: true, permissions: { ...employeePermissions, mcpScopes: ['orders:read'] } });
    const code = `lui_code_${'e'.repeat(48)}`;
    await db.collection('oauthAuthCodes').doc(code).set({ code, clientId: a.body.client_id, redirectUri: callback, resource: devOrigin, userId: 'user-a', authTime: Math.floor(Date.now() / 1000), scope: 'orders:read', codeChallenge: calculateS256Challenge(verifier), codeChallengeMethod: 'S256', issuer: 'https://api.dev.luisices.com.br', used: false, expiresAt: Date.now() + 300000 });
    for (const payload of [
      { client_id: b.body.client_id, redirect_uri: callback },
      { client_id: a.body.client_id, redirect_uri: 'https://chatgpt.com/aip/g-mcp/oauth/callback.evil' },
    ]) {
      const denied = response();
      await handleOAuthToken({ method: 'POST', body: { grant_type: 'authorization_code', code, code_verifier: verifier, resource: devOrigin, ...payload }, ip: '127.0.0.3' } as any, denied, db as any);
      expect(denied.statusCode).toBe(400);
    }
    const exchanged = response();
    await handleOAuthToken({ method: 'POST', body: { grant_type: 'authorization_code', code, client_id: a.body.client_id, redirect_uri: callback, code_verifier: verifier, resource: devOrigin }, ip: '127.0.0.3' } as any, exchanged, db as any);
    expect(exchanged.statusCode).toBe(200);
    expect(exchanged.body.scope).toBe('orders:read');
    const wrongRefreshClient = response();
    await handleOAuthToken({ method: 'POST', body: { grant_type: 'refresh_token', refresh_token: exchanged.body.refresh_token, client_id: b.body.client_id, resource: devOrigin }, ip: '127.0.0.3' } as any, wrongRefreshClient, db as any);
    expect(wrongRefreshClient.statusCode).toBe(400);
    const refreshed = response();
    await handleOAuthToken({ method: 'POST', body: { grant_type: 'refresh_token', refresh_token: exchanged.body.refresh_token, client_id: a.body.client_id, resource: devOrigin }, ip: '127.0.0.3' } as any, refreshed, db as any);
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.body.scope).toBe('orders:read');
    expect(refreshed.body.refresh_token).not.toBe(exchanged.body.refresh_token);
  });

  it('does not expand read, draft, or absent scopes and never calls a write executor without orders:create', async () => {
    const db = new MemoryFirestore();
    const clientId = await registerClientId(db);
    const fixtures = [
      { uid: 'reader', scopes: ['orders:read'] },
      { uid: 'drafter', scopes: ['orders:draft'] },
      { uid: 'legacy-no-scope', scopes: undefined },
    ];
    const validResults = [];
    for (const fixture of fixtures) {
      const token = accessToken(fixture.uid);
      await seedValidAccess(db, { userId: fixture.uid, clientId, token, scopes: fixture.scopes });
      const result = await validateOAuthAccessToken(token, db as any);
      expect(result.success).toBe(true);
      if (result.success) validResults.push(result);
    }
    expect(validResults.map((result: any) => result.keyData.scopes)).toEqual([['orders:read'], ['orders:draft'], []]);
    const executor = { executeCreateOrder: vi.fn() } as any;
    for (const valid of validResults as any[]) await expect(executeScopedToolByName(executor, 'create_order', {}, { uid: valid.keyData.userId }, valid.keyData.scopes)).rejects.toMatchObject({ code: 'permission-denied' });
    expect(executor.executeCreateOrder).not.toHaveBeenCalled();
  });

  it('applies a Firestore shared hourly limit to OAuth calls per user', async () => {
    const db = new MemoryFirestore();
    const clientId = await registerClientId(db);
    const tokenA = accessToken('rate-test-a');
    const tokenB = accessToken('rate-test-b');
    const refreshTokenValue = refreshToken('rate-test');
    await seedValidAccess(db, { userId: 'rate-user', clientId, token: tokenA, scopes: ['orders:read'], sessionId: 'rate-session-a' });
    await seedValidAccess(db, { userId: 'rate-user', clientId, token: tokenB, scopes: ['orders:read'], sessionId: 'rate-session-b' });
    await db.collection('oauthSessions').doc('rate-session-a').update({ accessToken: tokenA, refreshToken: refreshTokenValue });
    await db.collection('oauthRefreshTokens').doc(refreshTokenValue).set({ refreshToken: refreshTokenValue, accessToken: tokenA, sessionId: 'rate-session-a', clientId, userId: 'rate-user', resource: devOrigin, authTime: Math.floor(Date.now() / 1000), scope: 'orders:read', scopes: ['orders:read'], iss: devOrigin, aud: devOrigin, expiresAt: Date.now() + 3600000, revoked: false });
    let last: any;
    for (let i = 0; i < 120; i += 1) last = await validateOAuthAccessToken(i % 2 ? tokenA : tokenB, db as any);
    expect(last.success).toBe(true);
    const refreshed = response();
    await handleOAuthToken({ method: 'POST', body: { grant_type: 'refresh_token', refresh_token: refreshTokenValue, client_id: clientId, resource: devOrigin }, ip: '127.0.0.4' } as any, refreshed, db as any);
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.body.access_token).not.toBe(tokenA);
    const afterRenewal = await validateOAuthAccessToken(refreshed.body.access_token, db as any);
    expect(afterRenewal).toMatchObject({ success: false, status: 429, code: 'RATE_LIMIT_EXCEEDED' });
  });

  it.each([
    ['development', 'https://api.dev.luisices.com.br'],
    ['production', 'https://api.luisices.com.br'],
  ])('accepts matching token and session environments for %s', async (project, origin) => {
    vi.stubEnv('GCLOUD_PROJECT', project === 'production' ? 'papelaria-dashboard' : 'luisices-dev');
    const db = new MemoryFirestore();
    const clientId = await registerClientId(db);
    const token = accessToken(project);
    await seedValidAccess(db, { userId: project, clientId, token, scopes: ['orders:read'], tokenOrigin: origin, session: { iss: origin, aud: origin } });
    const result = await validateOAuthAccessToken(token, db as any);
    expect(result.success).toBe(true);
  });

  it.each([
    ['issuer from another environment', { iss: 'https://api.luisices.com.br' }, 'INVALID_SESSION_ISSUER'],
    ['audience from another environment', { aud: 'https://api.luisices.com.br' }, 'INVALID_SESSION_AUDIENCE'],
    ['missing issuer', { iss: undefined }, 'INVALID_SESSION_ISSUER'],
    ['missing audience', { aud: undefined }, 'INVALID_SESSION_AUDIENCE'],
    ['revoked session', { revoked: true }, 'SESSION_REVOKED'],
    ['expired session', { expiresAt: Date.now() - 1 }, 'SESSION_REVOKED'],
    ['different user', { userId: 'other-user' }, 'SESSION_REVOKED'],
    ['different client', { clientId: 'client_000000000000000000000000' }, 'SESSION_REVOKED'],
  ])('rejects a session with %s', async (_label, override, code) => {
    const db = new MemoryFirestore();
    const clientId = await registerClientId(db);
    const token = accessToken('session-environment');
    await seedValidAccess(db, { userId: 'session-user', clientId, token, scopes: ['orders:read'], session: override as Stored });
    const result = await validateOAuthAccessToken(token, db as any);
    expect(result).toMatchObject({ success: false, status: 401, code });
  });
});

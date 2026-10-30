import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Refuse cloud fallback before loading the real SDK or application modules.
const project = 'demo-luisices-sdk';
if (process.env.SDK_TEST_PROJECT !== project || process.env.GCLOUD_PROJECT !== project) {
  throw new Error('Use scripts/run-firebase-sdk-tests.mjs com o projeto local fictício.');
}
for (const name of ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST',
  'FIREBASE_DATABASE_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) {
  if (!/^127\.0\.0\.1:\d+$/.test(process.env[name] || '')) {
    throw new Error(`Emulador local obrigatório: ${name}`);
  }
}
if (process.env.SDK_FUNCTIONS_ORIGIN !== 'http://127.0.0.1:5001') {
  throw new Error('Functions deve apontar somente para o emulador local.');
}
const backendRequire = createRequire(path.resolve('functions/package.json'));
const functions = backendRequire('./index.js');
const { getApps, deleteApp } = backendRequire('firebase-admin/app');
const { getAuth } = backendRequire('firebase-admin/auth');
const { getFirestore, FieldValue, Timestamp } = backendRequire('firebase-admin/firestore');
const { getStorage } = backendRequire('firebase-admin/storage');
const { getDatabase } = backendRequire('firebase-admin/database');
const { commitOrderFromDraft } = backendRequire('./alexa/orderService.js');
const { updateUserProfile, processUserSync } = backendRequire('./users/userSyncService.js');
const { assertActiveSession } = backendRequire('./common/helpers.js');
const auth = getAuth();
const db = getFirestore();
const database = getDatabase();
const bucket = getStorage().bucket(`${project}.appspot.com`);
const users: string[] = [];
const objects: string[] = [];
let httpServer: any;

beforeAll(async () => {
  if (process.env.SDK_TEST_HTTP_MODE !== 'wrapper') return;
  // Explicit fallback for environments that prohibit the emulator's Unix sockets.
  // Use the real exported SDK HTTP wrappers, real Admin and local service emulators.
  const express = backendRequire('express');
  const app = express();
  app.use(express.json({ verify: (req: any, _res: any, bytes: Buffer) => { req.rawBody = bytes; } }));
  for (const [name, handler] of Object.entries(functions) as [string, any][]) {
    if (handler.__endpoint.callableTrigger || handler.__endpoint.httpsTrigger) {
      app.all(`/${project}/us-central1/${name}`, (req: any, res: any, next: any) => {
        Promise.resolve(handler(req, res)).catch(next);
      });
    }
  }
  httpServer = await new Promise((resolve, reject) => {
    const server = app.listen(5001, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
});

async function createUser() {
  const uid = `sdk-${randomUUID()}`;
  await auth.createUser({ uid, email: `${uid}@example.test`, password: 'Emulator-only-123!' });
  users.push(uid);
  return uid;
}
async function signIn(uid: string) {
  const customToken = await auth.createCustomToken(uid);
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  expect(response.status).toBe(200);
  return (await response.json()).idToken as string;
}
async function callable(name: string, data: unknown, token?: string) {
  const response = await fetch(`${process.env.SDK_FUNCTIONS_ORIGIN}/${project}/us-central1/${name}`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ data }),
  });
  return { status: response.status, body: await response.json() };
}
async function seedDraft(uid: string) {
  const draftId = `draft-${randomUUID()}`;
  const bindingKey = `binding-${uid}`;
  const personId = `person-${uid}`;
  await Promise.all([
    db.doc('integrationSettings/alexa').set({ enabled: true }),
    db.doc(`userProfiles/${uid}`).set({ active: true, role: 'user', permissions: { orders: { create: true } } }),
    db.doc(`alexaPermissions/${uid}`).set({ enabled: true, mode: 'voice_confirm' }),
    db.doc(`alexaBindings/${bindingKey}`).set({ uid, active: true, revokedAt: null, environment: 'dev' }),
    db.doc(`alexaDrafts/${draftId}`).set({ uid, bindingKey, personId, customer: 'Cliente de teste',
      product: 'Convite', quantity: 2, price: 20, deliveryDate: '2027-12-01', state: 'awaiting_confirmation',
      revision: 1, mode: 'voice_confirm', environment: 'dev', expiresAt: Timestamp.fromMillis(Date.now() + 600000) }),
  ]);
  return { draftId, callerPersonId: personId, expectedRevision: 1, config: { environment: 'dev' }, db };
}

afterAll(async () => {
  if (httpServer) {
    httpServer.closeAllConnections();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  }
  await Promise.all(users.map((uid) => auth.deleteUser(uid)));
  await Promise.all(objects.map((name) => bucket.file(name).delete({ ignoreNotFound: true })));
  await database.ref().remove();
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
  await db.terminate();
  await Promise.all(getApps().map((app: any) => deleteApp(app)));
});

describe('Admin real e contrato publicado das Functions', () => {
  it('carrega todos os exports e mantém geração, triggers, opções e secrets declarados', () => {
    const expected = JSON.parse(readFileSync('tests/backend/fixtures/functions-contract.json', 'utf8'));
    const actual = Object.fromEntries(Object.entries(functions).map(([name, fn]: [string, any]) => {
      expect(typeof fn).toBe('function');
      return [name, JSON.parse(JSON.stringify(fn.__endpoint))];
    }));
    expect(actual).toEqual(expected);
    expect(getApps()).toHaveLength(1);
  });

  it('cria e consulta usuário e transmite claims no token verificado pelo Admin', async () => {
    const uid = await createUser();
    await auth.setCustomUserClaims(uid, { role: 'funcionario', active: true });
    const token = await signIn(uid);
    const decoded = await auth.verifyIdToken(token);
    expect(decoded).toMatchObject({ uid, role: 'funcionario', active: true });
    await expect(auth.verifyIdToken('invalid-token')).rejects.toThrow();
    expect((await auth.getUser(uid)).customClaims).toEqual({ role: 'funcionario', active: true });
    // Auth timestamps have second precision; revoke in a later second than sign-in.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await auth.revokeRefreshTokens(uid);
    expect(Date.parse((await auth.getUser(uid)).tokensValidAfterTime) / 1000).toBeGreaterThan(decoded.auth_time);
    await expect(auth.verifyIdToken(token, true)).rejects.toMatchObject({ code: 'auth/id-token-revoked' });
  });

  it('preserva Timestamp, incremento, remoção e timestamp do servidor no Firestore', async () => {
    const ref = db.doc(`sdkContracts/${randomUUID()}`);
    const date = Timestamp.fromDate(new Date('2026-10-12T12:00:00Z'));
    await ref.set({ date, count: 1, temporary: true });
    await ref.update({ count: FieldValue.increment(2), temporary: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
    const data = (await ref.get()).data();
    expect(data.count).toBe(3);
    expect(data.temporary).toBeUndefined();
    expect(data.date.toDate().toISOString()).toBe('2026-10-12T12:00:00.000Z');
    expect(data.updatedAt.toMillis()).toBeGreaterThan(0);
  });

  it('reverte todas as gravações quando uma transação é rejeitada', async () => {
    const ref = db.doc(`sdkContracts/${randomUUID()}`);
    await ref.set({ count: 1 });
    await expect(db.runTransaction(async (tx: any) => {
      await tx.get(ref);
      tx.update(ref, { count: 9 });
      throw new Error('rollback-contract');
    })).rejects.toThrow('rollback-contract');
    expect((await ref.get()).data().count).toBe(1);
  });

  it('grava, lê metadados, baixa e exclui um anexo pelo Admin no Storage', async () => {
    const name = `sdk-contracts/${randomUUID()}.txt`;
    objects.push(name);
    const file = bucket.file(name);
    await file.save(Buffer.from('anexo de teste'), { resumable: false, metadata: { contentType: 'text/plain', metadata: { emailDraft: 'true' } } });
    expect((await file.download())[0].toString()).toBe('anexo de teste');
    expect((await file.getMetadata())[0]).toMatchObject({ contentType: 'text/plain', metadata: { emailDraft: 'true' } });
    await file.delete();
    expect((await file.exists())[0]).toBe(false);
  });

  it('executa transação e remoção no RTDB pelo Admin', async () => {
    const ref = database.ref(`sdkContracts/${randomUUID()}`);
    await ref.set(1);
    await ref.transaction((count: number | null) => (count || 0) + 1);
    expect((await ref.get()).val()).toBe(2);
    await ref.remove();
    expect((await ref.get()).exists()).toBe(false);
  });

  it('sincroniza mudança de perfil, claims e revogação entre Firestore, Auth e RTDB', async () => {
    const uid = await createUser();
    const profile = db.doc(`userProfiles/${uid}`);
    await profile.set({ role: 'user', active: true, displayName: 'Teste' });
    await profile.collection('devices').doc('test-device').set({ active: true });
    await database.ref(`status/${uid}`).set({ state: 'online' });
    const result = await updateUserProfile({ uid, role: 'funcionario', actorUid: uid });
    expect(result).toMatchObject({ success: true, status: 'completed', synced: true });
    const replay = await processUserSync(uid, { workerId: 'sdk-contract-test' });
    expect(replay.status).toBe('already-synced');
    expect((await auth.getUser(uid)).customClaims).toEqual({ role: 'funcionario', active: true });
    expect((await profile.get()).data().claimsSyncPending).toBeUndefined();
    expect((await profile.collection('devices').get()).empty).toBe(true);
    expect((await database.ref(`status/${uid}`).get()).exists()).toBe(false);
    expect((await database.ref(`revocations/${uid}`).get()).val()).toBeGreaterThan(0);
  });

  it('cria pedido Alexa e recibo atomicamente e não duplica em confirmações concorrentes', async () => {
    const uid = await createUser();
    const params = await seedDraft(uid);
    const [first, second] = await Promise.all([commitOrderFromDraft(params), commitOrderFromDraft(params)]);
    expect(first.orderId).toBe(second.orderId);
    expect([first.isReplay, second.isReplay]).toContain(true);
    expect((await db.collection('orders').where('voiceDraftId', '==', params.draftId).get()).size).toBe(1);
    expect((await db.doc(`orders/${first.orderId}`).get()).data()).toMatchObject({
      userId: uid, quantity: 2, price: 20, deliveryDate: '2027-12-01', source: 'alexa',
    });
    const ledger = (await db.doc(`salesLedger/${first.orderId}`).get()).data();
    expect(ledger).toMatchObject({ orderId: first.orderId, userId: uid, quantity: 2,
      amount: 20, totalAmount: 20, paidAmount: 0, status: 'pending', source: 'alexa' });
    expect(ledger.createdAt.toMillis()).toBeGreaterThan(0);
    expect((await db.doc(`alexaCommits/${params.draftId}`).get()).data().orderId).toBe(first.orderId);
    expect((await db.doc(`alexaDrafts/${params.draftId}`).get()).data().state).toBe('committed');
    expect((await db.doc(`users/${uid}/metadata/counters`).get()).data().orderCounter).toBe(1);
  });

  it('rejeita conta desativada sem gravar pedido, ledger ou recibo', async () => {
    const uid = await createUser();
    const params = await seedDraft(uid);
    await auth.updateUser(uid, { disabled: true });
    await expect(commitOrderFromDraft(params)).rejects.toThrow('USER_DISABLED');
    expect((await db.collection('orders').where('voiceDraftId', '==', params.draftId).get()).empty).toBe(true);
    expect((await db.doc(`alexaCommits/${params.draftId}`).get()).exists).toBe(false);
    expect((await db.doc(`users/${uid}/metadata/counters`).get()).exists).toBe(false);
    expect((await db.doc(`alexaDrafts/${params.draftId}`).get()).data().state).toBe('awaiting_confirmation');
  });

  it('rejeita sessão no limite temporal de revogação com código estável', async () => {
    const uid = await createUser();
    await db.doc(`userProfiles/${uid}`).set({ active: true, tokensValidAfterTime: 100 });
    await expect(assertActiveSession({ auth: { uid, token: { auth_time: 100 } } })).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(await assertActiveSession({ auth: { uid, token: { auth_time: 101 } } })).toMatchObject({ uid });
  });
});

describe(`Protocolo HTTP nas Functions (${process.env.SDK_TEST_HTTP_MODE})`, () => {
  it('serializa rejeição de callable sem autenticação', async () => {
    const result = await callable('getEmailUsage', {});
    expect(result.status).toBe(401);
    expect(result.body.error.status).toBe('UNAUTHENTICATED');
  });

  it('getEmailUsage nega perfil sem permissão e retorna métricas sem chamar o provedor real', async () => {
    const deniedUid = await createUser();
    await db.doc(`userProfiles/${deniedUid}`).set({ active: true, role: 'user', permissions: {} });
    const denied = await callable('getEmailUsage', {}, await signIn(deniedUid));
    expect(denied.status).toBe(403);
    expect(denied.body.error.status).toBe('PERMISSION_DENIED');

    const allowedUid = await createUser();
    await db.doc(`userProfiles/${allowedUid}`).set({ active: true, role: 'user', permissions: { emails: { view: true } } });
    const sentAt = new Date().toISOString();
    await db.collection('sentEmails').doc(`usage-${allowedUid}`).set({ sentAt, senderUid: allowedUid });

    // Invoca o handler real sobre o Firestore Emulator, mas intercepta as duas
    // requisições Resend para que o teste nunca dependa de rede ou credenciais.
    const originalFetch = globalThis.fetch;
    const originalResendApiKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = 'sdk-test-placeholder';
    let resendRequests = 0;
    globalThis.fetch = async (input, init) => {
      if (String(input).startsWith('https://api.resend.com/emails/metrics')) {
        resendRequests += 1;
        expect(new Headers(init?.headers).get('authorization')).toBe('Bearer sdk-test-placeholder');
        return new Response(JSON.stringify({ totals: { sent: 2 } }), {
          status: 200, headers: { 'content-type': 'application/json' },
        });
      }
      return originalFetch(input, init);
    };
    try {
      const result = await (functions.getEmailUsage as any).run({
        auth: { uid: allowedUid, token: { auth_time: Math.floor(Date.now() / 1000) } },
        data: {},
        rawRequest: { headers: { 'x-origin-secret': 'sdk-test-placeholder' } },
      });
      expect(resendRequests).toBe(2);
      expect(result).toMatchObject({
        success: true,
        source: 'resend_api',
        daily: { used: 2, sent: 2, limit: 100, received: 0 },
        monthly: { used: 2, sent: 2, limit: 3000, received: 0 },
      });
      expect(result.daily.resetsAt).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
      expect(result.monthly.resetsAt).toMatch(/^\d{4}-\d{2}-01T00:00:00\.000Z$/);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalResendApiKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = originalResendApiKey;
    }
  });

  it('nega acesso protegido quando o token é inválido', async () => {
    const result = await callable('getUserAccountMetadata', { uids: [] }, 'invalid-token');
    if (process.env.SDK_TEST_HTTP_MODE === 'wrapper') {
      expect(result.status).toBe(401);
      expect(result.body.error.status).toBe('UNAUTHENTICATED');
    } else {
      // The CLI enables skipTokenVerification in its runtime. It may pass a
      // simulated identity to the handler, which must still deny access.
      expect([401, 403]).toContain(result.status);
      expect(['UNAUTHENTICATED', 'PERMISSION_DENIED']).toContain(result.body.error.status);
    }
  });

  it('autentica administrador pelo token real e retorna metadados do Auth', async () => {
    const uid = await createUser();
    await db.doc(`userProfiles/${uid}`).set({ active: true, role: 'admin' });
    await auth.setCustomUserClaims(uid, { role: 'admin', active: true });
    const result = await callable('getUserAccountMetadata', { uids: [uid] }, await signIn(uid));
    expect(result.status).toBe(200);
    expect(result.body.result.users).toEqual([expect.objectContaining({ uid, authCreatedAt: expect.any(String) })]);
  });

  it('preserva INVALID_ARGUMENT enviado pelo handler com sessão válida', async () => {
    const uid = await createUser();
    await db.doc(`userProfiles/${uid}`).set({ active: true, role: 'admin' });
    const result = await callable('getUserAccountMetadata', { uids: 'not-an-array' }, await signIn(uid));
    expect(result.status).toBe(400);
    expect(result.body.error.status).toBe('INVALID_ARGUMENT');
  });

  it('nega a callable quando o perfil autenticado está inativo', async () => {
    const uid = await createUser();
    await db.doc(`userProfiles/${uid}`).set({ active: false, role: 'admin' });
    const result = await callable('getUserAccountMetadata', { uids: [] }, await signIn(uid));
    expect(result.status).toBe(403);
    expect(result.body.error.status).toBe('PERMISSION_DENIED');
  });

  it('serializa falha inesperada do SDK como INTERNAL sem expor detalhes internos', async () => {
    const uid = await createUser();
    await db.doc(`userProfiles/${uid}`).set({ active: true, role: 'admin' });
    // This passes the application's array check but is invalid for Admin getUsers().
    const result = await callable('getUserAccountMetadata', { uids: [''] }, await signIn(uid));
    expect(result.status).toBe(500);
    expect(result.body.error).toEqual({ status: 'INTERNAL', message: 'INTERNAL' });
  });

  it('preserva bloqueio de origem do webhook HTTP sem chamar provedores externos', async () => {
    const response = await fetch(`${process.env.SDK_FUNCTIONS_ORIGIN}/${project}/us-central1/alexaWebhook`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toHaveProperty('error');
  });
});

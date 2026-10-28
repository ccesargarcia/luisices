import { describe, expect, it, vi } from 'vitest';

const { registerDeviceSessionCore } = require('../../functions/users/registerDeviceSessionCore') as {
  registerDeviceSessionCore: (request: any, dependencies: any) => Promise<{ success: true }>;
};

function createFirestore(seed: Record<string, any> = {}) {
  const documents = new Map(Object.entries(seed));
  const writes: Array<{ type: string; path: string; value?: any }> = [];
  const makeSnapshot = (id: string, value: any) => ({
    id,
    exists: value !== undefined,
    data: () => value,
  });
  const db = {
    doc: (path: string) => ({ path }),
    collection: (path: string) => ({
      path,
      __collection: true,
      doc: (id: string) => ({ path: `${path}/${id}` }),
    }),
    runTransaction: (callback: (transaction: any) => Promise<any>) => callback({
      get: async (ref: any) => {
        if (ref.__collection) {
          const prefix = `${ref.path}/`;
          const entries = [...documents.entries()].filter(([path]) => path.startsWith(prefix));
          return {
            size: entries.length,
            forEach: (handler: (snapshot: any) => void) => entries.forEach(([path, value]) =>
              handler(makeSnapshot(path.slice(prefix.length), value))),
          };
        }
        return makeSnapshot(ref.path.split('/').pop(), documents.get(ref.path));
      },
      set: (ref: any, value: any) => {
        writes.push({ type: 'set', path: ref.path, value });
        documents.set(ref.path, value);
      },
      update: (ref: any, value: any) => {
        writes.push({ type: 'update', path: ref.path, value });
        documents.set(ref.path, { ...documents.get(ref.path), ...value });
      },
      delete: (ref: any) => {
        writes.push({ type: 'delete', path: ref.path });
        documents.delete(ref.path);
      },
    }),
  };
  return { db, documents, writes, timestamp };
}

const request = (overrides: Record<string, any> = {}) => ({
  auth: { uid: 'user-1', token: { auth_time: 1_800_000_000 } },
  data: { deviceId: 'device_123', userAgent: 'Luisices Android' },
  rawRequest: { headers: { 'x-forwarded-for': '::ffff:203.0.113.8, 10.0.0.1' } },
  ...overrides,
});

describe('registerDeviceSessionCore', () => {
  it('nega chamadas sem autenticação antes de iniciar a transação', async () => {
    const { db } = createFirestore();
    const runTransaction = vi.spyOn(db, 'runTransaction');

    await expect(registerDeviceSessionCore(request({ auth: null }), {
      db,
      serverTimestamp: () => ({ serverTimestamp: true }),
    })).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it.each(['../device', 'ab', 42])('rejeita deviceId inválido (%j) sem gravar', async (deviceId) => {
    const { db, writes } = createFirestore();
    await expect(registerDeviceSessionCore(request({ data: { deviceId } }), {
      db,
      serverTimestamp: () => ({ serverTimestamp: true }),
    })).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(writes).toEqual([]);
  });

  it('nega perfil inexistente ou inativo sem alterar dispositivos', async () => {
    for (const profile of [undefined, { active: false }]) {
      const { db, writes } = createFirestore(profile ? { 'userProfiles/user-1': profile } : {});
      await expect(registerDeviceSessionCore(request(), {
        db,
        serverTimestamp: () => ({ serverTimestamp: true }),
      })).rejects.toMatchObject({ code: 'permission-denied' });
      expect(writes).toEqual([]);
    }
  });

  it('nega token emitido antes ou no instante da revogação global', async () => {
    const { db, writes } = createFirestore({
      'userProfiles/user-1': { active: true, tokensValidAfterTime: 1_800_000_000 },
    });
    await expect(registerDeviceSessionCore(request(), {
      db,
      serverTimestamp: () => ({ serverTimestamp: true }),
    })).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(writes).toEqual([]);
  });

  it('não reativa dispositivo revogado por heartbeat ou cliente antigo', async () => {
    const { db, writes } = createFirestore({
      'userProfiles/user-1': { active: true },
      'userProfiles/user-1/devices/device_123': { status: 'revoked' },
    });
    await expect(registerDeviceSessionCore(request(), {
      db,
      serverTimestamp: () => ({ serverTimestamp: true }),
    })).rejects.toMatchObject({ code: 'permission-denied' });
    expect(writes).toEqual([]);
  });

  it('atualiza dispositivo conhecido e preserva localização se o IP não mudou', async () => {
    const existing = { status: 'active', ip: '203.0.113.8', location: 'São Paulo' };
    const { db, writes } = createFirestore({
      'userProfiles/user-1': { active: true },
      'userProfiles/user-1/devices/device_123': existing,
    });
    const result = await registerDeviceSessionCore(request(), {
      db,
      serverTimestamp: () => 'server-time',
    });
    expect(result).toEqual({ success: true });
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      type: 'update',
      path: 'userProfiles/user-1/devices/device_123',
      value: { ip: '203.0.113.8', location: 'São Paulo', status: 'active', lastActiveAt: 'server-time' },
    });
    expect(writes[0].value.userAgent).toBe('Luisices Android');
  });

  it('registra novo dispositivo normalizando IP e limitando userAgent', async () => {
    const { db, writes } = createFirestore({ 'userProfiles/user-1': { active: true } });
    await registerDeviceSessionCore(request({ data: { deviceId: 'device_123', userAgent: ' A'.repeat(200) } }), {
      db,
      serverTimestamp: () => 'server-time',
    });
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      type: 'set',
      path: 'userProfiles/user-1/devices/device_123',
      value: {
        deviceId: 'device_123',
        ip: '203.0.113.8',
        location: 'Localização não verificada',
        status: 'active',
        createdAt: 'server-time',
        lastActiveAt: 'server-time',
      },
    });
    expect(writes[0].value.userAgent.length).toBeLessThanOrEqual(303);
  });

  it('ao atingir 10 dispositivos, remove o mais antigo e registra o novo atomicamente', async () => {
    const seed: Record<string, any> = { 'userProfiles/user-1': { active: true } };
    for (let index = 0; index < 10; index += 1) {
      seed[`userProfiles/user-1/devices/old-${index}`] = {
        status: 'active',
        createdAt: { toMillis: () => index + 1 },
      };
    }
    const { db, writes } = createFirestore(seed);
    await registerDeviceSessionCore(request(), { db, serverTimestamp: () => 'server-time' });
    expect(writes.map(({ type, path }) => ({ type, path }))).toEqual([
      { type: 'delete', path: 'userProfiles/user-1/devices/old-0' },
      { type: 'set', path: 'userProfiles/user-1/devices/device_123' },
    ]);
  });
});

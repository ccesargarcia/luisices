import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
const require = createRequire(import.meta.url);
const { requestDeviceLogout } = require('../../functions/users/deviceLogout.js');
const { assertActiveSession } = require('../../functions/common/helpers.js');

function fixture({ caller = 'owner', role = 'user', exists = true, status = 'active' } = {}) {
  const transaction = { get: vi.fn().mockResolvedValue({ exists, data: () => ({ status }) }), update: vi.fn() };
  const deps = {
    assertActiveSession: vi.fn().mockResolvedValue({ uid: caller, profile: { role } }),
    db: { doc: vi.fn((path) => path), runTransaction: vi.fn((callback) => callback(transaction)) },
    timestamp: () => 'server-time',
  };
  return { deps, transaction, request: { data: { uid: 'owner', deviceId: 'device' } } };
}

describe('Autorização da solicitação de logout', () => {
  it('o próprio usuário ativo pode solicitar desconexão', async () => {
    const { deps, request, transaction } = fixture();
    expect(await requestDeviceLogout(request, deps)).toEqual({ success: true, enforcement: 'client-logout-request' });
    expect(deps.assertActiveSession).toHaveBeenCalledWith(request);
    expect(transaction.update).toHaveBeenCalledWith('userProfiles/owner/devices/device', expect.objectContaining({ status: 'revoked', revokedBy: 'owner' }));
  });
  it('um administrador ativo pode solicitar desconexão de outro usuário', async () => {
    const { deps, request } = fixture({ caller: 'admin', role: 'admin' });
    await expect(requestDeviceLogout(request, deps)).resolves.toMatchObject({ success: true });
  });
  it('usuário comum não age sobre dispositivo alheio', async () => {
    const { deps, request } = fixture({ caller: 'other' });
    await expect(requestDeviceLogout(request, deps)).rejects.toMatchObject({ code: 'permission-denied' });
    expect(deps.db.runTransaction).not.toHaveBeenCalled();
  });
  it('rejeita solicitante com sessão inválida antes de gravar', async () => {
    const { deps, request, transaction } = fixture();
    deps.assertActiveSession.mockRejectedValue(new Error('Sessão revogada'));
    await expect(requestDeviceLogout(request, deps)).rejects.toThrow('Sessão revogada');
    expect(transaction.update).not.toHaveBeenCalled();
  });
  it.each(['../path', 'nested/device', '.', '..', '', 'a'.repeat(129)])('rejeita deviceId inválido %s', async (deviceId) => {
    const { deps, request } = fixture();
    request.data.deviceId = deviceId;
    await expect(requestDeviceLogout(request, deps)).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(deps.db.doc).not.toHaveBeenCalled();
  });
  it('não cria dispositivo inexistente', async () => {
    const { deps, request, transaction } = fixture({ exists: false });
    await expect(requestDeviceLogout(request, deps)).rejects.toMatchObject({ code: 'not-found' });
    expect(transaction.update).not.toHaveBeenCalled();
  });
  it('repetir a solicitação preserva o primeiro registro', async () => {
    const { deps, request, transaction } = fixture({ status: 'revoked' });
    await requestDeviceLogout(request, deps);
    expect(transaction.update).not.toHaveBeenCalled();
  });
  it.each([undefined, NaN, Infinity, '101', 100])('perfil revogado rejeita auth_time inválido ou antigo %s', async (authTime) => {
    const db = { collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => ({ active: true, tokensValidAfterTime: 100 }) }) }) }) };
    await expect(assertActiveSession({ auth: { uid: 'owner', token: { auth_time: authTime } } }, { db })).rejects.toMatchObject({ code: 'unauthenticated' });
  });
});

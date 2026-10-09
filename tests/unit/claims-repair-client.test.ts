import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ callable: vi.fn(), functions: { domain: 'configured-gateway' } }));
vi.mock('../../src/lib/firebase', () => ({ functions: mocks.functions }));
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn(() => mocks.callable) }));
import { httpsCallable } from 'firebase/functions';
import { repairClaimsIfNeeded } from '../../src/services/claimsRepairService';

const desired = { role: 'admin', active: true };
const makeUser = () => ({ uid: 'admin', getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }) } as any);
beforeEach(() => vi.clearAllMocks());

describe('Propagação das claims reparadas', () => {
  it('verifica claims renovadas após sucesso, mantendo o gateway configurado', async () => {
    const user = makeUser();
    user.getIdTokenResult.mockResolvedValueOnce({ claims: {} }).mockResolvedValueOnce({ claims: desired });
    mocks.callable.mockResolvedValue({ data: { synced: true, status: 'completed' } });
    expect(await repairClaimsIfNeeded(user, desired)).toMatchObject({ synced: true });
    expect(httpsCallable).toHaveBeenCalledWith(mocks.functions, 'repairUserClaims');
    expect(user.getIdTokenResult).toHaveBeenLastCalledWith(true);
  });

  it('não força refresh quando backend indica trabalho pendente', async () => {
    const user = makeUser();
    mocks.callable.mockResolvedValue({ data: { synced: false, status: 'locked' } });
    expect(await repairClaimsIfNeeded(user, desired)).toEqual({ synced: false, status: 'locked' });
    expect(user.getIdTokenResult).not.toHaveBeenCalledWith(true);
  });

  it('não mascara falha do gateway com refresh inútil', async () => {
    const user = makeUser();
    mocks.callable.mockRejectedValue(new Error('gateway'));
    await expect(repairClaimsIfNeeded(user, desired)).rejects.toThrow('gateway');
    expect(user.getIdTokenResult).not.toHaveBeenCalledWith(true);
  });

  it('deduplica chamadas simultâneas de snapshots do mesmo usuário', async () => {
    const user = makeUser();
    let release!: (value: any) => void;
    mocks.callable.mockReturnValue(new Promise(resolve => { release = resolve; }));
    const first = repairClaimsIfNeeded(user, desired);
    const second = repairClaimsIfNeeded(user, desired);
    await vi.waitFor(() => expect(mocks.callable).toHaveBeenCalledTimes(1));
    user.getIdTokenResult.mockResolvedValue({ claims: desired });
    release({ data: { synced: true } });
    const results = await Promise.all([first, second]);
    expect(results.every(result => result.synced)).toBe(true);
    expect(mocks.callable).toHaveBeenCalledTimes(1);
  });

  it('não anuncia sucesso se o token renovado ainda divergir', async () => {
    const user = makeUser();
    mocks.callable.mockResolvedValue({ data: { synced: true, status: 'completed' } });
    expect(await repairClaimsIfNeeded(user, desired)).toMatchObject({ synced: false });
  });

  it('não usa sucesso de um perfil antigo para confirmar outro perfil concorrente', async () => {
    const user = makeUser();
    let release!: (value: any) => void;
    mocks.callable.mockReturnValue(new Promise(resolve => { release = resolve; }));
    const first = repairClaimsIfNeeded(user, desired);
    const second = repairClaimsIfNeeded(user, { role: 'user', active: true });
    await vi.waitFor(() => expect(mocks.callable).toHaveBeenCalledTimes(1));
    user.getIdTokenResult.mockResolvedValue({ claims: desired });
    release({ data: { synced: true } });
    expect((await first).synced).toBe(true);
    expect((await second).synced).toBe(false);
  });

  it('não chama backend com claims já corretas', async () => {
    const user = makeUser();
    user.getIdTokenResult.mockResolvedValue({ claims: desired });
    expect(await repairClaimsIfNeeded(user, desired)).toMatchObject({ synced: true });
    expect(mocks.callable).not.toHaveBeenCalled();
  });
});


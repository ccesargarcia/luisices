import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as any },
  tokenChanged: null as any,
  tokenUnsubscribe: vi.fn(),
  subscriptions: [] as any[],
  onValue: vi.fn(),
}));
vi.mock('../../src/lib/firebase', () => ({
  auth: mocks.auth,
  database: { app: { options: { projectId: 'demo-luisices-presence', databaseURL: 'http://localhost:9000' } } },
}));
vi.mock('firebase/auth', () => ({
  onIdTokenChanged: vi.fn((_auth, handler) => { mocks.tokenChanged = handler; return mocks.tokenUnsubscribe; }),
}));
vi.mock('firebase/database', () => ({ ref: vi.fn((_database, path) => path), onValue: mocks.onValue }));
import { subscribeAdminPresence } from '../../src/services/adminPresenceService';

function user(claims: Record<string, unknown> = {}) {
  const value = { uid: 'admin', getIdTokenResult: vi.fn().mockResolvedValue({ claims }) };
  mocks.auth.currentUser = value;
  return value;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.currentUser = null;
  mocks.subscriptions = [];
  mocks.onValue.mockImplementation((path, value, error) => {
    const unsubscribe = vi.fn();
    mocks.subscriptions.push({ path, value, error, unsubscribe });
    return unsubscribe;
  });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('Presença administrativa autorizada pelo token', () => {
  it('não abre /status com role ausente; abre após refresh do mesmo objeto User', async () => {
    const admin = user();
    const update = vi.fn();
    const stop = subscribeAdminPresence('admin', update);
    await mocks.tokenChanged(admin);
    expect(mocks.onValue).not.toHaveBeenCalled();
    expect(update).toHaveBeenLastCalledWith({ state: 'claims-pending', data: {} });
    admin.getIdTokenResult.mockResolvedValue({ claims: { role: 'admin', active: true } });
    await mocks.tokenChanged(admin);
    expect(mocks.subscriptions[0].path).toBe('/status');
    mocks.subscriptions[0].value({ val: () => ({ member: { connections: { tab: true } } }) });
    expect(update).toHaveBeenLastCalledWith({ state: 'ready', data: { member: { connections: { tab: true } } } });
    stop();
  });

  it('limpa presença após permission_denied e reanexa quando o token é renovado', async () => {
    const admin = user({ role: 'admin', active: true });
    const update = vi.fn();
    const stop = subscribeAdminPresence('admin', update);
    await mocks.tokenChanged(admin);
    mocks.subscriptions[0].value({ val: () => ({ member: { state: 'online' } }) });
    mocks.subscriptions[0].error({ code: 'PERMISSION_DENIED' });
    expect(update).toHaveBeenLastCalledWith({ state: 'unavailable', data: {} });
    expect(admin.getIdTokenResult).toHaveBeenCalledTimes(1); // sem loop de refresh em erro
    await mocks.tokenChanged(admin);
    expect(mocks.subscriptions).toHaveLength(2);
    expect(mocks.subscriptions[0].unsubscribe).toHaveBeenCalledOnce();
    stop();
  });

  it.each([{ role: 'user', active: true }, { role: 'admin', active: false }])('não abre /status para claims %j', async (claims) => {
    const current = user(claims);
    const stop = subscribeAdminPresence('admin', vi.fn());
    await mocks.tokenChanged(current);
    expect(mocks.onValue).not.toHaveBeenCalled();
    stop();
  });

  it('descarta token resolvido depois de logout', async () => {
    const admin = user();
    let release!: (value: any) => void;
    admin.getIdTokenResult.mockReturnValue(new Promise(resolve => { release = resolve; }));
    const update = vi.fn();
    const stop = subscribeAdminPresence('admin', update);
    const pending = mocks.tokenChanged(admin);
    mocks.auth.currentUser = null;
    await mocks.tokenChanged(null);
    release({ claims: { role: 'admin', active: true } });
    await pending;
    expect(mocks.onValue).not.toHaveBeenCalled();
    expect(update).toHaveBeenLastCalledWith({ state: 'unavailable', data: {} });
    stop();
  });

  it('remove listeners e ignora callbacks antigos após desmontagem', async () => {
    const admin = user({ role: 'admin', active: true });
    const update = vi.fn();
    const stop = subscribeAdminPresence('admin', update);
    await mocks.tokenChanged(admin);
    stop();
    update.mockClear();
    mocks.subscriptions[0].value({ val: () => ({ leaked: true }) });
    expect(update).not.toHaveBeenCalled();
    expect(mocks.subscriptions[0].unsubscribe).toHaveBeenCalledOnce();
    expect(mocks.tokenUnsubscribe).toHaveBeenCalledOnce();
  });
});


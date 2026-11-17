import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/users-admin';
import { dispatchUsersAction, PUBLIC_USER_ACTIONS } from '../../api/_usersActionDispatcher';

const originalOriginSecret = process.env.BETA_VERCEL_ORIGIN_SECRET;

function createResponse() {
  const state: { statusCode?: number; body?: unknown; headers: Record<string, string> } = { headers: {} };
  const response = {
    setHeader(name: string, value: string) {
      state.headers[name] = value;
    },
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

describe('Vercel Users admin API edge-origin gate & dispatcher', () => {
  afterEach(() => {
    if (originalOriginSecret === undefined) delete process.env.BETA_VERCEL_ORIGIN_SECRET;
    else process.env.BETA_VERCEL_ORIGIN_SECRET = originalOriginSecret;
  });

  it('rejects direct POST calls before initializing Firebase Admin when the secret is missing', async () => {
    delete process.env.BETA_VERCEL_ORIGIN_SECRET;
    const { state, response } = createResponse();

    await handler({ method: 'POST', headers: {}, body: { action: 'createUser' } }, response);

    expect(state.statusCode).toBe(403);
    expect(state.body).toMatchObject({ error: { code: 'permission-denied' } });
    expect(state.headers['Cache-Control']).toBe('no-store');
  });

  it('rejects direct OPTIONS requests before handling preflight', async () => {
    process.env.BETA_VERCEL_ORIGIN_SECRET = 'configured-origin-secret';
    const { state, response } = createResponse();

    await handler({ method: 'OPTIONS', headers: {} }, response);

    expect(state.statusCode).toBe(403);
    expect(state.body).toMatchObject({ error: { code: 'permission-denied' } });
  });

  it('checks method after a valid edge secret without initializing Firebase Admin', async () => {
    process.env.BETA_VERCEL_ORIGIN_SECRET = 'configured-origin-secret';
    const { state, response } = createResponse();

    await handler({
      method: 'GET',
      headers: { 'x-beta-edge-secret': 'configured-origin-secret' },
    }, response);

    expect(state.statusCode).toBe(405);
    expect(state.body).toBe('Method Not Allowed');
  });

  it('marks only invitation validation/completion and password reset as optional-auth public actions', () => {
    expect([...PUBLIC_USER_ACTIONS].sort()).toEqual([
      'completeUserInvitation',
      'sendPasswordResetEmail',
      'validateUserInvitation',
    ]);
  });

  it.each([
    'validateUserInvitation',
    'completeUserInvitation',
    'sendPasswordResetEmail',
    'sendAdminPasswordReset',
    'createUserInvitation',
    'sendVerificationEmail',
    'getUserAccountMetadata',
    'recordUserPasswordChange',
    'deleteUser',
    'createUser',
    'updateUser',
    'registerDeviceSession',
    'revokeAllSessions',
    'revokeDeviceSession',
    'repairUserClaims',
  ])('dispatches %s cleanly', async (action) => {
    const fn = vi.fn().mockResolvedValue({ success: true });
    const req = { auth: { uid: 'user-1' }, data: {} };
    await expect(dispatchUsersAction(action, req, { [action]: fn })).resolves.toEqual({ success: true });
    expect(fn).toHaveBeenCalledWith(req);
  });

  it.each(['unknown', 'constructor', '__proto__'])('rejects invalid or inherited action %s', async (action) => {
    await expect(dispatchUsersAction(action, {}, {})).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});

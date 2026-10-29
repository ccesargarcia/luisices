import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { completeUserInvitationCore } = require('../../functions/users/completeUserInvitationCore.js');
const { activateInvitedAccountCore } = require('../../functions/users/invitationActivationCore.js');

class TestHttpsError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const now = new Date('2026-10-28T12:00:00.000Z');
const validUntil = new Date('2026-10-29T12:00:00.000Z');
const invitationData = (overrides: Record<string, unknown> = {}) => ({
  email: 'invite@example.com',
  status: 'pending',
  expiresAt: { toDate: () => validUntil },
  invitedBy: 'admin-1',
  ...overrides,
});

function completionDependencies(data = invitationData(), exists = true) {
  const get = vi.fn().mockResolvedValue({ exists, data: () => data });
  const invitationRef = { id: 'hashed-token', get };
  const doc = vi.fn(() => invitationRef);
  const collection = vi.fn(() => ({ doc }));
  const db = { collection };
  const hashToken = vi.fn((token: string) => `sha256:${token}`);
  const getUser = vi.fn();
  const getUserByEmail = vi.fn();
  const activateInvitedAccount = vi.fn();
  return { db, hashToken, getUser, getUserByEmail, activateInvitedAccount, collection, doc, get, invitationRef };
}

const request = (token?: unknown) => ({ data: token === undefined ? {} : { token } });
const verifiedUser = (overrides: Record<string, unknown> = {}) => ({
  uid: 'user-1',
  email: 'invite@example.com',
  emailVerified: true,
  displayName: 'Demo User',
  metadata: { creationTime: '2026-10-28T10:00:00.000Z' },
  ...overrides,
});

describe('completeUserInvitationCore', () => {
  it.each([undefined, null, '', 42])('rejects invalid token input (%s) before reading Firestore', async (token) => {
    const deps = completionDependencies();
    await expect(completeUserInvitationCore(request(token), {
      ...deps, HttpsError: TestHttpsError, now: () => now,
    })).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(deps.collection).not.toHaveBeenCalled();
    expect(deps.getUserByEmail).not.toHaveBeenCalled();
    expect(deps.activateInvitedAccount).not.toHaveBeenCalled();
  });

  it('loads by token hash, verifies the invited email, activates the account and preserves response shape', async () => {
    const deps = completionDependencies();
    deps.getUserByEmail.mockResolvedValue(verifiedUser());

    await expect(completeUserInvitationCore(request('raw-invite-token'), {
      ...deps, HttpsError: TestHttpsError, now: () => now,
    })).resolves.toEqual({ success: true });

    expect(deps.hashToken).toHaveBeenCalledWith('raw-invite-token');
    expect(deps.doc).toHaveBeenCalledWith('sha256:raw-invite-token');
    expect(deps.getUserByEmail).toHaveBeenCalledWith('invite@example.com');
    expect(deps.activateInvitedAccount).toHaveBeenCalledWith(
      deps.invitationRef, expect.objectContaining({ email: 'invite@example.com' }), expect.objectContaining({ uid: 'user-1' }),
    );
  });

  it('rejects missing and expired invitations without accessing Firebase Auth', async () => {
    const missing = completionDependencies(undefined, false);
    await expect(completeUserInvitationCore(request('unknown'), {
      ...missing, HttpsError: TestHttpsError, now: () => now,
    })).rejects.toMatchObject({ code: 'not-found' });

    const expired = completionDependencies(invitationData({
      expiresAt: { toDate: () => new Date(now.getTime() - 1) },
    }));
    await expect(completeUserInvitationCore(request('expired'), {
      ...expired, HttpsError: TestHttpsError, now: () => now,
    })).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(expired.getUserByEmail).not.toHaveBeenCalled();
  });

  it('rejects a pending invitation until the matching Firebase Auth email is verified', async () => {
    const deps = completionDependencies();
    deps.getUserByEmail.mockResolvedValue(verifiedUser({ emailVerified: false }));
    await expect(completeUserInvitationCore(request('raw-token'), {
      ...deps, HttpsError: TestHttpsError, now: () => now,
    })).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(deps.activateInvitedAccount).not.toHaveBeenCalled();
  });

  it('treats a repeated completion by the same verified account as idempotent', async () => {
    const deps = completionDependencies(invitationData({ status: 'accepted', acceptedBy: 'user-1' }));
    deps.getUser.mockResolvedValue(verifiedUser());
    await expect(completeUserInvitationCore(request('same-token'), {
      ...deps, HttpsError: TestHttpsError, now: () => now,
    })).resolves.toEqual({ success: true });
    expect(deps.getUser).toHaveBeenCalledWith('user-1');
    expect(deps.getUserByEmail).not.toHaveBeenCalled();
    expect(deps.activateInvitedAccount).not.toHaveBeenCalled();
  });

  it('does not accept an already-used invitation for a different email identity', async () => {
    const deps = completionDependencies(invitationData({ status: 'accepted', acceptedBy: 'other-user' }));
    deps.getUser.mockResolvedValue(verifiedUser({ email: 'someone-else@example.com' }));
    await expect(completeUserInvitationCore(request('used-token'), {
      ...deps, HttpsError: TestHttpsError, now: () => now,
    })).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(deps.activateInvitedAccount).not.toHaveBeenCalled();
  });
});

function activationDependencies({ invitation = invitationData(), profile = null }: {
  invitation?: Record<string, any>;
  profile?: Record<string, any> | null;
} = {}) {
  const invitationRef = { path: 'invitations/hashed-token' };
  const profileRef = { path: 'userProfiles/user-1' };
  const state = { invitation, profile };
  const writes: Array<{ type: string; ref: unknown; data?: unknown }> = [];
  const db = {
    doc: vi.fn(() => profileRef),
    runTransaction: vi.fn(async (callback: (transaction: any) => Promise<void>) => callback({
      get: vi.fn(async (ref: { path: string }) => {
        const value = ref.path.startsWith('invitations/') ? state.invitation : state.profile;
        return { exists: value !== null, data: () => value };
      }),
      set: vi.fn((ref: unknown, data: unknown) => writes.push({ type: 'set', ref, data })),
      update: vi.fn((ref: unknown, data: unknown) => writes.push({ type: 'update', ref, data })),
    })),
  };
  const FieldValue = { serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP') };
  const invitedUserPermissions = { orders: { view: true, create: true, edit: false, delete: false } };
  return { db, FieldValue, invitedUserPermissions, invitationRef, profileRef, state, writes };
}

describe('activateInvitedAccountCore', () => {
  it('atomically creates a restricted active profile and accepts the invitation', async () => {
    const deps = activationDependencies();
    await activateInvitedAccountCore(deps.invitationRef, deps.state.invitation, verifiedUser(), {
      ...deps, HttpsError: TestHttpsError, now: () => now,
    });

    expect(deps.writes).toEqual([
      {
        type: 'set', ref: deps.profileRef,
        data: expect.objectContaining({
          uid: 'user-1', email: 'invite@example.com', displayName: 'Demo User', role: 'user',
          active: true, whatsappPhone: null, permissions: deps.invitedUserPermissions, invitedBy: 'admin-1',
        }),
      },
      {
        type: 'update', ref: deps.invitationRef,
        data: { status: 'accepted', acceptedBy: 'user-1', acceptedAt: 'SERVER_TIMESTAMP' },
      },
    ]);
  });

  it('rejects unverified or mismatching identities before starting a Firestore transaction', async () => {
    const unverified = activationDependencies();
    await expect(activateInvitedAccountCore(unverified.invitationRef, unverified.state.invitation,
      verifiedUser({ emailVerified: false }), { ...unverified, HttpsError: TestHttpsError }))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    expect(unverified.db.runTransaction).not.toHaveBeenCalled();

    const mismatch = activationDependencies();
    await expect(activateInvitedAccountCore(mismatch.invitationRef, mismatch.state.invitation,
      verifiedUser({ email: 'different@example.com' }), { ...mismatch, HttpsError: TestHttpsError }))
      .rejects.toMatchObject({ code: 'permission-denied' });
    expect(mismatch.db.runTransaction).not.toHaveBeenCalled();
  });

  it('does not overwrite an existing profile with a different email', async () => {
    const deps = activationDependencies({ profile: { email: 'different@example.com', role: 'admin' } });
    await expect(activateInvitedAccountCore(deps.invitationRef, deps.state.invitation, verifiedUser(), {
      ...deps, HttpsError: TestHttpsError, now: () => now,
    })).rejects.toMatchObject({ code: 'already-exists' });
    expect(deps.writes).toEqual([]);
  });

  it('repairs an existing same-email profile without replacing its permissions', async () => {
    const existingProfile = { email: 'INVITE@example.com', role: 'user', permissions: { reports: true } };
    const deps = activationDependencies({ profile: existingProfile });
    await activateInvitedAccountCore(deps.invitationRef, deps.state.invitation, verifiedUser(), {
      ...deps, HttpsError: TestHttpsError, now: () => now,
    });
    expect(deps.writes).toEqual([{
      type: 'update', ref: deps.invitationRef,
      data: { status: 'accepted', acceptedBy: 'user-1', acceptedAt: 'SERVER_TIMESTAMP' },
    }]);
  });

  it('allows the same account to win a concurrent completion without duplicate writes', async () => {
    const deps = activationDependencies({
      invitation: invitationData({ status: 'accepted', acceptedBy: 'user-1' }),
    });
    await activateInvitedAccountCore(deps.invitationRef, invitationData(), verifiedUser(), {
      ...deps, HttpsError: TestHttpsError, now: () => now,
    });
    expect(deps.writes).toEqual([]);
  });

  it('rechecks expiry and pending state inside the transaction', async () => {
    const expired = activationDependencies({
      invitation: invitationData({ expiresAt: { toDate: () => new Date(now.getTime() - 1) } }),
    });
    await expect(activateInvitedAccountCore(expired.invitationRef, invitationData(), verifiedUser(), {
      ...expired, HttpsError: TestHttpsError, now: () => now,
    })).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(expired.writes).toEqual([]);
  });
});

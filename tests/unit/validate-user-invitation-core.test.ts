import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { validateUserInvitationCore } = require('../../functions/users/validateUserInvitationCore.js');

class TestHttpsError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const now = new Date('2026-10-28T12:00:00.000Z');
const request = (token?: unknown) => ({ data: token === undefined ? {} : { token } });

function dependencies(data?: Record<string, unknown>, exists = true) {
  const get = vi.fn().mockResolvedValue({
    exists,
    data: () => data,
  });
  const doc = vi.fn(() => ({ get }));
  const collection = vi.fn(() => ({ doc }));
  const db = { collection };
  const hashToken = vi.fn((token: string) => `sha256:${token}`);
  return { db, hashToken, get, doc, collection };
}

describe('validateUserInvitationCore', () => {
  it.each([undefined, null, '', 42])('rejects invalid token input (%s)', async (token) => {
    const deps = dependencies();
    await expect(validateUserInvitationCore(request(token), {
      ...deps,
      HttpsError: TestHttpsError,
      now: () => now,
    })).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(deps.collection).not.toHaveBeenCalled();
  });

  it('looks up only the token hash and returns the existing public response shape', async () => {
    const expiresAt = new Date('2026-10-29T12:00:00.000Z');
    const deps = dependencies({
      email: 'invite@example.com',
      status: 'pending',
      expiresAt: { toDate: () => expiresAt },
    });

    await expect(validateUserInvitationCore(request('raw-invite-token'), {
      ...deps,
      HttpsError: TestHttpsError,
      now: () => now,
    })).resolves.toEqual({
      email: 'invite@example.com',
      expiresAt: '2026-10-29T12:00:00.000Z',
    });

    expect(deps.hashToken).toHaveBeenCalledWith('raw-invite-token');
    expect(deps.doc).toHaveBeenCalledWith('sha256:raw-invite-token');
  });

  it('rejects missing invitations', async () => {
    const deps = dependencies(undefined, false);
    await expect(validateUserInvitationCore(request('unknown-token'), {
      ...deps,
      HttpsError: TestHttpsError,
      now: () => now,
    })).rejects.toMatchObject({ code: 'not-found' });
  });

  it.each([
    ['accepted', new Date('2026-10-29T12:00:00.000Z')],
    ['pending', new Date('2026-10-28T11:59:59.999Z')],
  ])('rejects non-pending or expired invitations', async (status, expiration) => {
    const deps = dependencies({
      email: 'invite@example.com',
      status,
      expiresAt: { toDate: () => expiration },
    });
    await expect(validateUserInvitationCore(request('raw-token'), {
      ...deps,
      HttpsError: TestHttpsError,
      now: () => now,
    })).rejects.toMatchObject({ code: 'failed-precondition' });
  });
});

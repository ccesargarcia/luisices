import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sendVerificationEmailCore } = require('../../functions/users/sendVerificationEmailCore.js');

class TestHttpsError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const now = new Date('2026-10-29T12:00:00.000Z');
const currentUser = (overrides: Record<string, unknown> = {}) => ({
  uid: 'user-1',
  email: 'invite@example.com',
  emailVerified: false,
  ...overrides,
});
const invitation = (overrides: Record<string, unknown> = {}) => ({
  email: 'INVITE@example.com',
  status: 'pending',
  expiresAt: { toDate: () => new Date('2026-10-30T12:00:00.000Z') },
  ...overrides,
});

function dependencies({
  authUser = currentUser(),
  invitationData = invitation(),
  invitationExists = true,
  resendAvailable = true,
  rawLink = 'https://identitytoolkit.google.com/action?mode=verifyEmail&oobCode=code%2Bvalue',
  sendResult = {},
}: {
  authUser?: Record<string, unknown>;
  invitationData?: Record<string, any>;
  invitationExists?: boolean;
  resendAvailable?: boolean;
  rawLink?: string;
  sendResult?: Record<string, unknown>;
} = {}) {
  const get = vi.fn().mockResolvedValue({ exists: invitationExists, data: () => invitationData });
  const doc = vi.fn(() => ({ get }));
  const collection = vi.fn(() => ({ doc }));
  const db = { collection };
  const send = vi.fn().mockResolvedValue(sendResult);
  const resend = { emails: { send } };
  const logger = { error: vi.fn() };
  const deps = {
    db,
    getUser: vi.fn().mockResolvedValue(authUser),
    generateEmailVerificationLink: vi.fn().mockResolvedValue(rawLink),
    hashToken: vi.fn(() => 'hashed-invite-token'),
    getResend: vi.fn(() => resendAvailable ? resend : null),
    resendApiKey: vi.fn(() => 'test-api-key'),
    getAppUrl: vi.fn(() => 'https://app.example.test'),
    getNoReplySender: vi.fn(() => 'Luisices <no-reply@example.test>'),
    getContactEmail: vi.fn(() => 'suporte@example.test'),
    HttpsError: TestHttpsError,
    now: () => now,
    logger,
  };
  return { deps, collection, doc, get, send, logger };
}

function request(inviteToken?: unknown, auth: unknown = { uid: 'user-1' }) {
  return {
    auth,
    data: arguments.length === 0
      ? { inviteToken: 'raw-token' }
      : inviteToken === undefined ? {} : { inviteToken },
  };
}

describe('sendVerificationEmailCore', () => {
  it('requires an authenticated user and a string invite token before loading Resend', async () => {
    const unauthenticated = dependencies();
    await expect(sendVerificationEmailCore(request('raw-token', null), {
      ...unauthenticated.deps, HttpsError: TestHttpsError,
    })).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(unauthenticated.deps.getResend).not.toHaveBeenCalled();

    for (const inviteToken of [undefined, null, '', 123]) {
      const invalid = dependencies();
      await expect(sendVerificationEmailCore(request(inviteToken), {
        ...invalid.deps, HttpsError: TestHttpsError,
      })).rejects.toMatchObject({ code: 'invalid-argument' });
      expect(invalid.deps.getResend).not.toHaveBeenCalled();
      expect(invalid.deps.getUser).not.toHaveBeenCalled();
    }
  });

  it('requires configured Resend before looking up the account', async () => {
    const deps = dependencies({ resendAvailable: false });
    await expect(sendVerificationEmailCore(request(), {
      ...deps.deps, HttpsError: TestHttpsError,
    })).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(deps.deps.resendApiKey).toHaveBeenCalledOnce();
    expect(deps.deps.getUser).not.toHaveBeenCalled();
  });

  it('returns success for an already verified account without consuming the invitation', async () => {
    const deps = dependencies({ authUser: currentUser({ emailVerified: true }) });
    await expect(sendVerificationEmailCore(request(), {
      ...deps.deps, HttpsError: TestHttpsError,
    })).resolves.toEqual({ success: true });
    expect(deps.collection).not.toHaveBeenCalled();
    expect(deps.deps.generateEmailVerificationLink).not.toHaveBeenCalled();
    expect(deps.send).not.toHaveBeenCalled();
  });

  it('rejects accounts without e-mail and does not read an invitation', async () => {
    const deps = dependencies({ authUser: currentUser({ email: null }) });
    await expect(sendVerificationEmailCore(request(), {
      ...deps.deps, HttpsError: TestHttpsError,
    })).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(deps.collection).not.toHaveBeenCalled();
  });

  it('rejects a missing invitation', async () => {
    const deps = dependencies({ invitationExists: false });
    await expect(sendVerificationEmailCore(request(), {
      ...deps.deps, HttpsError: TestHttpsError,
    })).rejects.toMatchObject({ code: 'not-found' });
    expect(deps.deps.generateEmailVerificationLink).not.toHaveBeenCalled();
  });

  it.each([
    ['accepted invitation', invitation({ status: 'accepted' })],
    ['expired invitation', invitation({ expiresAt: { toDate: () => new Date(now.getTime() - 1) } })],
    ['different e-mail', invitation({ email: 'different@example.com' })],
  ])('rejects %s before generating or sending a link', async (_label, data) => {
    const deps = dependencies({ invitationData: data });
    await expect(sendVerificationEmailCore(request(), {
      ...deps.deps, HttpsError: TestHttpsError,
    })).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(deps.deps.generateEmailVerificationLink).not.toHaveBeenCalled();
    expect(deps.send).not.toHaveBeenCalled();
  });

  it('hashes the invitation token and sends the Firebase oobCode through the Luisices action URL', async () => {
    const deps = dependencies();
    await expect(sendVerificationEmailCore(request('raw/token'), {
      ...deps.deps, HttpsError: TestHttpsError,
    })).resolves.toEqual({ success: true });

    expect(deps.deps.hashToken).toHaveBeenCalledWith('raw/token');
    expect(deps.doc).toHaveBeenCalledWith('hashed-invite-token');
    expect(deps.deps.generateEmailVerificationLink).toHaveBeenCalledWith('invite@example.com', {
      url: 'https://app.example.test/action?mode=verifyEmail&invite=raw%2Ftoken',
    });
    expect(deps.send).toHaveBeenCalledWith(expect.objectContaining({
      from: 'Luisices <no-reply@example.test>',
      to: ['invite@example.com'],
      subject: 'Confirme seu e-mail - Luisices',
      html: expect.stringContaining('https://app.example.test/action?mode=verifyEmail&oobCode=code%2Bvalue&invite=raw%2Ftoken'),
    }));
    expect(deps.send.mock.calls[0][0].html).toContain('suporte@example.test');
  });

  it('maps a missing Firebase action code or Resend failure to the public internal error', async () => {
    const missingCode = dependencies({ rawLink: 'https://identitytoolkit.google.com/action?mode=verifyEmail' });
    await expect(sendVerificationEmailCore(request(), {
      ...missingCode.deps, HttpsError: TestHttpsError,
    })).rejects.toMatchObject({ code: 'internal', message: 'Não foi possível enviar o e-mail de confirmação.' });
    expect(missingCode.send).not.toHaveBeenCalled();
    expect(missingCode.logger.error).toHaveBeenCalledWith('[sendVerificationEmail]', expect.any(Error));

    const sendFailure = dependencies({ sendResult: { error: { message: 'provider error' } } });
    await expect(sendVerificationEmailCore(request(), {
      ...sendFailure.deps, HttpsError: TestHttpsError,
    })).rejects.toMatchObject({ code: 'internal' });
    expect(sendFailure.logger.error).toHaveBeenCalledWith(
      '[sendVerificationEmail] Resend:', JSON.stringify({ message: 'provider error' }),
    );
  });
});

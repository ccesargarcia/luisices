import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createUserInvitationCore } = require('../../functions/users/createUserInvitationCore.js');

class TestHttpsError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'HttpsError';
  }
}

function setup({ existingUser = null as any, profile = null as any } = {}) {
  const invitation = { set: vi.fn().mockResolvedValue(undefined) };
  const profileRef = { update: vi.fn().mockResolvedValue(undefined) };
  const db = {
    collection: vi.fn(() => ({ doc: vi.fn(() => invitation) })),
    doc: vi.fn(() => ({
      get: vi.fn().mockResolvedValue(profile
        ? { exists: true, data: () => profile, ref: profileRef }
        : { exists: false }),
    })),
  };
  const emailSend = vi.fn().mockResolvedValue({});
  const resend = { emails: { send: emailSend } };
  const deps = {
    db,
    getUserByEmail: vi.fn().mockResolvedValue(existingUser),
    createToken: vi.fn(() => 'raw-secret-token'),
    hashToken: vi.fn(() => 'hashed-token'),
    Timestamp: { fromDate: vi.fn((date: Date) => ({ toDate: () => date })) },
    FieldValue: { serverTimestamp: vi.fn(() => 'server-timestamp') },
    getResend: vi.fn(() => resend),
    resendApiKey: vi.fn(() => 'api-key'),
    getAppUrl: vi.fn(() => 'https://app.example.test'),
    getNoReplySender: vi.fn(() => 'Luisices <no-reply@example.test>'),
    sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
    createCustomVerificationLink: vi.fn().mockResolvedValue('https://app.example.test/verify'),
    activateInvitedAccount: vi.fn().mockResolvedValue(undefined),
    writeUserAudit: vi.fn().mockResolvedValue(undefined),
    HttpsError: TestHttpsError,
    now: () => new Date('2026-10-29T12:00:00.000Z'),
    logger: { error: vi.fn() },
  };
  return { deps, db, invitation, profileRef, emailSend, resend };
}

const request = (data: Record<string, unknown> = {}) => ({
  auth: { uid: 'admin-uid' },
  data,
});

describe('createUserInvitationCore', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cria convite com token somente em hash, prazo de 48h e envia e-mail/WhatsApp', async () => {
    const state = setup();
    state.deps.sendWhatsAppMessage.mockRejectedValueOnce(new Error('WhatsApp offline'));

    const result = await createUserInvitationCore(request({
      email: '  Cliente@Example.com ', whatsappPhone: 'fake-test-phone',
    }), state.deps);

    expect(result).toEqual({ success: true, expiresAt: '2026-10-31T12:00:00.000Z' });
    expect(state.deps.getUserByEmail).toHaveBeenCalledWith('cliente@example.com');
    expect(state.deps.hashToken).toHaveBeenCalledWith('raw-secret-token');
    expect(state.invitation.set).toHaveBeenCalledWith(expect.objectContaining({
      email: 'cliente@example.com',
      whatsappPhone: 'fake-test-phone',
      invitedBy: 'admin-uid',
      status: 'pending',
    }));
    expect(JSON.stringify(state.invitation.set.mock.calls)).not.toContain('raw-secret-token');
    expect(state.emailSend).toHaveBeenCalledOnce();
    expect(state.deps.sendWhatsAppMessage).toHaveBeenCalledOnce();
    expect(state.deps.writeUserAudit).toHaveBeenCalledWith('USER_INVITATION_CREATED', 'admin-uid', null, {
      email: 'cliente@example.com',
    });
    expect(state.deps.logger.error).toHaveBeenCalledWith(
      '[createUserInvitation] Evolution API:', expect.any(Error),
    );
  });

  it('ativa perfil órfão elegível sem criar ou enviar novo convite', async () => {
    const state = setup({
      existingUser: { uid: 'orphan-uid', emailVerified: true },
      profile: { email: 'CLIENTE@example.com', role: 'user' },
    });

    await expect(createUserInvitationCore(request({ email: 'cliente@example.com' }), state.deps))
      .resolves.toEqual({ success: true, repairedExistingAccount: true });
    expect(state.profileRef.update).toHaveBeenCalledWith(expect.objectContaining({ active: true }));
    expect(state.invitation.set).not.toHaveBeenCalled();
    expect(state.emailSend).not.toHaveBeenCalled();
    expect(state.deps.writeUserAudit).toHaveBeenCalledWith(
      'ORPHANED_USER_ACCOUNT_ACTIVATED', 'admin-uid', 'orphan-uid', { email: 'cliente@example.com' },
    );
  });

  it('repara conta autenticada sem perfil ativando o usuário pelo fluxo transacional existente', async () => {
    const state = setup({ existingUser: { uid: 'orphan-uid', emailVerified: true } });

    await expect(createUserInvitationCore(request({ email: 'cliente@example.com' }), state.deps))
      .resolves.toEqual({ success: true, repairedExistingAccount: true });
    expect(state.invitation.set).toHaveBeenCalledOnce();
    expect(state.deps.activateInvitedAccount).toHaveBeenCalledWith(
      state.invitation, expect.objectContaining({ email: 'cliente@example.com' }),
      { uid: 'orphan-uid', emailVerified: true },
    );
    expect(state.emailSend).not.toHaveBeenCalled();
  });

  it('recusa conta existente com perfil já cadastrado', async () => {
    const state = setup({
      existingUser: { uid: 'existing-uid' },
      profile: { email: 'cliente@example.com', role: 'admin', active: true },
    });

    await expect(createUserInvitationCore(request({ email: 'cliente@example.com' }), state.deps))
      .rejects.toMatchObject({ code: 'already-exists' });
    expect(state.invitation.set).not.toHaveBeenCalled();
    expect(state.emailSend).not.toHaveBeenCalled();
  });

  it('reenvia verificação para conta órfã ainda não verificada', async () => {
    const state = setup({ existingUser: { uid: 'orphan-uid', emailVerified: false } });

    await expect(createUserInvitationCore(request({ email: 'cliente@example.com' }), state.deps))
      .resolves.toEqual({
        success: true, verificationSent: true, expiresAt: '2026-10-31T12:00:00.000Z',
      });
    expect(state.invitation.set).toHaveBeenCalledOnce();
    expect(state.deps.createCustomVerificationLink).toHaveBeenCalledWith(
      'cliente@example.com', 'raw-secret-token',
    );
    expect(state.emailSend).toHaveBeenCalledWith(expect.objectContaining({
      subject: 'Confirme seu e-mail - Luisices',
    }));
    expect(state.deps.writeUserAudit).toHaveBeenCalledWith(
      'ORPHANED_USER_VERIFICATION_RESENT', 'admin-uid', 'orphan-uid', { email: 'cliente@example.com' },
    );
  });

  it('preserva os códigos de entrada inválida e precondição de Resend', async () => {
    const invalid = setup();
    await expect(createUserInvitationCore(request({ email: ' ' }), invalid.deps))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    expect(invalid.deps.getUserByEmail).not.toHaveBeenCalled();

    const noResend = setup();
    noResend.deps.getResend.mockReturnValueOnce(null);
    await expect(createUserInvitationCore(request({ email: 'cliente@example.com' }), noResend.deps))
      .rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('não confirma nem audita o convite quando Resend resolve com erro', async () => {
    const state = setup();
    state.emailSend.mockResolvedValueOnce({ error: { message: 'Recipient rejected' } });

    await expect(createUserInvitationCore(request({ email: 'cliente@example.com' }), state.deps))
      .rejects.toMatchObject({ code: 'internal', message: 'Não foi possível enviar o convite por e-mail.' });

    expect(state.deps.logger.error).toHaveBeenCalledWith(
      '[createUserInvitation] Resend:', JSON.stringify({ message: 'Recipient rejected' }),
    );
    expect(state.deps.writeUserAudit).not.toHaveBeenCalled();
  });
});

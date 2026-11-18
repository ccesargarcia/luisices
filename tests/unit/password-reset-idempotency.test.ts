import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const {
  acquirePasswordReset,
  completePasswordReset,
  createPasswordResetContext,
  markPasswordResetProviderAttempt,
  releasePasswordReset,
  sendWithPasswordResetIdempotency,
} = require('../../functions/users/passwordResetIdempotency.js');

function createDb() {
  const documents = new Map<string, Record<string, unknown>>();
  const db = {
    collection(name: string) {
      return {
        doc(id: string) {
          const ref = { path: `${name}/${id}`, id };
          return ref;
        },
      };
    },
    async runTransaction<T>(callback: (transaction: any) => Promise<T>): Promise<T> {
      const transaction = {
        async get(ref: { path: string }) {
          const value = documents.get(ref.path);
          return {
            exists: Boolean(value),
            data: () => (value ? { ...value } : undefined),
          };
        },
        set(ref: { path: string }, value: Record<string, unknown>, options?: { merge?: boolean }) {
          const previous = documents.get(ref.path) || {};
          documents.set(ref.path, options?.merge ? { ...previous, ...value } : { ...value });
        },
        update(ref: { path: string }, value: Record<string, unknown>) {
          const previous = documents.get(ref.path);
          if (!previous) throw new Error('document missing');
          documents.set(ref.path, { ...previous, ...value });
        },
      };
      return callback(transaction);
    },
  };
  return { db, documents };
}

describe('password reset idempotency shared by Beta and GCP', () => {
  it('persists no raw email/key and returns the completed result for a replay', async () => {
    const { db, documents } = createDb();
    const context = createPasswordResetContext(db, ' Cliente@Luisices.com.br ', 'request-key-123');
    const reserved = await acquirePasswordReset({ db, context, now: 1_000, owner: 'first-owner' });

    expect(reserved).toEqual({ owner: 'first-owner' });
    expect(context.ref.path).not.toContain('cliente@luisices.com.br');
    expect(context.ref.path).not.toContain('request-key-123');

    await markPasswordResetProviderAttempt({ db, context, owner: reserved.owner });
    await completePasswordReset({
      db,
      context,
      owner: reserved.owner,
      emailId: 'resend-123',
      message: 'Email de recuperação enviado com sucesso!',
    });

    const replay = await acquirePasswordReset({ db, context, now: 2_000, owner: 'second-owner' });
    expect(replay.completed).toMatchObject({
      status: 'completed',
      emailId: 'resend-123',
      message: 'Email de recuperação enviado com sucesso!',
    });
    expect([...documents.values()][0]).not.toHaveProperty('email');
    expect([...documents.values()][0]).not.toHaveProperty('idempotencyKey');
  });

  it('blocks concurrent requests using the same attempt key', async () => {
    const { db } = createDb();
    const context = createPasswordResetContext(db, 'cliente@luisices.com.br', 'request-key-123');
    await acquirePasswordReset({ db, context, now: 1_000, owner: 'first-owner' });

    await expect(acquirePasswordReset({ db, context, now: 1_001, owner: 'second-owner' }))
      .rejects.toMatchObject({ code: 'aborted' });
  });

  it('never retries through GCP after the provider may have accepted the email', async () => {
    const { db } = createDb();
    const context = createPasswordResetContext(db, 'cliente@luisices.com.br', 'request-key-123');
    const reserved = await acquirePasswordReset({ db, context, now: 1_000, owner: 'first-owner' });
    await markPasswordResetProviderAttempt({ db, context, owner: reserved.owner });
    await releasePasswordReset({ db, context, owner: reserved.owner });

    await expect(acquirePasswordReset({ db, context, now: 2_000, owner: 'gcp-fallback' }))
      .rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('allows a same-key retry when the prior attempt failed before contacting a provider', async () => {
    const { db } = createDb();
    const context = createPasswordResetContext(db, 'cliente@luisices.com.br', 'request-key-123');
    const first = await acquirePasswordReset({ db, context, now: 1_000, owner: 'first-owner' });
    await releasePasswordReset({ db, context, owner: first.owner });

    await expect(acquirePasswordReset({ db, context, now: 2_000, owner: 'gcp-fallback' }))
      .resolves.toEqual({ owner: 'gcp-fallback' });
  });

  it('rejects malformed attempt keys', () => {
    const { db } = createDb();
    try {
      createPasswordResetContext(db, 'cliente@luisices.com.br', 'short');
      throw new Error('expected malformed key to fail');
    } catch (error) {
      expect(error).toMatchObject({ code: 'invalid-argument' });
    }
  });

  it('passes the stable derived key to Resend and preserves the legacy call signature', async () => {
    const { db } = createDb();
    const context = createPasswordResetContext(db, 'cliente@luisices.com.br', 'request-key-123');
    const send = vi.fn().mockResolvedValue({ data: { id: 'resend-123' }, error: null });
    const resend = { emails: { send } };
    const payload = { to: ['cliente@luisices.com.br'], subject: 'Recuperação' };

    await sendWithPasswordResetIdempotency(resend, payload, context);
    expect(send).toHaveBeenNthCalledWith(1, payload, { idempotencyKey: context.providerIdempotencyKey });

    await sendWithPasswordResetIdempotency(resend, payload, null);
    expect(send).toHaveBeenNthCalledWith(2, payload);
  });
});

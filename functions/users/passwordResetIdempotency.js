const crypto = require('node:crypto');
const { HttpsError } = require('../common/runtimeCompat');

const LEASE_MS = 2 * 60 * 1000;
const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
const KEY_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function createPasswordResetContext(db, email, idempotencyKey) {
  if (typeof idempotencyKey !== 'string' || !KEY_PATTERN.test(idempotencyKey)) {
    throw new HttpsError('invalid-argument', 'Chave de idempotência inválida.');
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const emailHash = sha256(normalizedEmail);
  const requestId = sha256(`password-reset\0${normalizedEmail}\0${idempotencyKey}`);
  return {
    ref: db.collection('passwordResetRequests').doc(requestId),
    emailHash,
    providerIdempotencyKey: sha256(`resend-password-reset\0${requestId}`),
  };
}

function sendWithPasswordResetIdempotency(resend, payload, context) {
  if (!context) return resend.emails.send(payload);
  return resend.emails.send(payload, { idempotencyKey: context.providerIdempotencyKey });
}

async function acquirePasswordReset({ db, context, now = Date.now(), owner = crypto.randomUUID() }) {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(context.ref);
    const existing = snapshot.exists ? snapshot.data() : null;

    if (existing) {
      if (existing.emailHash !== context.emailHash) {
        throw new HttpsError('already-exists', 'A chave já está associada a outra solicitação.');
      }
      if (existing.status === 'completed') return { completed: existing };
      if (existing.createdAtMs > 0 && now - existing.createdAtMs >= RETRY_WINDOW_MS) {
        throw new HttpsError('failed-precondition', 'A janela segura de repetição expirou. Solicite uma nova recuperação.');
      }
      if (existing.status === 'uncertain' || existing.providerAttempted === true) {
        throw new HttpsError('failed-precondition', 'O envio anterior pode ter sido concluído. Verifique seu e-mail antes de solicitar novamente.');
      }
      if (existing.status === 'processing' && existing.leaseUntilMs > now) {
        throw new HttpsError('aborted', 'Esta solicitação de recuperação já está em processamento.');
      }
    }

    transaction.set(context.ref, {
      emailHash: context.emailHash,
      status: 'processing',
      providerAttempted: false,
      owner,
      createdAtMs: existing?.createdAtMs || now,
      leaseUntilMs: now + LEASE_MS,
    }, { merge: true });
    return { owner };
  });
}

async function updateOwnedRequest({ db, context, owner, update }) {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(context.ref);
    const existing = snapshot.data();
    if (!snapshot.exists || existing?.owner !== owner || existing?.status !== 'processing') {
      throw new HttpsError('aborted', 'Outra execução assumiu esta solicitação.');
    }
    transaction.update(context.ref, update(existing));
  });
}

async function markPasswordResetProviderAttempt({ db, context, owner }) {
  return updateOwnedRequest({
    db,
    context,
    owner,
    update: () => ({ providerAttempted: true }),
  });
}

async function completePasswordReset({ db, context, owner, emailId, message }) {
  return updateOwnedRequest({
    db,
    context,
    owner,
    update: () => ({
      status: 'completed',
      ...(emailId ? { emailId } : {}),
      ...(message ? { message } : {}),
      completedAtMs: Date.now(),
      leaseUntilMs: 0,
    }),
  });
}

async function releasePasswordReset({ db, context, owner }) {
  return updateOwnedRequest({
    db,
    context,
    owner,
    update: (existing) => ({
      status: existing.providerAttempted ? 'uncertain' : 'failed',
      failedAtMs: Date.now(),
      leaseUntilMs: 0,
    }),
  });
}

module.exports = {
  acquirePasswordReset,
  completePasswordReset,
  createPasswordResetContext,
  markPasswordResetProviderAttempt,
  releasePasswordReset,
  sendWithPasswordResetIdempotency,
  LEASE_MS,
  RETRY_WINDOW_MS,
};

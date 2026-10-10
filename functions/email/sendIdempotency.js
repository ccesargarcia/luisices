const crypto = require('crypto');
const { HttpsError } = require('firebase-functions/v2/https');
const LEASE_MS = 120000;
// Margem conservadora em relação à retenção de 24h do provedor.
const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;

function fingerprint(value) {
  const canonical = (entry) => {
    if (Buffer.isBuffer(entry)) return { sha256: crypto.createHash('sha256').update(entry).digest('hex') };
    if (Array.isArray(entry)) return entry.map(canonical);
    if (entry && typeof entry === 'object') {
      return Object.fromEntries(Object.keys(entry).sort()
        .filter((key) => entry[key] !== undefined)
        .map((key) => [key, canonical(entry[key])]));
    }
    return entry;
  };
  return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

async function acquireSend({ db, ref, hash, uid, now = Date.now(), owner = crypto.randomUUID() }) {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const existing = snapshot.exists ? snapshot.data() : null;
    if (existing) {
      if (existing.uid !== uid) {
        throw new HttpsError('permission-denied', 'A operação de envio pertence a outro usuário.');
      }
      if (!existing.payloadHash) {
        throw new HttpsError('failed-precondition', 'Envio legado exige conferência antes de repetir.');
      }
      if (existing.payloadHash !== hash) {
        throw new HttpsError('already-exists', 'A chave de envio já está associada a outro conteúdo.');
      }
      if (existing.status === 'completed') return { completed: existing };
      if (existing.status === 'processing' && existing.leaseUntilMs > now) {
        throw new HttpsError('aborted', 'Este envio já está sendo processado.');
      }
      if (now - existing.createdAtMs >= RETRY_WINDOW_MS || !Number.isFinite(existing.createdAtMs)) {
        throw new HttpsError('failed-precondition', 'Janela de recuperação expirada. Confira o envio antes de tentar novamente.');
      }
    }
    transaction.set(ref, {
      uid, payloadHash: hash, owner, status: 'processing',
      createdAtMs: existing?.createdAtMs ?? now,
      leaseUntilMs: now + LEASE_MS,
    }, { merge: true });
    return { owner };
  });
}

async function withOwner({ db, ref, owner }, action) {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data();
    if (!snapshot.exists || data.owner !== owner || data.status !== 'processing') {
      throw new HttpsError('aborted', 'Outra execução assumiu este envio.');
    }
    return action(transaction, data);
  });
}

async function markProviderAttempt(context, providerHash) {
  return withOwner(context, (transaction, data) => {
    if (data.providerHash && data.providerHash !== providerHash) {
      throw new HttpsError('failed-precondition', 'O conteúdo dos anexos mudou desde a tentativa anterior.');
    }
    transaction.update(context.ref, { providerHash, providerAttempted: true });
  });
}

async function completeSend(context, sentRef, record, timestamp) {
  return withOwner(context, (transaction) => {
    transaction.set(sentRef, record);
    transaction.update(context.ref, {
      status: 'completed', emailId: record.resendId,
      sentDocId: sentRef.id, completedAt: timestamp,
    });
  });
}

async function releaseSend(context, timestamp) {
  return withOwner(context, (transaction, data) => {
    transaction.update(context.ref, {
      status: data.providerAttempted ? 'uncertain' : 'failed',
      failedAt: timestamp, leaseUntilMs: 0,
    });
  });
}

module.exports = { fingerprint, acquireSend, markProviderAttempt, completeSend, releaseSend, LEASE_MS, RETRY_WINDOW_MS };

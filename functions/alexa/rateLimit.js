/**
 * Rate Limiter distribuído baseado em Firestore (alexaRateLimits).
 * Segue estritamente a especificação docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md.
 */

const admin = require('firebase-admin');
const { COLLECTIONS } = require('./repository');

const LIMITS = {
  REQUESTS_PER_MINUTE_PER_BINDING: 30,
  ORDERS_PER_HOUR_PER_PERSON: 10,
  ORDERS_PER_DAY_PER_PERSON: 50,
  PAIRINGS_PER_HOUR_PER_DEVICE: 5,
};

/**
 * Incrementa atomicamente o contador para a janela de tempo e verifica o limite.
 * @param {admin.firestore.Firestore} db
 * @param {string} bucketKey - Identificador do bucket (ex: req:bindingKey:min)
 * @param {number} maxPoints - Limite máximo de operações na janela
 * @param {number} windowSeconds - Duração da janela em segundos
 * @returns {Promise<{ allowed: boolean, currentCount: number, limit: number }>}
 */
async function consumeRateLimit(db, bucketKey, maxPoints, windowSeconds) {
  if (!db) return { allowed: true, currentCount: 0, limit: maxPoints };

  const ref = db.collection(COLLECTIONS.RATE_LIMITS).doc(bucketKey);
  const now = Date.now();
  const expiresAt = new Date(now + windowSeconds * 1000);

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    let count = 0;

    if (snap.exists) {
      const data = snap.data() || {};
      const exp = data.expiresAt?.toDate ? data.expiresAt.toDate().getTime() : 0;
      if (exp > now) {
        count = Number(data.count || 0);
      }
    }

    if (count >= maxPoints) {
      return {
        allowed: false,
        currentCount: count,
        limit: maxPoints,
      };
    }

    const nextCount = count + 1;
    transaction.set(
      ref,
      {
        count: nextCount,
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      allowed: true,
      currentCount: nextCount,
      limit: maxPoints,
    };
  });
}

/**
 * Verifica limite de requisições por minuto para o vínculo ativo (30 req/min).
 */
async function checkBindingRequestRateLimit(db, bindingKey) {
  const windowMinute = Math.floor(Date.now() / 60000);
  const bucketKey = `req_${bindingKey}_${windowMinute}`;
  return consumeRateLimit(db, bucketKey, LIMITS.REQUESTS_PER_MINUTE_PER_BINDING, 120);
}

/**
 * Verifica limite de pedidos criados por hora (10/h) e por dia (50/dia) por usuário.
 */
async function checkOrderCreationRateLimit(db, uid) {
  const now = Date.now();
  const windowHour = Math.floor(now / 3600000);
  const windowDay = Math.floor(now / 86400000);

  const hourBucket = `ord_hr_${uid}_${windowHour}`;
  const dayBucket = `ord_day_${uid}_${windowDay}`;

  const hourCheck = await consumeRateLimit(db, hourBucket, LIMITS.ORDERS_PER_HOUR_PER_PERSON, 7200);
  if (!hourCheck.allowed) {
    return {
      allowed: false,
      reason: 'Limite de pedidos por hora excedido (máximo 10 pedidos/hora).',
    };
  }

  const dayCheck = await consumeRateLimit(db, dayBucket, LIMITS.ORDERS_PER_DAY_PER_PERSON, 172800);
  if (!dayCheck.allowed) {
    return {
      allowed: false,
      reason: 'Limite diário de pedidos excedido (máximo 50 pedidos/dia).',
    };
  }

  return { allowed: true };
}

/**
 * Verifica limite de tentativas de pareamento por dispositivo/conta (5/h).
 */
async function checkPairingRateLimit(db, deviceOrUserId) {
  const windowHour = Math.floor(Date.now() / 3600000);
  const bucketKey = `pair_${deviceOrUserId}_${windowHour}`;
  return consumeRateLimit(db, bucketKey, LIMITS.PAIRINGS_PER_HOUR_PER_DEVICE, 7200);
}

/**
 * Verifica e consome limites de criação de pedidos DENTRO de uma transação Firestore ativa.
 * Executa as leituras antes das escritas e lança erro seguro se exceder cota.
 */
async function checkAndConsumeOrderRateLimitInTransaction(transaction, db, uid) {
  if (!db || !transaction || !uid) return { allowed: true };

  const now = Date.now();
  const windowHour = Math.floor(now / 3600000);
  const windowDay = Math.floor(now / 86400000);

  const hourRef = db.collection(COLLECTIONS.RATE_LIMITS).doc(`ord_hr_${uid}_${windowHour}`);
  const dayRef = db.collection(COLLECTIONS.RATE_LIMITS).doc(`ord_day_${uid}_${windowDay}`);

  const [hourSnap, daySnap] = await Promise.all([
    transaction.get(hourRef),
    transaction.get(dayRef),
  ]);

  let hourCount = 0;
  if (hourSnap.exists) {
    const data = hourSnap.data() || {};
    const exp = data.expiresAt?.toDate ? data.expiresAt.toDate().getTime() : 0;
    if (exp > now) hourCount = Number(data.count || 0);
  }

  let dayCount = 0;
  if (daySnap.exists) {
    const data = daySnap.data() || {};
    const exp = data.expiresAt?.toDate ? data.expiresAt.toDate().getTime() : 0;
    if (exp > now) dayCount = Number(data.count || 0);
  }

  if (hourCount >= LIMITS.ORDERS_PER_HOUR_PER_PERSON) {
    throw new Error('RATE_LIMITED: Limite de pedidos por hora excedido (máximo 10 pedidos/hora).');
  }

  if (dayCount >= LIMITS.ORDERS_PER_DAY_PER_PERSON) {
    throw new Error('RATE_LIMITED: Limite diário de pedidos excedido (máximo 50 pedidos/dia).');
  }

  const hourExpiresAt = new Date(now + 7200 * 1000);
  const dayExpiresAt = new Date(now + 172800 * 1000);

  transaction.set(
    hourRef,
    {
      count: hourCount + 1,
      expiresAt: admin.firestore.Timestamp.fromDate(hourExpiresAt),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  transaction.set(
    dayRef,
    {
      count: dayCount + 1,
      expiresAt: admin.firestore.Timestamp.fromDate(dayExpiresAt),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { allowed: true, hourCount: hourCount + 1, dayCount: dayCount + 1 };
}

module.exports = {
  LIMITS,
  consumeRateLimit,
  checkBindingRequestRateLimit,
  checkOrderCreationRateLimit,
  checkAndConsumeOrderRateLimitInTransaction,
  checkPairingRateLimit,
};

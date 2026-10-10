const { HttpsError } = require('firebase-functions/v2/https');

function validateDocumentId(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 128
    && !value.includes('/') && value !== '.' && value !== '..';
}

/** Solicita logout cooperativo. Não revoga individualmente um token Firebase. */
async function requestDeviceLogout(request, { assertActiveSession, db, timestamp }) {
  const { uid, deviceId } = request.data || {};
  if (!validateDocumentId(uid) || !validateDocumentId(deviceId)) {
    throw new HttpsError('invalid-argument', 'UID e deviceId devem ser identificadores válidos.');
  }
  const { uid: callerUid, profile } = await assertActiveSession(request);
  if (callerUid !== uid && profile.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas o próprio usuário ou administradores podem solicitar esta desconexão.');
  }
  const ref = db.doc(`userProfiles/${uid}/devices/${deviceId}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Dispositivo não encontrado.');
    if (snapshot.data().status === 'revoked') return;
    transaction.update(ref, {
      status: 'revoked', revokedAt: timestamp(), revokedBy: callerUid,
    });
  });
  return { success: true, enforcement: 'client-logout-request' };
}

module.exports = { requestDeviceLogout, validateDocumentId };

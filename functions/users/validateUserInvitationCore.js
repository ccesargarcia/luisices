async function validateUserInvitationCore(request, { db, hashToken, HttpsError, now = () => new Date() }) {
  const { token } = request.data || {};
  if (!token || typeof token !== 'string') {
    throw new HttpsError('invalid-argument', 'Convite inválido.');
  }

  const snapshot = await db.collection('invitations').doc(hashToken(token)).get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Convite inválido ou expirado.');

  const data = snapshot.data();
  if (data.status !== 'pending' || data.expiresAt.toDate() <= now()) {
    throw new HttpsError('failed-precondition', 'Convite inválido ou expirado.');
  }

  return { email: data.email, expiresAt: data.expiresAt.toDate().toISOString() };
}

module.exports = { validateUserInvitationCore };

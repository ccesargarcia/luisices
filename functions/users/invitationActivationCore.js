async function activateInvitedAccountCore(invitationRef, invitationData, authUser, {
  db,
  FieldValue,
  HttpsError,
  invitedUserPermissions,
  now = () => new Date(),
}) {
  if (!authUser.email || authUser.email.toLowerCase() !== invitationData.email.toLowerCase()) {
    throw new HttpsError('permission-denied', 'O e-mail da conta não corresponde ao convite.');
  }
  if (authUser.emailVerified !== true) {
    throw new HttpsError('failed-precondition', 'Confirme o e-mail antes de concluir o cadastro.');
  }

  await db.runTransaction(async (transaction) => {
    const invitationSnapshot = await transaction.get(invitationRef);
    const profileRef = db.doc(`userProfiles/${authUser.uid}`);
    const profileSnapshot = await transaction.get(profileRef);
    if (!invitationSnapshot.exists) {
      throw new HttpsError('not-found', 'Convite inválido ou expirado.');
    }

    const currentInvitation = invitationSnapshot.data();
    if (currentInvitation.status === 'accepted' && currentInvitation.acceptedBy === authUser.uid) return;
    if (currentInvitation.status !== 'pending' || currentInvitation.expiresAt.toDate() <= now()) {
      throw new HttpsError('failed-precondition', 'Convite inválido ou expirado.');
    }

    if (profileSnapshot.exists) {
      const profileEmail = profileSnapshot.data().email;
      if (!profileEmail || profileEmail.toLowerCase() !== authUser.email.toLowerCase()) {
        throw new HttpsError('already-exists', 'Esta conta já possui outro perfil.');
      }
    } else {
      transaction.set(profileRef, {
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName || invitationData.email.split('@')[0],
        whatsappPhone: invitationData.whatsappPhone || null,
        role: 'user',
        active: true,
        permissions: invitedUserPermissions,
        invitedBy: invitationData.invitedBy,
        createdAt: FieldValue.serverTimestamp(),
        passwordChangedAt: authUser.metadata.creationTime,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    transaction.update(invitationRef, {
      status: 'accepted',
      acceptedBy: authUser.uid,
      acceptedAt: FieldValue.serverTimestamp(),
    });
  });
}

module.exports = { activateInvitedAccountCore };

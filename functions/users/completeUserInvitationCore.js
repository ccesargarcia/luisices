async function completeUserInvitationCore(request, {
  db,
  hashToken,
  getUser,
  getUserByEmail,
  activateInvitedAccount,
  HttpsError,
  now = () => new Date(),
}) {
  const { token } = request.data || {};
  if (!token || typeof token !== 'string') {
    throw new HttpsError('invalid-argument', 'Convite inválido.');
  }

  const invitationRef = db.collection('invitations').doc(hashToken(token));
  const invitation = await invitationRef.get();
  if (!invitation.exists) {
    throw new HttpsError('not-found', 'Convite inválido ou expirado.');
  }

  const invitationData = invitation.data();
  if (invitationData.status === 'accepted' && invitationData.acceptedBy) {
    const acceptedUser = await getUser(invitationData.acceptedBy);
    if (acceptedUser.emailVerified && acceptedUser.email.toLowerCase() === invitationData.email.toLowerCase()) {
      return { success: true };
    }
  }
  if (invitationData.status !== 'pending' || invitationData.expiresAt.toDate() <= now()) {
    throw new HttpsError('failed-precondition', 'Convite inválido ou expirado.');
  }

  // O token prova acesso ao convite; o Admin Auth confirma o e-mail verificado,
  // inclusive quando a verificação ocorreu em outro navegador.
  const authUser = await getUserByEmail(invitationData.email);
  if (authUser.emailVerified !== true) {
    throw new HttpsError(
      'failed-precondition',
      'Confirme o e-mail da conta antes de concluir o cadastro.'
    );
  }

  await activateInvitedAccount(invitationRef, invitationData, authUser);
  return { success: true };
}

module.exports = { completeUserInvitationCore };

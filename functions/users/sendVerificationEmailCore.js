async function sendVerificationEmailCore(request, {
  db,
  getUser,
  generateEmailVerificationLink,
  hashToken,
  getResend,
  resendApiKey,
  getAppUrl,
  getNoReplySender,
  getContactEmail,
  HttpsError,
  now = () => new Date(),
  logger = console,
}) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Faça login para solicitar a confirmação do e-mail.');
  }
  const { inviteToken } = request.data || {};
  if (!inviteToken || typeof inviteToken !== 'string') {
    throw new HttpsError('invalid-argument', 'Convite inválido.');
  }

  const resend = getResend(resendApiKey());
  if (!resend) throw new HttpsError('failed-precondition', 'Resend não configurado.');

  try {
    const authUser = await getUser(request.auth.uid);
    if (!authUser.email) throw new HttpsError('failed-precondition', 'A conta não possui e-mail.');
    if (authUser.emailVerified) return { success: true };

    const invitation = await db.collection('invitations').doc(hashToken(inviteToken)).get();
    if (!invitation.exists) throw new HttpsError('not-found', 'Convite inválido ou expirado.');
    const invitationData = invitation.data();
    if (
      invitationData.status !== 'pending' ||
      invitationData.expiresAt.toDate() <= now() ||
      invitationData.email.toLowerCase() !== authUser.email.toLowerCase()
    ) {
      throw new HttpsError('failed-precondition', 'Convite inválido ou expirado.');
    }

    const continueUrl = `${getAppUrl()}/action?mode=verifyEmail&invite=${encodeURIComponent(inviteToken)}`;
    const rawLink = await generateEmailVerificationLink(authUser.email, { url: continueUrl });
    const firebaseLink = new URL(rawLink);
    const oobCode = firebaseLink.searchParams.get('oobCode');
    if (!oobCode) throw new Error('Firebase não retornou o código de confirmação.');
    const verificationLink = `${getAppUrl()}/action?mode=verifyEmail&oobCode=${encodeURIComponent(oobCode)}&invite=${encodeURIComponent(inviteToken)}`;

    const { error } = await resend.emails.send({
      from: getNoReplySender(),
      to: [authUser.email],
      subject: 'Confirme seu e-mail - Luisices',
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333"><div style="max-width:600px;margin:auto;padding:24px"><h1 style="color:#667eea">Confirme seu e-mail</h1><p>Olá!</p><p>Confirme seu endereço de e-mail para concluir seu cadastro na Luisices.</p><p style="text-align:center;margin:32px 0"><a href="${verificationLink}" style="background:#667eea;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold">Confirmar meu e-mail</a></p><p>Se o botão não funcionar, copie este endereço no navegador:</p><p style="word-break:break-all"><a href="${verificationLink}">${verificationLink}</a></p><p>Se você não solicitou este cadastro, ignore esta mensagem.</p><hr><p style="font-size:12px;color:#666">Luisices · ${getContactEmail()}</p></div></body></html>`,
    });
    if (error) {
      logger.error('[sendVerificationEmail] Resend:', JSON.stringify(error));
      throw new Error('Falha ao enviar e-mail de confirmação.');
    }
    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('[sendVerificationEmail]', error);
    throw new HttpsError('internal', 'Não foi possível enviar o e-mail de confirmação.');
  }
}

module.exports = { sendVerificationEmailCore };

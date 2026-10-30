async function createUserInvitationCore(request, {
  db,
  getUserByEmail,
  createToken,
  hashToken,
  Timestamp,
  FieldValue,
  getResend,
  resendApiKey,
  getAppUrl,
  getNoReplySender,
  sendWhatsAppMessage,
  createCustomVerificationLink,
  activateInvitedAccount,
  writeUserAudit,
  HttpsError,
  now = () => new Date(),
  logger = console,
}) {
  const { email, whatsappPhone: requestedPhone } = request.data || {};
  if (!email || typeof email !== 'string') {
    throw new HttpsError('invalid-argument', 'E-mail do convite é obrigatório.');
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new HttpsError('invalid-argument', 'E-mail do convite é obrigatório.');
  }

  try {
    // Mantém o comportamento histórico: qualquer falha de consulta ao Auth é
    // tratada como ausência de conta e segue o fluxo de convite novo.
    const existing = await getUserByEmail(normalizedEmail).catch(() => null);
    const token = createToken();
    const expiresAt = new Date(now().getTime() + 48 * 60 * 60 * 1000);
    const invitationRef = db.collection('invitations').doc(hashToken(token));
    const invitationData = {
      email: normalizedEmail,
      whatsappPhone: requestedPhone || null,
      invitedBy: request.auth.uid,
      status: 'pending',
      expiresAt: Timestamp.fromDate(expiresAt),
      createdAt: FieldValue.serverTimestamp(),
    };

    if (existing) {
      const existingProfile = await db.doc(`userProfiles/${existing.uid}`).get();
      if (existingProfile.exists) {
        const profile = existingProfile.data();
        if (
          profile.email?.toLowerCase() === normalizedEmail &&
          profile.role === 'user' &&
          profile.active === undefined
        ) {
          await existingProfile.ref.update({
            active: true,
            updatedAt: FieldValue.serverTimestamp(),
          });
          await writeUserAudit('ORPHANED_USER_ACCOUNT_ACTIVATED', request.auth.uid, existing.uid, { email: normalizedEmail });
          return { success: true, repairedExistingAccount: true };
        }
        throw new HttpsError('already-exists', 'Este e-mail já possui uma conta ativa.');
      }

      await invitationRef.set(invitationData);
      if (existing.emailVerified) {
        await activateInvitedAccount(invitationRef, invitationData, existing);
        await writeUserAudit('ORPHANED_USER_ACCOUNT_REPAIRED', request.auth.uid, existing.uid, { email: normalizedEmail });
        return { success: true, repairedExistingAccount: true };
      }

      const resend = getResend(resendApiKey());
      if (!resend) throw new HttpsError('failed-precondition', 'Resend não configurado.');
      const verificationLink = await createCustomVerificationLink(normalizedEmail, token);
      const { error } = await resend.emails.send({
        from: getNoReplySender(),
        to: [normalizedEmail],
        subject: 'Confirme seu e-mail - Luisices',
        html: `<p>Já encontramos uma conta Luisices vinculada a este e-mail.</p><p>Confirme o endereço para concluir a ativação do seu acesso:</p><p><a href="${verificationLink}">Confirmar e ativar minha conta</a></p><p>Se não reconhece este cadastro, ignore esta mensagem.</p>`,
      });
      if (error) {
        logger.error('[createUserInvitation] Falha ao reenviar confirmação:', JSON.stringify(error));
        throw new HttpsError('internal', 'Não foi possível enviar o link de confirmação.');
      }
      await writeUserAudit('ORPHANED_USER_VERIFICATION_RESENT', request.auth.uid, existing.uid, { email: normalizedEmail });
      return { success: true, verificationSent: true, expiresAt: expiresAt.toISOString() };
    }

    const resend = getResend(resendApiKey());
    if (!resend) throw new HttpsError('failed-precondition', 'Resend não configurado.');
    await invitationRef.set(invitationData);

    const inviteLink = `${getAppUrl()}/registrar?invite=${token}`;
    const emailPromise = resend.emails.send({
      from: getNoReplySender(),
      to: [normalizedEmail],
      subject: 'Convite para acessar a plataforma Luisices',
      html: `<p>Você foi convidado para acessar a plataforma Luisices.</p><p><a href="${inviteLink}">Aceitar convite e criar conta</a></p><p>O convite expira em 48 horas. Após criar a senha, será necessário confirmar o e-mail para concluir o cadastro.</p>`,
    });
    const whatsappPromise = requestedPhone
      ? sendWhatsAppMessage(requestedPhone, `Convite Luisices\n\nAcesse o link para criar sua conta:\n${inviteLink}\n\nO convite expira em 48 horas.`)
      : Promise.resolve();
    await Promise.all([
      emailPromise,
      whatsappPromise.catch((error) => logger.error('[createUserInvitation] Evolution API:', error)),
    ]);
    await writeUserAudit('USER_INVITATION_CREATED', request.auth.uid, null, { email: normalizedEmail });
    return { success: true, expiresAt: expiresAt.toISOString() };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('[createUserInvitation]', error);
    throw new HttpsError('internal', 'Não foi possível enviar o convite.');
  }
}

module.exports = { createUserInvitationCore };

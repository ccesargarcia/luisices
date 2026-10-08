/**
 * Módulo de Gestão de Usuários, Convites e Autenticação (Cloud Functions v2).
 */

const functions = require('firebase-functions');
const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { RESEND_API_KEY, EVOLUTION_API_KEY } = require('../common/secrets');
const { passwordResetLimiter } = require('../common/rateLimiters');
const {
  getResend,
  sendWhatsAppMessage,
  getAppUrl,
  formatActionLink,
  isAdminRequest,
  hashToken,
} = require('../common/helpers');

/** Envia ao administrador um link seguro para redefinir a senha de outro usuário. */
const sendAdminPasswordReset = onCall(
  { maxInstances: 5, secrets: [RESEND_API_KEY, EVOLUTION_API_KEY] },
  async (request) => {
    if (!(await isAdminRequest(request))) {
      throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem redefinir senhas.');
    }
    const { email } = request.data || {};
    if (!email || typeof email !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'E-mail do usuário é obrigatório.');
    }
    const resend = getResend(RESEND_API_KEY.value());
    if (!resend) throw new functions.https.HttpsError('failed-precondition', 'Resend não configurado.');

    try {
      const rawResetLink = await admin.auth().generatePasswordResetLink(email.trim(), {
        url: `${getAppUrl()}/action`,
        handleCodeInApp: true,
      });
      const resetLink = formatActionLink(rawResetLink);
      const [profileQuery, authUser] = await Promise.all([
        admin.firestore().collection('userProfiles')
          .where('email', '==', email.trim().toLowerCase()).limit(1).get(),
        admin.auth().getUserByEmail(email.trim()),
      ]);
      const phone = profileQuery.empty ? null : profileQuery.docs[0].data().whatsappPhone;
      const emailPromise = resend.emails.send({
        from: 'Luisices <noreply@luisices.com.br>',
        to: [email.trim()],
        subject: 'Redefinição de senha - Luisices',
        html: `<p>Olá,</p><p>Um administrador solicitou a redefinição da senha da sua conta Luisices.</p><p><a href="${resetLink}">Definir nova senha</a></p><p>Este link expira em 1 hora e pode ser usado uma única vez.</p><p>Se você não esperava este e-mail, entre em contato com o administrador.</p>`,
      });
      const profilePromise = admin.firestore().doc(`userProfiles/${authUser.uid}`).set({
        lastPasswordResetRequestedAt: new Date().toISOString(),
      }, { merge: true });
      const whatsappPromise = phone
        ? sendWhatsAppMessage(phone, `Redefinição de senha Luisices\n\nAcesse o link:\n${resetLink}\n\nO link expira em 1 hora.`)
        : Promise.resolve();
      await Promise.all([
        emailPromise,
        profilePromise,
        whatsappPromise.catch((error) => {
          console.error('[sendAdminPasswordReset] Evolution API:', error);
        }),
      ]);
      return { success: true };
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        throw new functions.https.HttpsError('not-found', 'Usuário não encontrado.');
      }
      console.error('[sendAdminPasswordReset]', error);
      throw new functions.https.HttpsError('internal', 'Não foi possível enviar o link de redefinição.');
    }
  }
);

/** Cria convite de cadastro com token armazenado apenas em hash e validade de 48 horas. */
const createUserInvitation = onCall(
  { maxInstances: 5, secrets: [RESEND_API_KEY, EVOLUTION_API_KEY] },
  async (request) => {
    if (!(await isAdminRequest(request))) {
      throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem enviar convites.');
    }
    const { email, whatsappPhone } = request.data || {};
    if (!email || typeof email !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'E-mail do convite é obrigatório.');
    }
    const normalizedEmail = email.trim().toLowerCase();
    const resend = getResend(RESEND_API_KEY.value());
    if (!resend) throw new functions.https.HttpsError('failed-precondition', 'Resend não configurado.');

    try {
      const existing = await admin.auth().getUserByEmail(normalizedEmail).catch(() => null);
      if (existing) throw new functions.https.HttpsError('already-exists', 'Este e-mail já possui uma conta.');

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await admin.firestore().collection('invitations').doc(hashToken(token)).set({
        email: normalizedEmail,
        whatsappPhone: whatsappPhone || null,
        invitedBy: request.auth.uid,
        status: 'pending',
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const inviteLink = `${getAppUrl()}/registrar?invite=${token}`;
      const emailPromise = resend.emails.send({
        from: 'Luisices <noreply@luisices.com.br>',
        to: [normalizedEmail],
        subject: 'Convite para acessar a plataforma Luisices',
        html: `<p>Você foi convidado para acessar a plataforma Luisices.</p><p><a href="${inviteLink}">Aceitar convite e criar conta</a></p><p>O convite expira em 48 horas. Após criar a senha, será necessário confirmar o e-mail para concluir o cadastro.</p>`,
      });
      const whatsappPromise = whatsappPhone
        ? sendWhatsAppMessage(whatsappPhone, `Convite Luisices\n\nAcesse o link para criar sua conta:\n${inviteLink}\n\nO convite expira em 48 horas.`)
        : Promise.resolve();
      await Promise.all([
        emailPromise,
        whatsappPromise.catch((error) => {
          console.error('[createUserInvitation] Evolution API:', error);
        }),
      ]);
      return { success: true, expiresAt: expiresAt.toISOString() };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('[createUserInvitation]', error);
      throw new functions.https.HttpsError('internal', 'Não foi possível enviar o convite.');
    }
  }
);

/** Valida um convite sem expor o token armazenado. */
const validateUserInvitation = onCall(async (request) => {
  const { token } = request.data || {};
  if (!token || typeof token !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Convite inválido.');
  }
  const snapshot = await admin.firestore().collection('invitations').doc(hashToken(token)).get();
  if (!snapshot.exists) throw new functions.https.HttpsError('not-found', 'Convite inválido ou expirado.');
  const data = snapshot.data();
  if (data.status !== 'pending' || data.expiresAt.toDate() <= new Date()) {
    throw new functions.https.HttpsError('failed-precondition', 'Convite inválido ou expirado.');
  }
  return { email: data.email, expiresAt: data.expiresAt.toDate().toISOString() };
});

/** Conclui o cadastro convidado e inicializa o perfil do usuário. */
const completeUserInvitation = onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
  }
  const { token } = request.data || {};
  if (!token || typeof token !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Convite inválido.');
  }
  const invitationRef = admin.firestore().collection('invitations').doc(hashToken(token));
  const invitation = await invitationRef.get();
  if (!invitation.exists) {
    throw new functions.https.HttpsError('not-found', 'Convite inválido ou expirado.');
  }
  const invData = invitation.data();
  if (invData.status !== 'pending' || invData.expiresAt.toDate() <= new Date()) {
    throw new functions.https.HttpsError('failed-precondition', 'Convite inválido ou expirado.');
  }

  const authUser = await admin.auth().getUser(request.auth.uid);
  if (authUser.email.toLowerCase() !== invData.email.toLowerCase()) {
    throw new functions.https.HttpsError('permission-denied', 'O e-mail autenticado não corresponde ao convite.');
  }
  if (authUser.emailVerified !== true) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Confirme o e-mail da conta antes de concluir o cadastro.'
    );
  }

  await admin.firestore().runTransaction(async (transaction) => {
    const invSnap = await transaction.get(invitationRef);
    if (!invSnap.exists || invSnap.data().status !== 'pending') {
      throw new functions.https.HttpsError('already-exists', 'Este convite já foi utilizado.');
    }
    const userProfileRef = admin.firestore().doc(`userProfiles/${request.auth.uid}`);
    transaction.set(userProfileRef, {
      uid: request.auth.uid,
      email: authUser.email,
      displayName: authUser.displayName || invData.email.split('@')[0],
      whatsappPhone: invData.whatsappPhone || null,
      role: 'user',
      permissions: {
        orders: { view: true, create: true, edit: false, delete: false },
        customers: { view: true, create: true, edit: false, delete: false },
        products: { view: true, create: false, edit: false, delete: false },
        finances: { view: false, create: false, edit: false, delete: false },
        reports: { view: false },
        settings: { view: false, edit: false },
      },
      invitedBy: invData.invitedBy,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.update(invitationRef, {
      status: 'accepted',
      acceptedBy: request.auth.uid,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  return { success: true };
});

/** Envia email de recuperação de senha via Resend */
const sendPasswordResetEmail = onCall(
  { maxInstances: 5, secrets: [RESEND_API_KEY, EVOLUTION_API_KEY] },
  async (request) => {
    const { email } = request.data || {};

    if (!email) {
      throw new functions.https.HttpsError('invalid-argument', 'Email é obrigatório');
    }

    try {
      await passwordResetLimiter.consume(email.toLowerCase());
    } catch (rateLimiterRes) {
      const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000 / 60);
      console.warn(`[sendPasswordResetEmail] Rate limit excedido para: ${email}`);
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Muitas tentativas. Tente novamente em ${retryAfter} minuto(s).`
      );
    }

    const resend = getResend(RESEND_API_KEY.value());
    if (!resend) {
      throw new functions.https.HttpsError('failed-precondition', 'Resend não configurado');
    }

    try {
      const maskedEmail = typeof email === 'string' ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '***';
      console.log(`[sendPasswordResetEmail] Iniciando para: ${maskedEmail}`);

      const actionUrl = `${getAppUrl()}/action`;
      const rawResetLink = await admin.auth().generatePasswordResetLink(email, {
        url: actionUrl,
      });
      const resetLink = formatActionLink(rawResetLink);
      const profileQuery = await admin.firestore().collection('userProfiles')
        .where('email', '==', email.trim().toLowerCase()).limit(1).get();
      const phone = profileQuery.empty ? null : profileQuery.docs[0].data().whatsappPhone;

      const { data: emailData, error } = await resend.emails.send({
        from: 'Luisices <noreply@luisices.com.br>',
        to: [email],
        subject: 'Recuperação de Senha - Luisices',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
              .button:hover { background: #5568d3; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Recuperação de Senha</h1>
              </div>
              <div class="content">
                <p>Olá,</p>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta <strong>Luisices</strong>.</p>
                <p style="text-align: center;">
                  <a href="${resetLink}" class="button">Redefinir Minha Senha</a>
                </p>
                <p style="font-size: 12px; color: #666;">
                  Ou copie e cole este link no seu navegador:<br>
                  <a href="${resetLink}" style="word-break: break-all; color: #667eea;">${resetLink}</a>
                </p>
                <div class="warning">
                  <p style="margin: 0;"><strong>⏰ Este link expira em 1 hora.</strong></p>
                </div>
                <p>Se você <strong>não solicitou</strong> esta alteração, pode ignorar este email com segurança. Sua senha permanecerá inalterada.</p>
                <p>Atenciosamente,<br><strong>Equipe Luisices</strong><br>Papelaria Personalizada</p>
              </div>
              <div class="footer">
                <p>Este é um email automático, por favor não responda.</p>
                <p>Para suporte, entre em contato: contato@luisices.com.br</p>
                <p>&copy; ${new Date().getFullYear()} Luisices - Todos os direitos reservados</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (phone) {
        await sendWhatsAppMessage(phone, `Recuperação de senha Luisices\n\nAcesse o link:\n${resetLink}\n\nO link expira em 1 hora.`)
          .catch((err) => console.error('[sendPasswordResetEmail] Evolution API:', err));
      }

      if (error) {
        console.error('[sendPasswordResetEmail] Erro ao enviar email via Resend:', JSON.stringify(error));
        throw new functions.https.HttpsError('internal', `Erro Resend: ${error.message || JSON.stringify(error)}`);
      }

      return {
        success: true,
        message: 'Email de recuperação enviado com sucesso!',
        emailId: emailData?.id,
      };
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return {
          success: true,
          message: 'Se o email estiver cadastrado, você receberá instruções de recuperação.',
        };
      }
      throw new functions.https.HttpsError('internal', 'Erro ao enviar email de recuperação');
    }
  }
);

/** Remove um usuário do Firebase Auth e do Firestore (apenas admin). */
const deleteUser = onCall(async (request) => {
  if (!(await isAdminRequest(request))) {
    throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem remover usuários.');
  }
  const { uid } = request.data || {};
  if (!uid || typeof uid !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'UID do usuário é obrigatório.');
  }
  if (uid === request.auth.uid) {
    throw new functions.https.HttpsError('failed-precondition', 'Você não pode remover sua própria conta de administrador.');
  }

  const profileRef = admin.firestore().doc(`userProfiles/${uid}`);
  const profileSnap = await profileRef.get();

  if (profileSnap.exists) {
    try {
      await profileRef.update({
        active: false,
        deletionStatus: 'in_progress',
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('[deleteUser] Falha ao desativar perfil antes da exclusão:', err);
      throw new functions.https.HttpsError(
        'internal',
        `Não foi possível desativar o perfil do usuário para exclusão: ${err?.message || err}`
      );
    }
  }

  try {
    await admin.auth().revokeRefreshTokens(uid);
  } catch (err) {
    if (err?.code !== 'auth/user-not-found') {
      console.warn('[deleteUser] Aviso ao revogar tokens:', err?.message || err);
    }
  }

  try {
    await admin.auth().deleteUser(uid);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') {
      console.error('[deleteUser] Falha ao remover usuário do Firebase Auth:', error);
      if (profileSnap.exists) {
        await profileRef.update({
          active: false,
          deletionStatus: 'auth_delete_failed',
          deletionError: error?.message || String(error),
        }).catch((updateErr) => {
          console.error('[deleteUser] Falha ao registrar status de erro no perfil:', updateErr);
        });
      }
      throw new functions.https.HttpsError(
        'internal',
        `Falha ao remover usuário do serviço de autenticação: ${error?.message || 'erro desconhecido'}. A conta permanece desativada e a exclusão pode ser retomada.`
      );
    }
  }

  try {
    await profileRef.delete();
    return { success: true };
  } catch (firestoreError) {
    console.error('[deleteUser] Erro ao deletar perfil do Firestore:', firestoreError);
    throw new functions.https.HttpsError('internal', 'Usuário removido da autenticação, mas houve falha ao limpar o perfil no banco.');
  }
});

/** Cria um novo usuário via Firebase Auth e inicializa o perfil no Firestore (apenas admin). */
const createUser = onCall(async (request) => {
  if (!(await isAdminRequest(request))) {
    throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem criar usuários.');
  }

  const { email, password, displayName, role, permissions } = request.data || {};

  if (!email || typeof email !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'E-mail é obrigatório.');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Senha deve ter pelo menos 6 caracteres.');
  }
  if (!displayName || typeof displayName !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Nome é obrigatório.');
  }

  const allowedRoles = ['admin', 'funcionario', 'user'];
  if (!role || !allowedRoles.includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Role inválido.');
  }

  try {
    const userRecord = await admin.auth().createUser({
      email: email.trim(),
      password,
      displayName: displayName.trim(),
    });

    const profile = {
      uid: userRecord.uid,
      email: email.trim(),
      displayName: displayName.trim(),
      role,
      permissions: permissions || {},
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: request.auth.uid,
    };

    await admin.firestore().doc(`userProfiles/${userRecord.uid}`).set(profile);

    return { success: true, uid: userRecord.uid, profile };
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Este e-mail já possui uma conta.');
    }
    if (error.code === 'auth/invalid-email') {
      throw new functions.https.HttpsError('invalid-argument', 'E-mail inválido.');
    }
    if (error.code === 'auth/weak-password') {
      throw new functions.https.HttpsError('invalid-argument', 'Senha muito fraca.');
    }
    console.error('[createUser] Error:', error);
    throw new functions.https.HttpsError('internal', 'Não foi possível criar o usuário.');
  }
});

module.exports = {
  sendAdminPasswordReset,
  createUserInvitation,
  validateUserInvitation,
  completeUserInvitation,
  sendPasswordResetEmail,
  deleteUser,
  createUser,
};

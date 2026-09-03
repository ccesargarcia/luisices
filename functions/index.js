const functions = require('firebase-functions');
const { onCall } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { Resend } = require('resend');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const crypto = require('crypto');

admin.initializeApp();

// Rate limiter: 3 tentativas por email a cada hora
const rateLimiter = new RateLimiterMemory({
  points: 3,
  duration: 3600, // 1 hora em segundos
});

// Configurar Resend API Key usando o novo sistema de params
// Execute: firebase functions:secrets:set RESEND_API_KEY
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

// Helper para inicializar Resend com a chave
const getResend = (apiKey) => apiKey ? new Resend(apiKey) : null;

const getAppUrl = () => {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  return projectId === 'luisices-dev' ? 'https://dev.luisices.com.br' : 'https://luisices.com.br';
};

const formatActionLink = (rawFirebaseLink, fallbackMode = 'resetPassword') => {
  try {
    const parsed = new URL(rawFirebaseLink);
    const mode = parsed.searchParams.get('mode') || fallbackMode;
    const oobCode = parsed.searchParams.get('oobCode');
    if (oobCode) {
      return `${getAppUrl()}/action?mode=${encodeURIComponent(mode)}&oobCode=${encodeURIComponent(oobCode)}`;
    }
  } catch (e) {
    console.error('[formatActionLink] Error parsing raw link:', e);
  }
  return rawFirebaseLink;
};

const isAdminRequest = async (request) => {
  if (!request.auth) return false;
  const profile = await admin.firestore().doc(`userProfiles/${request.auth.uid}`).get();
  return profile.exists && profile.data().role === 'admin' && profile.data().active !== false;
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/** Envia ao administrador um link seguro para redefinir a senha de outro usuário. */
exports.sendAdminPasswordReset = onCall({ secrets: [RESEND_API_KEY] }, async (request) => {
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
    await resend.emails.send({
      from: 'Luisices <noreply@luisices.com.br>',
      to: [email.trim()],
      subject: 'Redefinição de senha - Luisices',
      html: `<p>Olá,</p><p>Um administrador solicitou a redefinição da senha da sua conta Luisices.</p><p><a href="${resetLink}">Definir nova senha</a></p><p>Este link expira em 1 hora e pode ser usado uma única vez.</p><p>Se você não esperava este e-mail, entre em contato com o administrador.</p>`,
    });
    return { success: true };
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      throw new functions.https.HttpsError('not-found', 'Usuário não encontrado.');
    }
    console.error('[sendAdminPasswordReset]', error);
    throw new functions.https.HttpsError('internal', 'Não foi possível enviar o link de redefinição.');
  }
});

/** Cria convite de cadastro com token armazenado apenas em hash e validade de 48 horas. */
exports.createUserInvitation = onCall({ secrets: [RESEND_API_KEY] }, async (request) => {
  if (!(await isAdminRequest(request))) {
    throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem enviar convites.');
  }
  const { email } = request.data || {};
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
      invitedBy: request.auth.uid,
      status: 'pending',
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const inviteLink = `${getAppUrl()}/registrar?invite=${token}`;
    await resend.emails.send({
      from: 'Luisices <noreply@luisices.com.br>',
      to: [normalizedEmail],
      subject: 'Convite para acessar a plataforma Luisices',
      html: `<p>Você foi convidado para acessar a plataforma Luisices.</p><p><a href="${inviteLink}">Aceitar convite e criar conta</a></p><p>O convite expira em 48 horas. Após criar a senha, será necessário confirmar o e-mail para concluir o cadastro.</p>`,
    });
    return { success: true, expiresAt: expiresAt.toISOString() };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error('[createUserInvitation]', error);
    throw new functions.https.HttpsError('internal', 'Não foi possível enviar o convite.');
  }
});

/** Valida um convite sem expor o token armazenado. */
exports.validateUserInvitation = onCall(async (request) => {
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

/** Conclui o cadastro convidado somente após a confirmação do e-mail. */
exports.completeUserInvitation = onCall(async (request) => {
  if (!request.auth || request.auth.token.email_verified !== true) {
    throw new functions.https.HttpsError('failed-precondition', 'Confirme seu e-mail antes de concluir o cadastro.');
  }
  const { token } = request.data || {};
  if (!token || typeof token !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Convite inválido.');
  }
  const invitationRef = admin.firestore().collection('invitations').doc(hashToken(token));
  const invitation = await invitationRef.get();
  if (!invitation.exists) throw new functions.https.HttpsError('not-found', 'Convite inválido ou expirado.');
  const data = invitation.data();
  if (data.status !== 'pending' || data.expiresAt.toDate() <= new Date() || data.email !== request.auth.token.email.toLowerCase()) {
    throw new functions.https.HttpsError('failed-precondition', 'Convite inválido, expirado ou destinado a outro e-mail.');
  }

  const profileRef = admin.firestore().doc(`userProfiles/${request.auth.uid}`);
  await admin.firestore().runTransaction(async (transaction) => {
    const currentInvitation = await transaction.get(invitationRef);
    if (!currentInvitation.exists || currentInvitation.data().status !== 'pending') {
      throw new functions.https.HttpsError('failed-precondition', 'Este convite já foi utilizado.');
    }
    transaction.set(profileRef, {
    uid: request.auth.uid,
    email: data.email,
    displayName: request.auth.token.name || data.email,
    role: 'user',
    permissions: {
      dashboard: true,
      orders: { view: true, create: true, edit: true, delete: false },
      customers: { view: true, create: true, edit: true, delete: false },
      products: { view: true, create: false, edit: false, delete: false },
      quotes: { view: true, create: true, edit: true, delete: false },
      gallery: { view: true, create: true, delete: false },
      reports: false,
      exchanges: false,
      settings: true,
      users: { view: false, create: false, edit: false, delete: false },
    },
    active: true,
    createdAt: new Date().toISOString(),
    createdBy: data.invitedBy,
    }, { merge: false });
    transaction.update(invitationRef, { status: 'accepted', acceptedBy: request.auth.uid, acceptedAt: admin.firestore.FieldValue.serverTimestamp() });
  });
  return { success: true };
});

/**
 * Cloud Function para enviar email de recuperação de senha via Resend
 *
 * Trigger: Chamada HTTP (v2)
 * Endpoint: https://REGION-PROJECT_ID.cloudfunctions.net/sendPasswordResetEmail
 */
exports.sendPasswordResetEmail = onCall({ secrets: [RESEND_API_KEY] }, async (request) => {
  const { email } = request.data;

  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email é obrigatório');
  }

  // Rate limiting: prevenir abuso
  try {
    await rateLimiter.consume(email.toLowerCase());
  } catch (rateLimiterRes) {
    const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000 / 60); // minutos
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
    console.log(`[sendPasswordResetEmail] Iniciando para: ${email}`);

    const actionUrl = `${getAppUrl()}/action`;
    console.log(`[sendPasswordResetEmail] URL de ação: ${actionUrl}`);

    // Gerar link de reset de senha do Firebase Auth
    const rawResetLink = await admin.auth().generatePasswordResetLink(email, {
      url: actionUrl,
    });
    const resetLink = formatActionLink(rawResetLink);

    console.log(`[sendPasswordResetEmail] Link gerado com sucesso`);

    // Enviar email via Resend
    console.log(`[sendPasswordResetEmail] Enviando email via Resend...`);
    const { data: emailData, error } = await resend.emails.send({
      from: 'Luisices <noreply@luisices.com.br>', // Domínio verificado no Resend
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

              <p>Atenciosamente,<br>
              <strong>Equipe Luisices</strong><br>
              Papelaria Personalizada</p>
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

    if (error) {
      console.error('[sendPasswordResetEmail] Erro ao enviar email via Resend:', JSON.stringify(error));
      throw new functions.https.HttpsError('internal', `Erro Resend: ${error.message || JSON.stringify(error)}`);
    }

    console.log(`[sendPasswordResetEmail] Email enviado com sucesso! ID: ${emailData?.id}`);

    return {
      success: true,
      message: 'Email de recuperação enviado com sucesso!',
      emailId: emailData?.id
    };

  } catch (error) {
    console.error('[sendPasswordResetEmail] Exception capturada:', error);
    console.error('[sendPasswordResetEmail] Error code:', error.code);
    console.error('[sendPasswordResetEmail] Error message:', error.message);

    if (error.code === 'auth/user-not-found') {
      // Por segurança, retornar sucesso mesmo se usuário não existir
      // Isso evita que atacantes descubram quais emails estão cadastrados
      return {
        success: true,
        message: 'Se o email estiver cadastrado, você receberá instruções de recuperação.'
      };
    }

    throw new functions.https.HttpsError('internal', 'Erro ao enviar email de recuperação');
  }
});

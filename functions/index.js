const functions = require('firebase-functions');
const { onCall, onRequest } = require('firebase-functions/v2/https');
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

// Rate limiter para envio customizado de e-mails: máximo de 50 disparos por hora por usuário admin
const customEmailLimiter = new RateLimiterMemory({
  points: 50,
  duration: 3600, // 1 hora em segundos
});

// Rate limiter para o Agente de IA interno: 60 requisições por minuto por usuário
const aiAgentLimiter = new RateLimiterMemory({
  points: 60,
  duration: 60,
});

// Rate limiter para análise de imagens e visão computacional: 20 requisições por minuto por usuário
const galleryAiLimiter = new RateLimiterMemory({
  points: 20,
  duration: 60,
});

// Configurar secrets usando o sistema de params
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const EVOLUTION_API_KEY = defineSecret('EVOLUTION_API_KEY');
const RESEND_WEBHOOK_SECRET = defineSecret('RESEND_WEBHOOK_SECRET');
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

const EVOLUTION_API_URL = 'https://wa.luisices.com.br';
const EVOLUTION_INSTANCE = 'homeassistant';

// Helper para inicializar Resend com a chave
const getResend = (apiKey) => apiKey ? new Resend(apiKey) : null;

const normalizeWhatsAppNumber = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
};

const sendWhatsAppMessage = async (phone, text) => {
  if (!phone || !EVOLUTION_API_KEY.value()) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const response = await fetch(
    `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`,
    {
      method: 'POST',
      headers: {
        apikey: EVOLUTION_API_KEY.value(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number: normalizeWhatsAppNumber(phone), text }),
      signal: controller.signal,
    },
  );
  clearTimeout(timeout);
  if (!response.ok) throw new Error(`Evolution API respondeu ${response.status}`);
};

const getAppUrl = () => {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  return projectId === 'luisices-dev' ? 'https://dev.luisices.com.br' : 'https://luisices.com.br';
};

const toCdnUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('cdn.luisices.com.br') || url.includes('cdn-dev.luisices.com.br')) {
    return url.split('?')[0];
  }
  if (!url.includes('firebasestorage.googleapis.com')) {
    return url;
  }
  try {
    const match = url.match(/\/o\/(.+?)(\?.*)?$/);
    if (!match || !match[1]) return url;
    const rawPath = decodeURIComponent(match[1]);
    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    const cdnDomain = projectId === 'luisices-dev' ? 'https://cdn-dev.luisices.com.br' : 'https://cdn.luisices.com.br';
    return `${cdnDomain}/${rawPath}`;
  } catch {
    return url;
  }
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
exports.sendAdminPasswordReset = onCall({ maxInstances: 5, secrets: [RESEND_API_KEY, EVOLUTION_API_KEY] }, async (request) => {
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
    await Promise.all([emailPromise, profilePromise, whatsappPromise.catch(error => {
      console.error('[sendAdminPasswordReset] Evolution API:', error);
    })]);
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
exports.createUserInvitation = onCall({ maxInstances: 5, secrets: [RESEND_API_KEY, EVOLUTION_API_KEY] }, async (request) => {
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
    await Promise.all([emailPromise, whatsappPromise.catch(error => {
      console.error('[createUserInvitation] Evolution API:', error);
    })]);
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

/** Conclui o cadastro convidado e inicializa o perfil do usuário. */
exports.completeUserInvitation = onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
  }
  const { token } = request.data || {};
  if (!token || typeof token !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Convite inválido.');
  }
  const invitationRef = admin.firestore().collection('invitations').doc(hashToken(token));
  const invitation = await invitationRef.get();
  if (!invitation.exists) throw new functions.https.HttpsError('not-found', 'Convite inválido ou expirado.');
  const data = invitation.data();
  if (data.status === 'accepted' && data.acceptedBy === request.auth.uid) {
    return { success: true, alreadyCompleted: true };
  }
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
      whatsappPhone: data.whatsappPhone || null,
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
        emails: false,
      },
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: data.invitedBy,
    }, { merge: false });
    transaction.update(invitationRef, {
      status: 'accepted',
      acceptedBy: request.auth.uid,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
  return { success: true };
});

/**
 * Cloud Function para enviar email de recuperação de senha via Resend
 *
 * Trigger: Chamada HTTP (v2)
 * Endpoint: https://REGION-PROJECT_ID.cloudfunctions.net/sendPasswordResetEmail
 */
exports.sendPasswordResetEmail = onCall({ maxInstances: 5, secrets: [RESEND_API_KEY, EVOLUTION_API_KEY] }, async (request) => {
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
    const maskedEmail = typeof email === 'string' ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '***';
    console.log(`[sendPasswordResetEmail] Iniciando para: ${maskedEmail}`);

    const actionUrl = `${getAppUrl()}/action`;
    console.log(`[sendPasswordResetEmail] URL de ação: ${actionUrl}`);

    // Gerar link de reset de senha do Firebase Auth
    const rawResetLink = await admin.auth().generatePasswordResetLink(email, {
      url: actionUrl,
    });
    const resetLink = formatActionLink(rawResetLink);
    const profileQuery = await admin.firestore().collection('userProfiles')
      .where('email', '==', email.trim().toLowerCase()).limit(1).get();
    const phone = profileQuery.empty ? null : profileQuery.docs[0].data().whatsappPhone;

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

    if (phone) {
      await sendWhatsAppMessage(phone, `Recuperação de senha Luisices\n\nAcesse o link:\n${resetLink}\n\nO link expira em 1 hora.`)
        .catch(error => console.error('[sendPasswordResetEmail] Evolution API:', error));
    }

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

/** Remove um usuário do Firebase Auth e do Firestore (apenas admin). */
exports.deleteUser = onCall(async (request) => {
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

  try {
    // 1. Remove do Firebase Auth
    await admin.auth().deleteUser(uid).catch((err) => {
      console.warn('[deleteUser] Auth delete warning:', err?.message || err);
    });

    // 2. Remove o perfil do Firestore
    await admin.firestore().doc(`userProfiles/${uid}`).delete();

    return { success: true };
  } catch (error) {
    console.error('[deleteUser] Error:', error);
    throw new functions.https.HttpsError('internal', 'Não foi possível remover o usuário.');
  }
});

/** Cria um novo usuário via Firebase Auth e inicializa o perfil no Firestore (apenas admin). */
exports.createUser = onCall(async (request) => {
  if (!(await isAdminRequest(request))) {
    throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem criar usuários.');
  }

  const { email, password, displayName, role, permissions, createdBy } = request.data || {};

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
    // 1. Criar usuário no Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email.trim(),
      password,
      displayName: displayName.trim(),
    });

    // 2. Criar perfil no Firestore
    const profile = {
      uid: userRecord.uid,
      email: email.trim(),
      displayName: displayName.trim(),
      role,
      permissions: permissions || {},
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: createdBy || request.auth.uid,
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

/**
 * Cloud Function para envio de e-mails via Resend pela plataforma Luisices.
 * Salva o histórico de envios na coleção 'sentEmails'.
 */
exports.sendCustomEmail = onCall({ cors: true, maxInstances: 5, secrets: [RESEND_API_KEY] }, async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  if (!(await isAdminRequest(request))) {
    throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem disparar e-mails pelo sistema.');
  }

  // Rate Limiting: proteção contra abusos, loops e exaustão de cota
  try {
    await customEmailLimiter.consume(request.auth.uid);
  } catch {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Limite de envio de e-mails atingido (máximo de 50 disparos por hora). Tente novamente mais tarde.'
    );
  }

  const { to, subject, html, text, from, replyTo, cc, bcc } = request.data || {};

  if (!to || (Array.isArray(to) && to.length === 0)) {
    throw new functions.https.HttpsError('invalid-argument', 'Pelo menos um destinatário é obrigatório.');
  }

  const recipientList = Array.isArray(to)
    ? to.map((e) => String(e).trim()).filter(Boolean)
    : [String(to).trim()];

  if (recipientList.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Pelo menos um destinatário válido é obrigatório.');
  }

  if (recipientList.length > 50) {
    throw new functions.https.HttpsError('invalid-argument', 'O número máximo de destinatários por envio é 50.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const email of recipientList) {
    if (!emailRegex.test(email)) {
      throw new functions.https.HttpsError('invalid-argument', `Endereço de e-mail inválido: "${email}"`);
    }
  }

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Assunto é obrigatório.');
  }

  if (subject.trim().length > 200) {
    throw new functions.https.HttpsError('invalid-argument', 'O assunto do e-mail não pode ultrapassar 200 caracteres.');
  }

  if (!html && !text) {
    throw new functions.https.HttpsError('invalid-argument', 'Conteúdo da mensagem (HTML ou texto) é obrigatório.');
  }

  const bodyLength = (html ? String(html).length : 0) + (text ? String(text).length : 0);
  if (bodyLength > 500 * 1024) {
    throw new functions.https.HttpsError('invalid-argument', 'O tamanho da mensagem excede o limite máximo permitido (500 KB).');
  }

  const resend = getResend(RESEND_API_KEY.value());
  if (!resend) {
    throw new functions.https.HttpsError('failed-precondition', 'Resend não configurado.');
  }

  const isDev = (process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT) === 'luisices-dev';
  const defaultSender = isDev
    ? 'Luisices Dev <contato@dev.luisices.com.br>'
    : 'Luisices <contato@luisices.com.br>';

  let senderEmail = defaultSender;
  if (from && from.trim()) {
    const trimmedFrom = from.trim();
    const domainMatch = trimmedFrom.match(/@([a-zA-Z0-9.-]+)>?$/);
    const domain = domainMatch ? domainMatch[1].toLowerCase() : '';
    if (domain === 'luisices.com.br' || domain === 'dev.luisices.com.br' || domain.endsWith('.luisices.com.br')) {
      senderEmail = trimmedFrom;
    } else {
      console.warn(`[sendCustomEmail] Remetente com domínio não autorizado (${domain}). Usando padrão: ${defaultSender}`);
      senderEmail = defaultSender;
    }
  }

  try {
    const payload = {
      from: senderEmail,
      to: recipientList,
      subject: subject.trim(),
    };

    if (html) payload.html = html;
    if (text) payload.text = text;
    if (replyTo) payload.reply_to = replyTo.trim();
    if (cc && Array.isArray(cc) && cc.length > 0) {
      payload.cc = cc.map((c) => String(c).trim()).filter(Boolean);
    }
    if (bcc && Array.isArray(bcc) && bcc.length > 0) {
      payload.bcc = bcc.map((b) => String(b).trim()).filter(Boolean);
    }

    console.log(`[sendCustomEmail] Enviando e-mail para: ${recipientList.join(', ')} - Assunto: ${subject}`);
    const { data: resendData, error: resendError } = await resend.emails.send(payload);

    if (resendError) {
      console.error('[sendCustomEmail] Erro retornado pela API Resend:', JSON.stringify(resendError));
      throw new functions.https.HttpsError(
        'internal',
        resendError.message || 'Falha ao disparar o e-mail via Resend.'
      );
    }

    const emailRecord = {
      resendId: resendData?.id || null,
      from: senderEmail,
      to: recipientList,
      cc: payload.cc || [],
      bcc: payload.bcc || [],
      subject: subject.trim(),
      html: html || '',
      text: text || '',
      status: 'sent',
      senderUid: request.auth.uid,
      senderEmail: request.auth.token.email || '',
      sentAt: new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await admin.firestore().collection('sentEmails').add(emailRecord);

    return {
      success: true,
      emailId: resendData?.id,
      id: docRef.id,
    };
  } catch (error) {
    console.error('[sendCustomEmail] Exceção:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', error.message || 'Erro ao enviar e-mail.');
  }
});

/**
 * Cloud Function para consultar a cota / limite de envio de e-mails via Resend API (ou fallback via Firestore).
 */
exports.getEmailUsage = onCall({ cors: true, maxInstances: 5, secrets: [RESEND_API_KEY] }, async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const profile = await admin.firestore().doc(`userProfiles/${request.auth.uid}`).get();
  const profileData = profile.exists ? profile.data() : null;
  const hasEmailPerm = profileData?.role === 'admin' || profileData?.permissions?.emails === true;
  if (!hasEmailPerm) {
    throw new functions.https.HttpsError('permission-denied', 'Sem permissão para consultar a cota de e-mails.');
  }

  // 1. Sempre computar contagem real do Firestore para garantir feedback em tempo real
  const now = new Date();
  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const startOfMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));

  let firestoreTodayCount = 0;
  let firestoreMonthCount = 0;
  try {
    const [todaySnap, monthSnap] = await Promise.all([
      admin.firestore().collection('sentEmails')
        .where('sentAt', '>=', startOfTodayUtc.toISOString())
        .get(),
      admin.firestore().collection('sentEmails')
        .where('sentAt', '>=', startOfMonthUtc.toISOString())
        .get(),
    ]);
    firestoreTodayCount = todaySnap.size;
    firestoreMonthCount = monthSnap.size;
  } catch (fsErr) {
    console.warn('[getEmailUsage] Erro ao consultar sentEmails no Firestore:', fsErr);
  }

  // 2. Tentar consultar métricas oficiais do Resend
  let resendDailySent = 0;
  let resendMonthlySent = 0;
  let source = 'firestore_fallback';

  const apiKey = RESEND_API_KEY.value();
  if (apiKey) {
    try {
      const startOfTodayIso = `${now.toISOString().split('T')[0]}T00:00:00Z`;
      const startOfMonthIso = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00Z`;

      // Omitir end_date faz o Resend assumir o horário atual (now), pegando todos os envios de hoje
      const [dailyRes, monthlyRes] = await Promise.all([
        fetch(`https://api.resend.com/emails/metrics?start_date=${startOfTodayIso}&metrics=sent,delivered`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Luisices-Functions/1.0',
          },
        }),
        fetch(`https://api.resend.com/emails/metrics?start_date=${startOfMonthIso}&metrics=sent,delivered`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Luisices-Functions/1.0',
          },
        }),
      ]);

      if (dailyRes.ok && monthlyRes.ok) {
        const dailyData = await dailyRes.json();
        const monthlyData = await monthlyRes.json();
        resendDailySent = Number(dailyData?.totals?.sent ?? 0);
        resendMonthlySent = Number(monthlyData?.totals?.sent ?? 0);
        source = 'resend_api';
        console.log(`[getEmailUsage] Resend metrics sucesso - Hoje: ${resendDailySent}, Mês: ${resendMonthlySent}`);
      } else {
        console.warn(`[getEmailUsage] Resend /emails/metrics status: daily=${dailyRes.status}, monthly=${monthlyRes.status}`);
      }
    } catch (err) {
      console.warn('[getEmailUsage] Erro ao consultar https://api.resend.com/emails/metrics:', err);
    }
  }

  // O valor final é o máximo entre Resend e Firestore (cobre os 15 min de cache da API Resend)
  const finalDailyUsed = Math.max(resendDailySent, firestoreTodayCount);
  const finalMonthlyUsed = Math.max(resendMonthlySent, firestoreMonthCount);

  const nextUtcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const nextUtcMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));

  return {
    success: true,
    source,
    daily: {
      used: finalDailyUsed,
      limit: 100, // Cota diária do plano gratuito Resend
      sent: finalDailyUsed,
      received: 0,
      resetsAt: nextUtcMidnight.toISOString(),
    },
    monthly: {
      used: finalMonthlyUsed,
      limit: 3000, // Cota mensal do plano gratuito Resend
      sent: finalMonthlyUsed,
      received: 0,
      resetsAt: nextUtcMonth.toISOString(),
    },
  };
});

/**
 * Webhook HTTP para recebimento de e-mails via Resend (email.received).
 * Armazena e-mails recebidos na coleção 'receivedEmails'.
 *
 * Configuração no Resend Dashboard:
 * URL: https://<regiao>-<projeto>.cloudfunctions.net/resendReceivingWebhook
 * Eventos selecionados: email.received
 */
exports.resendReceivingWebhook = onRequest({ cors: true, secrets: [RESEND_API_KEY, RESEND_WEBHOOK_SECRET] }, async (req, res) => {
  if (req.method === 'GET' || req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, svix-id, svix-timestamp, svix-signature');
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    return res.status(200).json({ status: 'active', message: 'Luisices Resend Webhook ativo e operacional' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Validação de assinatura Svix
    const webhookSecret = RESEND_WEBHOOK_SECRET.value() || process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[resendReceivingWebhook] ERRO: RESEND_WEBHOOK_SECRET não configurado no Cloud Functions Secrets.');
      return res.status(500).json({ error: 'Configuração de segurança do webhook pendente no servidor' });
    }
    const svixId = req.headers['svix-id'];
      const svixTimestamp = req.headers['svix-timestamp'];
      const svixSignature = req.headers['svix-signature'];

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.warn('[resendReceivingWebhook] Cabeçalhos de assinatura Svix ausentes');
        return res.status(401).json({ error: 'Assinatura do webhook ausente' });
      }

      // Proteção contra replay attack (janela de 5 minutos)
      const now = Math.floor(Date.now() / 1000);
      const timestampNum = parseInt(String(svixTimestamp), 10);
      if (isNaN(timestampNum) || Math.abs(now - timestampNum) > 300) {
        console.warn('[resendReceivingWebhook] Timestamp fora da tolerância de 5 minutos:', timestampNum);
        return res.status(401).json({ error: 'Timestamp do webhook expirado ou inválido' });
      }

      try {
        const secretBytes = webhookSecret.startsWith('whsec_')
          ? Buffer.from(webhookSecret.slice(6), 'base64')
          : Buffer.from(webhookSecret);
        const rawContent = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
        const signedContent = `${svixId}.${svixTimestamp}.${rawContent}`;
        const computedSignature = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');

        const providedSignatures = String(svixSignature)
          .split(' ')
          .map((s) => s.split(',')[1])
          .filter(Boolean);

        const signatureValid = providedSignatures.some((sig) => {
          try {
            const a = Buffer.from(sig, 'base64');
            const b = Buffer.from(computedSignature, 'base64');
            return a.length === b.length && crypto.timingSafeEqual(a, b);
          } catch {
            return false;
          }
        });

        if (!signatureValid) {
          console.warn('[resendReceivingWebhook] Assinatura Svix rejeitada');
          return res.status(401).json({ error: 'Assinatura Svix inválida' });
        }
      } catch (err) {
        console.error('[resendReceivingWebhook] Falha na validação criptográfica:', err);
        return res.status(401).json({ error: 'Falha na validação de assinatura' });
      }

    const event = req.body;
    console.log('[resendReceivingWebhook] Recebido evento:', event?.type);

    if (!event || event.type !== 'email.received') {
      console.log('[resendReceivingWebhook] Evento não é email.received, ignorado:', event?.type);
      return res.status(200).json({ status: 'ignored', type: event?.type });
    }

    const eventData = event.data || {};
    const emailId = eventData.email_id || eventData.id;

    if (!emailId) {
      console.warn('[resendReceivingWebhook] Nenhum email_id no payload:', eventData);
      return res.status(400).json({ error: 'Payload sem email_id' });
    }

    // Validação de Destinatários Permitidos (Allowlist de Caixas Postais Autorizadas)
    const allowedMailboxPrefixes = [
      'caio',
      'amanda',
      'suporte',
      'noreply',
      'contato',
      'atendimento',
    ];

    const checkAllowedRecipient = (recipients) => {
      if (!Array.isArray(recipients) || recipients.length === 0) return true; // Se não houver lista, não descarta prematuramente
      return recipients.some((r) => {
        if (typeof r !== 'string') return false;
        const match = r.match(/<([^>]+)>/) || [null, r];
        const cleanEmail = (match[1] || r).trim().toLowerCase();
        const [mailbox, domain] = cleanEmail.split('@');
        if (!mailbox || !domain) return false;

        const isLuisicesDomain =
          domain === 'luisices.com.br' ||
          domain === 'dev.luisices.com.br' ||
          domain.endsWith('.luisices.com.br');

        return isLuisicesDomain && allowedMailboxPrefixes.includes(mailbox);
      });
    };

    const initialRecipients = Array.isArray(eventData.to) ? eventData.to : [eventData.to].filter(Boolean);
    if (initialRecipients.length > 0 && !checkAllowedRecipient(initialRecipients)) {
      console.log(`[resendReceivingWebhook] E-mail para destinatário não autorizado ignorado e descartado: ${initialRecipients.join(', ')}`);
      return res.status(200).json({
        status: 'discarded',
        reason: 'recipient_not_allowed',
        recipients: initialRecipients,
      });
    }

    // Buscar o conteúdo completo (HTML, texto, anexos) via Resend API
    let fullEmail = null;
    const apiKey = RESEND_API_KEY.value();

    if (apiKey) {
      try {
        const resend = getResend(apiKey);
        if (resend?.emails?.receiving && typeof resend.emails.receiving.get === 'function') {
          const resendResult = await resend.emails.receiving.get(emailId);
          fullEmail = resendResult?.data || null;
        } else {
          const resp = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          });
          if (resp.ok) {
            fullEmail = await resp.json();
          } else {
            console.warn('[resendReceivingWebhook] API Resend retornou status:', resp.status);
          }
        }
      } catch (fetchErr) {
        console.warn('[resendReceivingWebhook] Erro ao recuperar corpo completo do e-mail:', fetchErr);
      }
    }

    if (apiKey && !fullEmail) {
      console.warn('[resendReceivingWebhook] Aviso: Não foi possível obter corpo completo via API Resend (pode ser restrição de chave ou indisponibilidade). Salvando com metadados do payload do webhook:', emailId);
    }

    const emailDoc = {
      resendId: emailId,
      from: fullEmail?.from || eventData.from || '',
      to: fullEmail?.to || (Array.isArray(eventData.to) ? eventData.to : [eventData.to].filter(Boolean)),
      cc: fullEmail?.cc || eventData.cc || [],
      bcc: fullEmail?.bcc || eventData.bcc || [],
      subject: fullEmail?.subject || eventData.subject || '(Sem assunto)',
      html: fullEmail?.html || '',
      text: fullEmail?.text || '',
      attachments: fullEmail?.attachments || eventData.attachments || [],
      raw: fullEmail?.raw || null,
      read: false,
      starred: false,
      archived: false,
      receivedAt: eventData.created_at || new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore().collection('receivedEmails').doc(emailId).set(emailDoc, { merge: true });
    console.log(`[resendReceivingWebhook] E-mail recebido salvo com sucesso: ${emailId}`);

    return res.status(200).json({ ok: true, id: emailId });
  } catch (error) {
    console.error('[resendReceivingWebhook] Falha ao processar webhook:', error);
    return res.status(500).json({ error: 'Erro interno ao processar webhook de recebimento' });
  }
});

/**
 * Helper para validar se o usuário é administrador ou funcionário ativo
 */
const isAuthorizedEmployeeOrAdmin = async (request) => {
  if (!request.auth) return false;
  const profile = await admin.firestore().doc(`userProfiles/${request.auth.uid}`).get();
  if (!profile.exists) return true;
  const data = profile.data();
  if (data.active === false) return false;
  return data.role === 'admin' || data.role === 'user' || data.role === 'funcionario';
};

const isAuthorizedForWhatsApp = async (request) => {
  if (!request.auth) return false;
  const profile = await admin.firestore().doc(`userProfiles/${request.auth.uid}`).get();
  if (!profile.exists) return true;
  const data = profile.data();
  if (data.active === false) return false;
  if (data.role === 'admin') return true;
  if (data.role === 'user') return data.permissions?.whatsapp !== false;
  return data.role === 'funcionario' && data.permissions?.whatsapp === true;
};

const parseFirestoreDate = (val) => {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (val && typeof val.toDate === 'function') return val.toDate().toISOString();
  if (val && val._seconds) return new Date(val._seconds * 1000).toISOString();
  if (val && val.seconds) return new Date(val.seconds * 1000).toISOString();
  try {
    return new Date(val).toISOString();
  } catch {
    return new Date().toISOString();
  }
};

/**
 * Projeta e sanitiza em memória um documento da coleção operacional 'orders' para a IA.
 * Minimização drástica de tokens, campos essenciais para resposta e garantia absoluta de somente-leitura.
 */
function sanitizeOrderForAi(id, data = {}) {
  const deliveryDate = data.deliveryDate || null;
  const isDeleted = Boolean(data.isDeleted || data.deletedAt);
  const status = isDeleted ? 'deleted' : (data.status || 'pending');
  const todayStr = new Date().toISOString().slice(0, 10);
  const isLate = Boolean(
    deliveryDate &&
    deliveryDate < todayStr &&
    status !== 'completed' &&
    status !== 'cancelled' &&
    !isDeleted
  );

  const totalPrice = Number(data.price || data.totalPrice || 0);
  const paidAmount = Number(
    data.payment?.paidAmount !== undefined
      ? data.payment.paidAmount
      : (data.payment?.status === 'paid' || data.paymentMethod ? totalPrice : 0)
  );
  const remainingAmount = Number(
    data.payment?.remainingAmount !== undefined
      ? data.payment.remainingAmount
      : (data.payment?.status === 'paid' ? 0 : Math.max(0, totalPrice - paidAmount))
  );

  let createdAt = null;
  if (data.createdAt) {
    if (typeof data.createdAt.toDate === 'function') {
      createdAt = data.createdAt.toDate().toISOString();
    } else if (typeof data.createdAt === 'string') {
      createdAt = data.createdAt;
    } else if (data.createdAt._seconds) {
      createdAt = new Date(data.createdAt._seconds * 1000).toISOString();
    }
  }

  const productSummary =
    data.productName ||
    (Array.isArray(data.products) ? data.products.map((p) => p.name).filter(Boolean).join(', ') : '') ||
    data.items?.[0]?.name ||
    'Produto personalizado';

  const orderNumber = data.orderNumber || '#' + (id ? id.slice(-5) : '00000');

  return {
    id,
    orderId: id,
    orderNumber,
    customerName: data.customerName || data.customer?.name || 'Cliente',
    customerPhone: data.customerPhone || data.customer?.phone || '',
    productSummary,
    quantity: Number(data.quantity || data.items?.[0]?.quantity || 1),
    totalPrice,
    paidAmount,
    remainingAmount,
    status,
    deliveryDate,
    paymentStatus: data.payment?.status || (data.paymentMethod ? 'paid' : 'pending'),
    isLate,
    currentStep: data.productionWorkflow?.currentStep || null,
    assignedTo: data.assignedTo || null,
    assignedToName: data.assignedToName || null,
    userId: data.userId || data.createdBy || null,
    createdBy: data.createdBy || data.userId || null,
    createdByName: data.createdByName || null,
    notes: data.notes || '',
    isDeleted,
    deletedAt: data.deletedAt ? (data.deletedAt.toDate ? data.deletedAt.toDate().toISOString() : data.deletedAt) : null,
    createdAt,
  };
}
/**
 * Projeta e sanitiza em memória um documento da coleção operacional 'customers' para a IA.
 * Suporta modelos novos e legados (address/street/city/state), garantindo dados limpos sem 'undefined'.
 */
function sanitizeCustomerForAi(id, data = {}) {
  const name = String(data.name || data.customerName || data.fullName || '').trim() || 'Cliente sem nome';
  const phone = String(data.phone || data.whatsapp || data.telephone || data.mobile || '').trim();
  const email = String(data.email || '').trim();
  
  // Extrai cidade e estado considerando variações de esquema
  let city = String(data.city || data.cidade || '').trim();
  let state = String(data.state || data.uf || data.estado || '').trim();
  
  if (!city && data.address && typeof data.address === 'string') {
    // Tenta extrair 'Cidade - UF' ou 'Cidade/UF' de strings de endereço legado
    const match = data.address.match(/(?:-|–|,)?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)(?:[\/\-]\s*([A-Z]{2}))?$/);
    if (match && match[1]) {
      city = match[1].trim();
      if (match[2]) state = match[2].trim();
    }
  }

  const totalOrders = Number(data.totalOrders || data.ordersCount || 0);
  const totalSpent = Number(data.totalSpent || data.spentTotal || data.totalValue || 0);
  const status = String(data.status || 'active').trim();
  const notes = String(data.notes || '').trim();
  const birthday = String(data.birthday || '').trim();
  
  let createdAt = '';
  if (data.createdAt) {
    if (typeof data.createdAt.toDate === 'function') {
      createdAt = data.createdAt.toDate().toISOString();
    } else if (typeof data.createdAt === 'string') {
      createdAt = data.createdAt;
    } else if (data.createdAt._seconds) {
      createdAt = new Date(data.createdAt._seconds * 1000).toISOString();
    }
  }

  return {
    id,
    customerId: id,
    name,
    phone,
    email,
    city,
    state,
    status,
    totalOrders,
    totalSpent,
    birthday,
    notes,
    userId: data.userId || data.createdBy || null,
    createdBy: data.createdBy || data.userId || null,
    createdByName: data.createdByName || null,
    createdAt,
  };
}


/**
 * Endpoint legado de sincronização em lote de pedidos.
 * Mantido como no-op para compatibilidade retroativa com clientes antigos.
 */
exports.syncAllOrdersToAiView = onCall(async () => {
  return {
    success: true,
    count: 0,
    message: 'A sincronização agora é nativa e em tempo real em memória.',
  };
});

// Modelo padrão ultra-rápido memoizado em memória para respostas sub-segundo
let preferredWorkingModel = 'gemini-3.8-flash';

// Cache global em memória para colaboradores/equipe (TTL de 10 minutos para evitar chamadas repetidas a Auth e Firestore)
let cachedTeamMembers = null;
let cachedTeamMembersTimestamp = 0;
const TEAM_MEMBERS_CACHE_TTL = 10 * 60 * 1000;

// Cache global em memória para catálogo e produtos (TTL de 15 minutos)
let cachedCatalogSummary = null;
let cachedCatalogTimestamp = 0;
const CATALOG_CACHE_TTL = 15 * 60 * 1000;

// Cache global em memória para respostas rápidas (TTL de 3 minutos)
const aiResponseCache = new Map();

/**
 * Normaliza strings para comparações insensíveis a maiúsculas e acentos
 */
const normalizeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Higieniza rigorosamente termos técnicos e chamadas de ferramentas na resposta
 */
function sanitizeAiResponse(text) {
  if (!text || typeof text !== 'string') return text;
  let clean = text;
  const toolTerms = [
    { pattern: /`?calculate_pricing_estimate`?/gi, replacement: 'calcular a estimativa de valores' },
    { pattern: /`?extract_order_draft`?/gi, replacement: 'montar o rascunho do pedido' },
    { pattern: /`?query_orders_view`?/gi, replacement: 'consultar a lista de pedidos' },
    { pattern: /`?query_customers`?/gi, replacement: 'pesquisar clientes' },
    { pattern: /`?generate_whatsapp_message`?/gi, replacement: 'gerar a mensagem de WhatsApp' },
    { pattern: /`?search_gallery_portfolio`?/gi, replacement: 'consultar fotos na galeria' },
    { pattern: /`?daily_briefing`?/gi, replacement: 'gerar o resumo do dia' },
    { pattern: /posso usar a ferramenta/gi, replacement: 'posso' },
    { pattern: /utilizando a ferramenta/gi, replacement: 'posso' },
  ];
  toolTerms.forEach(({ pattern, replacement }) => {
    clean = clean.replace(pattern, replacement);
  });
  return clean.trim();
}

/**
 * Sanitiza o texto gerado pela IA para remover pensamentos/raciocínios internos vazados e jargões técnicos
 */
const cleanAiOutput = (text) => {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text;

  // Remove blocos de tag <thought>...</thought> ou <reasoning>...</reasoning>
  cleaned = cleaned.replace(/<(thought|reasoning|think)>[\s\S]*?<\/\1>/gi, '');

  // Remove preâmbulos típicos de auto-raciocínio em inglês gerados por modelos "Thinking"
  cleaned = cleaned.replace(/^(The user wants to|I need to iterate|Looking at the orders|I have already called|I will present this|Based on the query|Let's check the orders)[\s\S]*?(?=(O pedido|Encontrei|Aqui est|Segue|Não encontrei|\n\n[A-ZÀ-Ú]))/i, '');

  // Higieniza nomes técnicos de ferramentas e chamadas internas para termos naturais do ateliê
  const toolLabels = {
    calculate_pricing_estimate: 'calculadora de custos e preços',
    query_orders_view: 'consulta de pedidos',
    extract_order_draft: 'rascunho do pedido',
    generate_whatsapp_message: 'mensagem para WhatsApp',
    daily_briefing: 'resumo operacional do dia',
    get_financial_summary: 'resumo financeiro',
    get_user_summary: 'resumo de métricas da equipe',
    query_customers: 'consulta de clientes',
    search_gallery_portfolio: 'acervo da galeria',
    enrichgalleryitemwithai: 'análise de imagem',
  };

  const toolNamesPattern = Object.keys(toolLabels).join('|');

  // Substitui padrões como "ferramenta calculate_pricing_estimate" ou "função query_orders_view"
  cleaned = cleaned.replace(
    new RegExp(`(?:a\\s+)?(?:ferramenta|função|funcao|endpoint|método|metodo)\\s*[\`'"]?(${toolNamesPattern})[\`'"]?`, 'gi'),
    (_m, tool) => toolLabels[tool.toLowerCase()] || 'assistente'
  );

  // Substitui nomes técnicos literais entre crases ou aspas
  cleaned = cleaned.replace(
    new RegExp(`[\`'"](${toolNamesPattern})[\`'"]`, 'gi'),
    (_m, tool) => toolLabels[tool.toLowerCase()] || 'assistente'
  );

  return sanitizeAiResponse(cleaned);
};

/**
 * Endpoint Callable Seguro do Copiloto de IA Interno
 */
// Helper para carregar e compilar resumo compacto do catálogo e acervo com cache TTL
const getDynamicCatalogKnowledge = async () => {
  if (cachedCatalogSummary && (Date.now() - cachedCatalogTimestamp < CATALOG_CACHE_TTL)) {
    return cachedCatalogSummary;
  }

  try {
    const [productsSnap, gallerySnap] = await Promise.all([
      admin.firestore().collection("storeProducts").where("active", "!=", false).limit(50).get().catch(() => ({ docs: [] })),
      admin.firestore().collection("gallery").limit(20).get().catch(() => ({ docs: [] })),
    ]);

    const lines = [];
    if (productsSnap && productsSnap.docs && productsSnap.docs.length > 0) {
      lines.push("PRODUTOS ATIVOS DO ATELIÊ:");
      productsSnap.docs.forEach((doc) => {
        const d = doc.data() || {};
        const price = d.price ? ` | R$ ${Number(d.price).toFixed(2)}` : "";
        const cat = d.category ? ` [${d.category}]` : "";
        const mat = d.materials && d.materials.length ? ` (Materiais: ${d.materials.join(", ")})` : "";
        lines.push(`• ${d.name || "Item"}${cat}${price}${mat}`);
      });
    }

    if (gallerySnap && gallerySnap.docs && gallerySnap.docs.length > 0) {
      lines.push("DESTAQUES DO ACERVO DE PROJETOS REAIS:");
      gallerySnap.docs.slice(0, 10).forEach((doc) => {
        const d = doc.data() || {};
        const title = d.title || d.theme || "Projeto";
        const papers = d.papers && d.papers.length ? ` (Papéis: ${d.papers.join(", ")})` : "";
        lines.push(`• ${title}${d.category ? " [" + d.category + "]" : ""}${papers}`);
      });
    }

    cachedCatalogSummary = lines.length > 0 ? "\n\nCONHECIMENTO DINÂMICO DO ATELIÊ (PRODUTOS & ACERVO ATUALIZADO):\n" + lines.join("\n") : "";
    cachedCatalogTimestamp = Date.now();
    return cachedCatalogSummary;
  } catch (err) {
    console.warn("[getDynamicCatalogKnowledge] Erro ao carregar catálogo para o prompt:", err);
    return "";
  }
};

exports.aiAgentChat = onCall({ cors: true, timeoutSeconds: 120, memory: '1GiB', maxInstances: 10, secrets: [GEMINI_API_KEY] }, async (request) => {
  if (!(await isAuthorizedEmployeeOrAdmin(request))) {
    throw new functions.https.HttpsError('permission-denied', 'Acesso restrito a membros autorizados da equipe.');
  }

  try {
    await aiAgentLimiter.consume(request.auth.uid);
  } catch {
    throw new functions.https.HttpsError('resource-exhausted', 'Muitas requisições. Aguarde um momento antes de enviar nova mensagem.');
  }

  const callerUid = request.auth.uid;
  const callerProfileDoc = await admin.firestore().doc(`userProfiles/${callerUid}`).get();
  const callerProfile = callerProfileDoc.exists ? callerProfileDoc.data() : { role: 'user', active: true };
  if (callerProfile.active === false) {
    throw new functions.https.HttpsError('permission-denied', 'Conta de usuário desativada.');
  }
  const isAdmin = callerProfile.role === 'admin';

  // Helper central de busca e blindagem estrita de pedidos em tempo real (projeção sanitizada em memória)
  const fetchScopedOrders = async () => {
    let docs = [];
    if (isAdmin) {
      // Administrador: lê pedidos ativos diretamente de 'orders' com limite enxuto (200 mais recentes)
      const snap = await admin
        .firestore()
        .collection('orders')
        .where('deletedAt', '==', null)
        .limit(200)
        .get();

      docs = snap.docs.map((d) => sanitizeOrderForAi(d.id, d.data()));
    } else {
      // Funcionário / Usuário: lê estritamente pedidos onde userId == callerUid ou assignedTo == callerUid
      const [userOrdersSnap, assignedOrdersSnap, createdOrdersSnap] = await Promise.all([
        admin.firestore().collection('orders').where('userId', '==', callerUid).where('deletedAt', '==', null).limit(200).get(),
        admin.firestore().collection('orders').where('assignedTo', '==', callerUid).where('deletedAt', '==', null).limit(200).get(),
        admin.firestore().collection('orders').where('createdBy', '==', callerUid).where('deletedAt', '==', null).limit(200).get(),
      ]);

      const map = new Map();
      userOrdersSnap.docs.forEach((d) => map.set(d.id, sanitizeOrderForAi(d.id, d.data())));
      assignedOrdersSnap.docs.forEach((d) => map.set(d.id, sanitizeOrderForAi(d.id, d.data())));
      createdOrdersSnap.docs.forEach((d) => map.set(d.id, sanitizeOrderForAi(d.id, d.data())));

      // BLINDAGEM INFALÍVEL: Filtra exclusivamente pedidos pertencentes a callerUid
      const uid = String(callerUid);
      docs = Array.from(map.values()).filter((d) => {
        if (d.deletedAt || d.isDeleted) return false;
        return d.userId === uid || d.assignedTo === uid || d.createdBy === uid;
      });
    }

    // Ordenação do mais recente para o mais antigo em memória
    docs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return docs;
  };

  // Helper para obter diretório consolidado de todos os colaboradores do sistema (com cache de memória de 10 min)
  const getAllKnownTeamMembers = async () => {
    if (cachedTeamMembers && (Date.now() - cachedTeamMembersTimestamp < TEAM_MEMBERS_CACHE_TTL)) {
      return cachedTeamMembers;
    }

    const memberMap = new Map();

    // 1. userProfiles
    try {
      const snap = await admin.firestore().collection('userProfiles').get();
      snap.docs.forEach((d) => {
        const data = d.data() || {};
        const uid = d.id;
        const displayName = data.displayName || (data.email ? data.email.split('@')[0] : 'Usuário');
        const email = data.email || '';
        const role = data.role || 'user';
        const active = data.active !== false;
        memberMap.set(uid, {
          uid,
          displayName,
          email,
          role,
          active,
          names: [displayName, email ? email.split('@')[0] : ''].filter(Boolean),
        });
      });
    } catch (err) {
      console.warn('[getAllKnownTeamMembers] Erro ao ler userProfiles:', err);
    }

    // 2. Firebase Auth (garante contas criadas que ainda não têm doc em userProfiles)
    try {
      const authList = await admin.auth().listUsers(100);
      authList.users.forEach((u) => {
        if (!memberMap.has(u.uid)) {
          const displayName = u.displayName || (u.email ? u.email.split('@')[0] : 'Usuário');
          const email = u.email || '';
          memberMap.set(u.uid, {
            uid: u.uid,
            displayName,
            email,
            role: 'user',
            active: !u.disabled,
            names: [displayName, email ? email.split('@')[0] : ''].filter(Boolean),
          });
        }
      });
    } catch (err) {
      console.warn('[getAllKnownTeamMembers] Erro ao listar Auth users:', err);
    }

    // 3. Orders (coleta criadores e responsáveis atribuídos)
    try {
      const ordersSnap = await admin.firestore().collection('orders').limit(200).get();
      ordersSnap.docs.forEach((d) => {
        const data = d.data() || {};
        if (data.userId && !memberMap.has(data.userId)) {
          const name = data.createdByName || 'Colaborador';
          memberMap.set(data.userId, {
            uid: data.userId,
            displayName: name,
            email: '',
            role: 'user',
            active: true,
            names: [name],
          });
        }
        if (data.assignedTo && !memberMap.has(data.assignedTo)) {
          const name = data.assignedToName || 'Colaborador';
          memberMap.set(data.assignedTo, {
            uid: data.assignedTo,
            displayName: name,
            email: '',
            role: 'funcionario',
            active: true,
            names: [name],
          });
        }
      });
    } catch (err) {
      console.warn('[getAllKnownTeamMembers] Erro ao ler orders para membros:', err);
    }

    const result = Array.from(memberMap.values());
    cachedTeamMembers = result;
    cachedTeamMembersTimestamp = Date.now();
    return result;
  };

  // Helper para resolver colaborador/usuário por nome, email ou UID com tolerância e normalização
  const resolveTargetUser = async (identifier) => {
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) return null;
    const clean = normalizeString(identifier);
    const members = await getAllKnownTeamMembers();

    // 1. Busca exata por UID
    let match = members.find((m) => normalizeString(m.uid) === clean);
    if (match) return match;

    // 2. Busca exata por email
    match = members.find((m) => m.email && normalizeString(m.email) === clean);
    if (match) return match;

    // 3. Busca exata por displayName
    match = members.find((m) => normalizeString(m.displayName) === clean);
    if (match) return match;

    // 4. Busca por primeiro nome (ex: "amanda" em "Amanda Silva")
    match = members.find((m) => {
      const firstName = normalizeString(m.displayName).split(' ')[0];
      return firstName === clean;
    });
    if (match) return match;

    // 5. Busca por inclusão mútua
    match = members.find((m) => {
      const d = normalizeString(m.displayName);
      const e = normalizeString(m.email);
      return (d && (d.includes(clean) || clean.includes(d))) || (e && e.includes(clean));
    });
    if (match) return match;

    // 6. Busca nos nomes/aliases
    match = members.find((m) =>
      m.names && m.names.some((n) => {
        const norm = normalizeString(n);
        return norm.includes(clean) || clean.includes(norm);
      })
    );
    if (match) return match;

    return null;
  };




  // Guardrail de Permissão do Copiloto de IA:
  if (callerProfile.role === 'funcionario' && callerProfile.permissions?.aiCopilot !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Seu perfil de funcionário não possui permissão para acessar o Copiloto de IA.');
  }
  if (callerProfile.role === 'user' && callerProfile.permissions?.aiCopilot === false) {
    throw new functions.https.HttpsError('permission-denied', 'Seu perfil de usuário não possui permissão para acessar o Copiloto de IA.');
  }

  const { message, history = [], image = null } = request.data || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Mensagem é obrigatória.');
  }

  const cleanMessage = message.trim();
  const hasImage = Boolean(image && (image.base64 || image.imageUrl));
  const trimmedLower = cleanMessage.toLowerCase().trim();

  // COMANDO DE CACHE NATIVO DO COPILOTO (Resposta ultra-rápida, zero custo de tokens)
  if (
    trimmedLower === 'cache' ||
    trimmedLower === '/cache' ||
    trimmedLower === 'menu cache' ||
    trimmedLower === 'cache menu' ||
    trimmedLower === 'ajuda cache' ||
    trimmedLower === 'limpar cache' ||
    trimmedLower === 'comandos cache'
  ) {
    return {
      success: true,
      reply: `⚡ **Gerenciamento de Cache do Copiloto Luisices**

Você pode consultar ou limpar itens da memória a qualquer momento digitando o comando no chat:

• 🧹 **\`cache limpar respostas\`** — Esvazia o cache em memória de respostas instantâneas.
• 📦 **\`cache limpar catalogo\`** — Força a atualização do catálogo de produtos e preços do Firestore.
• 👥 **\`cache limpar equipe\`** — Recarrega permissões, nomes e contas dos colaboradores.
• 🔄 **\`cache limpar tudo\`** — Reseta todos os caches em memória do Copiloto de uma só vez.

💡 *Dica: Envie qualquer um dos comandos acima para executar a limpeza imediatamente.*`,
    };
  }

  if (
    trimmedLower.startsWith('cache limpar') ||
    trimmedLower.startsWith('/cache limpar') ||
    trimmedLower === 'limpar todo o cache' ||
    trimmedLower === 'limpar cache tudo'
  ) {
    let clearedWhat = [];
    if (trimmedLower.includes('respostas') || trimmedLower.includes('resposta')) {
      aiResponseCache.clear();
      clearedWhat.push('Respostas Rápidas');
    } else if (trimmedLower.includes('catalogo') || trimmedLower.includes('catálogo') || trimmedLower.includes('produtos') || trimmedLower.includes('precos') || trimmedLower.includes('preços')) {
      cachedCatalogSummary = null;
      cachedCatalogTimestamp = 0;
      clearedWhat.push('Catálogo & Produtos');
    } else if (trimmedLower.includes('equipe') || trimmedLower.includes('usuarios') || trimmedLower.includes('usuários') || trimmedLower.includes('colaboradores')) {
      cachedTeamMembers = null;
      cachedTeamMembersTimestamp = 0;
      clearedWhat.push('Equipe & Colaboradores');
    } else {
      aiResponseCache.clear();
      cachedCatalogSummary = null;
      cachedCatalogTimestamp = 0;
      cachedTeamMembers = null;
      cachedTeamMembersTimestamp = 0;
      clearedWhat.push('Todos os Caches (Respostas, Catálogo e Equipe)');
    }

    return {
      success: true,
      reply: `✅ **Cache limpo com sucesso!**

• **Itens atualizados:** ${clearedWhat.join(', ')}
• **Status:** Sincronizado diretamente com os dados em tempo real do banco de dados.`,
    };
  }

  // GUARDRAIL ULTRA-RÁPIDO DE RBAC: Bloqueia não-admin de bisbilhotar outros colaboradores
  if (!isAdmin) {
    const isAuditOrCollabQuery = /(pedido|pedidos|venda|vendas|cliente|clientes|faturamento|orcamento|orçamento|trabalho|fazendo|producao|produção|atendimento|ticket)/i.test(trimmedLower);
    if (isAuditOrCollabQuery) {
      const allMembers = await getAllKnownTeamMembers();
      const otherMembers = allMembers.filter((m) => m.uid !== String(callerUid));
      const targetFound = otherMembers.find((m) => {
        const normMsg = normalizeString(trimmedLower);
        const normName = normalizeString(m.displayName);
        const normFirst = normName.split(' ')[0];
        const normEmail = normalizeString(m.email ? m.email.split('@')[0] : '');
        return (
          (normName && normName.length >= 3 && normMsg.includes(normName)) ||
          (normFirst && normFirst.length >= 3 && normMsg.split(/\s+/).includes(normFirst)) ||
          (normEmail && normEmail.length >= 3 && normMsg.includes(normEmail))
        );
      });

      if (targetFound) {
        console.log(`[aiAgentChat] Guardrail RBAC rápido ativado para ${callerUid} consultando ${targetFound.displayName}`);
        return {
          success: true,
          reply: `🔒 **Acesso Restrito:**

Você possui permissão para consultar exclusivamente os **seus próprios pedidos e atendimentos**.

A auditoria e visualização de dados do colaborador **${targetFound.displayName}** é restrita a **Administradores** do sistema.`,
        };
      }
    }
  }

  const cacheKey = `${callerUid}_${cleanMessage.toLowerCase()}`;

  // Se for uma pergunta comum sem histórico, sem imagem e estiver no cache recente, responde instantaneamente
  if ((!history || history.length === 0) && !hasImage && aiResponseCache.has(cacheKey)) {
    const cached = aiResponseCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 180000) { // 3 minutos
      console.log('[aiAgentChat] Resposta retornada via cache em memória (instantânea).');
      return { success: true, reply: cached.reply, orderDraft: cached.orderDraft };
    }
  }

  const rawKey = (typeof GEMINI_API_KEY.value === 'function' ? GEMINI_API_KEY.value() : process.env.GEMINI_API_KEY) || '';
  const apiKey = String(rawKey).trim();
  if (!apiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Chave GEMINI_API_KEY não configurada no Firebase Secret Manager.');
  }

  const catalogContext = await getDynamicCatalogKnowledge();
  const systemInstruction = `Você é o Copiloto Especialista da Luisices (ateliê de Papelaria Personalizada, Cartonagem, Encadernação, Scrap Festa, Topos de Bolo, Caixas Luxo, Sublimação e Brindes). Assistente ágil da equipe operacional e administrativa.

RESPONSABILIDADES & FERRAMENTAS:
1. 'query_orders_view': Consultar pedidos (status, prazos, clientes, valores, cancelados/excluídos).
2. 'get_user_summary': Auditoria de colaborador (pedidos, faturamento, ticket médio). EXCLUSIVO ADMIN.
3. 'get_financial_summary': Métricas financeiras (faturamento, recebido, a receber, volume, ticket médio).
4. 'daily_briefing': Raio-X diário de produção, atrasos e entregas de hoje.
5. 'query_customers': Busca cadastral pura de clientes. NUNCA usar para cobrança/WhatsApp.
6. 'generate_whatsapp_message': OBRIGATÓRIO para cobranças e mensagens a clientes (abre <WhatsAppComposer />).
7. 'calculate_pricing_estimate': Custos, margens de lucro e preços sugeridos de itens personalizados.
8. 'extract_order_draft': Estruturar rascunhos de pedidos a partir de conversas.
9. 'search_gallery_portfolio': Consultar referências e fotos do acervo.

GUARDRAILS:
• LGPD & RBAC: Dados de outros colaboradores são sigilosos (restrito a Admin). Usuários comuns só acessam seus próprios registros.
• Human-in-the-Loop: Rascunhos de mensagens e orçamentos sempre exigem aprovação humana.
• Cobrança WhatsApp: Sempre cordial. Use 'generate_whatsapp_message' (type='cobranca'). Não consulte antes com 'query_customers'.
• Comunicação: pt-BR direto e acolhedor. Sem jargões técnicos ou nomes de funções. Respostas em tópicos curtos para celular.
• Precisão: Se algo não for encontrado, informe com clareza. Não invente dados.
• Imagens: Faça análise visual direta. Só pesquise o acervo se solicitado expressamente.

MATERIAIS & PRECIFICAÇÃO:
• Papéis: Offset (75-90g miolos; 180-240g caixas), Color Plus 180g (scrap/sem vinco branco), Fotográfico 115-230g, Lamicote 250g (luxo).
• Cartonagem: Papelão Horlle 1.9-2.2mm, BOPP (Fosco/Brilho/Holo/Soft Touch), Wire-o 2:1 (>110 fls) e 3:1 (<=110 fls).
• Margens: Mão de obra R$ 24-36/h (R$ 0,40-0,60/min), perda técnica 15%, margem de lucro 30% a 50% (artesanal 40-60%).`;

  const toolsDeclaration = [
    {
      function_declarations: [
        {
          name: 'get_user_summary',
          description: 'Auditoria de colaborador (pedidos, clientes, faturamento, ticket médio). EXCLUSIVO ADMIN.',
          parameters: {
            type: 'OBJECT',
            properties: {
              userIdentifier: { type: 'STRING', description: 'Nome, e-mail ou UID do colaborador' },
              period: { type: 'STRING', enum: ['today', 'week', 'month', 'year', 'all'], description: 'Período (padrão: all)' }
            },
            required: ['userIdentifier']
          }
        },
        {
          name: 'query_orders_view',
          description: 'Consulta pedidos em tempo real por status, pagamento, busca de texto ou colaborador.',
          parameters: {
            type: 'OBJECT',
            properties: {
              status: { type: 'STRING', enum: ['open', 'pending', 'in-progress', 'completed', 'cancelled', 'deleted', 'all'], description: 'Status do pedido' },
              paymentStatus: { type: 'STRING', enum: ['pending', 'partial', 'paid', 'all'], description: 'Status pagamento' },
              userIdentifier: { type: 'STRING', description: 'Admin apenas: filtrar por colaborador' },
              searchTerm: { type: 'STRING', description: 'Busca cliente, produto ou fone' },
              limit: { type: 'INTEGER', description: 'Máx registros (máx 30)' }
            }
          }
        },
        {
          name: 'get_financial_summary',
          description: 'Resumo financeiro oficial (faturamento realizado, recebido, pendente, volume, ticket médio) por período.',
          parameters: {
            type: 'OBJECT',
            properties: {
              period: { type: 'STRING', enum: ['today', 'week', 'month', 'year', 'all'], description: 'Período: today, week, month, year, all' },
              userIdentifier: { type: 'STRING', description: 'Admin apenas: filtrar por colaborador' }
            }
          }
        },
        {
          name: 'daily_briefing',
          description: 'Briefing diário: pedidos atrasados, entregas de hoje, em produção e pendências financeiras.',
          parameters: {
            type: 'OBJECT',
            properties: {}
          }
        },
        {
          name: 'generate_whatsapp_message',
          description: 'Gera mensagem formatada e abre o WhatsAppComposer no chat. OBRIGATÓRIO para cobrança e WhatsApp.',
          parameters: {
            type: 'OBJECT',
            properties: {
              type: { type: 'STRING', enum: ['cobranca', 'status_producao', 'pronto_retirada', 'confirmacao_pedido', 'orcamento', 'geral'], description: 'Tipo mensagem' },
              recipientName: { type: 'STRING', description: 'Nome cliente' },
              recipientPhone: { type: 'STRING', description: 'Telefone WhatsApp' },
              orderNumber: { type: 'STRING', description: 'Nº do pedido' },
              productName: { type: 'STRING', description: 'Produto/serviço' },
              amount: { type: 'NUMBER', description: 'Valor R$' },
              messageText: { type: 'STRING', description: 'Texto completo formatado com emojis' }
            },
            required: ['type', 'messageText']
          }
        },
        {
          name: 'calculate_pricing_estimate',
          description: 'Calcula custos e preço de venda com margem protegida para produtos personalizados.',
          parameters: {
            type: 'OBJECT',
            properties: {
              productName: { type: 'STRING', description: 'Nome do produto' },
              quantity: { type: 'INTEGER', description: 'Quantidade de peças' },
              unitCostRaw: { type: 'NUMBER', description: 'Custo matéria-prima unitária R$' },
              customizationCost: { type: 'NUMBER', description: 'Custo insumos/personalização R$' },
              laborTimeMinutes: { type: 'NUMBER', description: 'Tempo de trabalho em min/peça' },
              profitMarginPercent: { type: 'NUMBER', description: 'Margem % (mín 30%, padrão 45%)' }
            },
            required: ['productName', 'quantity']
          }
        },
        {
          name: 'query_customers',
          description: 'Consulta cadastral de clientes (total, busca por nome, fone, e-mail, cidade). NÃO usar para cobrança.',
          parameters: {
            type: 'OBJECT',
            properties: {
              searchTerm: { type: 'STRING', description: 'Busca nome, fone, e-mail ou cidade' },
              userIdentifier: { type: 'STRING', description: 'Admin apenas: filtrar por colaborador' },
              status: { type: 'STRING', description: 'Status (active, vip, recurring, defaulter, partner)' },
              limit: { type: 'INTEGER', description: 'Qtd máx (padrão 15, máx 30)' }
            }
          }
        },
        {
          name: 'extract_order_draft',
          description: 'Extrai dados estruturados de pedido de mensagem/conversa para pré-preenchimento.',
          parameters: {
            type: 'OBJECT',
            properties: {
              customerName: { type: 'STRING', description: 'Nome do cliente' },
              customerPhone: { type: 'STRING', description: 'Telefone' },
              productName: { type: 'STRING', description: 'Produto e especificações' },
              quantity: { type: 'INTEGER', description: 'Quantidade' },
              totalPrice: { type: 'NUMBER', description: 'Valor total R$' },
              deliveryDate: { type: 'STRING', description: 'Data YYYY-MM-DD' },
              notes: { type: 'STRING', description: 'Detalhes/observações' },
              paymentMethod: { type: 'STRING', enum: ['pix', 'cash', 'credit', 'debit', 'other'] }
            },
            required: ['customerName', 'productName']
          }
        },
        {
          name: 'search_gallery_portfolio',
          description: 'Busca fotos, referências e artes na Galeria. Apenas se solicitado explicitamente.',
          parameters: {
            type: 'OBJECT',
            properties: {
              searchTerm: { type: 'STRING', description: 'Busca por título, tema, técnica ou produto' },
              tag: { type: 'STRING', description: 'Tag/categoria' },
              userIdentifier: { type: 'STRING', description: 'Admin apenas: filtrar por colaborador' },
              limit: { type: 'INTEGER', description: 'Qtd máx (padrão 10, máx 20)' }
            }
          }
        }
      ]
    }
  ];

  // Helper para auditoria e métricas de usuário/colaborador (EXCLUSIVO ADMIN)
  const executeUserSummary = async (args = {}) => {
    if (!isAdmin) {
      return {
        authorized: false,
        message: 'Acesso restrito: A consulta de métricas e dados de outros colaboradores é permitida exclusivamente para administradores do sistema.',
      };
    }

    const members = await getAllKnownTeamMembers();

    if (!args.userIdentifier || args.userIdentifier.toLowerCase() === 'todos' || args.userIdentifier.toLowerCase() === 'listar') {
      return {
        authorized: true,
        isList: true,
        members: members.map((m) => ({
          name: m.displayName,
          email: m.email,
          role: m.role === 'admin' ? 'Administrador' : m.role === 'funcionario' ? 'Funcionário' : 'Usuário',
          uid: m.uid,
        })),
      };
    }

    const targetUser = await resolveTargetUser(args.userIdentifier);
    if (!targetUser) {
      return {
        authorized: true,
        found: false,
        userIdentifier: args.userIdentifier,
        availableMembers: members.map((m) => m.displayName || m.email).filter(Boolean),
        message: `Não foi encontrado nenhum usuário ou colaborador no sistema correspondente a "${args.userIdentifier}".`,
      };
    }

    const targetUid = String(targetUser.uid);
    const targetName = targetUser.displayName || targetUser.email || 'Usuário';
    const targetRole = targetUser.role === 'admin' ? 'Administrador' : targetUser.role === 'funcionario' ? 'Funcionário' : 'Usuário';
    const normalizedTargetName = normalizeString(targetName);

    // 1. Busca todos os pedidos do usuário diretamente da coleção orders com projeção sanitizada em memória
    const allOrders = await fetchScopedOrders();
    const userOrders = allOrders.filter((o) => {
      if (o.isDeleted) return false;
      const matchUid = o.userId === targetUid || o.createdBy === targetUid || o.assignedTo === targetUid;
      const matchCreator = o.createdByName && normalizeString(o.createdByName).includes(normalizedTargetName);
      const matchAssignee = o.assignedToName && normalizeString(o.assignedToName).includes(normalizedTargetName);
      return matchUid || matchCreator || matchAssignee;
    });

    // 2. Busca todos os clientes do usuário
    const allCustSnap = await admin.firestore().collection('customers').get();
    const userCustomers = allCustSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => {
        const matchUid = c.userId === targetUid || c.createdBy === targetUid;
        const matchCreator = c.createdByName && normalizeString(c.createdByName).includes(normalizedTargetName);
        return matchUid || matchCreator;
      });

    // 3. Métricas dos pedidos
    const completedOrders = userOrders.filter((o) => o.status === 'completed');
    const inProgressOrders = userOrders.filter((o) => o.status === 'in-progress');
    const pendingOrders = userOrders.filter((o) => o.status === 'pending');
    const cancelledOrders = userOrders.filter((o) => o.status === 'cancelled');
    const validOrders = userOrders.filter((o) => o.status !== 'cancelled');

    const realizedRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
    const totalReceived = validOrders.reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);
    const pendingReceivables = validOrders
      .filter((o) => o.paymentStatus !== 'paid')
      .reduce((sum, o) => sum + (Number(o.remainingAmount !== undefined ? o.remainingAmount : o.totalPrice) || 0), 0);

    const averageTicket =
      completedOrders.length > 0
        ? realizedRevenue / completedOrders.length
        : validOrders.length > 0
        ? validOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0) / validOrders.length
        : 0;

    return {
      authorized: true,
      found: true,
      user: {
        uid: targetUid,
        name: targetName,
        email: targetUser.email || '',
        role: targetRole,
        active: targetUser.active !== false,
      },
      metrics: {
        totalCustomers: userCustomers.length,
        recentCustomers: userCustomers.slice(0, 5).map((c) => c.name || 'Sem nome'),
        totalOrders: userOrders.length,
        totalValidOrders: validOrders.length,
        completedOrders: completedOrders.length,
        inProgressOrders: inProgressOrders.length,
        pendingOrders: pendingOrders.length,
        cancelledOrders: cancelledOrders.length,
        realizedRevenue: Number(realizedRevenue.toFixed(2)),
        totalReceived: Number(totalReceived.toFixed(2)),
        pendingReceivables: Number(pendingReceivables.toFixed(2)),
        averageTicket: Number(averageTicket.toFixed(2)),
      },
    };
  };

  // Helper para consultar a base de pedidos com filtros e isolamento
  const executeQueryOrdersView = async (args = {}) => {
    // 0. BLINDAGEM MULTIUSUÁRIO & RBAC ESTREITA:
    if (!isAdmin) {
      if (args.userIdentifier) {
        const target = await resolveTargetUser(args.userIdentifier);
        if (target && target.uid !== String(callerUid)) {
          return {
            unauthorized: true,
            message: `🔒 **Acesso Restrito:**

Você possui permissão para consultar exclusivamente os **seus próprios pedidos e atendimentos**. A visualização de pedidos de outros colaboradores (${target.displayName || args.userIdentifier}) é restrita a **Administradores** do sistema.`,
          };
        }
      }
      if (args.searchTerm && typeof args.searchTerm === 'string') {
        const target = await resolveTargetUser(args.searchTerm);
        if (target && target.uid !== String(callerUid)) {
          return {
            unauthorized: true,
            message: `🔒 **Acesso Restrito:**

Você possui permissão para consultar exclusivamente os **seus próprios pedidos e atendimentos**. A consulta de dados de **${target.displayName || args.searchTerm}** é restrita a **Administradores** do sistema.`,
          };
        }
      }
    }

    let docs = await fetchScopedOrders();

    // 0. Filtro por usuário específico (Apenas Admin)
    if (isAdmin && args.userIdentifier) {
      const targetUser = await resolveTargetUser(args.userIdentifier);
      if (targetUser) {
        const uid = String(targetUser.uid);
        docs = docs.filter((d) => d.userId === uid || d.createdBy === uid);
      }
    }

    // 1. Ordena os pedidos do mais recente para o mais antigo
    docs.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    // 2. Aplica filtros de status com precisão
    if (args.status && args.status !== 'all') {
      if (args.status === 'deleted') {
        docs = docs.filter((d) => d.isDeleted || d.status === 'deleted');
      } else if (args.status === 'open') {
        // Pedidos em aberto = pendentes ou em produção (não concluídos, não cancelados e não excluídos)
        docs = docs.filter((d) => (d.status === 'pending' || d.status === 'in-progress') && !d.isDeleted);
      } else {
        docs = docs.filter((d) => d.status === args.status && !d.isDeleted);
      }
    } else if (!args.status || (args.status !== 'deleted' && args.status !== 'all')) {
      // Por padrão, oculta pedidos excluídos caso não seja solicitado
      docs = docs.filter((d) => !d.isDeleted && d.status !== 'deleted');
    }

    // 3. Filtro de status de pagamento
    if (args.paymentStatus && args.paymentStatus !== 'all') {
      docs = docs.filter((d) => d.paymentStatus === args.paymentStatus);
    }

    // 4. Busca por termos no cliente, produto, telefone, número do pedido ou observações
    if (args.searchTerm && typeof args.searchTerm === 'string') {
      const term = args.searchTerm.toLowerCase().trim();
      docs = docs.filter(
        (d) =>
          (d.customerName && d.customerName.toLowerCase().includes(term)) ||
          (d.productSummary && d.productSummary.toLowerCase().includes(term)) ||
          (d.customerPhone && d.customerPhone.includes(term)) ||
          (d.orderNumber && d.orderNumber.toLowerCase().includes(term)) ||
          (d.notes && d.notes.toLowerCase().includes(term))
      );
    }

    const maxLimit = Math.min(Math.max(Number(args.limit) || 30, 1), 50);
    return docs.slice(0, maxLimit);
  };

  // Helper para cálculo financeiro exato alinhado com Reports.tsx
  const executeFinancialSummary = async (args = {}) => {
    let rawOrders = await fetchScopedOrders();
    if (isAdmin && args.userIdentifier) {
      const targetUser = await resolveTargetUser(args.userIdentifier);
      if (targetUser) {
        const uid = String(targetUser.uid);
        rawOrders = rawOrders.filter((d) => d.userId === uid || d.createdBy === uid);
      }
    }

    const now = new Date();
    const period = args.period || 'month';

    let startDate = new Date(2000, 0, 1);
    let endDate = new Date(2100, 0, 1);

    if (period === 'today') {
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (period === 'month') {
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
      endDate = now;
    } else if (period === 'year') {
      startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0));
      endDate = now;
    }

    const filtered = rawOrders.filter((o) => {
      if (o.isDeleted) return false;
      if (period === 'all') return true;
      const orderDate = new Date(o.createdAt || o.deliveryDate || now);
      return orderDate >= startDate && orderDate <= endDate;
    });

    const validOrders = filtered.filter((o) => o.status !== 'cancelled');
    const completedOrders = filtered.filter((o) => o.status === 'completed');
    const inProgressOrders = filtered.filter((o) => o.status === 'in-progress');
    const pendingOrders = filtered.filter((o) => o.status === 'pending');
    const cancelledOrders = filtered.filter((o) => o.status === 'cancelled');

    // Faturamento Realizado: soma apenas de pedidos Concluídos
    const realizedRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);

    // Volume Total Emitido: soma de todos os pedidos válidos (não cancelados)
    const grossIssuedVolume = validOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);

    // Total já recebido (sinais e pagamentos integrais)
    const totalReceived = validOrders.reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);

    // Saldo pendente a receber (remainingAmount real)
    const pendingReceivables = validOrders
      .filter((o) => o.paymentStatus !== 'paid')
      .reduce((sum, o) => sum + (Number(o.remainingAmount !== undefined ? o.remainingAmount : o.totalPrice) || 0), 0);

    // Ticket Médio
    const averageTicket =
      completedOrders.length > 0
        ? realizedRevenue / completedOrders.length
        : validOrders.length > 0
        ? grossIssuedVolume / validOrders.length
        : 0;

    const conversionRate = validOrders.length > 0 ? (completedOrders.length / validOrders.length) * 100 : 0;

    return {
      period,
      faturamentoRealizado: Number(realizedRevenue.toFixed(2)),
      volumeTotalEmitido: Number(grossIssuedVolume.toFixed(2)),
      totalRecebido: Number(totalReceived.toFixed(2)),
      totalPendenteReceber: Number(pendingReceivables.toFixed(2)),
      ticketMedio: Number(averageTicket.toFixed(2)),
      taxaConversao: Number(conversionRate.toFixed(1)),
      pedidosConcluidos: completedOrders.length,
      pedidosEmProducao: inProgressOrders.length,
      pedidosPendentes: pendingOrders.length,
      pedidosCancelados: cancelledOrders.length,
      totalPedidosValidos: validOrders.length,
    };
  };

  // Helper para gerar o Daily Briefing com isolamento por usuário e cálculo financeiro alinhado
  const executeDailyBriefing = async () => {
    const orders = (await fetchScopedOrders()).filter((o) => !o.isDeleted);
    const todayDate = new Date().toISOString().split('T')[0];

    const delayedOrders = orders.filter(
      (o) =>
        o.deliveryDate &&
        o.deliveryDate < todayDate &&
        o.status !== 'completed' &&
        o.status !== 'cancelled'
    );
    const todayDeliveries = orders.filter((o) => o.deliveryDate === todayDate && o.status !== 'cancelled');
    const inProgressOrders = orders.filter((o) => o.status === 'in-progress');
    const completedOrders = orders.filter((o) => o.status === 'completed');
    const validOrders = orders.filter((o) => o.status !== 'cancelled');

    const pendingPaymentOrders = validOrders.filter((o) => o.paymentStatus !== 'paid');
    const pendingPaymentTotal = pendingPaymentOrders.reduce(
      (acc, curr) => acc + (Number(curr.remainingAmount !== undefined ? curr.remainingAmount : curr.totalPrice) || 0),
      0
    );
    const realizedRevenue = completedOrders.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);
    const totalReceived = validOrders.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);

    return {
      todayDate,
      delayedCount: delayedOrders.length,
      delayedOrders: delayedOrders.slice(0, 5),
      todayDeliveriesCount: todayDeliveries.length,
      todayDeliveries: todayDeliveries.slice(0, 5),
      inProgressCount: inProgressOrders.length,
      completedCount: completedOrders.length,
      realizedRevenue,
      totalReceived,
      pendingPaymentCount: pendingPaymentOrders.length,
      pendingPaymentTotal,
    };
  };

  // Helper para consultar a base de clientes cadastrados com isolamento estrito e contagem real
  const executeQueryCustomers = async (args = {}) => {
    try {
      let snap;
      if (isAdmin) {
        // Administrador: busca na coleção com limite ampliado para cobrir toda a carteira ativa
        snap = await admin.firestore().collection('customers').limit(500).get();
      } else {
        const [userSnap, createdSnap] = await Promise.all([
          admin.firestore().collection('customers').where('userId', '==', callerUid).limit(500).get(),
          admin.firestore().collection('customers').where('createdBy', '==', callerUid).limit(500).get(),
        ]);
        const map = new Map();
        userSnap.docs.forEach((d) => map.set(d.id, d));
        createdSnap.docs.forEach((d) => map.set(d.id, d));
        snap = { docs: Array.from(map.values()) };
      }

      let customers = snap.docs.map((d) => sanitizeCustomerForAi(d.id, d.data()));

      // Blindagem estrita de clientes para não-admins
      if (!isAdmin) {
        const uid = String(callerUid);
        customers = customers.filter((c) => c.userId === uid || c.createdBy === uid);
      } else if (isAdmin && args.userIdentifier) {
        const targetUser = await resolveTargetUser(args.userIdentifier);
        if (targetUser) {
          const uid = String(targetUser.uid);
          customers = customers.filter((c) => c.userId === uid || c.createdBy === uid);
        }
      }

      const totalScoped = customers.length;

      // Filtro por status (active, vip, recurring, defaulter, partner)
      if (args.status && typeof args.status === 'string' && args.status.toLowerCase() !== 'all') {
        const targetStatus = args.status.toLowerCase().trim();
        customers = customers.filter((c) => c.status.toLowerCase() === targetStatus);
      }

      // Filtro por termo de busca (nome, telefone, email, cidade ou notas)
      const hasSearchTerm = Boolean(args.searchTerm && typeof args.searchTerm === 'string' && args.searchTerm.trim());
      if (hasSearchTerm) {
        const rawTerm = args.searchTerm.trim();
        const term = normalizeString(rawTerm);
        const digitsTerm = rawTerm.replace(/\D/g, '');
        customers = customers.filter((c) => {
          const normName = normalizeString(c.name);
          const normEmail = normalizeString(c.email);
          const normCity = normalizeString(c.city);
          const cleanPhone = (c.phone || '').replace(/\D/g, '');
          const matchText = normName.includes(term) || normEmail.includes(term) || normCity.includes(term);
          const matchPhone = digitsTerm ? cleanPhone.includes(digitsTerm) : false;
          return matchText || matchPhone;
        });
      }

      // Ordenação inteligente:
      // Se não há busca por termo específico, prioriza clientes com histórico de compras ou mais recentes
      if (!hasSearchTerm) {
        customers.sort((a, b) => {
          if (b.totalSpent !== a.totalSpent) {
            return b.totalSpent - a.totalSpent;
          }
          if (b.totalOrders !== a.totalOrders) {
            return b.totalOrders - a.totalOrders;
          }
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
      }

      const totalFiltered = customers.length;
      const maxLimit = Math.min(Math.max(Number(args.limit) || (hasSearchTerm ? 15 : 10), 1), 30);
      const displayedCustomers = customers.slice(0, maxLimit);

      return {
        totalScoped,
        totalFiltered,
        isFiltered: hasSearchTerm || Boolean(args.status),
        searchTerm: args.searchTerm || null,
        customers: displayedCustomers,
        hasMore: totalFiltered > maxLimit,
        // Compatibilidade de array para chamadas diretas como resolveCustomerPhone
        map: (fn) => displayedCustomers.map(fn),
        forEach: (fn) => displayedCustomers.forEach(fn),
        slice: (start, end) => displayedCustomers.slice(start, end),
        length: displayedCustomers.length,
        [Symbol.iterator]: function* () {
          yield* displayedCustomers;
        },
      };
    } catch (err) {
      console.error('[executeQueryCustomers] Erro:', err);
      const emptyResult = {
        totalScoped: 0,
        totalFiltered: 0,
        isFiltered: false,
        searchTerm: null,
        customers: [],
        hasMore: false,
        map: (fn) => [].map(fn),
        forEach: (fn) => [].forEach(fn),
        slice: (start, end) => [].slice(start, end),
        length: 0,
        [Symbol.iterator]: function* () {},
      };
      return emptyResult;
    }
  };

  // Helper para consulta ao acervo de fotos e artes da Galeria com estrita blindagem por usuário
  const executeSearchGalleryPortfolio = async (args = {}) => {
    try {
      let snap;
      if (isAdmin) {
        snap = await admin.firestore().collection('gallery').limit(150).get();
      } else {
        const [userSnap, createdSnap] = await Promise.all([
          admin.firestore().collection('gallery').where('userId', '==', callerUid).limit(150).get(),
          admin.firestore().collection('gallery').where('createdBy', '==', callerUid).limit(150).get(),
        ]);
        const map = new Map();
        userSnap.docs.forEach((d) => map.set(d.id, d));
        createdSnap.docs.forEach((d) => map.set(d.id, d));
        snap = { docs: Array.from(map.values()) };
      }

      let items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((item) => !item.deletedAt);

      // GUARDRAIL ESTREITO: Usuário comum só vê suas próprias artes
      if (!isAdmin) {
        const uid = String(callerUid);
        items = items.filter((item) => item.userId === uid || item.createdBy === uid);
      } else if (isAdmin && args.userIdentifier) {
        const targetUser = await resolveTargetUser(args.userIdentifier);
        if (targetUser) {
          const uid = String(targetUser.uid);
          items = items.filter((item) => item.userId === uid || item.createdBy === uid);
        }
      }

      // Filtro por tag
      if (args.tag && typeof args.tag === 'string') {
        const filterTag = normalizeString(args.tag);
        items = items.filter((item) => {
          if (Array.isArray(item.tags)) {
            const hasTag = item.tags.some((t) => {
              const tagText = typeof t === 'string' ? t : t.text || t.name || '';
              return normalizeString(tagText).includes(filterTag);
            });
            if (hasTag) return true;
          }
          if (Array.isArray(item.aiTags)) {
            const hasAiTag = item.aiTags.some((t) => normalizeString(t).includes(filterTag));
            if (hasAiTag) return true;
          }
          return false;
        });
      }

      // Filtro por termo de busca
      if (args.searchTerm && typeof args.searchTerm === 'string') {
        const term = normalizeString(args.searchTerm);
        items = items.filter((item) => {
          const title = normalizeString(item.title || '');
          const desc = normalizeString(item.description || '');
          const aiDesc = normalizeString(item.aiDescription || '');
          const custName = normalizeString(item.customerName || '');
          const ordNum = normalizeString(item.orderNumber || '');
          const prodType = normalizeString(item.productType || '');
          const tagsStr = Array.isArray(item.tags)
            ? item.tags.map((t) => (typeof t === 'string' ? t : t.text || t.name || '')).join(' ')
            : '';
          const aiTagsStr = Array.isArray(item.aiTags) ? item.aiTags.join(' ') : '';
          const colorsStr = Array.isArray(item.colors) ? item.colors.join(' ') : '';
          const fullText = normalizeString(`${title} ${desc} ${aiDesc} ${custName} ${ordNum} ${prodType} ${tagsStr} ${aiTagsStr} ${colorsStr}`);
          return fullText.includes(term);
        });
      }

      const maxLimit = Math.min(Math.max(Number(args.limit) || 10, 1), 25);
      return items.slice(0, maxLimit).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description || item.aiDescription || '',
        imageUrl: item.imageUrl,
        customerName: item.customerName || null,
        orderNumber: item.orderNumber || null,
        tags: Array.isArray(item.tags)
          ? item.tags.map((t) => (typeof t === 'string' ? t : t.text || t.name || ''))
          : [],
        aiTags: item.aiTags || [],
        productType: item.productType || null,
      }));
    } catch (err) {
      console.error('[executeSearchGalleryPortfolio] Erro:', err);
      return [];
    }
  };

  // Helper para auto-capturar telefone do cliente a partir do nome se não estiver informado
  const resolveCustomerPhone = async (customerName, existingPhone) => {
    if (existingPhone && typeof existingPhone === 'string' && existingPhone.trim()) {
      return existingPhone.trim();
    }
    if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
      return null;
    }

    try {
      const term = customerName.toLowerCase().trim();
      // 1. Busca nos clientes isolados
      const customers = await executeQueryCustomers({ searchTerm: term, limit: 10 });
      for (const c of customers) {
        const docName = String(c.name || '').toLowerCase().trim();
        if (docName && (docName.includes(term) || term.includes(docName))) {
          if (c.phone) return c.phone;
        }
      }

      // 2. Busca nos pedidos isolados
      const orders = await fetchScopedOrders();
      for (const o of orders) {
        const ordName = String(o.customerName || '').toLowerCase().trim();
        if (ordName && (ordName.includes(term) || term.includes(ordName))) {
          if (o.customerPhone) return o.customerPhone;
        }
      }
    } catch (err) {
      console.warn('[resolveCustomerPhone] Erro ao buscar telefone automático:', err);
    }
    return null;
  };

  // Helper para cálculo de estimativa de precificação com guardrails de engenharia de custo e ateliê
  const executePricingEstimate = (args) => {
    const qty = Math.max(Number(args.quantity) || 1, 1);
    const rawCost = Number(args.unitCostRaw) || 15; // Custo base de insumos/papéis/matéria-prima
    const customCost = Number(args.customizationCost) || 5; // Laminação BOPP, apliques, fitas, Wire-o
    const technicalWasteFactor = 1.15; // 15% de margem de perda técnica e desgaste de lâmina
    const materialCostWithWaste = (rawCost + customCost) * technicalWasteFactor;

    const laborMinutes = Number(args.laborTimeMinutes) || 15;
    const laborCostPerMinute = 0.45; // R$ 27,00/hora de mão de obra técnica especializada
    const laborCost = laborMinutes * laborCostPerMinute;
    const unitBaseCost = materialCostWithWaste + laborCost;

    // Guardrail de Ciência de Dados: Margem de lucro protegida (mínimo 35%, máximo 75%)
    const requestedMargin = Number(args.profitMarginPercent) || 45;
    const margin = Math.min(Math.max(requestedMargin, 35), 75);
    const suggestedUnitPrice = Number((unitBaseCost / (1 - (margin / 100))).toFixed(2));
    const suggestedTotalPrice = Number((suggestedUnitPrice * qty).toFixed(2));

    return {
      productName: args.productName || 'Personalizado Luisices',
      quantity: qty,
      unitCost: Number(unitBaseCost.toFixed(2)),
      suggestedUnitPrice,
      suggestedTotalPrice,
      profitMarginPercent: margin,
      breakdown: {
        materialsBase: Number((rawCost + customCost).toFixed(2)),
        technicalWasteAllowance15Percent: Number(((rawCost + customCost) * 0.15).toFixed(2)),
        totalMaterialsWithWaste: Number(materialCostWithWaste.toFixed(2)),
        specializedLabor: Number(laborCost.toFixed(2)),
      }
    };
  };

  // Monta histórico de mensagens com Sliding Window Memory e alternância estrita de papéis (LLMOps)
  const contents = [];
  if (Array.isArray(history) && history.length > 0) {
    const rawHistory = history.slice(-6); // Mantém as últimas 6 mensagens (3 turnos completos de diálogo)
    let lastRole = null;
    for (const item of rawHistory) {
      if (!item || !item.text || typeof item.text !== 'string' || !item.text.trim()) continue;
      const normalizedRole = item.role === 'user' ? 'user' : 'model';
      if (normalizedRole === lastRole) {
        if (contents.length > 0) {
          contents[contents.length - 1].parts[0].text += `\n${item.text.trim()}`;
        }
      } else {
        contents.push({
          role: normalizedRole,
          parts: [{ text: item.text.trim() }]
        });
        lastRole = normalizedRole;
      }
    }
    // Se a última mensagem do histórico for user, removemos para unificar com a mensagem atual enriquecida
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents.pop();
    }
  }
  // Prepara as partes da mensagem atual do usuário com suporte a imagem multimodal
  const userParts = [];
  if (image && typeof image === 'object') {
    let { base64, mimeType } = image;
    if (base64 && typeof base64 === 'string') {
      if (base64.includes(',')) {
        base64 = base64.split(',')[1];
      }
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const effectiveMime = allowedMimes.includes(mimeType) ? mimeType : 'image/jpeg';
      // Limite de segurança de payload (~15MB em base64)
      if (base64.length < 15 * 1024 * 1024) {
        userParts.push({
          inlineData: {
            mimeType: effectiveMime,
            data: base64
          }
        });
      }
    }
  }
  userParts.push({ text: cleanMessage });

  contents.push({
    role: 'user',
    parts: userParts
  });

  // Definição estrita dos modelos modernos ativos com pools de cota independentes contra 429
  const CANDIDATE_MODELS = [
    process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-3-flash-preview',
  ].filter((item, index, self) => Boolean(item) && self.indexOf(item) === index);

  const callGeminiWithFallback = async (payload) => {
    let lastError = null;
    for (const model of CANDIDATE_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const data = await resp.json();
          // Memoiza o modelo bem-sucedido para que todas as próximas chamadas sejam diretas nele
          preferredWorkingModel = model;

          // Extrai metadados de telemetria de tokens retornados pela API Gemini
          const usageMetadata = data?.usageMetadata || {};
          const promptTokens = usageMetadata.promptTokenCount || usageMetadata.promptTokens || 0;
          const candidatesTokens = usageMetadata.candidatesTokenCount || usageMetadata.candidatesTokens || 0;
          const totalTokens = usageMetadata.totalTokenCount || usageMetadata.totalTokens || (promptTokens + candidatesTokens);

          // Registra consumo exato por requisição HTTP para a API Gemini
          admin.firestore().collection('ai_usage_logs').add({
            userId: callerUid,
            model: model,
            action: 'copilot_chat',
            promptTokens,
            candidatesTokens,
            totalTokens,
            timestamp: new Date().toISOString(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }).catch((err) => console.warn('[aiAgentChat] Erro ao gravar ai_usage_logs:', err));

          return { data, modelUsed: model };
        }

        const errText = await resp.text();
        console.warn(`[aiAgentChat] Modelo ${model} retornou status ${resp.status}:`, errText);
        lastError = new Error(`Modelo ${model} (Status ${resp.status}): ${errText}`);
      } catch (err) {
        clearTimeout(timeoutId);
        const isTimeout = err?.name === 'AbortError';
        console.warn(`[aiAgentChat] Falha com modelo ${model}:`, isTimeout ? 'Timeout de 12s excedido' : err);
        lastError = isTimeout ? new Error(`Modelo ${model} excedeu timeout de 12s`) : err;
      }
    }
    throw lastError || new Error('Nenhum modelo Gemini disponível respondeu com sucesso.');
  };

  // Filtragem de ferramentas ativas (activeFunctionDeclarations)
  const lowerMsg = (cleanMessage || '').toLowerCase();
  const isBillingOrWhatsAppIntent =
    /(cobranc|cobranç|cobrar|cobre|cobrando|whatsapp|zap|mensagem|aviso|notific|lembrete|pagamento)/i.test(lowerMsg) &&
    /(para|ao|pro|cliente|cobranc|cobranç|whatsapp|zap|mensagem|sinal|restante|envi|mand)/i.test(lowerMsg);

  let activeFunctionDeclarations = toolsDeclaration[0]?.function_declarations || [];

  // Se o usuário quer cobrar ou enviar mensagem no WhatsApp, remove query_customers para evitar desvio
  if (isBillingOrWhatsAppIntent) {
    activeFunctionDeclarations = activeFunctionDeclarations.filter((f) => f.name !== 'query_customers');
  }

  // Usuários não-administradores não têm acesso a get_user_summary
  if (!isAdmin) {
    activeFunctionDeclarations = activeFunctionDeclarations.filter((f) => f.name !== 'get_user_summary');
  }

  const activeTools = [{ function_declarations: activeFunctionDeclarations }];

  try {
    const geminiPayload = {
      system_instruction: { parts: [{ text: systemInstruction + (catalogContext || "") }] },
      contents,
      tools: activeTools,
      generationConfig: { temperature: 0.2, maxOutputTokens: 1536 }
    };

    const { data: firstResult } = await callGeminiWithFallback(geminiPayload);
    const candidate = firstResult?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const functionCallPart = parts.find(p => p.functionCall);
    const initialText = cleanAiOutput(parts.filter(p => p.text).map(p => p.text).join('\n'));

    let finalAnswer = '';
    let extractedDraft = null;
    let extractedWhatsApp = null;
    let extractedPricing = null;
    let extractedGalleryItems = null;

    if (functionCallPart) {
      const { name, args } = functionCallPart.functionCall;

      if (name === 'extract_order_draft') {
        if (!args.customerPhone && args.customerName) {
          args.customerPhone = await resolveCustomerPhone(args.customerName, null);
        }
        extractedDraft = args;
        finalAnswer = `Identifiquei os dados do pedido para **${args.customerName || 'o cliente'}**! Você pode conferir os detalhes e carregar diretamente no formulário de pedido abaixo.`;
      } else if (name === 'generate_whatsapp_message') {
        if (!args.recipientPhone && args.recipientName) {
          args.recipientPhone = await resolveCustomerPhone(args.recipientName, null);
        }
        extractedWhatsApp = args;
        finalAnswer = `Gerei o rascunho da mensagem para **${args.recipientName || 'o cliente'}**${args.recipientPhone ? ` (${args.recipientPhone})` : ''}. Você pode revisar o texto e enviar diretamente para o WhatsApp abaixo:`;
      } else if (name === 'query_customers') {
        const result = await executeQueryCustomers(args);
        const customersList = Array.isArray(result) ? result : (result.customers || []);
        const totalScoped = result.totalScoped !== undefined ? result.totalScoped : customersList.length;
        const totalFiltered = result.totalFiltered !== undefined ? result.totalFiltered : customersList.length;
        const isFiltered = Boolean(result.isFiltered);

        if (customersList.length === 0) {
          if (isFiltered) {
            const queryLabel = args.searchTerm || args.status || 'critérios informados';
            finalAnswer = `🔍 **Nenhum cliente localizado:**\n\nNão encontrei nenhum cliente correspondente a **"${queryLabel}"** na sua base (${totalScoped} cliente(s) cadastrado(s)).\n\n💡 *Dica: Tente pesquisar por parte do nome, número de telefone ou cidade.*`;
          } else {
            finalAnswer = 'Você ainda não possui nenhum cliente cadastrado no sistema.';
          }
        } else {
          const list = customersList.map((c) => {
            const loc = c.city ? (c.state ? `${c.city}/${c.state}` : c.city) : 'Não informada';
            const phone = c.phone || 'Não informado';
            const email = c.email || 'Não informado';
            const statusLabel = c.status === 'vip' ? ' ⭐ VIP' : c.status === 'defaulter' ? ' ⚠️ Em débito' : c.status === 'partner' ? ' 🤝 Parceiro' : '';
            
            let extra = '';
            if (c.totalOrders > 0 || c.totalSpent > 0) {
              const spentFmt = Number(c.totalSpent || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              extra = `\n  📊 ${c.totalOrders} pedido(s) realizados | Total: ${spentFmt}`;
            }
            return `• **${c.name}**${statusLabel}\n  📱 Telefone: ${phone} | ✉️ E-mail: ${email} | 🏙️ Cidade: ${loc}${extra}`;
          }).join('\n\n');

          if (!isFiltered) {
            finalAnswer = `👥 **Base de Clientes Luisices (${totalScoped} cliente(s) cadastrado(s)):**\n\nExibindo os **${customersList.length} clientes** de maior atividade / mais recentes:\n\n${list}${totalScoped > customersList.length ? `\n\n💡 *Exibindo ${customersList.length} de ${totalScoped} clientes. Para ver a ficha completa de alguém específico, pesquise por nome, telefone ou cidade (ex: \"cliente Amanda\" ou \"clientes de Florianópolis\").*` : ''}`;
          } else {
            finalAnswer = `🔍 **Resultado da Busca de Clientes (${totalFiltered} encontrado(s)):**\n\n${list}${totalFiltered > customersList.length ? `\n\n*(Exibindo os primeiros ${customersList.length} resultados de ${totalFiltered})*` : ''}`;
          }
        }
      } else if (name === 'calculate_pricing_estimate') {
        extractedPricing = executePricingEstimate(args);
        const formattedUnit = Number(extractedPricing.suggestedUnitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const formattedTotal = Number(extractedPricing.suggestedTotalPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        finalAnswer = `📊 **Estimativa de Precificação:**\n\n• **Produto:** ${extractedPricing.productName} (${extractedPricing.quantity} un)\n• **Custo Base Unitário:** R$ ${extractedPricing.unitCost.toFixed(2)}\n• **Preço Unitário Sugerido:** ${formattedUnit}\n• **Valor Total Sugerido:** ${formattedTotal} *(Margem protegida: ${extractedPricing.profitMarginPercent}%*)\n\nVocê pode gerar um orçamento oficial com esses valores a qualquer momento.`;
      } else if (name === 'daily_briefing') {
        const briefing = await executeDailyBriefing();
        const formattedPending = Number(briefing.pendingPaymentTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        let briefingText = `📋 **Raio-X Operacional do Dia (${briefing.todayDate}):**\n\n`;
        
        if (briefing.delayedCount > 0) {
          briefingText += `⚠️ **Atenção: ${briefing.delayedCount} pedido(s) com prazo vencido/urgente:**\n`;
          briefing.delayedOrders.forEach(o => {
            briefingText += `  • **${o.orderNumber || '#' + o.orderId}** — ${o.customerName} (${o.productSummary}) | Prazo: ${o.deliveryDate}\n`;
          });
          briefingText += '\n';
        } else {
          briefingText += `✅ **Nenhum pedido em atraso no momento!**\n\n`;
        }

        briefingText += `📦 **Entregas Agendadas para Hoje:** ${briefing.todayDeliveriesCount} pedido(s)\n`;
        briefingText += `🔄 **Pedidos em Produção:** ${briefing.inProgressCount} pedido(s)\n`;
        briefingText += `💰 **Valores Pendentes a Receber:** ${formattedPending} (${briefing.pendingPaymentCount} pedidos com pagamento pendente)\n`;

        finalAnswer = briefingText;
      } else if (name === 'get_user_summary') {
        const summary = await executeUserSummary(args);
        if (!summary.authorized) {
          finalAnswer = `🔒 **Acesso Restrito:**\n\nA consulta de auditoria, pedidos e clientes de outros membros da equipe é permitida **exclusivamente para administradores** do sistema.`;
        } else if (summary.isList) {
          let listText = `👥 **Colaboradores e Usuários no Sistema:**\n\n`;
          summary.members.forEach((m) => {
            listText += `• **${m.name}** (${m.email || 'Sem e-mail'})\n  Cargo: ${m.role}\n\n`;
          });
          listText += `Você pode perguntar detalhes de qualquer um: *"Quantos pedidos e clientes tem a ${summary.members[0]?.name || 'Amanda'}?"*`;
          finalAnswer = listText;
        } else if (!summary.found) {
          let notFoundText = `🔍 **Colaborador não localizado:**\n\nNão encontrei nenhum registro no sistema correspondente a **"${args.userIdentifier}"**.\n\n`;
          if (summary.availableMembers && summary.availableMembers.length > 0) {
            notFoundText += `👥 **Membros da equipe encontrados:**\n${summary.availableMembers.map((n) => `• ${n}`).join('\n')}\n\nTente perguntar com um dos nomes acima!`;
          }
          finalAnswer = notFoundText;
        } else {
          const u = summary.user;
          const m = summary.metrics;
          const fmtRealized = Number(m.realizedRevenue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const fmtReceived = Number(m.totalReceived || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const fmtPending = Number(m.pendingReceivables || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const fmtTicket = Number(m.averageTicket || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

          let report = `👤 **Raio-X do Colaborador:** **${u.name}**\n`;
          report += `📧 E-mail: ${u.email || 'Não informado'} | Cargo: **${u.role}** | Status: ${u.active ? '🟢 Ativo' : '🔴 Inativo'}\n\n`;
          report += `👥 **Clientes Cadastrados:** **${m.totalCustomers} cliente(s)**\n`;
          if (m.recentCustomers && m.recentCustomers.length > 0) {
            report += `  *(Exemplos: ${m.recentCustomers.join(', ')})*\n`;
          }
          report += `\n📦 **Total de Pedidos Vinculados:** **${m.totalOrders} pedido(s)** (${m.totalValidOrders} ativos)\n`;
          report += `  • ✅ Concluídos: ${m.completedOrders}\n`;
          report += `  • 🔄 Em Produção: ${m.inProgressOrders}\n`;
          report += `  • ⏳ Pendentes: ${m.pendingOrders}\n`;
          if (m.cancelledOrders > 0) {
            report += `  • ❌ Cancelados: ${m.cancelledOrders}\n`;
          }
          report += `\n💰 **Desempenho Financeiro Gerado:**\n`;
          report += `  • Faturamento Realizado (Concluídos): **${fmtRealized}**\n`;
          report += `  • Total já Recebido: ${fmtReceived}\n`;
          report += `  • Saldo Pendente a Receber: ${fmtPending}\n`;
          report += `  • Ticket Médio: **${fmtTicket}**\n`;

          finalAnswer = report;
        }
      } else if (name === 'get_financial_summary') {
        const finSummary = await executeFinancialSummary(args.period || 'month');
        const periodLabels = {
          today: 'Hoje',
          week: 'Últimos 7 dias',
          month: 'Mês Atual / 30 dias',
          year: 'Ano Atual',
          all: 'Todo o Histórico',
        };
        const periodLabel = periodLabels[finSummary.period] || finSummary.period;
        const fmtFaturamento = Number(finSummary.faturamentoRealizado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const fmtRecebido = Number(finSummary.totalRecebido || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const fmtPendente = Number(finSummary.totalPendenteReceber || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const fmtVolume = Number(finSummary.volumeTotalEmitido || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const fmtTicket = Number(finSummary.ticketMedio || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        let report = `💰 **Resumo Financeiro e Movimentação (${periodLabel}):**\n\n`;
        report += `• **Faturamento Realizado (Concluídos):** ${fmtFaturamento} (${finSummary.pedidosConcluidos} pedidos)\n`;
        report += `• **Total Efetivamente Recebido:** ${fmtRecebido}\n`;
        report += `• **Valores a Receber (Pendente):** ${fmtPendente}\n`;
        report += `• **Volume Total Emitido:** ${fmtVolume} (${finSummary.totalPedidosValidos} pedidos ativos)\n`;
        report += `• **Ticket Médio:** ${fmtTicket}\n`;
        if (finSummary.taxaConversao !== undefined) {
          report += `• **Taxa de Conclusão:** ${finSummary.taxaConversao}%\n`;
        }
        report += `\n📦 **Status dos Pedidos no Período:**\n`;
        report += `  - Concluídos: ${finSummary.pedidosConcluidos}\n`;
        report += `  - Em Produção: ${finSummary.pedidosEmProducao}\n`;
        report += `  - Pendentes: ${finSummary.pedidosPendentes}\n`;
        if (finSummary.pedidosCancelados > 0) {
          report += `  - Cancelados: ${finSummary.pedidosCancelados}\n`;
        }
        finalAnswer = report;
      } else if (name === 'query_orders_view') {
        const queryResults = await executeQueryOrdersView(args);
        
        if (queryResults && queryResults.unauthorized) {
          finalAnswer = queryResults.message;
        } else {
          const actualOrders = Array.isArray(queryResults) ? queryResults : [];
          const statusMap = {
            pending: '⏳ Pendente',
            'in-progress': '🔄 Em Produção',
            completed: '✅ Concluído',
            cancelled: '❌ Cancelado',
            deleted: '🗑️ Excluído (Auditado)',
          };

          if (actualOrders.length === 0) {
            const statusLabel = args.status && args.status !== 'all' ? ` com status "${args.status}"` : '';
            const searchLabel = args.searchTerm ? ` para "${args.searchTerm}"` : '';
            finalAnswer = `🔍 Não encontrei nenhum pedido correspondente${statusLabel}${searchLabel} na base de dados.`;
          } else {
            const list = actualOrders.map((o) => {
              const formattedPrice = Number(o.totalPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              const st = statusMap[o.status] || (o.isDeleted ? '🗑️ Excluído (Auditado)' : o.status);
              const paySt = o.paymentStatus === 'paid' ? '🟢 Pago' : o.paymentStatus === 'partial' ? '🟡 Parcial' : '🔴 Pendente';
              const dateStr = o.deliveryDate ? ` | 📅 Entrega: ${o.deliveryDate}` : '';
              return `• **${o.orderNumber || '#' + o.orderId}** — **${o.customerName || 'Cliente'}**\n  📦 ${o.productSummary || 'Produto Personalizado'} (${o.quantity || 1} un) | 💰 ${formattedPrice}\n  🏷️ ${st} | Pagamento: ${paySt}${dateStr}`;
            }).join('\n\n');

            finalAnswer = `📦 **Encontrei ${actualOrders.length} pedido(s):**\n\n${list}`;
          }
        }
      } else if (name === 'search_gallery_portfolio') {
        const galleryResults = await executeSearchGalleryPortfolio(args);
        extractedGalleryItems = galleryResults;

        if (galleryResults && galleryResults.unauthorized) {
          finalAnswer = galleryResults.message;
        } else if (!galleryResults || galleryResults.length === 0) {
          finalAnswer = '🔍 Não encontrei nenhuma foto ou arte correspondente no acervo da galeria.';
        } else {
          finalAnswer = `🎨 Encontrei **${galleryResults.length} modelo(s)** no acervo da galeria correspondentes à sua busca. Você pode conferir os detalhes e fotos nos cards interativos abaixo:`;
        }
      }
    } else {
      finalAnswer = cleanAiOutput(parts.map(p => p.text).filter(Boolean).join('\n')) || 'Como posso ajudar você hoje?';
    }

    finalAnswer = sanitizeAiResponse(cleanAiOutput(finalAnswer));

    // Salva no cache de respostas rápidas
    aiResponseCache.set(cacheKey, {
      reply: finalAnswer,
      orderDraft: extractedDraft,
      whatsappDraft: extractedWhatsApp,
      pricingEstimate: extractedPricing,
      galleryItems: extractedGalleryItems,
      timestamp: Date.now(),
    });

    return {
      success: true,
      reply: finalAnswer,
      orderDraft: extractedDraft,
      whatsappDraft: extractedWhatsApp,
      pricingEstimate: extractedPricing,
      galleryItems: extractedGalleryItems,
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error('[aiAgentChat] Erro inesperado:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Erro ao executar o copiloto de IA.');
  }
});

/**
 * Consulta a cota e o consumo em tempo real de TODOS os modelos disponíveis da API Gemini.
 * Uso estritamente restrito a administradores.
 */
exports.getAiUsage = onCall({ cors: true, maxInstances: 5, secrets: [GEMINI_API_KEY] }, async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const profile = await admin.firestore().doc(`userProfiles/${request.auth.uid}`).get();
  const profileData = profile.exists ? profile.data() : null;
  const isAdmin = profileData?.role === 'admin' && profileData?.active !== false;
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Acesso restrito a administradores.');
  }

  const rawKey = (typeof GEMINI_API_KEY?.value === 'function' ? GEMINI_API_KEY.value() : process.env.GEMINI_API_KEY) || '';
  const apiKey = String(rawKey).trim();

  const now = new Date();
  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const startOfMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  const MODEL_SPECS = [
    {
      id: 'gemini-3.8-flash',
      aliases: ['gemini-3.8-flash', 'gemini-3.8-flash-preview'],
      name: 'Gemini 3.8 Flash',
      description: 'Modelo principal de última geração em produção para raciocínio multimodal, fotos e acervo do ateliê.',
      category: 'Produção (Padrão)',
      dailyLimit: 1500,
      rpmLimit: 15,
      tpmLimit: 1000000,
      isDefault: true,
    },
    {
      id: 'gemini-3.6-flash',
      aliases: ['gemini-3.6-flash', 'gemini-3.6-flash-001'],
      name: 'Gemini 3.6 Flash',
      description: 'Modelo de alta velocidade com suporte multimodal e tool calls integradas.',
      category: 'Produção (Fallback)',
      dailyLimit: 1500,
      rpmLimit: 15,
      tpmLimit: 1000000,
    },
    {
      id: 'gemini-3.7-flash',
      aliases: ['gemini-3.7-flash', 'gemini-3.7-flash-preview'],
      name: 'Gemini 3.7 Flash',
      description: 'Modelo avançado com raciocínio híbrido e alta capacidade analítica.',
      category: 'Raciocínio Avançado',
      dailyLimit: 1500,
      rpmLimit: 15,
      tpmLimit: 1000000,
    },
    {
      id: 'gemini-3.5-flash',
      aliases: ['gemini-3.5-flash', 'gemini-3.5-flash-preview'],
      name: 'Gemini 3.5 Flash',
      description: 'Modelo de produção balanceado para consistência e baixa latência.',
      category: 'Produção (Fallback)',
      dailyLimit: 1500,
      rpmLimit: 15,
      tpmLimit: 1000000,
    },
    {
      id: 'gemini-3.1-flash-lite',
      aliases: ['gemini-3.1-flash-lite', 'gemini-3.1-flash-lite-preview'],
      name: 'Gemini 3.1 Flash Lite',
      description: 'Modelo ultraleve e econômico para triagens e respostas instantâneas.',
      category: 'Econômico / Lite',
      dailyLimit: 1500,
      rpmLimit: 15,
      tpmLimit: 1000000,
    },
    {
      id: 'gemini-3.5-flash-lite',
      aliases: ['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite-preview'],
      name: 'Gemini 3.5 Flash Lite',
      description: 'Modelo leve com pool de cota isolado para alta taxa de requisições.',
      category: 'Econômico / Lite',
      dailyLimit: 1500,
      rpmLimit: 15,
      tpmLimit: 1000000,
    },
    {
      id: 'gemini-3-flash-preview',
      aliases: ['gemini-3-flash-preview', 'gemini-3.0-flash', 'gemini-3.0-flash-preview'],
      name: 'Gemini 3 Flash Preview',
      description: 'Próxima geração experimental com alta fidelidade lógica e estruturação.',
      category: 'Experimental / Preview',
      dailyLimit: 1500,
      rpmLimit: 15,
      tpmLimit: 1000000,
    },
  ];

  // Probe em tempo real para verificar se o modelo responde 200, 429 ou 503
  const probeModelStatus = async (modelId) => {
    if (!apiKey) {
      return { liveStatus: 'UNAVAILABLE', liveCode: 0, liveMessage: 'API Key não configurada' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const probeResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}?key=${apiKey}`,
        { method: 'GET', signal: controller.signal }
      );
      clearTimeout(timeout);

      const status = probeResp.status;
      if (status === 200) {
        return { liveStatus: 'ONLINE', liveCode: 200, liveMessage: 'Live 200 OK' };
      }
      if (status === 429) {
        return { liveStatus: 'QUOTA_EXCEEDED', liveCode: 429, liveMessage: '429 Quota Exceeded' };
      }
      if (status === 503) {
        return { liveStatus: 'HIGH_DEMAND', liveCode: 503, liveMessage: '503 Alta Demanda' };
      }
      return { liveStatus: 'UNAVAILABLE', liveCode: status, liveMessage: `HTTP ${status}` };
    } catch (err) {
      clearTimeout(timeout);
      const isTimeout = err?.name === 'AbortError';
      return {
        liveStatus: 'OFFLINE',
        liveCode: 0,
        liveMessage: isTimeout ? 'Timeout (>3.5s)' : (err?.message || 'Falha de conexão')
      };
    }
  };

  let todayDocs = [];
  let monthDocs = [];
  let minuteDocs = [];
  let recentLogs = [];
  let probeResults = [];

  try {
    const [todaySnap, monthSnap, minuteSnap, recentSnap, probes] = await Promise.all([
      admin.firestore().collection('ai_usage_logs')
        .where('timestamp', '>=', startOfTodayUtc.toISOString())
        .get(),
      admin.firestore().collection('ai_usage_logs')
        .where('timestamp', '>=', startOfMonthUtc.toISOString())
        .get(),
      admin.firestore().collection('ai_usage_logs')
        .where('timestamp', '>=', oneMinuteAgo.toISOString())
        .get(),
      admin.firestore().collection('ai_usage_logs')
        .orderBy('timestamp', 'desc')
        .limit(15)
        .get()
        .catch(async (err) => {
          console.warn('[getAiUsage] Erro com orderBy timestamp, tentando fallback:', err);
          return admin.firestore().collection('ai_usage_logs').limit(30).get();
        }),
      Promise.all(MODEL_SPECS.map(spec => probeModelStatus(spec.id))),
    ]);

    todayDocs = todaySnap.docs.map(d => d.data());
    monthDocs = monthSnap.docs.map(d => d.data());
    minuteDocs = minuteSnap.docs.map(d => d.data());
    probeResults = probes;

    recentLogs = recentSnap.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          model: data.model || 'gemini-3.6-flash',
          action: data.action || 'copilot_chat',
          promptTokens: Number(data.promptTokens || 0),
          candidatesTokens: Number(data.candidatesTokens || 0),
          totalTokens: Number(data.totalTokens || 0),
          timestamp: data.timestamp || (data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : new Date().toISOString()),
          userId: data.userId || null,
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);
  } catch (fsErr) {
    console.warn('[getAiUsage] Erro ao consultar ai_usage_logs no Firestore:', fsErr);
  }

  const findSpecForDocModel = (docModel = '') => {
    const m = String(docModel).toLowerCase().trim();
    for (const spec of MODEL_SPECS) {
      if (spec.id === m || spec.aliases.some(a => m === a || m.startsWith(a))) {
        return spec.id;
      }
    }
    return 'gemini-3.6-flash';
  };

  const modelStatsMap = new Map();
  for (const spec of MODEL_SPECS) {
    modelStatsMap.set(spec.id, {
      daily: 0,
      monthly: 0,
      rpm: 0,
    });
  }

  for (const doc of todayDocs) {
    const matchedId = findSpecForDocModel(doc.model);
    if (modelStatsMap.has(matchedId)) {
      modelStatsMap.get(matchedId).daily += 1;
    }
  }

  for (const doc of monthDocs) {
    const matchedId = findSpecForDocModel(doc.model);
    if (modelStatsMap.has(matchedId)) {
      modelStatsMap.get(matchedId).monthly += 1;
    }
  }

  for (const doc of minuteDocs) {
    const matchedId = findSpecForDocModel(doc.model);
    if (modelStatsMap.has(matchedId)) {
      modelStatsMap.get(matchedId).rpm += 1;
    }
  }

  const activeModelId = preferredWorkingModel || 'gemini-3.8-flash';

  const models = MODEL_SPECS.map((spec, idx) => {
    const stats = modelStatsMap.get(spec.id) || { daily: 0, monthly: 0, rpm: 0 };
    const percentage = Math.min(100, Math.round((stats.daily / spec.dailyLimit) * 100));
    const probe = probeResults[idx] || { liveStatus: 'ONLINE', liveCode: 200, liveMessage: 'Live 200 OK' };

    return {
      id: spec.id,
      name: spec.name,
      description: spec.description,
      category: spec.category,
      isDefault: Boolean(spec.isDefault),
      isActive: spec.id === activeModelId,
      daily: {
        used: stats.daily,
        limit: spec.dailyLimit,
        percentage,
      },
      rpm: {
        used: stats.rpm,
        limit: spec.rpmLimit,
      },
      monthly: {
        used: stats.monthly,
      },
      tpmLimit: spec.tpmLimit,
      liveStatus: probe.liveStatus,
      liveCode: probe.liveCode,
      liveMessage: probe.liveMessage,
    };
  });

  const nextUtcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const nextUtcMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));

  const totalDailyUsed = todayDocs.length;
  const totalMonthlyUsed = monthDocs.length;
  const totalDailyLimit = 1500;
  const totalTokensToday = todayDocs.reduce((acc, doc) => acc + (Number(doc.totalTokens) || 0), 0);

  return {
    success: true,
    activeModel: activeModelId,
    provider: 'Google AI Studio / Gemini API',
    resetsAt: nextUtcMidnight.toISOString(),
    totalDaily: {
      used: totalDailyUsed,
      limit: totalDailyLimit,
      percentage: Math.min(100, Math.round((totalDailyUsed / totalDailyLimit) * 100)),
    },
    totalMonthly: {
      used: totalMonthlyUsed,
      limit: 45000,
      percentage: Math.min(100, Math.round((totalMonthlyUsed / 45000) * 100)),
    },
    totalTokensToday,
    recentLogs,
    models,
    // Compatibilidade com interfaces legadas
    daily: {
      used: totalDailyUsed,
      limit: totalDailyLimit,
      percentage: Math.min(100, Math.round((totalDailyUsed / totalDailyLimit) * 100)),
      resetsAt: nextUtcMidnight.toISOString(),
    },
    rpm: {
      used: minuteDocs.length,
      limit: 15,
      percentage: Math.min(100, Math.round((minuteDocs.length / 15) * 100)),
    },
    monthly: {
      used: totalMonthlyUsed,
      limit: 45000,
      percentage: Math.min(100, Math.round((totalMonthlyUsed / 45000) * 100)),
      resetsAt: nextUtcMonth.toISOString(),
    },
  };
});

/**
 * Analisa e enriquece um item da Galeria com visão computacional (Gemini Vision).
 * Extrai descrição rica, tags sugeridas, tipo de produto e cores para busca e catálogo inteligente.
 * Guardrails estritos: usuário não-admin só pode enriquecer itens pertencentes a ele; admin tem acesso geral.
 */
exports.enrichGalleryItemWithAi = onCall({ cors: true, timeoutSeconds: 120, memory: '1GiB', maxInstances: 5, secrets: [GEMINI_API_KEY] }, async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'É necessário estar autenticado.');
  }

  const callerUid = request.auth.uid;

  try {
    await galleryAiLimiter.consume(callerUid);
  } catch {
    throw new functions.https.HttpsError('resource-exhausted', 'Muitas requisições de análise de imagem. Aguarde um momento.');
  }

  const callerProfileDoc = await admin.firestore().doc(`userProfiles/${callerUid}`).get();
  const callerProfile = callerProfileDoc.exists ? callerProfileDoc.data() : { role: 'user', active: true };
  if (callerProfile.active === false) {
    throw new functions.https.HttpsError('permission-denied', 'Conta de usuário desativada.');
  }
  const isAdmin = callerProfile.role === 'admin';

  // Guardrail de Permissão de Recursos de IA:
  if (!isAdmin) {
    if (callerProfile.role === 'funcionario' && callerProfile.permissions?.aiCopilot !== true) {
      throw new functions.https.HttpsError('permission-denied', 'Seu perfil de funcionário não possui permissão para utilizar recursos de IA.');
    }
    if (callerProfile.role === 'user' && callerProfile.permissions?.aiCopilot === false) {
      throw new functions.https.HttpsError('permission-denied', 'Seu perfil de usuário não possui permissão para utilizar recursos de IA.');
    }
  }

  const { itemId } = request.data || {};
  if (!itemId || typeof itemId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'ID da arte é obrigatório.');
  }

  const itemRef = admin.firestore().doc(`gallery/${itemId}`);
  const itemSnap = await itemRef.get();
  if (!itemSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Item da galeria não encontrado.');
  }

  const itemData = itemSnap.data();
  if (itemData.deletedAt) {
    throw new functions.https.HttpsError('failed-precondition', 'Este item da galeria foi excluído.');
  }

  // GUARDRAIL ESTREITO: Usuário comum só pode analisar suas próprias artes
  if (!isAdmin) {
    const isOwner = itemData.userId === callerUid || itemData.createdBy === callerUid;
    if (!isOwner) {
      throw new functions.https.HttpsError('permission-denied', 'Você não tem permissão para analisar esta arte da galeria.');
    }
  }

  if (!itemData.imageUrl) {
    throw new functions.https.HttpsError('invalid-argument', 'O item não possui imagem para análise.');
  }

  const rawKey = (typeof GEMINI_API_KEY.value === 'function' ? GEMINI_API_KEY.value() : process.env.GEMINI_API_KEY) || '';
  const apiKey = String(rawKey).trim();
  if (!apiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Chave GEMINI_API_KEY não configurada no Firebase.');
  }

  // Baixa a imagem do Storage / CDN para base64
  let base64Image = '';
  let mimeType = 'image/jpeg';
  try {
    const imageUrl = new URL(itemData.imageUrl);
    let galleryPath = null;
    if (['cdn.luisices.com.br', 'cdn-dev.luisices.com.br'].includes(imageUrl.hostname)) {
      galleryPath = decodeURIComponent(imageUrl.pathname.slice(1));
    } else if (imageUrl.hostname === 'firebasestorage.googleapis.com') {
      const match = imageUrl.pathname.match(/\/o\/(.+)$/);
      galleryPath = match ? decodeURIComponent(match[1]) : null;
    }
    if (galleryPath && /^users\/[^/]+\/gallery\/[^/]+$/.test(galleryPath)) {
      // A autorização do item já foi verificada acima. Não dependa de leitura pública na CDN.
      if (galleryPath.split('/')[1] !== itemData.userId) {
        throw new Error('A imagem não pertence ao proprietário da arte.');
      }
      const file = admin.storage().bucket().file(galleryPath);
      const [buffer] = await file.download();
      const [metadata] = await file.getMetadata();
      mimeType = metadata.contentType || mimeType;
      base64Image = buffer.toString('base64');
    } else {
      const imgResp = await fetch(itemData.imageUrl);
      if (!imgResp.ok) throw new Error(`Falha ao baixar imagem (${imgResp.status})`);
      const contentType = imgResp.headers.get('content-type');
      if (contentType && contentType.startsWith('image/')) mimeType = contentType.split(';')[0];
      base64Image = Buffer.from(await imgResp.arrayBuffer()).toString('base64');
    }
  } catch (err) {
    console.error('[enrichGalleryItemWithAi] Erro ao carregar imagem:', err);
    throw new functions.https.HttpsError('internal', `Não foi possível carregar a imagem do item: ${err.message}`);
  }

  const visionPrompt = `Você é um especialista em catálogo de artigos personalizados, confecção têxtil, brindes corporativos e estamparia da empresa Luisices.
Analise a imagem deste produto/arte que foi produzido pela empresa.
Título atual informado: "${itemData.title || 'Sem título'}"
Descrição atual: "${itemData.description || ''}"

Responda ESTRITAMENTE em formato JSON puro, sem blocos de código markdown (sem crases ou tags json), sem quebras inválidas e sem texto explicativo adicional. Estrutura exata:
{
  "titleSuggested": "Título comercial conciso e descritivo para o produto",
  "aiDescription": "Descrição comercial rica e técnica dos detalhes visuais do produto, acabamento, estilo, público e possíveis ocasiões (em 2 a 3 frases em pt-BR)",
  "productType": "Tipo de produto (ex: Camiseta, Moletom, Caneca, Copo, Ecobag, Boné, Placa, Brinde, Almofada, Garrafa, etc.)",
  "colors": ["Cor 1", "Cor 2"],
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

  const candidateModels = [
    process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-3-flash-preview',
  ].filter((item, index, self) => Boolean(item) && self.indexOf(item) === index);
  let parsedAiResult = null;
  let usedModel = 'gemini-3.8-flash';
  let lastError = null;
  let usageTokens = { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 };

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Image
                }
              },
              { text: visionPrompt }
            ]
          }],
          generationConfig: {
            temperature: 0.2,
          }
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        const errText = await resp.text();
        console.warn(`[enrichGalleryItemWithAi] Modelo ${model} falhou (Status ${resp.status}):`, errText);
        lastError = new Error(`Modelo ${model} (Status ${resp.status}): ${errText}`);
        continue;
      }

      const data = await resp.json();
      const meta = data?.usageMetadata || {};
      const pT = meta.promptTokenCount || meta.promptTokens || 0;
      const cT = meta.candidatesTokenCount || meta.candidatesTokens || 0;
      const tT = meta.totalTokenCount || meta.totalTokens || (pT + cT);

      const textResp = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textResp) {
        try {
          parsedAiResult = JSON.parse(textResp);
          usedModel = model;
          usageTokens = { promptTokens: pT, candidatesTokens: cT, totalTokens: tT };
          break;
        } catch {
          const jsonMatch = textResp.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedAiResult = JSON.parse(jsonMatch[0]);
            usedModel = model;
            usageTokens = { promptTokens: pT, candidatesTokens: cT, totalTokens: tT };
            break;
          }
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err?.name === 'AbortError';
      console.warn(`[enrichGalleryItemWithAi] Erro com modelo ${model}:`, isTimeout ? 'Timeout de 15s excedido' : err);
      lastError = isTimeout ? new Error(`Modelo ${model} excedeu timeout de 15s`) : err;
    }
  }

  if (!parsedAiResult) {
    console.error('[enrichGalleryItemWithAi] Todos os modelos falharam. Detalhes:', lastError);
    throw new functions.https.HttpsError('internal', lastError?.message || 'Falha ao processar visão computacional com o Gemini.');
  }

  // Registra log de uso da IA com tokens
  admin.firestore().collection('ai_usage_logs').add({
    userId: callerUid,
    model: usedModel,
    action: 'gallery_vision_enrichment',
    promptTokens: usageTokens.promptTokens,
    candidatesTokens: usageTokens.candidatesTokens,
    totalTokens: usageTokens.totalTokens,
    itemId,
    timestamp: new Date().toISOString(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }).catch((err) => console.warn('[enrichGalleryItemWithAi] Erro ao gravar ai_usage_logs:', err));

  const updates = {
    aiDescription: parsedAiResult.aiDescription || '',
    aiTags: Array.isArray(parsedAiResult.suggestedTags) ? parsedAiResult.suggestedTags : [],
    productType: parsedAiResult.productType || '',
    colors: Array.isArray(parsedAiResult.colors) ? parsedAiResult.colors : [],
    aiAnalyzedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Se o item não tem tags manuais, adiciona as tags sugeridas
  if ((!itemData.tags || itemData.tags.length === 0) && updates.aiTags.length > 0) {
    updates.tags = updates.aiTags.slice(0, 5).map((t, idx) => ({
      name: t,
      color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][idx % 5],
    }));
  }

  await itemRef.update(updates);

  return {
    success: true,
    itemId,
    aiDescription: updates.aiDescription,
    aiTags: updates.aiTags,
    productType: updates.productType,
    colors: updates.colors,
    suggestedTags: updates.aiTags,
    titleSuggested: parsedAiResult.titleSuggested || itemData.title,
  };
});

/**
 * Analisa a foto de um produto da lojinha com IA (Gemini Vision) para sugerir:
 * - Nome comercial atraente
 * - Categoria ideal
 * - Descrição rica formatada com emojis, tópicos e seções para o catálogo
 * - Badge e prazo sugerido
 * Opcional e restrito a usuários com permissão aiCopilot ou admin.
 */
exports.enrichStoreProductWithAi = onCall({ cors: true, timeoutSeconds: 120, memory: '1GiB', maxInstances: 5, secrets: [GEMINI_API_KEY] }, async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const callerUid = request.auth.uid;
  try {
    await galleryAiLimiter.consume(callerUid);
  } catch {
    throw new functions.https.HttpsError("resource-exhausted", "Muitas requisições de análise de imagem. Aguarde um momento.");
  }

  const callerProfileDoc = await admin.firestore().doc(`userProfiles/${callerUid}`).get();
  const callerProfile = callerProfileDoc.exists ? callerProfileDoc.data() : { role: "user", active: true };

  if (callerProfile.active === false) {
    throw new functions.https.HttpsError("permission-denied", "Conta de usuário desativada.");
  }

  const isAdmin = callerProfile.role === "admin";
  if (!isAdmin) {
    if (callerProfile.role === "funcionario" && callerProfile.permissions?.aiCopilot !== true) {
      throw new functions.https.HttpsError("permission-denied", "Seu perfil de funcionário não possui permissão para utilizar recursos de IA.");
    }
    if (callerProfile.role === "user" && callerProfile.permissions?.aiCopilot === false) {
      throw new functions.https.HttpsError("permission-denied", "Seu perfil de usuário não possui permissão para utilizar recursos de IA.");
    }
  }

  const { imageBase64, mimeType = "image/jpeg", imageUrl, currentName, currentCategory, currentDescription } = request.data || {};

  let base64Image = imageBase64;
  let finalMime = mimeType;

  if (!base64Image && imageUrl) {
    try {
      const fetchUrl = toCdnUrl(imageUrl);
      const imgResp = await fetch(fetchUrl);
      if (!imgResp.ok) throw new Error(`Falha ao baixar imagem (${imgResp.status})`);
      const contentType = imgResp.headers.get("content-type");
      if (contentType && contentType.startsWith("image/")) {
        finalMime = contentType.split(";")[0];
      }
      const buffer = Buffer.from(await imgResp.arrayBuffer());
      base64Image = buffer.toString("base64");
    } catch (err) {
      console.error("[enrichStoreProductWithAi] Erro ao carregar imagem por URL:", err);
      throw new functions.https.HttpsError("internal", `Não foi possível carregar a imagem: ${err.message}`);
    }
  }

  if (!base64Image) {
    throw new functions.https.HttpsError("invalid-argument", "Imagem (base64 ou URL) é obrigatória para análise de IA.");
  }

  const rawKey = (typeof GEMINI_API_KEY.value === "function" ? GEMINI_API_KEY.value() : process.env.GEMINI_API_KEY) || "";
  const apiKey = String(rawKey).trim();
  if (!apiKey) {
    throw new functions.https.HttpsError("failed-precondition", "Chave GEMINI_API_KEY não configurada no Firebase.");
  }

  const visionPrompt = `Você é um redator de e-commerce e especialista em produtos personalizados, papelaria afetiva, artigos para festas, presentes e lembrancinhas artesanais da marca Luisices.
Analise a imagem deste produto comercial da lojinha.
Nome atual informado: "${currentName || ""}"
Categoria atual: "${currentCategory || ""}"
Descrição atual: "${currentDescription || ""}"

Crie um cadastro de alta conversão para o catálogo online.
A descrição DEVE ser rica, acolhedora e muito bem formatada para leitura agradável no celular:
- Um primeiro parágrafo encantador sobre a proposta do produto.
- Seção de tópicos iniciados com hífen "-" e emojis sutis para "✨ Perfeita para:" (ex: lembrancinhas, festas, presentes, maternidade).
- Seção de tópicos iniciados com hífen "-" para "🎀 Detalhes do produto:" (acabamentos, laços, fitas, materiais, formato).
- Uma frase convidativa para tirar dúvidas ou personalizar pelo WhatsApp.
- Destaque termos-chave em **negrito** e use quebras de linha reais (\n\n).

Responda ESTRITAMENTE em formato JSON puro, sem blocos de código markdown (sem crases ou tags json), sem formatação extra antes ou depois, apenas o objeto JSON puro e válido:
{
  "name": "Nome comercial atraente e claro para o produto",
  "category": "Categoria sugerida (ex: Lembrancinhas, Presenteáveis, Papelaria de Festa, Encadernação, Caixas Personalizadas, Canecas e Copos, etc.)",
  "description": "Texto completo da descrição formatada com quebras de linha e tópicos",
  "leadTimeDays": 5,
  "badge": "Lançamento, Mais Vendido, Personalizado ou vazio",
  "suggestedTags": ["tag1", "tag2", "tag3"]
}`;

  const candidateModels = [
    process.env.GEMINI_MODEL || "gemini-3.8-flash",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
  ].filter((item, index, self) => Boolean(item) && self.indexOf(item) === index);

  let parsedAiResult = null;
  let usedModel = "gemini-3.8-flash";
  let lastError = null;
  let usageTokens = { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 };

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: finalMime,
                  data: base64Image,
                },
              },
              { text: visionPrompt },
            ],
          }],
          generationConfig: {
            temperature: 0.2,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        const errText = await resp.text();
        console.warn(`[enrichStoreProductWithAi] Modelo ${model} falhou (Status ${resp.status}):`, errText);
        lastError = new Error(`Modelo ${model} (Status ${resp.status}): ${errText}`);
        continue;
      }

      const data = await resp.json();
      const meta = data?.usageMetadata || {};
      const pT = meta.promptTokenCount || meta.promptTokens || 0;
      const cT = meta.candidatesTokenCount || meta.candidatesTokens || 0;
      const tT = meta.totalTokenCount || meta.totalTokens || (pT + cT);
      const textResp = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (textResp) {
        try {
          parsedAiResult = JSON.parse(textResp);
          usedModel = model;
          usageTokens = { promptTokens: pT, candidatesTokens: cT, totalTokens: tT };
          break;
        } catch {
          const jsonMatch = textResp.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedAiResult = JSON.parse(jsonMatch[0]);
            usedModel = model;
            usageTokens = { promptTokens: pT, candidatesTokens: cT, totalTokens: tT };
            break;
          }
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err?.name === "AbortError";
      console.warn(`[enrichStoreProductWithAi] Erro com modelo ${model}:`, isTimeout ? "Timeout de 15s excedido" : err);
      lastError = isTimeout ? new Error(`Modelo ${model} excedeu timeout de 15s`) : err;
    }
  }

  if (!parsedAiResult) {
    console.error("[enrichStoreProductWithAi] Todos os modelos falharam. Detalhes:", lastError);
    throw new functions.https.HttpsError("internal", lastError?.message || "Falha ao processar visão computacional com o Gemini.");
  }

  // Registra log de uso da IA
  admin.firestore().collection("ai_usage_logs").add({
    userId: callerUid,
    model: usedModel,
    action: "store_product_vision_enrichment",
    promptTokens: usageTokens.promptTokens,
    candidatesTokens: usageTokens.candidatesTokens,
    totalTokens: usageTokens.totalTokens,
    timestamp: new Date().toISOString(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }).catch((err) => console.warn("[enrichStoreProductWithAi] Erro ao gravar ai_usage_logs:", err));

  return {
    success: true,
    name: parsedAiResult.name || "",
    category: parsedAiResult.category || "",
    description: parsedAiResult.description || "",
    leadTimeDays: typeof parsedAiResult.leadTimeDays === "number" ? parsedAiResult.leadTimeDays : 5,
    badge: parsedAiResult.badge || "",
    suggestedTags: Array.isArray(parsedAiResult.suggestedTags) ? parsedAiResult.suggestedTags : [],
  };
});

/**
 * Dispara uma mensagem WhatsApp diretamente para o cliente via Evolution API e armazena na base do chat.
 * Uso restrito a membros autorizados da equipe (admin ou funcionário ativo).
 */
exports.sendWhatsAppDirectMessage = onCall({ maxInstances: 5, secrets: [EVOLUTION_API_KEY] }, async (request) => {
  if (!(await isAuthorizedForWhatsApp(request))) {
    throw new functions.https.HttpsError('permission-denied', 'Sem permissão para utilizar o módulo de Atendimento (WhatsApp).');
  }

  const { phone, text, customerName, customerId } = request.data || {};
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Telefone do destinatário é obrigatório.');
  }
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Texto da mensagem é obrigatório.');
  }

  const rawKey = (typeof EVOLUTION_API_KEY.value === 'function' ? EVOLUTION_API_KEY.value() : process.env.EVOLUTION_API_KEY) || '';
  if (!rawKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Chave EVOLUTION_API_KEY não configurada no Firebase Secret Manager.');
  }

  try {
    const cleanNumber = normalizeWhatsAppNumber(phone);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`,
      {
        method: 'POST',
        headers: {
          apikey: rawKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number: cleanNumber, text: text.trim() }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[sendWhatsAppDirectMessage] Evolution API erro:', response.status, errBody);
      throw new functions.https.HttpsError('internal', `Evolution API retornou erro ${response.status}: ${errBody}`);
    }

    const resData = await response.json().catch(() => ({}));
    const messageId = resData?.key?.id || `msg_${Date.now()}`;
    const nowIso = new Date().toISOString();

    // 1. Salva a mensagem no histórico de mensagens do WhatsApp
    await admin.firestore().collection('whatsapp_messages').add({
      chatId: cleanNumber,
      phone: cleanNumber,
      customerName: customerName || null,
      customerId: customerId || null,
      sender: 'me',
      text: text.trim(),
      status: 'sent',
      timestamp: nowIso,
      evolutionMessageId: messageId,
      sentByUid: request.auth.uid,
      userId: request.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Atualiza a conversa na listagem de chats
    await admin.firestore().collection('whatsapp_chats').doc(cleanNumber).set({
      id: cleanNumber,
      phone: cleanNumber,
      customerName: customerName || cleanNumber,
      customerId: customerId || null,
      lastMessageText: text.trim(),
      lastMessageTimestamp: nowIso,
      lastMessageSender: 'me',
      userId: request.auth.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log('[sendWhatsAppDirectMessage] Mensagem enviada com sucesso para:', cleanNumber);
    return {
      success: true,
      message: 'Mensagem enviada com sucesso para o WhatsApp!',
      data: resData,
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error('[sendWhatsAppDirectMessage] Falha ao enviar mensagem:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Erro ao conectar com a API do WhatsApp.');
  }
});

/**
 * Exclui uma mensagem do WhatsApp (para todos) e remove da base do Firestore.
 * Uso restrito a membros autorizados da equipe (admin ou funcionário ativo).
 */
exports.deleteWhatsAppMessage = onCall({ maxInstances: 5, secrets: [EVOLUTION_API_KEY] }, async (request) => {
  if (!(await isAuthorizedForWhatsApp(request))) {
    throw new functions.https.HttpsError('permission-denied', 'Sem permissão para utilizar o módulo de Atendimento (WhatsApp).');
  }

  const { messageDocId, phone, evolutionMessageId } = request.data || {};
  if (!messageDocId && !evolutionMessageId) {
    throw new functions.https.HttpsError('invalid-argument', 'Identificador da mensagem é obrigatório.');
  }

  const rawKey = (typeof EVOLUTION_API_KEY.value === 'function' ? EVOLUTION_API_KEY.value() : process.env.EVOLUTION_API_KEY) || '';
  const cleanNumber = phone ? normalizeWhatsAppNumber(phone) : '';

  // 1. Tenta apagar na API do WhatsApp (para todos) caso tenhamos o evolutionMessageId
  if (rawKey && evolutionMessageId && cleanNumber) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const remoteJid = cleanNumber.includes('@') ? cleanNumber : `${cleanNumber}@s.whatsapp.net`;

      const response = await fetch(
        `${EVOLUTION_API_URL}/chat/deleteMessageForEveryone/${encodeURIComponent(EVOLUTION_INSTANCE)}`,
        {
          method: 'DELETE',
          headers: {
            apikey: rawKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: evolutionMessageId,
            remoteJid,
            fromMe: true,
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[deleteWhatsAppMessage] Aviso ao apagar na API (${response.status}):`, await response.text().catch(() => ''));
      }
    } catch (err) {
      console.warn('[deleteWhatsAppMessage] Falha de rede ao tentar apagar na API do WhatsApp:', err.message);
    }
  }

  // 2. Remove da coleção whatsapp_messages no Firestore
  try {
    if (messageDocId) {
      await admin.firestore().collection('whatsapp_messages').doc(messageDocId).delete();
    }
    if (evolutionMessageId) {
      const snap = await admin.firestore().collection('whatsapp_messages').where('evolutionMessageId', '==', evolutionMessageId).get();
      for (const d of snap.docs) {
        await d.ref.delete();
      }
    }
  } catch (err) {
    console.error('[deleteWhatsAppMessage] Erro ao deletar documento no Firestore:', err);
  }

  // 3. Atualiza o último snippet da conversa no whatsapp_chats
  if (cleanNumber) {
    try {
      const lastMsgSnap = await admin.firestore()
        .collection('whatsapp_messages')
        .where('chatId', '==', cleanNumber)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (!lastMsgSnap.empty) {
        const lastMsg = lastMsgSnap.docs[0].data();
        await admin.firestore().collection('whatsapp_chats').doc(cleanNumber).set({
          lastMessageText: lastMsg.text || '',
          lastMessageTimestamp: lastMsg.timestamp || new Date().toISOString(),
          lastMessageSender: lastMsg.sender || 'me',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } else {
        await admin.firestore().collection('whatsapp_chats').doc(cleanNumber).set({
          lastMessageText: '',
          lastMessageTimestamp: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    } catch (err) {
      console.warn('[deleteWhatsAppMessage] Erro ao atualizar resumo do chat:', err);
    }
  }

  return {
    success: true,
    message: 'Mensagem apagada com sucesso!',
  };
});

/**
 * Sincroniza mensagens recentes de um chat diretamente da API do WhatsApp para o Firestore.
 * Uso restrito a membros autorizados da equipe (admin ou funcionário ativo).
 */
exports.syncWhatsAppChatMessages = onCall({ maxInstances: 5, secrets: [EVOLUTION_API_KEY] }, async (request) => {
  if (!(await isAuthorizedForWhatsApp(request))) {
    throw new functions.https.HttpsError('permission-denied', 'Sem permissão para utilizar o módulo de Atendimento (WhatsApp).');
  }

  const { phone } = request.data || {};
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Telefone do contato é obrigatório.');
  }

  const rawKey = (typeof EVOLUTION_API_KEY.value === 'function' ? EVOLUTION_API_KEY.value() : process.env.EVOLUTION_API_KEY) || '';
  if (!rawKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Chave EVOLUTION_API_KEY não configurada no Firebase Secret Manager.');
  }

  const cleanPhone = normalizeWhatsAppNumber(phone);
  const remoteJid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(
      `${EVOLUTION_API_URL}/chat/findMessages/${encodeURIComponent(EVOLUTION_INSTANCE)}`,
      {
        method: 'POST',
        headers: {
          apikey: rawKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          where: {
            key: {
              remoteJid,
            },
          },
          limit: 50,
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`[syncWhatsAppChatMessages] Erro ao consultar mensagens (${response.status}):`, errText);
      return { success: false, message: `Não foi possível sincronizar histórico (${response.status}).` };
    }

    const data = await response.json().catch(() => []);
    const messagesList = Array.isArray(data) ? data : data?.messages?.records || data?.records || [];

    // Tenta localizar cliente correspondente
    let customerName = cleanPhone;
    let customerId = null;
    try {
      const custSnap = await admin.firestore().collection('customers').limit(100).get();
      for (const d of custSnap.docs) {
        const cData = d.data();
        const cPhone = String(cData.phone || '').replace(/\D/g, '');
        if (cPhone && (cleanPhone.endsWith(cPhone) || cPhone.endsWith(cleanPhone))) {
          customerName = cData.name || customerName;
          customerId = d.id;
          break;
        }
      }
    } catch (e) {
      console.warn('[syncWhatsAppChatMessages] Erro ao buscar cliente:', e);
    }

    let syncedCount = 0;
    let latestMessageText = '';
    let latestTimestamp = '';
    let latestSender = 'me';

    for (const item of messagesList) {
      const key = item?.key;
      const msg = item?.message;
      if (!key?.id) continue;

      const fromMe = Boolean(key?.fromMe);
      const text =
        msg?.conversation ||
        msg?.extendedTextMessage?.text ||
        msg?.imageMessage?.caption ||
        msg?.videoMessage?.caption ||
        msg?.documentMessage?.caption ||
        (msg?.imageMessage ? '📷 [Foto]' : msg?.audioMessage ? '🎵 [Áudio]' : msg?.documentMessage ? '📄 [Documento]' : '');

      if (!text) continue;

      const epochSec = item.messageTimestamp || key.messageTimestamp;
      const tsIso = epochSec ? new Date(Number(epochSec) * 1000).toISOString() : new Date().toISOString();

      const msgDocId = `wa_${key.id}`;
      await admin.firestore().collection('whatsapp_messages').doc(msgDocId).set({
        chatId: cleanPhone,
        phone: cleanPhone,
        customerName,
        customerId,
        sender: fromMe ? 'me' : 'customer',
        text,
        status: fromMe ? 'sent' : 'received',
        timestamp: tsIso,
        evolutionMessageId: key.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      syncedCount++;
      latestMessageText = text;
      latestTimestamp = tsIso;
      latestSender = fromMe ? 'me' : 'customer';
    }

    if (syncedCount > 0 && latestMessageText) {
      await admin.firestore().collection('whatsapp_chats').doc(cleanPhone).set({
        id: cleanPhone,
        phone: cleanPhone,
        customerName,
        customerId,
        lastMessageText: latestMessageText,
        lastMessageTimestamp: latestTimestamp,
        lastMessageSender: latestSender,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    return {
      success: true,
      count: syncedCount,
      message: `${syncedCount} mensagem(ns) sincronizada(s) com sucesso!`,
    };
  } catch (err) {
    console.error('[syncWhatsAppChatMessages] Erro:', err);
    throw new functions.https.HttpsError('internal', err.message || 'Erro ao sincronizar mensagens.');
  }
});

/**
 * Consulta o status da conexão da instância com o WhatsApp (open, connecting, close).
 */
exports.getWhatsAppInstanceStatus = onCall({ maxInstances: 5, secrets: [EVOLUTION_API_KEY] }, async (request) => {
  if (!(await isAuthorizedForWhatsApp(request))) {
    throw new functions.https.HttpsError('permission-denied', 'Sem permissão para utilizar o módulo de Atendimento (WhatsApp).');
  }

  const rawKey = (typeof EVOLUTION_API_KEY.value === 'function' ? EVOLUTION_API_KEY.value() : process.env.EVOLUTION_API_KEY) || '';
  if (!rawKey) {
    return {
      connected: false,
      state: 'missing_key',
      instance: EVOLUTION_INSTANCE,
      message: 'Chave de integração não configurada.',
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/connectionState/${encodeURIComponent(EVOLUTION_INSTANCE)}`,
      {
        method: 'GET',
        headers: { apikey: rawKey },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      const state = data?.instance?.state || data?.state || 'unknown';
      return {
        connected: state === 'open',
        state,
        instance: EVOLUTION_INSTANCE,
        serverUrl: EVOLUTION_API_URL,
      };
    }

    return {
      connected: false,
      state: 'error',
      status: response.status,
      instance: EVOLUTION_INSTANCE,
    };
  } catch (err) {
    return {
      connected: false,
      state: 'unreachable',
      error: err.message,
      instance: EVOLUTION_INSTANCE,
    };
  }
});

/**
 * Webhook para receber mensagens recebidas (MESSAGES_UPSERT) da API do WhatsApp em tempo real.
 */
exports.evolutionWhatsAppWebhook = onRequest({ secrets: [EVOLUTION_API_KEY] }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // Validação de autenticação/segredo do webhook (Evolution API)
  const expectedApiKey = (EVOLUTION_API_KEY.value && EVOLUTION_API_KEY.value()) || process.env.EVOLUTION_API_KEY;
  const providedApiKey = req.headers['x-api-key'] || req.headers['apikey'] || req.query.token || (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '') : null);

  if (expectedApiKey && (!providedApiKey || providedApiKey !== expectedApiKey)) {
    console.warn('[evolutionWhatsAppWebhook] Tentativa de requisição não autorizada rejeitada.');
    res.status(401).json({ error: 'Unauthorized webhook request' });
    return;
  }

  try {
    const event = req.body?.event;
    const data = req.body?.data;

    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      const msg = data?.message || data;
      const key = data?.key || msg?.key;
      const fromMe = Boolean(key?.fromMe);
      const remoteJid = key?.remoteJid || '';

      if (remoteJid && !remoteJid.includes('@g.us') && !remoteJid.includes('status@broadcast')) {
        const cleanPhone = remoteJid.replace(/\D/g, '');
        const messageText =
          msg?.conversation ||
          msg?.extendedTextMessage?.text ||
          msg?.imageMessage?.caption ||
          msg?.videoMessage?.caption ||
          msg?.documentMessage?.caption ||
          (msg?.imageMessage ? '📷 [Foto]' : msg?.audioMessage ? '🎵 [Áudio]' : msg?.documentMessage ? '📄 [Documento]' : '');

        if (cleanPhone && messageText) {
          const nowIso = new Date().toISOString();

          // Tenta localizar o nome do cliente na base customers
          let customerName = cleanPhone;
          let customerId = null;
          try {
            const custSnap = await admin.firestore().collection('customers').limit(100).get();
            for (const d of custSnap.docs) {
              const cData = d.data();
              const cPhone = String(cData.phone || '').replace(/\D/g, '');
              if (cPhone && (cleanPhone.endsWith(cPhone) || cPhone.endsWith(cleanPhone))) {
                customerName = cData.name || customerName;
                customerId = d.id;
                break;
              }
            }
          } catch (e) {
            console.warn('[evolutionWhatsAppWebhook] Erro ao buscar cliente:', e);
          }

          const msgDocId = key?.id ? `wa_${key.id}` : null;
          if (msgDocId) {
            await admin.firestore().collection('whatsapp_messages').doc(msgDocId).set({
              chatId: cleanPhone,
              phone: cleanPhone,
              customerName,
              customerId,
              sender: fromMe ? 'me' : 'customer',
              text: messageText,
              status: fromMe ? 'sent' : 'received',
              timestamp: nowIso,
              evolutionMessageId: key?.id || `inc_${Date.now()}`,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          } else {
            await admin.firestore().collection('whatsapp_messages').add({
              chatId: cleanPhone,
              phone: cleanPhone,
              customerName,
              customerId,
              sender: fromMe ? 'me' : 'customer',
              text: messageText,
              status: fromMe ? 'sent' : 'received',
              timestamp: nowIso,
              evolutionMessageId: `inc_${Date.now()}`,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }

          await admin.firestore().collection('whatsapp_chats').doc(cleanPhone).set({
            id: cleanPhone,
            phone: cleanPhone,
            customerName,
            customerId,
            lastMessageText: messageText,
            lastMessageTimestamp: nowIso,
            lastMessageSender: fromMe ? 'me' : 'customer',
            unreadCount: fromMe ? 0 : admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[evolutionWhatsAppWebhook] Erro ao processar webhook:', error);
    res.status(500).json({ error: error.message });
  }
});




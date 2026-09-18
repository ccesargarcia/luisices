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
exports.sendAdminPasswordReset = onCall({ secrets: [RESEND_API_KEY, EVOLUTION_API_KEY] }, async (request) => {
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
exports.createUserInvitation = onCall({ secrets: [RESEND_API_KEY, EVOLUTION_API_KEY] }, async (request) => {
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
exports.sendPasswordResetEmail = onCall({ secrets: [RESEND_API_KEY, EVOLUTION_API_KEY] }, async (request) => {
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
exports.sendCustomEmail = onCall({ cors: true, secrets: [RESEND_API_KEY] }, async (request) => {
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
exports.getEmailUsage = onCall({ cors: true, secrets: [RESEND_API_KEY] }, async (request) => {
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
  if (!profile.exists) return false;
  const data = profile.data();
  return (data.role === 'admin' || data.role === 'funcionario') && data.active !== false;
};

/**
 * Converte um documento operacional de 'orders' em formato sanitizado e otimizado para IA
 */
const buildAiOrderDoc = (orderId, data) => {
  const productSummary = data.productName || 'Não especificado';
  const quantity = Number(data.quantity) || 1;
  const totalPrice = Number(data.price) || 0;
  const status = data.status || 'pending';
  const paymentStatus = data.payment?.status || 'pending';
  const paymentMethod = data.payment?.method || null;
  const deliveryDate = data.deliveryDate || null;
  const customerName = data.customerName || 'Cliente sem nome';
  const customerPhone = data.customerPhone || '';
  const notes = data.notes || '';
  const orderNumber = data.orderNumber || `#${orderId}`;
  const isExchange = Boolean(data.isExchange);

  return {
    orderId,
    orderNumber,
    customerName,
    customerPhone,
    productSummary,
    quantity,
    totalPrice,
    status,
    paymentStatus,
    paymentMethod,
    deliveryDate,
    notes,
    isExchange,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
};

/**
 * Trigger de sincronização para a base somente-leitura da IA (ai_orders_view).
 * Sempre que um pedido for criado, atualizado ou excluído, projeta uma visão
 * sanitizada e otimizada para consultas do Agente.
 * Usa trigger nativo de 1ª geração para compatibilidade total de permissões IAM.
 */
exports.syncOrderToAiView = functions.firestore
  .document('orders/{orderId}')
  .onWrite(async (change, context) => {
    const orderId = context.params.orderId;
    const targetRef = admin.firestore().collection('ai_orders_view').doc(orderId);

    // Se o pedido foi excluído
    if (!change.after || !change.after.exists) {
      await targetRef.delete().catch((err) => {
        console.warn(`[syncOrderToAiView] Erro ao remover view do pedido ${orderId}:`, err);
      });
      console.log(`[syncOrderToAiView] Pedido ${orderId} removido da ai_orders_view.`);
      return;
    }

    const data = change.after.data() || {};
    const aiDoc = buildAiOrderDoc(orderId, data);

    await targetRef.set(aiDoc, { merge: true });
    console.log(`[syncOrderToAiView] Pedido ${orderId} sincronizado na ai_orders_view.`);
  });

/**
 * Sincroniza em lote todos os pedidos existentes para a base somente-leitura.
 * Uso restrito a administradores.
 */
exports.syncAllOrdersToAiView = onCall(async (request) => {
  if (!(await isAdminRequest(request))) {
    throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem executar a sincronização em lote.');
  }

  const snapshot = await admin.firestore().collection('orders').get();
  if (snapshot.empty) {
    return { success: true, count: 0, message: 'Nenhum pedido para sincronizar.' };
  }

  const db = admin.firestore();
  let batch = db.batch();
  let batchCount = 0;
  let totalCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const aiDoc = buildAiOrderDoc(doc.id, data);
    const targetRef = db.collection('ai_orders_view').doc(doc.id);
    batch.set(targetRef, aiDoc, { merge: true });
    batchCount++;
    totalCount++;

    if (batchCount >= 450) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return { success: true, count: totalCount, message: `${totalCount} pedidos sincronizados com sucesso na ai_orders_view.` };
});

/**
 * Endpoint Callable Seguro do Copiloto de IA Interno
 */
exports.aiAgentChat = onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
  if (!(await isAuthorizedEmployeeOrAdmin(request))) {
    throw new functions.https.HttpsError('permission-denied', 'Acesso restrito a membros autorizados da equipe.');
  }

  try {
    await aiAgentLimiter.consume(request.auth.uid);
  } catch {
    throw new functions.https.HttpsError('resource-exhausted', 'Muitas requisições. Aguarde um momento antes de enviar nova mensagem.');
  }

  const { message, history = [] } = request.data || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Mensagem é obrigatória.');
  }

  const rawKey = (typeof GEMINI_API_KEY.value === 'function' ? GEMINI_API_KEY.value() : process.env.GEMINI_API_KEY) || '';
  const apiKey = String(rawKey).trim();
  if (!apiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Chave GEMINI_API_KEY não configurada no Firebase Secret Manager. Cadastre o secret no GitHub ou no Firebase.');
  }

  const systemInstruction = `Você é o Copiloto Interno da Luisices (confecção/gráfica especializada em camisetas, brindes e personalizados).
Seu papel é atuar como o assistente e guia inteligente da equipe administrativa e operacional.

Você possui 3 responsabilidades principais:
1. CONSULTA DE DADOS: Consultar prazos, pedidos pendentes, clientes, status e faturamento utilizando a ferramenta 'query_orders_view'.
2. EXTRAÇÃO DE PEDIDOS: Estruturar pedidos a partir de conversas e mensagens de clientes (WhatsApp/áudio) utilizando a ferramenta 'extract_order_draft'.
3. GUIA E SUPORTE OPERACIONAL: Tirar dúvidas sobre como usar qualquer funcionalidade do sistema Luisices com passos claros e objetivos.

---
BASE DE CONHECIMENTO DO SISTEMA LUISICES:

• LOJINHA ONLINE & CATÁLOGO:
- Produtos da Lojinha (/produtos-lojinha): Onde você cadastra e publica itens para a vitrine pública da loja. Para publicar, acesse o menu Lojinha Online > Produtos da Lojinha, clique em 'Novo Produto', preencha nome, fotos, descrição, variações (tamanho/cor) e valor, e marque como 'Ativo'.
- Vitrine Pública (/loja ou /catalogo): O link público onde os clientes visualizam os produtos, montam o carrinho e enviam o pedido direto para o WhatsApp do ateliê.
- Pedidos da Lojinha (/pedidos-lojinha): Lista os pedidos recebidos através da vitrine pública. Você pode aceitar o pedido e convertê-lo em um pedido operacional de produção com 1 clique.
- Aparência & Vitrine (/personalizar-lojinha): Personaliza o banner, cores de destaque, logo e informações de contato da lojinha pública.

• PEDIDOS DO ATELIÊ & WORKFLOW (/):
- Novo Pedido: Botão 'Novo Pedido' no Dashboard ou via Copiloto IA.
- Workflow em 7 Etapas: Design → Aprovação do Cliente → Impressão → Corte → Montagem → Controle de Qualidade → Embalagem/Entrega.
- Ações no Pedido: Ao abrir o pedido, você pode exportar PDF, duplicar pedido, delegar para um membro da equipe (assignedTo), anexar comprovantes/arquivos e registrar pagamentos (Pix, Dinheiro, Cartão).

• PRECIFICAÇÃO INTELIGENTE (/precificacao):
- Fórmulas de Custos: Permite cadastrar matérias-primas (tecidos, tintas, embalagens), mão de obra por tempo ou proporção, margem de desperdício, taxa de pagamento e margem de lucro desejada para obter o preço de venda sugerido.

• ORÇAMENTOS (/orcamentos):
- Criação de cotações para clientes com data de validade. Ao ser aprovado pelo cliente, pode ser transformado em pedido com 1 clique.

• CLIENTES (/clientes), GALERIA (/galeria) E PERMUTAS (/permutas):
- Clientes: Cadastro completo com endereço automático via CEP, histórico de compras e fotos vinculadas.
- Galeria: Banco de artes, matrizes e estampas vinculadas aos clientes para reutilização em novos pedidos.
- Permutas: Controle de parcerias e permutas com influenciadores/parceiros sem transação monetária.

---
DIRETRIZES DE RESPOSTA:
- Sempre responda em Português do Brasil (pt-BR) de forma simpática, clara e estruturada com bullet points.
- Se a dúvida for operacional (ex: "como publicar na lojinha?"), forneça o passo a passo direto e indique o menu correspondente.
- Se a dúvida for sobre dados do ateliê (ex: "pedidos de hoje"), consulte a ferramenta 'query_orders_view'.
- Se o usuário colar um pedido informal de WhatsApp, acione 'extract_order_draft'.`;

  const toolsDeclaration = [
    {
      function_declarations: [
        {
          name: 'query_orders_view',
          description: 'Consulta a base somente-leitura de pedidos (ai_orders_view) para obter status, prazos, clientes e valores.',
          parameters: {
            type: 'OBJECT',
            properties: {
              status: {
                type: 'STRING',
                enum: ['pending', 'in-progress', 'completed', 'cancelled', 'all'],
                description: 'Filtro por status do pedido (pending, in-progress, completed, cancelled ou all)'
              },
              paymentStatus: {
                type: 'STRING',
                enum: ['pending', 'partial', 'paid', 'all'],
                description: 'Filtro por status de pagamento'
              },
              searchTerm: {
                type: 'STRING',
                description: 'Termo de busca para nome do cliente, produto ou telefone'
              },
              limit: {
                type: 'INTEGER',
                description: 'Quantidade máxima de registros a retornar (máximo 30)'
              }
            }
          }
        },
        {
          name: 'extract_order_draft',
          description: 'Extrai dados estruturados de um novo pedido a partir de uma mensagem ou conversa para pré-preenchimento.',
          parameters: {
            type: 'OBJECT',
            properties: {
              customerName: { type: 'STRING', description: 'Nome do cliente' },
              customerPhone: { type: 'STRING', description: 'Telefone de contato' },
              productName: { type: 'STRING', description: 'Nome e especificações do produto (ex: Camiseta Algodão Silk)' },
              quantity: { type: 'INTEGER', description: 'Quantidade de peças' },
              totalPrice: { type: 'NUMBER', description: 'Valor total do pedido em reais' },
              deliveryDate: { type: 'STRING', description: 'Data de entrega estimada no formato YYYY-MM-DD' },
              notes: { type: 'STRING', description: 'Observações, estampas ou detalhes' },
              paymentMethod: { type: 'STRING', enum: ['pix', 'cash', 'credit', 'debit', 'other'] }
            },
            required: ['customerName', 'productName']
          }
        }
      ]
    }
  ];

  // Helper para consultar a base somente leitura do Firestore com fallback automático
  const executeQueryOrdersView = async (args = {}) => {
    let query = admin.firestore().collection('ai_orders_view');
    if (args.status && args.status !== 'all') {
      query = query.where('status', '==', args.status);
    }
    if (args.paymentStatus && args.paymentStatus !== 'all') {
      query = query.where('paymentStatus', '==', args.paymentStatus);
    }
    const maxLimit = Math.min(Math.max(Number(args.limit) || 20, 1), 30);
    const snap = await query.limit(maxLimit).get();

    let docs = snap.docs.map(d => d.data());

    // Se a ai_orders_view ainda não foi populada, busca direto em orders
    if (docs.length === 0) {
      let prodQuery = admin.firestore().collection('orders');
      if (args.status && args.status !== 'all') {
        prodQuery = prodQuery.where('status', '==', args.status);
      }
      const prodSnap = await prodQuery.limit(maxLimit).get();
      docs = prodSnap.docs.map(d => buildAiOrderDoc(d.id, d.data()));
    }

    if (args.searchTerm && typeof args.searchTerm === 'string') {
      const term = args.searchTerm.toLowerCase().trim();
      docs = docs.filter(d =>
        (d.customerName && d.customerName.toLowerCase().includes(term)) ||
        (d.productSummary && d.productSummary.toLowerCase().includes(term)) ||
        (d.customerPhone && d.customerPhone.includes(term))
      );
    }
    return docs;
  };

  // Monta histórico de mensagens
  const contents = [];
  if (Array.isArray(history)) {
    for (const item of history.slice(-6)) {
      if (item.role && item.text) {
        contents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.text }]
        });
      }
    }
  }
  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  // Busca a lista de modelos suportados pela chave dinamicamente
  const getDynamicModels = async () => {
    try {
      const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (listResp.ok) {
        const listData = await listResp.json();
        const available = (listData.models || [])
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''));
        if (available.length > 0) {
          console.log('[aiAgentChat] Modelos retornados pela API para esta chave:', available);
          return available;
        }
      } else {
        const err = await listResp.text();
        console.warn('[aiAgentChat] Não foi possível listar modelos automaticamente:', listResp.status, err);
      }
    } catch (err) {
      console.warn('[aiAgentChat] Erro ao consultar lista de modelos:', err);
    }
    return [];
  };

  const dynamicModels = await getDynamicModels();
  const candidateModels = [
    process.env.GEMINI_MODEL,
    ...dynamicModels,
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash',
    'gemini-pro',
  ].filter((item, index, self) => Boolean(item) && self.indexOf(item) === index);

  const callGeminiWithFallback = async (payload) => {
    let lastError = null;
    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (resp.ok) {
          const data = await resp.json();
          return { data, modelUsed: model };
        }

        const errText = await resp.text();
        console.warn(`[aiAgentChat] Modelo ${model} retornou status ${resp.status}:`, errText);
        lastError = new Error(`Modelo ${model} (Status ${resp.status}): ${errText}`);
      } catch (err) {
        console.warn(`[aiAgentChat] Falha de conexão com modelo ${model}:`, err);
        lastError = err;
      }
    }
    throw lastError || new Error('Nenhum modelo Gemini disponível respondeu com sucesso.');
  };

  try {
    const geminiPayload = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents,
      tools: toolsDeclaration,
      generationConfig: { temperature: 0.2 }
    };

    const { data: firstResult } = await callGeminiWithFallback(geminiPayload);
    const candidate = firstResult?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const functionCallPart = parts.find(p => p.functionCall);

    let finalAnswer = '';
    let extractedDraft = null;

    if (functionCallPart) {
      const { name, args } = functionCallPart.functionCall;

      if (name === 'extract_order_draft') {
        extractedDraft = args;
        finalAnswer = `Identifiquei os dados do pedido para **${args.customerName || 'o cliente'}**! Você pode conferir os detalhes e carregar diretamente no formulário de pedido abaixo.`;
      } else if (name === 'query_orders_view') {
        const queryResults = await executeQueryOrdersView(args);
        
        // Segunda chamada para o Gemini formular a resposta final detalhada com os dados consultados
        const followUpContents = [
          ...contents,
          { role: 'model', parts: [{ functionCall: functionCallPart.functionCall }] },
          {
            role: 'function',
            parts: [{
              functionResponse: {
                name: 'query_orders_view',
                response: {
                  summary: `Encontrados ${queryResults.length} pedidos.`,
                  orders: queryResults.slice(0, 15),
                }
              }
            }]
          }
        ];

        try {
          const { data: followUpResult } = await callGeminiWithFallback({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: followUpContents,
            tools: toolsDeclaration,
            generationConfig: { temperature: 0.2 }
          });
          const followUpCandidate = followUpResult?.candidates?.[0];
          const followUpParts = followUpCandidate?.content?.parts || [];
          const textResponse = followUpParts.map(p => p.text).filter(Boolean).join('\n');

          const statusMap = {
            pending: 'Pendente',
            'in-progress': 'Em Produção',
            completed: 'Concluído',
            cancelled: 'Cancelado',
          };

          if (queryResults.length === 0) {
            finalAnswer = textResponse && textResponse.length > 20
              ? textResponse
              : 'Não encontrei nenhum pedido correspondente aos critérios consultados.';
          } else {
            const isGeneric =
              !textResponse ||
              textResponse.length < 50 ||
              textResponse.toLowerCase().includes('consulta realizada') ||
              textResponse.toLowerCase().includes('com sucesso');

            if (isGeneric) {
              const list = queryResults.map(o => {
                const formattedPrice = Number(o.totalPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                const st = statusMap[o.status] || o.status;
                const paySt = o.paymentStatus === 'paid' ? 'Pago' : o.paymentStatus === 'partial' ? 'Parcial' : 'Pendente';
                return `• **${o.orderNumber || '#' + o.orderId}** — **${o.customerName}**\n  📦 ${o.productSummary} (${o.quantity} un) | 💰 ${formattedPrice} | 🏷️ ${st} (${paySt})`;
              }).join('\n\n');

              finalAnswer = `Encontrei **${queryResults.length} pedido(s)** cadastrado(s):\n\n${list}`;
            } else {
              finalAnswer = textResponse;
            }
          }
        } catch {
          if (queryResults.length === 0) {
            finalAnswer = 'Não encontrei nenhum pedido correspondente na base.';
          } else {
            const list = queryResults.map(o => `• **${o.orderNumber || '#' + o.orderId}** — ${o.customerName}: ${o.productSummary} (${o.quantity} un) - R$ ${o.totalPrice}`).join('\n');
            finalAnswer = `Encontrei **${queryResults.length} pedido(s)**:\n\n${list}`;
          }
        }
      }
    } else {
      finalAnswer = parts.map(p => p.text).filter(Boolean).join('\n') || 'Como posso ajudar você hoje?';
    }

    return {
      success: true,
      reply: finalAnswer,
      orderDraft: extractedDraft,
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error('[aiAgentChat] Erro inesperado:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Erro ao executar o copiloto de IA.');
  }
});




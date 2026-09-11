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

// Configurar Resend API Key usando o novo sistema de params
// Execute: firebase functions:secrets:set RESEND_API_KEY
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const EVOLUTION_API_KEY = defineSecret('EVOLUTION_API_KEY');

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
    console.log(`[sendPasswordResetEmail] Iniciando para: ${email}`);

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
  const senderEmail = from && from.trim() ? from.trim() : defaultSender;

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
 * Webhook HTTP para recebimento de e-mails via Resend (email.received).
 * Armazena e-mails recebidos na coleção 'receivedEmails'.
 *
 * Configuração no Resend Dashboard:
 * URL: https://<regiao>-<projeto>.cloudfunctions.net/resendReceivingWebhook
 * Eventos selecionados: email.received
 */
exports.resendReceivingWebhook = onRequest({ cors: true, secrets: [RESEND_API_KEY] }, async (req, res) => {
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
    // Validação de assinatura Svix (se RESEND_WEBHOOK_SECRET estiver configurado no ambiente)
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
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
      console.warn('[resendReceivingWebhook] Rejeitado: e-mail não validado no Resend:', emailId);
      return res.status(404).json({ error: 'Email could not be verified on Resend' });
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



const functions = require('firebase-functions');
const { onCall, onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { Resend } = require('resend');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const crypto = require('crypto');

admin.initializeApp();
const { createAiServices } = require('./ai');

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

// Rate limiter para checkout público da vitrine (catalogOrders): 10 pedidos por 15 minutos por IP
const publicCatalogOrderLimiter = new RateLimiterMemory({
  points: 10,
  duration: 900,
});

// Configurar secrets usando o sistema de params
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const EVOLUTION_API_KEY = defineSecret('EVOLUTION_API_KEY');
const RESEND_WEBHOOK_SECRET = defineSecret('RESEND_WEBHOOK_SECRET');
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const { ORIGIN_SECRET, validateOriginSecret } = require('./originProtection');

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

  // Validação estrita no servidor: o e-mail da conta Auth precisa estar verificado antes de concluir o cadastro
  if (!request.auth.token.email_verified) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'O e-mail da conta precisa estar verificado antes de concluir o cadastro do convite.'
    );
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
        settings: false,
        users: { view: false, create: false, edit: false, delete: false },
        emails: false,
        whatsapp: false,
        aiCopilot: false,
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

  const profileRef = admin.firestore().doc(`userProfiles/${uid}`);
  const profileSnap = await profileRef.get();

  // 1. Desativa o perfil imediatamente para revogar acesso operacional
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

  // Revoga tokens ativos no Auth
  try {
    await admin.auth().revokeRefreshTokens(uid);
  } catch (err) {
    if (err?.code !== 'auth/user-not-found') {
      console.warn('[deleteUser] Aviso ao revogar tokens:', err?.message || err);
    }
  }

  // 2. Remove do Firebase Auth
  try {
    await admin.auth().deleteUser(uid);
  } catch (error) {
    // Apenas auth/user-not-found é considerado sucesso idempotente
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

  // 3. Remove o perfil do Firestore após sucesso comprovado no Auth
  try {
    await profileRef.delete();
    return { success: true };
  } catch (firestoreError) {
    console.error('[deleteUser] Erro ao deletar perfil do Firestore:', firestoreError);
    throw new functions.https.HttpsError('internal', 'Usuário removido da autenticação, mas houve falha ao limpar o perfil no banco.');
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
exports.resendReceivingWebhook = onRequest({ cors: true, secrets: [RESEND_API_KEY, RESEND_WEBHOOK_SECRET, ORIGIN_SECRET] }, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, svix-id, svix-timestamp, svix-signature, x-origin-secret, x-cf-origin-token');
    return res.status(204).send('');
  }

  // 0. Bloqueio de acesso direto fora da Cloudflare
  const originCheck = validateOriginSecret(req);
  if (!originCheck.allowed) {
    console.warn('[resendReceivingWebhook] Tentativa de acesso direto bloqueada (sem header da Cloudflare)');
    return res.status(originCheck.statusCode || 403).json({ error: originCheck.error });
  }

  if (req.method === 'GET') {
    res.setHeader('Access-Control-Allow-Origin', '*');
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

const mapToHttpsError = (err) => {
  if (err && err.code && typeof err.code === 'string' && err.message) {
    const codeMap = {
      'unauthenticated': 'unauthenticated',
      'permission-denied': 'permission-denied',
      'invalid-argument': 'invalid-argument',
      'resource-exhausted': 'resource-exhausted',
      'not-found': 'not-found',
      'failed-precondition': 'failed-precondition',
      'deadline-exceeded': 'deadline-exceeded',
    };
    const httpsCode = codeMap[err.code] || 'internal';
    return new functions.https.HttpsError(httpsCode, err.message);
  }
  return new functions.https.HttpsError('internal', err?.message || 'Erro ao processar requisição de IA.');
};

/**
 * Endpoint Callable Seguro do Copiloto de IA Interno (Luisices)
 */
exports.aiAgentChat = onCall({ cors: true, timeoutSeconds: 120, memory: '1GiB', maxInstances: 10, secrets: [GEMINI_API_KEY] }, async (request) => {
  const rawKey = (typeof GEMINI_API_KEY?.value === 'function' ? GEMINI_API_KEY.value() : process.env.GEMINI_API_KEY) || '';
  const aiServices = createAiServices(admin, rawKey);
  try {
    return await aiServices.handlers.aiAgentChat(request);
  } catch (err) {
    throw mapToHttpsError(err);
  }
});

/**
 * Consulta a cota e o consumo do subsistema de IA
 */
exports.getAiUsage = onCall({ cors: true, maxInstances: 5, secrets: [GEMINI_API_KEY] }, async (request) => {
  const rawKey = (typeof GEMINI_API_KEY?.value === 'function' ? GEMINI_API_KEY.value() : process.env.GEMINI_API_KEY) || '';
  const aiServices = createAiServices(admin, rawKey);
  try {
    return await aiServices.handlers.getAiUsage(request);
  } catch (err) {
    throw mapToHttpsError(err);
  }
});

/**
 * Enriquecimento de itens da galeria com IA Vision
 */
exports.enrichGalleryItemWithAi = onCall({ cors: true, timeoutSeconds: 120, memory: '1GiB', maxInstances: 5, secrets: [GEMINI_API_KEY] }, async (request) => {
  const rawKey = (typeof GEMINI_API_KEY?.value === 'function' ? GEMINI_API_KEY.value() : process.env.GEMINI_API_KEY) || '';
  const aiServices = createAiServices(admin, rawKey);
  try {
    return await aiServices.handlers.enrichGalleryItemWithAi(request);
  } catch (err) {
    throw mapToHttpsError(err);
  }
});

/**
 * Enriquecimento de produtos da lojinha com IA Vision
 */
exports.enrichStoreProductWithAi = onCall({ cors: true, timeoutSeconds: 120, memory: '1GiB', maxInstances: 5, secrets: [GEMINI_API_KEY] }, async (request) => {
  const rawKey = (typeof GEMINI_API_KEY?.value === 'function' ? GEMINI_API_KEY.value() : process.env.GEMINI_API_KEY) || '';
  const aiServices = createAiServices(admin, rawKey);
  try {
    return await aiServices.handlers.enrichStoreProductWithAi(request);
  } catch (err) {
    throw mapToHttpsError(err);
  }
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
exports.evolutionWhatsAppWebhook = onRequest({ secrets: [EVOLUTION_API_KEY, ORIGIN_SECRET] }, async (req, res) => {
  // 0. Bloqueio de acesso direto fora da Cloudflare
  const originCheck = validateOriginSecret(req);
  if (!originCheck.allowed) {
    console.warn('[evolutionWhatsAppWebhook] Tentativa de acesso direto bloqueada (sem header da Cloudflare)');
    return res.status(originCheck.statusCode || 403).json({ error: originCheck.error });
  }

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

// ─── Checkout Público Confiável (Lojinha Online / Vitrine) ───────────────────
exports.submitPublicCatalogOrder = onCall({ cors: true, maxInstances: 10 }, async (request) => {
  // 1. Rate Limiting por IP para conter abusos e automações não autorizadas
  const clientIp = request.rawRequest?.ip || request.rawRequest?.headers?.['x-forwarded-for']?.split(',')?.[0]?.trim() || 'public_visitor';
  try {
    await publicCatalogOrderLimiter.consume(clientIp);
  } catch (_limiterErr) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Muitas tentativas de pedido em sequência. Por favor, aguarde alguns minutos antes de tentar novamente.'
    );
  }

  const data = request.data || {};
  const { items, customerNotes, submittedSubtotal, idempotencyKey } = data;

  // 2. Validação estrutural de entrada
  if (!Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'O carrinho de pedidos não pode estar vazio.');
  }
  if (items.length > 50) {
    throw new functions.https.HttpsError('invalid-argument', 'O limite máximo é de 50 itens distintos por pedido.');
  }

  // Chave de idempotência segura (se informada)
  const safeIdempotencyKey = idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.trim().length >= 8
    ? idempotencyKey.trim().slice(0, 100)
    : null;

  const db = admin.firestore();

  // 3. Validação do status da Lojinha no servidor (storeSettings/public)
  const settingsSnap = await db.doc('storeSettings/public').get();
  if (settingsSnap.exists) {
    const sData = settingsSnap.data() || {};
    if (sData.storePublished === false) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        sData.storeUnpublishMessage || 'A lojinha online está temporariamente indisponível para novos pedidos.'
      );
    }
    if (
      sData.catalogOrdersDisabled === true ||
      sData.catalogEnabled === false ||
      (sData.featureFlags && sData.featureFlags.enableOnlineOrders === false)
    ) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Os pedidos online estão desabilitados temporariamente. Entre em contato diretamente pelo WhatsApp.'
      );
    }
  } else {
    // Política fail-closed: se o documento de configuração não existir, não aceita pedidos
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Configuração da vitrine online não encontrada. A lojinha está temporariamente indisponível.'
    );
  }

  // 4. Validação e cálculo confiável dos produtos via storeProducts
  for (const item of items) {
    if (!item || typeof item.productId !== 'string' || !item.productId.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'Cada item deve possuir um productId válido.');
    }
  }

  // Deduplica IDs apenas para leitura eficiente do catálogo oficial (preserva linhas individuais de personalização)
  const uniqueProductIds = Array.from(new Set(items.map((i) => i.productId.trim())));
  const productsSnaps = await Promise.all(uniqueProductIds.map((pId) => db.doc(`storeProducts/${pId}`).get()));
  const productMap = new Map();
  for (const snap of productsSnaps) {
    if (snap.exists) {
      productMap.set(snap.id, snap.data());
    }
  }

  let computedSubtotal = 0;
  let totalItemsCount = 0;
  const verifiedItems = [];

  for (const item of items) {
    const trimmedPid = item.productId.trim();
    const pData = productMap.get(trimmedPid);
    if (!pData) {
      throw new functions.https.HttpsError('not-found', `Produto "${trimmedPid}" não encontrado no catálogo.`);
    }

    const computedStatus = pData.status || (pData.active === false ? 'hidden' : 'active');
    if (computedStatus === 'hidden' || computedStatus === 'paused') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `O produto "${pData.name || trimmedPid}" está indisponível para pedidos no momento.`
      );
    }

    const officialPrice = Number(pData.price ?? pData.unitPrice);
    if (!Number.isFinite(officialPrice) || officialPrice <= 0) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `O produto "${pData.name || trimmedPid}" possui valor inválido.`
      );
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `A quantidade para "${pData.name || trimmedPid}" deve ser um número inteiro entre 1 e 100.`
      );
    }

    const rawLead = pData.leadTimeDays;
    const leadTimeDays = rawLead !== undefined && rawLead !== null && !isNaN(Number(rawLead))
      ? Math.max(0, Number(rawLead))
      : 5;

    const itemSubtotal = officialPrice * quantity;
    computedSubtotal += itemSubtotal;
    totalItemsCount += quantity;

    const cleanItem = {
      productId: trimmedPid,
      productName: String(pData.name || 'Produto').slice(0, 150),
      price: officialPrice,
      quantity,
      leadTimeDays,
    };

    if (item.customName && typeof item.customName === 'string' && item.customName.trim()) {
      cleanItem.customName = item.customName.trim().slice(0, 200);
    }
    if (pData.imageUrl && typeof pData.imageUrl === 'string' && pData.imageUrl.trim()) {
      cleanItem.imageUrl = pData.imageUrl.trim();
    }

    verifiedItems.push(cleanItem);
  }

  computedSubtotal = Math.round(computedSubtotal * 100) / 100;

  // 5. Verificação de preço alterado entre a exibição e a confirmação
  if (submittedSubtotal !== undefined && submittedSubtotal !== null) {
    const diff = Math.abs(Number(submittedSubtotal) - computedSubtotal);
    if (diff > 0.05) {
      throw new functions.https.HttpsError(
        'aborted',
        `O valor do pedido foi atualizado (R$ ${computedSubtotal.toFixed(2)}). Por favor, revise o valor do seu carrinho antes de confirmar.`,
        { currentSubtotal: computedSubtotal, submittedSubtotal: Number(submittedSubtotal) }
      );
    }
  }

  // 6. Geração do código do pedido e gravação com verifiedByServer: true de forma atômica e idempotente
  const orderCode = `LJ-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = admin.firestore.Timestamp.now();

  const payloadForHash = JSON.stringify({
    items: verifiedItems.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      price: i.price,
      customName: i.customName || '',
      customTheme: i.customTheme || '',
    })),
    customerNotes: customerNotes && typeof customerNotes === 'string' ? customerNotes.trim().slice(0, 2000) : '',
    subtotal: computedSubtotal,
  });
  const payloadHash = crypto.createHash('sha256').update(payloadForHash).digest('hex');

  const docData = {
    orderCode,
    items: verifiedItems,
    totalItems: totalItemsCount,
    subtotal: computedSubtotal,
    officialSubtotal: computedSubtotal,
    submittedSubtotal: Number(submittedSubtotal) || computedSubtotal,
    isPriceTampered: false,
    verifiedByServer: true,
    payloadHash,
    status: 'received',
    createdAt: now,
    updatedAt: now,
  };

  if (customerNotes && typeof customerNotes === 'string' && customerNotes.trim()) {
    docData.customerNotes = customerNotes.trim().slice(0, 2000);
  }
  if (safeIdempotencyKey) {
    docData.idempotencyKey = safeIdempotencyKey;
  }

  // Se safeIdempotencyKey estiver presente, usa ID determinístico e transação atômica para eliminar race condition
  const orderDocId = safeIdempotencyKey
    ? `pub_${crypto.createHash('sha256').update(safeIdempotencyKey).digest('hex').slice(0, 24)}`
    : db.collection('catalogOrders').doc().id;

  const orderDocRef = db.collection('catalogOrders').doc(orderDocId);

  const result = await db.runTransaction(async (transaction) => {
    const existingDoc = await transaction.get(orderDocRef);
    if (existingDoc.exists) {
      const existingData = existingDoc.data();
      if (existingData.payloadHash && existingData.payloadHash !== payloadHash) {
        throw new functions.https.HttpsError(
          'already-exists',
          'A chave de idempotência fornecida já foi utilizada para um pedido com itens ou valores diferentes.'
        );
      }
      return {
        orderId: existingDoc.id,
        orderCode: existingData.orderCode,
        subtotal: existingData.subtotal,
        totalItems: existingData.totalItems,
        verifiedByServer: true,
        isIdempotentReplay: true,
      };
    }

    transaction.set(orderDocRef, docData);
    return {
      orderId: orderDocRef.id,
      orderCode,
      subtotal: computedSubtotal,
      totalItems: totalItemsCount,
      verifiedByServer: true,
      isIdempotentReplay: false,
    };
  });

  return result;
});

// ─── Integração Alexa (Voice Order Creation) ──────────────────────────────────
const alexaModule = require('./alexa');
exports.alexaWebhook = alexaModule.alexaWebhook;
exports.approveAlexaPairing = alexaModule.approveAlexaPairing;
exports.setAlexaPermission = alexaModule.setAlexaPermission;
exports.revokeAlexaBinding = alexaModule.revokeAlexaBinding;
exports.toggleGlobalAlexaIntegration = alexaModule.toggleGlobalAlexaIntegration;
exports.getAlexaIntegrationStatus = alexaModule.getAlexaIntegrationStatus;
exports.approveAlexaDraft = alexaModule.approveAlexaDraft;

// ─── Integração Alexa+ (Add-on & MCP Server) ─────────────────────────────────
const alexaPlusModule = require('./alexa-plus');
exports.alexaPlusMcp = alexaPlusModule.alexaPlusMcp;


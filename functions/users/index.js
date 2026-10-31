/**
 * Módulo de Gestão de Usuários, Convites e Autenticação (Cloud Functions v2).
 */

const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { HttpsError } = require('firebase-functions/v2/https');
const { onCall } = require('../common/sentryFunctions');
const { RESEND_API_KEY, EVOLUTION_API_KEY } = require('../common/secrets');
const { passwordResetLimiter } = require('../common/rateLimiters');
const userSyncService = require('./userSyncService');
const { validateProfileMcpScopes } = require('../mcp/profilePermissions');
const { consumeAdminUserAction } = require('./userAdminActions');
const { writeUserAudit } = require('./userAudit');
const helpers = require('../common/helpers');
const {
  getResend,
  sendWhatsAppMessage,
  getAppUrl,
  getNoReplySender,
  getContactEmail,
  formatActionLink,
  assertActiveSession,
  isAdminRequest,
  hashToken,
} = helpers;

const VALID_PERMISSION_MODULES = [
  'dashboard', 'orders', 'archivedOrders', 'customers', 'whatsapp',
  'aiCopilot', 'products', 'storeProducts', 'store', 'quotes',
  'gallery', 'exchanges', 'reports', 'settings', 'users', 'emails', 'pricing', 'mcpAccess', 'mcpScopes'
];

function sanitizeAndValidatePermissions(perms) {
  if (!perms || typeof perms !== 'object' || Array.isArray(perms)) {
    return {};
  }
  const clean = {};
  for (const key of Object.keys(perms)) {
    if (!VALID_PERMISSION_MODULES.includes(key)) {
      continue;
    }
    const val = perms[key];
    if (typeof val === 'boolean') {
      clean[key] = val;
    } else if (Array.isArray(val)) {
      if (key === 'mcpScopes') {
        clean[key] = val.filter((s) => typeof s === 'string' && s.length <= 64);
      }
    } else if (val && typeof val === 'object') {
      clean[key] = {
        view: val.view === true,
        create: val.create === true,
        edit: val.edit === true,
        delete: val.delete === true,
      };
    }
  }
  return clean;
}

/** Envia ao administrador um link seguro para redefinir a senha de outro usuário. */
const sendAdminPasswordReset = onCall(
  { maxInstances: 5, secrets: [RESEND_API_KEY, EVOLUTION_API_KEY] },
  async (request) => {
    if (!(await isAdminRequest(request))) {
      throw new HttpsError('permission-denied', 'Apenas administradores podem redefinir senhas.');
    }
    await consumeAdminUserAction(request.auth.uid);
    const { email } = request.data || {};
    if (!email || typeof email !== 'string') {
      throw new HttpsError('invalid-argument', 'E-mail do usuário é obrigatório.');
    }
    const resend = getResend(RESEND_API_KEY.value());
    if (!resend) throw new HttpsError('failed-precondition', 'Resend não configurado.');

    try {
      const rawResetLink = await getAuth().generatePasswordResetLink(email.trim(), {
        url: `${getAppUrl()}/action`,
        handleCodeInApp: true,
      });
      const resetLink = formatActionLink(rawResetLink);
      const [profileQuery, authUser] = await Promise.all([
        getFirestore().collection('userProfiles')
          .where('email', '==', email.trim().toLowerCase()).limit(1).get(),
        getAuth().getUserByEmail(email.trim()),
      ]);
      const phone = profileQuery.empty ? null : profileQuery.docs[0].data().whatsappPhone;
      const emailPromise = resend.emails.send({
        from: getNoReplySender(),
        to: [email.trim()],
        subject: 'Redefinição de senha - Luisices',
        html: `<p>Olá,</p><p>Um administrador solicitou a redefinição da senha da sua conta Luisices.</p><p><a href="${resetLink}">Definir nova senha</a></p><p>Este link expira em 1 hora e pode ser usado uma única vez.</p><p>Se você não esperava este e-mail, entre em contato com o administrador.</p>`,
      });
      const profilePromise = getFirestore().doc(`userProfiles/${authUser.uid}`).set({
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
      await writeUserAudit('ADMIN_PASSWORD_RESET_REQUESTED', request.auth.uid, authUser.uid);
      return { success: true };
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        throw new HttpsError('not-found', 'Usuário não encontrado.');
      }
      console.error('[sendAdminPasswordReset]', error);
      throw new HttpsError('internal', 'Não foi possível enviar o link de redefinição.');
    }
  }
);

/** Envia email de recuperação de senha via Resend */
const sendPasswordResetEmail = onCall(
  { maxInstances: 5, secrets: [RESEND_API_KEY, EVOLUTION_API_KEY] },
  async (request) => {
    const { email } = request.data || {};

    if (!email) {
      throw new HttpsError('invalid-argument', 'Email é obrigatório');
    }

    try {
      await passwordResetLimiter.consume(email.toLowerCase());
    } catch (rateLimiterRes) {
      const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000 / 60);
      console.warn(`[sendPasswordResetEmail] Rate limit excedido para: ${email}`);
      throw new HttpsError(
        'resource-exhausted',
        `Muitas tentativas. Tente novamente em ${retryAfter} minuto(s).`
      );
    }

    const resend = getResend(RESEND_API_KEY.value());
    if (!resend) {
      throw new HttpsError('failed-precondition', 'Resend não configurado');
    }

    try {
      const maskedEmail = typeof email === 'string' ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '***';
      console.log(`[sendPasswordResetEmail] Iniciando para: ${maskedEmail}`);

      const actionUrl = `${getAppUrl()}/action`;
      const rawResetLink = await getAuth().generatePasswordResetLink(email, {
        url: actionUrl,
      });
      const resetLink = formatActionLink(rawResetLink);
      const profileQuery = await getFirestore().collection('userProfiles')
        .where('email', '==', email.trim().toLowerCase()).limit(1).get();
      const phone = profileQuery.empty ? null : profileQuery.docs[0].data().whatsappPhone;

      const { data: emailData, error } = await resend.emails.send({
        from: getNoReplySender(),
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
                <p>Para suporte, entre em contato: ${getContactEmail()}</p>
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
        throw new HttpsError('internal', `Erro Resend: ${error.message || JSON.stringify(error)}`);
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
      throw new HttpsError('internal', 'Erro ao enviar email de recuperação');
    }
  }
);

/** Retorna datas de criação e último acesso do Firebase Auth para a lista administrativa. */
const getUserAccountMetadata = onCall({
  invoker: 'public',
  cors: true,
}, async (request) => {
  if (!(await isAdminRequest(request))) {
    throw new HttpsError('permission-denied', 'Apenas administradores podem consultar os dados das contas.');
  }
  const { uids } = request.data || {};
  if (!Array.isArray(uids) || uids.length > 100 || uids.some((uid) => typeof uid !== 'string' || uid.length > 128)) {
    throw new HttpsError('invalid-argument', 'Lista de usuários inválida.');
  }
  if (uids.length === 0) return { users: [] };

  const result = await getAuth().getUsers(uids.map((uid) => ({ uid })));
  return {
    users: result.users.map((user) => ({
      uid: user.uid,
      authCreatedAt: user.metadata.creationTime || null,
      lastSignInAt: user.metadata.lastSignInTime || null,
    })),
  };
});

/** Sincroniza e recupera custom claims de um usuário para garantir paridade com o Firestore. */
const syncUserClaims = async (uid) => {
  const profileDoc = await getFirestore().doc(`userProfiles/${uid}`).get();
  if (!profileDoc.exists) return null;
  const data = profileDoc.data();
  const claims = {
    role: data.role || 'user',
    active: data.active !== false,
  };
  await getAuth().setCustomUserClaims(uid, claims);
  return claims;
};

/**
 * Executa todas as etapas de sincronização pendentes registradas em claimsSyncPending.
 * Delega para userSyncService para garantir monotonicidade, lease e reconciliação.
 */
const executeClaimsRepair = async (uid) => {
  return await userSyncService.executeUserRepair({ uid });
};

/** Callable para reparo e sincronização de custom claims e revogações pendentes. */
const repairUserClaims = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Requer autenticação.');
  }

  const { uid } = request.data || {};
  if (!uid || typeof uid !== 'string') {
    throw new HttpsError('invalid-argument', 'UID do usuário é obrigatório.');
  }

  // Permite que o próprio usuário repare suas claims, ou que um admin repare de terceiros
  if (request.auth.uid !== uid) {
    if (!(await helpers.isAdminRequest(request))) {
      throw new HttpsError('permission-denied', 'Sem permissão para reparar credenciais de terceiros.');
    }
  }

  try {
    const result = await userSyncService.executeUserRepair({
      uid,
      actorUid: request.auth.uid,
    });
    const isSynced = (result.synced !== undefined ? result.synced : result.success) ?? true;
    return {
      success: isSynced,
      synced: isSynced,
      status: result.status,
      claims: result.claims,
      resumedRevocation: result.resumedRevocation,
      syncedVersion: result.syncedVersion,
      pendingSteps: result.pendingSteps,
    };
  } catch (err) {
    console.error(`[repairUserClaims] Falha no reparo do usuário ${uid}:`, err);
    throw new HttpsError('internal', 'Não foi possível concluir o reparo das credenciais.');
  }
});

/** Registra a troca de senha concluída pelo próprio usuário. */
const recordUserPasswordChange = onCall(async (request) => {
  await assertActiveSession(request);
  const profileRef = getFirestore().doc(`userProfiles/${request.auth.uid}`);
  await profileRef.set({ passwordChangedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { success: true };
});

/** Remove um usuário do Firebase Auth e do Firestore (apenas admin). */
const deleteUser = onCall(async (request) => {
  if (!(await isAdminRequest(request))) {
    throw new HttpsError('permission-denied', 'Apenas administradores podem remover usuários.');
  }
  await consumeAdminUserAction(request.auth.uid);
  const { uid } = request.data || {};
  if (!uid || typeof uid !== 'string') {
    throw new HttpsError('invalid-argument', 'UID do usuário é obrigatório.');
  }
  if (uid === request.auth.uid) {
    throw new HttpsError('failed-precondition', 'Você não pode remover sua própria conta de administrador.');
  }

  const profileRef = getFirestore().doc(`userProfiles/${uid}`);
  const profileSnap = await profileRef.get();

  if (profileSnap.exists && profileSnap.data()?.role === 'admin' && profileSnap.data()?.active !== false) {
    const admins = await getFirestore().collection('userProfiles').where('role', '==', 'admin').get();
    const activeAdmins = admins.docs.filter((doc) => doc.data().active !== false);
    if (activeAdmins.length <= 1) {
      throw new HttpsError('failed-precondition', 'O sistema precisa manter pelo menos um administrador ativo.');
    }
  }

  if (profileSnap.exists) {
    try {
      await profileRef.update({
        active: false,
        deletionStatus: 'in_progress',
        deletedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('[deleteUser] Falha ao desativar perfil antes da exclusão:', err);
      throw new HttpsError(
        'internal',
        `Não foi possível desativar o perfil do usuário para exclusão: ${err?.message || err}`
      );
    }
  }

  try {
    await getAuth().revokeRefreshTokens(uid);
  } catch (err) {
    if (err?.code !== 'auth/user-not-found') {
      console.warn('[deleteUser] Aviso ao revogar tokens:', err?.message || err);
    }
  }

  try {
    await getAuth().deleteUser(uid);
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
      throw new HttpsError(
        'internal',
        `Falha ao remover usuário do serviço de autenticação: ${error?.message || 'erro desconhecido'}. A conta permanece desativada e a exclusão pode ser retomada.`
      );
    }
  }

  try {
    await profileRef.delete();
    await writeUserAudit('USER_DELETED', request.auth.uid, uid);
    return { success: true };
  } catch (firestoreError) {
    console.error('[deleteUser] Erro ao deletar perfil do Firestore:', firestoreError);
    throw new HttpsError('internal', 'Usuário removido da autenticação, mas houve falha ao limpar o perfil no banco.');
  }
});

/** Cria um novo usuário via Firebase Auth e inicializa o perfil no Firestore (apenas admin). */
const createUser = onCall(async (request) => {
  if (!(await isAdminRequest(request))) {
    throw new HttpsError('permission-denied', 'Apenas administradores podem criar usuários.');
  }
  await consumeAdminUserAction(request.auth.uid);

  const { email, password, displayName, role, permissions } = request.data || {};

  if (!email || typeof email !== 'string' || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new HttpsError('invalid-argument', 'E-mail é obrigatório.');
  }
  if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw new HttpsError('invalid-argument', 'Senha deve ter entre 8 e 128 caracteres.');
  }
  if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 2 || displayName.trim().length > 120) {
    throw new HttpsError('invalid-argument', 'Nome é obrigatório.');
  }

  const allowedRoles = ['admin', 'funcionario', 'user'];
  if (!role || !allowedRoles.includes(role)) {
    throw new HttpsError('invalid-argument', 'Role inválido.');
  }
  if (permissions != null && (typeof permissions !== 'object' || Array.isArray(permissions))) {
    throw new HttpsError('invalid-argument', 'Permissões inválidas.');
  }

  const cleanPermissions = permissions ? sanitizeAndValidatePermissions(permissions) : {};

  try {
    validateProfileMcpScopes(cleanPermissions);
  } catch (err) {
    throw new HttpsError('invalid-argument', err.message);
  }
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = displayName.trim();

  try {
    const userRecord = await getAuth().createUser({
      email: normalizedEmail,
      password,
      displayName: normalizedName,
    });
    
    await getAuth().setCustomUserClaims(userRecord.uid, { role, active: true });

    const profile = {
      uid: userRecord.uid,
      email: normalizedEmail,
      displayName: normalizedName,
      role,
      permissions: cleanPermissions,
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: request.auth.uid,
      passwordChangedAt: userRecord.metadata.creationTime,
    };

    try {
      // Persiste createdAt como Timestamp para manter a ordenação de listUsers
      // consistente com os demais criadores de perfil; a resposta mantém a string ISO.
      await getFirestore().doc(`userProfiles/${userRecord.uid}`).set({
        ...profile,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (profileError) {
      await getAuth().deleteUser(userRecord.uid).catch((rollbackError) => {
        console.error('[createUser] Falha ao reverter usuário órfão:', rollbackError);
      });
      throw profileError;
    }
    await writeUserAudit('USER_CREATED', request.auth.uid, userRecord.uid, { role });

    return { success: true, uid: userRecord.uid, profile };
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Este e-mail já possui uma conta.');
    }
    if (error.code === 'auth/invalid-email') {
      throw new HttpsError('invalid-argument', 'E-mail inválido.');
    }
    if (error.code === 'auth/weak-password') {
      throw new HttpsError('invalid-argument', 'Senha muito fraca.');
    }
    console.error('[createUser] Error:', error);
    throw new HttpsError('internal', 'Não foi possível criar o usuário.');
  }
});

/** Atualiza perfil e status de usuário com proteção contra perda do último admin e reconciliação monotônica. */
const updateUser = onCall(async (request) => {
  if (!(await isAdminRequest(request))) {
    throw new HttpsError('permission-denied', 'Apenas administradores podem atualizar usuários.');
  }
  await consumeAdminUserAction(request.auth.uid);

  const { uid, displayName, role, permissions, active } = request.data || {};
  if (!uid || typeof uid !== 'string' || uid.length > 128) {
    throw new HttpsError('invalid-argument', 'UID do usuário é obrigatório.');
  }
  if (uid === request.auth.uid && (role !== undefined || active !== undefined)) {
    throw new HttpsError('failed-precondition', 'Você não pode alterar seu próprio perfil administrativo.');
  }
  if (displayName !== undefined && (typeof displayName !== 'string' || displayName.trim().length < 2 || displayName.trim().length > 120)) {
    throw new HttpsError('invalid-argument', 'Nome inválido.');
  }
  if (role !== undefined && !['admin', 'funcionario', 'user'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Role inválido.');
  }
  if (active !== undefined && typeof active !== 'boolean') {
    throw new HttpsError('invalid-argument', 'Status inválido.');
  }
  if (permissions !== undefined && (typeof permissions !== 'object' || permissions === null || Array.isArray(permissions))) {
    throw new HttpsError('invalid-argument', 'Permissões inválidas.');
  }

  const cleanUpdatedPermissions = permissions !== undefined ? sanitizeAndValidatePermissions(permissions) : undefined;

  try {
    const result = await userSyncService.updateUserProfile({
      uid,
      displayName,
      role,
      permissions: cleanUpdatedPermissions,
      active,
      actorUid: request.auth.uid,
    });
    return {
      success: true,
      synced: result.synced,
      status: result.status,
      version: result.version,
      pendingSteps: result.pendingSteps,
    };
  } catch (err) {
    if (err.code === 'invalid-argument') {
      throw new HttpsError('invalid-argument', err.message);
    }
    if (err.code === 'failed-precondition') {
      throw new HttpsError('failed-precondition', err.message);
    }
    if (err.code === 'not-found') {
      throw new HttpsError('not-found', err.message);
    }
    console.error(`[updateUser] Erro ao atualizar usuário ${uid}:`, err);
    throw new HttpsError(
      'internal',
      err.message || 'O perfil foi atualizado, mas houve falha na sincronização de credenciais/sessões. Reparo pendente.'
    );
  }
});

/** Revoga todas as sessões e tokens de um usuário (Apenas Admin). */
const revokeAllSessions = onCall(async (request) => {
  if (!(await isAdminRequest(request))) {
    throw new HttpsError('permission-denied', 'Apenas administradores podem revogar sessões.');
  }
  
  const { uid } = request.data || {};
  if (!uid || typeof uid !== 'string' || uid.length > 128) {
    throw new HttpsError('invalid-argument', 'UID é obrigatório.');
  }

  try {
    const result = await userSyncService.revokeUserSessions({
      uid,
      actorUid: request.auth.uid,
    });
    return {
      success: true,
      synced: result.synced,
      status: result.status,
      pendingSteps: result.pendingSteps,
      version: result.version,
    };
  } catch (err) {
    if (err.code === 'not-found') {
      throw new HttpsError('not-found', err.message);
    }
    console.error(`[revokeAllSessions] Erro crítico ao revogar sessões do usuário ${uid}:`, err);
    throw new HttpsError('internal', 'Falha ao revogar credenciais de autenticação no servidor.');
  }
});

/** Solicita logout ao dispositivo; revogação efetiva de tokens usa revokeAllSessions. */
const { requestDeviceLogout } = require('./deviceLogout');
const revokeDeviceSession = onCall(async (request) => requestDeviceLogout(request, {
  assertActiveSession,
  db: getFirestore(),
  timestamp: FieldValue.serverTimestamp,
}));

module.exports = {
  sendAdminPasswordReset,
  sendPasswordResetEmail,
  getUserAccountMetadata,
  recordUserPasswordChange,
  deleteUser,
  createUser,
  updateUser,
  revokeAllSessions,
  revokeDeviceSession,
  repairUserClaims,
  userSyncService,
  executeClaimsRepair,
};

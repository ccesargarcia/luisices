/**
 * Funções Callables (onCall) para administração e aprovação da integração Alexa.
 * Segue estritamente a especificação docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md (Seção 6).
 */

const admin = require('firebase-admin');
const { HttpsError } = require('firebase-functions/v2/https');
const { COLLECTIONS, recordAuditEvent } = require('./repository');
const { getAlexaConfig } = require('./config');
const { approveAlexaPairingAdmin } = require('./pairing');
const { commitOrderFromDraft } = require('./orderService');

/**
 * Helper para verificar se a requisição provém de um administrador ativo.
 */
async function assertActiveAdmin(authUid, db) {
  if (!authUid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
  }
  const snap = await db.collection(COLLECTIONS.USER_PROFILES).doc(authUid).get();
  if (!snap.exists || snap.data()?.role !== 'admin' || snap.data()?.active !== true) {
    throw new HttpsError('permission-denied', 'Apenas administradores ativos têm acesso a esta operação.');
  }
  return snap.data();
}

/**
 * Callable: approveAlexaPairing
 * Aprova o pareamento de voz observado pelo administrador e vincula ao usuário selecionado.
 */
async function approveAlexaPairingHandler(request, db) {
  const { code, targetUid } = request.data || {};
  const config = await getAlexaConfig(db);

  try {
    const result = await approveAlexaPairingAdmin({
      code,
      targetUid,
      authContext: request.auth,
      db,
      config,
    });
    return result;
  } catch (err) {
    throw new HttpsError('invalid-argument', err.message);
  }
}

/**
 * Callable: setAlexaPermission
 * Configura ou altera permissão e modo de voz para um usuário (apenas admin).
 */
async function setAlexaPermissionHandler(request, db) {
  await assertActiveAdmin(request.auth?.uid, db);
  const { uid, enabled, mode } = request.data || {};

  if (!uid || typeof uid !== 'string') {
    throw new HttpsError('invalid-argument', 'UID do usuário é obrigatório.');
  }

  const validMode = mode === 'app_approval' ? 'app_approval' : 'voice_confirm';

  await db.collection(COLLECTIONS.PERMISSIONS).doc(uid).set(
    {
      uid,
      enabled: Boolean(enabled),
      mode: validMode,
      scope: 'orders:create:self',
      approvedBy: request.auth.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await recordAuditEvent(db, {
    event: 'PERMISSION_UPDATED',
    uid,
    reason: `Permissão Alexa definida como enabled=${Boolean(enabled)}, mode=${validMode}`,
    success: true,
  });

  return { success: true, uid, enabled: Boolean(enabled), mode: validMode };
}

/**
 * Callable: revokeAlexaBinding
 * Revoga um vínculo ativo de voz. Permitido para administradores ou para o próprio titular.
 */
async function revokeAlexaBindingHandler(request, db) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const { bindingId } = request.data || {};
  if (!bindingId || typeof bindingId !== 'string') {
    throw new HttpsError('invalid-argument', 'ID do vínculo é obrigatório.');
  }

  const bindingRef = db.collection(COLLECTIONS.BINDINGS).doc(bindingId);
  const snap = await bindingRef.get();

  if (!snap.exists) {
    throw new HttpsError('not-found', 'Vínculo não encontrado.');
  }

  const data = snap.data() || {};
  const callerUid = request.auth.uid;

  // Verificar autorização: administrador ou o próprio titular do vínculo
  const callerProfile = await db.collection(COLLECTIONS.USER_PROFILES).doc(callerUid).get();
  const isAdmin = callerProfile.exists && callerProfile.data()?.role === 'admin' && callerProfile.data()?.active === true;
  const isOwner = data.uid === callerUid;

  if (!isAdmin && !isOwner) {
    throw new HttpsError('permission-denied', 'Você não tem permissão para revogar este vínculo.');
  }

  await bindingRef.update({
    active: false,
    revokedAt: admin.firestore.FieldValue.serverTimestamp(),
    revokedBy: callerUid,
  });

  await recordAuditEvent(db, {
    event: 'BINDING_REVOKED',
    uid: data.uid,
    bindingKey: bindingId,
    reason: `Revogado por ${callerUid}`,
    success: true,
  });

  return { success: true, bindingId };
}

/**
 * Callable: toggleGlobalAlexaIntegration
 * Ativa ou desativa a integração global da Alexa (apenas admin).
 */
async function toggleGlobalAlexaIntegrationHandler(request, db) {
  await assertActiveAdmin(request.auth?.uid, db);
  const { enabled } = request.data || {};

  await db.doc(COLLECTIONS.SETTINGS).set(
    {
      enabled: Boolean(enabled),
      updatedBy: request.auth.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { success: true, enabled: Boolean(enabled) };
}

/**
 * Callable: getAlexaIntegrationStatus
 * Retorna estado operacional da integração, vínculos ativos e solicitações pendentes.
 */
async function getAlexaIntegrationStatusHandler(request, db) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const callerUid = request.auth.uid;
  const config = await getAlexaConfig(db);

  const callerProfileSnap = await db.collection(COLLECTIONS.USER_PROFILES).doc(callerUid).get();
  const callerProfile = callerProfileSnap.exists ? callerProfileSnap.data() : {};
  const isAdmin = callerProfile.role === 'admin' && callerProfile.active === true;

  // Permissão do próprio usuário
  const userPermSnap = await db.collection(COLLECTIONS.PERMISSIONS).doc(callerUid).get();
  const userPerm = userPermSnap.exists ? userPermSnap.data() : null;

  // Permissão do usuário alvo (quando consultada por administrador)
  let targetPermission = null;
  if (isAdmin && request.data?.targetUid && typeof request.data.targetUid === 'string') {
    const targetPermSnap = await db.collection(COLLECTIONS.PERMISSIONS).doc(request.data.targetUid).get();
    targetPermission = targetPermSnap.exists ? targetPermSnap.data() : null;
  }

  // Solicitações pendentes de aprovação no app (modo app_approval)
  const draftsQuery = isAdmin
    ? db.collection(COLLECTIONS.DRAFTS).where('state', '==', 'awaiting_app_approval')
    : db.collection(COLLECTIONS.DRAFTS).where('state', '==', 'awaiting_app_approval').where('uid', '==', callerUid);

  const draftsSnap = await draftsQuery.limit(20).get();
  const pendingDrafts = draftsSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : null,
    expiresAt: d.data().expiresAt?.toDate ? d.data().expiresAt.toDate().toISOString() : null,
  }));

  // Vínculos
  let bindings = [];
  if (isAdmin) {
    const bindingsSnap = await db.collection(COLLECTIONS.BINDINGS).where('active', '==', true).limit(50).get();
    bindings = bindingsSnap.docs.map((d) => {
      const bData = d.data();
      return {
        id: d.id,
        uid: bData.uid,
        active: bData.active,
        environment: bData.environment,
        approvedBy: bData.approvedBy,
        approvedByEmail: bData.approvedByEmail,
        createdAt: bData.createdAt?.toDate ? bData.createdAt.toDate().toISOString() : null,
      };
    });
  } else {
    const bindingsSnap = await db.collection(COLLECTIONS.BINDINGS).where('uid', '==', callerUid).where('active', '==', true).limit(5).get();
    bindings = bindingsSnap.docs.map((d) => ({
      id: d.id,
      uid: callerUid,
      active: true,
      environment: d.data().environment,
      createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : null,
    }));
  }

  // Eventos recentes de auditoria (apenas admin)
  let recentAudit = [];
  if (isAdmin) {
    try {
      const auditSnap = await db.collection(COLLECTIONS.AUDIT).orderBy('timestamp', 'desc').limit(15).get();
      recentAudit = auditSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toDate ? d.data().timestamp.toDate().toISOString() : null,
      }));
    } catch {
      // Ignora erro se índice não estiver criado ainda
    }
  }

  return {
    environment: config.environment,
    isEnabled: config.isEnabled,
    allowedSkillIdConfigured: Boolean(config.allowedSkillId),
    timezone: config.timezone,
    userPermission: userPerm,
    targetPermission,
    bindings,
    pendingDrafts,
    recentAudit,
    isAdmin,
  };
}

/**
 * Callable: approveAlexaDraft
 * Aprova rascunho de pedido que estava aguardando aprovação no aplicativo (modo app_approval).
 * Apenas o titular do rascunho pode aprovar, exigindo a revisão visualizada.
 */
async function approveAlexaDraftHandler(request, db) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const { draftId, revision } = request.data || {};
  if (!draftId || typeof draftId !== 'string') {
    throw new HttpsError('invalid-argument', 'ID do rascunho é obrigatório.');
  }
  if (typeof revision !== 'number') {
    throw new HttpsError('invalid-argument', 'A revisão visualizada do rascunho é obrigatória.');
  }

  const config = await getAlexaConfig(db);
  if (!config.isEnabled) {
    throw new HttpsError('failed-precondition', 'A integração com a Alexa está desativada no momento neste ambiente.');
  }

  const draftRef = db.collection(COLLECTIONS.DRAFTS).doc(draftId);
  const draftSnap = await draftRef.get();

  if (!draftSnap.exists) {
    throw new HttpsError('not-found', 'Rascunho não encontrado.');
  }

  const draft = draftSnap.data() || {};
  if (draft.uid !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Você só pode aprovar pedidos criados para o seu próprio usuário.');
  }

  try {
    const result = await commitOrderFromDraft({
      draftId,
      callerPersonId: draft.personId,
      expectedRevision: revision,
      channel: 'app',
      config,
      db,
    });
    return result;
  } catch (err) {
    throw new HttpsError('failed-precondition', err.message);
  }
}

module.exports = {
  approveAlexaPairingHandler,
  setAlexaPermissionHandler,
  revokeAlexaBindingHandler,
  toggleGlobalAlexaIntegrationHandler,
  getAlexaIntegrationStatusHandler,
  approveAlexaDraftHandler,
};

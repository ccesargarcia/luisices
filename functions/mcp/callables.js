/**
 * Funções Callables (onCall) para o Painel Web de Gestão do MCP / ChatGPT - Luisices.
 * Suporta administradores e colaboradores com permissão mcpAccess (RBAC).
 */

const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { assertActiveSession } = require('../common/helpers');
const { COLLECTIONS, MCP_SCOPES, DEFAULT_RATE_LIMIT_PER_HOUR } = require('./constants');
const { generateApiKey, invalidateKeyCache, clearMcpAuthCache } = require('./auth');

/**
 * Validação de sessão do administrador estrito (para ações globais/elegibilidade).
 */
async function assertActiveAdmin(request) {
  const session = await assertActiveSession(request, { requiredRole: 'admin' });
  if (!session.profile || session.profile.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas administradores podem executar esta ação no MCP.');
  }
  return session.profile;
}

/**
 * Validação de sessão e permissão de usuário (admin ou colaborador com mcpAccess habilitado).
 */
async function assertActiveUserWithMcp(request) {
  const session = await assertActiveSession(request);
  const profile = session.profile;
  if (!profile || profile.active === false || profile.status === 'paused') {
    throw new HttpsError('permission-denied', 'Sua conta está inativa ou suspensa.');
  }

  const isAdmin = profile.role === 'admin';
  // Se não for admin, verifica se a permissão mcpAccess não foi desativada explicitamente
  if (!isAdmin && profile.permissions && profile.permissions.mcpAccess === false) {
    throw new HttpsError(
      'permission-denied',
      'Você não possui permissão para acessar as integrações de MCP/ChatGPT. Solicite liberação ao administrador.'
    );
  }

  return { profile, isAdmin };
}

/**
 * Determina o ambiente atual (dev vs prod).
 */
function getCurrentEnvironment() {
  const project = (process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '').trim();
  if (project === 'papelaria-dashboard') return 'prod';
  return 'dev';
}

/**
 * Retorna o status geral, chaves cadastradas e lista de membros para a interface.
 */
const getMcpSettingsStatus = onCall({ cors: true, maxInstances: 5 }, async (request) => {
  const { profile, isAdmin } = await assertActiveUserWithMcp(request);
  const db = getFirestore();
  const environment = getCurrentEnvironment();

  // 1. Status global
  const globalSnap = await db.collection(COLLECTIONS.SETTINGS).doc(COLLECTIONS.SETTINGS_DOC_MCP).get();
  const globalSettings = globalSnap.exists ? globalSnap.data() : { enabled: true };

  // 2. Chaves ativas (se admin, traz todas; se colaborador comum, traz apenas as dele)
  let keysQuery = db.collection(COLLECTIONS.KEYS);
  if (!isAdmin) {
    keysQuery = keysQuery.where('userId', '==', profile.uid);
  }
  const keysSnap = await keysQuery.get();
  const keys = keysSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      keyId: data.keyId || doc.id,
      keyPrefix: data.keyPrefix || 'lui_...',
      keyName: data.keyName || 'Chave de Acesso',
      userId: data.userId,
      userName: data.userName || 'Usuário',
      userRole: data.userRole || 'colaborador',
      enabled: data.enabled !== false,
      scopes: data.scopes || [],
      rateLimitPerHour: data.rateLimitPerHour || DEFAULT_RATE_LIMIT_PER_HOUR,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null,
      lastUsedAt: data.lastUsedAt ? (data.lastUsedAt.toDate ? data.lastUsedAt.toDate().toISOString() : data.lastUsedAt) : null,
      totalCalls: data.totalCalls || 0,
    };
  });

  // Ordena chaves por data de criação descrescente
  keys.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  // 3. Usuários da equipe para seleção no modal
  let teamMembers = [];
  if (isAdmin) {
    const usersSnap = await db.collection(COLLECTIONS.USERS).get();
    teamMembers = usersSnap.docs
      .map((doc) => {
        const u = doc.data();
        return {
          uid: doc.id,
          displayName: u.displayName || u.email || 'Sem Nome',
          email: u.email || '',
          role: u.role || 'funcionario',
          active: u.active !== false && u.status !== 'paused',
          mcpAccess: u.permissions?.mcpAccess !== false,
        };
      })
      .filter((u) => u.active);
  } else {
    teamMembers = [
      {
        uid: profile.uid,
        displayName: profile.displayName || profile.email || 'Eu',
        email: profile.email || '',
        role: profile.role || 'funcionario',
        active: true,
        mcpAccess: true,
      },
    ];
  }

  // 4. Filtra escopos se não for admin
  let availableScopes = Object.values(MCP_SCOPES);
  if (!isAdmin) {
    availableScopes = availableScopes.filter((s) => !s.requiresAdmin);
  }

  // Monta URL do endpoint com base no domínio customizado unificado
  const apiDomain = environment === 'prod' ? 'api.luisices.com.br' : 'api.dev.luisices.com.br';
  const endpointBaseUrl = `https://${apiDomain}/chatGptToolsEndpoint`;

  return {
    success: true,
    environment,
    globalEnabled: globalSettings.enabled !== false,
    endpointBaseUrl,
    openapiUrl: `${endpointBaseUrl}/openapi.json`,
    pluginManifestUrl: `https://${apiDomain}/.well-known/ai-plugin.json`,
    keys,
    availableScopes,
    teamMembers,
  };
});

/**
 * Cria uma nova chave de acesso com escopos granulares via interface.
 */
const createMcpApiKey = onCall({ cors: true, maxInstances: 5 }, async (request) => {
  const { profile, isAdmin } = await assertActiveUserWithMcp(request);
  const db = getFirestore();
  const environment = getCurrentEnvironment();

  let { userId, keyName, scopes, rateLimitPerHour } = request.data || {};

  // Se não for admin, força a criação exclusivamente para o próprio usuário
  if (!isAdmin) {
    userId = profile.uid;
  }

  if (!userId || typeof userId !== 'string') {
    throw new HttpsError('invalid-argument', 'O colaborador proprietário da chave é obrigatório.');
  }

  const cleanName = String(keyName || '').trim();
  if (!cleanName || cleanName.length < 3) {
    throw new HttpsError('invalid-argument', 'O nome de identificação da chave deve ter no mínimo 3 caracteres.');
  }

  // Validação do usuário no Firestore (coleção userProfiles)
  const userSnap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
  let userData = userSnap.exists ? userSnap.data() : null;

  if (!userData && userId === profile.uid) {
    userData = profile;
  } else if (!userData) {
    throw new HttpsError('not-found', 'Colaborador selecionado não encontrado no sistema.');
  }

  if (userData.active === false || userData.status === 'paused') {
    throw new HttpsError('failed-precondition', 'Não é possível criar chave para um colaborador inativo.');
  }

  // Habilita mcpAccess automaticamente se o admin gerar para um usuário que estava desativado
  if (isAdmin && userData.permissions && userData.permissions.mcpAccess === false) {
    await db.collection(COLLECTIONS.USERS).doc(userId).update({
      'permissions.mcpAccess': true,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Sanitização de escopos
  const validScopeIds = Object.values(MCP_SCOPES).map((s) => s.id);
  let cleanScopes = Array.isArray(scopes) ? scopes.filter((s) => validScopeIds.includes(s) || s === '*') : [];
  if (cleanScopes.length === 0) {
    cleanScopes = ['orders:read', 'customers:read', 'pricing:estimate'];
  }

  // Proteção: colaborador comum não pode ter escopos exclusivos de admin
  if (userData.role !== 'admin' || !isAdmin) {
    cleanScopes = cleanScopes.filter((scopeId) => {
      const scopeDef = Object.values(MCP_SCOPES).find((s) => s.id === scopeId);
      return !scopeDef?.requiresAdmin;
    });
  }

  // Geração criptográfica da chave
  const { rawKey, keyHash, keyId, keyPrefix } = generateApiKey(environment);
  const safeRateLimit = Math.max(10, Math.min(300, Number(rateLimitPerHour) || DEFAULT_RATE_LIMIT_PER_HOUR));

  const keyDocData = {
    keyId,
    keyHash,
    keyPrefix,
    keyName: cleanName,
    userId,
    userName: userData.displayName || userData.email || 'Usuário',
    userRole: userData.role || 'funcionario',
    enabled: true,
    scopes: cleanScopes,
    rateLimitPerHour: safeRateLimit,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: profile.uid || 'system',
    lastUsedAt: null,
    totalCalls: 0,
    environment,
  };

  await db.collection(COLLECTIONS.KEYS).doc(keyHash).set(keyDocData);

  return {
    success: true,
    rawKey,
    keyId,
    keyPrefix,
    keyName: cleanName,
    userName: keyDocData.userName,
    scopes: cleanScopes,
  };
});

/**
 * Alterna o estado liga/desliga de uma chave específica (inline toggle).
 */
const toggleMcpApiKey = onCall({ cors: true, maxInstances: 5 }, async (request) => {
  const { profile, isAdmin } = await assertActiveUserWithMcp(request);
  const db = getFirestore();
  const { keyId, enabled } = request.data || {};

  if (!keyId) {
    throw new HttpsError('invalid-argument', 'Identificador da chave não fornecido.');
  }

  const querySnap = await db.collection(COLLECTIONS.KEYS).where('keyId', '==', keyId).limit(1).get();
  if (querySnap.empty) {
    throw new HttpsError('not-found', 'Chave de acesso não localizada.');
  }

  const docSnap = querySnap.docs[0];
  const docRef = docSnap.ref;
  const keyHash = docSnap.id;
  const keyData = docSnap.data();

  // Colaborador comum só pode alterar suas próprias chaves
  if (!isAdmin && keyData.userId !== profile.uid) {
    throw new HttpsError('permission-denied', 'Você não tem permissão para alterar esta chave.');
  }

  const newEnabled = Boolean(enabled);
  await docRef.update({
    enabled: newEnabled,
    updatedAt: FieldValue.serverTimestamp(),
  });

  invalidateKeyCache(keyHash);

  return {
    success: true,
    keyId,
    enabled: newEnabled,
  };
});

/**
 * Revoga / exclui permanentemente uma chave de acesso.
 */
const revokeMcpApiKey = onCall({ cors: true, maxInstances: 5 }, async (request) => {
  const { profile, isAdmin } = await assertActiveUserWithMcp(request);
  const db = getFirestore();
  const { keyId } = request.data || {};

  if (!keyId) {
    throw new HttpsError('invalid-argument', 'Identificador da chave não fornecido.');
  }

  const querySnap = await db.collection(COLLECTIONS.KEYS).where('keyId', '==', keyId).limit(1).get();
  if (querySnap.empty) {
    throw new HttpsError('not-found', 'Chave de acesso não localizada.');
  }

  const docSnap = querySnap.docs[0];
  const docRef = docSnap.ref;
  const keyHash = docSnap.id;
  const keyData = docSnap.data();

  // Colaborador comum só pode revogar suas próprias chaves
  if (!isAdmin && keyData.userId !== profile.uid) {
    throw new HttpsError('permission-denied', 'Você não tem permissão para revogar esta chave.');
  }

  await docRef.delete();
  invalidateKeyCache(keyHash);

  return {
    success: true,
    keyId,
  };
});

/**
 * Alterna o interruptor global de integração MCP (Apenas Admin).
 */
const toggleGlobalMcp = onCall({ cors: true, maxInstances: 5 }, async (request) => {
  await assertActiveAdmin(request);
  const db = getFirestore();
  const { enabled } = request.data || {};

  const newEnabled = Boolean(enabled);

  await db.collection(COLLECTIONS.SETTINGS).doc(COLLECTIONS.SETTINGS_DOC_MCP).set(
    {
      enabled: newEnabled,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  clearMcpAuthCache();

  return {
    success: true,
    enabled: newEnabled,
  };
});

/**
 * Atualiza a elegibilidade de um usuário para utilizar MCP/ChatGPT (Apenas Admin).
 */
const setUserMcpEligibility = onCall({ cors: true, maxInstances: 5 }, async (request) => {
  await assertActiveAdmin(request);
  const db = getFirestore();
  const { targetUid, eligible } = request.data || {};

  if (!targetUid) {
    throw new HttpsError('invalid-argument', 'Identificador do usuário obrigatório.');
  }

  const newEligible = Boolean(eligible);

  await db
    .collection(COLLECTIONS.USERS)
    .doc(targetUid)
    .update({
      'permissions.mcpAccess': newEligible,
      updatedAt: FieldValue.serverTimestamp(),
    });

  clearMcpAuthCache();

  return {
    success: true,
    targetUid,
    eligible: newEligible,
  };
});

module.exports = {
  getMcpSettingsStatus,
  createMcpApiKey,
  toggleMcpApiKey,
  revokeMcpApiKey,
  toggleGlobalMcp,
  setUserMcpEligibility,
};

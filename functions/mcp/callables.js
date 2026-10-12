/**
 * Funções Callables (onCall) para o Painel Web de Gestão do MCP / ChatGPT - Luisices.
 * Restrito estritamente a administradores ativos do sistema (RBAC).
 */

const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { assertActiveSession } = require('../common/helpers');
const { COLLECTIONS, MCP_SCOPES, DEFAULT_RATE_LIMIT_PER_HOUR } = require('./constants');
const { generateApiKey, invalidateKeyCache, clearMcpAuthCache } = require('./auth');

/**
 * Validação de sessão do administrador.
 */
async function assertActiveAdmin(request) {
  const session = await assertActiveSession(request, { requiredRole: 'admin' });
  if (!session.profile || session.profile.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas administradores podem gerenciar chaves e integrações MCP.');
  }
  return session.profile;
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
  await assertActiveAdmin(request);
  const db = getFirestore();
  const environment = getCurrentEnvironment();

  // 1. Status global
  const globalSnap = await db.collection(COLLECTIONS.SETTINGS).doc(COLLECTIONS.SETTINGS_DOC_MCP).get();
  const globalSettings = globalSnap.exists ? globalSnap.data() : { enabled: true };

  // 2. Chaves ativas (sem vazar hashes ou segredos)
  const keysSnap = await db.collection(COLLECTIONS.KEYS).get();
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
  const usersSnap = await db.collection(COLLECTIONS.USERS).get();
  const teamMembers = usersSnap.docs
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

  // 4. Monta URL do endpoint com base no domínio customizado unificado
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
    availableScopes: Object.values(MCP_SCOPES),
    teamMembers,
  };
});

/**
 * Cria uma nova chave de acesso com escopos granulares via interface.
 */
const createMcpApiKey = onCall({ cors: true, maxInstances: 5 }, async (request) => {
  const adminProfile = await assertActiveAdmin(request);
  const db = getFirestore();
  const environment = getCurrentEnvironment();

  const { userId, keyName, scopes, rateLimitPerHour } = request.data || {};

  if (!userId || typeof userId !== 'string') {
    throw new HttpsError('invalid-argument', 'O colaborador proprietário da chave é obrigatório.');
  }

  const cleanName = String(keyName || '').trim();
  if (!cleanName || cleanName.length < 3) {
    throw new HttpsError('invalid-argument', 'O nome de identificação da chave deve ter no mínimo 3 caracteres.');
  }

  // Validação do usuário no Firestore
  const userSnap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
  if (!userSnap.exists) {
    throw new HttpsError('not-found', 'Colaborador selecionado não encontrado no sistema.');
  }
  const userData = userSnap.data();

  if (userData.active === false || userData.status === 'paused') {
    throw new HttpsError('failed-precondition', 'Não é possível criar chave para um colaborador inativo.');
  }

  if (userData.permissions && userData.permissions.mcpAccess === false) {
    throw new HttpsError('permission-denied', 'Este colaborador está configurado como sem permissão para usar MCP/ChatGPT.');
  }

  // Sanitização de escopos
  const validScopeIds = Object.values(MCP_SCOPES).map((s) => s.id);
  let cleanScopes = Array.isArray(scopes) ? scopes.filter((s) => validScopeIds.includes(s) || s === '*') : [];
  if (cleanScopes.length === 0) {
    // Escopo padrão seguro
    cleanScopes = ['orders:read', 'customers:read', 'pricing:estimate'];
  }

  // Proteção: colaborador comum não pode ter escopos exclusivos de admin
  if (userData.role !== 'admin') {
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
    createdBy: adminProfile.uid || 'admin',
    lastUsedAt: null,
    totalCalls: 0,
    environment,
  };

  await db.collection(COLLECTIONS.KEYS).doc(keyHash).set(keyDocData);

  // Retorna a chave raw UMA ÚNICA VEZ para exibição na UI
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
  await assertActiveAdmin(request);
  const db = getFirestore();
  const { keyId, enabled } = request.data || {};

  if (!keyId) {
    throw new HttpsError('invalid-argument', 'Identificador da chave não fornecido.');
  }

  // Localiza a chave pelo keyId
  const querySnap = await db.collection(COLLECTIONS.KEYS).where('keyId', '==', keyId).limit(1).get();
  if (querySnap.empty) {
    throw new HttpsError('not-found', 'Chave de acesso não localizada.');
  }

  const docRef = querySnap.docs[0].ref;
  const keyHash = querySnap.docs[0].id;
  const newEnabled = Boolean(enabled);

  await docRef.update({
    enabled: newEnabled,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Invalida cache em memória imediatamente
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
  await assertActiveAdmin(request);
  const db = getFirestore();
  const { keyId } = request.data || {};

  if (!keyId) {
    throw new HttpsError('invalid-argument', 'Identificador da chave não fornecido.');
  }

  const querySnap = await db.collection(COLLECTIONS.KEYS).where('keyId', '==', keyId).limit(1).get();
  if (querySnap.empty) {
    throw new HttpsError('not-found', 'Chave de acesso não localizada.');
  }

  const docRef = querySnap.docs[0].ref;
  const keyHash = querySnap.docs[0].id;

  await docRef.delete();

  // Invalida cache
  invalidateKeyCache(keyHash);

  return {
    success: true,
    keyId,
  };
});

/**
 * Alterna o interruptor global de integração MCP.
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
 * Atualiza a elegibilidade de um usuário para utilizar MCP/ChatGPT.
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

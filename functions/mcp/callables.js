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

  // 3. Sessões ativas de conexão MCP / ChatGPT (OAuth 2.1)
  let sessions = [];
  const now = Date.now();
  const activeSessionUserIds = new Set();

  try {
    let sessionsQuery = db.collection('oauthSessions');
    if (!isAdmin) {
      sessionsQuery = sessionsQuery.where('userId', '==', profile.uid);
    }
    const sessionsSnap = await sessionsQuery.get();

    for (const doc of sessionsSnap.docs) {
      const d = doc.data();
      const isExpired = d.expiresAt && typeof d.expiresAt === 'number' && d.expiresAt < now;
      if (d.active !== false && !d.revoked && !isExpired) {
        activeSessionUserIds.add(d.userId);
        sessions.push({
          sessionId: doc.id,
          userId: d.userId,
          userEmail: d.userEmail || '',
          userName: d.userName || d.userEmail || 'Usuário',
          userRole: d.userRole || 'funcionario',
          clientId: d.clientId || 'chatgpt-mcp',
          clientName: d.clientName || 'ChatGPT (OpenAI MCP)',
          scopes: d.scopes || [],
          active: true,
          revoked: false,
          createdAt: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt) : null,
          lastUsedAt: d.lastUsedAt ? (d.lastUsedAt.toDate ? d.lastUsedAt.toDate().toISOString() : d.lastUsedAt) : null,
          expiresAt: d.expiresAt || null,
          totalCalls: d.totalCalls || 0,
        });
      }
    }

    // Retrocompatibilidade / Fallback: Se existirem refresh tokens válidos criados antes da coleção oauthSessions
    let refreshQuery = db.collection('oauthRefreshTokens');
    if (!isAdmin) {
      refreshQuery = refreshQuery.where('userId', '==', profile.uid);
    }
    const refreshSnap = await refreshQuery.get();

    for (const rDoc of refreshSnap.docs) {
      const rData = rDoc.data();
      const isExpired = rData.expiresAt && typeof rData.expiresAt === 'number' && rData.expiresAt < now;
      if (rData.revoked || isExpired) continue;

      const sid = rData.sessionId || `sess_${rDoc.id.slice(-16)}`;
      const alreadyPresent = sessions.some((s) => s.sessionId === sid || s.sessionId === rDoc.id);
      if (!alreadyPresent) {
        activeSessionUserIds.add(rData.userId);

        let memberName = profile.displayName || profile.email || 'Usuário';
        let memberRole = profile.role || 'funcionario';
        if (rData.userId !== profile.uid) {
          const uSnap = await db.collection(COLLECTIONS.USERS).doc(rData.userId).get();
          if (uSnap.exists) {
            const uData = uSnap.data();
            memberName = uData.displayName || uData.email || 'Usuário';
            memberRole = uData.role || 'funcionario';
          }
        }

        const fallbackSession = {
          sessionId: sid,
          userId: rData.userId,
          userEmail: rData.userEmail || profile.email || '',
          userName: memberName,
          userRole: memberRole,
          clientId: rData.clientId || 'chatgpt-mcp',
          clientName: 'ChatGPT (OpenAI MCP)',
          scopes: rData.scopes || [],
          active: true,
          revoked: false,
          createdAt: rData.createdAt ? (rData.createdAt.toDate ? rData.createdAt.toDate().toISOString() : rData.createdAt) : new Date().toISOString(),
          lastUsedAt: rData.lastUsedAt ? (rData.lastUsedAt.toDate ? rData.lastUsedAt.toDate().toISOString() : rData.lastUsedAt) : null,
          expiresAt: rData.expiresAt || null,
          totalCalls: 0,
        };

        sessions.push(fallbackSession);

        // Salva na coleção oauthSessions para persistência e normalização
        db.collection('oauthSessions').doc(sid).set({
          ...fallbackSession,
          refreshToken: rDoc.id,
          accessToken: rData.accessToken || null,
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[MCP] Erro ao consultar sessões ativas:', err.message);
  }

  // Ordena sessões pela data de conexão (mais recentes primeiro)
  sessions.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  // Localiza sessão do usuário atual
  const myActiveSession = sessions.find((s) => s.userId === profile.uid && s.active) || null;
  const hasActiveMcpSession = Boolean(myActiveSession);

  // 4. Usuários da equipe para seleção no modal e monitoramento
  let teamMembers = [];
  if (isAdmin) {
    const usersSnap = await db.collection(COLLECTIONS.USERS).get();
    teamMembers = usersSnap.docs
      .map((doc) => {
        const u = doc.data();
        const hasSession = activeSessionUserIds.has(doc.id) || Boolean(u.mcpSessionActive);
        return {
          uid: doc.id,
          displayName: u.displayName || u.email || 'Sem Nome',
          email: u.email || '',
          role: u.role || 'funcionario',
          active: u.active !== false && u.status !== 'paused',
          mcpAccess: u.permissions?.mcpAccess !== false,
          mcpSessionActive: hasSession,
          lastMcpConnectedAt: u.lastMcpConnectedAt || null,
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
        mcpSessionActive: hasActiveMcpSession,
        lastMcpConnectedAt: myActiveSession?.createdAt || null,
      },
    ];
  }

  // 5. Filtra escopos se não for admin
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
    sessions,
    myActiveSession,
    hasActiveMcpSession,
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

/**
 * Revoga uma sessão ativa de conexão MCP / OAuth 2.1.
 * Tanto o próprio colaborador quanto qualquer Administrador podem revogar.
 */
const revokeMcpSession = onCall({ cors: true, maxInstances: 5 }, async (request) => {
  const { profile, isAdmin } = await assertActiveUserWithMcp(request);
  const db = getFirestore();
  const { sessionId, targetUid } = request.data || {};

  if (!sessionId && !targetUid) {
    throw new HttpsError('invalid-argument', 'Identificador da sessão MCP ou ID do usuário não informado.');
  }

  // Revogação de todas as sessões de um usuário específico (por targetUid)
  if (targetUid) {
    if (!isAdmin && targetUid !== profile.uid) {
      throw new HttpsError('permission-denied', 'Você não tem permissão para revogar a sessão de outro colaborador.');
    }

    const sessionsSnap = await db.collection('oauthSessions')
      .where('userId', '==', targetUid)
      .where('active', '==', true)
      .get();

    for (const doc of sessionsSnap.docs) {
      await doc.ref.update({
        active: false,
        revoked: true,
        revokedAt: FieldValue.serverTimestamp(),
        revokedBy: profile.uid,
      }).catch(() => {});
    }

    const accessSnap = await db.collection('oauthAccessTokens')
      .where('userId', '==', targetUid)
      .get();
    for (const doc of accessSnap.docs) {
      await doc.ref.update({ revoked: true, revokedAt: FieldValue.serverTimestamp() }).catch(() => {});
    }

    const refreshSnap = await db.collection('oauthRefreshTokens')
      .where('userId', '==', targetUid)
      .get();
    for (const doc of refreshSnap.docs) {
      await doc.ref.update({ revoked: true, revokedAt: FieldValue.serverTimestamp() }).catch(() => {});
    }

    clearMcpAuthCache();

    await db.collection(COLLECTIONS.USERS).doc(targetUid).update({
      mcpSessionActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    }).catch(() => {});

    return {
      success: true,
      targetUid,
      revoked: true,
      sessionsRevoked: sessionsSnap.size,
    };
  }

  // 1. Busca na coleção oauthSessions
  const sessionRef = db.collection('oauthSessions').doc(sessionId);
  const sessionSnap = await sessionRef.get();
  let sessionData = sessionSnap.exists ? sessionSnap.data() : null;

  // 2. Busca alternativa em oauthRefreshTokens (caso sessionId seja o refreshToken id ou fallback)
  if (!sessionData) {
    const refreshSnap = await db.collection('oauthRefreshTokens').doc(sessionId).get();
    if (refreshSnap.exists) {
      sessionData = refreshSnap.data();
      sessionData.sessionId = sessionId;
      sessionData.refreshToken = sessionId;
    }
  }

  // 3. Busca alternativa por query caso sessionId seja o accessToken
  if (!sessionData) {
    const tokenSnap = await db.collection('oauthAccessTokens').doc(sessionId).get();
    if (tokenSnap.exists) {
      sessionData = tokenSnap.data();
      sessionData.sessionId = sessionId;
      sessionData.accessToken = sessionId;
    }
  }

  if (!sessionData) {
    throw new HttpsError('not-found', 'Sessão MCP não localizada ou já encerrada.');
  }

  // 4. Verificação de permissão: usuário comum só pode revogar sua própria sessão
  if (!isAdmin && sessionData.userId !== profile.uid) {
    throw new HttpsError('permission-denied', 'Você não tem permissão para revogar a sessão de outro colaborador.');
  }

  // 5. Marca oauthSessions como revogada
  if (sessionSnap.exists) {
    await sessionRef.update({
      active: false,
      revoked: true,
      revokedAt: FieldValue.serverTimestamp(),
      revokedBy: profile.uid,
    });
  }

  // 6. Invalida tokens de acesso e refresh associados
  if (sessionData.accessToken) {
    await db.collection('oauthAccessTokens').doc(sessionData.accessToken).update({
      revoked: true,
      revokedAt: FieldValue.serverTimestamp(),
    }).catch(() => {});
  }
  if (sessionData.refreshToken) {
    await db.collection('oauthRefreshTokens').doc(sessionData.refreshToken).update({
      revoked: true,
      revokedAt: FieldValue.serverTimestamp(),
    }).catch(() => {});
  }

  // Invalida quaisquer tokens vinculados ao sessionId
  const matchingTokens = await db.collection('oauthAccessTokens').where('sessionId', '==', sessionId).get();
  for (const doc of matchingTokens.docs) {
    await doc.ref.update({ revoked: true, revokedAt: FieldValue.serverTimestamp() }).catch(() => {});
  }

  const matchingRefresh = await db.collection('oauthRefreshTokens').where('sessionId', '==', sessionId).get();
  for (const doc of matchingRefresh.docs) {
    await doc.ref.update({ revoked: true, revokedAt: FieldValue.serverTimestamp() }).catch(() => {});
  }

  clearMcpAuthCache();

  // 7. Atualiza o perfil do usuário caso não reste nenhuma sessão ativa
  const activeRemaining = await db.collection('oauthSessions')
    .where('userId', '==', sessionData.userId)
    .where('active', '==', true)
    .limit(1)
    .get();

  if (activeRemaining.empty) {
    await db.collection(COLLECTIONS.USERS).doc(sessionData.userId).update({
      mcpSessionActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    }).catch(() => {});
  }

  return {
    success: true,
    sessionId,
    userId: sessionData.userId,
    revoked: true,
  };
});

/**
 * Consulta histórico recente de logs de auditoria de chamadas do MCP (apenas Administradores).
 */
const getMcpAuditLogs = onCall(async (request) => {
  const session = await validateSession(request);
  const isAdmin = session.profile?.role === 'admin';
  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Apenas administradores podem consultar logs de auditoria do MCP.');
  }

  const db = getFirestore();
  const limitCount = Math.min(50, Math.max(5, Number(request.data?.limit) || 20));

  let snapshot;
  try {
    snapshot = await db
      .collection('mcpAuditLogs')
      .orderBy('timestamp', 'desc')
      .limit(limitCount)
      .get();
  } catch (_err) {
    // Fallback caso o índice composto não esteja pronto
    snapshot = await db
      .collection('mcpAuditLogs')
      .limit(limitCount)
      .get();
  }

  const logs = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      toolName: d.toolName || 'unknown',
      keyId: d.keyId || '',
      callerUid: d.callerUid || '',
      callerName: d.callerName || '',
      clientProtocol: d.clientProtocol || '',
      executionTimeMs: d.executionTimeMs || 0,
      success: d.success !== false,
      errorMessage: d.errorMessage || null,
      orderNumber: d.orderNumber || null,
      timestamp: d.timestamp?.toDate ? d.timestamp.toDate().toISOString() : d.timestamp || new Date().toISOString(),
    };
  });

  return {
    success: true,
    logs,
  };
});

module.exports = {
  getMcpSettingsStatus,
  createMcpApiKey,
  toggleMcpApiKey,
  revokeMcpApiKey,
  toggleGlobalMcp,
  setUserMcpEligibility,
  revokeMcpSession,
  getMcpAuditLogs,
};

/**
 * userSyncService.js
 * 
 * Serviço centralizado e transacional de sincronização de estado, claims e sessões.
 * 
 * Invariantes Garantidas:
 *  I1. A versão desejada de autorização (syncVersion) é estritamente monotônica crescente.
 *  I2. Uma atualização nova preserva etapas obrigatórias ainda pendentes (needsRevocation, needsClaims).
 *  I3. Somente a versão correspondente pode confirmar sua própria conclusão no Firestore.
 *  I4. Uma chamada não anuncia sincronização concluída enquanto houver trabalho obrigatório pendente.
 *  I5. Operação antiga não deixa autorização antiga como estado final (reconciliação iterativa bounded).
 *  I6. Retry de revogação não cria silenciosamente um novo evento de revogação (preserva corte original).
 *  I7. Falha em qualquer etapa externa deixa informação suficiente no Firestore para retomada.
 *  I8. Clientes não podem alterar marcadores de sincronização ou revogação.
 */

const defaultAdmin = require('firebase-admin');

const LEASE_TTL_MS = 15000; // 15 segundos de lease para processamento externo
const MAX_RECONCILIATION_ATTEMPTS = 3; // Limite de iterações do loop de reconciliação pós-escrita

/**
 * Sanitiza mensagens de erro para evitar vazamento de dados sensíveis ou PII nos logs/Firestore.
 */
function sanitizeErrorMessage(error) {
  if (!error) return 'Erro desconhecido';
  const msg = typeof error === 'string' ? error : (error.message || String(error));
  return msg
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/(bearer\s+)[^\s]+/gi, '$1[REDACTED_TOKEN]')
    .replace(/(api[_-]?key[:=]\s*)[^\s]+/gi, '$1[REDACTED_KEY]')
    .substring(0, 300);
}

/**
 * Cria ou obtém referências para os serviços injetados ou padrão.
 */
function getServices(deps = {}) {
  const admin = deps.admin || defaultAdmin;
  const firestore = deps.firestore || admin.firestore();
  const auth = deps.auth || admin.auth();
  const database = deps.database || (admin.database ? admin.database() : null);
  const now = deps.now || (() => Date.now());
  const generateOpId = deps.generateOpId || (() => firestore.collection('_').doc().id);

  return { admin, firestore, auth, database, now, generateOpId };
}

/**
 * Transação de atualização de perfil com proteção contra perda do último admin
 * e preservação monotônica de todas as pendências de segurança.
 */
async function updateUserProfile(params, deps = {}) {
  const { uid, displayName, role, permissions, active, actorUid } = params;
  const { firestore, now, generateOpId } = getServices(deps);

  if (!uid || typeof uid !== 'string') {
    throw new Error('UID inválido para atualização de usuário.');
  }

  const profileRef = firestore.doc(`userProfiles/${uid}`);
  const auditRef = firestore.collection('userAuditLogs').doc();
  const workerId = `worker_${generateOpId()}_${now()}`;

  // ─── 1. Fase Transacional no Firestore ─────────────────────────────────────
  const txResult = await firestore.runTransaction(async (transaction) => {
    const [profileSnap, adminsSnap] = await Promise.all([
      transaction.get(profileRef),
      transaction.get(firestore.collection('userProfiles').where('role', '==', 'admin')),
    ]);

    if (!profileSnap.exists) {
      const err = new Error('Perfil de usuário não encontrado.');
      err.code = 'not-found';
      throw err;
    }

    const current = profileSnap.data();
    const nextRole = role !== undefined ? role : (current.role || 'user');
    const nextActive = active !== undefined ? active : (current.active !== false);

    // Proteção estrita do último administrador ativo
    if (current.role === 'admin' && (nextRole !== 'admin' || nextActive !== true)) {
      const activeAdmins = adminsSnap.docs.filter((doc) => {
        const d = doc.data();
        return doc.id !== uid && d.active !== false && d.role === 'admin';
      });
      if (activeAdmins.length === 0) {
        const err = new Error('O sistema precisa manter pelo menos um administrador ativo.');
        err.code = 'failed-precondition';
        throw err;
      }
    }

    // Regras de Revogação:
    // 1. Mudança de status para inativo
    const isDeactivating = (active === false && current.active !== false);
    // 2. Mudança de role
    const isRoleChanged = (role !== undefined && role !== current.role);
    const requiresRevocationNow = isDeactivating || isRoleChanged;

    // Preservação de revogação pendente prévia (Cenário B)
    const wasRevocationPending = Boolean(
      current.claimsSyncPending &&
      typeof current.claimsSyncPending === 'object' &&
      current.claimsSyncPending.needsRevocation === true
    );
    const effectiveNeedsRevocation = requiresRevocationNow || wasRevocationPending;

    // Preservação de sincronização de claims pendente prévia (inclui marcador legado boolean true)
    const wasClaimsPending = Boolean(
      current.claimsSyncPending === true ||
      (current.claimsSyncPending &&
        typeof current.claimsSyncPending === 'object' &&
        current.claimsSyncPending.needsClaims === true)
    );
    const effectiveNeedsClaims = true; // updateUserProfile sempre define estado desejado de claims

    // Versão monotônica crescente (I1)
    const currentVersion = Number(current.syncVersion || current.claimsSyncPending?.version || 0);
    const nextVersion = currentVersion + 1;
    const opId = generateOpId();

    // Corte do evento original de revogação (I6)
    let originalRevocationTimeSeconds = current.claimsSyncPending?.originalRevocationTimeSeconds || current.tokensValidAfterTime || null;
    let originalRevocationTimeMs = current.claimsSyncPending?.originalRevocationTimeMs || (originalRevocationTimeSeconds ? originalRevocationTimeSeconds * 1000 : null);

    const updateData = {
      ...(displayName !== undefined ? { displayName: displayName.trim() } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(permissions !== undefined ? { permissions } : {}),
      ...(active !== undefined ? { active } : {}),
      syncVersion: nextVersion,
      updatedAt: defaultAdmin.firestore.FieldValue.serverTimestamp(),
      updatedBy: actorUid || 'system',
      claimsSyncPending: {
        version: nextVersion,
        opId,
        status: 'pending',
        needsRevocation: effectiveNeedsRevocation,
        needsClaims: effectiveNeedsClaims,
        completedSteps: {
          rtdbRevocation: false,
          devicesCleanup: false,
          authRevocation: false,
          authClaims: false,
        },
        originalRevocationTimeSeconds,
        originalRevocationTimeMs,
        syncedVersion: Number(current.syncedVersion || 0),
        lastError: null,
        attempts: 0,
        updatedAt: now(),
        lease: null,
      },
    };

    if (requiresRevocationNow) {
      if (wasRevocationPending && originalRevocationTimeMs) {
        // Retry ou continuação de operação com revogação pendente: preserva o timestamp do evento original (I6 / Problema 5)
        updateData.tokensValidAfterTime = originalRevocationTimeSeconds;
        updateData.claimsSyncPending.originalRevocationTimeSeconds = originalRevocationTimeSeconds;
        updateData.claimsSyncPending.originalRevocationTimeMs = originalRevocationTimeMs;
      } else {
        const nowSeconds = Math.floor(now() / 1000);
        const currentBarrier = Number(current.tokensValidAfterTime || 0);
        originalRevocationTimeSeconds = Math.max(currentBarrier, nowSeconds);
        originalRevocationTimeMs = now();
        updateData.tokensValidAfterTime = originalRevocationTimeSeconds;
        updateData.claimsSyncPending.originalRevocationTimeSeconds = originalRevocationTimeSeconds;
        updateData.claimsSyncPending.originalRevocationTimeMs = originalRevocationTimeMs;
      }
    } else if (wasRevocationPending && originalRevocationTimeSeconds) {
      // Preserva a barreira temporal original em retries cosméticos para não invalidar novos logins legítimos
      updateData.tokensValidAfterTime = originalRevocationTimeSeconds;
      updateData.claimsSyncPending.originalRevocationTimeSeconds = originalRevocationTimeSeconds;
      updateData.claimsSyncPending.originalRevocationTimeMs = originalRevocationTimeMs;
    }

    transaction.update(profileRef, updateData);
    transaction.create(auditRef, {
      action: 'USER_PROFILE_UPDATED',
      targetUid: uid,
      actorUid: actorUid || 'system',
      version: nextVersion,
      opId,
      changes: Object.keys(updateData).filter((k) => !['updatedAt', 'updatedBy', 'claimsSyncPending', 'syncVersion'].includes(k)),
      createdAt: defaultAdmin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      uid,
      version: nextVersion,
      opId,
      needsRevocation: effectiveNeedsRevocation,
      needsClaims: effectiveNeedsClaims,
      role: nextRole,
      active: nextActive,
    };
  });

  // ─── 2. Processamento e Reconciliação dos Efeitos Externos ──────────────────
  try {
    const syncResult = await processUserSync(uid, {
      workerId,
      expectedVersion: txResult.version,
      expectedOpId: txResult.opId,
    }, deps);

    const isFullyCompleted = syncResult.status === 'completed';

    return {
      success: true,
      status: syncResult.status,
      synced: isFullyCompleted,
      version: txResult.version,
      requestedVersion: txResult.version,
      currentVersion: syncResult.syncedVersion || txResult.version,
      pendingSteps: {
        revocation: txResult.needsRevocation && !isFullyCompleted,
        claims: txResult.needsClaims && !isFullyCompleted,
      },
      opId: txResult.opId,
    };
  } catch (syncErr) {
    console.error(`[userSyncService.updateUserProfile] Falha na sincronização externa para ${uid}:`, syncErr);
    await recordSyncFailure(uid, txResult.opId, txResult.version, syncErr, deps).catch(() => {});
    const err = new Error('O perfil foi atualizado no banco de dados, mas houve falha na sincronização externa de credenciais/sessões. Reparo pendente.');
    err.code = 'internal';
    err.details = {
      partialSuccess: true,
      uid,
      version: txResult.version,
      status: 'failed',
    };
    throw err;
  }
}

/**
 * Revoga todas as sessões, tokens e registros de presença de um usuário de forma atômica e versionada.
 * PRESERVA qualquer pendência prévia de claims (`needsClaims`) intacta (Problema 2 resolvido).
 */
async function revokeUserSessions(params, deps = {}) {
  const { uid, actorUid } = params;
  const { firestore, now, generateOpId } = getServices(deps);

  if (!uid || typeof uid !== 'string') {
    throw new Error('UID inválido para revogação de sessões.');
  }

  const profileRef = firestore.doc(`userProfiles/${uid}`);
  const auditRef = firestore.collection('userAuditLogs').doc();
  const workerId = `worker_revoke_${generateOpId()}_${now()}`;
  const nowSeconds = Math.floor(now() / 1000);
  const nowMs = now();

  const txResult = await firestore.runTransaction(async (transaction) => {
    const profileSnap = await transaction.get(profileRef);
    if (!profileSnap.exists) {
      const err = new Error('Perfil de usuário não encontrado.');
      err.code = 'not-found';
      throw err;
    }

    const current = profileSnap.data();
    const currentVersion = Number(current.syncVersion || current.claimsSyncPending?.version || 0);
    const nextVersion = currentVersion + 1;
    const opId = generateOpId();

    const currentBarrier = Number(current.tokensValidAfterTime || 0);
    const newBarrier = Math.max(currentBarrier, nowSeconds);

    const isRetry = Boolean(
      current.claimsSyncPending &&
      typeof current.claimsSyncPending === 'object' &&
      current.claimsSyncPending.needsRevocation === true &&
      current.claimsSyncPending.originalRevocationTimeMs
    );

    const originalRevocationTimeSeconds = isRetry
      ? (current.claimsSyncPending.originalRevocationTimeSeconds || currentBarrier || newBarrier)
      : newBarrier;
    const originalRevocationTimeMs = isRetry
      ? current.claimsSyncPending.originalRevocationTimeMs
      : nowMs;

    // Preservação estrita: se havia claims pendentes, NÃO descarta! (I2 / Problema 2 - inclusive marcador legado boolean true)
    const wasClaimsPending = Boolean(
      current.claimsSyncPending === true ||
      (current.claimsSyncPending &&
        typeof current.claimsSyncPending === 'object' &&
        current.claimsSyncPending.needsClaims === true)
    );

    const updateData = {
      tokensValidAfterTime: originalRevocationTimeSeconds,
      syncVersion: nextVersion,
      updatedAt: defaultAdmin.firestore.FieldValue.serverTimestamp(),
      updatedBy: actorUid || 'system',
      claimsSyncPending: {
        version: nextVersion,
        opId,
        status: 'pending',
        needsRevocation: true,
        needsClaims: wasClaimsPending, // Preserva needsClaims anterior!
        completedSteps: {
          rtdbRevocation: false,
          devicesCleanup: false,
          authRevocation: false,
          authClaims: !wasClaimsPending,
        },
        originalRevocationTimeSeconds,
        originalRevocationTimeMs,
        syncedVersion: Number(current.syncedVersion || 0),
        lastError: null,
        attempts: 0,
        updatedAt: nowMs,
        lease: null,
      },
    };

    transaction.update(profileRef, updateData);
    transaction.create(auditRef, {
      action: 'ALL_SESSIONS_REVOKED',
      targetUid: uid,
      actorUid: actorUid || 'system',
      revocationTimeSeconds: newBarrier,
      version: nextVersion,
      opId,
      createdAt: defaultAdmin.firestore.FieldValue.serverTimestamp(),
    });

    return { uid, version: nextVersion, opId, needsClaims: wasClaimsPending };
  });

  try {
    const syncResult = await processUserSync(uid, {
      workerId,
      expectedVersion: txResult.version,
      expectedOpId: txResult.opId,
    }, deps);

    const isFullyCompleted = syncResult.status === 'completed';

    return {
      success: true,
      status: syncResult.status,
      synced: isFullyCompleted,
      version: txResult.version,
      requestedVersion: txResult.version,
      currentVersion: syncResult.syncedVersion || txResult.version,
      pendingSteps: {
        revocation: !isFullyCompleted,
        claims: txResult.needsClaims && !isFullyCompleted,
      },
      opId: txResult.opId,
    };
  } catch (syncErr) {
    console.error(`[userSyncService.revokeUserSessions] Falha ao executar etapas externas para ${uid}:`, syncErr);
    await recordSyncFailure(uid, txResult.opId, txResult.version, syncErr, deps).catch(() => {});
    const err = new Error('Falha ao concluir a revogação externa de credenciais/sessões. Reparo pendente.');
    err.code = 'internal';
    err.details = {
      partialSuccess: true,
      uid,
      version: txResult.version,
      status: 'failed',
    };
    throw err;
  }
}

/**
 * Executa o reparo e sincronização de custom claims ou revogações pendentes.
 * Respeita leases ativos (não passa force=true incondicionalmente - Problema 4 resolvido).
 */
async function executeUserRepair(params, deps = {}) {
  const { uid } = params;
  const { firestore, auth, now, generateOpId } = getServices(deps);

  if (!uid || typeof uid !== 'string') {
    throw new Error('UID inválido para reparo.');
  }

  const profileRef = firestore.doc(`userProfiles/${uid}`);
  const profileDoc = await profileRef.get();

  if (!profileDoc.exists) {
    return { claims: null, resumedRevocation: false, synced: false, status: 'not-found' };
  }

  const data = profileDoc.data();
  const marker = data.claimsSyncPending;

  // Se for marcador legado boolean true, converte transacionalmente antes de processar
  if (marker === true) {
    await convertLegacyMarker(uid, deps);
  } else if (!marker) {
    // Ausência de marcador não prova que contas legadas possuem claims corretas.
    // Compare o Auth com o perfil atual; crie trabalho durável sem atropelar
    // uma atualização/lease que tenha surgido durante a chamada ao Auth.
    const authUser = await auth.getUser(uid);
    const preparation = await firestore.runTransaction(async (tx) => {
      const currentSnap = await tx.get(profileRef);
      if (!currentSnap.exists) return { status: 'not-found' };
      const current = currentSnap.data();
      if (current.claimsSyncPending) return { status: 'pending' };
      const desired = { role: current.role || 'user', active: current.active !== false };
      if (authUser.customClaims?.role === desired.role && authUser.customClaims?.active === desired.active) {
        return { status: 'already-synced', claims: desired, version: Number(current.syncVersion || 0) };
      }

      const version = Number(current.syncVersion || 0) + 1;
      tx.update(profileRef, {
        syncVersion: version,
        claimsSyncPending: {
          version,
          opId: `repair_${generateOpId()}`,
          status: 'pending',
          needsClaims: true,
          needsRevocation: false,
          completedSteps: { rtdbRevocation: false, devicesCleanup: false, authRevocation: false, authClaims: false },
          originalRevocationTimeSeconds: null,
          originalRevocationTimeMs: null,
          attempts: 0,
          updatedAt: now(),
          lease: null,
        },
      });
      return { status: 'pending' };
    });

    if (preparation.status === 'not-found') {
      return { claims: null, resumedRevocation: false, synced: false, status: 'not-found' };
    }
    if (preparation.status === 'already-synced') {
      return {
        success: true, synced: true, status: 'already-synced',
        claims: preparation.claims, resumedRevocation: false,
        version: preparation.version, syncedVersion: preparation.version,
        pendingSteps: { revocation: false, claims: false },
      };
    }
  }

  const workerId = `repair_${generateOpId()}_${now()}`;
  // force=false respeita leases ativos de outros workers!
  const syncResult = await processUserSync(uid, { workerId, force: false }, deps);

  const updatedSnap = await profileRef.get();
  const updatedData = updatedSnap.data() || {};

  const isCompleted = syncResult.status === 'completed';

  return {
    success: isCompleted,
    status: syncResult.status,
    claims: {
      role: updatedData.role || 'user',
      active: updatedData.active !== false,
    },
    resumedRevocation: syncResult.revokedSessions === true,
    syncedVersion: updatedData.syncedVersion || updatedData.syncVersion || 0,
    synced: isCompleted,
    version: updatedData.syncVersion || 0,
    pendingSteps: {
      revocation: Boolean(updatedData.claimsSyncPending?.needsRevocation),
      claims: Boolean(updatedData.claimsSyncPending?.needsClaims),
    },
  };
}

/**
 * Converte marcador legado (claimsSyncPending: true) para marcador estruturado de forma atômica e segura.
 * Se uma operação mais recente já tiver gravado um marcador estruturado, NÃO altera nem remove o novo.
 */
async function convertLegacyMarker(uid, deps = {}) {
  const { firestore, now, generateOpId } = getServices(deps);
  const profileRef = firestore.doc(`userProfiles/${uid}`);

  return await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(profileRef);
    if (!snap.exists) return { converted: false };

    const data = snap.data();
    if (data.claimsSyncPending !== true) {
      return { converted: false, reason: 'not-legacy' };
    }

    const currentVersion = Number(data.syncVersion || 0);
    const nextVersion = currentVersion + 1;
    const opId = `migrated_${generateOpId()}`;

    const structuredMarker = {
      version: nextVersion,
      opId,
      status: 'pending',
      needsRevocation: false,
      needsClaims: true,
      completedSteps: {
        rtdbRevocation: false,
        devicesCleanup: false,
        authRevocation: false,
        authClaims: false,
      },
      originalRevocationTimeSeconds: null,
      originalRevocationTimeMs: null,
      syncedVersion: currentVersion,
      lastError: null,
      attempts: 0,
      updatedAt: now(),
      lease: null,
    };

    tx.update(profileRef, {
      syncVersion: nextVersion,
      claimsSyncPending: structuredMarker,
      updatedAt: defaultAdmin.firestore.FieldValue.serverTimestamp(),
    });

    return { converted: true, version: nextVersion, opId };
  });
}

/**
 * Processador central de sincronização externa com lease e reconciliação pós-escrita iterativa.
 */
async function processUserSync(uid, options = {}, deps = {}) {
  const { firestore, auth, database, now } = getServices(deps);
  const { workerId, expectedVersion, expectedOpId, force = false } = options;
  const profileRef = firestore.doc(`userProfiles/${uid}`);

  // ─── FASE 1: Aquisição do Lease de Processamento na Transação do Firestore ───
  const leaseResult = await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(profileRef);
    if (!snap.exists) return { action: 'not-found' };

    const data = snap.data();
    const marker = data.claimsSyncPending;

    // Se já estiver 100% sincronizado (sem marker)
    if (!marker) {
      return { action: 'already-synced', data };
    }

    // Se for boolean true legado, converte para estruturado
    if (marker === true) {
      const v = Number(data.syncVersion || 0) + 1;
      const op = `legacy_${now()}`;
      const newMarker = {
        version: v,
        opId: op,
        status: 'processing',
        needsRevocation: false,
        needsClaims: true,
        completedSteps: {
          rtdbRevocation: false,
          devicesCleanup: false,
          authRevocation: false,
          authClaims: false,
        },
        originalRevocationTimeSeconds: null,
        originalRevocationTimeMs: null,
        syncedVersion: Number(data.syncedVersion || 0),
        lastError: null,
        attempts: 1,
        updatedAt: now(),
        lease: { workerId, expiresAt: now() + LEASE_TTL_MS },
      };
      tx.update(profileRef, {
        syncVersion: v,
        claimsSyncPending: newMarker,
      });
      return { action: 'acquired', marker: newMarker, data: { ...data, syncVersion: v } };
    }

    // Verifica se outra operação mais recente já substituiu a que esperávamos (Cenário D)
    if (expectedVersion && marker.version && marker.version > expectedVersion) {
      if (!force) {
        return { action: 'superseded', newerVersion: marker.version, currentVersion: data.syncVersion };
      }
    }

    // Verifica lease existente (Cenário C - Proteção de concorrência)
    const currentTime = now();
    if (
      !force &&
      marker.status === 'processing' &&
      marker.lease &&
      marker.lease.expiresAt > currentTime &&
      marker.lease.workerId !== workerId
    ) {
      return { action: 'locked', expiresAt: marker.lease.expiresAt, currentWorker: marker.lease.workerId };
    }

    // Adquire o lease
    const updatedMarker = {
      ...marker,
      status: 'processing',
      attempts: (marker.attempts || 0) + 1,
      updatedAt: currentTime,
      lease: {
        workerId,
        expiresAt: currentTime + LEASE_TTL_MS,
      },
    };

    tx.update(profileRef, {
      claimsSyncPending: updatedMarker,
    });

    return { action: 'acquired', marker: updatedMarker, data };
  });

  if (leaseResult.action !== 'acquired') {
    return {
      status: leaseResult.action,
      result: leaseResult,
      syncedVersion: leaseResult.data?.syncedVersion || leaseResult.data?.syncVersion || 0,
    };
  }

  const activeMarker = leaseResult.marker;
  const currentProfileData = leaseResult.data;
  const completedSteps = activeMarker.completedSteps || {};
  let revokedSessions = false;

  // ─── FASE 2: Execução das Etapas Externas Fora da Transação ────────────────
  try {
    // Etapa 2.1: Revogação de Sessões (RTDB, Dispositivos no Firestore, Refresh Tokens no Auth)
    if (activeMarker.needsRevocation === true) {
      // A. Realtime Database (preserva o timestamp do evento de revogação original - Cenário E)
      if (database && !completedSteps.rtdbRevocation) {
        try {
          const cutOffMs = activeMarker.originalRevocationTimeMs ||
            (activeMarker.originalRevocationTimeSeconds ? activeMarker.originalRevocationTimeSeconds * 1000 : null) ||
            now();

          await Promise.all([
            database.ref(`status/${uid}`).remove(),
            database.ref(`revocations/${uid}`).transaction((currentVal) => {
              return Math.max(currentVal || 0, cutOffMs);
            }),
          ]);
          completedSteps.rtdbRevocation = true;
        } catch (rtdbErr) {
          console.error(`[processUserSync] Falha no RTDB para ${uid}:`, rtdbErr);
          throw rtdbErr;
        }
      }

      // B. Dispositivos cadastrados no Firestore (Limpeza física de dispositivos)
      if (!completedSteps.devicesCleanup) {
        const devicesRef = firestore.collection(`userProfiles/${uid}/devices`);
        const devSnap = await devicesRef.get();
        if (!devSnap.empty) {
          const batch = firestore.batch();
          devSnap.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
        }
        completedSteps.devicesCleanup = true;
      }

      // C. Revogar Refresh Tokens no Firebase Auth
      if (!completedSteps.authRevocation) {
        await auth.revokeRefreshTokens(uid);
        completedSteps.authRevocation = true;
      }
      revokedSessions = true;
    }

    // Etapa 2.2: Sincronização de Custom Claims no Firebase Auth
    if (activeMarker.needsClaims !== false && !completedSteps.authClaims) {
      const claimsToSet = {
        role: currentProfileData.role || 'user',
        active: currentProfileData.active !== false,
      };
      await auth.setCustomUserClaims(uid, claimsToSet);
      completedSteps.authClaims = true;
    }
  } catch (externalErr) {
    console.error(`[processUserSync] Erro na chamada externa para ${uid}:`, externalErr);
    await recordSyncFailure(uid, activeMarker.opId, activeMarker.version, externalErr, completedSteps, deps).catch(() => {});
    throw externalErr;
  }

  // ─── FASE 3: Finalização e Reconciliação Monotônica Bounded (Cenários A, F, G) ─
  let attempt = 0;
  let currentFinalizeVersion = activeMarker.version;

  while (attempt < MAX_RECONCILIATION_ATTEMPTS) {
    attempt++;

    let finalizeResult;
    try {
      finalizeResult = await firestore.runTransaction(async (tx) => {
        const snap = await tx.get(profileRef);
        if (!snap.exists) return { status: 'not-found' };

        const current = snap.data();
        const currentMarker = current.claimsSyncPending;

        // Caso de Sucesso Ideal (apenas na 1ª tentativa): a versão e opId do banco ainda correspondem à nossa operação
        if (
          attempt === 1 &&
          currentMarker &&
          currentMarker.version === activeMarker.version &&
          currentMarker.opId === activeMarker.opId
        ) {
          tx.update(profileRef, {
            syncedVersion: activeMarker.version,
            claimsSyncPending: defaultAdmin.firestore.FieldValue.delete(),
          });
          return { status: 'completed', version: activeMarker.version };
        }

        // Cenário de Divergência (Cenário A): Uma nova versão foi criada enquanto o worker executava
        const latestVersion = Number(current.syncVersion || currentMarker?.version || 0);
        return {
          status: 'diverged',
          latestVersion,
          latestRole: current.role || 'user',
          latestActive: current.active !== false,
          currentMarker,
        };
      });
    } catch (finalizeTxErr) {
      // Cenário F: Falha ao confirmar no Firestore
      console.error(`[processUserSync] Falha na transação de finalização no Firestore para ${uid}:`, finalizeTxErr);
      await recordSyncFailure(uid, activeMarker.opId, currentFinalizeVersion, finalizeTxErr, deps).catch(() => {});
      throw finalizeTxErr;
    }

    if (finalizeResult.status === 'completed') {
      return {
        status: 'completed',
        syncedVersion: activeMarker.version,
        revokedSessions,
      };
    }

    if (finalizeResult.status === 'diverged') {
      // Se em iterações subsequentes a versão no Firestore for a mesma que já acabamos de reconciliar no Auth:
      if (attempt > 1 && finalizeResult.latestVersion === currentFinalizeVersion) {
        // Reconciliação convergente estável: o Auth já possui as claims da versão mais recente!
        // Não apagamos o marcador da outra versão (preserva pendências da nova versão - I2, I3).
        return {
          status: 'reconciled',
          syncedVersion: currentFinalizeVersion,
          revokedSessions,
        };
      }

      console.warn(`[processUserSync] Divergência detectada para ${uid} (iteração ${attempt}): processada ${currentFinalizeVersion} vs mais recente ${finalizeResult.latestVersion}. Reconciliando...`);

      // Cenário G: Se a escrita de reconciliação falhar, o erro é registrado no Firestore
      try {
        await auth.setCustomUserClaims(uid, {
          role: finalizeResult.latestRole,
          active: finalizeResult.latestActive,
        });
      } catch (reconcileErr) {
        console.error(`[processUserSync] Falha durante escrita de reconciliação para ${uid}:`, reconcileErr);
        await recordSyncFailure(uid, finalizeResult.currentMarker?.opId || activeMarker.opId, finalizeResult.latestVersion, reconcileErr, deps).catch(() => {});
        throw reconcileErr;
      }

      currentFinalizeVersion = finalizeResult.latestVersion;
      // Loop continua para verificar se uma terceira atualização (ex: C) não chegou enquanto gravávamos a reconciliação!
    } else {
      return finalizeResult;
    }
  }

  // Se excedeu o limite máximo de tentativas de reconciliação consecutivas
  return {
    status: 'reconciled',
    syncedVersion: currentFinalizeVersion,
    revokedSessions,
  };
}

/**
 * Registra falha de sincronização sem dados sensíveis e libera o lease para retries.
 */
async function recordSyncFailure(uid, opId, version, error, completedSteps = null, deps = {}) {
  // Trata deslocamento se deps for passado no 4º argumento
  if (completedSteps && typeof completedSteps === 'object' && !('rtdbRevocation' in completedSteps) && !deps.firestore) {
    deps = completedSteps;
    completedSteps = null;
  }

  const { firestore, now } = getServices(deps);
  const profileRef = firestore.doc(`userProfiles/${uid}`);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(profileRef);
    if (!snap.exists) return;

    const data = snap.data();
    const marker = data.claimsSyncPending;

    // Só atualiza se o marker ainda pertencer a esta mesma operação ou versão
    if (marker && (marker.opId === opId || marker.version === version)) {
      tx.update(profileRef, {
        claimsSyncPending: {
          ...marker,
          status: 'failed',
          ...(completedSteps ? { completedSteps: { ...marker.completedSteps, ...completedSteps } } : {}),
          lastError: sanitizeErrorMessage(error),
          updatedAt: now(),
          lease: null, // Libera lease para que o próximo retry possa tentar
        },
      });
    }
  });
}

module.exports = {
  LEASE_TTL_MS,
  MAX_RECONCILIATION_ATTEMPTS,
  sanitizeErrorMessage,
  updateUserProfile,
  revokeUserSessions,
  executeUserRepair,
  convertLegacyMarker,
  processUserSync,
};

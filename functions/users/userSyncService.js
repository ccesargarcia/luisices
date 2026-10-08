/**
 * userSyncService.js
 * 
 * Serviço centralizado e transacional de sincronização de estado, claims e sessões.
 * Garante:
 * 1. Monotonicidade e convergência de permissões e custom claims no Firebase Auth.
 * 2. Preservação de revogações pendentes sob concorrência e retries.
 * 3. Reconciliação pós-escrita que impede que operações atrasadas deixem claims antigas.
 * 4. Recuperabilidade de falhas parciais sem polling e sem infraestrutura adicional.
 * 5. Migração atômica de marcadores legados sem risco de sobrescrever operações mais novas.
 */

const defaultAdmin = require('firebase-admin');

const LEASE_TTL_MS = 15000; // 15 segundos de lease para processamento externo

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
 * e preservação monotônica de pendências de segurança.
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

  // 1. Fase Transacional no Firestore
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
    // 1. Mudança efetiva de status para inativo
    const isDeactivating = (active === false && current.active !== false);
    // 2. Mudança efetiva de role
    const isRoleChanged = (role !== undefined && role !== current.role);
    const requiresRevocationNow = isDeactivating || isRoleChanged;

    // 3. Preservação de revogação pendente prévia (Cenário B e retries)
    const wasRevocationPending = Boolean(
      current.claimsSyncPending &&
      typeof current.claimsSyncPending === 'object' &&
      current.claimsSyncPending.needsRevocation === true
    );
    const effectiveNeedsRevocation = requiresRevocationNow || wasRevocationPending;

    // Versão monotônica crescente
    const currentVersion = Number(current.syncVersion || current.claimsSyncPending?.version || 0);
    const nextVersion = currentVersion + 1;
    const opId = generateOpId();

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
        needsClaims: true,
        syncedVersion: Number(current.syncedVersion || 0),
        lastError: null,
        attempts: 0,
        updatedAt: now(),
        lease: null,
      },
    };

    // Atualização monotônica da barreira temporal tokensValidAfterTime
    if (requiresRevocationNow) {
      const nowSeconds = Math.floor(now() / 1000);
      const currentBarrier = Number(current.tokensValidAfterTime || 0);
      updateData.tokensValidAfterTime = Math.max(currentBarrier, nowSeconds);
    } else if (wasRevocationPending && current.tokensValidAfterTime) {
      // Preserva o carimbo da revogação original em retries cosméticos para não invalidar novos logins legítimos
      updateData.tokensValidAfterTime = current.tokensValidAfterTime;
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
      role: nextRole,
      active: nextActive,
    };
  });

  // 2. Processamento e Reconciliação dos Efeitos Externos
  try {
    const syncResult = await processUserSync(uid, {
      workerId,
      expectedVersion: txResult.version,
      expectedOpId: txResult.opId,
    }, deps);

    return {
      success: true,
      version: txResult.version,
      synced: syncResult.status === 'completed',
    };
  } catch (syncErr) {
    console.error(`[userSyncService.updateUserProfile] Falha na sincronização externa para ${uid}:`, syncErr);
    // Registra falha na estrutura persistida para reparo posterior seguro
    await recordSyncFailure(uid, txResult.opId, txResult.version, syncErr, deps).catch(() => {});
    const err = new Error('O perfil foi atualizado no banco de dados, mas houve falha na sincronização externa de credenciais/sessões. Reparo pendente.');
    err.code = 'internal';
    err.details = { partialSuccess: true, uid, version: txResult.version };
    throw err;
  }
}

/**
 * Revoga todas as sessões, tokens e registros de presença de um usuário de forma atômica e versionada.
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

    const updateData = {
      tokensValidAfterTime: newBarrier,
      syncVersion: nextVersion,
      updatedAt: defaultAdmin.firestore.FieldValue.serverTimestamp(),
      updatedBy: actorUid || 'system',
      claimsSyncPending: {
        version: nextVersion,
        opId,
        status: 'pending',
        needsRevocation: true,
        needsClaims: false, // Apenas revogação, sem alteração de cargos
        syncedVersion: Number(current.syncedVersion || 0),
        lastError: null,
        attempts: 0,
        updatedAt: now(),
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

    return { uid, version: nextVersion, opId };
  });

  try {
    await processUserSync(uid, {
      workerId,
      expectedVersion: txResult.version,
      expectedOpId: txResult.opId,
    }, deps);

    return { success: true, version: txResult.version };
  } catch (syncErr) {
    console.error(`[userSyncService.revokeUserSessions] Falha ao executar etapas externas para ${uid}:`, syncErr);
    await recordSyncFailure(uid, txResult.opId, txResult.version, syncErr, deps).catch(() => {});
    const err = new Error('Falha ao concluir a revogação externa de credenciais/sessões. Reparo pendente.');
    err.code = 'internal';
    throw err;
  }
}

/**
 * Executa o reparo e sincronização de custom claims ou revogações pendentes.
 */
async function executeUserRepair(params, deps = {}) {
  const { uid } = params;
  const { firestore, now, generateOpId } = getServices(deps);

  if (!uid || typeof uid !== 'string') {
    throw new Error('UID inválido para reparo.');
  }

  const profileRef = firestore.doc(`userProfiles/${uid}`);
  const profileDoc = await profileRef.get();

  if (!profileDoc.exists) {
    return { claims: null, resumedRevocation: false, synced: false };
  }

  const data = profileDoc.data();
  const marker = data.claimsSyncPending;

  // Se for marcador legado boolean true, converte transacionalmente antes de processar
  if (marker === true) {
    await convertLegacyMarker(uid, deps);
  }

  const workerId = `repair_${generateOpId()}_${now()}`;
  const syncResult = await processUserSync(uid, { workerId, force: true }, deps);

  const updatedSnap = await profileRef.get();
  const updatedData = updatedSnap.data() || {};

  return {
    success: true,
    claims: {
      role: updatedData.role || 'user',
      active: updatedData.active !== false,
    },
    resumedRevocation: syncResult.revokedSessions === true,
    syncedVersion: updatedData.syncedVersion || updatedData.syncVersion || 0,
    synced: syncResult.status === 'completed',
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
    // Verifica se AINDA é estritamente o marcador legado boolean true
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
      needsRevocation: false, // Política conservadora: não desloga usuário em massa sem certeza
      needsClaims: true,
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
 * Processador central de sincronização externa com lease e reconciliação pós-escrita.
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

    // Verifica se outra operação mais recente já substituiu a que esperávamos
    if (expectedVersion && marker.version && marker.version > expectedVersion) {
      // Uma versão mais recente foi criada. Se não for forçado, não processa versão obsoleta.
      if (!force) {
        return { action: 'superseded', newerVersion: marker.version };
      }
    }

    // Verifica lease existente
    const currentTime = now();
    if (
      !force &&
      marker.status === 'processing' &&
      marker.lease &&
      marker.lease.expiresAt > currentTime &&
      marker.lease.workerId !== workerId
    ) {
      return { action: 'locked', expiresAt: marker.lease.expiresAt };
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
    return { status: leaseResult.action, result: leaseResult };
  }

  const activeMarker = leaseResult.marker;
  const currentProfileData = leaseResult.data;
  let revokedSessions = false;

  // ─── FASE 2: Execução das Etapas Externas Fora da Transação ────────────────
  try {
    // Etapa 2.1: Revogação de Sessões (RTDB, Dispositivos no Firestore, Refresh Tokens no Auth)
    if (activeMarker.needsRevocation === true) {
      // A. Realtime Database (Remover presença e fixar revokedAt monotônico)
      if (database) {
        try {
          await Promise.all([
            database.ref(`status/${uid}`).remove(),
            database.ref(`revocations/${uid}`).set(now()),
          ]);
        } catch (rtdbErr) {
          console.error(`[processUserSync] Falha no RTDB para ${uid}:`, rtdbErr);
          throw rtdbErr;
        }
      }

      // B. Dispositivos cadastrados no Firestore (Limpeza física de dispositivos)
      const devicesRef = firestore.collection(`userProfiles/${uid}/devices`);
      const devSnap = await devicesRef.get();
      if (!devSnap.empty) {
        const batch = firestore.batch();
        devSnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }

      // C. Revogar Refresh Tokens no Firebase Auth
      await auth.revokeRefreshTokens(uid);
      revokedSessions = true;
    }

    // Etapa 2.2: Sincronização de Custom Claims no Firebase Auth
    if (activeMarker.needsClaims !== false) {
      const claimsToSet = {
        role: currentProfileData.role || 'user',
        active: currentProfileData.active !== false,
      };
      await auth.setCustomUserClaims(uid, claimsToSet);
    }
  } catch (externalErr) {
    // Registra falha na etapa externa mantendo a pendência intacta para retries futuros
    console.error(`[processUserSync] Erro na chamada externa para ${uid}:`, externalErr);
    await recordSyncFailure(uid, activeMarker.opId, activeMarker.version, externalErr, deps).catch(() => {});
    throw externalErr;
  }

  // ─── FASE 3: Finalização e Reconciliação Monotônica no Firestore (Cenário A) ─
  const finalizeResult = await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(profileRef);
    if (!snap.exists) return { status: 'not-found' };

    const current = snap.data();
    const currentMarker = current.claimsSyncPending;

    // Caso de Sucesso Ideal: a versão do banco ainda bate exatamente com a nossa versão processada
    if (
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

    // Cenário de Divergência (Cenário A): Uma nova operação gravou uma versão superior enquanto o worker estava em voo!
    return {
      status: 'diverged',
      latestVersion: Number(current.syncVersion || currentMarker?.version || 0),
      latestRole: current.role || 'user',
      latestActive: current.active !== false,
      currentMarker,
    };
  });

  // Se ocorreu divergência (Cenário A), este worker DEVE reconciliar com a versão mais recente!
  if (finalizeResult.status === 'diverged') {
    console.warn(`[processUserSync] Divergência detectada para ${uid}: versão processada ${activeMarker.version} vs mais recente ${finalizeResult.latestVersion}. Reconciliando...`);
    
    // Regrava imediatamente as claims correspondentes à versão mais recente
    await auth.setCustomUserClaims(uid, {
      role: finalizeResult.latestRole,
      active: finalizeResult.latestActive,
    });

    // Se a versão mais recente não possuía novas etapas pendentes além das claims,
    // atualizamos syncedVersion sem sobrescrever o marcador mais recente
    await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(profileRef);
      if (!snap.exists) return;
      const cur = snap.data();
      if (cur.syncVersion === finalizeResult.latestVersion) {
        tx.update(profileRef, {
          syncedVersion: finalizeResult.latestVersion,
        });
      }
    }).catch(() => {});

    return {
      status: 'reconciled',
      syncedVersion: finalizeResult.latestVersion,
      revokedSessions,
    };
  }

  return {
    status: 'completed',
    syncedVersion: activeMarker.version,
    revokedSessions,
  };
}

/**
 * Registra falha de sincronização sem dados sensíveis e libera o lease para retries.
 */
async function recordSyncFailure(uid, opId, version, error, deps = {}) {
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
  sanitizeErrorMessage,
  updateUserProfile,
  revokeUserSessions,
  executeUserRepair,
  convertLegacyMarker,
  processUserSync,
};

/**
 * Fluxo de Pareamento Supervisionado da Alexa.
 * Segue estritamente a especificação docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md (Seção 4.2).
 */

const crypto = require('crypto');
const admin = require('firebase-admin');
const { COLLECTIONS, computeCodeHash, computeBindingKey, recordAuditEvent } = require('./repository');
const { checkPairingRateLimit } = require('./rateLimit');

/**
 * Gera desafio de 8 dígitos na presença do administrador para vincular a voz.
 * Nunca gera desafio se personId estiver ausente.
 *
 * @param {object} envelope - Requisição Alexa contendo context.System
 * @param {object} config - Configuração de ambiente resolvida
 * @param {admin.firestore.Firestore} db - Instância Firestore
 * @returns {Promise<{ speech: string, shouldEndSession: boolean, error?: string }>}
 */
async function handleVoicePairingRequest(envelope, config, db) {
  // 0. Integração habilitada no ambiente
  if (config?.isEnabled === false) {
    return {
      speech: 'A integração com a Alexa está desativada no momento neste ambiente.',
      shouldEndSession: true,
    };
  }

  const system = envelope?.context?.System || envelope?.session?.System || {};
  const personId = system?.person?.personId;
  const amazonUserId = system?.user?.userId;
  const deviceId = system?.device?.deviceId;

  // 1. Sem personId -> Bloquear imediatamente
  if (!personId) {
    return {
      speech:
        'Não reconheci sua voz. Para iniciar a vinculação, crie ou configure seu perfil de voz no aplicativo Alexa e tente novamente.',
      shouldEndSession: true,
    };
  }

  // 2. Rate limit por aparelho/usuário (máximo 5 pareamentos por hora)
  const rateLimitId = deviceId || amazonUserId || 'unknown_device';
  const rateCheck = await checkPairingRateLimit(db, rateLimitId);
  if (!rateCheck.allowed) {
    return {
      speech: 'Muitas tentativas de vinculação para este aparelho. Aguarde uma hora antes de tentar novamente.',
      shouldEndSession: true,
    };
  }

  // 3. Gerar código aleatório de 8 dígitos (criptograficamente seguro)
  const randomNum = crypto.randomInt(10000000, 99999999);
  const code = String(randomNum);
  const codeHmac = computeCodeHash(code, config.hmacKey);

  const bindingKey = computeBindingKey(
    config.environment,
    config.allowedSkillId,
    amazonUserId,
    personId,
    config.hmacKey
  );

  const now = Date.now();
  const ttlMs = (config.pairingCodeTtlMinutes || 5) * 60 * 1000;
  const expiresAt = new Date(now + ttlMs);

  // 4. Salvar desafio em alexaPairings/{codeHmac}
  await db.collection(COLLECTIONS.PAIRINGS).doc(codeHmac).set({
    bindingKey,
    environment: config.environment,
    allowedSkillId: config.allowedSkillId || null,
    amazonUserIdHash: crypto.createHash('sha256').update(amazonUserId || '').digest('hex'),
    personIdHash: crypto.createHash('sha256').update(personId || '').digest('hex'),
    deviceId: deviceId || null,
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    consumedAt: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await recordAuditEvent(db, {
    event: 'PAIRING_CHALLENGE_GENERATED',
    bindingKey,
    environment: config.environment,
    durationMs: 0,
    success: true,
  });

  // 5. Falar dígitos separadamente para fácil compreensão
  const spokenCode = code.split('').join(', ');
  const speech = `Seu código de vinculação é: ${spokenCode}. Informe este código ao administrador no Luisices em até cinco minutos.`;

  return {
    speech,
    shouldEndSession: true,
  };
}

/**
 * Callable administrativo para aprovar o código de vinculação e associar ao UID desejado.
 * Somente administradores autenticados e ativos podem executar.
 */
async function approveAlexaPairingAdmin({ code, targetUid, authContext, db, config }) {
  if (!authContext || !authContext.uid) {
    throw new Error('Não autenticado.');
  }

  // 0. Verificar se a integração está ativada no ambiente
  if (config?.isEnabled === false) {
    throw new Error('A integração com a Alexa está desativada no momento neste ambiente.');
  }

  // 1. Validar se o solicitante é administrador ativo
  const adminSnap = await db.collection(COLLECTIONS.USER_PROFILES).doc(authContext.uid).get();
  if (!adminSnap.exists || adminSnap.data()?.role !== 'admin' || adminSnap.data()?.active !== true) {
    throw new Error('Apenas administradores ativos podem aprovar a vinculação de voz.');
  }

  if (!code || typeof code !== 'string' || !/^\d{8}$/.test(code.trim())) {
    throw new Error('Código de vinculação inválido. Deve conter 8 dígitos numéricos.');
  }

  if (!targetUid || typeof targetUid !== 'string') {
    throw new Error('UID do usuário de destino é obrigatório.');
  }

  // 2. Validar perfil do usuário alvo
  const targetSnap = await db.collection(COLLECTIONS.USER_PROFILES).doc(targetUid).get();
  if (!targetSnap.exists) {
    throw new Error('Usuário de destino não encontrado no Luisices.');
  }
  const targetData = targetSnap.data() || {};
  if (targetData.active !== true) {
    throw new Error('O usuário selecionado está inativo no sistema.');
  }

  // Deve ter permissão para criar pedidos
  const canCreate = targetData.role === 'admin' || targetData.permissions?.orders?.create === true;
  if (!canCreate) {
    throw new Error('O usuário selecionado não possui permissão para criar pedidos (orders.create).');
  }

  const codeHmac = computeCodeHash(code.trim(), config.hmacKey);
  const pairingRef = db.collection(COLLECTIONS.PAIRINGS).doc(codeHmac);

  // 3. Transação atômica para consumir o desafio e criar o vínculo
  return db.runTransaction(async (transaction) => {
    // Revalidar interruptor global no Firestore
    const settingsRef = typeof db.doc === 'function'
      ? db.doc('integrationSettings/alexa')
      : db.collection('integrationSettings').doc('alexa');
    const settingsSnap = await transaction.get(settingsRef);
    if (settingsSnap.exists && settingsSnap.data()?.enabled === false) {
      throw new Error('A integração com a Alexa está desativada no momento.');
    }

    const pSnap = await transaction.get(pairingRef);
    if (!pSnap.exists) {
      throw new Error('Código de vinculação não encontrado ou inválido.');
    }

    const pData = pSnap.data() || {};
    if (pData.consumedAt != null) {
      throw new Error('Este código de vinculação já foi utilizado.');
    }

    const now = Date.now();
    const expiresAt = pData.expiresAt?.toDate ? pData.expiresAt.toDate().getTime() : 0;
    if (expiresAt <= now) {
      throw new Error('Este código de vinculação expirou. Solicite um novo código na Alexa.');
    }

    if (pData.environment && pData.environment !== config.environment) {
      throw new Error(`Código gerado no ambiente ${pData.environment}, incompatível com ${config.environment}.`);
    }

    const bindingKey = pData.bindingKey;
    if (!bindingKey) {
      throw new Error('Dados de vínculo inválidos no desafio de pareamento.');
    }

    const bindingRef = db.collection(COLLECTIONS.BINDINGS).doc(bindingKey);
    const permRef = db.collection(COLLECTIONS.PERMISSIONS).doc(targetUid);

    // Todas as leituras antes das escritas (Firestore exige essa ordem)
    const existingPermSnap = await transaction.get(permRef);
    const existingMode = existingPermSnap.exists ? existingPermSnap.data()?.mode : null;
    const finalMode = existingMode || 'voice_confirm';

    // Consumir o pareamento
    transaction.update(pairingRef, {
      consumedAt: admin.firestore.FieldValue.serverTimestamp(),
      consumedBy: authContext.uid,
      assignedUid: targetUid,
    });

    // Criar ou atualizar o vínculo
    transaction.set(
      bindingRef,
      {
        bindingKey,
        uid: targetUid,
        active: true,
        environment: config.environment,
        allowedSkillId: config.allowedSkillId || null,
        approvedBy: authContext.uid,
        approvedByEmail: authContext.email || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        revokedAt: null,
        allowedDeviceIds: [],
        lastPairingDeviceId: pData.deviceId || null,
      },
      { merge: true }
    );

    // Habilitar a permissão Alexa do usuário, preservando o modo existente se houver
    transaction.set(
      permRef,
      {
        uid: targetUid,
        enabled: true,
        mode: finalMode,
        scope: 'orders:create:self',
        approvedBy: authContext.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      success: true,
      bindingKey,
      targetUid,
      targetName: targetData.displayName || targetData.email,
    };
  });
}

module.exports = {
  handleVoicePairingRequest,
  approveAlexaPairingAdmin,
};

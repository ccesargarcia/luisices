/**
 * Subsistema de Identidade, Vínculo de Voz e Autorização da integração Alexa.
 * Segue estritamente a especificação docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md.
 */

const admin = require('firebase-admin');
const { COLLECTIONS, computeBindingKey } = require('./repository');

const ERROR_CODES = {
  VOICE_NOT_RECOGNIZED: 'VOICE_NOT_RECOGNIZED',
  VOICE_NOT_ALLOWED: 'VOICE_NOT_ALLOWED',
  INTEGRATION_DISABLED: 'INTEGRATION_DISABLED',
  ENVIRONMENT_MISMATCH: 'ENVIRONMENT_MISMATCH',
  USER_INACTIVE: 'USER_INACTIVE',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_DISABLED: 'USER_DISABLED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  DEVICE_NOT_ALLOWED: 'DEVICE_NOT_ALLOWED',
};

const ERROR_SPEECH = {
  VOICE_NOT_RECOGNIZED:
    'Não reconheci sua voz cadastrada. Configure seu perfil de voz no aplicativo Alexa e tente novamente.',
  VOICE_NOT_ALLOWED:
    'Sua voz não está autorizada no Luisices. Solicite a aprovação do administrador no sistema.',
  INTEGRATION_DISABLED:
    'A integração com a Alexa está desativada no momento neste ambiente.',
  ENVIRONMENT_MISMATCH:
    'Esta skill não corresponde ao ambiente configurado.',
  USER_INACTIVE:
    'Sua conta no Luisices não está ativa. Entre em contato com o administrador.',
  USER_DISABLED:
    'Seu acesso ao Luisices foi suspenso. Procure o administrador.',
  PERMISSION_DENIED:
    'Seu perfil não possui permissão para criar pedidos no Luisices.',
  DEVICE_NOT_ALLOWED:
    'Este dispositivo Echo não está na lista de aparelhos autorizados.',
};

/**
 * Extrai identificadores da requisição Alexa.
 * Nunca utiliza a conta do aparelho como fallback para a pessoa.
 */
function extractAlexaIdentifiers(envelope) {
  const system = envelope?.context?.System || envelope?.session?.System || {};
  const sessionAttrs = envelope?.session?.attributes || {};

  // Prioriza a biometria da fala atual.
  // Se a Alexa omitir personId no meio de uma sessão já iniciada (respostas curtas como números),
  // recupera o personId previamente validado no início desta mesma sessão.
  let personId = system?.person?.personId || null;
  if (!personId && sessionAttrs.personId) {
    personId = sessionAttrs.personId;
  }

  // Se uma biometria diferente foi detectada no meio da sessão, invalida para proteção contra hijacking
  if (system?.person?.personId && sessionAttrs.personId && system.person.personId !== sessionAttrs.personId) {
    personId = null;
  }

  const amazonUserId = system?.user?.userId || null;
  const deviceId = system?.device?.deviceId || null;
  const appId =
    envelope?.session?.application?.applicationId ||
    system?.application?.applicationId ||
    null;

  return {
    personId,
    amazonUserId,
    deviceId,
    appId,
  };
}

function logAlexaAuthDiagnostic(envelope, result) {
  try {
    const system = envelope?.context?.System || envelope?.session?.System || {};
    const sessionAttrs = envelope?.session?.attributes || {};
    const physicalPresent = Boolean(system?.person?.personId);
    const sessionPresent = Boolean(sessionAttrs?.personId);
    let comparisonResult = 'ausente';
    if (physicalPresent) {
      comparisonResult = sessionPresent
        ? (system.person.personId === sessionAttrs.personId ? 'correspondente' : 'diferente')
        : 'presente_sem_sessao';
    } else if (sessionPresent) {
      comparisonResult = 'somente_sessao';
    }

    console.info('[AlexaDiagnostic]', JSON.stringify({
      timestamp: new Date().toISOString(),
      stage: 'authorization',
      intent: envelope?.request?.intent?.name || envelope?.request?.type || 'unknown',
      physicalPersonPresent: physicalPresent,
      sessionPersonPresent: sessionPresent,
      comparisonResult,
      authorized: Boolean(result?.authorized),
      errorCode: result?.code || null,
    }));
  } catch (_) {}
}

/**
 * Resolve a identidade da pessoa reconhecida e valida todas as regras no servidor:
 * 1. Integração habilitada
 * 2. personId obrigatório (alexa::person_id:read)
 * 3. alexaBindings ativo e não revogado
 * 4. userProfiles com active === true
 * 5. Firebase Auth não desativado
 * 6. alexaPermissions com enabled === true
 * 7. Permissão de criação de pedidos (permissions.orders.create === true)
 * 8. Restrição de dispositivo Echo (quando configurada)
 *
 * @param {object} envelope - Envelope JSON da Alexa
 * @param {object} config - Configuração de ambiente resolvida
 * @param {admin.firestore.Firestore} db - Instância Firestore
 * @returns {Promise<{ authorized: boolean, identity?: object, error?: string, speech?: string, code?: string }>}
 */
async function authorizeAlexaPerson(envelope, config, db, authService = null) {
  const emitAndReturn = (res) => {
    logAlexaAuthDiagnostic(envelope, res);
    return res;
  };

  // 1. Integração habilitada no ambiente
  if (!config.isEnabled) {
    return emitAndReturn({
      authorized: false,
      code: ERROR_CODES.INTEGRATION_DISABLED,
      speech: ERROR_SPEECH.INTEGRATION_DISABLED,
    });
  }

  const { personId, amazonUserId, deviceId, appId } = extractAlexaIdentifiers(envelope);

  // 2. Validação do Skill ID
  if (config.allowedSkillId && appId && appId !== config.allowedSkillId) {
    return emitAndReturn({
      authorized: false,
      code: ERROR_CODES.ENVIRONMENT_MISMATCH,
      speech: ERROR_SPEECH.ENVIRONMENT_MISMATCH,
    });
  }

  // 2. Se biometria for obrigatória (padrão) e personId estiver ausente, rejeita imediatamente
  if (config.requireVoiceProfile !== false && !personId) {
    return emitAndReturn({
      authorized: false,
      code: ERROR_CODES.VOICE_NOT_RECOGNIZED,
      speech: ERROR_SPEECH.VOICE_NOT_RECOGNIZED,
    });
  }

  let uid = null;
  let bindingData = {};
  let effectivePersonId = personId;
  let resolvedBindingKey = '';

  // 3. Tentar resolver vínculo formal se personId estiver presente
  if (personId) {
    const bindingKey = computeBindingKey(
      config.environment,
      config.allowedSkillId,
      amazonUserId,
      personId,
      config.hmacKey
    );
    resolvedBindingKey = bindingKey;

    const bindingRef = db.collection(COLLECTIONS.BINDINGS).doc(bindingKey);
    const bindingSnap = await bindingRef.get();

    if (bindingSnap.exists) {
      const b = bindingSnap.data() || {};
      if (!b.active || b.revokedAt != null) {
        return emitAndReturn({
          authorized: false,
          code: ERROR_CODES.VOICE_NOT_ALLOWED,
          speech: ERROR_SPEECH.VOICE_NOT_ALLOWED,
        });
      }
      if (b.environment && b.environment !== config.environment) {
        return emitAndReturn({
          authorized: false,
          code: ERROR_CODES.ENVIRONMENT_MISMATCH,
          speech: ERROR_SPEECH.ENVIRONMENT_MISMATCH,
        });
      }
      if (Array.isArray(b.allowedDeviceIds) && b.allowedDeviceIds.length > 0) {
        if (!deviceId || !b.allowedDeviceIds.includes(deviceId)) {
          return emitAndReturn({
            authorized: false,
            code: ERROR_CODES.DEVICE_NOT_ALLOWED,
            speech: ERROR_SPEECH.DEVICE_NOT_ALLOWED,
          });
        }
      }
      uid = b.uid;
      bindingData = b;
    } else {
      if (config.requireVoiceProfile !== false) {
        return emitAndReturn({
          authorized: false,
          code: ERROR_CODES.VOICE_NOT_ALLOWED,
          speech: ERROR_SPEECH.VOICE_NOT_ALLOWED,
        });
      }
    }
  }

  // 4. Modo Relaxado de Desenvolvimento (Ambiente de Teste sem obrigatoriedade de voz):
  // Se requireVoiceProfile === false e não houver vínculo de voz cadastrado,
  // faz fallback para a conta de administrador para permitir testes diretos no hardware Echo
  if (!uid && config.requireVoiceProfile === false && config.environment === 'dev') {
    try {
      const adminProfiles = await db.collection(COLLECTIONS.USER_PROFILES).where('role', '==', 'admin').limit(1).get();
      if (!adminProfiles.empty) {
        uid = adminProfiles.docs[0].id;
      } else {
        const anyProfile = await db.collection(COLLECTIONS.USER_PROFILES).limit(1).get();
        if (!anyProfile.empty) {
          uid = anyProfile.docs[0].id;
        } else {
          uid = 'dev-admin-bypass';
        }
      }
    } catch (err) {
      console.warn('[AlexaAuth] Erro ao buscar fallback em DEV:', err.message);
      uid = 'dev-admin-bypass';
    }
    effectivePersonId = personId || 'dev-voice-any';
    resolvedBindingKey = 'dev-relaxed-binding';
    bindingData = {
      uid,
      active: true,
      mode: 'voice_confirm',
      isDevBypass: true,
      bindingKey: resolvedBindingKey,
    };
  }

  // 5. Se não encontrou UID (e em produção permanece estrito)
  if (!uid) {
    if (!personId) {
      return emitAndReturn({
        authorized: false,
        code: ERROR_CODES.VOICE_NOT_RECOGNIZED,
        speech: ERROR_SPEECH.VOICE_NOT_RECOGNIZED,
      });
    }
    return emitAndReturn({
      authorized: false,
      code: ERROR_CODES.VOICE_NOT_ALLOWED,
      speech: ERROR_SPEECH.VOICE_NOT_ALLOWED,
    });
  }

  // 6. Validar paralelamente userProfile, alexaPermissions e conta no Firebase Auth
  let authUserPromise;
  try {
    const auth = authService || (admin.apps && admin.apps.length > 0 ? admin.auth() : null);
    if (auth && typeof auth.getUser === 'function') {
      authUserPromise = auth.getUser(uid).catch((authErr) => ({ error: authErr }));
    } else {
      authUserPromise = Promise.resolve({ uid, disabled: false });
    }
  } catch {
    authUserPromise = Promise.resolve({ uid, disabled: false });
  }

  const isBypass = Boolean(bindingData.isDevBypass);

  const [profileSnap, permSnap, authUserResult] = await Promise.all([
    db.collection(COLLECTIONS.USER_PROFILES).doc(uid).get().catch(() => ({ exists: false })),
    db.collection(COLLECTIONS.PERMISSIONS).doc(uid).get().catch(() => ({ exists: false })),
    authUserPromise,
  ]);

  // Validar userProfile no Firestore
  if (!profileSnap.exists && !isBypass) {
    return emitAndReturn({
      authorized: false,
      code: ERROR_CODES.USER_NOT_FOUND,
      speech: ERROR_SPEECH.USER_NOT_FOUND,
    });
  }

  const profile = (profileSnap.exists && typeof profileSnap.data === 'function') ? (profileSnap.data() || {}) : {};

  // Perfis legados sem active explícito NÃO são aceitos para voz (exige active === true) em modo estrito
  if (!isBypass && profile.active !== true) {
    return emitAndReturn({
      authorized: false,
      code: ERROR_CODES.USER_INACTIVE,
      speech: ERROR_SPEECH.USER_INACTIVE,
    });
  }

  // Validar conta no Firebase Auth (não suspensa/desativada)
  if (!isBypass && authUserResult.error) {
    console.warn(`[AlexaAuth] Erro ao consultar Firebase Auth para UID ${uid}:`, authUserResult.error.message);
    return emitAndReturn({
      authorized: false,
      code: ERROR_CODES.USER_NOT_FOUND,
      speech: ERROR_SPEECH.USER_NOT_FOUND,
    });
  }

  if (!isBypass && authUserResult.disabled) {
    return emitAndReturn({
      authorized: false,
      code: ERROR_CODES.USER_DISABLED,
      speech: ERROR_SPEECH.USER_DISABLED,
    });
  }

  // Validar alexaPermissions/{uid}
  if (!permSnap.exists && !isBypass) {
    return emitAndReturn({
      authorized: false,
      code: ERROR_CODES.VOICE_NOT_ALLOWED,
      speech: ERROR_SPEECH.VOICE_NOT_ALLOWED,
    });
  }

  const alexaPerm = (permSnap.exists && typeof permSnap.data === 'function') ? (permSnap.data() || {}) : {};
  if (!isBypass && !alexaPerm.enabled) {
    return emitAndReturn({
      authorized: false,
      code: ERROR_CODES.VOICE_NOT_ALLOWED,
      speech: ERROR_SPEECH.VOICE_NOT_ALLOWED,
    });
  }

  // 8. Validar permissão de criação de pedidos no sistema
  // Admin ou perfil com permissions.orders.create === true (ou bypass em dev)
  const canCreateOrders =
    isBypass ||
    profile.role === 'admin' ||
    profile.permissions?.orders?.create === true;

  if (!canCreateOrders) {
    return emitAndReturn({
      authorized: false,
      code: ERROR_CODES.PERMISSION_DENIED,
      speech: ERROR_SPEECH.PERMISSION_DENIED,
    });
  }

  const mode = alexaPerm.mode === 'app_approval' ? 'app_approval' : 'voice_confirm';

  return emitAndReturn({
    authorized: true,
    identity: {
      uid,
      bindingKey: resolvedBindingKey,
      displayName: profile.displayName || profile.email || (isBypass ? 'Administrador Dev' : 'Usuário'),
      email: profile.email || '',
      mode,
      personId: effectivePersonId,
      amazonUserId,
      deviceId,
      isDevBypass: Boolean(bindingData.isDevBypass),
    },
  });
}

module.exports = {
  ERROR_CODES,
  ERROR_SPEECH,
  extractAlexaIdentifiers,
  authorizeAlexaPerson,
};

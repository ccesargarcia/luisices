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
  const personId = system?.person?.personId || null;
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
  // 1. Integração habilitada no ambiente
  if (!config.isEnabled) {
    return {
      authorized: false,
      code: ERROR_CODES.INTEGRATION_DISABLED,
      speech: ERROR_SPEECH.INTEGRATION_DISABLED,
    };
  }

  const { personId, amazonUserId, deviceId, appId } = extractAlexaIdentifiers(envelope);

  // 2. Validação obrigatória do personId (reconhecimento de voz)
  if (!personId) {
    return {
      authorized: false,
      code: ERROR_CODES.VOICE_NOT_RECOGNIZED,
      speech: ERROR_SPEECH.VOICE_NOT_RECOGNIZED,
    };
  }

  // 3. Validação do Skill ID
  if (config.allowedSkillId && appId && appId !== config.allowedSkillId) {
    return {
      authorized: false,
      code: ERROR_CODES.ENVIRONMENT_MISMATCH,
      speech: ERROR_SPEECH.ENVIRONMENT_MISMATCH,
    };
  }

  // 4. Resolver bindingKey via HMAC
  const bindingKey = computeBindingKey(
    config.environment,
    config.allowedSkillId,
    amazonUserId,
    personId,
    config.hmacKey
  );

  const bindingRef = db.collection(COLLECTIONS.BINDINGS).doc(bindingKey);
  const bindingSnap = await bindingRef.get();

  if (!bindingSnap.exists) {
    return {
      authorized: false,
      code: ERROR_CODES.VOICE_NOT_ALLOWED,
      speech: ERROR_SPEECH.VOICE_NOT_ALLOWED,
    };
  }

  const bindingData = bindingSnap.data() || {};

  // Vínculo deve estar ativo e não revogado
  if (!bindingData.active || bindingData.revokedAt != null) {
    return {
      authorized: false,
      code: ERROR_CODES.VOICE_NOT_ALLOWED,
      speech: ERROR_SPEECH.VOICE_NOT_ALLOWED,
    };
  }

  // Vínculo deve pertencer ao mesmo ambiente
  if (bindingData.environment && bindingData.environment !== config.environment) {
    return {
      authorized: false,
      code: ERROR_CODES.ENVIRONMENT_MISMATCH,
      speech: ERROR_SPEECH.ENVIRONMENT_MISMATCH,
    };
  }

  // Dispositivo autorizado (se houver lista de dispositivos no vínculo)
  if (
    Array.isArray(bindingData.allowedDeviceIds) &&
    bindingData.allowedDeviceIds.length > 0 &&
    deviceId &&
    !bindingData.allowedDeviceIds.includes(deviceId)
  ) {
    return {
      authorized: false,
      code: ERROR_CODES.DEVICE_NOT_ALLOWED,
      speech: ERROR_SPEECH.DEVICE_NOT_ALLOWED,
    };
  }

  const uid = bindingData.uid;
  if (!uid) {
    return {
      authorized: false,
      code: ERROR_CODES.VOICE_NOT_ALLOWED,
      speech: ERROR_SPEECH.VOICE_NOT_ALLOWED,
    };
  }

  // 5. Validar userProfile no Firestore
  const profileSnap = await db.collection(COLLECTIONS.USER_PROFILES).doc(uid).get();
  if (!profileSnap.exists) {
    return {
      authorized: false,
      code: ERROR_CODES.USER_NOT_FOUND,
      speech: ERROR_SPEECH.USER_NOT_FOUND,
    };
  }

  const profile = profileSnap.data() || {};

  // Perfis legados sem active explícito NÃO são aceitos para voz (exige active === true)
  if (profile.active !== true) {
    return {
      authorized: false,
      code: ERROR_CODES.USER_INACTIVE,
      speech: ERROR_SPEECH.USER_INACTIVE,
    };
  }

  // 6. Validar conta no Firebase Auth (não suspensa/desativada)
  try {
    const auth = authService || admin.auth();
    const authUser = await auth.getUser(uid);
    if (authUser.disabled) {
      return {
        authorized: false,
        code: ERROR_CODES.USER_DISABLED,
        speech: ERROR_SPEECH.USER_DISABLED,
      };
    }
  } catch (authErr) {
    console.warn(`[AlexaAuth] Erro ao consultar Firebase Auth para UID ${uid}:`, authErr.message);
    return {
      authorized: false,
      code: ERROR_CODES.USER_NOT_FOUND,
      speech: ERROR_SPEECH.USER_NOT_FOUND,
    };
  }


  // 7. Validar alexaPermissions/{uid}
  const permSnap = await db.collection(COLLECTIONS.PERMISSIONS).doc(uid).get();
  if (!permSnap.exists) {
    return {
      authorized: false,
      code: ERROR_CODES.VOICE_NOT_ALLOWED,
      speech: ERROR_SPEECH.VOICE_NOT_ALLOWED,
    };
  }

  const alexaPerm = permSnap.data() || {};
  if (!alexaPerm.enabled) {
    return {
      authorized: false,
      code: ERROR_CODES.VOICE_NOT_ALLOWED,
      speech: ERROR_SPEECH.VOICE_NOT_ALLOWED,
    };
  }

  // 8. Validar permissão de criação de pedidos no sistema
  // Admin ou perfil com permissions.orders.create === true
  const canCreateOrders =
    profile.role === 'admin' ||
    profile.permissions?.orders?.create === true;

  if (!canCreateOrders) {
    return {
      authorized: false,
      code: ERROR_CODES.PERMISSION_DENIED,
      speech: ERROR_SPEECH.PERMISSION_DENIED,
    };
  }

  const mode = alexaPerm.mode === 'app_approval' ? 'app_approval' : 'voice_confirm';

  return {
    authorized: true,
    identity: {
      uid,
      bindingKey,
      displayName: profile.displayName || profile.email || 'Usuário',
      email: profile.email || '',
      mode,
      personId,
      amazonUserId,
      deviceId,
    },
  };
}

module.exports = {
  ERROR_CODES,
  ERROR_SPEECH,
  extractAlexaIdentifiers,
  authorizeAlexaPerson,
};

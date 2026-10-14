/**
 * Gerenciamento de Chaves, Criptografia, Cache em Memória e Autenticação MCP/ChatGPT.
 */

const crypto = require('crypto');
const { COLLECTIONS, CACHE_TTL_MS, DEFAULT_RATE_LIMIT_PER_HOUR, MCP_SCOPES } = require('./constants');
const { getCallerScope } = require('../ai/authorization');

const { validateOAuthAccessToken, getEffectiveUserScopes, consumeSharedRateLimit } = require('./oauth');

// Cache em memória para validação ultrarrápida de chaves (evita 1 leitura de Firestore por request)
const KEY_CACHE = new Map();

// Cache em memória para o interruptor geral do MCP
let GLOBAL_SETTINGS_CACHE = null;

function hashApiKey(rawKey) {
  return crypto.createHash('sha256').update(String(rawKey).trim()).digest('hex');
}

/**
 * Gera uma nova chave segura para assistentes externos.
 * Formato: lui_dev_<48 chars hex> ou lui_live_<48 chars hex>
 */
function generateApiKey(environment = 'dev') {
  const envPrefix = environment === 'prod' ? 'live' : 'dev';
  const randomEntropy = crypto.randomBytes(24).toString('hex');
  const rawKey = `lui_${envPrefix}_${randomEntropy}`;
  const keyHash = hashApiKey(rawKey);
  const keyId = `k_${envPrefix}_${randomEntropy.slice(0, 12)}`;
  const keyPrefix = `lui_${envPrefix}_${randomEntropy.slice(0, 6)}...`;

  return {
    rawKey,
    keyHash,
    keyId,
    keyPrefix,
  };
}

function invalidateKeyCache(keyHash) {
  if (keyHash) {
    KEY_CACHE.delete(keyHash);
  }
}

function clearMcpAuthCache() {
  KEY_CACHE.clear();
  GLOBAL_SETTINGS_CACHE = null;
}

/**
 * Lê o interruptor geral do MCP com cache em memória (TTL 60s).
 */
async function getMcpGlobalSettings(db) {
  const now = Date.now();
  if (GLOBAL_SETTINGS_CACHE && GLOBAL_SETTINGS_CACHE.expiresAt > now) {
    return GLOBAL_SETTINGS_CACHE.data;
  }

  const docSnap = await db.collection(COLLECTIONS.SETTINGS).doc(COLLECTIONS.SETTINGS_DOC_MCP).get();
  const data = docSnap.exists ? docSnap.data() : { enabled: true };

  const ttl = data.enabled === false ? 3000 : CACHE_TTL_MS.SETTINGS;
  GLOBAL_SETTINGS_CACHE = {
    data,
    expiresAt: now + ttl,
  };

  return data;
}

/**
 * Validação rigorosa de requisições HTTP do MCP / ChatGPT.
 * Verifica Bearer token, interruptor global, interruptor do usuário, status do usuário e rate limit.
 * Suporta tanto chaves estáticas legadas (lui_dev_... / lui_live_...) quanto tokens de acesso OAuth 2.1 (lui_oauth_at_...).
 */
async function validateMcpRequest(req, db) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const bearerMatch = typeof authHeader === 'string' ? authHeader.match(/^Bearer\s+(.+)$/i) : null;
  if (!bearerMatch) {
    return {
      success: false,
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Cabeçalho de autorização ausente ou malformatado. Utilize: Authorization: Bearer <TOKEN>',
    };
  }

  const rawKey = bearerMatch[1].trim();
  if (!rawKey || rawKey.length > 256 || !rawKey.startsWith('lui_')) {
    return {
      success: false,
      status: 401,
      code: 'INVALID_API_KEY',
      message: 'Chave de API ou Token de acesso inválido ou malformatado.',
    };
  }

  // 1. Checagem do Interruptor Geral
  const globalSettings = await getMcpGlobalSettings(db);
  if (globalSettings.enabled === false) {
    return {
      success: false,
      status: 503,
      code: 'INTEGRATION_DISABLED',
      message: 'A integração com ChatGPT e assistentes externos está desativada no momento neste ambiente.',
    };
  }

  // 2. Validação se for Token OAuth 2.1
  if (rawKey.startsWith('lui_oauth_at_')) {
    return await validateOAuthAccessToken(rawKey, db);
  }

  const keyHash = hashApiKey(rawKey);

  // Consulta no Firestore pela Chave
  const keySnap = await db.collection(COLLECTIONS.KEYS).doc(keyHash).get();
  if (!keySnap.exists) {
    return {
      success: false,
      status: 401,
      code: 'KEY_NOT_FOUND',
      message: 'Chave de acesso não encontrada ou revogada.',
    };
  }

  const keyData = keySnap.data();
  if (!keyData || typeof keyData.userId !== 'string' || !keyData.userId.trim() || typeof keyData.keyId !== 'string' || !keyData.keyId.trim()) {
    return { success: false, status: 401, code: 'INVALID_API_KEY', message: 'Chave de acesso inválida ou incompleta.' };
  }

  // Consulta do perfil do usuário vinculado (sempre atualizado do Firestore para invalidação em tempo real)
  const userSnap = await db.collection(COLLECTIONS.USERS).doc(keyData.userId).get();
  if (!userSnap.exists) {
    return {
      success: false,
      status: 403,
      code: 'USER_NOT_FOUND',
      message: 'Usuário proprietário da chave não encontrado no sistema.',
    };
  }

  const userProfile = userSnap.data();

  // 3. Checagem do Interruptor Individual da Chave
  if (keyData.enabled === false) {
    KEY_CACHE.delete(keyHash);
    return {
      success: false,
      status: 403,
      code: 'KEY_DISABLED',
      message: 'O acesso ao assistente de IA está desativado para esta chave/usuário. Contate o administrador.',
    };
  }

  // 4. Checagem do Status do Usuário no Sistema (RBAC)
  if (userProfile.active === false || ['paused', 'inactive', 'disabled'].includes(userProfile.status)) {
    return {
      success: false,
      status: 403,
      code: 'USER_INACTIVE',
      message: 'A conta do usuário vinculado está inativa ou pausada no Luisices.',
    };
  }

  // Checa se o usuário tem elegibilidade para MCP (se o campo foi configurado)
  if (userProfile.permissions && userProfile.permissions.mcpAccess === false) {
    return {
      success: false,
      status: 403,
      code: 'MCP_PERMISSION_DENIED',
      message: 'Este usuário não possui permissão para utilizar integrações MCP / ChatGPT.',
    };
  }

  const rawKeyScopes = Array.isArray(keyData.scopes)
    ? keyData.scopes
    : (typeof keyData.scope === 'string' ? keyData.scope.trim().split(/\s+/).filter(Boolean) : []);
  // Wildcard legado é exclusivo de chaves estáticas; o perfil e o papel ainda limitam o acesso.
  const requestedKeyScopes = rawKeyScopes.includes('*')
    ? Object.values(MCP_SCOPES).map((scope) => scope.id)
    : rawKeyScopes;
  const effectiveKeyScopes = getEffectiveUserScopes(requestedKeyScopes, userProfile);
  if (effectiveKeyScopes.length === 0) {
    return {
      success: false,
      status: 403,
      code: 'SCOPE_PERMISSION_DENIED',
      message: 'As permissões MCP do perfil do usuário associado foram alteradas e nenhum escopo da chave é permitido.',
    };
  }
  keyData.scopes = effectiveKeyScopes;

  // 5. Rate Limiter por Chave (Proteção contra loops e custos)
  const configuredRateLimit = Number(keyData.rateLimitPerHour);
  const rateLimitPerHour = Number.isFinite(configuredRateLimit) && configuredRateLimit > 0
    ? Math.min(300, Math.floor(configuredRateLimit))
    : DEFAULT_RATE_LIMIT_PER_HOUR;
  if (!await consumeSharedRateLimit(db, `mcp-key:${keyData.keyId}`, rateLimitPerHour)) {
    return {
      success: false,
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Limite de requisições por hora excedido (${rateLimitPerHour} req/h). Aguarde antes de realizar novas chamadas.`,
    };
  }
  if (!await consumeSharedRateLimit(db, `mcp-user:${keyData.userId}`, 600)) {
    return {
      success: false,
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Limite agregado de chamadas MCP por hora excedido para esta conta.',
    };
  }

  // 6. Montagem do escopo de autorização do solicitante
  const scope = getCallerScope(keyData.userId, userProfile);

  return {
    success: true,
    keyData,
    userProfile,
    scope,
    keyHash,
  };
}

/**
 * Atualiza o registro de uso da chave de forma assíncrona (não bloqueia a resposta).
 */
function touchKeyUsage(db, keyHash) {
  if (!db || !keyHash) return;
  const { FieldValue } = require('firebase-admin/firestore');

  // Caso seja um token OAuth 2.1 (lui_oauth_at_...)
  if (keyHash.startsWith('lui_oauth_at_')) {
    const tokenId = crypto.createHash('sha256').update(keyHash).digest('hex');
    const tokenRef = db.collection('oauthAccessTokens').doc(tokenId);
    const legacyRef = db.collection('oauthAccessTokens').doc(keyHash);
    const updateUsage = (ref) => ref.update({
        lastUsedAt: FieldValue.serverTimestamp(),
        totalCalls: FieldValue.increment(1),
      }).then(async () => {
        const tokenSnap = await ref.get();
        if (tokenSnap.exists && tokenSnap.data().sessionId) {
          await db.collection('oauthSessions')
            .doc(tokenSnap.data().sessionId)
            .update({
              lastUsedAt: FieldValue.serverTimestamp(),
              totalCalls: FieldValue.increment(1),
            })
            .catch(() => {});
        }
      });
    updateUsage(tokenRef).catch(() => updateUsage(legacyRef)).catch(() => {
        console.warn('[MCP] Falha não-bloqueante ao atualizar métricas do token OAuth.');
      });
    return;
  }

  // Caso seja chave estática
  db.collection(COLLECTIONS.KEYS)
    .doc(keyHash)
    .update({
      lastUsedAt: FieldValue.serverTimestamp(),
      totalCalls: FieldValue.increment(1),
    })
    .catch((err) => {
      console.warn(`[MCP] Falha não-bloqueante ao atualizar métricas da chave ${keyHash}:`, err.message);
    });
}

module.exports = {
  hashApiKey,
  generateApiKey,
  validateMcpRequest,
  touchKeyUsage,
  invalidateKeyCache,
  clearMcpAuthCache,
  getMcpGlobalSettings,
};

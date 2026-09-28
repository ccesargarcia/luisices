/**
 * Camada de acesso a dados e funções de hash/auditoria da integração Alexa.
 * Segue estritamente a especificação docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md.
 */

const crypto = require('crypto');
const admin = require('firebase-admin');

const COLLECTIONS = {
  SETTINGS: 'integrationSettings/alexa',
  PERMISSIONS: 'alexaPermissions',
  BINDINGS: 'alexaBindings',
  PAIRINGS: 'alexaPairings',
  DRAFTS: 'alexaDrafts',
  REQUESTS: 'alexaRequests',
  COMMITS: 'alexaCommits',
  RATE_LIMITS: 'alexaRateLimits',
  AUDIT: 'alexaAudit',
  ORDERS: 'orders',
  SALES_LEDGER: 'salesLedger',
  USERS: 'users',
  USER_PROFILES: 'userProfiles',
};

/**
 * Calcula a chave única persistida para o vínculo (bindingKey)
 * Composicão: environment + applicationId + amazonUserId + personId
 */
function computeBindingKey(environment, skillId, amazonUserId, personId, hmacSecret) {
  if (!hmacSecret || typeof hmacSecret !== 'string') {
    throw new Error('HMAC_KEY_MISSING: Chave secreta HMAC não configurada para cálculo de binding.');
  }
  const payload = `${environment || 'dev'}:${skillId || ''}:${amazonUserId || ''}:${personId || ''}`;
  return crypto.createHmac('sha256', hmacSecret).update(payload).digest('hex');
}

/**
 * Calcula o hash seguro de um código de pareamento de 8 dígitos
 */
function computeCodeHash(code, hmacSecret) {
  if (!hmacSecret || typeof hmacSecret !== 'string') {
    throw new Error('HMAC_KEY_MISSING: Chave secreta HMAC não configurada para cálculo de hash de código.');
  }
  return crypto.createHmac('sha256', hmacSecret).update(String(code).trim()).digest('hex');
}

/**
 * Calcula a chave única para deduplicação da requisição Alexa (skillId, requestId)
 */
function computeRequestKey(skillId, requestId) {
  return crypto.createHash('sha256').update(`${skillId}:${requestId}`).digest('hex');
}

/**
 * Registra evento estruturado de auditoria com retenção segura.
 * Nunca registra dados sensíveis (áudio, slots brutos, telefone ou nomes completos).
 */
async function recordAuditEvent(db, eventData) {
  if (!db) return;
  try {
    const {
      event,
      uid = null,
      bindingKey = null,
      orderId = null,
      draftId = null,
      reason = null,
      durationMs = 0,
      success = true,
      environment = 'dev',
    } = eventData;

    await db.collection(COLLECTIONS.AUDIT).add({
      event: String(event || 'UNKNOWN'),
      uid: uid ? String(uid) : null,
      bindingKey: bindingKey ? String(bindingKey).slice(0, 16) + '...' : null,
      orderId: orderId ? String(orderId) : null,
      draftId: draftId ? String(draftId) : null,
      reason: reason ? String(reason).slice(0, 200) : null,
      durationMs: Number(durationMs) || 0,
      success: Boolean(success),
      environment: String(environment),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAtIso: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[AlexaRepository] Erro ao gravar alexaAudit:', err.message);
  }
}

module.exports = {
  COLLECTIONS,
  computeBindingKey,
  computeCodeHash,
  computeRequestKey,
  recordAuditEvent,
};

/**
 * Links de acompanhamento público de pedidos (Cloud Functions v2).
 * Mantém criptografia, autorização, rate limit e projeção pública num módulo isolado.
 */

const moduleInitializationStartedAt = process.hrtime.bigint();
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');
const { onCall } = require('../common/sentryFunctions');
const { withFirstInvocationSpan } = require('../common/sentry');
const { ORDER_TRACKING_ENCRYPTION_KEY } = require('../common/secrets');
const crypto = require('crypto');
const { publicOrderTrackingLimiter } = require('../common/rateLimiters');
const { getTrustedClientIp } = require('../originProtection');
const { handleGetPublicOrderTrackingCore } = require('./trackingCore');
const {
  createOrderTrackingLinkCore,
  listOrderTrackingLinksCore,
  revokeOrderTrackingLinkCore,
  revokeOrderTrackingLinkByIdCore,
  deleteOrderTrackingLinkCore,
  deleteOrderTrackingLinksBatchCore,
} = require('./trackingAdminCore');

function mapCoreError(err) {
  if (err instanceof HttpsError) return err;
  if (err?.code) return new HttpsError(err.code, err.message, err.details);
  return err;
}

function getTrackingEncryptionKey() {
  const key = Buffer.from(ORDER_TRACKING_ENCRYPTION_KEY.value() || '', 'base64');
  if (key.length !== 32) {
    throw new HttpsError('failed-precondition', 'A chave segura dos links não está configurada no servidor.');
  }
  return key;
}

function encryptTrackingToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getTrackingEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map(part => part.toString('base64url')).join('.');
}

function decryptTrackingToken(value) {
  const [ivValue, tagValue, ciphertextValue] = String(value || '').split('.');
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error('invalid_ciphertext');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getTrackingEncryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/** Gera um link secreto de acompanhamento quando o pedido ainda não tem link ativo. */
const createOrderTrackingLink = onCall({ cors: true, maxInstances: 10, memory: '512MiB', secrets: [ORDER_TRACKING_ENCRYPTION_KEY] }, withFirstInvocationSpan('createOrderTrackingLink', async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta para gerar o link.');
  try {
    await publicOrderTrackingLimiter.consume(`create:${uid}`);
  } catch {
    throw new HttpsError('resource-exhausted', 'Muitos links foram gerados em sequência. Aguarde um pouco.');
  }
  try {
    return await createOrderTrackingLinkCore(uid, request.data, {
      db: getFirestore(),
      fieldValue: FieldValue,
      encryptionKeyBase64: ORDER_TRACKING_ENCRYPTION_KEY.value() || '',
    });
  } catch (err) {
    throw mapCoreError(err);
  }
}, () => moduleInitializationMs));

/** Lista links criados pelo usuário ou todos para administradores. Os tokens só saem por callable autenticada. */
const listOrderTrackingLinks = onCall({ cors: true, maxInstances: 10, memory: '512MiB', secrets: [ORDER_TRACKING_ENCRYPTION_KEY] }, withFirstInvocationSpan('listOrderTrackingLinks', async (request) => {
  try {
    return await listOrderTrackingLinksCore(request.auth?.uid, request.data, {
      db: getFirestore(),
      encryptionKeyBase64: ORDER_TRACKING_ENCRYPTION_KEY.value() || '',
    });
  } catch (err) {
    throw mapCoreError(err);
  }
}, () => moduleInitializationMs));

/** Invalida imediatamente o link público de acompanhamento. */
const revokeOrderTrackingLink = onCall({ cors: true, maxInstances: 10 }, withFirstInvocationSpan('revokeOrderTrackingLink', async (request) => {
  try {
    return await revokeOrderTrackingLinkCore(request.auth?.uid, request.data, {
      db: getFirestore(),
      fieldValue: FieldValue,
    });
  } catch (err) {
    throw mapCoreError(err);
  }
}, () => moduleInitializationMs));

/** Revoga um link específico da lista de links e respeita quem o criou ou a administração. */
const revokeOrderTrackingLinkById = onCall({ cors: true, maxInstances: 10 }, withFirstInvocationSpan('revokeOrderTrackingLinkById', async (request) => {
  try {
    return await revokeOrderTrackingLinkByIdCore(request.auth?.uid, request.data, {
      db: getFirestore(),
      fieldValue: FieldValue,
    });
  } catch (err) {
    throw mapCoreError(err);
  }
}, () => moduleInitializationMs));

/** Remove um link do histórico; se ainda estiver ativo, invalida-o antes da exclusão. */
const deleteOrderTrackingLink = onCall({ cors: true, maxInstances: 10, memory: '512MiB' }, withFirstInvocationSpan('deleteOrderTrackingLink', async (request) => {
  try {
    return await deleteOrderTrackingLinkCore(request.auth?.uid, request.data, {
      db: getFirestore(),
      fieldValue: FieldValue,
    });
  } catch (err) {
    throw mapCoreError(err);
  }
}, () => moduleInitializationMs));

/** Remove múltiplos links do histórico em lote (até 100 por chamada). */
const deleteOrderTrackingLinksBatch = onCall({ cors: true, maxInstances: 10, memory: '512MiB' }, withFirstInvocationSpan('deleteOrderTrackingLinksBatch', async (request) => {
  try {
    return await deleteOrderTrackingLinksBatchCore(request.auth?.uid, request.data, {
      db: getFirestore(),
      fieldValue: FieldValue,
    });
  } catch (err) {
    throw mapCoreError(err);
  }
}, () => moduleInitializationMs));

/** Retorna somente dados próprios para acompanhamento público; nunca expõe dados financeiros/contato. */
const getPublicOrderTracking = onCall({ cors: true, maxInstances: 20, memory: '512MiB' }, withFirstInvocationSpan('getPublicOrderTracking', async (request) => {
  const ip = getTrustedClientIp(request.rawRequest);
  try {
    await publicOrderTrackingLimiter.consume(ip);
  } catch {
    throw new HttpsError('resource-exhausted', 'Muitas consultas em sequência. Aguarde um pouco e tente novamente.');
  }
  try {
    return await handleGetPublicOrderTrackingCore(request.data?.token, { getFirestore });
  } catch (err) {
    if (err?.code) {
      throw new HttpsError(err.code, err.message, err.details);
    }
    throw err;
  }
}, () => moduleInitializationMs));


const moduleInitializationMs = Number(
  (Number(process.hrtime.bigint() - moduleInitializationStartedAt) / 1e6).toFixed(2),
);

module.exports = {
  createOrderTrackingLink,
  listOrderTrackingLinks,
  revokeOrderTrackingLink,
  revokeOrderTrackingLinkById,
  deleteOrderTrackingLink,
  deleteOrderTrackingLinksBatch,
  getPublicOrderTracking,
};

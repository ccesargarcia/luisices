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
  const orderId = request.data?.orderId;
  if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta para gerar o link.');
  if (typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(orderId)) {
    throw new HttpsError('invalid-argument', 'Pedido inválido.');
  }
  const expirationDays = request.data?.expirationDays === undefined ? 90 : request.data.expirationDays;
  if (expirationDays !== null && ![7, 30, 90].includes(expirationDays)) {
    throw new HttpsError('invalid-argument', 'Escolha uma validade de 7, 30 ou 90 dias, ou sem expiração.');
  }
  try {
    await publicOrderTrackingLimiter.consume(`create:${uid}`);
  } catch {
    throw new HttpsError('resource-exhausted', 'Muitos links foram gerados em sequência. Aguarde um pouco.');
  }

  const db = getFirestore();
  const orderRef = db.doc(`orders/${orderId}`);
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = expirationDays === null
    ? null
    : new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString();
  const linkId = crypto.randomUUID();
  const linkRef = db.doc(`orderTrackingLinks/${linkId}`);
  await db.runTransaction(async (transaction) => {
    const [orderSnap, profileSnap] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(db.doc(`userProfiles/${uid}`)),
    ]);
    if (!orderSnap.exists) throw new HttpsError('not-found', 'Pedido não encontrado.');
    const order = orderSnap.data() || {};
    const profile = profileSnap.data() || {};
    const isAdmin = profileSnap.exists && profile.role === 'admin' && profile.active !== false;
    const canViewOrders = isAdmin || profile.permissions?.orders === true || profile.permissions?.orders?.view === true;
    if (!profileSnap.exists || profile.active === false || !canViewOrders || (order.userId !== uid && order.assignedTo !== uid && !isAdmin)) {
      throw new HttpsError('permission-denied', 'Você não tem acesso para compartilhar este pedido.');
    }
    if (order.isArchived || !['pending', 'in-progress'].includes(order.status)) {
      throw new HttpsError('failed-precondition', 'Só é possível compartilhar pedidos pendentes ou em produção.');
    }

    const expiryValue = order.publicTrackingExpiresAt;
    const expiryMs = typeof expiryValue === 'string' ? Date.parse(expiryValue) : Number.NaN;
    const hasHash = typeof order.publicTrackingHash === 'string' && order.publicTrackingHash.length > 0;
    const hasActiveLink = hasHash
      && (expiryValue === null || (Number.isFinite(expiryMs) && expiryMs > Date.now()));
    if (hasActiveLink) {
      throw new HttpsError('already-exists', 'Este pedido já possui um link ativo. Revogue-o antes de criar outro.');
    }

    transaction.create(linkRef, {
      orderId,
      orderNumber: order.orderNumber || '',
      customerName: order.customerName || '',
      status: order.status || 'pending',
      createdByUid: uid,
      createdByName: profile.displayName || profile.email || uid,
      tokenCiphertext: encryptTrackingToken(token),
      tokenHash,
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
      revokedAt: null,
    });
    transaction.update(orderRef, {
      publicTrackingHash: tokenHash,
      publicTrackingExpiresAt: expiresAt,
      publicTrackingLinkId: linkId,
    });
  });
  return { token, expiresAt, linkId };
}, () => moduleInitializationMs));

/** Lista links criados pelo usuário ou todos para administradores. Os tokens só saem por callable autenticada. */
const listOrderTrackingLinks = onCall({ cors: true, maxInstances: 10, memory: '512MiB', secrets: [ORDER_TRACKING_ENCRYPTION_KEY] }, withFirstInvocationSpan('listOrderTrackingLinks', async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta para consultar os links.');
  const profileSnap = await getFirestore().doc(`userProfiles/${uid}`).get();
  const profile = profileSnap.data() || {};
  if (!profileSnap.exists || profile.active === false) throw new HttpsError('permission-denied', 'Sua conta não pode consultar links.');
  const isAdmin = profile.role === 'admin';
  const canViewOrders = isAdmin || profile.permissions?.orders === true || profile.permissions?.orders?.view === true;
  if (!canViewOrders) throw new HttpsError('permission-denied', 'Você não tem permissão para consultar links de pedidos.');
  getTrackingEncryptionKey();

  // O Dashboard consulta um link individual somente quando alguém abre/copiar
  // o link de um pedido. Isso evita percorrer o histórico inteiro no page load.
  const requestedOrderId = request.data?.orderId;
  if (requestedOrderId !== undefined) {
    if (typeof requestedOrderId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(requestedOrderId)) {
      throw new HttpsError('invalid-argument', 'Pedido inválido.');
    }

    const db = getFirestore();
    const orderSnap = await db.doc(`orders/${requestedOrderId}`).get();
    if (!orderSnap.exists) throw new HttpsError('not-found', 'Pedido não encontrado.');
    const order = orderSnap.data() || {};
    const linkId = order.publicTrackingLinkId;
    let linkDoc = null;
    if (typeof linkId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(linkId)) {
      const linkSnap = await db.doc(`orderTrackingLinks/${linkId}`).get();
      if (linkSnap.exists) linkDoc = linkSnap;
    }
    // Compatibilidade com links antigos, anteriores ao campo publicTrackingLinkId.
    if (!linkDoc) {
      const legacyLinks = await db.collection('orderTrackingLinks')
        .where('orderId', '==', requestedOrderId)
        .get();
      const eligible = legacyLinks.docs
        .filter((doc) => {
          const data = doc.data() || {};
          if (data.revokedAt || (!isAdmin && data.createdByUid !== uid)) return false;
          const expiration = data.expiresAt?.toDate?.()?.getTime?.() ??
            (typeof data.expiresAt === 'string' ? Date.parse(data.expiresAt) : null);
          return expiration === null || (Number.isFinite(expiration) && expiration > Date.now());
        })
        .sort((a, b) => (b.data().createdAt?.toMillis?.() || 0) - (a.data().createdAt?.toMillis?.() || 0));
      linkDoc = eligible[0] || null;
    }
    if (!linkDoc) return { link: null };
    const linkData = linkDoc.data() || {};
    if (linkData.orderId !== requestedOrderId || (!isAdmin && linkData.createdByUid !== uid)) {
      throw new HttpsError('permission-denied', 'Você não pode consultar este link.');
    }
    if (linkData.revokedAt) return { link: null };

    const expiresAt = linkData.expiresAt?.toDate?.()?.toISOString?.() ||
      (typeof linkData.expiresAt === 'string' ? linkData.expiresAt : null);
    if (expiresAt && (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())) {
      return { link: null };
    }

    let token = null;
    try {
      token = decryptTrackingToken(linkData.tokenCiphertext);
    } catch (error) {
      console.error('[listOrderTrackingLinks] Não foi possível descriptografar o token:', linkDoc.id, error?.message);
    }

    return {
      link: token ? {
        id: linkDoc.id,
        orderId: requestedOrderId,
        orderNumber: linkData.orderNumber || order.orderNumber || '',
        customerName: linkData.customerName || order.customerName || '',
        status: linkData.status || order.status || 'pending',
        token,
        expiresAt,
        createdAt: linkData.createdAt?.toDate?.()?.toISOString?.() || null,
        revokedAt: null,
        createdByUid: linkData.createdByUid || '',
        createdByName: linkData.createdByName || linkData.createdByUid || '',
      } : null,
    };
  }

  const cursorId = request.data?.cursor;
  if (cursorId !== undefined && cursorId !== null && (typeof cursorId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(cursorId))) {
    throw new HttpsError('invalid-argument', 'Cursor de paginação inválido.');
  }
  const pageSize = Math.max(1, Math.min(Number(request.data?.pageSize) || 50, 100));
  const db = getFirestore();
  let query = db.collection('orderTrackingLinks');
  if (!isAdmin) query = query.where('createdByUid', '==', uid);
  query = query.orderBy('createdAt', 'desc');
  if (cursorId) {
    const cursor = await db.doc(`orderTrackingLinks/${cursorId}`).get();
    if (!cursor.exists || (!isAdmin && cursor.data()?.createdByUid !== uid)) {
      throw new HttpsError('invalid-argument', 'Cursor de paginação inválido.');
    }
    query = query.startAfter(cursor);
  }
  query = query.limit(pageSize + 1);
  const snapshot = await query.get();
  const hasMore = snapshot.docs.length > pageSize;
  const docs = snapshot.docs.slice(0, pageSize);
  const links = docs.map((doc) => {
    const data = doc.data();
    let token = null;
    try {
      token = decryptTrackingToken(data.tokenCiphertext);
    } catch (error) {
      console.error('[listOrderTrackingLinks] Não foi possível descriptografar o token:', doc.id, error?.message);
    }
    return {
      id: doc.id,
      orderId: data.orderId || '',
      orderNumber: data.orderNumber || '',
      customerName: data.customerName || '',
      status: data.status || 'pending',
      token,
      expiresAt: data.expiresAt || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
      revokedAt: data.revokedAt?.toDate?.()?.toISOString?.() || null,
      createdByUid: data.createdByUid || '',
      createdByName: data.createdByName || data.createdByUid || '',
    };
  });
  return { links, nextCursor: hasMore ? docs.at(-1)?.id || null : null };
}, () => moduleInitializationMs));

/** Invalida imediatamente o link público de acompanhamento. */
const revokeOrderTrackingLink = onCall({ cors: true, maxInstances: 10 }, withFirstInvocationSpan('revokeOrderTrackingLink', async (request) => {
  const uid = request.auth?.uid;
  const orderId = request.data?.orderId;
  if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta para desativar o link.');
  if (typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(orderId)) {
    throw new HttpsError('invalid-argument', 'Pedido inválido.');
  }
  const db = getFirestore();
  const orderRef = db.doc(`orders/${orderId}`);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new HttpsError('not-found', 'Pedido não encontrado.');
  const order = orderSnap.data() || {};
  const profileSnap = await db.doc(`userProfiles/${uid}`).get();
  const profile = profileSnap.data() || {};
  const isAdmin = profileSnap.exists && profile.role === 'admin' && profile.active !== false;
  const canViewOrders = isAdmin || profile.permissions?.orders === true || profile.permissions?.orders?.view === true;
  if (!profileSnap.exists || profile.active === false || !canViewOrders || (order.userId !== uid && order.assignedTo !== uid && !isAdmin)) {
    throw new HttpsError('permission-denied', 'Você não tem acesso para alterar o compartilhamento deste pedido.');
  }
  if (typeof order.publicTrackingHash !== 'string') return { success: true, revoked: false };
  const batch = db.batch();
  batch.update(orderRef, {
    publicTrackingHash: FieldValue.delete(),
    publicTrackingExpiresAt: FieldValue.delete(),
    publicTrackingLinkId: FieldValue.delete(),
  });
  if (order.publicTrackingLinkId) {
    batch.set(db.doc(`orderTrackingLinks/${order.publicTrackingLinkId}`), { revokedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  await batch.commit();
  return { success: true, revoked: true };
}, () => moduleInitializationMs));

/** Revoga um link específico da lista de links e respeita quem o criou ou a administração. */
const revokeOrderTrackingLinkById = onCall({ cors: true, maxInstances: 10 }, withFirstInvocationSpan('revokeOrderTrackingLinkById', async (request) => {
  const uid = request.auth?.uid;
  const linkId = request.data?.linkId;
  if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta para revogar o link.');
  if (typeof linkId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(linkId)) {
    throw new HttpsError('invalid-argument', 'Link inválido.');
  }

  const db = getFirestore();
  const linkRef = db.doc(`orderTrackingLinks/${linkId}`);
  return db.runTransaction(async (transaction) => {
    const [linkSnap, profileSnap] = await Promise.all([
      transaction.get(linkRef),
      transaction.get(db.doc(`userProfiles/${uid}`)),
    ]);
    if (!linkSnap.exists) return { success: true, revoked: false };
    const link = linkSnap.data() || {};
    const profile = profileSnap.data() || {};
    const isAdmin = profileSnap.exists && profile.role === 'admin' && profile.active !== false;
    const canViewOrders = isAdmin || profile.permissions?.orders === true || profile.permissions?.orders?.view === true;
    if (!profileSnap.exists || profile.active === false || !canViewOrders || (!isAdmin && link.createdByUid !== uid)) {
      throw new HttpsError('permission-denied', 'Você não pode revogar este link.');
    }
    if (link.revokedAt) return { success: true, revoked: false };

    let orderSnap = null;
    if (typeof link.orderId === 'string' && link.orderId) {
      orderSnap = await transaction.get(db.doc(`orders/${link.orderId}`));
    }
    if (orderSnap?.exists && orderSnap.data()?.publicTrackingLinkId === linkId) {
      transaction.update(orderSnap.ref, {
        publicTrackingHash: FieldValue.delete(),
        publicTrackingExpiresAt: FieldValue.delete(),
        publicTrackingLinkId: FieldValue.delete(),
      });
    }
    transaction.update(linkRef, { revokedAt: FieldValue.serverTimestamp() });
    return { success: true, revoked: true };
  });
}, () => moduleInitializationMs));

/** Remove um link do histórico; se ainda estiver ativo, invalida-o antes da exclusão. */
const deleteOrderTrackingLink = onCall({ cors: true, maxInstances: 10, memory: '512MiB' }, withFirstInvocationSpan('deleteOrderTrackingLink', async (request) => {
  const uid = request.auth?.uid;
  const linkId = request.data?.linkId;
  if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta para excluir o link.');
  if (typeof linkId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(linkId)) {
    throw new HttpsError('invalid-argument', 'Link inválido.');
  }

  const db = getFirestore();
  const linkRef = db.doc(`orderTrackingLinks/${linkId}`);
  return db.runTransaction(async (transaction) => {
    const [linkSnap, profileSnap] = await Promise.all([
      transaction.get(linkRef),
      transaction.get(db.doc(`userProfiles/${uid}`)),
    ]);
    if (!linkSnap.exists) return { success: true, deleted: false };
    const link = linkSnap.data() || {};
    const profile = profileSnap.data() || {};
    const isAdmin = profileSnap.exists && profile.role === 'admin' && profile.active !== false;
    const canViewOrders = isAdmin || profile.permissions?.orders === true || profile.permissions?.orders?.view === true;
    if (!profileSnap.exists || profile.active === false || !canViewOrders || (!isAdmin && link.createdByUid !== uid)) {
      throw new HttpsError('permission-denied', 'Você não pode excluir este link.');
    }

    let orderSnap = null;
    if (typeof link.orderId === 'string' && link.orderId) {
      orderSnap = await transaction.get(db.doc(`orders/${link.orderId}`));
    }
    if (orderSnap?.exists && orderSnap.data()?.publicTrackingLinkId === linkId) {
      transaction.update(orderSnap.ref, {
        publicTrackingHash: FieldValue.delete(),
        publicTrackingExpiresAt: FieldValue.delete(),
        publicTrackingLinkId: FieldValue.delete(),
      });
    }
    transaction.delete(linkRef);
    return { success: true, deleted: true };
  });
}, () => moduleInitializationMs));

/** Remove múltiplos links do histórico em lote (até 100 por chamada). */
const deleteOrderTrackingLinksBatch = onCall({ cors: true, maxInstances: 10, memory: '512MiB' }, withFirstInvocationSpan('deleteOrderTrackingLinksBatch', async (request) => {
  const uid = request.auth?.uid;
  const rawIds = request.data?.linkIds;
  if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta para excluir links.');
  if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > 100) {
    throw new HttpsError('invalid-argument', 'Envie entre 1 e 100 identificadores de link.');
  }
  const linkIds = [...new Set(rawIds.filter((id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id)))];
  if (linkIds.length === 0) {
    throw new HttpsError('invalid-argument', 'Nenhum link válido informado.');
  }

  const db = getFirestore();
  const profileSnap = await db.doc(`userProfiles/${uid}`).get();
  const profile = profileSnap.data() || {};
  const isAdmin = profileSnap.exists && profile.role === 'admin' && profile.active !== false;
  const canViewOrders = isAdmin || profile.permissions?.orders === true || profile.permissions?.orders?.view === true;
  if (!profileSnap.exists || profile.active === false || !canViewOrders) {
    throw new HttpsError('permission-denied', 'Você não tem permissão para excluir links de pedidos.');
  }

  const linkRefs = linkIds.map((id) => db.doc(`orderTrackingLinks/${id}`));
  const linkSnaps = await db.getAll(...linkRefs);

  const validLinkSnaps = linkSnaps.filter((snap) => {
    if (!snap.exists) return false;
    const data = snap.data() || {};
    return isAdmin || data.createdByUid === uid;
  });

  if (validLinkSnaps.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  const orderIdsToFetch = [...new Set(
    validLinkSnaps
      .map((s) => s.data()?.orderId)
      .filter((id) => typeof id === 'string' && id.length > 0)
  )];

  const orderSnaps = orderIdsToFetch.length > 0
    ? await db.getAll(...orderIdsToFetch.map((id) => db.doc(`orders/${id}`)))
    : [];

  const ordersById = new Map();
  for (const snap of orderSnaps) {
    if (snap.exists) ordersById.set(snap.id, snap);
  }

  const batch = db.batch();
  let deletedCount = 0;

  for (const linkSnap of validLinkSnaps) {
    const linkData = linkSnap.data() || {};
    const linkId = linkSnap.id;
    const orderSnap = linkData.orderId ? ordersById.get(linkData.orderId) : null;

    if (orderSnap && orderSnap.data()?.publicTrackingLinkId === linkId) {
      batch.update(orderSnap.ref, {
        publicTrackingHash: FieldValue.delete(),
        publicTrackingExpiresAt: FieldValue.delete(),
        publicTrackingLinkId: FieldValue.delete(),
      });
    }
    batch.delete(linkSnap.ref);
    deletedCount++;
  }

  await batch.commit();
  return { success: true, deletedCount };
}, () => moduleInitializationMs));

/** Retorna somente dados próprios para acompanhamento público; nunca expõe dados financeiros/contato. */
const getPublicOrderTracking = onCall({ cors: true, maxInstances: 20, memory: '512MiB' }, withFirstInvocationSpan('getPublicOrderTracking', async (request) => {
  const ip = getTrustedClientIp(request.rawRequest);
  try {
    await publicOrderTrackingLimiter.consume(ip);
  } catch {
    throw new HttpsError('resource-exhausted', 'Muitas consultas em sequência. Aguarde um pouco e tente novamente.');
  }
  const token = request.data?.token;
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
    throw new HttpsError('not-found', 'Link de acompanhamento inválido ou desativado.');
  }
  const db = getFirestore();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const orderSnapshot = await db.collection('orders').where('publicTrackingHash', '==', tokenHash).limit(1).get();
  if (orderSnapshot.empty) throw new HttpsError('not-found', 'Link de acompanhamento inválido ou desativado.');
  const orderSnap = orderSnapshot.docs[0];
  const order = orderSnap.data() || {};
  const expiryIsMissing = !Object.prototype.hasOwnProperty.call(order, 'publicTrackingExpiresAt');
  const expiresAtMs = typeof order.publicTrackingExpiresAt === 'string'
    ? Date.parse(order.publicTrackingExpiresAt)
    : Number.NaN;
  const isExpired = order.publicTrackingExpiresAt !== null
    && (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now());
  if (order.publicTrackingHash !== tokenHash || order.isArchived || expiryIsMissing || isExpired) {
    throw new HttpsError('not-found', 'Link de acompanhamento inválido ou desativado.');
  }
  let trackingTemplate = {};
  const ownerUid = typeof order.userId === 'string' ? order.userId : (typeof order.createdByUid === 'string' ? order.createdByUid : '');
  if (ownerUid) {
    const settingsSnap = await db.doc(`users/${ownerUid}/settings/profile`).get();
    const settings = settingsSnap.exists ? settingsSnap.data() || {} : {};
    const raw = settings.orderTrackingTemplate && typeof settings.orderTrackingTemplate === 'object'
      ? settings.orderTrackingTemplate : {};
    const safeText = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
    const safeColor = (value) => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : '';
    const logoUrl = safeText(raw.logoUrl, 500);
    const isOwnedTrackingLogo = (value) => {
      try {
        const parsed = new URL(value);
        let storagePath = '';
        if (['cdn.luisices.com.br', 'cdn-dev.luisices.com.br'].includes(parsed.hostname)) {
          storagePath = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
        } else if (parsed.hostname === 'firebasestorage.googleapis.com') {
          const match = parsed.pathname.match(/\/o\/(.+)$/);
          if (match) storagePath = decodeURIComponent(match[1]);
        }
        return storagePath.startsWith(`users/${ownerUid}/tracking-logo/`)
          && storagePath.split('/').length === 4
          && !storagePath.split('/').includes('..');
      } catch {
        return false;
      }
    };
    trackingTemplate = {
      layout: ['classic', 'editorial', 'soft'].includes(raw.layout) ? raw.layout : 'classic',
      brandName: safeText(raw.brandName, 80) || safeText(settings.businessName, 80),
      logoUrl: isOwnedTrackingLogo(logoUrl) ? logoUrl : (typeof settings.logo === 'string' && /^https:\/\//i.test(settings.logo) ? settings.logo.slice(0, 500) : ''),
      title: safeText(raw.title, 100) || 'Acompanhe seu pedido',
      subtitle: safeText(raw.subtitle, 160) || 'Veja as atualizações do seu pedido por aqui.',
      footerText: safeText(raw.footerText, 240) || 'Dúvidas? Fale com a nossa equipe.',
      backgroundColor: safeColor(raw.backgroundColor),
      surfaceColor: safeColor(raw.surfaceColor),
      primaryColor: safeColor(raw.primaryColor),
      textColor: safeColor(raw.textColor),
      showLogo: typeof raw.showLogo === 'boolean' ? raw.showLogo : true,
      showProgress: typeof raw.showProgress === 'boolean' ? raw.showProgress : true,
      showProduct: typeof raw.showProduct === 'boolean' ? raw.showProduct : true,
      showQuantity: typeof raw.showQuantity === 'boolean' ? raw.showQuantity : true,
      showDeliveryDate: typeof raw.showDeliveryDate === 'boolean' ? raw.showDeliveryDate : true,
      showTrackingCode: typeof raw.showTrackingCode === 'boolean' ? raw.showTrackingCode : true,
      productLabel: safeText(raw.productLabel, 40) || 'Item',
      quantityLabel: safeText(raw.quantityLabel, 40) || 'Quantidade',
      deliveryLabel: safeText(raw.deliveryLabel, 40) || 'Previsão de entrega',
      trackingLabel: safeText(raw.trackingLabel, 40) || 'Código de rastreio',
    };
  }
  return {
    orderNumber: typeof order.orderNumber === 'string' ? order.orderNumber.slice(0, 100) : '',
    status: ['pending', 'in-progress', 'completed', 'cancelled'].includes(order.status) ? order.status : 'pending',
    productName: typeof order.productName === 'string' ? order.productName.slice(0, 160) : 'Pedido personalizado',
    quantity: Number.isSafeInteger(order.quantity) && order.quantity > 0 ? order.quantity : 1,
    deliveryDate: typeof order.deliveryDate === 'string' ? order.deliveryDate.slice(0, 40) : '',
    updatedAt: typeof order.updatedAt === 'string' ? order.updatedAt.slice(0, 40) : (typeof order.createdAt === 'string' ? order.createdAt.slice(0, 40) : ''),
    shippingStatus: typeof order.shippingStatus === 'string' ? order.shippingStatus.slice(0, 80) : '',
    shippingTrackingNumber: typeof order.shippingTrackingNumber === 'string' ? order.shippingTrackingNumber.slice(0, 120) : '',
    trackingTemplate,
  };
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

/**
 * Módulo de Pedidos e Catálogo Público (Cloud Functions v2).
 */

const { Timestamp, FieldValue, getFirestore } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');
const { onCall } = require('../common/sentryFunctions');
const { ORDER_TRACKING_ENCRYPTION_KEY } = require('../common/secrets');
const crypto = require('crypto');
const { publicCatalogOrderLimiter, publicOrderTrackingLimiter } = require('../common/rateLimiters');
const { getTrustedClientIp } = require('../originProtection');

let publicCatalogCache = { expiresAt: 0, products: null };

/** Retorna somente os campos necessários para montar a vitrine pública. */
const getPublicCatalogProducts = onCall({ cors: true, maxInstances: 10 }, async () => {
  const db = getFirestore();
  const settings = await db.doc('storeSettings/public').get();
  if (!settings.exists || settings.data()?.storePublished === false) return { products: [] };
  if (process.env.FUNCTIONS_EMULATOR !== 'true' && publicCatalogCache.products && publicCatalogCache.expiresAt > Date.now()) {
    return { products: publicCatalogCache.products };
  }
  const snapshot = await db.collection('storeProducts')
    .select('name', 'price', 'unitPrice', 'category', 'description', 'imageUrl', 'photoUrl', 'images', 'leadTimeDays', 'badge', 'isCustomizable', 'active', 'status', 'order', 'createdAt')
    .get();

  const products = snapshot.docs.flatMap((doc) => {
    const data = doc.data() || {};
    const status = data.status || (data.active === false ? 'hidden' : 'active');
    const rawPrice = Number(data.price ?? data.unitPrice);
    const priceCents = Math.round(rawPrice * 100);
    if (!data.name || !Number.isFinite(rawPrice) || rawPrice <= 0 || !Number.isSafeInteger(priceCents) || !['active', 'paused'].includes(status)) return [];
    const rawLead = data.leadTimeDays;
    const leadTimeDays = rawLead !== undefined && rawLead !== null && Number.isFinite(Number(rawLead))
      ? Math.max(0, Number(rawLead))
      : 5;
    const rawImage = data.imageUrl || data.photoUrl || (Array.isArray(data.images) ? data.images[0] : '');
    const imageUrl = typeof rawImage === 'string' ? rawImage.trim().slice(0, 2048) : '';
    return [{
      id: doc.id,
      name: String(data.name).slice(0, 200),
      price: priceCents / 100,
      category: typeof data.category === 'string' ? data.category.slice(0, 100) : 'Geral',
      description: typeof data.description === 'string' ? data.description.slice(0, 4000) : '',
      imageUrl,
      leadTimeDays,
      badge: typeof data.badge === 'string' ? data.badge.slice(0, 80) : undefined,
      isCustomizable: data.isCustomizable !== false,
      status,
      order: Number.isFinite(Number(data.order)) ? Number(data.order) : undefined,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || (typeof data.createdAt === 'string' ? data.createdAt : undefined),
    }];
  });
  if (process.env.FUNCTIONS_EMULATOR !== 'true') {
    publicCatalogCache = { products, expiresAt: Date.now() + 60_000 };
  }
  return { products };
});

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

/**
 * Sincronização legado mantida para compatibilidade retroativa com clientes antigos.
 */
const syncAllOrdersToAiView = onCall(async () => {
  return {
    success: true,
    count: 0,
    message: 'A sincronização agora é nativa e em tempo real em memória.',
  };
});

/** Gera um link secreto de acompanhamento quando o pedido ainda não tem link ativo. */
const createOrderTrackingLink = onCall({ cors: true, maxInstances: 10, memory: '512MiB', secrets: [ORDER_TRACKING_ENCRYPTION_KEY] }, async (request) => {
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
});

/** Lista links criados pelo usuário ou todos para administradores. Os tokens só saem por callable autenticada. */
const listOrderTrackingLinks = onCall({ cors: true, maxInstances: 10, memory: '512MiB', secrets: [ORDER_TRACKING_ENCRYPTION_KEY] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta para consultar os links.');
  const profileSnap = await getFirestore().doc(`userProfiles/${uid}`).get();
  const profile = profileSnap.data() || {};
  if (!profileSnap.exists || profile.active === false) throw new HttpsError('permission-denied', 'Sua conta não pode consultar links.');
  const isAdmin = profile.role === 'admin';
  const canViewOrders = isAdmin || profile.permissions?.orders === true || profile.permissions?.orders?.view === true;
  if (!canViewOrders) throw new HttpsError('permission-denied', 'Você não tem permissão para consultar links de pedidos.');
  getTrackingEncryptionKey();

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
});

/** Invalida imediatamente o link público de acompanhamento. */
const revokeOrderTrackingLink = onCall({ cors: true, maxInstances: 10 }, async (request) => {
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
});

/** Revoga um link específico da lista de links e respeita quem o criou ou a administração. */
const revokeOrderTrackingLinkById = onCall({ cors: true, maxInstances: 10 }, async (request) => {
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
});

/** Remove um link do histórico; se ainda estiver ativo, invalida-o antes da exclusão. */
const deleteOrderTrackingLink = onCall({ cors: true, maxInstances: 10, memory: '512MiB' }, async (request) => {
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
});

/** Remove múltiplos links do histórico em lote (até 100 por chamada). */
const deleteOrderTrackingLinksBatch = onCall({ cors: true, maxInstances: 10, memory: '512MiB' }, async (request) => {
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
});

/** Retorna somente dados próprios para acompanhamento público; nunca expõe dados financeiros/contato. */
const getPublicOrderTracking = onCall({ cors: true, maxInstances: 20, memory: '512MiB' }, async (request) => {
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
});

/**
 * Checkout Público Confiável (Lojinha Online / Vitrine).
 * Valida produtos, preços oficiais e disponibilidade no servidor e grava de forma atômica e idempotente.
 */
async function handleSubmitPublicCatalogOrder(request, dependencies = {}) {
  const limiter = dependencies.publicCatalogOrderLimiter || publicCatalogOrderLimiter;
  const firestore = dependencies.getFirestore || getFirestore;
  const timestamp = dependencies.Timestamp || Timestamp;
  const getClientIp = dependencies.getTrustedClientIp || getTrustedClientIp;
  // 1. Rate Limiting por IP para conter abusos e automações não autorizadas
  const clientIp = getClientIp(request.rawRequest);

  try {
    await limiter.consume(clientIp);
  } catch (_limiterErr) {
    throw new HttpsError(
      'resource-exhausted',
      'Muitas tentativas de pedido em sequência. Por favor, aguarde alguns minutos antes de tentar novamente.'
    );
  }

  const data = request.data || {};
  const { items, customerNotes, submittedSubtotal, idempotencyKey } = data;

  if (
    submittedSubtotal !== undefined &&
    (typeof submittedSubtotal !== 'number' || !Number.isFinite(submittedSubtotal) || submittedSubtotal < 0)
  ) {
    throw new HttpsError('invalid-argument', 'O subtotal enviado deve ser um número finito e não negativo.');
  }

  // 2. Validação estrutural de entrada
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpsError('invalid-argument', 'O carrinho de pedidos não pode estar vazio.');
  }
  if (items.length > 50) {
    throw new HttpsError('invalid-argument', 'O limite máximo é de 50 itens distintos por pedido.');
  }

  // Chave de idempotência segura (se informada)
  if (idempotencyKey !== undefined && idempotencyKey !== null) {
    if (
      typeof idempotencyKey !== 'string' ||
      idempotencyKey.trim().length < 8 ||
      idempotencyKey.trim().length > 100
    ) {
      throw new HttpsError('invalid-argument', 'A chave de idempotência deve ter entre 8 e 100 caracteres.');
    }
  }
  const safeIdempotencyKey = idempotencyKey?.trim() || null;

  const db = firestore();

  // 3. Validação do status da Lojinha no servidor (storeSettings/public)
  const settingsSnap = await db.doc('storeSettings/public').get();
  let minimumOrderAmountCents = 0;
  if (settingsSnap.exists) {
    const sData = settingsSnap.data() || {};
    if (sData.storePublished === false) {
      throw new HttpsError(
        'failed-precondition',
        sData.storeUnpublishMessage || 'A lojinha online está temporariamente indisponível para novos pedidos.'
      );
    }
    if (
      sData.catalogOrdersDisabled === true ||
      sData.catalogEnabled === false ||
      (sData.featureFlags && sData.featureFlags.enableOnlineOrders === false)
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Os pedidos online estão desabilitados temporariamente. Entre em contato diretamente pelo WhatsApp.'
      );
    }
    const configuredMinimum = sData.catalogMinOrderAmount;
    if (configuredMinimum !== undefined && configuredMinimum !== null) {
      const minimumCents = Math.round(Number(configuredMinimum) * 100);
      if (typeof configuredMinimum !== 'number' || !Number.isFinite(configuredMinimum) || configuredMinimum < 0 || !Number.isSafeInteger(minimumCents)) {
        throw new HttpsError('failed-precondition', 'O valor mínimo da loja está configurado incorretamente.');
      }
      minimumOrderAmountCents = minimumCents;
    }
  } else {
    // Política fail-closed: se o documento de configuração não existir, não aceita pedidos
    throw new HttpsError(
      'failed-precondition',
      'Configuração da vitrine online não encontrada. A lojinha está temporariamente indisponível.'
    );
  }

  // 4. Validação e cálculo confiável dos produtos via storeProducts
  for (const item of items) {
    if (!item || typeof item.productId !== 'string' || !item.productId.trim()) {
      throw new HttpsError('invalid-argument', 'Cada item deve possuir um productId válido.');
    }
  }

  // Deduplica IDs apenas para leitura eficiente do catálogo oficial (preserva linhas individuais de personalização)
  const uniqueProductIds = Array.from(new Set(items.map((i) => i.productId.trim())));
  const productsSnaps = await Promise.all(uniqueProductIds.map((pId) => db.doc(`storeProducts/${pId}`).get()));
  const productMap = new Map();
  for (const snap of productsSnaps) {
    if (snap.exists) {
      productMap.set(snap.id, snap.data());
    }
  }

  let computedSubtotal = 0;
  let computedSubtotalCents = 0;
  let totalItemsCount = 0;
  const verifiedItems = [];

  for (const item of items) {
    const trimmedPid = item.productId.trim();
    const pData = productMap.get(trimmedPid);
    if (!pData) {
      throw new HttpsError('not-found', `Produto "${trimmedPid}" não encontrado no catálogo.`);
    }

    const computedStatus = pData.status || (pData.active === false ? 'hidden' : 'active');
    if (computedStatus !== 'active') {
      throw new HttpsError(
        'failed-precondition',
        `O produto "${pData.name || trimmedPid}" está indisponível para pedidos no momento.`
      );
    }

    const rawOfficialPrice = Number(pData.price ?? pData.unitPrice);
    const officialPriceCents = Math.round(rawOfficialPrice * 100);
    if (!Number.isFinite(rawOfficialPrice) || rawOfficialPrice <= 0 || !Number.isSafeInteger(officialPriceCents)) {
      throw new HttpsError(
        'failed-precondition',
        `O produto "${pData.name || trimmedPid}" possui valor inválido.`
      );
    }
    const officialPrice = officialPriceCents / 100;

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
      throw new HttpsError(
        'invalid-argument',
        `A quantidade para "${pData.name || trimmedPid}" deve ser um número inteiro entre 1 e 100.`
      );
    }

    const rawLead = pData.leadTimeDays;
    const leadTimeDays =
      rawLead !== undefined && rawLead !== null && !isNaN(Number(rawLead))
        ? Math.max(0, Number(rawLead))
        : 5;

    const itemSubtotalCents = officialPriceCents * quantity;
    if (!Number.isSafeInteger(itemSubtotalCents) || !Number.isSafeInteger(computedSubtotalCents + itemSubtotalCents)) {
      throw new HttpsError('invalid-argument', 'O valor total do pedido excede o limite permitido.');
    }
    computedSubtotalCents += itemSubtotalCents;
    totalItemsCount += quantity;

    const cleanItem = {
      productId: trimmedPid,
      productName: String(pData.name || 'Produto').slice(0, 150),
      price: officialPrice,
      quantity,
      leadTimeDays,
    };

    if (item.customName && typeof item.customName === 'string' && item.customName.trim()) {
      cleanItem.customName = item.customName.trim().slice(0, 200);
    }
    if (pData.imageUrl && typeof pData.imageUrl === 'string' && pData.imageUrl.trim()) {
      cleanItem.imageUrl = pData.imageUrl.trim();
    }

    verifiedItems.push(cleanItem);
  }

  computedSubtotal = computedSubtotalCents / 100;

  if (computedSubtotalCents < minimumOrderAmountCents) {
    const minimumOrderAmount = minimumOrderAmountCents / 100;
    throw new HttpsError(
      'failed-precondition',
      `O pedido mínimo é de R$ ${minimumOrderAmount.toFixed(2)}. O carrinho atual soma R$ ${computedSubtotal.toFixed(2)}.`,
      { minimumOrderAmount, currentSubtotal: computedSubtotal }
    );
  }

  // 5. Verificação de preço alterado entre a exibição e a confirmação
  if (submittedSubtotal !== undefined && submittedSubtotal !== null) {
    if (Math.round(Number(submittedSubtotal) * 100) !== computedSubtotalCents) {
      throw new HttpsError(
        'aborted',
        `O valor do pedido foi atualizado (R$ ${computedSubtotal.toFixed(2)}). Por favor, revise o valor do seu carrinho antes de confirmar.`,
        { currentSubtotal: computedSubtotal, submittedSubtotal: Number(submittedSubtotal) }
      );
    }
  }

  // 6. Geração do código do pedido e gravação com verifiedByServer: true de forma atômica e idempotente
  const orderCode = `LJ-${crypto.randomInt(1000, 10000)}`;
  const now = timestamp.now();

  const payloadForHash = JSON.stringify({
    items: verifiedItems.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      price: i.price,
      customName: i.customName || '',
      customTheme: i.customTheme || '',
    })),
    customerNotes: customerNotes && typeof customerNotes === 'string' ? customerNotes.trim().slice(0, 2000) : '',
    subtotal: computedSubtotal,
  });
  const payloadHash = crypto.createHash('sha256').update(payloadForHash).digest('hex');

  const docData = {
    orderCode,
    items: verifiedItems,
    totalItems: totalItemsCount,
    subtotal: computedSubtotal,
    officialSubtotal: computedSubtotal,
    submittedSubtotal: Number(submittedSubtotal) || computedSubtotal,
    isPriceTampered: false,
    verifiedByServer: true,
    payloadHash,
    status: 'received',
    createdAt: now,
    updatedAt: now,
  };

  if (customerNotes && typeof customerNotes === 'string' && customerNotes.trim()) {
    docData.customerNotes = customerNotes.trim().slice(0, 2000);
  }
  if (safeIdempotencyKey) {
    docData.idempotencyKey = safeIdempotencyKey;
  }

  // Se safeIdempotencyKey estiver presente, usa ID determinístico e transação atômica para eliminar race condition
  const orderDocId = safeIdempotencyKey
    ? `pub_${crypto.createHash('sha256').update(safeIdempotencyKey).digest('hex').slice(0, 24)}`
    : db.collection('catalogOrders').doc().id;

  const orderDocRef = db.collection('catalogOrders').doc(orderDocId);

  const result = await db.runTransaction(async (transaction) => {
    const existingDoc = await transaction.get(orderDocRef);
    if (existingDoc.exists) {
      const existingData = existingDoc.data();
      if (existingData.payloadHash && existingData.payloadHash !== payloadHash) {
        throw new HttpsError(
          'already-exists',
          'A chave de idempotência fornecida já foi utilizada para um pedido com itens ou valores diferentes.'
        );
      }
      return {
        orderId: existingDoc.id,
        orderCode: existingData.orderCode,
        subtotal: existingData.subtotal,
        totalItems: existingData.totalItems,
        verifiedByServer: true,
        isIdempotentReplay: true,
      };
    }

    transaction.set(orderDocRef, docData);
    return {
      orderId: orderDocRef.id,
      orderCode,
      subtotal: computedSubtotal,
      totalItems: totalItemsCount,
      verifiedByServer: true,
      isIdempotentReplay: false,
    };
  });

  return result;
}

const submitPublicCatalogOrder = onCall({ cors: true, maxInstances: 10 }, handleSubmitPublicCatalogOrder);

// A integração SuperFrete Sandbox é restrita a dev/emulador.
const isDevOrEmulator =
  process.env.GCLOUD_PROJECT === 'luisices-dev' ||
  process.env.FUNCTIONS_EMULATOR === 'true' ||
  !process.env.GCLOUD_PROJECT;

let calculateSuperfreteShipping;
let createSuperfreteLabel;

if (isDevOrEmulator) {
  const superfrete = require('./superfrete');
  calculateSuperfreteShipping = superfrete.calculateSuperfreteShipping;
  createSuperfreteLabel = superfrete.createSuperfreteLabel;
}

module.exports = {
  syncAllOrdersToAiView,
  submitPublicCatalogOrder,
  getPublicCatalogProducts,
  createOrderTrackingLink,
  listOrderTrackingLinks,
  revokeOrderTrackingLink,
  revokeOrderTrackingLinkById,
  deleteOrderTrackingLink,
  deleteOrderTrackingLinksBatch,
  getPublicOrderTracking,
  handleSubmitPublicCatalogOrder,
  calculateSuperfreteShipping,
  createSuperfreteLabel,
};

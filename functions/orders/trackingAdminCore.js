const crypto = require('node:crypto');

function createCoreError(code, message, details) {
  const err = new Error(message);
  err.code = code;
  if (details !== undefined) err.details = details;
  return err;
}

function getTrackingEncryptionKey(encryptionKeyBase64) {
  const key = Buffer.from(encryptionKeyBase64 || '', 'base64');
  if (key.length !== 32) {
    throw createCoreError('failed-precondition', 'A chave segura dos links não está configurada no servidor.');
  }
  return key;
}

function encryptTrackingToken(token, encryptionKeyBase64) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getTrackingEncryptionKey(encryptionKeyBase64), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

function decryptTrackingToken(value, encryptionKeyBase64) {
  const [ivValue, tagValue, ciphertextValue] = String(value || '').split('.');
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error('invalid_ciphertext');
  const authTag = Buffer.from(tagValue, 'base64url');
  if (authTag.length !== 16) throw new Error('invalid_auth_tag');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getTrackingEncryptionKey(encryptionKeyBase64),
    Buffer.from(ivValue, 'base64url'),
    { authTagLength: 16 },
  );
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function assertOrderLinkPermission(profileSnap, order, uid, message) {
  const profile = profileSnap.data() || {};
  const isAdmin = profileSnap.exists && profile.role === 'admin' && profile.active !== false;
  const canViewOrders = isAdmin || profile.permissions?.orders === true || profile.permissions?.orders?.view === true;
  if (!profileSnap.exists || profile.active === false || !canViewOrders || (order.userId !== uid && order.assignedTo !== uid && !isAdmin)) {
    throw createCoreError('permission-denied', message);
  }
  return { profile, isAdmin };
}

async function createOrderTrackingLinkCore(uid, data, { db, fieldValue, encryptionKeyBase64 }) {
  const orderId = data?.orderId;
  if (!uid) throw createCoreError('unauthenticated', 'Entre na sua conta para gerar o link.');
  if (typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(orderId)) {
    throw createCoreError('invalid-argument', 'Pedido inválido.');
  }
  const expirationDays = data?.expirationDays === undefined ? 90 : data.expirationDays;
  if (expirationDays !== null && ![7, 30, 90].includes(expirationDays)) {
    throw createCoreError('invalid-argument', 'Escolha uma validade de 7, 30 ou 90 dias, ou sem expiração.');
  }

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
    if (!orderSnap.exists) throw createCoreError('not-found', 'Pedido não encontrado.');
    const order = orderSnap.data() || {};
    const { profile } = assertOrderLinkPermission(
      profileSnap,
      order,
      uid,
      'Você não tem acesso para compartilhar este pedido.',
    );
    if (order.isArchived || !['pending', 'in-progress'].includes(order.status)) {
      throw createCoreError('failed-precondition', 'Só é possível compartilhar pedidos pendentes ou em produção.');
    }

    const expiryValue = order.publicTrackingExpiresAt;
    const expiryMs = typeof expiryValue === 'string' ? Date.parse(expiryValue) : Number.NaN;
    const hasHash = typeof order.publicTrackingHash === 'string' && order.publicTrackingHash.length > 0;
    const hasActiveLink = hasHash
      && (expiryValue === null || (Number.isFinite(expiryMs) && expiryMs > Date.now()));
    if (hasActiveLink) {
      throw createCoreError('already-exists', 'Este pedido já possui um link ativo. Revogue-o antes de criar outro.');
    }

    transaction.create(linkRef, {
      orderId,
      orderNumber: order.orderNumber || '',
      customerName: order.customerName || '',
      status: order.status || 'pending',
      createdByUid: uid,
      createdByName: profile.displayName || profile.email || uid,
      tokenCiphertext: encryptTrackingToken(token, encryptionKeyBase64),
      tokenHash,
      expiresAt,
      createdAt: fieldValue.serverTimestamp(),
      revokedAt: null,
    });
    transaction.update(orderRef, {
      publicTrackingHash: tokenHash,
      publicTrackingExpiresAt: expiresAt,
      publicTrackingLinkId: linkId,
    });
  });

  return { token, expiresAt, linkId };
}

async function listOrderTrackingLinksCore(uid, data, { db, encryptionKeyBase64 }) {
  if (!uid) throw createCoreError('unauthenticated', 'Entre na sua conta para consultar os links.');
  const profileSnap = await db.doc(`userProfiles/${uid}`).get();
  const profile = profileSnap.data() || {};
  if (!profileSnap.exists || profile.active === false) {
    throw createCoreError('permission-denied', 'Sua conta não pode consultar links.');
  }
  const isAdmin = profile.role === 'admin';
  const canViewOrders = isAdmin || profile.permissions?.orders === true || profile.permissions?.orders?.view === true;
  if (!canViewOrders) {
    throw createCoreError('permission-denied', 'Você não tem permissão para consultar links de pedidos.');
  }
  getTrackingEncryptionKey(encryptionKeyBase64);

  const requestedOrderId = data?.orderId;
  if (requestedOrderId !== undefined) {
    if (typeof requestedOrderId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(requestedOrderId)) {
      throw createCoreError('invalid-argument', 'Pedido inválido.');
    }

    const orderSnap = await db.doc(`orders/${requestedOrderId}`).get();
    if (!orderSnap.exists) throw createCoreError('not-found', 'Pedido não encontrado.');
    const order = orderSnap.data() || {};
    const linkId = order.publicTrackingLinkId;
    let linkDoc = null;
    if (typeof linkId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(linkId)) {
      const linkSnap = await db.doc(`orderTrackingLinks/${linkId}`).get();
      if (linkSnap.exists) linkDoc = linkSnap;
    }
    if (!linkDoc) {
      const legacyLinks = await db.collection('orderTrackingLinks')
        .where('orderId', '==', requestedOrderId)
        .get();
      const eligible = legacyLinks.docs
        .filter((doc) => {
          const docData = doc.data() || {};
          if (docData.revokedAt || (!isAdmin && docData.createdByUid !== uid)) return false;
          const expiration = docData.expiresAt?.toDate?.()?.getTime?.() ??
            (typeof docData.expiresAt === 'string' ? Date.parse(docData.expiresAt) : null);
          return expiration === null || (Number.isFinite(expiration) && expiration > Date.now());
        })
        .sort((a, b) => (b.data().createdAt?.toMillis?.() || 0) - (a.data().createdAt?.toMillis?.() || 0));
      linkDoc = eligible[0] || null;
    }
    if (!linkDoc) return { link: null };
    const linkData = linkDoc.data() || {};
    if (linkData.orderId !== requestedOrderId || (!isAdmin && linkData.createdByUid !== uid)) {
      throw createCoreError('permission-denied', 'Você não pode consultar este link.');
    }
    if (linkData.revokedAt) return { link: null };

    const expiresAt = linkData.expiresAt?.toDate?.()?.toISOString?.() ||
      (typeof linkData.expiresAt === 'string' ? linkData.expiresAt : null);
    if (expiresAt && (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())) {
      return { link: null };
    }

    let token = null;
    try {
      token = decryptTrackingToken(linkData.tokenCiphertext, encryptionKeyBase64);
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

  const cursorId = data?.cursor;
  if (cursorId !== undefined && cursorId !== null && (typeof cursorId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(cursorId))) {
    throw createCoreError('invalid-argument', 'Cursor de paginação inválido.');
  }
  const pageSize = Math.max(1, Math.min(Number(data?.pageSize) || 50, 100));
  let query = db.collection('orderTrackingLinks');
  if (!isAdmin) query = query.where('createdByUid', '==', uid);
  query = query.orderBy('createdAt', 'desc');
  if (cursorId) {
    const cursor = await db.doc(`orderTrackingLinks/${cursorId}`).get();
    if (!cursor.exists || (!isAdmin && cursor.data()?.createdByUid !== uid)) {
      throw createCoreError('invalid-argument', 'Cursor de paginação inválido.');
    }
    query = query.startAfter(cursor);
  }
  query = query.limit(pageSize + 1);
  const snapshot = await query.get();
  const hasMore = snapshot.docs.length > pageSize;
  const docs = snapshot.docs.slice(0, pageSize);
  const links = docs.map((doc) => {
    const docData = doc.data();
    let token = null;
    try {
      token = decryptTrackingToken(docData.tokenCiphertext, encryptionKeyBase64);
    } catch (error) {
      console.error('[listOrderTrackingLinks] Não foi possível descriptografar o token:', doc.id, error?.message);
    }
    return {
      id: doc.id,
      orderId: docData.orderId || '',
      orderNumber: docData.orderNumber || '',
      customerName: docData.customerName || '',
      status: docData.status || 'pending',
      token,
      expiresAt: docData.expiresAt || null,
      createdAt: docData.createdAt?.toDate?.()?.toISOString?.() || null,
      revokedAt: docData.revokedAt?.toDate?.()?.toISOString?.() || null,
      createdByUid: docData.createdByUid || '',
      createdByName: docData.createdByName || docData.createdByUid || '',
    };
  });
  return { links, nextCursor: hasMore ? docs.at(-1)?.id || null : null };
}

async function revokeOrderTrackingLinkCore(uid, data, { db, fieldValue }) {
  const orderId = data?.orderId;
  if (!uid) throw createCoreError('unauthenticated', 'Entre na sua conta para desativar o link.');
  if (typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(orderId)) {
    throw createCoreError('invalid-argument', 'Pedido inválido.');
  }
  const orderRef = db.doc(`orders/${orderId}`);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw createCoreError('not-found', 'Pedido não encontrado.');
  const order = orderSnap.data() || {};
  const profileSnap = await db.doc(`userProfiles/${uid}`).get();
  assertOrderLinkPermission(
    profileSnap,
    order,
    uid,
    'Você não tem acesso para alterar o compartilhamento deste pedido.',
  );
  if (typeof order.publicTrackingHash !== 'string') return { success: true, revoked: false };

  const batch = db.batch();
  batch.update(orderRef, {
    publicTrackingHash: fieldValue.delete(),
    publicTrackingExpiresAt: fieldValue.delete(),
    publicTrackingLinkId: fieldValue.delete(),
  });
  if (order.publicTrackingLinkId) {
    batch.set(
      db.doc(`orderTrackingLinks/${order.publicTrackingLinkId}`),
      { revokedAt: fieldValue.serverTimestamp() },
      { merge: true },
    );
  }
  await batch.commit();
  return { success: true, revoked: true };
}

async function revokeOrderTrackingLinkByIdCore(uid, data, { db, fieldValue }) {
  const linkId = data?.linkId;
  if (!uid) throw createCoreError('unauthenticated', 'Entre na sua conta para revogar o link.');
  if (typeof linkId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(linkId)) {
    throw createCoreError('invalid-argument', 'Link inválido.');
  }

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
      throw createCoreError('permission-denied', 'Você não pode revogar este link.');
    }
    if (link.revokedAt) return { success: true, revoked: false };

    let orderSnap = null;
    if (typeof link.orderId === 'string' && link.orderId) {
      orderSnap = await transaction.get(db.doc(`orders/${link.orderId}`));
    }
    if (orderSnap?.exists && orderSnap.data()?.publicTrackingLinkId === linkId) {
      transaction.update(orderSnap.ref, {
        publicTrackingHash: fieldValue.delete(),
        publicTrackingExpiresAt: fieldValue.delete(),
        publicTrackingLinkId: fieldValue.delete(),
      });
    }
    transaction.update(linkRef, { revokedAt: fieldValue.serverTimestamp() });
    return { success: true, revoked: true };
  });
}

async function deleteOrderTrackingLinkCore(uid, data, { db, fieldValue }) {
  const linkId = data?.linkId;
  if (!uid) throw createCoreError('unauthenticated', 'Entre na sua conta para excluir o link.');
  if (typeof linkId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(linkId)) {
    throw createCoreError('invalid-argument', 'Link inválido.');
  }

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
      throw createCoreError('permission-denied', 'Você não pode excluir este link.');
    }

    let orderSnap = null;
    if (typeof link.orderId === 'string' && link.orderId) {
      orderSnap = await transaction.get(db.doc(`orders/${link.orderId}`));
    }
    if (orderSnap?.exists && orderSnap.data()?.publicTrackingLinkId === linkId) {
      transaction.update(orderSnap.ref, {
        publicTrackingHash: fieldValue.delete(),
        publicTrackingExpiresAt: fieldValue.delete(),
        publicTrackingLinkId: fieldValue.delete(),
      });
    }
    transaction.delete(linkRef);
    return { success: true, deleted: true };
  });
}

async function deleteOrderTrackingLinksBatchCore(uid, data, { db, fieldValue }) {
  const rawIds = data?.linkIds;
  if (!uid) throw createCoreError('unauthenticated', 'Entre na sua conta para excluir links.');
  if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > 100) {
    throw createCoreError('invalid-argument', 'Envie entre 1 e 100 identificadores de link.');
  }
  const linkIds = [...new Set(rawIds.filter((id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id)))];
  if (linkIds.length === 0) {
    throw createCoreError('invalid-argument', 'Nenhum link válido informado.');
  }

  const profileSnap = await db.doc(`userProfiles/${uid}`).get();
  const profile = profileSnap.data() || {};
  const isAdmin = profileSnap.exists && profile.role === 'admin' && profile.active !== false;
  const canViewOrders = isAdmin || profile.permissions?.orders === true || profile.permissions?.orders?.view === true;
  if (!profileSnap.exists || profile.active === false || !canViewOrders) {
    throw createCoreError('permission-denied', 'Você não tem permissão para excluir links de pedidos.');
  }

  const linkRefs = linkIds.map((id) => db.doc(`orderTrackingLinks/${id}`));
  const linkSnaps = await db.getAll(...linkRefs);
  const validLinkSnaps = linkSnaps.filter((snap) => {
    if (!snap.exists) return false;
    const linkData = snap.data() || {};
    return isAdmin || linkData.createdByUid === uid;
  });

  if (validLinkSnaps.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  const orderIdsToFetch = [...new Set(
    validLinkSnaps
      .map((s) => s.data()?.orderId)
      .filter((id) => typeof id === 'string' && id.length > 0),
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
        publicTrackingHash: fieldValue.delete(),
        publicTrackingExpiresAt: fieldValue.delete(),
        publicTrackingLinkId: fieldValue.delete(),
      });
    }
    batch.delete(linkSnap.ref);
    deletedCount++;
  }

  await batch.commit();
  return { success: true, deletedCount };
}

module.exports = {
  createOrderTrackingLinkCore,
  listOrderTrackingLinksCore,
  revokeOrderTrackingLinkCore,
  revokeOrderTrackingLinkByIdCore,
  deleteOrderTrackingLinkCore,
  deleteOrderTrackingLinksBatchCore,
};

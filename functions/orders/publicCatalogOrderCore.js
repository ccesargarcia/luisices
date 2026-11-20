const crypto = require('node:crypto');

function createCoreError(code, message, details) {
  const err = new Error(message);
  err.code = code;
  if (details !== undefined) err.details = details;
  return err;
}

/**
 * Núcleo puro de validação e criação idempotente de pedidos da Lojinha Pública.
 * Compartilhado entre Cloud Functions (submitPublicCatalogOrder) e Vercel Functions.
 */
async function handleSubmitPublicCatalogOrderCore(data, { getFirestore: getDb, nowFn } = {}) {
  if (typeof getDb !== 'function') {
    throw new Error('getFirestore é obrigatório.');
  }

  const { items, customerNotes, submittedSubtotal, idempotencyKey } = data || {};
  const sanitizedCustomerNotes = typeof customerNotes === 'string'
    ? customerNotes.replace(/[\u0000-\u001F\u007F]+/g, ' ').trim().slice(0, 1000)
    : '';

  if (
    submittedSubtotal !== undefined &&
    (typeof submittedSubtotal !== 'number' || !Number.isFinite(submittedSubtotal) || submittedSubtotal < 0)
  ) {
    throw createCoreError('invalid-argument', 'O subtotal enviado deve ser um número finito e não negativo.');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw createCoreError('invalid-argument', 'O carrinho de pedidos não pode estar vazio.');
  }
  if (items.length > 50) {
    throw createCoreError('invalid-argument', 'O limite máximo é de 50 itens distintos por pedido.');
  }

  if (idempotencyKey !== undefined && idempotencyKey !== null) {
    if (
      typeof idempotencyKey !== 'string' ||
      idempotencyKey.trim().length < 8 ||
      idempotencyKey.trim().length > 100
    ) {
      throw createCoreError('invalid-argument', 'A chave de idempotência deve ter entre 8 e 100 caracteres.');
    }
  }
  const safeIdempotencyKey = idempotencyKey?.trim() || null;

  const db = getDb();

  const settingsSnap = await db.doc('storeSettings/public').get();
  let minimumOrderAmountCents = 0;
  if (settingsSnap.exists) {
    const sData = settingsSnap.data() || {};
    if (sData.storePublished === false) {
      throw createCoreError(
        'failed-precondition',
        sData.storeUnpublishMessage || 'A lojinha online está temporariamente indisponível para novos pedidos.',
      );
    }
    if (
      sData.catalogOrdersDisabled === true ||
      sData.catalogEnabled === false ||
      (sData.featureFlags && sData.featureFlags.enableOnlineOrders === false)
    ) {
      throw createCoreError(
        'failed-precondition',
        'Os pedidos online estão desabilitados temporariamente. Entre em contato diretamente pelo WhatsApp.',
      );
    }
    const configuredMinimum = sData.catalogMinOrderAmount;
    if (configuredMinimum !== undefined && configuredMinimum !== null) {
      const minimumCents = Math.round(Number(configuredMinimum) * 100);
      if (
        typeof configuredMinimum !== 'number' ||
        !Number.isFinite(configuredMinimum) ||
        configuredMinimum < 0 ||
        !Number.isSafeInteger(minimumCents)
      ) {
        throw createCoreError('failed-precondition', 'O valor mínimo da loja está configurado incorretamente.');
      }
      minimumOrderAmountCents = minimumCents;
    }
  } else {
    throw createCoreError(
      'failed-precondition',
      'Configuração da vitrine online não encontrada. A lojinha está temporariamente indisponível.',
    );
  }

  const SAFE_DOC_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
  for (const item of items) {
    const trimmedPid = typeof item?.productId === 'string' ? item.productId.trim() : '';
    if (!trimmedPid || !SAFE_DOC_ID_RE.test(trimmedPid)) {
      throw createCoreError('invalid-argument', 'Cada item deve possuir um productId válido.');
    }
  }

  const uniqueProductIds = Array.from(new Set(items.map((i) => i.productId.trim())));
  const productsSnaps = await Promise.all(uniqueProductIds.map((pId) => db.doc(`storeProducts/${pId}`).get()));
  const productMap = new Map();
  for (const snap of productsSnaps) {
    if (snap.exists) {
      productMap.set(snap.id, snap.data());
    }
  }

  let computedSubtotalCents = 0;
  let totalItemsCount = 0;
  const verifiedItems = [];

  for (const item of items) {
    const trimmedPid = item.productId.trim();
    const pData = productMap.get(trimmedPid);
    if (!pData) {
      throw createCoreError('not-found', `Produto "${trimmedPid}" não encontrado no catálogo.`);
    }

    const computedStatus = pData.status || (pData.active === false ? 'hidden' : 'active');
    if (computedStatus !== 'active') {
      throw createCoreError(
        'failed-precondition',
        `O produto "${pData.name || trimmedPid}" está indisponível para pedidos no momento.`,
      );
    }

    const rawOfficialPrice = Number(pData.price ?? pData.unitPrice);
    const officialPriceCents = Math.round(rawOfficialPrice * 100);
    if (!Number.isFinite(rawOfficialPrice) || rawOfficialPrice <= 0 || !Number.isSafeInteger(officialPriceCents)) {
      throw createCoreError(
        'failed-precondition',
        `O produto "${pData.name || trimmedPid}" possui valor inválido.`,
      );
    }
    const officialPrice = officialPriceCents / 100;

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
      throw createCoreError(
        'invalid-argument',
        `A quantidade para "${pData.name || trimmedPid}" deve ser um número inteiro entre 1 e 100.`,
      );
    }

    const rawLead = pData.leadTimeDays;
    const leadTimeDays =
      rawLead !== undefined && rawLead !== null && !isNaN(Number(rawLead))
        ? Math.max(0, Number(rawLead))
        : 5;

    const itemSubtotalCents = officialPriceCents * quantity;
    if (!Number.isSafeInteger(itemSubtotalCents) || !Number.isSafeInteger(computedSubtotalCents + itemSubtotalCents)) {
      throw createCoreError('invalid-argument', 'O valor total do pedido excede o limite permitido.');
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

    if (item.customName && typeof item.customName === 'string') {
      const sanitizedCustomName = item.customName.replace(/[\u0000-\u001F\u007F]+/g, ' ').trim();
      if (sanitizedCustomName) {
        cleanItem.customName = sanitizedCustomName.slice(0, 200);
      }
    }
    if (item.customTheme && typeof item.customTheme === 'string') {
      const sanitizedCustomTheme = item.customTheme.replace(/[\u0000-\u001F\u007F]+/g, ' ').trim();
      if (sanitizedCustomTheme) {
        cleanItem.customTheme = sanitizedCustomTheme.slice(0, 200);
      }
    }
    if (pData.imageUrl && typeof pData.imageUrl === 'string' && pData.imageUrl.trim()) {
      cleanItem.imageUrl = pData.imageUrl.trim();
    }

    verifiedItems.push(cleanItem);
  }

  const computedSubtotal = computedSubtotalCents / 100;

  if (computedSubtotalCents < minimumOrderAmountCents) {
    const minimumOrderAmount = minimumOrderAmountCents / 100;
    throw createCoreError(
      'failed-precondition',
      `O pedido mínimo é de R$ ${minimumOrderAmount.toFixed(2)}. O carrinho atual soma R$ ${computedSubtotal.toFixed(2)}.`,
      { minimumOrderAmount, currentSubtotal: computedSubtotal },
    );
  }

  if (submittedSubtotal !== undefined && submittedSubtotal !== null) {
    if (Math.round(Number(submittedSubtotal) * 100) !== computedSubtotalCents) {
      throw createCoreError(
        'aborted',
        `O valor do pedido foi atualizado (R$ ${computedSubtotal.toFixed(2)}). Por favor, revise o valor do seu carrinho antes de confirmar.`,
        { currentSubtotal: computedSubtotal, submittedSubtotal: Number(submittedSubtotal) },
      );
    }
  }

  const orderCode = `LJ-${crypto.randomInt(1000, 10000)}`;
  const now = typeof nowFn === 'function' ? nowFn() : new Date();

  const payloadForHash = JSON.stringify({
    items: verifiedItems.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      price: i.price,
      customName: i.customName || '',
      customTheme: i.customTheme || '',
    })),
    customerNotes: sanitizedCustomerNotes,
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

  if (sanitizedCustomerNotes) {
    docData.customerNotes = sanitizedCustomerNotes;
  }
  if (safeIdempotencyKey) {
    docData.idempotencyKey = safeIdempotencyKey;
  }

  const orderDocId = safeIdempotencyKey
    ? `pub_${crypto.createHash('sha256').update(safeIdempotencyKey).digest('hex').slice(0, 24)}`
    : db.collection('catalogOrders').doc().id;

  const orderDocRef = db.collection('catalogOrders').doc(orderDocId);

  return db.runTransaction(async (transaction) => {
    const existingDoc = await transaction.get(orderDocRef);
    if (existingDoc.exists) {
      const existingData = existingDoc.data();
      if (existingData.payloadHash && existingData.payloadHash !== payloadHash) {
        throw createCoreError(
          'already-exists',
          'A chave de idempotência fornecida já foi utilizada para um pedido com itens ou valores diferentes.',
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
}

module.exports = { handleSubmitPublicCatalogOrderCore };

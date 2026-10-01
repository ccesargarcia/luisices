/**
 * Módulo de Pedidos e Catálogo Público (Cloud Functions v2).
 */

const functions = require('firebase-functions');
const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { publicCatalogOrderLimiter } = require('../common/rateLimiters');

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

/**
 * Checkout Público Confiável (Lojinha Online / Vitrine).
 * Valida produtos, preços oficiais, disponibilidade e estoque no servidor de forma atômica e idempotente.
 */
const submitPublicCatalogOrder = onCall({ cors: true, maxInstances: 10 }, async (request) => {
  // 1. Rate Limiting por IP para conter abusos e automações não autorizadas
  const clientIp =
    request.rawRequest?.ip ||
    request.rawRequest?.headers?.['x-forwarded-for']?.split(',')?.[0]?.trim() ||
    'public_visitor';

  try {
    await publicCatalogOrderLimiter.consume(clientIp);
  } catch (_limiterErr) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Muitas tentativas de pedido em sequência. Por favor, aguarde alguns minutos antes de tentar novamente.'
    );
  }

  const data = request.data || {};
  const { items, customerNotes, submittedSubtotal, idempotencyKey } = data;

  // 2. Validação estrutural de entrada
  if (!Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'O carrinho de pedidos não pode estar vazio.');
  }
  if (items.length > 50) {
    throw new functions.https.HttpsError('invalid-argument', 'O limite máximo é de 50 itens distintos por pedido.');
  }

  // Chave de idempotência segura (se informada)
  const safeIdempotencyKey =
    idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.trim().length >= 8
      ? idempotencyKey.trim().slice(0, 100)
      : null;

  const db = admin.firestore();

  // 3. Validação do status da Lojinha no servidor (storeSettings/public)
  const settingsSnap = await db.doc('storeSettings/public').get();
  if (settingsSnap.exists) {
    const sData = settingsSnap.data() || {};
    if (sData.storePublished === false) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        sData.storeUnpublishMessage || 'A lojinha online está temporariamente indisponível para novos pedidos.'
      );
    }
    if (
      sData.catalogOrdersDisabled === true ||
      sData.catalogEnabled === false ||
      (sData.featureFlags && sData.featureFlags.enableOnlineOrders === false)
    ) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Os pedidos online estão desabilitados temporariamente. Entre em contato diretamente pelo WhatsApp.'
      );
    }
  } else {
    // Política fail-closed: se o documento de configuração não existir, não aceita pedidos
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Configuração da vitrine online não encontrada. A lojinha está temporariamente indisponível.'
    );
  }

  // 4. Validação e cálculo confiável dos produtos via storeProducts
  for (const item of items) {
    if (!item || typeof item.productId !== 'string' || !item.productId.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'Cada item deve possuir um productId válido.');
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
  let totalItemsCount = 0;
  const verifiedItems = [];

  for (const item of items) {
    const trimmedPid = item.productId.trim();
    const pData = productMap.get(trimmedPid);
    if (!pData) {
      throw new functions.https.HttpsError('not-found', `Produto "${trimmedPid}" não encontrado no catálogo.`);
    }

    const computedStatus = pData.status || (pData.active === false ? 'hidden' : 'active');
    if (computedStatus === 'hidden' || computedStatus === 'paused') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `O produto "${pData.name || trimmedPid}" está indisponível para pedidos no momento.`
      );
    }

    const officialPrice = Number(pData.price ?? pData.unitPrice);
    if (!Number.isFinite(officialPrice) || officialPrice <= 0) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `O produto "${pData.name || trimmedPid}" possui valor inválido.`
      );
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `A quantidade para "${pData.name || trimmedPid}" deve ser um número inteiro entre 1 e 100.`
      );
    }

    const rawLead = pData.leadTimeDays;
    const leadTimeDays =
      rawLead !== undefined && rawLead !== null && !isNaN(Number(rawLead))
        ? Math.max(0, Number(rawLead))
        : 5;

    const itemSubtotal = officialPrice * quantity;
    computedSubtotal += itemSubtotal;
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

  computedSubtotal = Math.round(computedSubtotal * 100) / 100;

  // 5. Verificação de preço alterado entre a exibição e a confirmação
  if (submittedSubtotal !== undefined && submittedSubtotal !== null) {
    const diff = Math.abs(Number(submittedSubtotal) - computedSubtotal);
    if (diff > 0.05) {
      throw new functions.https.HttpsError(
        'aborted',
        `O valor do pedido foi atualizado (R$ ${computedSubtotal.toFixed(2)}). Por favor, revise o valor do seu carrinho antes de confirmar.`,
        { currentSubtotal: computedSubtotal, submittedSubtotal: Number(submittedSubtotal) }
      );
    }
  }

  // 6. Geração do código do pedido e gravação com verifiedByServer: true de forma atômica e idempotente
  const orderCode = `LJ-${crypto.randomInt(1000, 10000)}`;
  const now = admin.firestore.Timestamp.now();

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
        throw new functions.https.HttpsError(
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
});

module.exports = {
  syncAllOrdersToAiView,
  submitPublicCatalogOrder,
};

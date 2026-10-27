/**
 * Módulo de Pedidos e Catálogo Público (Cloud Functions v2).
 */

const moduleInitializationStartedAt = process.hrtime.bigint();
const { Timestamp, FieldValue, getFirestore } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');
const { onCall } = require('../common/sentryFunctions');
const { withFirstInvocationSpan } = require('../common/sentry');
const { ORDER_TRACKING_ENCRYPTION_KEY } = require('../common/secrets');
const crypto = require('crypto');
const { publicCatalogOrderLimiter, publicOrderTrackingLimiter } = require('../common/rateLimiters');
const { getTrustedClientIp } = require('../originProtection');

function canonicalStringify(value) {
  if (value === null || value === undefined || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((entry) => canonicalStringify(entry ?? null)).join(',') + ']';
  }
  const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort();
  return '{' + keys.map((key) => JSON.stringify(key) + ':' + canonicalStringify(value[key])).join(',') + '}';
}

function computePayloadHash(data) {
  return crypto.createHash('sha256').update(canonicalStringify(data)).digest('hex');
}

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

const COMPLEX_ORDER_UPDATE_FIELDS = new Set([
  'customerName', 'customerPhone', 'customerId', 'productName', 'quantity', 'price',
  'items', 'unitPrice', 'pricingMode', 'status', 'deliveryDate', 'notes', 'tags',
  'payment', 'isExchange', 'exchangeNotes', 'exchangeItems', 'cardColor',
]);
const PAYMENT_METHODS = new Set(['pix', 'cash', 'credit', 'debit', 'transfer']);
const MAX_EMBEDDED_PAYMENT_HISTORY = 50;

/**
 * Compacta o histórico embutido para não ultrapassar MAX_EMBEDDED_PAYMENT_HISTORY entradas,
 * consolidando os eventos mais antigos por forma de pagamento. Isso preserva a exatidão
 * dos relatórios e métricas que leem payment.history sem inflar o tamanho do documento Firestore.
 */
function compressPaymentHistory(history, maxEntries = MAX_EMBEDDED_PAYMENT_HISTORY) {
  if (!Array.isArray(history) || history.length <= maxEntries) return history;

  const maxRecent = Math.max(1, maxEntries - PAYMENT_METHODS.size);
  const overflowCount = Math.max(0, history.length - maxRecent);
  const overflowEntries = history.slice(0, overflowCount);
  const recentEntries = history.slice(overflowCount);

  const methodTotals = new Map();
  const oldestDate = overflowEntries[0]?.date || new Date().toISOString();

  for (const entry of overflowEntries) {
    const amount = Number(entry?.amount);
    if (!Number.isFinite(amount)) continue;
    const method = PAYMENT_METHODS.has(entry?.method) ? entry.method : 'pix';
    const current = methodTotals.get(method) || { totalCents: 0, count: 0 };
    // Preserva contagens já consolidadas (inclusive quando o saldo for 0 por estorno) e conta 1 para novos pagamentos positivos
    const hasExplicitCount = Number(entry?.count) > 0;
    const entryCount = hasExplicitCount
      ? Number(entry.count)
      : (amount > 0 ? 1 : 0);
    methodTotals.set(method, {
      totalCents: current.totalCents + Math.round(amount * 100),
      count: current.count + entryCount,
    });
  }

  const consolidated = [];
  for (const [method, data] of methodTotals) {
    if (data.totalCents <= 0 && data.count === 0) continue;
    consolidated.push({
      amount: Math.max(0, data.totalCents) / 100,
      count: data.count,
      date: oldestDate,
      method,
      notes: `Consolidação de pagamentos anteriores (${method})`,
    });
  }

  return [...consolidated, ...recentEntries];
}

/**
 * Mantém o histórico financeiro anterior e cria ajustes de redução no servidor.
 * O cliente pode enviar a estrutura completa de payment, mas nunca é a fonte
 * confiável para adicionar, remover ou reescrever eventos do histórico.
 * O histórico embutido no documento é limitado a MAX_EMBEDDED_PAYMENT_HISTORY
 * eventos mais recentes para manter o documento leve; a subcoleção paymentEvents
 * preserva a trilha completa de auditoria de forma ilimitada.
 */
function buildAuthoritativePaymentHistory(previousPayment, nextPayment, now) {
  const previous = previousPayment && typeof previousPayment === 'object' ? previousPayment : {};
  const history = Array.isArray(previous.history) ? previous.history.map((entry) => ({ ...entry })) : [];
  const previousPaid = Number.isFinite(previous.paidAmount) ? Math.max(0, previous.paidAmount) : 0;
  const previousMethod = PAYMENT_METHODS.has(previous.method)
    ? previous.method
    : (PAYMENT_METHODS.has(nextPayment.method) ? nextPayment.method : 'pix');
  const incomingMethod = PAYMENT_METHODS.has(nextPayment.method)
    ? nextPayment.method
    : (PAYMENT_METHODS.has(previous.method) ? previous.method : 'pix');

  if (history.length === 0 && previousPaid > 0) {
    history.push({
      amount: previousPaid,
      date: typeof previous.paymentDate === 'string' ? previous.paymentDate : now,
      method: previousMethod,
      notes: 'Pagamento inicial registrado',
    });
  }

  const historyTotalCents = history.reduce((total, entry) => {
    const amount = Number(entry?.amount);
    return total + (Number.isFinite(amount) ? Math.round(amount * 100) : 0);
  }, 0);
  const baselineCents = Number.isFinite(previous.paidAmount) ? Math.round(previousPaid * 100) : historyTotalCents;
  let amountToReduceCents = baselineCents - Math.round(nextPayment.paidAmount * 100);
  const appendedEntries = [];
  if (amountToReduceCents < 0) {
    const amount = -amountToReduceCents / 100;
    const entry = {
      amount,
      date: now,
      method: incomingMethod,
      notes: `Pagamento registrado na atualização do pedido. Forma ${incomingMethod}: R$ ${amount.toFixed(2)}.`,
    };
    history.push(entry);
    appendedEntries.push(entry);
    const finalHistory = compressPaymentHistory(history, MAX_EMBEDDED_PAYMENT_HISTORY);
    return { history: finalHistory, appendedEntries };
  }
  if (amountToReduceCents === 0) {
    const finalHistory = compressPaymentHistory(history, MAX_EMBEDDED_PAYMENT_HISTORY);
    return { history: finalHistory.length ? finalHistory : null, appendedEntries };
  }

  const reductions = new Map();
  for (let index = history.length - 1; index >= 0 && amountToReduceCents > 0; index -= 1) {
    const amount = Number(history[index]?.amount);
    const positiveCents = Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
    if (positiveCents === 0) continue;
    const reductionCents = Math.min(positiveCents, amountToReduceCents);
    const method = PAYMENT_METHODS.has(history[index]?.method) ? history[index].method : previousMethod;
    reductions.set(method, (reductions.get(method) || 0) + reductionCents);
    amountToReduceCents -= reductionCents;
  }
  if (amountToReduceCents > 0) {
    reductions.set(previousMethod, (reductions.get(previousMethod) || 0) + amountToReduceCents);
  }

  for (const [method, reductionCents] of reductions) {
    const reduction = reductionCents / 100;
    const entry = {
      amount: -reduction,
      date: now,
      method,
      notes: `Ajuste automático após alteração do total do pedido. Forma ${method}: R$ ${reduction.toFixed(2)}.`,
    };
    history.push(entry);
    appendedEntries.push(entry);
  }
  const finalHistory = compressPaymentHistory(history, MAX_EMBEDDED_PAYMENT_HISTORY);
  return { history: finalHistory, appendedEntries };
}

function normalizeComplexOrderPayment(paymentUpdate, previousPayment, price, isExchange, now) {
  if (!paymentUpdate || typeof paymentUpdate !== 'object' || Array.isArray(paymentUpdate)) {
    throw new HttpsError('invalid-argument', 'Dados do pagamento inválidos.');
  }
  const allowedFields = new Set(['status', 'method', 'totalAmount', 'paidAmount', 'remainingAmount', 'paymentDate', 'notes', 'history']);
  if (Object.keys(paymentUpdate).some((key) => !allowedFields.has(key))) {
    throw new HttpsError('invalid-argument', 'O pagamento contém campos não permitidos.');
  }
  const existing = previousPayment && typeof previousPayment === 'object' ? previousPayment : {};
  const totalAmount = isExchange ? 0 : price;
  const requestedPaid = paymentUpdate.paidAmount ?? existing.paidAmount ?? 0;
  if (typeof requestedPaid !== 'number' || !Number.isFinite(requestedPaid) || requestedPaid < 0) {
    throw new HttpsError('invalid-argument', 'Valor pago inválido.');
  }
  if (requestedPaid > totalAmount) {
    throw new HttpsError('invalid-argument', 'O valor pago não pode exceder o total do pedido.');
  }
  const paidAmount = requestedPaid;
  const status = paidAmount === totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'pending';
  const method = Object.prototype.hasOwnProperty.call(paymentUpdate, 'method')
    ? paymentUpdate.method
    : (existing.method ?? null);
  const paymentDate = paidAmount === 0 ? null
    : (paymentUpdate.paymentDate ?? existing.paymentDate ?? now);
  const notes = Object.prototype.hasOwnProperty.call(paymentUpdate, 'notes')
    ? paymentUpdate.notes
    : (existing.notes ?? null);
  return {
    status,
    method,
    totalAmount,
    paidAmount,
    remainingAmount: Math.round((totalAmount - paidAmount) * 100) / 100,
    paymentDate,
    notes,
    // Never accept client history. The server rebuilds it from the stored order.
    history: null,
  };
}

function assertComplexOrderItems(items, quantity, price) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 10) {
    throw new HttpsError('invalid-argument', 'O pedido deve ter de 1 a 10 itens.');
  }
  let itemQuantity = 0;
  let itemTotalCents = 0;
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)
      || Object.keys(item).some((key) => !['name', 'quantity', 'unitPrice', 'price'].includes(key))
      || typeof item.name !== 'string' || !item.name.trim() || item.name.trim().length > 300
      || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000
      || typeof item.unitPrice !== 'number' || !Number.isFinite(item.unitPrice)
      || item.unitPrice < 0 || item.unitPrice > 1000000) {
      throw new HttpsError('invalid-argument', 'Um ou mais itens do pedido são inválidos.');
    }
    const unitPriceCents = Math.round(item.unitPrice * 100);
    if (Math.abs(item.unitPrice * 100 - unitPriceCents) > 0.001) {
      throw new HttpsError('invalid-argument', 'O preço unitário deve usar centavos inteiros.');
    }
    const expectedItemCents = item.quantity * unitPriceCents;
    if (item.price !== undefined && (typeof item.price !== 'number' || !Number.isFinite(item.price)
      || Math.abs(item.price * 100 - expectedItemCents) > 5)) {
      throw new HttpsError('invalid-argument', 'O subtotal de um item não corresponde à quantidade e ao preço unitário.');
    }
    itemQuantity += item.quantity;
    itemTotalCents += expectedItemCents;
  }
  if (!Number.isSafeInteger(quantity) || quantity !== itemQuantity
    || typeof price !== 'number' || !Number.isFinite(price)
    || Math.abs(price * 100 - itemTotalCents) > 5) {
    throw new HttpsError('invalid-argument', 'A quantidade e o total do pedido devem corresponder à soma dos itens.');
  }
  return items.map((item) => ({
    ...item,
    name: item.name.trim(),
    unitPrice: Math.round(item.unitPrice * 100) / 100,
    price: Math.round(item.quantity * item.unitPrice * 100) / 100,
  }));
}

function hasOrderPermission(profile, action) {
  const permission = profile.permissions?.orders;
  return permission === true || permission?.[action] === true;
}

function assertComplexOrderData(next, isExchange) {
  if (typeof next.price !== 'number' || !Number.isFinite(next.price) || next.price < 0 || next.price > 1000000
    || !Number.isSafeInteger(next.quantity) || next.quantity < 1 || next.quantity > 10000) {
    throw new HttpsError('invalid-argument', 'Preço ou quantidade do pedido inválidos.');
  }
  if (next.payment != null) {
    const payment = next.payment;
    const paid = payment.paidAmount ?? 0;
    const remaining = payment.remainingAmount ?? next.price - paid;
    const paymentTotal = isExchange === true ? 0 : next.price;
    if (payment.totalAmount !== paymentTotal || typeof paid !== 'number' || !Number.isFinite(paid)
      || paid < 0 || paid > paymentTotal || typeof remaining !== 'number'
      || Math.abs(remaining - (paymentTotal - paid)) > 0.005
      || !(['paid', 'partial', 'pending'].includes(payment.status))
      || (payment.status === 'paid' && paid !== paymentTotal)
      || (payment.status === 'partial' && !(paymentTotal > 0 && paid > 0 && paid < paymentTotal))
      || (payment.status === 'pending' && paid !== 0)) {
      throw new HttpsError('invalid-argument', 'Os valores de pagamento não correspondem ao pedido.');
    }
    if (Object.keys(payment).some((key) => !['status', 'method', 'totalAmount', 'paidAmount', 'remainingAmount', 'paymentDate', 'notes', 'history'].includes(key))) {
      throw new HttpsError('invalid-argument', 'O pagamento contém campos não permitidos.');
    }
    if (payment.method != null && !PAYMENT_METHODS.has(payment.method)) {
      throw new HttpsError('invalid-argument', 'Forma de pagamento inválida.');
    }
    if (payment.paymentDate != null && (typeof payment.paymentDate !== 'string'
      || payment.paymentDate.length > 64 || Number.isNaN(Date.parse(payment.paymentDate)))) {
      throw new HttpsError('invalid-argument', 'Data do pagamento inválida.');
    }
    if (payment.notes != null && (typeof payment.notes !== 'string' || payment.notes.length > 1000)) {
      throw new HttpsError('invalid-argument', 'Observações do pagamento inválidas.');
    }
    if (payment.history != null && (!Array.isArray(payment.history) || payment.history.length > 100
      || payment.history.some((entry) => !entry || typeof entry.amount !== 'number'
        || !Number.isFinite(entry.amount) || Math.abs(entry.amount) > 1000000
        || Math.abs(entry.amount * 100 - Math.round(entry.amount * 100)) > 0.001
        || typeof entry.date !== 'string' || entry.date.length > 64 || Number.isNaN(Date.parse(entry.date))
        || !PAYMENT_METHODS.has(entry.method)
        || Object.keys(entry).some((key) => !['amount', 'date', 'method', 'notes', 'count'].includes(key))
        || (entry.count != null && (!Number.isInteger(entry.count) || entry.count < 1 || entry.count > 100000))
        || (entry.notes != null && (typeof entry.notes !== 'string' || entry.notes.length > 1000))))) {
      throw new HttpsError('invalid-argument', 'Histórico de pagamento inválido.');
    }
  }
  if (next.status != null && !['pending', 'in-progress', 'completed', 'cancelled'].includes(next.status)) {
    throw new HttpsError('invalid-argument', 'Status do pedido inválido.');
  }
  if (next.customerName != null && (typeof next.customerName !== 'string' || !next.customerName.trim() || next.customerName.length > 200)) {
    throw new HttpsError('invalid-argument', 'Nome do cliente inválido.');
  }
  if (next.productName != null && (typeof next.productName !== 'string' || !next.productName.trim() || next.productName.length > 300)) {
    throw new HttpsError('invalid-argument', 'Nome dos produtos inválido.');
  }
  if (next.customerPhone != null && (typeof next.customerPhone !== 'string' || next.customerPhone.length > 50)) {
    throw new HttpsError('invalid-argument', 'Telefone do cliente inválido.');
  }
  if (next.notes != null && (typeof next.notes !== 'string' || next.notes.length > 1000)) {
    throw new HttpsError('invalid-argument', 'Observações inválidas.');
  }
  if (next.tags != null && (!Array.isArray(next.tags) || next.tags.length > 20
    || next.tags.some((tag) => !tag || typeof tag.name !== 'string' || !tag.name.trim()
      || Object.keys(tag).length !== 2 || !('name' in tag) || !('color' in tag)
      || tag.name !== tag.name.trim() || tag.name.includes('\0') || tag.name.length > 80
      || typeof tag.color !== 'string' || tag.color.includes('\0')
      || !/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(tag.color)))) {
    throw new HttpsError('invalid-argument', 'As etiquetas do pedido são inválidas.');
  }
  if (next.deliveryDate != null && (typeof next.deliveryDate !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(next.deliveryDate)
    || Number.isNaN(Date.parse(`${next.deliveryDate}T00:00:00Z`))
    || new Date(`${next.deliveryDate}T00:00:00.000Z`).toISOString().slice(0, 10) !== next.deliveryDate)) {
    throw new HttpsError('invalid-argument', 'Data de entrega inválida.');
  }
  if (next.customerId != null && (typeof next.customerId !== 'string'
    || !/^[A-Za-z0-9_-]{1,128}$/.test(next.customerId))) {
    throw new HttpsError('invalid-argument', 'Cliente vinculado inválido.');
  }
  if (next.pricingMode != null && !['unit', 'total', 'items'].includes(next.pricingMode)) {
    throw new HttpsError('invalid-argument', 'Tipo de preço inválido.');
  }
  if (next.unitPrice != null && (typeof next.unitPrice !== 'number' || !Number.isFinite(next.unitPrice)
    || next.unitPrice < 0 || next.unitPrice > 1000000)) {
    throw new HttpsError('invalid-argument', 'Preço unitário inválido.');
  }
  if (next.isExchange != null && typeof next.isExchange !== 'boolean') {
    throw new HttpsError('invalid-argument', 'Indicador de permuta inválido.');
  }
  if (next.exchangeNotes != null && (typeof next.exchangeNotes !== 'string' || next.exchangeNotes.length > 1000)) {
    throw new HttpsError('invalid-argument', 'Observações da permuta inválidas.');
  }
  if (next.exchangeItems != null && (!Array.isArray(next.exchangeItems) || next.exchangeItems.length > 10
    || next.exchangeItems.some((item) => !item || typeof item.name !== 'string' || !item.name.trim()
      || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000
      || (item.value != null && (typeof item.value !== 'number' || !Number.isFinite(item.value)
        || item.value < 0 || item.value > 1000000))))) {
    throw new HttpsError('invalid-argument', 'Itens recebidos na permuta são inválidos.');
  }
  if (next.cardColor != null && (typeof next.cardColor !== 'string' || next.cardColor.length > 50)) {
    throw new HttpsError('invalid-argument', 'Cor do pedido inválida.');
  }
  return next;
}

function validateComplexOrderUpdate(updates, order, uid, profile) {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    throw new HttpsError('invalid-argument', 'Dados da edição inválidos.');
  }
  const keys = Object.keys(updates);
  if (!keys.length || keys.some((key) => !COMPLEX_ORDER_UPDATE_FIELDS.has(key))) {
    throw new HttpsError('invalid-argument', 'A edição contém campos não permitidos.');
  }
  const admin = profile.role === 'admin';
  const owner = order.userId === uid;
  const assignedEmployee = profile.role === 'funcionario' && order.assignedTo === uid;
  if (profile.active === false || (!admin && !(owner || assignedEmployee))
    || (!admin && !hasOrderPermission(profile, 'edit'))) {
    throw new HttpsError('permission-denied', 'Você não tem permissão para editar este pedido.');
  }

  const next = { ...order, ...updates };
  const changesItemTotals = ['items', 'price', 'quantity', 'pricingMode', 'unitPrice']
    .some((key) => Object.prototype.hasOwnProperty.call(updates, key));
  if (changesItemTotals && Array.isArray(next.items)) {
    next.items = assertComplexOrderItems(next.items, next.quantity, next.price);
  } else if (changesItemTotals && updates.items === null && Array.isArray(order.items)) {
    throw new HttpsError('invalid-argument', 'Não é permitido remover os itens estruturados do pedido.');
  }
  return assertComplexOrderData(next, next.isExchange);
}

/**
 * Edição de pedidos com 5–10 itens: valida fora das regras CEL e espelha o
 * ledger atomicamente. A Function repete a autorização e valida a versão para
 * não confiar nos dados ou permissões verificados pelo frontend. Mantenha esta
 * exportação nos alvos seletivos de pedidos em deploy-dev.yml.
 */
async function handleUpdateComplexOrder(request, firestore = getFirestore()) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta para editar pedidos.');
  const { orderId, expectedVersion, updates, operationId } = request.data || {};
  if (typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(orderId)
    || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    throw new HttpsError('invalid-argument', 'Pedido ou versão inválidos.');
  }
  if (operationId !== undefined && operationId !== null) {
    if (typeof operationId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(operationId)) {
      throw new HttpsError('invalid-argument', 'Identificador de operação inválido.');
    }
  }
  if (typeof updates?.customerId === 'string' && !/^[A-Za-z0-9_-]{1,128}$/.test(updates.customerId)) {
    throw new HttpsError('invalid-argument', 'Cliente vinculado inválido.');
  }
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)
    || !Object.keys(updates).length || Object.keys(updates).some((key) => !COMPLEX_ORDER_UPDATE_FIELDS.has(key))) {
    throw new HttpsError('invalid-argument', 'A edição contém campos não permitidos.');
  }
  // Hash the command, never its effects on the current order or server-generated dates.
  // Otherwise a retry after another edit can no longer match its original receipt.
  const updatePayloadHash = computePayloadHash({ expectedVersion, updates });
  const db = firestore;
  const orderRef = db.doc(`orders/${orderId}`);
  const saleRef = db.doc(`salesLedger/${orderId}`);
  const profileRef = db.doc(`userProfiles/${uid}`);
  return db.runTransaction(async (transaction) => {
    const receiptRef = operationId ? db.doc(`orders/${orderId}/operationReceipts/${operationId}`) : null;
    const requestedCustomerRef = typeof updates?.customerId === 'string'
      ? db.doc(`customers/${updates.customerId}`)
      : null;
    const [orderSnap, saleSnap, profileSnap, requestedCustomerSnap, receiptSnap] = await Promise.all([
      transaction.get(orderRef), transaction.get(saleRef), transaction.get(profileRef),
      requestedCustomerRef ? transaction.get(requestedCustomerRef) : null,
      receiptRef ? transaction.get(receiptRef) : null,
    ]);
    if (!orderSnap.exists) throw new HttpsError('not-found', 'Pedido não encontrado.');
    if (!profileSnap.exists) throw new HttpsError('permission-denied', 'Perfil de usuário não encontrado.');
    const order = orderSnap.data() || {};
    const profile = profileSnap.data() || {};
    if (profile.tokensValidAfterTime != null
      && (!Number.isFinite(request.auth.token.auth_time) || request.auth.token.auth_time <= profile.tokensValidAfterTime)) {
      throw new HttpsError('unauthenticated', 'Sua sessão expirou. Entre novamente.');
    }
    const admin = profile.role === 'admin';
    const owner = order.userId === uid;
    const assignedEmployee = profile.role === 'funcionario' && order.assignedTo === uid;
    if (profile.active === false || (!admin && !(owner || assignedEmployee))
      || (!admin && !hasOrderPermission(profile, 'edit'))) {
      throw new HttpsError('permission-denied', 'Você não tem permissão para editar este pedido.');
    }
    const currentVersion = order.version === undefined ? 1 : order.version;
    // Authorization above applies to every replay, including administrators.
    if (receiptSnap?.exists) {
      const receipt = receiptSnap.data() || {};
      if (receipt.userId !== uid || receipt.orderId !== orderId) {
        throw new HttpsError('permission-denied', 'Identificador de operação pertence a outro usuário ou pedido.');
      }
      if (receipt.hashVersion !== 2 || receipt.payloadHash !== updatePayloadHash) {
        throw new HttpsError('failed-precondition', 'Este identificador de operação já foi utilizado com alterações diferentes.');
      }
      return { success: true, orderId, version: receipt.version, alreadyApplied: true };
    }
    if (!Number.isSafeInteger(currentVersion) || currentVersion !== expectedVersion) {
      throw new HttpsError('failed-precondition', 'O pedido foi alterado. Atualize a tela e tente novamente.', {
        operationState: 'not-applied', orderId, operationId: operationId ?? null,
      });
    }
    const normalizedUpdates = { ...updates };
    const now = new Date().toISOString();
    const resolvedPrice = typeof normalizedUpdates.price === 'number' ? normalizedUpdates.price : order.price;
    if (normalizedUpdates.payment === undefined && normalizedUpdates.price !== undefined && order.payment) {
      const previousPayment = order.payment;
      const previousPaid = Math.max(0, Number(previousPayment.paidAmount) || 0);
      const paidAmount = Math.min(previousPaid, resolvedPrice);
      const paymentTotal = (normalizedUpdates.isExchange ?? order.isExchange) ? 0 : resolvedPrice;
      const normalizedPaid = Math.min(paidAmount, paymentTotal);
      const history = Array.isArray(previousPayment.history) ? [...previousPayment.history] : [];
      if (previousPaid > normalizedPaid) {
        history.push({
          amount: Math.round((normalizedPaid - previousPaid) * 100) / 100,
          date: now,
          method: previousPayment.method || 'pix',
          notes: 'Ajuste automático após alteração do total do pedido.',
        });
      }
      normalizedUpdates.payment = {
        ...previousPayment,
        totalAmount: paymentTotal,
        paidAmount: normalizedPaid,
        remainingAmount: Math.round((paymentTotal - normalizedPaid) * 100) / 100,
        status: paymentTotal === normalizedPaid ? 'paid' : normalizedPaid > 0 ? 'partial' : 'pending',
        history: history.length ? history : null,
      };
    }
    if (normalizedUpdates.isExchange !== undefined
      && Boolean(normalizedUpdates.isExchange) !== Boolean(order.isExchange)
      && normalizedUpdates.payment === undefined) {
      const totalAmount = normalizedUpdates.isExchange ? 0 : resolvedPrice;
      const paidAmount = Math.min(Math.max(0, Number(order.payment?.paidAmount) || 0), totalAmount);
      normalizedUpdates.payment = {
        status: paidAmount === totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'pending',
        totalAmount,
        paidAmount,
        remainingAmount: Math.round((totalAmount - paidAmount) * 100) / 100,
        method: order.payment?.method ?? null,
        paymentDate: paidAmount === 0 ? null : (order.payment?.paymentDate ?? now),
        notes: order.payment?.notes ?? null,
        history: null,
      };
    }
    if (normalizedUpdates.payment !== undefined) {
      normalizedUpdates.payment = normalizeComplexOrderPayment(
        normalizedUpdates.payment, order.payment, resolvedPrice, Boolean(normalizedUpdates.isExchange ?? order.isExchange), now,
      );
    }
    const next = validateComplexOrderUpdate(normalizedUpdates, order, uid, profile);
    let appendedPaymentEvents = [];
    if (normalizedUpdates.payment !== undefined && next.payment) {
      const paymentHistory = buildAuthoritativePaymentHistory(order.payment, next.payment, now);
      const history = paymentHistory.history;
      appendedPaymentEvents = paymentHistory.appendedEntries;
      normalizedUpdates.payment = { ...normalizedUpdates.payment, history };
      next.payment.history = history;
    }
    const previousCustomerId = typeof order.customerId === 'string' ? order.customerId : null;
    const nextCustomerId = typeof next.customerId === 'string' ? next.customerId : null;
    const customerIds = [...new Set([previousCustomerId, nextCustomerId].filter(Boolean))];
    const customerRefs = new Map(customerIds.map((id) => [id, db.doc(`customers/${id}`)]));
    const customerSnapshots = new Map();
    for (const customerId of customerIds) {
      const customerRef = customerRefs.get(customerId);
      const customerSnap = requestedCustomerRef && customerId === normalizedUpdates.customerId
        ? requestedCustomerSnap
        : await transaction.get(customerRef);
      customerSnapshots.set(customerId, customerSnap);
    }
    const nextCustomerSnap = nextCustomerId ? customerSnapshots.get(nextCustomerId) : null;
    if (normalizedUpdates.customerId != null
      && (!nextCustomerSnap?.exists || nextCustomerSnap.data()?.userId !== order.userId)) {
      throw new HttpsError('permission-denied', 'O cliente vinculado não pertence a esta conta.');
    }
    const customerDeltas = new Map();
    const addCustomerDelta = (customerId, orderDelta, spentCentsDelta) => {
      if (!customerId) return;
      const delta = customerDeltas.get(customerId) || { orders: 0, spentCents: 0 };
      delta.orders += orderDelta;
      delta.spentCents += spentCentsDelta;
      customerDeltas.set(customerId, delta);
    };
    if (!order.isExchange) {
      addCustomerDelta(previousCustomerId, -1, -Math.round(Number(order.price || 0) * 100));
    }
    if (!next.isExchange) {
      addCustomerDelta(nextCustomerId, 1, Math.round(Number(next.price || 0) * 100));
    }
    const orderUpdate = {
      ...normalizedUpdates,
      version: currentVersion + 1,
      updatedAt: now,
      ...(operationId ? { lastOperationId: operationId, lastOperationPayloadHash: updatePayloadHash } : {}),
    };
    const changesItemTotals = ['items', 'price', 'quantity', 'pricingMode', 'unitPrice']
      .some((key) => Object.prototype.hasOwnProperty.call(normalizedUpdates, key));
    if (changesItemTotals && Array.isArray(next.items)) orderUpdate.items = next.items;
    transaction.update(orderRef, orderUpdate);

    if (receiptRef) {
      transaction.set(receiptRef, {
        operationId,
        userId: uid,
        orderId,
        payloadHash: updatePayloadHash,
        hashVersion: 2,
        version: currentVersion + 1,
        createdAt: now,
      });
    }

    // A subcoleção fornece uma trilha append-only gravada pelo Admin SDK. O
    // array payment.history permanece como espelho para relatórios existentes.
    for (const event of appendedPaymentEvents) {
      const eventRef = orderRef.collection('paymentEvents').doc();
      transaction.create(eventRef, {
        type: event.amount < 0 ? 'adjustment' : 'payment',
        amount: event.amount,
        method: event.method,
        notes: event.notes || null,
        occurredAt: event.date,
        actorUid: uid,
        source: 'updateComplexOrder',
        createdAt: now,
      });
    }

    const sale = saleSnap.data() || {};
    if (saleSnap.exists && sale.userId && sale.userId !== order.userId) {
      throw new HttpsError('failed-precondition', 'O registro financeiro não corresponde ao pedido.');
    }
    const saleUpdate = {
      updatedAt: now,
      amount: next.isExchange ? 0 : next.price,
      quantity: next.quantity,
      paymentStatus: next.payment?.status || 'pending',
      paidAmount: next.isExchange ? 0 : (next.payment?.paidAmount || 0),
      paymentMethod: next.isExchange ? null : (next.payment?.method || null),
    };
    for (const key of ['status', 'customerName', 'customerPhone', 'customerId', 'productName', 'deliveryDate']) {
      if (normalizedUpdates[key] !== undefined) saleUpdate[key] = normalizedUpdates[key];
    }
    if (normalizedUpdates.isExchange !== undefined) saleUpdate.isExchange = Boolean(normalizedUpdates.isExchange);
    if (saleSnap.exists) {
      if (!sale.userId && order.userId) saleUpdate.userId = order.userId;
      if (!sale.assignedTo && order.assignedTo) {
        saleUpdate.assignedTo = order.assignedTo;
        saleUpdate.assignedToName = order.assignedToName || null;
      }
      transaction.set(saleRef, saleUpdate, { merge: true });
    } else {
      transaction.set(saleRef, {
        id: orderId, orderId, orderNumber: order.orderNumber || '',
        userId: order.userId || uid, assignedTo: order.assignedTo || null,
        assignedToName: order.assignedToName || null, customerId: next.customerId || null,
        customerName: next.customerName || 'Cliente não informado', customerPhone: next.customerPhone || null,
        productName: next.productName || 'Produto', quantity: next.quantity, amount: next.isExchange ? 0 : next.price,
        isExchange: Boolean(next.isExchange), paymentStatus: next.payment?.status || 'pending',
        paidAmount: next.isExchange ? 0 : (next.payment?.paidAmount || 0),
        paymentMethod: next.isExchange ? null : (next.payment?.method || null),
        date: order.createdAt || now, deliveryDate: next.deliveryDate || null,
        status: next.status || 'pending', notes: next.notes || null, tags: next.tags || null,
        createdAt: order.createdAt || now, updatedAt: now, isDeletedFromOrders: order.deletedAt != null,
      });
    }
    for (const [customerId, delta] of customerDeltas) {
      if (delta.orders === 0 && delta.spentCents === 0) continue;
      const customerSnap = customerSnapshots.get(customerId);
      if (!customerSnap?.exists) continue;
      const customer = customerSnap.data() || {};
      if (customer.userId !== order.userId) {
        throw new HttpsError('permission-denied', 'O cliente vinculado não pertence a esta conta.');
      }
      const currentOrders = Number.isFinite(customer.totalOrders) ? customer.totalOrders : 0;
      const currentSpent = Number.isFinite(customer.totalSpent) ? customer.totalSpent : 0;
      transaction.update(customerRefs.get(customerId), {
        totalOrders: Math.max(0, currentOrders + delta.orders),
        totalSpent: Math.max(0, Math.round(currentSpent * 100) + delta.spentCents) / 100,
      });
    }
    return { success: true };
  });
}

const updateComplexOrder = onCall(
  { cors: true, maxInstances: 10 },
  withFirstInvocationSpan('updateComplexOrder', handleUpdateComplexOrder, () => moduleInitializationMs),
);

/**
 * Criação atômica de pedidos com itens, salesLedger, contadores e estatísticas de cliente.
 * Substitui a transação iniciada pelo cliente para eliminar a dependência das regras CEL do Firestore.
 */
async function handleCreateOrder(request, firestore = getFirestore()) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta para criar pedidos.');

  const { orderData, catalogOrderId, quoteId, idempotencyKey } = request.data || {};
  if (!orderData || typeof orderData !== 'object' || Array.isArray(orderData)) {
    throw new HttpsError('invalid-argument', 'Dados do pedido inválidos.');
  }
  if (idempotencyKey !== undefined && idempotencyKey !== null) {
    if (typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(idempotencyKey)) {
      throw new HttpsError('invalid-argument', 'Chave de idempotência inválida.');
    }
  }

  const db = firestore;
  const profileSnap = await db.doc(`userProfiles/${uid}`).get();
  if (!profileSnap.exists) {
    throw new HttpsError('permission-denied', 'Perfil de usuário não encontrado.');
  }
  const profile = profileSnap.data() || {};
  if (profile.active === false) {
    throw new HttpsError('permission-denied', 'Conta inativa.');
  }
  if (profile.tokensValidAfterTime != null
    && (!Number.isFinite(request.auth?.token?.auth_time) || request.auth.token.auth_time <= profile.tokensValidAfterTime)) {
    throw new HttpsError('permission-denied', 'Sessão expirada. Faça login novamente.');
  }
  const admin = profile.role === 'admin';
  if (!admin && !hasOrderPermission(profile, 'create')) {
    throw new HttpsError('permission-denied', 'Você não tem permissão para criar pedidos.');
  }

  const now = new Date().toISOString();
  if (orderData.isExchange !== undefined && orderData.isExchange !== null) {
    if (typeof orderData.isExchange !== 'boolean') {
      throw new HttpsError('invalid-argument', 'Indicador de permuta inválido.');
    }
  }
  const isExchange = orderData.isExchange === true;

  const quantity = orderData.quantity;
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) {
    throw new HttpsError('invalid-argument', 'A quantidade deve ser um número inteiro entre 1 e 10.000.');
  }

  if (typeof orderData.price !== 'number' || !Number.isFinite(orderData.price) || orderData.price < 0 || orderData.price > 1000000) {
    throw new HttpsError('invalid-argument', 'O preço deve ser um número válido de até 1.000.000.');
  }
  const priceCents = Math.round(orderData.price * 100);
  if (Math.abs(orderData.price * 100 - priceCents) > 0.001) {
    throw new HttpsError('invalid-argument', 'O preço deve usar centavos inteiros.');
  }
  const price = priceCents / 100;

  if (!orderData.customerName || typeof orderData.customerName !== 'string' || !orderData.customerName.trim()) {
    throw new HttpsError('invalid-argument', 'O nome do cliente é obrigatório.');
  }
  if (!orderData.productName || typeof orderData.productName !== 'string' || !orderData.productName.trim()) {
    throw new HttpsError('invalid-argument', 'O nome do produto é obrigatório.');
  }
  if (!orderData.deliveryDate || typeof orderData.deliveryDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(orderData.deliveryDate)) {
    throw new HttpsError('invalid-argument', 'Data de entrega inválida.');
  }

  if (orderData.items !== undefined && orderData.items !== null && !Array.isArray(orderData.items)) {
    throw new HttpsError('invalid-argument', 'A lista de itens deve ser um array válido.');
  }
  const items = Array.isArray(orderData.items)
    ? assertComplexOrderItems(orderData.items, quantity, price)
    : null;

  if (orderData.pricingMode !== undefined && orderData.pricingMode !== null) {
    if (typeof orderData.pricingMode !== 'string' || !['unit', 'total', 'items'].includes(orderData.pricingMode)) {
      throw new HttpsError('invalid-argument', 'Tipo de preço inválido.');
    }
  }

  if (orderData.unitPrice !== undefined && orderData.unitPrice !== null) {
    if (typeof orderData.unitPrice !== 'number' || !Number.isFinite(orderData.unitPrice)
      || orderData.unitPrice < 0 || orderData.unitPrice > 1000000) {
      throw new HttpsError('invalid-argument', 'Preço unitário inválido.');
    }
    const unitPriceCents = Math.round(orderData.unitPrice * 100);
    if (Math.abs(orderData.unitPrice * 100 - unitPriceCents) > 0.001) {
      throw new HttpsError('invalid-argument', 'O preço unitário deve usar centavos inteiros.');
    }
  }

  let resolvedUnitPrice = null;
  let resolvedPricingMode = null;

  if (items && items.length > 1) {
    if (orderData.pricingMode !== undefined && orderData.pricingMode !== null && orderData.pricingMode !== 'items') {
      throw new HttpsError('invalid-argument', 'Pedidos com múltiplos itens devem usar o tipo de preço "items".');
    }
    if (orderData.unitPrice !== undefined && orderData.unitPrice !== null) {
      throw new HttpsError('invalid-argument', 'Pedidos com múltiplos itens não devem ter unitPrice no pedido.');
    }
    resolvedPricingMode = 'items';
    resolvedUnitPrice = null;
  } else if (items && items.length === 1) {
    const itemUnitPrice = items[0].unitPrice;
    if (orderData.unitPrice !== undefined && orderData.unitPrice !== null) {
      if (Math.abs(orderData.unitPrice - itemUnitPrice) > 0.001) {
        throw new HttpsError('invalid-argument', 'O preço unitário do pedido não corresponde ao item.');
      }
      resolvedUnitPrice = itemUnitPrice;
    } else {
      resolvedUnitPrice = itemUnitPrice;
    }

    if (orderData.pricingMode === 'items') {
      resolvedPricingMode = 'items';
      resolvedUnitPrice = orderData.unitPrice != null ? itemUnitPrice : null;
    } else if (orderData.pricingMode === 'total') {
      resolvedPricingMode = 'total';
      resolvedUnitPrice = orderData.unitPrice != null ? itemUnitPrice : null;
    } else {
      resolvedPricingMode = 'unit';
      resolvedUnitPrice = itemUnitPrice;
    }
  } else {
    // Pedido simples sem lista de itens (items == null)
    if (orderData.pricingMode === 'items') {
      throw new HttpsError('invalid-argument', 'O tipo de preço "items" exige uma lista de itens estruturados.');
    }
    if (orderData.unitPrice !== undefined && orderData.unitPrice !== null) {
      resolvedUnitPrice = Math.round(orderData.unitPrice * 100) / 100;
    } else {
      resolvedUnitPrice = null;
    }

    if (orderData.pricingMode === 'unit') {
      if (resolvedUnitPrice === null) {
        throw new HttpsError('invalid-argument', 'O modo de preço unitário exige o preço unitário do pedido.');
      }
      if (Math.abs(price - Math.round(quantity * resolvedUnitPrice * 100) / 100) > 0.05) {
        throw new HttpsError('invalid-argument', 'O preço total não corresponde à quantidade e ao preço unitário.');
      }
      resolvedPricingMode = 'unit';
    } else if (orderData.pricingMode === 'total') {
      resolvedPricingMode = 'total';
    } else {
      if (resolvedUnitPrice !== null) {
        if (Math.abs(price - Math.round(quantity * resolvedUnitPrice * 100) / 100) > 0.05) {
          throw new HttpsError('invalid-argument', 'O preço total não corresponde à quantidade e ao preço unitário.');
        }
        resolvedPricingMode = 'unit';
      } else {
        resolvedPricingMode = 'total';
      }
    }
  }

  // Normalização do pagamento na criação
  const totalPaymentAmount = isExchange ? 0 : price;
  let normalizedPayment = null;
  let initialHistory = null;
  let initialPaymentEvent = null;

  if (orderData.payment && typeof orderData.payment === 'object') {
    const rawPaid = Number(orderData.payment.paidAmount);
    const paidAmount = Number.isFinite(rawPaid) ? Math.min(Math.max(0, Math.round(rawPaid * 100) / 100), totalPaymentAmount) : 0;
    const remainingAmount = Math.round(Math.max(0, totalPaymentAmount - paidAmount) * 100) / 100;
    const resolvedStatus = totalPaymentAmount === 0
      ? (orderData.payment.status === 'pending' ? 'pending' : 'paid')
      : (paidAmount >= totalPaymentAmount ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending'));
    const method = PAYMENT_METHODS.has(orderData.payment.method) ? orderData.payment.method : null;
    const paymentDate = paidAmount > 0 ? (orderData.payment.paymentDate || now) : null;
    const paymentNotes = typeof orderData.payment.notes === 'string' ? orderData.payment.notes.slice(0, 1000) : null;

    if (paidAmount > 0) {
      initialPaymentEvent = {
        amount: paidAmount,
        date: paymentDate,
        method: method || 'pix',
        notes: 'Pagamento inicial registrado',
      };
      initialHistory = [initialPaymentEvent];
    }

    normalizedPayment = {
      status: resolvedStatus,
      method,
      totalAmount: totalPaymentAmount,
      paidAmount,
      remainingAmount,
      paymentDate,
      notes: paymentNotes,
      history: initialHistory,
    };
  } else {
    normalizedPayment = {
      status: 'pending',
      method: null,
      totalAmount: totalPaymentAmount,
      paidAmount: 0,
      remainingAmount: totalPaymentAmount,
      paymentDate: null,
      notes: null,
      history: null,
    };
  }

  const orderToValidate = {
    ...orderData,
    isExchange,
    price,
    quantity,
    pricingMode: resolvedPricingMode,
    unitPrice: resolvedUnitPrice,
    items,
    payment: normalizedPayment,
  };
  assertComplexOrderData(orderToValidate, isExchange);

  // Include the entire submitted command (tags, assignment and card color included).
  // Exclude transport identity and never hash a payment date defaulted to `now`.
  const payloadToHash = {
    orderData: { ...orderData, id: undefined, idempotencyKey: undefined },
    catalogOrderId: catalogOrderId ?? null,
    quoteId: quoteId ?? null,
  };
  const payloadHash = computePayloadHash(payloadToHash);

  // Execução atômica no Firestore
  return db.runTransaction(async (transaction) => {
    // 1. Idempotência por identificador
    const candidateOrderId = (idempotencyKey && typeof idempotencyKey === 'string')
      ? idempotencyKey
      : null;
    const orderRef = candidateOrderId ? db.doc(`orders/${candidateOrderId}`) : db.collection('orders').doc();
    const orderId = orderRef.id;

    if (candidateOrderId) {
      const existingSnap = await transaction.get(orderRef);
      if (existingSnap.exists) {
        const existingData = existingSnap.data() || {};
        if (existingData.userId !== uid) {
          throw new HttpsError('permission-denied', 'Identificador de pedido já utilizado por outro usuário.');
        }
        if (existingData.creationHashVersion !== 2 || existingData.payloadHash !== payloadHash) {
          throw new HttpsError('failed-precondition', 'Esta chave de idempotência já foi utilizada com dados diferentes.');
        }
        return {
          success: true,
          orderId,
          orderNumber: existingData.orderNumber,
          alreadyExisted: true,
        };
      }
    }

    // 2. Validação e Idempotência de catálogo
    let catalogRef = null;
    if (catalogOrderId && typeof catalogOrderId === 'string') {
      catalogRef = db.doc(`catalogOrders/${catalogOrderId}`);
      const catalogSnap = await transaction.get(catalogRef);
      if (!catalogSnap.exists) throw new HttpsError('not-found', 'Pedido da lojinha não encontrado.');
      const catalog = catalogSnap.data() || {};
      if (catalog.convertedOrderId) {
        return { success: true, orderId: String(catalog.convertedOrderId), alreadyExisted: true };
      }
      if (catalog.status === 'converted') {
        throw new HttpsError('failed-precondition', 'Este pedido da lojinha já foi convertido em pedido de produção anteriormente.');
      }
    }

    // 3. Validação e Idempotência de orçamento
    let quoteRef = null;
    if (quoteId && typeof quoteId === 'string') {
      quoteRef = db.doc(`quotes/${quoteId}`);
      const quoteSnap = await transaction.get(quoteRef);
      if (!quoteSnap.exists) throw new HttpsError('not-found', 'Orçamento não encontrado.');
      const quote = quoteSnap.data() || {};
      const existingOrderId = quote.convertedOrderId || quote.orderId;
      if (existingOrderId) {
        return { success: true, orderId: String(existingOrderId), alreadyExisted: true };
      }
      if (quote.status === 'approved') {
        throw new HttpsError('failed-precondition', 'Este orçamento já foi aprovado anteriormente.');
      }
      if (quote.status !== 'draft' && quote.status !== 'sent') {
        throw new HttpsError('failed-precondition', 'Apenas orçamentos em rascunho ou enviados podem ser aprovados.');
      }
      if (quote.validUntil) {
        const expiration = new Date(quote.validUntil);
        expiration.setHours(23, 59, 59, 999);
        if (expiration < new Date()) {
          throw new HttpsError('failed-precondition', 'Este orçamento expirou e não pode ser aprovado.');
        }
      }
    }

    // 4. Validação de cliente vinculado
    let customerRef = null;
    let customerData = null;
    if (orderData.customerId && typeof orderData.customerId === 'string') {
      customerRef = db.doc(`customers/${orderData.customerId}`);
      const customerSnap = await transaction.get(customerRef);
      if (!customerSnap.exists || customerSnap.data()?.userId !== uid) {
        throw new HttpsError('permission-denied', 'O cliente vinculado não pertence a esta conta.');
      }
      customerData = customerSnap.data() || {};
    }

    // 5. Contador de pedidos
    const counterRef = db.doc(`users/${uid}/metadata/counters`);
    const counterSnap = await transaction.get(counterRef);
    const nextCount = ((counterSnap.data()?.orderCounter) || 0) + 1;
    const year = new Date().getFullYear();
    const orderNumber = `#${year}-${String(nextCount).padStart(4, '0')}`;

    // 6. Montagem dos payloads
    const createdOrderData = {
      userId: uid,
      createdByName: profile.displayName || profile.email || uid,
      orderNumber,
      customerName: orderData.customerName.trim(),
      customerPhone: orderData.customerPhone ?? null,
      productName: orderData.productName.trim(),
      quantity,
      price,
      pricingMode: resolvedPricingMode,
      unitPrice: resolvedUnitPrice,
      items,
      status: orderData.status || 'pending',
      deliveryDate: orderData.deliveryDate,
      notes: orderData.notes ?? null,
      tags: orderData.tags ?? null,
      customerId: orderData.customerId ?? null,
      assignedTo: orderData.assignedTo ?? null,
      assignedToName: orderData.assignedToName ?? null,
      assignedAt: orderData.assignedAt ?? null,
      assignedBy: orderData.assignedBy ?? null,
      payment: normalizedPayment,
      isExchange,
      exchangeNotes: orderData.exchangeNotes ?? null,
      exchangeItems: orderData.exchangeItems ?? null,
      cardColor: orderData.cardColor ?? null,
      productionWorkflow: {
        currentStep: 'design',
        steps: {
          design: { completed: false },
          approval: { completed: false },
          printing: { completed: false },
          cutting: { completed: false },
          assembly: { completed: false },
          'quality-check': { completed: false },
          packaging: { completed: false },
        },
        startedAt: now,
      },
      version: 1,
      payloadHash,
      creationHashVersion: 2,
      idempotencyKey: candidateOrderId ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      isArchived: Boolean(orderData.isArchived),
      archivedAt: orderData.archivedAt ?? null,
      archivedBy: orderData.archivedBy ?? null,
    };

    const salePayload = {
      id: orderId,
      orderId,
      orderNumber,
      userId: uid,
      assignedTo: createdOrderData.assignedTo,
      assignedToName: createdOrderData.assignedToName,
      customerId: createdOrderData.customerId,
      customerName: createdOrderData.customerName,
      customerPhone: createdOrderData.customerPhone,
      productName: createdOrderData.productName,
      quantity: createdOrderData.quantity,
      amount: createdOrderData.isExchange ? 0 : createdOrderData.price,
      isExchange: Boolean(createdOrderData.isExchange),
      paymentStatus: normalizedPayment?.status || 'pending',
      paidAmount: createdOrderData.isExchange ? 0 : (normalizedPayment?.paidAmount || 0),
      paymentMethod: normalizedPayment?.method ?? null,
      date: now,
      deliveryDate: createdOrderData.deliveryDate,
      status: createdOrderData.status,
      notes: createdOrderData.notes,
      tags: createdOrderData.tags,
      createdAt: now,
      updatedAt: now,
      isDeletedFromOrders: false,
    };

    // 7. Gravações atômicas
    transaction.set(counterRef, { orderCounter: nextCount }, { merge: true });
    transaction.set(orderRef, createdOrderData);
    transaction.set(db.doc(`salesLedger/${orderId}`), salePayload);

    if (initialPaymentEvent) {
      const eventRef = orderRef.collection('paymentEvents').doc();
      transaction.create(eventRef, {
        type: 'payment',
        amount: initialPaymentEvent.amount,
        method: initialPaymentEvent.method,
        notes: initialPaymentEvent.notes,
        occurredAt: initialPaymentEvent.date,
        actorUid: uid,
        source: 'createOrder',
        createdAt: now,
      });
    }

    if (catalogRef) {
      transaction.update(catalogRef, {
        status: 'converted',
        convertedOrderId: orderId,
        updatedAt: now,
      });
    }

    if (quoteRef) {
      transaction.update(quoteRef, {
        status: 'approved',
        orderId,
        orderNumber,
        convertedOrderId: orderId,
        convertedOrderNumber: orderNumber,
        approvedAt: now,
        updatedAt: now,
      });
    }

    if (customerRef && !isExchange && customerData) {
      const currentOrders = Number.isFinite(customerData.totalOrders) ? customerData.totalOrders : 0;
      const currentSpent = Number.isFinite(customerData.totalSpent) ? customerData.totalSpent : 0;
      transaction.update(customerRef, {
        totalOrders: currentOrders + 1,
        totalSpent: Math.round((currentSpent + price) * 100) / 100,
      });
    }

    return {
      success: true,
      orderId,
      orderNumber,
      alreadyExisted: false,
    };
  });
}

const createOrder = onCall(
  { cors: true, maxInstances: 10 },
  withFirstInvocationSpan('createOrder', handleCreateOrder, () => moduleInitializationMs),
);

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

const moduleInitializationMs = Number(
  (Number(process.hrtime.bigint() - moduleInitializationStartedAt) / 1e6).toFixed(2),
);

module.exports = {
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
  updateComplexOrder,
  validateComplexOrderUpdate,
  buildAuthoritativePaymentHistory,
  compressPaymentHistory,
  handleUpdateComplexOrder,
  createOrder,
  handleCreateOrder,
  calculateSuperfreteShipping,
  createSuperfreteLabel,
};

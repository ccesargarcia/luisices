/**
 * Serviço transacional de criação de pedidos via Alexa.
 * Segue estritamente a especificação docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md (Seção 6).
 */

const admin = require('firebase-admin');
const { COLLECTIONS, recordAuditEvent } = require('./repository');
const { checkOrderCreationRateLimit } = require('./rateLimit');

/**
 * Executa a transação atômica única para criação do pedido:
 * 1. Verifica alexaCommits/{draftId} (idempotência durável).
 * 2. Revalida permissão, perfil e binding dentro da transação para detectar revogação concorrente.
 * 3. Valida rascunho (estado awaiting_confirmation, TTL, titular).
 * 4. Incrementa o contador sequencial em users/{uid}/metadata/counters.
 * 5. Cria o documento orders/{orderId}.
 * 6. Cria o lançamento salesLedger/{orderId}.
 * 7. Atualiza o rascunho alexaDrafts/{draftId} para 'committed'.
 * 8. Grava o recibo alexaCommits/{draftId}.
 *
 * @param {object} params
 * @param {string} params.draftId
 * @param {string} params.callerPersonId
 * @param {string} params.expectedRevision
 * @param {object} params.config
 * @param {admin.firestore.Firestore} db
 * @returns {Promise<{ success: boolean, orderId: string, orderNumber: string, isReplay?: boolean }>}
 */
async function commitOrderFromDraft({
  draftId,
  callerPersonId,
  expectedRevision,
  config,
  db,
}) {
  if (!draftId) throw new Error('ID do rascunho é obrigatório.');

  const commitRef = db.collection(COLLECTIONS.COMMITS).doc(draftId);
  const draftRef = db.collection(COLLECTIONS.DRAFTS).doc(draftId);

  // 1. Verificação prévia de recibo durável (idempotência)
  const existingCommit = await commitRef.get();
  if (existingCommit.exists) {
    const data = existingCommit.data() || {};
    return {
      success: true,
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      isReplay: true,
    };
  }

  // 2. Transação Firestore unificada (todas as leituras antes de qualquer escrita)
  const orderRef = db.collection(COLLECTIONS.ORDERS).doc();
  const orderId = orderRef.id;

  const result = await db.runTransaction(async (transaction) => {
    // --- LEITURAS ---
    const commitSnap = await transaction.get(commitRef);
    if (commitSnap.exists) {
      const cData = commitSnap.data() || {};
      return {
        success: true,
        orderId: cData.orderId,
        orderNumber: cData.orderNumber,
        isReplay: true,
      };
    }

    const draftSnap = await transaction.get(draftRef);
    if (!draftSnap.exists) {
      throw new Error('DRAFT_NOT_FOUND: Rascunho de pedido não encontrado.');
    }

    const draft = draftSnap.data() || {};

    // Valida expiração do rascunho
    const now = Date.now();
    const expiresAt = draft.expiresAt?.toDate ? draft.expiresAt.toDate().getTime() : 0;
    if (expiresAt <= now) {
      throw new Error('DRAFT_EXPIRED: O rascunho do pedido expirou (limite de 15 minutos).');
    }

    // Valida se o rascunho já foi consumido
    if (draft.state === 'committed') {
      throw new Error('DRAFT_ALREADY_COMMITTED: Este rascunho já foi gravado anteriormente.');
    }

    // Valida se o rascunho está pronto para confirmação
    if (draft.state !== 'awaiting_confirmation') {
      throw new Error(`DRAFT_INVALID_STATE: Rascunho no estado '${draft.state}', esperando 'awaiting_confirmation'.`);
    }

    // Valida revisão se especificada
    if (expectedRevision && draft.revision !== expectedRevision) {
      throw new Error('DRAFT_REVISION_MISMATCH: A revisão confirmada difere da versão atual do rascunho.');
    }

    // Valida se a pessoa confirmando é exatamente a mesma que criou o rascunho
    if (callerPersonId && draft.personId && draft.personId !== callerPersonId) {
      throw new Error('VOICE_MISMATCH: A pessoa confirmando não é a mesma que iniciou o pedido.');
    }

    const uid = draft.uid;
    const bindingKey = draft.bindingKey;

    if (!uid || !bindingKey) {
      throw new Error('DRAFT_CORRUPTED: Dados de usuário ausentes no rascunho.');
    }

    // Revalidação concorrente de binding
    const bindingSnap = await transaction.get(db.collection(COLLECTIONS.BINDINGS).doc(bindingKey));
    if (!bindingSnap.exists || !bindingSnap.data()?.active || bindingSnap.data()?.revokedAt != null) {
      throw new Error('VOICE_NOT_ALLOWED: Vínculo de voz revogado durante o processamento.');
    }

    // Revalidação de perfil
    const profileSnap = await transaction.get(db.collection(COLLECTIONS.USER_PROFILES).doc(uid));
    if (!profileSnap.exists || profileSnap.data()?.active !== true) {
      throw new Error('USER_INACTIVE: Usuário inativo no momento do commit.');
    }
    const profile = profileSnap.data() || {};

    // Revalidação de permissões Alexa
    const permSnap = await transaction.get(db.collection(COLLECTIONS.PERMISSIONS).doc(uid));
    if (!permSnap.exists || !permSnap.data()?.enabled) {
      throw new Error('VOICE_NOT_ALLOWED: Permissão de voz desativada durante a operação.');
    }

    // Ler contador sequencial do usuário: users/{uid}/metadata/counters
    const counterRef = db.doc(`users/${uid}/metadata/counters`);
    const counterSnap = await transaction.get(counterRef);
    const currentCount = counterSnap.exists ? Number(counterSnap.data()?.orderCounter || 0) : 0;
    const nextCount = currentCount + 1;
    const year = new Date().getFullYear();
    const orderNumber = `#${year}-${String(nextCount).padStart(4, '0')}`;

    // --- ESCRITAS ---
    // 1. Atualizar contador do usuário
    transaction.set(counterRef, { orderCounter: nextCount }, { merge: true });

    // 2. Construir e salvar o documento de pedido (orders/{orderId})
    const numericPrice = Number(draft.price || 0);
    const orderData = {
      userId: uid,
      createdByName: profile.displayName || profile.email || uid,
      orderNumber,
      customerName: String(draft.customer || '').trim(),
      customerPhone: '',
      customerId: null,
      productName: String(draft.product || '').trim(),
      quantity: Number(draft.quantity || 1),
      price: numericPrice,
      status: 'pending',
      deliveryDate: String(draft.deliveryDate || '').trim(),
      notes: draft.notes ? String(draft.notes).trim() : `Pedido criado via Alexa (${config.environment})`,
      tags: [{ name: 'Alexa', color: '#0ea5e9' }],
      assignedTo: null,
      assignedToName: null,
      assignedAt: null,
      assignedBy: null,
      payment: {
        status: 'pending',
        method: null,
        totalAmount: numericPrice,
        paidAmount: 0,
        remainingAmount: numericPrice,
        paymentDate: null,
        notes: null,
        history: null,
      },
      isExchange: false,
      exchangeNotes: null,
      exchangeItems: null,
      cardColor: null,
      source: 'alexa',
      createdByUid: uid,
      voiceDraftId: draftId,
      voiceConfirmationMode: draft.mode || 'voice_confirm',
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
        startedAt: new Date().toISOString(),
      },
      version: 1,
      createdAt: admin.firestore.Timestamp.now(),
      deletedAt: null,
    };
    transaction.set(orderRef, orderData);

    // 3. Salvar lançamento no histórico financeiro (salesLedger/{orderId})
    const ledgerRef = db.collection(COLLECTIONS.SALES_LEDGER).doc(orderId);
    const ledgerData = {
      orderId,
      orderNumber,
      date: admin.firestore.Timestamp.now(),
      amount: numericPrice,
      customerName: orderData.customerName,
      productName: orderData.productName,
      paymentStatus: 'pending',
      deliveryDate: orderData.deliveryDate,
      createdBy: uid,
      userId: uid,
      source: 'alexa',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    transaction.set(ledgerRef, ledgerData);

    // 4. Marcar rascunho como consumido
    transaction.update(draftRef, {
      state: 'committed',
      orderId,
      orderNumber,
      committedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 5. Gravar recibo durável de idempotência (alexaCommits/{draftId})
    transaction.set(commitRef, {
      orderId,
      orderNumber,
      uid,
      environment: config.environment,
      committedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      orderId,
      orderNumber,
      isReplay: false,
    };
  });

  // 3. Rate limiting pós-transação e auditoria
  try {
    await checkOrderCreationRateLimit(db, result.uid || '');
  } catch (rateErr) {
    console.warn('[AlexaOrderService] Alerta de rate limit pós-commit:', rateErr.message);
  }

  await recordAuditEvent(db, {
    event: 'ORDER_COMMITTED',
    orderId: result.orderId,
    draftId,
    environment: config.environment,
    success: true,
  });

  return result;
}

module.exports = {
  commitOrderFromDraft,
};

/**
 * Serviço transacional de criação de pedidos via Alexa.
 * Segue estritamente a especificação docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md (Seção 6).
 */

const admin = require('firebase-admin');
const { COLLECTIONS, recordAuditEvent } = require('./repository');

/**
 * Executa a transação atômica única para criação do pedido:
 * 1. Verifica alexaCommits/{draftId} (idempotência durável). Se já existir, devolve o resultado sem reprocessar ou gastar cota.
 * 2. Valida canal de aprovação (channel === 'app' ou 'voice') e estado correspondente.
 * 3. Valida revisão visualizada/apresentada se informada.
 * 4. Revalida integração global no Firestore (integrationSettings/alexa).
 * 5. Revalida conta Firebase Auth, perfil ativo e permissão orders.create.
 * 6. Revalida permissão alexaPermissions e modo vigente (voice_confirm vs app_approval).
 * 7. Revalida vínculo alexaBindings (ativo, não revogado, mesmo titular e ambiente).
 * 8. Revalida campos obrigatórios do pedido (cliente, produto, quantidade, data, preço).
 * 9. Valida e consome rate limit atômico do usuário (10/h e 50/dia) dentro da transação.
 * 10. Incrementa contador em users/{uid}/metadata/counters.
 * 11. Grava orders/{orderId}.
 * 12. Grava salesLedger/{orderId} no contrato padronizado do web.
 * 13. Consome rascunho alexaDrafts/{draftId} para 'committed'.
 * 14. Grava recibo durável alexaCommits/{draftId}.
 *
 * @param {object} params
 * @param {string} params.draftId
 * @param {string} [params.callerPersonId]
 * @param {number} [params.expectedRevision]
 * @param {string} [params.channel] - 'voice' | 'app' (padrão 'voice')
 * @param {object} params.config
 * @param {admin.firestore.Firestore} db
 * @param {object} [authService] - Instância auth injetável para testes
 * @returns {Promise<{ success: boolean, orderId: string, orderNumber: string, isReplay?: boolean }>}
 */
async function commitOrderFromDraft({
  draftId,
  callerPersonId,
  expectedRevision,
  channel = 'voice',
  config,
  db,
  authService = null,
  callerUid = null,
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

    // Valida estado de acordo com o canal
    if (channel === 'app') {
      if (draft.state !== 'awaiting_app_approval') {
        throw new Error(`DRAFT_INVALID_STATE: Rascunho no estado '${draft.state}', esperando 'awaiting_app_approval'.`);
      }
    } else {
      if (draft.state !== 'awaiting_confirmation') {
        throw new Error(`DRAFT_INVALID_STATE: Rascunho no estado '${draft.state}', esperando 'awaiting_confirmation'.`);
      }
    }

    // Valida revisão se especificada (obrigatória no canal app)
    if (channel === 'app' && typeof expectedRevision !== 'number') {
      throw new Error('DRAFT_REVISION_REQUIRED: A revisão visualizada é obrigatória para aprovação pelo aplicativo.');
    }
    if (typeof expectedRevision === 'number' && draft.revision !== expectedRevision) {
      throw new Error('DRAFT_REVISION_MISMATCH: A revisão confirmada difere da versão atual do rascunho.');
    }

    // Valida biometria se confirmação por voz
    if (channel === 'voice') {
      if (!callerPersonId || (draft.personId && draft.personId !== callerPersonId)) {
        throw new Error('VOICE_MISMATCH: A pessoa confirmando não é a mesma que iniciou o pedido.');
      }
    }

    const uid = draft.uid;
    const bindingKey = draft.bindingKey;

    if (!uid || !bindingKey) {
      throw new Error('DRAFT_CORRUPTED: Dados de usuário ausentes no rascunho.');
    }

    if (callerUid && uid !== callerUid) {
      throw new Error('PERMISSION_DENIED: Rascunho não pertence ao usuário chamador.');
    }

    // Revalidação do interruptor global no Firestore
    const settingsSnap = await transaction.get(db.doc('integrationSettings/alexa'));
    if (settingsSnap.exists) {
      const sData = settingsSnap.data() || {};
      if (sData.enabled === false) {
        throw new Error('INTEGRATION_DISABLED: A integração com a Alexa está desativada no momento.');
      }
    }
    if (config?.isEnabled === false) {
      throw new Error('INTEGRATION_DISABLED: A integração com a Alexa está desativada no momento.');
    }

    // Revalidação concorrente de binding
    const bindingSnap = await transaction.get(db.collection(COLLECTIONS.BINDINGS).doc(bindingKey));
    if (!bindingSnap.exists || !bindingSnap.data()?.active || bindingSnap.data()?.revokedAt != null) {
      throw new Error('VOICE_NOT_ALLOWED: Vínculo de voz revogado durante o processamento.');
    }
    const bindingData = bindingSnap.data() || {};
    if (bindingData.uid !== uid || (bindingData.environment && bindingData.environment !== config.environment)) {
      throw new Error('ENVIRONMENT_MISMATCH: Vínculo incompatível com o usuário ou ambiente.');
    }

    // Revalidação de perfil
    const profileSnap = await transaction.get(db.collection(COLLECTIONS.USER_PROFILES).doc(uid));
    if (!profileSnap.exists || profileSnap.data()?.active !== true) {
      throw new Error('USER_INACTIVE: Usuário inativo no momento do commit.');
    }
    const profile = profileSnap.data() || {};
    // Achado 4: exige admin OU orders.create === true explícito.
    // Remove exceção permissiva que liberava role:'user' sem permissão explícita.
    const canCreate =
      profile.role === 'admin' ||
      profile.permissions?.orders?.create === true;
    if (!canCreate) {
      throw new Error('PERMISSION_DENIED: Seu perfil não possui permissão para criar pedidos.');
    }

    // Revalidação de permissões Alexa e modo vigente
    const permSnap = await transaction.get(db.collection(COLLECTIONS.PERMISSIONS).doc(uid));
    if (!permSnap.exists || !permSnap.data()?.enabled) {
      throw new Error('VOICE_NOT_ALLOWED: Permissão de voz desativada durante a operação.');
    }
    const permData = permSnap.data() || {};
    if (channel === 'voice' && permData.mode !== 'voice_confirm') {
      throw new Error('VOICE_NOT_ALLOWED: O modo de aprovação foi alterado para confirmação no aplicativo.');
    }

    // Achado 5a: ambiente do rascunho deve corresponder ao config.environment atual
    if (draft.environment && draft.environment !== config.environment) {
      throw new Error(`ENVIRONMENT_MISMATCH: Rascunho do ambiente '${draft.environment}' não pode ser confirmado no ambiente '${config.environment}'.`);
    }

    // Revalidação de campos obrigatórios do pedido
    const cleanCustomer = String(draft.customer || '').trim();
    const cleanProduct = String(draft.product || '').trim();
    const cleanQuantity = Number(draft.quantity);
    // Preço deve ser número real — null/undefined → NaN; preço 0 é permitido (pedido gratuito)
    const cleanPrice = (draft.price !== null && draft.price !== undefined) ? Number(draft.price) : NaN;
    const cleanDate = String(draft.deliveryDate || '').trim();

    if (!cleanCustomer || cleanCustomer.length < 2 || cleanCustomer.length > 100) {
      throw new Error('DRAFT_INVALID_DATA: Nome do cliente inválido.');
    }
    if (!cleanProduct || cleanProduct.length < 1 || cleanProduct.length > 200) {
      throw new Error('DRAFT_INVALID_DATA: Nome do produto inválido.');
    }
    if (!Number.isInteger(cleanQuantity) || cleanQuantity <= 0 || cleanQuantity > 10000) {
      throw new Error('DRAFT_INVALID_DATA: Quantidade inválida.');
    }
    if (isNaN(cleanPrice) || cleanPrice < 0 || cleanPrice > 10000) {
      throw new Error('DRAFT_INVALID_DATA: Preço total inválido ou ausente.');
    }
    // Achado 5c: validar data no calendário real (rejeita 2027-02-31)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      throw new Error('DRAFT_INVALID_DATA: Data de entrega inválida.');
    }
    const [dy, dm, dd] = cleanDate.split('-').map(Number);
    const testDate = new Date(Date.UTC(dy, dm - 1, dd));
    if (
      testDate.getUTCFullYear() !== dy ||
      testDate.getUTCMonth() !== dm - 1 ||
      testDate.getUTCDate() !== dd
    ) {
      throw new Error('DRAFT_INVALID_DATA: Data de entrega inválida no calendário (ex: 31 de fevereiro).');
    }

    // Revalidação da conta Firebase Auth (fail-closed)
    try {
      const auth = authService || (admin.apps && admin.apps.length > 0 ? admin.auth() : null);
      if (!auth || typeof auth.getUser !== 'function') {
        throw new Error('AUTH_UNAVAILABLE: Serviço de autenticação indisponível no momento do commit.');
      }
      const authUser = await auth.getUser(uid);
      if (authUser.disabled) {
        throw new Error('USER_DISABLED: Conta de usuário suspensa no momento do commit.');
      }
    } catch (authErr) {
      if (authErr.message?.includes('USER_DISABLED')) throw authErr;
      if (authErr.message?.includes('AUTH_UNAVAILABLE')) throw authErr;
      throw new Error('USER_NOT_FOUND: Conta de autenticação não localizada.');
    }

    // Ler contadores de rate limit por UID (leitura antes das escritas)
    // Reutiliza 'now' declarado no início da transação para verificar expiração
    const windowHour = Math.floor(now / 3600000);
    const windowDay = Math.floor(now / 86400000);
    const hourRef = db.collection(COLLECTIONS.RATE_LIMITS).doc(`ord_hr_${uid}_${windowHour}`);
    const dayRef = db.collection(COLLECTIONS.RATE_LIMITS).doc(`ord_day_${uid}_${windowDay}`);
    const [hourSnap, daySnap] = await Promise.all([
      transaction.get(hourRef),
      transaction.get(dayRef),
    ]);

    // Ler contador sequencial do usuário: users/{uid}/metadata/counters
    const counterRef = db.doc(`users/${uid}/metadata/counters`);
    const counterSnap = await transaction.get(counterRef);

    // --- FIM DAS LEITURAS — INÍCIO DAS VALIDAÇÕES E ESCRITAS ---

    // Validar rate limits com os valores lidos
    const { LIMITS } = require('./rateLimit');
    let hourCount = 0;
    if (hourSnap.exists) {
      const d = hourSnap.data() || {};
      const exp = d.expiresAt?.toDate ? d.expiresAt.toDate().getTime() : 0;
      if (exp > now) hourCount = Number(d.count || 0);
    }
    let dayCount = 0;
    if (daySnap.exists) {
      const d = daySnap.data() || {};
      const exp = d.expiresAt?.toDate ? d.expiresAt.toDate().getTime() : 0;
      if (exp > now) dayCount = Number(d.count || 0);
    }
    if (hourCount >= LIMITS.ORDERS_PER_HOUR_PER_PERSON) {
      throw new Error('RATE_LIMITED: Limite de pedidos por hora excedido (máximo 10 pedidos/hora).');
    }
    if (dayCount >= LIMITS.ORDERS_PER_DAY_PER_PERSON) {
      throw new Error('RATE_LIMITED: Limite diário de pedidos excedido (máximo 50 pedidos/dia).');
    }

    const currentCount = counterSnap.exists ? Number(counterSnap.data()?.orderCounter || 0) : 0;
    const nextCount = currentCount + 1;
    const year = new Date().getFullYear();
    const orderNumber = `#${year}-${String(nextCount).padStart(4, '0')}`;

    // --- ESCRITAS ---
    // 1. Atualizar contador do usuário
    transaction.set(counterRef, { orderCounter: nextCount }, { merge: true });

    // 2. Consumir contadores de rate limit (escritas após todas as leituras)
    const hourExpiresAt = new Date(now + 7200 * 1000);
    const dayExpiresAt = new Date(now + 172800 * 1000);
    transaction.set(
      hourRef,
      { count: hourCount + 1, expiresAt: admin.firestore.Timestamp.fromDate(hourExpiresAt), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    transaction.set(
      dayRef,
      { count: dayCount + 1, expiresAt: admin.firestore.Timestamp.fromDate(dayExpiresAt), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    // 3. Construir e salvar o documento de pedido (orders/{orderId})
    const numericPrice = cleanPrice;
    const orderData = {
      userId: uid,
      createdByName: profile.displayName || profile.email || uid,
      orderNumber,
      customerName: cleanCustomer,
      customerPhone: '',
      customerId: null,
      productName: cleanProduct,
      quantity: cleanQuantity,
      price: numericPrice,
      status: 'pending',
      deliveryDate: cleanDate,
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

    // 3. Salvar lançamento no histórico financeiro padronizado (salesLedger/{orderId})
    const ledgerRef = db.collection(COLLECTIONS.SALES_LEDGER).doc(orderId);
    const ledgerData = {
      id: orderId,
      orderId,
      orderNumber,
      userId: uid,
      assignedTo: null,
      assignedToName: null,
      customerId: null,
      customerName: orderData.customerName,
      customerPhone: null,
      productName: orderData.productName,
      quantity: orderData.quantity,
      amount: numericPrice,
      totalAmount: numericPrice,
      paidAmount: 0,
      status: 'pending',
      paymentStatus: 'pending',
      date: new Date().toISOString(),
      deliveryDate: orderData.deliveryDate || null,
      tags: ['Alexa', 'Voz'],
      source: 'alexa',
      createdBy: uid,
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
      uid,
    };
  });

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

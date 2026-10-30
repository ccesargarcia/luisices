/**
 * Firebase Order Service - Versão Segura com Autenticação
 *
 * Todos os pedidos são associados ao userId do usuário autenticado
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocFromServer,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db, auth, functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { Order, OrderItem, OrderStatus, ProductionStep, ProductionWorkflow } from '../app/types';
import { parseDecimalMoneyInput } from '../app/utils/parseDecimalMoneyInput';
import { normalizeOrderItems } from '../app/utils/normalizeOrderItems';
import { MAX_ORDER_TAGS } from '../app/utils/orderLimits';
import { firebaseLedgerService } from './firebaseLedgerService';
import { firebaseCustomerService } from './firebaseCustomerService';
import { loadPendingOrderOperation, savePendingOrderOperation, clearPendingOrderOperation } from './pendingOrderOperations';

const ORDERS_COLLECTION = 'orders';

export function callableErrorCode(error: any): string {
  return String(error?.code || '').replace(/^functions\//, '');
}

/**
 * Classifica falhas transitórias de transporte, rede ou indisponibilidade de gateway
 * para fins de tratamento de operação inconclusiva e reconciliação idempotente via gateway.
 */
export function isTransientCallableError(error: any): boolean {
  if (!error) return false;
  const code = callableErrorCode(error);

  // Erros definitivos do backend/aplicação indicam recusa com resultado conhecido,
  // NUNCA falha transitória de transporte ou estado inconclusivo
  const definitiveAppCodes = [
    'invalid-argument',
    'permission-denied',
    'unauthenticated',
    'not-found',
    'already-exists',
    'failed-precondition',
    'aborted',
    'out-of-range',
    'unimplemented',
    'resource-exhausted',
    'data-loss',
  ];
  if (definitiveAppCodes.includes(code)) {
    return false;
  }

  // Códigos canônicos de indisponibilidade de transporte / timeout do SDK Firebase
  if (['unavailable', 'deadline-exceeded', 'network-request-failed'].includes(code)) {
    return true;
  }

  // Status HTTP em detalhes de resposta se disponíveis no erro
  const status = Number(error?.status || error?.customData?.status || error?.response?.status);
  if ([502, 503, 504, 520, 521, 522, 523, 524].includes(status)) {
    return true;
  }

  // Mensagens de falha de transporte no navegador / borda da Cloudflare
  const message = String(error?.message || '');

  // Detecção conservadora de falha de rede/gateway:
  // Evita falsos positivos com números arbitrários em mensagens de negócio
  const hasGatewaySignal =
    /failed to fetch|network\s*request\s*failed|network\s*error|load\s+failed|net::err/i.test(message) ||
    /cloudflare|bad\s+gateway|gateway\s+timeout|connection\s+timed?\s*out/i.test(message) ||
    /\b(502|503|504|520|521|522|523|524)\b.*(gateway|cloudflare|proxy|host|server)/i.test(message) ||
    /(gateway|cloudflare|proxy|host|server).*\b(502|503|504|520|521|522|523|524)\b/i.test(message);

  return hasGatewaySignal;
}

/** Alias para compatibilidade reversa */
export const isGatewayUnavailableError = isTransientCallableError;

function isUncertainCallableError(error: any): boolean {
  return ['deadline-exceeded', 'unavailable', 'internal', 'unknown', 'network-request-failed'].includes(callableErrorCode(error))
    || isTransientCallableError(error);
}

export class FirebaseOrderService {
  /** Executa leitura autoritativa diretamente no servidor Firestore, ignorando caches locais */
  private async readDocFromServer(ref: any): Promise<any> {
    if (typeof getDocFromServer === 'function') {
      try {
        return await getDocFromServer(ref);
      } catch (err: any) {
        // Se a leitura no servidor falhar (ex: rede fora), o erro é repassado para manter estado desconhecido
        throw err;
      }
    }
    return await getDoc(ref);
  }

  /**
   * Obter usuário autenticado
   */
  private getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('É necessário estar autenticado para realizar esta operação');
    }
    return user.uid;
  }

  private async canAccessAssignedOrder(data: Record<string, any>, userId: string): Promise<boolean> {
    if (data.userId === userId || data.assignedTo === userId) {
      return true;
    }
    try {
      const profileSnap = await getDoc(doc(db, 'userProfiles', userId));
      return profileSnap.exists() && profileSnap.data().role === 'admin';
    } catch {
      return false;
    }
  }

  private currentOrderVersion(data: Record<string, any>): number {
    if (data.version === undefined) return 1;
    if (!Number.isSafeInteger(data.version) || data.version < 1) {
      throw new Error('Este pedido tem uma versão inválida e precisa ser corrigido antes de uma nova edição.');
    }
    return data.version;
  }

  private nextOrderVersion(data: Record<string, any>): number {
    return this.currentOrderVersion(data) + 1;
  }

  private async updateOrderWithVersion(
    orderRef: any,
    buildUpdates: (orderData: Record<string, any>) => Record<string, any>
  ): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) throw new Error('Pedido não encontrado');
      const orderData = orderSnap.data() as Record<string, any>;
      transaction.update(orderRef, {
        ...buildUpdates(orderData),
        version: this.nextOrderVersion(orderData),
      });
    });
  }

  private async updateOrdersWithVersion(
    orderIds: string[],
    buildUpdates: (orderData: Record<string, any>) => Record<string, any>
  ): Promise<void> {
    const ids = [...new Set(orderIds)];
    const chunkSize = 200;
    for (let index = 0; index < ids.length; index += chunkSize) {
      const chunk = ids.slice(index, index + chunkSize);
      await runTransaction(db, async (transaction) => {
        const orders = await Promise.all(chunk.map(async (id) => {
          const orderRef = doc(db, ORDERS_COLLECTION, id);
          const orderSnap = await transaction.get(orderRef);
          if (!orderSnap.exists()) throw new Error(`Pedido ${id} não encontrado`);
          return { orderRef, orderData: orderSnap.data() as Record<string, any> };
        }));

        for (const { orderRef, orderData } of orders) {
          transaction.update(orderRef, {
            ...buildUpdates(orderData),
            version: this.nextOrderVersion(orderData),
          });
        }
      });
    }
  }

  /**
   * Gerar número do pedido sequencial (#2026-0001)
   */
  private async generateOrderNumber(userId: string): Promise<string> {
    const year = new Date().getFullYear();
    const counterRef = doc(db, 'users', userId, 'metadata', 'counters');

    // Usar transaction para evitar duplicatas
    const orderNumber = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentCount = counterDoc.exists()
        ? counterDoc.data()?.orderCounter || 0
        : 0;

      const nextCount = currentCount + 1;
      transaction.set(counterRef, { orderCounter: nextCount }, { merge: true });

      return `#${year}-${String(nextCount).padStart(4, '0')}`;
    });

    return orderNumber;
  }

  /**
   * Garantir que um valor monetário nunca seja negativo e tenha precisão estrita de 2 casas decimais
   */
  private ensurePositive(value: number | undefined | null): number {
    const num = Math.max(0, value ?? 0);
    return Math.round(num * 100) / 100;
  }

  /**
   * Validar e limpar items de troca/permuta
   */
  private sanitizeExchangeItems(items: any[] | null | undefined): any[] | null {
    if (!items || !Array.isArray(items)) return null;
    return items.map(item => ({
      ...item,
      value: item.value !== undefined && item.value !== null
        ? this.ensurePositive(item.value)
        : undefined,
      quantity: Math.max(0, item.quantity ?? 0)
    }));
  }

  /**
   * Registra reduções do saldo por forma de pagamento, abatendo cada ajuste
   * da mesma forma usada nas entradas positivas mais recentes do histórico.
   */
  private buildPaymentReductionEntries(
    history: any[],
    amountToReduce: number,
    date: string,
    fallbackMethod: string,
    reason: string,
  ): any[] {
    let remaining = Math.round(amountToReduce * 100) / 100;
    const reductions = new Map<string, number>();

    for (let index = history.length - 1; index >= 0 && remaining > 0; index -= 1) {
      const entryAmount = Number(history[index]?.amount) || 0;
      if (entryAmount <= 0) continue;

      const reduction = Math.min(entryAmount, remaining);
      const method = history[index]?.method || fallbackMethod;
      reductions.set(method, Math.round(((reductions.get(method) || 0) + reduction) * 100) / 100);
      remaining = Math.round((remaining - reduction) * 100) / 100;
    }

    if (remaining > 0) {
      reductions.set(fallbackMethod, Math.round(((reductions.get(fallbackMethod) || 0) + remaining) * 100) / 100);
    }

    return Array.from(reductions.entries()).map(([method, reduction]) => ({
      amount: -reduction,
      date,
      method,
      notes: `${reason} Forma ${method}: R$ ${reduction.toFixed(2)}.`,
    }));
  }

  /**
   * Validar e limpar itens estruturados do pedido
   */
  private sanitizeOrderItems(items: any[] | null | undefined): OrderItem[] | null {
    if (!items || !Array.isArray(items)) return null;
    const sanitized: OrderItem[] = items
      .map(item => {
        const name = String(item?.name || '').trim();
        const rawQuantity = typeof item?.quantity === 'number' ? item.quantity : parseInt(String(item?.quantity || '1'), 10);
        const quantity = Math.max(1, Number.isFinite(rawQuantity) ? Math.round(rawQuantity) : 1);
        let unitPrice = 0;
        if (typeof item?.unitPrice === 'number' && Number.isFinite(item.unitPrice)) {
          unitPrice = this.ensurePositive(item.unitPrice);
        } else if (typeof item?.unitPrice === 'string') {
          unitPrice = parseDecimalMoneyInput(item.unitPrice) ?? 0;
        }
        // unitPrice e quantity são a fonte canônica; nunca preserve um subtotal divergente.
        const price = this.ensurePositive(quantity * unitPrice);
        return { name, quantity, unitPrice, price };
      })
      .filter(item => item.name.length > 0);
    return sanitized.length > 0 ? sanitized : null;
  }

  /**
   * Validar campos e tipos com paridade estrita em relação ao backend (firestore.rules)
   */
  private validateOrderPayload(data: Partial<Order>): void {
    if (data.tags != null && (!Array.isArray(data.tags) || data.tags.length > MAX_ORDER_TAGS)) {
      throw new Error(`Um pedido pode ter no máximo ${MAX_ORDER_TAGS} etiquetas.`);
    }
    if (Array.isArray(data.tags)) {
      for (const tag of data.tags as any[]) {
        const name = tag?.name;
        const color = tag?.color;
        if (typeof name !== 'string' || !name.trim() || name !== name.trim() || name.length > 80 || name.includes('\0') ||
            typeof color !== 'string' || !/^#(?:[a-fA-F0-9]{6}|[a-fA-F0-9]{8})$/.test(color)) {
          throw new Error('Cada etiqueta precisa ter um nome válido e uma cor hexadecimal.');
        }
      }
    }
    if (data.exchangeItems != null) {
      if (!Array.isArray(data.exchangeItems) || data.exchangeItems.length > 10) {
        throw new Error('Uma permuta pode ter no máximo 10 itens recebidos.');
      }
      for (const item of data.exchangeItems) {
        if (!item || typeof item.name !== 'string' || !item.name.trim() || item.name.trim().length > 200 ||
            !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000 ||
            (item.value != null && (typeof item.value !== 'number' || !Number.isFinite(item.value) || item.value < 0 || item.value > 1000000))) {
          throw new Error('Confira os itens recebidos: nome, quantidade e valor precisam ser válidos.');
        }
      }
    }
    if (data.items != null) {
      if (!Array.isArray(data.items)) {
        throw new Error('A lista de produtos do pedido é inválida.');
      }
      const items = data.items.filter(item => String(item?.name || '').trim());
      if (items.length > 10) {
        throw new Error('O pedido não pode ter mais de 10 produtos.');
      }
      let itemsQuantity = 0;
      let itemsPrice = 0;
      for (const item of items) {
        const name = String(item?.name || '').trim();
        const quantity = typeof item?.quantity === 'number' ? item.quantity : Number(item?.quantity);
        const rawUnitPrice = typeof item?.unitPrice === 'number'
          ? item.unitPrice
          : typeof item?.unitPrice === 'string'
            ? parseDecimalMoneyInput(item.unitPrice)
            : null;
        if (!name || name.length > 300 || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000 ||
            rawUnitPrice === null || !Number.isFinite(rawUnitPrice) || rawUnitPrice < 0 || rawUnitPrice > 1000000) {
          throw new Error('Confira cada produto: nome, quantidade inteira e valor unitário precisam ser válidos.');
        }
        const unitPrice = this.ensurePositive(rawUnitPrice);
        const linePrice = this.ensurePositive(quantity * unitPrice);
        if (linePrice > 1000000) {
          throw new Error(`O subtotal do produto "${name}" não pode ultrapassar R$ 1.000.000,00.`);
        }
        itemsQuantity += quantity;
        itemsPrice = Math.round((itemsPrice + linePrice) * 100) / 100;
      }
      if (items.length > 0 && data.quantity !== undefined && itemsQuantity !== data.quantity) {
        throw new Error('A quantidade total não corresponde à soma das quantidades dos produtos.');
      }
      if (items.length > 0 && data.price !== undefined && Math.abs(itemsPrice - data.price) >= 0.05) {
        throw new Error('O valor total não corresponde à soma dos subtotais dos produtos.');
      }
    }
    if (data.customerName !== undefined) {
      if (!data.customerName || typeof data.customerName !== 'string' || !data.customerName.trim()) {
        throw new Error('Nome do cliente é obrigatório.');
      }
      if (data.customerName.trim().length > 200) {
        throw new Error('Nome do cliente deve ter no máximo 200 caracteres.');
      }
    }
    if (data.productName !== undefined) {
      if (!data.productName || typeof data.productName !== 'string' || !data.productName.trim()) {
        throw new Error('Nome do produto é obrigatório.');
      }
      if (data.productName.trim().length > 300) {
        throw new Error('Nome do produto deve ter no máximo 300 caracteres.');
      }
    }
    if (data.quantity !== undefined) {
      if (typeof data.quantity !== 'number' || !Number.isInteger(data.quantity) || data.quantity < 1 || data.quantity > 10000) {
        throw new Error('A quantidade deve ser um número inteiro entre 1 e 10.000.');
      }
    }
    if (data.price !== undefined) {
      if (typeof data.price !== 'number' || !Number.isFinite(data.price) || data.price < 0 || data.price > 1000000) {
        throw new Error('O valor do pedido deve estar entre R$ 0,00 e R$ 1.000.000,00.');
      }
    }
    if (data.unitPrice != null && (typeof data.unitPrice !== 'number' || !Number.isFinite(data.unitPrice) || data.unitPrice < 0 || data.unitPrice > 1000000)) {
      throw new Error('O valor unitário deve estar entre R$ 0,00 e R$ 1.000.000,00.');
    }
    if (data.pricingMode != null && !['unit', 'total', 'items'].includes(data.pricingMode)) {
      throw new Error('O tipo de precificação do pedido é inválido.');
    }
    if (data.customerPhone != null && (typeof data.customerPhone !== 'string' || data.customerPhone.length > 50)) {
      throw new Error('O telefone do cliente deve ter no máximo 50 caracteres.');
    }
    if (data.notes != null && (typeof data.notes !== 'string' || data.notes.length > 1000)) {
      throw new Error('As observações devem ter no máximo 1.000 caracteres.');
    }
    if (data.deliveryDate !== undefined && (typeof data.deliveryDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.deliveryDate))) {
      throw new Error('Informe uma data de entrega válida.');
    }
    if (typeof data.deliveryDate === 'string') {
      const parsedDeliveryDate = new Date(`${data.deliveryDate}T00:00:00.000Z`);
      if (Number.isNaN(parsedDeliveryDate.getTime()) ||
          parsedDeliveryDate.toISOString().slice(0, 10) !== data.deliveryDate) {
        throw new Error('Informe uma data de entrega válida.');
      }
    }
    if (data.status !== undefined) {
      if (!['pending', 'in-progress', 'completed', 'cancelled'].includes(data.status)) {
        throw new Error('Status do pedido inválido.');
      }
    }
  }

  /**
   * Criar pedido
   */
  private buildOrderData(orderData: Partial<Order>, userId: string, orderNumber: string) {
    // Garantir que valores monetários sejam positivos
    const price = this.ensurePositive(orderData.price);

    // Sanitize payment object: replace undefined with null so Firestore doesn't reject it
    let payment = null;
    if (orderData.payment) {
      const totalAmount = orderData.isExchange ? 0 : price;
      const rawPaidAmount = orderData.isExchange ? 0 : this.ensurePositive(orderData.payment.paidAmount);
      // Regra estrita do Firestore (firestore.rules:344): 0 <= paidAmount <= price
      const paidAmount = Math.min(rawPaidAmount, totalAmount);
      const remainingAmount = this.ensurePositive(
        Math.round(Math.max(0, totalAmount - paidAmount) * 100) / 100
      );
      const resolvedStatus = totalAmount === 0
        ? (orderData.payment.status === 'pending' ? 'pending' : 'paid')
        : (paidAmount >= totalAmount ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending'));

      payment = {
        status: resolvedStatus,
        method: orderData.payment.method || null,
        totalAmount,
        paidAmount,
        remainingAmount,
        paymentDate: orderData.payment.paymentDate || (paidAmount > 0 ? new Date().toISOString() : null),
        notes: orderData.payment.notes || null,
        history: orderData.payment.history?.map(h => ({
          amount: typeof h.amount === 'number' && Number.isFinite(h.amount) ? Math.round(h.amount * 100) / 100 : 0,
          date: h.date,
          method: h.method || null,
          notes: h.notes || null
        })) || null
      };
    }

    const sanitizedItems = this.sanitizeOrderItems(orderData.items);
    const resolvedUnitPrice = typeof orderData.unitPrice === 'number' && Number.isFinite(orderData.unitPrice)
      ? this.ensurePositive(orderData.unitPrice)
      : (sanitizedItems && sanitizedItems.length === 1 ? sanitizedItems[0].unitPrice : null);
    const resolvedPricingMode = orderData.pricingMode || (sanitizedItems && sanitizedItems.length > 1 ? 'items' : resolvedUnitPrice != null ? 'unit' : 'total');

    return {
      userId,
      createdByName: auth.currentUser?.displayName || auth.currentUser?.email || userId,
      orderNumber,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      productName: orderData.productName,
      quantity: orderData.quantity,
      price,
      pricingMode: resolvedPricingMode,
      unitPrice: resolvedUnitPrice,
      items: sanitizedItems || null,
      status: orderData.status || 'pending',
      deliveryDate: orderData.deliveryDate,
      notes: orderData.notes || null,
      tags: orderData.tags || null,
      customerId: orderData.customerId || null,
      assignedTo: orderData.assignedTo || null,
      assignedToName: orderData.assignedToName || null,
      assignedAt: orderData.assignedAt || null,
      assignedBy: orderData.assignedBy || null,
      payment,
      isExchange: orderData.isExchange || false,
      exchangeNotes: orderData.exchangeNotes || null,
      exchangeItems: this.sanitizeExchangeItems(orderData.exchangeItems),
      cardColor: orderData.cardColor || null,
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
      createdAt: Timestamp.now(),
      deletedAt: null,
      isArchived: Boolean(orderData.isArchived),
      archivedAt: orderData.archivedAt || null,
      archivedBy: orderData.archivedBy || null,
    };

  }

  /** Grava contador, pedido, venda e vínculo de catálogo/orçamento em uma única transação atômica. */
  async createOrder(orderData: Partial<Order>, catalogOrderId?: string, quoteId?: string, idempotencyKey?: string): Promise<Order> {
    try {
      this.validateOrderPayload(orderData);
    } catch (error) {
      // These checks run before any request is sent. Mark them as definitive so
      // the UI can discard an unsubmitted idempotency draft and allow correction.
      if (error && typeof error === 'object' && !('code' in error)) {
        Object.assign(error, { code: 'invalid-argument' });
      }
      throw error;
    }
    const userId = this.getCurrentUserId();

    // 1. Determina antecipadamente o identificador único e estável da operação.
    // Prioridade:
    // a) idempotencyKey explícita
    // b) orderData.id já existente
    // c) novo ID determinístico gerado no Firestore
    const candidateId = idempotencyKey
      || (typeof (orderData as any).id === 'string' && (orderData as any).id.trim()
        ? (orderData as any).id.trim()
        : null)
      || (typeof (orderData as any).idempotencyKey === 'string' && (orderData as any).idempotencyKey.trim()
        ? (orderData as any).idempotencyKey.trim()
        : null)
      || doc(collection(db, ORDERS_COLLECTION)).id;

    const effectiveOrderId = candidateId;

    const sanitizedData: Partial<Order> = {
      ...orderData,
      id: effectiveOrderId,
      items: this.sanitizeOrderItems(orderData.items),
      exchangeItems: this.sanitizeExchangeItems(orderData.exchangeItems),
    };

    // Even on retry the backend must check authorization AND the original payload.
    // Finding a document with this ID does not prove this command was accepted.

    // 2. Tentar criar via Cloud Function autoritativa (isolamento CEL total e recuperação de estado)
    try {
      const callable = httpsCallable<{
        orderData: Partial<Order>;
        catalogOrderId?: string;
        quoteId?: string;
        idempotencyKey?: string;
      }, { success: boolean; orderId: string; orderNumber: string }>(
        functions,
        'createOrder',
      );
      const response = await callable({
        orderData: sanitizedData,
        catalogOrderId,
        quoteId,
        idempotencyKey: effectiveOrderId,
      });
      if (response?.data?.orderId) {
        try {
          const saved = await this.readDocFromServer(doc(db, ORDERS_COLLECTION, response.data.orderId));
          if (!saved?.exists()) throw new Error('Pedido ainda não disponível para leitura.');
          return this.mapOrderDoc(saved);
        } catch (_readErr: any) {
          // Se a leitura no servidor falhar logo após a Function responder sucesso,
          // preserva a chave idempotente no erro para que um retry recupere o mesmo pedido
          const unconfirmedErr: any = new Error(
            `O pedido foi processado pelo servidor, mas a confirmação da leitura falhou. ` +
            `A chave (${response.data.orderId}) foi preservada. Repita a operação para carregar o pedido gravado.`
          );
          unconfirmedErr.code = 'unconfirmed-order';
          unconfirmedErr.orderId = response.data.orderId;
          unconfirmedErr.idempotencyKey = response.data.orderId;
          unconfirmedErr.isUnconfirmed = true;
          throw unconfirmedErr;
        }
      }
      if (functions && Object.keys(functions).length > 0) {
        throw Object.assign(new Error('Resposta de criação inválida recebida do servidor.'), { code: 'internal' });
      }
    } catch (err: any) {
      if (['invalid-argument', 'permission-denied', 'unauthenticated', 'not-found', 'failed-precondition', 'already-exists', 'unconfirmed-order'].includes(callableErrorCode(err))) {
        throw err;
      }

      // Em erro de rede/timeout real da Function, preservar estado incerto com chave da operação
      const isNetworkOrTimeout = isUncertainCallableError(err);

      if (isNetworkOrTimeout) {
        // Se a leitura falhou ou houve timeout, NÃO se pode concluir que a Function não gravou.
        // Preservamos a chave da operação no erro para que repetições usem o mesmo ID
        // e informamos que o resultado precisa ser confirmado pelo gateway.
        const unconfirmedError: any = new Error(
          `A gravação do pedido não pôde ser confirmada devido ao tempo de resposta esgotado. ` +
          `A chave da operação (${effectiveOrderId}) foi preservada. ` +
          `Verifique a lista de pedidos ou tente novamente utilizando a mesma chave de operação.`
        );
        unconfirmedError.code = 'unconfirmed-order';
        unconfirmedError.orderId = effectiveOrderId;
        unconfirmedError.idempotencyKey = effectiveOrderId;
        unconfirmedError.isUnconfirmed = true;
        throw unconfirmedError;
      }

      // Se a Function está configurada (produção / ambiente real), nunca contorna o fluxo autoritativo
      // gravando diretamente pelo cliente, eliminando o risco de reintroduzir dependência das regras CEL.
      let isUnconfiguredMock = false;
      try {
        isUnconfiguredMock = !functions
          || (typeof functions === 'object' && Object.keys(functions).length === 0);
      } catch {
        isUnconfiguredMock = true;
      }
      if (typeof err?.message === 'string' && (err.message.includes('_url is not a function') || err.message.includes('No "functions" export'))) {
        isUnconfiguredMock = true;
      }
      isUnconfiguredMock = import.meta.env.MODE === 'test' && isUnconfiguredMock;

      if (!isUnconfiguredMock) {
        console.error('[firebaseOrderService] Falha ao criar pedido via Cloud Function:', err);
        throw new Error(err?.message || 'Falha de comunicação ao cadastrar pedido no servidor. Tente novamente.');
      }

      console.warn('[firebaseOrderService] createOrder callable indisponível no ambiente de teste, executando transação de teste.');
    }

    // 3. Fallback transacional local idempotente para ambientes de teste
    const orderRef = doc(db, ORDERS_COLLECTION, effectiveOrderId);
    const counterRef = doc(db, 'users', userId, 'metadata', 'counters');
    const catalogRef = catalogOrderId ? doc(db, 'catalogOrders', catalogOrderId) : null;
    const quoteRef = quoteId ? doc(db, 'quotes', quoteId) : null;

    const { savedOrderId, isNewOrder } = await runTransaction(db, async (transaction) => {
      // 0. Idempotência estrita: se o pedido já existe, não sobrescreve nem incrementa o contador
      const existingOrderSnap = await transaction.get(orderRef);
      if (existingOrderSnap && typeof existingOrderSnap.exists === 'function' && existingOrderSnap.exists()) {
        return { savedOrderId: orderRef.id, isNewOrder: false };
      }

      // 1. Idempotência e validação da lojinha
      if (catalogRef) {
        const catalogSnap = await transaction.get(catalogRef);
        if (!catalogSnap.exists()) throw new Error('Pedido da lojinha não encontrado.');
        const catalog = catalogSnap.data();
        // O vínculo é permanente, mesmo se o status de atendimento mudar posteriormente.
        if (catalog.convertedOrderId) return { savedOrderId: String(catalog.convertedOrderId), isNewOrder: false };
        if (catalog.status === 'converted') {
          throw new Error('Este pedido da lojinha já foi convertido em pedido de produção anteriormente.');
        }
      }

      // 2. Idempotência e validação de orçamento (Achado 8)
      if (quoteRef) {
        const quoteSnap = await transaction.get(quoteRef);
        if (!quoteSnap.exists()) throw new Error('Orçamento não encontrado.');
        const quote = quoteSnap.data();
        const existingOrderId = quote.convertedOrderId || quote.orderId;
        if (existingOrderId) return { savedOrderId: String(existingOrderId), isNewOrder: false };
        if (quote.status === 'approved') {
          throw new Error('Este orçamento já foi aprovado anteriormente.');
        }
        if (quote.status !== 'draft' && quote.status !== 'sent') {
          throw new Error('Apenas orçamentos em rascunho ou enviados podem ser aprovados.');
        }
        if (quote.validUntil) {
          const expiration = new Date(quote.validUntil);
          expiration.setHours(23, 59, 59, 999);
          if (expiration < new Date()) {
            throw new Error('Este orçamento expirou e não pode ser aprovado.');
          }
        }
      }

      const counterSnap = await transaction.get(counterRef);
      const nextCount = (counterSnap.data()?.orderCounter || 0) + 1;
      const orderNumber = `#${new Date().getFullYear()}-${String(nextCount).padStart(4, '0')}`;
      const data = this.buildOrderData(orderData, userId, orderNumber);
      const sale = firebaseLedgerService.mapOrderToSaleRecord({
        ...orderData, ...data, id: orderRef.id,
        createdAt: data.createdAt.toDate().toISOString(),
      } as Order, userId);

      transaction.set(counterRef, { orderCounter: nextCount }, { merge: true });
      transaction.set(orderRef, data);
      transaction.set(doc(db, 'salesLedger', orderRef.id), sale);

      if (catalogRef) {
        transaction.update(catalogRef, {
          status: 'converted', convertedOrderId: orderRef.id, updatedAt: Timestamp.now(),
        });
      }

      if (quoteRef) {
        transaction.update(quoteRef, {
          status: 'approved',
          orderId: orderRef.id,
          orderNumber,
          convertedOrderId: orderRef.id,
          convertedOrderNumber: orderNumber,
          approvedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      return { savedOrderId: orderRef.id, isNewOrder: true };
    });

    // Atualizar estatísticas do cliente de forma centralizada APENAS se for um pedido novo
    if (isNewOrder && orderData.customerId && !orderData.isExchange) {
      try {
        const orderAmount = Number(orderData.price || orderData.payment?.totalAmount || 0);
        await firebaseCustomerService.incrementCustomerStats(orderData.customerId, orderAmount);
      } catch (err) {
        console.warn('[firebaseOrderService] Não foi possível atualizar estatísticas do cliente:', err);
      }
    }

    return this.getOrderById(savedOrderId);
  }

  /**
   * Buscar pedido por ID
   */
  async getOrderById(orderId: string): Promise<Order> {
    const userId = this.getCurrentUserId();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      throw new Error(`Pedido ${orderId} não encontrado`);
    }

    const data = orderSnap.data();

    // Verificar se o pedido pertence ao usuário
    if (!(await this.canAccessAssignedOrder(data, userId))) {
      throw new Error('Você não tem permissão para acessar este pedido');
    }

    return this.mapOrderDoc(orderSnap);
  }

  async getOrderByIdFromServer(orderId: string): Promise<Order> {
    const uid = this.getCurrentUserId();
    const snapshot = await this.readDocFromServer(doc(db, ORDERS_COLLECTION, orderId));
    if (!snapshot?.exists() || !(await this.canAccessAssignedOrder(snapshot.data(), uid))) {
      throw new Error('Pedido não encontrado ou sem permissão para leitura.');
    }
    return this.mapOrderDoc(snapshot);
  }

  private mapOrderDoc(doc: any): Order {
    const data = doc.data();
    return {
      id: doc.id,
      orderNumber: data.orderNumber,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerId: data.customerId,
      productName: data.productName,
      quantity: data.quantity,
      price: data.price,
      pricingMode: data.pricingMode,
      unitPrice: typeof data.unitPrice === 'number' ? data.unitPrice : null,
      items: Array.isArray(data.items) ? normalizeOrderItems(data.items) : (data.items === null ? null : undefined),
      status: data.status,
      deliveryDate: data.deliveryDate,
      notes: data.notes,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      tags: data.tags,
      payment: data.payment,
      createdByName: data.createdByName,
      assignedTo: data.assignedTo,
      assignedToName: data.assignedToName,
      assignedAt: data.assignedAt,
      assignedBy: data.assignedBy,
      productionWorkflow: data.productionWorkflow,
      attachments: data.attachments,
      isExchange: data.isExchange ?? false,
      exchangeNotes: data.exchangeNotes,
      exchangeItems: data.exchangeItems,
      cardColor: data.cardColor,
      userId: data.userId,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      version: Number.isSafeInteger(data.version) && data.version > 0 ? data.version : 1,
      isArchived: Boolean(data.isArchived),
      archivedAt: data.archivedAt?.toDate ? data.archivedAt.toDate().toISOString() : data.archivedAt,
      archivedBy: data.archivedBy,
      hasPublicTracking: Boolean(data.publicTrackingHash)
        && (data.publicTrackingExpiresAt === null
          || (typeof data.publicTrackingExpiresAt === 'string' && Date.parse(data.publicTrackingExpiresAt) > Date.now())),
      publicTrackingExpiresAt: typeof data.publicTrackingExpiresAt === 'string' || data.publicTrackingExpiresAt === null
        ? data.publicTrackingExpiresAt
        : undefined,
    } as Order;
  }

  /**
   * Contar pedidos ativos (pendente/em produção) de um cliente
   */
  async getActiveOrdersByCustomer(customerId: string): Promise<number> {
    const userId = this.getCurrentUserId();
    const ordersRef = collection(db, ORDERS_COLLECTION);
    const q = query(
      ordersRef,
      where('userId', '==', userId),
      where('customerId', '==', customerId),
      where('deletedAt', '==', null)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.filter(d => ['pending', 'in-progress'].includes(d.data().status)).length;
  }

  /**
   * Listar pedidos do usuário autenticado (ou todos se admin, próprios + atribuídos se funcionário)
   */
  async getOrders(): Promise<Order[]> {
    const userId = this.getCurrentUserId();
    const ordersRef = collection(db, ORDERS_COLLECTION);

    let role = 'user';
    try {
      const profileSnap = await getDoc(doc(db, 'userProfiles', userId));
      if (profileSnap.exists()) {
        role = profileSnap.data().role;
      }
    } catch {}

    if (role === 'admin') {
      const q = query(
        ordersRef,
        where('deletedAt', '==', null),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => this.mapOrderDoc(doc));
    }

    const ownQuery = query(
      ordersRef,
      where('userId', '==', userId),
      where('deletedAt', '==', null),
      orderBy('createdAt', 'desc')
    );
    const ownSnapshot = await getDocs(ownQuery);

    if (role === 'funcionario') {
      const assignedQuery = query(
        ordersRef,
        where('assignedTo', '==', userId),
        where('deletedAt', '==', null),
        orderBy('createdAt', 'desc')
      );
      const assignedSnapshot = await getDocs(assignedQuery);
      const orderMap = new Map<string, Order>();
      ownSnapshot.docs.forEach(d => orderMap.set(d.id, this.mapOrderDoc(d)));
      assignedSnapshot.docs.forEach(d => orderMap.set(d.id, this.mapOrderDoc(d)));
      return [...orderMap.values()].sort((a, b) =>
        String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      );
    }

    return ownSnapshot.docs.map(doc => this.mapOrderDoc(doc));
  }

  async assignOrder(orderId: string, employee: { uid: string; displayName: string } | null): Promise<void> {
    const userId = this.getCurrentUserId();
    const profileSnap = await getDoc(doc(db, 'userProfiles', userId));
    if (!profileSnap.exists() || profileSnap.data().role !== 'admin') {
      throw new Error('Apenas administradores podem atribuir pedidos');
    }

    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const orderSnap = await getDoc(orderRef);
    const updateData: Record<string, any> = {
      assignedTo: employee?.uid || null,
      assignedToName: employee?.displayName || null,
      assignedAt: employee ? new Date().toISOString() : null,
      assignedBy: employee ? userId : null,
      updatedAt: new Date().toISOString(),
    };

    if (orderSnap.exists()) {
      const orderData = orderSnap.data();
      if (!orderData.createdByName || orderData.createdByName === 'Usuário proprietário') {
        const creatorUid = orderData.userId;
        if (creatorUid) {
          const creatorSnap = await getDoc(doc(db, 'userProfiles', creatorUid));
          if (creatorSnap.exists()) {
            const cData = creatorSnap.data();
            updateData.createdByName = cData.displayName || cData.email || 'Usuário';
          }
        }
      }
    }

    await this.commitAssignments([orderId], updateData);
  }

  async assignOrdersBulk(orderIds: string[], employee: { uid: string; displayName: string } | null): Promise<void> {
    if (orderIds.length === 0) return;
    const userId = this.getCurrentUserId();
    const profileSnap = await getDoc(doc(db, 'userProfiles', userId));
    if (!profileSnap.exists() || profileSnap.data().role !== 'admin') {
      throw new Error('Apenas administradores podem atribuir pedidos');
    }

    const now = new Date().toISOString();
    const payload = {
      assignedTo: employee?.uid || null,
      assignedToName: employee?.displayName || null,
      assignedAt: employee ? now : null,
      assignedBy: employee ? userId : null,
      updatedAt: now,
    };

    await this.commitAssignments(orderIds, payload);
  }

  private async commitAssignments(orderIds: string[], payload: Record<string, any>): Promise<void> {
    // Duas gravações por pedido; cada par é atômico, inclusive em lotes grandes.
    const ids = [...new Set(orderIds)];
    const BATCH_SIZE = 200;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const chunk = ids.slice(i, i + BATCH_SIZE);
      await runTransaction(db, async (transaction) => {
        const records = await Promise.all(chunk.map(async (id) => {
          const orderRef = doc(db, ORDERS_COLLECTION, id);
          const saleRef = doc(db, 'salesLedger', id);
          const order = await transaction.get(orderRef);
          const sale = await transaction.get(saleRef);
          if (!order.exists()) throw new Error(`Pedido ${id} não encontrado`);
          return { orderRef, saleRef, order, sale };
        }));
        for (const { orderRef, saleRef, order, sale } of records) {
          transaction.update(orderRef, {
            ...payload,
            version: this.nextOrderVersion(order.data()),
          });
          if (sale.exists()) {
            transaction.update(saleRef, {
              assignedTo: payload.assignedTo,
              assignedToName: payload.assignedToName,
              updatedAt: payload.updatedAt,
            });
          } else {
            const record = firebaseLedgerService.mapOrderToSaleRecord({
              ...this.mapOrderDoc(order), ...payload,
            });
            transaction.set(saleRef, {
              ...record, isDeletedFromOrders: order.data().deletedAt != null,
            });
          }
        }
      });
    }
  }

  /**
   * Atualizar status do pedido e sincronizar salesLedger atomicamente com concorrência otimista.
   */
  async updateOrderStatus(orderId: string, status: OrderStatus, expectedVersion?: number, archive?: boolean): Promise<void> {
    const userId = this.getCurrentUserId();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const saleRef = doc(db, 'salesLedger', orderId);

    // Verificar propriedade
    const initialSnap = await getDoc(orderRef);
    if (!initialSnap.exists() || !(await this.canAccessAssignedOrder(initialSnap.data(), userId))) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

    await runTransaction(db, async (transaction) => {
      // 1. TODAS as leituras antes de qualquer escrita (exigência estrita do Firestore)
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error('Pedido não encontrado');
      }
      const saleSnap = await transaction.get(saleRef);
      const orderData = orderSnap.data();
      const currentVersion = this.currentOrderVersion(orderData);

      if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
        throw new Error(`Conflito de concorrência: o pedido foi alterado por outro usuário (versão ${currentVersion} != esperada ${expectedVersion}).`);
      }

      const now = new Date().toISOString();

      const orderUpdates: Record<string, any> = {
        status,
        version: this.nextOrderVersion(orderData),
        updatedAt: now,
      };

      if (archive === true && status === 'completed') {
        orderUpdates.isArchived = true;
        orderUpdates.archivedAt = now;
        orderUpdates.archivedBy = userId;
      } else if (status !== 'completed' && orderData.isArchived) {
        orderUpdates.isArchived = false;
        orderUpdates.archivedAt = null;
        orderUpdates.archivedBy = null;
      }

      // 2. TODAS as escritas após as leituras
      transaction.update(orderRef, orderUpdates);

      if (saleSnap.exists()) {
        const existingSale = saleSnap.data();
        const saleUpdates: Record<string, any> = {
          status,
          updatedAt: now,
        };
        if (orderData.userId && !existingSale.userId) {
          saleUpdates.userId = orderData.userId;
        }
        if (orderData.assignedTo && !existingSale.assignedTo) {
          saleUpdates.assignedTo = orderData.assignedTo;
          saleUpdates.assignedToName = orderData.assignedToName || null;
        }
        transaction.update(saleRef, saleUpdates);
      } else {
        const fullOrder = { ...this.mapOrderDoc(orderSnap), status };
        const saleRecord = firebaseLedgerService.mapOrderToSaleRecord(fullOrder as Order, userId);
        transaction.set(saleRef, {
          ...saleRecord,
          isDeletedFromOrders: orderData.deletedAt != null,
        });
      }
    });
  }

  /**
   * Atualizar dados do pedido e sincronizar salesLedger atomicamente com concorrência otimista.
   */
  async updateOrder(
    orderId: string,
    updates: Partial<Omit<Order, 'id' | 'userId' | 'createdAt' | 'orderNumber'>>,
    expectedVersion?: number,
    operationId?: string
  ): Promise<void> {
    this.validateOrderPayload(updates);
    const userId = this.getCurrentUserId();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const saleRef = doc(db, 'salesLedger', orderId);

    // Verificar propriedade
    const initialSnap = await getDoc(orderRef);
    if (!initialSnap.exists() || !(await this.canAccessAssignedOrder(initialSnap.data(), userId))) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

    const initialOrderData = initialSnap.data();
    const affectsItemTotals = ['items', 'price', 'quantity', 'pricingMode', 'unitPrice'].some((key) =>
      Object.prototype.hasOwnProperty.call(updates, key)
        && updates[key as keyof typeof updates] !== undefined
        && JSON.stringify(updates[key as keyof typeof updates])
          !== JSON.stringify(initialOrderData[key] ?? null));
    const paymentChanged = updates.payment !== undefined
      && JSON.stringify(updates.payment) !== JSON.stringify(initialOrderData.payment ?? null);
    const exchangeChanged = updates.isExchange !== undefined
      && Boolean(updates.isExchange) !== Boolean(initialOrderData.isExchange);
    const customerChanged = updates.customerId !== undefined
      && (updates.customerId ?? null) !== (initialOrderData.customerId ?? null);
    // Todas as alterações financeiras/itens passam pela Function. Isso evita
    // depender do custo CEL até mesmo para listas pequenas ou pedidos legados.
    const requiresBackend = Boolean(operationId) || paymentChanged || exchangeChanged || customerChanged || affectsItemTotals;
    if (requiresBackend) {
      const sanitizedUpdates = {
        ...updates,
        ...(updates.items !== undefined ? { items: this.sanitizeOrderItems(updates.items) } : {}),
      };
      const targetVersion = expectedVersion ?? this.currentOrderVersion(initialOrderData);
      const effectiveOperationId = operationId
        || doc(collection(db, ORDERS_COLLECTION)).id;

      try {
        const callable = httpsCallable<{
          orderId: string;
          expectedVersion: number;
          updates: typeof updates;
          operationId?: string;
        }, { success: boolean; alreadyApplied?: boolean }>(
          functions,
          'updateComplexOrder',
        );
        const response = await callable({
          orderId,
          expectedVersion: targetVersion,
          updates: sanitizedUpdates,
          operationId: effectiveOperationId,
        });
        if (response?.data?.success !== true) {
          throw Object.assign(new Error('Não foi possível confirmar a resposta da edição.'), { code: 'internal' });
        }
        return;
      } catch (err: any) {
        if (['invalid-argument', 'permission-denied', 'not-found', 'unauthenticated', 'failed-precondition', 'already-exists'].includes(callableErrorCode(err))) {
          throw err;
        }

        if (isUncertainCallableError(err)) {
          // A matching field or lastOperationId is insufficient: another command
          // may have reused that ID. Only the backend receipt confirms the retry.

          // Se a leitura falhou ou o resultado for inconclusivo sob timeout (ex: versão não avançou ainda):
          // mantém o estado como desconhecido e informa que não foi possível confirmar, sem retentar automaticamente.
          const unconfirmedError: any = new Error(
            'A alteração do pedido não pôde ser confirmada devido ao tempo de resposta esgotado. ' +
            'Verifique os dados atuais do pedido antes de tentar novamente.'
          );
          unconfirmedError.code = 'unconfirmed-update';
          unconfirmedError.operationId = effectiveOperationId;
          unconfirmedError.isUnconfirmed = true;
          throw unconfirmedError;
        }

        let isUnconfiguredMock = false;
        try {
          isUnconfiguredMock = !functions
            || (typeof functions === 'object' && Object.keys(functions).length === 0);
        } catch {
          isUnconfiguredMock = true;
        }
        if (typeof err?.message === 'string' && (err.message.includes('_url is not a function') || err.message.includes('No "functions" export'))) {
          isUnconfiguredMock = true;
        }
        isUnconfiguredMock = import.meta.env.MODE === 'test' && isUnconfiguredMock;

        if (!isUnconfiguredMock) {
          throw err;
        }
      }
      return;
    }

    await runTransaction(db, async (transaction) => {
      // 1. TODAS as leituras antes de qualquer escrita (exigência estrita do Firestore)
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error('Pedido não encontrado');
      }
      const saleSnap = await transaction.get(saleRef);
      const orderData = orderSnap.data();
      const currentVersion = this.currentOrderVersion(orderData);

      if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
        throw new Error(`Conflito de concorrência: o pedido foi alterado por outro usuário (versão ${currentVersion} != esperada ${expectedVersion}).`);
      }

      const now = new Date().toISOString();

      // 1. Determinar o preço efetivo final antes de processar qualquer propriedade,
      // para que a consistência do pagamento não dependa da ordem das chaves em `updates`.
      const hasPriceUpdate = typeof updates.price === 'number';
      const resolvedPrice = hasPriceUpdate
        ? this.ensurePositive(updates.price)
        : (orderData.price !== undefined ? this.ensurePositive(orderData.price) : 0);

      const existingPayment = orderData.payment || {};

      // Remover campos undefined e garantir preservação de histórico e integridade do saldo restante
      const cleanUpdates: any = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          if (['items', 'price', 'quantity', 'pricingMode', 'unitPrice', 'payment', 'isExchange'].includes(key)) {
            const unchanged = key === 'isExchange'
              ? Boolean(value) === Boolean(orderData.isExchange)
              : JSON.stringify(value) === JSON.stringify(orderData[key] ?? null);
            if (!unchanged) {
              throw new Error('Os dados financeiros do pedido mudaram durante a edição. Atualize a tela e tente novamente.');
            }
            // Valores sem alteração não devem ser incluídos na gravação direta;
            // mudanças reais são encaminhadas a updateComplexOrder antes da transação.
            return;
          }
          if (key === 'price' && typeof value === 'number') {
            cleanUpdates[key] = resolvedPrice;
          } else if (key === 'payment' && value) {
            const payment = value as any;
            const totalAmount = resolvedPrice;
            const existingPaid = this.ensurePositive(existingPayment.paidAmount || 0);
            const rawPaidAmount = this.ensurePositive(
              payment.paidAmount !== undefined
                ? payment.paidAmount
                : existingPaid
            );
            // Regra estrita do Firestore (firestore.rules:344): 0 <= paidAmount <= price
            const paidAmount = Math.min(rawPaidAmount, totalAmount);
            const excess = Math.round(Math.max(0, existingPaid - paidAmount) * 100) / 100;
            // Saldo restante recalculado estritamente para nunca violar a regra de integridade do Firestore
            const remainingAmount = this.ensurePositive(
              Math.round(Math.max(0, totalAmount - paidAmount) * 100) / 100
            );
            // Para totalAmount === 0 (ex: troca), o status jamais pode ser 'partial'
            const resolvedStatus = totalAmount === 0
              ? (payment.status === 'pending' || (!payment.status && existingPayment.status === 'pending') ? 'pending' : 'paid')
              : (paidAmount >= totalAmount ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending'));

            const isFirstPaymentRegistration = existingPaid === 0 && paidAmount > 0;
            const resolvedPaymentDate = paidAmount === 0
              ? null
              : (payment.paymentDate !== undefined
                  ? payment.paymentDate
                  : (existingPayment.paymentDate || (isFirstPaymentRegistration ? now : null)));

            let history = payment.history !== undefined ? payment.history : (existingPayment.history || null);
            let notes = payment.notes !== undefined ? payment.notes : (existingPayment.notes || null);
            if (excess > 0) {
              const baseHistory = Array.isArray(payment.history) && payment.history.length > 0
                ? [...payment.history]
                : (Array.isArray(existingPayment.history) && existingPayment.history.length > 0
                    ? [...existingPayment.history]
                    : (existingPaid > 0 ? [{
                        amount: existingPaid,
                        date: existingPayment.paymentDate || now,
                        method: existingPayment.method || payment.method || 'pix',
                        notes: 'Pagamento inicial registrado',
                      }] : []));

              const historySum = baseHistory.reduce((sum: number, h: any) => sum + (Number(h?.amount) || 0), 0);
              const unadjustedExcess = Math.round((historySum - paidAmount) * 100) / 100;

              if (unadjustedExcess > 0) {
                const reason = `Estorno/crédito automático de R$ ${unadjustedExcess.toFixed(2)} por redução do valor pago (de R$ ${existingPaid.toFixed(2)} para R$ ${paidAmount.toFixed(2)}).`;
                const adjustmentEntries = this.buildPaymentReductionEntries(
                  baseHistory,
                  unadjustedExcess,
                  now,
                  existingPayment.method || 'pix',
                  reason,
                );
                history = [...baseHistory, ...adjustmentEntries];
                const adjustmentNote = adjustmentEntries.map(entry => entry.notes).join(' ');
                notes = notes ? `${notes} | ${adjustmentNote}` : adjustmentNote;
              } else {
                history = baseHistory.length > 0 ? baseHistory : null;
              }
            }

            cleanUpdates[key] = {
              status: resolvedStatus,
              method: payment.method !== undefined ? (payment.method || null) : (existingPayment.method || null),
              totalAmount,
              paidAmount,
              remainingAmount,
              paymentDate: resolvedPaymentDate,
              notes,
              history,
            };
          } else if (key === 'exchangeItems') {
            cleanUpdates[key] = this.sanitizeExchangeItems(value as any);
          } else if (key === 'items') {
            cleanUpdates[key] = this.sanitizeOrderItems(value as any);
          } else if (key === 'unitPrice') {
            cleanUpdates[key] = typeof value === 'number' && Number.isFinite(value) ? this.ensurePositive(value) : null;
          } else if (key === 'pricingMode') {
            cleanUpdates[key] = value || 'total';
          } else {
            cleanUpdates[key] = value;
          }
        }
      });

      const remainsExchange = Boolean(cleanUpdates.isExchange ?? orderData.isExchange);
      if (remainsExchange && (cleanUpdates.isExchange === true || cleanUpdates.payment)) {
        cleanUpdates.payment = {
          status: 'paid', totalAmount: 0, paidAmount: 0, remainingAmount: 0,
          method: null, paymentDate: null, notes: null, history: null,
        };
      }

      // Se apenas o preço foi alterado e o pedido já possui payment, sincronizar totalAmount, remainingAmount e status
      if (cleanUpdates.price !== undefined && !cleanUpdates.payment && orderData.payment) {
        const totalAmount = cleanUpdates.price;
        const existingPaid = this.ensurePositive(orderData.payment.paidAmount || 0);
        // Regra estrita do Firestore (firestore.rules:344): paidAmount nunca pode exceder o novo preço
        const paidAmount = Math.min(existingPaid, totalAmount);
        const excess = Math.round(Math.max(0, existingPaid - paidAmount) * 100) / 100;
        const remainingAmount = this.ensurePositive(
          Math.round(Math.max(0, totalAmount - paidAmount) * 100) / 100
        );
        const resolvedStatus = totalAmount === 0
          ? (orderData.payment.status === 'pending' ? 'pending' : 'paid')
          : (paidAmount >= totalAmount ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending'));

        let history = orderData.payment.history || null;
        let notes = orderData.payment.notes || null;
        if (excess > 0) {
          const baseHistory = Array.isArray(orderData.payment.history) && orderData.payment.history.length > 0
            ? [...orderData.payment.history]
            : (existingPaid > 0 ? [{
                amount: existingPaid,
                date: orderData.payment.paymentDate || now,
                method: orderData.payment.method || 'pix',
                notes: 'Pagamento inicial registrado',
              }] : []);

          const historySum = baseHistory.reduce((sum: number, h: any) => sum + (Number(h?.amount) || 0), 0);
          const unadjustedExcess = Math.round((historySum - paidAmount) * 100) / 100;

          if (unadjustedExcess > 0) {
            const reason = `Estorno/crédito automático de R$ ${unadjustedExcess.toFixed(2)} por redução do total do pedido (de R$ ${existingPaid.toFixed(2)} para R$ ${totalAmount.toFixed(2)}).`;
            const adjustmentEntries = this.buildPaymentReductionEntries(
              baseHistory,
              unadjustedExcess,
              now,
              orderData.payment.method || 'pix',
              reason,
            );
            history = [...baseHistory, ...adjustmentEntries];
            const adjustmentNote = adjustmentEntries.map(entry => entry.notes).join(' ');
            notes = notes ? `${notes} | ${adjustmentNote}` : adjustmentNote;
          } else {
            history = baseHistory.length > 0 ? baseHistory : null;
          }
        }

        cleanUpdates.payment = {
          ...orderData.payment,
          totalAmount,
          paidAmount,
          remainingAmount,
          status: resolvedStatus,
          notes,
          history,
        };
      }

      if (Object.keys(cleanUpdates).length === 0) return;

      // 2. TODAS as escritas após as leituras
      transaction.update(orderRef, {
        ...cleanUpdates,
        version: this.nextOrderVersion(orderData),
        updatedAt: now,
      });

      if (saleSnap.exists()) {
        const salePayload: any = { updatedAt: now };
        const existingSale = saleSnap.data();
        // Reparar campos de vínculo legados ausentes usando como fonte o pedido
        // que o funcionário está autorizado a editar.
        if (orderData.userId && !existingSale.userId) {
          salePayload.userId = orderData.userId;
        }
        if (orderData.assignedTo && !existingSale.assignedTo) {
          salePayload.assignedTo = orderData.assignedTo;
          salePayload.assignedToName = orderData.assignedToName || null;
        }
        if (cleanUpdates.price !== undefined || cleanUpdates.isExchange !== undefined) {
          const exchange = cleanUpdates.isExchange ?? orderData.isExchange;
          salePayload.amount = exchange ? 0 : (cleanUpdates.price ?? orderData.price ?? 0);
        }
        if (cleanUpdates.isExchange !== undefined) salePayload.isExchange = Boolean(cleanUpdates.isExchange);
        if (cleanUpdates.status !== undefined) salePayload.status = cleanUpdates.status;
        if (cleanUpdates.customerName !== undefined) salePayload.customerName = cleanUpdates.customerName;
        if (cleanUpdates.customerPhone !== undefined) salePayload.customerPhone = cleanUpdates.customerPhone;
        if (cleanUpdates.customerId !== undefined) salePayload.customerId = cleanUpdates.customerId;
        if (cleanUpdates.productName !== undefined) salePayload.productName = cleanUpdates.productName;
        if (cleanUpdates.quantity !== undefined) salePayload.quantity = cleanUpdates.quantity;
        if (cleanUpdates.deliveryDate !== undefined) salePayload.deliveryDate = cleanUpdates.deliveryDate;
        if (cleanUpdates.assignedTo !== undefined) salePayload.assignedTo = cleanUpdates.assignedTo;
        if (cleanUpdates.assignedToName !== undefined) salePayload.assignedToName = cleanUpdates.assignedToName;
        if (cleanUpdates.payment) {
          salePayload.paymentStatus = cleanUpdates.payment.status;
          salePayload.paidAmount = cleanUpdates.payment.paidAmount;
          salePayload.paymentMethod = cleanUpdates.payment.method;
        }
        transaction.update(saleRef, salePayload);
      } else {
        const fullOrder = { ...this.mapOrderDoc(orderSnap), ...cleanUpdates };
        const saleRecord = firebaseLedgerService.mapOrderToSaleRecord(fullOrder as Order, userId);
        transaction.set(saleRef, {
          ...saleRecord,
          isDeletedFromOrders: orderData.deletedAt != null,
        });
      }

    });
  }

  /**
   * Duplicar pedido
   */
  async duplicateOrder(orderId: string, idempotencyKey?: string): Promise<Order> {
    const userId = this.getCurrentUserId();
    const scope = `duplicate-payload:${idempotencyKey || orderId}`;
    const pending = idempotencyKey ? loadPendingOrderOperation<Partial<Order>>(userId, scope) : null;
    if (pending) {
      const saved = await this.createOrder(pending.payload, undefined, undefined, pending.id);
      clearPendingOrderOperation(userId, scope);
      return saved;
    }
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists() || !(await this.canAccessAssignedOrder(orderSnap.data(), userId))) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

    const data = orderSnap.data();
    const price = this.ensurePositive(data.price);
    const duplicatedPayload: Partial<Order> = {
      customerName: data.customerName,
      customerPhone: data.customerPhone || null,
      customerId: data.customerId || null,
      productName: data.productName,
      quantity: data.quantity,
      price,
      pricingMode: data.pricingMode || null,
      unitPrice: typeof data.unitPrice === 'number' ? data.unitPrice : null,
      items: Array.isArray(data.items) ? normalizeOrderItems(data.items) : null,
      status: 'pending',
      deliveryDate: data.deliveryDate,
      notes: data.notes || null,
      tags: data.tags || null,
      payment: {
        status: 'pending',
        method: null,
        totalAmount: price,
        paidAmount: 0,
        remainingAmount: price,
        paymentDate: null,
        notes: null,
        history: null,
      },
      isExchange: Boolean(data.isExchange),
      exchangeNotes: data.exchangeNotes || null,
      exchangeItems: data.exchangeItems || null,
      cardColor: data.cardColor || null,
    };

    const operation = savePendingOrderOperation(userId, scope, duplicatedPayload, idempotencyKey);
    const saved = await this.createOrder(operation.payload, undefined, undefined, operation.id);
    clearPendingOrderOperation(userId, scope);
    return saved;
  }

  /**
   * Adicionar anexo a um pedido
   */
  async addAttachment(orderId: string, attachment: import('../app/types').OrderAttachment): Promise<void> {
    const userId = this.getCurrentUserId();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists() || !(await this.canAccessAssignedOrder(orderSnap.data(), userId))) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

    await this.updateOrderWithVersion(orderRef, (orderData) => {
      const current: import('../app/types').OrderAttachment[] = orderData.attachments || [];
      return { attachments: [...current, attachment], updatedAt: new Date().toISOString() };
    });
  }

  /**
   * Remover anexo de um pedido
   */
  async removeAttachment(orderId: string, url: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists() || !(await this.canAccessAssignedOrder(orderSnap.data(), userId))) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

    await this.updateOrderWithVersion(orderRef, (orderData) => {
      const current: import('../app/types').OrderAttachment[] = orderData.attachments || [];
      return {
        attachments: current.filter(a => a.url !== url),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Deletar pedido (soft delete)
   */
  async deleteOrder(orderId: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);

    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

    const data = orderSnap.data();
    const profileSnap = await getDoc(doc(db, 'userProfiles', userId));
    const profile = profileSnap.exists() ? profileSnap.data() : null;
    const hasDeletePermission = (permission: unknown): boolean => {
      if (permission === true) return true;
      if (!permission || typeof permission !== 'object') return false;
      return (permission as Record<string, unknown>).delete === true;
    };
    const archivedOrderPermission = profile?.permissions?.archivedOrders
      ?? profile?.permissions?.orders;
    const employeeCanDelete = data.isArchived === true
      ? hasDeletePermission(archivedOrderPermission)
      : hasDeletePermission(profile?.permissions?.orders);
    const canDelete = data.userId === userId
      || profile?.role === 'admin'
      || (
        profile?.role === 'funcionario'
        && profile.active === true
        && data.assignedTo === userId
        && employeeCanDelete
      );

    if (!canDelete) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

    await this.updateOrderWithVersion(orderRef, () => ({
      deletedAt: Timestamp.now(),
      updatedAt: new Date().toISOString(),
    }));

    firebaseLedgerService.markOrderDeletedFromOrders(orderId).catch(err => {
      console.warn('firebaseLedgerService: erro ao marcar pedido como removido de orders:', err);
    });
  }

  /**
   * Inicializar workflow de produção para um pedido
   */
  async initializeProductionWorkflow(orderId: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);

    // Verificar propriedade
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists() || !(await this.canAccessAssignedOrder(orderSnap.data(), userId))) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

    // Criar workflow inicial
    const workflow: ProductionWorkflow = {
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
    };

    await this.updateOrderWithVersion(orderRef, () => ({
      productionWorkflow: workflow,
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Atualizar etapa do workflow
   */
  async updateProductionStep(
    orderId: string,
    step: ProductionStep,
    completed: boolean,
    notes?: string
  ): Promise<void> {
    const userId = this.getCurrentUserId();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const saleRef = doc(db, 'salesLedger', orderId);

    // Verificar propriedade
    const initialSnap = await getDoc(orderRef);
    if (!initialSnap.exists() || !(await this.canAccessAssignedOrder(initialSnap.data(), userId))) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

    await runTransaction(db, async (transaction) => {
      // 1. Leituras
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error('Pedido não encontrado');
      }
      const saleSnap = await transaction.get(saleRef);
      const data = orderSnap.data();

      const workflow: ProductionWorkflow = data.productionWorkflow || {
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
      };

      // Atualizar a etapa sem passar campos com valor undefined
      const stepUpdate: any = {
        completed,
      };
      if (completed) {
        stepUpdate.completedAt = new Date().toISOString();
        const userName = auth.currentUser?.displayName || auth.currentUser?.email;
        if (userName) {
          stepUpdate.completedBy = userName;
        }
      }
      if (notes !== undefined && notes !== null && notes.trim() !== '') {
        stepUpdate.notes = notes.trim();
      }

      workflow.steps[step] = {
        ...workflow.steps[step],
        ...stepUpdate,
      };

      // Atualizar currentStep para a próxima etapa incompleta
      const stepOrder: ProductionStep[] = [
        'design',
        'approval',
        'printing',
        'cutting',
        'assembly',
        'quality-check',
        'packaging',
      ];

      const nextIncompleteStep = stepOrder.find(s => !workflow.steps[s].completed);
      if (nextIncompleteStep) {
        workflow.currentStep = nextIncompleteStep;
      }

      // Se todas as etapas estiverem completas, atualizar status do pedido
      const allCompleted = stepOrder.every(s => workflow.steps[s].completed);
      const now = new Date().toISOString();
      const nextVersion = this.nextOrderVersion(data);
      const updates: any = {
        productionWorkflow: workflow,
        version: nextVersion,
        updatedAt: now,
      };

      if (allCompleted) {
        updates.status = 'completed';
      } else if (completed && data.status === 'pending') {
        // Se começou alguma etapa e ainda está pendente, mover para em produção
        updates.status = 'in-progress';
      }

      // 2. Escritas
      transaction.update(orderRef, updates);

      if (updates.status) {
        if (saleSnap.exists()) {
          transaction.update(saleRef, {
            status: updates.status,
            updatedAt: now,
          });
        } else {
          // Reconstrução contábil caso o registro de faturamento não exista (pedido legado)
          const fullOrder = { ...this.mapOrderDoc(orderSnap), ...updates };
          const saleRecord = firebaseLedgerService.mapOrderToSaleRecord(fullOrder as Order, userId);
          transaction.set(saleRef, {
            ...saleRecord,
            isDeletedFromOrders: data.deletedAt != null,
          });
        }
      }
    });
  }

  /**
   * Obter pedidos com workflow em andamento
   */
  async getOrdersInProduction(): Promise<Order[]> {
    const userId = this.getCurrentUserId();
    const ordersRef = collection(db, ORDERS_COLLECTION);

    const q = query(
      ordersRef,
      where('userId', '==', userId),
      where('deletedAt', '==', null),
      where('status', 'in', ['pending', 'in-progress']),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => this.mapOrderDoc(doc));
  }

  /**
   * Arquivar pedido (isArchived = true)
   */
  async archiveOrder(orderId: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const initialSnap = await getDoc(orderRef);
    if (!initialSnap.exists() || !(await this.canAccessAssignedOrder(initialSnap.data(), userId))) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }
    const now = new Date().toISOString();
    await this.updateOrderWithVersion(orderRef, () => ({
      isArchived: true,
      archivedAt: now,
      archivedBy: userId,
      updatedAt: now,
    }));
  }

  /**
   * Desarquivar pedido (isArchived = false)
   */
  async unarchiveOrder(orderId: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const initialSnap = await getDoc(orderRef);
    if (!initialSnap.exists() || !(await this.canAccessAssignedOrder(initialSnap.data(), userId))) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }
    const now = new Date().toISOString();
    await this.updateOrderWithVersion(orderRef, () => ({
      isArchived: false,
      archivedAt: null,
      archivedBy: null,
      updatedAt: now,
    }));
  }

  /**
   * Arquivar múltiplos pedidos em lote
   */
  async archiveOrdersBulk(orderIds: string[]): Promise<void> {
    const userId = this.getCurrentUserId();
    const now = new Date().toISOString();
    await this.updateOrdersWithVersion(orderIds, () => ({
        isArchived: true,
        archivedAt: now,
        archivedBy: userId,
        updatedAt: now,
    }));
  }

  /**
   * Desarquivar múltiplos pedidos em lote
   */
  async unarchiveOrdersBulk(orderIds: string[]): Promise<void> {
    const now = new Date().toISOString();
    await this.updateOrdersWithVersion(orderIds, () => ({
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        updatedAt: now,
    }));
  }

  /**
   * Arquivar automaticamente pedidos concluídos antigos baseado no prazo configurado (dias).
   * Identifica pedidos concluídos cuja data de conclusão/entrega ultrapassa autoArchiveDays.
   * Retorna o número de pedidos arquivados.
   */
  async autoArchiveEligibleOrders(orders: Order[], autoArchiveDays: number = 30): Promise<number> {
    if (!Array.isArray(orders) || orders.length === 0) return 0;

    const now = Date.now();
    const maxAgeMs = Math.max(0, autoArchiveDays) * 24 * 60 * 60 * 1000;

    const eligible = orders.filter((order) => {
      // Somente pedidos concluídos e que ainda não estão arquivados
      if (order.status !== 'completed' || order.isArchived) return false;

      // Se prazo for 0, arquiva imediatamente
      if (autoArchiveDays === 0) return true;

      // Data de referência: deliveryDate ou updatedAt ou createdAt
      const refDateStr = order.deliveryDate || order.updatedAt || order.createdAt;
      if (!refDateStr) return false;

      const orderTime = new Date(refDateStr).getTime();
      if (isNaN(orderTime)) return false;

      return (now - orderTime) >= maxAgeMs;
    });

    if (eligible.length === 0) return 0;

    const eligibleIds = eligible.map((o) => o.id);
    await this.archiveOrdersBulk(eligibleIds);
    return eligibleIds.length;
  }
}

// Exportar instância singleton
export const firebaseOrderService = new FirebaseOrderService();

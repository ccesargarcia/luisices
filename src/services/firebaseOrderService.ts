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
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Order, OrderStatus, ProductionStep, ProductionWorkflow } from '../app/types';
import { firebaseLedgerService } from './firebaseLedgerService';

const ORDERS_COLLECTION = 'orders';

export class FirebaseOrderService {
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
   * Garantir que um valor monetário nunca seja negativo
   */
  private ensurePositive(value: number | undefined | null): number {
    return Math.max(0, value ?? 0);
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
   * Criar pedido
   */
  private buildOrderData(orderData: Partial<Order>, userId: string, orderNumber: string) {
    // Garantir que valores monetários sejam positivos
    const price = this.ensurePositive(orderData.price);

    // Sanitize payment object: replace undefined with null so Firestore doesn't reject it
    const payment = orderData.payment
      ? {
          status: orderData.payment.status || 'pending',
          method: orderData.payment.method || null,
          totalAmount: this.ensurePositive(orderData.payment.totalAmount),
          paidAmount: this.ensurePositive(orderData.payment.paidAmount),
          remainingAmount: this.ensurePositive(orderData.payment.remainingAmount),
          paymentDate: orderData.payment.paymentDate || null,
          notes: orderData.payment.notes || null,
          history: orderData.payment.history?.map(h => ({
            amount: this.ensurePositive(h.amount),
            date: h.date,
            method: h.method,
            notes: h.notes || null
          })) || null
        }
      : null;

    return {
      userId,
      createdByName: auth.currentUser?.displayName || auth.currentUser?.email || userId,
      orderNumber,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      productName: orderData.productName,
      quantity: orderData.quantity,
      price,
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
    };

  }

  /** Grava contador, pedido, venda e vínculo de catálogo/orçamento em uma única transação atômica. */
  async createOrder(orderData: Partial<Order>, catalogOrderId?: string, quoteId?: string): Promise<Order> {
    const userId = this.getCurrentUserId();
    const orderRef = doc(collection(db, ORDERS_COLLECTION));
    const counterRef = doc(db, 'users', userId, 'metadata', 'counters');
    const catalogRef = catalogOrderId ? doc(db, 'catalogOrders', catalogOrderId) : null;
    const quoteRef = quoteId ? doc(db, 'quotes', quoteId) : null;

    const savedOrderId = await runTransaction(db, async (transaction) => {
      // 1. Idempotência e validação da lojinha
      if (catalogRef) {
        const catalogSnap = await transaction.get(catalogRef);
        if (!catalogSnap.exists()) throw new Error('Pedido da lojinha não encontrado.');
        const catalog = catalogSnap.data();
        // O vínculo é permanente, mesmo se o status de atendimento mudar posteriormente.
        if (catalog.convertedOrderId) return String(catalog.convertedOrderId);
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
        if (existingOrderId) return String(existingOrderId);
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

      return orderRef.id;
    });
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
      version: typeof data.version === 'number' ? data.version : 1,
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
          transaction.update(orderRef, payload);
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
  async updateOrderStatus(orderId: string, status: OrderStatus, expectedVersion?: number): Promise<void> {
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

      const currentVersion = typeof orderData.version === 'number' ? orderData.version : 1;
      if (expectedVersion !== undefined && typeof orderData.version === 'number' && orderData.version !== expectedVersion) {
        throw new Error(`Conflito de concorrência: o pedido foi alterado por outro usuário (versão ${orderData.version} != esperada ${expectedVersion}).`);
      }

      const now = new Date().toISOString();

      // 2. TODAS as escritas após as leituras
      transaction.update(orderRef, {
        status,
        version: currentVersion + 1,
        updatedAt: now,
      });

      if (saleSnap.exists()) {
        transaction.update(saleRef, {
          status,
          updatedAt: now,
        });
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
    expectedVersion?: number
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
      // 1. TODAS as leituras antes de qualquer escrita (exigência estrita do Firestore)
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error('Pedido não encontrado');
      }
      const saleSnap = await transaction.get(saleRef);
      const orderData = orderSnap.data();

      const currentVersion = typeof orderData.version === 'number' ? orderData.version : 1;
      if (expectedVersion !== undefined && typeof orderData.version === 'number' && orderData.version !== expectedVersion) {
        throw new Error(`Conflito de concorrência: o pedido foi alterado por outro usuário (versão ${orderData.version} != esperada ${expectedVersion}).`);
      }

      // Remover campos undefined e garantir preservação de histórico e integridade do saldo restante
      const cleanUpdates: any = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'price' && typeof value === 'number') {
            cleanUpdates[key] = this.ensurePositive(value);
          } else if (key === 'payment' && value) {
            const payment = value as any;
            const existingPayment = orderData.payment || {};
            const totalAmount = this.ensurePositive(
              payment.totalAmount !== undefined
                ? payment.totalAmount
                : (cleanUpdates.price !== undefined ? cleanUpdates.price : (orderData.price || 0))
            );
            const paidAmount = this.ensurePositive(
              payment.paidAmount !== undefined
                ? payment.paidAmount
                : (existingPayment.paidAmount || 0)
            );
            const remainingAmount = this.ensurePositive(
              payment.remainingAmount !== undefined
                ? payment.remainingAmount
                : (existingPayment.remainingAmount !== undefined && payment.paidAmount === undefined && payment.totalAmount === undefined && cleanUpdates.price === undefined)
                  ? existingPayment.remainingAmount
                  : Math.max(0, totalAmount - paidAmount)
            );
            cleanUpdates[key] = {
              status: payment.status || existingPayment.status || 'pending',
              method: payment.method !== undefined ? payment.method : (existingPayment.method || null),
              totalAmount,
              paidAmount,
              remainingAmount,
              paymentDate: payment.paymentDate !== undefined ? payment.paymentDate : (existingPayment.paymentDate || null),
              notes: payment.notes !== undefined ? payment.notes : (existingPayment.notes || null),
              history: payment.history !== undefined ? payment.history : (existingPayment.history || null),
            };
          } else if (key === 'exchangeItems') {
            cleanUpdates[key] = this.sanitizeExchangeItems(value as any);
          } else {
            cleanUpdates[key] = value;
          }
        }
      });

      if (Object.keys(cleanUpdates).length === 0) return;

      const now = new Date().toISOString();

      // 2. TODAS as escritas após as leituras
      transaction.update(orderRef, {
        ...cleanUpdates,
        version: currentVersion + 1,
        updatedAt: now,
      });

      if (saleSnap.exists()) {
        const salePayload: any = { updatedAt: now };
        if (cleanUpdates.price !== undefined) salePayload.amount = cleanUpdates.price;
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
  async duplicateOrder(orderId: string): Promise<Order> {
    const userId = this.getCurrentUserId();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists() || !(await this.canAccessAssignedOrder(orderSnap.data(), userId))) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

    const data = orderSnap.data();
    const orderNumber = await this.generateOrderNumber(userId);

    const ordersRef = collection(db, ORDERS_COLLECTION);
    const price = this.ensurePositive(data.price);
    const newOrderRef = await addDoc(ordersRef, {
      userId,
      createdByName: auth.currentUser?.displayName || auth.currentUser?.email || userId,
      orderNumber,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerId: data.customerId || null,
      productName: data.productName,
      quantity: data.quantity,
      price,
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
      },
      createdAt: Timestamp.now(),
      deletedAt: null,
    });

    const createdOrder = await this.getOrderById(newOrderRef.id);
    firebaseLedgerService.recordOrderSale(createdOrder, userId).catch(err => {
      console.warn('firebaseLedgerService: erro ao gravar venda duplicada no ledger:', err);
    });

    return createdOrder;
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

    const current: import('../app/types').OrderAttachment[] = orderSnap.data().attachments || [];
    await updateDoc(orderRef, { attachments: [...current, attachment] });
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

    const current: import('../app/types').OrderAttachment[] = orderSnap.data().attachments || [];
    await updateDoc(orderRef, { attachments: current.filter(a => a.url !== url) });
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
    const canDelete = data.userId === userId
      || profile?.role === 'admin'
      || (
        profile?.role === 'funcionario'
        && profile.active === true
        && data.assignedTo === userId
        && profile.permissions?.orders?.delete === true
      );

    if (!canDelete) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

    await updateDoc(orderRef, {
      deletedAt: Timestamp.now(),
    });

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

    await updateDoc(orderRef, {
      productionWorkflow: workflow,
    });
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
      const currentVersion = Number(data.version) || 1;
      const updates: any = {
        productionWorkflow: workflow,
        version: currentVersion + 1,
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
          const fullOrder = { ...this.mapOrderDoc(orderSnap), status: updates.status };
          const saleRecord = firebaseLedgerService.mapOrderToSaleRecord(fullOrder as Order, userId);
          transaction.set(saleRef, { ...saleRecord, isDeletedFromOrders: data.deletedAt != null });
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
}

// Exportar instância singleton
export const firebaseOrderService = new FirebaseOrderService();

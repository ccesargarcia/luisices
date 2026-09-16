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
  writeBatch,
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
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const userId = this.getCurrentUserId();
    const orderNumber = await this.generateOrderNumber(userId);

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

    const ordersRef = collection(db, ORDERS_COLLECTION);
    const newOrderRef = await addDoc(ordersRef, {
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
    });

    const createdOrder = await this.getOrderById(newOrderRef.id);
    firebaseLedgerService.recordOrderSale(createdOrder, userId).catch(err => {
      console.warn('firebaseLedgerService: erro ao gravar venda no ledger:', err);
    });

    return createdOrder;
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

    await updateDoc(orderRef, updateData);
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

    // Firestore batch comporta até 500 operações por lote
    const BATCH_SIZE = 500;
    for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
      const chunk = orderIds.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.update(doc(db, ORDERS_COLLECTION, id), payload);
      }
      await batch.commit();
    }
  }

  /**
   * Atualizar status do pedido
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const userId = this.getCurrentUserId();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);

    // Verificar propriedade
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists() || !(await this.canAccessAssignedOrder(orderSnap.data(), userId))) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

    const currentVersion = typeof orderSnap.data().version === 'number' ? orderSnap.data().version : 1;
    await updateDoc(orderRef, {
      status,
      version: currentVersion + 1,
      updatedAt: new Date().toISOString(),
    });

    firebaseLedgerService.syncOrderStatus(orderId, status).catch(err => {
      console.warn('firebaseLedgerService: erro ao sincronizar status:', err);
    });
  }

  /**
   * Atualizar dados do pedido
   */
  async updateOrder(orderId: string, updates: Partial<Omit<Order, 'id' | 'userId' | 'createdAt' | 'orderNumber'>>): Promise<void> {
    const userId = this.getCurrentUserId();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);

    // Verificar propriedade
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists() || !(await this.canAccessAssignedOrder(orderSnap.data(), userId))) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

    // Remover campos undefined e garantir valores positivos
    const cleanUpdates: any = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'price') {
          cleanUpdates[key] = this.ensurePositive(value as number);
        } else if (key === 'payment' && value) {
          const payment = value as any;
          cleanUpdates[key] = {
            status: payment.status || 'pending',
            method: payment.method || null,
            totalAmount: this.ensurePositive(payment.totalAmount),
            paidAmount: this.ensurePositive(payment.paidAmount),
            remainingAmount: this.ensurePositive(payment.remainingAmount),
            paymentDate: payment.paymentDate || null,
            notes: payment.notes || null,
            history: payment.history?.map((h: any) => ({
              amount: this.ensurePositive(h.amount),
              date: h.date,
              method: h.method,
              notes: h.notes || null
            })) || null
          };
        } else if (key === 'exchangeItems') {
          cleanUpdates[key] = this.sanitizeExchangeItems(value as any);
        } else {
          cleanUpdates[key] = value;
        }
      }
    });

    if (Object.keys(cleanUpdates).length > 0) {
      const currentVersion = typeof orderSnap.data().version === 'number' ? orderSnap.data().version : 1;
      await updateDoc(orderRef, {
        ...cleanUpdates,
        version: currentVersion + 1,
        updatedAt: new Date().toISOString(),
      });

      firebaseLedgerService.syncOrderUpdates(orderId, cleanUpdates).catch(err => {
        console.warn('firebaseLedgerService: erro ao sincronizar updates:', err);
      });
    }
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

    // Verificar propriedade
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists() || !(await this.canAccessAssignedOrder(orderSnap.data(), userId))) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

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

    // Atualizar a etapa
    workflow.steps[step] = {
      completed,
      completedAt: completed ? new Date().toISOString() : undefined,
      completedBy: completed ? (auth.currentUser?.displayName || auth.currentUser?.email || undefined) : undefined,
      notes,
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
    const updates: any = { productionWorkflow: workflow };

    if (allCompleted) {
      updates.status = 'completed';
    } else if (completed && data.status === 'pending') {
      // Se começou alguma etapa e ainda está pendente, mover para em produção
      updates.status = 'in-progress';
    }

    await updateDoc(orderRef, updates);

    if (updates.status) {
      firebaseLedgerService.syncOrderStatus(orderId, updates.status).catch(err => {
        console.warn('firebaseLedgerService: erro ao sincronizar status do workflow no ledger:', err);
      });
    }
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

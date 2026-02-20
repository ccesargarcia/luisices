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
   * Criar pedido
   */
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const userId = this.getCurrentUserId();
    const orderNumber = await this.generateOrderNumber(userId);

    const ordersRef = collection(db, ORDERS_COLLECTION);
    const newOrderRef = await addDoc(ordersRef, {
      userId,
      orderNumber,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      productName: orderData.productName,
      quantity: orderData.quantity,
      price: orderData.price,
      cost: orderData.cost || null,
      status: orderData.status || 'pending',
      deliveryDate: orderData.deliveryDate,
      notes: orderData.notes || null,
      tags: orderData.tags || null,
      customerId: orderData.customerId || null,
      payment: orderData.payment || null,
      isExchange: orderData.isExchange || false,
      exchangeNotes: orderData.exchangeNotes || null,
      exchangeItems: orderData.exchangeItems || null,
      cardColor: orderData.cardColor || null,
      createdAt: Timestamp.now(),
      deletedAt: null,
    });

    return this.getOrderById(newOrderRef.id);
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
    if (data.userId !== userId) {
      throw new Error('Você não tem permissão para acessar este pedido');
    }

    return {
      id: orderSnap.id,
      orderNumber: data.orderNumber,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerId: data.customerId,
      productName: data.productName,
      quantity: data.quantity,
      price: data.price,
      cost: data.cost,
      realCost: data.realCost,
      status: data.status,
      deliveryDate: data.deliveryDate,
      notes: data.notes,
      createdAt: data.createdAt?.toDate().toISOString(),
      tags: data.tags,
      payment: data.payment,
      productionWorkflow: data.productionWorkflow,
      attachments: data.attachments,
      isExchange: data.isExchange ?? false,
      exchangeNotes: data.exchangeNotes,
      exchangeItems: data.exchangeItems,
      cardColor: data.cardColor,
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
   * Listar pedidos do usuário autenticado
   */
  async getOrders(): Promise<Order[]> {
    const userId = this.getCurrentUserId();
    const ordersRef = collection(db, ORDERS_COLLECTION);

    const q = query(
      ordersRef,
      where('userId', '==', userId),
      where('deletedAt', '==', null),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
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
        cost: data.cost,
        realCost: data.realCost,
        status: data.status,
        deliveryDate: data.deliveryDate,
        notes: data.notes,
        createdAt: data.createdAt?.toDate().toISOString(),
        tags: data.tags,
        payment: data.payment,
        productionWorkflow: data.productionWorkflow,
        attachments: data.attachments,
        isExchange: data.isExchange ?? false,
        exchangeNotes: data.exchangeNotes,
        exchangeItems: data.exchangeItems,
        cardColor: data.cardColor,
      } as Order;
    });
  }

  /**
   * Atualizar status do pedido
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const userId = this.getCurrentUserId();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);

    // Verificar propriedade
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists() || orderSnap.data().userId !== userId) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

    await updateDoc(orderRef, {
      status,
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
    if (!orderSnap.exists() || orderSnap.data().userId !== userId) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

    // Remover campos undefined
    const cleanUpdates: any = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    });

    if (Object.keys(cleanUpdates).length > 0) {
      await updateDoc(orderRef, {
        ...cleanUpdates,
        updatedAt: new Date().toISOString(),
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

    if (!orderSnap.exists() || orderSnap.data().userId !== userId) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

    const data = orderSnap.data();
    const orderNumber = await this.generateOrderNumber(userId);

    const ordersRef = collection(db, ORDERS_COLLECTION);
    const newOrderRef = await addDoc(ordersRef, {
      userId,
      orderNumber,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerId: data.customerId || null,
      productName: data.productName,
      quantity: data.quantity,
      price: data.price,
      cost: data.cost || null,
      status: 'pending',
      deliveryDate: data.deliveryDate,
      notes: data.notes || null,
      tags: data.tags || null,
      payment: {
        status: 'pending',
        totalAmount: data.price,
        paidAmount: 0,
        remainingAmount: data.price,
      },
      createdAt: Timestamp.now(),
      deletedAt: null,
    });

    return this.getOrderById(newOrderRef.id);
  }

  /**
   * Adicionar anexo a um pedido
   */
  async addAttachment(orderId: string, attachment: import('../app/types').OrderAttachment): Promise<void> {
    const userId = this.getCurrentUserId();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists() || orderSnap.data().userId !== userId) {
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

    if (!orderSnap.exists() || orderSnap.data().userId !== userId) {
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

    // Verificar propriedade
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists() || orderSnap.data().userId !== userId) {
      throw new Error('Pedido não encontrado ou sem permissão');
    }

    await updateDoc(orderRef, {
      deletedAt: Timestamp.now(),
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
    if (!orderSnap.exists() || orderSnap.data().userId !== userId) {
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
    if (!orderSnap.exists() || orderSnap.data().userId !== userId) {
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
      completedBy: completed ? auth.currentUser?.displayName || auth.currentUser?.email : undefined,
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

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        productName: data.productName,
        quantity: data.quantity,
        price: data.price,
        cost: data.cost,
        status: data.status,
        deliveryDate: data.deliveryDate,
        notes: data.notes,
        createdAt: data.createdAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
        tags: data.tags,
        payment: data.payment,
        userId: data.userId,
        customerId: data.customerId,
        productionWorkflow: data.productionWorkflow,
      } as Order;
    });
  }
}

// Exportar instância singleton
export const firebaseOrderService = new FirebaseOrderService();

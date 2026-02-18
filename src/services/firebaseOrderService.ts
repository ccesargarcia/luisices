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
import { Order, OrderStatus } from '../app/types';

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
   * Gerar número do pedido sequencial (PED-2026-001)
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

      return `PED-${year}-${String(nextCount).padStart(3, '0')}`;
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
      status: orderData.status || 'pending',
      deliveryDate: orderData.deliveryDate,
      notes: orderData.notes || null,
      tags: orderData.tags || null,
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
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      productName: data.productName,
      quantity: data.quantity,
      price: data.price,
      status: data.status,
      deliveryDate: data.deliveryDate,
      notes: data.notes,
      createdAt: data.createdAt?.toDate().toISOString(),
      tags: data.tags,
    } as Order;
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
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        productName: data.productName,
        quantity: data.quantity,
        price: data.price,
        status: data.status,
        deliveryDate: data.deliveryDate,
        notes: data.notes,
        createdAt: data.createdAt?.toDate().toISOString(),
        tags: data.tags,
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
}

// Exportar instância singleton
export const firebaseOrderService = new FirebaseOrderService();

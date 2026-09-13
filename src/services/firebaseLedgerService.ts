import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Order, OrderStatus, SaleRecord } from '../app/types';

const SALES_LEDGER_COLLECTION = 'salesLedger';

export const firebaseLedgerService = {
  getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');
    return user.uid;
  },

  /**
   * Converte um pedido em um SaleRecord sanitizado para o Firestore
   */
  mapOrderToSaleRecord(order: Partial<Order> & { id: string }, fallbackUserId?: string): SaleRecord {
    const userId = order.userId || fallbackUserId || this.getCurrentUserId();
    const createdAt = order.createdAt
      ? (typeof order.createdAt === 'string' ? order.createdAt : new Date().toISOString())
      : new Date().toISOString();

    const price = typeof order.price === 'number' && !isNaN(order.price) ? Math.max(0, order.price) : 0;
    const paidAmount = order.payment?.paidAmount && !isNaN(order.payment.paidAmount)
      ? Math.max(0, order.payment.paidAmount)
      : 0;

    return {
      id: order.id,
      orderId: order.id,
      orderNumber: order.orderNumber || '',
      userId,
      assignedTo: order.assignedTo || null as any,
      assignedToName: order.assignedToName || null as any,
      customerId: order.customerId || null,
      customerName: order.customerName || 'Cliente não informado',
      customerPhone: order.customerPhone || null,
      productName: order.productName || 'Produto',
      quantity: order.quantity && order.quantity > 0 ? order.quantity : 1,
      amount: price,
      paymentStatus: order.payment?.status || 'pending',
      paidAmount,
      paymentMethod: order.payment?.method || null,
      date: createdAt,
      deliveryDate: order.deliveryDate || null as any,
      status: order.status || 'pending',
      isDeletedFromOrders: false,
      notes: order.notes || null,
      tags: order.tags || null,
      createdAt,
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Grava ou atualiza uma venda no histórico contábil (Sales Ledger)
   */
  async recordOrderSale(order: Partial<Order> & { id: string }, fallbackUserId?: string): Promise<void> {
    const saleRecord = this.mapOrderToSaleRecord(order, fallbackUserId);
    const saleRef = doc(db, SALES_LEDGER_COLLECTION, saleRecord.id);

    // Remove undefined values
    const cleanData: any = {};
    Object.entries(saleRecord).forEach(([k, v]) => {
      if (v !== undefined) {
        cleanData[k] = v;
      }
    });

    await setDoc(saleRef, cleanData, { merge: true });
  },

  /**
   * Sincroniza a alteração de status do pedido no histórico
   * Se for 'cancelled', a venda é mantida com status 'cancelled' para ser descartada dos cálculos monetários
   */
  async syncOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const saleRef = doc(db, SALES_LEDGER_COLLECTION, orderId);
    const snap = await getDoc(saleRef);
    if (!snap.exists()) return;

    await updateDoc(saleRef, {
      status,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Sincroniza alterações gerais do pedido (preço, cliente, pagamento) no histórico
   */
  async syncOrderUpdates(orderId: string, updates: Partial<Order>): Promise<void> {
    const saleRef = doc(db, SALES_LEDGER_COLLECTION, orderId);
    const snap = await getDoc(saleRef);
    if (!snap.exists()) return;

    const payload: any = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.price !== undefined) {
      payload.amount = Math.max(0, updates.price);
    }
    if (updates.status !== undefined) {
      payload.status = updates.status;
    }
    if (updates.customerName !== undefined) {
      payload.customerName = updates.customerName;
    }
    if (updates.customerPhone !== undefined) {
      payload.customerPhone = updates.customerPhone || null;
    }
    if (updates.customerId !== undefined) {
      payload.customerId = updates.customerId || null;
    }
    if (updates.productName !== undefined) {
      payload.productName = updates.productName;
    }
    if (updates.quantity !== undefined) {
      payload.quantity = updates.quantity;
    }
    if (updates.deliveryDate !== undefined) {
      payload.deliveryDate = updates.deliveryDate || null;
    }
    if (updates.assignedTo !== undefined) {
      payload.assignedTo = updates.assignedTo || null;
    }
    if (updates.assignedToName !== undefined) {
      payload.assignedToName = updates.assignedToName || null;
    }
    if (updates.payment) {
      if (updates.payment.status) payload.paymentStatus = updates.payment.status;
      if (updates.payment.paidAmount !== undefined) payload.paidAmount = Math.max(0, updates.payment.paidAmount);
      if (updates.payment.method !== undefined) payload.paymentMethod = updates.payment.method || null;
    }

    await updateDoc(saleRef, payload);
  },

  /**
   * Marca o pedido como removido da visão operacional sem apagar o histórico de faturamento
   */
  async markOrderDeletedFromOrders(orderId: string): Promise<void> {
    const saleRef = doc(db, SALES_LEDGER_COLLECTION, orderId);
    const snap = await getDoc(saleRef);
    if (!snap.exists()) return;

    await updateDoc(saleRef, {
      isDeletedFromOrders: true,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Descarte definitivo de uma venda (por exemplo, erro de digitação ou teste)
   */
  async discardSale(orderId: string): Promise<void> {
    const saleRef = doc(db, SALES_LEDGER_COLLECTION, orderId);
    await deleteDoc(saleRef);
  },

  /**
   * Sincroniza todos os pedidos existentes no Firestore para o salesLedger de forma retroativa
   */
  async syncExistingOrdersToLedger(userId: string, isAdmin: boolean): Promise<{ synced: number }> {
    const ordersRef = collection(db, 'orders');
    const q = isAdmin
      ? query(ordersRef)
      : query(ordersRef, where('userId', '==', userId));

    const snapshot = await getDocs(q);
    let synced = 0;

    const BATCH_SIZE = 400;
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const chunk = docs.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const orderDoc of chunk) {
        const raw = orderDoc.data();
        const createdAt = raw.createdAt?.toDate
          ? raw.createdAt.toDate().toISOString()
          : (typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString());

        const price = typeof raw.price === 'number' && !isNaN(raw.price) ? Math.max(0, raw.price) : 0;
        const paidAmount = raw.payment?.paidAmount && !isNaN(raw.payment.paidAmount)
          ? Math.max(0, raw.payment.paidAmount)
          : 0;

        const saleRecord: SaleRecord = {
          id: orderDoc.id,
          orderId: orderDoc.id,
          orderNumber: raw.orderNumber || '',
          userId: raw.userId || userId,
          assignedTo: raw.assignedTo || null,
          assignedToName: raw.assignedToName || null,
          customerId: raw.customerId || null,
          customerName: raw.customerName || 'Cliente não informado',
          customerPhone: raw.customerPhone || null,
          productName: raw.productName || 'Produto',
          quantity: raw.quantity && raw.quantity > 0 ? raw.quantity : 1,
          amount: price,
          paymentStatus: raw.payment?.status || 'pending',
          paidAmount,
          paymentMethod: raw.payment?.method || null,
          date: createdAt,
          deliveryDate: raw.deliveryDate || null,
          status: raw.status || 'pending',
          isDeletedFromOrders: raw.deletedAt != null,
          notes: raw.notes || null,
          tags: raw.tags || null,
          createdAt,
          updatedAt: new Date().toISOString(),
        };

        const saleRef = doc(db, SALES_LEDGER_COLLECTION, orderDoc.id);
        const cleanData: any = {};
        Object.entries(saleRecord).forEach(([k, v]) => {
          if (v !== undefined) cleanData[k] = v;
        });

        batch.set(saleRef, cleanData, { merge: true });
        synced++;
      }

      await batch.commit();
    }

    return { synced };
  },
};

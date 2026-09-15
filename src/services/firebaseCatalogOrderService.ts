/**
 * Firebase Catalog Order Service
 *
 * Gerencia o histórico de pedidos recebidos através da Lojinha Pública (Catálogo Online).
 * Armazenados na coleção 'catalogOrders'.
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CatalogOrder, CatalogOrderStatus, Order } from '../app/types';
import { firebaseOrderService } from './firebaseOrderService';

const CATALOG_ORDERS_COLLECTION = 'catalogOrders';

class FirebaseCatalogOrderService {
  private mapDoc(id: string, data: Record<string, any>): CatalogOrder {
    return {
      id,
      orderCode: data.orderCode || `LJ-${id.slice(-4).toUpperCase()}`,
      customerNotes: data.customerNotes || undefined,
      items: Array.isArray(data.items) ? data.items : [],
      totalItems: Number(data.totalItems || data.items?.length || 0),
      subtotal: Number(data.subtotal || 0),
      status: (data.status as CatalogOrderStatus) || 'received',
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? (typeof data.updatedAt === 'string' ? data.updatedAt : undefined),
      convertedOrderId: data.convertedOrderId || undefined,
    };
  }

  /**
   * Registra um novo pedido originado na lojinha pública online
   */
  async createCatalogOrder(orderData: Omit<CatalogOrder, 'id' | 'createdAt'>): Promise<string> {
    const now = Timestamp.now();
    const sanitizedItems = (orderData.items || []).map((item) => {
      const clean: Record<string, any> = {
        productId: String(item.productId || ''),
        productName: String(item.productName || 'Produto'),
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        leadTimeDays: Number(item.leadTimeDays || 0),
      };
      if (item.customName && typeof item.customName === 'string' && item.customName.trim()) {
        clean.customName = item.customName.trim();
      }
      if (item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.trim()) {
        clean.imageUrl = item.imageUrl.trim();
      }
      return clean;
    });

    const docData: Record<string, any> = {
      orderCode: String(orderData.orderCode || `LJ-${Math.floor(1000 + Math.random() * 9000)}`),
      items: sanitizedItems,
      totalItems: Number(orderData.totalItems || sanitizedItems.reduce((acc, i) => acc + (i.quantity || 1), 0)),
      subtotal: Number(orderData.subtotal || 0),
      status: (orderData.status as CatalogOrderStatus) || 'received',
      createdAt: now,
      updatedAt: now,
    };

    if (orderData.customerNotes && typeof orderData.customerNotes === 'string' && orderData.customerNotes.trim()) {
      docData.customerNotes = orderData.customerNotes.trim();
    }

    const docRef = await addDoc(collection(db, CATALOG_ORDERS_COLLECTION), docData);
    return docRef.id;
  }

  /**
   * Busca a lista de pedidos da lojinha sob demanda
   */
  async getCatalogOrders(): Promise<CatalogOrder[]> {
    const snap = await getDocs(collection(db, CATALOG_ORDERS_COLLECTION));
    return snap.docs
      .map((d) => this.mapDoc(d.id, d.data()))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  /**
   * Escuta a lista de pedidos da lojinha em tempo real
   */
  subscribeToCatalogOrders(
    callback: (orders: CatalogOrder[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const q = query(collection(db, CATALOG_ORDERS_COLLECTION));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => this.mapDoc(d.id, d.data()))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        callback(list);
      },
      (err) => {
        console.warn('Erro ao escutar pedidos da lojinha:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Atualiza o status de atendimento do pedido da lojinha
   */
  async updateCatalogOrderStatus(orderId: string, status: CatalogOrderStatus): Promise<void> {
    const docRef = doc(db, CATALOG_ORDERS_COLLECTION, orderId);
    await updateDoc(docRef, {
      status,
      updatedAt: Timestamp.now(),
    });
  }

  /**
   * Exclui um pedido do histórico da lojinha
   */
  async deleteCatalogOrder(orderId: string): Promise<void> {
    const docRef = doc(db, CATALOG_ORDERS_COLLECTION, orderId);
    await deleteDoc(docRef);
  }

  /**
   * Converte um pedido da lojinha em um Pedido de Produção Oficial do Ateliê (/orders)
   */
  async convertToProductionOrder(
    catalogOrder: CatalogOrder,
    customerName: string,
    customerPhone: string,
    deliveryDate: string
  ): Promise<Order> {
    // Monta a descrição resumida dos produtos
    const productNames = catalogOrder.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ');
    const firstProductName = catalogOrder.items[0]?.productName || 'Pedido da Lojinha';
    const totalQuantity = catalogOrder.totalItems || catalogOrder.items.reduce((s, i) => s + i.quantity, 0);

    // Monta as observações detalhadas com personalizações
    let notes = `[Origem: Lojinha Online • Código ${catalogOrder.orderCode}]\n`;
    catalogOrder.items.forEach((item, idx) => {
      notes += `\n${idx + 1}. ${item.productName} (${item.quantity}x)`;
      if (item.customName) {
        notes += `\n   Personalização: ${item.customName}`;
      }
      notes += `\n   Prazo: ${item.leadTimeDays > 0 ? `${item.leadTimeDays} dias úteis` : 'Pronta entrega'}`;
    });
    if (catalogOrder.customerNotes) {
      notes += `\n\nObservações do cliente: ${catalogOrder.customerNotes}`;
    }

    // Cria o pedido de produção oficial no Firebase
    const newOrder = await firebaseOrderService.createOrder({
      customerName: customerName.trim() || 'Cliente da Lojinha',
      customerPhone: customerPhone.trim() || '',
      productName: catalogOrder.items.length === 1 ? firstProductName : `${firstProductName} (+${catalogOrder.items.length - 1} itens)`,
      quantity: totalQuantity,
      price: catalogOrder.subtotal,
      deliveryDate,
      status: 'pending',
      notes,
      payment: {
        totalAmount: catalogOrder.subtotal,
        paidAmount: 0,
        remainingAmount: catalogOrder.subtotal,
        status: 'pending',
        method: null,
        paymentDate: null,
        notes: `Pedido criado a partir da Lojinha (${catalogOrder.orderCode})`,
        history: null,
      },
    });

    // Atualiza o pedido da lojinha para 'converted'
    const docRef = doc(db, CATALOG_ORDERS_COLLECTION, catalogOrder.id);
    await updateDoc(docRef, {
      status: 'converted',
      convertedOrderId: newOrder.id,
      updatedAt: Timestamp.now(),
    });

    return newOrder;
  }
}

export const firebaseCatalogOrderService = new FirebaseCatalogOrderService();

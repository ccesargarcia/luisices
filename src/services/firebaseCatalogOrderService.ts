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
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { CatalogOrder, CatalogOrderStatus, Order } from '../app/types';
import { firebaseOrderService } from './firebaseOrderService';

const CATALOG_ORDERS_COLLECTION = 'catalogOrders';

export interface CatalogOrderReceipt {
  orderId: string;
  orderCode: string;
  subtotal: number;
  totalItems: number;
  verifiedByServer?: boolean;
  isIdempotentReplay?: boolean;
}

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
      isPriceTampered: Boolean(data.isPriceTampered),
      officialSubtotal: typeof data.officialSubtotal === 'number' ? data.officialSubtotal : undefined,
      submittedSubtotal: typeof data.submittedSubtotal === 'number' ? data.submittedSubtotal : undefined,
      priceWarning: data.priceWarning || undefined,
      verifiedByServer: Boolean(data.verifiedByServer),
      idempotencyKey: data.idempotencyKey || undefined,
    };
  }

  /**
   * Registra um novo pedido originado na lojinha pública online.
   * Utiliza a Cloud Function submitPublicCatalogOrder para validação estrita
   * de regras, integridade de preços e disponibilidade do produto no servidor.
   */
  async createCatalogOrder(
    orderData: Omit<CatalogOrder, 'id' | 'createdAt'> & { idempotencyKey?: string }
  ): Promise<CatalogOrderReceipt> {
    const submitOrderFn = httpsCallable<any, CatalogOrderReceipt>(functions, 'submitPublicCatalogOrder');
    const response = await submitOrderFn({
      items: (orderData.items || []).map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        customName: item.customName,
      })),
      customerNotes: orderData.customerNotes,
      submittedSubtotal: orderData.subtotal,
      idempotencyKey: orderData.idempotencyKey,
    });

    if (response.data && response.data.orderId) {
      return response.data;
    }
    throw new Error('Falha ao obter confirmação do servidor para o pedido.');
  }

  /**
   * Busca a lista de pedidos da lojinha sob demanda
   */
  async getCatalogOrders(maxLimit = 100): Promise<CatalogOrder[]> {
    const q = query(
      collection(db, CATALOG_ORDERS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(maxLimit)
    );
    const snap = await getDocs(q);
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
    const q = query(
      collection(db, CATALOG_ORDERS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
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
   * Revalida pedidos não verificados pelo servidor para impedir conversão de preços adulterados.
   */
  async convertToProductionOrder(
    catalogOrder: CatalogOrder,
    customerName: string,
    customerPhone: string,
    deliveryDate: string
  ): Promise<Order> {
    // Usa os dados persistidos; a transação de criação verifica novamente o vínculo.
    const snap = await getDoc(doc(db, CATALOG_ORDERS_COLLECTION, catalogOrder.id));
    if (!snap.exists()) throw new Error('Pedido da lojinha não encontrado.');
    catalogOrder = this.mapDoc(snap.id, snap.data());

    // Se o pedido não foi verificado pelo servidor (ex: legado),
    // revalida os preços contra storeProducts para garantir que nenhum subtotal adulterado seja aceito na conversão
    let trustedSubtotal = catalogOrder.subtotal;
    if (!catalogOrder.verifiedByServer) {
      let officialRecalculated = 0;

      for (const item of catalogOrder.items) {
        if (!item.productId) {
          throw new Error('Não é possível converter pedido: item sem identificador de produto.');
        }
        const pSnap = await getDoc(doc(db, 'storeProducts', item.productId));
        if (!pSnap.exists()) {
          throw new Error(`Não é possível converter pedido: o produto "${item.productName || item.productId}" não existe no catálogo oficial.`);
        }
        const pData = pSnap.data();
        const officialItemPrice = Number(pData.price ?? pData.unitPrice);
        if (!Number.isFinite(officialItemPrice) || officialItemPrice <= 0) {
          throw new Error(`Não é possível converter pedido: o produto "${pData.name || item.productId}" possui preço oficial inválido.`);
        }
        officialRecalculated += officialItemPrice * (item.quantity || 1);
      }

      if (Math.abs(catalogOrder.subtotal - officialRecalculated) > 0.05) {
        console.warn(
          `[convertToProductionOrder] Pedido legado com preço divergente detectado. Subtotal enviado: ${catalogOrder.subtotal}, oficial recalculado: ${officialRecalculated}. Utilizando valor oficial.`
        );
      }
      trustedSubtotal = officialRecalculated;
    }

    // Monta a descrição resumida dos produtos
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

    // Cria o pedido de produção oficial no Firebase com o valor validado
    const newOrder = await firebaseOrderService.createOrder({
      customerName: customerName.trim() || 'Cliente da Lojinha',
      customerPhone: customerPhone.trim() || '',
      productName: catalogOrder.items.length === 1 ? firstProductName : `${firstProductName} (+${catalogOrder.items.length - 1} itens)`,
      quantity: totalQuantity,
      price: trustedSubtotal,
      deliveryDate,
      status: 'pending',
      notes,
      payment: {
        totalAmount: trustedSubtotal,
        paidAmount: 0,
        remainingAmount: trustedSubtotal,
        status: 'pending',
        method: null,
        paymentDate: null,
        notes: `Pedido criado a partir da Lojinha (${catalogOrder.orderCode})`,
        history: null,
      },
    }, catalogOrder.id);

    return newOrder;
  }
}

export const firebaseCatalogOrderService = new FirebaseCatalogOrderService();

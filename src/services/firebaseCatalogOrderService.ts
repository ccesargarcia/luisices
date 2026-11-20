/**
 * Firebase Catalog Order Service
 *
 * Gerencia o histórico de pedidos recebidos através da Lojinha Pública (Catálogo Online).
 * Armazenados na coleção 'catalogOrders'.
 */

import {
  collection,
  doc,
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
import { executeWithGcpFallback, VercelInfraError } from './backendRoutingService';
import { getVercelBetaApiUrl } from '../app/utils/betaHost';
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

export interface PublicCatalogProduct {
  id: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  imageUrl?: string;
  leadTimeDays?: number;
  badge?: string;
  isCustomizable?: boolean;
  status?: 'active' | 'paused';
  order?: number;
  createdAt?: string;
}

class FirebaseCatalogOrderService {
  async getPublicCatalogProducts(): Promise<PublicCatalogProduct[]> {
    return executeWithGcpFallback(
      'publicCatalogProducts',
      async () => {
        const response = await fetch(getVercelBetaApiUrl('/api/public-catalog-products'), {
          method: 'GET',
          cache: 'no-store',
        });
        if (!response.ok) {
          if (response.status >= 500) {
            throw new VercelInfraError(`Falha ao carregar catálogo (${response.status}).`, response.status);
          }
          const err = new Error(`Falha ao carregar catálogo (${response.status}).`);
          Object.assign(err, { status: response.status });
          throw err;
        }
        const data = await response.json();
        return Array.isArray(data?.products) ? data.products : [];
      },
      async () => {
        const getProducts = httpsCallable<void, { products: PublicCatalogProduct[] }>(functions, 'getPublicCatalogProducts');
        const response = await getProducts();
        return Array.isArray(response.data?.products) ? response.data.products : [];
      },
    );
  }

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
    const requestPayload = {
      items: (orderData.items || []).map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        customName: item.customName,
      })),
      customerNotes: orderData.customerNotes,
      submittedSubtotal: orderData.subtotal,
      idempotencyKey: orderData.idempotencyKey,
    };

    return executeWithGcpFallback(
      'publicCatalogOrder',
      async () => {
        const response = await fetch(getVercelBetaApiUrl('/api/public-catalog-order'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify(requestPayload),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status >= 500 && !payload?.error?.code) {
            throw new VercelInfraError(`Erro ao enviar pedido (${response.status}).`, response.status);
          }
          const err = new Error(payload?.error?.message || `Erro ao enviar pedido (${response.status}).`);
          if (payload?.error?.code) Object.assign(err, { code: payload.error.code });
          if (payload?.error?.details !== undefined) Object.assign(err, { details: payload.error.details });
          Object.assign(err, { status: response.status });
          throw err;
        }
        if (payload && payload.orderId) {
          return payload as CatalogOrderReceipt;
        }
        throw new Error('Falha ao obter confirmação do servidor para o pedido.');
      },
      async () => {
        const submitOrderFn = httpsCallable<any, CatalogOrderReceipt>(functions, 'submitPublicCatalogOrder');
        const response = await submitOrderFn(requestPayload);

        if (response.data && response.data.orderId) {
          return response.data;
        }
        throw new Error('Falha ao obter confirmação do servidor para o pedido.');
      },
    );
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
    // revalida os preços contra storeProducts para garantir que nenhum subtotal ou preço unitário adulterado seja aceito na conversão
    let trustedSubtotal = Number((catalogOrder.subtotal || 0).toFixed(2));
    let verifiedItems = (catalogOrder.items || []).map((i) => {
      const qty = i.quantity || 1;
      const unit = Number((i.price || 0).toFixed(2));
      return {
        name: i.productName || 'Produto da Lojinha',
        quantity: qty,
        unitPrice: unit,
        price: Number((qty * unit).toFixed(2)),
      };
    });

    if (!catalogOrder.verifiedByServer) {
      const itemsToVerify = catalogOrder.items || [];
      for (const item of itemsToVerify) {
        if (!item.productId) {
          throw new Error('Não é possível converter pedido: item sem identificador de produto.');
        }
      }

      const uniqueProductIds = Array.from(new Set(itemsToVerify.map((item) => item.productId)));
      const productSnaps = await Promise.all(
        uniqueProductIds.map((productId) => getDoc(doc(db, 'storeProducts', productId)))
      );
      const productById = new Map(uniqueProductIds.map((id, idx) => [id, productSnaps[idx]]));

      let officialRecalculated = 0;
      verifiedItems = itemsToVerify.map((item) => {
        const pSnap = productById.get(item.productId);
        if (!pSnap || !pSnap.exists()) {
          throw new Error(`Não é possível converter pedido: o produto "${item.productName || item.productId}" não existe no catálogo oficial.`);
        }
        const pData = pSnap.data();
        const officialItemPrice = Number(pData.price ?? pData.unitPrice);
        if (!Number.isFinite(officialItemPrice) || officialItemPrice <= 0) {
          throw new Error(`Não é possível converter pedido: o produto "${pData.name || item.productId}" possui preço oficial inválido.`);
        }
        const qty = item.quantity || 1;
        const unit = Number(officialItemPrice.toFixed(2));
        const linePrice = Number((qty * unit).toFixed(2));
        officialRecalculated = Number((officialRecalculated + linePrice).toFixed(2));
        return {
          name: item.productName || pData.name || 'Produto da Lojinha',
          quantity: qty,
          unitPrice: unit,
          price: linePrice,
        };
      });

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

    // Cria o pedido de produção oficial no Firebase com o valor e preços unitários validados
    const newOrder = await firebaseOrderService.createOrder({
      customerName: customerName.trim() || 'Cliente da Lojinha',
      customerPhone: customerPhone.trim() || '',
      productName: catalogOrder.items.length === 1 ? firstProductName : `${firstProductName} (+${catalogOrder.items.length - 1} itens)`,
      quantity: totalQuantity,
      price: trustedSubtotal,
      items: verifiedItems,
      pricingMode: verifiedItems.length === 1 ? 'unit' : 'items',
      unitPrice: verifiedItems.length === 1 ? (verifiedItems[0]?.unitPrice ?? null) : null,
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

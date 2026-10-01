/**
 * Firebase Pricing Service
 *
 * Gerencia matérias-primas (supplies), fichas técnicas (pricingRecipes)
 * e configurações do ateliê (pricingSettings).
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  writeBatch,
  runTransaction,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  SupplyItem,
  ProductPricingRecipe,
  StudioPricingSettings,
  PurchaseHistoryItem,
  ProductionTrackingRecord,
} from '../app/types';
import { DEFAULT_PRICING_SETTINGS } from '../app/utils/pricingCalculations';

const SUPPLIES_COLLECTION = 'supplies';
const RECIPES_COLLECTION = 'pricingRecipes';
const SETTINGS_COLLECTION = 'pricingSettings';
const PRODUCTS_COLLECTION = 'products';
const PURCHASE_HISTORY_COLLECTION = 'purchaseHistory';
const PRODUCTION_TRACKING_COLLECTION = 'productionTracking';

/**
 * Remove recursivamente valores undefined de objetos e arrays antes de enviar ao Firestore.
 * O Firestore rejeita requisições que contenham propriedades com valor undefined.
 */
function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export const PRESET_SUPPLIES: Omit<SupplyItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Papel Offset 180g (A4)',
    category: 'papeis',
    purchasePrice: 25.0,
    packageQuantity: 100,
    unit: 'folha',
    unitCost: 0.25,
    supplier: 'Kalunga / Mercado Livre',
    notes: 'Ideal para caixas básicas, miolos e papelaria em geral',
  },
  {
    name: 'Papel Fotográfico Glossy 180g (A4)',
    category: 'papeis',
    purchasePrice: 45.0,
    packageQuantity: 100,
    unit: 'folha',
    unitCost: 0.45,
    supplier: 'Masterprint',
    notes: 'Brilhante para caixas milk, pirâmide e apliques coloridos',
  },
  {
    name: 'Papel Fotográfico Matte 180g (A4)',
    category: 'papeis',
    purchasePrice: 42.0,
    packageQuantity: 100,
    unit: 'folha',
    unitCost: 0.42,
    supplier: 'Masterprint',
    notes: 'Fosco antirreflexo, ótimo para fotos e lembrancinhas',
  },
  {
    name: 'Papel Color Plus 180g (Cores Lisas A4)',
    category: 'papeis',
    purchasePrice: 30.0,
    packageQuantity: 50,
    unit: 'folha',
    unitCost: 0.60,
    supplier: 'Fedrigoni',
    notes: 'Massa colorida (sem borda branca ao cortar)',
  },
  {
    name: 'Papel Lamicote Dourado / Prata 250g (A4)',
    category: 'papeis',
    purchasePrice: 25.0,
    packageQuantity: 10,
    unit: 'folha',
    unitCost: 2.50,
    supplier: 'Papelaria Especial',
    notes: 'Efeito metalizado/espelhado para topos e caixas luxo',
  },
  {
    name: 'Papel Kraft 200g (A4)',
    category: 'papeis',
    purchasePrice: 27.5,
    packageQuantity: 50,
    unit: 'folha',
    unitCost: 0.55,
    supplier: 'Distribuidora',
    notes: 'Estilo rústico, sacolas e tags kraft',
  },
  {
    name: 'Tinta de Impressão Jato de Tinta (por folha A4)',
    category: 'impressao_tintas',
    purchasePrice: 100.0,
    packageQuantity: 500,
    unit: 'folha',
    unitCost: 0.20,
    supplier: 'Refil Epson 544/664',
    notes: 'Estimativa de custo de tinta e desgaste por impressão colorida',
  },
  {
    name: 'Fita de Cetim nº 1 (7mm)',
    category: 'fitas_aviamentos',
    purchasePrice: 9.0,
    packageQuantity: 50,
    unit: 'metro',
    unitCost: 0.18,
    supplier: 'Progresso',
    notes: 'Laços finos, tags e amarrações',
  },
  {
    name: 'Fita Gorgurão nº 9 (38mm)',
    category: 'fitas_aviamentos',
    purchasePrice: 12.0,
    packageQuantity: 10,
    unit: 'metro',
    unitCost: 1.20,
    supplier: 'Progresso',
    notes: 'Laços volumosos de luxo para caixas',
  },
  {
    name: 'Refil de Cola Quente (Bastão Grosso)',
    category: 'adesivos_colas',
    purchasePrice: 38.0,
    packageQuantity: 35,
    unit: 'unidade',
    unitCost: 1.09,
    supplier: 'Rendimento aprox. 35 bastões/kg',
    notes: 'Fixação de laços e montagem rápida',
  },
  {
    name: 'Fita Banana Espumada Dupla Face (Rolo 5m)',
    category: 'adesivos_colas',
    purchasePrice: 12.0,
    packageQuantity: 5,
    unit: 'metro',
    unitCost: 2.40,
    supplier: '3M / Adere',
    notes: 'Efeito 3D em camadas de apliques',
  },
  {
    name: 'Laço Pronto com Strass / Chaton',
    category: 'fitas_aviamentos',
    purchasePrice: 30.0,
    packageQuantity: 20,
    unit: 'unidade',
    unitCost: 1.50,
    supplier: 'Armarinho',
    notes: 'Laço pronto com pedraria para caixas de luxo',
  },
  {
    name: 'Saquinho Transparente PP com Aba Adesiva',
    category: 'embalagens',
    purchasePrice: 15.0,
    packageQuantity: 100,
    unit: 'unidade',
    unitCost: 0.15,
    supplier: 'Embalagens',
    notes: 'Embalagem individual protetora',
  },
  {
    name: 'Caixa de Envio Papelão Correio P',
    category: 'embalagens',
    purchasePrice: 80.0,
    packageQuantity: 25,
    unit: 'unidade',
    unitCost: 3.20,
    supplier: 'Embalagens Brasil',
    notes: 'Caixa parda para envio e proteção no frete',
  },
];

class FirebasePricingService {
  private getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');
    return user.uid;
  }

  // ─── Configurações do Ateliê ───────────────────────────────────────────────

  async getStudioSettings(): Promise<StudioPricingSettings> {
    const userId = this.getCurrentUserId();
    const docRef = doc(db, SETTINGS_COLLECTION, userId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return {
        ...DEFAULT_PRICING_SETTINGS,
        ...(snap.data() as Partial<StudioPricingSettings>),
        userId,
      };
    }

    const initialSettings: StudioPricingSettings = {
      ...DEFAULT_PRICING_SETTINGS,
      userId,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, initialSettings);
    return initialSettings;
  }

  async saveStudioSettings(
    settings: Partial<Omit<StudioPricingSettings, 'userId'>>
  ): Promise<StudioPricingSettings> {
    const userId = this.getCurrentUserId();
    const docRef = doc(db, SETTINGS_COLLECTION, userId);
    const updated: StudioPricingSettings = sanitizeForFirestore({
      ...DEFAULT_PRICING_SETTINGS,
      ...settings,
      monthlyFixedExpenses: {
        ...DEFAULT_PRICING_SETTINGS.monthlyFixedExpenses,
        ...(settings.monthlyFixedExpenses || {}),
      },
      userId,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, updated, { merge: true });
    return updated;
  }

  // ─── Insumos (Supplies) ───────────────────────────────────────────────────

  private mapSupplyDoc(id: string, data: Record<string, any>): SupplyItem {
    const purchasePrice = Number(data.purchasePrice) || 0;
    const shippingCost = Number(data.shippingCost) || 0;
    const packageQuantity = Number(data.packageQuantity) || 1;
    const totalPrice = data.totalPrice != null ? Number(data.totalPrice) : purchasePrice + shippingCost;
    const unitCost = data.unitCost != null ? Number(data.unitCost) : (packageQuantity > 0 ? totalPrice / packageQuantity : 0);

    return {
      id,
      userId: data.userId,
      name: data.name,
      category: data.category || 'outros',
      brandModel: data.brandModel || undefined,
      supplier: data.supplier || undefined,
      purchaseUrl: data.purchaseUrl || data.supplierContact || undefined,
      lastPurchaseDate: data.lastPurchaseDate || undefined,
      purchasePrice,
      shippingCost,
      totalPrice,
      packageQuantity,
      unit: data.unit || 'unidade',
      unitCost,
      notes: data.notes || undefined,
      currentStock: data.currentStock != null ? Number(data.currentStock) : undefined,
      minStock: data.minStock != null ? Number(data.minStock) : undefined,
      needsReorder: Boolean(data.needsReorder),
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || undefined,
    };
  }

  subscribeToSupplies(callback: (supplies: SupplyItem[]) => void): Unsubscribe {
    const userId = this.getCurrentUserId();
    const q = query(
      collection(db, SUPPLIES_COLLECTION),
      where('userId', '==', userId)
    );

    return onSnapshot(
      q,
      (snap) => {
        const supplies = snap.docs
          .map((d) => this.mapSupplyDoc(d.id, d.data()))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        callback(supplies);
      },
      (err) => {
        console.warn('Erro na sincronização de insumos:', err);
        // Fallback para getDocs estático para garantir dados na tela
        this.getSupplies().then(callback).catch(() => {});
      }
    );
  }

  async getSupplies(): Promise<SupplyItem[]> {
    const userId = this.getCurrentUserId();
    const q = query(
      collection(db, SUPPLIES_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => this.mapSupplyDoc(d.id, d.data()))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  async createSupply(
    supply: Omit<SupplyItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<SupplyItem> {
    const userId = this.getCurrentUserId();
    const purchasePrice = Number(supply.purchasePrice) || 0;
    const shippingCost = Number(supply.shippingCost) || 0;
    const packageQuantity = Number(supply.packageQuantity) || 0;
    const totalPrice = purchasePrice + shippingCost;
    const calculatedUnitCost =
      packageQuantity > 0
        ? Math.round((totalPrice / packageQuantity) * 10000) / 10000
        : 0;

    const payload = sanitizeForFirestore({
      ...supply,
      purchasePrice,
      shippingCost,
      totalPrice,
      packageQuantity,
      supplier: supply.supplier || null,
      notes: supply.notes || null,
      unitCost: supply.unitCost !== undefined ? Number(supply.unitCost) : calculatedUnitCost,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const docRef = await addDoc(collection(db, SUPPLIES_COLLECTION), payload);
    return { id: docRef.id, ...payload };
  }

  async updateSupply(
    id: string,
    data: Partial<Omit<SupplyItem, 'id' | 'userId' | 'createdAt'>>
  ): Promise<void> {
    const updates: Record<string, any> = sanitizeForFirestore({
      ...data,
      supplier: data.supplier !== undefined ? (data.supplier || null) : undefined,
      notes: data.notes !== undefined ? (data.notes || null) : undefined,
      updatedAt: new Date().toISOString(),
    });

    const purchasePrice = data.purchasePrice !== undefined ? Number(data.purchasePrice) : undefined;
    const shippingCost = data.shippingCost !== undefined ? Number(data.shippingCost) : undefined;
    const packageQuantity = data.packageQuantity !== undefined ? Number(data.packageQuantity) : undefined;

    if (purchasePrice !== undefined || shippingCost !== undefined || packageQuantity !== undefined) {
      if (data.unitCost !== undefined) {
        updates.unitCost = Number(data.unitCost);
      } else if (purchasePrice !== undefined && packageQuantity !== undefined && packageQuantity > 0) {
        const total = purchasePrice + (shippingCost || 0);
        updates.unitCost = Math.round((total / packageQuantity) * 10000) / 10000;
        updates.totalPrice = total;
      }
    }

    await updateDoc(doc(db, SUPPLIES_COLLECTION, id), updates);
  }

  async deleteSupply(id: string): Promise<void> {
    await deleteDoc(doc(db, SUPPLIES_COLLECTION, id));
  }

  // ─── Histórico de Compras (Purchase History) ──────────────────────────────

  private mapPurchaseHistoryDoc(id: string, data: Record<string, any>): PurchaseHistoryItem {
    const price = Number(data.price) || 0;
    const shippingCost = Number(data.shippingCost) || 0;
    const totalPrice = data.totalPrice != null ? Number(data.totalPrice) : price + shippingCost;
    const quantity = Number(data.quantity) || 1;
    const unitCost = data.unitCost != null ? Number(data.unitCost) : (quantity > 0 ? totalPrice / quantity : 0);

    return {
      id,
      userId: data.userId,
      supplyId: data.supplyId,
      supplyName: data.supplyName,
      category: data.category || 'outros',
      date: data.date || new Date().toISOString().slice(0, 10),
      store: data.store || '—',
      quantity,
      unit: data.unit || 'unidade',
      price,
      shippingCost,
      totalPrice,
      unitCost,
      notes: data.notes || undefined,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
      idempotencyKey: data.idempotencyKey || id,
      status: (data.status as 'active' | 'cancelled') || 'active',
      cancelledAt: data.cancelledAt || null,
      cancellationReason: data.cancellationReason || null,
      revertedQuantity: data.revertedQuantity != null ? Number(data.revertedQuantity) : undefined,
      unreversedQuantity: data.unreversedQuantity != null ? Number(data.unreversedQuantity) : undefined,
    };
  }

  subscribeToPurchaseHistory(callback: (history: PurchaseHistoryItem[]) => void): Unsubscribe {
    const userId = this.getCurrentUserId();
    const q = query(
      collection(db, PURCHASE_HISTORY_COLLECTION),
      where('userId', '==', userId)
    );

    return onSnapshot(
      q,
      (snap) => {
        const history = snap.docs
          .map((d) => this.mapPurchaseHistoryDoc(d.id, d.data()))
          .sort((a, b) => b.date.localeCompare(a.date));
        callback(history);
      },
      (err) => {
        console.warn('Erro na sincronização do histórico de compras:', err);
        this.getPurchaseHistory().then(callback).catch(() => {});
      }
    );
  }

  async getPurchaseHistory(): Promise<PurchaseHistoryItem[]> {
    const userId = this.getCurrentUserId();
    const q = query(
      collection(db, PURCHASE_HISTORY_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => this.mapPurchaseHistoryDoc(d.id, d.data()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Grava uma nova compra no histórico E atualiza atomicamente o insumo correspondente
   * via transação Firestore com suporte a chave de idempotência para evitar duplicidade em concorrência/retries.
   */
  async addPurchaseRecord(
    record: Omit<PurchaseHistoryItem, 'id' | 'userId' | 'createdAt'> & { idempotencyKey?: string }
  ): Promise<PurchaseHistoryItem> {
    const userId = this.getCurrentUserId();
    const price = Number(record.price);
    const shippingCost = Number(record.shippingCost) || 0;
    const quantity = Number(record.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('A quantidade da compra deve ser um número positivo.');
    }
    if (!Number.isFinite(price) || price < 0) {
      throw new Error('O valor pago da compra não pode ser negativo.');
    }
    if (!Number.isFinite(shippingCost) || shippingCost < 0) {
      throw new Error('O frete não pode ser negativo.');
    }

    const totalPrice = price + shippingCost;
    const calculatedUnitCost = quantity > 0 ? Math.round((totalPrice / quantity) * 10000) / 10000 : 0;

    const scopedDocId = record.idempotencyKey
      ? (record.idempotencyKey.startsWith(`${userId}_`) ? record.idempotencyKey : `${userId}_${record.idempotencyKey}`)
      : undefined;

    const purchaseDocRef = scopedDocId
      ? doc(db, PURCHASE_HISTORY_COLLECTION, scopedDocId)
      : doc(collection(db, PURCHASE_HISTORY_COLLECTION));

    return await runTransaction(db, async (transaction) => {
      // 1. Idempotência: se já existe documento com essa chave (ex: retry), retorna o existente sem duplicar
      const existingSnap = await transaction.get(purchaseDocRef);
      if (existingSnap.exists()) {
        return this.mapPurchaseHistoryDoc(existingSnap.id, existingSnap.data());
      }

      // 2. Se houver um insumo vinculado, lê e atualiza estoque e custos atomicamente
      if (record.supplyId) {
        const supplyDocRef = doc(db, SUPPLIES_COLLECTION, record.supplyId);
        const supplySnap = await transaction.get(supplyDocRef);

        if (supplySnap.exists()) {
          const currentSupplyData = supplySnap.data();
          const oldStock = Number(currentSupplyData.currentStock) || 0;
          const newStock = oldStock + quantity;
          const minStock = Number(currentSupplyData.minStock) || 0;
          const isReorder = minStock > 0 ? newStock <= minStock : false;

          transaction.update(
            supplyDocRef,
            sanitizeForFirestore({
              lastPurchaseDate: record.date,
              supplier: record.store,
              purchasePrice: price,
              shippingCost: shippingCost,
              totalPrice: totalPrice,
              packageQuantity: quantity,
              unitCost: calculatedUnitCost,
              currentStock: newStock,
              needsReorder: isReorder,
              updatedAt: new Date().toISOString(),
            })
          );
        }
      }

      // 3. Grava o histórico de compras na mesma transação atômica
      const payload = sanitizeForFirestore({
        ...record,
        idempotencyKey: record.idempotencyKey || purchaseDocRef.id,
        price,
        shippingCost,
        totalPrice,
        unitCost: calculatedUnitCost,
        userId,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
      });

      transaction.set(purchaseDocRef, payload);

      return {
        id: purchaseDocRef.id,
        ...payload,
      };
    });
  }

  /**
   * Cancela uma compra e estorna o estoque correspondente atomicamente.
   * - Preserva o registro histórico como 'cancelled' para auditoria.
   * - Suporta cancelamento repetido idempotente.
   * - Trata estoques parcialmente consumidos: estorna até o limite disponível sem deixar saldo negativo.
   * - Não restaura nem corrompe custos unitários de fichas em uso cegamente.
   */
  async cancelPurchaseRecord(
    id: string,
    options?: { reason?: string }
  ): Promise<{ success: boolean; purchase: PurchaseHistoryItem; revertedQuantity: number; unreversedQuantity: number }> {
    const purchaseDocRef = doc(db, PURCHASE_HISTORY_COLLECTION, id);

    return await runTransaction(db, async (transaction) => {
      const purchaseSnap = await transaction.get(purchaseDocRef);
      if (!purchaseSnap.exists()) {
        throw new Error('Registro de compra não encontrado.');
      }

      const purchaseData = purchaseSnap.data();

      // Idempotência: se já foi cancelado anteriormente, retorna sem alterar saldo novamente
      if (purchaseData.status === 'cancelled') {
        return {
          success: true,
          purchase: this.mapPurchaseHistoryDoc(purchaseSnap.id, purchaseData),
          revertedQuantity: Number(purchaseData.revertedQuantity) || 0,
          unreversedQuantity: Number(purchaseData.unreversedQuantity) || 0,
        };
      }

      const purchaseQuantity = Number(purchaseData.quantity) || 0;
      let revertedQuantity = 0;
      let unreversedQuantity = 0;

      // Se houver insumo vinculado, ajusta o estoque atomicamente
      if (purchaseData.supplyId) {
        const supplyDocRef = doc(db, SUPPLIES_COLLECTION, purchaseData.supplyId);
        const supplySnap = await transaction.get(supplyDocRef);

        if (supplySnap.exists()) {
          const supplyData = supplySnap.data();
          const currentStock = Number(supplyData.currentStock) || 0;

          // Se a compra foi consumida total ou parcialmente, estorna apenas a quantidade ainda disponível
          revertedQuantity = Math.min(Math.max(0, currentStock), purchaseQuantity);
          unreversedQuantity = purchaseQuantity - revertedQuantity;
          const newStock = Math.max(0, currentStock - revertedQuantity);

          const minStock = Number(supplyData.minStock) || 0;
          const isReorder = minStock > 0 ? newStock <= minStock : (supplyData.needsReorder || false);

          transaction.update(
            supplyDocRef,
            sanitizeForFirestore({
              currentStock: newStock,
              needsReorder: isReorder,
              updatedAt: new Date().toISOString(),
            })
          );
        }
      }

      const updatedPurchase = {
        ...purchaseData,
        status: 'cancelled' as const,
        cancelledAt: new Date().toISOString(),
        cancellationReason: options?.reason || 'Cancelamento/estorno de compra',
        revertedQuantity,
        unreversedQuantity,
        updatedAt: new Date().toISOString(),
      };

      transaction.update(purchaseDocRef, sanitizeForFirestore(updatedPurchase));

      return {
        success: true,
        purchase: this.mapPurchaseHistoryDoc(purchaseSnap.id, updatedPurchase),
        revertedQuantity,
        unreversedQuantity,
      };
    });
  }

  /**
   * Exclusão física de registro de compra (com opção de estornar estoque antes caso ainda esteja ativo).
   */
  async deletePurchaseRecord(id: string, options?: { revertStock?: boolean }): Promise<void> {
    if (options?.revertStock) {
      await this.cancelPurchaseRecord(id);
    }
    await deleteDoc(doc(db, PURCHASE_HISTORY_COLLECTION, id));
  }

  /**
   * Carrega os insumos pré-definidos de papelaria personalizada
   */
  async loadPresetSupplies(): Promise<number> {
    const userId = this.getCurrentUserId();
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    for (const item of PRESET_SUPPLIES) {
      const docRef = doc(collection(db, SUPPLIES_COLLECTION));
      batch.set(docRef, sanitizeForFirestore({
        ...item,
        supplier: item.supplier || null,
        notes: item.notes || null,
        userId,
        createdAt: now,
        updatedAt: now,
      }));
    }

    await batch.commit();
    return PRESET_SUPPLIES.length;
  }

  // ─── Fichas Técnicas (Pricing Recipes) ────────────────────────────────────

  private mapRecipeDoc(id: string, data: Record<string, any>): ProductPricingRecipe {
    return {
      id,
      userId: data.userId,
      productId: data.productId || undefined,
      productName: data.productName || '',
      category: data.category || undefined,
      items: (data.items || []).map((it: any) => ({
        ...it,
        supplyId: it.supplyId || undefined,
        category: it.category || undefined,
        piecesPerSheet: it.piecesPerSheet != null ? Number(it.piecesPerSheet) : undefined,
        useSheetRounding: Boolean(it.useSheetRounding),
        originalUnitCost: it.originalUnitCost != null ? Number(it.originalUnitCost) : undefined,
        isCustomItem: Boolean(it.isCustomItem),
      })),
      materialsCost: Number(data.materialsCost) || 0,
      wasteMarginPercent: Number(data.wasteMarginPercent) || 0,
      materialsCostWithWaste: Number(data.materialsCostWithWaste) || 0,
      laborMode: data.laborMode || 'time',
      productionTimeMinutes: Number(data.productionTimeMinutes) || 0,
      setupTimeMinutes: Number(data.setupTimeMinutes) || 0,
      hourlyRateApplied: Number(data.hourlyRateApplied) || 0,
      proportionalPercent: Number(data.proportionalPercent) || 0,
      laborCost: Number(data.laborCost) || 0,
      fixedCostsShare: Number(data.fixedCostsShare) || 0,
      totalUnitCost: Number(data.totalUnitCost) || 0,
      paymentFeePercent: Number(data.paymentFeePercent) || 0,
      profitMarginPercent: Number(data.profitMarginPercent) || 0,
      pricingMethod: data.pricingMethod || 'margin_on_sale',
      breakevenPrice: Number(data.breakevenPrice) || 0,
      suggestedUnitPrice: Number(data.suggestedUnitPrice) || 0,
      manualUnitPrice: data.manualUnitPrice != null ? Number(data.manualUnitPrice) : undefined,
      batchTiers: data.batchTiers || undefined,
      isKit: Boolean(data.isKit),
      kitComponents: data.kitComponents || undefined,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || undefined,
    };
  }

  subscribeToRecipes(callback: (recipes: ProductPricingRecipe[]) => void): Unsubscribe {
    const userId = this.getCurrentUserId();
    const q = query(
      collection(db, RECIPES_COLLECTION),
      where('userId', '==', userId)
    );

    return onSnapshot(
      q,
      (snap) => {
        const recipes = snap.docs
          .map((d) => this.mapRecipeDoc(d.id, d.data()))
          .sort((a, b) => a.productName.localeCompare(b.productName, 'pt-BR'));
        callback(recipes);
      },
      (err) => {
        console.warn('Erro na sincronização de receitas:', err);
        // Fallback para getDocs estático para garantir dados na tela
        this.getRecipes().then(callback).catch(() => {});
      }
    );
  }

  async getRecipes(): Promise<ProductPricingRecipe[]> {
    const userId = this.getCurrentUserId();
    const q = query(
      collection(db, RECIPES_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => this.mapRecipeDoc(d.id, d.data()))
      .sort((a, b) => a.productName.localeCompare(b.productName, 'pt-BR'));
  }

  async getRecipe(id: string): Promise<ProductPricingRecipe | null> {
    const snap = await getDoc(doc(db, RECIPES_COLLECTION, id));
    if (!snap.exists()) return null;
    return this.mapRecipeDoc(snap.id, snap.data());
  }

  async saveRecipe(
    recipe: Omit<ProductPricingRecipe, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<ProductPricingRecipe> {
    const userId = this.getCurrentUserId();
    const now = new Date().toISOString();

    const sanitizedItems = (recipe.items || []).map((item) =>
      sanitizeForFirestore({
        ...item,
        supplyId: item.supplyId || null,
        category: item.category || null,
        piecesPerSheet: item.piecesPerSheet != null ? Number(item.piecesPerSheet) : null,
        useSheetRounding: Boolean(item.useSheetRounding),
        originalUnitCost: item.originalUnitCost != null ? Number(item.originalUnitCost) : (item.unitCost || null),
        isCustomItem: Boolean(item.isCustomItem),
      })
    );

    const basePayload = {
      productId: recipe.productId || null,
      productName: recipe.productName,
      category: recipe.category || null,
      items: sanitizedItems,
      materialsCost: Number(recipe.materialsCost) || 0,
      wasteMarginPercent: Number(recipe.wasteMarginPercent) || 0,
      materialsCostWithWaste: Number(recipe.materialsCostWithWaste) || 0,
      laborMode: recipe.laborMode || 'time',
      productionTimeMinutes: Number(recipe.productionTimeMinutes) || 0,
      setupTimeMinutes: Number(recipe.setupTimeMinutes) || 0,
      hourlyRateApplied: Number(recipe.hourlyRateApplied) || 0,
      proportionalPercent: Number(recipe.proportionalPercent) || 0,
      laborCost: Number(recipe.laborCost) || 0,
      fixedCostsShare: Number(recipe.fixedCostsShare) || 0,
      totalUnitCost: Number(recipe.totalUnitCost) || 0,
      paymentFeePercent: Number(recipe.paymentFeePercent) || 0,
      profitMarginPercent: Number(recipe.profitMarginPercent) || 0,
      pricingMethod: recipe.pricingMethod || 'margin_on_sale',
      breakevenPrice: Number(recipe.breakevenPrice) || 0,
      suggestedUnitPrice: Number(recipe.suggestedUnitPrice) || 0,
      manualUnitPrice:
        recipe.manualUnitPrice != null && Number(recipe.manualUnitPrice) > 0
          ? Number(recipe.manualUnitPrice)
          : null,
      batchTiers: recipe.batchTiers || null,
      isKit: Boolean(recipe.isKit),
      kitComponents: recipe.kitComponents || null,
      userId,
      updatedAt: now,
    };

    if (recipe.id) {
      const recipeRef = doc(db, RECIPES_COLLECTION, recipe.id);
      const updatePayload = sanitizeForFirestore(basePayload);
      await updateDoc(recipeRef, updatePayload);
      return { id: recipe.id, ...updatePayload, createdAt: now } as ProductPricingRecipe;
    }

    const createPayload = sanitizeForFirestore({
      ...basePayload,
      createdAt: now,
    });
    const docRef = await addDoc(collection(db, RECIPES_COLLECTION), createPayload);
    return { id: docRef.id, ...createPayload } as ProductPricingRecipe;
  }

  async deleteRecipe(id: string): Promise<void> {
    await deleteDoc(doc(db, RECIPES_COLLECTION, id));
  }

  // ─── Acompanhamento de Produção (Previsto vs Realizado) ─────────────────────

  private mapTrackingDoc(id: string, data: Record<string, any>): ProductionTrackingRecord {
    return {
      id,
      userId: data.userId,
      recipeId: data.recipeId || null,
      productName: data.productName || '',
      orderNumber: data.orderNumber || null,
      date: data.date || new Date().toISOString().slice(0, 10),
      plannedQuantity: Number(data.plannedQuantity) || 1,
      plannedMinutes: Number(data.plannedMinutes) || 0,
      actualMinutes: Number(data.actualMinutes) || 0,
      plannedMaterialsCost: Number(data.plannedMaterialsCost) || 0,
      actualMaterialsCost: Number(data.actualMaterialsCost) || 0,
      salePrice: Number(data.salePrice) || 0,
      notes: data.notes || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
    };
  }

  subscribeToProductionTracking(callback: (records: ProductionTrackingRecord[]) => void): Unsubscribe {
    const userId = this.getCurrentUserId();
    const q = query(
      collection(db, PRODUCTION_TRACKING_COLLECTION),
      where('userId', '==', userId)
    );

    return onSnapshot(
      q,
      (snap) => {
        const records = snap.docs
          .map((d) => this.mapTrackingDoc(d.id, d.data()))
          .sort((a, b) => b.date.localeCompare(a.date));
        callback(records);
      },
      (err) => {
        console.warn('Erro na sincronização de acompanhamento de produção:', err);
        this.getProductionTracking().then(callback).catch(() => {});
      }
    );
  }

  async getProductionTracking(): Promise<ProductionTrackingRecord[]> {
    const userId = this.getCurrentUserId();
    const q = query(
      collection(db, PRODUCTION_TRACKING_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => this.mapTrackingDoc(d.id, d.data()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async addProductionTrackingRecord(
    record: Omit<ProductionTrackingRecord, 'id' | 'userId' | 'createdAt'>
  ): Promise<ProductionTrackingRecord> {
    const userId = this.getCurrentUserId();
    const payload = sanitizeForFirestore({
      ...record,
      userId,
      createdAt: new Date().toISOString(),
    });
    const docRef = await addDoc(collection(db, PRODUCTION_TRACKING_COLLECTION), payload);
    return { id: docRef.id, ...payload };
  }

  async deleteProductionTrackingRecord(id: string): Promise<void> {
    await deleteDoc(doc(db, PRODUCTION_TRACKING_COLLECTION, id));
  }

  /**
   * Sincroniza o preço calculado e custo com o produto no catálogo geral de produtos
   */
  async syncPriceToProduct(
    productId: string,
    unitPrice: number,
    unitCost: number,
    profitMargin: number,
    recipeId: string
  ): Promise<void> {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) {
      throw new Error(
        `O produto vinculado (ID: ${productId}) não foi encontrado no catálogo. Verifique se ele foi excluído ou selecione outro produto.`
      );
    }
    await updateDoc(
      productRef,
      sanitizeForFirestore({
        unitPrice,
        unitCost,
        profitMargin,
        recipeId,
        updatedAt: new Date().toISOString(),
      })
    );
  }
}

export const firebasePricingService = new FirebasePricingService();

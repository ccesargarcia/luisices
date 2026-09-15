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
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  SupplyItem,
  ProductPricingRecipe,
  StudioPricingSettings,
} from '../app/types';
import { DEFAULT_PRICING_SETTINGS } from '../app/utils/pricingCalculations';

const SUPPLIES_COLLECTION = 'supplies';
const RECIPES_COLLECTION = 'pricingRecipes';
const SETTINGS_COLLECTION = 'pricingSettings';
const PRODUCTS_COLLECTION = 'products';

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
    return {
      id,
      userId: data.userId,
      name: data.name,
      category: data.category || 'outros',
      purchasePrice: Number(data.purchasePrice) || 0,
      packageQuantity: Number(data.packageQuantity) || 1,
      unit: data.unit || 'unidade',
      unitCost: Number(data.unitCost) || 0,
      supplier: data.supplier || undefined,
      notes: data.notes || undefined,
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

    return onSnapshot(q, (snap) => {
      const supplies = snap.docs
        .map((d) => this.mapSupplyDoc(d.id, d.data()))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      callback(supplies);
    });
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
    const calculatedUnitCost =
      supply.packageQuantity > 0
        ? Math.round((supply.purchasePrice / supply.packageQuantity) * 1000) / 1000
        : 0;

    const payload = sanitizeForFirestore({
      ...supply,
      supplier: supply.supplier || null,
      notes: supply.notes || null,
      unitCost: calculatedUnitCost,
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
    const purchasePrice = Number(data.purchasePrice);
    const packageQuantity = Number(data.packageQuantity);
    const updates: Record<string, any> = sanitizeForFirestore({
      ...data,
      supplier: data.supplier !== undefined ? (data.supplier || null) : undefined,
      notes: data.notes !== undefined ? (data.notes || null) : undefined,
      updatedAt: new Date().toISOString(),
    });

    if (!isNaN(purchasePrice) && !isNaN(packageQuantity) && packageQuantity > 0) {
      updates.unitCost = Math.round((purchasePrice / packageQuantity) * 1000) / 1000;
    }

    await updateDoc(doc(db, SUPPLIES_COLLECTION, id), updates);
  }

  async deleteSupply(id: string): Promise<void> {
    await deleteDoc(doc(db, SUPPLIES_COLLECTION, id));
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
        isCustomItem: Boolean(it.isCustomItem),
      })),
      materialsCost: Number(data.materialsCost) || 0,
      wasteMarginPercent: Number(data.wasteMarginPercent) || 0,
      materialsCostWithWaste: Number(data.materialsCostWithWaste) || 0,
      laborMode: data.laborMode || 'time',
      productionTimeMinutes: Number(data.productionTimeMinutes) || 0,
      hourlyRateApplied: Number(data.hourlyRateApplied) || 0,
      proportionalPercent: Number(data.proportionalPercent) || 0,
      laborCost: Number(data.laborCost) || 0,
      fixedCostsShare: Number(data.fixedCostsShare) || 0,
      totalUnitCost: Number(data.totalUnitCost) || 0,
      paymentFeePercent: Number(data.paymentFeePercent) || 0,
      profitMarginPercent: Number(data.profitMarginPercent) || 0,
      suggestedUnitPrice: Number(data.suggestedUnitPrice) || 0,
      manualUnitPrice: data.manualUnitPrice != null ? Number(data.manualUnitPrice) : undefined,
      batchTiers: data.batchTiers || undefined,
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

    return onSnapshot(q, (snap) => {
      const recipes = snap.docs
        .map((d) => this.mapRecipeDoc(d.id, d.data()))
        .sort((a, b) => a.productName.localeCompare(b.productName, 'pt-BR'));
      callback(recipes);
    });
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
      hourlyRateApplied: Number(recipe.hourlyRateApplied) || 0,
      proportionalPercent: Number(recipe.proportionalPercent) || 0,
      laborCost: Number(recipe.laborCost) || 0,
      fixedCostsShare: Number(recipe.fixedCostsShare) || 0,
      totalUnitCost: Number(recipe.totalUnitCost) || 0,
      paymentFeePercent: Number(recipe.paymentFeePercent) || 0,
      profitMarginPercent: Number(recipe.profitMarginPercent) || 0,
      suggestedUnitPrice: Number(recipe.suggestedUnitPrice) || 0,
      manualUnitPrice:
        recipe.manualUnitPrice != null && Number(recipe.manualUnitPrice) > 0
          ? Number(recipe.manualUnitPrice)
          : null,
      batchTiers: recipe.batchTiers || null,
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

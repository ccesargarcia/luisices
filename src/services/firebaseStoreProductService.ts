/**
 * Firebase Store Product Service
 *
 * Gerencia os produtos da vitrine da lojinha pública online.
 * Armazenados na coleção 'storeProducts' isolados dos produtos internos do ateliê.
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  deleteDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { StoreProduct, Product } from '../app/types';
import { firebaseStorageService } from './firebaseStorageService';

const STORE_PRODUCTS_COLLECTION = 'storeProducts';

class FirebaseStoreProductService {
  private mapDoc(id: string, data: Record<string, any>): StoreProduct {
    return {
      id,
      name: data.name || '',
      price: Number(data.price ?? data.unitPrice ?? 0),
      category: data.category || 'Geral',
      description: data.description || '',
      imageUrl: data.imageUrl || data.photoUrl || undefined,
      leadTimeDays: data.leadTimeDays ? Number(data.leadTimeDays) : 5,
      badge: data.badge || undefined,
      isCustomizable: data.isCustomizable !== undefined ? Boolean(data.isCustomizable) : true,
      active: data.active !== undefined ? Boolean(data.active) : true,
      order: data.order !== undefined ? Number(data.order) : 0,
      internalProductId: data.internalProductId || undefined,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? undefined,
    };
  }

  private ensurePositive(value: number | undefined | null): number {
    return Math.max(0, value ?? 0);
  }

  async getStoreProducts(): Promise<StoreProduct[]> {
    try {
      const q = query(
        collection(db, STORE_PRODUCTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => this.mapDoc(d.id, d.data()));
    } catch {
      try {
        // Fallback sem orderBy caso index não esteja pronto
        const snap = await getDocs(collection(db, STORE_PRODUCTS_COLLECTION));
        return snap.docs
          .map((d) => this.mapDoc(d.id, d.data()))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      } catch (fallbackErr) {
        console.warn('Erro ao obter produtos da lojinha:', fallbackErr);
        return [];
      }
    }
  }

  subscribeToStoreProducts(
    callback: (products: StoreProduct[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const q = query(collection(db, STORE_PRODUCTS_COLLECTION));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => this.mapDoc(d.id, d.data()))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        callback(list);
      },
      (err) => {
        console.warn('Erro ao escutar produtos da lojinha:', err);
        if (onError) {
          onError(err);
        }
      }
    );
  }

  async createStoreProduct(data: Partial<StoreProduct>): Promise<StoreProduct> {
    const now = Timestamp.now();
    const currentUid = auth.currentUser?.uid || null;
    const ref = await addDoc(collection(db, STORE_PRODUCTS_COLLECTION), {
      name: data.name?.trim() || '',
      price: this.ensurePositive(data.price),
      category: data.category?.trim() || 'Geral',
      description: data.description?.trim() || '',
      imageUrl: data.imageUrl || null,
      leadTimeDays: data.leadTimeDays ? Number(data.leadTimeDays) : 5,
      badge: data.badge?.trim() || null,
      isCustomizable: data.isCustomizable !== undefined ? data.isCustomizable : true,
      active: data.active !== undefined ? data.active : true,
      order: data.order !== undefined ? Number(data.order) : 0,
      internalProductId: data.internalProductId || null,
      userId: currentUid,
      createdAt: now,
      updatedAt: now,
    });
    const snap = await getDoc(ref);
    return this.mapDoc(ref.id, snap.data()!);
  }

  async updateStoreProduct(id: string, changes: Partial<StoreProduct>): Promise<void> {
    const { id: _id, createdAt: _ca, ...rest } = changes as any;
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (k === 'price') {
        sanitized[k] = this.ensurePositive(v as number);
      } else if (v === undefined) {
        sanitized[k] = null;
      } else {
        sanitized[k] = v;
      }
    }
    sanitized.updatedAt = Timestamp.now();
    await updateDoc(doc(db, STORE_PRODUCTS_COLLECTION, id), sanitized);
  }

  async toggleStoreProductActive(id: string, active: boolean): Promise<void> {
    await updateDoc(doc(db, STORE_PRODUCTS_COLLECTION, id), {
      active,
      updatedAt: Timestamp.now(),
    });
  }

  async deleteStoreProduct(id: string): Promise<void> {
    await deleteDoc(doc(db, STORE_PRODUCTS_COLLECTION, id));
  }

  async uploadPhoto(productId: string, file: File): Promise<string> {
    const url = await firebaseStorageService.uploadStoreProductPhoto(file, productId);
    await updateDoc(doc(db, STORE_PRODUCTS_COLLECTION, productId), {
      imageUrl: url,
      updatedAt: Timestamp.now(),
    });
    return url;
  }

  async importFromInternalProduct(prod: Product): Promise<StoreProduct> {
    return this.createStoreProduct({
      name: prod.name,
      price: prod.unitPrice,
      category: prod.category || 'Geral',
      description: prod.description || 'Produto artesanal confeccionado com carinho sob encomenda.',
      imageUrl: prod.photoUrl || undefined,
      leadTimeDays: prod.leadTimeDays ?? 5,
      badge: prod.badge || undefined,
      isCustomizable: prod.isCustomizable ?? true,
      active: true,
      internalProductId: prod.id,
    });
  }
}

export const firebaseStoreProductService = new FirebaseStoreProductService();

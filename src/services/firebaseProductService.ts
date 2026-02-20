/**
 * Firebase Product Service
 *
 * Gerencia o catálogo de produtos/serviços reutilizáveis.
 * Armazena em coleção 'products' com campo userId.
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  deleteDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Product } from '../app/types';
import { firebaseStorageService } from './firebaseStorageService';

const PRODUCTS_COLLECTION = 'products';

class FirebaseProductService {
  private getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');
    return user.uid;
  }

  private mapDoc(id: string, data: Record<string, any>): Product {
    return {
      id,
      userId: data.userId,
      name: data.name,
      unitPrice: data.unitPrice ?? 0,
      description: data.description || undefined,
      category: data.category || undefined,
      photoUrl: data.photoUrl || undefined,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? undefined,
    };
  }

  async getProducts(): Promise<Product[]> {
    const userId = this.getCurrentUserId();
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => this.mapDoc(d.id, d.data()))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
    const userId = this.getCurrentUserId();
    const ref = await addDoc(collection(db, PRODUCTS_COLLECTION), {
      userId,
      name: data.name,
      unitPrice: data.unitPrice ?? 0,
      description: data.description || null,
      category: data.category || null,
      photoUrl: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const snap = await getDoc(ref);
    return this.mapDoc(ref.id, snap.data()!);
  }

  async uploadPhoto(productId: string, file: File, userId: string): Promise<string> {
    const url = await firebaseStorageService.uploadProductPhoto(file, userId, productId);
    await updateDoc(doc(db, PRODUCTS_COLLECTION, productId), { photoUrl: url, updatedAt: Timestamp.now() });
    return url;
  }

  async updateProduct(id: string, changes: Partial<Product>): Promise<void> {
    const { id: _id, userId: _uid, createdAt: _ca, ...rest } = changes as any;
    const sanitized = Object.fromEntries(
      Object.entries(rest).map(([k, v]) => [k, v === undefined ? null : v])
    );
    await updateDoc(doc(db, PRODUCTS_COLLECTION, id), {
      ...sanitized,
      updatedAt: Timestamp.now(),
    });
  }

  async deleteProduct(id: string): Promise<void> {
    await deleteDoc(doc(db, PRODUCTS_COLLECTION, id));
  }
}

export const firebaseProductService = new FirebaseProductService();

/**
 * Firebase Gallery Service
 *
 * CRUD para itens da galeria de artes
 */

import {
  collection,
  addDoc,
  updateDoc,
  getDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, storage, auth, functions } from '../lib/firebase';
import type { GalleryItem } from '../app/types';
import { firebaseStorageService } from './firebaseStorageService';
import { resolveGalleryImageUrl } from './firebaseGalleryImageService';

const storageService = firebaseStorageService;

export class FirebaseGalleryService {
  private collectionName = 'gallery';

  private getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) throw new Error('É necessário estar autenticado para realizar esta operação');
    return user.uid;
  }

  private async canModifyItem(itemUserId: string, currentUserId: string): Promise<boolean> {
    if (itemUserId === currentUserId) return true;
    try {
      const profileSnap = await getDoc(doc(db, 'userProfiles', currentUserId));
      if (!profileSnap.exists()) return false;
      const profile = profileSnap.data();
      if (profile.role === 'admin') return true;
      if (profile.role === 'funcionario' && profile.active && profile.permissions?.gallery?.delete) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // ─── Read ────────────────────────────────────────────────────────────────────

  async getItems(userId: string, isAdmin: boolean = false): Promise<GalleryItem[]> {
    const q = isAdmin
      ? query(
          collection(db, this.collectionName),
          orderBy('createdAt', 'desc')
        )
      : query(
          collection(db, this.collectionName),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
    const snapshot = await getDocs(q);
    return Promise.all(snapshot.docs
      .filter(d => !d.data().deletedAt)
      .map(async d => {
        const item = this.fromFirestore(d.id, d.data());
        try {
          item.imageUrl = await resolveGalleryImageUrl(item.imageUrl);
        } catch {
          // Uma imagem indisponível não deve impedir a listagem das demais artes.
          item.imageUrl = '';
        }
        return item;
      }));
  }

  // ─── Create ───────────────────────────────────────────────────────────────────

  async createItem(
    userId: string,
    data: {
      title: string;
      description?: string;
      imageUrl: string;
      customerId?: string;
      customerName?: string;
      orderId?: string;
      orderNumber?: string;
      tags?: GalleryItem['tags'];
    }
  ): Promise<GalleryItem> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, this.collectionName), {
      userId,
      title: data.title,
      description: data.description ?? '',
      imageUrl: data.imageUrl,
      customerId: data.customerId ?? null,
      customerName: data.customerName ?? null,
      orderId: data.orderId ?? null,
      orderNumber: data.orderNumber ?? null,
      tags: data.tags ?? [],
      createdAt: now,
      deletedAt: null,
    });
    return {
      id: docRef.id,
      userId,
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      customerId: data.customerId,
      customerName: data.customerName,
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      tags: data.tags ?? [],
      createdAt: now.toDate().toISOString(),
    };
  }

  // ─── Update ───────────────────────────────────────────────────────────────────

  async updateItem(
    id: string,
    updates: Partial<Pick<GalleryItem, 'title' | 'description' | 'customerId' | 'customerName' | 'orderId' | 'orderNumber' | 'tags'>>
  ): Promise<void> {
    const userId = this.getCurrentUserId();
    const snap = await getDoc(doc(db, this.collectionName, id));
    if (!snap.exists()) throw new Error('Item da galeria não encontrado');
    if (!(await this.canModifyItem(snap.data().userId, userId))) {
      throw new Error('Você não tem permissão para editar este item');
    }
    await updateDoc(doc(db, this.collectionName, id), updates);
  }

  // ─── Delete (soft) ────────────────────────────────────────────────────────────

  async deleteItem(id: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const snap = await getDoc(doc(db, this.collectionName, id));
    if (!snap.exists()) throw new Error('Item da galeria não encontrado');
    if (!(await this.canModifyItem(snap.data().userId, userId))) {
      throw new Error('Você não tem permissão para excluir este item');
    }
    await updateDoc(doc(db, this.collectionName, id), {
      deletedAt: Timestamp.now(),
    });
  }

  // ─── Upload image ─────────────────────────────────────────────────────────────

  async uploadImage(file: File, userId: string, tempId: string): Promise<string> {
    return storageService.uploadGalleryImage(file, userId, tempId);
  }

  // ─── Delete storage file ──────────────────────────────────────────────────────

  async deleteStorageFile(imageUrl: string): Promise<void> {
    try {
      await storageService.deleteImage(imageUrl);
    } catch {
      // best-effort: file might already be deleted
    }
  }

  // ─── AI Vision Enrichment ──────────────────────────────────────────────────

  async enrichItemWithAi(itemId: string): Promise<{
    success: boolean;
    aiDescription: string;
    productType?: string;
    colors?: string[];
    suggestedTags?: string[];
  }> {
    const callable = httpsCallable<
      { itemId: string },
      {
        success: boolean;
        aiDescription: string;
        productType?: string;
        colors?: string[];
        suggestedTags?: string[];
      }
    >(functions, 'enrichGalleryItemWithAi');

    const result = await callable({ itemId });
    return result.data;
  }

  // ─── Private ──────────────────────────────────────────────────────────────────

  private fromFirestore(id: string, data: Record<string, unknown>): GalleryItem {
    const ts = data.createdAt as Timestamp | null;
    const aiTs = data.aiAnalyzedAt as Timestamp | null;
    return {
      id,
      userId: data.userId as string,
      title: data.title as string,
      description: (data.description as string) || undefined,
      imageUrl: (data.imageUrl as string) || '',
      customerId: (data.customerId as string) || undefined,
      customerName: (data.customerName as string) || undefined,
      orderId: (data.orderId as string) || undefined,
      orderNumber: (data.orderNumber as string) || undefined,
      tags: (data.tags as GalleryItem['tags']) ?? [],
      createdAt: ts ? ts.toDate().toISOString() : new Date().toISOString(),
      aiDescription: (data.aiDescription as string) || undefined,
      aiTags: (data.aiTags as string[]) || undefined,
      productType: (data.productType as string) || undefined,
      colors: (data.colors as string[]) || undefined,
      aiAnalyzedAt: aiTs ? (typeof (aiTs as any).toDate === 'function' ? (aiTs as any).toDate().toISOString() : String(aiTs)) : (data.aiAnalyzedAt as string) || undefined,
    };
  }
}

export const firebaseGalleryService = new FirebaseGalleryService();

/**
 * Firebase Gallery Service
 *
 * CRUD para itens da galeria de artes
 */

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import type { GalleryItem } from '../app/types';
import { FirebaseStorageService } from './firebaseStorageService';

const storageService = new FirebaseStorageService();

export class FirebaseGalleryService {
  private collectionName = 'gallery';

  // ─── Read ────────────────────────────────────────────────────────────────────

  async getItems(userId: string): Promise<GalleryItem[]> {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .filter(d => !d.data().deletedAt)
      .map(d => this.fromFirestore(d.id, d.data()));
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
    await updateDoc(doc(db, this.collectionName, id), updates);
  }

  // ─── Delete (soft) ────────────────────────────────────────────────────────────

  async deleteItem(id: string): Promise<void> {
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
      const storageRef = ref(storage, imageUrl);
      await deleteObject(storageRef);
    } catch {
      // best-effort: file might already be deleted
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────────

  private fromFirestore(id: string, data: Record<string, unknown>): GalleryItem {
    const ts = data.createdAt as Timestamp | null;
    return {
      id,
      userId: data.userId as string,
      title: data.title as string,
      description: (data.description as string) || undefined,
      imageUrl: data.imageUrl as string,
      customerId: (data.customerId as string) || undefined,
      customerName: (data.customerName as string) || undefined,
      orderId: (data.orderId as string) || undefined,
      orderNumber: (data.orderNumber as string) || undefined,
      tags: (data.tags as GalleryItem['tags']) ?? [],
      createdAt: ts ? ts.toDate().toISOString() : new Date().toISOString(),
    };
  }
}

export const firebaseGalleryService = new FirebaseGalleryService();

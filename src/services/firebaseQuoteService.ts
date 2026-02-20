/**
 * Firebase Quote Service
 *
 * Gerencia orçamentos. Cada orçamento pode ser convertido em pedido ao ser aprovado.
 * Armazena em coleção 'quotes' com campo userId, mesmo padrão dos pedidos.
 */

import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Quote, QuoteStatus } from '../app/types';

const QUOTES_COLLECTION = 'quotes';

export class FirebaseQuoteService {
  private getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) throw new Error('É necessário estar autenticado para realizar esta operação');
    return user.uid;
  }

  // ─── Número sequencial (mesmo mecanismo dos pedidos, contador separado) ─────
  private async generateQuoteNumber(userId: string): Promise<string> {
    const counterRef = doc(db, 'users', userId, 'metadata', 'quoteCounters');
    const quoteNumber = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      const current = counterSnap.exists() ? counterSnap.data().quoteCount || 0 : 0;
      const next = current + 1;
      transaction.set(counterRef, { quoteCount: next }, { merge: true });
      return `ORC-${String(next).padStart(4, '0')}`;
    });
    return quoteNumber;
  }

  // ─── Mapper ──────────────────────────────────────────────────────────────────
  private mapDoc(id: string, data: Record<string, any>): Quote {
    return {
      id,
      quoteNumber: data.quoteNumber,
      userId: data.userId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerId: data.customerId || undefined,
      items: data.items || [],
      totalPrice: data.totalPrice ?? 0,
      estimatedCost: data.estimatedCost ?? undefined,
      status: data.status as QuoteStatus,
      deliveryDate: data.deliveryDate,
      validUntil: data.validUntil || undefined,
      notes: data.notes || undefined,
      tags: data.tags || undefined,
      cardColor: data.cardColor || undefined,
      isExchange: data.isExchange || false,
      exchangeNotes: data.exchangeNotes || undefined,
      orderId: data.orderId || undefined,
      orderNumber: data.orderNumber || undefined,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? undefined,
    };
  }

  // ─── Create ──────────────────────────────────────────────────────────────────
  async createQuote(quoteData: Partial<Quote>): Promise<Quote> {
    const userId = this.getCurrentUserId();
    const quoteNumber = await this.generateQuoteNumber(userId);
    const ref = await addDoc(collection(db, QUOTES_COLLECTION), {
      userId,
      quoteNumber,
      customerName: quoteData.customerName,
      customerPhone: quoteData.customerPhone,
      customerId: quoteData.customerId || null,
      items: quoteData.items || [],
      totalPrice: quoteData.totalPrice ?? 0,
      estimatedCost: quoteData.estimatedCost || null,
      status: quoteData.status || 'draft',
      deliveryDate: quoteData.deliveryDate,
      validUntil: quoteData.validUntil || null,
      notes: quoteData.notes || null,
      tags: quoteData.tags || null,
      cardColor: quoteData.cardColor || null,
      isExchange: quoteData.isExchange || false,
      exchangeNotes: quoteData.exchangeNotes || null,
      orderId: null,
      orderNumber: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const snap = await getDoc(ref);
    return this.mapDoc(ref.id, snap.data()!);
  }

  // ─── Read all for user ────────────────────────────────────────────────────────
  async getQuotes(): Promise<Quote[]> {
    const userId = this.getCurrentUserId();
    const q = query(
      collection(db, QUOTES_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => this.mapDoc(d.id, d.data()));
  }

  // ─── Read single ─────────────────────────────────────────────────────────────
  async getQuoteById(id: string): Promise<Quote> {
    const snap = await getDoc(doc(db, QUOTES_COLLECTION, id));
    if (!snap.exists()) throw new Error(`Orçamento ${id} não encontrado`);
    return this.mapDoc(snap.id, snap.data());
  }

  // ─── Update ──────────────────────────────────────────────────────────────────
  async updateQuote(id: string, changes: Partial<Quote>): Promise<void> {
    const { id: _id, userId: _uid, createdAt: _ca, quoteNumber: _qn, ...rest } = changes as any;
    await updateDoc(doc(db, QUOTES_COLLECTION, id), {
      ...rest,
      updatedAt: Timestamp.now(),
    });
  }

  // ─── Status helpers ───────────────────────────────────────────────────────────
  async updateStatus(id: string, status: QuoteStatus): Promise<void> {
    await updateDoc(doc(db, QUOTES_COLLECTION, id), { status, updatedAt: Timestamp.now() });
  }

  /** Mark as approved and link the generated orderId/orderNumber */
  async markApproved(id: string, orderId: string, orderNumber: string): Promise<void> {
    await updateDoc(doc(db, QUOTES_COLLECTION, id), {
      status: 'approved',
      orderId,
      orderNumber,
      updatedAt: Timestamp.now(),
    });
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────
  async deleteQuote(id: string): Promise<void> {
    await deleteDoc(doc(db, QUOTES_COLLECTION, id));
  }
}

export const firebaseQuoteService = new FirebaseQuoteService();

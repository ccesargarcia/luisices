import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Quote } from '../app/types';
import { firebaseQuoteService } from '../services/firebaseQuoteService';
import { isQuoteExpired } from '../app/components/quotes/quoteHelpers';

export function useFirebaseQuotes() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setQuotes([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (authLoading && !userProfile) {
      setLoading(true);
      return;
    }

    const isAdmin = userProfile?.role === 'admin';

    const activeQuery = isAdmin
      ? query(
          collection(db, 'quotes'),
          where('status', 'in', ['draft', 'sent']),
          limit(500),
        )
      : query(
          collection(db, 'quotes'),
          where('userId', '==', user.uid),
          where('status', 'in', ['draft', 'sent']),
          limit(500),
        );

    const historicalQuery = isAdmin
      ? query(
          collection(db, 'quotes'),
          where('status', 'in', ['approved', 'rejected', 'expired']),
          orderBy('createdAt', 'desc'),
          limit(200),
        )
      : query(
          collection(db, 'quotes'),
          where('userId', '==', user.uid),
          where('status', 'in', ['approved', 'rejected', 'expired']),
          orderBy('createdAt', 'desc'),
          limit(200),
        );

    const mapDocs = (docs: any[]): Quote[] => docs.map((d) => {
      const raw = d.data();
      return {
        id: d.id,
        quoteNumber: raw.quoteNumber,
        userId: raw.userId,
        customerName: raw.customerName,
        customerPhone: raw.customerPhone,
        customerId: raw.customerId ?? undefined,
        items: raw.items ?? [],
        totalPrice: raw.totalPrice ?? 0,
        discount: raw.discount ?? undefined,
        discountType: raw.discountType ?? undefined,
        paymentCondition: raw.paymentCondition ?? undefined,
        deliveryType: raw.deliveryType ?? undefined,
        deliveryAddress: raw.deliveryAddress ?? undefined,
        status: raw.status,
        deliveryDate: raw.deliveryDate,
        validUntil: raw.validUntil ?? undefined,
        notes: raw.notes ?? undefined,
        tags: raw.tags ?? undefined,
        cardColor: raw.cardColor ?? undefined,
        isExchange: raw.isExchange ?? false,
        exchangeNotes: raw.exchangeNotes ?? undefined,
        orderId: raw.orderId ?? undefined,
        orderNumber: raw.orderNumber ?? undefined,
        createdAt: raw.createdAt?.toDate?.()?.toISOString() ?? (typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()),
        sentAt: raw.sentAt?.toDate?.()?.toISOString() ?? undefined,
        approvedAt: raw.approvedAt?.toDate?.()?.toISOString() ?? undefined,
        rejectedAt: raw.rejectedAt?.toDate?.()?.toISOString() ?? undefined,
        expiredAt: raw.expiredAt?.toDate?.()?.toISOString() ?? undefined,
        updatedAt: raw.updatedAt?.toDate?.()?.toISOString() ?? undefined,
      } as Quote;
    });

    let activeQuotes: Quote[] = [];
    let historicalQuotes: Quote[] = [];
    let isFallbackActive = false;

    const publish = () => {
      const map = new Map<string, Quote>();
      [...activeQuotes, ...historicalQuotes].forEach((q) => map.set(q.id, q));
      const sorted = [...map.values()].sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt))
      );

      const expiredQuotes = sorted.filter(isQuoteExpired);
      setQuotes(sorted.map((quote) => (
        isQuoteExpired(quote) ? { ...quote, status: 'expired' as const } : quote
      )));

      if (expiredQuotes.length > 0) {
        void Promise.all(
          expiredQuotes.map((quote) => firebaseQuoteService.updateStatus(quote.id, 'expired')),
        ).catch((expirationError) => {
          console.error('Erro ao atualizar orçamentos vencidos:', expirationError);
        });
      }
      setLoading(false);
      setError(null);
    };

    const unsubscribers: Array<() => void> = [];

    const handleQueryError = (queryName: string, err: any) => {
      console.warn(`useFirebaseQuotes: aviso ao escutar ${queryName}:`, err?.message || err);
      if (err?.code === 'failed-precondition' && !isFallbackActive) {
        isFallbackActive = true;
        console.warn('useFirebaseQuotes: índice ausente. Ativando fallback para consulta unificada.');
        const fallbackQuery = isAdmin
          ? query(collection(db, 'quotes'), orderBy('createdAt', 'desc'), limit(200))
          : query(collection(db, 'quotes'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(200));

        unsubscribers.push(onSnapshot(
          fallbackQuery,
          (snapshot) => {
            activeQuotes = mapDocs(snapshot.docs);
            historicalQuotes = [];
            publish();
          },
          (fallbackErr) => {
            setError(fallbackErr.message);
            setLoading(false);
          }
        ));
        return;
      }
      setError(err?.message || String(err));
      setLoading(false);
    };

    unsubscribers.push(onSnapshot(
      activeQuery,
      (snapshot) => {
        activeQuotes = mapDocs(snapshot.docs);
        publish();
      },
      (err) => handleQueryError('orçamentos ativos', err)
    ));

    unsubscribers.push(onSnapshot(
      historicalQuery,
      (snapshot) => {
        historicalQuotes = mapDocs(snapshot.docs);
        publish();
      },
      (err) => handleQueryError('histórico de orçamentos', err)
    ));

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [user, userProfile?.role, authLoading]);

  return { quotes, loading, error };
}

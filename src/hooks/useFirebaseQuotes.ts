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
    const q = isAdmin
      ? query(
          collection(db, 'quotes'),
          orderBy('createdAt', 'desc'),
          limit(200),
        )
      : query(
          collection(db, 'quotes'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(200),
        );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Quote[] = snapshot.docs.map((d) => {
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
        const expiredQuotes = data.filter(isQuoteExpired);
        setQuotes(data.map((quote) => (
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
      },
      (err) => {
        console.error('Erro ao buscar orçamentos:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, userProfile?.role, authLoading]);

  return { quotes, loading, error };
}

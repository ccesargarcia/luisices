import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Quote } from '../app/types';

export function useFirebaseQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'quotes'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
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
            estimatedCost: raw.estimatedCost ?? undefined,
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
            createdAt: raw.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
            sentAt: raw.sentAt?.toDate?.()?.toISOString() ?? undefined,
            approvedAt: raw.approvedAt?.toDate?.()?.toISOString() ?? undefined,
            rejectedAt: raw.rejectedAt?.toDate?.()?.toISOString() ?? undefined,
            expiredAt: raw.expiredAt?.toDate?.()?.toISOString() ?? undefined,
            updatedAt: raw.updatedAt?.toDate?.()?.toISOString() ?? undefined,
          } as Quote;
        });
        setQuotes(data);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao buscar orçamentos:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { quotes, loading, error };
}

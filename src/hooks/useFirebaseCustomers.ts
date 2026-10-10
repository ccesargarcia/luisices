import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrdersContext';
import { Customer } from '../app/types';

export function useFirebaseCustomers() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { selectedUserIds, isFilterActive } = useOrders();
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAllCustomers([]);
      setLoading(false);
      return;
    }

    if (authLoading && !userProfile) {
      setLoading(true);
      return;
    }

    const isAdmin = userProfile?.role === 'admin';
    const q = isAdmin
      ? query(
          collection(db, 'customers'),
          orderBy('createdAt', 'desc'),
          limit(1000),
        )
      : query(
          collection(db, 'customers'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(1000),
        );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setAllCustomers(
          snap.docs.map((d) => {
            const raw = d.data();
            return {
              ...(raw as Customer),
              id: d.id,
              createdAt: raw.createdAt?.toDate?.()?.toISOString() ?? (typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()),
            };
          }),
        );
        setLoading(false);
      },
      (err) => {
        console.error('useFirebaseCustomers: erro ao carregar clientes:', err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [user, userProfile?.role, authLoading]);

  // Se o admin tiver selecionado parceiro(s) específico(s), filtra reativamente em memória
  const customers = useMemo(() => {
    if (!isFilterActive || !selectedUserIds || selectedUserIds.length === 0) {
      return allCustomers;
    }
    return allCustomers.filter((c) => c.userId && selectedUserIds.includes(c.userId));
  }, [allCustomers, isFilterActive, selectedUserIds]);

  return { customers, allCustomers, loading };
}

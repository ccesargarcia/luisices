import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Customer } from '../app/types';

export function useFirebaseCustomers() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCustomers([]);
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
          limit(200),
        )
      : query(
          collection(db, 'customers'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(200),
        );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setCustomers(
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

  return { customers, loading };
}

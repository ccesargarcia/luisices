import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Customer } from '../app/types';

export function useFirebaseCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setCustomers([]);
        setLoading(false);
        if (unsubSnapshot) {
          unsubSnapshot();
          unsubSnapshot = null;
        }
        return;
      }

      const q = query(
        collection(db, 'customers'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(150),
      );

      unsubSnapshot = onSnapshot(
        q,
        (snap) => {
          setCustomers(
            snap.docs.map((d) => {
              const raw = d.data();
              return {
                ...(raw as Customer),
                id: d.id,
                createdAt: raw.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
              };
            }),
          );
          setLoading(false);
        },
        () => setLoading(false),
      );
    });

    return () => {
      unsubAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  return { customers, loading };
}

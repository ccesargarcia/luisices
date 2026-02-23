import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Customer } from '../app/types';

export function useFirebaseCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'customers'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(
      q,
      snap => {
        setCustomers(
          snap.docs.map(d => {
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

    return unsub;
  }, []);

  return { customers, loading };
}

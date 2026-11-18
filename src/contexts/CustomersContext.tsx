// @refresh reset
/**
 * Context that holds a single Firestore onSnapshot listener for customers per session.
 * Prevents duplicate reads when navigating between Customers, Orders, WhatsApp, Emails and Reports.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import type { Customer } from '../app/types';

interface CustomersContextValue {
  allCustomers: Customer[];
  loading: boolean;
}

const CustomersContext = createContext<CustomersContextValue | null>(null);

export function CustomersProvider({ children }: { children: ReactNode }) {
  const { user, userProfile, loading: authLoading } = useAuth();
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
              createdAt:
                raw.createdAt?.toDate?.()?.toISOString() ??
                (typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()),
            };
          }),
        );
        setLoading(false);
      },
      (err) => {
        console.error('CustomersContext: erro ao carregar clientes:', err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [user, userProfile?.role, authLoading]);

  return (
    <CustomersContext.Provider value={{ allCustomers, loading }}>
      {children}
    </CustomersContext.Provider>
  );
}

export function useCustomersContext() {
  const ctx = useContext(CustomersContext);
  if (!ctx) {
    throw new Error('useCustomersContext must be used inside CustomersProvider');
  }
  return ctx;
}

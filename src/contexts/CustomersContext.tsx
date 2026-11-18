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

interface CustomersState {
  sessionKey: string | null;
  customers: Customer[];
  loading: boolean;
}

const CustomersContext = createContext<CustomersContextValue | null>(null);

export function CustomersProvider({ children }: { children: ReactNode }) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const profileMatchesUser = Boolean(user && userProfile?.uid === user.uid);
  const sessionKey = user
    ? `${user.uid}:${profileMatchesUser ? userProfile?.role ?? 'unknown' : 'pending-profile'}`
    : null;
  const [state, setState] = useState<CustomersState>({ sessionKey: null, customers: [], loading: true });

  useEffect(() => {
    if (!user) {
      setState({ sessionKey: null, customers: [], loading: authLoading });
      return;
    }

    if (!profileMatchesUser) {
      setState({ sessionKey, customers: [], loading: authLoading });
      return;
    }

    let active = true;
    setState({ sessionKey, customers: [], loading: true });

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
        if (!active) return;
        setState({
          sessionKey,
          loading: false,
          customers: snap.docs.map((d) => {
            const raw = d.data();
            return {
              ...(raw as Customer),
              id: d.id,
              createdAt:
                raw.createdAt?.toDate?.()?.toISOString() ??
                (typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()),
            };
          }),
        });
      },
      (err) => {
        if (!active) return;
        console.error('CustomersContext: erro ao carregar clientes:', err);
        setState({ sessionKey, customers: [], loading: false });
      },
    );

    return () => {
      active = false;
      unsub();
    };
  }, [user, userProfile?.uid, userProfile?.role, authLoading, profileMatchesUser, sessionKey]);

  const sessionMatches = state.sessionKey === sessionKey;
  const allCustomers = sessionMatches ? state.customers : [];
  const loading = !sessionMatches || state.loading;

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

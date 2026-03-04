// @refresh reset
/**
 * OrdersContext
 *
 * Mantém um único listener onSnapshot para pedidos, compartilhado por
 * todas as páginas (Dashboard, Agenda, Relatórios, NotificationBell…).
 * Evita abrir múltiplas conexões Firestore para os mesmos dados.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { Order } from '../app/types';

interface OrdersState {
  orders: Order[];
  loading: boolean;
  error: string | null;
}

const OrdersContext = createContext<OrdersState>({
  orders: [],
  loading: true,
  error: null,
});

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<OrdersState>({ orders: [], loading: true, error: null });

  useEffect(() => {
    if (!user) {
      setState({ orders: [], loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      where('deletedAt', '==', null),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const orders = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            orderNumber: data.orderNumber,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            customerId: data.customerId,
            productName: data.productName,
            quantity: data.quantity,
            price: data.price,
            status: data.status,
            deliveryDate: data.deliveryDate,
            notes: data.notes,
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate().toISOString()
              : data.createdAt,
            updatedAt: data.updatedAt,
            tags: data.tags,
            payment: data.payment,
            productionWorkflow: data.productionWorkflow,
            attachments: data.attachments,
            isExchange: data.isExchange ?? false,
            exchangeNotes: data.exchangeNotes,
            exchangeItems: data.exchangeItems,
            cardColor: data.cardColor,
          } as Order;
        });
        setState({ orders, loading: false, error: null });
      },
      (err) => {
        console.error('OrdersContext: erro no snapshot:', err);
        setState(prev => ({ ...prev, loading: false, error: err.message }));
      }
    );

    return () => unsubscribe();
  }, [user]);

  return <OrdersContext.Provider value={state}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  return useContext(OrdersContext);
}

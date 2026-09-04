// @refresh reset
/**
 * OrdersContext
 *
 * Mantém um único listener onSnapshot para pedidos, compartilhado por
 * todas as páginas (Dashboard, Agenda, Relatórios, NotificationBell…).
 * Evita abrir múltiplas conexões Firestore para os mesmos dados.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { collection, query, where, orderBy, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
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
  const { user, userProfile } = useAuth();
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

    const mapSnapshot = (snapshot: QuerySnapshot<DocumentData>): Order[] => snapshot.docs.map(doc => {
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
            createdByName: data.createdByName,
            assignedTo: data.assignedTo,
            assignedToName: data.assignedToName,
            assignedAt: data.assignedAt,
            assignedBy: data.assignedBy,
            productionWorkflow: data.productionWorkflow,
            attachments: data.attachments,
            isExchange: data.isExchange ?? false,
            exchangeNotes: data.exchangeNotes,
            exchangeItems: data.exchangeItems,
            cardColor: data.cardColor,
            userId: data.userId,
          } as Order;
        });

    let ownOrders: Order[] = [];
    let assignedOrders: Order[] = [];
    const publish = () => {
      const ordersById = new Map<string, Order>();
      [...ownOrders, ...assignedOrders].forEach(order => ordersById.set(order.id, order));
      const orders = [...ordersById.values()].sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt))
      );
      setState({ orders, loading: false, error: null });
    };

    const unsubscribers = [onSnapshot(
      ordersQuery,
      (snapshot) => {
        ownOrders = mapSnapshot(snapshot);
        publish();
      },
      (err) => {
        console.error('OrdersContext: erro no snapshot:', err);
        setState(prev => ({ ...prev, loading: false, error: err.message }));
      }
    )];

    if (userProfile?.role === 'funcionario') {
      const assignedQuery = query(
        collection(db, 'orders'),
        where('assignedTo', '==', user.uid),
        where('deletedAt', '==', null),
        orderBy('createdAt', 'desc')
      );
      unsubscribers.push(onSnapshot(
        assignedQuery,
        (snapshot) => {
          assignedOrders = mapSnapshot(snapshot);
          publish();
        },
        (err) => {
          console.error('OrdersContext: erro nos pedidos atribuídos:', err);
          setState(prev => ({ ...prev, loading: false, error: err.message }));
        }
      ));
    }

    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [user, userProfile?.role]);

  return <OrdersContext.Provider value={state}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  return useContext(OrdersContext);
}

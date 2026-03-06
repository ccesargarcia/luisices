// @refresh reset
/**
 * OrdersContext
 *
 * Mantém um único listener onSnapshot para pedidos, compartilhado por
 * todas as páginas (Dashboard, Agenda, Relatórios, NotificationBell…).
 * Evita abrir múltiplas conexões Firestore para os mesmos dados.
 * 
 * Agora também inclui pedidos compartilhados por outros usuários.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { collection, query, where, orderBy, onSnapshot, Query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { Order } from '../app/types';
import { firebaseSharedAccessService } from '../services/firebaseSharedAccessService';

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

    let unsubscribeOwn: (() => void) | null = null;
    let unsubscribeShared: (() => void) | null = null;

    const ownOrders: Order[] = [];
    const sharedOrders: Order[] = [];
    let ownLoaded = false;
    let sharedLoaded = false;

    const updateState = () => {
      if (ownLoaded && sharedLoaded) {
        // Combinar pedidos próprios e compartilhados, removendo duplicatas
        const allOrders = [...ownOrders];
        
        // Adicionar pedidos compartilhados que não são do próprio usuário
        sharedOrders.forEach(order => {
          if (order.userId !== user.uid && !allOrders.find(o => o.id === order.id)) {
            allOrders.push(order);
          }
        });

        // Ordenar por data de criação (mais recente primeiro)
        allOrders.sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });

        setState({ orders: allOrders, loading: false, error: null });
      }
    };

    // Listener para pedidos próprios
    const ownOrdersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      where('deletedAt', '==', null),
      orderBy('createdAt', 'desc')
    );

    unsubscribeOwn = onSnapshot(
      ownOrdersQuery,
      (snapshot) => {
        ownOrders.length = 0;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          ownOrders.push({
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
            userId: data.userId,
          } as Order);
        });
        ownLoaded = true;
        updateState();
      },
      (err) => {
        console.error('OrdersContext: erro no snapshot próprio:', err);
        setState(prev => ({ ...prev, loading: false, error: err.message }));
      }
    );

    // Buscar usuários que compartilharam pedidos e criar listeners
    firebaseSharedAccessService.getUsersWhoSharedWithMe('orders').then(sharedUserIds => {
      if (sharedUserIds.length === 0) {
        sharedLoaded = true;
        updateState();
        return;
      }

      // Criar queries para pedidos compartilhados
      // Nota: Firestore tem limite de 10 itens em "in", então vamos fazer batches se necessário
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < sharedUserIds.length; i += batchSize) {
        batches.push(sharedUserIds.slice(i, i + batchSize));
      }

      const unsubscribeFns: (() => void)[] = [];

      batches.forEach(batch => {
        const sharedQuery = query(
          collection(db, 'orders'),
          where('userId', 'in', batch),
          where('deletedAt', '==', null),
          orderBy('createdAt', 'desc')
        );

        const unsub = onSnapshot(
          sharedQuery,
          (snapshot) => {
            // Atualizar apenas os pedidos deste batch
            snapshot.docs.forEach(doc => {
              const data = doc.data();
              const existingIndex = sharedOrders.findIndex(o => o.id === doc.id);
              const order = {
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
                userId: data.userId,
              } as Order;

              if (existingIndex >= 0) {
                sharedOrders[existingIndex] = order;
              } else {
                sharedOrders.push(order);
              }
            });
            sharedLoaded = true;
            updateState();
          },
          (err) => {
            console.error('OrdersContext: erro no snapshot compartilhado:', err);
          }
        );

        unsubscribeFns.push(unsub);
      });

      unsubscribeShared = () => {
        unsubscribeFns.forEach(fn => fn());
      };
    }).catch(err => {
      console.error('OrdersContext: erro ao buscar compartilhamentos:', err);
      sharedLoaded = true;
      updateState();
    });

    return () => {
      if (unsubscribeOwn) unsubscribeOwn();
      if (unsubscribeShared) unsubscribeShared();
    };
  }, [user]);

  return <OrdersContext.Provider value={state}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  return useContext(OrdersContext);
}

/**
 * useFirebaseOrders Hook
 *
 * Hook React para buscar pedidos em tempo real do Firestore
 * Filtra automaticamente por userId do usuário autenticado
 */

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Order } from '../app/types';

export function useFirebaseOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar autenticação
    const user = auth.currentUser;
    if (!user) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    // Query com filtro por userId
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      where('deletedAt', '==', null),
      orderBy('createdAt', 'desc')
    );

    // Listener real-time
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const ordersData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            productName: data.productName,
            quantity: data.quantity,
            price: data.price,
            status: data.status,
            deliveryDate: data.deliveryDate,
            notes: data.notes,
            createdAt: data.createdAt?.toDate().toISOString(),
            tags: data.tags,
          } as Order;
        });

        setOrders(ordersData);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao buscar pedidos:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Cleanup: cancelar listener quando componente desmontar
    return () => unsubscribe();
  }, []);

  return { orders, loading, error };
}

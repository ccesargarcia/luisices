/**
 * useFirebaseOrders Hook
 *
 * Wrapper de compatibilidade sobre o OrdersContext.
 * Todos os componentes continuam usando esta API — a diferença é que
 * agora existe apenas um único listener Firestore para toda a aplicação.
 */

import { useOrders } from '../contexts/OrdersContext';

export function useFirebaseOrders() {
  return useOrders();
}

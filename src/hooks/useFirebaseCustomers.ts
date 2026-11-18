import { useMemo } from 'react';
import { useCustomersContext } from '../contexts/CustomersContext';
import { useOrders } from '../contexts/OrdersContext';

export function useFirebaseCustomers() {
  const { allCustomers, loading } = useCustomersContext();
  const { selectedUserIds, isFilterActive } = useOrders();

  // Se o admin tiver selecionado parceiro(s) específico(s), filtra reativamente em memória
  const customers = useMemo(() => {
    if (!isFilterActive || !selectedUserIds || selectedUserIds.length === 0) {
      return allCustomers;
    }
    return allCustomers.filter((c) => c.userId && selectedUserIds.includes(c.userId));
  }, [allCustomers, isFilterActive, selectedUserIds]);

  return { customers, allCustomers, loading };
}

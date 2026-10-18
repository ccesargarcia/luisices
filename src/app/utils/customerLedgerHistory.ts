import type { Customer, Order, SaleRecord } from '../types';

/** Reutiliza o ledger carregado; não abre consultas por cliente. */
export function ledgerSaleToOrder(sale: SaleRecord): Order {
  return {
    id: sale.orderId || sale.id,
    userId: sale.userId,
    customerId: sale.customerId || undefined,
    customerName: sale.customerName,
    productName: sale.productName,
    quantity: sale.quantity,
    price: sale.amount,
    status: sale.status,
    createdAt: sale.date || sale.createdAt,
    deliveryDate: sale.deliveryDate,
    payment: { status: sale.paymentStatus, paidAmount: sale.paidAmount, method: sale.paymentMethod },
  } as Order;
}

export function groupCustomerLedgerHistory(customers: Customer[], sales: SaleRecord[]): Map<string, Order[]> {
  const owners = new Map(customers.map((customer) => [customer.id, customer.userId]));
  const grouped = new Map<string, Order[]>();
  for (const sale of sales) {
    if (!sale.customerId || !sale.userId || owners.get(sale.customerId) !== sale.userId) continue;
    const history = grouped.get(sale.customerId) || [];
    history.push(ledgerSaleToOrder(sale));
    grouped.set(sale.customerId, history);
  }
  return grouped;
}

/** Conta apenas pedidos que ainda bloqueiam a exclusão do cliente. */
export function countOpenOrdersByCustomer(sales: SaleRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const sale of sales) {
    if (
      sale.isDeletedFromOrders
      || !sale.customerId
      || sale.status === 'completed'
      || sale.status === 'cancelled'
    ) continue;

    counts[sale.customerId] = (counts[sale.customerId] || 0) + 1;
  }
  return counts;
}

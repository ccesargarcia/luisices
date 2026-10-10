import { describe, expect, it } from 'vitest';
import type { Customer, SaleRecord } from '../../src/app/types';
import { groupCustomerLedgerHistory } from '../../src/app/utils/customerLedgerHistory';
import { computeCustomerXRay } from '../../src/app/utils/customerMetrics';
const customer = { id: 'client', userId: 'a', name: 'Maria', totalSpent: 9000, totalOrders: 99 } as Customer;
const sale = (changes: Partial<SaleRecord> = {}) => ({
  id: 'sale', orderId: 'order', userId: 'a', customerId: 'client', customerName: 'Maria',
  date: '2025-01-10T12:00:00Z', status: 'completed', amount: 10, paidAmount: 5,
  quantity: 1, productName: 'Caderno', paymentStatus: 'partial', paymentMethod: 'pix', ...changes,
}) as SaleRecord;
describe('Métricas de cliente a partir do ledger', () => {
  it('inclui mais de 200 vendas e pedidos antigos fora da lista operacional', () => {
    const sales = Array.from({ length: 250 }, (_, i) => sale({ id: `s${i}`, orderId: `o${i}` }));
    const history = groupCustomerLedgerHistory([customer], sales).get(customer.id)!;
    const metrics = computeCustomerXRay(customer, history, 'all', undefined, new Date('2026-10-10'), true);
    expect(metrics.totalRevenue).toBe(2500);
    expect(metrics.totalOrdersCount).toBe(250);
    expect(metrics.averageTicket).toBe(10);
  });
  it('não associa parceiro diferente, cliente homônimo ou venda sem vínculo', () => {
    const history = groupCustomerLedgerHistory([customer], [sale(), sale({ userId: 'b' }), sale({ customerId: 'other' }), sale({ customerId: null })]);
    expect(history.get('client')).toHaveLength(1);
  });
  it('histórico completo vazio não recupera totais antigos do cadastro', () => {
    const metrics = computeCustomerXRay(customer, [], 'all', undefined, new Date(), true);
    expect(metrics.totalRevenue).toBe(0);
    expect(metrics.totalOrdersCount).toBe(0);
  });
  it('cancelados não elevam classificação e pagamentos parciais são preservados', () => {
    const history = groupCustomerLedgerHistory([customer], [sale(), sale({ status: 'cancelled', amount: 1000 })]).get('client')!;
    expect(history[0].payment?.paidAmount).toBe(5);
    const metrics = computeCustomerXRay(customer, history, 'all', undefined, new Date(), true);
    expect(metrics.totalRevenue).toBe(10);
    expect(metrics.totalOrdersCount).toBe(1);
  });
  it('o período selecionado não inclui vendas antigas no faturamento', () => {
    const history = groupCustomerLedgerHistory([customer], [sale()]).get('client')!;
    expect(computeCustomerXRay(customer, history, '30d', undefined, new Date('2026-10-10'), true).totalRevenue).toBe(0);
  });
});

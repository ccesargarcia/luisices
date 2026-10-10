import { describe, expect, it, vi } from 'vitest';
import { computeMonthlyRollup } from '../../src/services/firebaseMonthlyRollupService';
import type { SaleRecord } from '../../src/app/types';
vi.mock('../../src/lib/firebase', () => ({ db: {}, auth: { currentUser: { uid: 'a' } } }));
const sale = (changes: Partial<SaleRecord> = {}) => ({
  id: 'sale', userId: 'a', date: '2026-09-10T12:00:00Z', status: 'completed',
  amount: 500, paidAmount: 0, paymentStatus: 'pending', productName: 'Caderno', ...changes,
}) as SaleRecord;
const rollup = (sales: SaleRecord[]) => computeMonthlyRollup('2026-09', 'a', sales);
describe('Integridade financeira mensal', () => {
  it('não consolida vendas de outro parceiro nem sem proprietário', () => {
    const result = rollup([sale(), sale({ userId: 'b', amount: 900 }), sale({ userId: undefined })]);
    expect(result.totalRevenue).toBe(500);
    expect(result.totalOrders).toBe(1);
  });
  it('pedido concluído não significa pagamento recebido', () => {
    const result = rollup([sale()]);
    expect(result.totalRevenue).toBe(500);
    expect(result.totalPaid).toBe(0);
    expect(result.totalPending).toBe(500);
  });
  it('status pago sem valor registrado não inventa recebimento', () => {
    expect(rollup([sale({ paymentStatus: 'paid' })]).totalPaid).toBe(0);
  });
  it('preserva pagamento parcial', () => {
    const result = rollup([sale({ paidAmount: 125, paymentMethod: 'pix' })]);
    expect(result.totalPaid).toBe(125);
    expect(result.totalPending).toBe(375);
    expect(result.settlementRate).toBe(25);
  });
  it('soma centavos sem resíduos de ponto flutuante', () => {
    const result = rollup([sale({ amount: 0.1, paidAmount: 0.1 }), sale({ amount: 0.2, paidAmount: 0.2 })]);
    expect(result.totalRevenue).toBe(0.3);
    expect(result.totalPaid).toBe(0.3);
  });
  it.each([NaN, Infinity, -1])('rejeita valor inválido %s', (amount) => {
    expect(() => rollup([sale({ amount })])).toThrow('Valor financeiro inválido');
  });
  it('exige conciliação de pagamento acima do pedido', () => {
    expect(() => rollup([sale({ paidAmount: 501 })])).toThrow('exige conciliação');
  });
  it('cancelado não compõe recebimentos ou ranking', () => {
    const result = rollup([sale({ status: 'cancelled', paidAmount: 500 })]);
    expect(result.cancelledAmount).toBe(500);
    expect(result.totalPaid).toBe(0);
    expect(result.topProducts).toEqual([]);
  });
  it('valida mês e parceiro', () => {
    expect(() => computeMonthlyRollup('2026-13', 'a', [])).toThrow('Mês inválido');
    expect(() => computeMonthlyRollup('2026-09', '../a', [])).toThrow('Parceiro inválido');
  });
});

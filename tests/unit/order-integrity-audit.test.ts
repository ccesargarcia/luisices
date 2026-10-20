import { describe, expect, it } from 'vitest';
import { auditOrderData } from '../../scripts/order-integrity-audit-core.mjs';

describe('auditoria de integridade de pedidos', () => {
  it('não aponta divergências em pedido com itens e pagamento consistentes', () => {
    const issues = auditOrderData({
      price: 300,
      quantity: 3,
      version: 1,
      pricingMode: 'items',
      unitPrice: null,
      items: [
        { name: 'Caderno', quantity: 2, unitPrice: 120, price: 240 },
        { name: 'Adesivo', quantity: 1, unitPrice: 60, price: 60 },
      ],
      payment: {
        totalAmount: 300,
        paidAmount: 50,
        remainingAmount: 250,
        status: 'partial',
        method: 'pix',
      },
    });

    expect(issues).toEqual([]);
  });

  it('identifica valor unitário com frações de centavo possivelmente calculado do total', () => {
    const issues = auditOrderData({
      price: 92.19,
      quantity: 120,
      version: 2,
      pricingMode: 'total',
      unitPrice: 0.7682724252491694,
    });

    expect(issues.map((issue) => issue.code)).toContain('unit_price_has_subcent_precision');
    expect(issues.map((issue) => issue.code)).toContain('unit_price_may_be_derived_from_total');
  });

  it('classifica pedido sem versão como legado para revisão, sem tratá-lo como gravação inválida', () => {
    const issues = auditOrderData({ price: 10, quantity: 1 });

    expect(issues).toEqual([
      expect.objectContaining({ code: 'legacy_order_without_version', severity: 'info' }),
    ]);
  });

  it('detecta pagamento cujo saldo e status não correspondem aos valores', () => {
    const issues = auditOrderData({
      price: 100,
      quantity: 1,
      version: 1,
      payment: {
        totalAmount: 100,
        paidAmount: 30,
        remainingAmount: 60,
        status: 'paid',
        method: 'pix',
      },
    });

    expect(issues.map((issue) => issue.code)).toContain('invalid_remaining_amount');
    expect(issues.map((issue) => issue.code)).toContain('payment_status_mismatch');
  });
});

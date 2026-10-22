import { describe, expect, it } from 'vitest';
import { calculatePaymentBalance } from '../../src/app/utils/financialMath';

describe('cálculo financeiro de pagamentos', () => {
  it('não considera pedido concluído como pagamento', () => {
    expect(calculatePaymentBalance(120, 0, 'pending')).toEqual({
      paidAmount: 0,
      remainingAmount: 120,
    });
  });

  it('considera quitado apenas quando o status do pagamento é paid', () => {
    expect(calculatePaymentBalance(120, 0, 'paid')).toEqual({
      paidAmount: 120,
      remainingAmount: 0,
    });
  });

  it('arredonda para centavos e limita o recebido ao total', () => {
    expect(calculatePaymentBalance(10.005, 12, 'partial')).toEqual({
      paidAmount: 10.01,
      remainingAmount: 0,
    });
    expect(calculatePaymentBalance(10, 3.335, 'partial')).toEqual({
      paidAmount: 3.34,
      remainingAmount: 6.66,
    });
  });

  it('trata valores negativos ou inválidos como zero', () => {
    expect(calculatePaymentBalance(-10, Number.NaN, 'partial')).toEqual({
      paidAmount: 0,
      remainingAmount: 0,
    });
  });
});

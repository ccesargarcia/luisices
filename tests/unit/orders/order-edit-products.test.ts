import { describe, expect, it } from 'vitest';
import { parseDecimalMoneyInput } from '../../../src/app/utils/parseDecimalMoneyInput';
import { reconstructOrderProducts } from '../../../src/app/utils/reconstructOrderProducts';

describe('reconstructOrderProducts', () => {
  it('preserves total and paid amount when reopening a multi-item order for editing', () => {
    const savedOrder = {
      productName: 'Caderno (2x), Adesivo (1x)',
      quantity: 3,
      price: 300,
      payment: { paidAmount: 120 },
    };

    const editProducts = reconstructOrderProducts(
      savedOrder.productName,
      savedOrder.quantity,
      savedOrder.price,
    );
    const editedTotal = editProducts.reduce(
      (sum, product) => sum + Number(product.quantity) * (parseDecimalMoneyInput(product.unitPrice) ?? 0),
      0,
    );

    expect(editProducts).toEqual([
      { name: 'Caderno', quantity: '2', unitPrice: '100,00' },
      { name: 'Adesivo', quantity: '1', unitPrice: '100,00' },
    ]);
    expect(editedTotal).toBe(savedOrder.price);
    // Resetting the product rows does not clear the payment state held by the modal.
    expect(savedOrder.payment.paidAmount).toBe(120);
  });

  it('formats fractional unit prices as BRL cents for large quantities', () => {
    const products = reconstructOrderProducts('Etiqueta', 120, 92.19);

    expect(products).toEqual([
      { name: 'Etiqueta', quantity: '120', unitPrice: '0,77' },
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { reconstructOrderProducts } from '../../../src/app/utils/reconstructOrderProducts';

describe('reconstructOrderProducts', () => {
  it('does not invent equal unit prices for a multi-item order', () => {
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
    expect(editProducts).toEqual([
      { name: 'Caderno', quantity: '2', unitPrice: '' },
      { name: 'Adesivo', quantity: '1', unitPrice: '' },
    ]);
    expect(savedOrder.payment.paidAmount).toBe(120);
  });

  it('does not round a fractional-cent average into a false unit price', () => {
    const products = reconstructOrderProducts('Etiqueta', 120, 92.19);

    expect(products).toEqual([
      { name: 'Etiqueta', quantity: '120', unitPrice: '' },
    ]);
  });

  it('uses an exact unit price recorded by voice order metadata', () => {
    const products = reconstructOrderProducts('Galinha (45x), tes (48x)', 93, 255.75, 2.75);

    expect(products.map(product => product.unitPrice)).toEqual(['2,75', '2,75']);
  });

  it('formats an inferred price as BRL when one product total divides exactly into cents', () => {
    const products = reconstructOrderProducts('Caderno', 3, 300);

    expect(products).toEqual([
      { name: 'Caderno', quantity: '3', unitPrice: '100,00' },
    ]);
  });

  it('preserves exact unit prices from storedItems for multi-item orders with different prices', () => {
    const storedItems = [
      { name: 'Caderno Personalizado', quantity: 2, unitPrice: 125.5 },
      { name: 'Adesivo Vinil', quantity: 5, unitPrice: 9.9 },
    ];

    const products = reconstructOrderProducts(
      'Caderno Personalizado (2x), Adesivo Vinil (5x)',
      7,
      300.5,
      null,
      storedItems,
    );

    expect(products).toEqual([
      { name: 'Caderno Personalizado', quantity: '2', unitPrice: '125,50' },
      { name: 'Adesivo Vinil', quantity: '5', unitPrice: '9,90' },
    ]);
  });

  it('recovers unit prices embedded in legacy productName text', () => {
    const products = reconstructOrderProducts(
      'Caneca Cerâmica (2x) - R$ 35,50, Caneta Metal (1x) - R$ 12,00',
      3,
      83,
    );

    expect(products).toEqual([
      { name: 'Caneca Cerâmica', quantity: '2', unitPrice: '35,50' },
      { name: 'Caneta Metal', quantity: '1', unitPrice: '12,00' },
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { validateToolArguments } from '../../functions/mcp/validation.js';

describe('MCP tool request validation', () => {
  it('requires idempotency keys for create order calls', () => {
    expect(() => validateToolArguments('create_order', {
      customerName: 'Cliente', productName: 'Convite', quantity: 1, totalPrice: 50, deliveryDate: '2030-01-01',
    })).toThrow(/idempotencyKey/);
  });

  it('rejects unknown properties instead of forwarding them to business tools', () => {
    expect(() => validateToolArguments('query_orders_view', { searchTerm: 'pedido', userId: 'outro-usuario' }))
      .toThrow(/não permitido/);
  });

  it('rejects incorrect types, out of range values and over-sized input', () => {
    expect(() => validateToolArguments('register_order_payment', {
      orderNumber: 'PED-1', amount: 'dez', method: 'pix', idempotencyKey: 'payment-123', confirmed: true,
    })).toThrow(/valor válido/);
    expect(() => validateToolArguments('query_orders_view', { limit: 500 }))
      .toThrow(/máximo|excede/);
    expect(() => validateToolArguments('query_orders_view', { searchTerm: 'x'.repeat(33 * 1024) }))
      .toThrow(/limite de caracteres/);
  });

  it('accepts valid structured payment arguments', () => {
    expect(validateToolArguments('register_order_payment', {
      orderNumber: '#2030-0001', amount: 25, method: 'pix', idempotencyKey: 'payment-123', confirmed: false,
    })).toMatchObject({ amount: 25, method: 'pix' });
  });

  it.each([
    ['25,50', 25.5],
    ['25.50', 25.5],
    ['1.234,56', 1234.56],
    ['R$ 1.234,56', 1234.56],
    [',50', 0.5],
  ])('normalizes localized money for order editing: %s', (input, expected) => {
    const result = validateToolArguments('update_order', { orderNumber: '#2030-0001', totalPrice: input });
    expect(result.totalPrice).toBe(expected);
  });

  it('normalizes localized amounts for payment registration too', () => {
    const payment = validateToolArguments('register_order_payment', {
      orderNumber: '#2030-0001', amount: 'R$ 12,50', method: 'pix', idempotencyKey: 'payment-123',
    });
    expect(payment.amount).toBe(12.5);
  });

  it('accepts localized prices when creating orders and drafting them', () => {
    const create = validateToolArguments('create_order', {
      customerName: 'Cliente', productName: 'Convite', quantity: 1, totalPrice: 'R$ 80,75',
      paidAmount: '10,25', deliveryDate: '2030-01-01', idempotencyKey: 'create-order-123',
    });
    const draft = validateToolArguments('extract_order_draft', {
      customerName: 'Cliente', productName: 'Convite', quantity: 1, totalPrice: '80.75',
    });
    expect(create).toMatchObject({ totalPrice: 80.75, paidAmount: 10.25 });
    expect(draft.totalPrice).toBe(80.75);
  });

  it('rejects malformed localized amounts and preserves payment range checks', () => {
    expect(() => validateToolArguments('update_order', { orderNumber: '#2030-0001', totalPrice: '12,345' }))
      .toThrow(/valor válido/);
    expect(() => validateToolArguments('register_order_payment', {
      orderNumber: '#2030-0001', amount: '0,00', method: 'pix', idempotencyKey: 'payment-123',
    })).toThrow(/maior que o mínimo/);
  });
});

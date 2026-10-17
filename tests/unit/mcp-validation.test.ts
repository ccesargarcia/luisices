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
      orderNumber: 'PED-1', amount: '10', method: 'pix', idempotencyKey: 'payment-123', confirmed: true,
    })).toThrow(/número finito/);
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
});

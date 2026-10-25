import { describe, expect, it } from 'vitest';
import { validateComplexOrderUpdate } from '../../functions/orders/index.js';

const ownerProfile = {
  role: 'user',
  active: true,
  permissions: { orders: { edit: true } },
};

function orderWithItems(count: number) {
  const items = Array.from({ length: count }, (_, index) => ({
    name: `Produto ${index + 1}`,
    quantity: index === 0 ? 2 : 1,
    unitPrice: 10,
    price: index === 0 ? 20 : 10,
  }));
  return {
    userId: 'owner',
    orderNumber: '#2026-1000',
    customerName: 'Cliente',
    productName: 'Produtos',
    quantity: count + 1,
    price: (count + 1) * 10,
    status: 'in-progress',
    items,
    payment: {
      status: 'pending',
      method: 'pix',
      totalAmount: (count + 1) * 10,
      paidAmount: 0,
      remainingAmount: (count + 1) * 10,
    },
    version: 7,
  };
}

describe('validação de edição complexa de pedido no servidor', () => {
  it.each(Array.from({ length: 10 }, (_, index) => index + 1))(
    'aceita total e quantidade exatos com %i item(ns)',
    (count) => {
      const order = orderWithItems(count);
      const next = validateComplexOrderUpdate({
        items: order.items,
        quantity: order.quantity,
        price: order.price,
        payment: order.payment,
      }, order, 'owner', ownerProfile);
      expect(next.items).toHaveLength(count);
      expect(next.quantity).toBe(count + 1);
      expect(next.price).toBe((count + 1) * 10);
    },
  );

  it.each(Array.from({ length: 10 }, (_, index) => index + 1))(
    'rejeita total adulterado com %i item(ns)',
    (count) => {
      const order = orderWithItems(count);
      expect(() => validateComplexOrderUpdate({
        items: order.items,
        quantity: order.quantity,
        price: order.price + 1,
        payment: { ...order.payment, totalAmount: order.price + 1, remainingAmount: order.price + 1 },
      }, order, 'owner', ownerProfile)).toThrow(/quantidade e o total/);
    },
  );

  it.each(Array.from({ length: 10 }, (_, index) => index + 1))(
    'rejeita quantidade adulterada com %i item(ns)',
    (count) => {
      const order = orderWithItems(count);
      expect(() => validateComplexOrderUpdate({
        items: order.items,
        quantity: order.quantity + 1,
        price: order.price,
        payment: order.payment,
      }, order, 'owner', ownerProfile)).toThrow(/quantidade e o total/);
    },
  );

  it('nega usuário sem permissão, perfil inativo e alteração de campo privilegiado', () => {
    const order = orderWithItems(5);
    const updates = { items: order.items, quantity: order.quantity, price: order.price, payment: order.payment };
    expect(() => validateComplexOrderUpdate(updates, order, 'owner', {
      ...ownerProfile, permissions: { orders: { edit: false } },
    })).toThrow(/permissão/);
    expect(() => validateComplexOrderUpdate(updates, order, 'owner', {
      ...ownerProfile, active: false,
    })).toThrow(/permissão/);
    expect(() => validateComplexOrderUpdate({ ...updates, userId: 'attacker' }, order, 'owner', ownerProfile))
      .toThrow(/campos não permitidos/);
  });

  it('rejeita a remoção dos itens ao atualizar totais pela rota complexa', () => {
    const order = orderWithItems(5);
    expect(() => validateComplexOrderUpdate({ items: null, price: order.price + 1 }, order, 'owner', ownerProfile))
      .toThrow(/1 a 10 itens/);
  });

  it('aceita permuta somente com pagamento zerado', () => {
    const order = orderWithItems(5);
    const updates = {
      items: order.items,
      isExchange: true,
      payment: { status: 'paid', method: null, totalAmount: 0, paidAmount: 0, remainingAmount: 0 },
    };
    expect(validateComplexOrderUpdate(updates, order, 'owner', ownerProfile).payment)
      .toMatchObject({ totalAmount: 0, paidAmount: 0, remainingAmount: 0 });
    expect(() => validateComplexOrderUpdate({
      ...updates,
      payment: { ...updates.payment, totalAmount: order.price, paidAmount: order.price, remainingAmount: 0 },
    }, order, 'owner', ownerProfile)).toThrow(/valores de pagamento/);
  });
});

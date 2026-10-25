import { describe, expect, it } from 'vitest';
import { validateComplexOrderUpdate, buildAuthoritativePaymentHistory } from '../../functions/orders/index.js';

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
      .toThrow(/Não é permitido remover os itens estruturados do pedido/);
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

  describe('buildAuthoritativePaymentHistory', () => {
    it('adiciona entrada positiva com a forma de pagamento do novo pagamento ao aumentar o valor pago', () => {
      const prevPayment = {
        status: 'partial',
        method: 'pix',
        totalAmount: 100,
        paidAmount: 40,
        remainingAmount: 60,
        history: [{ amount: 40, date: '2026-01-01', method: 'pix', notes: 'Inicial' }],
      };
      const nextPayment = { paidAmount: 70, method: 'cash' };
      const now = '2026-01-02T10:00:00.000Z';

      const result = buildAuthoritativePaymentHistory(prevPayment, nextPayment, now);
      expect(result.history).toHaveLength(2);
      expect(result.history[1]).toMatchObject({ amount: 30, method: 'cash', date: now });
      expect(result.appendedEntries).toHaveLength(1);
      expect(result.appendedEntries[0]).toMatchObject({ amount: 30, method: 'cash' });
    });

    it('consolida entradas excedentes por forma de pagamento sem perder valor nem classificação', () => {
      // Cria histórico prévio com 55 entradas (todas pix de R$ 1)
      const existingHistory = Array.from({ length: 55 }, (_, i) => ({
        amount: 1,
        date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
        method: 'pix',
        notes: `Parcela ${i + 1}`,
      }));
      const prevPayment = {
        status: 'partial',
        method: 'pix',
        totalAmount: 100,
        paidAmount: 55,
        remainingAmount: 45,
        history: existingHistory,
      };
      const nextPayment = { paidAmount: 60, method: 'cash' };
      const now = '2026-01-26T00:00:00.000Z';

      const result = buildAuthoritativePaymentHistory(prevPayment, nextPayment, now);
      // O documento principal permanece limitado a no máximo 50 eventos
      expect(result.history.length).toBeLessThanOrEqual(50);

      // A primeira entrada consolida os eventos mais antigos por método
      expect(result.history[0]).toMatchObject({
        method: 'pix',
        notes: expect.stringContaining('Consolidação de pagamentos anteriores'),
      });

      // A soma total do histórico consolidado é 100% fiel ao novo valor pago (R$ 60)
      const totalInHistory = result.history.reduce((sum, h) => sum + (h.amount || 0), 0);
      expect(totalInHistory).toBe(60);

      // A última entrada é a nova adição em dinheiro
      expect(result.history[result.history.length - 1]).toMatchObject({ amount: 5, method: 'cash', date: now });
      // A lista de eventos a gravar na subcoleção de auditoria contém a nova entrada completa
      expect(result.appendedEntries).toHaveLength(1);
      expect(result.appendedEntries[0]).toMatchObject({ amount: 5, method: 'cash' });
    });
  });
});

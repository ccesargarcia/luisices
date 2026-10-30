import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  order: {} as Record<string, any>,
  callable: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'user-1', email: 'owner@example.com' } },
  functions: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => state.callable),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn((_db, coll, id) => ({ coll, id })),
  getDocs: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => Object.keys(state.order).length > 0,
    data: () => state.order,
  })),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: { now: () => ({ toDate: () => new Date('2026-01-01') }) },
  runTransaction: state.transaction,
}));

import { firebaseOrderService } from '../../src/services/firebaseOrderService';

describe('Roteamento seguro das alterações financeiras de pedidos', () => {
  beforeEach(() => {
    state.order = { userId: 'user-1', version: 3, price: 100, quantity: 1 };
    state.callable.mockReset().mockResolvedValue({ data: { success: true } });
    state.transaction.mockReset();
  });

  it('encaminha alteração do pagamento ao backend mesmo em pedido com um item', async () => {
    state.order.payment = { status: 'pending', totalAmount: 100, paidAmount: 0, remainingAmount: 100 };
    await firebaseOrderService.updateOrder('order-1', {
      payment: { status: 'partial', totalAmount: 100, paidAmount: 40, remainingAmount: 60 } as any,
    });

    expect(state.callable).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 'order-1', expectedVersion: 3,
      updates: expect.objectContaining({ payment: expect.objectContaining({ paidAmount: 40 }) }),
    }));
    expect(state.transaction).not.toHaveBeenCalled();
  });

  it.each([1, 4, 5, 10])('encaminha mudança de total com %i item(ns) ao backend', async (itemCount) => {
    state.order.items = Array.from({ length: itemCount }, (_, index) => ({
      name: `Item ${index + 1}`, quantity: 1, unitPrice: 100 / itemCount, price: 100 / itemCount,
    }));
    await firebaseOrderService.updateOrder('order-1', { price: 120 });

    expect(state.callable).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 'order-1', updates: expect.objectContaining({ price: 120 }),
    }));
    expect(state.transaction).not.toHaveBeenCalled();
  });

  it('encaminha conversão de permuta ao backend', async () => {
    state.order.isExchange = false;
    await firebaseOrderService.updateOrder('order-1', { isExchange: true });

    expect(state.callable).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 'order-1', updates: expect.objectContaining({ isExchange: true }),
    }));
    expect(state.transaction).not.toHaveBeenCalled();
  });

  it('encaminha troca de cliente do pedido ao backend para reconciliar estatísticas', async () => {
    state.order.customerId = 'customer-old';
    await firebaseOrderService.updateOrder('order-1', { customerId: 'customer-new' });

    expect(state.callable).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 'order-1', updates: expect.objectContaining({ customerId: 'customer-new' }),
    }));
    expect(state.transaction).not.toHaveBeenCalled();
  });

  it('mantém atualização não financeira no fluxo transacional do cliente', async () => {
    state.transaction.mockImplementation(async (_db: unknown, callback: (transaction: any) => unknown) => callback({
      get: async () => ({ exists: () => true, data: () => state.order }),
      update: vi.fn(),
      set: vi.fn(),
    }));
    await firebaseOrderService.updateOrder('order-1', { notes: 'Observação' });

    expect(state.callable).not.toHaveBeenCalled();
    expect(state.transaction).toHaveBeenCalledTimes(1);
  });
});

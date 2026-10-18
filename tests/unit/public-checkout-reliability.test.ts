import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  docs: new Map<string, Record<string, any>>(),
  createOrder: vi.fn(),
}));

vi.mock('../../src/lib/firebase', () => ({ db: {}, functions: {} }));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, collection, id) => ({ path: `${collection}/${id}` })),
  getDoc: vi.fn(async (ref: { path: string }) => {
    const data = mocks.docs.get(ref.path);
    return { exists: () => data !== undefined, id: ref.path.split('/').at(-1), data: () => data };
  }),
}));

vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn() }));
vi.mock('../../src/services/firebaseOrderService', () => ({
  firebaseOrderService: { createOrder: (...args: any[]) => mocks.createOrder(...args) },
}));

import { firebaseCatalogOrderService } from '../../src/services/firebaseCatalogOrderService';

describe('Conversão segura de pedido legado da vitrine', () => {
  it('recalcula o valor pelo catálogo oficial antes de criar o pedido de produção', async () => {
    mocks.docs.clear();
    mocks.createOrder.mockReset().mockResolvedValue({ id: 'prod-order-789' });

    mocks.docs.set('catalogOrders/legacy-tampered-123', {
      orderCode: 'LJ-LEGACY',
      items: [{ productId: 'mug', productName: 'Caneca', price: 2.5, quantity: 2, leadTimeDays: 3 }],
      totalItems: 2,
      subtotal: 5,
      verifiedByServer: false,
      status: 'received',
    });
    mocks.docs.set('storeProducts/mug', { name: 'Caneca', price: 45 });

    await firebaseCatalogOrderService.convertToProductionOrder(
      { id: 'legacy-tampered-123' } as any,
      'Cliente Vitrine',
      '11999998888',
      '2026-10-10',
    );

    expect(mocks.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      price: 90,
      payment: expect.objectContaining({ totalAmount: 90, remainingAmount: 90 }),
      notes: expect.stringContaining('Caneca (2x)'),
    }), 'legacy-tampered-123');
  });

  it('não converte pedido legado se o produto não existir mais no catálogo', async () => {
    mocks.docs.clear();
    mocks.createOrder.mockReset();
    mocks.docs.set('catalogOrders/legacy-missing-product', {
      orderCode: 'LJ-OLD',
      items: [{ productId: 'deleted-product', productName: 'Produto removido', quantity: 1 }],
      subtotal: 20,
      verifiedByServer: false,
    });

    await expect(firebaseCatalogOrderService.convertToProductionOrder(
      { id: 'legacy-missing-product' } as any,
      'Cliente',
      '',
      '2026-10-10',
    )).rejects.toThrow('não existe no catálogo oficial');
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });
});

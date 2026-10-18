import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const documents = new Map<string, Record<string, any>>();
  const consume = vi.fn(async () => undefined);
  let autoId = 0;

  const makeRef = (path: string) => ({
    path,
    id: path.split('/').at(-1),
    get: async () => {
      const data = documents.get(path);
      return { exists: data !== undefined, id: path.split('/').at(-1), data: () => data };
    },
  });

  const db = {
    doc: (path: string) => makeRef(path),
    collection: (path: string) => ({
      doc: (id?: string) => makeRef(`${path}/${id || `auto-${++autoId}`}`),
    }),
    runTransaction: async (callback: (transaction: any) => Promise<any>) => {
      const writes: Array<{ path: string; data: Record<string, any> }> = [];
      const result = await callback({
        get: async (ref: { path: string; id: string }) => {
          const data = documents.get(ref.path);
          return { exists: data !== undefined, id: ref.id, data: () => data };
        },
        set: (ref: { path: string }, data: Record<string, any>) => writes.push({ path: ref.path, data }),
      });
      for (const write of writes) documents.set(write.path, write.data);
      return result;
    },
  };

  return { documents, consume, db };
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mocks.db,
  Timestamp: { now: () => ({ seconds: 1_800_000_000, toDate: () => new Date('2027-01-15T12:00:00Z') }) },
}));

vi.mock('../../functions/common/sentryFunctions', () => ({
  onCall: (...args: any[]) => ({ run: args.length === 1 ? args[0] : args[1] }),
}));

vi.mock('../../functions/common/rateLimiters', () => ({
  publicCatalogOrderLimiter: { consume: (...args: any[]) => mocks.consume(...args) },
}));

const { handleSubmitPublicCatalogOrder } = require('../../functions/orders/index');
const invokeCheckout = (data: Record<string, any>) => handleSubmitPublicCatalogOrder(request(data), {
  getFirestore: () => mocks.db,
  Timestamp: { now: () => ({ seconds: 1_800_000_000 }) },
  publicCatalogOrderLimiter: { consume: (...args: any[]) => mocks.consume(...args) },
});

const request = (data: Record<string, any>) => ({
  data,
  rawRequest: { ip: '203.0.113.10', headers: {} },
});

describe('submitPublicCatalogOrder callable real', () => {
  beforeEach(() => {
    mocks.documents.clear();
    mocks.consume.mockReset().mockResolvedValue(undefined);
    mocks.documents.set('storeSettings/public', {
      storePublished: true,
      catalogOrdersDisabled: false,
      catalogEnabled: true,
    });
    mocks.documents.set('storeProducts/mug', {
      name: 'Caneca',
      price: 45,
      status: 'active',
      leadTimeDays: 3,
    });
  });

  it('recalcula preço e total a partir do catálogo e persiste somente dados verificados', async () => {
    const result = await invokeCheckout({
      items: [{ productId: 'mug', quantity: 2, price: 0.01, productName: 'Adulterado', imageUrl: 'javascript:bad' }],
      submittedSubtotal: 90,
      customerNotes: '  entregar após as 14h  ',
      idempotencyKey: 'checkout-key-0001',
    });

    expect(result).toMatchObject({ subtotal: 90, totalItems: 2, verifiedByServer: true, isIdempotentReplay: false });
    const stored = mocks.documents.get(`catalogOrders/${result.orderId}`)!;
    expect(stored).toMatchObject({
      subtotal: 90,
      officialSubtotal: 90,
      submittedSubtotal: 90,
      verifiedByServer: true,
      customerNotes: 'entregar após as 14h',
      items: [{ productId: 'mug', productName: 'Caneca', price: 45, quantity: 2, leadTimeDays: 3 }],
    });
    expect(stored.items[0]).not.toHaveProperty('imageUrl');
    expect(stored.items[0]).not.toHaveProperty('productName', 'Adulterado');
    expect(mocks.consume).toHaveBeenCalledWith('203.0.113.10');
  });

  it.each(['90', 'not-a-number', null, Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'rejeita submittedSubtotal inválido: %s', async (submittedSubtotal) => {
      await expect(invokeCheckout({
        items: [{ productId: 'mug', quantity: 1 }],
        submittedSubtotal,
      })).rejects.toMatchObject({ code: 'invalid-argument' });
      expect([...mocks.documents.keys()].filter((key) => key.startsWith('catalogOrders/'))).toHaveLength(0);
    },
  );

  it.each(['short', 'k'.repeat(101), 123])('rejeita chave de idempotência inválida: %s', async (idempotencyKey) => {
    await expect(invokeCheckout({
      items: [{ productId: 'mug', quantity: 1 }],
      idempotencyKey,
    })).rejects.toMatchObject({ code: 'invalid-argument' });
    expect([...mocks.documents.keys()].filter((key) => key.startsWith('catalogOrders/'))).toHaveLength(0);
  });

  it('rejeita subtotal desatualizado e não grava pedido', async () => {
    await expect(invokeCheckout({
      items: [{ productId: 'mug', quantity: 1 }],
      submittedSubtotal: 10,
    })).rejects.toMatchObject({ code: 'aborted', details: { currentSubtotal: 45, submittedSubtotal: 10 } });
    expect([...mocks.documents.keys()].filter((key) => key.startsWith('catalogOrders/'))).toHaveLength(0);
  });

  it('garante replay idempotente e rejeita a mesma chave com conteúdo diferente', async () => {
    const data = { items: [{ productId: 'mug', quantity: 1 }], submittedSubtotal: 45, idempotencyKey: 'checkout-key-0002' };
    const first = await invokeCheckout(data);
    const replay = await invokeCheckout(data);
    expect(replay).toMatchObject({ orderId: first.orderId, isIdempotentReplay: true });
    expect([...mocks.documents.keys()].filter((key) => key.startsWith('catalogOrders/'))).toHaveLength(1);

    await expect(invokeCheckout({
      ...data,
      items: [{ productId: 'mug', quantity: 2 }],
      submittedSubtotal: 90,
    })).rejects.toMatchObject({ code: 'already-exists' });
  });

  it('falha fechado sem configuração da loja e quando o limitador bloqueia', async () => {
    mocks.documents.delete('storeSettings/public');
    await expect(invokeCheckout({ items: [{ productId: 'mug', quantity: 1 }] }))
      .rejects.toMatchObject({ code: 'failed-precondition' });

    mocks.consume.mockRejectedValueOnce(new Error('rate limited'));
    await expect(invokeCheckout({ items: [{ productId: 'mug', quantity: 1 }] }))
      .rejects.toMatchObject({ code: 'resource-exhausted' });
  });
});

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const settings = vi.fn();
  const products = vi.fn();
  const db = {
    doc: vi.fn(() => ({ get: settings })),
    collection: vi.fn(() => ({ select: vi.fn(() => ({ get: products })) })),
  };
  return { db, settings, products };
});

vi.mock('firebase-admin/firestore', () => ({ getFirestore: () => mocks.db }));
vi.mock('../../../functions/common/sentryFunctions', () => ({
  onCall: (...args: any[]) => ({ run: args.length === 1 ? args[0] : args[1] }),
}));

const { getPublicCatalogProducts } = require('../../../functions/orders/catalog');
const previousEmulatorFlag = process.env.FUNCTIONS_EMULATOR;

describe('getPublicCatalogProducts callable', () => {
  beforeEach(() => {
    vi.stubEnv('FUNCTIONS_EMULATOR', 'true');
    mocks.settings.mockReset().mockResolvedValue({
      exists: true,
      data: () => ({ storePublished: true }),
    });
    mocks.products.mockReset().mockResolvedValue({ docs: [] });
    mocks.db.doc.mockClear();
    mocks.db.collection.mockClear();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    if (previousEmulatorFlag === undefined) delete process.env.FUNCTIONS_EMULATOR;
    else process.env.FUNCTIONS_EMULATOR = previousEmulatorFlag;
  });

  it('returns no products and skips the product query when the store is unpublished', async () => {
    mocks.settings.mockResolvedValueOnce({ exists: false, data: () => ({}) });

    await expect(getPublicCatalogProducts.run({})).resolves.toEqual({ products: [] });
    expect(mocks.db.collection).not.toHaveBeenCalled();
  });

  it('returns only valid active/paused products with safe fields and cent precision', async () => {
    mocks.products.mockResolvedValueOnce({
      docs: [
        {
          id: 'active-product',
          data: () => ({
            name: 'Caixa personalizada', price: 12.345, status: 'active',
            category: 'Caixas', description: 'Descrição pública',
            imageUrl: '  https://example.com/image.jpg  ', leadTimeDays: 3,
            isCustomizable: false, order: 2, secretInternalField: 'never expose',
          }),
        },
        {
          id: 'paused-product',
          data: () => ({ name: 'Topo de bolo', unitPrice: 20, status: 'paused' }),
        },
        { id: 'hidden-product', data: () => ({ name: 'Oculto', price: 5, status: 'hidden' }) },
        { id: 'invalid-price', data: () => ({ name: 'Sem preço', price: 0, status: 'active' }) },
      ],
    });

    await expect(getPublicCatalogProducts.run({})).resolves.toEqual({
      products: [
        {
          id: 'active-product',
          name: 'Caixa personalizada',
          price: 12.35,
          category: 'Caixas',
          description: 'Descrição pública',
          imageUrl: 'https://example.com/image.jpg',
          leadTimeDays: 3,
          badge: undefined,
          isCustomizable: false,
          status: 'active',
          order: 2,
          createdAt: undefined,
        },
        {
          id: 'paused-product',
          name: 'Topo de bolo',
          price: 20,
          category: 'Geral',
          description: '',
          imageUrl: '',
          leadTimeDays: 5,
          badge: undefined,
          isCustomizable: true,
          status: 'paused',
          order: undefined,
          createdAt: undefined,
        },
      ],
    });
    expect(mocks.db.collection).toHaveBeenCalledWith('storeProducts');
    expect(mocks.db.collection().select).toHaveBeenCalledWith(
      'name', 'price', 'unitPrice', 'category', 'description', 'imageUrl', 'photoUrl', 'images',
      'leadTimeDays', 'badge', 'isCustomizable', 'active', 'status', 'order', 'createdAt',
    );
  });
});

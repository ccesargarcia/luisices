import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleGetPublicCatalogProducts } = require('../../../functions/orders/catalog');
const mocks = vi.hoisted(() => ({
  settings: vi.fn(), products: vi.fn(), select: vi.fn(), getFirestore: vi.fn(),
}));
const db = {
  doc: vi.fn(() => ({ get: mocks.settings })),
  collection: vi.fn(() => ({ select: mocks.select })),
};

describe('getPublicCatalogProducts callable', () => {
  beforeEach(() => {
    mocks.settings.mockReset().mockResolvedValue({
      exists: true,
      data: () => ({ storePublished: true }),
    });
    mocks.products.mockReset().mockResolvedValue({ docs: [] });
    mocks.select.mockReset().mockImplementation(() => ({ get: mocks.products }));
    mocks.getFirestore.mockReset().mockReturnValue(db);
    db.doc.mockClear();
    db.collection.mockClear();
  });

  it('returns no products and skips the product query when the store is unpublished', async () => {
    mocks.settings.mockResolvedValueOnce({ exists: false, data: () => ({}) });

    await expect(handleGetPublicCatalogProducts({}, {
      getFirestore: mocks.getFirestore,
      isEmulator: true,
    })).resolves.toEqual({ products: [] });
    expect(db.collection).not.toHaveBeenCalled();
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

    await expect(handleGetPublicCatalogProducts({}, {
      getFirestore: mocks.getFirestore,
      isEmulator: true,
    })).resolves.toEqual({
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
    expect(db.collection).toHaveBeenCalledWith('storeProducts');
    expect(mocks.select).toHaveBeenCalledWith(
      'name', 'price', 'unitPrice', 'category', 'description', 'imageUrl', 'photoUrl', 'images',
      'leadTimeDays', 'badge', 'isCustomizable', 'active', 'status', 'order', 'createdAt',
    );
  });
});

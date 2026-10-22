import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDoc: vi.fn(),
  runTransaction: vi.fn(),
}));

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'owner-1' } },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, name: string) => ({ name })),
  doc: vi.fn((_db: unknown, ...parts: string[]) => ({ id: parts.at(-1), path: parts.join('/') })),
  addDoc: mocks.addDoc,
  updateDoc: mocks.updateDoc,
  getDoc: mocks.getDoc,
  runTransaction: mocks.runTransaction,
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: { now: () => 'mock-timestamp' },
}));

import { firebaseQuoteService } from '../../src/services/firebaseQuoteService';

describe('Validação do serviço de orçamentos', () => {
  const storedQuote = {
    userId: 'owner-1',
    customerName: 'Cliente',
    status: 'draft',
    items: [{ name: 'Produto', quantity: 1, unitPrice: 100 }],
    discount: 0,
    discountType: 'percent',
    totalPrice: 100,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => storedQuote });
  });

  it('bloqueia criação com total incompatível antes de qualquer gravação', async () => {
    await expect(firebaseQuoteService.createQuote({
      customerName: 'Cliente',
      items: storedQuote.items,
      totalPrice: 99,
    })).rejects.toThrow(/total informado não confere/i);

    expect(mocks.runTransaction).not.toHaveBeenCalled();
    expect(mocks.addDoc).not.toHaveBeenCalled();
  });

  it('bloqueia edição financeira cujo total não corresponde aos itens', async () => {
    await expect(firebaseQuoteService.updateQuote('quote-1', {
      items: [{ name: 'Produto', quantity: 2, unitPrice: 100 }],
      totalPrice: 150,
    })).rejects.toThrow(/total informado não confere/i);

    expect(mocks.updateDoc).not.toHaveBeenCalled();
  });

  it('persiste edição financeira válida e remove campos extras dos itens', async () => {
    await firebaseQuoteService.updateQuote('quote-1', {
      items: [{ name: '  Produto novo  ', quantity: 2, unitPrice: 50, price: 100 } as any],
      discount: 10,
      discountType: 'percent',
      totalPrice: 90,
    });

    expect(mocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'quote-1' }),
      expect.objectContaining({
        items: [{ name: 'Produto novo', quantity: 2, unitPrice: 50 }],
        discount: 10,
        discountType: 'percent',
        totalPrice: 90,
        updatedAt: 'mock-timestamp',
      }),
    );
  });
});

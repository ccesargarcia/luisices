import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOrderGet = vi.fn();
const mockQuoteGet = vi.fn();
const mockCounterGet = vi.fn();
const mockTransactionUpdate = vi.fn();
const mockTransactionSet = vi.fn();

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'user-1', email: 'owner@example.com' } },
  functions: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, coll) => ({ coll })),
  doc: vi.fn((_db, ...parts: string[]) => ({
    path: parts.join('/'),
    id: parts[parts.length - 1],
    coll: parts[0],
  })),
  getDocs: vi.fn(),
  getDoc: vi.fn((ref: any) => {
    return Promise.resolve({
      exists: () => true,
      id: ref.id || 'order-123',
      data: () => ({
        userId: 'user-1',
        orderNumber: '#2026-0001',
        status: 'pending',
        price: 100,
        createdAt: { toDate: () => new Date('2026-01-01') },
      }),
    });
  }),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date('2026-01-01') }),
    fromDate: (d: Date) => ({ toDate: () => d }),
  },
  runTransaction: vi.fn(async (_db, fn) => {
    const fakeTransaction = {
      get: vi.fn(async (ref: any) => {
        if (ref.coll === 'quotes' || ref.path?.startsWith('quotes/')) return mockQuoteGet();
        if (ref.coll === 'orders' || ref.path?.startsWith('orders/')) return mockOrderGet();
        if (ref.id === 'counters' || ref.path?.includes('counters')) return mockCounterGet();
        return { exists: () => false, data: () => ({}) };
      }),
      update: mockTransactionUpdate,
      set: mockTransactionSet,
    };
    return fn(fakeTransaction);
  }),
}));

import { firebaseOrderService } from '../../src/services/firebaseOrderService';

describe('Etapa 5: Aprovação Idempotente de Orçamentos (Achado 8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('converte orçamento em pedido e venda de forma atômica', async () => {
    mockQuoteGet.mockReturnValue({
      exists: () => true,
      data: () => ({
        userId: 'user-1',
        quoteNumber: 'ORC-0001',
        status: 'sent',
        totalPrice: 250,
      }),
    });
    mockCounterGet.mockReturnValue({
      exists: () => true,
      data: () => ({ orderCounter: 10 }),
    });

    const order = await firebaseOrderService.createOrder(
      { customerName: 'Cliente Teste', price: 250 },
      undefined,
      'quote-123'
    );

    expect(order).toBeDefined();

    // Contador atualizado
    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'counters' }),
      { orderCounter: 11 },
      { merge: true }
    );

    // Orçamento marcado como aprovado com o vínculo do pedido
    expect(mockTransactionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ coll: 'quotes', id: 'quote-123' }),
      expect.objectContaining({
        status: 'approved',
        convertedOrderNumber: '#2026-0011',
      })
    );
  });

  it('retorna o pedido existente sem duplicar caso o orçamento já tenha sido convertido', async () => {
    // Orçamento já possui convertedOrderId de uma aprovação anterior / retry
    mockQuoteGet.mockReturnValue({
      exists: () => true,
      data: () => ({
        userId: 'user-1',
        quoteNumber: 'ORC-0001',
        status: 'approved',
        convertedOrderId: 'existing-order-456',
        convertedOrderNumber: '#2026-0005',
      }),
    });

    const order = await firebaseOrderService.createOrder(
      { customerName: 'Cliente Teste', price: 250 },
      undefined,
      'quote-123'
    );

    expect(order).toBeDefined();
    // NÃO deve gerar novas gravações no banco
    expect(mockTransactionSet).not.toHaveBeenCalled();
    expect(mockTransactionUpdate).not.toHaveBeenCalled();
  });

  it('rejeita aprovação se o orçamento estiver expirado', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    mockQuoteGet.mockReturnValue({
      exists: () => true,
      data: () => ({
        userId: 'user-1',
        quoteNumber: 'ORC-0001',
        status: 'sent',
        validUntil: pastDate,
      }),
    });

    await expect(
      firebaseOrderService.createOrder(
        { customerName: 'Cliente Teste', price: 250 },
        undefined,
        'quote-expired'
      )
    ).rejects.toThrow('Este orçamento expirou');

    expect(mockTransactionSet).not.toHaveBeenCalled();
  });

  it('rejeita aprovação se o orçamento não estiver em rascunho ou enviado (ex: rejeitado)', async () => {
    mockQuoteGet.mockReturnValue({
      exists: () => true,
      data: () => ({
        userId: 'user-1',
        quoteNumber: 'ORC-0001',
        status: 'rejected',
      }),
    });

    await expect(
      firebaseOrderService.createOrder(
        { customerName: 'Cliente Teste', price: 250 },
        undefined,
        'quote-rejected'
      )
    ).rejects.toThrow('Apenas orçamentos em rascunho ou enviados');

    expect(mockTransactionSet).not.toHaveBeenCalled();
  });
});

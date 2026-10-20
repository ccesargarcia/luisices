import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOrderGet = vi.fn();
const mockSaleGet = vi.fn();
const mockTransactionUpdate = vi.fn();
const mockTransactionSet = vi.fn();
const mockAddDoc = vi.fn();

vi.mock('../../../src/lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'user-1', email: 'owner@example.com', displayName: 'Caio Garcia' } },
  functions: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, coll) => ({ coll })),
  doc: vi.fn((_db, coll, id) => ({ coll, id: id || 'generated-id' })),
  getDocs: vi.fn(),
  getDoc: vi.fn((ref: any) => Promise.resolve({
    exists: () => true,
    data: () => ({
      userId: 'user-1',
      version: 1,
      customerName: 'Cliente Teste',
      customerPhone: '11999999999',
      productName: 'Caderno (2x), Adesivo (1x)',
      quantity: 3,
      price: 250,
      pricingMode: 'items',
      unitPrice: null,
      items: [
        { name: 'Caderno', quantity: 2, unitPrice: 100, price: 200 },
        { name: 'Adesivo', quantity: 1, unitPrice: 50, price: 50 },
      ],
      deliveryDate: '2026-12-01',
      status: 'pending',
    }),
  })),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  addDoc: vi.fn((ref, data) => {
    mockAddDoc(ref, data);
    return Promise.resolve({ id: 'new-dup-order-id' });
  }),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date('2026-01-01T00:00:00.000Z') }),
  },
  runTransaction: vi.fn(async (_db, fn) => {
    const fakeTransaction = {
      get: vi.fn(async (ref: any) => {
        if (ref?.coll === 'users' || ref?.id === 'counters') {
          return { exists: () => true, data: () => ({ orderCounter: 10 }) };
        }
        if (ref?.coll === 'orders') return mockOrderGet();
        if (ref?.coll === 'salesLedger' || ref?.id) return mockSaleGet();
        return { exists: () => false };
      }),
      update: mockTransactionUpdate,
      set: mockTransactionSet,
    };
    return fn(fakeTransaction);
  }),
}));

import { firebaseOrderService } from '../../../src/services/firebaseOrderService';

describe('Persistência e recuperação de itens e preços unitários dos pedidos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Criação de Pedidos (createOrder)', () => {
    it('persiste array de itens estruturados e preços unitários distintos no Firestore', async () => {
      const orderData = {
        customerName: 'Maria Silva',
        customerPhone: '11999998888',
        productName: 'Agenda 2026 (2x), Caneta Luxo (3x)',
        quantity: 5,
        price: 260,
        deliveryDate: '2026-11-20',
        items: [
          { name: 'Agenda 2026', quantity: 2, unitPrice: 100, price: 200 },
          { name: 'Caneta Luxo', quantity: 3, unitPrice: 20, price: 60 },
        ],
      };

      await firebaseOrderService.createOrder(orderData);

      expect(mockTransactionSet).toHaveBeenCalled();
      const savedDoc = mockTransactionSet.mock.calls.find(call => call[1]?.orderNumber)?.[1];
      expect(savedDoc).toBeDefined();
      expect(savedDoc.productName).toBe('Agenda 2026 (2x), Caneta Luxo (3x)');
      expect(savedDoc.quantity).toBe(5);
      expect(savedDoc.price).toBe(260);
      expect(savedDoc.pricingMode).toBe('items');
      expect(savedDoc.unitPrice).toBeNull();
      expect(savedDoc.items).toEqual([
        { name: 'Agenda 2026', quantity: 2, unitPrice: 100, price: 200 },
        { name: 'Caneta Luxo', quantity: 3, unitPrice: 20, price: 60 },
      ]);
    });

    it('infere pricingMode unit e unitPrice escalar quando há exatamente 1 item', async () => {
      const orderData = {
        customerName: 'João Santos',
        customerPhone: '11999997777',
        productName: 'Camiseta Personalizada (2x)',
        quantity: 2,
        price: 90,
        deliveryDate: '2026-11-25',
        items: [
          { name: 'Camiseta Personalizada', quantity: 2, unitPrice: 45, price: 90 },
        ],
      };

      await firebaseOrderService.createOrder(orderData);

      const savedDoc = mockTransactionSet.mock.calls.find(call => call[1]?.orderNumber)?.[1];
      expect(savedDoc).toBeDefined();
      expect(savedDoc.pricingMode).toBe('unit');
      expect(savedDoc.unitPrice).toBe(45);
      expect(savedDoc.items).toEqual([
        { name: 'Camiseta Personalizada', quantity: 2, unitPrice: 45, price: 90 },
      ]);
    });

    it('sanitiza preços unitários informados como string BRL com vírgula e descarta itens sem nome', async () => {
      const orderData = {
        customerName: 'Ana Souza',
        customerPhone: '11999996666',
        productName: 'Caderno',
        quantity: 1,
        price: 35.5,
        deliveryDate: '2026-11-30',
        items: [
          { name: 'Caderno Pautado', quantity: 1, unitPrice: '35,50' as any },
          { name: '   ', quantity: 2, unitPrice: 10 }, // item vazio deve ser filtrado
        ],
      };

      await firebaseOrderService.createOrder(orderData);

      const savedDoc = mockTransactionSet.mock.calls.find(call => call[1]?.orderNumber)?.[1];
      expect(savedDoc.items).toEqual([
        { name: 'Caderno Pautado', quantity: 1, unitPrice: 35.5, price: 35.5 },
      ]);
      expect(savedDoc.unitPrice).toBe(35.5);
    });
  });

  describe('Atualização de Pedidos (updateOrder)', () => {
    it('atualiza array de itens e mantém preços unitários na transação', async () => {
      mockOrderGet.mockReturnValue({
        exists: () => true,
        data: () => ({
          userId: 'user-1',
          version: 1,
          price: 200,
        }),
      });
      mockSaleGet.mockReturnValue({ exists: () => false });

      const updatedItems = [
        { name: 'Caneca Estampada', quantity: 2, unitPrice: 40, price: 80 },
        { name: 'Mousepad', quantity: 1, unitPrice: 50, price: 50 },
      ];

      await firebaseOrderService.updateOrder('order-123', {
        productName: 'Caneca Estampada (2x), Mousepad',
        quantity: 3,
        price: 130,
        items: updatedItems,
        pricingMode: 'items',
        unitPrice: null,
      }, 1);

      expect(mockTransactionUpdate).toHaveBeenCalled();
      const updatePayload = mockTransactionUpdate.mock.calls[0][1];
      expect(updatePayload.items).toEqual(updatedItems);
      expect(updatePayload.price).toBe(130);
      expect(updatePayload.pricingMode).toBe('items');
      expect(updatePayload.unitPrice).toBeNull();
      expect(updatePayload.version).toBe(2);
    });
  });

  describe('Duplicação de Pedidos (duplicateOrder)', () => {
    it('copia itens estruturados e metadados de preço unitário ao duplicar pedido', async () => {
      const duplicated = await firebaseOrderService.duplicateOrder('order-123');

      expect(mockAddDoc).toHaveBeenCalled();
      const addPayload = mockAddDoc.mock.calls[0][1];
      expect(addPayload.items).toEqual([
        { name: 'Caderno', quantity: 2, unitPrice: 100, price: 200 },
        { name: 'Adesivo', quantity: 1, unitPrice: 50, price: 50 },
      ]);
      expect(addPayload.pricingMode).toBe('items');
      expect(duplicated.items).toBeDefined();
    });
  });
});

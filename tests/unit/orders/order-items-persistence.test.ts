import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCallable = vi.hoisted(() => vi.fn());

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

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => mockCallable),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, coll) => ({ coll })),
  doc: vi.fn((_db, coll, id) => ({ coll, id: id || 'generated-id' })),
  getDocs: vi.fn(),
  getDoc: vi.fn((ref: any) => {
    if (ref?.coll === 'orders') {
      const custom = mockOrderGet();
      if (custom) return Promise.resolve(custom);
    }
    return Promise.resolve({
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
    });
  }),
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
    mockOrderGet.mockReset();
    mockSaleGet.mockReset();
    mockCallable.mockReset();
    mockCallable.mockResolvedValue({ data: { success: true } });
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

    it('preserva preços unitários diferentes em um pedido com 120 unidades e total em reais', async () => {
      await firebaseOrderService.createOrder({
        customerName: 'Cliente de Teste',
        customerPhone: '11999998888',
        productName: 'Produto A (100x), Produto B (19x), Produto C',
        quantity: 120,
        price: 92.19,
        deliveryDate: '2026-11-30',
        items: [
          { name: 'Produto A', quantity: 100, unitPrice: 0.75, price: 75 },
          { name: 'Produto B', quantity: 19, unitPrice: 0.85, price: 16.15 },
          { name: 'Produto C', quantity: 1, unitPrice: 1.04, price: 1.04 },
        ],
      });

      const savedOrder = mockTransactionSet.mock.calls.find(call => call[1]?.orderNumber)?.[1];
      expect(savedOrder.quantity).toBe(120);
      expect(savedOrder.price).toBe(92.19);
      expect(savedOrder.items).toEqual([
        { name: 'Produto A', quantity: 100, unitPrice: 0.75, price: 75 },
        { name: 'Produto B', quantity: 19, unitPrice: 0.85, price: 16.15 },
        { name: 'Produto C', quantity: 1, unitPrice: 1.04, price: 1.04 },
      ]);
      expect(savedOrder.items[0].unitPrice).not.toBe(savedOrder.items[1].unitPrice);
      expect(savedOrder.pricingMode).toBe('items');
    });

    it('rejeita quantidade fracionária ao criar antes de gravar no Firestore', async () => {
      await expect(firebaseOrderService.createOrder({
        customerName: 'Cliente de Teste',
        productName: 'Produto',
        quantity: 1.5,
        price: 15,
        deliveryDate: '2026-11-30',
      } as any)).rejects.toThrow('A quantidade deve ser um número inteiro');

      expect(mockTransactionSet).not.toHaveBeenCalled();
    });

    it('rejeita uma data de entrega inexistente antes de gravar no Firestore', async () => {
      await expect(firebaseOrderService.createOrder({
        customerName: 'Cliente de Teste',
        productName: 'Produto',
        quantity: 1,
        price: 15,
        deliveryDate: '2026-02-31',
      })).rejects.toThrow('Informe uma data de entrega válida');

      expect(mockTransactionSet).not.toHaveBeenCalled();
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
    it('encaminha alteração do array de itens e preços unitários para a callable segura', async () => {
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

      expect(mockCallable).toHaveBeenCalledWith(expect.objectContaining({
        orderId: 'order-123',
        expectedVersion: 1,
        updates: expect.objectContaining({
          items: updatedItems,
          price: 130,
          pricingMode: 'items',
          unitPrice: null,
        }),
      }));
      expect(mockTransactionUpdate).not.toHaveBeenCalled();
    });

    it('não inventa média ou preços unitários iguais quando um pedido legado sem items é editado sem valores unitários', async () => {
      mockOrderGet.mockReturnValue({
        exists: () => true,
        data: () => ({
          userId: 'user-1',
          version: 1,
          customerName: 'Cliente Antigo',
          productName: 'Caderno (2x), Adesivo (1x)',
          quantity: 3,
          price: 300,
          pricingMode: 'total',
          unitPrice: null,
          items: null,
        }),
      });
      mockSaleGet.mockReturnValue({ exists: () => false });

      // Edição de campos gerais (ex: data de entrega / status), mantendo preços desconhecidos como null
      await firebaseOrderService.updateOrder('order-legacy-1', {
        deliveryDate: '2026-12-15',
        status: 'completed',
        items: null,
        pricingMode: 'total',
        unitPrice: null,
      }, 1);

      expect(mockTransactionUpdate).toHaveBeenCalled();
      const updatePayload = mockTransactionUpdate.mock.calls[0][1];
      expect(updatePayload.items ?? null).toBeNull();
      expect(updatePayload.pricingMode ?? 'total').toBe('total');
      expect(updatePayload.unitPrice ?? null).toBeNull();
      // Garante que nenhuma média aritmética (ex: 300 / 3 = 100) foi atribuída aos produtos
      expect(updatePayload.items).not.toEqual([
        { name: 'Caderno', quantity: 2, unitPrice: 100, price: 200 },
        { name: 'Adesivo', quantity: 1, unitPrice: 100, price: 100 },
      ]);
    });

    it('permite que um pedido legado sem items receba items estruturados com preços distintos ao ser editado com valores reais', async () => {
      mockOrderGet.mockReturnValue({
        exists: () => true,
        data: () => ({
          userId: 'user-1',
          version: 1,
          customerName: 'Cliente Antigo',
          productName: 'Caderno (2x), Adesivo (1x)',
          quantity: 3,
          price: 300,
          items: null,
        }),
      });
      mockSaleGet.mockReturnValue({ exists: () => false });

      const distinctItems = [
        { name: 'Caderno', quantity: 2, unitPrice: 120, price: 240 },
        { name: 'Adesivo', quantity: 1, unitPrice: 60, price: 60 },
      ];

      await firebaseOrderService.updateOrder('order-legacy-1', {
        items: distinctItems,
        pricingMode: 'items',
        unitPrice: null,
      }, 1);

      expect(mockCallable).toHaveBeenCalledWith(expect.objectContaining({
        orderId: 'order-legacy-1',
        updates: expect.objectContaining({ items: distinctItems }),
      }));
      expect(mockTransactionUpdate).not.toHaveBeenCalled();
    });

    it('edita pedido atribuído, adiciona item e repara a atribuição ausente no salesLedger legado', async () => {
      mockOrderGet.mockReturnValue({
        exists: () => true,
        data: () => ({
          userId: 'owner-1',
          assignedTo: 'user-1',
          assignedToName: 'Funcionário responsável',
          version: 1,
          price: 75,
          quantity: 100,
          payment: { status: 'pending', totalAmount: 75, paidAmount: 0, remainingAmount: 75 },
        }),
      });
      mockSaleGet.mockReturnValue({
        exists: () => true,
        data: () => ({ userId: 'owner-1', amount: 75, paidAmount: 0 }),
      });

      await firebaseOrderService.updateOrder('assigned-legacy-order', {
        productName: 'Produto A (100x), Produto B (19x), Produto C',
        quantity: 120,
        price: 92.19,
        items: [
          { name: 'Produto A', quantity: 100, unitPrice: 0.75, price: 75 },
          { name: 'Produto B', quantity: 19, unitPrice: 0.85, price: 16.15 },
          { name: 'Produto C', quantity: 1, unitPrice: 1.04, price: 1.04 },
        ],
        pricingMode: 'items',
        unitPrice: null,
        payment: { status: 'pending', paidAmount: 0, method: null } as any,
      }, 1);

      expect(mockCallable).toHaveBeenCalledWith(expect.objectContaining({
        orderId: 'assigned-legacy-order',
        updates: expect.objectContaining({ quantity: 120, price: 92.19 }),
      }));
      expect(mockTransactionUpdate).not.toHaveBeenCalled();
    });

    it('atualiza pedido com tracking link e itens pela callable segura', async () => {
      mockOrderGet.mockReturnValue({
        exists: () => true,
        data: () => ({
          userId: 'user-1',
          version: 1,
          customerName: 'Cliente Teste',
          productName: 'Convite Luxo',
          quantity: 1,
          price: 100,
          pricingMode: 'unit',
          unitPrice: 100,
          items: [{ name: 'Convite Luxo', quantity: 1, unitPrice: 100, price: 100 }],
          publicTrackingHash: 'hash-abc-123',
          publicTrackingExpiresAt: '2026-12-31T00:00:00.000Z',
          publicTrackingLinkId: 'link-123',
        }),
      });
      mockSaleGet.mockReturnValue({ exists: () => false });

      const newItems = [
        { name: 'Convite Luxo', quantity: 1, unitPrice: 100, price: 100 },
        { name: 'Envelope', quantity: 1, unitPrice: 50, price: 50 },
      ];

      await firebaseOrderService.updateOrder('order-with-tracking', {
        productName: 'Convite Luxo, Envelope',
        quantity: 2,
        price: 150,
        items: newItems,
        pricingMode: 'items',
        unitPrice: null,
      }, 1);

      expect(mockCallable).toHaveBeenCalledWith(expect.objectContaining({
        orderId: 'order-with-tracking',
        updates: expect.objectContaining({ items: newItems, price: 150, quantity: 2 }),
      }));
      expect(mockTransactionUpdate).not.toHaveBeenCalled();
    });

    it('rejeita quantidade fracionária ao editar antes de iniciar a transação', async () => {
      await expect(firebaseOrderService.updateOrder('order-invalid-items', {
        quantity: 1.5,
        price: 15,
        items: [{ name: 'Produto', quantity: 1.5, unitPrice: 10, price: 15 }],
      } as any)).rejects.toThrow('quantidade inteira');

      expect(mockCallable).not.toHaveBeenCalled();
    });

    it('rejeita soma de quantidades diferente da quantidade informada no pedido', async () => {
      await expect(firebaseOrderService.updateOrder('order-invalid-quantity-sum', {
        quantity: 3,
        price: 100,
        items: [{ name: 'Produto', quantity: 2, unitPrice: 50, price: 100 }],
      })).rejects.toThrow('A quantidade total não corresponde à soma');

      expect(mockCallable).not.toHaveBeenCalled();
    });

    it('recalcula subtotal divergente a partir de quantidade e preço unitário antes de gravar', async () => {
      await firebaseOrderService.updateOrder('order-recalculated-total', {
        quantity: 2,
        price: 100,
        items: [{ name: 'Produto', quantity: 2, unitPrice: 50, price: 90 }],
      });

      expect(mockCallable).toHaveBeenCalledWith(expect.objectContaining({
        updates: expect.objectContaining({ items: [
          { name: 'Produto', quantity: 2, unitPrice: 50, price: 100 },
        ] }),
      }));
    });

    it('rejeita soma dos subtotais diferente do valor total do pedido', async () => {
      await expect(firebaseOrderService.updateOrder('order-invalid-price-sum', {
        quantity: 2,
        price: 100,
        items: [{ name: 'Produto', quantity: 2, unitPrice: 45, price: 90 }],
      })).rejects.toThrow('O valor total não corresponde à soma');

      expect(mockCallable).not.toHaveBeenCalled();
    });

    it('encaminha tentativa de remover itens estruturados para validação segura no backend', async () => {
      mockOrderGet.mockReturnValue({
        exists: () => true,
        data: () => ({
          userId: 'user-1',
          version: 1,
          customerName: 'Cliente Existente',
          productName: 'Camiseta (2x), Caneca (1x)',
          quantity: 3,
          price: 150,
          pricingMode: 'items',
          unitPrice: null,
          items: [
            { name: 'Camiseta', quantity: 2, unitPrice: 50, price: 100 },
            { name: 'Caneca', quantity: 1, unitPrice: 50, price: 50 },
          ],
        }),
      });
      mockSaleGet.mockReturnValue({ exists: () => false });

      // O backend decide se é permitido remover os itens existentes.
      await firebaseOrderService.updateOrder('order-structured-1', {
        productName: 'Camiseta (2x), Caneca (1x)',
        quantity: 3,
        price: 150,
        items: null,
        pricingMode: 'total',
        unitPrice: null,
      }, 1);

      expect(mockCallable).toHaveBeenCalledWith(expect.objectContaining({
        orderId: 'order-structured-1',
        updates: expect.objectContaining({ items: null, pricingMode: 'total' }),
      }));
      expect(mockTransactionUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Reconstrução do histórico em fluxos de produção', () => {
    it('recria ledger ausente com o formato financeiro canônico ao concluir produção', async () => {
      const orderId = 'legacy-production-order';
      mockOrderGet.mockReturnValue({
        id: orderId,
        exists: () => true,
        data: () => ({
          userId: 'owner-1',
          assignedTo: 'user-1',
          assignedToName: 'Funcionário responsável',
          orderNumber: '#2026-0042',
          customerName: 'Cliente de Teste',
          customerPhone: '11999998888',
          productName: 'Produto antigo',
          quantity: 2,
          price: 200,
          status: 'in-progress',
          deliveryDate: '2026-11-30',
          notes: 'Pedido legado',
          createdAt: '2026-10-24T12:00:00.000Z',
          payment: {
            status: 'partial', method: 'pix', totalAmount: 200,
            paidAmount: 50, remainingAmount: 150,
          },
          productionWorkflow: {
            currentStep: 'packaging',
            steps: {
              design: { completed: true },
              approval: { completed: true },
              printing: { completed: true },
              cutting: { completed: true },
              assembly: { completed: true },
              'quality-check': { completed: true },
              packaging: { completed: false },
            },
            startedAt: '2026-10-24T12:00:00.000Z',
          },
        }),
      });
      mockSaleGet.mockReturnValue({ exists: () => false });

      await firebaseOrderService.updateProductionStep(orderId, 'packaging', true);

      const orderUpdate = mockTransactionUpdate.mock.calls[0][1];
      const ledgerWrite = mockTransactionSet.mock.calls.find(call => call[0]?.coll === 'salesLedger')?.[1];
      expect(orderUpdate.status).toBe('completed');
      expect(ledgerWrite).toMatchObject({
        id: orderId,
        orderId,
        userId: 'owner-1',
        assignedTo: 'user-1',
        assignedToName: 'Funcionário responsável',
        amount: 200,
        paidAmount: 50,
        paymentStatus: 'partial',
        paymentMethod: 'pix',
        status: 'completed',
        isDeletedFromOrders: false,
      });
      expect(ledgerWrite.date).toBe('2026-10-24T12:00:00.000Z');
      expect(ledgerWrite.createdAt).toBe(ledgerWrite.date);
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

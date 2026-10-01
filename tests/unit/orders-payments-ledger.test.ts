import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOrderGet = vi.fn();
const mockSaleGet = vi.fn();
const mockTransactionUpdate = vi.fn();
const mockTransactionSet = vi.fn();

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'user-1', email: 'owner@example.com' } },
  functions: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn((_db, coll, id) => ({ coll, id })),
  getDocs: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({ userId: 'user-1', version: 1 }),
  })),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date('2026-01-01') }),
  },
  runTransaction: vi.fn(async (_db, fn) => {
    const fakeTransaction = {
      get: vi.fn(async (ref: any) => {
        if (ref.coll === 'orders') return mockOrderGet();
        if (ref.coll === 'salesLedger' || ref.id) return mockSaleGet();
        return { exists: () => false };
      }),
      update: mockTransactionUpdate,
      set: mockTransactionSet,
    };
    return fn(fakeTransaction);
  }),
}));

import { firebaseOrderService } from '../../src/services/firebaseOrderService';

describe('Etapa 4: Pedidos, Pagamentos e Financeiro (Achados 5, 6 e 7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Achado 6: Preservação de histórico e data de pagamento em edições comuns', () => {
    it('preserva histórico existente, data e notas de pagamento ao atualizar dados do pedido', async () => {
      const existingHistory = [
        { amount: 50, date: '2026-01-10', method: 'pix', notes: 'Entrada 50%' },
      ];
      mockOrderGet.mockReturnValue({
        exists: () => true,
        data: () => ({
          userId: 'user-1',
          version: 2,
          price: 100,
          customerName: 'Cliente Original',
          payment: {
            status: 'partial',
            paidAmount: 50,
            remainingAmount: 50,
            paymentDate: '2026-01-10T12:00:00Z',
            notes: 'Nota importante',
            history: existingHistory,
          },
        }),
      });
      mockSaleGet.mockReturnValue({
        exists: () => true,
        data: () => ({ userId: 'user-1', amount: 100 }),
      });

      // Atualiza apenas o nome do cliente sem passar history ou paymentDate
      await firebaseOrderService.updateOrder('order-123', {
        customerName: 'Cliente Novo Nome',
        payment: {
          status: 'partial',
          totalAmount: 100,
          paidAmount: 50,
          remainingAmount: 50,
        } as any,
      });

      expect(mockTransactionUpdate).toHaveBeenCalled();
      const orderUpdateArgs = mockTransactionUpdate.mock.calls[0][1];
      expect(orderUpdateArgs.customerName).toBe('Cliente Novo Nome');
      // Histórico original DEVE ser preservado
      expect(orderUpdateArgs.payment.history).toEqual(existingHistory);
      // Data original DEVE ser preservada
      expect(orderUpdateArgs.payment.paymentDate).toBe('2026-01-10T12:00:00Z');
      expect(orderUpdateArgs.payment.notes).toBe('Nota importante');
    });
  });

  describe('Achado 7: Contrato de patch com limpeza explícita (null, [], false)', () => {
    it('persiste isExchange=false, notes=null e tags=[] quando explicitamente enviados', async () => {
      mockOrderGet.mockReturnValue({
        exists: () => true,
        data: () => ({
          userId: 'user-1',
          version: 1,
          isExchange: true,
          notes: 'Notas antigas',
          tags: ['urgente'],
          cardColor: '#ff0000',
        }),
      });
      mockSaleGet.mockReturnValue({
        exists: () => true,
        data: () => ({ userId: 'user-1' }),
      });

      await firebaseOrderService.updateOrder('order-123', {
        isExchange: false,
        notes: null,
        tags: [],
        cardColor: null,
      });

      const orderUpdateArgs = mockTransactionUpdate.mock.calls[0][1];
      expect(orderUpdateArgs.isExchange).toBe(false);
      expect(orderUpdateArgs.notes).toBeNull();
      expect(orderUpdateArgs.tags).toEqual([]);
      expect(orderUpdateArgs.cardColor).toBeNull();
    });
  });

  describe('Achado 5: Concorrência otimista e sincronização atômica pedido + salesLedger', () => {
    it('rejeita alteração se a versão no banco for diferente da esperada pela tela', async () => {
      mockOrderGet.mockReturnValue({
        exists: () => true,
        data: () => ({
          userId: 'user-1',
          version: 5,
        }),
      });

      // Tela enviou versão 4, mas banco já está na 5
      await expect(
        firebaseOrderService.updateOrder('order-123', { customerName: 'Novo' }, 4)
      ).rejects.toThrow('Conflito de concorrência');

      expect(mockTransactionUpdate).not.toHaveBeenCalled();
    });

    it('atualiza pedido e salesLedger no mesmo commit de transação', async () => {
      mockOrderGet.mockReturnValue({
        exists: () => true,
        id: 'order-123',
        data: () => ({
          userId: 'user-1',
          version: 1,
          customerName: 'Cliente A',
          price: 100,
        }),
      });
      mockSaleGet.mockReturnValue({
        exists: () => true,
        id: 'order-123',
        data: () => ({
          userId: 'user-1',
          amount: 100,
        }),
      });

      await firebaseOrderService.updateOrder(
        'order-123',
        { customerName: 'Cliente Atualizado', price: 150 },
        1
      );

      // Ambos devem ser atualizados na transação
      expect(mockTransactionUpdate).toHaveBeenCalledTimes(2);
      // Pedido atualizado com incremento de versão
      expect(mockTransactionUpdate.mock.calls[0][1].version).toBe(2);
      expect(mockTransactionUpdate.mock.calls[0][1].customerName).toBe('Cliente Atualizado');
      // Ledger atualizado com novo valor
      expect(mockTransactionUpdate.mock.calls[1][1].amount).toBe(150);
      expect(mockTransactionUpdate.mock.calls[1][1].customerName).toBe('Cliente Atualizado');
    });

    it('reconstrói salesLedger de forma resiliente caso o documento contábil estivesse ausente', async () => {
      mockOrderGet.mockReturnValue({
        exists: () => true,
        id: 'order-123',
        data: () => ({
          userId: 'user-1',
          version: 1,
          productName: 'Convite Especial',
          price: 200,
        }),
      });
      // Venda não existia no ledger (ex: pedido legado ou inconsistência prévia)
      mockSaleGet.mockReturnValue({
        exists: () => false,
      });

      await firebaseOrderService.updateOrderStatus('order-123', 'completed');

      // Pedido atualizado via update
      expect(mockTransactionUpdate).toHaveBeenCalledTimes(1);
      // Venda ausente é recriada via set com status correto
      expect(mockTransactionSet).toHaveBeenCalledTimes(1);
      const setCallArgs = mockTransactionSet.mock.calls[0][1];
      expect(setCallArgs.status).toBe('completed');
      expect(setCallArgs.userId).toBe('user-1');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firebaseOrderService } from '../../src/services/firebaseOrderService';
import { Order } from '../../src/app/types';

const mockUpdateDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockBatchUpdate = vi.fn();
const mockBatchCommit = vi.fn();
const mockRunTransaction = vi.fn();

vi.mock('../../src/lib/firebase', () => ({
  db: { id: 'mock-db' },
  auth: { currentUser: { uid: 'user-archive-123' } },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ name })),
  doc: vi.fn((_db, coll, id) => ({ coll, id })),
  query: vi.fn((coll, ...clauses) => ({ coll, clauses })),
  where: vi.fn((field, op, val) => ({ field, op, val })),
  orderBy: vi.fn((field, dir) => ({ field, dir })),
  Timestamp: {
    now: () => ({ toDate: () => new Date(), toISOString: () => '2026-10-06T02:00:00.000Z' }),
  },
  getDoc: (...args: any[]) => mockGetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  writeBatch: () => ({
    update: mockBatchUpdate,
    commit: mockBatchCommit,
  }),
  runTransaction: (db: any, fn: any) => mockRunTransaction(db, fn),
}));

describe('Área de Arquivamento e Ciclo de Vida de Pedidos Concluídos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        userId: 'user-archive-123',
        status: 'completed',
        version: 1,
      }),
    });
    mockUpdateDoc.mockResolvedValue(undefined);
    mockBatchCommit.mockResolvedValue(undefined);
  });

  describe('Métodos de Serviço para Arquivamento', () => {
    it('archiveOrder deve gravar isArchived=true, timestamp e userId', async () => {
      await firebaseOrderService.archiveOrder('order-456');

      expect(mockGetDoc).toHaveBeenCalled();
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ coll: 'orders', id: 'order-456' }),
        expect.objectContaining({
          isArchived: true,
          archivedBy: 'user-archive-123',
        })
      );
    });

    it('unarchiveOrder deve gravar isArchived=false e limpar campos de arquivamento', async () => {
      await firebaseOrderService.unarchiveOrder('order-456');

      expect(mockGetDoc).toHaveBeenCalled();
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ coll: 'orders', id: 'order-456' }),
        expect.objectContaining({
          isArchived: false,
          archivedAt: null,
          archivedBy: null,
        })
      );
    });

    it('archiveOrdersBulk deve atualizar múltiplos pedidos em lote via writeBatch', async () => {
      const ids = ['order-1', 'order-2', 'order-3'];
      await firebaseOrderService.archiveOrdersBulk(ids);

      expect(mockBatchUpdate).toHaveBeenCalledTimes(3);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'order-1' }),
        expect.objectContaining({ isArchived: true, archivedBy: 'user-archive-123' })
      );
    });

    it('unarchiveOrdersBulk deve restaurar múltiplos pedidos em lote via writeBatch', async () => {
      const ids = ['order-1', 'order-2'];
      await firebaseOrderService.unarchiveOrdersBulk(ids);

      expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'order-1' }),
        expect.objectContaining({ isArchived: false, archivedAt: null, archivedBy: null })
      );
    });
  });

  describe('Filtros e Lógica de Consulta de Pedidos Arquivados', () => {
    const sampleOrders: Order[] = [
      {
        id: 'ord-1',
        orderNumber: '#2026-0001',
        customerName: 'Maria Silva',
        customerPhone: '11999990001',
        productName: 'Topo de Bolo Floral Luxo',
        quantity: 1,
        price: 85,
        status: 'completed',
        isArchived: true,
        archivedAt: '2026-10-01T10:00:00.000Z',
        deliveryDate: '2026-10-01',
        createdAt: '2026-09-28T14:00:00.000Z',
        userId: 'user-archive-123',
        payment: {
          status: 'paid',
          method: 'pix',
          totalAmount: 85,
          paidAmount: 85,
          remainingAmount: 0,
          paymentDate: '2026-10-01',
          notes: null,
          history: null,
        },
      },
      {
        id: 'ord-2',
        orderNumber: '#2026-0002',
        customerName: 'João Santos',
        customerPhone: '11999990002',
        productName: 'Caixa Shaker Safari',
        quantity: 2,
        price: 120,
        status: 'completed',
        isArchived: true,
        archivedAt: '2026-10-05T16:00:00.000Z',
        deliveryDate: '2026-10-05',
        createdAt: '2026-10-02T10:00:00.000Z',
        userId: 'user-archive-123',
        payment: {
          status: 'pending',
          method: null,
          totalAmount: 120,
          paidAmount: 0,
          remainingAmount: 120,
          paymentDate: null,
          notes: null,
          history: null,
        },
      },
      {
        id: 'ord-3',
        orderNumber: '#2026-0003',
        customerName: 'Ana Clara',
        customerPhone: '11999990003',
        productName: 'Lembrancinhas Batizado',
        quantity: 10,
        price: 250,
        status: 'in-progress',
        isArchived: false,
        deliveryDate: '2026-10-10',
        createdAt: '2026-10-04T08:00:00.000Z',
        userId: 'user-archive-123',
      },
    ];

    it('deve segregar pedidos ativos de pedidos arquivados para não poluir o painel', () => {
      const activeOrders = sampleOrders.filter((o) => !o.isArchived);
      const archivedOrders = sampleOrders.filter((o) => Boolean(o.isArchived));

      expect(activeOrders).toHaveLength(1);
      expect(activeOrders[0].id).toBe('ord-3');

      expect(archivedOrders).toHaveLength(2);
      expect(archivedOrders.map((o) => o.id)).toEqual(['ord-1', 'ord-2']);
    });

    it('deve filtrar pedidos arquivados por busca de texto (cliente, produto, número)', () => {
      const archived = sampleOrders.filter((o) => Boolean(o.isArchived));

      // Busca por nome do cliente
      const byCustomer = archived.filter((o) => o.customerName.toLowerCase().includes('maria'));
      expect(byCustomer).toHaveLength(1);
      expect(byCustomer[0].orderNumber).toBe('#2026-0001');

      // Busca por produto
      const byProduct = archived.filter((o) => o.productName.toLowerCase().includes('safari'));
      expect(byProduct).toHaveLength(1);
      expect(byProduct[0].orderNumber).toBe('#2026-0002');

      // Busca por número de pedido
      const byNumber = archived.filter((o) => o.orderNumber?.includes('2026-0001'));
      expect(byNumber).toHaveLength(1);
    });

    it('deve filtrar pedidos arquivados por intervalo de data', () => {
      const archived = sampleOrders.filter((o) => Boolean(o.isArchived));

      // Filtro entre 2026-10-04 e 2026-10-06
      const inRange = archived.filter((o) => {
        const d = (o.archivedAt || '').slice(0, 10);
        return d >= '2026-10-04' && d <= '2026-10-06';
      });

      expect(inRange).toHaveLength(1);
      expect(inRange[0].id).toBe('ord-2');
    });

    it('deve filtrar pedidos arquivados por status de pagamento', () => {
      const archived = sampleOrders.filter((o) => Boolean(o.isArchived));

      const paidOnly = archived.filter((o) => o.payment?.status === 'paid');
      expect(paidOnly).toHaveLength(1);
      expect(paidOnly[0].id).toBe('ord-1');

      const pendingOnly = archived.filter((o) => !o.payment || o.payment.status === 'pending');
      expect(pendingOnly).toHaveLength(1);
      expect(pendingOnly[0].id).toBe('ord-2');
    });
  });
});

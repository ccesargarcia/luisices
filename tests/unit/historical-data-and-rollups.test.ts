import { describe, it, expect } from 'vitest';
import { computeMonthlyRollup } from '../../src/services/firebaseMonthlyRollupService';
import { SaleRecord, Order } from '../../src/app/types';

describe('Arquitetura de Dados Históricos: Auto-arquivamento e Rollups Mensais', () => {
  const USER_ID = 'atelie-luisices-principal';

  describe('1. Rollups Mensais Consolidados (salesMonthlySummaries)', () => {
    const mockSales2024: SaleRecord[] = [
      // Maio de 2024
      {
        id: 'sale-may-1',
        orderId: 'sale-may-1',
        userId: USER_ID,
        customerName: 'Cliente Maio 1',
        productName: 'Agenda Artesanal 2024',
        quantity: 2,
        amount: 300,
        paidAmount: 300,
        paymentStatus: 'paid',
        paymentMethod: 'pix',
        status: 'completed',
        date: '2024-05-10T14:00:00.000Z',
        createdAt: '2024-05-10T14:00:00.000Z',
      },
      {
        id: 'sale-may-2',
        orderId: 'sale-may-2',
        userId: USER_ID,
        customerName: 'Cliente Maio 2',
        productName: 'Planner Semanal Luxo',
        quantity: 1,
        amount: 150,
        paidAmount: 150,
        paymentStatus: 'paid',
        paymentMethod: 'credit',
        status: 'completed',
        date: '2024-05-18T16:30:00.000Z',
        createdAt: '2024-05-18T16:30:00.000Z',
      },
      {
        id: 'sale-may-3',
        orderId: 'sale-may-3',
        userId: USER_ID,
        customerName: 'Cliente Maio 3',
        productName: 'Bloco de Notas',
        quantity: 3,
        amount: 90,
        paidAmount: 0,
        paymentStatus: 'pending',
        status: 'cancelled', // Cancelado!
        date: '2024-05-22T10:00:00.000Z',
        createdAt: '2024-05-22T10:00:00.000Z',
      },
      // Junho de 2024
      {
        id: 'sale-jun-1',
        orderId: 'sale-jun-1',
        userId: USER_ID,
        customerName: 'Cliente Junho 1',
        productName: 'Caderno Devocional',
        quantity: 1,
        amount: 220,
        paidAmount: 220,
        paymentStatus: 'paid',
        paymentMethod: 'pix',
        status: 'completed',
        date: '2024-06-05T11:00:00.000Z',
        createdAt: '2024-06-05T11:00:00.000Z',
      },
    ];

    it('deve consolidar o mês 2024-05 com precisão, descartando cancelados do faturamento', () => {
      const summaryMay = computeMonthlyRollup('2024-05', USER_ID, mockSales2024);

      expect(summaryMay.id).toBe(`2024-05_${USER_ID}`);
      expect(summaryMay.yearMonth).toBe('2024-05');
      expect(summaryMay.userId).toBe(USER_ID);

      // Faturamento realizado (300 + 150 = 450)
      expect(summaryMay.totalRevenue).toBe(450);
      expect(summaryMay.completedCount).toBe(2);

      // Cancelados contabilizados separadamente
      expect(summaryMay.cancelledCount).toBe(1);
      expect(summaryMay.cancelledAmount).toBe(90);

      // Total de pedidos válidos
      expect(summaryMay.totalOrders).toBe(2);

      // Meios de pagamento agregados
      expect(summaryMay.paymentMethods['pix']).toBe(300);
      expect(summaryMay.paymentMethods['credit']).toBe(150);
      expect(summaryMay.totalPaid).toBe(450);
      expect(summaryMay.settlementRate).toBe(100);

      // Top produtos
      expect(summaryMay.topProducts[0].name).toBe('Agenda Artesanal 2024');
      expect(summaryMay.topProducts[0].revenue).toBe(300);
    });

    it('deve consolidar o mês 2024-06 isoladamente sem misturar com 2024-05', () => {
      const summaryJun = computeMonthlyRollup('2024-06', USER_ID, mockSales2024);

      expect(summaryJun.totalRevenue).toBe(220);
      expect(summaryJun.completedCount).toBe(1);
      expect(summaryJun.paymentMethods['pix']).toBe(220);
      expect(summaryJun.cancelledCount).toBe(0);
    });
  });

  describe('2. Regra de Elegibilidade de Auto-arquivamento por Idade', () => {
    // Simula a lógica de autoArchiveEligibleOrders
    function getEligibleForArchive(
      orders: Array<{ id: string; status: string; isArchived?: boolean; deliveryDate?: string; createdAt: string }>,
      autoArchiveDays: number,
      referenceTime: number
    ) {
      const maxAgeMs = Math.max(0, autoArchiveDays) * 24 * 60 * 60 * 1000;
      return orders.filter((order) => {
        if (order.status !== 'completed' || order.isArchived) return false;
        if (autoArchiveDays === 0) return true;

        const dateStr = order.deliveryDate || order.createdAt;
        const time = new Date(dateStr).getTime();
        return (referenceTime - time) >= maxAgeMs;
      });
    }

    const now = new Date('2026-10-10T12:00:00.000Z').getTime();

    const ordersSample = [
      // Entregue há 45 dias
      {
        id: 'ord-old',
        status: 'completed',
        isArchived: false,
        deliveryDate: '2026-08-26T12:00:00.000Z',
        createdAt: '2026-08-20T12:00:00.000Z',
      },
      // Entregue há 10 dias
      {
        id: 'ord-recent',
        status: 'completed',
        isArchived: false,
        deliveryDate: '2026-09-30T12:00:00.000Z',
        createdAt: '2026-09-25T12:00:00.000Z',
      },
      // Em produção (nunca deve ser arquivado automaticamente)
      {
        id: 'ord-in-progress',
        status: 'in-progress',
        isArchived: false,
        deliveryDate: '2026-08-01T12:00:00.000Z',
        createdAt: '2026-08-01T12:00:00.000Z',
      },
      // Já arquivado previamente
      {
        id: 'ord-already-archived',
        status: 'completed',
        isArchived: true,
        deliveryDate: '2026-08-01T12:00:00.000Z',
        createdAt: '2026-08-01T12:00:00.000Z',
      },
    ];

    it('deve arquivar apenas pedidos com mais de 30 dias quando configurado autoArchiveDays = 30', () => {
      const eligible = getEligibleForArchive(ordersSample, 30, now);
      expect(eligible.map((o) => o.id)).toEqual(['ord-old']);
    });

    it('deve arquivar ambos os pedidos concluídos quando configurado autoArchiveDays = 0 (imediato)', () => {
      const eligible = getEligibleForArchive(ordersSample, 0, now);
      expect(eligible.map((o) => o.id)).toEqual(['ord-old', 'ord-recent']);
    });

    it('não deve arquivar nenhum pedido se autoArchiveDays for 60 dias (nenhum tem mais de 60 dias)', () => {
      const eligible = getEligibleForArchive(ordersSample, 60, now);
      expect(eligible).toHaveLength(0);
    });

    it('NUNCA deve arquivar pedidos em produção ou pendentes', () => {
      const eligible = getEligibleForArchive(ordersSample, 0, now);
      expect(eligible.some((o) => o.status === 'in-progress')).toBe(false);
    });
  });
});

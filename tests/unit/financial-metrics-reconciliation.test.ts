import { describe, it, expect } from 'vitest';

/**
 * Funções puras simulando as regras contábeis harmonizadas entre Relatórios e Clientes
 */

interface OrderTestSample {
  id: string;
  userId: string;
  customerId?: string;
  price: number;
  status: 'completed' | 'in-progress' | 'pending' | 'cancelled';
  payment?: {
    status: 'pending' | 'partial' | 'completed';
    method?: string | null;
    paidAmount?: number;
    history?: Array<{ amount: number; method: string }>;
  };
}

// Lógica de cálculo da Rota de Clientes
export function calculateCustomerMetrics(
  orders: OrderTestSample[],
  targetPartnerId?: string | null
) {
  // Filtro de parceiro (se ativo)
  const scopedOrders = targetPartnerId
    ? orders.filter((o) => o.userId === targetPartnerId)
    : orders;

  const validOrders = scopedOrders.filter((o) => o.status !== 'cancelled');
  const completedOrders = validOrders.filter((o) => o.status === 'completed');
  const inProductionOrders = validOrders.filter((o) => o.status === 'in-progress' || o.status === 'pending');

  const realizedRevenue = completedOrders.reduce((sum, o) => sum + (o.price || 0), 0);
  const inProductionAmount = inProductionOrders.reduce((sum, o) => sum + (o.price || 0), 0);
  const totalContracted = validOrders.reduce((sum, o) => sum + (o.price || 0), 0);

  const completedCount = completedOrders.length;
  const inProductionCount = inProductionOrders.length;
  const totalOrdersCount = validOrders.length;

  const averageTicket = completedCount > 0 ? realizedRevenue / completedCount : 0;

  return {
    realizedRevenue,
    inProductionAmount,
    totalContracted,
    completedCount,
    inProductionCount,
    totalOrdersCount,
    averageTicket,
  };
}

// Lógica de cálculo da Rota de Relatórios
export function calculateReportMetrics(
  orders: OrderTestSample[],
  period: 'all' | 'custom',
  targetPartnerId?: string | null
) {
  const scopedOrders = targetPartnerId
    ? orders.filter((o) => o.userId === targetPartnerId)
    : orders;

  const validSales = scopedOrders.filter((o) => o.status !== 'cancelled');
  const completedSales = validSales.filter((o) => o.status === 'completed');
  const inProgSales = validSales.filter((o) => o.status === 'in-progress');
  const pendingSales = validSales.filter((o) => o.status === 'pending');

  const revenue = completedSales.reduce((sum, o) => sum + (o.price || 0), 0);
  const cancelledSales = scopedOrders.filter((o) => o.status === 'cancelled');
  const cancelledAmount = cancelledSales.reduce((sum, o) => sum + (o.price || 0), 0);

  // Fluxo de caixa e meios de pagamento
  const payMap = new Map<string, { total: number; count: number }>();
  let totalPending = 0;
  let pendingCount = 0;

  validSales.forEach((o) => {
    const saleAmount = o.price || 0;
    const isCompleted = o.status === 'completed' || o.payment?.status === 'completed';

    let paid = o.payment?.paidAmount || 0;
    if (isCompleted && paid === 0 && saleAmount > 0) {
      paid = saleAmount;
    }

    const remaining = Math.max(0, saleAmount - paid);
    if (remaining > 0) {
      totalPending += remaining;
      pendingCount += 1;
    }

    const history = o.payment?.history;
    if (Array.isArray(history) && history.length > 0) {
      let historySum = 0;
      history.forEach((h) => {
        if (h.amount > 0) {
          const m = h.method || 'other';
          const cur = payMap.get(m) ?? { total: 0, count: 0 };
          payMap.set(m, { total: cur.total + h.amount, count: cur.count + 1 });
          historySum += h.amount;
        }
      });
      const unassignedPaid = Math.max(0, paid - historySum);
      if (unassignedPaid > 0) {
        const fallback = o.payment?.method || 'other';
        const cur = payMap.get(fallback) ?? { total: 0, count: 0 };
        payMap.set(fallback, { total: cur.total + unassignedPaid, count: cur.count + 1 });
      }
    } else if (paid > 0) {
      const method = o.payment?.method || 'other';
      const cur = payMap.get(method) ?? { total: 0, count: 0 };
      payMap.set(method, { total: cur.total + paid, count: cur.count + 1 });
    }
  });

  const totalPaid = Array.from(payMap.values()).reduce((sum, p) => sum + p.total, 0);
  const totalAccounted = totalPaid + totalPending;
  const settlementRate = totalAccounted > 0 ? (totalPaid / totalAccounted) * 100 : 100;

  return {
    revenue,
    completed: completedSales.length,
    inProgress: inProgSales.length,
    pending: pendingSales.length,
    cancelled: cancelledSales.length,
    cancelledAmount,
    totalPaid,
    totalPending,
    pendingCount,
    settlementRate,
    payMap: Object.fromEntries(payMap),
  };
}

describe('Conciliação Financeira & Contábil: Relatórios vs. Clientes', () => {
  const PARTNER_A = 'partner-atelie-flores';
  const PARTNER_B = 'partner-atelie-docura';

  const mockOrders: OrderTestSample[] = [
    // Parceiro A: 1 Concluído (R$ 500), 1 Em produção (R$ 300), 1 Pendente (R$ 200), 1 Cancelado (R$ 150)
    {
      id: 'ord-1',
      userId: PARTNER_A,
      customerId: 'cust-1',
      price: 500,
      status: 'completed',
      payment: { status: 'completed', method: 'pix', paidAmount: 500 },
    },
    {
      id: 'ord-2',
      userId: PARTNER_A,
      customerId: 'cust-1',
      price: 300,
      status: 'in-progress',
      // Sinal de 50% pago via Dinheiro
      payment: { status: 'partial', method: 'cash', paidAmount: 150 },
    },
    {
      id: 'ord-3',
      userId: PARTNER_A,
      customerId: 'cust-2',
      price: 200,
      status: 'pending',
      payment: { status: 'pending', method: 'credit', paidAmount: 0 },
    },
    {
      id: 'ord-4',
      userId: PARTNER_A,
      customerId: 'cust-2',
      price: 150,
      status: 'cancelled',
      payment: { status: 'pending', paidAmount: 0 },
    },
    // Parceiro B: 1 Concluído com pagamento dividido (R$ 1000)
    {
      id: 'ord-5',
      userId: PARTNER_B,
      customerId: 'cust-3',
      price: 1000,
      status: 'completed',
      payment: {
        status: 'completed',
        method: 'credit',
        paidAmount: 1000,
        history: [
          { amount: 400, method: 'pix' },
          { amount: 600, method: 'credit' },
        ],
      },
    },
  ];

  describe('1. Conciliação de Faturamento Realizado (Todo o Histórico)', () => {
    it('deve ter Faturamento Realizado de Clientes IDÊNTICO ao Faturamento Realizado de Relatórios para o Parceiro A', () => {
      const customerMetrics = calculateCustomerMetrics(mockOrders, PARTNER_A);
      const reportMetrics = calculateReportMetrics(mockOrders, 'all', PARTNER_A);

      // Faturamento Realizado (apenas pedidos completed)
      expect(customerMetrics.realizedRevenue).toBe(500);
      expect(reportMetrics.revenue).toBe(500);
      expect(customerMetrics.realizedRevenue).toBe(reportMetrics.revenue);

      // Quantidade de concluídos idêntica
      expect(customerMetrics.completedCount).toBe(reportMetrics.completed);
      expect(customerMetrics.completedCount).toBe(1);
    });

    it('deve demonstrar a diferença entre Faturamento Realizado e Carteira Contratada (incluindo produção)', () => {
      const customerMetrics = calculateCustomerMetrics(mockOrders, PARTNER_A);

      // Realizado: 500 (ord-1)
      expect(customerMetrics.realizedRevenue).toBe(500);
      // Em produção: 300 (ord-2) + 200 (ord-3) = 500
      expect(customerMetrics.inProductionAmount).toBe(500);
      // Total Contratado: 500 + 500 = 1000 (descarta ord-4 que é cancelado de R$ 150)
      expect(customerMetrics.totalContracted).toBe(1000);
      expect(customerMetrics.totalOrdersCount).toBe(3); // 3 válidos
    });

    it('deve descartar pedidos cancelados em ambas as rotas com integridade total', () => {
      const customerMetrics = calculateCustomerMetrics(mockOrders, PARTNER_A);
      const reportMetrics = calculateReportMetrics(mockOrders, 'all', PARTNER_A);

      // Cancelado de R$ 150 não entra na receita nem na carteira
      expect(customerMetrics.totalContracted).toBe(1000); // 500 + 300 + 200, sem os 150
      expect(reportMetrics.cancelled).toBe(1);
      expect(reportMetrics.cancelledAmount).toBe(150);
    });

    it('deve conciliar valores globais (sem filtro de parceiro) perfeitamente entre Clientes e Relatórios', () => {
      const globalCustomerMetrics = calculateCustomerMetrics(mockOrders, null);
      const globalReportMetrics = calculateReportMetrics(mockOrders, 'all', null);

      // Realizado: 500 (Parceiro A) + 1000 (Parceiro B) = 1500
      expect(globalCustomerMetrics.realizedRevenue).toBe(1500);
      expect(globalReportMetrics.revenue).toBe(1500);
      expect(globalCustomerMetrics.realizedRevenue).toBe(globalReportMetrics.revenue);
    });
  });

  describe('2. Fluxo de Caixa e Meios de Pagamento em Relatórios', () => {
    it('deve decompor pagamentos mistos (PIX + Cartão) nas fatias exatas do histórico', () => {
      const reportMetrics = calculateReportMetrics(mockOrders, 'all', PARTNER_B);

      // ord-5 teve R$ 400 em pix e R$ 600 em credit
      expect(reportMetrics.payMap['pix']?.total).toBe(400);
      expect(reportMetrics.payMap['credit']?.total).toBe(600);
      expect(reportMetrics.totalPaid).toBe(1000);
      expect(reportMetrics.totalPending).toBe(0);
      expect(reportMetrics.settlementRate).toBe(100);
    });

    it('deve calcular Saldo Pendente a Receber e Taxa de Liquidação para pedidos parciais e em aberto', () => {
      const reportMetrics = calculateReportMetrics(mockOrders, 'all', PARTNER_A);

      // ord-1: 500 pago (PIX)
      // ord-2: 150 pago (cash), resta 150 a receber
      // ord-3: 0 pago, resta 200 a receber
      // Total pago: 650
      // Total a receber: 350 (150 + 200)
      // Total contratado válido: 650 + 350 = 1000
      expect(reportMetrics.totalPaid).toBe(650);
      expect(reportMetrics.totalPending).toBe(350);
      expect(reportMetrics.pendingCount).toBe(2);
      expect(reportMetrics.totalPaid + reportMetrics.totalPending).toBe(1000);

      // 650 de 1000 = 65% liquidado
      expect(reportMetrics.settlementRate).toBe(65);
    });

    it('deve assumir quitação total se um pedido concluído não tiver o paidAmount digitado manualmente', () => {
      const orderWithoutManualPaid: OrderTestSample[] = [
        {
          id: 'ord-implicit',
          userId: PARTNER_A,
          price: 750,
          status: 'completed',
          payment: { status: 'completed', method: 'pix', paidAmount: 0 },
        },
      ];

      const reportMetrics = calculateReportMetrics(orderWithoutManualPaid, 'all', PARTNER_A);

      expect(reportMetrics.totalPaid).toBe(750);
      expect(reportMetrics.totalPending).toBe(0);
      expect(reportMetrics.payMap['pix']?.total).toBe(750);
    });
  });
});

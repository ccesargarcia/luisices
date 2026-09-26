import { describe, it, expect } from 'vitest';
const { AiToolsExecutor, getPeriodInterval } = require('../../../functions/ai/tools');
const { getCallerScope } = require('../../../functions/ai/authorization');
const { sanitizeOrderForAi } = require('../../../functions/ai/repositories');

describe('IA-02: Cálculos Financeiros Exatos e Consultas Completas', () => {
  const mockOrders = [
    {
      orderId: 'ord-1',
      orderNumber: '#1001',
      customerName: 'Beatriz Lima',
      customerPhone: '11988887777',
      productSummary: 'Kit Festa Safari',
      totalPrice: 300,
      paidAmount: 300,
      remainingAmount: 0,
      status: 'completed',
      paymentStatus: 'paid',
      deliveryDate: '2026-09-20',
      createdAt: '2026-09-15T10:00:00Z',
      userId: 'user-admin',
      isDeleted: false,
    },
    {
      orderId: 'ord-2',
      orderNumber: '#1002',
      customerName: 'Carlos Silva',
      customerPhone: '11977776666',
      productSummary: 'Caixinhas Milk 20un',
      totalPrice: 150,
      paidAmount: 50,
      remainingAmount: 100,
      status: 'in-progress',
      paymentStatus: 'partial',
      deliveryDate: '2026-09-28',
      createdAt: '2026-09-22T14:00:00Z',
      userId: 'user-admin',
      isDeleted: false,
    },
    {
      orderId: 'ord-3',
      orderNumber: '#1003',
      customerName: 'Amanda Ferreira',
      customerPhone: '11966665555',
      productSummary: 'Convite Luxo',
      totalPrice: 200,
      paidAmount: 0,
      remainingAmount: 200,
      status: 'pending',
      paymentStatus: 'pending',
      deliveryDate: '2026-10-05',
      createdAt: '2026-09-25T08:00:00Z',
      userId: 'user-func',
      createdBy: 'user-func',
      isDeleted: false,
    },
    {
      orderId: 'ord-4',
      orderNumber: '#1004',
      customerName: 'Desistente',
      totalPrice: 500,
      paidAmount: 0,
      remainingAmount: 500,
      status: 'cancelled',
      paymentStatus: 'pending',
      createdAt: '2026-09-10T12:00:00Z',
      userId: 'user-admin',
      isDeleted: false,
    },
  ];

  const mockCustomers = [
    {
      id: 'cust-1',
      name: 'Beatriz Lima',
      phone: '(11) 98888-7777',
      city: 'São Paulo',
      userId: 'user-admin',
      isDeleted: false,
    },
    {
      id: 'cust-2',
      name: 'Carlos Silva',
      phone: '11977776666',
      city: 'Campinas',
      userId: 'user-admin',
      isDeleted: false,
    },
    {
      id: 'cust-3',
      name: 'Amanda Ferreira',
      phone: '11966665555',
      city: 'São Paulo',
      userId: 'user-func',
      isDeleted: false,
    },
  ];

  const mockRepos = {
    getScopedOrders: async (scope: any) => {
      if (scope.isAdmin) return mockOrders;
      return mockOrders.filter((o) => o.userId === scope.uid || o.createdBy === scope.uid);
    },
    getScopedCustomers: async (scope: any, options: any = {}) => {
      let filtered = mockCustomers;
      if (!scope.isAdmin) {
        filtered = filtered.filter((c) => c.userId === scope.uid);
      }
      if (options.searchTerm) {
        const term = options.searchTerm.toLowerCase();
        filtered = filtered.filter((c) => c.name.toLowerCase().includes(term) || c.city.toLowerCase().includes(term));
      }
      return {
        customers: filtered,
        totalScoped: mockCustomers.length,
        totalFiltered: filtered.length,
        hasMore: false,
      };
    },
    getTeamMembers: async () => [
      { uid: 'user-admin', name: 'Admin Geral', email: 'admin@luisices.com.br' },
      { uid: 'user-func', name: 'Amanda Vendedora', email: 'amanda@luisices.com.br' },
    ],
  };

  const executor = new AiToolsExecutor(mockRepos);

  describe('executeFinancialSummary', () => {
    it('deve receber e respeitar o objeto completo validado com período e filtros', async () => {
      const scopeAdmin = getCallerScope('user-admin', { role: 'admin', active: true });
      const summary = await executor.executeFinancialSummary({ period: 'all' }, scopeAdmin);

      expect(summary.period).toBe('all');
      // Faturamento Realizado: apenas concluídos = 300
      expect(summary.faturamentoRealizado).toBe(300);
      // Volume Total Emitido: não-cancelados = 300 + 150 + 200 = 650
      expect(summary.volumeTotalEmitido).toBe(650);
      // Total recebido: 300 + 50 = 350
      expect(summary.totalRecebido).toBe(350);
      // Saldo pendente: 100 + 200 = 300
      expect(summary.totalPendenteReceber).toBe(300);
      // Pedidos
      expect(summary.pedidosConcluidos).toBe(1);
      expect(summary.pedidosEmProducao).toBe(1);
      expect(summary.pedidosPendentes).toBe(1);
      expect(summary.pedidosCancelados).toBe(1);
      expect(summary.totalPedidosValidos).toBe(3);
    });

    it('deve calcular corretamente por colaborador específico quando solicitado por admin', async () => {
      const scopeAdmin = getCallerScope('user-admin', { role: 'admin', active: true });
      const summary = await executor.executeFinancialSummary({ period: 'all', userIdentifier: 'Amanda' }, scopeAdmin);

      expect(summary.totalPedidosValidos).toBe(1);
      expect(summary.volumeTotalEmitido).toBe(200);
      expect(summary.totalPendenteReceber).toBe(200);
    });

    it('colaborador desconhecido NÃO deve retornar totais globais', async () => {
      const scopeAdmin = getCallerScope('user-admin', { role: 'admin', active: true });
      const summary = await executor.executeFinancialSummary({ period: 'all', userIdentifier: 'Inexistente' }, scopeAdmin);

      expect(summary.collaboratorNotFound).toBe(true);
      expect(summary.faturamentoRealizado).toBe(0);
      expect(summary.volumeTotalEmitido).toBe(0);
    });
  });

  describe('executeQueryOrdersView', () => {
    it('deve buscar pedidos por termo de pesquisa e retornar metadados de paginação', async () => {
      const scopeAdmin = getCallerScope('user-admin', { role: 'admin', active: true });
      const res = await executor.executeQueryOrdersView({ searchTerm: 'Safari' }, scopeAdmin);

      expect(res.orders.length).toBe(1);
      expect(res.orders[0].productSummary).toContain('Safari');
      expect(res.totalFound).toBe(1);
    });

    it('deve isolar pedidos para funcionários', async () => {
      const scopeFunc = getCallerScope('user-func', { role: 'funcionario', active: true, permissions: { aiCopilot: true } });
      const res = await executor.executeQueryOrdersView({}, scopeFunc);

      expect(res.orders.length).toBe(1);
      expect(res.orders[0].orderNumber).toBe('#1003');
    });
  });

  describe('executeQueryCustomers', () => {
    it('deve pesquisar clientes por cidade ou nome', async () => {
      const scopeAdmin = getCallerScope('user-admin', { role: 'admin', active: true });
      const res = await executor.executeQueryCustomers({ searchTerm: 'Campinas' }, scopeAdmin);

      expect(res.customers.length).toBe(1);
      expect(res.customers[0].name).toBe('Carlos Silva');
    });
  });

  describe('sanitizeOrderForAi', () => {
    it('deve extrair preço e pagamento a partir da estrutura real do Firestore (price e payment object)', () => {
      const rawFirestoreOrder = {
        price: 250,
        customerName: 'Lagoona Personalizados',
        status: 'concluido',
        payment: {
          totalAmount: 250,
          paidAmount: 100,
          remainingAmount: 150,
          status: 'partial',
        },
      };

      const sanitized = sanitizeOrderForAi('order-123', rawFirestoreOrder);
      expect(sanitized.totalPrice).toBe(250);
      expect(sanitized.paidAmount).toBe(100);
      expect(sanitized.remainingAmount).toBe(150);
      expect(sanitized.status).toBe('completed');
      expect(sanitized.paymentStatus).toBe('partial');
    });

    it('deve normalizar status em português e variações operacionais', () => {
      expect(sanitizeOrderForAi('1', { status: 'entregue' }).status).toBe('completed');
      expect(sanitizeOrderForAi('2', { status: 'em produção' }).status).toBe('in-progress');
      expect(sanitizeOrderForAi('3', { status: 'cancelado' }).status).toBe('cancelled');
      expect(sanitizeOrderForAi('4', { status: 'pendente' }).status).toBe('pending');
    });
  });

  describe('executeUserSummary', () => {
    it('deve retornar métricas detalhadas com volume emitido e faturamento para colaborador auditado', async () => {
      const scopeAdmin = getCallerScope('user-admin', { role: 'admin', active: true });
      const res = await executor.executeUserSummary({ userIdentifier: 'amanda@luisices.com.br' }, scopeAdmin);

      expect(res.authorized).toBe(true);
      expect(res.found).toBe(true);
      expect(res.metrics.totalOrders).toBe(1);
      expect(res.metrics.grossIssuedVolume).toBe(200);
      expect(res.metrics.volumeTotalEmitido).toBe(200);
      expect(res.metrics.pendingReceivables).toBe(200);
      expect(res.metrics.pendingOrders).toBe(1);
    });

    it('deve localizar colaborador por nome ou parte do e-mail', async () => {
      const scopeAdmin = getCallerScope('user-admin', { role: 'admin', active: true });
      const res = await executor.executeUserSummary({ userIdentifier: 'Amanda' }, scopeAdmin);

      expect(res.found).toBe(true);
      expect(res.user.name).toBe('Amanda Vendedora');
    });
  });
});

import { describe, it, expect } from 'vitest';
const { AiToolsExecutor, getPeriodInterval } = require('../../../functions/ai/tools');
const { getCallerScope } = require('../../../functions/ai/authorization');
const { AiDataRepositories, sanitizeOrderForAi } = require('../../../functions/ai/repositories');

describe('IA-02: Cálculos Financeiros Exatos e Consultas Completas', () => {
  it('não carrega amostra da galeria no contexto inicial do Copiloto', async () => {
    const repos = new AiDataRepositories(null);
    repos.getStoreProducts = async () => [];
    repos.getSupplies = async () => [];
    repos.getGalleryItems = async () => { throw new Error('a galeria é pesquisada sob demanda'); };

    await expect(repos.getCatalogKnowledge(getCallerScope('user-admin', { role: 'admin', active: true }))).resolves.toBe('');
  });

  it('busca pedido por ID sem varredura e mantém o filtro de escopo', async () => {
    const data = { orderNumber: '#2026-0001', customerName: 'Cliente', price: 125, userId: 'owner-1' };
    const orderRef = { id: 'order-doc' };
    const db = {
      collection: (name: string) => {
        if (name !== 'orders') throw new Error('coleção inesperada');
        return {
          doc: (id: string) => {
            if (id !== 'order-doc') throw new Error('ID inesperado');
            return { get: async () => ({ exists: true, id, ref: orderRef, data: () => data }) };
          },
          where: () => { throw new Error('não deve consultar a coleção'); },
        };
      },
    };
    const repos = new AiDataRepositories(db);

    await expect(repos.getScopedOrderSummary(getCallerScope('owner-1', { role: 'funcionario', active: true }), 'order-doc'))
      .resolves.toMatchObject({ orderId: 'order-doc', totalPrice: 125 });
    await expect(repos.getScopedOrderSummary(getCallerScope('other-1', { role: 'funcionario', active: true }), 'order-doc'))
      .resolves.toBeNull();
  });

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
      { uid: 'user-admin', name: 'Admin Geral', email: 'admin@test.local' },
      { uid: 'user-func', name: 'Amanda Vendedora', email: 'amanda@test.local' },
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

    it('usa o mesmo saldo em resumo financeiro, resumo diário e auditoria do colaborador', async () => {
      const inconsistentOrders = [
        { orderId: 'overpaid', orderNumber: '#1', customerName: 'Cliente A', totalPrice: 100, paidAmount: 150, remainingAmount: 30, status: 'completed', paymentStatus: 'partial', userId: 'user-test', createdAt: '2026-09-20T12:00:00Z' },
        { orderId: 'paid', orderNumber: '#2', customerName: 'Cliente B', totalPrice: 50, paidAmount: 0, remainingAmount: 50, status: 'pending', paymentStatus: 'paid', userId: 'user-test', createdAt: '2026-09-20T12:00:00Z' },
        { orderId: 'negative', orderNumber: '#3', customerName: 'Cliente C', totalPrice: 25, paidAmount: -5, remainingAmount: -10, status: 'pending', paymentStatus: 'pending', userId: 'user-test', createdAt: '2026-09-20T12:00:00Z' },
        { orderId: 'cancelled', orderNumber: '#4', customerName: 'Cliente D', totalPrice: 500, paidAmount: 500, remainingAmount: 0, status: 'cancelled', paymentStatus: 'paid', userId: 'user-test', createdAt: '2026-09-20T12:00:00Z' },
      ];
      const inconsistentRepos = {
        getScopedOrders: async () => inconsistentOrders,
        getTeamMembers: async () => [{ uid: 'user-test', name: 'Teste Colaborador', email: 'teste@test.local' }],
        getScopedCustomers: async () => ({ customers: [] }),
      };
      const inconsistentExecutor = new AiToolsExecutor(inconsistentRepos);
      const scopeAdmin = getCallerScope('user-admin', { role: 'admin', active: true });

      const summary = await inconsistentExecutor.executeFinancialSummary({ period: 'all' }, scopeAdmin);
      const briefing = await inconsistentExecutor.executeDailyBriefing({ date: '2026-09-26' }, scopeAdmin);
      const audit = await inconsistentExecutor.executeUserSummary({ userIdentifier: 'Teste Colaborador' }, scopeAdmin);

      expect(summary).toMatchObject({ totalRecebido: 150, totalPendenteReceber: 25, volumeTotalEmitido: 175 });
      expect(briefing).toMatchObject({ totalReceived: 150, pendingPaymentTotal: 25, pendingPaymentCount: 1 });
      expect(audit.metrics).toMatchObject({ totalReceived: 150, pendingReceivables: 25, grossIssuedVolume: 175 });
      expect(audit.sampleOrders.find((order: any) => order.orderNumber === '#1')).toMatchObject({ paidAmount: 100, remainingAmount: 0 });
      expect(audit.sampleOrders.find((order: any) => order.orderNumber === '#2')).toMatchObject({ paidAmount: 50, remainingAmount: 0 });
    });
  });

  describe('executeQueryOrdersView', () => {
    it('usa busca pontual para número exato de pedido, sem varrer o histórico', async () => {
      const order = { ...mockOrders[0] };
      const getScopedOrders = vi.fn(async () => { throw new Error('não deve varrer o histórico'); });
      const getScopedOrderSummary = vi.fn(async () => order);
      const scopedExecutor = new AiToolsExecutor({ getScopedOrders, getScopedOrderSummary });
      const scopeAdmin = getCallerScope('user-admin', { role: 'admin', active: true });

      const result = await scopedExecutor.executeQueryOrdersView({ searchTerm: '#1001' }, scopeAdmin);

      expect(getScopedOrderSummary).toHaveBeenCalledWith(scopeAdmin, '#1001');
      expect(getScopedOrders).not.toHaveBeenCalled();
      expect(result).toMatchObject({ totalFound: 1, hasMore: false });
      expect(result.orders[0].orderNumber).toBe('#1001');
    });

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

    it('deve pesquisar clientes atendidos por um colaborador a partir de seus pedidos', async () => {
      const scopeAdmin = getCallerScope('user-admin', { role: 'admin', active: true });
      const res = await executor.executeQueryCustomers({ searchTerm: 'amanda@test.local' }, scopeAdmin);

      expect(res.customers.length).toBe(1);
      expect(res.customers[0].name).toBe('Amanda Ferreira');
      expect(res.customers[0].totalOrders).toBe(1);

      const resByIdentifier = await executor.executeQueryCustomers({ userIdentifier: 'Amanda' }, scopeAdmin);
      expect(resByIdentifier.customers.length).toBe(1);
      expect(resByIdentifier.customers[0].name).toBe('Amanda Ferreira');
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

    it('normaliza recebido e saldo mesmo quando os campos persistidos divergem', () => {
      expect(sanitizeOrderForAi('5', {
        totalPrice: 100,
        paidAmount: 150,
        remainingAmount: 30,
        status: 'completed',
        paymentStatus: 'partial',
      })).toMatchObject({ paidAmount: 100, remainingAmount: 0 });
      expect(sanitizeOrderForAi('6', {
        totalPrice: 50,
        paidAmount: 0,
        remainingAmount: 50,
        status: 'pending',
        paymentStatus: 'paid',
      })).toMatchObject({ paidAmount: 50, remainingAmount: 0 });
    });
  });

  describe('executeUserSummary', () => {
    it('deve retornar métricas detalhadas com volume emitido e faturamento para colaborador auditado', async () => {
      const scopeAdmin = getCallerScope('user-admin', { role: 'admin', active: true });
      const res = await executor.executeUserSummary({ userIdentifier: 'amanda@test.local' }, scopeAdmin);

      expect(res.authorized).toBe(true);
      expect(res.found).toBe(true);
      expect(res.metrics.totalOrders).toBe(1);
      expect(res.metrics.grossIssuedVolume).toBe(200);
      expect(res.metrics.volumeTotalEmitido).toBe(200);
      expect(res.metrics.pendingReceivables).toBe(200);
      expect(res.metrics.pendingOrders).toBe(1);
      expect(res.customers.length).toBe(1);
      expect(res.customers[0].name).toBe('Amanda Ferreira');
      expect(res.customers[0].totalSpent).toBe(200);
    });

    it('deve localizar colaborador por nome ou parte do e-mail', async () => {
      const scopeAdmin = getCallerScope('user-admin', { role: 'admin', active: true });
      const res = await executor.executeUserSummary({ userIdentifier: 'Amanda' }, scopeAdmin);

      expect(res.found).toBe(true);
      expect(res.user.name).toBe('Amanda Vendedora');
      expect(res.customers.length).toBe(1);
    });
  });
});

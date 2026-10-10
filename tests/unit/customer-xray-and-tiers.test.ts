import { describe, it, expect } from 'vitest';
import {
  computeCustomerXRay,
  filterOrdersByPeriod,
  calculateCustomerFrequency,
  getTopCustomerProduct,
  getPreferredPaymentMethod,
  getCustomerTier,
  DEFAULT_CUSTOMER_TIERS,
  CustomerTiersSettings,
} from '../../src/app/utils/customerMetrics';
import { Customer, Order } from '../../src/app/types';

describe('Inteligência Comercial: Raio X, Ticket Médio e Faixas de Clientes', () => {
  const referenceDate = new Date('2026-10-10T12:00:00.000Z');

  const mockCustomer: Customer = {
    id: 'cust-1',
    name: 'Mariana Silva',
    phone: '11987654321',
    email: 'mariana@example.com',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    totalSpent: 800,
    totalOrders: 3,
  };

  const mockOrders: Order[] = [
    {
      id: 'ord-1',
      orderNumber: 101,
      customerId: 'cust-1',
      customerName: 'Mariana Silva',
      productName: 'Agenda Luxo 2026',
      quantity: 2,
      price: 300,
      status: 'completed',
      date: '2026-09-20T10:00:00.000Z', // Há 20 dias
      createdAt: '2026-09-20T10:00:00.000Z',
      paymentMethod: 'pix',
      items: [{ name: 'Agenda Luxo 2026', quantity: 2, price: 150 }],
    },
    {
      id: 'ord-2',
      orderNumber: 102,
      customerId: 'cust-1',
      customerName: 'Mariana Silva',
      productName: 'Planner Semanal',
      quantity: 1,
      price: 200,
      status: 'completed',
      date: '2026-08-11T14:00:00.000Z', // Há 60 dias
      createdAt: '2026-08-11T14:00:00.000Z',
      paymentMethod: 'pix',
      items: [{ name: 'Planner Semanal', quantity: 1, price: 200 }],
    },
    {
      id: 'ord-3',
      orderNumber: 103,
      customerId: 'cust-1',
      customerName: 'Mariana Silva',
      productName: 'Caderno Devocional',
      quantity: 1,
      price: 150,
      status: 'in-progress', // Em produção
      date: '2026-10-05T09:00:00.000Z', // Há 5 dias
      createdAt: '2026-10-05T09:00:00.000Z',
      paymentMethod: 'credit',
      items: [{ name: 'Caderno Devocional', quantity: 1, price: 150 }],
    },
    {
      id: 'ord-4',
      orderNumber: 104,
      customerId: 'cust-1',
      customerName: 'Mariana Silva',
      productName: 'Bloco Rascunho',
      quantity: 2,
      price: 50,
      status: 'cancelled', // Cancelado (deve ser descartado)
      date: '2026-07-01T12:00:00.000Z',
      createdAt: '2026-07-01T12:00:00.000Z',
      paymentMethod: 'cash',
    },
  ];

  describe('1. Filtragem por Período de Análise', () => {
    it('deve retornar todos os pedidos para o período "all"', () => {
      const filtered = filterOrdersByPeriod(mockOrders, 'all', referenceDate);
      expect(filtered).toHaveLength(4);
    });

    it('deve filtrar apenas pedidos dos últimos 30 dias', () => {
      // 10 de Outubro menos 30 dias = 10 de Setembro
      // ord-1 (20 Set) e ord-3 (5 Out) estão dentro
      const filtered = filterOrdersByPeriod(mockOrders, '30d', referenceDate);
      expect(filtered.map((o) => o.id)).toEqual(['ord-1', 'ord-3']);
    });

    it('deve filtrar pedidos dos últimos 90 dias', () => {
      // ord-1 (20 Set), ord-2 (11 Ago) e ord-3 (5 Out) estão dentro
      const filtered = filterOrdersByPeriod(mockOrders, '90d', referenceDate);
      expect(filtered.map((o) => o.id)).toEqual(['ord-1', 'ord-2', 'ord-3']);
    });
  });

  describe('2. Métrica de Frequência de Recompra e Recência', () => {
    it('deve calcular a média de dias entre compras sucessivas', () => {
      // Compras: ord-2 (11 Ago), ord-1 (20 Set), ord-3 (5 Out)
      // 11 Ago a 20 Set = 40 dias
      // 20 Set a 5 Out = 15 dias
      // Média exata: (39.83 + 14.95) / 2 = 27.39 -> 27 dias
      const freq = calculateCustomerFrequency(mockOrders);
      expect(freq).toBe(27);
    });

    it('deve retornar null para clientes com menos de 2 pedidos válidos', () => {
      const singleOrder = [mockOrders[0]];
      expect(calculateCustomerFrequency(singleOrder)).toBeNull();
    });
  });

  describe('3. Identificação de Produto Mais Comprado e Meio de Pagamento', () => {
    it('deve identificar o produto favorito com maior quantidade/receita', () => {
      const topProd = getTopCustomerProduct(mockOrders);
      expect(topProd).not.toBeNull();
      expect(topProd?.name).toBe('Agenda Luxo 2026');
      expect(topProd?.count).toBe(2);
      expect(topProd?.revenue).toBe(300);
    });

    it('deve identificar a forma de pagamento predominante', () => {
      // ord-1: pix, ord-2: pix, ord-3: credit -> PIX vence
      const prefPayment = getPreferredPaymentMethod(mockOrders);
      expect(prefPayment).toBe('pix');
    });
  });

  describe('4. Classificação por Faixas de Gasto (Tiers) Configuráveis', () => {
    it('deve classificar corretamente nas faixas padrão', () => {
      expect(getCustomerTier(1500, DEFAULT_CUSTOMER_TIERS)).toBe('diamond');
      expect(getCustomerTier(750, DEFAULT_CUSTOMER_TIERS)).toBe('gold');
      expect(getCustomerTier(300, DEFAULT_CUSTOMER_TIERS)).toBe('silver');
      expect(getCustomerTier(100, DEFAULT_CUSTOMER_TIERS)).toBe('bronze');
      expect(getCustomerTier(0, DEFAULT_CUSTOMER_TIERS)).toBe('none');
    });

    it('deve respeitar as faixas customizadas configuradas pelo ateliê', () => {
      const customTiers: CustomerTiersSettings = {
        diamondMin: 3000,
        goldMin: 1500,
        silverMin: 800,
        inactiveDaysThreshold: 90,
      };

      // 1000 que antes era diamante agora é apenas prata
      expect(getCustomerTier(1000, customTiers)).toBe('silver');
      expect(getCustomerTier(2000, customTiers)).toBe('gold');
      expect(getCustomerTier(3500, customTiers)).toBe('diamond');
    });
  });

  describe('5. Raio X Comercial Completo (computeCustomerXRay)', () => {
    it('deve computar faturamento realizado, em produção e ticket médio com precisão', () => {
      const xray = computeCustomerXRay(mockCustomer, mockOrders, 'all', DEFAULT_CUSTOMER_TIERS, referenceDate);

      // Faturamento concluído (ord-1: 300 + ord-2: 200 = 500)
      expect(xray.totalRevenue).toBe(500);
      expect(xray.completedOrdersCount).toBe(2);

      // Valor em produção (ord-3: 150)
      expect(xray.inProductionAmount).toBe(150);
      expect(xray.totalValidAmount).toBe(650);

      // Ticket médio: 500 / 2 = 250
      expect(xray.averageTicket).toBe(250);

      // Último pedido foi ord-3 em 2026-10-05 (há 5 dias de 2026-10-10)
      expect(xray.daysSinceLastOrder).toBe(5);
      expect(xray.isInactive).toBe(false);

      // Faixa (R$ 500 = ouro)
      expect(xray.tier).toBe('gold');
      expect(xray.preferredPaymentMethod).toBe('pix');
      expect(xray.topProduct?.name).toBe('Agenda Luxo 2026');
    });

    it('deve sinalizar cliente como inativo quando a última compra exceder o limite', () => {
      const oldOrders: Order[] = [
        {
          id: 'ord-old',
          orderNumber: 99,
          customerId: 'cust-1',
          customerName: 'Mariana Silva',
          price: 400,
          status: 'completed',
          date: '2026-05-01T10:00:00.000Z', // Há mais de 150 dias
          createdAt: '2026-05-01T10:00:00.000Z',
        },
      ];

      const xray = computeCustomerXRay(mockCustomer, oldOrders, 'all', DEFAULT_CUSTOMER_TIERS, referenceDate);
      expect(xray.daysSinceLastOrder).toBeGreaterThan(60);
      expect(xray.isInactive).toBe(true);
    });

    it('deve calcular o Raio X recortado apenas para os últimos 30 dias', () => {
      const xray30d = computeCustomerXRay(mockCustomer, mockOrders, '30d', DEFAULT_CUSTOMER_TIERS, referenceDate);

      // Apenas ord-1 (300 concluído) e ord-3 (150 em produção)
      expect(xray30d.totalRevenue).toBe(300);
      expect(xray30d.completedOrdersCount).toBe(1);
      expect(xray30d.inProductionAmount).toBe(150);
      expect(xray30d.averageTicket).toBe(300);
    });
  });
});

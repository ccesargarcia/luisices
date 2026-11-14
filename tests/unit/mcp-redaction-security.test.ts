import { describe, expect, it, vi } from 'vitest';

const { executeScopedToolByName } = require('../../functions/mcp/endpoint');

describe('Redação financeira por escopo MCP', () => {
  it('remove valores de pedidos e clientes sem escopo financeiro', async () => {
    const executor = {
      executeQueryOrdersView: vi.fn().mockResolvedValue({
        orders: [{
          orderNumber: '#S-1', totalPrice: 120, paidAmount: 20,
          remainingAmount: 100, paymentStatus: 'partial', status: 'pending',
        }],
        totalFound: 1,
      }),
      executeQueryCustomers: vi.fn().mockResolvedValue({
        customers: [{ name: 'Cliente sintético', totalSpent: 120, totalOrders: 1 }],
      }),
    };

    const orders = await executeScopedToolByName(executor, 'query_orders_view', {}, {}, ['orders:read']);
    expect(orders.orders[0]).toEqual({ orderNumber: '#S-1', status: 'pending' });

    const customers = await executeScopedToolByName(executor, 'query_customers', {}, {}, ['customers:read']);
    expect(customers.customers[0]).toEqual({ name: 'Cliente sintético', totalOrders: 1 });
  });

  it('remove métricas e valores financeiros dos resumos operacionais, inclusive nas listas de pedidos', async () => {
    const executor = {
      executeDailyBriefing: vi.fn().mockResolvedValue({
        pendingPaymentCount: 2,
        pendingPaymentTotal: 180,
        realizedRevenue: 300,
        totalReceived: 120,
        todayDate: '2026-11-13',
        delayedOrders: [{ orderNumber: '#S-2', totalPrice: 120, paidAmount: 20, remainingAmount: 100, paymentStatus: 'partial' }],
        todayDeliveries: [{ orderNumber: '#S-3', totalPrice: 60, paidAmount: 0, remainingAmount: 60, paymentStatus: 'pending' }],
      }),
      executeUserSummary: vi.fn().mockResolvedValue({
        authorized: true,
        metrics: { totalOrders: 3, realizedRevenue: 300, totalReceived: 120, averageTicket: 100 },
        customers: [{ name: 'Cliente sintético', totalSpent: 300, totalOrders: 3 }],
        sampleOrders: [{ orderNumber: '#S-4', totalPrice: 120, paidAmount: 20, remainingAmount: 100, paymentStatus: 'partial', payment: { paidAmount: 20 } }],
      }),
    };

    const briefing = await executeScopedToolByName(executor, 'daily_briefing', {}, {}, ['orders:read']);
    expect(briefing).toEqual({
      todayDate: '2026-11-13',
      delayedOrders: [{ orderNumber: '#S-2' }],
      todayDeliveries: [{ orderNumber: '#S-3' }],
    });

    const summary = await executeScopedToolByName(
      executor, 'get_user_summary', { userIdentifier: 'Equipe sintética' }, { isAdmin: true }, ['team:read'],
    );
    expect(summary.metrics).toEqual({ totalOrders: 3 });
    expect(summary.customers[0]).toEqual({ name: 'Cliente sintético', totalOrders: 3 });
    expect(summary.sampleOrders[0]).toEqual({ orderNumber: '#S-4' });
  });

  it('concede dados financeiros somente ao escopo apropriado', async () => {
    const executor = {
      executeUserSummary: vi.fn().mockResolvedValue({
        metrics: { totalOrders: 1, realizedRevenue: 100 },
        customers: [{ name: 'Cliente sintético', totalSpent: 100 }],
        sampleOrders: [{ orderNumber: '#S-5', totalPrice: 100, paidAmount: 40, remainingAmount: 60, payment: { paidAmount: 40 } }],
      }),
    };

    const paymentsOnly = await executeScopedToolByName(
      executor, 'get_user_summary', { userIdentifier: 'Equipe sintética' }, { isAdmin: true }, ['team:read', 'payments:read'],
    );
    expect(paymentsOnly.metrics).toEqual({ totalOrders: 1 });
    expect(paymentsOnly.sampleOrders[0]).toMatchObject({ totalPrice: 100, paidAmount: 40, remainingAmount: 60, payment: { paidAmount: 40 } });

    const financial = await executeScopedToolByName(
      executor, 'get_user_summary', { userIdentifier: 'Equipe sintética' }, { isAdmin: true }, ['team:read', 'financial:read'],
    );
    expect(financial.metrics).toEqual({ totalOrders: 1, realizedRevenue: 100 });
    expect(financial.customers[0].totalSpent).toBe(100);
  });
});

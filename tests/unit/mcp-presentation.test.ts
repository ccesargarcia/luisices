import { describe, expect, it } from 'vitest';

const { formatToolResultText } = require('../../functions/mcp/presentation');

describe('MCP response presentation', () => {
  it('shows a compact confirmation preview with the essential order details', () => {
    const text = formatToolResultText('create_order', {
      success: true,
      status: 'preview',
      requiresConfirmation: true,
      preview: {
        customerName: 'Ana',
        productName: 'Caixa milk',
        quantity: 30,
        deliveryDate: '2026-11-12',
        totalPrice: 240,
        customerId: 'internal-id',
        token: 'private-token',
      },
    });

    expect(text).toContain('Prévia pronta para revisar');
    expect(text).toContain('Cliente: Ana');
    expect(text).toContain('Produto: Caixa milk');
    expect(text).toContain('R$');
    expect(text).toContain('Aguardando sua confirmação');
    expect(text).not.toContain('internal-id');
    expect(text).not.toContain('private-token');
  });

  it('summarizes a result list with at most three readable examples', () => {
    const text = formatToolResultText('query_orders_view', {
      totalFound: 5,
      orders: Array.from({ length: 5 }, (_, index) => ({
        orderNumber: `#2030-000${index + 1}`,
        customerName: `Cliente ${index + 1}`,
        productName: 'Topo de bolo',
        status: 'pending',
      })),
      nextPageToken: 'private-page-token',
    });

    expect(text).toContain('5 pedidos encontrados');
    expect(text).toContain('Cliente 1');
    expect(text).toContain('Cliente 3');
    expect(text).not.toContain('Cliente 4');
    expect(text).not.toContain('private-page-token');
  });

  it('confirms successful mutations briefly and never prints technical fields', () => {
    const text = formatToolResultText('create_customer', {
      success: true,
      customerId: 'internal-id',
      name: 'Beatriz',
      token: 'private-token',
    });

    expect(text).toContain('Cliente cadastrado');
    expect(text).not.toContain('internal-id');
    expect(text).not.toContain('private-token');
  });

  it('presents daily and financial summaries as a few decision-ready lines', () => {
    const daily = formatToolResultText('daily_briefing', {
      todayDate: '2026-10-17',
      delayedCount: 2,
      todayDeliveriesCount: 3,
      inProgressCount: 4,
      completedCount: 5,
      pendingPaymentTotal: 125,
      delayedOrders: Array.from({ length: 20 }, () => ({ orderNumber: '#internal' })),
    });
    const financial = formatToolResultText('get_financial_summary', {
      periodLabel: 'Este mês',
      faturamentoRealizado: 1800,
      totalPendenteReceber: 320,
      ticketMedio: 90,
      pedidosCriadosNoPeriodo: 20,
      pedidosConcluidos: 14,
    });

    expect(daily).toContain('Entregas hoje: 3');
    expect(daily).not.toContain('#internal');
    expect(daily.split('\n')).toHaveLength(5);
    expect(financial).toContain('Faturamento:');
    expect(financial).toContain('A receber:');
    expect(financial.split('\n')).toHaveLength(5);
  });
});

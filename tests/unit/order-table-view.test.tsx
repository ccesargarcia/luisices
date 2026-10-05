import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderTable } from '../../src/app/components/OrderTable';
import type { Order } from '../../src/app/types';

describe('Funcionalidade: Visualização em Tabela de Pedidos (OrderTable)', () => {
  const baseOrder: Order = {
    id: 'ord-123456789',
    userId: 'user-1',
    orderNumber: '#1001',
    customerName: 'Carolina Mendes',
    customerPhone: '11988887777',
    productName: 'Kit Lembrancinha Batizado',
    quantity: 3,
    price: 250.0,
    status: 'in-progress',
    deliveryDate: '2026-10-15',
    createdAt: '2026-10-01T10:00:00Z',
    payment: {
      status: 'partial',
      method: 'pix',
      paidAmount: 100.0,
      remainingAmount: 150.0,
    },
    tags: [
      { name: 'Batizado', color: '#3B82F6' },
      { name: 'Luxo', color: '#10B981' },
      { name: 'Urgente', color: '#EF4444' },
    ],
  };

  it('deve renderizar os detalhes essenciais do pedido sem conter "Invalid Date"', () => {
    const html = renderToStaticMarkup(
      <OrderTable
        orders={[baseOrder]}
        selectedOrderIds={[]}
        onOrderClick={vi.fn()}
      />
    );

    // Verificações essenciais
    expect(html).not.toContain('Invalid Date');
    expect(html).toContain('#1001');
    expect(html).toContain('Carolina Mendes');
    expect(html).toContain('11988887777');
    expect(html).toContain('Kit Lembrancinha Batizado');
    expect(html).toContain('3x');
    expect(html).toContain('Parcial');
    expect(html).toContain('Resta:');
    expect(html).toContain('Batizado');
    expect(html).toContain('Luxo');
    expect(html).toContain('+1'); // 3 tags - 2 = +1
  });

  it('deve identificar e destacar pedidos com entrega atrasada', () => {
    const overdueOrder: Order = {
      ...baseOrder,
      id: 'ord-atrasado',
      orderNumber: '#9999',
      deliveryDate: '2020-01-01', // Data no passado
      status: 'in-progress',
    };

    const html = renderToStaticMarkup(
      <OrderTable
        orders={[overdueOrder]}
        selectedOrderIds={[]}
        onOrderClick={vi.fn()}
      />
    );

    expect(html).toContain('text-destructive font-bold');
    expect(html).toContain('title="Entrega atrasada"');
  });

  it('não deve marcar como atrasado pedidos já concluídos ou cancelados mesmo com data passada', () => {
    const completedOrder: Order = {
      ...baseOrder,
      id: 'ord-concluido',
      deliveryDate: '2020-01-01',
      status: 'completed',
    };

    const cancelledOrder: Order = {
      ...baseOrder,
      id: 'ord-cancelado',
      deliveryDate: '2020-01-01',
      status: 'cancelled',
    };

    const htmlCompleted = renderToStaticMarkup(
      <OrderTable
        orders={[completedOrder]}
        selectedOrderIds={[]}
        onOrderClick={vi.fn()}
      />
    );

    const htmlCancelled = renderToStaticMarkup(
      <OrderTable
        orders={[cancelledOrder]}
        selectedOrderIds={[]}
        onOrderClick={vi.fn()}
      />
    );

    expect(htmlCompleted).not.toContain('title="Entrega atrasada"');
    expect(htmlCancelled).not.toContain('title="Entrega atrasada"');
  });

  it('deve exibir indicador de pedido criado por voz via Alexa', () => {
    const voiceOrder: Order = {
      ...baseOrder,
      id: 'ord-alexa',
      source: 'alexa',
    };

    const html = renderToStaticMarkup(
      <OrderTable
        orders={[voiceOrder]}
        selectedOrderIds={[]}
        onOrderClick={vi.fn()}
      />
    );

    expect(html).toContain('title="Criado via Alexa"');
  });

  it('deve exibir selo de Permuta quando isExchange for verdadeiro', () => {
    const exchangeOrder: Order = {
      ...baseOrder,
      id: 'ord-permuta',
      isExchange: true,
    };

    const html = renderToStaticMarkup(
      <OrderTable
        orders={[exchangeOrder]}
        selectedOrderIds={[]}
        onOrderClick={vi.fn()}
      />
    );

    expect(html).toContain('Permuta');
  });

  it('deve exibir "A combinar" com estilo itálico quando a data de entrega for nula ou não definida', () => {
    const noDateOrder: Order = {
      ...baseOrder,
      id: 'ord-sem-data',
      deliveryDate: undefined,
    };

    const html = renderToStaticMarkup(
      <OrderTable
        orders={[noDateOrder]}
        selectedOrderIds={[]}
        onOrderClick={vi.fn()}
      />
    );

    expect(html).not.toContain('Invalid Date');
    expect(html).toContain('A combinar');
  });

  it('deve renderizar checkbox e destacar linha selecionada quando o pedido estiver em selectedOrderIds', () => {
    const html = renderToStaticMarkup(
      <OrderTable
        orders={[baseOrder]}
        selectedOrderIds={['ord-123456789']}
        onToggleSelect={vi.fn()}
        onOrderClick={vi.fn()}
        onToggleSelectAll={vi.fn()}
        allSelected={true}
      />
    );

    expect(html).toContain('bg-primary/5');
  });
});

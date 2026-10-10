import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CustomerCard } from '../../src/app/components/customers/CustomerCard';
import type { Customer } from '../../src/app/types';

describe('Componente: CustomerCard (Design System e Responsividade)', () => {
  const baseCustomer: Customer = {
    id: 'cust-101',
    name: 'Carolina Mendes',
    phone: '11988887777',
    email: 'carolina@exemplo.com',
    status: 'vip',
    address: 'Rua das Flores, 123, Apto 4',
    totalOrders: 12,
    totalSpent: 1450.5,
    lastOrderDate: '2026-10-01T12:00:00Z',
  };

  it('deve renderizar dados essenciais, status VIP e WhatsApp inline junto ao telefone', () => {
    const html = renderToStaticMarkup(
      <CustomerCard
        customer={baseCustomer}
        isSelected={false}
        onToggleSelect={vi.fn()}
        onOpenHistory={vi.fn()}
        onOpenEdit={vi.fn()}
        onOpenDelete={vi.fn()}
        onOpenNewOrder={vi.fn()}
        canEdit={true}
        canDelete={true}
        canCreateOrder={true}
      />
    );

    expect(html).toContain('Carolina Mendes');
    expect(html).toContain('11988887777');
    expect(html).toContain('carolina@exemplo.com');
    expect(html).toContain('Rua das Flores, 123, Apto 4');
    expect(html).toContain('VIP');
    expect(html).toContain('12 pedidos');
    expect(html).toContain('WhatsApp');
    expect(html).toContain('wa.me/5511988887777');
    expect(html).toContain('aria-label="Conversar no WhatsApp com Carolina Mendes"');
  });

  it('deve renderizar botões de ação com aria-labels esperados pelos testes E2E e acessibilidade', () => {
    const html = renderToStaticMarkup(
      <CustomerCard
        customer={baseCustomer}
        isSelected={false}
        onToggleSelect={vi.fn()}
        onOpenHistory={vi.fn()}
        onOpenEdit={vi.fn()}
        onOpenDelete={vi.fn()}
        onOpenNewOrder={vi.fn()}
        canEdit={true}
        canDelete={true}
        canCreateOrder={true}
      />
    );

    // Botão de exclusão crítico para o Playwright E2E
    expect(html).toContain('aria-label="Remover Carolina Mendes"');
    // Botão de edição
    expect(html).toContain('aria-label="Editar Carolina Mendes"');
    // Botão de histórico
    expect(html).toContain('aria-label="Ver histórico de Carolina Mendes"');
    // Botão de novo pedido
    expect(html).toContain('aria-label="Criar novo pedido para Carolina Mendes"');
    expect(html).toContain('Novo Pedido');
  });

  it('deve respeitar restrições de permissão e omitir botões quando desautorizado', () => {
    const html = renderToStaticMarkup(
      <CustomerCard
        customer={baseCustomer}
        isSelected={false}
        onToggleSelect={vi.fn()}
        onOpenHistory={vi.fn()}
        onOpenEdit={vi.fn()}
        onOpenDelete={vi.fn()}
        canEdit={false}
        canDelete={false}
        canCreateOrder={false}
      />
    );

    expect(html).not.toContain('aria-label="Remover Carolina Mendes"');
    expect(html).not.toContain('aria-label="Editar Carolina Mendes"');
    expect(html).not.toContain('aria-label="Criar novo pedido para Carolina Mendes"');
    expect(html).not.toContain('Novo Pedido');
    // Histórico ainda deve estar visível para consulta
    expect(html).toContain('aria-label="Ver histórico de Carolina Mendes"');
  });

  it('deve renderizar badge de aniversário quando configurado', () => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const birthdayCustomer: Customer = {
      ...baseCustomer,
      birthday: `1995-${mm}-${dd}`,
    };

    const html = renderToStaticMarkup(
      <CustomerCard
        customer={birthdayCustomer}
        isSelected={false}
        onToggleSelect={vi.fn()}
        onOpenHistory={vi.fn()}
        onOpenEdit={vi.fn()}
        onOpenDelete={vi.fn()}
        canEdit={true}
        canDelete={true}
      />
    );

    expect(html).toContain('Aniversário hoje!');
    expect(html).toContain('Parabenizar');
  });
});

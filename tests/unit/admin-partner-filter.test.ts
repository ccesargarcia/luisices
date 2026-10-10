import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Funções puras simulando a lógica dos Guardrails e do Contexto de Filtragem por Parceiro
 */
export function resolveFilterState(
  role: string | undefined,
  selectedUserIds: string[]
) {
  // Guardrail de segurança: apenas admin pode ativar o filtro multi-tenant / parceiro
  const isFilterActive =
    role === 'admin' &&
    Array.isArray(selectedUserIds) &&
    selectedUserIds.length > 0 &&
    !(selectedUserIds.length === 1 && selectedUserIds[0] === 'all');

  const activePartnerId =
    isFilterActive &&
    selectedUserIds.length === 1 &&
    selectedUserIds[0] !== 'unassigned' &&
    selectedUserIds[0] !== 'all'
      ? selectedUserIds[0]
      : null;

  const matchesSelectedUser = (itemUserId?: string | null) => {
    if (!isFilterActive) return true;
    if (!itemUserId) return selectedUserIds.includes('unassigned');
    return selectedUserIds.includes(itemUserId);
  };

  const resolveCreationUserId = (currentAdminUid: string) => {
    if (isFilterActive && activePartnerId) {
      return activePartnerId;
    }
    return currentAdminUid;
  };

  return {
    isFilterActive,
    activePartnerId,
    matchesSelectedUser,
    resolveCreationUserId,
  };
}

describe('Guardrails e Arquitetura: Filtro de Parceiro / Multi-tenant para Admin', () => {
  const ADMIN_UID = 'admin-suporte-1';
  const PARTNER_A_UID = 'partner-atelie-flores';
  const PARTNER_B_UID = 'partner-atelie-docura';
  const EMPLOYEE_UID = 'employee-marcos';

  describe('1. Guardrails de Segurança e Sessão (Zero Privilege Escalation)', () => {
    it('não deve ativar o filtro se o usuário logado for "user" comum, mesmo se houver IDs na sessão', () => {
      const state = resolveFilterState('user', [PARTNER_A_UID]);
      expect(state.isFilterActive).toBe(false);
      expect(state.activePartnerId).toBeNull();
      // Não-admin visualiza seus próprios dados (filtrados nativamente no Firestore por userId)
      expect(state.matchesSelectedUser(PARTNER_B_UID)).toBe(true);
      expect(state.resolveCreationUserId('user-qualquer')).toBe('user-qualquer');
    });

    it('não deve ativar o filtro se o usuário logado for "funcionario"', () => {
      const state = resolveFilterState('funcionario', [PARTNER_A_UID]);
      expect(state.isFilterActive).toBe(false);
      expect(state.activePartnerId).toBeNull();
      expect(state.matchesSelectedUser(PARTNER_B_UID)).toBe(true);
    });

    it('deve desativar o filtro quando a seleção for vazia ou "all"', () => {
      const emptyState = resolveFilterState('admin', []);
      expect(emptyState.isFilterActive).toBe(false);
      expect(emptyState.activePartnerId).toBeNull();
      expect(emptyState.matchesSelectedUser(PARTNER_A_UID)).toBe(true);
      expect(emptyState.matchesSelectedUser(PARTNER_B_UID)).toBe(true);

      const allState = resolveFilterState('admin', ['all']);
      expect(allState.isFilterActive).toBe(false);
      expect(allState.activePartnerId).toBeNull();
    });
  });

  describe('2. Filtro de Parceiro Ativo para Administrador', () => {
    it('deve identificar parceiro único ativo e filtrar dados estritamente para ele', () => {
      const state = resolveFilterState('admin', [PARTNER_A_UID]);
      expect(state.isFilterActive).toBe(true);
      expect(state.activePartnerId).toBe(PARTNER_A_UID);

      // Dados do parceiro A passam
      expect(state.matchesSelectedUser(PARTNER_A_UID)).toBe(true);
      // Dados do parceiro B são bloqueados
      expect(state.matchesSelectedUser(PARTNER_B_UID)).toBe(false);
      // Dados do próprio admin são bloqueados quando o parceiro A está focado
      expect(state.matchesSelectedUser(ADMIN_UID)).toBe(false);
    });

    it('deve suportar seleção múltipla de parceiros', () => {
      const state = resolveFilterState('admin', [PARTNER_A_UID, PARTNER_B_UID]);
      expect(state.isFilterActive).toBe(true);
      // Em seleção múltipla não há um único parceiro ativo para criação automática
      expect(state.activePartnerId).toBeNull();

      expect(state.matchesSelectedUser(PARTNER_A_UID)).toBe(true);
      expect(state.matchesSelectedUser(PARTNER_B_UID)).toBe(true);
      expect(state.matchesSelectedUser(EMPLOYEE_UID)).toBe(false);
    });

    it('deve suportar filtro de itens sem responsável/parceiro ("unassigned")', () => {
      const state = resolveFilterState('admin', ['unassigned']);
      expect(state.isFilterActive).toBe(true);
      expect(state.activePartnerId).toBeNull();

      expect(state.matchesSelectedUser(null)).toBe(true);
      expect(state.matchesSelectedUser(undefined)).toBe(true);
      expect(state.matchesSelectedUser(PARTNER_A_UID)).toBe(false);
    });
  });

  describe('3. Resolução de Criação de Entidades (Clientes, Produtos, Orçamentos, Pedidos)', () => {
    it('deve atribuir o novo cliente/entidade ao parceiro selecionado', () => {
      const state = resolveFilterState('admin', [PARTNER_A_UID]);
      const targetUserId = state.resolveCreationUserId(ADMIN_UID);
      expect(targetUserId).toBe(PARTNER_A_UID);
    });

    it('deve usar o UID do admin se nenhum parceiro estiver selecionado (Visualizar Tudo)', () => {
      const state = resolveFilterState('admin', []);
      const targetUserId = state.resolveCreationUserId(ADMIN_UID);
      expect(targetUserId).toBe(ADMIN_UID);
    });

    it('deve usar o UID do admin se múltiplos parceiros estiverem selecionados (para evitar ambiguidade)', () => {
      const state = resolveFilterState('admin', [PARTNER_A_UID, PARTNER_B_UID]);
      const targetUserId = state.resolveCreationUserId(ADMIN_UID);
      expect(targetUserId).toBe(ADMIN_UID);
    });
  });

  describe('4. Filtragem em Memória de Clientes e Métricas (Velocidade & Custo Zero)', () => {
    const mockCustomers = [
      { id: 'c1', name: 'Cliente A1', userId: PARTNER_A_UID, totalOrders: 5, totalSpent: 500, status: 'vip' },
      { id: 'c2', name: 'Cliente A2', userId: PARTNER_A_UID, totalOrders: 1, totalSpent: 100, status: 'active' },
      { id: 'c3', name: 'Cliente B1', userId: PARTNER_B_UID, totalOrders: 10, totalSpent: 2000, status: 'vip' },
      { id: 'c4', name: 'Cliente Admin', userId: ADMIN_UID, totalOrders: 0, totalSpent: 0, status: 'active' },
    ];

    it('deve filtrar a lista de clientes pelo parceiro selecionado mantendo integridade', () => {
      const state = resolveFilterState('admin', [PARTNER_A_UID]);
      const filtered = mockCustomers.filter((c) => state.matchesSelectedUser(c.userId));

      expect(filtered).toHaveLength(2);
      expect(filtered.map((c) => c.id)).toEqual(['c1', 'c2']);
      expect(filtered.every((c) => c.userId === PARTNER_A_UID)).toBe(true);
    });

    it('deve calcular métricas de clientes (faturamento e ticket) estritamente sobre o parceiro filtrado', () => {
      const state = resolveFilterState('admin', [PARTNER_A_UID]);
      const scoped = mockCustomers.filter((c) => state.matchesSelectedUser(c.userId));

      const totalRevenue = scoped.reduce((sum, c) => sum + c.totalSpent, 0);
      const totalOrders = scoped.reduce((sum, c) => sum + c.totalOrders, 0);
      const vipCount = scoped.filter((c) => c.status === 'vip').length;

      expect(totalRevenue).toBe(600); // 500 + 100
      expect(totalOrders).toBe(6);     // 5 + 1
      expect(vipCount).toBe(1);
    });
  });

  describe('5. Rota de Relatórios: Isolamento Financeiro e Vendas por Parceiro', () => {
    const mockLedgerSales = [
      { id: 'sale-1', userId: PARTNER_A_UID, totalAmount: 350, customerName: 'Cliente Flor', status: 'delivered' },
      { id: 'sale-2', userId: PARTNER_A_UID, totalAmount: 150, customerName: 'Cliente Rosa', status: 'delivered' },
      { id: 'sale-3', userId: PARTNER_B_UID, totalAmount: 800, customerName: 'Cliente Doce', status: 'delivered' },
      { id: 'sale-4', assignedTo: PARTNER_A_UID, totalAmount: 200, customerName: 'Cliente Atribuído', status: 'delivered' },
    ];

    it('deve filtrar vendas de relatórios exclusivamente para o parceiro selecionado', () => {
      const state = resolveFilterState('admin', [PARTNER_A_UID]);
      const filteredSales = mockLedgerSales.filter((s) => state.matchesSelectedUser(s.userId || s.assignedTo));

      expect(filteredSales).toHaveLength(3);
      expect(filteredSales.map((s) => s.id)).toEqual(['sale-1', 'sale-2', 'sale-4']);

      const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
      expect(totalRevenue).toBe(700); // 350 + 150 + 200
    });

    it('deve retornar todas as vendas se o filtro estiver desativado ("all")', () => {
      const state = resolveFilterState('admin', ['all']);
      const filteredSales = mockLedgerSales.filter((s) => state.matchesSelectedUser(s.userId || s.assignedTo));

      expect(filteredSales).toHaveLength(4);
      const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
      expect(totalRevenue).toBe(1500);
    });
  });

  describe('6. Isolamento de Pedidos (OrdersContext): Criador Parceiro vs Funcionário Atribuído', () => {
    // Simula a lógica atualizada do OrdersContext
    function orderMatchesFilter(
      order: { userId?: string; assignedTo?: string },
      selectedUserIds: string[],
      isFilterActive: boolean
    ) {
      if (!isFilterActive) return true;
      if (order.userId && selectedUserIds.includes(order.userId)) return true;
      if (order.assignedTo && selectedUserIds.includes(order.assignedTo)) return true;
      if (!order.assignedTo && selectedUserIds.includes('unassigned')) return true;
      return false;
    }

    const mockOrders = [
      // Criado pelo Parceiro A e atribuído ao Funcionário Marcos
      { id: 'ord-1', userId: PARTNER_A_UID, assignedTo: EMPLOYEE_UID },
      // Criado pelo Parceiro A sem responsável atribuído
      { id: 'ord-2', userId: PARTNER_A_UID, assignedTo: undefined },
      // Criado pelo Parceiro B
      { id: 'ord-3', userId: PARTNER_B_UID, assignedTo: undefined },
      // Criado pelo Admin e atribuído ao Parceiro A
      { id: 'ord-4', userId: ADMIN_UID, assignedTo: PARTNER_A_UID },
    ];

    it('deve manter o pedido do Parceiro A mesmo se houver funcionário atribuído no assignedTo', () => {
      const isFilterActive = true;
      const selected = [PARTNER_A_UID];

      const visibleOrders = mockOrders.filter((o) => orderMatchesFilter(o, selected, isFilterActive));

      // ord-1 (userId Parceiro A), ord-2 (userId Parceiro A), ord-4 (assignedTo Parceiro A)
      expect(visibleOrders.map((o) => o.id)).toEqual(['ord-1', 'ord-2', 'ord-4']);
      expect(visibleOrders.find((o) => o.id === 'ord-3')).toBeUndefined();
    });
  });

  describe('7. Rota de WhatsApp Chat: Escopo Restrito aos Clientes do Parceiro Ativo', () => {
    function filterConversations(
      conversations: Array<{ id: string; customerId?: string; customerPhone?: string }>,
      isFilterActive: boolean,
      allowedCustomerIds: Set<string>,
      allowedPhones: Set<string>
    ) {
      if (!isFilterActive) return conversations;
      return conversations.filter((c) => {
        const matchesId = Boolean(c.customerId && allowedCustomerIds.has(c.customerId));
        const cleanPhone = (c.customerPhone || '').replace(/\D/g, '');
        const matchesPhone = Boolean(cleanPhone && allowedPhones.has(cleanPhone));
        return matchesId || matchesPhone;
      });
    }

    const conversations = [
      { id: 'chat-1', customerId: 'cust-a1', customerPhone: '5511999990001' },
      { id: 'chat-2', customerId: 'cust-a2', customerPhone: '5511999990002' },
      { id: 'chat-3', customerId: 'cust-b1', customerPhone: '5511999990003' },
    ];

    it('deve filtrar as conversas apenas para os clientes vinculados ao parceiro ativo', () => {
      const allowedCustomerIds = new Set(['cust-a1', 'cust-a2']);
      const allowedPhones = new Set(['5511999990001', '5511999990002']);

      const filtered = filterConversations(conversations, true, allowedCustomerIds, allowedPhones);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((c) => c.id)).toEqual(['chat-1', 'chat-2']);
    });

    it('deve exibir todas as conversas quando nenhum filtro estiver ativo', () => {
      const filtered = filterConversations(conversations, false, new Set(), new Set());
      expect(filtered).toHaveLength(3);
    });
  });

  describe('8. Rota de Precificação: targetUid para Insumos, Fichas e Histórico', () => {
    it('deve priorizar o activePartnerId sobre o userProfile.uid para isolamento multi-tenant', () => {
      const state = resolveFilterState('admin', [PARTNER_A_UID]);
      const currentAdminUid = ADMIN_UID;
      const targetUid = state.activePartnerId || currentAdminUid;

      expect(targetUid).toBe(PARTNER_A_UID);
    });

    it('deve usar o UID do próprio admin quando não houver parceiro selecionado', () => {
      const state = resolveFilterState('admin', []);
      const currentAdminUid = ADMIN_UID;
      const targetUid = state.activePartnerId || currentAdminUid;

      expect(targetUid).toBe(ADMIN_UID);
    });
  });
});


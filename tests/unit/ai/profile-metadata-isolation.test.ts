import { describe, it, expect } from 'vitest';
const { AiToolsExecutor } = require('../../../functions/ai/tools');
const { getCallerScope, sanitizeCollaboratorInfo } = require('../../../functions/ai/authorization');

describe('Isolamento de Metadados de Perfil e Escopo do Copiloto', () => {
  // Base fictícia de teste local com dados estritamente sintéticos
  const mockTeamMembers = [
    {
      uid: 'u-user-a',
      name: 'USER_ONLY_A',
      displayName: 'USER_ONLY_A',
      email: 'user-a@example.invalid',
      role: 'user',
      active: true,
    },
    {
      uid: 'u-user-b',
      name: 'USER_ONLY_B',
      displayName: 'USER_ONLY_B',
      email: 'only-b@example.invalid',
      role: 'funcionario',
      active: true,
    },
    {
      uid: 'u-admin',
      name: 'ADMIN_USER',
      displayName: 'ADMIN_USER',
      email: 'admin@example.invalid',
      role: 'admin',
      active: true,
    },
  ];

  const mockOrders = [
    {
      orderId: 'ord-a1',
      orderNumber: '#1001',
      customerName: 'Cliente Exclusivo A',
      customerPhone: '11911111111',
      productName: 'Topo de Bolo - A',
      productSummary: 'Topo de Bolo - A',
      totalPrice: 100,
      paidAmount: 100,
      remainingAmount: 0,
      status: 'completed',
      paymentStatus: 'paid',
      deliveryDate: '2026-10-15',
      createdAt: '2026-10-01T10:00:00Z',
      userId: 'u-user-a',
      createdBy: 'u-user-a',
      assignedTo: '',
      isDeleted: false,
    },
    {
      orderId: 'ord-b1',
      orderNumber: '#1002',
      customerName: 'Cliente Exclusivo B',
      customerPhone: '11922222222',
      productName: 'Topo de Bolo - B',
      productSummary: 'Topo de Bolo - B',
      totalPrice: 200,
      paidAmount: 200,
      remainingAmount: 0,
      status: 'completed',
      paymentStatus: 'paid',
      deliveryDate: '2026-10-15',
      createdAt: '2026-10-01T10:00:00Z',
      userId: 'u-user-b',
      createdBy: 'u-user-b',
      assignedTo: '',
      isDeleted: false,
    },
    {
      orderId: 'ord-shared',
      orderNumber: '#1003',
      customerName: 'Cliente Compartilhado',
      customerPhone: '11933333333',
      productName: 'Topo de Bolo 3D - José',
      productSummary: 'Topo de Bolo 3D - José',
      totalPrice: 300,
      paidAmount: 150,
      remainingAmount: 150,
      status: 'in-progress',
      paymentStatus: 'partial',
      deliveryDate: '2026-10-16',
      createdAt: '2026-10-02T10:00:00Z',
      userId: 'u-user-b',
      createdBy: 'u-user-b',
      createdByName: 'USER_ONLY_B',
      assignedTo: 'u-user-a',
      assignedToName: 'USER_ONLY_A',
      isDeleted: false,
    },
  ];

  const mockCustomers = [
    {
      id: 'cust-a1',
      name: 'Cliente Exclusivo A',
      phone: '11911111111',
      email: 'cliente-a@customer.invalid',
      city: 'São Paulo',
      userId: 'u-user-a',
      createdBy: 'u-user-a',
      isDeleted: false,
    },
    {
      id: 'cust-b1',
      name: 'Cliente Exclusivo B',
      phone: '11922222222',
      email: 'cliente-b@customer.invalid',
      city: 'Campinas',
      userId: 'u-user-b',
      createdBy: 'u-user-b',
      isDeleted: false,
    },
  ];

  const mockRepos = {
    getScopedOrders: async (scope: any) => {
      if (scope.isAdmin) return mockOrders.filter((o) => !o.isDeleted);
      const uid = String(scope.uid || '');
      return mockOrders.filter(
        (o) => !o.isDeleted && (o.userId === uid || o.createdBy === uid || o.assignedTo === uid)
      );
    },
    getScopedCustomers: async (scope: any, options: any = {}) => {
      const uid = String(scope.uid || '');
      let filtered = scope.isAdmin
        ? mockCustomers
        : mockCustomers.filter((c) => !c.isDeleted && (c.userId === uid || c.createdBy === uid));

      if (options.searchTerm) {
        const term = String(options.searchTerm).toLowerCase().trim();
        filtered = filtered.filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            (c.email && c.email.toLowerCase().includes(term)) ||
            (c.city && c.city.toLowerCase().includes(term))
        );
      }

      return {
        customers: filtered,
        totalScoped: filtered.length,
        totalFiltered: filtered.length,
        isFiltered: Boolean(options.searchTerm),
        hasMore: false,
      };
    },
    getTeamMembers: async () => mockTeamMembers,
  };

  const executor = new AiToolsExecutor(mockRepos);

  const scopeUserA = getCallerScope('u-user-a', {
    role: 'user',
    active: true,
    email: 'user-a@example.invalid',
    displayName: 'USER_ONLY_A',
  });

  const scopeUserB = getCallerScope('u-user-b', {
    role: 'funcionario',
    active: true,
    email: 'only-b@example.invalid',
    displayName: 'USER_ONLY_B',
    permissions: { aiCopilot: true },
  });

  const scopeAdmin = getCallerScope('u-admin', {
    role: 'admin',
    active: true,
    email: 'admin@example.invalid',
    displayName: 'ADMIN_USER',
  });

  describe('Unidade: Helper sanitizeCollaboratorInfo', () => {
    it('limita a resposta aos campos permitidos mesmo quando o perfil contém dados extras', () => {
      const member = { ...mockTeamMembers[1], phone: 'PRIVATE_PHONE', address: 'PRIVATE_ADDRESS', permissions: { admin: true } };
      expect(sanitizeCollaboratorInfo(member, scopeUserA)).toEqual({ name: 'USER_ONLY_B' });
      expect(sanitizeCollaboratorInfo(member, scopeAdmin)).toEqual({ name: 'USER_ONLY_B', email: 'only-b@example.invalid' });
    });

    it('não divulga email para escopo inativo mesmo quando consulta o próprio perfil', () => {
      const inactiveScope = getCallerScope('u-user-a', { role: 'user', active: false, email: 'user-a@example.invalid' });
      expect(sanitizeCollaboratorInfo(mockTeamMembers[0], inactiveScope)).toEqual({ name: 'USER_ONLY_A' });
    });

    it('trata perfil ausente sem criar metadados privados', () => {
      expect(sanitizeCollaboratorInfo(null, scopeAdmin)).toBeNull();
      expect(sanitizeCollaboratorInfo(undefined, scopeUserA)).toBeNull();
    });

    it('deve omitir email de outro colaborador para usuario comum', () => {
      const sanitized = sanitizeCollaboratorInfo(mockTeamMembers[1], scopeUserA);
      expect(sanitized).toEqual({ name: 'USER_ONLY_B' });
      expect(sanitized).not.toHaveProperty('email');
    });

    it('deve preservar email do proprio perfil para usuario comum', () => {
      const sanitized = sanitizeCollaboratorInfo(mockTeamMembers[0], scopeUserA);
      expect(sanitized).toEqual({
        name: 'USER_ONLY_A',
        email: 'user-a@example.invalid',
      });
    });

    it('deve incluir email de colaborador para funcionario ativo', () => {
      const sanitized = sanitizeCollaboratorInfo(mockTeamMembers[0], scopeUserB);
      expect(sanitized).toEqual({
        name: 'USER_ONLY_A',
        email: 'user-a@example.invalid',
      });
    });

    it('deve incluir email de colaborador para administrador', () => {
      const sanitized = sanitizeCollaboratorInfo(mockTeamMembers[1], scopeAdmin);
      expect(sanitized).toEqual({
        name: 'USER_ONLY_B',
        email: 'only-b@example.invalid',
      });
    });
  });

  describe('Regressao Obrigatória: executeQueryCustomers (Caso de Exposição Corrigido)', () => {
    it('usuario comum A pesquisando B nao deve receber o email privado de perfil de B', async () => {
      const res = await executor.executeQueryCustomers({ searchTerm: 'USER_ONLY_B' }, scopeUserA);

      // 1. Cliente derivado do pedido compartilhado atribuido a A foi retornado
      expect(res.customers.length).toBe(1);
      expect(res.customers[0].name).toBe('Cliente Compartilhado');

      // 2. collaboratorFound está presente mas sem e-mail privado
      expect(res.collaboratorFound).toEqual({ name: 'USER_ONLY_B' });
      expect(res.collaboratorFound.email).toBeUndefined();

      // 3. Verificação completa de que o e-mail privado não vaza no objeto nem em mensagens
      const jsonStr = JSON.stringify(res);
      expect(jsonStr).not.toContain('only-b@example.invalid');
    });

    it('usuario comum A pesquisando por userIdentifier de B nao deve receber o email de B', async () => {
      const res = await executor.executeQueryCustomers({ userIdentifier: 'USER_ONLY_B' }, scopeUserA);

      expect(res.customers.length).toBe(1);
      expect(res.customers[0].name).toBe('Cliente Compartilhado');
      expect(res.collaboratorFound).toEqual({ name: 'USER_ONLY_B' });
      expect(res.collaboratorFound.email).toBeUndefined();

      const jsonStr = JSON.stringify(res);
      expect(jsonStr).not.toContain('only-b@example.invalid');
    });

    it('administrador pesquisando B por query_customers deve receber metadados completos autorizados', async () => {
      const res = await executor.executeQueryCustomers({ userIdentifier: 'USER_ONLY_B' }, scopeAdmin);

      expect(res.collaboratorFound).toEqual({
        name: 'USER_ONLY_B',
        email: 'only-b@example.invalid',
      });
    });

    it('funcionario ativo pesquisando B deve receber metadados da equipe conforme politica', async () => {
      const res = await executor.executeQueryCustomers({ userIdentifier: 'USER_ONLY_B' }, scopeUserB);

      expect(res.collaboratorFound).toEqual({
        name: 'USER_ONLY_B',
        email: 'only-b@example.invalid',
      });
    });
  });

  describe('Casos Obrigatórios de Isolamento de Escopo e Injeção de Argumentos', () => {
    it('usuario comum A nao deve receber pedidos ou clientes exclusivos de B', async () => {
      const orders = await executor.executeQueryOrdersView({}, scopeUserA);
      expect(orders.orders.length).toBe(2); // ord-a1 e ord-shared
      expect(orders.orders.some((o: any) => o.orderId === 'ord-b1')).toBe(false);

      const custs = await executor.executeQueryCustomers({}, scopeUserA);
      expect(custs.customers.some((c: any) => c.name === 'Cliente Exclusivo B')).toBe(false);
    });

    it('usuario B nao deve receber pedidos ou clientes exclusivos de A', async () => {
      const orders = await executor.executeQueryOrdersView({}, scopeUserB);
      expect(orders.orders.length).toBe(2); // ord-b1 e ord-shared
      expect(orders.orders.some((o: any) => o.orderId === 'ord-a1')).toBe(false);

      const custs = await executor.executeQueryCustomers({}, scopeUserB);
      expect(custs.customers.some((c: any) => c.name === 'Cliente Exclusivo A')).toBe(false);
    });

    it('A continua consultando o pedido explicitamente atribuido a ele', async () => {
      const orders = await executor.executeQueryOrdersView({ searchTerm: 'José' }, scopeUserA);
      expect(orders.orders.length).toBe(1);
      expect(orders.orders[0].orderId).toBe('ord-shared');
      expect(orders.orders[0].productName).toBe('Topo de Bolo 3D - José');
    });

    it('argumentos isAdmin, role, uid e userId enviados pelo cliente NAO devem ampliar permissoes de A', async () => {
      const maliciousArgs = {
        searchTerm: 'USER_ONLY_B',
        isAdmin: true,
        role: 'admin',
        uid: 'u-admin',
        userId: 'u-admin',
      };

      const res = await executor.executeQueryCustomers(maliciousArgs, scopeUserA);

      // Permissão ainda é de usuario comum scopeUserA
      expect(res.collaboratorFound).toEqual({ name: 'USER_ONLY_B' });
      expect(res.collaboratorFound.email).toBeUndefined();
      expect(JSON.stringify(res)).not.toContain('only-b@example.invalid');
    });

    it('alternar usuarios e administrador nao deve misturar dados por cache', async () => {
      const resUserA = await executor.executeQueryCustomers({ searchTerm: 'USER_ONLY_B' }, scopeUserA);
      expect(resUserA.collaboratorFound.email).toBeUndefined();

      const resAdmin = await executor.executeQueryCustomers({ searchTerm: 'USER_ONLY_B' }, scopeAdmin);
      expect(resAdmin.collaboratorFound.email).toBe('only-b@example.invalid');

      const resUserA2 = await executor.executeQueryCustomers({ searchTerm: 'USER_ONLY_B' }, scopeUserA);
      expect(resUserA2.collaboratorFound.email).toBeUndefined();
    });

    it('ausencia de escopo ou identidade recebe tratamento seguro', async () => {
      const nullScope = getCallerScope('', null);
      expect(() => {
        sanitizeCollaboratorInfo(mockTeamMembers[1], nullScope);
      }).not.toThrow();

      const sanitizedNull = sanitizeCollaboratorInfo(mockTeamMembers[1], nullScope);
      expect(sanitizedNull).toEqual({ name: 'USER_ONLY_B' });
      expect(sanitizedNull.email).toBeUndefined();
    });
  });
});

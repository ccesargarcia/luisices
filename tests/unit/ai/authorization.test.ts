import { describe, it, expect } from 'vitest';
const {
  getCallerScope,
  validateAiAccess,
  validateGalleryAccess,
  canAccessUserData,
  filterOrdersByScope,
  filterCustomersByScope,
  filterGalleryByScope,
} = require('../../../functions/ai/authorization');

describe('IA-01: Subsistema de Autorização e Isolamento de Escopo', () => {
  it('deve autorizar administrador ativo com escopo global', () => {
    const scope = getCallerScope('admin-1', { role: 'admin', active: true, email: 'admin@luisices.com.br' });
    expect(scope.isAdmin).toBe(true);
    expect(scope.canAiCopilot).toBe(true);
    expect(() => validateAiAccess(scope)).not.toThrow();
  });

  it('deve autorizar funcionário apenas se permissions.aiCopilot for true', () => {
    const scopeAllowed = getCallerScope('func-1', {
      role: 'funcionario',
      active: true,
      permissions: { aiCopilot: true },
    });
    expect(scopeAllowed.isEmployee).toBe(true);
    expect(scopeAllowed.canAiCopilot).toBe(true);
    expect(() => validateAiAccess(scopeAllowed)).not.toThrow();

    const scopeDenied = getCallerScope('func-2', {
      role: 'funcionario',
      active: true,
      permissions: { aiCopilot: false },
    });
    expect(scopeDenied.canAiCopilot).toBe(false);
    expect(() => validateAiAccess(scopeDenied)).toThrow('Seu perfil de funcionário não possui permissão');
  });

  it('deve rejeitar usuário desativado independente da role', () => {
    const scope = getCallerScope('user-disabled', { role: 'admin', active: false });
    expect(() => validateAiAccess(scope)).toThrow('Conta de usuário desativada');
  });

  it('deve rejeitar chamadas sem identificação de usuário', () => {
    const scope = getCallerScope('', null);
    expect(() => validateAiAccess(scope)).toThrow('Usuário não autenticado');
  });

  describe('Isolamento de Pedidos (filterOrdersByScope)', () => {
    const mockOrders = [
      { orderId: 'ord-1', userId: 'user-a', totalPrice: 100, isDeleted: false },
      { orderId: 'ord-2', userId: 'user-b', totalPrice: 200, isDeleted: false },
      { orderId: 'ord-3', assignedTo: 'user-a', totalPrice: 150, isDeleted: false },
      { orderId: 'ord-4', createdBy: 'user-a', totalPrice: 80, isDeleted: false },
      { orderId: 'ord-5', userId: 'user-a', totalPrice: 300, isDeleted: true }, // deletado
    ];

    it('usuário comum A nunca deve visualizar pedidos de B', () => {
      const scopeA = getCallerScope('user-a', { role: 'user', active: true });
      const visibleOrders = filterOrdersByScope(mockOrders, scopeA);

      expect(visibleOrders.length).toBe(3); // ord-1, ord-3, ord-4
      expect(visibleOrders.some((o: any) => o.orderId === 'ord-2')).toBe(false);
      expect(visibleOrders.some((o: any) => o.isDeleted)).toBe(false);
    });

    it('administrador pode visualizar todos os pedidos ativos', () => {
      const scopeAdmin = getCallerScope('admin-1', { role: 'admin', active: true });
      const visibleOrders = filterOrdersByScope(mockOrders, scopeAdmin);

      expect(visibleOrders.length).toBe(4); // Todos os não-deletados
      expect(visibleOrders.some((o: any) => o.orderId === 'ord-2')).toBe(true);
    });
  });

  describe('Isolamento de Clientes (filterCustomersByScope)', () => {
    const mockCustomers = [
      { id: 'c-1', name: 'Cliente A', userId: 'user-a', isDeleted: false },
      { id: 'c-2', name: 'Cliente B', userId: 'user-b', isDeleted: false },
      { id: 'c-3', name: 'Cliente A Criado', createdBy: 'user-a', isDeleted: false },
    ];

    it('não-admin visualiza estritamente clientes pertencentes ao seu escopo', () => {
      const scopeA = getCallerScope('user-a', { role: 'user', active: true });
      const filtered = filterCustomersByScope(mockCustomers, scopeA);
      expect(filtered.length).toBe(2);
      expect(filtered.some((c: any) => c.name === 'Cliente B')).toBe(false);
    });
  });

  describe('Isolamento de Galeria (validateGalleryAccess & filterGalleryByScope)', () => {
    const galleryItemA = { id: 'gal-1', userId: 'user-a', imageUrl: 'https://cdn.luisices.com.br/art1.jpg' };
    const galleryItemB = { id: 'gal-2', userId: 'user-b', imageUrl: 'https://cdn.luisices.com.br/art2.jpg' };
    const galleryDeleted = { id: 'gal-3', userId: 'user-a', isDeleted: true };

    it('usuário comum A não pode analisar arte de usuário B', () => {
      const scopeA = getCallerScope('user-a', { role: 'user', active: true });
      expect(() => validateGalleryAccess(scopeA, galleryItemA)).not.toThrow();
      expect(() => validateGalleryAccess(scopeA, galleryItemB)).toThrow('Você não tem permissão para analisar');
    });

    it('não permite analisar arte excluída', () => {
      const scopeA = getCallerScope('user-a', { role: 'user', active: true });
      expect(() => validateGalleryAccess(scopeA, galleryDeleted)).toThrow('Este item da galeria foi excluído');
    });

    it('administrador pode auditar e analisar qualquer arte ativa', () => {
      const scopeAdmin = getCallerScope('admin-1', { role: 'admin', active: true });
      expect(() => validateGalleryAccess(scopeAdmin, galleryItemB)).not.toThrow();
    });
  });

  describe('Auditoria de Colaboradores (canAccessUserData)', () => {
    it('apenas admin ou o próprio usuário pode acessar dados de desempenho', () => {
      const scopeAdmin = getCallerScope('admin-1', { role: 'admin', active: true });
      const scopeUserA = getCallerScope('user-a', { role: 'user', active: true });

      expect(canAccessUserData(scopeAdmin, 'user-b')).toBe(true);
      expect(canAccessUserData(scopeUserA, 'user-a')).toBe(true);
      expect(canAccessUserData(scopeUserA, 'user-b')).toBe(false);
    });
  });
});

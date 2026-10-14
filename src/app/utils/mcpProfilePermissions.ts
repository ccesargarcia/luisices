import type { Permission, UserRole } from '../types';

export const MCP_PROFILE_SCOPES = [
  { id: 'orders:read', label: 'Consultar pedidos e prazos', module: 'orders', action: 'view', defaultGranted: true },
  { id: 'orders:draft', label: 'Preparar rascunhos de pedidos', module: 'orders', action: 'view', defaultGranted: false },
  { id: 'orders:create', label: 'Criar pedidos', module: 'orders', action: 'create', defaultGranted: true },
  { id: 'orders:update', label: 'Editar pedidos', module: 'orders', action: 'edit', defaultGranted: false },
  { id: 'customers:read', label: 'Consultar clientes', module: 'customers', action: 'view', defaultGranted: true },
  { id: 'customers:create', label: 'Criar clientes', module: 'customers', action: 'create', defaultGranted: false },
  { id: 'customers:update', label: 'Editar clientes', module: 'customers', action: 'edit', defaultGranted: false },
  { id: 'payments:read', label: 'Consultar pagamentos', module: 'orders', action: 'view', defaultGranted: false },
  { id: 'payments:write', label: 'Registrar pagamentos', module: 'orders', action: 'edit', defaultGranted: false },
  { id: 'pricing:estimate', label: 'Calcular preços', module: 'pricing', action: 'view', defaultGranted: true },
  { id: 'whatsapp:compose', label: 'Preparar mensagens de WhatsApp', module: 'whatsapp', action: 'view', defaultGranted: true },
  { id: 'gallery:read', label: 'Consultar portfólio', module: 'gallery', action: 'view', defaultGranted: true },
  { id: 'financial:read', label: 'Consultar relatórios financeiros', module: 'reports', action: 'view', defaultGranted: false, adminOnly: true },
  { id: 'team:read', label: 'Consultar produtividade da equipe', module: 'users', action: 'view', defaultGranted: false, adminOnly: true },
] as const;

export function canUseMcpScope(scopeId: string, role: UserRole, permissions: Permission): boolean {
  const scope = MCP_PROFILE_SCOPES.find((item) => item.id === scopeId);
  if (!scope) return false;
  if ('adminOnly' in scope && scope.adminOnly && role !== 'admin') return false;
  if (role === 'admin') return true;
  const permission = permissions[scope.module];
  if (permission === undefined) return false;
  if (typeof permission === 'boolean') return permission;
  return Boolean((permission as unknown as Record<string, unknown>)?.[scope.action] === true);
}

export function getProfileMcpScopes(role: UserRole, permissions: Permission): string[] {
  if (Object.prototype.hasOwnProperty.call(permissions, 'mcpScopes')) {
    return Array.isArray(permissions.mcpScopes)
      ? [...new Set(permissions.mcpScopes.filter((id) => MCP_PROFILE_SCOPES.some((scope) => scope.id === id)))]
      : [];
  }
  return MCP_PROFILE_SCOPES
    .filter((scope) => scope.defaultGranted && canUseMcpScope(scope.id, role, permissions))
    .map((scope) => scope.id);
}

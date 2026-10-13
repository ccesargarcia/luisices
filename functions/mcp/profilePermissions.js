const { MCP_SCOPES } = require('./constants');

const MODULE_REQUIREMENTS = {
  'orders:read': ['orders', 'view'],
  'orders:draft': ['orders', 'view'],
  'orders:create': ['orders', 'create'],
  'customers:read': ['customers', 'view'],
  'pricing:estimate': ['pricing', 'view'],
  'whatsapp:compose': ['whatsapp', 'view'],
  'gallery:read': ['gallery', 'view'],
  'financial:read': ['reports', 'view'],
  'team:read': ['users', 'view'],
};

function moduleAllowsMcpScope(scopeId, profile) {
  if (profile?.role === 'admin') return true;
  const requirement = MODULE_REQUIREMENTS[scopeId];
  if (!requirement) return false;
  const [module, action] = requirement;
  const permission = profile?.permissions?.[module];
  if (permission === undefined) return true; // Perfis legados: ausência não redefine permissões.
  if (typeof permission === 'boolean') return permission;
  return permission !== null && typeof permission === 'object' && permission[action] === true;
}

function validateProfileMcpScopes(permissions) {
  if (!permissions || !Object.prototype.hasOwnProperty.call(permissions, 'mcpScopes')) return;
  const scopes = permissions.mcpScopes;
  const supported = Object.values(MCP_SCOPES).map((scope) => scope.id);
  if (!Array.isArray(scopes) || new Set(scopes).size !== scopes.length || scopes.some((scope) => typeof scope !== 'string' || !supported.includes(scope))) {
    const error = new Error('As funcionalidades MCP informadas são inválidas.');
    error.code = 'invalid-argument';
    throw error;
  }
}

function preserveProfileMcpScopes(incoming, current) {
  if (incoming === undefined) return undefined;
  validateProfileMcpScopes(incoming);
  const result = { ...incoming };
  if (!Object.prototype.hasOwnProperty.call(incoming, 'mcpScopes') && Object.prototype.hasOwnProperty.call(current || {}, 'mcpScopes')) {
    result.mcpScopes = Array.isArray(current.mcpScopes) ? [...current.mcpScopes] : current.mcpScopes;
  }
  return result;
}

module.exports = { moduleAllowsMcpScope, validateProfileMcpScopes, preserveProfileMcpScopes };

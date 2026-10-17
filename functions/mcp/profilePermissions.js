const { MCP_SCOPES } = require('./constants');

const MODULE_REQUIREMENTS = {
  'orders:read': ['orders', 'view'],
  'orders:draft': ['orders', 'view'],
  'orders:create': ['orders', 'create'],
  'orders:update': ['orders', 'edit'],
  'customers:read': ['customers', 'view'],
  'customers:create': ['customers', 'create'],
  'customers:update': ['customers', 'edit'],
  'payments:read': ['orders', 'view'],
  'payments:write': ['orders', 'edit'],
  'pricing:estimate': ['pricing', 'view'],
  'whatsapp:compose': ['whatsapp', 'view'],
  'gallery:read': ['gallery', 'view'],
  'financial:read': ['reports', 'view'],
  'team:read': ['users', 'view'],
  'supplies:read': ['pricing', 'view'],
  'pricing:models:read': ['pricing', 'view'],
  'pricing:models:write': ['pricing', 'create'],
  'quotes:read': ['quotes', 'view'],
  // The scope covers both write tools. Each tool enforces its own CRUD action.
  'quotes:write': ['quotes', ['create', 'edit']],
  'store:read': ['storeProducts', 'view'],
};

function moduleAllowsMcpScope(scopeId, profile) {
  if (profile?.role === 'admin') return true;
  const requirement = MODULE_REQUIREMENTS[scopeId];
  if (!requirement) return false;
  const [module, action] = requirement;
  const permission = profile?.permissions?.[module];
  if (permission === undefined) return false;
  if (typeof permission === 'boolean') return permission;
  if (permission === null || typeof permission !== 'object') return false;
  return Array.isArray(action)
    ? action.some((requiredAction) => permission[requiredAction] === true)
    : permission[action] === true;
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

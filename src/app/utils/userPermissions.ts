import { DEFAULT_USER_PERMISSIONS, type Permission } from '../types';

export function deepClonePermission(p?: Permission | null): Permission {
  const source = p && typeof p === 'object' ? p as unknown as Record<string, any> : {};
  const clone = JSON.parse(JSON.stringify(DEFAULT_USER_PERMISSIONS)) as Record<string, any>;
  const crudKeys = ['orders', 'archivedOrders', 'customers', 'products', 'quotes', 'users', 'emails', 'pricing', 'storeProducts'];
  const booleanKeys = ['dashboard', 'reports', 'exchanges', 'settings', 'store', 'whatsapp', 'aiCopilot', 'mcpAccess'];

  for (const key of crudKeys) {
    const value = source[key];
    if (typeof value === 'boolean') {
      clone[key] = { view: value, create: value, edit: value, delete: value };
    } else if (value && typeof value === 'object') {
      clone[key] = { ...(clone[key] || {}), ...value };
    }
  }

  if (source.gallery && typeof source.gallery === 'object') {
    clone.gallery = { ...clone.gallery, ...source.gallery };
  }

  for (const key of booleanKeys) {
    const value = source[key];
    if (typeof value === 'boolean') clone[key] = value;
    else if (value && typeof value === 'object' && typeof value.view === 'boolean') clone[key] = value.view;
  }

  delete clone.mcpScopes;
  if (Object.prototype.hasOwnProperty.call(source, 'mcpScopes')) {
    clone.mcpScopes = Array.isArray(source.mcpScopes) ? [...source.mcpScopes] : source.mcpScopes;
  }

  return clone as Permission;
}


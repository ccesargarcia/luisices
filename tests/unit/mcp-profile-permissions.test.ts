import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { deepClonePermission } from '../../src/app/utils/userPermissions';
import { MCP_PROFILE_SCOPES, canUseMcpScope, getProfileMcpScopes } from '../../src/app/utils/mcpProfilePermissions';
import { McpProfilePermissions } from '../../src/app/components/users/McpProfilePermissions';
import { DEFAULT_USER_PERMISSIONS, EMPLOYEE_PERMISSIONS, type Permission } from '../../src/app/types';
const { preserveProfileMcpScopes, validateProfileMcpScopes } = require('../../functions/mcp/profilePermissions');
const { getEffectiveUserScopes } = require('../../functions/mcp/oauth');
const { MCP_SCOPES } = require('../../functions/mcp/constants');

describe('MCP permissions in user profiles', () => {
  it('preserves explicit scopes and empty lists when unrelated module permissions change', () => {
    for (const scopes of [[], ['orders:read']]) {
      const source = { ...DEFAULT_USER_PERMISSIONS, mcpScopes: scopes };
      const first = deepClonePermission(source);
      first.orders = { ...first.orders, edit: false };
      const second = deepClonePermission(first);
      expect(second.mcpScopes).toEqual(scopes);
      expect(second.mcpScopes).not.toBe(scopes);
      expect(source.orders.edit).toBe(true);
    }
  });

  it('does not assign new defaults to an existing profile without scope configuration', () => {
    const source = { ...DEFAULT_USER_PERMISSIONS };
    delete source.mcpScopes;
    expect(deepClonePermission(source)).not.toHaveProperty('mcpScopes');
    expect(getProfileMcpScopes('user', deepClonePermission(source))).toContain('orders:read');
    expect(getProfileMcpScopes('user', { ...source, mcpScopes: [] })).toEqual([]);
  });

  it('preserves scopes on the server when an old client omits the field', () => {
    expect(preserveProfileMcpScopes({ mcpAccess: true }, { mcpScopes: [] })).toEqual({ mcpAccess: true, mcpScopes: [] });
    expect(preserveProfileMcpScopes({ mcpScopes: [] }, { mcpScopes: ['orders:read'] })).toEqual({ mcpScopes: [] });
    expect(preserveProfileMcpScopes(undefined, { mcpScopes: [] })).toBeUndefined();
  });

  it.each([null, 'orders:read', ['unknown'], ['orders:read', 'orders:read']].map((scopes) => ({ scopes })))('rejects invalid scope writes: %j', ({ scopes }) => {
    expect(() => validateProfileMcpScopes({ mcpScopes: scopes })).toThrow();
  });

  it('keeps corrupt persisted settings restrictive when an unrelated save omits scopes', () => {
    const preserved = preserveProfileMcpScopes({ mcpAccess: true }, { mcpScopes: null });
    expect(getEffectiveUserScopes(['orders:create'], { role: 'user', permissions: preserved })).toEqual([]);
  });

  it('keeps the UI scope catalog and presets compatible with the backend', () => {
    const supported = Object.values(MCP_SCOPES).map((scope: any) => scope.id).sort();
    expect(MCP_PROFILE_SCOPES.map((scope) => scope.id).sort()).toEqual(supported);
    for (const preset of [DEFAULT_USER_PERMISSIONS, EMPLOYEE_PERMISSIONS]) expect(() => validateProfileMcpScopes(preset)).not.toThrow();
  });

  it.each([
    { scope: 'orders:read', module: 'orders', action: 'view' },
    { scope: 'orders:draft', module: 'orders', action: 'view' },
    { scope: 'orders:create', module: 'orders', action: 'create' },
    { scope: 'customers:read', module: 'customers', action: 'view' },
    { scope: 'pricing:estimate', module: 'pricing', action: 'view' },
    { scope: 'gallery:read', module: 'gallery', action: 'view' },
  ])('enforces module permission for $scope on the client and server', ({ scope, module, action }) => {
    const permissions = { ...DEFAULT_USER_PERMISSIONS, mcpScopes: [scope], [module]: { view: true, create: true, edit: true, delete: true, [action]: false } } as Permission;
    expect(canUseMcpScope(scope, 'user', permissions)).toBe(false);
    expect(getEffectiveUserScopes([scope], { role: 'user', permissions })).toEqual([]);
  });

  it('blocks WhatsApp composition when the normal module is disabled', () => {
    const permissions = { ...DEFAULT_USER_PERMISSIONS, whatsapp: false, mcpScopes: ['whatsapp:compose'] };
    expect(canUseMcpScope('whatsapp:compose', 'user', permissions)).toBe(false);
    expect(getEffectiveUserScopes(['whatsapp:compose'], { role: 'user', permissions })).toEqual([]);
  });

  it('preserves admin role access while enforcing a restrictive MCP list', () => {
    expect(getEffectiveUserScopes(['orders:create', 'team:read'], { role: 'admin', permissions: { mcpScopes: ['team:read'], users: false } })).toEqual(['team:read']);
    expect(getEffectiveUserScopes(['team:read'], { role: 'funcionario' })).toEqual([]);
  });

  it('renders human-readable options with explicit empty and disabled states', () => {
    const html = renderToStaticMarkup(createElement(McpProfilePermissions, {
      role: 'user', permissions: { ...DEFAULT_USER_PERMISSIONS, mcpScopes: [] }, onChange: () => {},
    }));
    expect(html).toContain('Consultar clientes');
    expect(html).toContain('Nenhuma funcionalidade permitida');
    expect(html).not.toContain('Consultar produtividade da equipe');
    const disabled = renderToStaticMarkup(createElement(McpProfilePermissions, {
      role: 'user', permissions: { ...DEFAULT_USER_PERMISSIONS, mcpAccess: false }, onChange: () => {},
    }));
    expect(disabled).toContain('As opções escolhidas serão preservadas');
    expect(disabled).toContain('disabled');
  });
});

// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { McpProfilePermissions } from '../../src/app/components/users/McpProfilePermissions';
import { DEFAULT_USER_PERMISSIONS, type Permission } from '../../src/app/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot> | undefined;
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; document.body.innerHTML = ''; });

function mount(initial: Permission) {
  document.body.innerHTML = '<div id="test-root"></div>';
  function Harness() {
    const [permissions, setPermissions] = useState(initial);
    return <><McpProfilePermissions role="user" permissions={permissions} onChange={setPermissions} /><output id="saved-state">{JSON.stringify(permissions)}</output></>;
  }
  root = createRoot(document.getElementById('test-root')!);
  act(() => root!.render(<Harness />));
}
const state = () => JSON.parse(document.getElementById('saved-state')!.textContent!);
const click = (id: string) => act(() => document.getElementById(id)!.dispatchEvent(new MouseEvent('click', { bubbles: true })));

describe('Profile MCP controls', () => {
  it('selects and clears a functionality and preserves it across the access switch', () => {
    mount({ ...DEFAULT_USER_PERMISSIONS, mcpScopes: [] });
    click('profile-mcp-orders:read');
    expect(state().mcpScopes).toEqual(['orders:read']);
    click('profile-mcp-access');
    expect(state().mcpAccess).toBe(false);
    expect(state().mcpScopes).toEqual(['orders:read']);
    expect((document.getElementById('profile-mcp-orders:read') as HTMLButtonElement).disabled).toBe(true);
    click('profile-mcp-access');
    click('profile-mcp-orders:read');
    expect(state().mcpScopes).toEqual([]);
    expect(document.body.textContent).toContain('Nenhuma funcionalidade permitida');
  });

  it('keeps an explicitly empty list unselected when opening a profile', () => {
    mount({ ...DEFAULT_USER_PERMISSIONS, mcpScopes: [] });
    for (const box of document.querySelectorAll('[role="checkbox"]')) expect(box.getAttribute('aria-checked')).toBe('false');
    expect(state().mcpScopes).toEqual([]);
  });

  it('disables creation when the normal orders permission is read-only', () => {
    mount({ ...DEFAULT_USER_PERMISSIONS, mcpScopes: [], orders: { view: true, create: false, edit: false, delete: false } });
    expect((document.getElementById('profile-mcp-orders:create') as HTMLButtonElement).disabled).toBe(true);
    expect((document.getElementById('profile-mcp-orders:read') as HTMLButtonElement).disabled).toBe(false);
    expect(document.body.textContent).toContain('Indisponível pelas permissões do sistema');
  });

  it('lets the administrator repair obsolete scope values by explicitly revising the selection', () => {
    mount({ ...DEFAULT_USER_PERMISSIONS, mcpScopes: ['products:read', 'orders:read'] });
    expect(document.body.textContent).toContain('Configuração anterior inválida');
    click('profile-mcp-orders:read');
    expect(state().mcpScopes).toEqual([]);
    expect(document.body.textContent).not.toContain('Configuração anterior inválida');
  });
});

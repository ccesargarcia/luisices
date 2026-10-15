import type { Permission, UserRole } from '../../types';
import { MCP_PROFILE_SCOPES, canUseMcpScope, getProfileMcpScopes } from '../../utils/mcpProfilePermissions';
import { Checkbox } from '../ui/checkbox';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';

export function McpProfilePermissions({ role, permissions, onChange }: {
  role: UserRole; permissions: Permission; onChange: (permissions: Permission) => void;
}) {
  const enabled = permissions.mcpAccess !== false;
  const selected = getProfileMcpScopes(role, permissions);
  const invalid = Object.prototype.hasOwnProperty.call(permissions, 'mcpScopes') && (
    !Array.isArray(permissions.mcpScopes) || new Set(permissions.mcpScopes).size !== permissions.mcpScopes.length
    || permissions.mcpScopes.some((id) => !MCP_PROFILE_SCOPES.some((scope) => scope.id === id))
  );
  const effective = invalid ? [] : selected.filter((scope) => canUseMcpScope(scope, role, permissions));
  function toggle(scopeId: string) {
    const next = selected.includes(scopeId) ? selected.filter((id) => id !== scopeId) : [...selected, scopeId];
    onChange({ ...permissions, mcpScopes: next });
  }
  return (
    <section className="space-y-3 rounded-xl border p-4" aria-labelledby="profile-mcp-title">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Label id="profile-mcp-title" htmlFor="profile-mcp-access" className="text-sm font-semibold">Acesso pelo ChatGPT e assistentes</Label>
          <p className="text-xs text-muted-foreground">Escolha o que este usuário poderá fazer pela integração. As permissões do sistema também se aplicam.</p>
        </div>
        <Switch id="profile-mcp-access" checked={enabled} onCheckedChange={(mcpAccess) => onChange({ ...permissions, mcpAccess })} />
      </div>
      {invalid && <p className="text-xs text-destructive" role="alert">Configuração anterior inválida. Revise as funcionalidades antes de salvar.</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MCP_PROFILE_SCOPES.filter((scope) => !('adminOnly' in scope) || role === 'admin').map((scope) => {
          const allowed = canUseMcpScope(scope.id, role, permissions);
          return (
            <div key={scope.id} className="flex items-start gap-2">
              <Checkbox id={`profile-mcp-${scope.id}`} checked={selected.includes(scope.id)} disabled={!enabled || !allowed} onCheckedChange={() => toggle(scope.id)} />
              <div className="space-y-0.5">
                <Label htmlFor={`profile-mcp-${scope.id}`} className="text-xs font-normal">{scope.label}</Label>
                {'description' in scope && <p className="text-xs text-muted-foreground">{scope.description}</p>}
                {!allowed && <p className="text-xs text-muted-foreground">Indisponível pelas permissões do sistema.</p>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground" role="status">
        {!enabled ? 'Acesso pela integração desativado. As opções escolhidas serão preservadas.' : effective.length === 0 ? 'Nenhuma funcionalidade permitida pela integração.' : `${effective.length} funcionalidades permitidas. Salve o perfil para aplicar as alterações.`}
      </p>
    </section>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { firebaseUserService } from '../../services/firebaseUserService';
import {
  UserProfile,
  UserRole,
  Permission,
  ADMIN_PERMISSIONS,
  DEFAULT_USER_PERMISSIONS,
  ModulePermission,
} from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { toast } from 'sonner';
import {
  UserPlus,
  Users as UsersIcon,
  ShieldCheck,
  User,
  Pencil,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

// ─── Permission matrix helpers ───────────────────────────────────────────────

interface ModuleConfig {
  key: keyof Permission;
  label: string;
  type: 'boolean' | 'crud' | 'gallery';
}

const MODULES: ModuleConfig[] = [
  { key: 'dashboard',  label: 'Dashboard',  type: 'boolean' },
  { key: 'orders',     label: 'Pedidos',    type: 'crud' },
  { key: 'customers',  label: 'Clientes',   type: 'crud' },
  { key: 'products',   label: 'Produtos',   type: 'crud' },
  { key: 'quotes',     label: 'Orçamentos', type: 'crud' },
  { key: 'gallery',    label: 'Galeria',    type: 'gallery' },
  { key: 'exchanges',  label: 'Permutas',   type: 'boolean' },
  { key: 'reports',    label: 'Relatórios', type: 'boolean' },
  { key: 'settings',   label: 'Configurações', type: 'boolean' },
  { key: 'users',      label: 'Usuários',   type: 'crud' },
];

function deepClonePermission(p: Permission): Permission {
  return JSON.parse(JSON.stringify(p));
}

// ─── Permission Matrix Component ─────────────────────────────────────────────

interface PermissionMatrixProps {
  permissions: Permission;
  onChange: (p: Permission) => void;
}

function PermissionMatrix({ permissions, onChange }: PermissionMatrixProps) {
  function toggleBoolean(key: keyof Permission) {
    const next = deepClonePermission(permissions);
    (next[key] as boolean) = !(next[key] as boolean);
    onChange(next);
  }

  function toggleCrudField(key: keyof Permission, field: keyof ModulePermission) {
    const next = deepClonePermission(permissions);
    const mod = next[key] as ModulePermission;
    mod[field] = !mod[field];
    onChange(next);
  }

  function toggleGalleryField(field: keyof Permission['gallery']) {
    const next = deepClonePermission(permissions);
    next.gallery[field] = !next.gallery[field];
    onChange(next);
  }

  return (
    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
      {MODULES.map(({ key, label, type }) => (
        <div key={key} className="border rounded-md p-3 space-y-2">
          <p className="text-sm font-semibold">{label}</p>
          {type === 'boolean' && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={`perm-${key}`}
                checked={permissions[key] as boolean}
                onCheckedChange={() => toggleBoolean(key)}
              />
              <Label htmlFor={`perm-${key}`} className="text-xs font-normal">
                Acesso habilitado
              </Label>
            </div>
          )}
          {type === 'crud' && (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {(['view', 'create', 'edit', 'delete'] as (keyof ModulePermission)[]).map(field => (
                <div key={field} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`perm-${key}-${field}`}
                    checked={(permissions[key] as ModulePermission)[field]}
                    onCheckedChange={() => toggleCrudField(key, field)}
                  />
                  <Label htmlFor={`perm-${key}-${field}`} className="text-xs font-normal capitalize">
                    {field === 'view' ? 'Ver' : field === 'create' ? 'Criar' : field === 'edit' ? 'Editar' : 'Excluir'}
                  </Label>
                </div>
              ))}
            </div>
          )}
          {type === 'gallery' && (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {(['view', 'create', 'delete'] as (keyof Permission['gallery'])[]).map(field => (
                <div key={field} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`perm-gallery-${field}`}
                    checked={permissions.gallery[field]}
                    onCheckedChange={() => toggleGalleryField(field)}
                  />
                  <Label htmlFor={`perm-gallery-${field}`} className="text-xs font-normal">
                    {field === 'view' ? 'Ver' : field === 'create' ? 'Criar' : 'Excluir'}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── User Form Dialog ────────────────────────────────────────────────────────

interface UserFormDialogProps {
  open: boolean;
  editingUser: UserProfile | null;
  currentUserUid: string;
  onClose: () => void;
  onSaved: () => void;
}

function UserFormDialog({ open, editingUser, currentUserUid, onClose, onSaved }: UserFormDialogProps) {
  const isEdit = !!editingUser;
  const [displayName, setDisplayName] = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [role,        setRole]        = useState<UserRole>('user');
  const [permissions, setPermissions] = useState<Permission>(deepClonePermission(DEFAULT_USER_PERMISSIONS));
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    if (editingUser) {
      setDisplayName(editingUser.displayName);
      setEmail(editingUser.email);
      setRole(editingUser.role);
      setPermissions(deepClonePermission(editingUser.permissions));
      setPassword('');
    } else {
      setDisplayName('');
      setEmail('');
      setPassword('');
      setRole('user');
      setPermissions(deepClonePermission(DEFAULT_USER_PERMISSIONS));
    }
  }, [editingUser, open]);

  function applyPreset(r: UserRole) {
    setRole(r);
    setPermissions(r === 'admin' ? deepClonePermission(ADMIN_PERMISSIONS) : deepClonePermission(DEFAULT_USER_PERMISSIONS));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || !email.trim()) {
      toast.error('Preencha nome e e-mail');
      return;
    }
    if (!isEdit && !password.trim()) {
      toast.error('Informe uma senha');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await firebaseUserService.updateUserProfile(editingUser!.uid, {
          displayName,
          role,
          permissions,
        });
        toast.success('Usuário atualizado. O usuário precisa fazer logout/login para aplicar as mudanças.');
      } else {
        await firebaseUserService.createUser(email.trim(), password, displayName.trim(), role, permissions, currentUserUid);
        toast.success('Usuário criado com sucesso');
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="uf-name">Nome</Label>
            <Input
              id="uf-name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Nome completo"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="uf-email">E-mail</Label>
            <Input
              id="uf-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@email.com"
              required
              disabled={isEdit}
            />
          </div>

          {/* Password (create only) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="uf-pass">Senha</Label>
              <Input
                id="uf-pass"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>
          )}

          {/* Role */}
          <div className="space-y-1.5">
            <Label>Perfil</Label>
            <Select value={role} onValueChange={v => applyPreset(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin — acesso total</SelectItem>
                <SelectItem value="user">Usuário — acesso restrito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shortcut preset buttons */}
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('admin')}>
              <ShieldCheck className="size-3.5 mr-1" /> Preset Admin
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('user')}>
              <User className="size-3.5 mr-1" /> Preset Usuário
            </Button>
          </div>

          <Separator />

          {/* Permission Matrix */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Permissões granulares</p>
            <PermissionMatrix permissions={permissions} onChange={setPermissions} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="size-4 mr-2 animate-spin" /> Salvando…</> : isEdit ? 'Salvar alterações' : 'Criar usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Users() {
  const { user: currentUser, isAdmin } = useAuth();
  const [users,    setUsers]    = useState<UserProfile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [togglingUid, setTogglingUid] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await firebaseUserService.listUsers();
      setUsers(list);
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function toggleActive(u: UserProfile) {
    if (u.uid === currentUser?.uid) {
      toast.error('Você não pode desativar a própria conta');
      return;
    }
    setTogglingUid(u.uid);
    try {
      await firebaseUserService.setUserActive(u.uid, !u.active);
      setUsers(prev => prev.map(x => x.uid === u.uid ? { ...x, active: !u.active } : x));
      toast.success(u.active ? 'Usuário desativado' : 'Usuário ativado');
    } catch {
      toast.error('Erro ao alterar status');
    } finally {
      setTogglingUid(null);
    }
  }

  function openEdit(u: UserProfile) {
    setEditingUser(u);
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingUser(null);
    setDialogOpen(true);
  }

  const totalActive   = users.filter(u => u.active).length;
  const totalAdmins   = users.filter(u => u.role === 'admin').length;
  const totalInactive = users.filter(u => !u.active).length;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Você não tem permissão para acessar esta página.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground text-sm">Gerencie quem tem acesso ao sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers}>
            <RefreshCw className="size-4 mr-1" />
            Atualizar
          </Button>
          <Button size="sm" onClick={openCreate}>
            <UserPlus className="size-4 mr-1" />
            Novo usuário
          </Button>
        </div>
      </div>

      {/* Alert sobre logout/login */}
      <Alert>
        <AlertCircle className="size-4" />
        <AlertTitle>⚠️ Importante</AlertTitle>
        <AlertDescription>
          Após alterar permissões de um usuário, ele precisa fazer <strong>logout e login novamente</strong> para que as mudanças tenham efeito.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal">Total de usuários</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold flex items-center gap-2">
              <UsersIcon className="size-5 text-primary" />
              {users.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal">Ativos</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold text-green-600">{totalActive}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal">Admins / Inativos</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold">
              <span className="text-yellow-600">{totalAdmins}</span>
              <span className="text-muted-foreground text-sm font-normal mx-1">/</span>
              <span className="text-destructive">{totalInactive}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table — desktop */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="size-7 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden sm:block border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
                {users.map(u => (
                  <TableRow key={u.uid} className="group">
                    <TableCell className="font-medium">
                      {u.displayName}
                      {u.uid === currentUser?.uid && (
                        <Badge variant="outline" className="ml-2 text-xs">você</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell>
                      {u.role === 'admin' ? (
                        <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-300 hover:bg-yellow-500/30">
                          <ShieldCheck className="size-3 mr-1" /> Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <User className="size-3 mr-1" /> Usuário
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={u.active}
                          onCheckedChange={() => toggleActive(u)}
                          disabled={togglingUid === u.uid || u.uid === currentUser?.uid}
                          aria-label="Ativar/desativar usuário"
                        />
                        <span className={`text-xs ${u.active ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {u.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(u)} className="size-8">
                        <Pencil className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {users.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>
            )}
            {users.map(u => (
              <Card key={u.uid}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {u.displayName}
                        {u.uid === currentUser?.uid && (
                          <Badge variant="outline" className="ml-2 text-xs">você</Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(u)} className="size-8 flex-shrink-0">
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    {u.role === 'admin' ? (
                      <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-300">
                        <ShieldCheck className="size-3 mr-1" /> Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <User className="size-3 mr-1" /> Usuário
                      </Badge>
                    )}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={u.active}
                        onCheckedChange={() => toggleActive(u)}
                        disabled={togglingUid === u.uid || u.uid === currentUser?.uid}
                      />
                      <span className={`text-xs ${u.active ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {u.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Dialog */}
      <UserFormDialog
        open={dialogOpen}
        editingUser={editingUser}
        currentUserUid={currentUser?.uid ?? ''}
        onClose={() => setDialogOpen(false)}
        onSaved={fetchUsers}
      />
    </div>
  );
}

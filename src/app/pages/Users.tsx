import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { firebaseUserService, DeviceSession } from '../../services/firebaseUserService';
import { firebaseAlexaService } from '../../services/firebaseAlexaService';
import { database } from '../../lib/firebase';
import { ref, onValue, off } from 'firebase/database';
import {
  UserProfile,
  UserRole,
  Permission,
  ADMIN_PERMISSIONS,
  DEFAULT_USER_PERMISSIONS,
  EMPLOYEE_PERMISSIONS,
  ModulePermission,
  AlexaConfirmationMode,
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
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { PaginationControls } from '../components/common/PaginationControls';
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
  MailPlus,
  KeyRound,
  Trash2,
  Mic,
  Search,
  MonitorSmartphone,
} from 'lucide-react';


// ─── Permission matrix helpers ───────────────────────────────────────────────

interface ModuleConfig {
  key: keyof Permission;
  label: string;
  type: 'boolean' | 'crud' | 'gallery';
}

const MODULES: ModuleConfig[] = [
  { key: 'dashboard',      label: 'Dashboard',                          type: 'boolean' },
  { key: 'orders',         label: 'Pedidos',                            type: 'crud' },
  { key: 'archivedOrders', label: 'Pedidos Arquivados (Área de Arquivamento)', type: 'crud' },
  { key: 'customers',      label: 'Clientes',                           type: 'crud' },
  { key: 'whatsapp',       label: 'Atendimento (WhatsApp)',             type: 'boolean' },
  { key: 'aiCopilot',      label: 'Copiloto de IA',                     type: 'boolean' },
  { key: 'products',       label: 'Produtos do Ateliê (Internos)',      type: 'crud' },
  { key: 'storeProducts',  label: 'Lojinha Online - Produtos da Vitrine', type: 'crud' },
  { key: 'store',          label: 'Lojinha Online - Aparência & Banners', type: 'boolean' },
  { key: 'quotes',         label: 'Orçamentos',                         type: 'crud' },
  { key: 'gallery',        label: 'Galeria',                            type: 'gallery' },
  { key: 'exchanges',      label: 'Permutas',                           type: 'boolean' },
  { key: 'reports',        label: 'Relatórios',                         type: 'boolean' },
  { key: 'settings',       label: 'Configurações',                      type: 'boolean' },
  { key: 'users',          label: 'Usuários',                           type: 'crud' },
  { key: 'emails',         label: 'E-mails (Central & Envio)',          type: 'crud' },
  { key: 'pricing',        label: 'Precificação & Custos de Insumos',   type: 'crud' },
];

function deepClonePermission(p?: Permission | null): Permission {
  const source = p && typeof p === 'object' ? p as unknown as Record<string, any> : {};
  const clone = JSON.parse(JSON.stringify(DEFAULT_USER_PERMISSIONS)) as Record<string, any>;
  const crudKeys = ['orders', 'archivedOrders', 'customers', 'products', 'quotes', 'users', 'emails', 'pricing', 'storeProducts'];
  const booleanKeys = ['dashboard', 'reports', 'exchanges', 'settings', 'store', 'whatsapp', 'aiCopilot'];

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

  return clone as Permission;
}

function formatUserDate(value?: string) {
  if (!value) return 'Nunca';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Indisponível' : date.toLocaleString('pt-BR');
}

function formatAccountDate(value?: string) {
  return value ? formatUserDate(value) : 'Sem registro';
}

function formatLastSignIn(value?: string, metadataLoaded?: boolean) {
  if (value) return formatUserDate(value);
  return metadataLoaded ? 'Nunca' : 'Indisponível';
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
    if (!next[key]) {
      (next as any)[key] = { view: false, create: false, edit: false, delete: false };
    }
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
    <div className="space-y-3 max-h-[35dvh] overflow-y-auto pr-1 sm:max-h-[40vh]">
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
              {(['view', 'create', 'edit', 'delete'] as (keyof ModulePermission)[]).map(field => {
                let actionLabel = field === 'view' ? 'Ver' : field === 'create' ? 'Criar' : field === 'edit' ? 'Editar' : 'Excluir';
                if (key === 'archivedOrders') {
                  actionLabel = field === 'view' ? 'Ver / Acessar' : field === 'create' ? 'Arquivar' : field === 'edit' ? 'Desarquivar' : 'Excluir';
                } else if (key === 'emails') {
                  actionLabel = field === 'view' ? 'Ver Central' : field === 'create' ? 'Enviar E-mails' : field === 'edit' ? 'Alterar Status' : 'Excluir';
                }
                return (
                  <div key={field} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`perm-${key}-${field}`}
                      checked={Boolean((permissions[key as keyof Permission] as ModulePermission)?.[field])}
                      onCheckedChange={() => toggleCrudField(key as keyof Permission, field)}
                    />
                    <Label htmlFor={`perm-${key}-${field}`} className="text-xs font-normal">
                      {actionLabel}
                    </Label>
                  </div>
                );
              })}
            </div>
          )}
          {type === 'gallery' && (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {(['view', 'create', 'delete'] as (keyof Permission['gallery'])[]).map(field => (
                <div key={field} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`perm-gallery-${field}`}
                    checked={Boolean(permissions.gallery?.[field])}
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
  onClose: () => void;
  onSaved: () => void;
}

function UserFormDialog({ open, editingUser, onClose, onSaved }: UserFormDialogProps) {
  const isEdit = !!editingUser;
  const [displayName, setDisplayName] = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [role,        setRole]        = useState<UserRole>('user');
  const [permissions, setPermissions] = useState<Permission>(deepClonePermission(DEFAULT_USER_PERMISSIONS));
  const [saving,      setSaving]      = useState(false);
  const [alexaEnabled, setAlexaEnabled] = useState(false);
  const [alexaMode, setAlexaMode] = useState<AlexaConfirmationMode>('voice_confirm');
  const [alexaDirty, setAlexaDirty] = useState(false);
  const [alexaLoading, setAlexaLoading] = useState(false);
  const [alexaError, setAlexaError] = useState<string | null>(null);

  const loadAlexaPermission = (targetUid: string) => {
    let cancelled = false;
    setAlexaLoading(true);
    setAlexaError(null);
    firebaseAlexaService.getStatus(targetUid).then((st) => {
      if (cancelled) return; // Descarta resposta de consulta anterior
      const perm = st.targetPermission ?? st.userPermission;
      if (perm && perm.uid === targetUid) {
        setAlexaEnabled(Boolean(perm.enabled));
        setAlexaMode(perm.mode || 'voice_confirm');
      } else {
        setAlexaEnabled(false);
        setAlexaMode('voice_confirm');
      }
    }).catch((err) => {
      if (!cancelled) {
        setAlexaError('Erro ao carregar permissão Alexa deste usuário.');
      }
    }).finally(() => {
      if (!cancelled) setAlexaLoading(false);
    });
    return () => { cancelled = true; setAlexaLoading(false); };
  };

  useEffect(() => {
    if (editingUser) {
      setDisplayName(editingUser.displayName);
      setEmail(editingUser.email);
      setRole(editingUser.role);
      setPermissions(deepClonePermission(editingUser.permissions));
      setPassword('');
      setAlexaDirty(false);
      setAlexaError(null);
      return loadAlexaPermission(editingUser.uid);
    } else {
      setDisplayName('');
      setEmail('');
      setPassword('');
      setRole('user');
      setPermissions(deepClonePermission(DEFAULT_USER_PERMISSIONS));
      setAlexaEnabled(false);
      setAlexaMode('voice_confirm');
      setAlexaDirty(false);
      setAlexaLoading(false);
      setAlexaError(null);
    }
  }, [editingUser, open]);

  function applyPreset(r: UserRole) {
    setRole(r);
    setPermissions(
      r === 'admin'
        ? deepClonePermission(ADMIN_PERMISSIONS)
        : r === 'funcionario'
          ? deepClonePermission(EMPLOYEE_PERMISSIONS)
          : deepClonePermission(DEFAULT_USER_PERMISSIONS),
    );
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
    // Achado 5: Validação de pré-condições ANTES de qualquer escrita no Firestore
    if (isEdit && alexaDirty && alexaLoading) {
      toast.error('Aguarde o carregamento das configurações da Alexa antes de salvar.');
      return;
    }
    if (isEdit && alexaDirty && alexaError) {
      toast.error('Não é possível salvar configurações da Alexa enquanto houver erro de carregamento.');
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
        if (alexaDirty) {
          await firebaseAlexaService.setPermission(editingUser!.uid, alexaEnabled, alexaMode);
        }
        toast.success('Usuário atualizado com sucesso. As alterações já estão ativas em tempo real.');
      } else {
        await firebaseUserService.createUser(email.trim(), password, displayName.trim(), role, permissions);
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
      <DialogContent size="lg" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
          <DialogTitle>{isEdit ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEdit ? 'Atualize as credenciais e o nível de acesso do usuário.' : 'Defina os dados e as permissões para o novo usuário.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <DialogBody className="p-4 sm:p-6 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="user-name">Nome</Label>
            <Input
              id="user-name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Nome completo"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="user-email">E-mail</Label>
            <Input
              id="user-email"
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
              <Label htmlFor="user-password">Senha</Label>
              <Input
                id="user-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
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
                <SelectItem value="funcionario">Funcionário — operação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shortcut preset buttons */}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="min-w-0 whitespace-normal text-left" onClick={() => applyPreset('admin')}>
              <ShieldCheck className="size-3.5 mr-1" /> Preset Admin
            </Button>
            <Button type="button" size="sm" variant="outline" className="min-w-0 whitespace-normal text-left" onClick={() => applyPreset('user')}>
              <User className="size-3.5 mr-1" /> Preset Usuário
            </Button>
            <Button type="button" size="sm" variant="outline" className="min-w-0 whitespace-normal text-left" onClick={() => applyPreset('funcionario')}>
              <User className="size-3.5 mr-1" /> Preset Funcionário
            </Button>
          </div>

          <Separator />

          {/* Permission Matrix */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Permissões de acesso</p>
            <PermissionMatrix permissions={permissions} onChange={setPermissions} />
          </div>

          {/* Integração Alexa (apenas ao editar usuário existente) */}
          {isEdit && (
            <div className="space-y-3 p-4 rounded-xl border border-sky-500/25 bg-sky-500/5 dark:bg-sky-950/20">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                    <Mic className="size-4 text-sky-500" />
                    Criação de Pedidos por Alexa
                    {alexaLoading && (
                      <span className="text-xs font-normal text-sky-500 animate-pulse">(Carregando...)</span>
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Permite que esta pessoa crie pedidos por voz na Alexa diretamente em seu espaço pessoal.
                  </p>
                </div>
                <Switch
                  checked={alexaEnabled}
                  disabled={alexaLoading || Boolean(alexaError)}
                  onCheckedChange={(val) => {
                    setAlexaEnabled(val);
                    setAlexaDirty(true);
                  }}
                />
              </div>

              {alexaError && (
                <div className="flex items-center justify-between text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg">
                  <span>{alexaError}</span>
                  <button
                    type="button"
                    className="underline hover:no-underline font-medium ml-2 cursor-pointer"
                    onClick={() => editingUser && loadAlexaPermission(editingUser.uid)}
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {alexaEnabled && !alexaError && (
                <div className="space-y-1.5 pt-2 border-t border-sky-500/15">
                  <Label className="text-xs font-medium">Modo de Confirmação</Label>
                  <Select
                    value={alexaMode}
                    disabled={alexaLoading}
                    onValueChange={(val: any) => {
                      setAlexaMode(val);
                      setAlexaDirty(true);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="voice_confirm" className="text-xs">
                        Confirmação por Voz Direta (Grava no quadro após dizer "Sim")
                      </SelectItem>
                      <SelectItem value="app_approval" className="text-xs">
                        Aprovação Prévia no Aplicativo (Exige revisão web antes de gravar)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </DialogBody>


        <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border">
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

// ─── User Devices Dialog ────────────────────────────────────────────────────────

interface UserDevicesDialogProps {
  open: boolean;
  user: UserProfile | null;
  onClose: () => void;
}

function UserDevicesDialog({ open, user, onClose }: UserDevicesDialogProps) {
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      loadDevices();
    } else {
      setDevices([]);
    }
  }, [open, user]);

  async function loadDevices() {
    if (!user) return;
    setLoading(true);
    try {
      const list = await firebaseUserService.getUserDevices(user.uid);
      setDevices(list);
    } catch (err) {
      toast.error('Erro ao carregar dispositivos');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeAll() {
    if (!user) return;
    setRevoking('all');
    try {
      await firebaseUserService.revokeAllSessions(user.uid);
      toast.success('Todas as sessões encerradas com sucesso');
      await loadDevices(); // Recarrega a lista
    } catch (err) {
      toast.error('Erro ao encerrar sessões');
    } finally {
      setRevoking(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent size="lg" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
          <DialogTitle>Dispositivos Ativos</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Monitoramento de sessões para {user?.displayName}. Você pode desconectar remotamente todos os dispositivos.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="p-4 sm:p-6 overflow-y-auto space-y-4 bg-muted/10">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum dispositivo ativo registrado.
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map(device => (
                <Card key={device.deviceId} className="overflow-hidden">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <MonitorSmartphone className="size-4 text-primary shrink-0" />
                        <h4 className="font-medium text-sm line-clamp-2 break-all">{device.userAgent || 'Dispositivo Desconhecido'}</h4>
                      </div>
                      <div className="flex flex-col gap-2 text-xs text-muted-foreground mt-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground/80">Endereço IP:</span>
                          <span className="break-all">{device.ip || 'Não detectado'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground/80">Localização (Aprox.):</span>
                          <span className="break-words">{device.location || 'Não detectada'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mt-1">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground/80">Última Atividade:</span>
                            <span>{formatUserDate(device.lastActiveAt)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground/80">Conectado em:</span>
                            <span>{formatUserDate(device.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogBody>

        <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border bg-background sm:justify-between items-center flex-col sm:flex-row gap-3">
          {devices.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleRevokeAll}
              disabled={revoking === 'all'}
              className="w-full sm:w-auto"
            >
              {revoking === 'all' ? (
                <><Loader2 className="size-3.5 mr-2 animate-spin" /> Revogando...</>
              ) : (
                <><Trash2 className="size-3.5 mr-2" /> Revogar Todas as Sessões</>
              )}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────


export function Users() {
  const { user: currentUser, isAdmin, loading: authLoading, hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = ['membros', 'convites', 'papeis'] as const;
  type UserTabType = typeof validTabs[number];

  const tabParam = searchParams.get('tab') as UserTabType;
  const initialTab: UserTabType = validTabs.includes(tabParam) ? tabParam : 'membros';
  const [activeTab, setActiveTab] = useState<UserTabType>(initialTab);
  const [presenceData, setPresenceData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!isAdmin) return;
    const statusRef = ref(database, '/status');
    const unsubscribe = onValue(statusRef, (snap) => {
      if (snap.exists()) {
        setPresenceData(snap.val());
      } else {
        setPresenceData({});
      }
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleTabChange = (val: string) => {
    const nextTab = val as UserTabType;
    setActiveTab(nextTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', nextTab);
      return next;
    }, { replace: true });
  };

  const renderPresence = (uid: string) => {
    const data = presenceData[uid];
    const isOnline = data?.state === 'online' || (data?.connections && Object.keys(data.connections).length > 0);
    return (
      <span
        title={isOnline ? 'Online agora' : 'Offline'}
        className={`inline-block w-2 h-2 shrink-0 rounded-full mr-2 transition-colors ${
          isOnline
            ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
            : 'bg-muted-foreground/30 dark:bg-muted-foreground/20'
        }`}
      />
    );
  };

  useEffect(() => {
    const currentTabParam = searchParams.get('tab') as UserTabType;
    if (currentTabParam && validTabs.includes(currentTabParam) && currentTabParam !== activeTab) {
      setActiveTab(currentTabParam);
    }
  }, [searchParams]);

  const [users,    setUsers]    = useState<UserProfile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [togglingUid, setTogglingUid] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteWhatsapp, setInviteWhatsapp] = useState('');
  const [inviting, setInviting] = useState(false);
  const [resettingUid, setResettingUid] = useState<string | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewDevicesUser, setViewDevicesUser] = useState<UserProfile | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await firebaseUserService.listUsers();
      try {
        const metadata = await firebaseUserService.getAccountMetadata(list.map((user) => user.uid));
        const metadataByUid = new Map(metadata.map((item) => [item.uid, item]));
        setUsers(list.map((user) => ({
          ...user,
          ...metadataByUid.get(user.uid),
          accountMetadataLoaded: true,
        })));
      } catch (error) {
        console.warn('[Users] Não foi possível carregar os dados de acesso das contas:', error);
        setUsers(list.map((user) => ({ ...user, accountMetadataLoaded: false })));
      }
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && currentUser?.uid) void fetchUsers();
  }, [authLoading, currentUser?.uid, fetchUsers]);

  async function toggleActive(u: UserProfile) {
    if (u.uid === currentUser?.uid) {
      toast.error('Você não pode desativar a própria conta');
      return;
    }
    setTogglingUid(u.uid);
    try {
      await firebaseUserService.setUserActive(u.uid, !u.active);
      setUsers(prev => prev.map(x => x.uid === u.uid ? { ...x, active: !u.active, updatedAt: new Date().toISOString() } : x));
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

  async function sendPasswordReset(u: UserProfile) {
    setResettingUid(u.uid);
    try {
      await firebaseUserService.sendAdminPasswordReset(u.email);
      setUsers((prev) => prev.map((user) => user.uid === u.uid
        ? { ...user, lastPasswordResetRequestedAt: new Date().toISOString() }
        : user));
      toast.success(`Link de redefinição enviado para ${u.email}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar o link de redefinição');
    } finally {
      setResettingUid(null);
    }
  }

  async function sendInvitation(event: React.FormEvent) {
    event.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const result = await firebaseUserService.createUserInvitation(inviteEmail.trim(), inviteWhatsapp.trim() || undefined);
      if (result.repairedExistingAccount) {
        toast.success('Conta recuperada e ativa. O acesso já pode ser usado.');
      } else if (result.verificationSent) {
        toast.success(`Enviamos um novo link de confirmação para ${inviteEmail.trim()}.`);
      } else if (result.expiresAt) {
        const expiresAt = new Date(result.expiresAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        toast.success(`Convite enviado. Válido até ${expiresAt}.`);
      }
      setInviteEmail('');
      setInviteWhatsapp('');
      setInviteOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar o convite');
    } finally {
      setInviting(false);
    }
  }

  async function confirmDeleteUser() {
    if (!deleteUserTarget) return;
    if (deleteUserTarget.uid === currentUser?.uid) {
      toast.error('Você não pode excluir sua própria conta');
      return;
    }
    setDeleting(true);
    try {
      await firebaseUserService.deleteUser(deleteUserTarget.uid);
      setUsers(prev => prev.filter(u => u.uid !== deleteUserTarget.uid));
      toast.success(`Usuário ${deleteUserTarget.displayName || deleteUserTarget.email} excluído.`);
      setDeleteUserTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir o usuário');
    } finally {
      setDeleting(false);
    }
  }

  const totalActive   = users.filter(u => u.active).length;
  const totalAdmins   = users.filter(u => u.role === 'admin').length;
  const totalInactive = users.filter(u => !u.active).length;

  const filteredUsers = useMemo<UserProfile[]>(() => {
    return users.filter((u: UserProfile) => {
      const matchSearch =
        u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  const effectivePageSize = pageSize === 'all' ? filteredUsers.length : pageSize;
  const totalPages = Math.ceil(filteredUsers.length / (effectivePageSize || 1));
  const paginatedUsers = useMemo<UserProfile[]>(() => {
    if (pageSize === 'all') return filteredUsers;
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin && !hasPermission(p => p.users?.view ?? false)) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Você não tem permissão para acessar esta página.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Gerencie quem tem acesso ao sistema</p>
        </div>
        <div className="flex w-full sm:w-auto flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-1.5" title="Atualizar lista">
            <RefreshCw className="size-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)} className="gap-1.5 flex-1 sm:flex-none">
            <MailPlus className="size-4" />
            <span>Enviar convite</span>
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-1.5 flex-1 sm:flex-none">
            <UserPlus className="size-4" />
            <span>Novo usuário</span>
          </Button>
        </div>
      </div>

      {/* Navegação por Abas */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="overflow-x-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
          <TabsList className="h-auto p-1 gap-1 flex-wrap sm:flex-nowrap">
            <TabsTrigger value="membros" className="gap-2 px-3.5 py-2 text-xs sm:text-sm">
              <UsersIcon className="size-4 shrink-0" />
              <span>Membros Ativos ({users.length})</span>
            </TabsTrigger>
            <TabsTrigger value="convites" className="gap-2 px-3.5 py-2 text-xs sm:text-sm">
              <MailPlus className="size-4 shrink-0" />
              <span>Enviar Convite</span>
            </TabsTrigger>
            <TabsTrigger value="papeis" className="gap-2 px-3.5 py-2 text-xs sm:text-sm">
              <ShieldCheck className="size-4 shrink-0" />
              <span>Perfis & Regras de Acesso</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── ABA 1: MEMBROS ATIVOS ──────────────────────────────── */}
        <TabsContent value="membros" className="space-y-6">
          {/* Alert sobre logout/login */}
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>⚠️ Importante</AlertTitle>
            <AlertDescription>
              Alterações de permissões e status são aplicadas em tempo real. Se o usuário estiver em uma tela aberta, ela será bloqueada assim que a nova regra for recebida.
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

          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/70 shadow-xs">
            <div className="relative w-full sm:flex-1 sm:max-w-md">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-xs w-full"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={roleFilter}
                onValueChange={(val) => {
                  setRoleFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-40 h-9 text-xs">
                  <SelectValue placeholder="Todos os Perfis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Perfis</SelectItem>
                  <SelectItem value="admin">Administradores</SelectItem>
                  <SelectItem value="funcionario">Funcionários</SelectItem>
                  <SelectItem value="user">Usuários Padrão</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                      <TableHead>Usuário</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Atividade da conta</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    )}
                    {paginatedUsers.map(u => (
                      <TableRow key={u.uid} className="group">
                        <TableCell className="font-medium">
                          <div className="flex items-center">{renderPresence(u.uid)} {u.displayName}{u.uid === currentUser?.uid && <Badge variant="outline" className="ml-2 text-xs">você</Badge>}</div>
                          <div className="text-muted-foreground text-xs font-normal">{u.email}</div>
                        </TableCell>
                        <TableCell>
                          {u.role === 'admin' ? (
                            <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-300 hover:bg-yellow-500/30">
                              <ShieldCheck className="size-3 mr-1" /> Admin
                            </Badge>
                          ) : u.role === 'funcionario' ? (
                            <Badge className="bg-blue-500/15 text-blue-700 border-blue-300">
                              <User className="size-3 mr-1" /> Funcionário
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <User className="size-3 mr-1" /> Usuário
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={u.active ? 'default' : 'secondary'}
                            size="sm"
                            className={`h-7 px-3 text-xs w-20 flex justify-center ${u.active ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-muted-foreground'}`}
                            onClick={() => toggleActive(u)}
                            disabled={togglingUid === u.uid || u.uid === currentUser?.uid}
                            title={u.active ? 'Clique para desativar' : 'Clique para ativar'}
                          >
                            {togglingUid === u.uid ? <Loader2 className="size-3 animate-spin" /> : (u.active ? 'Ativo' : 'Inativo')}
                          </Button>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground min-w-64">
                          <div>Último acesso: <span className="text-foreground">{formatLastSignIn(u.lastSignInAt, u.accountMetadataLoaded)}</span></div>
                          <div>Criada em: <span className="text-foreground">{formatAccountDate(u.authCreatedAt || u.createdAt)}</span></div>
                          <div>Senha alterada (Declarada): <span className="text-foreground">{formatAccountDate(u.passwordChangedAt)}</span></div>
                          <div>Perfil atualizado: <span className="text-foreground">{formatAccountDate(u.updatedAt)}</span></div>
                          {u.lastPasswordResetRequestedAt && <div>Redefinição solicitada: <span className="text-foreground">{formatUserDate(u.lastPasswordResetRequestedAt)}</span></div>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => setViewDevicesUser(u)} className="size-8 text-sky-600 hover:text-sky-700 hover:bg-sky-500/10" aria-label={`Ver dispositivos de ${u.displayName}`} title="Dispositivos Ativos">
                              <MonitorSmartphone className="size-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openEdit(u)} className="size-8" aria-label={`Editar ${u.displayName}`} title="Editar usuário">
                              <Pencil className="size-3.5" />
                            </Button>
                            {u.uid !== currentUser?.uid && (
                              <>
                                <Button size="icon" variant="ghost" onClick={() => sendPasswordReset(u)} disabled={resettingUid === u.uid} className="size-8" title="Enviar redefinição de senha" aria-label={`Enviar redefinição de senha para ${u.displayName}`}>
                                  {resettingUid === u.uid ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => setDeleteUserTarget(u)} className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10" title="Excluir usuário" aria-label={`Excluir ${u.displayName}`}>
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {filteredUsers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>
                )}
                {paginatedUsers.map(u => (
                  <Card key={u.uid}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate flex items-center">
                            {renderPresence(u.uid)} {u.displayName}
                            {u.uid === currentUser?.uid && (
                              <Badge variant="outline" className="ml-2 text-xs">você</Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <div className="flex shrink-0 gap-0.5">
                          <Button size="icon" variant="ghost" onClick={() => setViewDevicesUser(u)} className="size-8 text-sky-600 hover:text-sky-700 hover:bg-sky-500/10" aria-label={`Ver dispositivos de ${u.displayName}`} title="Dispositivos Ativos">
                            <MonitorSmartphone className="size-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(u)} className="size-8" aria-label={`Editar ${u.displayName}`} title="Editar usuário">
                            <Pencil className="size-3.5" />
                          </Button>
                          {u.uid !== currentUser?.uid && (
                            <>
                              <Button size="icon" variant="ghost" onClick={() => sendPasswordReset(u)} disabled={resettingUid === u.uid} className="size-8" title="Enviar redefinição de senha" aria-label={`Enviar redefinição de senha para ${u.displayName}`}>
                                {resettingUid === u.uid ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => setDeleteUserTarget(u)} className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10" title="Excluir usuário" aria-label={`Excluir ${u.displayName}`}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        {u.role === 'admin' ? (
                          <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-300">
                            <ShieldCheck className="size-3 mr-1" /> Admin
                          </Badge>
                        ) : u.role === 'funcionario' ? (
                          <Badge className="bg-blue-500/15 text-blue-700 border-blue-300">
                            <User className="size-3 mr-1" /> Funcionário
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <User className="size-3 mr-1" /> Usuário
                          </Badge>
                        )}
                        <Button
                          variant={u.active ? 'default' : 'secondary'}
                          size="sm"
                          className={`h-7 px-3 text-xs w-20 flex justify-center ${u.active ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-muted-foreground'}`}
                          onClick={() => toggleActive(u)}
                          disabled={togglingUid === u.uid || u.uid === currentUser?.uid}
                          title={u.active ? 'Clique para desativar' : 'Clique para ativar'}
                        >
                          {togglingUid === u.uid ? <Loader2 className="size-3 animate-spin" /> : (u.active ? 'Ativo' : 'Inativo')}
                        </Button>
                      </div>
                      <div className="border-t pt-2 text-xs text-muted-foreground space-y-1">
                        <p>Último acesso: <span className="text-foreground">{formatLastSignIn(u.lastSignInAt, u.accountMetadataLoaded)}</span></p>
                        <p>Conta criada em: <span className="text-foreground">{formatAccountDate(u.authCreatedAt || u.createdAt)}</span></p>
                        <p>Senha alterada (Declarada pelo cliente): <span className="text-foreground">{formatAccountDate(u.passwordChangedAt)}</span></p>
                        <p>Perfil atualizado: <span className="text-foreground">{formatAccountDate(u.updatedAt)}</span></p>
                        {u.lastPasswordResetRequestedAt && <p>Última redefinição solicitada: <span className="text-foreground">{formatUserDate(u.lastPasswordResetRequestedAt)}</span></p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Controles de Paginação */}
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredUsers.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 25, 50, 'all']}
                itemName="usuário"
                itemPluralName="usuários"
              />
            </>
          )}
        </TabsContent>

        {/* ─── ABA 2: ENVIAR CONVITE ──────────────────────────────── */}
        <TabsContent value="convites" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MailPlus className="size-5 text-primary" />
                Convidar Novo Membro para a Equipe
              </CardTitle>
              <CardDescription>
                Envie um convite direto por e-mail ou WhatsApp para novos colaboradores cadastrarem sua própria senha com segurança.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={sendInvitation} className="max-w-xl space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-tab-email">E-mail do novo membro</Label>
                  <Input
                    id="invite-tab-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colaborador@atelie.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-tab-whatsapp">WhatsApp para envio do link (opcional)</Label>
                  <Input
                    id="invite-tab-whatsapp"
                    type="tel"
                    value={inviteWhatsapp}
                    onChange={(e) => setInviteWhatsapp(e.target.value)}
                    placeholder="11999999999"
                  />
                  <p className="text-xs text-muted-foreground">
                    O link de ativação expira em 48 horas. A conta é criada automaticamente após o preenchimento.
                  </p>
                </div>
                <div className="pt-2">
                  <Button type="submit" disabled={inviting} className="gap-2">
                    {inviting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Enviando convite...
                      </>
                    ) : (
                      <>
                        <MailPlus className="size-4" />
                        Gerar e Enviar Convite
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ABA 3: PERFIS & REGRAS DE ACESSO ───────────────────── */}
        <TabsContent value="papeis" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300">
                    <ShieldCheck className="size-3 mr-1" /> Administrador
                  </Badge>
                </div>
                <CardTitle className="text-lg pt-2">Acesso Total (Master)</CardTitle>
                <CardDescription>
                  Controle irrestrito sobre todas as configurações, financeiro, equipe, inteligência artificial e pedidos arquivados.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <p>• Gestão de usuários e envio de convites</p>
                <p>• Precificação, receitas e custos de insumos</p>
                <p>• Configurações da Alexa Skill e telemetria de IA</p>
                <p>• Arquivamento, desarquivamento e exclusão</p>
              </CardContent>
            </Card>

            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300">
                    <User className="size-3 mr-1" /> Funcionário
                  </Badge>
                </div>
                <CardTitle className="text-lg pt-2">Operacional & Produção</CardTitle>
                <CardDescription>
                  Focado na esteira diária de pedidos, atualização de status de produção, atendimento e catálogo.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <p>• Visualização e criação de pedidos e clientes</p>
                <p>• Acesso à agenda semanal e galeria</p>
                <p>• Sem acesso à gestão de usuários e zona de perigo</p>
                <p>• Permissões ajustáveis individualmente</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    <User className="size-3 mr-1" /> Usuário Padrão
                  </Badge>
                </div>
                <CardTitle className="text-lg pt-2">Consulta Básica</CardTitle>
                <CardDescription>
                  Perfil com permissões padrão personalizadas conforme as regras do ateliê.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <p>• Permissões customizáveis módulo por módulo</p>
                <p>• Controle granular (Ver, Criar, Editar, Excluir)</p>
                <p>• Acesso restrito a orçamentos e produtos</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <UserFormDialog
        open={dialogOpen}
        editingUser={editingUser}
        onClose={() => setDialogOpen(false)}
        onSaved={fetchUsers}
      />
      
      <UserDevicesDialog
        open={Boolean(viewDevicesUser)}
        user={viewDevicesUser}
        onClose={() => setViewDevicesUser(null)}
      />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent size="md" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
            <DialogTitle>Enviar convite</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Convide novos membros para fazerem parte da equipe do ateliê.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={sendInvitation} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <DialogBody className="p-4 sm:p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">E-mail da pessoa convidada</Label>
                <Input id="invite-email" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="pessoa@empresa.com" required />
                <Label htmlFor="invite-whatsapp">WhatsApp (opcional)</Label>
                <Input id="invite-whatsapp" type="tel" value={inviteWhatsapp} onChange={(event) => setInviteWhatsapp(event.target.value)} placeholder="5511999999999" />
                <p className="text-xs text-muted-foreground">O convite expira em 48 horas. O acesso só é concluído após a confirmação do e-mail.</p>
              </div>
            </DialogBody>
            <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>Cancelar</Button>
              <Button type="submit" disabled={inviting} className="w-full sm:w-auto">
                {inviting ? <><Loader2 className="size-4 mr-2 animate-spin" /> Enviando...</> : <><MailPlus className="size-4 mr-2" /> Enviar convite</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Deleting User */}
      <AlertDialog open={Boolean(deleteUserTarget)} onOpenChange={(open) => { if (!open) setDeleteUserTarget(null); }}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o usuário <strong>{deleteUserTarget?.displayName || deleteUserTarget?.email}</strong>? Esta ação excluirá a conta de acesso e não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteUser();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <><Loader2 className="size-4 mr-2 animate-spin" /> Excluindo...</> : 'Excluir definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Users;

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Mic,
  RefreshCw,
  ShieldCheck,
  Radio,
  CheckCircle2,
  AlertCircle,
  Link2,
  Trash2,
  Clock,
  Check,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import { firebaseAlexaService } from '../../../services/firebaseAlexaService';
import { firebaseUserService } from '../../../services/firebaseUserService';
import { AlexaIntegrationStatus, UserProfile } from '../../types';
import { formatCurrency } from '../../utils/currency';

interface AlexaSettingsSectionProps {
  isAdmin: boolean;
}

export function AlexaSettingsSection({ isAdmin }: AlexaSettingsSectionProps) {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [status, setStatus] = useState<AlexaIntegrationStatus | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Formulário de pareamento supervisionado
  const [pairingCode, setPairingCode] = useState('');
  const [selectedUid, setSelectedUid] = useState('');
  const [approvingPairing, setApprovingPairing] = useState(false);

  // Ações de alteração de estado
  const [togglingGlobal, setTogglingGlobal] = useState(false);
  const [revokingBindingId, setRevokingBindingId] = useState<string | null>(null);
  const [approvingDraftId, setApprovingDraftId] = useState<string | null>(null);
  const [cancelingDraftId, setCancelingDraftId] = useState<string | null>(null);

  const effectiveIsAdmin = Boolean(isAdmin || status?.isAdmin || userProfile?.role === 'admin');

  const loadData = useCallback(async () => {
    try {
      // 1. Carrega status da integração Alexa via Cloud Function segura (Admin SDK no backend)
      let statusRes: AlexaIntegrationStatus | null = null;
      try {
        statusRes = await firebaseAlexaService.getStatus();
        setStatus(statusRes);
      } catch (statusErr: any) {
        console.error('[AlexaSettings] Erro ao carregar status da Alexa:', statusErr);
        toast.error('Erro ao consultar integração Alexa: ' + (statusErr?.message || 'Falha de conexão.'));
      }

      const canListUsers = Boolean(isAdmin || statusRes?.isAdmin || userProfile?.role === 'admin');

      // 2. Se for admin, carrega a lista de usuários com tratamento de erro resiliente
      if (canListUsers) {
        try {
          const usersRes = await firebaseUserService.listUsers();
          const activeUsers = usersRes.filter((u: UserProfile) => u.active !== false);
          setUsers(activeUsers);
          if (activeUsers.length > 0) {
            setSelectedUid((prev) => {
              if (prev) return prev;
              const amanda = activeUsers.find((u: UserProfile) => u.displayName?.toLowerCase().includes('amanda'));
              return amanda ? amanda.uid : activeUsers[0].uid;
            });
          }
        } catch (usersErr: any) {
          console.warn('[AlexaSettings] Aviso ao consultar lista completa de usuários do Firestore:', usersErr?.message || usersErr);
          // Fallback gracioso: popula com o próprio usuário logado caso não consiga listar os demais
          if (user?.uid) {
            const selfUser: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email || 'Meu Usuário',
              role: (userProfile?.role as any) || 'admin',
              permissions: (userProfile?.permissions as any) || {},
              active: true,
              createdAt: new Date().toISOString(),
              createdBy: user.uid,
            };
            setUsers([selfUser]);
            setSelectedUid((prev) => prev || user.uid);
          }
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, user, userProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleGlobal = async (checked: boolean) => {
    setTogglingGlobal(true);
    try {
      await firebaseAlexaService.toggleGlobalIntegration(checked);
      toast.success(checked ? 'Integração Alexa ativada globalmente.' : 'Integração Alexa desativada globalmente.');
      await loadData();
    } catch (err: any) {
      toast.error('Erro ao alterar status global: ' + (err.message || 'Falha na operação.'));
    } finally {
      setTogglingGlobal(false);
    }
  };

  const handleApprovePairing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCode || pairingCode.trim().length !== 8) {
      toast.error('Informe o código de 8 dígitos falado pela Alexa.');
      return;
    }
    if (!selectedUid) {
      toast.error('Selecione o usuário do Luisices para associar.');
      return;
    }

    setApprovingPairing(true);
    try {
      const res = await firebaseAlexaService.approvePairing(pairingCode.trim(), selectedUid);
      toast.success(`Voz vinculada com sucesso para ${res.targetName || 'o usuário selecionado'}!`);
      setPairingCode('');
      await loadData();
    } catch (err: any) {
      toast.error('Falha ao vincular voz: ' + (err.message || 'Código incorreto ou expirado.'));
    } finally {
      setApprovingPairing(false);
    }
  };

  const handleRevokeBinding = async (bindingId: string) => {
    if (!confirm('Deseja realmente revogar este vínculo de voz? A pessoa não conseguirá criar pedidos pela Alexa até ser vinculada novamente.')) {
      return;
    }
    setRevokingBindingId(bindingId);
    try {
      await firebaseAlexaService.revokeBinding(bindingId);
      toast.success('Vínculo de voz revogado com sucesso.');
      await loadData();
    } catch (err: any) {
      toast.error('Erro ao revogar vínculo: ' + (err.message || 'Falha na operação.'));
    } finally {
      setRevokingBindingId(null);
    }
  };

  const handleApproveDraft = async (draftId: string, revision: number) => {
    setApprovingDraftId(draftId);
    try {
      const res = await firebaseAlexaService.approveDraft(draftId, revision);
      toast.success(`Pedido ${res.orderNumber} criado e confirmado com sucesso no seu quadro!`);
      await loadData();
    } catch (err: any) {
      toast.error('Erro ao aprovar pedido: ' + (err.message || 'Rascunho expirado ou inválido.'));
    } finally {
      setApprovingDraftId(null);
    }
  };

  const handleCancelDraft = async (draftId: string) => {
    if (!confirm('Deseja realmente descartar este pedido falado da lista?')) {
      return;
    }
    setCancelingDraftId(draftId);
    try {
      await firebaseAlexaService.cancelDraft(draftId);
      toast.success('Rascunho de pedido falado descartado com sucesso.');
      await loadData();
    } catch (err: any) {
      toast.error('Erro ao descartar rascunho: ' + (err.message || 'Falha na operação.'));
    } finally {
      setCancelingDraftId(null);
    }
  };

  if (loading) {
    return (
      <Card className="glass-panel border-border/40">
        <CardContent className="py-8 flex justify-center items-center text-muted-foreground gap-2">
          <RefreshCw className="size-4 animate-spin text-primary" />
          <span>Carregando status da integração Alexa...</span>
        </CardContent>
      </Card>
    );
  }

  const isDev = status?.environment === 'dev';

  return (
    <Card className="glass-panel border-border/40 overflow-hidden">
      <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500 dark:bg-sky-500/20">
                <Mic className="size-4" />
              </div>
              <CardTitle className="text-base font-semibold">Criação de Pedidos por Alexa</CardTitle>
              <Badge
                variant="outline"
                className={
                  isDev
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs'
                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs'
                }
              >
                {isDev ? 'Ambiente: Desenvolvimento (luisices-dev)' : 'Ambiente: Produção'}
              </Badge>
              <Badge
                variant="outline"
                className={
                  status?.isEnabled
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs'
                    : 'bg-rose-500/10 text-rose-600 border-rose-500/20 text-xs'
                }
              >
                {status?.isEnabled ? 'Integração Ativa' : 'Desativada'}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Reconhecimento de voz por personalização (personId), sem inteligência generativa e com confirmação obrigatória.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/ajuda?busca=alexa')}
              className="h-8 gap-1.5 text-xs text-violet-600 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/10"
            >
              <HelpCircle className="size-3.5" />
              Guia Completo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Controle Global para Administrador */}
        {effectiveIsAdmin && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/40 bg-muted/30">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-primary" />
                <span className="text-sm font-medium">Chave Geral de Ativação</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Permite desligar instantaneamente todas as requisições da Alexa sem afetar os pedidos já registrados.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                {status?.isEnabled ? 'Habilitado' : 'Desligado'}
              </span>
              <Switch
                checked={status?.isEnabled ?? false}
                onCheckedChange={handleToggleGlobal}
                disabled={togglingGlobal}
              />
            </div>
          </div>
        )}

        {/* Instruções de Invocação e Teste */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 dark:bg-sky-950/20 space-y-2">
            <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-medium text-xs">
              <Mic className="size-3.5" />
              <span>Como invocar no Echo / Alexa</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Diga com comando direto: <strong className="text-foreground font-semibold">“Alexa, pedir para {isDev ? 'ateliê de testes' : 'luisices'}...”</strong>.
              Isso garante resposta imediata e sem conflitos em alto-falantes Echo.
            </p>
            <div className="text-[11px] text-muted-foreground space-y-1 pt-1 border-t border-sky-500/10">
              <p>• “Alexa, pedir para {isDev ? 'ateliê de testes' : 'luisices'} gerar o código” (parear)</p>
              <p>• “Alexa, pedir para {isDev ? 'ateliê de testes' : 'luisices'} criar pedido de 20 cadernos para Amanda”</p>
              <p>• “Alexa, pedir para {isDev ? 'ateliê de testes' : 'luisices'} meus últimos pedidos”</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 dark:bg-purple-950/20 space-y-2">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium text-xs">
              <ShieldCheck className="size-3.5" />
              <span>Segurança e Identidade Real</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A Alexa utiliza biometria vocal (<code className="text-[10px] bg-muted px-1 py-0.5 rounded">personId</code>).
              Dispositivos ou vozes não autorizadas pelo administrador têm a criação de pedidos bloqueada.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Para vincular uma nova voz, diga <strong className="text-foreground">“pedir para {isDev ? 'ateliê de testes' : 'luisices'} gerar o código”</strong> e aprove no formulário abaixo.
            </p>
          </div>
        </div>

        {/* Pareamento Supervisionado (Apenas Admin) */}
        {effectiveIsAdmin ? (
          <div className="p-4 rounded-xl border border-border/40 bg-card space-y-4">
            <div className="flex items-center gap-2">
              <Link2 className="size-4 text-primary" />
              <h4 className="text-sm font-semibold">Pareamento Supervisionado (Vincular Voz ao Usuário)</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Após a pessoa solicitar o código no Echo (“vincular minha voz”), digite os 8 dígitos e selecione o usuário do Luisices correspondente. O código expira em 5 minutos.
            </p>

            <form onSubmit={handleApprovePairing} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4 space-y-1.5">
                <Label htmlFor="pairingCode" className="text-xs">Código Falado (8 dígitos)</Label>
                <Input
                  id="pairingCode"
                  placeholder="Ex: 48291035"
                  maxLength={8}
                  value={pairingCode}
                  onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, ''))}
                  className="font-mono text-center tracking-widest text-sm"
                  disabled={approvingPairing}
                />
              </div>

              <div className="sm:col-span-5 space-y-1.5">
                <Label htmlFor="targetUser" className="text-xs">Usuário no Luisices</Label>
                {users.length > 0 ? (
                  <Select value={selectedUid} onValueChange={setSelectedUid} disabled={approvingPairing}>
                    <SelectTrigger id="targetUser" className="text-xs h-9">
                      <SelectValue placeholder="Selecione o usuário..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.uid} value={u.uid} className="text-xs">
                          {u.displayName || u.email} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="targetUser"
                    placeholder="UID do usuário responsável"
                    value={selectedUid}
                    onChange={(e) => setSelectedUid(e.target.value)}
                    className="text-xs font-mono h-9"
                    disabled={approvingPairing}
                  />
                )}
              </div>

              <div className="sm:col-span-3">
                <Button
                  type="submit"
                  size="sm"
                  disabled={approvingPairing || pairingCode.length !== 8 || !selectedUid}
                  className="w-full h-9 text-xs gap-1.5"
                >
                  <CheckCircle2 className="size-3.5" />
                  {approvingPairing ? 'Vinculando...' : 'Aprovar Vinculação'}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-xs">
              <AlertCircle className="size-4 shrink-0" />
              <span>Aprovação de Pareamento Restrita a Administradores</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Você está conectado como <strong>{user?.email || 'usuário atual'}</strong> com função de acesso <strong>{userProfile?.role || 'padrão'}</strong>.
              Para aprovar códigos de vinculação de voz ou alterar configurações globais da Alexa, é necessário possuir a função <strong>admin</strong> (role: 'admin') no cadastro do sistema.
            </p>
          </div>
        )}

        {/* Solicitações Pendentes de Aprovação no App (Modo app_approval) */}
        {status?.pendingDrafts && status.pendingDrafts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Clock className="size-4 shrink-0" />
                <span>Pedidos Falados Aguardando Sua Aprovação ({status.pendingDrafts.length})</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {status.pendingDrafts.map((draft) => {
                const now = Date.now();
                const expTime = draft.expiresAt ? new Date(draft.expiresAt).getTime() : 0;
                const isExpired = expTime > 0 && expTime <= now;

                return (
                  <div
                    key={draft.id}
                    className="p-3.5 sm:p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 dark:bg-amber-950/20 space-y-3 flex flex-col justify-between transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-foreground truncate block min-w-0 flex-1">
                          {draft.customer}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-primary shrink-0">
                          {formatCurrency(draft.price)}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <strong className="text-foreground/90">{draft.quantity}x</strong> {draft.product}
                        {draft.pricingMode === 'unit' && typeof draft.unitPriceCents === 'number'
                          ? ` (${formatCurrency(draft.unitPriceCents / 100)} cada)`
                          : ''}
                        {' • '}Entrega: <span className="font-medium text-foreground/80">{draft.deliveryDate}</span>
                      </p>

                      {isExpired && (
                        <div className="pt-0.5">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-rose-500/10 text-rose-600 border-rose-500/20">
                            Expirado (&gt; 15 min)
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/40 flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelDraft(draft.id)}
                        disabled={cancelingDraftId === draft.id || approvingDraftId === draft.id}
                        className="h-8 text-xs gap-1.5 border-rose-500/25 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 dark:hover:bg-rose-950/30 shrink-0 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                        <span>{cancelingDraftId === draft.id ? 'Descartando...' : 'Descartar'}</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleApproveDraft(draft.id, draft.revision)}
                        disabled={approvingDraftId === draft.id || cancelingDraftId === draft.id}
                        className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shrink-0 transition-colors"
                      >
                        <Check className="size-3.5" />
                        <span>{approvingDraftId === draft.id ? 'Gravando...' : 'Aprovar e Criar Pedido'}</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vínculos Ativos */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
            <span>Vínculos de Voz Ativos ({status?.bindings?.length || 0})</span>
          </h4>

          {(!status?.bindings || status.bindings.length === 0) ? (
            <p className="text-xs text-muted-foreground italic p-3 rounded-lg border border-dashed border-border/60">
              Nenhuma voz vinculada no momento. Amanda ou outra pessoa autorizada pode dizer “vincular minha voz” no Echo para iniciar.
            </p>
          ) : (
            <div className="divide-y divide-border/40 border border-border/40 rounded-xl overflow-hidden bg-card">
              {status.bindings.map((b) => {
                const targetUser = users.find((u) => u.uid === b.uid);
                const userName =
                  targetUser?.displayName ||
                  targetUser?.email ||
                  (b.uid === user?.uid ? (user?.displayName || user?.email) : null) ||
                  b.uid;

                return (
                  <div key={b.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs" title={userName}>
                          {userName}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shrink-0">
                          Voz Ativa
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Ambiente: {b.environment} {b.approvedByEmail ? `• Aprovado por: ${b.approvedByEmail}` : ''}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeBinding(b.id)}
                      disabled={revokingBindingId === b.id}
                      className="border-rose-500/25 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 dark:hover:bg-rose-950/30 h-8 px-3 text-xs gap-1.5 shrink-0 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                      <span>{revokingBindingId === b.id ? 'Revogando...' : 'Revogar'}</span>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Auditoria Recente (Apenas Admin) */}
        {effectiveIsAdmin && status?.recentAudit && status.recentAudit.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Últimos Eventos de Auditoria Alexa
            </h4>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border/40 bg-muted/20 divide-y divide-border/20 text-[11px]">
              {status.recentAudit.map((a) => (
                <div key={a.id} className="p-2 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-medium text-foreground">{a.event}</span>
                    {a.reason && <p className="text-muted-foreground text-[10px]">{a.reason}</p>}
                  </div>
                  <div className="text-right text-muted-foreground shrink-0 text-[10px]">
                    {a.timestamp ? new Date(a.timestamp).toLocaleTimeString('pt-BR') : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

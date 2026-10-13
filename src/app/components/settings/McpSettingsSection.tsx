import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '../ui/dialog';
import {
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Key,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  Bot,
  ExternalLink,
  Lock,
  Layers,
  Activity,
  Wifi,
  WifiOff,
  LogOut,
  Radio,
  CheckCircle2,
  History,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { firebaseMcpService } from '../../../services/firebaseMcpService';
import {
  McpSettingsStatus,
  McpApiKey,
  McpScopeInfo,
  McpSession,
  CreateMcpKeyResult,
  McpAuditLog,
} from '../../types';

import { useAuth } from '../../../contexts/AuthContext';

interface McpSettingsSectionProps {
  isAdmin: boolean;
}

export function McpSettingsSection({ isAdmin }: McpSettingsSectionProps) {
  const { userProfile } = useAuth();
  // Se não for admin, o colaborador precisa ter a permissão mcpAccess diferente de false
  const hasMcpPermission = isAdmin || userProfile?.permissions?.mcpAccess !== false;

  const [status, setStatus] = useState<McpSettingsStatus | null>(null);
  const [loading, setLoading] = useState(hasMcpPermission);
  const [refreshing, setRefreshing] = useState(false);

  // Modal de Criação de Chave
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUid, setSelectedUid] = useState('');
  const [keyName, setKeyName] = useState('');
  const [rateLimit, setRateLimit] = useState('60');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [creatingKey, setCreatingKey] = useState(false);

  // Modal de Chave Gerada com Sucesso
  const [createdResult, setCreatedResult] = useState<CreateMcpKeyResult | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPluginUrl, setCopiedPluginUrl] = useState(false);

  // Ações inline
  const [togglingGlobal, setTogglingGlobal] = useState(false);
  const [togglingKeyId, setTogglingKeyId] = useState<string | null>(null);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  // Gestão de Sessões Ativas MCP / OAuth
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [sessionToRevoke, setSessionToRevoke] = useState<McpSession | null>(null);
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);

  // Auditoria e Histórico de Execuções de IA
  const [auditLogs, setAuditLogs] = useState<McpAuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditExpanded, setAuditExpanded] = useState(false);

  const fetchAuditLogs = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingAudit(true);
    try {
      const res = await firebaseMcpService.getAuditLogs(25);
      if (res.success) {
        setAuditLogs(res.logs || []);
      }
    } catch {
      toast.error('Erro ao consultar histórico de auditoria do MCP.');
    } finally {
      setLoadingAudit(false);
    }
  }, [isAdmin]);

  const fetchStatus = useCallback(async (isSilent = false) => {
    if (!hasMcpPermission) {
      setLoading(false);
      return;
    }
    if (!isSilent) setLoading(true);
    try {
      const data = await firebaseMcpService.getStatus();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasMcpPermission]);

  useEffect(() => {
    if (hasMcpPermission) {
      fetchStatus();
    } else {
      setLoading(false);
    }
  }, [hasMcpPermission, fetchStatus]);

  // Se o usuário não tiver permissão, o menu/seção simplesmente SUMA da tela!
  if (!hasMcpPermission) {
    return null;
  }

  // Abre modal de criação e prepara escopos padrão
  const handleOpenCreateModal = () => {
    if (!status) return;
    // Seleciona o primeiro membro disponível
    const firstEligible = status.teamMembers.find((m) => m.mcpAccess) || status.teamMembers[0];
    const initialUid = firstEligible ? firstEligible.uid : '';
    setSelectedUid(initialUid);
    setKeyName('');
    setRateLimit('60');

    // Escopos padrão que não exigem admin (se não for admin)
    const targetMember = status.teamMembers.find((m) => m.uid === initialUid);
    const isTargetAdmin = targetMember?.role === 'admin';

    const defaults = status.availableScopes
      .filter((s) => s.defaultGranted && (isTargetAdmin || !s.requiresAdmin))
      .map((s) => s.id);

    setSelectedScopes(defaults);
    setModalOpen(true);
  };

  // Quando troca de usuário no dropdown do modal, ajusta os escopos permitidos
  const handleUserChange = (uid: string) => {
    setSelectedUid(uid);
    if (!status) return;
    const target = status.teamMembers.find((m) => m.uid === uid);
    const isTargetAdmin = target?.role === 'admin';

    // Remove escopos de admin se o usuário selecionado não for admin
    if (!isTargetAdmin) {
      setSelectedScopes((prev) =>
        prev.filter((scopeId) => {
          const scopeDef = status.availableScopes.find((s) => s.id === scopeId);
          return !scopeDef?.requiresAdmin;
        })
      );
    }
  };

  const handleToggleScope = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((id) => id !== scopeId) : [...prev, scopeId]
    );
  };

  const handleCreateKey = async () => {
    if (!selectedUid || !keyName.trim()) {
      toast.error('Preencha o colaborador e o nome descritivo da chave.');
      return;
    }
    if (selectedScopes.length === 0) {
      toast.error('Selecione pelo menos um escopo de permissão para a chave.');
      return;
    }

    setCreatingKey(true);
    try {
      const res = await firebaseMcpService.createApiKey({
        userId: selectedUid,
        keyName: keyName.trim(),
        scopes: selectedScopes,
        rateLimitPerHour: Number(rateLimit) || 60,
      });

      setModalOpen(false);
      setCreatedResult(res);
      toast.success('Chave de acesso gerada com sucesso!');
      await fetchStatus(true);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar chave de acesso');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleToggleGlobal = async (nextState: boolean) => {
    setTogglingGlobal(true);
    try {
      await firebaseMcpService.toggleGlobal(nextState);
      setStatus((prev) => (prev ? { ...prev, globalEnabled: nextState } : null));
      toast.success(
        nextState
          ? 'Integração ChatGPT & MCP ativada com sucesso.'
          : 'Integração ChatGPT & MCP temporariamente desativada.'
      );
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao alterar interruptor global');
    } finally {
      setTogglingGlobal(false);
    }
  };

  const handleToggleKey = async (key: McpApiKey) => {
    setTogglingKeyId(key.keyId);
    const nextState = !key.enabled;
    try {
      await firebaseMcpService.toggleApiKey(key.keyId, nextState);
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              keys: prev.keys.map((k) => (k.keyId === key.keyId ? { ...k, enabled: nextState } : k)),
            }
          : null
      );
      toast.success(
        nextState ? `Chave "${key.keyName}" ativada.` : `Chave "${key.keyName}" desativada.`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alterar chave');
    } finally {
      setTogglingKeyId(null);
    }
  };

  const handleRevokeKey = async (key: McpApiKey) => {
    if (!confirm(`Deseja realmente revogar e excluir a chave "${key.keyName}"? Essa ação não pode ser desfeita.`)) {
      return;
    }

    setRevokingKeyId(key.keyId);
    try {
      await firebaseMcpService.revokeApiKey(key.keyId);
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              keys: prev.keys.filter((k) => k.keyId !== key.keyId),
            }
          : null
      );
      toast.success(`Chave "${key.keyName}" revogada.`);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao revogar chave');
    } finally {
      setRevokingKeyId(null);
    }
  };

  const handleRevokeSession = async (session: McpSession) => {
    setRevokingSessionId(session.sessionId);
    try {
      await firebaseMcpService.revokeSession(session.sessionId);
      setStatus((prev) => {
        if (!prev) return prev;
        const updatedSessions = (prev.sessions || []).filter(
          (s) => s.sessionId !== session.sessionId
        );
        const updatedMySession =
          prev.myActiveSession?.sessionId === session.sessionId
            ? null
            : prev.myActiveSession;
        const updatedMembers = prev.teamMembers.map((m) =>
          m.uid === session.userId ? { ...m, mcpSessionActive: false } : m
        );
        return {
          ...prev,
          sessions: updatedSessions,
          myActiveSession: updatedMySession,
          hasActiveMcpSession: Boolean(updatedMySession),
          teamMembers: updatedMembers,
        };
      });
      toast.success(
        session.userId === userProfile?.uid
          ? 'Sua conexão MCP com o ChatGPT foi revogada com sucesso.'
          : `Sessão MCP de ${session.userName} revogada com sucesso.`
      );
      setConfirmRevokeOpen(false);
      setSessionToRevoke(null);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao revogar sessão MCP');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleCopyText = (text: string, type: 'key' | 'url' | 'plugin') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      toast.success('Chave copiada para a área de transferência!');
    } else if (type === 'plugin') {
      setCopiedPluginUrl(true);
      setTimeout(() => setCopiedPluginUrl(false), 2000);
      toast.success('URL do Manifesto do Plugin copiada!');
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      toast.success('URL do OpenAPI copiada!');
    }
  };

  // Agrupa os escopos disponíveis por módulo
  const groupedScopes = (status?.availableScopes || []).reduce<Record<string, McpScopeInfo[]>>(
    (acc, scope) => {
      acc[scope.module] = acc[scope.module] || [];
      acc[scope.module].push(scope);
      return acc;
    },
    {}
  );

  const selectedMember = status?.teamMembers.find((m) => m.uid === selectedUid);
  const isSelectedAdmin = selectedMember?.role === 'admin';

  if (!loading && !status) {
    return (
      <Card className="luisices-glass border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Lock className="size-5" />
            Integrações & Assistentes MCP / ChatGPT
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? 'Não foi possível carregar as configurações do MCP neste momento.'
              : 'O seu usuário não possui permissão de acesso ativada para as integrações de IA.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {isAdmin
              ? 'Se o problema persistir, certifique-se de que a sincronização com as Cloud Functions foi concluída.'
              : 'Para utilizar o ChatGPT e assistentes de IA com a sua conta do ateliê, solicite a um Administrador a liberação de acesso na aba Usuários & Equipe.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchStatus()}
            disabled={refreshing}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── CARD PRINCIPAL: STATUS & GESTÃO GERAL ─────────────────────────── */}
      <Card className="luisices-glass border-primary/20 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bot className="size-5 text-primary" />
                <CardTitle className="text-lg font-semibold tracking-tight">
                  {isAdmin ? 'Assistentes Externos & ChatGPT (MCP)' : 'Minhas Chaves do ChatGPT & Assistentes (MCP)'}
                </CardTitle>
                <Badge
                  variant={status?.environment === 'dev' ? 'outline' : 'default'}
                  className={
                    status?.environment === 'dev'
                      ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                  }
                >
                  Ambiente: {status?.environment?.toUpperCase() || 'DEV'}
                </Badge>
              </div>
              <CardDescription>
                {isAdmin
                  ? 'Conecte o ChatGPT (Custom GPT Actions) via autenticação segura OAuth 2.1 por colaborador, ou crie chaves estáticas de API para webhooks e integrações de backend.'
                  : 'O ChatGPT utiliza o seu e-mail e senha do Luisices via OAuth 2.1. Crie e gerencie chaves estáticas para integrações diretas de backend e webhooks.'}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRefreshing(true);
                  fetchStatus(true);
                }}
                disabled={loading || refreshing}
                className="gap-1.5"
              >
                <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>

              <Button size="sm" onClick={handleOpenCreateModal} className="gap-1.5 shadow-sm">
                <Key className="size-4" />
                Criar Chave Direct API
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Interruptor Geral & URLs de Integração (OpenAPI e Plugin) */}
          <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
            {/* Box 1: Interruptor Global (Apenas Admin) */}
            {isAdmin && (
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-card/40 backdrop-blur-xs">
                <div className="space-y-0.5 pr-4">
                  <p className="text-sm font-medium">Interruptor Geral da Integração</p>
                  <p className="text-xs text-muted-foreground">
                    Habilita ou interrompe imediatamente todo o tráfego externo de IA neste ambiente.
                  </p>
                </div>
                <Switch
                  checked={status?.globalEnabled ?? true}
                  onCheckedChange={handleToggleGlobal}
                  disabled={togglingGlobal || loading}
                />
              </div>
            )}

            {/* Box 2: URL do Schema OpenAPI para o ChatGPT Actions */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-card/40 backdrop-blur-xs">
              <div className="space-y-0.5 min-w-0 pr-3">
                <p className="text-sm font-medium">Schema OpenAPI (GPT Actions)</p>
                <p className="text-xs text-muted-foreground font-mono truncate" title={status?.openapiUrl}>
                  {status?.openapiUrl || 'Carregando URL...'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => status?.openapiUrl && handleCopyText(status.openapiUrl, 'url')}
                disabled={!status?.openapiUrl}
                className="shrink-0 gap-1.5"
              >
                {copiedUrl ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                <span>{copiedUrl ? 'Copiado' : 'Copiar'}</span>
              </Button>
            </div>

            {/* Box 3: Manifesto do Plugin ChatGPT (ai-plugin.json) */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-card/40 backdrop-blur-xs">
              <div className="space-y-0.5 min-w-0 pr-3">
                <p className="text-sm font-medium">Manifesto (ChatGPT Plugins)</p>
                <p
                  className="text-xs text-muted-foreground font-mono truncate"
                  title={status?.pluginManifestUrl || (status?.endpointBaseUrl ? `${status.endpointBaseUrl}/.well-known/ai-plugin.json` : '')}
                >
                  {status?.pluginManifestUrl || (status?.endpointBaseUrl ? `${status.endpointBaseUrl}/.well-known/ai-plugin.json` : 'Carregando URL...')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const pUrl = status?.pluginManifestUrl || (status?.endpointBaseUrl ? `${status.endpointBaseUrl}/.well-known/ai-plugin.json` : '');
                  if (pUrl) handleCopyText(pUrl, 'plugin');
                }}
                disabled={!status?.endpointBaseUrl}
                className="shrink-0 gap-1.5"
              >
                {copiedPluginUrl ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                <span>{copiedPluginUrl ? 'Copiado' : 'Copiar'}</span>
              </Button>
            </div>
          </div>

          {/* ─── SESSÕES ATIVAS VIA MCP / CHATGPT (OAUTH 2.1) ───────────────── */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-emerald-500 animate-pulse" />
                <h4 className="text-sm font-semibold">Sessões MCP & ChatGPT Ativas (OAuth 2.1)</h4>
                {status?.sessions && status.sessions.length > 0 && (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-xs font-mono">
                    {status.sessions.length} {status.sessions.length === 1 ? 'sessão aberta' : 'sessões abertas'}
                  </Badge>
                )}
              </div>
            </div>

            {/* 1. Card de Status da Sessão do Usuário Conectado */}
            {status?.myActiveSession ? (
              <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 backdrop-blur-xs flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="relative p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Wifi className="size-5" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">Sua Conta Conectada ao ChatGPT</span>
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium py-0.5 px-2">
                        🟢 Sessão MCP Aberta
                      </Badge>
                      <Badge variant="outline" className="text-[10px] py-0 font-mono">
                        {status.myActiveSession.clientId}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Você está autenticado via OAuth 2.1 no <strong>{status.myActiveSession.clientName}</strong>. O assistente de IA possui permissão para consultar dados e executar ações vinculadas ao seu colaborador.
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 flex-wrap">
                      <span>Conectado em: {status.myActiveSession.createdAt ? new Date(status.myActiveSession.createdAt).toLocaleString('pt-BR') : 'Recentemente'}</span>
                      <span>•</span>
                      <span>Última chamada: {status.myActiveSession.lastUsedAt ? new Date(status.myActiveSession.lastUsedAt).toLocaleString('pt-BR') : 'Aguardando primeira chamada'}</span>
                      <span>•</span>
                      <span>Total de chamadas: {status.myActiveSession.totalCalls || 0}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setSessionToRevoke(status.myActiveSession || null);
                    setConfirmRevokeOpen(true);
                  }}
                  disabled={revokingSessionId === status.myActiveSession.sessionId}
                  className="shrink-0 gap-1.5 self-start md:self-center shadow-xs"
                >
                  <LogOut className="size-4" />
                  Encerrar / Revogar Minha Conexão
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-border/70 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-muted text-muted-foreground shrink-0">
                    <WifiOff className="size-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">Sua Conta: Nenhuma Sessão MCP Aberta</span>
                      <Badge variant="secondary" className="text-[10px] py-0 text-muted-foreground">
                        Desconectado
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Conecte seu assistente no ChatGPT usando seu e-mail e senha. Assim que a autorização for concluída, o status ativo e os detalhes da sessão serão exibidos aqui.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Visualização Completa de Todas as Sessões da Equipe (Apenas Administrador) */}
            {isAdmin && status?.sessions && status.sessions.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Todas as Sessões MCP Abertas no Ateliê ({status.sessions.length})
                </p>
                <div className="grid grid-cols-1 gap-2.5">
                  {status.sessions.map((sess) => {
                    const isMySession = sess.userId === userProfile?.uid;
                    const isRevoking = revokingSessionId === sess.sessionId;
                    return (
                      <div
                        key={sess.sessionId}
                        className="p-3.5 rounded-xl border border-border/80 bg-card/60 backdrop-blur-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs text-foreground">{sess.userName}</span>
                            <span className="text-xs text-muted-foreground">({sess.userEmail})</span>
                            <Badge
                              variant={sess.userRole === 'admin' ? 'default' : 'secondary'}
                              className="text-[9px] py-0"
                            >
                              {sess.userRole === 'admin' ? 'Admin' : 'Colaborador'}
                            </Badge>
                            {isMySession && (
                              <Badge variant="outline" className="text-[9px] py-0 border-primary/40 text-primary">
                                Você
                              </Badge>
                            )}
                            <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] py-0">
                              🟢 Aberta via {sess.clientName}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5 flex-wrap">
                            <span>Conectado em: {sess.createdAt ? new Date(sess.createdAt).toLocaleString('pt-BR') : 'Sem data'}</span>
                            <span>•</span>
                            <span>Último uso: {sess.lastUsedAt ? new Date(sess.lastUsedAt).toLocaleString('pt-BR') : 'Sem chamadas'}</span>
                            <span>•</span>
                            <span>Chamadas: {sess.totalCalls || 0}</span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSessionToRevoke(sess);
                            setConfirmRevokeOpen(true);
                          }}
                          disabled={isRevoking}
                          className="shrink-0 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                        >
                          {isRevoking ? <RefreshCw className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
                          Revogar Conexão
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ─── TABELA DE CHAVES DE ACESSO LEGADAS ─────────────────────────── */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="size-4 text-primary" />
                <h4 className="text-sm font-semibold">Chaves Direct API (N8N, Make, Webhooks)</h4>
                <Badge variant="secondary" className="text-xs font-mono">
                  {status?.keys.length || 0}
                </Badge>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                Carregando chaves cadastradas...
              </div>
            ) : !status?.keys || status.keys.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-border/80 bg-muted/10 space-y-2">
                <Key className="size-8 text-muted-foreground/60 mx-auto" />
                <p className="text-sm font-medium text-foreground">Nenhuma chave Direct API criada</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Para o ChatGPT, a conexão é feita via login seguro OAuth. Crie uma chave estática apenas para webhooks ou integrações de backend.
                </p>
                <Button size="sm" onClick={handleOpenCreateModal} variant="outline" className="mt-2 gap-1.5">
                  <Key className="size-3.5" />
                  Gerar Chave Direct API
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {status.keys.map((key) => {
                  const isToggling = togglingKeyId === key.keyId;
                  const isRevoking = revokingKeyId === key.keyId;

                  return (
                    <div
                      key={key.keyId}
                      className={`p-4 rounded-xl border transition-all ${
                        key.enabled
                          ? 'border-border/80 bg-card/60'
                          : 'border-border/40 bg-muted/20 opacity-70'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Identificação */}
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">{key.keyName}</span>
                            <Badge variant="outline" className="font-mono text-[11px] py-0">
                              {key.keyPrefix}
                            </Badge>
                            <Badge
                              variant={key.userRole === 'admin' ? 'default' : 'secondary'}
                              className="text-[10px] py-0"
                            >
                              {key.userName} ({key.userRole})
                            </Badge>
                            <Badge
                              variant={key.enabled ? 'outline' : 'secondary'}
                              className={`text-[10px] py-0 ${
                                key.enabled
                                  ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {key.enabled ? 'Ativa' : 'Desativada'}
                            </Badge>
                          </div>

                          {/* Escopos */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-xs text-muted-foreground">Escopos:</span>
                            {key.scopes.map((scopeId) => {
                              const scopeDef = status.availableScopes.find((s) => s.id === scopeId);
                              return (
                                <Badge
                                  key={scopeId}
                                  variant="secondary"
                                  className="text-[10px] font-normal py-0 bg-muted/80 text-muted-foreground"
                                  title={scopeDef?.description}
                                >
                                  {scopeDef?.label || scopeId}
                                </Badge>
                              );
                            })}
                          </div>

                          {/* Métricas */}
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                            <span>Limite: {key.rateLimitPerHour} req/h</span>
                            <span>•</span>
                            <span>Total de chamadas: {key.totalCalls}</span>
                            <span>•</span>
                            <span>
                              Último uso:{' '}
                              {key.lastUsedAt
                                ? new Date(key.lastUsedAt).toLocaleString('pt-BR')
                                : 'Nunca utilizada'}
                            </span>
                          </div>
                        </div>

                        {/* Ações: Interruptor Liga/Desliga e Lixeira */}
                        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 pt-2 sm:pt-0">
                          <div className="flex items-center gap-2 pr-2 border-r border-border/60">
                            <span className="text-xs text-muted-foreground">
                              {key.enabled ? 'Ligada' : 'Desligada'}
                            </span>
                            <Switch
                              checked={key.enabled}
                              onCheckedChange={() => handleToggleKey(key)}
                              disabled={isToggling}
                            />
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRevokeKey(key)}
                            disabled={isRevoking}
                            className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Revogar chave permanentemente"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="space-y-2 pt-4 border-t border-border/60">
              <h4 className="text-sm font-semibold">Acesso dos usuários ao ChatGPT</h4>
              <p className="text-xs text-muted-foreground">Configure o acesso e as funcionalidades no perfil de cada usuário.</p>
              <Button asChild variant="outline" size="sm"><Link to="/usuarios">Gerenciar usuários</Link></Button>
            </div>
          )}

          {isAdmin && (
            <div className="space-y-3 pt-4 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="size-4 text-primary" />
                  <h4 className="text-sm font-semibold">Auditoria & Chamadas de IA (ChatGPT / MCP)</h4>
                </div>
                <div className="flex items-center gap-2">
                  {auditExpanded && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchAuditLogs}
                      disabled={loadingAudit}
                      className="h-7 text-xs gap-1"
                    >
                      <RefreshCw className={`size-3 ${loadingAudit ? 'animate-spin' : ''}`} />
                      <span>Atualizar</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = !auditExpanded;
                      setAuditExpanded(next);
                      if (next && auditLogs.length === 0) fetchAuditLogs();
                    }}
                    className="h-7 text-xs"
                  >
                    {auditExpanded ? 'Ocultar Histórico' : 'Ver Histórico'}
                  </Button>
                </div>
              </div>

              {auditExpanded && (
                <div className="space-y-2">
                  {loadingAudit && auditLogs.length === 0 ? (
                    <div className="flex items-center justify-center p-8 text-xs text-muted-foreground gap-2">
                      <RefreshCw className="size-4 animate-spin text-primary" />
                      <span>Carregando histórico de auditoria...</span>
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="p-4 rounded-lg border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                      Nenhuma execução de ferramenta registrada ainda.
                    </div>
                  ) : (
                    <div className="border border-border/70 rounded-xl overflow-hidden bg-card/30 divide-y divide-border/50 text-xs">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/10 transition-colors">
                          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                            {log.success ? (
                              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5 sm:mt-0" />
                            ) : (
                              <XCircle className="size-4 text-destructive shrink-0 mt-0.5 sm:mt-0" />
                            )}
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-medium text-foreground">{log.toolName}</span>
                                <Badge variant="outline" className="text-[10px] py-0 font-mono">
                                  {log.clientProtocol}
                                </Badge>
                                {log.orderNumber && (
                                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] py-0">
                                    Pedido {log.orderNumber}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                {log.callerName || 'Assistente'} • {log.executionTimeMs}ms • {new Date(log.timestamp).toLocaleString('pt-BR')}
                              </p>
                              {log.errorMessage && (
                                <p className="text-[11px] text-destructive truncate max-w-md">{log.errorMessage}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── GUIA RÁPIDO: COMO CONECTAR O PLUGIN NO CHATGPT ──────────────── */}
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
                Passo a Passo: Como Conectar o Plugin no ChatGPT via OAuth 2.1
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
              <div className="p-3 rounded-lg bg-card/60 border border-border/60 space-y-1">
                <span className="font-semibold text-foreground">1. Conectar Plugin no ChatGPT</span>
                <p>
                  No ChatGPT, adicione o assistente MCP digitando apenas o domínio base do ambiente: <code className="font-mono text-[11px] text-primary">{status?.environment === 'prod' ? 'https://api.luisices.com.br' : 'https://api.dev.luisices.com.br'}</code>.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-card/60 border border-border/60 space-y-1">
                <span className="font-semibold text-foreground">2. Descoberta & Registro Dinâmico</span>
                <p>
                  O ChatGPT lê os metadados em <code className="font-mono text-[10px]">/.well-known/oauth-authorization-server</code> e faz o registro dinâmico do cliente automaticamente.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-card/60 border border-border/60 space-y-1">
                <span className="font-semibold text-foreground">3. Login do Colaborador (OAuth 2.1)</span>
                <p>
                  O ChatGPT redireciona para a tela do Luisices Ateliê. Digite seu <strong>e-mail e senha do sistema</strong>. As permissões serão vinculadas estritamente ao seu usuário.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── MODAL: CRIAR NOVA CHAVE DE ACESSO ──────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="lg" className="flex flex-col max-h-[90dvh] overflow-hidden bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="size-5 text-primary" />
              Criar Nova Chave de Acesso
            </DialogTitle>
            <DialogDescription>
              Defina o nome da chave e selecione de forma granular quais ferramentas o assistente poderá executar.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4 py-3 custom-scrollbar">
            {/* 1. Seleção do Usuário */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Colaborador Titular
              </Label>
              {isAdmin ? (
                <Select value={selectedUid} onValueChange={handleUserChange}>
                  <SelectTrigger className="w-full luisices-glass-input">
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {status?.teamMembers.map((member) => (
                      <SelectItem key={member.uid} value={member.uid}>
                        {member.displayName} ({member.role === 'admin' ? 'Administrador' : 'Colaborador'})
                        {!member.mcpAccess ? ' - [Acesso MCP Bloqueado]' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2.5 rounded-lg border border-border/70 bg-muted/20 text-xs font-medium flex items-center justify-between">
                  <span>{status?.teamMembers[0]?.displayName || 'Minha Conta'}</span>
                  <Badge variant="secondary" className="text-[10px]">Chave Pessoal</Badge>
                </div>
              )}
            </div>

            {/* 2. Nome da Chave */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome de Identificação da Chave
              </Label>
              <Input
                className="luisices-glass-input"
                placeholder="Ex: Meu ChatGPT Pessoal, Cursor IDE, etc."
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>

            {/* 3. Limite de Requisições por Hora */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Limite de Chamadas (Proteção de Custos)
              </Label>
              <Select value={rateLimit} onValueChange={setRateLimit}>
                <SelectTrigger className="w-full luisices-glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 requisições / hora (Econômico)</SelectItem>
                  <SelectItem value="60">60 requisições / hora (Recomendado)</SelectItem>
                  <SelectItem value="120">120 requisições / hora (Intensivo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. Escopos Granulares */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Permissões Granulares (Escopos)
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  {selectedScopes.length} de {status?.availableScopes.length} selecionados
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-3 p-3 rounded-xl border border-border/70 bg-muted/15 custom-scrollbar">
                {Object.entries(groupedScopes).map(([moduleName, scopes]) => (
                  <div key={moduleName} className="space-y-2">
                    <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      {moduleName}
                    </span>
                    <div className="space-y-2">
                      {scopes.map((scope) => {
                        const isLocked = scope.requiresAdmin && !isSelectedAdmin;
                        const isChecked = selectedScopes.includes(scope.id);

                        return (
                          <div
                            key={scope.id}
                            className={`flex items-start gap-2.5 p-2 rounded-lg transition-colors ${
                              isLocked
                                ? 'opacity-40 cursor-not-allowed bg-muted/20'
                                : 'hover:bg-muted/40 cursor-pointer'
                            }`}
                            onClick={() => !isLocked && handleToggleScope(scope.id)}
                          >
                            <Checkbox
                              checked={isChecked}
                              disabled={isLocked}
                              onCheckedChange={() => !isLocked && handleToggleScope(scope.id)}
                              className="mt-0.5"
                            />
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-foreground">{scope.label}</span>
                                {scope.requiresAdmin && (
                                  <Badge variant="outline" className="text-[9px] py-0 text-amber-500 border-amber-500/40">
                                    <Lock className="size-2.5 mr-0.5" />
                                    Admin
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-tight">
                                {scope.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateKey} disabled={creatingKey} className="gap-1.5">
              {creatingKey ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Key className="size-3.5" />
                  Gerar Chave de Acesso
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: CHAVE GERADA COM SUCESSO ────────────────────────────────── */}
      <Dialog open={Boolean(createdResult)} onOpenChange={() => setCreatedResult(null)}>
        <DialogContent size="md" className="flex flex-col bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-5" />
              Chave Gerada com Sucesso!
            </DialogTitle>
            <DialogDescription>
              Copie sua chave de acesso agora. Por motivos de segurança, ela <strong>não será exibida novamente</strong>.
            </DialogDescription>
          </DialogHeader>

          {createdResult && (
            <DialogBody className="space-y-4 py-2">
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {createdResult.keyName} ({createdResult.userName})
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    Ativa
                  </Badge>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-background/80 border border-border/80 font-mono text-xs break-all">
                  <span className="flex-1 select-all">{createdResult.rawKey}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopyText(createdResult.rawKey, 'key')}
                    className="shrink-0 size-8 p-0"
                  >
                    {copiedKey ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <p>
                  No ChatGPT Custom GPT, selecione Autenticação: <strong>API Key</strong>, Tipo: <strong>Bearer</strong> e cole essa chave exatamente como exibida acima.
                </p>
              </div>
            </DialogBody>
          )}

          <DialogFooter>
            <Button
              className="w-full gap-1.5"
              onClick={() => {
                if (createdResult) handleCopyText(createdResult.rawKey, 'key');
                setCreatedResult(null);
              }}
            >
              <Copy className="size-4" />
              Copiar Chave e Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL DE CONFIRMAÇÃO DE REVOGAÇÃO DE SESSÃO MCP ────────────────── */}
      <Dialog open={confirmRevokeOpen} onOpenChange={setConfirmRevokeOpen}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Revogar Conexão MCP / ChatGPT
            </DialogTitle>
            <DialogDescription>
              {sessionToRevoke?.userId === userProfile?.uid
                ? 'Deseja encerrar e revogar sua conexão com o assistente do ChatGPT?'
                : `Deseja revogar a conexão MCP do colaborador ${sessionToRevoke?.userName || 'selecionado'}?`}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-3 py-2 text-xs text-muted-foreground">
            <p>
              Ao revogar a conexão, o assistente de IA perderá o acesso imediatamente. Todos os tokens OAuth 2.1 vinculados a esta sessão serão invalidados.
            </p>
            <p className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive font-medium">
              Aviso: Para voltar a usar o ChatGPT, será necessário realizar um novo login com e-mail e senha na tela de autorização do Luisices.
            </p>
          </DialogBody>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmRevokeOpen(false);
                setSessionToRevoke(null);
              }}
              disabled={Boolean(revokingSessionId)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => sessionToRevoke && handleRevokeSession(sessionToRevoke)}
              disabled={Boolean(revokingSessionId)}
              className="gap-1.5"
            >
              {revokingSessionId ? <RefreshCw className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
              Confirmar Revogação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}

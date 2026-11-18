import { useEffect, useMemo, useState } from 'react';
import { Activity, Cloud, Globe, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { useAuth } from '../../../contexts/AuthContext';
import { isVercelBetaHost } from '../../utils/betaHost';
import {
  type BackendFallbackEvent,
  type BackendErrorSummary,
  type BackendProvider,
  type BackendRouteKey,
  type BackendRoutingConfig,
  type RouteOverride,
  clearBackendFallbackTelemetry,
  getBackendFallbackTelemetry,
  getBackendRoutingConfig,
  resolveEffectiveProvider,
  saveBackendRoutingConfig,
  subscribeBackendFallbackTelemetry,
  subscribeBackendRouting,
} from '../../../services/backendRoutingService';

interface BackendRoutingSettingsSectionProps {
  isAdmin: boolean;
}

function describeFallbackError(summary?: BackendErrorSummary): string | undefined {
  if (!summary) return undefined;
  return [
    summary.status ? `HTTP ${summary.status}` : undefined,
    summary.code,
    summary.name,
  ].filter(Boolean).join(' · ');
}

const ROUTE_DEFINITIONS: Array<{
  key: BackendRouteKey;
  label: string;
  description: string;
  vercelPath: string;
  gcpFunction: string;
}> = [
  {
    key: 'publicCatalogProducts',
    label: 'Catálogo da Lojinha',
    description: 'Listagem pública dos produtos em /loja e /catalogo',
    vercelPath: '/api/public-catalog-products',
    gcpFunction: 'getPublicCatalogProducts',
  },
  {
    key: 'publicCatalogOrder',
    label: 'Checkout da Lojinha',
    description: 'Envio e validação de pedidos na vitrine pública',
    vercelPath: '/api/public-catalog-order',
    gcpFunction: 'submitPublicCatalogOrder',
  },
  {
    key: 'publicOrderTracking',
    label: 'Rastreamento Público',
    description: 'Consulta do cliente em /acompanhar/:token',
    vercelPath: '/api/public-order-tracking',
    gcpFunction: 'getPublicOrderTracking',
  },
  {
    key: 'orderTrackingAdmin',
    label: 'Pedidos, Rastreamento & SuperFrete',
    description: 'Criação/edição de pedidos, links de acompanhamento e SuperFrete',
    vercelPath: '/api/order-tracking',
    gcpFunction: 'createOrder / updateComplexOrder / *OrderTrackingLink* / *Superfrete*',
  },
  {
    key: 'galleryMedia',
    label: 'Galeria Privada',
    description: 'Entrega autenticada de imagens da galeria',
    vercelPath: '/api/gallery-media',
    gcpFunction: 'galleryMedia',
  },
  {
    key: 'aiChat',
    label: 'Copiloto de IA',
    description: 'Chat inteligente (Vertex AI gru1 / Gemini)',
    vercelPath: '/api/ai-chat',
    gcpFunction: 'aiAgentChat',
  },
  {
    key: 'alexa',
    label: 'Integração Alexa',
    description: 'Status, pareamento, permissões, vínculos e rascunhos',
    vercelPath: '/api/alexa',
    gcpFunction: 'getAlexaIntegrationStatus / approveAlexa* / setAlexa* / revoke* / toggle*',
  },
  {
    key: 'mcpAdmin',
    label: 'Administração MCP / ChatGPT',
    description: 'Status, chaves API, escopos, sessões, auditoria e schema OpenAPI',
    vercelPath: '/api/mcp-admin',
    gcpFunction: 'getMcpSettingsStatus / createMcpApiKey / revokeMcpSession / getMcpOpenApiSchema',
  },
  {
    key: 'communicationsAdmin',
    label: 'WhatsApp & E-mail (Painel)',
    description: 'Envio, sincronização, status WhatsApp e envio/cota de E-mail',
    vercelPath: '/api/communications-admin',
    gcpFunction: '*WhatsApp* / sendCustomEmail / getEmailUsage',
  },
  {
    key: 'usersAdmin',
    label: 'Usuários, Convites & Sessões',
    description: 'Gestão de equipe, convites, verificação de e-mail, claims e sessões',
    vercelPath: '/api/users-admin',
    gcpFunction: 'createUser / updateUser / deleteUser / *Invitation* / *Session* / repairUserClaims',
  },
];

export function BackendRoutingSettingsSection({ isAdmin }: BackendRoutingSettingsSectionProps) {
  const { user } = useAuth();
  const [config, setConfig] = useState<BackendRoutingConfig>(() => getBackendRoutingConfig());
  const [fallbackEvents, setFallbackEvents] = useState<BackendFallbackEvent[]>(() => getBackendFallbackTelemetry());
  const [saving, setSaving] = useState(false);
  const onBetaHost = isVercelBetaHost();

  useEffect(() => {
    return subscribeBackendRouting((next) => setConfig(next));
  }, []);

  useEffect(() => {
    return subscribeBackendFallbackTelemetry((events) => setFallbackEvents(events));
  }, []);

  const chartData = useMemo(() => {
    const counts = new Map<BackendRouteKey, { recovered: number; failed: number }>();
    for (const def of ROUTE_DEFINITIONS) {
      counts.set(def.key, { recovered: 0, failed: 0 });
    }
    for (const ev of fallbackEvents) {
      const entry = counts.get(ev.routeKey) || { recovered: 0, failed: 0 };
      if (ev.recoveredViaGcp) entry.recovered += 1;
      else entry.failed += 1;
      counts.set(ev.routeKey, entry);
    }
    return ROUTE_DEFINITIONS.map((def) => {
      const c = counts.get(def.key) || { recovered: 0, failed: 0 };
      return {
        route: def.label.replace(' da Lojinha', '').replace(' de Acompanhamento', ''),
        Recuperados: c.recovered,
        Falhas: c.failed,
      };
    });
  }, [fallbackEvents]);

  if (!isAdmin) return null;

  async function persistConfig(next: BackendRoutingConfig, successMessage: string) {
    setSaving(true);
    try {
      const saved = await saveBackendRoutingConfig(next, user?.email || user?.uid);
      setConfig(saved);
      toast.success(successMessage);
    } catch (error) {
      console.error('Erro ao salvar roteamento de backend:', error);
      toast.error('Não foi possível salvar o roteamento de backend.');
    } finally {
      setSaving(false);
    }
  }

  function handleSetAll(mode: BackendProvider) {
    const next: BackendRoutingConfig = {
      ...config,
      globalMode: mode,
      routes: {
        galleryMedia: 'inherit',
        publicCatalogProducts: 'inherit',
        publicCatalogOrder: 'inherit',
        publicOrderTracking: 'inherit',
        orderTrackingAdmin: 'inherit',
        aiChat: 'inherit',
        alexa: 'inherit',
        mcpAdmin: 'inherit',
        communicationsAdmin: 'inherit',
        usersAdmin: 'inherit',
      },
    };
    void persistConfig(
      next,
      mode === 'gcp'
        ? 'Todas as rotas migradas para GCP (Firebase) em tempo real.'
        : 'Todas as rotas configuradas para Vercel (gru1) nos domínios beta.',
    );
  }

  function handleRouteChange(key: BackendRouteKey, value: RouteOverride) {
    const next: BackendRoutingConfig = {
      ...config,
      routes: {
        ...config.routes,
        [key]: value,
      },
    };
    void persistConfig(next, 'Roteamento da rota atualizado.');
  }

  function handleFallbackToggle(checked: boolean) {
    const next: BackendRoutingConfig = {
      ...config,
      autoFallbackToGcp: checked,
    };
    void persistConfig(
      next,
      checked
        ? 'Fallback automático para GCP ativado.'
        : 'Fallback automático para GCP desativado.',
    );
  }

  return (
    <Card className="bg-card/70 backdrop-blur-md border border-glass-border rounded-2xl shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Globe className="size-5 text-primary" />
            Roteamento de Backend (Vercel ↔ GCP)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={onBetaHost ? 'default' : 'secondary'}>
              {onBetaHost ? 'Host Beta (Vercel ativo)' : 'Host Firebase (sempre GCP)'}
            </Badge>
            <Badge variant="outline">
              Global: {config.globalMode === 'vercel' ? 'Vercel (gru1)' : 'GCP (Firebase)'}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-muted-foreground">
          Controle em tempo real qual provedor executa cada API nos domínios{' '}
          <code className="font-mono text-xs text-foreground">beta.luisices.com.br</code> e{' '}
          <code className="font-mono text-xs text-foreground">loja.beta.luisices.com.br</code>, sem necessidade de redeploy.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!onBetaHost && (
          <div className="flex items-start gap-3 rounded-xl border border-glass-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <ShieldAlert className="size-4 shrink-0 text-primary mt-0.5" />
            <span>
              Você está acessando fora dos domínios beta. Por segurança, todas as chamadas deste host continuam no GCP;
              as alterações abaixo têm efeito imediato para usuários em <strong>beta.luisices.com.br</strong>.
            </span>
          </div>
        )}

        {/* Ações globais rápidas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-glass-border bg-muted/20 p-4">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-foreground">Chave Mestre Global</p>
            <p className="text-xs text-muted-foreground">
              Alterne todas as rotas de uma só vez e redefina sobrescritas individuais.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={config.globalMode === 'vercel' ? 'default' : 'outline'}
              disabled={saving}
              onClick={() => handleSetAll('vercel')}
              className="gap-1.5"
            >
              <Globe className="size-3.5" />
              Tudo na Vercel (gru1)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={config.globalMode === 'gcp' ? 'default' : 'outline'}
              disabled={saving}
              onClick={() => handleSetAll('gcp')}
              className="gap-1.5"
            >
              <Cloud className="size-3.5" />
              Migrar tudo para GCP
            </Button>
          </div>
        </div>

        {/* Fallback automático */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-glass-border bg-muted/20 p-4">
          <div className="space-y-0.5">
            <Label htmlFor="auto-fallback-gcp" className="text-sm font-semibold text-foreground">
              Fallback automático para GCP
            </Label>
            <p className="text-xs text-muted-foreground">
              Se uma chamada na Vercel falhar com erro 5xx, timeout ou falha de rede, refaz automaticamente na Cloud Function do Firebase.
            </p>
          </div>
          <Switch
            id="auto-fallback-gcp"
            checked={config.autoFallbackToGcp}
            disabled={saving}
            onCheckedChange={handleFallbackToggle}
          />
        </div>

        {/* Controle granular por rota */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Controle Granular por Rota</p>
            {saving && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="size-3 animate-spin" /> Salvando...
              </span>
            )}
          </div>

          <div className="divide-y divide-border/60 rounded-xl border border-glass-border bg-background/40">
            {ROUTE_DEFINITIONS.map((route) => {
              const override = config.routes[route.key] || 'inherit';
              const effectiveOnBeta = resolveEffectiveProvider(route.key, config, true);
              return (
                <div
                  key={route.key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{route.label}</span>
                      <Badge variant={effectiveOnBeta === 'vercel' ? 'default' : 'secondary'} className="text-[11px]">
                        Em beta: {effectiveOnBeta === 'vercel' ? 'Vercel (gru1)' : 'GCP'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{route.description}</p>
                    <p className="text-[11px] font-mono text-muted-foreground truncate">
                      {effectiveOnBeta === 'vercel' ? route.vercelPath : `Cloud Function: ${route.gcpFunction}`}
                    </p>
                  </div>

                  <Select
                    value={override}
                    disabled={saving}
                    onValueChange={(val) => handleRouteChange(route.key, val as RouteOverride)}
                  >
                    <SelectTrigger className="w-full sm:w-48 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit">
                        Herdar Global ({config.globalMode === 'vercel' ? 'Vercel' : 'GCP'})
                      </SelectItem>
                      <SelectItem value="vercel">Forçar Vercel (gru1)</SelectItem>
                      <SelectItem value="gcp">Forçar GCP (Firebase)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monitoramento e Gráfico de Fallbacks */}
        <div className="space-y-4 rounded-xl border border-glass-border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Monitoramento de Fallbacks (Vercel → GCP)</p>
              <Badge variant={fallbackEvents.length > 0 ? 'destructive' : 'secondary'} className="text-[11px]">
                {fallbackEvents.length} {fallbackEvents.length === 1 ? 'evento' : 'eventos'}
              </Badge>
            </div>
            {fallbackEvents.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  void clearBackendFallbackTelemetry();
                  toast.success('Histórico de fallbacks limpo.');
                }}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="size-3.5" />
                Limpar histórico
              </Button>
            )}
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="route"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: '0.75rem',
                    color: 'var(--foreground)',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="Recuperados" stackId="a" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Falhas" stackId="a" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {fallbackEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhum fallback para GCP registrado até o momento — todas as chamadas na Vercel responderam normalmente.
            </p>
          ) : (
            <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {fallbackEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {ev.routeKey}{ev.operation ? ` · ${ev.operation}` : ''}
                      </span>
                      {ev.status && (
                        <Badge variant="outline" className="text-[10px]">
                          HTTP {ev.status}
                        </Badge>
                      )}
                      <Badge variant={ev.recoveredViaGcp ? 'secondary' : 'destructive'} className="text-[10px]">
                        {ev.recoveredViaGcp ? 'Recuperado via GCP' : 'Falhou também no GCP'}
                      </Badge>
                    </div>
                    <p className="truncate text-muted-foreground">
                      {ev.vercelError || ev.gcpError
                        ? `Beta: ${describeFallbackError(ev.vercelError) || 'sem código'}${ev.gcpError ? ` · GCP: ${describeFallbackError(ev.gcpError) || 'sem código'}` : ''}${typeof ev.durationMs === 'number' ? ` · ${ev.durationMs} ms` : ''}`
                        : ev.reason}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(ev.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {config.updatedAt && (
          <p className="text-[11px] text-muted-foreground">
            Última alteração: {new Date(config.updatedAt).toLocaleString('pt-BR')}
            {config.updatedBy ? ` por ${config.updatedBy}` : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

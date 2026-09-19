import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Sparkles,
  RefreshCw,
  ExternalLink,
  Database,
  Activity,
  Zap,
  CheckCircle2,
  Clock,
  Layers,
  Cpu,
  Info,
} from 'lucide-react';
import { firebaseAiAgentService } from '../../../services/firebaseAiAgentService';
import { AiUsageData, AiModelQuotaItem } from '../../types';
import { toast } from 'sonner';

interface AiSettingsSectionProps {
  isAdmin: boolean;
}

const FALLBACK_MODELS: AiModelQuotaItem[] = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Modelo de última geração ultra-rápido com suporte multimodal e tool calls integradas.',
    category: 'Produção (Padrão)',
    isDefault: true,
    isActive: true,
    daily: { used: 0, limit: 1500, percentage: 0 },
    rpm: { used: 0, limit: 15 },
    monthly: { used: 0 },
    tpmLimit: 1000000,
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash-Lite',
    description: 'Modelo ultra-leve e econômico para respostas instantâneas e alto throughput.',
    category: 'Alta Eficiência / Lite',
    isActive: false,
    daily: { used: 0, limit: 1500, percentage: 0 },
    rpm: { used: 0, limit: 30 },
    monthly: { used: 0 },
    tpmLimit: 1000000,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Modelo comprovado e estável para briefings diários e consultas operacionais.',
    category: 'Fallback Estável',
    isActive: false,
    daily: { used: 0, limit: 1500, percentage: 0 },
    rpm: { used: 0, limit: 15 },
    monthly: { used: 0 },
    tpmLimit: 1000000,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Modelo de raciocínio profundo para análises complexas e grandes janelas de contexto.',
    category: 'Raciocínio Avançado',
    isActive: false,
    daily: { used: 0, limit: 50, percentage: 0 },
    rpm: { used: 0, limit: 2 },
    monthly: { used: 0 },
    tpmLimit: 32000,
  },
  {
    id: 'gemini-3.0-flash',
    name: 'Gemini 3.0 Flash (Preview)',
    description: 'Próxima geração experimental com alta fidelidade lógica e estruturação.',
    category: 'Experimental / Preview',
    isActive: false,
    daily: { used: 0, limit: 1500, percentage: 0 },
    rpm: { used: 0, limit: 15 },
    monthly: { used: 0 },
    tpmLimit: 1000000,
  },
];

export function AiSettingsSection({ isAdmin }: AiSettingsSectionProps) {
  if (!isAdmin) return null;

  const [usage, setUsage] = useState<AiUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingOrders, setSyncingOrders] = useState(false);

  const fetchUsage = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await firebaseAiAgentService.getAiUsage();
      setUsage(data);
    } catch (err: any) {
      console.warn('[AiSettingsSection] Erro ao buscar quota de IA:', err);
      // Fallback amigável com lista completa de modelos
      setUsage({
        success: true,
        activeModel: 'gemini-2.0-flash',
        provider: 'Google AI Studio / Gemini API',
        resetsAt: new Date(Date.now() + 86400000).toISOString(),
        totalDaily: { used: 0, limit: 1500, percentage: 0 },
        totalMonthly: { used: 0, limit: 45000, percentage: 0 },
        models: FALLBACK_MODELS,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsage();
    }
  }, [isAdmin]);

  const handleSyncOrders = async () => {
    if (!isAdmin || syncingOrders) return;
    setSyncingOrders(true);
    try {
      const res = await firebaseAiAgentService.syncAllOrders();
      toast.success(res.message || `${res.count} pedidos sincronizados para a base da IA!`);
    } catch (err: any) {
      console.error('[AiSettingsSection] Erro na sincronização:', err);
      toast.error(err.message || 'Falha ao sincronizar pedidos.');
    } finally {
      setSyncingOrders(false);
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage > 85) return 'text-red-500 dark:text-red-400';
    if (percentage > 60) return 'text-amber-500 dark:text-amber-400';
    return 'text-emerald-500 dark:text-emerald-400';
  };

  const formatResetTime = (isoString?: string) => {
    if (!isoString) return '00:00 UTC';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) + ' (BRT)';
    } catch {
      return '00:00 UTC';
    }
  };

  const modelsList = usage?.models && usage.models.length > 0 ? usage.models : FALLBACK_MODELS;

  return (
    <Card className="border-amber-500/20 bg-linear-to-b from-card to-amber-500/5 shadow-xs">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Sparkles className="size-5 text-amber-500" />
              Cota e Consumo de Modelos Gemini (Google AI Studio)
            </CardTitle>
            <CardDescription>
              Acompanhamento de consumo individual por modelo e cotas operacionais em tempo real
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsage}
              disabled={loading}
              className="h-8 gap-1.5 text-xs"
              title="Atualizar métricas"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
              Atualizar
            </Button>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <a
                href="https://aistudio.google.com/app/usage"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-3.5" />
                Painel Google AI Studio
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Resumo Global */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border bg-card/80 shadow-2xs">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Clock className="size-3.5 text-amber-500" /> Total Diário Geral
            </span>
            <p className="text-base sm:text-lg font-bold">
              {usage?.totalDaily?.used ?? 0} <span className="text-xs font-normal text-muted-foreground">/ {usage?.totalDaily?.limit ?? 1500} req</span>
            </p>
            <Progress value={usage?.totalDaily?.percentage ?? 0} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground pt-0.5">
              Reset diário às {formatResetTime(usage?.resetsAt)}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Activity className="size-3.5 text-blue-500" /> Total Mensal Acumulado
            </span>
            <p className="text-base sm:text-lg font-bold">
              {usage?.totalMonthly?.used ?? 0} <span className="text-xs font-normal text-muted-foreground">/ {usage?.totalMonthly?.limit ?? 45000} req</span>
            </p>
            <Progress value={usage?.totalMonthly?.percentage ?? 0} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground pt-0.5">
              Limite estimado do plano gratuito
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Zap className="size-3.5 text-emerald-500" /> Modelo em Produção Ativo
            </span>
            <div className="pt-0.5">
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs py-1">
                {usage?.activeModel || 'gemini-2.0-flash'}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              Fallback automático para modelos secundários
            </p>
          </div>
        </div>

        {/* Lista Detalhada de Modelos Disponíveis */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="size-4 text-purple-500" />
              Consumo por Modelo & Limites Específicos
            </h4>
            <span className="text-[11px] text-muted-foreground">
              {modelsList.length} modelos mapeados
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {modelsList.map((m) => {
              const isActive = m.isActive || m.id === usage?.activeModel;
              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-xl border transition-colors space-y-3 ${
                    isActive
                      ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 shadow-xs'
                      : 'border-border/70 bg-card/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold flex items-center gap-1.5">
                          <Cpu className="size-4 text-muted-foreground" />
                          {m.name}
                        </span>
                        {isActive && (
                          <Badge className="bg-amber-500 text-white dark:bg-amber-600 text-[10px] px-1.5 py-0 h-4">
                            Em Uso
                          </Badge>
                        )}
                        {m.isDefault && !isActive && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                            Padrão
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {m.description}
                      </p>
                    </div>

                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {m.category}
                    </Badge>
                  </div>

                  {/* Barra de Consumo do Modelo */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Cota Diária (RPD)</span>
                      <span className={`font-semibold ${getUsageColor(m.daily.percentage)}`}>
                        {m.daily.used} / {m.daily.limit} req ({m.daily.percentage}%)
                      </span>
                    </div>
                    <Progress value={m.daily.percentage} className="h-1.5" />
                  </div>

                  {/* Métricas Extras de Limites */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-foreground/70">Rate Limit</span>
                      <span>{m.rpm.limit} req/min</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-foreground/70">Mês</span>
                      <span>{m.monthly.used} req</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-foreground/70">Tokens/Min</span>
                      <span>{m.tpmLimit ? `${(m.tpmLimit / 1000).toLocaleString('pt-BR')}k` : '1.000k'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sincronização da Base somente-leitura */}
        <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Database className="size-4 text-purple-500" />
              Base Sanitizada do Copiloto (`ai_orders_view`)
            </p>
            <p className="text-xs text-muted-foreground">
              Sincroniza todos os pedidos existentes do ateliê para a base otimizada de leitura rápida dos modelos Gemini.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncOrders}
            disabled={syncingOrders}
            className="gap-1.5 shrink-0 text-xs"
          >
            <RefreshCw className={`size-3.5 ${syncingOrders ? 'animate-spin' : ''}`} />
            {syncingOrders ? 'Sincronizando...' : 'Sincronizar Pedidos'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

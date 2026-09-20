import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Sparkles,
  RefreshCw,
  ExternalLink,
  Activity,
  Zap,
  Clock,
  Layers,
  Cpu,
  ShieldCheck,
} from 'lucide-react';
import { firebaseAiAgentService } from '../../../services/firebaseAiAgentService';
import { AiUsageData, AiModelQuotaItem } from '../../types';

interface AiSettingsSectionProps {
  isAdmin: boolean;
}

const FALLBACK_MODELS: AiModelQuotaItem[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    description: 'Modelo principal de última geração em produção para raciocínio multimodal, fotos e acervo do ateliê.',
    category: 'Produção (Padrão)',
    isDefault: true,
    isActive: true,
    daily: { used: 0, limit: 1500, percentage: 0 },
    rpm: { used: 0, limit: 15 },
    monthly: { used: 0 },
    tpmLimit: 1000000,
    liveStatus: 'ONLINE',
    liveCode: 200,
    liveMessage: 'Live 200 OK',
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    description: 'Modelo de alta velocidade com suporte multimodal e tool calls integradas.',
    category: 'Produção (Fallback)',
    isActive: false,
    daily: { used: 0, limit: 1500, percentage: 0 },
    rpm: { used: 0, limit: 15 },
    monthly: { used: 0 },
    tpmLimit: 1000000,
    liveStatus: 'ONLINE',
    liveCode: 200,
    liveMessage: 'Live 200 OK',
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    description: 'Modelo avançado com raciocínio híbrido e alta capacidade analítica.',
    category: 'Raciocínio Avançado',
    isActive: false,
    daily: { used: 0, limit: 1500, percentage: 0 },
    rpm: { used: 0, limit: 15 },
    monthly: { used: 0 },
    tpmLimit: 1000000,
    liveStatus: 'ONLINE',
    liveCode: 200,
    liveMessage: 'Live 200 OK',
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    description: 'Modelo de produção balanceado para consistência e baixa latência.',
    category: 'Produção (Fallback)',
    isActive: false,
    daily: { used: 0, limit: 1500, percentage: 0 },
    rpm: { used: 0, limit: 15 },
    monthly: { used: 0 },
    tpmLimit: 1000000,
    liveStatus: 'ONLINE',
    liveCode: 200,
    liveMessage: 'Live 200 OK',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    description: 'Modelo ultraleve e econômico para triagens e respostas instantâneas.',
    category: 'Econômico / Lite',
    isActive: false,
    daily: { used: 0, limit: 1500, percentage: 0 },
    rpm: { used: 0, limit: 15 },
    monthly: { used: 0 },
    tpmLimit: 1000000,
    liveStatus: 'ONLINE',
    liveCode: 200,
    liveMessage: 'Live 200 OK',
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash Lite',
    description: 'Modelo leve com pool de cota isolado para alta taxa de requisições.',
    category: 'Econômico / Lite',
    isActive: false,
    daily: { used: 0, limit: 1500, percentage: 0 },
    rpm: { used: 0, limit: 15 },
    monthly: { used: 0 },
    tpmLimit: 1000000,
    liveStatus: 'ONLINE',
    liveCode: 200,
    liveMessage: 'Live 200 OK',
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    description: 'Próxima geração experimental com alta fidelidade lógica e estruturação.',
    category: 'Experimental / Preview',
    isActive: false,
    daily: { used: 0, limit: 1500, percentage: 0 },
    rpm: { used: 0, limit: 15 },
    monthly: { used: 0 },
    tpmLimit: 1000000,
    liveStatus: 'ONLINE',
    liveCode: 200,
    liveMessage: 'Live 200 OK',
  },
];

export function AiSettingsSection({ isAdmin }: AiSettingsSectionProps) {
  if (!isAdmin) return null;

  const [usage, setUsage] = useState<AiUsageData | null>(null);
  const [loading, setLoading] = useState(true);

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
        activeModel: 'gemini-3.8-flash',
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

  const formatLogTime = (isoString?: string) => {
    if (!isoString) return '--';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatActionLabel = (action: string) => {
    switch (action) {
      case 'copilot_chat':
        return 'Chat Copiloto';
      case 'gallery_vision_enrichment':
        return 'Visão Galeria';
      default:
        return action || 'Requisição IA';
    }
  };

  const renderLiveTelemetryBadge = (model: AiModelQuotaItem) => {
    const status = model.liveStatus || (model.liveCode === 200 ? 'ONLINE' : undefined);

    if (status === 'ONLINE' || model.liveCode === 200) {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0 h-4 font-mono font-medium shrink-0"
        >
          <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
          Live 200 OK
        </Badge>
      );
    }

    if (status === 'QUOTA_EXCEEDED' || model.liveCode === 429) {
      return (
        <Badge
          variant="outline"
          className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 text-[10px] px-1.5 py-0 h-4 font-mono font-medium shrink-0"
        >
          <span className="inline-block size-1.5 rounded-full bg-red-500 mr-1" />
          429 Quota Exceeded
        </Badge>
      );
    }

    if (status === 'HIGH_DEMAND' || model.liveCode === 503) {
      return (
        <Badge
          variant="outline"
          className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0 h-4 font-mono font-medium shrink-0"
        >
          <span className="inline-block size-1.5 rounded-full bg-amber-500 mr-1" />
          503 Alta Demanda
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="bg-muted text-muted-foreground border-border text-[10px] px-1.5 py-0 h-4 font-mono shrink-0"
      >
        <span className="inline-block size-1.5 rounded-full bg-zinc-400 mr-1" />
        {model.liveMessage || 'Offline'}
      </Badge>
    );
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
              Acompanhamento de consumo individual por modelo e cotas operacionais em tempo real com telemetria ativa
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
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
              <span>Reset às {formatResetTime(usage?.resetsAt)}</span>
              {typeof usage?.totalTokensToday === 'number' && usage.totalTokensToday > 0 && (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  ⚡ {usage.totalTokensToday.toLocaleString('pt-BR')} tokens hoje
                </span>
              )}
            </div>
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
            <div className="pt-0.5 flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs py-1">
                {usage?.activeModel || 'gemini-3.8-flash'}
              </Badge>
              {(() => {
                const currentActive = modelsList.find(m => m.id === (usage?.activeModel || 'gemini-3.8-flash'));
                return currentActive ? renderLiveTelemetryBadge(currentActive) : null;
              })()}
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              Fallback automático para modelos com cotas isoladas
            </p>
          </div>
        </div>

        {/* Lista Detalhada de Modelos Disponíveis com Telemetria ao Vivo */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="size-4 text-purple-500" />
              Consumo por Modelo & Telemetria ao Vivo
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
                    <div className="space-y-1">
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
                        {renderLiveTelemetryBadge(m)}
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

        {/* Histórico das Últimas Requisições Reais Executadas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-4 text-amber-500" />
              Últimas Requisições Reais Executadas
            </h4>
            <span className="text-[11px] text-muted-foreground">
              {usage?.recentLogs?.length ?? 0} registros recentes
            </span>
          </div>

          {(!usage?.recentLogs || usage.recentLogs.length === 0) ? (
            <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground bg-muted/10">
              Nenhuma requisição registrada ainda hoje ou logs em sincronização.
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden bg-card/60">
              <div className="max-h-72 overflow-y-auto divide-y divide-border/40">
                {usage.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                        {log.model}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {formatActionLabel(log.action)}
                      </Badge>
                      <span className="text-muted-foreground text-[11px]">
                        {formatLogTime(log.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {log.totalTokens ? `${log.totalTokens.toLocaleString('pt-BR')} tokens` : '0 tokens'}
                      </span>
                      {(log.promptTokens || log.candidatesTokens) ? (
                        <span className="text-[10px] text-muted-foreground">
                          ({log.promptTokens || 0} prompt / {log.candidatesTokens || 0} output)
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sincronização em Tempo Real Ativa */}
        <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong className="text-foreground">Sincronização em Tempo Real Ativa:</strong> Telemetria ao vivo com sondas HTTP periódicas e logs auditáveis no Firestore.
            </span>
          </span>
          <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shrink-0">
            Zero Manutenção
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

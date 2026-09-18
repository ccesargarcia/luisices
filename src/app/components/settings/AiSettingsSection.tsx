import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Sparkles, RefreshCw, ExternalLink, Database, Activity, Zap, CheckCircle2, Clock } from 'lucide-react';
import { firebaseAiAgentService } from '../../../services/firebaseAiAgentService';
import { AiUsageData } from '../../types';
import { toast } from 'sonner';

interface AiSettingsSectionProps {
  isAdmin: boolean;
}

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
      // Fallback amigável caso a function ainda não tenha sido publicada
      setUsage({
        success: true,
        model: 'gemini-2.0-flash',
        provider: 'Google AI Studio / Gemini API',
        daily: {
          used: 0,
          limit: 1500,
          percentage: 0,
          resetsAt: new Date(Date.now() + 86400000).toISOString(),
        },
        rpm: {
          used: 0,
          limit: 15,
          percentage: 0,
        },
        monthly: {
          used: 0,
          limit: 45000,
          percentage: 0,
          resetsAt: new Date(Date.now() + 86400000 * 30).toISOString(),
        },
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

  return (
    <Card className="border-amber-500/20 bg-linear-to-b from-card to-amber-500/5">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Sparkles className="size-5 text-amber-500" />
              Copiloto de IA & Cota Gemini API
            </CardTitle>
            <CardDescription>
              Monitoramento de consumo, limites de requisições e status do motor Gemini
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
        {/* Metadados e Modelo Ativo */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border/50">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1.5 py-1">
            <Zap className="size-3.5 text-amber-500" />
            Modelo: {usage?.model || 'gemini-2.0-flash'}
          </Badge>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1.5 py-1">
            <Activity className="size-3.5 text-blue-500" />
            Provedor: {usage?.provider || 'Google AI Studio'}
          </Badge>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5 py-1">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            Rate Limit: 15 req/min
          </Badge>
        </div>

        {/* Grid de Cotas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cota Diária */}
          <div className="p-4 rounded-xl border bg-card/60 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Clock className="size-4 text-amber-500" />
                Cota Diária (RPD)
              </span>
              <span className={`text-sm font-semibold ${getUsageColor(usage?.daily.percentage || 0)}`}>
                {usage?.daily.used ?? 0} / {usage?.daily.limit ?? 1500} req ({usage?.daily.percentage ?? 0}%)
              </span>
            </div>
            
            <Progress value={usage?.daily.percentage ?? 0} className="h-2" />

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>Restantes: {Math.max(0, (usage?.daily.limit || 1500) - (usage?.daily.used || 0))} requisições</span>
              <span>Reset às {formatResetTime(usage?.daily.resetsAt)}</span>
            </div>
          </div>

          {/* Cota Mensal Acumulada */}
          <div className="p-4 rounded-xl border bg-card/60 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Activity className="size-4 text-blue-500" />
                Consumo Mensal
              </span>
              <span className={`text-sm font-semibold ${getUsageColor(usage?.monthly.percentage || 0)}`}>
                {usage?.monthly.used ?? 0} / {usage?.monthly.limit ?? 45000} req ({usage?.monthly.percentage ?? 0}%)
              </span>
            </div>
            
            <Progress value={usage?.monthly.percentage ?? 0} className="h-2" />

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>Total acumulado no mês corrente</span>
              <span>Teto gratuito: 45.000 req/mês</span>
            </div>
          </div>
        </div>

        {/* Ações de Administração da Base da IA */}
        {isAdmin && (
          <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Database className="size-4 text-purple-500" />
                Base Sanitizada do Copiloto (`ai_orders_view`)
              </p>
              <p className="text-xs text-muted-foreground">
                Sincroniza todos os pedidos existentes do ateliê para a base otimizada de leitura rápida do Copiloto.
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
        )}
      </CardContent>
    </Card>
  );
}

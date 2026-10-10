import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Truck, Bell, CreditCard, Loader2, Archive, Sparkles } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { CustomerTiersSettings, DEFAULT_CUSTOMER_TIERS } from '../../utils/customerMetrics';

interface OperationsSectionProps {
  deliveryAlertDays: number;
  onDeliveryAlertDaysChange: (days: number) => void;
  defaultDeliveryDays: number;
  onDefaultDeliveryDaysChange: (days: number) => void;
  defaultPaymentMethod: string;
  onDefaultPaymentMethodChange: (method: string) => void;
  autoArchiveCompletedOrders?: boolean;
  onAutoArchiveCompletedOrdersChange?: (val: boolean) => void;
  autoArchiveDays?: number;
  onAutoArchiveDaysChange?: (days: number) => void;
  customerTiers?: CustomerTiersSettings;
  onCustomerTiersChange?: (tiers: CustomerTiersSettings) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

export function OperationsSection({
  deliveryAlertDays,
  onDeliveryAlertDaysChange,
  defaultDeliveryDays,
  onDefaultDeliveryDaysChange,
  defaultPaymentMethod,
  onDefaultPaymentMethodChange,
  autoArchiveCompletedOrders = false,
  onAutoArchiveCompletedOrdersChange,
  autoArchiveDays = 30,
  onAutoArchiveDaysChange,
  customerTiers,
  onCustomerTiersChange,
  onSave,
  saving,
}: OperationsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="size-5" />
          Operação Padrão
        </CardTitle>
        <CardDescription>
          Valores pré-preenchidos ao criar novos pedidos e alertas de prazo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alerta de entregas */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Bell className="size-4" />
            Alerta de prazo — dias de antecedência
          </Label>
          <Select
            value={String(deliveryAlertDays)}
            onValueChange={(v) => onDeliveryAlertDaysChange(Number(v))}
          >
            <SelectTrigger className="w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 dia</SelectItem>
              <SelectItem value="2">2 dias</SelectItem>
              <SelectItem value="3">3 dias (padrão)</SelectItem>
              <SelectItem value="5">5 dias</SelectItem>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Pedidos com prazo dentro deste período aparecem no painel de alertas
          </p>
        </div>

        {/* Data de entrega padrão */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Truck className="size-4" />
            Data de entrega padrão ao criar pedido
          </Label>
          <Select
            value={String(defaultDeliveryDays)}
            onValueChange={(v) => onDefaultDeliveryDaysChange(Number(v))}
          >
            <SelectTrigger className="w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Não pré-preencher</SelectItem>
              <SelectItem value="1">Amanhã (+1 dia)</SelectItem>
              <SelectItem value="2">+2 dias</SelectItem>
              <SelectItem value="3">+3 dias</SelectItem>
              <SelectItem value="5">+5 dias</SelectItem>
              <SelectItem value="7">+7 dias</SelectItem>
              <SelectItem value="14">+14 dias</SelectItem>
              <SelectItem value="30">+30 dias</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            A data de entrega será pré-preenchida com esta antecedência ao abrir o diálogo de novo
            pedido
          </p>
        </div>

        {/* Método de pagamento padrão */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="size-4" />
            Método de pagamento padrão
          </Label>
          <Select
            value={defaultPaymentMethod || 'none'}
            onValueChange={(v) => onDefaultPaymentMethodChange(v === 'none' ? '' : v)}
          >
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Não pré-selecionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Não pré-selecionar</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="cash">Dinheiro</SelectItem>
              <SelectItem value="credit">Cartão de Crédito</SelectItem>
              <SelectItem value="debit">Cartão de Débito</SelectItem>
              <SelectItem value="transfer">Transferência</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            O método será pré-selecionado no formulário de novo pedido
          </p>
        </div>

        {/* Arquivamento automático de pedidos concluídos */}
        <div className="p-4 rounded-lg border border-border/70 bg-card/60 backdrop-blur-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="auto-archive-switch" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                <Archive className="size-4 text-primary" />
                Arquivamento automático de pedidos concluídos
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ao marcar um pedido como concluído, ele é enviado para a área de arquivamento para não poluir o painel operacional diário.
              </p>
            </div>
            <Switch
              id="auto-archive-switch"
              checked={Boolean(autoArchiveCompletedOrders)}
              onCheckedChange={(checked) => onAutoArchiveCompletedOrdersChange?.(checked)}
              aria-label="Arquivamento automático de pedidos concluídos"
            />
          </div>

          {autoArchiveCompletedOrders && (
            <div className="pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center animate-in fade-in duration-200">
              <div>
                <Label htmlFor="auto-archive-days" className="text-xs font-semibold text-foreground">
                  Prazo para arquivar após a entrega
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Tempo que o pedido concluído permanece visível no painel antes de ir para o arquivo.
                </p>
              </div>
              <Select
                value={String(autoArchiveDays ?? 30)}
                onValueChange={(val) => onAutoArchiveDaysChange?.(Number(val))}
              >
                <SelectTrigger id="auto-archive-days" className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o prazo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Imediatamente ao concluir</SelectItem>
                  <SelectItem value="15">Após 15 dias da entrega</SelectItem>
                  <SelectItem value="30">Após 30 dias da entrega (Recomendado)</SelectItem>
                  <SelectItem value="60">Após 60 dias da entrega</SelectItem>
                  <SelectItem value="90">Após 90 dias da entrega</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Segmentação Comercial e Faixas de Gasto */}
        <div className="p-4 rounded-lg border border-border/70 bg-card/60 backdrop-blur-sm space-y-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" />
              Segmentação Comercial de Clientes (Faixas de Gasto & Alertas)
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Defina os valores de corte para classificar automaticamente os clientes do ateliê (Diamante, Ouro e Prata) e o limite de dias sem comprar para sinalizar inatividade no Raio X.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="tier-diamond-min" className="text-xs font-semibold flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300">
                💎 Diamante (VIP) — Mínimo (R$)
              </Label>
              <Input
                id="tier-diamond-min"
                type="number"
                min="0"
                step="50"
                value={customerTiers?.diamondMin ?? DEFAULT_CUSTOMER_TIERS.diamondMin}
                onChange={(e) =>
                  onCustomerTiersChange?.({
                    ...(customerTiers ?? DEFAULT_CUSTOMER_TIERS),
                    diamondMin: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Clientes acima deste valor</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tier-gold-min" className="text-xs font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                🥇 Ouro — Mínimo (R$)
              </Label>
              <Input
                id="tier-gold-min"
                type="number"
                min="0"
                step="50"
                value={customerTiers?.goldMin ?? DEFAULT_CUSTOMER_TIERS.goldMin}
                onChange={(e) =>
                  onCustomerTiersChange?.({
                    ...(customerTiers ?? DEFAULT_CUSTOMER_TIERS),
                    goldMin: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Clientes entre Ouro e Diamante</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tier-silver-min" className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                🥈 Prata — Mínimo (R$)
              </Label>
              <Input
                id="tier-silver-min"
                type="number"
                min="0"
                step="20"
                value={customerTiers?.silverMin ?? DEFAULT_CUSTOMER_TIERS.silverMin}
                onChange={(e) =>
                  onCustomerTiersChange?.({
                    ...(customerTiers ?? DEFAULT_CUSTOMER_TIERS),
                    silverMin: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Abaixo disto: 🌱 Bronze</p>
            </div>
          </div>

          <div className="pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <Label htmlFor="tier-inactive-days" className="text-xs font-semibold text-foreground">
                Alerta de Cliente Inativo (Risco de Perda)
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Clientes com compras que não fecham novos pedidos há mais que este período recebem aviso no Raio X.
              </p>
            </div>
            <Select
              value={String(customerTiers?.inactiveDaysThreshold ?? DEFAULT_CUSTOMER_TIERS.inactiveDaysThreshold)}
              onValueChange={(val) =>
                onCustomerTiersChange?.({
                  ...(customerTiers ?? DEFAULT_CUSTOMER_TIERS),
                  inactiveDaysThreshold: Number(val),
                })
              }
            >
              <SelectTrigger id="tier-inactive-days" className="h-9 text-xs">
                <SelectValue placeholder="Selecione o limite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 dias sem comprar</SelectItem>
                <SelectItem value="45">45 dias sem comprar</SelectItem>
                <SelectItem value="60">60 dias sem comprar (Padrão)</SelectItem>
                <SelectItem value="90">90 dias sem comprar</SelectItem>
                <SelectItem value="120">120 dias sem comprar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={onSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Operação'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

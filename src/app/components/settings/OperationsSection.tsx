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
import { Truck, Bell, CreditCard, Loader2, Archive } from 'lucide-react';
import { Switch } from '../ui/switch';

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

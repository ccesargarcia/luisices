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
import { Truck, Bell, CreditCard, Loader2 } from 'lucide-react';

interface OperationsSectionProps {
  deliveryAlertDays: number;
  onDeliveryAlertDaysChange: (days: number) => void;
  defaultDeliveryDays: number;
  onDefaultDeliveryDaysChange: (days: number) => void;
  defaultPaymentMethod: string;
  onDefaultPaymentMethodChange: (method: string) => void;
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

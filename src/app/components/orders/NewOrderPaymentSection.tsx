import React from 'react';
import { PaymentStatus, PaymentMethod } from '../../types';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface NewOrderPaymentSectionProps {
  paymentStatus: PaymentStatus;
  onPaymentStatusChange: (status: PaymentStatus) => void;
  paymentMethod: PaymentMethod | '';
  onPaymentMethodChange: (method: PaymentMethod) => void;
  paidAmount: string;
  onPaidAmountChange: (amount: string) => void;
  totalPrice: number;
  formatCurrency: (v: number) => string;
}

export function NewOrderPaymentSection({
  paymentStatus,
  onPaymentStatusChange,
  paymentMethod,
  onPaymentMethodChange,
  paidAmount,
  onPaidAmountChange,
  totalPrice,
  formatCurrency,
}: NewOrderPaymentSectionProps) {
  return (
    <div className="border-t pt-4 space-y-4">
      <h3 className="font-medium text-sm">Informações de Pagamento</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="paymentStatus">Status de Pagamento *</Label>
          <Select
            value={paymentStatus}
            onValueChange={(value: PaymentStatus) => onPaymentStatusChange(value)}
          >
            <SelectTrigger id="paymentStatus">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="partial">Parcial</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
          <Select
            value={paymentMethod}
            onValueChange={(value: PaymentMethod) => onPaymentMethodChange(value)}
          >
            <SelectTrigger id="paymentMethod">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="cash">Dinheiro</SelectItem>
              <SelectItem value="credit">Cartão de Crédito</SelectItem>
              <SelectItem value="debit">Cartão de Débito</SelectItem>
              <SelectItem value="transfer">Transferência</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paidAmount">Valor Pago (R$)</Label>
        <Input
          id="paidAmount"
          type="number"
          min="0"
          step="0.01"
          max={totalPrice || undefined}
          value={paidAmount}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '') {
              onPaidAmountChange('');
              return;
            }
            const normalized = Math.min(totalPrice, Math.max(0, Number(value)));
            onPaidAmountChange(Number.isFinite(normalized) ? String(normalized) : '');
          }}
          placeholder={
            totalPrice > 0 ? `Máximo: ${formatCurrency(totalPrice)}` : 'Informe o valor pago'
          }
        />
        {paidAmount && totalPrice > 0 && (
          <p className="text-sm text-muted-foreground">
            Restante: {formatCurrency(Math.max(0, totalPrice - parseFloat(paidAmount)))}
          </p>
        )}
      </div>
    </div>
  );
}

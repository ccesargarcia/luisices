import React from 'react';
import { Customer } from '../../types';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { UserPlus, AlertTriangle } from 'lucide-react';

interface NewOrderCustomerSelectProps {
  selectedCustomer: string;
  onSelectCustomer: (customerId: string) => void;
  customers: Customer[];
  isNewCustomer: boolean;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (phone: string) => void;
  customerEmail: string;
  onCustomerEmailChange: (email: string) => void;
}

export function NewOrderCustomerSelect({
  selectedCustomer,
  onSelectCustomer,
  customers,
  isNewCustomer,
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  customerEmail,
  onCustomerEmailChange,
}: NewOrderCustomerSelectProps) {
  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomer);
  const isDefaulter = selectedCustomerObj?.status === 'defaulter';

  return (
    <div className="space-y-4">
      {/* Seleção de Cliente */}
      <div className="space-y-2">
        <Label htmlFor="customer">Cliente *</Label>
        <Select value={selectedCustomer} onValueChange={onSelectCustomer}>
          <SelectTrigger id="customer">
            <SelectValue placeholder="Selecione um cliente ou crie novo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">
              <div className="flex items-center gap-2">
                <UserPlus className="size-4" />
                Novo Cliente
              </div>
            </SelectItem>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name} - {customer.phone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isDefaulter && (
          <Alert className="border-red-300 bg-red-50 dark:bg-red-950/20 py-2 px-3">
            <AlertDescription className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
              <AlertTriangle className="size-4 shrink-0" />
              Este cliente está marcado como <strong>Inadimplente</strong>. Verifique pendências antes
              de criar um novo pedido.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Dados do Cliente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customerName">Nome do Cliente *</Label>
          <Input
            id="customerName"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            disabled={selectedCustomer !== 'new' && selectedCustomer !== ''}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerPhone">Telefone *</Label>
          <Input
            id="customerPhone"
            type="tel"
            value={customerPhone}
            onChange={(e) => onCustomerPhoneChange(e.target.value)}
            placeholder="(11) 98765-4321"
            disabled={selectedCustomer !== 'new' && selectedCustomer !== ''}
            required
          />
        </div>
      </div>

      {(isNewCustomer || selectedCustomer === 'new') && (
        <div className="space-y-2">
          <Label htmlFor="customerEmail">Email (opcional)</Label>
          <Input
            id="customerEmail"
            type="email"
            value={customerEmail}
            onChange={(e) => onCustomerEmailChange(e.target.value)}
            placeholder="cliente@email.com"
          />
        </div>
      )}
    </div>
  );
}

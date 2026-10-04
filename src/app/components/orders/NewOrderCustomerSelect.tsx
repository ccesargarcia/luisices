import React, { useState, useMemo } from 'react';
import { Customer } from '../../types';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  UserPlus,
  AlertTriangle,
  Search,
  Check,
  ChevronsUpDown,
  X,
  User,
  Phone,
  Mail,
  UserCheck,
} from 'lucide-react';

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
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCustomerObj = useMemo(
    () => customers.find((c) => c.id === selectedCustomer),
    [customers, selectedCustomer]
  );
  const isDefaulter = selectedCustomerObj?.status === 'defaulter';

  // Filtragem eficiente de clientes em tempo real por nome, telefone (inclusive dígitos) e email
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) {
      return customers;
    }
    const q = searchQuery.toLowerCase().trim();
    const cleanDigits = q.replace(/\D/g, '');

    return customers.filter((c) => {
      const nameMatch = (c.name || '').toLowerCase().includes(q);
      const emailMatch = (c.email || '').toLowerCase().includes(q);
      const phoneMatch = (c.phone || '').includes(q);
      const digitsMatch =
        cleanDigits.length >= 2 &&
        (c.phone || '').replace(/\D/g, '').includes(cleanDigits);

      return nameMatch || emailMatch || phoneMatch || digitsMatch;
    });
  }, [customers, searchQuery]);

  const handleSelectExisting = (customer: Customer) => {
    onSelectCustomer(customer.id);
    onCustomerNameChange(customer.name);
    onCustomerPhoneChange(customer.phone);
    onCustomerEmailChange(customer.email || '');
    setOpen(false);
    setSearchQuery('');
  };

  const handleSelectNew = (presetName?: string) => {
    onSelectCustomer('new');
    if (presetName !== undefined) {
      onCustomerNameChange(presetName);
    }
    setOpen(false);
    setSearchQuery('');
  };

  const handleClearSelection = () => {
    onSelectCustomer('');
    onCustomerNameChange('');
    onCustomerPhoneChange('');
    onCustomerEmailChange('');
    setSearchQuery('');
  };

  return (
    <div className="space-y-4">
      {/* Seleção e Busca de Cliente */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="customer-combobox" className="text-sm font-medium">
            Cliente *
          </Label>
          {selectedCustomer && selectedCustomer !== '' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Trocar cliente
            </Button>
          )}
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id="customer-combobox"
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal h-10 px-3 text-left border-input bg-background hover:bg-accent/50"
            >
              {selectedCustomer === 'new' ? (
                <div className="flex items-center gap-2 text-primary font-medium truncate">
                  <UserPlus className="size-4 shrink-0 text-primary" />
                  <span className="truncate">Novo Cliente (Novo Cadastro)</span>
                </div>
              ) : selectedCustomerObj ? (
                <div className="flex items-center gap-2 truncate">
                  <UserCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-medium truncate">{selectedCustomerObj.name}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    ({selectedCustomerObj.phone})
                  </span>
                  {isDefaulter && (
                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                      Inadimplente
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground truncate">
                  <Search className="size-4 shrink-0 opacity-50" />
                  <span className="truncate">Buscar por nome, telefone ou criar novo...</span>
                </div>
              )}
              <ChevronsUpDown className="size-4 shrink-0 opacity-50 ml-2" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-[calc(100vw-2rem)] sm:w-[480px] p-0 shadow-lg border-border"
            align="start"
            sideOffset={4}
          >
            {/* Campo de Busca Sticky no Topo */}
            <div className="p-2 border-b border-border bg-muted/40">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Buscar por nome, telefone ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-8 h-9 text-sm bg-background border-border"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 p-0.5 rounded-full hover:bg-muted text-muted-foreground"
                    title="Limpar busca"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Opção Rápida de Criar Novo Cliente */}
            <div className="p-1.5 border-b border-border bg-card">
              <button
                type="button"
                onClick={() => handleSelectNew(searchQuery.trim() || undefined)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md text-primary hover:bg-primary/10 transition-colors text-left"
              >
                <div className="p-1 rounded bg-primary/10 text-primary">
                  <UserPlus className="size-4" />
                </div>
                <div className="flex-1 truncate">
                  {searchQuery.trim() ? (
                    <span>
                      Cadastrar <strong>&ldquo;{searchQuery.trim()}&rdquo;</strong> como novo cliente
                    </span>
                  ) : (
                    <span>Cadastrar Novo Cliente</span>
                  )}
                </div>
              </button>
            </div>

            {/* Lista com Rolagem Fluida (Sem travas) */}
            <div
              tabIndex={0}
              className="max-h-64 overflow-y-auto overscroll-contain p-1.5 space-y-0.5 outline-none"
            >
              {filteredCustomers.length === 0 ? (
                <div className="py-6 px-4 text-center text-sm text-muted-foreground">
                  <User className="size-8 mx-auto mb-2 opacity-30" />
                  <p className="font-medium text-foreground">Nenhum cliente encontrado</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Nenhum cliente cadastrado corresponde a &ldquo;{searchQuery}&rdquo;.
                  </p>
                  {searchQuery.trim() && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectNew(searchQuery.trim())}
                      className="mt-3 gap-1.5 text-xs"
                    >
                      <UserPlus className="size-3.5" />
                      Criar novo cliente com este nome
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Clientes Cadastrados ({filteredCustomers.length})
                  </div>
                  {filteredCustomers.slice(0, 100).map((c) => {
                    const isSelected = selectedCustomer === c.id;
                    const customerDefaulter = c.status === 'defaulter';

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectExisting(c)}
                        className={`flex w-full items-center justify-between gap-2 px-2.5 py-2 rounded-md text-left text-sm transition-colors ${
                          isSelected
                            ? 'bg-primary/15 text-primary font-medium'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-medium truncate">{c.name}</span>
                            {customerDefaulter && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400">
                                Inadimplente
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 truncate">
                            {c.phone && (
                              <span className="flex items-center gap-1 shrink-0">
                                <Phone className="size-3" />
                                {c.phone}
                              </span>
                            )}
                            {c.email && (
                              <span className="flex items-center gap-1 truncate opacity-80">
                                <Mail className="size-3" />
                                {c.email}
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && <Check className="size-4 text-primary shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                  {filteredCustomers.length > 100 && (
                    <div className="py-2 text-center text-xs text-muted-foreground border-t border-border mt-1">
                      Exibindo os primeiros 100 resultados. Refine sua busca digitando mais caracteres.
                    </div>
                  )}
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {isDefaulter && (
          <Alert className="border-red-300 bg-red-50 dark:bg-red-950/20 py-2 px-3 mt-2">
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
          <Label htmlFor="customerName" className="flex items-center justify-between">
            <span>Nome do Cliente *</span>
            {selectedCustomer && selectedCustomer !== 'new' && (
              <span className="text-[11px] text-muted-foreground font-normal">
                (Cliente cadastrado)
              </span>
            )}
          </Label>
          <Input
            id="customerName"
            value={customerName}
            onChange={(e) => {
              onCustomerNameChange(e.target.value);
              if (selectedCustomer && selectedCustomer !== 'new') {
                onSelectCustomer('new');
              }
            }}
            placeholder="Nome completo do cliente"
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
            onChange={(e) => {
              onCustomerPhoneChange(e.target.value);
              if (selectedCustomer && selectedCustomer !== 'new') {
                onSelectCustomer('new');
              }
            }}
            placeholder="(11) 98765-4321"
            disabled={selectedCustomer !== 'new' && selectedCustomer !== ''}
            required
          />
        </div>
      </div>

      {(isNewCustomer || selectedCustomer === 'new' || selectedCustomer === '') && (
        <div className="space-y-2">
          <Label htmlFor="customerEmail">Email (opcional)</Label>
          <Input
            id="customerEmail"
            type="email"
            value={customerEmail}
            onChange={(e) => onCustomerEmailChange(e.target.value)}
            placeholder="cliente@email.com"
            disabled={selectedCustomer !== 'new' && selectedCustomer !== ''}
          />
        </div>
      )}
    </div>
  );
}

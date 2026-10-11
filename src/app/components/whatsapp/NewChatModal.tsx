import React, { useMemo, useState } from 'react';
import { MessageSquare, Users, Phone, Search, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '../ui/dialog';
import { cn } from '../ui/utils';
import { formatPhoneForDisplay } from '../../utils/whatsapp';
import { Customer } from '../../types';

interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  customersLoading: boolean;
  onStartCustomerChat: (c: Customer) => void;
  onStartCustomChat: (phone: string, name: string) => void;
}

export function NewChatModal({
  open,
  onOpenChange,
  customers,
  customersLoading,
  onStartCustomerChat,
  onStartCustomChat,
}: NewChatModalProps) {
  const [newChatTab, setNewChatTab] = useState<'customers' | 'custom'>('customers');
  const [modalCustomerSearch, setModalCustomerSearch] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customName, setCustomName] = useState('');

  const filteredModalCustomers = useMemo(() => {
    if (!modalCustomerSearch.trim()) return customers.slice(0, 30);
    const q = modalCustomerSearch.toLowerCase().trim();
    return customers.filter(
      (c) => c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [customers, modalCustomerSearch]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setModalCustomerSearch('');
      setCustomPhone('');
      setCustomName('');
      setNewChatTab('customers');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="md" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0">
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-2xl bg-primary/10 text-primary shrink-0">
              <MessageSquare className="size-4 sm:size-5" />
            </div>
            <span>Iniciar Conversa no WhatsApp</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Selecione um cliente cadastrado ou digite um número avulso para abrir o chat.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="px-4 sm:px-6 py-4 space-y-4 overflow-y-auto min-h-0">
          <div className="flex p-1 bg-muted rounded-2xl text-xs font-medium shrink-0">
            <button
              type="button"
              onClick={() => setNewChatTab('customers')}
              className={cn(
                'flex-1 py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                newChatTab === 'customers'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Users className="size-3.5" />
              <span>Clientes Cadastrados</span>
              {customers.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 rounded-full font-mono">
                  {customers.length}
                </Badge>
              )}
            </button>
            <button
              type="button"
              onClick={() => setNewChatTab('custom')}
              className={cn(
                'flex-1 py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                newChatTab === 'custom'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Phone className="size-3.5" />
              <span>Número Avulso</span>
            </button>
          </div>

          {newChatTab === 'customers' ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="size-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  value={modalCustomerSearch}
                  onChange={(e) => setModalCustomerSearch(e.target.value)}
                  placeholder="Pesquisar por nome, telefone ou e-mail..."
                  className="pl-9 h-9 text-xs bg-background"
                  autoFocus
                />
                {modalCustomerSearch && (
                  <button
                    type="button"
                    onClick={() => setModalCustomerSearch('')}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="max-h-56 sm:max-h-64 overflow-y-auto border rounded-2xl divide-y divide-border/60 luisices-glass">
                {customersLoading ? (
                  <div className="p-6 text-center text-xs text-muted-foreground space-y-2" role="status">
                    <Loader2 className="size-5 mx-auto animate-spin text-primary" />
                    <p>Carregando clientes...</p>
                  </div>
                ) : filteredModalCustomers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
                    <p>Nenhum cliente cadastrado encontrado para a busca.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewChatTab('custom')}
                      className="text-xs h-7 cursor-pointer"
                    >
                      Digitar número avulso
                    </Button>
                  </div>
                ) : (
                  filteredModalCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onStartCustomerChat(c)}
                      className="w-full p-2.5 text-left text-xs flex items-center justify-between hover:bg-primary/10 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="size-8 shrink-0 border">
                          <AvatarFallback className="bg-primary/10 text-primary dark:text-primary text-xs font-semibold">
                            {c.name ? c.name.slice(0, 2).toUpperCase() : 'CL'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {c.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <span>{formatPhoneForDisplay(c.phone)}</span>
                            {c.city && <span>• {c.city}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <span className="text-[11px] font-medium hidden sm:inline">Iniciar</span>
                        <ChevronRight className="size-4" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3.5 py-1">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">
                  Nome do Contato <span className="text-muted-foreground text-[11px]">(opcional)</span>
                </label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="h-9 text-xs"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">
                  Número de WhatsApp com DDD <span className="text-destructive">*</span>
                </label>
                <Input
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="Ex: (11) 99999-8888"
                  className="h-9 text-xs"
                  type="tel"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Digite o DDD e o número (ex: 11999998888). O código do país +55 será incluído automaticamente.
                </p>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="px-4 sm:px-6 py-3 border-t luisices-glass flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            className="h-8 text-xs cursor-pointer"
          >
            Cancelar
          </Button>
          {newChatTab === 'custom' && (
            <Button
              type="button"
              size="sm"
              onClick={() => onStartCustomChat(customPhone, customName)}
              disabled={!customPhone.trim()}
              className="h-8 text-xs bg-primary hover:bg-primary/90 text-white font-semibold gap-1.5 shadow-xs cursor-pointer"
            >
              <MessageSquare className="size-3.5" />
              <span>Iniciar Chat</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

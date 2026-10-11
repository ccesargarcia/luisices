import React from 'react';
import { Search, Plus, MessageSquare, Loader2, AlertCircle, Package } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { formatPhoneForDisplay } from '../../utils/whatsapp';

export interface MergedConversation {
  id: string;
  phone: string;
  customerName?: string;
  customerId?: string;
  lastMessageText?: string;
  lastMessageTimestamp?: string;
  lastMessageSender?: string;
  unreadCount: number;
  orderCount?: number;
  lastOrderSummary?: string;
}

interface ChatSidebarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filterMode: 'all' | 'unread' | 'with_orders';
  setFilterMode: (val: 'all' | 'unread' | 'with_orders') => void;
  loadingConversations: boolean;
  conversationError: string | null;
  mergedConversations: MergedConversation[];
  selectedPhone: string | null;
  onSelectChat: (phone: string, name?: string, custId?: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({
  searchQuery,
  setSearchQuery,
  filterMode,
  setFilterMode,
  loadingConversations,
  conversationError,
  mergedConversations,
  selectedPhone,
  onSelectChat,
  onNewChat,
}: ChatSidebarProps) {
  return (
    <div
      className={`w-full md:w-80 lg:w-96 border-r luisices-glass flex flex-col h-full shrink-0 min-h-0 relative ${
        selectedPhone ? 'hidden md:flex' : 'flex'
      }`}
    >
      <div className="p-3 border-b space-y-2 luisices-glass shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente, número ou mensagem..."
              className="pl-9 h-9 text-xs bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
              filterMode === 'all'
                ? 'bg-primary text-white'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos ({mergedConversations.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('unread')}
            className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
              filterMode === 'unread'
                ? 'bg-primary text-white'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            Não Lidos
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('with_orders')}
            className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
              filterMode === 'with_orders'
                ? 'bg-primary text-white'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            Com Pedidos
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/40 custom-scrollbar">
        {loadingConversations ? (
          <div className="p-8 text-center text-muted-foreground space-y-3" role="status" aria-live="polite">
            <Loader2 className="size-7 mx-auto animate-spin text-primary" />
            <p className="text-xs">Carregando conversas...</p>
          </div>
        ) : conversationError ? (
          <div className="p-8 text-center text-muted-foreground space-y-3" role="alert">
            <AlertCircle className="size-8 mx-auto text-destructive/70" />
            <p className="text-xs">{conversationError}</p>
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </div>
        ) : mergedConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground space-y-3">
            <MessageSquare className="size-8 mx-auto opacity-30" />
            <p className="text-xs">Nenhuma conversa encontrada.</p>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8"
              onClick={onNewChat}
            >
              <Plus className="size-3.5 mr-1" />
              Iniciar Conversa
            </Button>
          </div>
        ) : (
          mergedConversations.map((chat) => {
            const isSelected = selectedPhone === chat.phone;
            const formattedNumber = formatPhoneForDisplay(chat.phone);
            const hasOrders = (chat.orderCount || 0) > 0;

            return (
              <button
                key={chat.phone}
                type="button"
                onClick={() => onSelectChat(chat.phone, chat.customerName, chat.customerId)}
                className={`w-full text-left p-3 transition-colors flex items-start gap-3 hover:bg-muted/40 ${
                  isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                }`}
              >
                <Avatar className="size-10 shrink-0 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary dark:text-primary text-xs font-bold">
                    {chat.customerName ? chat.customerName.slice(0, 2).toUpperCase() : 'WA'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                      {chat.customerName || formattedNumber}
                    </span>
                    {chat.lastMessageTimestamp && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(chat.lastMessageTimestamp).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs text-muted-foreground truncate leading-snug">
                      {chat.lastMessageText || formattedNumber}
                    </p>
                    {chat.unreadCount > 0 && (
                      <Badge className="bg-primary text-white text-[10px] h-4.5 px-1.5 font-bold rounded-full">
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </div>

                  {hasOrders && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-primary dark:text-primary font-medium">
                      <Package className="size-3 shrink-0" />
                      <span className="truncate">
                        {chat.orderCount} pedido(s) • {chat.lastOrderSummary || 'Ateliê'}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      <button
        type="button"
        onClick={onNewChat}
        aria-label="Iniciar Nova Conversa"
        title="Iniciar Nova Conversa"
        className="md:hidden fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4 z-30 size-12 rounded-full bg-primary hover:bg-primary/90 text-white shadow-xl flex items-center justify-center transition-transform active:scale-95 focus:outline-hidden cursor-pointer ring-2 ring-background"
      >
        <Plus className="size-6" />
      </button>
    </div>
  );
}

import React from 'react';
import {
  ArrowLeft,
  Phone,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Plus,
  Trash2,
  CheckSquare,
  Clock,
  X,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { formatPhoneForDisplay } from '../../utils/whatsapp';
import { WhatsAppMessage, Order } from '../../types';
import { cn } from '../ui/utils';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';

interface ActiveCustomerInfo {
  name: string;
  phone: string;
  customerId?: string;
}

interface ChatAreaProps {
  selectedPhone: string | null;
  activeCustomer: ActiveCustomerInfo | null;
  activeCustomerOrders: Order[];
  displayedMessages: WhatsAppMessage[];
  syncingMessages: boolean;
  inputText: string;
  sending: boolean;
  onClearSelectedPhone: () => void;
  onSyncMessages: () => void;
  onOpenWhatsAppWeb: () => void;
  onDeleteMessage: (msg: WhatsAppMessage) => void;
  onRetryMessage: (msg: WhatsAppMessage) => void;
  onSendMessage: () => void;
  onSetInputText: (val: string) => void;
  onNewChatOpen: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isSelectionMode: boolean;
  selectedMessageIds: Set<string>;
  onToggleSelectionMode: () => void;
  onToggleMessageSelection: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
}

export function ChatArea({
  selectedPhone,
  activeCustomer,
  activeCustomerOrders,
  displayedMessages,
  syncingMessages,
  inputText,
  sending,
  onClearSelectedPhone,
  onSyncMessages,
  onOpenWhatsAppWeb,
  onDeleteMessage,
  onRetryMessage,
  onSendMessage,
  onSetInputText,
  onNewChatOpen,
  messagesEndRef,
  textareaRef,
  onLoadMore,
  hasMore,
  isSelectionMode,
  selectedMessageIds,
  onToggleSelectionMode,
  onToggleMessageSelection,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
}: ChatAreaProps) {
  if (!selectedPhone) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <MessageSquare className="size-8" />
        </div>
        <div className="max-w-md space-y-2">
          <h3 className="text-base font-bold text-foreground">
            Selecione ou inicie uma conversa no WhatsApp
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Interaja diretamente com os clientes através do WhatsApp integrado ao Luisices.
            Envie avisos de produção, cobranças amigáveis e consulte o histórico em tempo real.
          </p>
        </div>
        <Button
          onClick={onNewChatOpen}
          className="bg-primary hover:bg-primary/90 text-white text-xs gap-1.5 cursor-pointer"
        >
          <Plus className="size-4" />
          Iniciar Nova Conversa
        </Button>
      </div>
    );
  }

  const isAllSelected =
    displayedMessages.length > 0 && selectedMessageIds.size === displayedMessages.length;

  return (
    <>
      {/* Header do Chat Selecionado */}
      <div className="px-2.5 sm:px-4 py-2 sm:py-3 border-b luisices-glass flex items-center justify-between gap-2 sm:gap-3 shrink-0 min-w-0">
        {/* Lado Esquerdo: Voltar + Avatar + Dados do Cliente */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Botão Voltar (Mobile First: apenas ícone limpo para não ocupar espaço horizontal) */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden size-8 shrink-0 text-foreground bg-primary/10 hover:bg-primary/20 rounded-full cursor-pointer transition-colors"
            onClick={onClearSelectedPhone}
            title="Voltar para conversas"
            aria-label="Voltar para conversas"
          >
            <ArrowLeft className="size-4" />
          </Button>

          {/* Avatar com inicial do cliente */}
          <Avatar className="size-8 sm:size-9 shrink-0 border border-border/60">
            <AvatarFallback className="bg-primary text-white text-xs font-bold">
              {activeCustomer?.name ? activeCustomer.name.slice(0, 2).toUpperCase() : 'WA'}
            </AvatarFallback>
          </Avatar>

          {/* Nome e Telefone com truncamento seguro (nunca sobrepõe botões à direita) */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-foreground truncate leading-tight">
                {activeCustomer?.name || formatPhoneForDisplay(selectedPhone)}
              </h2>
              {activeCustomerOrders.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-[9px] sm:text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30 font-medium hidden md:inline-flex shrink-0"
                >
                  {activeCustomerOrders.length} ped.
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground truncate leading-tight mt-0.5">
              <Phone className="size-2.5 sm:size-3 shrink-0 opacity-70" />
              <span className="truncate">{formatPhoneForDisplay(selectedPhone)}</span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Ações (Sincronizar, WhatsApp Web, Selecionar) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Botão Sincronizar: ícone compacto no mobile, com texto no desktop */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 sm:px-2.5 text-xs gap-1.5 cursor-pointer rounded-lg"
            onClick={onSyncMessages}
            disabled={syncingMessages}
            title="Sincronizar mensagens recentes do WhatsApp"
          >
            <RefreshCw className={cn('size-3.5', syncingMessages && 'animate-spin')} />
            <span className="hidden md:inline">
              {syncingMessages ? 'Sincronizando...' : 'Sincronizar'}
            </span>
          </Button>

          {/* WhatsApp Web: apenas em telas médias e grandes (oculto no mobile para economizar espaço) */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer rounded-lg hidden sm:inline-flex"
            onClick={onOpenWhatsAppWeb}
            title="Abrir no WhatsApp Web"
          >
            <ExternalLink className="size-3.5" />
            <span className="hidden md:inline">WhatsApp Web</span>
          </Button>

          {/* Botão Selecionar / Cancelar modo de seleção */}
          <Button
            variant={isSelectionMode ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-8 px-2 sm:px-2.5 text-xs gap-1.5 cursor-pointer rounded-lg',
              isSelectionMode
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border-primary/30 text-primary hover:bg-primary/10'
            )}
            onClick={onToggleSelectionMode}
            title={isSelectionMode ? 'Sair do modo de seleção' : 'Selecionar várias mensagens para apagar'}
          >
            {isSelectionMode ? <X className="size-3.5" /> : <CheckSquare className="size-3.5" />}
            <span className="hidden sm:inline">{isSelectionMode ? 'Cancelar' : 'Selecionar'}</span>
          </Button>
        </div>
      </div>

      {/* Área de Mensagens com Rolagem */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10 relative">
        {/* Barra Fixa de Ações no Modo de Seleção */}
        {isSelectionMode && (
          <div className="sticky top-0 z-20 px-4 py-2.5 luisices-glass border border-border/60 shadow-md mb-3 flex flex-col sm:flex-row items-center justify-between rounded-xl gap-2 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <CheckSquare className="size-4 text-primary" />
              <span className="text-xs font-bold text-foreground">
                {selectedMessageIds.size} de {displayedMessages.length} mensagem(ns) selecionada(s)
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={onSelectAll}
                className="h-7 text-xs font-medium cursor-pointer"
              >
                {isAllSelected ? 'Desmarcar Todas' : 'Selecionar Todas'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearSelection}
                className="h-7 text-xs cursor-pointer text-muted-foreground hover:text-foreground"
              >
                Fechar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={onBulkDelete}
                disabled={selectedMessageIds.size === 0}
                className="h-7 text-xs gap-1.5 cursor-pointer font-semibold shadow-xs"
              >
                <Trash2 className="size-3.5" />
                <span>Apagar ({selectedMessageIds.size})</span>
              </Button>
            </div>
          </div>
        )}

        {/* Barra e Botão de Paginação no topo da lista */}
        {hasMore ? (
          <div className="flex flex-col items-center justify-center mb-4 mt-1 gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              className="text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 luisices-glass shadow-xs cursor-pointer rounded-xl h-8 px-3.5"
            >
              <Clock className="size-3.5" />
              <span>Carregar mensagens anteriores (+10)</span>
            </Button>
            <span className="text-[10px] text-muted-foreground font-medium">
              Exibindo as {displayedMessages.length} mensagens mais recentes
            </span>
          </div>
        ) : displayedMessages.length > 0 ? (
          <div className="flex items-center justify-center my-3">
            <span className="text-[10px] text-muted-foreground/80 bg-muted/40 border border-border/30 px-3 py-1 rounded-full font-medium">
              Início da conversa • Todas as {displayedMessages.length} mensagens carregadas
            </span>
          </div>
        ) : null}

        {/* Mensagens ou Estado Vazio */}
        {displayedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6 space-y-3">
            <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <MessageSquare className="size-6" />
            </div>
            <div className="max-w-sm space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Início da conversa com {activeCustomer?.name || formatPhoneForDisplay(selectedPhone)}
              </p>
              <p className="text-xs text-muted-foreground">
                Envie uma mensagem abaixo ou use um dos nossos modelos rápidos pré-formatados.
              </p>
            </div>
          </div>
        ) : (
          displayedMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMe={msg.sender === 'me'}
              onDelete={onDeleteMessage}
              onRetry={onRetryMessage}
              isSelectionMode={isSelectionMode}
              isSelected={selectedMessageIds.has(msg.id)}
              onToggleSelection={() => onToggleMessageSelection(msg.id)}
              onEnterSelectionMode={() => {
                if (!isSelectionMode) onToggleSelectionMode();
                onToggleMessageSelection(msg.id);
              }}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Digitação e Modelos Rápidos */}
      <ChatInput
        inputText={inputText}
        setInputText={onSetInputText}
        sending={sending}
        onSend={onSendMessage}
        activeCustomerName={activeCustomer?.name}
        textareaRef={textareaRef}
      />
    </>
  );
}

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFirebaseCustomers } from '../../hooks/useFirebaseCustomers';
import { useOrders } from '../../contexts/OrdersContext';
import { firebaseWhatsAppService, WhatsAppStatusResult } from '../../services/firebaseWhatsAppService';
import { WhatsAppMessage, WhatsAppConversation, Customer } from '../types';
import { normalizePhoneForWhatsApp, formatPhoneForDisplay } from '../utils/whatsapp';
import { secureRandomId } from '../utils/random';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { MessageSquare, Plus, RefreshCw, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '../components/ui/dialog';
import { cn } from '../components/ui/utils';

// Components
import { ChatSidebar } from '../components/whatsapp/ChatSidebar';
import { ChatArea } from '../components/whatsapp/ChatArea';
import { NewChatModal } from '../components/whatsapp/NewChatModal';

export function WhatsAppChat() {
  const { user, isAdmin } = useAuth();
  const { customers, loading: customersLoading } = useFirebaseCustomers();
  const { orders, isFilterActive, selectedFilterLabel, clearUserFilter } = useOrders();

  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [activeCustomer, setActiveCustomer] = useState<{
    name: string;
    phone: string;
    customerId?: string;
  } | null>(null);

  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [messageLimit, setMessageLimit] = useState(10);
  const [optimisticMessages, setOptimisticMessages] = useState<WhatsAppMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'with_orders'>('all');

  const [newChatModalOpen, setNewChatModalOpen] = useState(false);

  // Status da Conexão WhatsApp
  const [instanceStatus, setInstanceStatus] = useState<WhatsAppStatusResult | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Sincronização e Exclusão de Mensagens
  const [syncingMessages, setSyncingMessages] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<WhatsAppMessage | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);

  // Seleção múltipla
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  };

  const checkStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await firebaseWhatsAppService.getInstanceStatus();
      setInstanceStatus(res);
    } catch {
      // Ignora erro
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    setLoadingConversations(true);
    setConversationError(null);
    const unsubscribe = firebaseWhatsAppService.subscribeConversations(
      (chats) => {
        setConversations(chats);
        setLoadingConversations(false);
      },
      () => {
        setLoadingConversations(false);
        setConversationError('Não foi possível carregar as conversas.');
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedPhone) {
      setMessages([]);
      setOptimisticMessages([]);
      setMessageLimit(10); // Reset limit when changing chats
      return;
    }

    setOptimisticMessages([]);
    const unsubscribe = firebaseWhatsAppService.subscribeMessages(
      selectedPhone, 
      (msgs) => {
        setMessages(msgs);
        if (messageLimit === 10) {
          // Only scroll to bottom on initial load
          setTimeout(() => scrollToBottom('smooth'), 100);
        }
      },
      undefined,
      messageLimit
    );

    firebaseWhatsAppService.markChatAsRead(selectedPhone);

    return () => unsubscribe();
  }, [selectedPhone, messageLimit]);

  useEffect(() => {
    if (!selectedPhone) return;

    const matchedCustomer = customers.find((c) => {
      const cleanCustPhone = normalizePhoneForWhatsApp(c.phone);
      return cleanCustPhone === selectedPhone;
    });

    if (matchedCustomer) {
      setActiveCustomer({
        name: matchedCustomer.name,
        phone: matchedCustomer.phone,
        customerId: matchedCustomer.id,
      });
      return;
    }

    const matchedChat = conversations.find((c) => c.phone === selectedPhone);
    if (matchedChat) {
      setActiveCustomer({
        name: matchedChat.customerName || selectedPhone,
        phone: matchedChat.phone,
        customerId: matchedChat.customerId || undefined,
      });
      return;
    }

    if (!activeCustomer || activeCustomer.phone !== selectedPhone) {
      setActiveCustomer({
        name: selectedPhone,
        phone: selectedPhone,
      });
    }
  }, [selectedPhone, customers, conversations]);

  const mergedConversations = useMemo(() => {
    const map = new Map<string, WhatsAppConversation>();
    const allowedPhones = new Set<string>();
    const allowedCustomerIds = new Set<string>();

    for (const cust of customers) {
      const cleanPhone = normalizePhoneForWhatsApp(cust.phone);
      if (cleanPhone) allowedPhones.add(cleanPhone);
      if (cust.id) allowedCustomerIds.add(cust.id);
    }

    for (const ord of orders) {
      const cleanPhone = normalizePhoneForWhatsApp(ord.customerPhone);
      if (cleanPhone) allowedPhones.add(cleanPhone);
      if (ord.customerId) allowedCustomerIds.add(ord.customerId);
    }

    for (const chat of conversations) {
      const chatPhone = normalizePhoneForWhatsApp(chat.phone) || chat.phone;
      if (isFilterActive) {
        const isBelongingCustomer =
          (chat.customerId && allowedCustomerIds.has(chat.customerId)) ||
          allowedPhones.has(chatPhone);
        if (!isBelongingCustomer) {
          continue;
        }
      } else if (!isAdmin) {
        const isBelongingCustomer =
          (chat.customerId && allowedCustomerIds.has(chat.customerId)) ||
          allowedPhones.has(chatPhone);
        const isSelfChat =
          (chat as any).userId === user?.uid || (chat as any).sentByUid === user?.uid;
        if (!isBelongingCustomer && !isSelfChat) {
          continue;
        }
      }
      map.set(chat.phone, { ...chat });
    }

    for (const cust of customers) {
      const cleanPhone = normalizePhoneForWhatsApp(cust.phone);
      if (!cleanPhone) continue;

      const custOrders = orders.filter((o) => {
        const oPhone = normalizePhoneForWhatsApp(o.customerPhone);
        return oPhone === cleanPhone || (cust.id && o.customerId === cust.id);
      });

      if (map.has(cleanPhone)) {
        const existing = map.get(cleanPhone)!;
        existing.customerName = cust.name || existing.customerName;
        existing.customerId = cust.id;
        existing.orderCount = custOrders.length;
        if (custOrders.length > 0) {
          existing.lastOrderSummary = `${custOrders[0].productName} (${custOrders[0].quantity} un)`;
        }
      } else {
        map.set(cleanPhone, {
          id: cleanPhone,
          phone: cleanPhone,
          customerName: cust.name,
          customerId: cust.id,
          lastMessageText: '',
          lastMessageTimestamp: cust.createdAt || '',
          lastMessageSender: 'customer',
          unreadCount: 0,
          orderCount: custOrders.length,
          lastOrderSummary: custOrders[0]
            ? `${custOrders[0].productName} (${custOrders[0].quantity} un)`
            : undefined,
        });
      }
    }

    let list = Array.from(map.values());

    list.sort((a, b) => {
      const timeA = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
      const timeB = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return (a.customerName || '').localeCompare(b.customerName || '');
    });

    if (filterMode === 'unread') {
      list = list.filter((c) => c.unreadCount > 0);
    } else if (filterMode === 'with_orders') {
      list = list.filter((c) => (c.orderCount || 0) > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.customerName?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.lastMessageText?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [conversations, customers, orders, filterMode, searchQuery, isAdmin, user?.uid]);

  const displayedMessages = useMemo(() => {
    if (optimisticMessages.length === 0) return messages;

    const pending = optimisticMessages.filter((opt) => {
      if (opt.status === 'failed') return true;
      return !messages.some(
        (m) =>
          m.sender === 'me' &&
          m.text === opt.text &&
          Math.abs(new Date(m.timestamp).getTime() - new Date(opt.timestamp).getTime()) < 60000
      );
    });

    return [...messages, ...pending].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [messages, optimisticMessages]);

  const handleRetryFailedMessage = (failedMsg: WhatsAppMessage) => {
    setInputText(failedMsg.text);
    setOptimisticMessages((prev) => prev.filter((m) => m.id !== failedMsg.id));
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    toast.info('Texto restaurado para reenvio.');
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || !selectedPhone) return;

    const tempId = `opt_${Date.now()}_${secureRandomId()}`;
    const tempMsg: WhatsAppMessage = {
      id: tempId,
      chatId: selectedPhone,
      phone: selectedPhone,
      customerName: activeCustomer?.name,
      customerId: activeCustomer?.customerId,
      sender: 'me',
      text,
      status: 'pending',
      timestamp: new Date().toISOString(),
    };

    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setOptimisticMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => scrollToBottom('smooth'), 50);

    setSending(true);
    try {
      await firebaseWhatsAppService.sendMessage(
        selectedPhone,
        text,
        activeCustomer?.name,
        activeCustomer?.customerId
      );
      setTimeout(() => {
        setOptimisticMessages((prev) => prev.filter((m) => m.id !== tempId));
      }, 1000);
      setTimeout(() => scrollToBottom('smooth'), 150);
    } catch (err: any) {
      console.error('[WhatsAppChat] Erro ao enviar mensagem:', err);
      toast.error(err.message || 'Erro ao enviar mensagem para o WhatsApp.');
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete || !selectedPhone || deletingMessage) return;
    setDeletingMessage(true);
    try {
      const res = await firebaseWhatsAppService.deleteMessage(
        selectedPhone,
        messageToDelete.id,
        messageToDelete.evolutionMessageId
      );
      toast.success(res.message || 'Mensagem apagada com sucesso!');
      setMessageToDelete(null);
    } catch (err: any) {
      console.error('[WhatsAppChat] Erro ao apagar mensagem:', err);
      toast.error(err.message || 'Erro ao apagar mensagem.');
    } finally {
      setDeletingMessage(false);
    }
  };

  const handleSyncMessages = async () => {
    if (!selectedPhone || syncingMessages) return;
    setSyncingMessages(true);
    try {
      const res = await firebaseWhatsAppService.syncMessages(selectedPhone);
      if (res.success) {
        toast.success(res.message || `${res.count || 0} mensagem(ns) sincronizada(s)!`);
      } else {
        toast.info(res.message || 'Nenhuma nova mensagem para sincronizar.');
      }
    } catch (err: any) {
      console.error('[WhatsAppChat] Erro ao sincronizar mensagens:', err);
      toast.error(err.message || 'Erro ao sincronizar mensagens com o WhatsApp.');
    } finally {
      setSyncingMessages(false);
    }
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode((prev) => {
      if (prev) setSelectedMessageIds(new Set());
      return !prev;
    });
  };

  const handleToggleMessageSelection = (id: string) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleSelectAll = () => {
    if (selectedMessageIds.size === displayedMessages.length && displayedMessages.length > 0) {
      setSelectedMessageIds(new Set());
    } else {
      setSelectedMessageIds(new Set(displayedMessages.map((m) => m.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedMessageIds(new Set());
    setIsSelectionMode(false);
  };

  const handleOpenBulkDelete = () => {
    if (selectedMessageIds.size === 0 || !selectedPhone) return;
    setBulkDeleteDialogOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedMessageIds.size === 0 || !selectedPhone || bulkDeleting) return;
    setBulkDeleting(true);

    const messagesToDelete = displayedMessages.filter((m) => selectedMessageIds.has(m.id));

    try {
      const results = await Promise.allSettled(
        messagesToDelete.map((msg) =>
          firebaseWhatsAppService.deleteMessage(selectedPhone, msg.id, msg.evolutionMessageId)
        )
      );

      const successCount = results.filter(
        (r) => r.status === 'fulfilled' && (r.value as any)?.success !== false
      ).length;

      if (successCount > 0) {
        toast.success(`${successCount} mensagem(ns) apagada(s) com sucesso!`);
      } else {
        toast.error('Não foi possível apagar as mensagens selecionadas.');
      }
      handleClearSelection();
      setBulkDeleteDialogOpen(false);
    } catch (err: any) {
      console.error('[WhatsAppChat] Erro ao apagar mensagens em lote:', err);
      toast.error(err.message || 'Erro ao apagar mensagens em lote.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSelectChat = (phone: string, name?: string, custId?: string) => {
    const clean = normalizePhoneForWhatsApp(phone);
    setSelectedPhone(clean);
    if (name) {
      setActiveCustomer({
        name,
        phone: clean,
        customerId: custId,
      });
    }
  };

  const handleStartNewChatWithCustomer = (c: Customer) => {
    const clean = normalizePhoneForWhatsApp(c.phone);
    if (!clean) {
      toast.error('Cliente não possui telefone válido.');
      return;
    }
    firebaseWhatsAppService.ensureConversation(clean, c.name, c.id);
    handleSelectChat(clean, c.name, c.id);
    setNewChatModalOpen(false);
  };

  const handleStartCustomChat = (customPhone: string, customName: string) => {
    const clean = normalizePhoneForWhatsApp(customPhone);
    if (!clean || clean.length < 10) {
      toast.error('Por favor, informe um número de telefone com DDD válido.');
      return;
    }
    const name = customName.trim() || formatPhoneForDisplay(clean);
    firebaseWhatsAppService.ensureConversation(clean, name);
    handleSelectChat(clean, name);
    setNewChatModalOpen(false);
  };

  const handleOpenWhatsAppWeb = () => {
    if (!selectedPhone) return;
    const encoded = encodeURIComponent(inputText);
    const url = `https://wa.me/${selectedPhone}${encoded ? `?text=${encoded}` : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const activeCustomerOrders = useMemo(() => {
    if (!selectedPhone) return [];
    return orders.filter((o) => {
      const oPhone = normalizePhoneForWhatsApp(o.customerPhone);
      return oPhone === selectedPhone || (activeCustomer?.customerId && o.customerId === activeCustomer.customerId);
    });
  }, [orders, selectedPhone, activeCustomer]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background min-h-0">
      <div className={`px-3 sm:px-4 py-2 sm:py-2.5 luisices-glass border-b items-center justify-between gap-2 sm:gap-3 shrink-0 min-w-0 ${selectedPhone ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="p-1.5 sm:p-2 bg-primary/10 text-primary rounded-xl shrink-0">
            <MessageSquare className="size-4 sm:size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base md:text-lg font-bold text-foreground truncate">
                Central de Atendimento
              </h1>
              <Badge
                variant="outline"
                className={`text-[9px] sm:text-[10px] px-1.5 py-0 gap-1 font-semibold shrink-0 ${
                  instanceStatus?.connected
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    instanceStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span className="hidden sm:inline">WHATSAPP </span>
                <span>
                  {instanceStatus == null
                    ? 'VERIFICANDO...'
                    : instanceStatus.connected
                      ? 'CONECTADO'
                      : 'DESCONECTADO'}
                </span>
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block truncate">
              Atendimento ao cliente via WhatsApp, histórico em tempo real e modelos rápidos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={checkStatus}
            disabled={checkingStatus}
            className="h-8 px-2 sm:px-2.5 text-xs gap-1.5 cursor-pointer"
            title="Verificar status da conexão"
          >
            <RefreshCw className={`size-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Verificar Conexão</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setNewChatModalOpen(true)}
            className="h-8 px-2.5 sm:px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-1.5 shadow-xs shrink-0 cursor-pointer"
            title="Iniciar Nova Conversa"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Nova Conversa</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      {/* Indicador de Filtro de Parceiro Ativo para Admin */}
      {isFilterActive && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-primary/25 bg-primary/5 text-primary text-xs sm:text-sm shadow-xs backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">
              Exibindo conversas do parceiro: <strong>{selectedFilterLabel}</strong> ({mergedConversations.length} chats)
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearUserFilter}
            className="h-6 text-xs px-2 text-primary hover:bg-primary/10 shrink-0 font-medium"
            title="Limpar filtro e exibir conversas de todos os parceiros"
          >
            Ver todas as conversas
          </Button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <ChatSidebar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterMode={filterMode}
          setFilterMode={setFilterMode}
          loadingConversations={loadingConversations}
          conversationError={conversationError}
          mergedConversations={mergedConversations as any}
          selectedPhone={selectedPhone}
          onSelectChat={handleSelectChat}
          onNewChat={() => setNewChatModalOpen(true)}
        />

        <div
          className={cn(
            'flex-1 flex flex-col h-full bg-background min-w-0 min-h-0',
            selectedPhone
              ? 'fixed inset-0 z-40 md:static md:inset-auto md:z-auto flex'
              : 'hidden md:flex'
          )}
        >
          <ChatArea
            selectedPhone={selectedPhone}
            activeCustomer={activeCustomer as any}
            activeCustomerOrders={activeCustomerOrders}
            displayedMessages={displayedMessages}
            syncingMessages={syncingMessages}
            inputText={inputText}
            sending={sending}
            onClearSelectedPhone={() => setSelectedPhone(null)}
            onSyncMessages={handleSyncMessages}
            onOpenWhatsAppWeb={handleOpenWhatsAppWeb}
            onDeleteMessage={setMessageToDelete}
            onRetryMessage={handleRetryFailedMessage}
            onSendMessage={handleSendMessage}
            onSetInputText={setInputText}
            onNewChatOpen={() => setNewChatModalOpen(true)}
            onLoadMore={() => setMessageLimit((prev) => prev + 10)}
            hasMore={displayedMessages.length >= messageLimit}
            messagesContainerRef={messagesContainerRef}
            messagesEndRef={messagesEndRef}
            textareaRef={textareaRef}
            isSelectionMode={isSelectionMode}
            selectedMessageIds={selectedMessageIds}
            onToggleSelectionMode={handleToggleSelectionMode}
            onToggleMessageSelection={handleToggleMessageSelection}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            onBulkDelete={handleOpenBulkDelete}
          />
        </div>
      </div>

      <NewChatModal
        open={newChatModalOpen}
        onOpenChange={setNewChatModalOpen}
        customers={customers}
        customersLoading={customersLoading}
        onStartCustomerChat={handleStartNewChatWithCustomer}
        onStartCustomChat={handleStartCustomChat}
      />

      <Dialog
        open={Boolean(messageToDelete)}
        onOpenChange={(open) => {
          if (!open && !deletingMessage) setMessageToDelete(null);
        }}
      >
        <DialogContent size="sm" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="size-4 sm:size-5" />
              <span>Apagar mensagem?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta ação apagará a mensagem para todos no WhatsApp e removerá do histórico do sistema.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="px-4 sm:px-6 py-4 space-y-3">
            {messageToDelete && (
              <div className="p-3 bg-muted/60 border rounded-lg text-xs text-foreground whitespace-pre-wrap max-h-36 overflow-y-auto">
                {messageToDelete.text}
              </div>
            )}
          </DialogBody>

          <DialogFooter className="px-4 sm:px-6 py-3 border-t luisices-glass flex items-center justify-end gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={deletingMessage}
              onClick={() => setMessageToDelete(null)}
              className="h-8 text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deletingMessage}
              onClick={handleDeleteMessage}
              className="h-8 text-xs gap-1.5 font-semibold cursor-pointer"
            >
              {deletingMessage ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              <span>{deletingMessage ? 'Apagando...' : 'Apagar para Todos'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !bulkDeleting) setBulkDeleteDialogOpen(false);
        }}
      >
        <DialogContent size="sm" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="size-4 sm:size-5" />
              <span>Apagar {selectedMessageIds.size} mensagem(ns)?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta ação tentará apagar as mensagens selecionadas para todos no WhatsApp e remover do sistema. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="px-4 sm:px-6 py-3 border-t luisices-glass flex items-center justify-end gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={bulkDeleting}
              onClick={() => setBulkDeleteDialogOpen(false)}
              className="h-8 text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={bulkDeleting}
              onClick={handleConfirmBulkDelete}
              className="h-8 text-xs gap-1.5 font-semibold cursor-pointer"
            >
              {bulkDeleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              <span>{bulkDeleting ? 'Apagando...' : `Confirmar e Apagar (${selectedMessageIds.size})`}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default WhatsAppChat;

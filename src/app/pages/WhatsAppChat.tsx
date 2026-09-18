import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFirebaseCustomers } from '../../hooks/useFirebaseCustomers';
import { useOrders } from '../../contexts/OrdersContext';
import { firebaseWhatsAppService, WhatsAppStatusResult } from '../../services/firebaseWhatsAppService';
import { WhatsAppMessage, WhatsAppConversation, Customer } from '../types';
import { normalizePhoneForWhatsApp, formatPhoneForDisplay } from '../utils/whatsapp';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Phone,
  Check,
  CheckCheck,
  Clock,
  User,
  Package,
  Sparkles,
  Loader2,
  Copy,
  Info,
  ShieldCheck,
  Store,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

const QUICK_TEMPLATES = [
  {
    id: 'ready',
    label: '📦 Pronto p/ Retirada',
    title: 'Pedido Pronto para Retirada',
    getText: (name: string) =>
      `Olá, ${name || 'cliente'}! 👋\n\nÓtima notícia: seu pedido personalizado está finalizado com todo carinho e já está disponível para retirada no ateliê! ✨📦\n\nQualquer dúvida sobre horários de retirada, estamos à disposição!`,
  },
  {
    id: 'production',
    label: '🔄 Em Produção',
    title: 'Pedido em Produção',
    getText: (name: string) =>
      `Olá, ${name || 'cliente'}! 👋\n\nPassando para avisar que seu pedido já entrou na nossa esteira de produção e impressão! 👕✂️\n\nAssim que finalizarmos e embalarmos, avisamos você imediatamente!`,
  },
  {
    id: 'payment',
    label: '💰 Cobrança Amigável',
    title: 'Lembrete Amigável de Pagamento',
    getText: (name: string) =>
      `Olá, ${name || 'cliente'}! Tudo bem? 😊\n\nPassando apenas para enviar o lembrete referente ao pagamento/sinal do seu pedido na Luisices.\n\nAceitamos PIX e Cartão de Crédito. Se precisar da chave ou link atualizado, só nos avisar! Obrigado pela parceria! 🙏`,
  },
  {
    id: 'confirm',
    label: '🧾 Confirmação',
    title: 'Confirmação do Pedido',
    getText: (name: string) =>
      `Olá, ${name || 'cliente'}! 👋\n\nSeu pedido foi registrado com sucesso em nosso sistema! 🧾\n\nJá estamos preparando os detalhes. Obrigado pela confiança na Luisices!`,
  },
  {
    id: 'catalog',
    label: '🛍️ Catálogo Lojinha',
    title: 'Link da Vitrine Online',
    getText: (name: string) =>
      `Olá, ${name || 'cliente'}! 👋\n\nConfira os produtos e lançamentos exclusivos na nossa vitrine online:\nhttps://luisices.com.br/loja\n\nQualquer item que desejar personalizar, é só falar com a gente por aqui! 👕✨`,
  },
];

export function WhatsAppChat() {
  const { user } = useAuth();
  const { customers, loading: customersLoading } = useFirebaseCustomers();
  const { orders } = useOrders();

  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [activeCustomer, setActiveCustomer] = useState<{
    name: string;
    phone: string;
    customerId?: string;
  } | null>(null);

  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'with_orders'>('all');

  // Modal Nova Conversa
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [modalCustomerSearch, setModalCustomerSearch] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customName, setCustomName] = useState('');

  // Status da Instância Evolution API
  const [instanceStatus, setInstanceStatus] = useState<WhatsAppStatusResult | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Verifica status da Evolution API
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

  // Escuta conversas em tempo real
  useEffect(() => {
    const unsubscribe = firebaseWhatsAppService.subscribeConversations((chats) => {
      setConversations(chats);
    });
    return () => unsubscribe();
  }, []);

  // Escuta mensagens da conversa selecionada
  useEffect(() => {
    if (!selectedPhone) {
      setMessages([]);
      return;
    }

    const unsubscribe = firebaseWhatsAppService.subscribeMessages(selectedPhone, (msgs) => {
      setMessages(msgs);
      setTimeout(() => scrollToBottom('smooth'), 100);
    });

    // Marca conversa como lida
    firebaseWhatsAppService.markChatAsRead(selectedPhone);

    return () => unsubscribe();
  }, [selectedPhone]);

  // Mantém os dados do cliente ativo sincronizados
  useEffect(() => {
    if (!selectedPhone) return;

    // 1. Tenta achar na lista de clientes cadastrados
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

    // 2. Tenta achar na lista de conversas
    const matchedChat = conversations.find((c) => c.phone === selectedPhone);
    if (matchedChat) {
      setActiveCustomer({
        name: matchedChat.customerName || selectedPhone,
        phone: matchedChat.phone,
        customerId: matchedChat.customerId || undefined,
      });
      return;
    }

    // 3. Fallback
    if (!activeCustomer || activeCustomer.phone !== selectedPhone) {
      setActiveCustomer({
        name: selectedPhone,
        phone: selectedPhone,
      });
    }
  }, [selectedPhone, customers, conversations]);

  // Lista combinada de contatos/conversas
  const mergedConversations = useMemo(() => {
    const map = new Map<string, WhatsAppConversation>();

    // Adiciona conversas existentes
    for (const chat of conversations) {
      map.set(chat.phone, { ...chat });
    }

    // Mescla clientes com pedidos ou cadastrados para que sempre apareçam na busca
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
        // Cria entrada de conversa virtual para clientes cadastrados
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

    // Ordenação: primeiro quem tem mensagens recentes, depois ordem alfabética de clientes
    list.sort((a, b) => {
      const timeA = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
      const timeB = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return (a.customerName || '').localeCompare(b.customerName || '');
    });

    // Filtros
    if (filterMode === 'unread') {
      list = list.filter((c) => c.unreadCount > 0);
    } else if (filterMode === 'with_orders') {
      list = list.filter((c) => (c.orderCount || 0) > 0);
    }

    // Busca
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
  }, [conversations, customers, orders, filterMode, searchQuery]);

  // Envio de mensagem
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedPhone || sending) return;

    setSending(true);
    try {
      await firebaseWhatsAppService.sendMessage(
        selectedPhone,
        text,
        activeCustomer?.name,
        activeCustomer?.customerId
      );
      setInputText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      toast.success('Mensagem enviada com sucesso!');
      setTimeout(() => scrollToBottom('smooth'), 150);
    } catch (err: any) {
      console.error('[WhatsAppChat] Erro ao enviar mensagem:', err);
      toast.error(err.message || 'Erro ao enviar mensagem via Evolution API.');
    } finally {
      setSending(false);
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
    setModalCustomerSearch('');
  };

  const handleStartCustomChat = () => {
    const clean = normalizePhoneForWhatsApp(customPhone);
    if (!clean || clean.length < 10) {
      toast.error('Por favor, informe um número de telefone com DDD válido.');
      return;
    }
    const name = customName.trim() || formatPhoneForDisplay(clean);
    firebaseWhatsAppService.ensureConversation(clean, name);
    handleSelectChat(clean, name);
    setNewChatModalOpen(false);
    setCustomPhone('');
    setCustomName('');
  };

  const handleApplyTemplate = (tmpl: (typeof QUICK_TEMPLATES)[0]) => {
    const generated = tmpl.getText(activeCustomer?.name || '');
    setInputText(generated);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
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
    <div className="flex flex-col h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] overflow-hidden bg-background">
      {/* Barra de Status e Cabeçalho Geral */}
      <div className="px-4 py-2.5 bg-card/80 border-b flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <MessageSquare className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-foreground">Central WhatsApp</h1>
              <Badge
                variant="outline"
                className={`text-[10px] gap-1 font-semibold ${
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
                {instanceStatus?.connected ? 'EVOLUTION API CONECTADA' : 'EVOLUTION API'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Envio direto via Evolution API, histórico em tempo real e modelos rápidos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkStatus}
            disabled={checkingStatus}
            className="h-8 text-xs gap-1.5"
            title="Verificar status da conexão"
          >
            <RefreshCw className={`size-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Verificar Conexão</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setNewChatModalOpen(true)}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>Nova Conversa</span>
          </Button>
        </div>
      </div>

      {/* Corpo Principal (Split Pane) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Painel Esquerdo: Lista de Conversas e Contatos */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r bg-card/40 flex flex-col h-full shrink-0 ${
            selectedPhone ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Busca e Filtros */}
          <div className="p-3 border-b space-y-2 bg-card/60">
            <div className="relative">
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
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                  filterMode === 'all'
                    ? 'bg-emerald-600 text-white'
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
                    ? 'bg-emerald-600 text-white'
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
                    ? 'bg-emerald-600 text-white'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                Com Pedidos
              </button>
            </div>
          </div>

          {/* Lista de Chats */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {mergedConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground space-y-3">
                <MessageSquare className="size-8 mx-auto opacity-30" />
                <p className="text-xs">Nenhuma conversa encontrada.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                  onClick={() => setNewChatModalOpen(true)}
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
                    onClick={() => handleSelectChat(chat.phone, chat.customerName, chat.customerId || undefined)}
                    className={`w-full text-left p-3 transition-colors flex items-start gap-3 hover:bg-muted/40 ${
                      isSelected ? 'bg-emerald-500/10 border-l-4 border-l-emerald-600' : ''
                    }`}
                  >
                    <Avatar className="size-10 shrink-0 border border-border">
                      <AvatarFallback className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
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
                          <Badge className="bg-emerald-600 text-white text-[10px] h-4.5 px-1.5 font-bold rounded-full">
                            {chat.unreadCount}
                          </Badge>
                        )}
                      </div>

                      {hasOrders && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
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
        </div>

        {/* Painel Direito: Chat Ativo */}
        <div
          className={`flex-1 flex flex-col h-full bg-background min-w-0 ${
            !selectedPhone ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedPhone ? (
            <>
              {/* Header do Chat Selecionado */}
              <div className="px-4 py-3 border-b bg-card/60 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden size-8 shrink-0 text-muted-foreground"
                    onClick={() => setSelectedPhone(null)}
                  >
                    <ArrowLeft className="size-4" />
                  </Button>

                  <Avatar className="size-9 shrink-0 border">
                    <AvatarFallback className="bg-emerald-600 text-white text-xs font-bold">
                      {activeCustomer?.name ? activeCustomer.name.slice(0, 2).toUpperCase() : 'WA'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-foreground truncate">
                        {activeCustomer?.name || formatPhoneForDisplay(selectedPhone)}
                      </h2>
                      {activeCustomerOrders.length > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium hidden sm:inline-flex"
                        >
                          {activeCustomerOrders.length} Pedido(s)
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="size-3 shrink-0" />
                      <span>{formatPhoneForDisplay(selectedPhone)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={handleOpenWhatsAppWeb}
                    title="Abrir no WhatsApp Web"
                  >
                    <ExternalLink className="size-3.5" />
                    <span className="hidden sm:inline">WhatsApp Web</span>
                  </Button>
                </div>
              </div>

              {/* Área de Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6 space-y-3">
                    <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
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
                  messages.map((msg) => {
                    const isMe = msg.sender === 'me';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-xs ${
                            isMe
                              ? 'bg-emerald-600 text-white rounded-tr-none'
                              : 'bg-card text-foreground border rounded-tl-none'
                          }`}
                        >
                          <div>{msg.text}</div>
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                              isMe ? 'text-emerald-100' : 'text-muted-foreground'
                            }`}
                          >
                            <span>
                              {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMe && (
                              <span>
                                {msg.status === 'read' ? (
                                  <CheckCheck className="size-3 text-cyan-200" />
                                ) : msg.status === 'delivered' ? (
                                  <CheckCheck className="size-3" />
                                ) : (
                                  <Check className="size-3" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Barra de Modelos Rápidos (Quick Replies) */}
              <div className="px-3 py-2 border-t bg-muted/20 flex items-center gap-1.5 overflow-x-auto shrink-0">
                <span className="text-[10px] font-semibold text-muted-foreground shrink-0 uppercase tracking-wide flex items-center gap-1">
                  <Sparkles className="size-3 text-amber-500" />
                  Modelos Rápidos:
                </span>
                {QUICK_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-background hover:bg-emerald-500/10 border text-foreground transition-colors shrink-0 font-medium"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>

              {/* Caixa de Entrada de Mensagem */}
              <div className="p-3 border-t bg-card/80 flex flex-col gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-end gap-2"
                >
                  <Textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={1}
                    placeholder="Digite uma mensagem para o cliente... (Enter envia)"
                    className="text-xs sm:text-sm bg-background min-h-[42px] max-h-32 resize-none py-2.5 leading-tight flex-1"
                    disabled={sending}
                  />

                  <Button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="h-[42px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shrink-0 shadow-xs"
                  >
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    <span className="hidden sm:inline">
                      {sending ? 'Enviando...' : 'Enviar para o WhatsApp'}
                    </span>
                  </Button>
                </form>

                <p className="text-[10px] text-center text-muted-foreground hidden sm:block">
                  💡 Pressione <kbd className="px-1 py-0.5 text-[9px] bg-muted border rounded font-mono">Enter</kbd> para enviar ou <kbd className="px-1 py-0.5 text-[9px] bg-muted border rounded font-mono">Shift+Enter</kbd> para pular linha.
                </p>
              </div>
            </>
          ) : (
            // Estado vazio quando nenhuma conversa estiver selecionada
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <MessageSquare className="size-8" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-base font-bold text-foreground">
                  Selecione ou inicie uma conversa no WhatsApp
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Interaja diretamente com os clientes através da Evolution API integrada ao Luisices.
                  Envie avisos de produção, cobranças amigáveis e consulte o histórico em tempo real.
                </p>
              </div>
              <Button
                onClick={() => setNewChatModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                <Plus className="size-4" />
                Iniciar Nova Conversa
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nova Conversa */}
      <Dialog open={newChatModalOpen} onOpenChange={setNewChatModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <MessageSquare className="size-5 text-emerald-600" />
              Iniciar Conversa no WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione um cliente cadastrado ou digite um número avulso para abrir o chat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Opção 1: Selecionar de Clientes Cadastrados */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Clientes Cadastrados no Luisices:
              </label>
              <div className="relative">
                <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  value={modalCustomerSearch}
                  onChange={(e) => setModalCustomerSearch(e.target.value)}
                  placeholder="Pesquisar por nome ou telefone..."
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y divide-border/60">
                {customers
                  .filter((c) => {
                    if (!modalCustomerSearch.trim()) return true;
                    const q = modalCustomerSearch.toLowerCase();
                    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
                  })
                  .slice(0, 10)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleStartNewChatWithCustomer(c)}
                      className="w-full p-2 text-left text-xs flex items-center justify-between hover:bg-emerald-500/10 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{c.name}</div>
                        <div className="text-[11px] text-muted-foreground">{formatPhoneForDisplay(c.phone)}</div>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-border w-full" />
              <span className="bg-background px-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                ou número avulso
              </span>
            </div>

            {/* Opção 2: Inserir Número Manual */}
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Nome do Contato (Opcional):
                </label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Número de WhatsApp (com DDD):
                </label>
                <Input
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="Ex: 11999998888"
                  className="h-8 text-xs"
                />
              </div>

              <Button
                onClick={handleStartCustomChat}
                disabled={!customPhone.trim()}
                className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold mt-2"
              >
                Abrir Chat com este Número
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default WhatsAppChat;

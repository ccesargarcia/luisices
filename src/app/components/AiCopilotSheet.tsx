import React, { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Trash2,
  ArrowRight,
  Loader2,
  Calendar,
  Phone,
  Package,
  FileText,
  MessageSquare,
  Copy,
  ExternalLink,
  Check,
  Calculator,
  ShieldAlert,
  Lock,
  Paperclip,
  Images,
  ZoomIn,
  X,
  ChevronDown,
  Minimize2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrdersContext';
import { firebaseAiAgentService } from '../../services/firebaseAiAgentService';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { useFirebaseCustomers } from '../../hooks/useFirebaseCustomers';
import {
  AiChatMessage,
  AiOrderDraft,
  AiWhatsAppDraft,
  AiPricingEstimate,
  AiCopilotSheetProps,
  Order,
  OrderStatus,
} from '../types';
import { OrderDetailsDialog } from './OrderDetailsDialog';
import { toast } from 'sonner';
import { formatCurrency } from '../utils/currency';
import { optimizeImageForAi } from '../utils/imageOptimizer';

export type { AiCopilotSheetProps };

const INITIAL_MESSAGE: AiChatMessage = {
  id: 'init-1',
  role: 'assistant',
  text: 'Olá! Sou a assistente do Ateliê Luisices. 👕✨\n\nPosso te ajudar a consultar pedidos e prazos, verificar o resumo do dia, pesquisar fotos e modelos no acervo, calcular custos e preços sugeridos, redigir mensagens para WhatsApp ou montar rascunhos de novos pedidos.\n\nComo posso te ajudar hoje?',
  timestamp: new Date().toISOString(),
};

function cleanHumanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/(?:a\s+)?(?:ferramenta|função|funcao|endpoint|método|metodo)\s*[`'"]?(calculate_pricing_estimate|query_orders_view|extract_order_draft|generate_whatsapp_message|daily_briefing|get_financial_summary|get_user_summary|query_customers|search_gallery_portfolio|enrichGalleryItemWithAi)[`'"]?/gi, 'assistente')
    .replace(/[`'"]?(calculate_pricing_estimate|query_orders_view|extract_order_draft|generate_whatsapp_message|daily_briefing|get_financial_summary|get_user_summary|query_customers|search_gallery_portfolio)[`'"]?/gi, 'assistente');
}

const PROGRESS_STEPS = [
  'Analisando sua solicitação...',
  'Consultando pedidos e acervo do ateliê...',
  'Calculando prazos e valores...',
  'Formatando resposta...',
];

const SUGGESTIONS = [
  '📋 Raio-X do Dia (Briefing de produção e prazos)',
  '📸 Como publicar produtos em lote por fotos na lojinha?',
  '👥 Quais pedidos estão atribuídos à minha equipe?',
  '💬 Gerar mensagem de cobrança amigável para cliente',
  '💰 Quanto cobrar por 30 camisetas pretas silk 1 cor?',
  '🖼️ Buscar fotos e modelos de camisetas na nossa galeria',
  '⚠️ Quais pedidos correm risco de atraso?',
];

interface WhatsAppComposerProps {
  draft: AiWhatsAppDraft;
  onSendVariantRequest: (promptText: string) => void;
  disabled?: boolean;
}

function WhatsAppComposer({ draft, onSendVariantRequest, disabled }: WhatsAppComposerProps) {
  const { hasPermission, isAdmin } = useAuth();
  const canUseWhatsApp = isAdmin || hasPermission((p) => Boolean(p?.whatsapp));
  const { customers } = useFirebaseCustomers();
  const [phone, setPhone] = useState(draft.recipientPhone || '');
  const [recipientName, setRecipientName] = useState(draft.recipientName || '');
  const [message, setMessage] = useState(draft.messageText || '');
  const [copied, setCopied] = useState(false);
  const [sendingViaApi, setSendingViaApi] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    setMessage(draft.messageText || '');
    let resolvedPhone = draft.recipientPhone || '';
    if (!resolvedPhone && draft.recipientName && customers.length > 0) {
      const term = draft.recipientName.toLowerCase().trim();
      const matched = customers.find(
        (c) => c.name && (c.name.toLowerCase().includes(term) || term.includes(c.name.toLowerCase()))
      );
      if (matched && matched.phone) {
        resolvedPhone = matched.phone;
      }
    }
    setPhone(resolvedPhone);
    if (draft.recipientName) setRecipientName(draft.recipientName);
    setSentSuccess(false);
  }, [draft, customers]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Mensagem copiada para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar texto.');
    }
  };

  const handleSendViaWhatsAppApi = async () => {
    if (!canUseWhatsApp) {
      toast.error('Seu usuário não possui permissão para disparar mensagens no módulo de Atendimento.');
      return;
    }
    if (!phone.trim()) {
      toast.error('Por favor, informe o número de WhatsApp do destinatário.');
      return;
    }
    if (!message.trim()) {
      toast.error('A mensagem não pode estar vazia.');
      return;
    }

    setSendingViaApi(true);
    try {
      const res = await firebaseAiAgentService.sendWhatsAppDirectMessage(phone, message);
      setSentSuccess(true);
      toast.success(res.message || 'Mensagem enviada com sucesso para o WhatsApp!');
    } catch (err: any) {
      console.error('[WhatsAppComposer] Erro ao disparar mensagem:', err);
      toast.error(err.message || 'Erro ao enviar para o WhatsApp. Você pode usar a opção de abrir no WhatsApp Web.');
    } finally {
      setSendingViaApi(false);
    }
  };

  const handleSendToWhatsAppWeb = () => {
    const cleanDigits = phone.replace(/\D/g, '');
    let formattedPhone = cleanDigits;
    if (cleanDigits.length === 10 || cleanDigits.length === 11) {
      formattedPhone = `55${cleanDigits}`;
    }
    const encodedText = encodeURIComponent(message);
    const url = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const VARIANTS = [
    { type: 'cobranca', label: '💰 Cobrança', prompt: 'Gerar mensagem de cobrança amigável para este pedido' },
    { type: 'status_producao', label: '🔄 Produção', prompt: 'Gerar mensagem avisando que o pedido entrou em produção' },
    { type: 'pronto_retirada', label: '📦 Retirada', prompt: 'Gerar mensagem avisando que o pedido está pronto para retirada' },
    { type: 'confirmacao_pedido', label: '🧾 Confirmação', prompt: 'Gerar mensagem de confirmação do pedido recebido' },
  ];

  return (
    <div className="mt-3 p-3.5 bg-emerald-500/5 border border-emerald-500/30 rounded-xl space-y-3 text-foreground shadow-xs">
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
          <MessageSquare className="size-4" />
          Central WhatsApp (Disparo Direto & Revisão)
        </span>
        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold">
          WHATSAPP INTEGRADO
        </Badge>
      </div>

      {!canUseWhatsApp && (
        <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Envio direto bloqueado: seu usuário não possui permissão no módulo de Atendimento. Você pode copiar o texto abaixo.</span>
        </div>
      )}

      {sentSuccess && (
        <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/40 rounded-lg text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <Check className="size-4 text-emerald-600 shrink-0" />
          <span>Mensagem disparada com sucesso para o WhatsApp!</span>
        </div>
      )}

      {/* Seletor rápido de tipos de mensagem */}
      <div className="space-y-1">
        <span className="text-[10px] font-medium text-muted-foreground">Trocar formato da mensagem com 1 clique:</span>
        <div className="flex flex-wrap gap-1">
          {VARIANTS.map((v) => (
            <button
              key={v.type}
              type="button"
              onClick={() => onSendVariantRequest(`${v.prompt} para ${recipientName || 'o cliente'}`)}
              disabled={disabled || sendingViaApi}
              className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                draft.type === v.type
                  ? 'bg-emerald-600 text-white border-emerald-600 font-medium'
                  : 'bg-background hover:bg-emerald-500/10 text-foreground border-border'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campos de contato */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5 font-medium">Nome do Cliente:</label>
          <Input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Nome do cliente"
            disabled={sendingViaApi}
            className="h-8 text-xs bg-background"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5 font-medium">WhatsApp do Destinatário:</label>
          <div className="relative">
            <Phone className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 11999998888"
              disabled={sendingViaApi}
              className="h-8 text-xs pl-8 bg-background"
            />
          </div>
        </div>
      </div>

      {/* Editor do Texto da Mensagem */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-muted-foreground font-medium">Texto da Mensagem (Revise e edite livremente):</label>
          <span className="text-[10px] text-muted-foreground font-mono">{message.length} caracteres</span>
        </div>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          disabled={sendingViaApi}
          placeholder="Digite ou ajuste a mensagem..."
          className="text-xs bg-background font-mono leading-relaxed"
        />
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1 gap-1.5 text-xs sm:text-sm h-10 sm:h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
          onClick={handleSendViaWhatsAppApi}
          disabled={sendingViaApi || !message.trim() || !canUseWhatsApp}
          title={!canUseWhatsApp ? 'Você não possui permissão para envio de mensagens no módulo de Atendimento' : undefined}
        >
          {sendingViaApi ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          <span>{sendingViaApi ? 'Enviando...' : 'Enviar para o WhatsApp'}</span>
        </Button>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 sm:flex-initial gap-1.5 text-xs h-10 sm:h-9"
            onClick={handleSendToWhatsAppWeb}
            title="Abrir no WhatsApp Web/App como alternativa"
          >
            <ExternalLink className="size-3.5" />
            <span>WhatsApp Web</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-xs h-10 sm:h-9 px-3 border border-border sm:border-transparent"
            onClick={handleCopy}
            title="Copiar texto"
          >
            {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AiCopilotSheet({
  open,
  onOpenChange,
  onApplyOrderDraft,
  onOpenOrderDetails,
}: AiCopilotSheetProps) {
  const { user, isAdmin, hasPermission } = useAuth();
  const canAccessAiCopilot = isAdmin || hasPermission((p) => Boolean(p?.aiCopilot));
  const { orders, allOrders } = useOrders();

  const storageKey = `luisices_ai_chat_history_${user?.uid || 'guest'}`;

  const [messages, setMessages] = useState<AiChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed[0]?.id === 'init-1') {
            parsed[0] = INITIAL_MESSAGE;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[AiCopilot] Erro ao carregar histórico salvo:', e);
    }
    return [INITIAL_MESSAGE];
  });

  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [progressStepIndex, setProgressStepIndex] = useState(0);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [quota, setQuota] = useState<import('../types').AiUsageData | null>(null);
  const [attachedImage, setAttachedImage] = useState<{
    preview: string;
    base64: string;
    mimeType: string;
    name: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincroniza histórico quando o usuário ou storageKey mudar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed[0]?.id === 'init-1') {
            parsed[0] = INITIAL_MESSAGE;
          }
          setMessages(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('[AiCopilot] Erro ao sincronizar histórico com usuário:', e);
    }
    setMessages([INITIAL_MESSAGE]);
  }, [storageKey]);

  // Persiste no localStorage limitando às 20 mensagens mais recentes
  useEffect(() => {
    try {
      if (messages.length === 1 && messages[0].id === INITIAL_MESSAGE.id) {
        return;
      }
      const trimmed = messages.slice(-20);
      localStorage.setItem(storageKey, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('[AiCopilot] Erro ao salvar histórico no localStorage:', e);
    }
  }, [messages, storageKey]);

  // Cooldown de 3 segundos decrementado a cada segundo
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Alterna mensagens de progresso a cada 1.5s enquanto carrega
  useEffect(() => {
    if (!loading) {
      setProgressStepIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setProgressStepIndex((prev) => (prev + 1) % PROGRESS_STEPS.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [loading]);

  const fetchQuota = async () => {
    if (!isAdmin) return;
    try {
      const data = await firebaseAiAgentService.getAiUsage();
      setQuota(data);
    } catch {
      // Ignora erro
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) {
      setTimeout(scrollToBottom, 150);
      if (isAdmin) {
        fetchQuota();
      }
    }
  }, [open, messages, loading, isAdmin]);

  const handleImagePick = async (file: File) => {
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validMimes.includes(file.type)) {
      toast.error('Formato não suportado. Envie JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 15MB.');
      return;
    }

    try {
      // Otimiza e redimensiona para no máximo 800px WebP para economizar tokens de IA e latência
      const processedFile = await optimizeImageForAi(file);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setAttachedImage({
          preview: dataUrl,
          base64: dataUrl,
          mimeType: processedFile.type,
          name: processedFile.name,
        });
        toast.success('Imagem otimizada e anexada para análise visual');
      };
      reader.readAsDataURL(processedFile);
    } catch (err) {
      console.warn('[AiCopilotSheet] Falha ao otimizar imagem, usando original:', err);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setAttachedImage({
          preview: dataUrl,
          base64: dataUrl,
          mimeType: file.type,
          name: file.name,
        });
        toast.success('Imagem anexada para análise visual');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleImagePick(file);
            break;
          }
        }
      }
    }
  };

  const handleSend = async (textToSend?: string) => {
    if (loading || cooldownSeconds > 0) return;

    const messageText = (textToSend || input).trim();
    if ((!messageText && !attachedImage) || loading) return;

    const currentImage = attachedImage;
    const finalMessageText = messageText || 'Analise detalhadamente esta imagem enviada: identifique o tipo de produto, cores, detalhes visuais, materiais e possíveis técnicas de personalização.';

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: finalMessageText,
      timestamp: new Date().toISOString(),
      imageUrl: currentImage?.preview,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachedImage(null);
    setShowSuggestions(false);
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== 'init-1')
        .map(m => ({ role: m.role, text: m.text }));

      const imagePayload = currentImage
        ? { base64: currentImage.base64, mimeType: currentImage.mimeType }
        : null;

      const response = await firebaseAiAgentService.sendMessage(finalMessageText, history, imagePayload);

      const assistantMsg: AiChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: response.reply || 'Não foi possível obter resposta.',
        timestamp: new Date().toISOString(),
        orderDraft: response.orderDraft || null,
        whatsappDraft: response.whatsappDraft || null,
        pricingEstimate: response.pricingEstimate || null,
        galleryItems: response.galleryItems || null,
      };

      setMessages(prev => [...prev, assistantMsg]);
      if (isAdmin) {
        fetchQuota();
      }
    } catch (err: any) {
      console.error('[AiCopilot] Erro ao enviar mensagem:', err);
      toast.error(err.message || 'Erro ao comunicar com o Copiloto de IA.');
      const errorMsg: AiChatMessage = {
        id: `assistant-err-${Date.now()}`,
        role: 'assistant',
        text: 'Desculpe, ocorreu um erro ao processar sua solicitação. Verifique se a chave de IA está configurada ou tente novamente em instantes.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setCooldownSeconds(3);
    }
  };

  const handleClearHistory = () => {
    setMessages([INITIAL_MESSAGE]);
    setShowSuggestions(true);
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.warn('[AiCopilot] Erro ao limpar histórico:', e);
    }
    toast.success('Histórico do Copiloto limpo com sucesso!');
  };

  const handleOrderChipClick = (orderNumberStr: string) => {
    const cleanTarget = orderNumberStr.replace(/^#/, '').trim().toLowerCase();
    const pool = allOrders && allOrders.length > 0 ? allOrders : orders;

    const found = pool.find((o) => {
      if (!o) return false;
      const oNum = (o.orderNumber || '').replace(/^#/, '').trim().toLowerCase();
      if (oNum === cleanTarget) return true;
      if (o.id.toLowerCase() === cleanTarget || o.id === orderNumberStr) return true;
      if (/^\d+$/.test(cleanTarget) && oNum.endsWith(`-${cleanTarget}`)) return true;
      return false;
    });

    if (found) {
      if (onOpenOrderDetails) {
        onOpenOrderDetails(found);
      } else {
        setSelectedOrderForDetails(found);
        setOrderDetailsOpen(true);
      }
    } else {
      toast.info(`Pedido ${orderNumberStr} identificado`);
    }
  };

  const handleUpdateStatusInSheet = async (orderId: string, status: OrderStatus) => {
    try {
      await firebaseOrderService.updateOrderStatus(orderId, status);
      if (selectedOrderForDetails && selectedOrderForDetails.id === orderId) {
        setSelectedOrderForDetails((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      toast.error('Erro ao atualizar status do pedido');
    }
  };

  const renderMessageTextWithOrderLinks = (text: string) => {
    if (!text) return null;
    const regex = /(#(?:\d{4}-\d{3,}|\d{3,5})\b)/g;
    const parts = text.split(regex);

    if (parts.length === 1) {
      return text;
    }

    return parts.map((part, idx) => {
      if (/^#(?:\d{4}-\d{3,}|\d{3,5})$/.test(part)) {
        return (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOrderChipClick(part);
            }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs cursor-pointer transition-colors align-baseline mx-0.5"
            title={`Abrir detalhes do pedido ${part}`}
          >
            <Package className="size-3 shrink-0" />
            <span>{part}</span>
          </button>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const handleApplyDraft = (draft: AiOrderDraft) => {
    if (onApplyOrderDraft) {
      onApplyOrderDraft(draft);
      onOpenChange(false);
      toast.info('Dados carregados no formulário de Novo Pedido!');
    }
  };

  if (!canAccessAiCopilot) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 flex flex-col h-[100dvh] max-h-[100dvh] bg-background border-l shadow-2xl overflow-hidden"
      >
        {/* Barra superior de toque para minimizar no mobile */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="sm:hidden w-full flex flex-col items-center justify-center py-2 bg-muted/30 hover:bg-muted/60 active:bg-muted/80 transition-colors border-b border-border/30 shrink-0 cursor-pointer"
          title="Toque para minimizar o chat"
          aria-label="Minimizar Copiloto de IA"
        >
          <div className="w-10 h-1 bg-muted-foreground/40 rounded-full mb-0.5" />
          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
            <ChevronDown className="size-3" /> Toque para minimizar
          </span>
        </button>

        {/* Header */}
        <SheetHeader className="px-3.5 sm:px-4 py-2.5 sm:py-3 border-b flex-shrink-0 bg-card/70 backdrop-blur-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 sm:p-2 bg-amber-500/10 text-amber-600 rounded-lg shrink-0">
                <Sparkles className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-sm sm:text-base font-bold flex items-center gap-1.5 truncate">
                  Copiloto Interno
                  <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30 shrink-0">
                    IA SEGURA
                  </Badge>
                  {isAdmin && quota?.daily && (
                    <Badge
                      variant="outline"
                      className="hidden xs:inline-flex text-[9px] sm:text-[10px] px-1.5 py-0 bg-muted/60 text-muted-foreground border-border gap-1 font-mono shrink-0"
                      title={`Cota Gemini: ${quota.daily.used}/${quota.daily.limit} requisições hoje (${quota.daily.percentage}%)`}
                    >
                      ⚡ {quota.daily.used}/{quota.daily.limit} req
                    </Badge>
                  )}
                </SheetTitle>
                <SheetDescription className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  Consultas, Resumo do Dia, WhatsApp & Orçamentos
                </SheetDescription>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 pr-7">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center gap-1"
                title="Minimizar / Ocultar chat"
                onClick={() => onOpenChange(false)}
              >
                <ChevronDown className="size-4" />
                <span className="hidden xs:inline">Minimizar</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                title="Limpar conversa"
                onClick={handleClearHistory}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5">
          {messages.map((msg) => {
            const hasInteractiveCard = Boolean(
              msg.whatsappDraft ||
              msg.pricingEstimate ||
              msg.orderDraft ||
              (msg.galleryItems && msg.galleryItems.length > 0)
            );
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`size-7 sm:size-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                  }`}
                >
                  {msg.role === 'user' ? <User className="size-3.5 sm:size-4" /> : <Bot className="size-3.5 sm:size-4" />}
                </div>

                <div
                  className={`rounded-2xl px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm ${
                    msg.role === 'user'
                      ? 'max-w-[85%] bg-primary text-primary-foreground rounded-tr-none whitespace-pre-wrap'
                      : hasInteractiveCard
                        ? 'w-full max-w-[calc(100%-2.25rem)] bg-muted/80 text-foreground border rounded-tl-none whitespace-pre-wrap space-y-3'
                        : 'max-w-[90%] sm:max-w-[85%] bg-muted/80 text-foreground border rounded-tl-none whitespace-pre-wrap space-y-3'
                  }`}
                >
                  {msg.imageUrl && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-primary-foreground/20 max-w-[220px]">
                      <img
                        src={msg.imageUrl}
                        alt="Anexo enviado"
                        className="w-full h-auto object-cover max-h-48 cursor-pointer hover:opacity-90"
                        onClick={() => window.open(msg.imageUrl, '_blank')}
                      />
                    </div>
                  )}

                  <div className="leading-relaxed">
                    {msg.role === 'assistant' ? renderMessageTextWithOrderLinks(cleanHumanText(msg.text)) : msg.text}
                  </div>

                  {/* Card 1: Central Interativa de WhatsApp com Edição e Envio */}
                  {msg.whatsappDraft && (
                    <WhatsAppComposer
                      draft={msg.whatsappDraft}
                      onSendVariantRequest={handleSend}
                      disabled={loading}
                    />
                  )}

                  {/* Card 2: Estimativa de Precificação & Margem */}
                  {msg.pricingEstimate && (
                    <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/30 rounded-xl space-y-2.5 text-foreground">
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          <Calculator className="size-3.5" />
                          Cálculo de Precificação Sugerido
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
                          Margem: {msg.pricingEstimate.profitMarginPercent}%
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-background border rounded-lg">
                          <span className="text-[10px] sm:text-[11px] text-muted-foreground block">Preço Unitário:</span>
                          <span className="font-bold text-xs sm:text-sm text-foreground">
                            {formatCurrency(msg.pricingEstimate.suggestedUnitPrice)}
                          </span>
                        </div>
                        <div className="p-2 bg-background border rounded-lg">
                          <span className="text-[10px] sm:text-[11px] text-muted-foreground block">Total ({msg.pricingEstimate.quantity} un):</span>
                          <span className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(msg.pricingEstimate.suggestedTotalPrice)}
                          </span>
                        </div>
                      </div>

                      {msg.pricingEstimate.breakdown && (
                        <div className="text-[11px] text-muted-foreground space-y-0.5 border-t border-amber-500/10 pt-1.5">
                          <div>• Matéria-prima base: {formatCurrency(msg.pricingEstimate.breakdown.materials || 0)}/un</div>
                          <div>• Insumos estamparia: {formatCurrency(msg.pricingEstimate.breakdown.customization || 0)}/un</div>
                          <div>• Mão de obra estimada: {formatCurrency(msg.pricingEstimate.breakdown.labor || 0)}/un</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card 3: Rascunho de Pedido Extraído */}
                  {msg.orderDraft && (
                    <div className="mt-3 p-3 bg-card border rounded-xl shadow-xs space-y-2 text-foreground">
                      <div className="flex items-center justify-between border-b pb-1.5">
                        <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                          <Package className="size-3.5" />
                          Rascunho do Pedido
                        </span>
                        {msg.orderDraft.totalPrice != null && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(msg.orderDraft.totalPrice)}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                        {msg.orderDraft.customerName && (
                          <div>
                            <span className="font-medium text-foreground">Cliente:</span> {msg.orderDraft.customerName}
                          </div>
                        )}
                        {msg.orderDraft.customerPhone && (
                          <div className="flex items-center gap-1">
                            <Phone className="size-3 text-muted-foreground" />
                            <span>{msg.orderDraft.customerPhone}</span>
                          </div>
                        )}
                        {msg.orderDraft.productName && (
                          <div>
                            <span className="font-medium text-foreground">Produto:</span> {msg.orderDraft.productName}
                            {msg.orderDraft.quantity ? ` (${msg.orderDraft.quantity} un)` : ''}
                          </div>
                        )}
                        {msg.orderDraft.deliveryDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="size-3 text-muted-foreground" />
                            <span>Entrega: {msg.orderDraft.deliveryDate}</span>
                          </div>
                        )}
                        {msg.orderDraft.notes && (
                          <div className="flex items-start gap-1">
                            <FileText className="size-3 text-muted-foreground mt-0.5" />
                            <span className="italic">{msg.orderDraft.notes}</span>
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        className="w-full mt-2 gap-1.5 text-xs font-medium h-9"
                        onClick={() => handleApplyDraft(msg.orderDraft!)}
                      >
                        <span>Carregar no Formulário de Pedido</span>
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </div>
                  )}

                  {/* Card 4: Fotos e Modelos da Galeria (Design Elegante & Bem Formatado) */}
                  {msg.galleryItems && msg.galleryItems.length > 0 && (
                    <div className="mt-3 p-3.5 bg-card/90 backdrop-blur-xs border border-border/80 rounded-2xl shadow-sm space-y-3 text-foreground">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <span className="text-xs font-bold text-primary flex items-center gap-2">
                          <Images className="size-4 text-primary" />
                          Modelos Encontrados no Acervo ({msg.galleryItems.length})
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          Toque na foto para ampliar
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                        {msg.galleryItems.slice(0, 6).map((item) => {
                          const allTags = [...(item.tags || []), ...(item.aiTags || [])].filter(Boolean);
                          const uniqueTags = Array.from(new Set(allTags)).slice(0, 3);
                          return (
                            <div 
                              key={item.id} 
                              className="border border-border/70 rounded-xl overflow-hidden bg-background hover:border-primary/50 transition-all flex flex-col group text-left shadow-xs"
                            >
                              <div className="aspect-[4/3] relative overflow-hidden bg-muted/60">
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  loading="lazy"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <a
                                  href={item.imageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all flex items-center justify-center"
                                  title="Ver Foto em Alta Resolução"
                                >
                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-xs shadow-md">
                                    <ZoomIn className="size-3.5" />
                                    Ver Foto
                                  </span>
                                </a>
                                {item.productType && (
                                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold backdrop-blur-xs">
                                    {item.productType}
                                  </span>
                                )}
                              </div>
                              <div className="p-2.5 space-y-1.5 flex-1 flex flex-col justify-between">
                                <div>
                                  <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-1" title={item.title}>
                                    {item.title || "Modelo Personalizado"}
                                  </h4>
                                  {item.description && (
                                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                {uniqueTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                                    {uniqueTags.map((tag, tIdx) => (
                                      <span 
                                        key={tIdx} 
                                        className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground"
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start gap-2 flex-row animate-in fade-in duration-200">
              <div className="size-7 sm:size-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <Bot className="size-3.5 sm:size-4" />
              </div>

              <div className="rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm bg-muted/80 text-foreground border rounded-tl-none flex items-center gap-2.5 shadow-xs">
                <Loader2 className="size-4 animate-spin text-amber-500 shrink-0" />
                <span
                  key={progressStepIndex}
                  className="animate-in fade-in duration-300 font-medium text-foreground/90 transition-all"
                >
                  {PROGRESS_STEPS[progressStepIndex]}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions chips */}
        {messages.length <= 3 && showSuggestions && !loading && !input.trim() && (
          <div className="px-3.5 py-2 border-t bg-muted/20 flex-shrink-0 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                💡 Sugestões rápidas:
              </span>
              <button
                type="button"
                onClick={() => setShowSuggestions(false)}
                className="text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted/80 transition-colors cursor-pointer text-[10px] flex items-center gap-1 shrink-0"
                title="Ocultar sugestões rápidas"
                aria-label="Ocultar sugestões rápidas"
              >
                <X className="size-3" />
                <span>Ocultar</span>
              </button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5 pb-1 items-center">
              {SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setShowSuggestions(false);
                    handleSend(sug);
                  }}
                  disabled={loading || cooldownSeconds > 0}
                  className="text-left text-xs whitespace-nowrap px-3 py-1.5 rounded-full border border-border/70 bg-card hover:bg-primary/5 hover:border-primary/30 text-foreground/90 transition-colors shrink-0 shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Footer */}
        <div className="p-3 border-t bg-card/70 backdrop-blur-xs flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* Opção discreta para reabrir sugestões se o usuário desejar */}
          {!showSuggestions && messages.length <= 3 && !loading && cooldownSeconds <= 0 && !input.trim() && (
            <div className="mb-2 flex items-center justify-start">
              <button
                type="button"
                onClick={() => setShowSuggestions(true)}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:text-amber-700 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Sparkles className="size-3 text-amber-500" />
                <span>Ver sugestões rápidas</span>
              </button>
            </div>
          )}
          {/* Preview da Imagem Anexada */}
          {attachedImage && (
            <div className="mb-2 p-2 bg-background border rounded-lg flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={attachedImage.preview}
                  alt="Prévia do anexo"
                  className="size-11 object-cover rounded border shrink-0 bg-muted"
                />
                <div className="min-w-0">
                  <span className="text-xs font-semibold truncate block text-foreground">{attachedImage.name}</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">Pronta para análise multimodal com IA ✨</span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => setAttachedImage(null)}
                title="Remover anexo"
              >
                <X className="size-4" />
              </Button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImagePick(f);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 h-[40px] w-[40px] text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              title="Anexar foto ou referência para a IA analisar"
              disabled={loading || cooldownSeconds > 0}
            >
              <Paperclip className="size-4" />
            </Button>

            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!loading && cooldownSeconds <= 0) {
                    handleSend();
                  }
                }
              }}
              rows={1}
              placeholder={
                loading
                  ? "Processando resposta..."
                  : cooldownSeconds > 0
                  ? `Aguarde ${cooldownSeconds}s para nova mensagem...`
                  : attachedImage
                  ? "Adicione instruções sobre a foto ou aperte Enter para analisar..."
                  : "Digite sua dúvida, cole texto ou anexe/cole uma foto... (Enter envia)"
              }
              className="text-xs sm:text-sm bg-background min-h-[40px] max-h-24 resize-none py-2.5 leading-tight"
              disabled={loading || cooldownSeconds > 0}
            />
            <Button
              type="submit"
              size="icon"
              disabled={(!input.trim() && !attachedImage) || loading || cooldownSeconds > 0}
              className="shrink-0 h-[40px] min-w-[40px] px-2"
              title={cooldownSeconds > 0 ? `Aguarde ${cooldownSeconds}s...` : 'Enviar mensagem'}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : cooldownSeconds > 0 ? (
                <span className="text-[11px] font-mono font-semibold">{cooldownSeconds}s</span>
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </form>
          <p className="text-[10px] text-center text-muted-foreground mt-1.5 hidden sm:block">
            💡 Pressione <kbd className="px-1 py-0.5 text-[9px] bg-muted border rounded font-mono">Enter</kbd> para enviar, <kbd className="px-1 py-0.5 text-[9px] bg-muted border rounded font-mono">Shift+Enter</kbd> para nova linha ou cole fotos com <kbd className="px-1 py-0.5 text-[9px] bg-muted border rounded font-mono">Ctrl+V</kbd>.
          </p>
        </div>

        {/* Modal de Detalhes do Pedido acionado via Deep Linking */}
        <OrderDetailsDialog
          order={selectedOrderForDetails}
          open={orderDetailsOpen}
          onOpenChange={(isOpen) => {
            setOrderDetailsOpen(isOpen);
            if (!isOpen) {
              setTimeout(() => setSelectedOrderForDetails(null), 300);
            }
          }}
          onUpdateStatus={handleUpdateStatusInSheet}
        />
      </SheetContent>
    </Sheet>
  );
}

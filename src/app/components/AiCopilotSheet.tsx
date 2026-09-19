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
  RefreshCw,
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
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { firebaseAiAgentService } from '../../services/firebaseAiAgentService';
import { useFirebaseCustomers } from '../../hooks/useFirebaseCustomers';
import { AiChatMessage, AiOrderDraft, AiWhatsAppDraft, AiPricingEstimate } from '../types';
import { toast } from 'sonner';
import { formatCurrency } from '../utils/currency';

interface AiCopilotSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyOrderDraft?: (draft: AiOrderDraft) => void;
}

const INITIAL_MESSAGE: AiChatMessage = {
  id: 'init-1',
  role: 'assistant',
  text: 'Olá! Sou o Copiloto Interno da Luisices. 👕✨\n\nEstou equipado com **Consulta ao Acervo da Galeria**, **Análise de Fotos & Imagens**, **Consulta de Pedidos**, **Raio-X Diário**, **Central WhatsApp**, **Calculadora de Orçamentos** e **Extração de Pedidos** com guardrails de segurança e isolamento por usuário.',
  timestamp: new Date().toISOString(),
};

const SUGGESTIONS = [
  '🖼️ Buscar fotos e modelos de camisetas na nossa galeria',
  '📋 Raio-X do Dia (Briefing de produção e prazos)',
  '💬 Gerar mensagem de cobrança amigável para cliente',
  '💰 Quanto cobrar por 30 camisetas pretas silk 1 cor?',
  '⚠️ Quais pedidos correm risco de atraso?',
];

interface WhatsAppComposerProps {
  draft: AiWhatsAppDraft;
  onSendVariantRequest: (promptText: string) => void;
  disabled?: boolean;
}

function WhatsAppComposer({ draft, onSendVariantRequest, disabled }: WhatsAppComposerProps) {
  const { userProfile, hasPermission, isAdmin } = useAuth();
  const canUseWhatsApp = isAdmin || userProfile?.role === 'user' || hasPermission((p) => p.whatsapp ?? false);
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

export function AiCopilotSheet({ open, onOpenChange, onApplyOrderDraft }: AiCopilotSheetProps) {
  const { user, isAdmin } = useAuth();
  const [messages, setMessages] = useState<AiChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [quota, setQuota] = useState<import('../types').AiUsageData | null>(null);
  const [attachedImage, setAttachedImage] = useState<{
    preview: string;
    base64: string;
    mimeType: string;
    name: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, [open, messages, isAdmin]);

  const handleImagePick = (file: File) => {
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validMimes.includes(file.type)) {
      toast.error('Formato não suportado. Envie JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10MB.');
      return;
    }
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
    const messageText = (textToSend || input).trim();
    if ((!messageText && !attachedImage) || loading) return;

    const currentImage = attachedImage;
    const finalMessageText = messageText || 'Analise esta imagem enviada, descreva as características do produto personalizado e busque referências na galeria.';

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
    }
  };

  const handleClearHistory = () => {
    setMessages([INITIAL_MESSAGE]);
  };

  const handleSyncAllOrders = async () => {
    setSyncing(true);
    try {
      const res = await firebaseAiAgentService.syncAllOrders();
      toast.success(res.message || 'Pedidos sincronizados na base somente-leitura.');
    } catch (err: any) {
      console.error('[AiCopilot] Erro ao sincronizar pedidos:', err);
      toast.error('Não foi possível sincronizar os pedidos.');
    } finally {
      setSyncing(false);
    }
  };

  const handleApplyDraft = (draft: AiOrderDraft) => {
    if (onApplyOrderDraft) {
      onApplyOrderDraft(draft);
      onOpenChange(false);
      toast.info('Dados carregados no formulário de Novo Pedido!');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 flex flex-col h-[100dvh] max-h-[100dvh] bg-background border-l shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="px-3.5 sm:px-4 py-3 border-b flex-shrink-0 bg-card/70 backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg shrink-0">
                <Sparkles className="size-5" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-sm sm:text-base font-bold flex items-center gap-1.5 truncate">
                  Copiloto Interno
                  <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                    IA SEGURA
                  </Badge>
                  {isAdmin && quota?.daily && (
                    <Badge
                      variant="outline"
                      className="text-[9px] sm:text-[10px] px-1.5 py-0 bg-muted/60 text-muted-foreground border-border gap-1 font-mono"
                      title={`Cota Gemini: ${quota.daily.used}/${quota.daily.limit} requisições hoje (${quota.daily.percentage}%)`}
                    >
                      ⚡ {quota.daily.used}/{quota.daily.limit} req
                    </Badge>
                  )}
                </SheetTitle>
                <SheetDescription className="text-[11px] sm:text-xs text-muted-foreground truncate">
                  Consultas, Briefings, WhatsApp & Precificação
                </SheetDescription>
              </div>
            </div>

            <div className="flex items-center gap-1 pr-6">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                title="Sincronizar base somente-leitura"
                onClick={handleSyncAllOrders}
                disabled={syncing}
              >
                <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
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

                  <div className="leading-relaxed">{msg.text}</div>

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

                  {/* Card 4: Fotos da Galeria Encontradas */}
                  {msg.galleryItems && msg.galleryItems.length > 0 && (
                    <div className="mt-3 p-3 bg-card border rounded-xl shadow-xs space-y-2 text-foreground">
                      <div className="flex items-center justify-between border-b pb-1.5">
                        <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                          <Images className="size-3.5" />
                          Modelos da Galeria ({msg.galleryItems.length})
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {msg.galleryItems.slice(0, 6).map((item) => (
                          <div key={item.id} className="border rounded-lg overflow-hidden bg-background flex flex-col group text-left">
                            <div className="aspect-square relative overflow-hidden bg-muted">
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <a
                                href={item.imageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center"
                              >
                                <ZoomIn className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                            </div>
                            <div className="p-1.5 space-y-0.5">
                              <p className="text-[11px] font-medium truncate" title={item.title}>{item.title}</p>
                              {item.productType && (
                                <span className="text-[9px] px-1 py-0.5 bg-muted text-muted-foreground rounded inline-block truncate max-w-full">
                                  {item.productType}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs p-2">
              <Loader2 className="size-4 animate-spin text-amber-500" />
              <span>Consultando inteligência e base somente-leitura...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions chips */}
        {messages.length <= 3 && (
          <div className="px-3 sm:px-4 py-2 border-t bg-muted/20 space-y-1.5 flex-shrink-0">
            <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">Sugestões rápidas:</span>
            <div className="flex flex-col gap-1">
              {SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(sug)}
                  disabled={loading}
                  className="text-left text-xs text-foreground/80 hover:text-primary hover:bg-primary/5 px-2.5 py-1.5 rounded-md transition-colors border border-transparent hover:border-primary/20 truncate"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Footer */}
        <div className="p-3 border-t bg-card/70 backdrop-blur-xs flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
              disabled={loading}
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
                  handleSend();
                }
              }}
              rows={1}
              placeholder={attachedImage ? "Adicione instruções sobre a foto ou aperte Enter para analisar..." : "Digite sua dúvida, cole texto ou anexe/cole uma foto... (Enter envia)"}
              className="text-xs sm:text-sm bg-background min-h-[40px] max-h-24 resize-none py-2.5 leading-tight"
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={(!input.trim() && !attachedImage) || loading}
              className="shrink-0 h-[40px] w-[40px]"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
          <p className="text-[10px] text-center text-muted-foreground mt-1.5 hidden sm:block">
            💡 Pressione <kbd className="px-1 py-0.5 text-[9px] bg-muted border rounded font-mono">Enter</kbd> para enviar, <kbd className="px-1 py-0.5 text-[9px] bg-muted border rounded font-mono">Shift+Enter</kbd> para nova linha ou cole fotos com <kbd className="px-1 py-0.5 text-[9px] bg-muted border rounded font-mono">Ctrl+V</kbd>.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

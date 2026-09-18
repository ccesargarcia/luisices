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
} from 'lucide-react';
import { firebaseAiAgentService } from '../../services/firebaseAiAgentService';
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
  text: 'Olá! Sou o Copiloto Interno da Luisices. 👕✨\n\nEstou equipado com **Consulta de Pedidos**, **Raio-X Diário**, **Central WhatsApp Integrada**, **Calculadora de Orçamentos** e **Extração de Pedidos** com guardrails de segurança e revisão humana obrigatória.',
  timestamp: new Date().toISOString(),
};

const SUGGESTIONS = [
  '📋 Raio-X do Dia (Briefing de produção e prazos)',
  '⚠️ Quais pedidos correm risco de atraso?',
  '💬 Gerar mensagem de cobrança amigável para cliente',
  '💰 Quanto cobrar por 30 camisetas pretas silk 1 cor?',
  '🗑️ Quais pedidos foram cancelados ou excluídos?',
];

interface WhatsAppComposerProps {
  draft: AiWhatsAppDraft;
  onSendVariantRequest: (promptText: string) => void;
  disabled?: boolean;
}

function WhatsAppComposer({ draft, onSendVariantRequest, disabled }: WhatsAppComposerProps) {
  const [phone, setPhone] = useState(draft.recipientPhone || '');
  const [recipientName, setRecipientName] = useState(draft.recipientName || '');
  const [message, setMessage] = useState(draft.messageText || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMessage(draft.messageText || '');
    if (draft.recipientPhone) setPhone(draft.recipientPhone);
    if (draft.recipientName) setRecipientName(draft.recipientName);
  }, [draft]);

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

  const handleSendToWhatsApp = () => {
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
    <div className="mt-3 p-3 bg-emerald-500/5 border border-emerald-500/30 rounded-xl space-y-2.5 text-foreground">
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
          <MessageSquare className="size-3.5" />
          Central WhatsApp (Revisar & Enviar)
        </span>
        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
          {draft.type ? draft.type.toUpperCase() : 'WHATSAPP'}
        </Badge>
      </div>

      {/* Seletor rápido de tipos de mensagem */}
      <div className="space-y-1">
        <span className="text-[10px] font-medium text-muted-foreground">Trocar formato da mensagem:</span>
        <div className="flex flex-wrap gap-1">
          {VARIANTS.map((v) => (
            <button
              key={v.type}
              type="button"
              onClick={() => onSendVariantRequest(`${v.prompt} para ${recipientName || 'o cliente'}`)}
              disabled={disabled}
              className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
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
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5 font-medium">Nome do Cliente:</label>
          <Input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Nome do cliente"
            className="h-7 text-xs bg-background"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5 font-medium">WhatsApp (DDD+Número):</label>
          <div className="relative">
            <Phone className="size-3 absolute left-2 top-2 text-muted-foreground" />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="h-7 text-xs pl-6 bg-background"
            />
          </div>
        </div>
      </div>

      {/* Editor do Texto da Mensagem */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-muted-foreground font-medium">Texto da Mensagem (Editável):</label>
          <span className="text-[10px] text-muted-foreground">{message.length} caracteres</span>
        </div>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Digite ou ajuste a mensagem..."
          className="text-xs bg-background font-mono leading-relaxed"
        />
      </div>

      {/* Botões de Ação */}
      <div className="flex items-center gap-2 pt-0.5">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5 text-xs h-8"
          onClick={handleCopy}
        >
          {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
          <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
        </Button>
        <Button
          size="sm"
          className="flex-1 gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
          onClick={handleSendToWhatsApp}
        >
          <ExternalLink className="size-3.5" />
          <span>Enviar no WhatsApp</span>
        </Button>
      </div>
    </div>
  );
}

export function AiCopilotSheet({ open, onOpenChange, onApplyOrderDraft }: AiCopilotSheetProps) {
  const [messages, setMessages] = useState<AiChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) {
      setTimeout(scrollToBottom, 150);
    }
  }, [open, messages]);

  const handleSend = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || loading) return;

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== 'init-1')
        .map(m => ({ role: m.role, text: m.text }));

      const response = await firebaseAiAgentService.sendMessage(messageText, history);

      const assistantMsg: AiChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: response.reply || 'Não foi possível obter resposta.',
        timestamp: new Date().toISOString(),
        orderDraft: response.orderDraft || null,
        whatsappDraft: response.whatsappDraft || null,
        pricingEstimate: response.pricingEstimate || null,
      };

      setMessages(prev => [...prev, assistantMsg]);
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
        className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col h-full bg-background border-l shadow-2xl"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b flex-shrink-0 bg-card/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                <Sparkles className="size-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold flex items-center gap-2">
                  Copiloto Interno
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                    IA SEGURA
                  </Badge>
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`size-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                }`}
              >
                {msg.role === 'user' ? <User className="size-4" /> : <Bot className="size-4" />}
              </div>

              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none whitespace-pre-wrap'
                    : 'bg-muted/80 text-foreground border rounded-tl-none whitespace-pre-wrap space-y-3'
                }`}
              >
                <div>{msg.text}</div>

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
                        <span className="text-[11px] text-muted-foreground block">Preço Unitário:</span>
                        <span className="font-bold text-sm text-foreground">
                          {formatCurrency(msg.pricingEstimate.suggestedUnitPrice)}
                        </span>
                      </div>
                      <div className="p-2 bg-background border rounded-lg">
                        <span className="text-[11px] text-muted-foreground block">Total ({msg.pricingEstimate.quantity} un):</span>
                        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
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
                      className="w-full mt-2 gap-1.5 text-xs font-medium"
                      onClick={() => handleApplyDraft(msg.orderDraft!)}
                    >
                      <span>Carregar no Formulário de Pedido</span>
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

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
          <div className="px-4 py-2 border-t bg-muted/20 space-y-1.5 flex-shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground">Sugestões rápidas:</span>
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
        <div className="p-3 border-t bg-card/60 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre pedidos, briefing, WhatsApp ou cálculo..."
              className="text-xs sm:text-sm bg-background"
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || loading}
              className="shrink-0"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
          <p className="text-[10px] text-center text-muted-foreground mt-1.5">
            🛡️ Guardrails ativos: Proteção de margem, LGPD e revisão humana obrigatória.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

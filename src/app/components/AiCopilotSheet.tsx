import React, { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Sparkles, Send, Bot, User, Trash2, ArrowRight, Loader2, RefreshCw, Calendar, Phone, Package, DollarSign, FileText } from 'lucide-react';
import { firebaseAiAgentService } from '../../services/firebaseAiAgentService';
import { AiChatMessage, AiOrderDraft } from '../types';
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
  text: 'Olá! Sou o Copiloto Interno da Luisices. 👕✨\n\nPosso consultar informações de pedidos na base somente-leitura ou extrair dados de mensagens de clientes (WhatsApp) para montar novos pedidos rapidamente.',
  timestamp: new Date().toISOString(),
};

const SUGGESTIONS = [
  'Quais pedidos estão pendentes para entrega?',
  'Quanto temos a receber de pedidos pendentes?',
  'Criar pedido: Carlos (11999998888), 30 camisetas pretas silk costas dia 25 por R$ 900',
];

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
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('[AiCopilot] Erro ao enviar mensagem:', err);
      toast.error(err.message || 'Erro ao comunicar com o Copiloto de IA.');
      const errorMsg: AiChatMessage = {
        id: `assistant-err-${Date.now()}`,
        role: 'assistant',
        text: 'Desculpe, ocorreu um erro temporário ao processar sua solicitação. Verifique se a chave de IA está configurada ou tente novamente em instantes.',
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
                    BETA
                  </Badge>
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Base somente-leitura segura & extração de pedidos
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
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none whitespace-pre-wrap'
                    : 'bg-muted/80 text-foreground border rounded-tl-none whitespace-pre-wrap space-y-3'
                }`}
              >
                <div>{msg.text}</div>

                {/* Card de Rascunho de Pedido Extraído */}
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

        {/* Suggestions chips (only if low message count) */}
        {messages.length <= 2 && (
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
                  💬 {sug}
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
              placeholder="Pergunte sobre pedidos ou cole mensagem..."
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
            Ambiente interno e seguro. Zero gravação direta sem aprovação.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

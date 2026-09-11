import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEmails } from '../../hooks/useEmails';
import { useFirebaseCustomers } from '../../hooks/useFirebaseCustomers';
import { ReceivedEmail, SentEmail, SendEmailPayload } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Mail,
  Send,
  Inbox,
  Star,
  Trash2,
  Reply,
  Search,
  X,
  Paperclip,
  Eye,
  Sparkles,
  Clock,
  Archive,
  MailCheck,
  Loader2,
  Plus,
  SendHorizontal,
  MailOpen,
  ArrowDownLeft,
  Gauge,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const EMAIL_TEMPLATES = [
  {
    id: 'blank',
    name: 'Mensagem em Branco',
    subject: '',
    body: '',
  },
  {
    id: 'quote',
    name: 'Orçamento de Papelaria',
    subject: 'Orçamento Personalizado - Luisices',
    body: `Olá, [Nome do Cliente]!

Agradecemos o seu interesse na Luisices Papelaria Personalizada.

Conforme conversamos, segue a proposta para o seu projeto:
- Itens: [Descrever itens]
- Prazo de Produção: [Ex: 5 a 7 dias úteis após aprovação da arte]
- Valor Total: R$ 0,00
- Condições de Pagamento: Chave Pix ou Cartão de Crédito

Ficamos à disposição para tirar qualquer dúvida ou realizar ajustes no pedido.

Atenciosamente,
Equipe Luisices
contato@luisices.com.br`,
  },
  {
    id: 'ready',
    name: 'Pedido Pronto para Retirada / Envio',
    subject: 'Seu pedido está pronto! 🎉 - Luisices',
    body: `Olá, [Nome do Cliente]!

Temos uma ótima notícia: o seu pedido personalizado foi finalizado com muito carinho e já está pronto! ✂️✨

[Se for retirada]:
Você já pode retirar no nosso endereço de atendimento no horário combinado.

[Se for envio/entrega]:
Seu pacote será despachado em breve e enviaremos o código de rastreio/comprovante assim que coletado.

Muito obrigado por escolher a Luisices!

Com carinho,
Equipe Luisices`,
  },
  {
    id: 'production',
    name: 'Pedido em Produção',
    subject: 'Pedido em Produção ✂️ - Luisices',
    body: `Olá, [Nome do Cliente]!

Confirmamos o recebimento dos detalhes do seu pedido e o mesmo já entrou na nossa fila de produção!

Estamos cuidando de cada detalhe com toda dedicação para que sua papelaria fique perfeita.
Qualquer novidade entraremos em contato.

Atenciosamente,
Equipe Luisices`,
  },
  {
    id: 'thank_you',
    name: 'Agradecimento ao Cliente',
    subject: 'Obrigado por escolher a Luisices! 💖',
    body: `Olá, [Nome do Cliente]!

Esperamos que você tenha adorado os seus personalizados tanto quanto nós amamos criá-los!

Sua opinião é fundamental para nós. Se puder, marque nosso perfil nas redes sociais ou nos dê um feedback com fotos do resultado!

Esperamos te ver em breve para novas criações!

Com carinho,
Equipe Luisices`,
  },
];

export function Emails() {
  const { user } = useAuth();
  const { customers } = useFirebaseCustomers();
  const {
    receivedEmails,
    sentEmails,
    unreadCount,
    usage,
    loadingUsage,
    refreshUsage,
    loading,
    error,
    sendEmail,
    markAsRead,
    toggleStar,
    setArchived,
    deleteReceived,
    deleteSent,
  } = useEmails();

  const sentTodayCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return sentEmails.filter((e) => e.sentAt && e.sentAt.startsWith(today)).length;
  }, [sentEmails]);

  const dailyUsed = usage ? usage.daily.used : sentTodayCount;
  const dailyLimit = usage?.daily.limit ?? 100;
  const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);
  const dailyPercent = Math.min(100, Math.round((dailyUsed / dailyLimit) * 100));

  const isDev = useMemo(() => {
    return (
      import.meta.env.DEV ||
      import.meta.env.VITE_FIREBASE_PROJECT_ID === 'luisices-dev' ||
      (typeof window !== 'undefined' &&
        (window.location.hostname.includes('dev') ||
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1'))
    );
  }, []);

  const defaultSender = isDev
    ? 'Luisices Dev <contato@dev.luisices.com.br>'
    : 'Luisices <contato@luisices.com.br>';

  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'starred' | 'archived'>('all');

  // Selected email IDs (derivados em tempo real)
  const [selectedReceivedEmailId, setSelectedReceivedEmailId] = useState<string | null>(null);
  const [selectedSentEmailId, setSelectedSentEmailId] = useState<string | null>(null);
  const [emailToDelete, setEmailToDelete] = useState<{
    type: 'received' | 'sent';
    id: string;
    subject: string;
  } | null>(null);

  const selectedReceivedEmail = useMemo(
    () => (selectedReceivedEmailId ? receivedEmails.find((e) => e.id === selectedReceivedEmailId) ?? null : null),
    [receivedEmails, selectedReceivedEmailId]
  );

  const selectedSentEmail = useMemo(
    () => (selectedSentEmailId ? sentEmails.find((e) => e.id === selectedSentEmailId) ?? null : null),
    [sentEmails, selectedSentEmailId]
  );

  // Compose form
  const [recipient, setRecipient] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [sender, setSender] = useState(defaultSender);
  const [customSender, setCustomSender] = useState('');
  const [isCustomSender, setIsCustomSender] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');

  // Statistics
  const starredCount = useMemo(() => receivedEmails.filter((e) => e.starred && !e.archived).length, [receivedEmails]);
  const totalInbox = useMemo(() => receivedEmails.filter((e) => !e.archived).length, [receivedEmails]);

  // Filtered received emails
  const filteredReceived = useMemo(() => {
    return receivedEmails.filter((email) => {
      if (filterType === 'unread' && email.read) return false;
      if (filterType === 'starred' && !email.starred) return false;
      if (filterType === 'archived' && !email.archived) return false;
      if (filterType !== 'archived' && email.archived) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchSubject = email.subject?.toLowerCase().includes(query);
        const matchFrom = email.from?.toLowerCase().includes(query);
        const matchText = email.text?.toLowerCase().includes(query);
        return matchSubject || matchFrom || matchText;
      }

      return true;
    });
  }, [receivedEmails, filterType, searchQuery]);

  // Filtered sent emails
  const filteredSent = useMemo(() => {
    return sentEmails.filter((email) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchSubject = email.subject?.toLowerCase().includes(query);
        const matchTo = email.to?.some((t) => t.toLowerCase().includes(query));
        const matchText = (email.text || email.html)?.toLowerCase().includes(query);
        return matchSubject || matchTo || matchText;
      }
      return true;
    });
  }, [sentEmails, searchQuery]);

  // Handle customer selection
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomer(customerId);
    const found = customers.find((c) => c.id === customerId);
    if (found && found.email) {
      setRecipient(found.email);
      if (body.includes('[Nome do Cliente]')) {
        setBody((prev) => prev.replace(/\[Nome do Cliente\]/g, found.name));
      }
    }
  };

  // Handle template selection
  const handleSelectTemplate = (templateId: string) => {
    const tpl = EMAIL_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setSubject(tpl.subject);
    let newBody = tpl.body;
    if (selectedCustomer) {
      const found = customers.find((c) => c.id === selectedCustomer);
      if (found) {
        newBody = newBody.replace(/\[Nome do Cliente\]/g, found.name);
      }
    }
    setBody(newBody);
  };

  // Handle send email
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) {
      toast.error('Informe ao menos um destinatário.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Informe o assunto do e-mail.');
      return;
    }
    if (!body.trim()) {
      toast.error('Escreva a mensagem do e-mail.');
      return;
    }

    const recipientList = recipient
      .split(/[,;\s]+/)
      .map((r) => r.trim())
      .filter((r) => r.includes('@'));

    if (recipientList.length === 0) {
      toast.error('Informe um endereço de e-mail válido.');
      return;
    }

    setIsSending(true);
    try {
      const activeSender = isCustomSender && customSender.trim() ? customSender.trim() : sender;

      const formattedHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #2d3748; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f7fafc; border-left: 4px solid #4f46e5; padding: 15px 20px; border-radius: 4px; margin-bottom: 25px;">
            <h2 style="margin: 0; color: #1a202c; font-size: 18px;">Luisices Papelaria Personalizada</h2>
          </div>
          <div style="font-size: 15px; white-space: pre-wrap; margin-bottom: 30px;">${body}</div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
          <div style="font-size: 12px; color: #718096; line-height: 1.5;">
            <p style="margin: 0;"><strong>Luisices Personalizados</strong></p>
            <p style="margin: 3px 0 0 0;">WhatsApp: (11) 97060-6433 | ${isDev ? 'contato@dev.luisices.com.br' : 'contato@luisices.com.br'}</p>
            <p style="margin: 3px 0 0 0;"><a href="${isDev ? 'https://dev.luisices.com.br' : 'https://luisices.com.br'}" style="color: #4f46e5; text-decoration: none;">${isDev ? 'dev.luisices.com.br' : 'luisices.com.br'}</a></p>
          </div>
        </div>
      `;

      const payload: SendEmailPayload = {
        from: activeSender,
        to: recipientList,
        subject: subject.trim(),
        text: body,
        html: formattedHtml,
      };

      if (cc.trim()) {
        payload.cc = cc.split(/[,;\s]+/).filter((c) => c.includes('@'));
      }
      if (bcc.trim()) {
        payload.bcc = bcc.split(/[,;\s]+/).filter((b) => b.includes('@'));
      }

      await sendEmail(payload);
      toast.success('E-mail enviado com sucesso!');

      // Reset form
      setRecipient('');
      setSelectedCustomer('');
      setSubject('');
      setBody('');
      setCc('');
      setBcc('');
      setShowCcBcc(false);
      setActiveTab('sent');
    } catch (err: any) {
      console.error('Erro ao enviar e-mail:', err);
      toast.error(err.message || 'Falha ao enviar e-mail.');
    } finally {
      setIsSending(false);
    }
  };

  // Reply
  const handleReply = (email: ReceivedEmail) => {
    setSelectedReceivedEmailId(null);
    setRecipient(email.from);
    setSubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
    const originalText = email.text || email.subject;
    setBody(`\n\n--- Mensagem Original ---\nDe: ${email.from}\nData: ${new Date(email.receivedAt).toLocaleString('pt-BR')}\nAssunto: ${email.subject}\n\n${originalText}`);
    setActiveTab('compose');
  };

  // Safe date formatter
  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Central de E-mails</h1>
            {isDev && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-400 font-mono text-[10px] px-1.5 py-0 h-5">
                DEV
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Gerenciamento, envio e recebimento de e-mails corporativos
          </p>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button onClick={() => setActiveTab('compose')} className="gap-2">
            <Plus className="size-4" />
            <span>Novo E-mail</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              <span>Caixa de Entrada</span>
              <Inbox className="size-4 text-muted-foreground/70" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInbox}</div>
            <p className="text-xs text-muted-foreground mt-1">mensagens recebidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              <span>Não Lidos</span>
              <MailOpen className="size-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${unreadCount > 0 ? 'text-primary' : 'text-foreground'}`}>
              {unreadCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {unreadCount === 1 ? 'mensagem aguardando' : 'mensagens aguardando'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              <span>Enviados</span>
              <Send className="size-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{sentEmails.length}</div>
            <p className="text-xs text-muted-foreground mt-1">mensagens disparadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              <span>Favoritos</span>
              <Star className="size-4 text-amber-500 fill-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{starredCount}</div>
            <p className="text-xs text-muted-foreground mt-1">marcados com estrela</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              <span>Cota Diária</span>
              <div className="flex items-center gap-1.5">
                <Gauge className="size-4 text-primary" />
                <button
                  type="button"
                  onClick={() => refreshUsage()}
                  title="Atualizar dados de cota"
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                >
                  <RefreshCw className={`size-3 ${loadingUsage ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                {dailyUsed} <span className="text-sm font-normal text-muted-foreground">/ {dailyLimit}</span>
              </div>
              <span
                className={`text-xs font-semibold ${
                  dailyPercent >= 90
                    ? 'text-destructive'
                    : dailyPercent >= 75
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {dailyRemaining} restam
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-muted/60 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  dailyPercent >= 90
                    ? 'bg-destructive'
                    : dailyPercent >= 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${dailyPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center justify-between">
              <span>{dailyPercent}% consumido</span>
              <span className="text-[10px] text-muted-foreground/80">reset às 21h</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="glass-chip h-10 p-1 flex">
            <TabsTrigger value="inbox" className="gap-2 text-xs sm:text-sm">
              <Inbox className="size-4" />
              <span>Caixa de Entrada</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="size-5 p-0 flex items-center justify-center text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="sent" className="gap-2 text-xs sm:text-sm">
              <Send className="size-4" />
              <span>Enviados</span>
              <span className="text-xs text-muted-foreground">({sentEmails.length})</span>
            </TabsTrigger>

            <TabsTrigger value="compose" className="gap-2 text-xs sm:text-sm">
              <SendHorizontal className="size-4" />
              <span>Nova Mensagem</span>
            </TabsTrigger>
          </TabsList>

          {/* Search & Filter Bar for List Views */}
          {(activeTab === 'inbox' || activeTab === 'sent') && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar e-mails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-9 h-10 ${searchQuery ? 'pr-9' : ''}`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── TAB: CAIXA DE ENTRADA ────────────────────────────────── */}
        <TabsContent value="inbox" className="space-y-4 m-0">
          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
              className="text-xs h-8"
            >
              Todos ({totalInbox})
            </Button>
            <Button
              variant={filterType === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('unread')}
              className="text-xs h-8 gap-1.5"
            >
              Não lidos
              {unreadCount > 0 && (
                <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </Button>
            <Button
              variant={filterType === 'starred' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('starred')}
              className="text-xs h-8 gap-1"
            >
              <Star className="size-3 text-amber-500 fill-amber-500" />
              Favoritos ({starredCount})
            </Button>
            <Button
              variant={filterType === 'archived' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('archived')}
              className="text-xs h-8 gap-1"
            >
              <Archive className="size-3" />
              Arquivados
            </Button>
          </div>

          {/* Received Emails List */}
          <Card className="border shadow-xs overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <Loader2 className="size-8 animate-spin text-primary mb-2" />
                <p className="text-sm">Sincronizando mensagens...</p>
              </div>
            ) : filteredReceived.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Inbox className="size-7 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">Nenhum e-mail nesta caixa</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-1">
                  {searchQuery
                    ? 'Nenhuma mensagem corresponde aos critérios de pesquisa.'
                    : 'Os e-mails recebidos aparecerão aqui automaticamente.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredReceived.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => {
                      setSelectedReceivedEmailId(email.id);
                      if (!email.read) {
                        markAsRead(email.id, true);
                      }
                    }}
                    className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      !email.read ? 'bg-primary/5 font-medium' : ''
                    }`}
                  >
                    {/* Star Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(email.id, !email.starred);
                      }}
                      className="text-muted-foreground hover:text-amber-500 transition-colors p-1"
                      title={email.starred ? 'Remover dos favoritos' : 'Marcar como favorito'}
                    >
                      <Star
                        className={`size-4 ${
                          email.starred ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'
                        }`}
                      />
                    </button>

                    {/* Unread Status Dot */}
                    <div className="flex items-center justify-center size-2">
                      {!email.read && <div className="size-2 rounded-full bg-primary" />}
                    </div>

                    {/* Sender Initial Avatar */}
                    <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {email.from ? email.from[0].toUpperCase() : '?'}
                    </div>

                    {/* Content Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-sm truncate ${!email.read ? 'font-bold text-foreground' : 'text-foreground/90'}`}>
                          {email.from}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDate(email.receivedAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-sm truncate ${!email.read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                          {email.subject || '(Sem assunto)'}
                        </span>
                        {email.attachments && email.attachments.length > 0 && (
                          <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground truncate max-w-xl">
                        {email.text || '(Sem prévia de texto)'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        title={email.read ? 'Marcar como não lido' : 'Marcar como lido'}
                        onClick={() => markAsRead(email.id, !email.read)}
                      >
                        <MailCheck className="size-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        title={email.archived ? 'Desarquivar' : 'Arquivar'}
                        onClick={() => setArchived(email.id, !email.archived)}
                      >
                        <Archive className="size-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        title="Excluir"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmailToDelete({
                            type: 'received',
                            id: email.id,
                            subject: email.subject || '(Sem assunto)',
                          });
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ─── TAB: ENVIADOS ────────────────────────────────────────── */}
        <TabsContent value="sent" className="space-y-4 m-0">
          <Card className="border shadow-xs overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <Loader2 className="size-8 animate-spin text-primary mb-2" />
                <p className="text-sm">Carregando histórico de enviados...</p>
              </div>
            ) : filteredSent.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Send className="size-7 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">
                  {searchQuery ? 'Nenhum e-mail encontrado' : 'Nenhum e-mail enviado'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mt-1">
                  {searchQuery
                    ? 'Nenhum disparo corresponde aos critérios de pesquisa.'
                    : 'Os e-mails disparados pelo sistema ficarão registrados aqui com confirmação de entrega.'}
                </p>
                {!searchQuery && (
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('compose')}
                    className="mt-4 gap-2"
                  >
                    <Plus className="size-4" />
                    Escrever primeira mensagem
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredSent.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => setSelectedSentEmailId(email.id)}
                    className="flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <div className="size-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                      <Send className="size-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            Para: {email.to.join(', ')}
                          </span>
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50">
                            Enviado
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDate(email.sentAt)}
                        </span>
                      </div>

                      <div className="text-sm text-foreground/90 font-medium truncate">
                        {email.subject || '(Sem assunto)'}
                      </div>

                      <p className="text-xs text-muted-foreground truncate max-w-xl">
                        {email.text || '(Conteúdo formatado em HTML)'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        title="Excluir do histórico"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmailToDelete({
                            type: 'sent',
                            id: email.id,
                            subject: email.subject || '(Sem assunto)',
                          });
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ─── TAB: NOVA MENSAGEM (COMPOR) ─────────────────────────── */}
        <TabsContent value="compose" className="space-y-6 m-0">
          <Card className="border shadow-xs">
            <CardHeader className="pb-4 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <SendHorizontal className="size-5 text-primary" />
                    Nova Mensagem
                  </CardTitle>
                  <CardDescription>
                    Envie e-mails para clientes e fornecedores
                  </CardDescription>
                </div>

                {/* Templates Selector */}
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-500 shrink-0" />
                  <Select onValueChange={handleSelectTemplate}>
                    <SelectTrigger className="w-[220px] h-9 text-xs">
                      <SelectValue placeholder="Modelos Rápidos..." />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_TEMPLATES.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id} className="text-xs">
                          {tpl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-5">
              <form onSubmit={handleSend} className="space-y-4">
                {/* Remetente & Cliente */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sender */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-foreground">Remetente (From):</label>
                      <button
                        type="button"
                        onClick={() => setIsCustomSender(!isCustomSender)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        {isCustomSender ? 'Selecionar da Lista' : 'Digitar Manual'}
                      </button>
                    </div>

                    {isCustomSender ? (
                      <Input
                        placeholder="Ex: Luisices <contato@luisices.com.br>"
                        value={customSender}
                        onChange={(e) => setCustomSender(e.target.value)}
                        className="h-10 text-sm"
                      />
                    ) : (
                      <Select value={sender} onValueChange={setSender}>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {isDev ? (
                            <>
                              <SelectItem value="Luisices Dev <contato@dev.luisices.com.br>">
                                Luisices Dev &lt;contato@dev.luisices.com.br&gt;
                              </SelectItem>
                              <SelectItem value="Luisices Dev <noreply@dev.luisices.com.br>">
                                Luisices Dev &lt;noreply@dev.luisices.com.br&gt;
                              </SelectItem>
                              <SelectItem value="Atendimento Dev <suporte@dev.luisices.com.br>">
                                Atendimento Dev &lt;suporte@dev.luisices.com.br&gt;
                              </SelectItem>
                              <SelectItem value="Luisices Prod <contato@luisices.com.br>">
                                Luisices Prod &lt;contato@luisices.com.br&gt;
                              </SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="Luisices <contato@luisices.com.br>">
                                Luisices &lt;contato@luisices.com.br&gt;
                              </SelectItem>
                              <SelectItem value="Luisices <noreply@luisices.com.br>">
                                Luisices &lt;noreply@luisices.com.br&gt;
                              </SelectItem>
                              <SelectItem value="Atendimento Luisices <suporte@luisices.com.br>">
                                Atendimento &lt;suporte@luisices.com.br&gt;
                              </SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Customer Quick Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-foreground">Preencher com Cliente Cadastrado:</label>
                      {selectedCustomer && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer('');
                            setRecipient('');
                          }}
                          className="text-[11px] text-primary hover:underline"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    <Select value={selectedCustomer} onValueChange={handleSelectCustomer}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Selecione um cliente cadastrado..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {customers
                          .filter((c) => !!c.email)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-sm">
                              {c.name} ({c.email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Recipient */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground">Destinatário (Para):</label>
                    <button
                      type="button"
                      onClick={() => setShowCcBcc(!showCcBcc)}
                      className="text-xs text-primary hover:underline"
                    >
                      {showCcBcc ? 'Ocultar Cc/Cco' : 'Adicionar Cc/Cco'}
                    </button>
                  </div>
                  <Input
                    placeholder="cliente@exemplo.com.br (separe múltiplos com vírgula)"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    required
                  />
                </div>

                {/* CC & BCC */}
                {showCcBcc && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Com Cópia (Cc):</label>
                      <Input
                        placeholder="copia@dominio.com"
                        value={cc}
                        onChange={(e) => setCc(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Cópia Oculta (Cco/Bcc):</label>
                      <Input
                        placeholder="copiaoculta@dominio.com"
                        value={bcc}
                        onChange={(e) => setBcc(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Assunto:</label>
                  <Input
                    placeholder="Ex: Seu orçamento personalizado - Luisices"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>

                {/* Message Body & Preview Toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground">Mensagem:</label>
                    <div className="flex items-center gap-1 bg-muted rounded-md p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setPreviewMode('edit')}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          previewMode === 'edit' ? 'bg-background shadow-xs font-semibold' : 'text-muted-foreground'
                        }`}
                      >
                        Escrever
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode('preview')}
                        className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                          previewMode === 'preview' ? 'bg-background shadow-xs font-semibold' : 'text-muted-foreground'
                        }`}
                      >
                        <Eye className="size-3.5" />
                        Prévia
                      </button>
                    </div>
                  </div>

                  {previewMode === 'edit' ? (
                    <Textarea
                      placeholder="Escreva sua mensagem aqui..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="min-h-[220px] font-sans text-sm leading-relaxed"
                      required
                    />
                  ) : (
                    <div className="border rounded-md p-5 bg-white text-gray-900 min-h-[220px] max-h-[450px] overflow-y-auto">
                      <div className="max-w-[550px] mx-auto">
                        <div className="bg-gray-50 border-l-4 border-indigo-600 p-3 rounded mb-4">
                          <h3 className="text-sm font-bold text-gray-800 m-0">Luisices Papelaria Personalizada</h3>
                        </div>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed mb-6">
                          {body || '(Nenhum conteúdo digitado)'}
                        </div>
                        <hr className="border-t border-gray-200 my-4" />
                        <div className="text-xs text-gray-500">
                          <p className="m-0 font-bold">Luisices Personalizados</p>
                          <p className="m-0">WhatsApp: (11) 97060-6433 | {isDev ? 'contato@dev.luisices.com.br' : 'contato@luisices.com.br'}</p>
                          <p className="m-0 text-indigo-600">{isDev ? 'dev.luisices.com.br' : 'luisices.com.br'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons & Daily Quota Status */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Gauge className="size-4 text-primary shrink-0" />
                    <span>
                      Cota diária: <strong>{dailyUsed} de {dailyLimit}</strong> envios hoje ({dailyRemaining} disponíveis)
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setBody('');
                        setSubject('');
                        setRecipient('');
                        setSelectedCustomer('');
                      }}
                    >
                      Limpar
                    </Button>

                    <Button
                      type="submit"
                      disabled={isSending || dailyRemaining === 0}
                      className="gap-2 px-6"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="size-4" />
                          Enviar E-mail
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL: DETALHES DO E-MAIL RECEBIDO ─────────────────────── */}
      <Dialog
        open={!!selectedReceivedEmailId}
        onOpenChange={(open) => !open && setSelectedReceivedEmailId(null)}
      >
        <DialogContent
          className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden"
          aria-describedby={undefined}
        >
          <DialogDescription className="sr-only">
            Detalhes e visualização do e-mail recebido
          </DialogDescription>
          {selectedReceivedEmail && (
            <>
              {/* Modal Header */}
              <div className="p-6 pb-4 border-b border-border/60 space-y-3">
                <DialogTitle className="text-xl font-bold leading-tight">
                  {selectedReceivedEmail.subject || '(Sem assunto)'}
                </DialogTitle>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold text-foreground">De:</span>{' '}
                      <span className="text-primary font-mono">{selectedReceivedEmail.from}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Para:</span>{' '}
                      <span className="font-mono">{selectedReceivedEmail.to.join(', ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3.5" />
                    <span>{new Date(selectedReceivedEmail.receivedAt).toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleReply(selectedReceivedEmail)}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Reply className="size-3.5" />
                    Responder
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      markAsRead(selectedReceivedEmail.id, !selectedReceivedEmail.read);
                    }}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <MailCheck className="size-3.5" />
                    {selectedReceivedEmail.read ? 'Marcar como não lido' : 'Marcar como lido'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEmailToDelete({
                        type: 'received',
                        id: selectedReceivedEmail.id,
                        subject: selectedReceivedEmail.subject || '(Sem assunto)',
                      });
                    }}
                    className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    Excluir
                  </Button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedReceivedEmail.html ? (
                  <div className="w-full bg-white rounded-md border p-2">
                    <iframe
                      title="Conteúdo do e-mail"
                      srcDoc={selectedReceivedEmail.html}
                      sandbox="allow-popups"
                      className="w-full min-h-[350px] border-0"
                    />
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed p-4 bg-muted/30 rounded-md">
                    {selectedReceivedEmail.text || '(Mensagem sem texto)'}
                  </div>
                )}

                {/* Attachments */}
                {selectedReceivedEmail.attachments && selectedReceivedEmail.attachments.length > 0 && (
                  <div className="mt-6 pt-4 border-t space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Paperclip className="size-3.5" />
                      Anexos ({selectedReceivedEmail.attachments.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedReceivedEmail.attachments.map((att, idx) => (
                        <div
                          key={att.id || idx}
                          className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate">{att.filename}</span>
                          </div>
                          {att.downloadUrl && (
                            <a
                              href={att.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline ml-2 shrink-0"
                            >
                              Baixar
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: DETALHES DO E-MAIL ENVIADO ──────────────────────── */}
      <Dialog
        open={!!selectedSentEmailId}
        onOpenChange={(open) => !open && setSelectedSentEmailId(null)}
      >
        <DialogContent
          className="max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden"
          aria-describedby={undefined}
        >
          <DialogDescription className="sr-only">
            Detalhes e visualização do e-mail enviado
          </DialogDescription>
          {selectedSentEmail && (
            <>
              <div className="p-6 pb-4 border-b border-border/60 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <DialogTitle className="text-lg font-bold">
                    {selectedSentEmail.subject || '(Sem assunto)'}
                  </DialogTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEmailToDelete({
                        type: 'sent',
                        id: selectedSentEmail.id,
                        subject: selectedSentEmail.subject || '(Sem assunto)',
                      });
                    }}
                    className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                    Excluir
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1 pt-1">
                  <div>
                    <span className="font-semibold text-foreground">Para:</span> {selectedSentEmail.to.join(', ')}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">De:</span> {selectedSentEmail.from}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Data de Envio:</span>{' '}
                    {new Date(selectedSentEmail.sentAt).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {selectedSentEmail.html ? (
                  <div className="w-full bg-white rounded-md border p-2">
                    <iframe
                      title="Visualização do e-mail enviado"
                      srcDoc={selectedSentEmail.html}
                      sandbox="allow-popups"
                      className="w-full min-h-[300px] border-0"
                    />
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm p-4 bg-muted/30 rounded-md">
                    {selectedSentEmail.text}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL DE CONFIRMAÇÃO DE EXCLUSÃO ─────────────────────── */}
      <AlertDialog
        open={Boolean(emailToDelete)}
        onOpenChange={(open) => {
          if (!open) setEmailToDelete(null);
        }}
      >
        <AlertDialogContent className="w-[calc(100%-1rem)] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {emailToDelete?.type === 'received' ? 'Excluir e-mail' : 'Remover do histórico'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {emailToDelete?.type === 'received'
                ? `Tem certeza que deseja excluir o e-mail "${emailToDelete?.subject}"? Esta ação não poderá ser desfeita.`
                : `Tem certeza que deseja remover o registro "${emailToDelete?.subject}" do histórico de disparos?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!emailToDelete) return;
                if (emailToDelete.type === 'received') {
                  deleteReceived(emailToDelete.id);
                  if (selectedReceivedEmailId === emailToDelete.id) {
                    setSelectedReceivedEmailId(null);
                  }
                  toast.success('E-mail excluído.');
                } else {
                  deleteSent(emailToDelete.id);
                  if (selectedSentEmailId === emailToDelete.id) {
                    setSelectedSentEmailId(null);
                  }
                  toast.success('Registro removido do histórico.');
                }
                setEmailToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Emails;

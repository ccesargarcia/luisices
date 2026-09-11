import { useState, useMemo, useEffect } from 'react';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
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
  RefreshCw,
  Search,
  ExternalLink,
  Copy,
  Check,
  Paperclip,
  Eye,
  Sparkles,
  User,
  Clock,
  Archive,
  MailCheck,
  HelpCircle,
  Loader2,
  SendHorizontal,
  ChevronRight,
  ShieldCheck,
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
    name: 'Agradecimento e Avaliação',
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
    loading,
    sendEmail,
    markAsRead,
    toggleStar,
    setArchived,
    deleteReceived,
    deleteSent,
  } = useEmails();

  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose' | 'settings'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'starred' | 'archived'>('all');

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

  // Detail modal
  const [selectedReceivedEmail, setSelectedReceivedEmail] = useState<ReceivedEmail | null>(null);
  const [selectedSentEmail, setSelectedSentEmail] = useState<SentEmail | null>(null);

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

  // Copy helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copiado para a área de transferência!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filtered received emails
  const filteredReceived = useMemo(() => {
    return receivedEmails.filter((email) => {
      // Filter by type
      if (filterType === 'unread' && email.read) return false;
      if (filterType === 'starred' && !email.starred) return false;
      if (filterType === 'archived' && !email.archived) return false;
      if (filterType !== 'archived' && email.archived) return false;

      // Filter by search query
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

  // Select customer helper in compose
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomer(customerId);
    const found = customers.find((c) => c.id === customerId);
    if (found && found.email) {
      setRecipient(found.email);
      // If body has template placeholder, auto-replace name
      if (body.includes('[Nome do Cliente]')) {
        setBody((prev) => prev.replace(/\[Nome do Cliente\]/g, found.name));
      }
    }
  };

  // Template change helper
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

  // Send email action
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

      // Transform plain text with linebreaks to formatted HTML
      const formattedHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #2d3748; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f7fafc; border-left: 4px solid #4f46e5; padding: 15px 20px; border-radius: 4px; margin-bottom: 25px;">
            <h2 style="margin: 0; color: #1a202c; font-size: 18px;">Luisices Papelaria Personalizada ${isDev ? '(Ambiente DEV)' : ''}</h2>
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
      toast.success('E-mail enviado com sucesso via Resend!');

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
      toast.error(err.message || 'Falha ao enviar e-mail. Verifique a configuração do Resend.');
    } finally {
      setIsSending(false);
    }
  };

  // Reply helper
  const handleReply = (email: ReceivedEmail) => {
    setSelectedReceivedEmail(null);
    setRecipient(email.from);
    setSubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
    const originalText = email.text || email.subject;
    setBody(`\n\n--- Mensagem Original ---\nDe: ${email.from}\nData: ${new Date(email.receivedAt).toLocaleString('pt-BR')}\nAssunto: ${email.subject}\n\n${originalText}`);
    setActiveTab('compose');
  };

  // Format date helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
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

  const projectUrl = isDev
    ? 'https://us-central1-luisices-dev.cloudfunctions.net/resendReceivingWebhook'
    : 'https://us-central1-luisices.cloudfunctions.net/resendReceivingWebhook';

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Mail className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Central de E-mails</h1>
              <p className="text-sm text-muted-foreground">
                Envio e recebimento de e-mails corporativos integrados ao Resend
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('settings')}
            className="gap-1.5"
          >
            <ShieldCheck className="size-4 text-emerald-500" />
            <span className="hidden sm:inline">Configurações & DNS</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setActiveTab('compose');
            }}
            className="gap-2"
          >
            <SendHorizontal className="size-4" />
            <span>Novo E-mail</span>
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto h-10">
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
              <Sparkles className="size-4 text-primary" />
              <span>Escrever</span>
            </TabsTrigger>

            <TabsTrigger value="settings" className="gap-2 text-xs sm:text-sm">
              <HelpCircle className="size-4" />
              <span>Guia Resend</span>
            </TabsTrigger>
          </TabsList>

          {/* Search bar for list tabs */}
          {(activeTab === 'inbox' || activeTab === 'sent') && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar e-mails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          )}
        </div>

        {/* ─── TAB: CAIXA DE ENTRADA (RECEBIDOS) ────────────────────── */}
        <TabsContent value="inbox" className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
              className="text-xs h-8"
            >
              Todos ({receivedEmails.filter((e) => !e.archived).length})
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
              Favoritos
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
                <p>Sincronizando e-mails...</p>
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
                    : 'Os e-mails recebidos através do seu domínio personalizado cadastrado no Resend aparecerão automaticamente aqui.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('settings')}
                  className="mt-4 gap-2"
                >
                  <ExternalLink className="size-4" />
                  Ver como configurar recebimento
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredReceived.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => {
                      setSelectedReceivedEmail(email);
                      if (!email.read) {
                        markAsRead(email.id, true);
                      }
                    }}
                    className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      !email.read ? 'bg-primary/5 font-medium' : ''
                    }`}
                  >
                    {/* Star button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(email.id, !email.starred);
                      }}
                      className="text-muted-foreground hover:text-amber-500 transition-colors p-1"
                    >
                      <Star
                        className={`size-4 ${
                          email.starred ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/40'
                        }`}
                      />
                    </button>

                    {/* Unread indicator */}
                    <div className="flex items-center justify-center size-2">
                      {!email.read && <div className="size-2 rounded-full bg-primary" />}
                    </div>

                    {/* Sender avatar/initial */}
                    <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {email.from ? email.from[0].toUpperCase() : '?'}
                    </div>

                    {/* Content preview */}
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

                    {/* Action buttons on hover */}
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
                        onClick={() => {
                          if (confirm('Deseja excluir este e-mail?')) {
                            deleteReceived(email.id);
                            toast.success('E-mail excluído.');
                          }
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

        {/* ─── TAB: E-MAILS ENVIADOS ───────────────────────────────── */}
        <TabsContent value="sent" className="space-y-4">
          <Card className="border shadow-xs overflow-hidden">
            {sentEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Send className="size-7 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">Nenhum e-mail enviado</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-1">
                  Os e-mails disparados através desta plataforma ficarão registrados aqui com confirmação de entrega do Resend.
                </p>
                <Button
                  size="sm"
                  onClick={() => setActiveTab('compose')}
                  className="mt-4 gap-2"
                >
                  <Sparkles className="size-4" />
                  Escrever primeiro e-mail
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredSent.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => setSelectedSentEmail(email)}
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
                        {email.text || '(Conteúdo em HTML)'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        title="Excluir histórico"
                        onClick={() => {
                          if (confirm('Deseja remover este registro do histórico de enviados?')) {
                            deleteSent(email.id);
                            toast.success('Registro removido.');
                          }
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

        {/* ─── TAB: ESCREVER E-MAIL (COMPOR) ───────────────────────── */}
        <TabsContent value="compose" className="space-y-6">
          <Card className="border shadow-xs">
            <CardHeader className="pb-4 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <SendHorizontal className="size-5 text-primary" />
                    Nova Mensagem
                  </CardTitle>
                  <CardDescription>
                    Envie e-mails corporativos via Resend para clientes e fornecedores
                  </CardDescription>
                </div>

                {/* Templates Dropdown */}
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
                {/* Remetente & Cliente Picker */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sender address */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <span>Remetente (From):</span>
                        {isDev && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-300">
                            Ambiente DEV
                          </Badge>
                        )}
                      </label>
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
                        placeholder="Ex: Luisices Teste <contato@dev.luisices.com.br>"
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
                              <SelectItem value="Resend Sandbox <onboarding@resend.dev>">
                                Resend Sandbox &lt;onboarding@resend.dev&gt;
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
                    <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>Preencher com Cliente Cadastrado:</span>
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
                    </label>
                    <Select value={selectedCustomer} onValueChange={handleSelectCustomer}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Selecione um cliente para auto-preencher..." />
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

                {/* Recipient (To) */}
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
                    placeholder="email@cliente.com.br (separe múltiplos com vírgula)"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    required
                  />
                </div>

                {/* CC and BCC */}
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
                    placeholder="Ex: Seu orçamento personalizado Luisices"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>

                {/* Mode toggle: Edit vs Preview */}
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
                        Prévia do E-mail
                      </button>
                    </div>
                  </div>

                  {previewMode === 'edit' ? (
                    <Textarea
                      placeholder="Escreva sua mensagem aqui..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={12}
                      className="font-mono text-sm leading-relaxed"
                      required
                    />
                  ) : (
                    <div className="border rounded-md p-5 bg-white text-gray-900 min-h-[300px] max-h-[450px] overflow-y-auto">
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
                          <p className="m-0">WhatsApp: (11) 97060-6433 | contato@luisices.com.br</p>
                          <p className="m-0 text-indigo-600">luisices.com.br</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t">
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

                  <Button type="submit" disabled={isSending} className="gap-2 px-6">
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
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB: GUIA DE CONFIGURAÇÃO (DNS & WEBHOOK) ───────────── */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Custom Receiving Domain */}
            <Card className="border shadow-xs">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Mail className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">1. Domínio de Recebimento (DNS MX)</CardTitle>
                    <CardDescription>
                      Configure o registro MX para receber e-mails no seu domínio
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 text-sm">
                <p className="text-muted-foreground leading-relaxed">
                  Para que os e-mails enviados para <code>@luisices.com.br</code> ou um subdomínio cheguem ao Resend, é necessário adicionar o registro MX no seu provedor de DNS (ex: Cloudflare, Hostinger, Registro.br).
                </p>

                <div className="bg-muted/50 border rounded-lg p-3 space-y-2 font-mono text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Tipo de Registro:</span>
                    <span className="font-bold">MX</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Nome / Host:</span>
                    <span className="font-bold">@ (ou mail / inbound)</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Prioridade:</span>
                    <span className="font-bold">10</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Valor / Servidor:</span>
                    <span className="font-bold text-primary truncate max-w-[200px]">
                      feedback-smtp.us-east-1.amazonses.com
                    </span>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200">
                  <strong>Atenção:</strong> Se você já possui um servidor de e-mail ativo no domínio raiz (como Titan ou Google Workspace), utilize um subdomínio como <code>mail.luisices.com.br</code> para não interromper a caixa existente.
                </div>

                <a
                  href="https://resend.com/docs/dashboard/receiving/custom-domains"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium pt-1"
                >
                  <ExternalLink className="size-3.5" />
                  Abrir documentação oficial do Resend (Custom Domains)
                </a>
              </CardContent>
            </Card>

            {/* Card 2: Webhook Endpoint */}
            <Card className="border shadow-xs">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">2. Webhook no Painel Resend</CardTitle>
                    <CardDescription>
                      Cadastre a rota para que os e-mails cheguem instantaneamente aqui
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 text-sm">
                <p className="text-muted-foreground leading-relaxed">
                  No painel do Resend em <strong>Webhooks &rarr; Add Webhook</strong>, adicione a URL abaixo e marque o evento <code>email.received</code>:
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Endpoint Webhook (Cloud Functions):</label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={projectUrl}
                      className="font-mono text-xs bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(projectUrl, 'webhook')}
                      title="Copiar URL"
                    >
                      {copiedKey === 'webhook' ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/50 border rounded-lg p-3 space-y-1.5 text-xs">
                  <div className="font-semibold text-foreground">Passo a passo no Resend:</div>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Acesse <a href="https://resend.com/webhooks" target="_blank" rel="noreferrer" className="text-primary hover:underline">resend.com/webhooks</a></li>
                    <li>Clique em <strong>Add Webhook</strong></li>
                    <li>Cole a URL acima no campo <strong>Endpoint URL</strong></li>
                    <li>Selecione o evento <strong>email.received</strong></li>
                    <li>Clique em <strong>Add</strong> para salvar</li>
                  </ol>
                </div>

                <a
                  href="https://resend.com/docs/dashboard/receiving/create-receiving-webhook"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium pt-1"
                >
                  <ExternalLink className="size-3.5" />
                  Abrir documentação oficial do Resend (Create Receiving Webhook)
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Secret configuration guide */}
          <Card className="border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Chave da API Resend (RESEND_API_KEY)
              </CardTitle>
              <CardDescription>
                A chave de API é gerenciada de forma segura através do Google Cloud Secret Manager nas Cloud Functions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Para atualizar a chave no backend do Firebase, basta rodar o comando abaixo no terminal de desenvolvimento:
              </p>
              <div className="flex items-center gap-2 bg-muted rounded-lg p-3 font-mono text-xs">
                <code className="flex-1">firebase functions:secrets:set RESEND_API_KEY</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => copyToClipboard('firebase functions:secrets:set RESEND_API_KEY', 'cmd')}
                >
                  {copiedKey === 'cmd' ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL: DETALHES DO E-MAIL RECEBIDO ─────────────────────── */}
      <Dialog
        open={!!selectedReceivedEmail}
        onOpenChange={(open) => !open && setSelectedReceivedEmail(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {selectedReceivedEmail && (
            <>
              {/* Header */}
              <div className="p-6 pb-4 border-b space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <DialogTitle className="text-xl font-bold leading-tight">
                    {selectedReceivedEmail.subject || '(Sem assunto)'}
                  </DialogTitle>
                </div>

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

                {/* Action buttons */}
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
                      setSelectedReceivedEmail((prev) => prev ? { ...prev, read: !prev.read } : null);
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
                      if (confirm('Deseja excluir este e-mail?')) {
                        deleteReceived(selectedReceivedEmail.id);
                        setSelectedReceivedEmail(null);
                        toast.success('E-mail excluído.');
                      }
                    }}
                    className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    Excluir
                  </Button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedReceivedEmail.html ? (
                  <div className="w-full bg-white rounded-md border p-2">
                    <iframe
                      title="Conteúdo do e-mail"
                      srcDoc={selectedReceivedEmail.html}
                      sandbox="allow-same-origin"
                      className="w-full min-h-[350px] border-0"
                    />
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed p-4 bg-muted/30 rounded-md">
                    {selectedReceivedEmail.text || '(Mensagem vazia)'}
                  </div>
                )}

                {/* Attachments if any */}
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
        open={!!selectedSentEmail}
        onOpenChange={(open) => !open && setSelectedSentEmail(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
          {selectedSentEmail && (
            <>
              <div className="p-6 pb-4 border-b space-y-2">
                <DialogTitle className="text-lg font-bold">
                  {selectedSentEmail.subject || '(Sem assunto)'}
                </DialogTitle>
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
                      sandbox="allow-same-origin"
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
    </div>
  );
}
export default Emails;

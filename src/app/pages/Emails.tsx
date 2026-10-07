import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEmails } from '../../hooks/useEmails';
import { useFirebaseCustomers } from '../../hooks/useFirebaseCustomers';
import { useFirebaseOrders } from '../../hooks/useFirebaseOrders';
import { useUserSettings } from '../../hooks/useUserSettings';
import { firebaseStorageService } from '../../services/firebaseStorageService';
import { ReceivedEmail, SentEmail, SendEmailPayload } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
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
  ArchiveRestore,
  MailCheck,
  Loader2,
  Plus,
  SendHorizontal,
  MailOpen,
  Gauge,
  RefreshCw,
  ArrowLeft,
  Copy,
  Check,
  Tag,
  BookmarkPlus,
  Info,
  User,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  subject: string;
  body: string;
  isCustom?: boolean;
}

export interface ComposeAttachment {
  name: string;
  url: string;
  isPdf?: boolean;
  size?: number;
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'blank',
    name: 'Mensagem em Branco',
    description: 'Iniciar com mensagem vazia',
    subject: '',
    body: '',
  },
  {
    id: 'quote',
    name: 'Orçamento de Papelaria',
    description: 'Proposta detalhada de itens, valores e prazos',
    subject: 'Orçamento Personalizado - {{nome_loja}}',
    body: `Olá, {{cliente_primeiro_nome}}!

Agradecemos o seu interesse na {{nome_loja}}! ✨

Conforme conversamos, preparamos a proposta para o seu projeto:

📋 Detalhes da Encomenda:
- Itens: [Descrever itens e quantidades]
- Tema / Personalização: [Tema escolhido]
- Prazo de Produção: {{prazo_producao}} (após aprovação da arte digital)
- Valor Total: R$ 0,00

💳 Condições de Pagamento:
- Chave Pix: {{chave_pix}}
- 50% de entrada para início do design e restante na finalização.

Ficamos à total disposição para tirar qualquer dúvida ou realizar ajustes.

Com carinho,
Equipe {{nome_loja}}`,
  },
  {
    id: 'art_approval',
    name: 'Aprovação de Arte Digital',
    description: 'Envio da amostra para validação antes do corte',
    subject: 'Sua Arte Digital está Pronta para Aprovação! 🎨 - {{nome_loja}}',
    body: `Olá, {{cliente_primeiro_nome}}!

A arte do seu pedido personalizado foi finalizada com todo carinho! ✂️🎨

Por favor, confira com atenção os seguintes pontos:
1. Grafia do nome e idade/data;
2. Cores e elementos gráficos;
3. Formato e disposição dos itens.

Assim que você nos der o "OK", iniciaremos imediatamente a impressão e montagem artesanal.

Qualquer ajuste que desejar, é só nos responder por aqui ou pelo WhatsApp: {{whatsapp}}.

Aguardamos seu retorno para darmos andamento!

Com carinho,
Equipe {{nome_loja}}`,
  },
  {
    id: 'in_production',
    name: 'Pedido em Produção',
    description: 'Aviso de início da produção artesanal',
    subject: 'Seu pedido entrou em produção! ✂️ - {{nome_loja}}',
    body: `Olá, {{cliente_primeiro_nome}}!

Passando para avisar que a arte foi aprovada e o seu pedido já entrou na nossa bancada de produção! 🪄

Estamos cuidando da impressão em alta resolução, laminação e corte de cada detalhe com toda dedicação.

Prazo estimado de produção: {{prazo_producao}}.

Assim que tudo estiver pronto e embalado, avisaremos você!

Atenciosamente,
Equipe {{nome_loja}}`,
  },
  {
    id: 'ready_delivery',
    name: 'Pedido Pronto para Retirada / Envio',
    description: 'Encomenda finalizada e embalada com carinho',
    subject: 'Seu pedido está prontinho! 🎉📦 - {{nome_loja}}',
    body: `Olá, {{cliente_primeiro_nome}}!

Temos uma ótima notícia: o seu pedido personalizado está pronto e embalado com todo cuidado! ✨🎉

📍 [Se for retirada no ateliê]:
Você já pode combinar o melhor horário para retirada conosco através do WhatsApp: {{whatsapp}}.

🚚 [Se o pedido for via envio/entrega]:
Seu pacote será despachado em breve e enviaremos o código de rastreio assim que postado.

Muito obrigado por escolher e confiar na {{nome_loja}}!

Com carinho,
Equipe {{nome_loja}}`,
  },
  {
    id: 'thank_you',
    name: 'Agradecimento & Avaliação',
    description: 'Pós-venda e convite para postar fotos nas redes',
    subject: 'Obrigado por escolher a {{nome_loja}}! 💖',
    body: `Olá, {{cliente_primeiro_nome}}!

Esperamos que você tenha amado os seus personalizados tanto quanto nós amamos criá-los para você! 🥰

A sua opinião significa muito para nós.
Se puder tirar fotos do resultado e nos marcar nas redes sociais, ficaremos muito felizes! Isso nos ajuda a continuar criando com amor.

Esperamos te ver em breve para novas criações!

Com carinho,
Equipe {{nome_loja}}`,
  },
];

const DYNAMIC_TAGS = [
  { tag: '{{cliente_nome}}', label: 'Nome Completo' },
  { tag: '{{cliente_primeiro_nome}}', label: '1º Nome' },
  { tag: '{{cliente_email}}', label: 'E-mail Cliente' },
  { tag: '{{nome_loja}}', label: 'Nome da Loja' },
  { tag: '{{whatsapp}}', label: 'WhatsApp' },
  { tag: '{{chave_pix}}', label: 'Chave Pix' },
  { tag: '{{prazo_producao}}', label: 'Prazo Produção' },
];

const STORAGE_CUSTOM_TEMPLATES_KEY = 'luisices_custom_email_templates';

function formatRelativeDate(isoString?: string): string {
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

  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function Emails() {
  const { user } = useAuth();
  const { customers } = useFirebaseCustomers();
  const { orders } = useFirebaseOrders();
  const { settings } = useUserSettings();
  const {
    receivedEmails,
    sentEmails,
    unreadCount,
    usage,
    loadingUsage,
    refreshUsage,
    loading,
    sendEmail,
    markAsRead,
    toggleStar,
    setArchived,
    deleteReceived,
    deleteSent,
  } = useEmails();

  // Informações do negócio dinamizadas das Configurações
  const businessName = settings?.businessName?.trim() || 'Luisices Personalizados';
  const businessPhone = settings?.whatsappPhone?.trim() || settings?.businessPhone?.trim() || '(11) 97060-6433';
  const businessEmail = settings?.businessEmail?.trim() || '';
  const instagramUrl = settings?.instagramUrl?.trim() || '';
  const websiteUrl = settings?.websiteUrl?.trim() || '';
  const businessLogo = settings?.logo || '';

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

  const defaultSender = useMemo(() => {
    if (businessEmail) {
      return `${businessName} <${businessEmail}>`;
    }
    return isDev
      ? 'Luisices Dev <contato@dev.luisices.com.br>'
      : 'Luisices <contato@luisices.com.br>';
  }, [businessName, businessEmail, isDev]);

  // Cota de envio
  const sentTodayCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return sentEmails.filter((e) => e.sentAt && e.sentAt.startsWith(today)).length;
  }, [sentEmails]);

  const dailyUsed = Math.max(usage?.daily.used ?? 0, sentTodayCount);
  const dailyLimit = usage?.daily.limit ?? 100;
  const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);
  const dailyPercent = Math.min(100, Math.round((dailyUsed / dailyLimit) * 100));

  // Pastas & Navegação Master-Detail
  type FolderType = 'inbox' | 'sent' | 'starred' | 'archived';
  const [activeFolder, setActiveFolder] = useState<FolderType>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');

  // Seleção de mensagem ativa no painel de leitura
  const [selectedEmailType, setSelectedEmailType] = useState<'received' | 'sent' | null>('received');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // Modal de composição (Nova Mensagem / Resposta)
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [sender, setSender] = useState(defaultSender);
  const [customSender, setCustomSender] = useState('');
  const [isCustomSender, setIsCustomSender] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [attachments, setAttachments] = useState<ComposeAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [composeMode, setComposeMode] = useState<'write' | 'preview'>('write');
  const [copiedText, setCopiedText] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modelos customizados do usuário
  const [customTemplates, setCustomTemplates] = useState<EmailTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CUSTOM_TEMPLATES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allTemplates = useMemo(() => {
    return [...DEFAULT_TEMPLATES, ...customTemplates];
  }, [customTemplates]);

  // Exclusão
  const [emailToDelete, setEmailToDelete] = useState<{
    type: 'received' | 'sent';
    id: string;
    subject: string;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Contagens para badges de navegação
  const inboxCount = useMemo(() => receivedEmails.filter((e) => !e.archived).length, [receivedEmails]);
  const starredCount = useMemo(
    () => receivedEmails.filter((e) => e.starred && !e.archived).length,
    [receivedEmails]
  );
  const archivedCount = useMemo(() => receivedEmails.filter((e) => e.archived).length, [receivedEmails]);

  // Mensagens filtradas de acordo com a pasta atual
  const displayedEmails = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    if (activeFolder === 'sent') {
      return sentEmails
        .filter((email) => {
          if (!q) return true;
          const matchSub = email.subject?.toLowerCase().includes(q);
          const matchTo = email.to?.some((t) => t.toLowerCase().includes(q));
          const matchTxt = (email.text || email.html)?.toLowerCase().includes(q);
          return matchSub || matchTo || matchTxt;
        })
        .map((e) => ({ ...e, _type: 'sent' as const }));
    }

    return receivedEmails
      .filter((email) => {
        if (activeFolder === 'inbox') {
          if (email.archived) return false;
          if (filterMode === 'unread' && email.read) return false;
        } else if (activeFolder === 'starred') {
          if (email.archived || !email.starred) return false;
          if (filterMode === 'unread' && email.read) return false;
        } else if (activeFolder === 'archived') {
          if (!email.archived) return false;
        }

        if (q) {
          const matchSub = email.subject?.toLowerCase().includes(q);
          const matchFrom = email.from?.toLowerCase().includes(q);
          const matchTxt = email.text?.toLowerCase().includes(q);
          return matchSub || matchFrom || matchTxt;
        }
        return true;
      })
      .map((e) => ({ ...e, _type: 'received' as const }));
  }, [receivedEmails, sentEmails, activeFolder, filterMode, searchQuery]);

  // Mensagem atualmente aberta no painel de leitura
  const currentReceivedEmail = useMemo(() => {
    if (selectedEmailType !== 'received' || !selectedEmailId) return null;
    return receivedEmails.find((e) => e.id === selectedEmailId) ?? null;
  }, [receivedEmails, selectedEmailType, selectedEmailId]);

  const currentSentEmail = useMemo(() => {
    if (selectedEmailType !== 'sent' || !selectedEmailId) return null;
    return sentEmails.find((e) => e.id === selectedEmailId) ?? null;
  }, [sentEmails, selectedEmailType, selectedEmailId]);

  // Detecção inteligente de cliente e pedidos vinculados
  const matchedCustomer = useMemo(() => {
    if (!currentReceivedEmail) return null;
    const fromClean = currentReceivedEmail.from.toLowerCase();
    return (
      customers.find(
        (c) =>
          (c.email && fromClean.includes(c.email.toLowerCase())) ||
          (c.name && fromClean.includes(c.name.toLowerCase()))
      ) || null
    );
  }, [currentReceivedEmail, customers]);

  const matchedCustomerOrders = useMemo(() => {
    if (!matchedCustomer) return [];
    return orders.filter(
      (o) =>
        (o.customerId && o.customerId === matchedCustomer.id) ||
        (o.customerName && o.customerName.toLowerCase() === matchedCustomer.name.toLowerCase())
    );
  }, [matchedCustomer, orders]);

  // Auto-selecionar o primeiro e-mail se nada estiver selecionado no desktop
  useEffect(() => {
    if (!selectedEmailId && displayedEmails.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 1024) {
      const first = displayedEmails[0];
      setSelectedEmailId(first.id);
      setSelectedEmailType(first._type);
    }
  }, [displayedEmails, selectedEmailId]);

  // Marcar como lido automaticamente ao abrir e-mail recebido
  useEffect(() => {
    if (currentReceivedEmail && !currentReceivedEmail.read) {
      markAsRead(currentReceivedEmail.id, true).catch(() => {});
    }
  }, [currentReceivedEmail, markAsRead]);

  // Substituição de tags dinâmicas
  const replaceDynamicTags = (content: string, customName?: string, customEmail?: string) => {
    const cust = selectedCustomerId ? customers.find((c) => c.id === selectedCustomerId) : null;
    const name = customName || cust?.name || '';
    const firstName = name.split(' ')[0] || '';
    const emailAddr = customEmail || cust?.email || recipient || '';

    return content
      .replace(/\{\{cliente_nome\}\}/g, name || 'Cliente')
      .replace(/\{\{cliente_primeiro_nome\}\}/g, firstName || 'Cliente')
      .replace(/\{\{cliente_email\}\}/g, emailAddr)
      .replace(/\{\{nome_loja\}\}/g, businessName)
      .replace(/\{\{whatsapp\}\}/g, businessPhone)
      .replace(/\{\{chave_pix\}\}/g, businessPhone)
      .replace(/\{\{prazo_producao\}\}/g, '5 a 7 dias úteis');
  };

  // Inserir tag dinâmica na posição atual do cursor
  const handleInsertTag = (tag: string) => {
    if (!textareaRef.current) {
      setBody((prev) => prev + ' ' + tag);
      return;
    }
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newText = body.substring(0, start) + tag + body.substring(end);
    setBody(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Upload de anexos na composição
  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 25MB');
      return;
    }

    setIsUploadingAttachment(true);
    try {
      let uploadedUrl: string;
      const isPdf = file.type === 'application/pdf';

      if (file.type.startsWith('image/')) {
        uploadedUrl = await firebaseStorageService.uploadImage(file, user.uid, 'banner');
      } else {
        const orderAtt = await firebaseStorageService.uploadOrderAttachment(file, user.uid, 'email_draft');
        uploadedUrl = orderAtt.url;
      }

      const item: ComposeAttachment = {
        name: file.name,
        url: uploadedUrl,
        isPdf,
        size: file.size,
      };

      setAttachments((prev) => [...prev, item]);
      toast.success(`Arquivo "${file.name}" anexado.`);
    } catch (err: any) {
      console.error('Erro ao anexar arquivo:', err);
      toast.error(err.message || 'Falha ao anexar arquivo.');
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = (url: string) => {
    setAttachments((prev) => prev.filter((a) => a.url !== url));
  };

  // Selecionar cliente cadastrado
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const found = customers.find((c) => c.id === customerId);
    if (found && found.email) {
      setRecipient(found.email);
      setSubject((prev) => replaceDynamicTags(prev, found.name, found.email));
      setBody((prev) => replaceDynamicTags(prev, found.name, found.email));
    }
  };

  // Selecionar modelo
  const handleSelectTemplate = (templateId: string) => {
    const tpl = allTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    setSubject(replaceDynamicTags(tpl.subject));
    setBody(replaceDynamicTags(tpl.body));
  };

  // Salvar mensagem atual como novo modelo customizado
  const handleSaveAsTemplate = () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Preencha o assunto e o corpo para salvar como modelo.');
      return;
    }
    const templateName = window.prompt('Dê um nome para este novo modelo de e-mail:', subject.slice(0, 30));
    if (!templateName || !templateName.trim()) return;

    const newTpl: EmailTemplate = {
      id: `custom_${Date.now()}`,
      name: templateName.trim(),
      description: 'Modelo salvo pelo ateliê',
      subject,
      body,
      isCustom: true,
    };

    const updated = [...customTemplates, newTpl];
    setCustomTemplates(updated);
    try {
      localStorage.setItem(STORAGE_CUSTOM_TEMPLATES_KEY, JSON.stringify(updated));
      toast.success('Modelo salvo com sucesso!');
    } catch {
      toast.error('Não foi possível gravar no armazenamento local.');
    }
  };

  // Montar HTML dinâmico com identidade visual da loja e anexos
  const generateFormattedHtml = (messageBody: string): string => {
    const escaped = messageBody
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br />');

    const attachmentsHtml =
      attachments.length > 0
        ? `
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed #cbd5e1;">
          <div style="font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 10px;">📎 Arquivos & Documentos Anexados:</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${attachments
              .map(
                (att) => `
              <a href="${att.url}" target="_blank" style="display: inline-block; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 14px; font-size: 13px; color: #4f46e5; text-decoration: none; font-weight: 500; margin-right: 8px; margin-bottom: 8px;">
                ⬇️ ${att.name}
              </a>
            `
              )
              .join('')}
          </div>
        </div>
      `
        : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #4f46e5; padding: 24px 28px; text-align: left;">
              ${
                businessLogo
                  ? `<img src="${businessLogo}" alt="${businessName}" style="max-height: 44px; margin-bottom: 8px; border-radius: 6px; display: block;" />`
                  : ''
              }
              <h1 style="margin: 0; color: #ffffff; font-size: 19px; font-weight: 700; letter-spacing: -0.02em;">${businessName}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 28px; font-size: 15px; line-height: 1.65; color: #334155;">
              ${escaped}
              ${attachmentsHtml}
            </td>
          </tr>
          <!-- Signature & Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 28px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; line-height: 1.5;">
              <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${businessName}</div>
              ${businessPhone ? `<div style="margin-top: 3px;">WhatsApp: <strong>${businessPhone}</strong></div>` : ''}
              ${businessEmail ? `<div style="margin-top: 2px;">E-mail: <a href="mailto:${businessEmail}" style="color: #4f46e5; text-decoration: none;">${businessEmail}</a></div>` : ''}
              ${instagramUrl ? `<div style="margin-top: 2px;">Instagram: <a href="${instagramUrl}" target="_blank" style="color: #4f46e5; text-decoration: none;">${instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\/?/, '@')}</a></div>` : ''}
              ${websiteUrl ? `<div style="margin-top: 2px;">Site: <a href="${websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}" target="_blank" style="color: #4f46e5; text-decoration: none;">${websiteUrl.replace(/^https?:\/\//, '')}</a></div>` : ''}
              <div style="margin-top: 10px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                Ateliê de Papelaria Personalizada & Presentes Criativos
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  };

  // Envio do formulário
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) {
      toast.error('Informe ao menos um destinatário válido.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Informe o assunto da mensagem.');
      return;
    }
    if (!body.trim()) {
      toast.error('Escreva o conteúdo da mensagem.');
      return;
    }

    const recipientList = recipient
      .split(/[,;\s]+/)
      .map((r) => r.trim())
      .filter((r) => r.includes('@'));

    if (recipientList.length === 0) {
      toast.error('Informe um e-mail de destinatário válido.');
      return;
    }

    setIsSending(true);
    try {
      const activeSender = isCustomSender && customSender.trim() ? customSender.trim() : sender;
      const htmlContent = generateFormattedHtml(body);

      const payload: SendEmailPayload = {
        from: activeSender,
        to: recipientList,
        subject: subject.trim(),
        text: body,
        html: htmlContent,
      };

      if (cc.trim()) {
        payload.cc = cc.split(/[,;\s]+/).filter((c) => c.includes('@'));
      }
      if (bcc.trim()) {
        payload.bcc = bcc.split(/[,;\s]+/).filter((b) => b.includes('@'));
      }

      await sendEmail(payload);
      toast.success('E-mail enviado com sucesso!');

      // Reset
      setRecipient('');
      setSelectedCustomerId('');
      setSubject('');
      setBody('');
      setCc('');
      setBcc('');
      setAttachments([]);
      setShowCcBcc(false);
      setIsComposeOpen(false);
      setActiveFolder('sent');
    } catch (err: any) {
      console.error('Erro ao enviar e-mail:', err);
      toast.error(err.message || 'Falha ao enviar e-mail.');
    } finally {
      setIsSending(false);
    }
  };

  // Ação de Responder
  const handleStartReply = (email: ReceivedEmail) => {
    setRecipient(email.from);
    setSubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
    const originalText = email.text || email.subject;
    setBody(
      `\n\n--- Mensagem Original ---\nDe: ${email.from}\nData: ${new Date(email.receivedAt).toLocaleString('pt-BR')}\nAssunto: ${email.subject}\n\n${originalText}`
    );
    setAttachments([]);
    setIsComposeOpen(true);
  };

  // Copiar conteúdo da mensagem atual
  const handleCopyMessageText = () => {
    const textToCopy = currentReceivedEmail
      ? currentReceivedEmail.text || currentReceivedEmail.subject
      : currentSentEmail
      ? currentSentEmail.text || currentSentEmail.subject
      : '';

    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedText(true);
    toast.success('Conteúdo copiado!');
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ─── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Central de E-mails</h1>
            {isDev && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-300 font-mono text-[10px] px-1.5 py-0 h-5">
                DEV
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Gestão profissional de mensagens, orçamentos e notificações do ateliê
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Cota Compacta */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card text-xs">
            <Gauge className="size-4 text-primary shrink-0" />
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">{dailyUsed}/{dailyLimit}</span>
              <span className="text-muted-foreground hidden sm:inline">envios hoje</span>
            </div>
            <button
              type="button"
              onClick={() => refreshUsage()}
              title="Atualizar cota"
              className="text-muted-foreground hover:text-foreground transition-colors ml-1 p-0.5 rounded"
            >
              <RefreshCw className={`size-3 ${loadingUsage ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <Button
            onClick={() => {
              setRecipient('');
              setSelectedCustomerId('');
              setSubject('');
              setBody('');
              setAttachments([]);
              setIsComposeOpen(true);
            }}
            className="gap-2 shadow-sm"
          >
            <Plus className="size-4" />
            <span>Nova Mensagem</span>
          </Button>
        </div>
      </div>

      {/* ─── Master-Detail Layout Principal ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs min-h-[640px] h-[calc(100vh-13.5rem)] max-h-[880px]">
        {/* ── Coluna 1: Pastas & Navegação (md: 3 colunas) ── */}
        <div className="hidden md:flex md:col-span-3 lg:col-span-2 border-r border-border/60 flex-col justify-between bg-muted/20 p-3">
          <div className="space-y-1">
            <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pastas
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveFolder('inbox');
                setSelectedEmailId(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeFolder === 'inbox'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox className="size-4" />
                <span>Caixa de Entrada</span>
              </div>
              {unreadCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeFolder === 'inbox' ? 'bg-primary-foreground text-primary' : 'bg-primary/10 text-primary'
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveFolder('sent');
                setSelectedEmailId(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeFolder === 'sent'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Send className="size-4" />
                <span>Enviados</span>
              </div>
              <span className="text-[11px] opacity-75">{sentEmails.length}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveFolder('starred');
                setSelectedEmailId(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeFolder === 'starred'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className="size-4" />
                <span>Favoritos</span>
              </div>
              {starredCount > 0 && <span className="text-[11px] opacity-75">{starredCount}</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveFolder('archived');
                setSelectedEmailId(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeFolder === 'archived'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Archive className="size-4" />
                <span>Arquivados</span>
              </div>
              {archivedCount > 0 && <span className="text-[11px] opacity-75">{archivedCount}</span>}
            </button>
          </div>

          {/* Mini Card de Cota Resend */}
          <div className="p-2.5 rounded-lg border bg-background/80 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between font-medium">
              <span className="text-muted-foreground">Cota Diária</span>
              <span className={dailyPercent >= 80 ? 'text-destructive font-semibold' : 'text-primary'}>
                {dailyRemaining} restam
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  dailyPercent >= 90 ? 'bg-destructive' : dailyPercent >= 75 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${dailyPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Reinicia às 21h</p>
          </div>
        </div>

        {/* ── Coluna 2: Lista de Mensagens / Master (md: 4 ou 5 colunas) ── */}
        <div
          className={`col-span-1 md:col-span-4 lg:col-span-4 border-r border-border/60 flex flex-col bg-background ${
            selectedEmailId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Barra de Busca & Filtros Rápidos */}
          <div className="p-3 border-b border-border/60 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por assunto ou contato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-muted/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Abas mobile e filtro unread */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              {/* Pasta no mobile */}
              <div className="md:hidden">
                <Select value={activeFolder} onValueChange={(v) => setActiveFolder(v as FolderType)}>
                  <SelectTrigger className="h-7 text-xs w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbox">Caixa de Entrada</SelectItem>
                    <SelectItem value="sent">Enviados</SelectItem>
                    <SelectItem value="starred">Favoritos</SelectItem>
                    <SelectItem value="archived">Arquivados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {activeFolder !== 'sent' && (
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md text-[11px] ml-auto">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      filterMode === 'all' ? 'bg-background font-semibold text-foreground shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('unread')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      filterMode === 'unread' ? 'bg-background font-semibold text-foreground shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    Não lidos
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Lista com Rolagem */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/50">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary mb-2" />
                <p className="text-xs">Sincronizando e-mails...</p>
              </div>
            ) : displayedEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center text-muted-foreground">
                <Inbox className="size-8 stroke-[1.5] mb-2 opacity-50" />
                <p className="text-xs font-medium text-foreground">Nenhuma mensagem encontrada</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {searchQuery ? 'Tente outros termos na busca.' : 'Esta pasta está vazia no momento.'}
                </p>
              </div>
            ) : (
              displayedEmails.map((email) => {
                const isSelected = selectedEmailId === email.id;
                const isUnread = email._type === 'received' && !email.read;
                const isStarred = email._type === 'received' && email.starred;

                return (
                  <div
                    key={email.id}
                    onClick={() => {
                      setSelectedEmailId(email.id);
                      setSelectedEmailType(email._type);
                    }}
                    className={`p-3 cursor-pointer transition-colors relative border-l-2 ${
                      isSelected
                        ? 'bg-primary/5 border-primary'
                        : isUnread
                        ? 'bg-muted/30 border-transparent hover:bg-muted/50'
                        : 'border-transparent hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isUnread && <span className="size-2 rounded-full bg-primary shrink-0" />}
                        <span
                          className={`text-xs truncate ${
                            isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/90'
                          }`}
                        >
                          {email._type === 'sent'
                            ? `Para: ${email.to.join(', ')}`
                            : email.from.replace(/<.*?>/, '').trim() || email.from}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] text-muted-foreground">
                          {formatRelativeDate(email._type === 'sent' ? email.sentAt : email.receivedAt)}
                        </span>
                        {email._type === 'received' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStar(email.id, !email.starred);
                            }}
                            className="text-muted-foreground hover:text-amber-500 transition-colors p-0.5"
                          >
                            <Star
                              className={`size-3.5 ${
                                isStarred ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/60'
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      className={`text-xs truncate mb-1 ${
                        isUnread ? 'font-semibold text-foreground' : 'text-foreground/80'
                      }`}
                    >
                      {email.subject || '(Sem assunto)'}
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {email.text ? email.text.replace(/\s+/g, ' ') : '(Mensagem formatada em HTML)'}
                    </p>

                    {email._type === 'received' && email.attachments && email.attachments.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1.5">
                        <Paperclip className="size-3" />
                        <span>{email.attachments.length} anexo(s)</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Coluna 3: Leitura da Mensagem / Detail (md: 5 ou 6 colunas) ── */}
        <div
          className={`col-span-1 md:col-span-5 lg:col-span-6 flex flex-col bg-background min-w-0 ${
            !selectedEmailId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {currentReceivedEmail || currentSentEmail ? (
            <div className="flex flex-col h-full min-w-0">
              {/* Barra de Ações Superior */}
              <div className="p-3 border-b border-border/60 flex items-center justify-between gap-2 bg-muted/10 shrink-0">
                <div className="flex items-center gap-1">
                  {/* Botão voltar no mobile */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEmailId(null)}
                    className="md:hidden h-8 px-2 gap-1 text-xs"
                  >
                    <ArrowLeft className="size-4" />
                    <span>Lista</span>
                  </Button>

                  {currentReceivedEmail && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleStartReply(currentReceivedEmail)}
                        className="h-8 gap-1 text-xs shadow-xs"
                      >
                        <Reply className="size-3.5" />
                        <span>Responder</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsRead(currentReceivedEmail.id, !currentReceivedEmail.read)}
                        className="h-8 gap-1 text-xs"
                        title={currentReceivedEmail.read ? 'Marcar como não lido' : 'Marcar como lido'}
                      >
                        <MailCheck className="size-3.5" />
                        <span className="hidden sm:inline">
                          {currentReceivedEmail.read ? 'Não lido' : 'Lido'}
                        </span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setArchived(currentReceivedEmail.id, !currentReceivedEmail.archived)}
                        className="h-8 gap-1 text-xs"
                        title={currentReceivedEmail.archived ? 'Desarquivar' : 'Arquivar'}
                      >
                        {currentReceivedEmail.archived ? (
                          <ArchiveRestore className="size-3.5" />
                        ) : (
                          <Archive className="size-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {currentReceivedEmail.archived ? 'Desarquivar' : 'Arquivar'}
                        </span>
                      </Button>
                    </>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyMessageText}
                    className="h-8 gap-1 text-xs"
                    title="Copiar texto da mensagem"
                  >
                    {copiedText ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    <span className="hidden sm:inline">Copiar</span>
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const isRec = Boolean(currentReceivedEmail);
                    const item = currentReceivedEmail || currentSentEmail;
                    if (!item) return;
                    setEmailToDelete({
                      type: isRec ? 'received' : 'sent',
                      id: item.id,
                      subject: item.subject || '(Sem assunto)',
                    });
                  }}
                  className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Excluir mensagem"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              {/* Informação do Cliente & Pedidos Vinculados */}
              {matchedCustomer && (
                <div className="mx-4 sm:mx-6 mt-3 p-2.5 rounded-lg border bg-primary/5 border-primary/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="size-4 text-primary shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold text-foreground">{matchedCustomer.name}</span>
                      {matchedCustomerOrders.length > 0 ? (
                        <span className="text-muted-foreground ml-1.5">
                          · {matchedCustomerOrders.length} pedido(s) cadastrado(s)
                        </span>
                      ) : (
                        <span className="text-muted-foreground ml-1.5">· Cliente cadastrado no sistema</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {matchedCustomer.phone && (
                      <a
                        href={`https://wa.me/${matchedCustomer.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                      >
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Cabeçalho da Mensagem */}
              <div className="p-4 sm:p-5 border-b border-border/60 space-y-3 shrink-0">
                <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                  {(currentReceivedEmail || currentSentEmail)?.subject || '(Sem assunto)'}
                </h2>

                <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
                  <div className="space-y-1 min-w-0">
                    <div>
                      <span className="font-semibold text-foreground">De:</span>{' '}
                      <span className="font-mono text-primary">
                        {currentReceivedEmail ? currentReceivedEmail.from : currentSentEmail?.from}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Para:</span>{' '}
                      <span className="font-mono">
                        {currentReceivedEmail
                          ? currentReceivedEmail.to.join(', ')
                          : currentSentEmail?.to.join(', ')}
                      </span>
                    </div>
                    {((currentReceivedEmail?.cc && currentReceivedEmail.cc.length > 0) ||
                      (currentSentEmail?.cc && currentSentEmail.cc.length > 0)) && (
                      <div>
                        <span className="font-semibold text-foreground">Cc:</span>{' '}
                        <span>
                          {(currentReceivedEmail?.cc || currentSentEmail?.cc)?.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 text-muted-foreground text-[11px]">
                    <Clock className="size-3.5" />
                    <span>
                      {new Date(
                        currentReceivedEmail ? currentReceivedEmail.receivedAt : currentSentEmail?.sentAt || ''
                      ).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Corpo da Mensagem com Rolagem */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {currentReceivedEmail ? (
                  currentReceivedEmail.html ? (
                    <div className="w-full bg-white rounded-lg border p-1 shadow-2xs">
                      <iframe
                        title="Conteúdo da Mensagem"
                        srcDoc={currentReceivedEmail.html}
                        sandbox="allow-popups"
                        className="w-full min-h-[380px] border-0"
                      />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed p-4 bg-muted/20 rounded-lg">
                      {currentReceivedEmail.text || '(Mensagem sem texto)'}
                    </div>
                  )
                ) : currentSentEmail?.html ? (
                  <div className="w-full bg-white rounded-lg border p-1 shadow-2xs">
                    <iframe
                      title="Conteúdo da Mensagem Enviada"
                      srcDoc={currentSentEmail.html}
                      sandbox="allow-popups"
                      className="w-full min-h-[380px] border-0"
                    />
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed p-4 bg-muted/20 rounded-lg">
                    {currentSentEmail?.text || '(Mensagem sem texto)'}
                  </div>
                )}

                {/* Anexos */}
                {currentReceivedEmail?.attachments && currentReceivedEmail.attachments.length > 0 && (
                  <div className="pt-4 border-t space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Paperclip className="size-3.5" />
                      <span>Anexos ({currentReceivedEmail.attachments.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentReceivedEmail.attachments.map((att, idx) => (
                        <div
                          key={att.id || idx}
                          className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-xs shadow-2xs"
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
                              className="text-primary hover:underline font-semibold ml-2 shrink-0"
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
            </div>
          ) : (
            /* Estado Vazio quando nenhuma mensagem está selecionada */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <div className="size-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Mail className="size-7 text-muted-foreground/60" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">Nenhuma mensagem selecionada</h3>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                Escolha um e-mail na lista ao lado para ler o conteúdo ou redija uma nova mensagem para seus clientes.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsComposeOpen(true)}
                className="mt-4 gap-2 text-xs"
              >
                <Plus className="size-3.5" />
                Nova Mensagem
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal de Composição / Nova Mensagem ───────────────────── */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent size="3xl" className="max-h-[92dvh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg flex items-center gap-2">
                  <SendHorizontal className="size-5 text-primary" />
                  <span>Nova Mensagem</span>
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Envie e-mails profissionais com a assinatura oficial do ateliê
                </DialogDescription>
              </div>

              {/* Alternador Escrever / Prévia */}
              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setComposeMode('write')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    composeMode === 'write' ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Escrever
                </button>
                <button
                  type="button"
                  onClick={() => setComposeMode('preview')}
                  className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                    composeMode === 'preview' ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <Eye className="size-3.5" />
                  <span>Prévia Real</span>
                </button>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSend} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {composeMode === 'write' ? (
              <>
                {/* Linha 1: Modelos Prontos & Cliente Cadastrado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/20">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3 text-amber-500" />
                      <span>Modelos de Papelaria:</span>
                    </label>
                    <Select onValueChange={handleSelectTemplate}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Escolher modelo rápido..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allTemplates.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id} className="text-xs">
                            {tpl.name} {tpl.isCustom ? '⭐' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Tag className="size-3 text-primary" />
                      <span>Preencher com Cliente:</span>
                    </label>
                    <Select value={selectedCustomerId} onValueChange={handleSelectCustomer}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Selecionar cliente cadastrado..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {customers
                          .filter((c) => !!c.email)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.name} ({c.email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Linha 2: Remetente & Destinatário */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-foreground">Remetente (De):</label>
                      <button
                        type="button"
                        onClick={() => setIsCustomSender(!isCustomSender)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        {isCustomSender ? 'Lista Padrão' : 'Digitar Manual'}
                      </button>
                    </div>
                    {isCustomSender ? (
                      <Input
                        placeholder="Ex: Minha Loja <contato@meudominio.com>"
                        value={customSender}
                        onChange={(e) => setCustomSender(e.target.value)}
                        className="h-9 text-xs"
                      />
                    ) : (
                      <Select value={sender} onValueChange={setSender}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={defaultSender} className="text-xs">
                            {defaultSender} (Padrão)
                          </SelectItem>
                          {isDev ? (
                            <>
                              <SelectItem value="Luisices Dev <noreply@dev.luisices.com.br>" className="text-xs">
                                Luisices Dev &lt;noreply@dev.luisices.com.br&gt;
                              </SelectItem>
                              <SelectItem value="Atendimento Dev <suporte@dev.luisices.com.br>" className="text-xs">
                                Atendimento Dev &lt;suporte@dev.luisices.com.br&gt;
                              </SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="Luisices <noreply@luisices.com.br>" className="text-xs">
                                Luisices &lt;noreply@luisices.com.br&gt;
                              </SelectItem>
                              <SelectItem value="Atendimento Luisices <suporte@luisices.com.br>" className="text-xs">
                                Atendimento &lt;suporte@luisices.com.br&gt;
                              </SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-foreground">Destinatário (Para):</label>
                      <button
                        type="button"
                        onClick={() => setShowCcBcc(!showCcBcc)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        {showCcBcc ? 'Ocultar Cc/Cco' : '+ Adicionar Cc/Cco'}
                      </button>
                    </div>
                    <Input
                      placeholder="cliente@exemplo.com.br (vírgula para múltiplos)"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Cc e Cco colapsáveis */}
                {showCcBcc && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Com Cópia (Cc):</label>
                      <Input
                        placeholder="copia@dominio.com"
                        value={cc}
                        onChange={(e) => setCc(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Cópia Oculta (Cco):</label>
                      <Input
                        placeholder="copiaoculta@dominio.com"
                        value={bcc}
                        onChange={(e) => setBcc(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Assunto */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Assunto:</label>
                  <Input
                    placeholder="Ex: Seu Orçamento Personalizado - Luisices"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                {/* Tags Dinâmicas Rápidas */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground">Mensagem:</label>
                    <span className="text-[10px] text-muted-foreground">Clique numa tag para inserir:</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {DYNAMIC_TAGS.map((t) => (
                      <button
                        key={t.tag}
                        type="button"
                        onClick={() => handleInsertTag(t.tag)}
                        className="text-[10px] font-mono px-2 py-0.5 rounded border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title={`Inserir ${t.label}`}
                      >
                        {t.tag}
                      </button>
                    ))}
                  </div>

                  <Textarea
                    ref={textareaRef}
                    placeholder="Escreva sua mensagem aqui..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="min-h-[200px] font-sans text-xs leading-relaxed"
                    required
                  />
                </div>

                {/* Anexos na Composição */}
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Paperclip className="size-3.5" />
                      <span>Anexos ({attachments.length}):</span>
                    </label>

                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleUploadAttachment}
                        className="hidden"
                        id="compose-file-input"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAttachment}
                        className="h-7 text-xs gap-1.5"
                      >
                        {isUploadingAttachment ? (
                          <>
                            <Loader2 className="size-3 animate-spin" />
                            <span>Enviando...</span>
                          </>
                        ) : (
                          <>
                            <Paperclip className="size-3" />
                            <span>Adicionar Arquivo</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {attachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {attachments.map((att) => (
                        <div
                          key={att.url}
                          className="flex items-center justify-between p-2 rounded-lg border bg-muted/20 text-xs"
                        >
                          <span className="font-medium truncate mr-2">{att.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.url)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                            title="Remover anexo"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Prévia ao vivo */
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 text-primary text-xs">
                  <Info className="size-4 shrink-0" />
                  <span>
                    Pré-visualização fiel de como a mensagem chegará na caixa de entrada com a identidade da sua loja e links de anexos.
                  </span>
                </div>

                <div className="border rounded-xl overflow-hidden bg-white shadow-2xs">
                  <iframe
                    title="Prévia do E-mail"
                    srcDoc={generateFormattedHtml(body || 'Sua mensagem aparecerá aqui.')}
                    className="w-full min-h-[380px] border-0"
                  />
                </div>
              </div>
            )}

            {/* Rodapé do Formulário */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveAsTemplate}
                  className="gap-1.5 text-xs h-8"
                  title="Salvar texto atual como modelo personalizado"
                >
                  <BookmarkPlus className="size-3.5" />
                  <span>Salvar como Modelo</span>
                </Button>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsComposeOpen(false)}
                  className="text-xs h-8"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={isSending || dailyRemaining === 0 || isUploadingAttachment}
                  className="gap-2 text-xs h-8 px-4"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5" />
                      <span>Enviar E-mail</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Modal de Confirmação de Exclusão ───────────────────── */}
      <AlertDialog
        open={Boolean(emailToDelete)}
        onOpenChange={(open) => {
          if (!open) setEmailToDelete(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {emailToDelete?.type === 'received' ? 'Excluir e-mail' : 'Remover do histórico'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {emailToDelete?.type === 'received'
                ? `Tem certeza que deseja excluir o e-mail "${emailToDelete?.subject}"? Esta ação não pode ser desfeita.`
                : `Tem certeza que deseja remover o registro "${emailToDelete?.subject}" do histórico de disparos?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="text-xs h-8">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!emailToDelete) return;
                if (emailToDelete.type === 'received') {
                  deleteReceived(emailToDelete.id);
                  if (selectedEmailId === emailToDelete.id) {
                    setSelectedEmailId(null);
                  }
                  toast.success('E-mail excluído com sucesso.');
                } else {
                  deleteSent(emailToDelete.id);
                  if (selectedEmailId === emailToDelete.id) {
                    setSelectedEmailId(null);
                  }
                  toast.success('Registro removido do histórico.');
                }
                setEmailToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs h-8"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Emails;

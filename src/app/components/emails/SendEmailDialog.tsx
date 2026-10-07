import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useEmails } from '../../../hooks/useEmails';
import { useUserSettings } from '../../../hooks/useUserSettings';
import { firebaseStorageService } from '../../../services/firebaseStorageService';
import { SendEmailPayload, canAccessEmails } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Mail,
  Send,
  Eye,
  Paperclip,
  Trash2,
  Loader2,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

export interface EmailAttachmentItem {
  name: string;
  url: string;
  isPdf?: boolean;
  size?: number;
}

export interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRecipient?: string;
  defaultSubject?: string;
  defaultBody?: string;
  contextTitle?: string;
  contextSubtitle?: string;
  initialAttachments?: EmailAttachmentItem[];
  onSuccess?: () => void;
}

export function SendEmailDialog({
  open,
  onOpenChange,
  defaultRecipient = '',
  defaultSubject = '',
  defaultBody = '',
  contextTitle,
  contextSubtitle,
  initialAttachments = [],
  onSuccess,
}: SendEmailDialogProps) {
  const { user, isAdmin, hasPermission } = useAuth();
  const canSendEmail = Boolean(user && (isAdmin || hasPermission((p) => canAccessEmails(p, 'create'))));
  const { settings } = useUserSettings();
  const { sendEmail } = useEmails({ subscribe: false });

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

  const [recipient, setRecipient] = useState(defaultRecipient);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sender, setSender] = useState(defaultSender);
  const [cc, setCc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [attachments, setAttachments] = useState<EmailAttachmentItem[]>(initialAttachments);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [mode, setMode] = useState<'write' | 'preview'>('write');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevOpenRef = useRef(false);

  // Sincroniza valores iniciais APENAS no momento em que o diálogo é aberto (evita apagar digitação do usuário)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setRecipient(defaultRecipient || '');
      setSubject(defaultSubject || '');
      setBody(defaultBody || '');
      setSender(defaultSender);
      setAttachments(initialAttachments || []);
      setMode('write');
      setShowCc(false);
      setCc('');
    }
    prevOpenRef.current = open;
  }, [open, defaultRecipient, defaultSubject, defaultBody, defaultSender, initialAttachments]);

  // Upload de anexo
  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 18 * 1024 * 1024) {
      toast.error('O arquivo não pode ultrapassar 18MB.');
      return;
    }

    setIsUploading(true);
    try {
      let uploadedUrl: string;
      const isPdf = file.type === 'application/pdf';

      const orderAtt = await firebaseStorageService.uploadOrderAttachment(file, user.uid, 'email_draft');
      uploadedUrl = orderAtt.url;

      const item: EmailAttachmentItem = {
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
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = (url: string) => {
    setAttachments((prev) => prev.filter((a) => a.url !== url));
  };

  // Gerador de HTML estilizado com identidade visual
  const generateFormattedHtml = (messageBody: string): string => {
    const escaped = messageBody
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br />');

    const attachmentsHtml = attachments.length
      ? `<p>Arquivos anexados à mensagem: ${attachments.map(att => att.name
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')).join(', ')}</p>`
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSendEmail) {
      toast.error('Você não tem permissão para enviar e-mails pelo sistema.');
      return;
    }
    if (!recipient.trim()) {
      toast.error('Informe o destinatário do e-mail.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Informe o assunto da mensagem.');
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
      const htmlContent = generateFormattedHtml(body);
      const payload: SendEmailPayload = {
        from: sender,
        to: recipientList,
        subject: subject.trim(),
        text: body,
        html: htmlContent,
        attachments: attachments.map(({ name, url }) => ({ name, url })),
      };

      if (cc.trim()) {
        payload.cc = cc.split(/[,;\s]+/).filter((c) => c.includes('@'));
      }

      await sendEmail(payload);
      toast.success('E-mail enviado com sucesso!');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error('Erro ao enviar e-mail:', err);
      toast.error(err.message || 'Falha ao enviar e-mail.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="max-h-[90dvh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
                <Mail className="size-4 sm:size-5 text-primary" />
                <span>{contextTitle || 'Enviar por E-mail'}</span>
              </DialogTitle>
              {contextSubtitle && (
                <DialogDescription className="text-xs mt-0.5">
                  {contextSubtitle}
                </DialogDescription>
              )}
            </div>

            {/* Alternar Escrever vs Prévia */}
            <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setMode('write')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  mode === 'write' ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-muted-foreground'
                }`}
              >
                Escrever
              </button>
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  mode === 'preview' ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-muted-foreground'
                }`}
              >
                <Eye className="size-3.5" />
                <span>Prévia</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSend} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {!canSendEmail && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 rounded-lg text-xs flex items-start gap-2">
              <Info className="size-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong>Acesso Restrito:</strong> Você não possui permissão para enviar e-mails pelo sistema. Contate um administrador para liberar seu acesso.
              </div>
            </div>
          )}

          {mode === 'write' ? (
            <>
              {/* Remetente e Destinatário */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">De (Remetente):</label>
                  <Select value={sender} onValueChange={setSender}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={defaultSender} className="text-xs">
                        {defaultSender}
                      </SelectItem>
                      {isDev ? (
                        <SelectItem value="Luisices Dev <noreply@dev.luisices.com.br>" className="text-xs">
                          Luisices Dev &lt;noreply@dev.luisices.com.br&gt;
                        </SelectItem>
                      ) : (
                        <SelectItem value="Luisices <noreply@luisices.com.br>" className="text-xs">
                          Luisices &lt;noreply@luisices.com.br&gt;
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground">Para (Destinatário):</label>
                    <button
                      type="button"
                      onClick={() => setShowCc(!showCc)}
                      className="text-[11px] text-primary hover:underline"
                    >
                      {showCc ? 'Ocultar Cc' : '+ Cc'}
                    </button>
                  </div>
                  <Input
                    placeholder="cliente@exemplo.com.br"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>
              </div>

              {showCc && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Com Cópia (Cc):</label>
                  <Input
                    placeholder="copia@dominio.com"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}

              {/* Assunto */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Assunto:</label>
                <Input
                  placeholder="Assunto da mensagem"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              {/* Mensagem */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Mensagem:</label>
                <Textarea
                  placeholder="Escreva a mensagem aqui..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[160px] font-sans text-xs leading-relaxed"
                  required
                />
              </div>

              {/* Anexos */}
              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Paperclip className="size-3.5" />
                    <span>Anexos ({attachments.length})</span>
                  </div>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleUploadAttachment}
                      className="hidden"
                      id="dialog-file-attachment"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="h-7 text-xs gap-1.5"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="size-3 animate-spin" />
                          <span>Enviando anexo...</span>
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
            /* Prévia real */
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground p-2 rounded-md bg-muted/40">
                <Info className="size-3.5 text-primary shrink-0" />
                <span>Prévia exata do e-mail com a identidade oficial do ateliê:</span>
              </div>
              <div className="border rounded-lg overflow-hidden bg-white shadow-2xs">
                <iframe
                  title="Prévia do E-mail"
                  srcDoc={generateFormattedHtml(body || '(Mensagem vazia)')}
                  className="w-full min-h-[320px] border-0"
                />
              </div>
            </div>
          )}

          {/* Rodapé do Modal */}
          <div className="flex items-center justify-between pt-3 border-t border-border/60">
            <span className="text-[11px] text-muted-foreground">
              Envio instantâneo via Resend
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSending || isUploading || !canSendEmail}
                className="h-8 text-xs gap-1.5 px-4"
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
  );
}

export default SendEmailDialog;

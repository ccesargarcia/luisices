import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Loader2, Paperclip } from 'lucide-react';
import { db } from '../../lib/firebase';
import { emailService } from '../../services/emailService';
import { Button } from '../components/ui/button';
import { EmailHtmlViewer } from '../components/emails/EmailHtmlViewer';
import type { ReceivedEmail, SentEmail } from '../types';

type EmailRecord = ReceivedEmail | SentEmail;

function formatDate(value?: string | null): string {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data não informada' : date.toLocaleString('pt-BR');
}

function safeAttachmentUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function EmailMessageWindow() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [email, setEmail] = useState<EmailRecord | null>(null);
  const [body, setBody] = useState<{
    html: string;
    text: string;
    htmlErrorCode?: string | null;
    textErrorCode?: string | null;
  } | null>(null);
  const [bodyLoading, setBodyLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadEmail = useCallback(async () => {
    if (!id || (type !== 'recebidos' && type !== 'enviados')) {
      setError('O endereço desta mensagem é inválido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const collection = type === 'recebidos' ? 'receivedEmails' : 'sentEmails';
      const snapshot = await getDoc(doc(db, collection, id));
      if (!snapshot.exists()) {
        setError('Esta mensagem não existe ou não está mais disponível.');
        setEmail(null);
        return;
      }

      const data = snapshot.data();
      const item = { ...data, id: snapshot.id } as EmailRecord;
      setEmail(item);

      if (type === 'recebidos') {
        const received = item as ReceivedEmail;
        if (!received.read) {
          void emailService.markAsRead(id, true).catch(markError => {
            console.warn('[EmailMessageWindow] Não foi possível marcar como lida:', markError);
          });
        }
        const paths = received.bodyStoragePaths;
        if (paths?.html || paths?.text) {
          setBody({ html: received.html || '', text: received.text || received.bodyPreview || '' });
          setLoading(false);
          setBodyLoading(true);
          const loaded = await emailService.loadReceivedEmailBody(paths, {
            fallbackText: received.bodyPreview || received.text || '',
            onProgress: progress => setBody({
              html: progress.html,
              text: progress.text,
              htmlErrorCode: progress.htmlErrorCode,
              textErrorCode: progress.textErrorCode,
            }),
          });
          setBody({
            html: loaded.html,
            text: loaded.text,
            htmlErrorCode: loaded.htmlErrorCode,
            textErrorCode: loaded.textErrorCode,
          });
          setBodyLoading(false);
        } else {
          setBody({ html: received.html || '', text: received.text || received.bodyPreview || '' });
        }
      } else {
        const sent = item as SentEmail;
        setBody({ html: sent.html || '', text: sent.text || '' });
      }
    } catch (loadError) {
      console.error('[EmailMessageWindow] Falha ao carregar mensagem:', loadError);
      setError('Não foi possível carregar esta mensagem. Verifique sua permissão de leitura e tente novamente.');
    } finally {
      setLoading(false);
      setBodyLoading(false);
    }
  }, [id, type]);

  useEffect(() => { void loadEmail(); }, [loadEmail]);

  const sender = email?.from || 'Remetente não informado';
  const date = email && ('receivedAt' in email ? email.receivedAt : email.sentAt);
  const attachments = email && 'attachments' in email ? email.attachments || [] : [];

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between gap-4 border-b border-glass-border pb-4">
          <div>
            <p className="text-sm font-medium text-primary">Central de E-mails</p>
            <h1 className="mt-1 text-xl font-semibold">Mensagem</h1>
          </div>
          <Button asChild variant="outline" className="min-h-11">
            <Link to="/emails"><ArrowLeft aria-hidden="true" /> Voltar à caixa de entrada</Link>
          </Button>
        </header>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground" role="status">
            <Loader2 className="size-5 animate-spin" /> Carregando mensagem…
          </div>
        ) : error ? (
          <section className="rounded-2xl border border-glass-border bg-card/70 p-6 shadow-sm" role="alert">
            <p>{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => void loadEmail()}>Tentar novamente</Button>
          </section>
        ) : email ? (
          <article className="overflow-hidden rounded-2xl border border-glass-border bg-card/70 shadow-sm backdrop-blur-md">
            <div className="space-y-3 border-b border-glass-border p-5 sm:p-7">
              <h2 className="break-words text-2xl font-semibold">{email.subject || '(Sem assunto)'}</h2>
              <dl className="grid gap-2 text-sm sm:grid-cols-[5rem_1fr]">
                <dt className="text-muted-foreground">De</dt><dd className="break-all">{sender}</dd>
                <dt className="text-muted-foreground">Para</dt><dd className="break-all">{email.to?.join(', ') || 'Destinatário não informado'}</dd>
                {email.cc?.length ? <><dt className="text-muted-foreground">Cc</dt><dd className="break-all">{email.cc.join(', ')}</dd></> : null}
                <dt className="text-muted-foreground">Data</dt><dd>{formatDate(date)}</dd>
              </dl>
            </div>
            {attachments.length ? (
              <section className="border-b border-glass-border p-5 sm:px-7" aria-label="Anexos">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Paperclip className="size-4" /> Anexos ({attachments.length})</h3>
                <ul className="flex flex-wrap gap-2">
                  {attachments.map((attachment, index) => (
                    <li key={attachment.id || `${attachment.filename}-${index}`}>
                      {safeAttachmentUrl(attachment.downloadUrl) ? (
                        <a className="inline-flex min-h-11 items-center rounded-xl border border-glass-border bg-background/70 px-3 text-sm text-primary hover:bg-muted" href={safeAttachmentUrl(attachment.downloadUrl) || undefined} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{attachment.filename || 'Anexo'}</a>
                      ) : (
                        <span className="inline-flex min-h-11 items-center rounded-xl border border-glass-border bg-muted/40 px-3 text-sm text-muted-foreground">{attachment.filename || 'Anexo'}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <div className="p-4 sm:p-7">
              {bodyLoading ? <p className="mb-3 text-xs text-muted-foreground" role="status">Carregando conteúdo completo…</p> : null}
              {(body?.htmlErrorCode || body?.textErrorCode) ? (
                <p className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="status">
                  Não foi possível carregar o texto completo. Exibindo a prévia. Código: {body.textErrorCode || body.htmlErrorCode}
                </p>
              ) : null}
              <EmailHtmlViewer html={body?.html} text={body?.text} />
            </div>
          </article>
        ) : null}
      </div>
    </main>
  );
}

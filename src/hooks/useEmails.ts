import { useState, useEffect, useCallback, useRef } from 'react';
import { createEmailHistory } from '../services/emailHistory';
import { db } from '../lib/firebase';
import { ReceivedEmail, SentEmail, SendEmailPayload, EmailUsage, canAccessEmails } from '../app/types';
import { emailService } from '../services/emailService';
import { useAuth } from '../contexts/AuthContext';

export function useEmails({ subscribe = true } = {}) {
  const { user, isAdmin, hasPermission, loading: authLoading } = useAuth();
  const canView = Boolean(user && (isAdmin || hasPermission((p) => canAccessEmails(p, 'view'))));
  const canCreate = Boolean(user && (isAdmin || hasPermission((p) => canAccessEmails(p, 'create'))));
  const canEdit = Boolean(user && (isAdmin || hasPermission((p) => canAccessEmails(p, 'edit'))));
  const canDelete = Boolean(user && (isAdmin || hasPermission((p) => canAccessEmails(p, 'delete'))));

  const [receivedEmails, setReceivedEmails] = useState<ReceivedEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [usage, setUsage] = useState<EmailUsage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [loading, setLoading] = useState(true);
  const histories = useRef<Partial<Record<'received' | 'sent', ReturnType<typeof createEmailHistory>>>>({});
  const [hasMoreReceived, setHasMoreReceived] = useState(true);
  const [hasMoreSent, setHasMoreSent] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshUsage = useCallback(async () => {
    if (!canView && !canCreate) {
      setUsage(null);
      setLoadingUsage(false);
      return;
    }
    try {
      setLoadingUsage(true);
      const data = await emailService.getEmailUsage();
      setUsage(data);
    } catch (err) {
      console.warn('[useEmails] Não foi possível consultar cota de e-mail:', err);
    } finally {
      setLoadingUsage(false);
    }
  }, [canView, canCreate]);

  useEffect(() => {
    if (canView || canCreate) {
      refreshUsage();
    } else {
      setUsage(null);
      setLoadingUsage(false);
    }
  }, [canView, canCreate, refreshUsage]);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !canView || !subscribe) {
      setReceivedEmails([]);
      setSentEmails([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    setError(null);
    setReceivedEmails([]);
    setSentEmails([]);
    setHasMoreReceived(true);
    setHasMoreSent(true);
    let cancelled = false;
    const received = createEmailHistory(db, 'receivedEmails', (docs, hasMore) => {
        setHasMoreReceived(hasMore);
        const list = docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            resendId: data.resendId || doc.id,
            from: data.from || '',
            to: Array.isArray(data.to) ? data.to : [data.to].filter(Boolean),
            cc: data.cc || [],
            bcc: data.bcc || [],
            subject: data.subject || '(Sem assunto)',
            html: data.html || '',
            text: data.text || '',
            attachments: data.attachments || [],
            raw: data.raw || null,
            read: !!data.read,
            starred: !!data.starred,
            archived: !!data.archived,
            spam: !!data.spam,
            spamScore: typeof data.spamScore === 'number' ? data.spamScore : 0,
            spamReasons: Array.isArray(data.spamReasons) ? data.spamReasons : [],
            trashed: Boolean(data.trashed || data.deleted),
            trashedAt: data.trashedAt || null,
            receivedAt: data.receivedAt || new Date().toISOString(),
            createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          } as ReceivedEmail;
        });
        setReceivedEmails(list);
        setLoading(false);
      },
      (err) => {
        console.warn('[useEmails] Erro ao carregar emails recebidos:', err);
        setError('Não foi possível sincronizar os e-mails recebidos.');
        setLoading(false);
      }
    );

    const sent = createEmailHistory(db, 'sentEmails', (docs, hasMore) => {
        setHasMoreSent(hasMore);
        const list = docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            resendId: data.resendId,
            from: data.from || 'Luisices <contato@luisices.com.br>',
            to: Array.isArray(data.to) ? data.to : [data.to].filter(Boolean),
            cc: data.cc || [],
            bcc: data.bcc || [],
            subject: data.subject || '(Sem assunto)',
            html: data.html || '',
            text: data.text || '',
            status: data.status || 'sent',
            senderUid: data.senderUid || '',
            senderEmail: data.senderEmail || '',
            trashed: Boolean(data.trashed || data.deleted),
            trashedAt: data.trashedAt || null,
            sentAt: data.sentAt || new Date().toISOString(),
            createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          } as SentEmail;
        });
        setSentEmails(list);
      },
      (err) => {
        console.warn('[useEmails] Erro ao carregar emails enviados:', err);
        setError('Não foi possível sincronizar os e-mails enviados.');
      }
    );

    histories.current = { received, sent };
    Promise.all([received.loadMore(), sent.loadMore()])
      .catch(() => { if (!cancelled) setError('Não foi possível carregar o histórico de e-mails.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      received.close();
      sent.close();
      histories.current = {};
    };
  }, [user?.uid, canView, authLoading, subscribe]);

  const loadHistory = useCallback(async (type: 'received' | 'sent', all = false) => {
    setLoadingHistory(true);
    setError(null);
    try {
      const history = histories.current[type];
      if (all) await history?.loadAll();
      else await history?.loadMore();
    } catch (err) {
      setError('Não foi possível carregar mais e-mails. Tente novamente.');
      throw err;
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const sendEmail = useCallback(async (payload: SendEmailPayload) => {
    if (!canCreate) {
      throw new Error('Você não possui permissão para enviar e-mails pelo sistema.');
    }
    const res = await emailService.sendEmail(payload);
    // Atualiza cota após envio
    refreshUsage().catch(() => {});
    return res;
  }, [canCreate, refreshUsage]);

  const markAsRead = useCallback(async (id: string, read: boolean) => {
    if (!canEdit) throw new Error('Você não possui permissão para editar e-mails.');
    await emailService.markAsRead(id, read);
  }, [canEdit]);

  const toggleStar = useCallback(async (id: string, starred: boolean) => {
    if (!canEdit) throw new Error('Você não possui permissão para editar e-mails.');
    await emailService.toggleStar(id, starred);
  }, [canEdit]);

  const setArchived = useCallback(async (id: string, archived: boolean) => {
    if (!canEdit) throw new Error('Você não possui permissão para editar e-mails.');
    await emailService.setArchived(id, archived);
  }, [canEdit]);

  const setSpam = useCallback(async (id: string, spam: boolean, spamScore?: number, spamReasons?: string[]) => {
    if (!canEdit) throw new Error('Você não possui permissão para classificar e-mails.');
    await emailService.setSpam(id, spam, spamScore, spamReasons);
  }, [canEdit]);

  const deleteReceived = useCallback(async (id: string) => {
    if (!canDelete) throw new Error('Você não possui permissão para excluir e-mails.');
    await emailService.deleteReceivedEmail(id);
  }, [canDelete]);

  const deleteSent = useCallback(async (id: string) => {
    if (!canDelete) throw new Error('Você não possui permissão para excluir e-mails.');
    await emailService.deleteSentEmail(id);
  }, [canDelete]);

  const moveToTrash = useCallback(async (id: string, type: 'received' | 'sent') => {
    if (!canEdit && !canDelete) throw new Error('Você não possui permissão para mover e-mails para a lixeira.');
    await emailService.moveToTrash(id, type);
  }, [canEdit, canDelete]);

  const restoreFromTrash = useCallback(async (id: string, type: 'received' | 'sent') => {
    if (!canEdit && !canDelete) throw new Error('Você não possui permissão para restaurar e-mails da lixeira.');
    await emailService.restoreFromTrash(id, type);
  }, [canEdit, canDelete]);

  const unreadCount = receivedEmails.filter((e) => !e.read && !e.archived && !e.trashed && !e.spam).length;

  return {
    receivedEmails,
    sentEmails,
    hasMoreReceived, hasMoreSent, loadingHistory, loadHistory,
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
    setSpam,
    moveToTrash,
    restoreFromTrash,
    deleteReceived,
    deleteSent,
    canAccess: canView,
    canView,
    canCreate,
    canEdit,
    canDelete,
  };
}

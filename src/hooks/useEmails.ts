import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ReceivedEmail, SentEmail, SendEmailPayload, EmailUsage, canAccessEmails } from '../app/types';
import { emailService } from '../services/emailService';
import { useAuth } from '../contexts/AuthContext';

export function useEmails() {
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

    if (!user || !canView) {
      setReceivedEmails([]);
      setSentEmails([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    const qReceived = query(
      collection(db, 'receivedEmails'),
      orderBy('receivedAt', 'desc'),
      limit(50)
    );
    const qSent = query(
      collection(db, 'sentEmails'),
      orderBy('sentAt', 'desc'),
      limit(50)
    );

    const unsubReceived = onSnapshot(
      qReceived,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => {
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

    const unsubSent = onSnapshot(
      qSent,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => {
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
            sentAt: data.sentAt || new Date().toISOString(),
            createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          } as SentEmail;
        });
        setSentEmails(list);
      },
      (err) => {
        console.warn('[useEmails] Erro ao carregar emails enviados:', err);
      }
    );

    return () => {
      unsubReceived();
      unsubSent();
    };
  }, [user, canView, authLoading]);

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
    if (!canEdit && !canView) return;
    await emailService.markAsRead(id, read);
  }, [canEdit, canView]);

  const toggleStar = useCallback(async (id: string, starred: boolean) => {
    if (!canEdit && !canView) return;
    await emailService.toggleStar(id, starred);
  }, [canEdit, canView]);

  const setArchived = useCallback(async (id: string, archived: boolean) => {
    if (!canEdit && !canView) return;
    await emailService.setArchived(id, archived);
  }, [canEdit, canView]);

  const deleteReceived = useCallback(async (id: string) => {
    if (!canDelete) return;
    await emailService.deleteReceivedEmail(id);
  }, [canDelete]);

  const deleteSent = useCallback(async (id: string) => {
    if (!canDelete) return;
    await emailService.deleteSentEmail(id);
  }, [canDelete]);

  const unreadCount = receivedEmails.filter((e) => !e.read && !e.archived).length;

  return {
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
    canAccess: canView,
    canView,
    canCreate,
    canEdit,
    canDelete,
  };
}

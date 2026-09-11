import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ReceivedEmail, SentEmail, SendEmailPayload, EmailUsage } from '../app/types';
import { emailService } from '../services/emailService';

export function useEmails() {
  const [receivedEmails, setReceivedEmails] = useState<ReceivedEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [usage, setUsage] = useState<EmailUsage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUsage = useCallback(async () => {
    try {
      setLoadingUsage(true);
      const data = await emailService.getEmailUsage();
      setUsage(data);
    } catch (err) {
      console.warn('[useEmails] Não foi possível consultar cota de e-mail:', err);
    } finally {
      setLoadingUsage(false);
    }
  }, []);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const qReceived = query(collection(db, 'receivedEmails'), orderBy('receivedAt', 'desc'));
    const qSent = query(collection(db, 'sentEmails'), orderBy('sentAt', 'desc'));

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
  }, []);

  const sendEmail = useCallback(async (payload: SendEmailPayload) => {
    const res = await emailService.sendEmail(payload);
    // Atualiza cota após envio
    refreshUsage().catch(() => {});
    return res;
  }, [refreshUsage]);

  const markAsRead = useCallback(async (id: string, read: boolean) => {
    await emailService.markAsRead(id, read);
  }, []);

  const toggleStar = useCallback(async (id: string, starred: boolean) => {
    await emailService.toggleStar(id, starred);
  }, []);

  const setArchived = useCallback(async (id: string, archived: boolean) => {
    await emailService.setArchived(id, archived);
  }, []);

  const deleteReceived = useCallback(async (id: string) => {
    await emailService.deleteReceivedEmail(id);
  }, []);

  const deleteSent = useCallback(async (id: string) => {
    await emailService.deleteSentEmail(id);
  }, []);

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
  };
}

import {
  collection,
  doc,
  getDocs,
  getDoc,
  limit,
  query,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, getBytes, ref } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions, storage } from '../lib/firebase';
import { SendEmailPayload, EmailUsage } from '../app/types';
import { getVercelBetaApiUrl } from '../app/utils/betaHost';
import { executeWithGcpFallback, VercelInfraError } from './backendRoutingService';
import { cacheReceivedEmailBody, getCachedReceivedEmailBody } from './emailBodyCache';

function getStorageErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  if (error instanceof Error && error.message.includes('Tempo limite')) return 'storage/timeout';
  return 'storage/unknown';
}

async function callBetaEmailApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Entre na sua conta para utilizar o módulo de E-mail.');
  const idToken = await user.getIdToken();
  const response = await fetch(getVercelBetaApiUrl('/api/communications-admin'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    cache: 'no-store',
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status >= 500) {
      throw new VercelInfraError(`Erro no módulo de E-mail (${response.status}).`, response.status);
    }
    const err = new Error(data?.error?.message || `Erro no módulo de E-mail (${response.status}).`);
    if (data?.error?.code) Object.assign(err, { code: data.error.code });
    if (data?.error?.details !== undefined) Object.assign(err, { details: data.error.details });
    Object.assign(err, { status: response.status });
    throw err;
  }
  return data as T;
}

export class EmailService {
  async getAllTrashedEmailIds(): Promise<{ received: string[]; sent: string[] }> {
    const readTrashedIds = async (collectionName: 'receivedEmails' | 'sentEmails') => {
      const snapshots = await Promise.all([
        getDocs(query(collection(db, collectionName), where('trashed', '==', true), limit(500))),
        getDocs(query(collection(db, collectionName), where('deleted', '==', true), limit(500))),
      ]);
      return [...new Set(snapshots.flatMap(snapshot => snapshot.docs.map(email => email.id)))];
    };
    const [received, sent] = await Promise.all([
      readTrashedIds('receivedEmails'),
      readTrashedIds('sentEmails'),
    ]);
    return { received, sent };
  }

  async permanentlyDeleteEmails(collectionName: 'receivedEmails' | 'sentEmails', ids: string[]): Promise<{ deleted: number; failed: number }> {
    let deleted = 0;
    let failed = 0;
    for (let offset = 0; offset < ids.length; offset += 400) {
      const chunk = ids.slice(offset, offset + 400);
      const pathsById = new Map<string, string[]>();
      if (collectionName === 'receivedEmails') {
        const docs = await Promise.all(chunk.map(id => getDoc(doc(db, collectionName, id))));
        docs.forEach((email, index) => {
          const bodyPaths = email.data()?.bodyStoragePaths || {};
          pathsById.set(chunk[index], [bodyPaths.html, bodyPaths.text]
            .filter((path): path is string => typeof path === 'string'));
        });
      }
      const batch = writeBatch(db);
      chunk.forEach(id => batch.delete(doc(db, collectionName, id)));
      try {
        await batch.commit();
        deleted += chunk.length;
      } catch {
        failed += chunk.length;
        continue;
      }
      for (const [id, paths] of pathsById) {
        try {
          await Promise.all(paths.map(path => deleteObject(ref(storage, path)).catch(error => {
            if (error?.code !== 'storage/object-not-found') throw error;
          })));
        } catch (error) {
          console.warn(`[EmailService] Não foi possível remover o corpo do e-mail excluído ${id}:`, error);
        }
      }
    }
    return { deleted, failed };
  }

  async loadReceivedEmailBody(
    paths: { html?: string; text?: string },
    options: {
      fallbackText?: string;
      timeoutMs?: number;
      cacheIdentity?: { uid: string; emailId: string };
      onProgress?: (body: {
        html: string;
        text: string;
        htmlLoading: boolean;
        htmlUnavailable: boolean;
        textUnavailable: boolean;
        htmlErrorCode: string | null;
        textErrorCode: string | null;
      }) => void;
    } = {},
  ): Promise<{
    html: string;
    text: string;
    htmlLoading: boolean;
    htmlUnavailable: boolean;
    textUnavailable: boolean;
    htmlErrorCode: string | null;
    textErrorCode: string | null;
  }> {
    if (options.cacheIdentity) {
      const cached = await getCachedReceivedEmailBody(
        options.cacheIdentity.uid,
        options.cacheIdentity.emailId,
        paths,
      );
      if (cached) {
        options.onProgress?.(cached);
        return cached;
      }
    }

    const timeoutMs = Number.isFinite(options.timeoutMs) && (options.timeoutMs || 0) > 0
      ? options.timeoutMs as number
      : 15_000;
    const load = async (path?: string) => {
      if (!path) return '';
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const bytes = await Promise.race([
          getBytes(ref(storage, path), 15 * 1024 * 1024),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error('Tempo limite ao carregar corpo de e-mail')), timeoutMs);
          }),
        ]);
        return new TextDecoder().decode(bytes);
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    };

    let text = options.fallbackText || '';
    let textUnavailable = false;
    let textErrorCode: string | null = null;
    if (paths.text) {
      try {
        text = await load(paths.text);
      } catch (error) {
        textUnavailable = true;
        textErrorCode = getStorageErrorCode(error);
        console.warn('[EmailService] Texto recebido indisponível; usando prévia:', error);
      }
    }

    let html = '';
    let htmlUnavailable = false;
    let htmlErrorCode: string | null = null;
    if (options.onProgress && (text || !paths.html)) {
      options.onProgress({
        html, text, htmlLoading: Boolean(paths.html), htmlUnavailable, textUnavailable,
        htmlErrorCode, textErrorCode,
      });
    }

    if (paths.html) {
      try {
        html = await load(paths.html);
      } catch (error) {
        htmlUnavailable = true;
        htmlErrorCode = getStorageErrorCode(error);
        console.warn('[EmailService] HTML recebido indisponível; mantendo texto simples:', error);
      }
    }

    const result = {
      html, text, htmlLoading: false, htmlUnavailable, textUnavailable,
      htmlErrorCode, textErrorCode,
    };
    if (options.cacheIdentity) {
      void cacheReceivedEmailBody(options.cacheIdentity.uid, options.cacheIdentity.emailId, paths, result);
    }
    options.onProgress?.(result);
    return result;
  }

  /**
   * Envia um e-mail utilizando a Cloud Function sendCustomEmail (Resend)
   */
  async sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; emailId?: string; id?: string }> {
    return executeWithGcpFallback(
      'communicationsAdmin',
      () => callBetaEmailApi<{ success: boolean; emailId?: string; id?: string }>('sendCustomEmail', payload as unknown as Record<string, unknown>),
      async () => {
        const callable = httpsCallable<SendEmailPayload, { success: boolean; emailId?: string; id?: string }>(
          functions,
          'sendCustomEmail'
        );
        const result = await callable(payload);
        return result.data;
      },
    );
  }

  /**
   * Consulta a cota / limite de envio diário e mensal de e-mails
   */
  async getEmailUsage(): Promise<EmailUsage> {
    const data = await executeWithGcpFallback(
      'communicationsAdmin',
      () => callBetaEmailApi<{ success: boolean; daily: EmailUsage['daily']; monthly: EmailUsage['monthly']; source?: EmailUsage['source'] }>('getEmailUsage'),
      async () => {
        const callable = httpsCallable<
          void,
          { success: boolean; daily: EmailUsage['daily']; monthly: EmailUsage['monthly']; source?: EmailUsage['source'] }
        >(functions, 'getEmailUsage');
        const result = await callable();
        return result.data;
      },
    );
    return {
      daily: data.daily,
      monthly: data.monthly,
      source: data.source,
    };
  }

  /**
   * Marca um e-mail recebido como lido ou não lido
   */
  async markAsRead(emailId: string, read: boolean): Promise<void> {
    const ref = doc(db, 'receivedEmails', emailId);
    await updateDoc(ref, { read });
  }

  /**
   * Alterna estado de favorito (estrela) em um e-mail recebido
   */
  async toggleStar(emailId: string, starred: boolean): Promise<void> {
    const ref = doc(db, 'receivedEmails', emailId);
    await updateDoc(ref, { starred });
  }

  /**
   * Arquiva ou desarquiva um e-mail recebido
   */
  async setArchived(emailId: string, archived: boolean): Promise<void> {
    const ref = doc(db, 'receivedEmails', emailId);
    await updateDoc(ref, { archived });
  }

  /**
   * Marca ou desmarca um e-mail recebido como Spam
   */
  async setSpam(emailId: string, spam: boolean, spamScore?: number, spamReasons?: string[]): Promise<void> {
    const ref = doc(db, 'receivedEmails', emailId);
    const updateData: Record<string, any> = { spam };
    if (spamScore !== undefined) updateData.spamScore = spamScore;
    if (spamReasons !== undefined) updateData.spamReasons = spamReasons;
    await updateDoc(ref, updateData);
  }

  /**
   * Move um e-mail recebido ou enviado para a lixeira
   */
  async moveToTrash(emailId: string, type: 'received' | 'sent'): Promise<void> {
    const collectionName = type === 'received' ? 'receivedEmails' : 'sentEmails';
    const ref = doc(db, collectionName, emailId);
    await updateDoc(ref, {
      trashed: true,
      trashedAt: serverTimestamp(),
    });
  }

  /**
   * Restaura um e-mail da lixeira de volta para sua pasta de origem
   */
  async restoreFromTrash(emailId: string, type: 'received' | 'sent'): Promise<void> {
    const collectionName = type === 'received' ? 'receivedEmails' : 'sentEmails';
    const ref = doc(db, collectionName, emailId);
    await updateDoc(ref, {
      trashed: false,
      trashedAt: null,
    });
  }

  /**
   * Exclui um e-mail recebido definitivamente
   */
  async deleteReceivedEmail(emailId: string): Promise<void> {
    const emailRef = doc(db, 'receivedEmails', emailId);
    const snapshot = await getDoc(emailRef);
    const bodyPaths = snapshot.data()?.bodyStoragePaths || {};
    await deleteDoc(emailRef);
    await Promise.all([bodyPaths.html, bodyPaths.text]
      .filter((path): path is string => typeof path === 'string')
      .map(path => deleteObject(ref(storage, path)).catch(error => {
        if (error?.code !== 'storage/object-not-found') {
          console.warn(`[EmailService] Não foi possível remover o corpo do e-mail excluído ${emailId}:`, error);
        }
      })));
  }

  /**
   * Exclui um e-mail do histórico de enviados definitivamente
   */
  async deleteSentEmail(emailId: string): Promise<void> {
    const ref = doc(db, 'sentEmails', emailId);
    await deleteDoc(ref);
  }
}

export const emailService = new EmailService();

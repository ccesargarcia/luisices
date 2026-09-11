import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { SendEmailPayload, EmailUsage } from '../app/types';

export class EmailService {
  /**
   * Envia um e-mail utilizando a Cloud Function sendCustomEmail (Resend)
   */
  async sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; emailId?: string; id?: string }> {
    const callable = httpsCallable<SendEmailPayload, { success: boolean; emailId?: string; id?: string }>(
      functions,
      'sendCustomEmail'
    );
    const result = await callable(payload);
    return result.data;
  }

  /**
   * Consulta a cota / limite de envio diário e mensal de e-mails
   */
  async getEmailUsage(): Promise<EmailUsage> {
    const callable = httpsCallable<
      void,
      { success: boolean; daily: EmailUsage['daily']; monthly: EmailUsage['monthly']; source?: EmailUsage['source'] }
    >(functions, 'getEmailUsage');
    const result = await callable();
    return {
      daily: result.data.daily,
      monthly: result.data.monthly,
      source: result.data.source,
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
   * Exclui um e-mail recebido
   */
  async deleteReceivedEmail(emailId: string): Promise<void> {
    const ref = doc(db, 'receivedEmails', emailId);
    await deleteDoc(ref);
  }

  /**
   * Exclui um e-mail do histórico de enviados
   */
  async deleteSentEmail(emailId: string): Promise<void> {
    const ref = doc(db, 'sentEmails', emailId);
    await deleteDoc(ref);
  }
}

export const emailService = new EmailService();

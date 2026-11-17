import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, auth } from '../lib/firebase';
import { WhatsAppMessage, WhatsAppConversation } from '../app/types';
import { normalizePhoneForWhatsApp } from '../app/utils/whatsapp';
import { getVercelBetaApiUrl } from '../app/utils/betaHost';
import { executeWithGcpFallback, VercelInfraError } from './backendRoutingService';

async function callBetaWhatsAppApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Entre na sua conta para utilizar o WhatsApp.');
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
      throw new VercelInfraError(`Erro no WhatsApp (${response.status}).`, response.status);
    }
    const err = new Error(data?.error?.message || `Erro no WhatsApp (${response.status}).`);
    if (data?.error?.code) Object.assign(err, { code: data.error.code });
    if (data?.error?.details !== undefined) Object.assign(err, { details: data.error.details });
    Object.assign(err, { status: response.status });
    throw err;
  }
  return data as T;
}

export interface WhatsAppStatusResult {
  connected: boolean;
  state?: string;
  instance?: string;
  serverUrl?: string;
  message?: string;
  error?: string;
}

export const firebaseWhatsAppService = {
  /**
   * Envia mensagem para o WhatsApp e armazena no Firestore.
   */
  async sendMessage(
    phone: string,
    text: string,
    customerName?: string,
    customerId?: string
  ): Promise<{ success: boolean; message?: string }> {
    const cleanPhone = normalizePhoneForWhatsApp(phone);
    if (!cleanPhone) throw new Error('Número de WhatsApp inválido.');
    if (!text.trim()) throw new Error('Mensagem não pode estar vazia.');

    const requestId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `wa_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    const payload = {
      phone: cleanPhone,
      text: text.trim(),
      customerName: customerName || undefined,
      customerId: customerId || undefined,
      requestId,
    };

    const data = await executeWithGcpFallback(
      'communicationsAdmin',
      () => callBetaWhatsAppApi<{ success: boolean; message: string; data: any }>('sendWhatsAppDirectMessage', payload),
      async () => {
        const sendCallable = httpsCallable<
          typeof payload,
          { success: boolean; message: string; data: any }
        >(functions, 'sendWhatsAppDirectMessage');
        const result = await sendCallable(payload);
        return result.data;
      },
    );

    return {
      success: data.success,
      message: data.message || 'Mensagem enviada com sucesso!',
    };
  },

  /**
   * Apaga uma mensagem do WhatsApp (para todos) e remove do Firestore.
   */
  async deleteMessage(
    phone: string,
    messageDocId?: string,
    evolutionMessageId?: string
  ): Promise<{ success: boolean; message?: string }> {
    const cleanPhone = normalizePhoneForWhatsApp(phone);
    if (!cleanPhone) throw new Error('Número de WhatsApp inválido.');
    if (!messageDocId && !evolutionMessageId) throw new Error('Identificador da mensagem não informado.');

    const payload = {
      phone: cleanPhone,
      messageDocId,
      evolutionMessageId,
    };
    const data = await executeWithGcpFallback(
      'communicationsAdmin',
      () => callBetaWhatsAppApi<{ success: boolean; message: string }>('deleteWhatsAppMessage', payload),
      async () => {
        const deleteCallable = httpsCallable<
          typeof payload,
          { success: boolean; message: string }
        >(functions, 'deleteWhatsAppMessage');
        const result = await deleteCallable(payload);
        return result.data;
      },
    );

    return {
      success: data.success,
      message: data.message || 'Mensagem apagada com sucesso!',
    };
  },

  /**
   * Sincroniza o histórico recente de mensagens de um contato.
   */
  async syncMessages(phone: string): Promise<{ success: boolean; count?: number; message?: string }> {
    const cleanPhone = normalizePhoneForWhatsApp(phone);
    if (!cleanPhone) throw new Error('Número de WhatsApp inválido.');

    const data = await executeWithGcpFallback(
      'communicationsAdmin',
      () => callBetaWhatsAppApi<{ success: boolean; count: number; message: string }>('syncWhatsAppChatMessages', { phone: cleanPhone }),
      async () => {
        const syncCallable = httpsCallable<
          { phone: string },
          { success: boolean; count: number; message: string }
        >(functions, 'syncWhatsAppChatMessages');
        const result = await syncCallable({ phone: cleanPhone });
        return result.data;
      },
    );

    return {
      success: data.success,
      count: data.count,
      message: data.message || 'Mensagens sincronizadas!',
    };
  },

  /**
   * Escuta mensagens de uma conversa específica em tempo real.
   */
  subscribeMessages(
    phone: string,
    onUpdate: (messages: WhatsAppMessage[]) => void,
    onError?: (err: any) => void,
    msgLimit: number = 50,
    adminScope: boolean = false
  ) {
    const cleanPhone = normalizePhoneForWhatsApp(phone);
    if (!cleanPhone) {
      onUpdate([]);
      return () => {};
    }

    const messagesRef = collection(db, 'whatsapp_messages');
    const q = query(
      messagesRef,
      where('chatId', '==', cleanPhone),
      ...(!adminScope ? [where('userId', '==', auth.currentUser?.uid || '__unauthenticated__')] : []),
      orderBy('timestamp', 'desc'),
      limit(msgLimit)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as WhatsAppMessage[];
        // Reverse so the newest messages are at the bottom
        onUpdate(msgs.reverse());
      },
      (err) => {
        console.error('[firebaseWhatsAppService] Erro ao carregar mensagens:', err);
        onError?.(err);
      }
    );
  },

  /**
   * Escuta a lista de conversas em tempo real.
   */
  subscribeConversations(
    onUpdate: (conversations: WhatsAppConversation[]) => void,
    onError?: (err: any) => void,
    adminScope: boolean = false
  ) {
    const chatsRef = collection(db, 'whatsapp_chats');
    const q = query(chatsRef, ...(!adminScope ? [where('userId', '==', auth.currentUser?.uid || '__unauthenticated__')] : []), orderBy('lastMessageTimestamp', 'desc'), limit(100));

    return onSnapshot(
      q,
      (snapshot) => {
        const chats = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as WhatsAppConversation[];
        onUpdate(chats);
      },
      (err) => {
        console.error('[firebaseWhatsAppService] Erro ao carregar conversas:', err);
        onError?.(err);
      }
    );
  },

  /**
   * Marca uma conversa como lida.
   */
  async markChatAsRead(phone: string): Promise<void> {
    const cleanPhone = normalizePhoneForWhatsApp(phone);
    if (!cleanPhone) return;

    await executeWithGcpFallback<void>(
      'communicationsAdmin',
      async () => {
        await callBetaWhatsAppApi('markWhatsAppChatRead', { phone: cleanPhone });
      },
      async () => {
        const callable = httpsCallable<{ phone: string }, { success: boolean }>(functions, 'markWhatsAppChatRead');
        await callable({ phone: cleanPhone });
      },
    );
  },

  /**
   * Inicializa ou atualiza o contato na listagem de conversas.
   */
  async ensureConversation(phone: string, customerName: string, customerId?: string): Promise<void> {
    const cleanPhone = normalizePhoneForWhatsApp(phone);
    if (!cleanPhone) return;

    const payload = { phone: cleanPhone, customerName: customerName || cleanPhone, customerId };
    await executeWithGcpFallback<void>(
      'communicationsAdmin',
      async () => {
        await callBetaWhatsAppApi('ensureWhatsAppConversation', payload);
      },
      async () => {
        const callable = httpsCallable<
          typeof payload,
          { success: boolean }
        >(functions, 'ensureWhatsAppConversation');
        await callable(payload);
      },
    );
  },

  /**
   * Consulta o status da conexão da instância com o WhatsApp.
   */
  async getInstanceStatus(): Promise<WhatsAppStatusResult> {
    try {
      return await executeWithGcpFallback(
        'communicationsAdmin',
        () => callBetaWhatsAppApi<WhatsAppStatusResult>('getWhatsAppInstanceStatus'),
        async () => {
          const statusCallable = httpsCallable<void, WhatsAppStatusResult>(
            functions,
            'getWhatsAppInstanceStatus'
          );
          const res = await statusCallable();
          return res.data;
        },
      );
    } catch (err: any) {
      console.warn('[firebaseWhatsAppService] Erro ao verificar status da instância:', err);
      return {
        connected: false,
        error: err.message,
      };
    }
  },
};

import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, getDocs, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { WhatsAppMessage, WhatsAppConversation } from '../app/types';
import { normalizePhoneForWhatsApp } from '../app/utils/whatsapp';

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
   * Envia mensagem via Evolution API e armazena no Firestore.
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

    const sendCallable = httpsCallable<
      { phone: string; text: string; customerName?: string; customerId?: string },
      { success: boolean; message: string; data: any }
    >(functions, 'sendWhatsAppDirectMessage');

    const result = await sendCallable({
      phone: cleanPhone,
      text: text.trim(),
      customerName: customerName || undefined,
      customerId: customerId || undefined,
    });

    return {
      success: result.data.success,
      message: result.data.message || 'Mensagem enviada com sucesso!',
    };
  },

  /**
   * Escuta mensagens de uma conversa específica em tempo real.
   */
  subscribeMessages(
    phone: string,
    onUpdate: (messages: WhatsAppMessage[]) => void,
    onError?: (err: any) => void
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
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as WhatsAppMessage[];
        onUpdate(msgs);
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
    onError?: (err: any) => void
  ) {
    const chatsRef = collection(db, 'whatsapp_chats');
    const q = query(chatsRef, orderBy('lastMessageTimestamp', 'desc'), limit(100));

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

    try {
      const chatRef = doc(db, 'whatsapp_chats', cleanPhone);
      await updateDoc(chatRef, {
        unreadCount: 0,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Ignore if chat doc does not exist yet
    }
  },

  /**
   * Inicializa ou atualiza o contato na listagem de conversas.
   */
  async ensureConversation(phone: string, customerName: string, customerId?: string): Promise<void> {
    const cleanPhone = normalizePhoneForWhatsApp(phone);
    if (!cleanPhone) return;

    const chatRef = doc(db, 'whatsapp_chats', cleanPhone);
    await setDoc(
      chatRef,
      {
        id: cleanPhone,
        phone: cleanPhone,
        customerName: customerName || cleanPhone,
        customerId: customerId || null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },

  /**
   * Consulta o status da conexão da instância com a Evolution API.
   */
  async getInstanceStatus(): Promise<WhatsAppStatusResult> {
    try {
      const statusCallable = httpsCallable<void, WhatsAppStatusResult>(
        functions,
        'getWhatsAppInstanceStatus'
      );
      const res = await statusCallable();
      return res.data;
    } catch (err: any) {
      console.warn('[firebaseWhatsAppService] Erro ao verificar status da instância:', err);
      return {
        connected: false,
        error: err.message,
      };
    }
  },
};

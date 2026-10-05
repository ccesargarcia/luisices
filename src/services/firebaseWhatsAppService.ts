import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, getDoc, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, auth } from '../lib/firebase';
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

async function getOwnerUid(): Promise<string> {
  if (!auth.currentUser) throw new Error('Usuário não autenticado.');
  const configRef = doc(db, 'integrationSettings', 'whatsapp');
  let snapshot = await getDoc(configRef);

  // Auto-provisionamento: se não existir, tenta inicializar automaticamente caso o usuário seja admin
  if (!snapshot.exists()) {
    try {
      const profileSnap = await getDoc(doc(db, 'userProfiles', auth.currentUser.uid));
      if (profileSnap.exists() && profileSnap.data()?.role === 'admin' && profileSnap.data()?.active !== false) {
        await setDoc(configRef, { ownerUid: auth.currentUser.uid, enabled: true });
        snapshot = await getDoc(configRef);
      }
    } catch (e) {
      console.warn('[firebaseWhatsAppService] Tentativa de auto-provisionar falhou:', e);
    }
  }

  const data = snapshot.data();
  if (!snapshot.exists() || data?.enabled !== true || typeof data.ownerUid !== 'string') {
    throw new Error('Integração WhatsApp não configurada.');
  }
  return data.ownerUid;
}

// Mantém o contrato síncrono de unsubscribe enquanto resolve o escopo protegido.
function scopedSubscription(
  subscribe: (ownerUid: string) => () => void,
  onError?: (err: unknown) => void,
): () => void {
  let stopped = false;
  let unsubscribe: (() => void) | undefined;
  const uid = auth.currentUser?.uid;
  getOwnerUid().then((ownerUid) => {
    if (!stopped && uid === auth.currentUser?.uid) unsubscribe = subscribe(ownerUid);
  }).catch((error) => { if (!stopped) onError?.(error); });
  return () => { stopped = true; unsubscribe?.(); };
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

    const deleteCallable = httpsCallable<
      { phone: string; messageDocId?: string; evolutionMessageId?: string },
      { success: boolean; message: string }
    >(functions, 'deleteWhatsAppMessage');

    const result = await deleteCallable({
      phone: cleanPhone,
      messageDocId,
      evolutionMessageId,
    });

    return {
      success: result.data.success,
      message: result.data.message || 'Mensagem apagada com sucesso!',
    };
  },

  /**
   * Sincroniza o histórico recente de mensagens de um contato.
   */
  async syncMessages(phone: string): Promise<{ success: boolean; count?: number; message?: string }> {
    const cleanPhone = normalizePhoneForWhatsApp(phone);
    if (!cleanPhone) throw new Error('Número de WhatsApp inválido.');

    const syncCallable = httpsCallable<
      { phone: string },
      { success: boolean; count: number; message: string }
    >(functions, 'syncWhatsAppChatMessages');

    const result = await syncCallable({ phone: cleanPhone });

    return {
      success: result.data.success,
      count: result.data.count,
      message: result.data.message || 'Mensagens sincronizadas!',
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

    return scopedSubscription((ownerUid) => {
      const q = query(collection(db, 'whatsapp_messages'),
        where('userId', '==', ownerUid), where('chatId', '==', `${ownerUid}_${cleanPhone}`),
        orderBy('timestamp', 'asc'), limit(100));
      return onSnapshot(q, (snapshot) => {
        onUpdate(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as WhatsAppMessage[]);
      }, onError);
    }, onError);
  },

  /**
   * Escuta a lista de conversas em tempo real.
   */
  subscribeConversations(
    onUpdate: (conversations: WhatsAppConversation[]) => void,
    onError?: (err: any) => void
  ) {
    return scopedSubscription((ownerUid) => {
      const q = query(collection(db, 'whatsapp_chats'), where('userId', '==', ownerUid),
        orderBy('lastMessageTimestamp', 'desc'), limit(100));
      return onSnapshot(q, (snapshot) => {
        onUpdate(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as WhatsAppConversation[]);
      }, onError);
    }, onError);
  },

  /**
   * Marca uma conversa como lida.
   */
  async markChatAsRead(phone: string): Promise<void> {
    const cleanPhone = normalizePhoneForWhatsApp(phone);
    if (!cleanPhone) return;

    try {
      const ownerUid = await getOwnerUid();
      const chatRef = doc(db, 'whatsapp_chats', `${ownerUid}_${cleanPhone}`);
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

    const ownerUid = await getOwnerUid();
    const chatRef = doc(db, 'whatsapp_chats', `${ownerUid}_${cleanPhone}`);
    if ((await getDoc(chatRef)).exists()) return;
    await setDoc(chatRef, {
      id: `${ownerUid}_${cleanPhone}`, userId: ownerUid, phone: cleanPhone,
      customerName: customerName || cleanPhone, updatedAt: serverTimestamp(),
    });
  },

  /**
   * Consulta o status da conexão da instância com o WhatsApp.
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

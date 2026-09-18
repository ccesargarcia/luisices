import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { AiOrderDraft } from '../app/types';

export interface AiAgentChatResponse {
  success: boolean;
  reply: string;
  orderDraft?: AiOrderDraft | null;
}

export class FirebaseAiAgentService {
  /**
   * Envia uma mensagem para o Copiloto de IA Interno (Cloud Function segura)
   */
  async sendMessage(
    message: string,
    history?: Array<{ role: 'user' | 'assistant'; text: string }>
  ): Promise<AiAgentChatResponse> {
    const callable = httpsCallable<
      { message: string; history?: Array<{ role: 'user' | 'assistant'; text: string }> },
      AiAgentChatResponse
    >(functions, 'aiAgentChat');

    const result = await callable({ message, history });
    return result.data;
  }

  /**
   * Sincroniza em lote todos os pedidos para a coleção ai_orders_view (apenas admin)
   */
  async syncAllOrders(): Promise<{ success: boolean; count: number; message: string }> {
    const callable = httpsCallable<
      void,
      { success: boolean; count: number; message: string }
    >(functions, 'syncAllOrdersToAiView');

    const result = await callable();
    return result.data;
  }
}

export const firebaseAiAgentService = new FirebaseAiAgentService();

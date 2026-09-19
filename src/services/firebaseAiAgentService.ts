import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { AiOrderDraft, AiWhatsAppDraft, AiPricingEstimate } from '../app/types';

export interface AiAgentChatResponse {
  success: boolean;
  reply: string;
  orderDraft?: AiOrderDraft | null;
  whatsappDraft?: AiWhatsAppDraft | null;
  pricingEstimate?: AiPricingEstimate | null;
  galleryItems?: Array<{
    id: string;
    title: string;
    description?: string;
    imageUrl: string;
    productType?: string;
    customerName?: string;
    orderNumber?: string;
    tags?: string[];
    aiTags?: string[];
  }> | null;
}

export class FirebaseAiAgentService {
  /**
   * Envia uma mensagem para o Copiloto de IA Interno (Cloud Function segura)
   * Suporta texto e envio multimodal de imagem (base64)
   */
  async sendMessage(
    message: string,
    history?: Array<{ role: 'user' | 'assistant'; text: string }>,
    image?: { base64: string; mimeType: string } | null
  ): Promise<AiAgentChatResponse> {
    const callable = httpsCallable<
      {
        message: string;
        history?: Array<{ role: 'user' | 'assistant'; text: string }>;
        image?: { base64: string; mimeType: string } | null;
      },
      AiAgentChatResponse
    >(functions, 'aiAgentChat');

    const result = await callable({ message, history, image });
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

  /**
   * Dispara uma mensagem WhatsApp diretamente para o cliente
   */
  async sendWhatsAppDirectMessage(
    phone: string,
    text: string
  ): Promise<{ success: boolean; message: string }> {
    const callable = httpsCallable<
      { phone: string; text: string },
      { success: boolean; message: string }
    >(functions, 'sendWhatsAppDirectMessage');

    const result = await callable({ phone, text });
    return result.data;
  }

  /**
   * Consulta a cota e o consumo em tempo real do Gemini API
   */
  async getAiUsage(): Promise<import('../app/types').AiUsageData> {
    const callable = httpsCallable<
      void,
      import('../app/types').AiUsageData
    >(functions, 'getAiUsage');

    const result = await callable();
    return result.data;
  }
}

export const firebaseAiAgentService = new FirebaseAiAgentService();

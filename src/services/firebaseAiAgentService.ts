import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';
import { AiOrderDraft, AiWhatsAppDraft, AiPricingEstimate } from '../app/types';
import { executeWithGcpFallback, VercelInfraError } from './backendRoutingService';
import { getVercelBetaApiUrl } from '../app/utils/betaHost';

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
    return executeWithGcpFallback(
      'aiChat',
      async () => {
        const user = auth.currentUser;
        if (!user) throw new Error('Sessão necessária para usar o Copiloto de IA.');
        const idToken = await user.getIdToken();
        const response = await fetch(getVercelBetaApiUrl('/api/ai-chat'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ message, history, image }),
          signal: AbortSignal.timeout(65000),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status === 413 && payload?.error?.code === 'vercel-payload-too-large') {
            throw new VercelInfraError('A solicitação excede 4 MiB no gateway. Reduza a imagem ou habilite o fallback GCP.', 413);
          }
          if (response.status >= 500 && !payload?.error?.code) {
            throw new VercelInfraError(`Erro no Copiloto (${response.status}).`, response.status);
          }
          const err = new Error(payload?.error?.message || `Erro no Copiloto (${response.status}).`);
          if (payload?.error?.code) Object.assign(err, { code: payload.error.code });
          Object.assign(err, { status: response.status });
          throw err;
        }
        return payload as AiAgentChatResponse;
      },
      async () => {
        const callable = httpsCallable<
          {
            message: string;
            history?: Array<{ role: 'user' | 'assistant'; text: string }>;
            image?: { base64: string; mimeType: string } | null;
          },
          AiAgentChatResponse
        >(functions, 'aiAgentChat', { timeout: 120000 });

        const result = await callable({ message, history, image });
        return result.data;
      },
    );
  }

  /**
   * @deprecated A sincronização manual não é mais necessária: o Copiloto agora opera com projeção em memória segura e em tempo real diretamente da coleção `orders`.
   */
  async syncAllOrders(): Promise<{ success: boolean; count: number; message: string }> {
    return {
      success: true,
      count: 0,
      message: 'A sincronização agora é nativa e em tempo real em memória.',
    };
  }

  /**
   * Dispara uma mensagem WhatsApp diretamente para o cliente
   */
  async sendWhatsAppDirectMessage(
    phone: string,
    text: string,
    requestId: string = crypto.randomUUID()
  ): Promise<{ success: boolean; message: string }> {
    const callable = httpsCallable<
      { phone: string; text: string; requestId: string },
      { success: boolean; message: string }
    >(functions, 'sendWhatsAppDirectMessage');

    const result = await callable({ phone, text, requestId });
    if (result.data?.success !== true) {
      const error = new Error('Envio não confirmado pelo backend. Confira o Atendimento antes de tentar novamente.');
      Object.assign(error, { code: 'unconfirmed' });
      throw error;
    }
    return result.data;
  }

}

export const firebaseAiAgentService = new FirebaseAiAgentService();

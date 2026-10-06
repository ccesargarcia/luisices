/**
 * Serviço de integração com o backend da Alexa no Luisices.
 * Comunica-se com as Cloud Functions v2 via httpsCallable.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import {
  AlexaIntegrationStatus,
  AlexaConfirmationMode,
} from '../app/types';

export class FirebaseAlexaService {
  /**
   * Obtém o status operacional, vínculos, permissões e rascunhos pendentes.
   * Se informado targetUid (por um admin), retorna o status específico desse usuário.
   */
  async getStatus(targetUid?: string): Promise<AlexaIntegrationStatus> {
    const callable = httpsCallable<{ targetUid?: string } | undefined, AlexaIntegrationStatus>(
      functions,
      'getAlexaIntegrationStatus'
    );
    const result = await callable(targetUid ? { targetUid } : undefined);
    return result.data;
  }

  /**
   * Aprova o código de 8 dígitos falado pela Alexa e associa a voz ao usuário selecionado (admin).
   */
  async approvePairing(code: string, targetUid: string): Promise<{ success: boolean; bindingKey: string; targetUid: string; targetName?: string }> {
    const callable = httpsCallable<{ code: string; targetUid: string }, { success: boolean; bindingKey: string; targetUid: string; targetName?: string }>(
      functions,
      'approveAlexaPairing'
    );
    const result = await callable({ code, targetUid });
    return result.data;
  }

  /**
   * Define se o usuário pode criar pedidos por voz e qual o modo de confirmação (admin).
   */
  async setPermission(uid: string, enabled: boolean, mode: AlexaConfirmationMode): Promise<{ success: boolean; uid: string; enabled: boolean; mode: AlexaConfirmationMode }> {
    const callable = httpsCallable<{ uid: string; enabled: boolean; mode: AlexaConfirmationMode }, { success: boolean; uid: string; enabled: boolean; mode: AlexaConfirmationMode }>(
      functions,
      'setAlexaPermission'
    );
    const result = await callable({ uid, enabled, mode });
    return result.data;
  }

  /**
   * Revoga um vínculo ativo de voz (admin ou o próprio usuário titular).
   */
  async revokeBinding(bindingId: string): Promise<{ success: boolean; bindingId: string }> {
    const callable = httpsCallable<{ bindingId: string }, { success: boolean; bindingId: string }>(
      functions,
      'revokeAlexaBinding'
    );
    const result = await callable({ bindingId });
    return result.data;
  }

  /**
   * Liga ou desliga globalmente a integração da Alexa no ambiente atual (admin).
   */
  async toggleGlobalIntegration(enabled: boolean): Promise<{ success: boolean; enabled: boolean }> {
    const callable = httpsCallable<{ enabled: boolean }, { success: boolean; enabled: boolean }>(
      functions,
      'toggleGlobalAlexaIntegration'
    );
    const result = await callable({ enabled });
    return result.data;
  }

  /**
   * Aprova o rascunho de pedido pelo aplicativo Luisices no modo app_approval (apenas o titular).
   */
  async approveDraft(draftId: string, revision?: number): Promise<{ success: boolean; orderId: string; orderNumber: string }> {
    const callable = httpsCallable<{ draftId: string; revision?: number }, { success: boolean; orderId: string; orderNumber: string }>(
      functions,
      'approveAlexaDraft'
    );
    const result = await callable({ draftId, revision });
    return result.data;
  }

  /**
   * Cancela ou descarta um rascunho de pedido pendente/expirado (apenas titular ou admin).
   */
  async cancelDraft(draftId: string): Promise<{ success: boolean; draftId: string }> {
    const callable = httpsCallable<{ draftId: string }, { success: boolean; draftId: string }>(
      functions,
      'cancelAlexaDraft'
    );
    const result = await callable({ draftId });
    return result.data;
  }
}

export const firebaseAlexaService = new FirebaseAlexaService();

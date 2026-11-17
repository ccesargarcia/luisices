/**
 * Serviço de integração com o backend da Alexa no Luisices.
 * Roteia via Vercel (/api/alexa) ou Cloud Functions v2 (httpsCallable) conforme feature flag.
 */

import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';
import { executeWithGcpFallback, VercelInfraError } from './backendRoutingService';
import {
  AlexaIntegrationStatus,
  AlexaConfirmationMode,
} from '../app/types';
import { getVercelBetaApiUrl } from '../app/utils/betaHost';

async function callBetaAlexaApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Entre na sua conta para gerenciar a integração Alexa.');
  const idToken = await user.getIdToken();
  const response = await fetch(getVercelBetaApiUrl('/api/alexa'), {
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
    if (response.status >= 500 && !data?.error?.code) {
      throw new VercelInfraError(`Erro na integração Alexa (${response.status}).`, response.status);
    }
    const err = new Error(data?.error?.message || `Erro na integração Alexa (${response.status}).`);
    if (data?.error?.code) Object.assign(err, { code: data.error.code });
    if (data?.error?.details !== undefined) Object.assign(err, { details: data.error.details });
    Object.assign(err, { status: response.status });
    throw err;
  }
  return data as T;
}

export class FirebaseAlexaService {
  /**
   * Obtém o status operacional, vínculos, permissões e rascunhos pendentes.
   * Se informado targetUid (por um admin), retorna o status específico desse usuário.
   */
  async getStatus(targetUid?: string): Promise<AlexaIntegrationStatus> {
    return executeWithGcpFallback(
      'alexa',
      () => callBetaAlexaApi<AlexaIntegrationStatus>('getStatus', targetUid ? { targetUid } : {}),
      async () => {
        const callable = httpsCallable<{ targetUid?: string } | undefined, AlexaIntegrationStatus>(
          functions,
          'getAlexaIntegrationStatus'
        );
        const result = await callable(targetUid ? { targetUid } : undefined);
        return result.data;
      },
    );
  }

  /**
   * Aprova o código de 8 dígitos falado pela Alexa e associa a voz ao usuário selecionado (admin).
   */
  async approvePairing(code: string, targetUid: string): Promise<{ success: boolean; bindingKey: string; targetUid: string; targetName?: string }> {
    return executeWithGcpFallback(
      'alexa',
      () => callBetaAlexaApi<{ success: boolean; bindingKey: string; targetUid: string; targetName?: string }>('approvePairing', { code, targetUid }),
      async () => {
        const callable = httpsCallable<{ code: string; targetUid: string }, { success: boolean; bindingKey: string; targetUid: string; targetName?: string }>(
          functions,
          'approveAlexaPairing'
        );
        const result = await callable({ code, targetUid });
        return result.data;
      },
    );
  }

  /**
   * Define se o usuário pode criar pedidos por voz e qual o modo de confirmação (admin).
   */
  async setPermission(uid: string, enabled: boolean, mode: AlexaConfirmationMode): Promise<{ success: boolean; uid: string; enabled: boolean; mode: AlexaConfirmationMode }> {
    return executeWithGcpFallback(
      'alexa',
      () => callBetaAlexaApi<{ success: boolean; uid: string; enabled: boolean; mode: AlexaConfirmationMode }>('setPermission', { uid, enabled, mode }),
      async () => {
        const callable = httpsCallable<{ uid: string; enabled: boolean; mode: AlexaConfirmationMode }, { success: boolean; uid: string; enabled: boolean; mode: AlexaConfirmationMode }>(
          functions,
          'setAlexaPermission'
        );
        const result = await callable({ uid, enabled, mode });
        return result.data;
      },
    );
  }

  /**
   * Revoga um vínculo ativo de voz (admin ou o próprio usuário titular).
   */
  async revokeBinding(bindingId: string): Promise<{ success: boolean; bindingId: string }> {
    return executeWithGcpFallback(
      'alexa',
      () => callBetaAlexaApi<{ success: boolean; bindingId: string }>('revokeBinding', { bindingId }),
      async () => {
        const callable = httpsCallable<{ bindingId: string }, { success: boolean; bindingId: string }>(
          functions,
          'revokeAlexaBinding'
        );
        const result = await callable({ bindingId });
        return result.data;
      },
    );
  }

  /**
   * Liga ou desliga globalmente a integração da Alexa no ambiente atual (admin).
   */
  async toggleGlobalIntegration(enabled: boolean): Promise<{ success: boolean; enabled: boolean }> {
    return executeWithGcpFallback(
      'alexa',
      () => callBetaAlexaApi<{ success: boolean; enabled: boolean }>('toggleGlobalIntegration', { enabled }),
      async () => {
        const callable = httpsCallable<{ enabled: boolean }, { success: boolean; enabled: boolean }>(
          functions,
          'toggleGlobalAlexaIntegration'
        );
        const result = await callable({ enabled });
        return result.data;
      },
    );
  }

  /**
   * Aprova o rascunho de pedido pelo aplicativo Luisices no modo app_approval (apenas o titular).
   */
  async approveDraft(draftId: string, revision?: number): Promise<{ success: boolean; orderId: string; orderNumber: string }> {
    return executeWithGcpFallback(
      'alexa',
      () => callBetaAlexaApi<{ success: boolean; orderId: string; orderNumber: string }>('approveDraft', { draftId, revision }),
      async () => {
        const callable = httpsCallable<{ draftId: string; revision?: number }, { success: boolean; orderId: string; orderNumber: string }>(
          functions,
          'approveAlexaDraft'
        );
        const result = await callable({ draftId, revision });
        return result.data;
      },
    );
  }

  /**
   * Cancela ou descarta um rascunho de pedido pendente/expirado (apenas titular ou admin).
   */
  async cancelDraft(draftId: string): Promise<{ success: boolean; draftId: string }> {
    return executeWithGcpFallback(
      'alexa',
      () => callBetaAlexaApi<{ success: boolean; draftId: string }>('cancelDraft', { draftId }),
      async () => {
        const callable = httpsCallable<{ draftId: string }, { success: boolean; draftId: string }>(
          functions,
          'cancelAlexaDraft'
        );
        const result = await callable({ draftId });
        return result.data;
      },
    );
  }
}

export const firebaseAlexaService = new FirebaseAlexaService();

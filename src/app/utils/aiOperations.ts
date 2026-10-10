import type { AiOperationState } from '../types';

/** Recusas/validações explícitas do callable que impedem a operação. */
export function isAiSendFailureConfirmed(error: unknown): boolean {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code).replace(/^functions\//, '') : '';
  return ['permission-denied', 'unauthenticated', 'invalid-argument', 'failed-precondition', 'resource-exhausted'].includes(code);
}

/** Uma chamada explícita, sem retries: resultado incerto não é sucesso. */
export async function confirmAiWhatsAppSend(
  send: () => Promise<{ success: boolean; message?: string }>,
  onState: (state: AiOperationState) => void,
) {
  onState('user_confirmed');
  try {
    const result = await send();
    if (result?.success !== true) throw new Error('Envio não confirmado pelo backend.');
    onState('backend_completed');
    return result;
  } catch (error) {
    onState(isAiSendFailureConfirmed(error) ? 'failed' : 'unconfirmed');
    throw error;
  }
}

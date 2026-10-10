import { describe, expect, it, vi } from 'vitest';
import { confirmAiWhatsAppSend } from '../../../src/app/utils/aiOperations';
import type { AiOperationState } from '../../../src/app/types';

// Firebase é substituído por callable local: nenhum envio real.
const callable = vi.hoisted(() => vi.fn());
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn(() => callable) }));
vi.mock('../../../src/lib/firebase', () => ({ functions: {} }));
import { firebaseAiAgentService } from '../../../src/services/firebaseAiAgentService';

describe('Confirmação de envio sem repetição automática', () => {
  it('retorno confirmado percorre confirmação do usuário e conclusão pelo backend', async () => {
    const states: AiOperationState[] = [];
    const send = vi.fn(async () => ({ success: true, message: 'Confirmado' }));
    await confirmAiWhatsAppSend(send, (state) => states.push(state));
    expect(states).toEqual(['user_confirmed', 'backend_completed']);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it.each([{ success: false }, {}, { success: 'true' }, null])('retorno sem confirmação %j não anuncia sucesso', async (result) => {
    const states: AiOperationState[] = [];
    const send = vi.fn(async () => result as any);
    await expect(confirmAiWhatsAppSend(send, (state) => states.push(state))).rejects.toThrow('não confirmado');
    expect(states).toEqual(['user_confirmed', 'unconfirmed']);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it.each(['functions/permission-denied', 'invalid-argument', 'failed-precondition'])('recusa explícita %s é falha conhecida, não execução concluída', async (code) => {
    const states: AiOperationState[] = [];
    const send = vi.fn(async () => { throw Object.assign(new Error('Recusado'), { code }); });
    await expect(confirmAiWhatsAppSend(send, (state) => states.push(state))).rejects.toThrow('Recusado');
    expect(states).toEqual(['user_confirmed', 'failed']);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('timeout não repete operação potencialmente executada', async () => {
    const states: AiOperationState[] = [];
    const send = vi.fn(async () => { throw Object.assign(new Error('Timeout'), { code: 'deadline-exceeded' }); });
    await expect(confirmAiWhatsAppSend(send, (state) => states.push(state))).rejects.toThrow('Timeout');
    expect(states).toEqual(['user_confirmed', 'unconfirmed']);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('callable preserva contrato de idempotência existente e exige success booleano confirmado', async () => {
    callable.mockReset();
    callable.mockResolvedValueOnce({ data: { success: true, message: 'Confirmado' } });
    await expect(firebaseAiAgentService.sendWhatsAppDirectMessage('11900000000', 'Texto sintético', 'synthetic_send_1234')).resolves.toMatchObject({ success: true });
    expect(callable).toHaveBeenCalledWith({ phone: '11900000000', text: 'Texto sintético', requestId: 'synthetic_send_1234' });
    callable.mockResolvedValueOnce({ data: { success: false, message: 'Não executado' } });
    await expect(firebaseAiAgentService.sendWhatsAppDirectMessage('11900000000', 'Texto sintético', 'synthetic_send_5678')).rejects.toMatchObject({ code: 'unconfirmed' });
    expect(callable).toHaveBeenCalledTimes(2);
  });
});

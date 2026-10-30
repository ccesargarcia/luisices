import { describe, expect, it, vi } from 'vitest';
import { syncWhatsAppChatMessagesCore } from '../../functions/whatsapp/syncCore';

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
};

function createHarness({
  customerDocs = [{ id: 'customer-1', name: 'Ana', phone: '(11) 99999-8888' }],
  customerQueryError,
}: { customerDocs?: Array<{ id: string; name: string; phone: string }>; customerQueryError?: Error } = {}) {
  const messageWrites: Array<{ id: string; data: Record<string, unknown>; options: unknown }> = [];
  const chatWrites: Array<{ id: string; data: Record<string, unknown>; options: unknown }> = [];
  const serverTimestamp = vi.fn(() => 'server-time');
  const customerGet = vi.fn(async () => {
    if (customerQueryError) throw customerQueryError;
    return { docs: customerDocs.map((item) => ({ id: item.id, data: () => item })) };
  });
  const db = {
    collection: (name: string) => {
      if (name === 'customers') {
        return {
          where: vi.fn(() => ({ limit: vi.fn(() => ({ get: customerGet })) })),
        };
      }
      return {
        doc: (id: string) => ({
          set: vi.fn(async (data: Record<string, unknown>, options: unknown) => {
            const writes = name === 'whatsapp_messages' ? messageWrites : chatWrites;
            writes.push({ id, data, options });
          }),
        }),
      };
    },
  };
  const chatScope = vi.fn().mockResolvedValue('partner-1');
  const fetchImpl = vi.fn();
  const dependencies = {
    request: { auth: { uid: 'staff-1' }, data: { phone: '(11) 99999-8888' as unknown } },
    db,
    chatScope,
    normalizePhone,
    apiKey: 'api-secret',
    apiUrl: 'https://evolution.example',
    instance: 'atelier main',
    serverTimestamp,
    fetchImpl,
  };
  return { dependencies, chatScope, fetchImpl, customerGet, messageWrites, chatWrites, serverTimestamp };
}

describe('syncWhatsAppChatMessagesCore', () => {
  it.each([undefined, '', 'telefone inválido'])('rejeita telefone inválido sem consultar o chat nem a API: %s', async (phone) => {
    const harness = createHarness();
    harness.dependencies.request.data.phone = phone;

    await expect(syncWhatsAppChatMessagesCore(harness.dependencies)).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    expect(harness.chatScope).not.toHaveBeenCalled();
    expect(harness.fetchImpl).not.toHaveBeenCalled();
    expect(harness.messageWrites).toHaveLength(0);
  });

  it('exige a chave antes de acessar o chat ou a Evolution API', async () => {
    const harness = createHarness();
    harness.dependencies.apiKey = '';

    await expect(syncWhatsAppChatMessagesCore(harness.dependencies)).rejects.toMatchObject({
      code: 'failed-precondition',
    });
    expect(harness.chatScope).not.toHaveBeenCalled();
    expect(harness.fetchImpl).not.toHaveBeenCalled();
  });

  it('bloqueia acesso fora do parceiro antes de chamar a API ou gravar mensagens', async () => {
    const harness = createHarness();
    harness.chatScope.mockRejectedValue(Object.assign(new Error('chat fora do parceiro'), {
      code: 'permission-denied',
    }));

    await expect(syncWhatsAppChatMessagesCore(harness.dependencies)).rejects.toMatchObject({
      code: 'permission-denied',
    });
    expect(harness.fetchImpl).not.toHaveBeenCalled();
    expect(harness.messageWrites).toHaveLength(0);
    expect(harness.chatWrites).toHaveLength(0);
  });

  it('consulta o histórico e persiste somente mensagens identificáveis e com texto', async () => {
    const harness = createHarness();
    harness.fetchImpl.mockResolvedValue({
      ok: true,
      json: async () => ({ messages: { records: [
        {
          key: { id: 'message-1', fromMe: false },
          message: { conversation: 'Olá' },
          messageTimestamp: 1761000000,
        },
        {
          key: { id: 'message-2', fromMe: true },
          message: { imageMessage: { caption: 'Pedido pronto' } },
          messageTimestamp: 1761000100,
        },
        { key: { id: 'message-3', fromMe: false }, message: { audioMessage: {} } },
        { key: { fromMe: false }, message: { conversation: 'sem id' } },
        { key: { id: 'message-empty', fromMe: false }, message: {} },
      ] } }),
    });

    await expect(syncWhatsAppChatMessagesCore(harness.dependencies)).resolves.toMatchObject({
      success: true,
      count: 3,
      message: '3 mensagem(ns) sincronizada(s) com sucesso!',
    });

    expect(harness.fetchImpl).toHaveBeenCalledWith(
      'https://evolution.example/chat/findMessages/atelier%20main',
      expect.objectContaining({
        method: 'POST',
        headers: { apikey: 'api-secret', 'Content-Type': 'application/json' },
        body: JSON.stringify({ where: { key: { remoteJid: '5511999998888@s.whatsapp.net' } }, limit: 50 }),
        signal: expect.any(AbortSignal),
      }),
    );
    expect(harness.chatScope).toHaveBeenCalledWith(harness.dependencies.request, '5511999998888');
    expect(harness.messageWrites).toHaveLength(3);
    expect(harness.messageWrites[0]).toMatchObject({
      id: 'wa_message-1',
      data: {
        userId: 'partner-1', chatId: '5511999998888', customerName: 'Ana', customerId: 'customer-1',
        sender: 'customer', text: 'Olá', status: 'received',
        timestamp: new Date(1761000000 * 1000).toISOString(), evolutionMessageId: 'message-1',
      },
      options: { merge: true },
    });
    expect(harness.messageWrites[1].data).toMatchObject({ sender: 'me', text: 'Pedido pronto', status: 'sent' });
    expect(harness.messageWrites[2].data).toMatchObject({ text: '🎵 [Áudio]', status: 'received' });
    expect(harness.chatWrites).toHaveLength(1);
    expect(harness.chatWrites[0]).toMatchObject({
      id: '5511999998888',
      data: {
        customerName: 'Ana', customerId: 'customer-1', lastMessageText: '🎵 [Áudio]',
        lastMessageSender: 'customer', updatedAt: 'server-time',
      },
      options: { merge: true },
    });
  });

  it('retorna erro do provedor sem iniciar gravações no Firestore', async () => {
    const harness = createHarness();
    harness.fetchImpl.mockResolvedValue({ ok: false, status: 503, text: async () => 'maintenance' });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(syncWhatsAppChatMessagesCore(harness.dependencies)).resolves.toEqual({
      success: false,
      message: 'Não foi possível sincronizar histórico (503).',
    });
    expect(harness.customerGet).not.toHaveBeenCalled();
    expect(harness.messageWrites).toHaveLength(0);
    expect(harness.chatWrites).toHaveLength(0);
    warn.mockRestore();
  });

  it('continua sem vínculo de cliente se a consulta de clientes falhar e aceita lista vazia', async () => {
    const harness = createHarness({ customerQueryError: new Error('Firestore indisponível') });
    harness.fetchImpl.mockResolvedValue({ ok: true, json: async () => ({ records: [] }) });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(syncWhatsAppChatMessagesCore(harness.dependencies)).resolves.toMatchObject({
      success: true,
      count: 0,
    });
    expect(harness.messageWrites).toHaveLength(0);
    expect(harness.chatWrites).toHaveLength(0);
    warn.mockRestore();
  });

  it('converte falhas de rede em erro callable internal', async () => {
    const harness = createHarness();
    harness.fetchImpl.mockRejectedValue(new Error('network down'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(syncWhatsAppChatMessagesCore(harness.dependencies)).rejects.toMatchObject({
      code: 'internal',
      message: 'network down',
    });
    error.mockRestore();
  });
});

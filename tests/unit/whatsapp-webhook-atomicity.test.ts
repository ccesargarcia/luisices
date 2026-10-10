import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
const require = createRequire(import.meta.url);
const { persistIncomingMessage } = require('../../functions/whatsapp/persistMessage.js');

function fixture(sender = 'customer') {
  const writes: any[] = [];
  const transaction = {
    get: vi.fn().mockResolvedValue({ exists: false }),
    set: vi.fn((...args: any[]) => writes.push(args)),
  };
  return {
    writes, transaction,
    options: {
      db: { runTransaction: vi.fn((callback: any) => callback(transaction)) },
      messageRef: 'message', chatRef: 'chat',
      message: { chatId: '5511999999999', phone: '5511999999999', customerName: 'Teste', customerId: null, sender, text: 'Teste', timestamp: '2026-10-10T12:00:00Z' },
      increment: (value: number) => ({ increment: value }),
      serverTimestamp: () => 'server-time',
    },
  };
}

describe('Atomicidade do webhook WhatsApp', () => {
  it('grava mensagem e incremento na mesma transação', async () => {
    const { options, writes } = fixture();
    expect(await persistIncomingMessage(options)).toBe(true);
    expect(writes).toHaveLength(2);
    expect(writes[1][1].unreadCount).toEqual({ increment: 1 });
    expect(options.db.runTransaction).toHaveBeenCalledTimes(1);
  });

  it('ignora mensagem existente sem sobrescrever conteúdo ou contador', async () => {
    const { options, transaction, writes } = fixture();
    transaction.get.mockResolvedValue({ exists: true });
    expect(await persistIncomingMessage(options)).toBe(false);
    expect(writes).toHaveLength(0);
  });

  it('reavalia a duplicidade quando o Firestore repete o callback após conflito', async () => {
    const { options, transaction } = fixture();
    const committedWrites: any[] = [];
    options.db.runTransaction = vi.fn(async (callback: any) => {
      await callback(transaction); // Tentativa descartada por conflito.
      return callback({
        get: async () => ({ exists: true }),
        set: (...args: any[]) => committedWrites.push(args),
      });
    });
    expect(await persistIncomingMessage(options)).toBe(false);
    expect(committedWrites).toHaveLength(0);
  });

  it('enviar uma mensagem não zera mensagens recebidas não lidas', async () => {
    const { options, writes } = fixture('me');
    await persistIncomingMessage(options);
    expect(writes[1][1]).not.toHaveProperty('unreadCount');
  });

  it('propaga falha de commit para permitir retentativa do webhook', async () => {
    const { options } = fixture();
    options.db.runTransaction = vi.fn().mockRejectedValue(new Error('commit failed'));
    await expect(persistIncomingMessage(options)).rejects.toThrow('commit failed');
  });
});

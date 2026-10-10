import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
const require = createRequire(import.meta.url);
const { authorizeChat } = require('../../functions/whatsapp/chatScope.js');

function fixture(owner: string | null = 'partner-a', admin = false, exists = true) {
  const transaction = { get: async () => ({ exists, data: () => ({ userId: owner }) }), set: vi.fn() };
  const customerGet = vi.fn().mockResolvedValue({ exists: true, data: () => ({ userId: 'partner-b' }) });
  const deps = {
    db: { collection: (name: string) => ({ doc: (id: string) => ({ path: `${name}/${id}`, get: customerGet }) }), runTransaction: async (callback: any) => callback(transaction) },
    assertActiveSession: async () => ({ uid: 'partner-a', profile: { role: admin ? 'admin' : 'user', permissions: { whatsapp: true } } }),
  };
  return { deps, transaction };
}

describe('Escopo de caixas WhatsApp', () => {
  it('permite apenas a própria caixa a usuário comum', async () => {
    const { deps } = fixture();
    expect(await authorizeChat({}, '5511999999999', deps)).toBe('partner-a');
  });
  it.each(['partner-b', null])('bloqueia caixa alheia ou legada %s', async (owner) => {
    const { deps } = fixture(owner);
    await expect(authorizeChat({}, '5511999999999', deps)).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('admin acessa legado sem atribuir proprietário arbitrário', async () => {
    const { deps, transaction } = fixture(null, true);
    expect(await authorizeChat({}, '5511999999999', deps)).toBe(null);
    expect(transaction.set).not.toHaveBeenCalled();
  });
  it('não aceita cliente de outro parceiro', async () => {
    const { deps } = fixture();
    await expect(authorizeChat({}, '5511999999999', { ...deps, customerId: 'foreign' })).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('reserva novo chat com proprietário na transação', async () => {
    const { deps, transaction } = fixture(null, false, false);
    expect(await authorizeChat({}, '5511999999999', { ...deps, create: true })).toBe('partner-a');
    expect(transaction.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ userId: 'partner-a' }));
  });
  it('não cria chat em operação de leitura ou exclusão', async () => {
    const { deps, transaction } = fixture(null, false, false);
    await expect(authorizeChat({}, '5511999999999', deps)).rejects.toMatchObject({ code: 'not-found' });
    expect(transaction.set).not.toHaveBeenCalled();
  });
});

import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { markWhatsAppChatReadCore, ensureWhatsAppConversationCore } = require('../../functions/whatsapp/conversationCore.js');
const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
};
const serverTimestamp = () => 'server-time';

function database({ customerExists = true, customerPhone = '(11) 99999-8888' } = {}) {
  const update = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockResolvedValue(undefined);
  const customerGet = vi.fn().mockResolvedValue({
    exists: customerExists,
    data: () => ({ phone: customerPhone }),
  });
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => name === 'customers'
        ? { get: customerGet }
        : { update, set, id },
    }),
  };
  return { db, update, set, customerGet };
}

describe('WhatsApp conversation callables core', () => {
  it('marks a scoped chat as read and resets only its unread count', async () => {
    const { db, update } = database();
    const chatScope = vi.fn().mockResolvedValue('partner-a');
    await expect(markWhatsAppChatReadCore({
      request: { data: { phone: '(11) 99999-8888' } }, db, chatScope, normalizePhone, serverTimestamp,
    })).resolves.toEqual({ success: true });
    expect(chatScope).toHaveBeenCalledWith(expect.anything(), '5511999998888');
    expect(update).toHaveBeenCalledWith({ unreadCount: 0, updatedAt: 'server-time' });
  });

  it.each([undefined, '', 'abc'])('rejects an invalid phone before reading or writing: %s', async (phone) => {
    const { db, update } = database();
    const chatScope = vi.fn();
    await expect(markWhatsAppChatReadCore({
      request: { data: { phone } }, db, chatScope, normalizePhone, serverTimestamp,
    })).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(chatScope).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('does not update a chat when ownership scope denies access', async () => {
    const { db, update } = database();
    const chatScope = vi.fn().mockRejectedValue(Object.assign(new Error('foreign chat'), { code: 'permission-denied' }));
    await expect(markWhatsAppChatReadCore({
      request: { data: { phone: '5511999998888' } }, db, chatScope, normalizePhone, serverTimestamp,
    })).rejects.toMatchObject({ code: 'permission-denied' });
    expect(update).not.toHaveBeenCalled();
  });

  it('creates or updates conversation only after validating and reserving the scoped phone', async () => {
    const { db, set } = database();
    const chatScope = vi.fn().mockResolvedValue('partner-a');
    await expect(ensureWhatsAppConversationCore({
      request: { data: { phone: '(11) 99999-8888', customerName: 'Ana', customerId: 'customer-1' } },
      db, chatScope, normalizePhone, serverTimestamp,
    })).resolves.toEqual({ success: true });
    expect(chatScope).toHaveBeenCalledWith(expect.anything(), '5511999998888', {
      customerId: 'customer-1', create: true,
    });
    expect(set).toHaveBeenCalledWith({
      userId: 'partner-a', id: '5511999998888', phone: '5511999998888',
      customerName: 'Ana', customerId: 'customer-1', updatedAt: 'server-time',
    }, { merge: true });
  });

  it('rejects mismatched customer phone before reserving the chat', async () => {
    const { db, customerGet } = database({ customerPhone: '11911112222' });
    const chatScope = vi.fn();
    await expect(ensureWhatsAppConversationCore({
      request: { data: { phone: '5511999998888', customerId: 'customer-1' } },
      db, chatScope, normalizePhone, serverTimestamp,
    })).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(customerGet).toHaveBeenCalledOnce();
    expect(chatScope).not.toHaveBeenCalled();
  });

  it('rejects a missing customer and never creates an unlinked conversation', async () => {
    const { db, customerGet, set } = database({ customerExists: false });
    const chatScope = vi.fn();
    await expect(ensureWhatsAppConversationCore({
      request: { data: { phone: '5511999998888', customerId: 'missing' } },
      db, chatScope, normalizePhone, serverTimestamp,
    })).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(customerGet).toHaveBeenCalledOnce();
    expect(chatScope).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it('does not persist a conversation when partner ownership validation rejects the scope', async () => {
    const { db, set } = database();
    const chatScope = vi.fn().mockRejectedValue(Object.assign(new Error('foreign customer'), {
      code: 'permission-denied',
    }));
    await expect(ensureWhatsAppConversationCore({
      request: { data: { phone: '5511999998888' } },
      db, chatScope, normalizePhone, serverTimestamp,
    })).rejects.toMatchObject({ code: 'permission-denied' });
    expect(chatScope).toHaveBeenCalledWith(expect.anything(), '5511999998888', {
      customerId: undefined, create: true,
    });
    expect(set).not.toHaveBeenCalled();
  });

  it('validates optional fields and phone before accessing Firestore', async () => {
    const { db, customerGet, set } = database();
    const chatScope = vi.fn();
    await expect(ensureWhatsAppConversationCore({
      request: { data: { phone: '5511999998888', customerName: 'x'.repeat(201) } },
      db, chatScope, normalizePhone, serverTimestamp,
    })).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(ensureWhatsAppConversationCore({
      request: { data: { phone: '5511999998888', customerId: 'x'.repeat(129) } },
      db, chatScope, normalizePhone, serverTimestamp,
    })).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(ensureWhatsAppConversationCore({
      request: { data: { phone: '5511999998888', customerId: 'nested/customer' } },
      db, chatScope, normalizePhone, serverTimestamp,
    })).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(customerGet).not.toHaveBeenCalled();
    expect(chatScope).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { createWhatsAppAuthorizer } from '../../functions/whatsapp/authorization';

describe('WhatsApp callable authorization', () => {
  it.each([
    { role: 'admin', permissions: undefined, expected: true },
    { role: 'user', permissions: { whatsapp: true }, expected: true },
    { role: 'funcionario', permissions: { whatsapp: true }, expected: true },
    { role: 'user', permissions: { whatsapp: false }, expected: false },
    { role: 'funcionario', permissions: undefined, expected: false },
    { role: 'customer', permissions: { whatsapp: true }, expected: false },
  ])('applies role and module permission checks: $role', async ({ role, permissions, expected }) => {
    const assertSession = vi.fn().mockResolvedValue({ profile: { role, permissions } });
    await expect(createWhatsAppAuthorizer(assertSession)({ auth: { uid: 'user-1' } })).resolves.toBe(expected);
    expect(assertSession).toHaveBeenCalledOnce();
  });

  it('denies when active session validation fails', async () => {
    const assertSession = vi.fn().mockRejectedValue(new Error('expired session'));
    await expect(createWhatsAppAuthorizer(assertSession)({ auth: { uid: 'user-1' } })).resolves.toBe(false);
  });
});

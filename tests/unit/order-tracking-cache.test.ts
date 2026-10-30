import { describe, expect, it } from 'vitest';
import { isCachedOrderTrackingLinkValid } from '../../src/app/utils/orderTrackingCache';

const cached = {
  url: 'https://app.example.test/acompanhar/token',
  linkId: 'link-current',
  expiresAt: '2026-12-01T00:00:00.000Z',
  userId: 'user-1',
};
const currentOrder = {
  hasPublicTracking: true,
  publicTrackingLinkId: 'link-current',
  publicTrackingExpiresAt: cached.expiresAt,
};

describe('cache de links de acompanhamento', () => {
  it('reutiliza o link enquanto usuário, identidade e validade coincidirem', () => {
    expect(isCachedOrderTrackingLinkValid(cached, currentOrder, 'user-1', Date.parse('2026-11-01'))).toBe(true);
  });

  it('invalida cache após revogação, troca de link, troca de usuário ou expiração', () => {
    expect(isCachedOrderTrackingLinkValid(cached, { ...currentOrder, hasPublicTracking: false }, 'user-1')).toBe(false);
    expect(isCachedOrderTrackingLinkValid(cached, { ...currentOrder, publicTrackingLinkId: 'link-replaced' }, 'user-1')).toBe(false);
    expect(isCachedOrderTrackingLinkValid(cached, currentOrder, 'user-2')).toBe(false);
    expect(isCachedOrderTrackingLinkValid(cached, currentOrder, 'user-1', Date.parse(cached.expiresAt))).toBe(false);
  });

  it('mantém compatibilidade com pedidos legados sem identificador do link', () => {
    const { publicTrackingLinkId: _linkId, ...legacyOrder } = currentOrder;
    expect(isCachedOrderTrackingLinkValid(cached, legacyOrder, 'user-1', Date.parse('2026-11-01'))).toBe(true);
    expect(isCachedOrderTrackingLinkValid(cached, { ...legacyOrder, publicTrackingExpiresAt: null }, 'user-1')).toBe(false);
  });
});

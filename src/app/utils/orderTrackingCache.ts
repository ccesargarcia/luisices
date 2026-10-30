import type { Order } from '../types';

export interface CachedOrderTrackingLink {
  url: string;
  linkId: string;
  expiresAt: string | null;
  userId: string;
}

export function isCachedOrderTrackingLinkValid(
  cached: CachedOrderTrackingLink,
  order: Pick<Order, 'hasPublicTracking' | 'publicTrackingLinkId' | 'publicTrackingExpiresAt'> | undefined,
  userId: string | undefined,
  now = Date.now(),
): boolean {
  if (!order?.hasPublicTracking || !userId || cached.userId !== userId) return false;

  if (cached.expiresAt !== null) {
    const expiry = Date.parse(cached.expiresAt);
    if (!Number.isFinite(expiry) || expiry <= now) return false;
  }

  if (order.publicTrackingExpiresAt !== undefined && order.publicTrackingExpiresAt !== cached.expiresAt) return false;
  if (order.publicTrackingLinkId) return order.publicTrackingLinkId === cached.linkId;
  return order.publicTrackingExpiresAt === cached.expiresAt;
}

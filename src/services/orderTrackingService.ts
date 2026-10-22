import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface PublicOrderTracking {
  orderNumber: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  productName: string;
  quantity: number;
  deliveryDate: string;
  updatedAt: string;
  shippingStatus: string;
  shippingTrackingNumber: string;
}

export interface OrderTrackingLinkResult {
  token: string;
  expiresAt: string | null;
  linkId: string;
}

export interface OrderTrackingLinkRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  token: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  revokedAt: string | null;
  createdByUid: string;
  createdByName: string;
}

export const orderTrackingService = {
  async createLink(orderId: string, expirationDays: 7 | 30 | 90 | null): Promise<OrderTrackingLinkResult> {
    const callable = httpsCallable<{ orderId: string; expirationDays: 7 | 30 | 90 | null }, OrderTrackingLinkResult>(functions, 'createOrderTrackingLink');
    const result = await callable({ orderId, expirationDays });
    return result.data;
  },

  async revokeLink(orderId: string): Promise<void> {
    const callable = httpsCallable<{ orderId: string }, { success: boolean; revoked: boolean }>(functions, 'revokeOrderTrackingLink');
    await callable({ orderId });
  },

  async listLinks(cursor: string | null = null): Promise<{ links: OrderTrackingLinkRecord[]; nextCursor: string | null }> {
    const callable = httpsCallable<
      { cursor: string | null; pageSize: number },
      { links: OrderTrackingLinkRecord[]; nextCursor: string | null }
    >(functions, 'listOrderTrackingLinks');
    const result = await callable({ cursor, pageSize: 50 });
    return result.data;
  },

  async getPublicStatus(token: string): Promise<PublicOrderTracking> {
    const callable = httpsCallable<{ token: string }, PublicOrderTracking>(functions, 'getPublicOrderTracking');
    const result = await callable({ token });
    return result.data;
  },
};

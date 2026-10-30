import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import type { OrderTrackingTemplate } from './firebaseSettingsService';

export interface PublicOrderTracking {
  orderNumber: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  productName: string;
  quantity: number;
  deliveryDate: string;
  updatedAt: string;
  shippingStatus: string;
  shippingTrackingNumber: string;
  trackingTemplate?: Partial<OrderTrackingTemplate>;
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

  async revokeLinkById(linkId: string): Promise<void> {
    const callable = httpsCallable<{ linkId: string }, { success: boolean; revoked: boolean }>(functions, 'revokeOrderTrackingLinkById');
    await callable({ linkId });
  },

  async deleteLink(linkId: string): Promise<void> {
    const callable = httpsCallable<{ linkId: string }, { success: boolean; deleted: boolean }>(functions, 'deleteOrderTrackingLink');
    await callable({ linkId });
  },

  async deleteLinksBatch(linkIds: string[]): Promise<{ success: boolean; deletedCount: number }> {
    if (!linkIds || linkIds.length === 0) return { success: true, deletedCount: 0 };
    try {
      const callable = httpsCallable<{ linkIds: string[] }, { success: boolean; deletedCount: number }>(
        functions,
        'deleteOrderTrackingLinksBatch'
      );
      const result = await callable({ linkIds });
      return result.data;
    } catch (error: any) {
      if (error?.code === 'functions/not-found' || error?.code === 'not-found') {
        const results = await Promise.allSettled(linkIds.map(id => this.deleteLink(id)));
        const deletedCount = results.filter(r => r.status === 'fulfilled').length;
        return { success: true, deletedCount };
      }
      throw error;
    }
  },

  async listLinks(cursor: string | null = null): Promise<{ links: OrderTrackingLinkRecord[]; nextCursor: string | null }> {
    const callable = httpsCallable<
      { cursor: string | null; pageSize: number },
      { links: OrderTrackingLinkRecord[]; nextCursor: string | null }
    >(functions, 'listOrderTrackingLinks');
    const result = await callable({ cursor, pageSize: 50 });
    return result.data;
  },

  async getLinkForOrder(orderId: string): Promise<OrderTrackingLinkRecord | null> {
    const callable = httpsCallable<{ orderId: string }, { link: OrderTrackingLinkRecord | null }>(
      functions,
      'listOrderTrackingLinks'
    );
    const result = await callable({ orderId });
    return result.data.link;
  },

  async getPublicStatus(token: string): Promise<PublicOrderTracking> {
    const callable = httpsCallable<{ token: string }, PublicOrderTracking>(functions, 'getPublicOrderTracking');
    const result = await callable({ token });
    return result.data;
  },
};

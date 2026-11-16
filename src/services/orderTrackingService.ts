import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';
import { executeWithGcpFallback, VercelInfraError } from './backendRoutingService';

async function callBetaTrackingApi<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Entre na sua conta para gerenciar links de acompanhamento.');
  const idToken = await user.getIdToken();
  const response = await fetch('/api/order-tracking', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    cache: 'no-store',
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status >= 500 && !data?.error?.code) {
      throw new VercelInfraError(`Erro ao processar link (${response.status}).`, response.status);
    }
    const err = new Error(data?.error?.message || `Erro ao processar link (${response.status}).`);
    if (data?.error?.code) Object.assign(err, { code: data.error.code });
    if (data?.error?.details !== undefined) Object.assign(err, { details: data.error.details });
    Object.assign(err, { status: response.status });
    throw err;
  }
  return data as T;
}
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
    return executeWithGcpFallback(
      'orderTrackingAdmin',
      () => callBetaTrackingApi<OrderTrackingLinkResult>('create', { orderId, expirationDays }),
      async () => {
        const callable = httpsCallable<{ orderId: string; expirationDays: 7 | 30 | 90 | null }, OrderTrackingLinkResult>(functions, 'createOrderTrackingLink');
        const result = await callable({ orderId, expirationDays });
        return result.data;
      },
    );
  },

  async revokeLink(orderId: string): Promise<void> {
    await executeWithGcpFallback(
      'orderTrackingAdmin',
      () => callBetaTrackingApi('revoke', { orderId }),
      async () => {
        const callable = httpsCallable<{ orderId: string }, { success: boolean; revoked: boolean }>(functions, 'revokeOrderTrackingLink');
        await callable({ orderId });
      },
    );
  },

  async revokeLinkById(linkId: string): Promise<void> {
    await executeWithGcpFallback(
      'orderTrackingAdmin',
      () => callBetaTrackingApi('revokeById', { linkId }),
      async () => {
        const callable = httpsCallable<{ linkId: string }, { success: boolean; revoked: boolean }>(functions, 'revokeOrderTrackingLinkById');
        await callable({ linkId });
      },
    );
  },

  async deleteLink(linkId: string): Promise<void> {
    await executeWithGcpFallback(
      'orderTrackingAdmin',
      () => callBetaTrackingApi('delete', { linkId }),
      async () => {
        const callable = httpsCallable<{ linkId: string }, { success: boolean; deleted: boolean }>(functions, 'deleteOrderTrackingLink');
        await callable({ linkId });
      },
    );
  },

  async deleteLinksBatch(linkIds: string[]): Promise<{ success: boolean; deletedCount: number; failedIds: string[] }> {
    if (!linkIds || linkIds.length === 0) return { success: true, deletedCount: 0, failedIds: [] };

    const uniqueIds = [...new Set(linkIds)];
    const failedIds: string[] = [];
    let deletedCount = 0;
    const batchSize = 100;

    for (let offset = 0; offset < uniqueIds.length; offset += batchSize) {
      const chunk = uniqueIds.slice(offset, offset + batchSize);
      try {
        const resultData = await executeWithGcpFallback(
          'orderTrackingAdmin',
          () => callBetaTrackingApi<{ success: boolean; deletedCount: number }>('deleteBatch', { linkIds: chunk }),
          async () => (await httpsCallable<{ linkIds: string[] }, { success: boolean; deletedCount: number }>(functions, 'deleteOrderTrackingLinksBatch')({ linkIds: chunk })).data,
        );
        const removed = resultData.success && resultData.deletedCount === chunk.length;
        if (removed) deletedCount += resultData.deletedCount;
        else failedIds.push(...chunk);
      } catch (error: any) {
        if (error?.code === 'functions/not-found' || error?.code === 'not-found') {
          const results = await Promise.allSettled(chunk.map(id => this.deleteLink(id)));
          results.forEach((result, index) => {
            if (result.status === 'fulfilled') deletedCount += 1;
            else failedIds.push(chunk[index]);
          });
        } else {
          failedIds.push(...chunk);
        }
      }
    }

    return { success: failedIds.length === 0, deletedCount, failedIds };
  },

  async listLinks(cursor: string | null = null): Promise<{ links: OrderTrackingLinkRecord[]; nextCursor: string | null }> {
    return executeWithGcpFallback(
      'orderTrackingAdmin',
      () => callBetaTrackingApi<{ links: OrderTrackingLinkRecord[]; nextCursor: string | null }>('list', {
        cursor,
        pageSize: 50,
      }),
      async () => {
        const callable = httpsCallable<
          { cursor: string | null; pageSize: number },
          { links: OrderTrackingLinkRecord[]; nextCursor: string | null }
        >(functions, 'listOrderTrackingLinks');
        const result = await callable({ cursor, pageSize: 50 });
        return result.data;
      },
    );
  },

  async getLinkForOrder(orderId: string): Promise<OrderTrackingLinkRecord | null> {
    return executeWithGcpFallback(
      'orderTrackingAdmin',
      async () => {
        const result = await callBetaTrackingApi<{ link: OrderTrackingLinkRecord | null }>('list', { orderId });
        return result.link;
      },
      async () => {
        const callable = httpsCallable<{ orderId: string }, { link: OrderTrackingLinkRecord | null }>(
          functions,
          'listOrderTrackingLinks'
        );
        const result = await callable({ orderId });
        return result.data.link;
      },
    );
  },

  async getPublicStatus(token: string): Promise<PublicOrderTracking> {
    return executeWithGcpFallback(
      'publicOrderTracking',
      async () => {
        const response = await fetch(
          `/api/public-order-tracking?token=${encodeURIComponent(token)}`,
          { method: 'GET', cache: 'no-store' }
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status >= 500 && !payload?.error?.code) {
            throw new VercelInfraError(`Erro ao consultar acompanhamento (${response.status}).`, response.status);
          }
          const err = new Error(payload?.error?.message || 'Link de acompanhamento inválido ou desativado.');
          if (payload?.error?.code) Object.assign(err, { code: payload.error.code });
          if (payload?.error?.details !== undefined) Object.assign(err, { details: payload.error.details });
          Object.assign(err, { status: response.status });
          throw err;
        }
        return payload as PublicOrderTracking;
      },
      async () => {
        const callable = httpsCallable<{ token: string }, PublicOrderTracking>(functions, 'getPublicOrderTracking');
        const result = await callable({ token });
        return result.data;
      },
    );
  },
};

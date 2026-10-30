import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { App } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
import { deleteApp, getFirestore, initializeApp, initializeRestEmulator } from './helpers/backend-admin';
import {
  createOrderTrackingLink,
  getPublicOrderTracking,
  listOrderTrackingLinks,
  revokeOrderTrackingLinkById,
} from '../../functions/orders/tracking.js';

let adminApp: App;
let adminDb: Firestore;
const encryptionKey = Buffer.alloc(32, 7).toString('base64');
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const previousEncryptionKey = process.env.ORDER_TRACKING_ENCRYPTION_KEY;
const previousOriginSecret = process.env.ORIGIN_SECRET;
const ownerUid = `tracking-owner-${suffix}`;
const otherUid = `tracking-other-${suffix}`;
const adminUid = `tracking-admin-${suffix}`;
const staffUid = `tracking-staff-${suffix}`;
const orderId = `tracking-order-${suffix}`;
const assignedOrderId = `tracking-assigned-order-${suffix}`;
const createdLinkIds: string[] = [];

function request(uid: string, data: Record<string, unknown>, ip = '127.0.0.1') {
  return {
    auth: { uid, token: { auth_time: 1 } },
    data,
    rawRequest: { headers: { 'x-origin-secret': 'tracking-test-origin' }, ip },
  };
}

async function seed(path: string, data: Record<string, unknown>) {
  await adminDb.doc(path).set(data);
}

describe('Cloud Functions de links públicos de acompanhamento', () => {
  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('Execute via emulador local do Firestore (npm run test:integration).');
    }
    process.env.ORDER_TRACKING_ENCRYPTION_KEY = encryptionKey;
    process.env.ORIGIN_SECRET = 'tracking-test-origin';
    adminApp = initializeApp({ projectId: 'demo-luisices-review' });
    adminDb = initializeRestEmulator(adminApp);
    expect(getFirestore()).toBe(adminDb);
    await Promise.all([
      seed(`userProfiles/${ownerUid}`, {
        role: 'user', active: true, displayName: 'Dono',
        permissions: { orders: { view: true } },
      }),
      seed(`userProfiles/${otherUid}`, {
        role: 'user', active: true, permissions: { orders: { view: true } },
      }),
      seed(`userProfiles/${adminUid}`, { role: 'admin', active: true }),
      seed(`userProfiles/${staffUid}`, {
        role: 'funcionario', active: true, displayName: 'Funcionário atribuído',
        permissions: { orders: { view: true } },
      }),
      seed(`orders/${orderId}`, {
        userId: ownerUid, orderNumber: '#2026-TRACK', customerName: 'Cliente privado',
        customerPhone: '11999999999', productName: 'Produto visível', quantity: 2,
        price: 999, payment: { paidAmount: 500 }, status: 'pending', isArchived: false,
        deliveryDate: '2026-12-01', shippingStatus: 'postado',
        shippingTrackingNumber: 'BR123456789', createdAt: '2026-10-01T00:00:00.000Z',
      }),
      seed(`orders/${assignedOrderId}`, {
        userId: ownerUid, assignedTo: staffUid, orderNumber: '#2026-STAFF',
        status: 'in-progress', isArchived: false,
      }),
    ]);
  });

  afterAll(async () => {
    if (adminDb) {
      await Promise.all(createdLinkIds.map((id) => adminDb.doc(`orderTrackingLinks/${id}`).delete()));
      await Promise.all([
        adminDb.doc(`orders/${orderId}`).delete(),
        adminDb.doc(`userProfiles/${ownerUid}`).delete(),
        adminDb.doc(`userProfiles/${otherUid}`).delete(),
        adminDb.doc(`userProfiles/${adminUid}`).delete(),
        adminDb.doc(`userProfiles/${staffUid}`).delete(),
        adminDb.doc(`orders/${assignedOrderId}`).delete(),
      ]);
    }
    if (adminApp) await deleteApp(adminApp);
    if (previousEncryptionKey === undefined) delete process.env.ORDER_TRACKING_ENCRYPTION_KEY;
    else process.env.ORDER_TRACKING_ENCRYPTION_KEY = previousEncryptionKey;
    if (previousOriginSecret === undefined) delete process.env.ORIGIN_SECRET;
    else process.env.ORIGIN_SECRET = previousOriginSecret;
  });

  it('cria link criptografado uma única vez, limita a leitura ao escopo e expõe apenas a projeção pública', async () => {
    const created = await createOrderTrackingLink.run(request(ownerUid, { orderId, expirationDays: 7 }));
    createdLinkIds.push(created.linkId);
    expect(created.token).toMatch(/^[A-Za-z0-9_-]{40,50}$/);
    expect(created.linkId).toMatch(/^[A-Za-z0-9-]{36}$/);

    const order = (await adminDb.doc(`orders/${orderId}`).get()).data();
    const link = (await adminDb.doc(`orderTrackingLinks/${created.linkId}`).get()).data();
    expect(order).toMatchObject({
      publicTrackingLinkId: created.linkId,
      publicTrackingHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(link).toMatchObject({ orderId, createdByUid: ownerUid, revokedAt: null });
    expect(link?.tokenHash).toBe(order?.publicTrackingHash);
    expect(link?.tokenCiphertext).not.toContain(created.token);

    await expect(createOrderTrackingLink.run(request(ownerUid, { orderId })))
      .rejects.toMatchObject({ code: 'already-exists' });
    await expect(listOrderTrackingLinks.run(request(otherUid, { orderId })))
      .rejects.toMatchObject({ code: 'permission-denied' });

    const listed = await listOrderTrackingLinks.run(request(ownerUid, { orderId }));
    expect(listed.link).toMatchObject({ id: created.linkId, orderId, token: created.token });
    const adminListed = await listOrderTrackingLinks.run(request(adminUid, { orderId }));
    expect(adminListed.link).toMatchObject({ id: created.linkId, token: created.token });

    const publicView = await getPublicOrderTracking.run(request('anonymous', { token: created.token }));
    expect(publicView).toMatchObject({
      orderNumber: '#2026-TRACK', productName: 'Produto visível', quantity: 2,
      shippingStatus: 'postado', shippingTrackingNumber: 'BR123456789',
    });
    for (const privateField of ['customerName', 'customerPhone', 'price', 'payment', 'userId']) {
      expect(publicView).not.toHaveProperty(privateField);
    }
    await revokeOrderTrackingLinkById.run(request(ownerUid, { linkId: created.linkId }));
  });

  it('permite ao funcionário atribuído criar link dentro do escopo do pedido', async () => {
    const created = await createOrderTrackingLink.run(request(staffUid, {
      orderId: assignedOrderId, expirationDays: 30,
    }));
    createdLinkIds.push(created.linkId);
    expect((await adminDb.doc(`orders/${assignedOrderId}`).get()).data())
      .toMatchObject({ publicTrackingLinkId: created.linkId });
    expect((await adminDb.doc(`orderTrackingLinks/${created.linkId}`).get()).data())
      .toMatchObject({ createdByUid: staffUid, orderId: assignedOrderId });
  });

  it('nega revogação por outro usuário e invalida token e vínculo ao revogar pelo proprietário', async () => {
    const created = await createOrderTrackingLink.run(request(ownerUid, { orderId, expirationDays: 30 }));
    createdLinkIds.push(created.linkId);
    await expect(revokeOrderTrackingLinkById.run(request(otherUid, { linkId: created.linkId })))
      .rejects.toMatchObject({ code: 'permission-denied' });

    await expect(revokeOrderTrackingLinkById.run(request(ownerUid, { linkId: created.linkId })))
      .resolves.toMatchObject({ success: true, revoked: true });
    expect((await adminDb.doc(`orders/${orderId}`).get()).data())
      .not.toHaveProperty('publicTrackingHash');
    expect((await adminDb.doc(`orderTrackingLinks/${created.linkId}`).get()).data()?.revokedAt)
      .toBeTruthy();
    await expect(getPublicOrderTracking.run(request('anonymous', { token: created.token })))
      .rejects.toMatchObject({ code: 'not-found' });
  });

  it('não revela pedidos com link expirado', async () => {
    const crypto = await import('node:crypto');
    const expiredToken = crypto.randomBytes(32).toString('base64url');
    const expiredHash = crypto.createHash('sha256').update(expiredToken).digest('hex');
    const expiredOrderId = `${orderId}-expired`;
    await seed(`orders/${expiredOrderId}`, {
      userId: ownerUid, status: 'pending', isArchived: false,
      publicTrackingHash: expiredHash,
      publicTrackingExpiresAt: '2020-01-01T00:00:00.000Z',
    });
    await expect(getPublicOrderTracking.run(request('anonymous', { token: expiredToken })))
      .rejects.toMatchObject({ code: 'not-found' });
    await adminDb.doc(`orders/${expiredOrderId}`).delete();
  });
});

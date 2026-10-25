import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeApp, deleteApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { handleUpdateComplexOrder } from '../../functions/orders/index.js';

let adminApp: App;
let adminDb: Firestore;

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Execute via emulador local do Firestore (npm run test:integration).');
  }
  adminApp = initializeApp({ projectId: 'demo-luisices-review' }, `complex-order-function-${Date.now()}`);
  adminDb = getFirestore(adminApp);
});

afterAll(async () => {
  if (adminApp) await deleteApp(adminApp);
});

const newOrder = (id: string) => ({
  userId: 'complex-owner',
  orderNumber: '#2026-9000',
  customerName: 'Cliente de teste',
  customerPhone: '11999999999',
  productName: 'Pedido de teste',
  quantity: 1,
  price: 10,
  pricingMode: 'items',
  unitPrice: null,
  items: [{ name: 'Item inicial', quantity: 1, unitPrice: 10, price: 10 }],
  status: 'in-progress',
  deliveryDate: '2026-11-20',
  notes: null,
  tags: Array.from({ length: 20 }, (_, index) => ({ name: `Etiqueta ${index + 1}`, color: '#123456' })),
  payment: { status: 'paid', method: 'pix', totalAmount: 10, paidAmount: 10, remainingAmount: 0 },
  version: 1,
  isExchange: false,
  publicTrackingHash: `tracking-hash-${id}`,
  publicTrackingLinkId: `tracking-link-${id}`,
  publicTrackingExpiresAt: '2026-12-31T00:00:00.000Z',
  createdAt: '2026-10-25T00:00:00.000Z',
});

describe('Cloud Function: atualização segura de pedidos com muitos itens', () => {
  it.each(Array.from({ length: 10 }, (_, index) => index + 1))(
    'atualiza atomicamente pedido e salesLedger com %i item(ns)',
    async (itemCount) => {
      const id = `complex-order-${itemCount}-${Date.now()}`;
      const orderRef = adminDb.doc(`orders/${id}`);
      const saleRef = adminDb.doc(`salesLedger/${id}`);
      const profileRef = adminDb.doc('userProfiles/complex-owner');
      const initial = newOrder(id);
      await Promise.all([
        orderRef.set(initial),
        profileRef.set({ role: 'user', active: true, permissions: { orders: { edit: true } } }),
        saleRef.set({
          id, orderId: id, orderNumber: initial.orderNumber, userId: initial.userId,
          amount: initial.price, quantity: initial.quantity, isExchange: false,
          status: initial.status, paymentStatus: 'paid', paidAmount: initial.price,
          paymentMethod: 'pix', customerName: initial.customerName,
          productName: initial.productName, updatedAt: initial.createdAt,
        }),
      ]);

      const items = Array.from({ length: itemCount }, (_, index) => ({
        name: `Produto ${index + 1}`,
        quantity: index === 0 ? 2 : 1,
        unitPrice: 10,
        price: index === 0 ? 20 : 10,
      }));
      const quantity = itemCount + 1;
      const price = quantity * 10;
      await handleUpdateComplexOrder({
        auth: { uid: 'complex-owner', token: { auth_time: 1 } },
        data: {
          orderId: id,
          expectedVersion: 1,
          updates: {
            items,
            quantity,
            price,
            unitPrice: null,
            pricingMode: 'items',
            payment: { status: 'pending', method: 'pix', totalAmount: price, paidAmount: 0, remainingAmount: price },
          },
        },
      }, adminDb);

      const [savedOrder, savedSale] = await Promise.all([orderRef.get(), saleRef.get()]);
      expect(savedOrder.data()).toMatchObject({ quantity, price, version: 2, items });
      expect(savedOrder.data()?.publicTrackingLinkId).toBe(`tracking-link-${id}`);
      expect(savedOrder.data()?.tags).toHaveLength(20);
      expect(savedSale.data()).toMatchObject({ amount: price, quantity, paymentStatus: 'pending', paidAmount: 0 });
    },
  );

  it('rejeita total divergente, usuário sem permissão e versão desatualizada sem gravar alterações', async () => {
    const id = `complex-order-denial-${Date.now()}`;
    const orderRef = adminDb.doc(`orders/${id}`);
    const saleRef = adminDb.doc(`salesLedger/${id}`);
    const profileRef = adminDb.doc('userProfiles/complex-owner');
    const initial = newOrder(id);
    await Promise.all([
      orderRef.set(initial),
      profileRef.set({ role: 'user', active: true, permissions: { orders: { edit: true } } }),
      saleRef.set({ id, orderId: id, userId: initial.userId, amount: 10, quantity: 1, paymentStatus: 'paid', paidAmount: 10 }),
    ]);
    const updates = {
      items: Array.from({ length: 5 }, (_, index) => ({ name: `Produto ${index}`, quantity: 1, unitPrice: 10, price: 10 })),
      quantity: 5,
      price: 51,
      payment: { status: 'pending', method: 'pix', totalAmount: 51, paidAmount: 0, remainingAmount: 51 },
    };
    const call = (expectedVersion = 1) => handleUpdateComplexOrder({
      auth: { uid: 'complex-owner', token: { auth_time: 1 } },
      data: { orderId: id, expectedVersion, updates },
    }, adminDb);

    await expect(call()).rejects.toThrow(/quantidade e o total/);
    await profileRef.update({ permissions: { orders: { edit: false } } });
    await expect(call()).rejects.toThrow(/permissão/);
    await profileRef.update({ permissions: { orders: { edit: true } } });
    await expect(call(2)).rejects.toThrow(/alterado/);
    expect((await orderRef.get()).data()).toMatchObject({ price: 10, quantity: 1, version: 1 });
    expect((await saleRef.get()).data()).toMatchObject({ amount: 10, quantity: 1 });
  });

  it('preserva o histórico de pagamento e calcula o ajuste de redução no servidor', async () => {
    const id = `complex-order-payment-history-${Date.now()}`;
    const orderRef = adminDb.doc(`orders/${id}`);
    const initial = newOrder(id);
    await Promise.all([
      orderRef.set(initial),
      adminDb.doc('userProfiles/complex-owner').set({
        role: 'user', active: true, permissions: { orders: { edit: true } },
      }),
      adminDb.doc(`salesLedger/${id}`).set({
        id, orderId: id, userId: initial.userId, amount: initial.price, quantity: initial.quantity,
        paymentStatus: 'paid', paidAmount: initial.price,
      }),
    ]);

    await handleUpdateComplexOrder({
      auth: { uid: 'complex-owner', token: { auth_time: 1 } },
      data: {
        orderId: id,
        expectedVersion: 1,
        updates: {
          items: Array.from({ length: 5 }, (_, index) => ({
            name: `Produto ${index + 1}`, quantity: 1, unitPrice: 1, price: 1,
          })),
          quantity: 5,
          price: 5,
          payment: {
            status: 'paid', method: 'pix', totalAmount: 5, paidAmount: 5, remainingAmount: 0,
            history: [{ amount: 999, date: '2026-10-25T00:00:00.000Z', method: 'pix' }],
          },
        },
      },
    }, adminDb);

    const saved = (await orderRef.get()).data();
    expect(saved?.payment.history).toHaveLength(2);
    expect(saved?.payment.history[0]).toMatchObject({
      amount: 10, method: 'pix', notes: 'Pagamento inicial registrado',
    });
    expect(saved?.payment.history[1]).toMatchObject({ amount: -5, method: 'pix' });
    expect(saved?.payment.history[0].amount + saved?.payment.history[1].amount).toBe(5);
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeApp, deleteApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { handleCreateOrder } from '../../functions/orders/index.js';

let adminApp: App;
let adminDb: Firestore;

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Execute via emulador local do Firestore (npm run test:integration).');
  }
  adminApp = initializeApp({ projectId: 'demo-luisices-review' }, `create-order-function-${Date.now()}`);
  adminDb = getFirestore(adminApp);
});

afterAll(async () => {
  if (adminApp) await deleteApp(adminApp);
});

describe('Cloud Function: criação atômica de pedidos no backend (handleCreateOrder)', () => {
  it.each(Array.from({ length: 10 }, (_, index) => index + 1))(
    'cria atomicamente pedido, salesLedger e contador com %i item(ns)',
    async (itemCount) => {
      const uid = `create-owner-${itemCount}-${Date.now()}`;
      await adminDb.doc(`userProfiles/${uid}`).set({
        role: 'user',
        active: true,
        permissions: { orders: { create: true } },
      });

      const items = Array.from({ length: itemCount }, (_, index) => ({
        name: `Item ${index + 1}`,
        quantity: index === 0 ? 2 : 1,
        unitPrice: 15,
        price: index === 0 ? 30 : 15,
      }));
      const quantity = itemCount + 1;
      const price = quantity * 15;

      const orderData = {
        customerName: `Cliente Teste ${itemCount}`,
        customerPhone: '11988887777',
        productName: `Combo Festas ${itemCount}`,
        quantity,
        price,
        deliveryDate: '2026-12-01',
        items,
        payment: {
          status: 'paid',
          method: 'pix',
          totalAmount: price,
          paidAmount: price,
        },
      };

      const result = await handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: { orderData },
      }, adminDb);

      expect(result.success).toBe(true);
      expect(result.alreadyExisted).toBe(false);
      expect(result.orderId).toBeDefined();
      expect(result.orderNumber).toMatch(/^#\d{4}-\d{4}$/);

      // Validação do pedido gravado
      const orderSnap = await adminDb.doc(`orders/${result.orderId}`).get();
      expect(orderSnap.exists).toBe(true);
      const order = orderSnap.data();
      expect(order?.userId).toBe(uid);
      expect(order?.orderNumber).toBe(result.orderNumber);
      expect(order?.quantity).toBe(quantity);
      expect(order?.price).toBe(price);
      expect(order?.items).toHaveLength(itemCount);
      expect(order?.payment?.status).toBe('paid');
      expect(order?.payment?.paidAmount).toBe(price);
      expect(order?.payment?.history).toHaveLength(1);
      expect(order?.payment?.history[0]).toMatchObject({ amount: price, method: 'pix' });

      // Validação do espelho contábil (salesLedger)
      const saleSnap = await adminDb.doc(`salesLedger/${result.orderId}`).get();
      expect(saleSnap.exists).toBe(true);
      const sale = saleSnap.data();
      expect(sale?.orderId).toBe(result.orderId);
      expect(sale?.userId).toBe(uid);
      expect(sale?.amount).toBe(price);
      expect(sale?.quantity).toBe(quantity);
      expect(sale?.paymentStatus).toBe('paid');
      expect(sale?.paidAmount).toBe(price);

      // Validação do evento de auditoria na subcoleção
      const eventsSnap = await adminDb.doc(`orders/${result.orderId}`).collection('paymentEvents').get();
      expect(eventsSnap.docs).toHaveLength(1);
      expect(eventsSnap.docs[0].data()).toMatchObject({
        type: 'payment',
        amount: price,
        method: 'pix',
        actorUid: uid,
        source: 'createOrder',
      });

      // Validação do contador incrementado
      const counterSnap = await adminDb.doc(`users/${uid}/metadata/counters`).get();
      expect(counterSnap.data()?.orderCounter).toBe(1);
    }
  );

  it('garante idempotência reutilizando o mesmo identificador sem duplicar vendas ou contadores', async () => {
    const uid = `idempotent-user-${Date.now()}`;
    const idempotencyKey = `idem-order-${Date.now()}`;
    await adminDb.doc(`userProfiles/${uid}`).set({
      role: 'user',
      active: true,
      permissions: { orders: { create: true } },
    });

    const orderData = {
      customerName: 'Cliente Idempotente',
      productName: 'Topo de Bolo',
      quantity: 1,
      price: 50,
      deliveryDate: '2026-11-20',
      payment: { paidAmount: 0 },
    };

    const firstCall = await handleCreateOrder({
      auth: { uid, token: { auth_time: 1 } },
      data: { orderData, idempotencyKey },
    }, adminDb);

    expect(firstCall.success).toBe(true);
    expect(firstCall.alreadyExisted).toBe(false);
    expect(firstCall.orderId).toBe(idempotencyKey);

    // Segunda chamada simulando retry de rede
    const secondCall = await handleCreateOrder({
      auth: { uid, token: { auth_time: 1 } },
      data: { orderData, idempotencyKey },
    }, adminDb);

    expect(secondCall.success).toBe(true);
    expect(secondCall.alreadyExisted).toBe(true);
    expect(secondCall.orderId).toBe(idempotencyKey);
    expect(secondCall.orderNumber).toBe(firstCall.orderNumber);

    // O contador de pedidos permaneceu em 1
    const counterSnap = await adminDb.doc(`users/${uid}/metadata/counters`).get();
    expect(counterSnap.data()?.orderCounter).toBe(1);
  });

  it('atualiza atomicamente as estatísticas do cliente na mesma transação', async () => {
    const uid = `customer-stats-user-${Date.now()}`;
    const customerId = `cust-${Date.now()}`;
    await Promise.all([
      adminDb.doc(`userProfiles/${uid}`).set({
        role: 'user',
        active: true,
        permissions: { orders: { create: true } },
      }),
      adminDb.doc(`customers/${customerId}`).set({
        userId: uid,
        name: 'Cliente Vip',
        totalOrders: 2,
        totalSpent: 100,
      }),
    ]);

    const orderData = {
      customerName: 'Cliente Vip',
      productName: 'Caixa Convite',
      quantity: 1,
      price: 75.50,
      deliveryDate: '2026-11-25',
      customerId,
      payment: { paidAmount: 75.50, method: 'cash' },
    };

    const result = await handleCreateOrder({
      auth: { uid, token: { auth_time: 1 } },
      data: { orderData },
    }, adminDb);

    expect(result.success).toBe(true);

    const customerSnap = await adminDb.doc(`customers/${customerId}`).get();
    const customer = customerSnap.data();
    expect(customer?.totalOrders).toBe(3);
    expect(customer?.totalSpent).toBe(175.50);
  });

  it('converte orçamento de forma idempotente e atômica', async () => {
    const uid = `quote-user-${Date.now()}`;
    const quoteId = `quote-${Date.now()}`;
    await Promise.all([
      adminDb.doc(`userProfiles/${uid}`).set({
        role: 'user',
        active: true,
        permissions: { orders: { create: true } },
      }),
      adminDb.doc(`quotes/${quoteId}`).set({
        userId: uid,
        status: 'sent',
        totalPrice: 120,
        validUntil: '2026-12-31',
      }),
    ]);

    const orderData = {
      customerName: 'Cliente Orçamento',
      productName: 'Convite Especial',
      quantity: 1,
      price: 120,
      deliveryDate: '2026-12-10',
    };

    const result = await handleCreateOrder({
      auth: { uid, token: { auth_time: 1 } },
      data: { orderData, quoteId },
    }, adminDb);

    expect(result.success).toBe(true);

    const quoteSnap = await adminDb.doc(`quotes/${quoteId}`).get();
    const quote = quoteSnap.data();
    expect(quote?.status).toBe('approved');
    expect(quote?.convertedOrderId).toBe(result.orderId);
    expect(quote?.orderNumber).toBe(result.orderNumber);

    // Tentativa repetida retorna o ID existente
    const repeatResult = await handleCreateOrder({
      auth: { uid, token: { auth_time: 1 } },
      data: { orderData, quoteId },
    }, adminDb);

    expect(repeatResult.success).toBe(true);
    expect(repeatResult.orderId).toBe(result.orderId);
    expect(repeatResult.alreadyExisted).toBe(true);
  });

  it('rejeita criação sem autenticação, com perfil inativo ou sem permissão', async () => {
    const inactiveUid = `inactive-${Date.now()}`;
    const noPermUid = `no-perm-${Date.now()}`;

    await Promise.all([
      adminDb.doc(`userProfiles/${inactiveUid}`).set({
        role: 'user',
        active: false,
        permissions: { orders: { create: true } },
      }),
      adminDb.doc(`userProfiles/${noPermUid}`).set({
        role: 'user',
        active: true,
        permissions: { orders: { create: false } },
      }),
    ]);

    const orderData = {
      customerName: 'Qualquer',
      productName: 'Qualquer',
      quantity: 1,
      price: 10,
      deliveryDate: '2026-11-20',
    };

    // Sem auth
    await expect(handleCreateOrder({ auth: null as any, data: { orderData } }, adminDb))
      .rejects.toThrow('Entre na sua conta para criar pedidos.');

    // Perfil inativo
    await expect(handleCreateOrder({ auth: { uid: inactiveUid, token: { auth_time: 1 } }, data: { orderData } }, adminDb))
      .rejects.toThrow('Conta inativa.');

    // Sem permissão de criação
    await expect(handleCreateOrder({ auth: { uid: noPermUid, token: { auth_time: 1 } }, data: { orderData } }, adminDb))
      .rejects.toThrow('Você não tem permissão para criar pedidos.');
  });
});

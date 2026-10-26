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
  describe('regressão: recibo durável e identidade independente do estado atual', () => {
    async function setup(suffix: string) {
      const uid = `receipt-owner-${suffix}-${Date.now()}`;
      const id = `receipt-order-${suffix}-${Date.now()}`;
      await adminDb.doc(`userProfiles/${uid}`).set({ role: 'user', active: true, permissions: { orders: { edit: true } } });
      await adminDb.doc(`orders/${id}`).set({ ...newOrder(id), userId: uid });
      const command = (operationId: string, expectedVersion: number, updates: any) => ({
        auth: { uid, token: { auth_time: 1 } }, data: { orderId: id, operationId, expectedVersion, updates },
      });
      return { uid, id, command };
    }

    it('lê recibo sem customerId e confirma operação antiga após uma edição posterior', async () => {
      const { id, command } = await setup('after-edit');
      const first = command('first', 1, {
        price: 5, items: [{ name: 'Item inicial', quantity: 1, unitPrice: 5, price: 5 }],
      });
      await handleUpdateComplexOrder(first, adminDb);
      const eventsBefore = await adminDb.doc(`orders/${id}`).collection('paymentEvents').get();
      await handleUpdateComplexOrder(command('second', 2, { notes: 'Edição posterior' }), adminDb);
      expect(await handleUpdateComplexOrder(first, adminDb)).toMatchObject({ alreadyApplied: true, version: 2 });
      expect((await adminDb.doc(`orders/${id}`).get()).data()).toMatchObject({ version: 3, notes: 'Edição posterior', price: 5 });
      expect((await adminDb.doc(`orders/${id}`).collection('paymentEvents').get()).size).toBe(eventsBefore.size);
    });

    it('conversão em permuta pode ser repetida com o mesmo comando original', async () => {
      const { command } = await setup('exchange');
      const request = command('exchange', 1, { isExchange: true, price: 0,
        items: [{ name: 'Item inicial', quantity: 1, unitPrice: 0, price: 0 }] });
      await handleUpdateComplexOrder(request, adminDb);
      expect(await handleUpdateComplexOrder(request, adminDb)).toMatchObject({ alreadyApplied: true, version: 2 });
    });

    it('duas chamadas concorrentes da mesma edição aplicam versão e eventos uma única vez', async () => {
      const { id, command } = await setup('concurrent');
      const request = command('concurrent', 1, { price: 20,
        items: [{ name: 'Item inicial', quantity: 1, unitPrice: 20, price: 20 }] });
      const results = await Promise.all([handleUpdateComplexOrder(request, adminDb), handleUpdateComplexOrder(request, adminDb)]);
      expect(results.filter((result) => result.alreadyApplied)).toHaveLength(1);
      expect((await adminDb.doc(`orders/${id}`).get()).data()?.version).toBe(2);
      expect((await adminDb.doc(`orders/${id}`).collection('operationReceipts').get()).size).toBe(1);
    });

    it('lê cliente e recibo em posições fixas e não duplica estatísticas em replay', async () => {
      const { uid, id, command } = await setup('customer');
      const customerId = `customer-${id}`;
      await adminDb.doc(`customers/${customerId}`).set({ userId: uid, name: 'Cliente', totalOrders: 0, totalSpent: 0 });
      const request = command('with-customer', 1, { customerId });
      await handleUpdateComplexOrder(request, adminDb);
      expect(await handleUpdateComplexOrder(request, adminDb)).toMatchObject({ alreadyApplied: true });
      expect((await adminDb.doc(`customers/${customerId}`).get()).data()).toMatchObject({ totalOrders: 1, totalSpent: 10 });
      expect((await adminDb.doc(`orders/${id}`).get()).data()?.version).toBe(2);
    });

    it('não permite que outro administrador reutilize o recibo de outro usuário', async () => {
      const { id, command } = await setup('admin-replay');
      const request = command('owner-operation', 1, { notes: 'Alteração original' });
      await handleUpdateComplexOrder(request, adminDb);
      const adminUid = `another-admin-${id}`;
      await adminDb.doc(`userProfiles/${adminUid}`).set({ role: 'admin', active: true });
      await expect(handleUpdateComplexOrder({ ...request, auth: { uid: adminUid, token: { auth_time: 1 } } }, adminDb))
        .rejects.toMatchObject({ code: 'permission-denied' });
    });

    it('informa que uma operação sem recibo e com versão antiga não foi aplicada', async () => {
      const { command } = await setup('stale-version');
      await expect(handleUpdateComplexOrder(command('stale', 2, { notes: 'Não aplicar' }), adminDb))
        .rejects.toMatchObject({ code: 'failed-precondition', details: { operationState: 'not-applied' } });
    });
  });
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
          operationId: `items-${itemCount}`,
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

  it('rejeita payloads de pagamento inválidos e não altera pedido nem ledger', async () => {
    const id = `complex-order-invalid-payment-${Date.now()}`;
    const orderRef = adminDb.doc(`orders/${id}`);
    const initial = newOrder(id);
    await Promise.all([
      orderRef.set(initial),
      adminDb.doc('userProfiles/complex-owner').set({
        role: 'user', active: true, permissions: { orders: { edit: true } },
      }),
      adminDb.doc(`salesLedger/${id}`).set({
        id, orderId: id, userId: initial.userId, amount: 10, quantity: 1,
        paymentStatus: 'paid', paidAmount: 10,
      }),
    ]);

    const invoke = (payment: Record<string, unknown>) => handleUpdateComplexOrder({
      auth: { uid: 'complex-owner', token: { auth_time: 1 } },
      data: { orderId: id, expectedVersion: 1, updates: { payment } },
    }, adminDb);
    await expect(invoke({ paidAmount: -1 })).rejects.toThrow(/Valor pago inválido/);
    await expect(invoke({ paidAmount: 11 })).rejects.toThrow(/não pode exceder o total/);
    await expect(invoke({ paidAmount: 5, method: 'crypto' })).rejects.toThrow(/Forma de pagamento inválida/);
    await expect(invoke({ paidAmount: 5, adminOverride: true })).rejects.toThrow(/campos não permitidos/);

    expect((await orderRef.get()).data()).toMatchObject({ version: 1, price: 10, payment: initial.payment });
    expect((await adminDb.doc(`salesLedger/${id}`).get()).data()).toMatchObject({ amount: 10, paidAmount: 10 });
    expect((await orderRef.collection('paymentEvents').get()).size).toBe(0);
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
    const events = await orderRef.collection('paymentEvents').get();
    expect(events.docs).toHaveLength(1);
    expect(events.docs[0].data()).toMatchObject({
      type: 'adjustment', amount: -5, method: 'pix', actorUid: 'complex-owner',
      source: 'updateComplexOrder',
    });
  });

  it('registra entrada positiva no histórico e na subcoleção de auditoria', async () => {
    const id = `complex-order-payment-add-${Date.now()}`;
    const orderRef = adminDb.doc(`orders/${id}`);
    const initial = {
      ...newOrder(id),
      payment: { status: 'partial', method: 'pix', totalAmount: 10, paidAmount: 4, remainingAmount: 6 },
    };
    await Promise.all([
      orderRef.set(initial),
      adminDb.doc('userProfiles/complex-owner').set({
        role: 'user', active: true, permissions: { orders: { edit: true } },
      }),
      adminDb.doc(`salesLedger/${id}`).set({
        id, orderId: id, userId: initial.userId, amount: 10, quantity: 1,
        paymentStatus: 'partial', paidAmount: 4, paymentMethod: 'pix',
      }),
    ]);

    await handleUpdateComplexOrder({
      auth: { uid: 'complex-owner', token: { auth_time: 1 } },
      data: {
        orderId: id,
        expectedVersion: 1,
        updates: { payment: { paidAmount: 7, method: 'cash' } },
      },
    }, adminDb);

    const saved = (await orderRef.get()).data();
    expect(saved?.payment).toMatchObject({ paidAmount: 7, remainingAmount: 3, status: 'partial', method: 'cash' });
    expect(saved?.payment.history[saved.payment.history.length - 1]).toMatchObject({ amount: 3, method: 'cash' });
    const events = await orderRef.collection('paymentEvents').get();
    expect(events.docs).toHaveLength(1);
    expect(events.docs[0].data()).toMatchObject({ type: 'payment', amount: 3, method: 'cash', actorUid: 'complex-owner' });
  });

  it('consolida histórico excedente agrupando por método sem perder valores para relatórios', async () => {
    const id = `complex-order-overflow-${Date.now()}`;
    const orderRef = adminDb.doc(`orders/${id}`);
    const existingHistory = Array.from({ length: 55 }, (_, i) => ({
      amount: 1,
      date: '2026-01-01T00:00:00.000Z',
      method: 'pix',
      notes: `Parcela ${i + 1}`,
    }));
    const initial = {
      ...newOrder(id),
      price: 100,
      payment: {
        status: 'partial',
        method: 'pix',
        totalAmount: 100,
        paidAmount: 55,
        remainingAmount: 45,
        history: existingHistory,
      },
    };
    await Promise.all([
      orderRef.set(initial),
      adminDb.doc('userProfiles/complex-owner').set({
        role: 'user', active: true, permissions: { orders: { edit: true } },
      }),
      adminDb.doc(`salesLedger/${id}`).set({
        id, orderId: id, userId: initial.userId, amount: 100, quantity: 1,
        paymentStatus: 'partial', paidAmount: 55, paymentMethod: 'pix',
      }),
    ]);

    await handleUpdateComplexOrder({
      auth: { uid: 'complex-owner', token: { auth_time: 1 } },
      data: {
        orderId: id,
        expectedVersion: 1,
        updates: { payment: { paidAmount: 60, method: 'cash' } },
      },
    }, adminDb);

    const saved = (await orderRef.get()).data();
    expect(saved?.payment.paidAmount).toBe(60);
    expect(saved?.payment.history.length).toBeLessThanOrEqual(50);
    // O histórico consolidado soma exatamente os R$ 60 pagos e preserva a contagem de transações
    const sum = saved?.payment.history.reduce((s: number, h: any) => s + (h.amount || 0), 0);
    expect(sum).toBe(60);
    const consolidatedEntry = saved?.payment.history.find((h: any) => h.notes?.includes('Consolidação'));
    expect(consolidatedEntry).toBeDefined();
    expect(consolidatedEntry.count).toBeGreaterThan(1);
    // A subcoleção contém a trilha de auditoria completa
    const events = await orderRef.collection('paymentEvents').get();
    expect(events.docs).toHaveLength(1);
    expect(events.docs[0].data()).toMatchObject({ type: 'payment', amount: 5, method: 'cash' });
  });

  it('não conta ajustes negativos como transações de pagamento na consolidação do histórico', async () => {
    const id = `complex-order-overflow-negative-${Date.now()}`;
    const orderRef = adminDb.doc(`orders/${id}`);
    // 9 pagamentos positivos de R$ 5 e 3 reduções negativas de -R$ 2 nas primeiras 12 posições (overflow)
    // seguidos por 44 parcelas recentes de R$ 1 cada
    const overflowList = [
      ...Array.from({ length: 9 }, (_, i) => ({
        amount: 5,
        date: '2026-01-01T00:00:00.000Z',
        method: 'pix',
        notes: `Pagamento overflow ${i + 1}`,
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        amount: -2,
        date: '2026-01-02T00:00:00.000Z',
        method: 'pix',
        notes: `Estorno overflow ${i + 1}`,
      })),
    ];
    const recentList = Array.from({ length: 44 }, (_, i) => ({
      amount: 1,
      date: '2026-01-03T00:00:00.000Z',
      method: 'pix',
      notes: `Parcela recente ${i + 1}`,
    }));
    // Total inicial = (9 * 5 - 3 * 2) + (44 * 1) = 39 + 44 = 83
    const existingHistory = [...overflowList, ...recentList];
    const initial = {
      ...newOrder(id),
      price: 150,
      payment: {
        status: 'partial',
        method: 'pix',
        totalAmount: 150,
        paidAmount: 83,
        remainingAmount: 67,
        history: existingHistory,
      },
    };
    await Promise.all([
      orderRef.set(initial),
      adminDb.doc('userProfiles/complex-owner').set({
        role: 'user', active: true, permissions: { orders: { edit: true } },
      }),
      adminDb.doc(`salesLedger/${id}`).set({
        id, orderId: id, userId: initial.userId, amount: 150, quantity: 1,
        paymentStatus: 'partial', paidAmount: 83, paymentMethod: 'pix',
      }),
    ]);

    await handleUpdateComplexOrder({
      auth: { uid: 'complex-owner', token: { auth_time: 1 } },
      data: {
        orderId: id,
        expectedVersion: 1,
        updates: { payment: { paidAmount: 90, method: 'pix' } },
      },
    }, adminDb);

    const saved = (await orderRef.get()).data();
    expect(saved?.payment.paidAmount).toBe(90);
    expect(saved?.payment.history.length).toBeLessThanOrEqual(50);
    // A soma consolidada de todo o histórico deve somar exatamente R$ 90
    const sum = saved?.payment.history.reduce((s: number, h: any) => s + (h.amount || 0), 0);
    expect(sum).toBe(90);
    const consolidatedEntry = saved?.payment.history.find((h: any) => h.notes?.includes('Consolidação'));
    expect(consolidatedEntry).toBeDefined();
    // O valor consolidado das 12 primeiras entradas é 9 * 5 - 3 * 2 = R$ 39
    expect(consolidatedEntry.amount).toBe(39);
    // A contagem deve ser estritamente 9 (apenas pagamentos positivos), e NÃO 12
    expect(consolidatedEntry.count).toBe(9);
  });

  it('preserva a contagem de transações mesmo quando todos os pagamentos antigos de um método foram estornados (saldo consolidado zero)', async () => {
    const id = `complex-order-overflow-zero-balance-${Date.now()}`;
    const orderRef = adminDb.doc(`orders/${id}`);
    // 10 pagamentos de R$ 5 via cash e 1 estorno total de -R$ 50 via cash nas primeiras 11 posições (overflow)
    // saldo financeiro do cash no overflow = 10 * 5 - 50 = 0
    const overflowCash = [
      ...Array.from({ length: 10 }, (_, i) => ({
        amount: 5,
        date: '2026-01-01T00:00:00.000Z',
        method: 'cash',
        notes: `Pagamento cash ${i + 1}`,
      })),
      {
        amount: -50,
        date: '2026-01-02T00:00:00.000Z',
        method: 'cash',
        notes: 'Estorno total do valor pago em dinheiro',
      },
    ];
    // 45 parcelas recentes de R$ 1 via pix
    const recentPix = Array.from({ length: 45 }, (_, i) => ({
      amount: 1,
      date: '2026-01-03T00:00:00.000Z',
      method: 'pix',
      notes: `Parcela pix ${i + 1}`,
    }));
    // Total pago inicial = 0 (cash) + 45 (pix) = 45
    const existingHistory = [...overflowCash, ...recentPix];
    const initial = {
      ...newOrder(id),
      price: 100,
      payment: {
        status: 'partial',
        method: 'pix',
        totalAmount: 100,
        paidAmount: 45,
        remainingAmount: 55,
        history: existingHistory,
      },
    };
    await Promise.all([
      orderRef.set(initial),
      adminDb.doc('userProfiles/complex-owner').set({
        role: 'user', active: true, permissions: { orders: { edit: true } },
      }),
      adminDb.doc(`salesLedger/${id}`).set({
        id, orderId: id, userId: initial.userId, amount: 100, quantity: 1,
        paymentStatus: 'partial', paidAmount: 45, paymentMethod: 'pix',
      }),
    ]);

    await handleUpdateComplexOrder({
      auth: { uid: 'complex-owner', token: { auth_time: 1 } },
      data: {
        orderId: id,
        expectedVersion: 1,
        updates: { payment: { paidAmount: 50, method: 'pix' } },
      },
    }, adminDb);

    const saved = (await orderRef.get()).data();
    expect(saved?.payment.paidAmount).toBe(50);
    expect(saved?.payment.history.length).toBeLessThanOrEqual(50);
    // A soma financeira total deve ser exatamente R$ 50
    const sum = saved?.payment.history.reduce((s: number, h: any) => s + (h.amount || 0), 0);
    expect(sum).toBe(50);
    // A entrada consolidada de cash deve existir com saldo 0 e contagem preservada de 10
    const consolidatedCash = saved?.payment.history.find((h: any) => h.method === 'cash' && h.notes?.includes('Consolidação'));
    expect(consolidatedCash).toBeDefined();
    expect(consolidatedCash.amount).toBe(0);
    expect(consolidatedCash.count).toBe(10);
  });

  it('preserva a contagem em recompactações subsequentes mesmo com amount 0', async () => {
    const id = `complex-order-recompact-zero-${Date.now()}`;
    const orderRef = adminDb.doc(`orders/${id}`);
    // O pedido já possui um resumo consolidado anterior com amount 0 e count 10 (cash)
    // mais 50 parcelas de R$ 1 cada (total 51 entradas > maxRecent)
    const existingHistory = [
      {
        amount: 0,
        count: 10,
        date: '2026-01-01T00:00:00.000Z',
        method: 'cash',
        notes: 'Consolidação de pagamentos anteriores (cash)',
      },
      ...Array.from({ length: 50 }, (_, i) => ({
        amount: 1,
        date: '2026-01-02T00:00:00.000Z',
        method: 'pix',
        notes: `Parcela pix ${i + 1}`,
      })),
    ];
    const initial = {
      ...newOrder(id),
      price: 100,
      payment: {
        status: 'partial',
        method: 'pix',
        totalAmount: 100,
        paidAmount: 50,
        remainingAmount: 50,
        history: existingHistory,
      },
    };
    await Promise.all([
      orderRef.set(initial),
      adminDb.doc('userProfiles/complex-owner').set({
        role: 'user', active: true, permissions: { orders: { edit: true } },
      }),
      adminDb.doc(`salesLedger/${id}`).set({
        id, orderId: id, userId: initial.userId, amount: 100, quantity: 1,
        paymentStatus: 'partial', paidAmount: 50, paymentMethod: 'pix',
      }),
    ]);

    // Nova atualização gerando novo evento de pagamento, forçando nova compactação onde o resumo anterior volta a cair no overflow
    await handleUpdateComplexOrder({
      auth: { uid: 'complex-owner', token: { auth_time: 1 } },
      data: {
        orderId: id,
        expectedVersion: 1,
        updates: { payment: { paidAmount: 55, method: 'pix' } },
      },
    }, adminDb);

    const saved = (await orderRef.get()).data();
    expect(saved?.payment.paidAmount).toBe(55);
    expect(saved?.payment.history.length).toBeLessThanOrEqual(50);
    // A soma financeira total deve ser exatamente R$ 55
    const sum = saved?.payment.history.reduce((s: number, h: any) => s + (h.amount || 0), 0);
    expect(sum).toBe(55);
    // O resumo consolidado de cash deve permanecer com amount 0 e count 10
    const recompactedCash = saved?.payment.history.find((h: any) => h.method === 'cash' && h.notes?.includes('Consolidação'));
    expect(recompactedCash).toBeDefined();
    expect(recompactedCash.amount).toBe(0);
    expect(recompactedCash.count).toBe(10);

    // As entradas de Pix mantêm seus valores e contagens
    const pixEntries = saved?.payment.history.filter((h: any) => h.method === 'pix');
    const pixTotalAmount = pixEntries.reduce((s: number, h: any) => s + (h.amount || 0), 0);
    expect(pixTotalAmount).toBe(55);
    const pixTotalCount = pixEntries.reduce((s: number, h: any) => s + (typeof h.count === 'number' && h.count > 0 ? h.count : 1), 0);
    expect(pixTotalCount).toBe(51); // 50 parcelas originais + 1 novo pagamento de R$ 5
  });

  it('atualiza pagamento de pedido legado e estatísticas da permuta na mesma transação', async () => {
    const id = `legacy-payment-update-${Date.now()}`;
    const customerId = `customer-${id}`;
    const orderRef = adminDb.doc(`orders/${id}`);
    const customerRef = adminDb.doc(`customers/${customerId}`);
    const initial = { ...newOrder(id), items: null, pricingMode: 'total', customerId };
    await Promise.all([
      orderRef.set(initial),
      customerRef.set({ userId: initial.userId, totalOrders: 3, totalSpent: 30 }),
      adminDb.doc('userProfiles/complex-owner').set({
        role: 'user', active: true, permissions: { orders: { edit: true } },
      }),
      adminDb.doc(`salesLedger/${id}`).set({
        id, orderId: id, userId: initial.userId, amount: 10, quantity: 1,
        paymentStatus: 'paid', paidAmount: 10,
      }),
    ]);

    const request = {
      auth: { uid: 'complex-owner', token: { auth_time: 1 } },
      data: {
        orderId: id,
        expectedVersion: 1,
        updates: {
          price: 15,
          isExchange: true,
        },
      },
    };
    await handleUpdateComplexOrder(request, adminDb);
    const [savedOrder, savedCustomer, savedSale] = await Promise.all([
      orderRef.get(), customerRef.get(), adminDb.doc(`salesLedger/${id}`).get(),
    ]);
    expect(savedOrder.data()?.payment).toMatchObject({
      status: 'paid', totalAmount: 0, paidAmount: 0, remainingAmount: 0,
    });
    expect(savedOrder.data()?.payment.history).toHaveLength(2);
    expect(savedOrder.data()?.payment.history[0].amount + savedOrder.data()?.payment.history[1].amount).toBe(0);
    expect(savedOrder.data()?.price).toBe(15);
    expect(savedCustomer.data()).toMatchObject({ totalOrders: 2, totalSpent: 20 });
    expect(savedSale.data()).toMatchObject({ paymentStatus: 'paid', paidAmount: 0, isExchange: true });

    await expect(handleUpdateComplexOrder(request, adminDb)).rejects.toThrow(/alterado/);
    expect((await customerRef.get()).data()).toMatchObject({ totalOrders: 2, totalSpent: 20 });

    await handleUpdateComplexOrder({
      ...request,
      data: { ...request.data, expectedVersion: 2, updates: { isExchange: false } },
    }, adminDb);
    expect((await customerRef.get()).data()).toMatchObject({ totalOrders: 3, totalSpent: 35 });
  });

  it('reconcilia estatísticas ao editar o preço e trocar o cliente do pedido', async () => {
    const id = `customer-reassignment-${Date.now()}`;
    const oldCustomerId = `old-customer-${id}`;
    const newCustomerId = `new-customer-${id}`;
    const orderRef = adminDb.doc(`orders/${id}`);
    const oldCustomerRef = adminDb.doc(`customers/${oldCustomerId}`);
    const newCustomerRef = adminDb.doc(`customers/${newCustomerId}`);
    const initial = { ...newOrder(id), items: null, pricingMode: 'total', customerId: oldCustomerId };
    await Promise.all([
      orderRef.set(initial),
      oldCustomerRef.set({ userId: initial.userId, totalOrders: 2, totalSpent: 25 }),
      newCustomerRef.set({ userId: initial.userId, totalOrders: 1, totalSpent: 5 }),
      adminDb.doc('userProfiles/complex-owner').set({
        role: 'user', active: true, permissions: { orders: { edit: true } },
      }),
      adminDb.doc(`salesLedger/${id}`).set({
        id, orderId: id, userId: initial.userId, customerId: oldCustomerId,
        amount: 10, quantity: 1, paymentStatus: 'paid', paidAmount: 10,
      }),
    ]);

    await handleUpdateComplexOrder({
      auth: { uid: 'complex-owner', token: { auth_time: 1 } },
      data: {
        orderId: id,
        expectedVersion: 1,
        updates: { price: 15, customerId: newCustomerId },
      },
    }, adminDb);

    expect((await oldCustomerRef.get()).data()).toMatchObject({ totalOrders: 1, totalSpent: 15 });
    expect((await newCustomerRef.get()).data()).toMatchObject({ totalOrders: 2, totalSpent: 20 });
    expect((await orderRef.get()).data()).toMatchObject({ price: 15, customerId: newCustomerId });
    expect((await adminDb.doc(`salesLedger/${id}`).get()).data()).toMatchObject({
      amount: 15, customerId: newCustomerId,
    });
  });

  describe('operationId e Idempotência em updateComplexOrder', () => {
    it('persiste lastOperationId e responde já aplicado de forma idempotente em caso de repetição', async () => {
      const id = `op-id-test-${Date.now()}`;
      const orderRef = adminDb.doc(`orders/${id}`);
      const saleRef = adminDb.doc(`salesLedger/${id}`);
      const initial = newOrder(id);
      await Promise.all([
        orderRef.set(initial),
        saleRef.set({
          id, orderId: id, orderNumber: initial.orderNumber, userId: initial.userId,
          amount: initial.price, quantity: initial.quantity, isExchange: false,
          status: initial.status, paymentStatus: 'paid', paidAmount: initial.price,
          paymentMethod: 'pix', customerName: initial.customerName,
          productName: initial.productName, updatedAt: initial.createdAt,
        }),
      ]);

      const opId = `op-token-${Date.now()}`;
      const payload = {
        auth: { uid: 'complex-owner', token: { auth_time: 1 } },
        data: {
          orderId: id,
          expectedVersion: 1,
          operationId: opId,
          updates: {
            price: 25,
            items: [{ name: 'Item inicial', quantity: 1, unitPrice: 25, price: 25 }],
            payment: { status: 'pending', method: 'pix', totalAmount: 25, paidAmount: 0, remainingAmount: 25 },
          },
        },
      };

      // 1ª Execução: aplica a atualização
      const result1 = await handleUpdateComplexOrder(payload, adminDb);
      expect(result1.success).toBe(true);

      const orderSnap1 = await orderRef.get();
      expect(orderSnap1.data()?.version).toBe(2);
      expect(orderSnap1.data()?.price).toBe(25);
      expect(orderSnap1.data()?.lastOperationId).toBe(opId);

      // 2ª Execução com a mesma operationId (ex: timeout de rede no cliente e repetição com expectedVersion 1)
      const result2 = await handleUpdateComplexOrder(payload, adminDb);
      expect(result2.success).toBe(true);
      expect(result2.alreadyApplied).toBe(true);

      // Não duplicou incremento de versão
      const orderSnap2 = await orderRef.get();
      expect(orderSnap2.data()?.version).toBe(2);
      expect(orderSnap2.data()?.price).toBe(25);

      // O recibo durável foi persistido na subcoleção operationReceipts
      const receiptSnap = await adminDb.doc(`orders/${id}/operationReceipts/${opId}`).get();
      expect(receiptSnap.exists).toBe(true);
      expect(receiptSnap.data()?.version).toBe(2);
      expect(receiptSnap.data()?.userId).toBe('complex-owner');
    });

    it('rejeita com conflito explícito quando o mesmo operationId é reutilizado com alterações diferentes', async () => {
      const id = `op-id-conflict-${Date.now()}`;
      const orderRef = adminDb.doc(`orders/${id}`);
      const saleRef = adminDb.doc(`salesLedger/${id}`);
      const initial = newOrder(id);
      await Promise.all([
        orderRef.set(initial),
        saleRef.set({
          id, orderId: id, orderNumber: initial.orderNumber, userId: initial.userId,
          amount: initial.price, quantity: initial.quantity, isExchange: false,
          status: initial.status, paymentStatus: 'paid', paidAmount: initial.price,
          paymentMethod: 'pix', customerName: initial.customerName,
          productName: initial.productName, updatedAt: initial.createdAt,
        }),
      ]);

      const opId = `op-conflict-token-${Date.now()}`;
      const payload1 = {
        auth: { uid: 'complex-owner', token: { auth_time: 1 } },
        data: {
          orderId: id,
          expectedVersion: 1,
          operationId: opId,
          updates: {
            price: 25,
            items: [{ name: 'Item inicial', quantity: 1, unitPrice: 25, price: 25 }],
            payment: { status: 'pending', method: 'pix', totalAmount: 25, paidAmount: 0, remainingAmount: 25 },
          },
        },
      };

      await handleUpdateComplexOrder(payload1, adminDb);

      // Reenvio com o mesmo opId, mas alterando para price: 30
      const payload2 = {
        auth: { uid: 'complex-owner', token: { auth_time: 1 } },
        data: {
          orderId: id,
          expectedVersion: 1,
          operationId: opId,
          updates: {
            price: 30,
            items: [{ name: 'Item inicial', quantity: 1, unitPrice: 30, price: 30 }],
            payment: { status: 'pending', method: 'pix', totalAmount: 30, paidAmount: 0, remainingAmount: 30 },
          },
        },
      };

      await expect(handleUpdateComplexOrder(payload2, adminDb)).rejects.toThrow(
        'Este identificador de operação já foi utilizado com alterações diferentes.',
      );
    });

    it('avalia autorização antes de responder ao replay idempotente', async () => {
      const id = `op-auth-replay-${Date.now()}`;
      const orderRef = adminDb.doc(`orders/${id}`);
      const saleRef = adminDb.doc(`salesLedger/${id}`);
      const userRef = adminDb.doc('userProfiles/revoked-employee');
      const initial = { ...newOrder(id), userId: 'complex-owner', assignedTo: 'revoked-employee' };

      await Promise.all([
        orderRef.set(initial),
        saleRef.set({
          id, orderId: id, orderNumber: initial.orderNumber, userId: initial.userId,
          amount: initial.price, quantity: initial.quantity, isExchange: false,
          status: initial.status, paymentStatus: 'paid', paidAmount: initial.price,
          paymentMethod: 'pix', customerName: initial.customerName,
          productName: initial.productName, updatedAt: initial.createdAt,
        }),
        userRef.set({ role: 'funcionario', active: true, permissions: { orders: { edit: true } } }),
      ]);

      const opId = `op-auth-token-${Date.now()}`;
      const payload = {
        auth: { uid: 'revoked-employee', token: { auth_time: 1 } },
        data: {
          orderId: id,
          expectedVersion: 1,
          operationId: opId,
          updates: {
            price: 25,
            items: [{ name: 'Item inicial', quantity: 1, unitPrice: 25, price: 25 }],
            payment: { status: 'pending', method: 'pix', totalAmount: 25, paidAmount: 0, remainingAmount: 25 },
          },
        },
      };

      // 1ª Execução: bem sucedida pelo funcionário autorizado
      await handleUpdateComplexOrder(payload, adminDb);

      // Agora o perfil do funcionário é inativado
      await userRef.set({ role: 'funcionario', active: false, permissions: { orders: { edit: false } } });

      // Replay do mesmo opId DEVE SER RECUSADO por falta de autorização ativa
      await expect(handleUpdateComplexOrder(payload, adminDb)).rejects.toThrow(
        'Você não tem permissão para editar este pedido.',
      );
    });

    it('rejeita operationId com formato ou tamanho inválido', async () => {
      const id = `op-id-invalid-${Date.now()}`;
      const orderRef = adminDb.doc(`orders/${id}`);
      await orderRef.set(newOrder(id));

      await expect(handleUpdateComplexOrder({
        auth: { uid: 'complex-owner', token: { auth_time: 1 } },
        data: {
          orderId: id,
          expectedVersion: 1,
          operationId: 'invalid operation id with spaces!',
          updates: { price: 30 },
        },
      }, adminDb)).rejects.toThrow('Identificador de operação inválido.');
    });
  });
});

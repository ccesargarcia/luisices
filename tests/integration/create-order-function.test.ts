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

  describe('Validações rigorosas de criação (isExchange, pricingMode, unitPrice e items)', () => {
    const setupUser = async (prefix: string) => {
      const uid = `${prefix}-${Date.now()}`;
      await adminDb.doc(`userProfiles/${uid}`).set({
        role: 'user',
        active: true,
        permissions: { orders: { create: true } },
      });
      return uid;
    };

    it('rejeita isExchange: "false" como string sem normalizar silenciosamente para true', async () => {
      const uid = await setupUser('invalid-exchange');
      const orderData = {
        customerName: 'Cliente Teste',
        productName: 'Produto Teste',
        quantity: 1,
        price: 50,
        deliveryDate: '2026-11-20',
        isExchange: 'false',
      };

      await expect(handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: { orderData },
      }, adminDb)).rejects.toThrow('Indicador de permuta inválido.');
    });

    it('rejeita pricingMode inválido', async () => {
      const uid = await setupUser('invalid-pricing-mode');
      const orderData = {
        customerName: 'Cliente Teste',
        productName: 'Produto Teste',
        quantity: 1,
        price: 50,
        deliveryDate: '2026-11-20',
        pricingMode: 'desconto_magico',
      };

      await expect(handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: { orderData },
      }, adminDb)).rejects.toThrow('Tipo de preço inválido.');
    });

    it('rejeita unitPrice negativo e unitPrice acima do limite de 1.000.000', async () => {
      const uid = await setupUser('invalid-unit-price');
      const baseOrderData = {
        customerName: 'Cliente Teste',
        productName: 'Produto Teste',
        quantity: 1,
        price: 50,
        deliveryDate: '2026-11-20',
      };

      await expect(handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: { orderData: { ...baseOrderData, unitPrice: -5 } },
      }, adminDb)).rejects.toThrow('Preço unitário inválido.');

      await expect(handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: { orderData: { ...baseOrderData, unitPrice: 1000001 } },
      }, adminDb)).rejects.toThrow('Preço unitário inválido.');
    });

    it('rejeita preço unitário incompatível com o item em pedido de 1 item', async () => {
      const uid = await setupUser('mismatch-unit-price');
      const orderData = {
        customerName: 'Cliente Teste',
        productName: 'Produto Teste',
        quantity: 2,
        price: 100,
        deliveryDate: '2026-11-20',
        unitPrice: 80, // Diverge do preço do item (50)
        items: [
          { name: 'Produto Teste', quantity: 2, unitPrice: 50, price: 100 },
        ],
      };

      await expect(handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: { orderData },
      }, adminDb)).rejects.toThrow('O preço unitário do pedido não corresponde ao item.');
    });

    it('rejeita pricingMode items quando items for nulo', async () => {
      const uid = await setupUser('items-mode-null-items');
      const orderData = {
        customerName: 'Cliente Teste',
        productName: 'Produto Teste',
        quantity: 1,
        price: 50,
        deliveryDate: '2026-11-20',
        pricingMode: 'items',
        items: null,
      };

      await expect(handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: { orderData },
      }, adminDb)).rejects.toThrow('O tipo de preço "items" exige uma lista de itens estruturados.');
    });

    it('rejeita unitPrice e pricingMode unit em pedido com múltiplos itens', async () => {
      const uid = await setupUser('multi-item-unit-price');
      const multiItems = [
        { name: 'Item 1', quantity: 1, unitPrice: 30, price: 30 },
        { name: 'Item 2', quantity: 1, unitPrice: 20, price: 20 },
      ];

      // Rejeita unitPrice escalar em múltiplos itens
      await expect(handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: {
          orderData: {
            customerName: 'Cliente Teste',
            productName: 'Produtos',
            quantity: 2,
            price: 50,
            deliveryDate: '2026-11-20',
            items: multiItems,
            unitPrice: 25,
          },
        },
      }, adminDb)).rejects.toThrow('Pedidos com múltiplos itens não devem ter unitPrice no pedido.');

      // Rejeita pricingMode unit em múltiplos itens
      await expect(handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: {
          orderData: {
            customerName: 'Cliente Teste',
            productName: 'Produtos',
            quantity: 2,
            price: 50,
            deliveryDate: '2026-11-20',
            items: multiItems,
            pricingMode: 'unit',
          },
        },
      }, adminDb)).rejects.toThrow('Pedidos com múltiplos itens devem usar o tipo de preço "items".');
    });

    it('aceita pedido unitário válido com 1 item conferindo persistência de unitPrice, pricingMode, subtotal e total', async () => {
      const uid = await setupUser('valid-unit-single-item');
      const orderData = {
        customerName: 'Cliente Unitário',
        productName: 'Caneca Personalizada (2x)',
        quantity: 2,
        price: 90,
        deliveryDate: '2026-11-20',
        pricingMode: 'unit',
        unitPrice: 45,
        items: [
          { name: 'Caneca Personalizada', quantity: 2, unitPrice: 45, price: 90 },
        ],
      };

      const result = await handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: { orderData },
      }, adminDb);

      expect(result.success).toBe(true);
      const snap = await adminDb.doc(`orders/${result.orderId}`).get();
      const order = snap.data();
      expect(order?.pricingMode).toBe('unit');
      expect(order?.unitPrice).toBe(45);
      expect(order?.quantity).toBe(2);
      expect(order?.price).toBe(90);
      expect(order?.items).toHaveLength(1);
      expect(order?.items?.[0].unitPrice).toBe(45);
      expect(order?.items?.[0].price).toBe(90);
    });

    it('aceita pedido simples no modo unitário sem itens e valida cálculo de subtotal', async () => {
      const uid = await setupUser('valid-unit-simple');
      const orderData = {
        customerName: 'Cliente Simples Unitário',
        productName: 'Topo de Bolo',
        quantity: 3,
        price: 75,
        deliveryDate: '2026-11-20',
        pricingMode: 'unit',
        unitPrice: 25,
        items: null,
      };

      const result = await handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: { orderData },
      }, adminDb);

      expect(result.success).toBe(true);
      const snap = await adminDb.doc(`orders/${result.orderId}`).get();
      const order = snap.data();
      expect(order?.pricingMode).toBe('unit');
      expect(order?.unitPrice).toBe(25);
      expect(order?.quantity).toBe(3);
      expect(order?.price).toBe(75);
      expect(order?.items).toBeNull();
    });

    it('aceita pedido total válido sem lista e persiste pricingMode total e unitPrice nulo', async () => {
      const uid = await setupUser('valid-total-simple');
      const orderData = {
        customerName: 'Cliente Total',
        productName: 'Kit Lembrancinhas',
        quantity: 2,
        price: 150,
        deliveryDate: '2026-11-20',
        pricingMode: 'total',
        unitPrice: null,
        items: null,
      };

      const result = await handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: { orderData },
      }, adminDb);

      expect(result.success).toBe(true);
      const snap = await adminDb.doc(`orders/${result.orderId}`).get();
      const order = snap.data();
      expect(order?.pricingMode).toBe('total');
      expect(order?.unitPrice).toBeNull();
      expect(order?.quantity).toBe(2);
      expect(order?.price).toBe(150);
      expect(order?.items).toBeNull();
    });

    it('aceita pedido com múltiplos itens e persiste pricingMode items, unitPrice nulo e subtotais', async () => {
      const uid = await setupUser('valid-multi-items');
      const items = [
        { name: 'Caderno Brochura', quantity: 2, unitPrice: 30, price: 60 },
        { name: 'Kit Adesivos', quantity: 1, unitPrice: 40, price: 40 },
      ];
      const orderData = {
        customerName: 'Cliente Multi Itens',
        productName: 'Caderno Brochura (2x), Kit Adesivos (1x)',
        quantity: 3,
        price: 100,
        deliveryDate: '2026-11-20',
        pricingMode: 'items',
        items,
      };

      const result = await handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: { orderData },
      }, adminDb);

      expect(result.success).toBe(true);
      const snap = await adminDb.doc(`orders/${result.orderId}`).get();
      const order = snap.data();
      expect(order?.pricingMode).toBe('items');
      expect(order?.unitPrice).toBeNull();
      expect(order?.quantity).toBe(3);
      expect(order?.price).toBe(100);
      expect(order?.items).toHaveLength(2);
      expect(order?.items?.[0]).toMatchObject({ name: 'Caderno Brochura', quantity: 2, unitPrice: 30, price: 60 });
      expect(order?.items?.[1]).toMatchObject({ name: 'Kit Adesivos', quantity: 1, unitPrice: 40, price: 40 });
    });

    it('confirma atomicidade completa na Function: pedido, salesLedger, contador, paymentEvents e customer stats sincronizados', async () => {
      const uid = await setupUser('atomic-all-sync');
      const customerId = `cust-atomic-${Date.now()}`;
      await adminDb.doc(`customers/${customerId}`).set({
        userId: uid,
        name: 'Cliente Sincronizado',
        totalOrders: 4,
        totalSpent: 400.00,
      });

      const orderData = {
        customerId,
        customerName: 'Cliente Sincronizado',
        customerPhone: '11987654321',
        productName: 'Camisa Polo Bordada',
        quantity: 2,
        price: 160.00,
        deliveryDate: '2026-12-15',
        pricingMode: 'unit',
        unitPrice: 80.00,
        items: [
          { name: 'Camisa Polo Bordada', quantity: 2, unitPrice: 80.00, price: 160.00 },
        ],
        payment: {
          status: 'paid',
          method: 'pix',
          totalAmount: 160.00,
          paidAmount: 160.00,
        },
      };

      const result = await handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: { orderData },
      }, adminDb);

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();

      // 1. Pedido principal no Firestore
      const orderSnap = await adminDb.doc(`orders/${result.orderId}`).get();
      expect(orderSnap.exists).toBe(true);
      const order = orderSnap.data();
      expect(order?.userId).toBe(uid);
      expect(order?.customerId).toBe(customerId);
      expect(order?.price).toBe(160.00);
      expect(order?.quantity).toBe(2);
      expect(order?.pricingMode).toBe('unit');
      expect(order?.unitPrice).toBe(80.00);
      expect(order?.payment?.status).toBe('paid');
      expect(order?.payment?.paidAmount).toBe(160.00);

      // 2. salesLedger espelhado atomicamente
      const saleSnap = await adminDb.doc(`salesLedger/${result.orderId}`).get();
      expect(saleSnap.exists).toBe(true);
      const sale = saleSnap.data();
      expect(sale?.orderId).toBe(result.orderId);
      expect(sale?.userId).toBe(uid);
      expect(sale?.customerId).toBe(customerId);
      expect(sale?.amount).toBe(160.00);
      expect(sale?.paymentStatus).toBe('paid');
      expect(sale?.paidAmount).toBe(160.00);
      expect(sale?.paymentMethod).toBe('pix');

      // 3. Contador sequencial da organização/usuário
      const counterSnap = await adminDb.doc(`users/${uid}/metadata/counters`).get();
      expect(counterSnap.data()?.orderCounter).toBe(1);

      // 4. Subcoleção append-only de paymentEvents
      const eventsSnap = await adminDb.doc(`orders/${result.orderId}`).collection('paymentEvents').get();
      expect(eventsSnap.docs).toHaveLength(1);
      expect(eventsSnap.docs[0].data()).toMatchObject({
        type: 'payment',
        amount: 160.00,
        method: 'pix',
        actorUid: uid,
        source: 'createOrder',
      });

      // 5. Estatísticas acumuladas do cliente
      const customerSnap = await adminDb.doc(`customers/${customerId}`).get();
      const customer = customerSnap.data();
      expect(customer?.totalOrders).toBe(5);
      expect(customer?.totalSpent).toBe(560.00);
    });

    it('cria atomicamente pedido de permuta e zera valores financeiros no pedido e no salesLedger', async () => {
      const uid = await setupUser('atomic-exchange');
      const orderData = {
        customerName: 'Cliente Permuta Parceria',
        productName: 'Divulgação Instagram',
        quantity: 1,
        price: 250.00,
        deliveryDate: '2026-11-20',
        isExchange: true,
        payment: {
          status: 'paid',
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          method: null,
        },
        exchangeItems: [
          { name: 'Post no feed', quantity: 1, value: 150.00 },
          { name: 'Stories 3x', quantity: 3, value: 100.00 },
        ],
      };

      const result = await handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: { orderData },
      }, adminDb);

      expect(result.success).toBe(true);

      const orderSnap = await adminDb.doc(`orders/${result.orderId}`).get();
      const order = orderSnap.data();
      expect(order?.isExchange).toBe(true);
      expect(order?.payment?.totalAmount).toBe(0);
      expect(order?.payment?.paidAmount).toBe(0);
      expect(order?.payment?.remainingAmount).toBe(0);

      const saleSnap = await adminDb.doc(`salesLedger/${result.orderId}`).get();
      const sale = saleSnap.data();
      expect(sale?.isExchange).toBe(true);
      expect(sale?.amount).toBe(0);
      expect(sale?.paidAmount).toBe(0);
      expect(sale?.paymentStatus).toBe('paid');
    });

    it('cria atomicamente pedido com pagamento parcial registrando histórico, remainingAmount e auditoria', async () => {
      const uid = await setupUser('atomic-partial-payment');
      const orderData = {
        customerName: 'Cliente Sinal',
        productName: 'Kit Convites',
        quantity: 2,
        price: 200.00,
        deliveryDate: '2026-11-20',
        pricingMode: 'unit',
        unitPrice: 100.00,
        payment: {
          paidAmount: 60.00,
          method: 'pix',
        },
      };

      const result = await handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: { orderData },
      }, adminDb);

      expect(result.success).toBe(true);

      const orderSnap = await adminDb.doc(`orders/${result.orderId}`).get();
      const order = orderSnap.data();
      expect(order?.payment?.status).toBe('partial');
      expect(order?.payment?.paidAmount).toBe(60.00);
      expect(order?.payment?.remainingAmount).toBe(140.00);
      expect(order?.payment?.history).toHaveLength(1);
      expect(order?.payment?.history[0]).toMatchObject({ amount: 60.00, method: 'pix' });

      const saleSnap = await adminDb.doc(`salesLedger/${result.orderId}`).get();
      const sale = saleSnap.data();
      expect(sale?.paymentStatus).toBe('partial');
      expect(sale?.paidAmount).toBe(60.00);
      expect(sale?.amount).toBe(200.00);

      const eventsSnap = await adminDb.doc(`orders/${result.orderId}`).collection('paymentEvents').get();
      expect(eventsSnap.docs).toHaveLength(1);
      expect(eventsSnap.docs[0].data()).toMatchObject({
        type: 'payment',
        amount: 60.00,
        method: 'pix',
      });
    });

    it('rejeita na Function permuta com mais de 10 itens recebidos', async () => {
      const uid = await setupUser('too-many-exchange');
      const orderData = {
        customerName: 'Cliente Permuta Excessiva',
        productName: 'Parceria Grande',
        quantity: 1,
        price: 100,
        deliveryDate: '2026-11-20',
        isExchange: true,
        exchangeItems: Array.from({ length: 11 }, (_, i) => ({
          name: `Item ${i + 1}`,
          quantity: 1,
          value: 10,
        })),
      };

      await expect(handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: { orderData },
      }, adminDb)).rejects.toThrow('Itens recebidos na permuta são inválidos.');
    });

    it('rejeita na Function lista de itens com subtotais divergentes da soma do pedido', async () => {
      const uid = await setupUser('inconsistent-item-totals');
      const orderData = {
        customerName: 'Cliente Total Divergente',
        productName: 'Itens Divergentes',
        quantity: 2,
        price: 150, // Diverge da soma dos itens (100)
        deliveryDate: '2026-11-20',
        items: [
          { name: 'Item 1', quantity: 1, unitPrice: 50, price: 50 },
          { name: 'Item 2', quantity: 1, unitPrice: 50, price: 50 },
        ],
      };

      await expect(handleCreateOrder({
        auth: { uid, token: { auth_time: 1 } },
        data: { orderData },
      }, adminDb)).rejects.toThrow('A quantidade e o total do pedido devem corresponder à soma dos itens.');
    });
  });
});

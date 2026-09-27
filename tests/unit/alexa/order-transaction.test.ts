import { describe, it, expect } from 'vitest';
const { commitOrderFromDraft } = require('../../../functions/alexa/orderService');

describe('Alexa: Transação Atômica de Pedido e Idempotência Durável', () => {
  const baseConfig = {
    environment: 'dev',
    timezone: 'America/Sao_Paulo',
  };

  const createMockDb = (initialStore: any = {}) => {
    const store = {
      alexaDrafts: {},
      alexaCommits: {},
      orders: {},
      salesLedger: {},
      alexaBindings: {},
      userProfiles: {},
      alexaPermissions: {},
      alexaAudit: {},
      alexaRateLimits: {},
      counters: {}, // users/{uid}/metadata/counters
      ...initialStore,
    };

    const docGetter = (pathOrCol: string, id?: string) => {
      let docKey = id ? `${pathOrCol}/${id}` : pathOrCol;

      return {
        id: id || pathOrCol.split('/').pop(),
        get: async () => {
          let data = null;
          if (docKey.startsWith('users/') && docKey.includes('/metadata/counters')) {
            const uid = docKey.split('/')[1];
            data = store.counters[uid] || null;
          } else {
            const [c, dId] = docKey.split('/');
            data = store[c]?.[dId] || null;
          }
          return {
            exists: Boolean(data),
            data: () => data,
            ref: { id: id || docKey.split('/').pop() },
          };
        },
        set: async (data: any, options: any) => {
          if (docKey.startsWith('users/') && docKey.includes('/metadata/counters')) {
            const uid = docKey.split('/')[1];
            store.counters[uid] = options?.merge ? { ...store.counters[uid], ...data } : data;
          } else {
            const [c, dId] = docKey.split('/');
            store[c] = store[c] || {};
            store[c][dId] = options?.merge ? { ...store[c][dId], ...data } : data;
          }
        },
        update: async (data: any) => {
          const [c, dId] = docKey.split('/');
          if (!store[c]?.[dId]) throw new Error('Document does not exist');
          store[c][dId] = { ...store[c][dId], ...data };
        },
      };
    };

    return {
      store,
      collection: (col: string) => ({
        doc: (id?: string) => docGetter(col, id || ('gen_order_' + Math.random().toString(36).slice(2))),
        add: async (data: any) => {
          store[col] = store[col] || {};
          const id = 'gen_' + Math.random().toString(36).slice(2);
          store[col][id] = data;
          return { id };
        },
      }),
      doc: (path: string) => docGetter(path),
      runTransaction: async (cb: any) => {
        const transaction = {
          get: async (ref: any) => ref.get(),
          set: (ref: any, data: any, options: any) => ref.set(data, options),
          update: (ref: any, data: any) => ref.update(data),
        };
        return cb(transaction);
      },
    };
  };

  it('deve gravar contador, pedido, ledger, consumo de rascunho e recibo em transação única', async () => {
    const draftId = 'draft-amanda-001';
    const callerPersonId = 'amzn1.ask.person.AMANDA';
    const uid = 'uid-amanda';
    const bindingKey = 'binding-key-amanda';

    const mockDb = createMockDb({
      alexaDrafts: {
        [draftId]: {
          draftId,
          uid,
          bindingKey,
          personId: callerPersonId,
          customer: 'Maria Silva',
          product: 'caixinhas personalizadas',
          quantity: 20,
          deliveryDate: '2026-10-10',
          price: 150.00,
          state: 'awaiting_confirmation',
          revision: 1,
          mode: 'voice_confirm',
          expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
        },
      },
      alexaBindings: {
        [bindingKey]: { uid, active: true, revokedAt: null },
      },
      userProfiles: {
        [uid]: {
          active: true,
          displayName: 'Amanda Garcia',
          email: 'amanda@luisices.com.br',
          permissions: { orders: { create: true } }, // Achado 4: exige permissão explícita
        },
      },
      alexaPermissions: {
        [uid]: { enabled: true, mode: 'voice_confirm' },
      },
      counters: {
        [uid]: { orderCounter: 5 }, // Já tem 5 pedidos anteriores
      },
    });

    const result = await commitOrderFromDraft({
      draftId,
      callerPersonId,
      expectedRevision: 1,
      config: baseConfig,
      db: mockDb,
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBeDefined();
    expect(result.isReplay).toBe(false);

    // Contador sequencial deve ter sido incrementado de 5 para 6
    const updatedCounter = mockDb.store.counters[uid];
    expect(updatedCounter.orderCounter).toBe(6);
    const expectedYear = new Date().getFullYear();
    expect(result.orderNumber).toBe(`#${expectedYear}-0006`);

    // Pedido criado em orders/{orderId}
    const orderDoc = mockDb.store.orders[result.orderId];
    expect(orderDoc).toBeDefined();
    expect(orderDoc.userId).toBe(uid);
    expect(orderDoc.customerName).toBe('Maria Silva');
    expect(orderDoc.productName).toBe('caixinhas personalizadas');
    expect(orderDoc.quantity).toBe(20);
    expect(orderDoc.price).toBe(150.00);
    expect(orderDoc.status).toBe('pending');
    expect(orderDoc.source).toBe('alexa');
    expect(orderDoc.voiceDraftId).toBe(draftId);
    expect(orderDoc.productionWorkflow.currentStep).toBe('design');

    // Lançamento financeiro em salesLedger/{orderId}
    const ledgerDoc = mockDb.store.salesLedger[result.orderId];
    expect(ledgerDoc).toBeDefined();
    expect(ledgerDoc.orderId).toBe(result.orderId);
    expect(ledgerDoc.orderNumber).toBe(result.orderNumber);
    expect(ledgerDoc.amount).toBe(150.00);
    expect(ledgerDoc.source).toBe('alexa');
    expect(ledgerDoc.paymentStatus).toBe('pending');

    // Consumo do rascunho em alexaDrafts
    const draftDoc = mockDb.store.alexaDrafts[draftId];
    expect(draftDoc.state).toBe('committed');
    expect(draftDoc.orderId).toBe(result.orderId);

    // Recibo durável de consumo em alexaCommits/{draftId}
    const commitDoc = mockDb.store.alexaCommits[draftId];
    expect(commitDoc).toBeDefined();
    expect(commitDoc.orderId).toBe(result.orderId);
    expect(commitDoc.orderNumber).toBe(result.orderNumber);
    expect(commitDoc.uid).toBe(uid);
  });

  it('idempotência durável: repetição do mesmo draftId deve retornar o pedido existente sem duplicar contador ou ledger', async () => {
    const draftId = 'draft-amanda-replay';
    const uid = 'uid-amanda';

    const mockDb = createMockDb({
      alexaCommits: {
        [draftId]: {
          orderId: 'existing-order-999',
          orderNumber: '#2026-0005',
          uid,
          environment: 'dev',
        },
      },
      counters: {
        [uid]: { orderCounter: 5 },
      },
      orders: {
        'existing-order-999': {
          id: 'existing-order-999',
          orderNumber: '#2026-0005',
        },
      },
    });

    const result = await commitOrderFromDraft({
      draftId,
      callerPersonId: 'amzn1.ask.person.AMANDA',
      config: baseConfig,
      db: mockDb,
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBe('existing-order-999');
    expect(result.orderNumber).toBe('#2026-0005');
    expect(result.isReplay).toBe(true);

    // Contador NÃO deve ter sido incrementado
    expect(mockDb.store.counters[uid].orderCounter).toBe(5);
    // Nenhuma nova ordem criada
    expect(Object.keys(mockDb.store.orders).length).toBe(1);
  });

  it('deve abortar se o vínculo de voz for revogado concorrentemente antes do commit', async () => {
    const draftId = 'draft-revoked';
    const uid = 'uid-amanda';
    const bindingKey = 'binding-key-revoked';

    const mockDb = createMockDb({
      alexaDrafts: {
        [draftId]: {
          draftId,
          uid,
          bindingKey,
          personId: 'amzn1.ask.person.AMANDA',
          state: 'awaiting_confirmation',
          expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
        },
      },
      alexaBindings: {
        // Vínculo inativo / revogado!
        [bindingKey]: { uid, active: false, revokedAt: new Date().toISOString() },
      },
      userProfiles: {
        [uid]: { active: true },
      },
      alexaPermissions: {
        [uid]: { enabled: true },
      },
    });

    await expect(
      commitOrderFromDraft({
        draftId,
        callerPersonId: 'amzn1.ask.person.AMANDA',
        config: baseConfig,
        db: mockDb,
      })
    ).rejects.toThrow('VOICE_NOT_ALLOWED');

    // Nenhuma ordem deve ter sido gravada
    expect(Object.keys(mockDb.store.orders).length).toBe(0);
  });
});

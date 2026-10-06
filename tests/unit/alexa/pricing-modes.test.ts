import { beforeEach, describe, it, expect } from 'vitest';
const {
  formatCurrencyPtBr,
  parseAndValidatePrice,
  parseAndValidatePriceToCents,
  buildConfirmationSpeech,
  handleAlexaDialog,
} = require('../../../functions/alexa/dialog');
const { commitOrderFromDraft } = require('../../../functions/alexa/orderService');
const { clearDynamicEntitiesCache, fetchCatalogProductsForDynamicEntities } = require('../../../functions/alexa/dynamicEntities');

describe('Alexa: Precificação Unitária, Total e Resolução de Ambiguidades', () => {
  beforeEach(() => clearDynamicEntitiesCache());
  const baseConfig = {
    environment: 'dev',
    timezone: 'America/Sao_Paulo',
    draftTtlMinutes: 15,
  };

  const identity = {
    uid: 'uid-amanda',
    displayName: 'Amanda',
    bindingKey: 'binding-amanda',
    personId: 'amzn1.ask.person.AMANDA',
    mode: 'voice_confirm',
  };

  const createMockDb = (initialStore: any = {}) => {
    const store: any = {
      alexaDrafts: {},
      alexaCommits: {},
      orders: {},
      salesLedger: {},
      alexaAudit: {},
      alexaRateLimits: {},
      userProfiles: {
        'uid-amanda': {
          active: true,
          role: 'admin',
          displayName: 'Amanda',
        },
      },
      alexaPermissions: {
        'uid-amanda': {
          enabled: true,
          mode: 'voice_confirm',
        },
      },
      alexaBindings: {
        'binding-amanda': {
          uid: 'uid-amanda',
          active: true,
          revokedAt: null,
          environment: 'dev',
        },
      },
      counters: {
        'uid-amanda': { orderCounter: 10 },
      },
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

    const queryFor = (col: string, filters: Array<[string, any]> = [], max = Infinity): any => ({
      where: (field: string, operator: string, value: any) => {
        if (operator !== '==') throw new Error(`Unsupported mock query operator: ${operator}`);
        return queryFor(col, [...filters, [field, value]], max);
      },
      limit: (count: number) => queryFor(col, filters, count),
      get: async () => {
        const docs = Object.entries(store[col] || {})
          .filter(([, data]: [string, any]) => filters.every(([field, value]) => data[field] === value))
          .slice(0, max)
          .map(([id, data]) => ({ id, data: () => data }));
        return { docs, empty: docs.length === 0, size: docs.length, forEach: (callback: any) => docs.forEach(callback) };
      },
    });

    return {
      store,
      collection: (col: string) => ({
        ...queryFor(col),
        doc: (id: string) => docGetter(col, id),
        add: async (data: any) => {
          store[col] = store[col] || {};
          const id = `auto_${Date.now()}`;
          store[col][id] = data;
          return { id };
        },
      }),
      doc: (path: string) => docGetter(path),
      runTransaction: async (cb: any) => cb({
        get: async (ref: any) => ref.get(),
        set: (ref: any, data: any, options: any) => ref.set(data, options),
        update: (ref: any, data: any) => ref.update(data),
      }),
    };
  };

  const mockAuthService = {
    getUser: async (uid: string) => ({ uid, disabled: false }),
  };

  it('carrega entidades dinâmicas do catálogo e dos produtos do usuário sem incluir produtos de outro usuário', async () => {
    const db = createMockDb({
      storeProducts: { public: { name: 'Convite', price: 10 }, hidden: { name: 'Oculto', status: 'hidden' } },
      products: {
        own: { name: 'Adesivo', unitPrice: 2, userId: identity.uid },
        other: { name: 'Produto de outro usuário', unitPrice: 3, userId: 'other' },
      },
    });
    const products = await fetchCatalogProductsForDynamicEntities(db, identity.uid);
    expect(products.map(({ id, name, unitPrice }: any) => ({ id, name, unitPrice }))).toEqual([
      { id: 'public', name: 'Convite', unitPrice: 10 },
      { id: 'own', name: 'Adesivo', unitPrice: 2 },
    ]);
  });

  describe('1. Cálculos de Centavos e Validação de Preço', () => {
    it('10 unidades a R$ 10 cada -> total R$ 100 (10000 centavos)', () => {
      const uRes = parseAndValidatePriceToCents('10');
      expect(uRes.valid).toBe(true);
      expect(uRes.cents).toBe(1000);
      const qty = 10;
      const totalCents = qty * uRes.cents;
      expect(totalCents).toBe(10000);
      expect(totalCents / 100).toBe(100);
    });

    it('10 unidades por R$ 10 no total -> total R$ 10 (1000 centavos)', () => {
      const tRes = parseAndValidatePriceToCents('10');
      expect(tRes.valid).toBe(true);
      expect(tRes.cents).toBe(1000);
      expect(tRes.price).toBe(10);
    });

    it('3 unidades a R$ 0,10 -> total exato R$ 0,30 (30 centavos)', () => {
      const uRes = parseAndValidatePriceToCents('10 centavos');
      expect(uRes.valid).toBe(true);
      expect(uRes.cents).toBe(10);
      const totalCents = 3 * uRes.cents;
      expect(totalCents).toBe(30);
      expect(totalCents / 100).toBe(0.3);
    });

    it('3 unidades a R$ 12,50 -> total exato R$ 37,50 (3750 centavos)', () => {
      const uRes = parseAndValidatePriceToCents('12,50');
      expect(uRes.valid).toBe(true);
      expect(uRes.cents).toBe(1250);
      const totalCents = 3 * uRes.cents;
      expect(totalCents).toBe(3750);
      expect(totalCents / 100).toBe(37.5);
    });

    it('rejeita zero negativo, negativos, excesso de decimais e limites excedidos', () => {
      expect(parseAndValidatePriceToCents('-10').valid).toBe(false);
      expect(parseAndValidatePriceToCents('menos cinco').valid).toBe(false);
      expect(parseAndValidatePriceToCents('10,005').valid).toBe(false);
      expect(parseAndValidatePriceToCents('15000').valid).toBe(false);
      expect(parseAndValidatePriceToCents(0)).toEqual({ valid: true, cents: 0, price: 0 });
    });

    it('interpreta com precisão valores decimais, centavos e expressões coloquiais em português (3.50, 3 e 50, três e cinquenta, 3 e meio)', () => {
      expect(parseAndValidatePriceToCents('3.50')).toEqual({ valid: true, cents: 350, price: 3.5 });
      expect(parseAndValidatePriceToCents('3,50')).toEqual({ valid: true, cents: 350, price: 3.5 });
      expect(parseAndValidatePriceToCents('3.5')).toEqual({ valid: true, cents: 350, price: 3.5 });
      expect(parseAndValidatePriceToCents('3,5')).toEqual({ valid: true, cents: 350, price: 3.5 });
      expect(parseAndValidatePriceToCents('3 e 50')).toEqual({ valid: true, cents: 350, price: 3.5 });
      expect(parseAndValidatePriceToCents('3 reais e 50')).toEqual({ valid: true, cents: 350, price: 3.5 });
      expect(parseAndValidatePriceToCents('3 reais e 50 centavos')).toEqual({ valid: true, cents: 350, price: 3.5 });
      expect(parseAndValidatePriceToCents('três e cinquenta')).toEqual({ valid: true, cents: 350, price: 3.5 });
      expect(parseAndValidatePriceToCents('três reais e cinquenta')).toEqual({ valid: true, cents: 350, price: 3.5 });
      expect(parseAndValidatePriceToCents('três reais e cinquenta centavos')).toEqual({ valid: true, cents: 350, price: 3.5 });
      expect(parseAndValidatePriceToCents('3 e meio')).toEqual({ valid: true, cents: 350, price: 3.5 });
      expect(parseAndValidatePriceToCents('três e meio')).toEqual({ valid: true, cents: 350, price: 3.5 });
      expect(parseAndValidatePriceToCents('três reais e meio')).toEqual({ valid: true, cents: 350, price: 3.5 });
      expect(parseAndValidatePriceToCents('dez e cinquenta')).toEqual({ valid: true, cents: 1050, price: 10.5 });
      expect(parseAndValidatePriceToCents('vinte e cinco e cinquenta')).toEqual({ valid: true, cents: 2550, price: 25.5 });
      expect(parseAndValidatePriceToCents('vinte e cinco')).toEqual({ valid: true, cents: 2500, price: 25 });
      expect(parseAndValidatePriceToCents('0.50')).toEqual({ valid: true, cents: 50, price: 0.5 });
      expect(parseAndValidatePriceToCents('cinquenta centavos')).toEqual({ valid: true, cents: 50, price: 0.5 });
      expect(parseAndValidatePriceToCents(3.5)).toEqual({ valid: true, cents: 350, price: 3.5 });
      expect(parseAndValidatePriceToCents('3.50 cada')).toEqual({ valid: true, cents: 350, price: 3.5 });
      expect(parseAndValidatePriceToCents('3,50 no total')).toEqual({ valid: true, cents: 350, price: 3.5 });
      expect(parseAndValidatePriceToCents('3.50 por unidade')).toEqual({ valid: true, cents: 350, price: 3.5 });
      expect(parseAndValidatePriceToCents('3 e 50 cada')).toEqual({ valid: true, cents: 350, price: 3.5 });
      // Expressões orais adicionais com vírgula, com, centavos compostos
      expect(parseAndValidatePriceToCents('10 vírgula 50')).toEqual({ valid: true, cents: 1050, price: 10.5 });
      expect(parseAndValidatePriceToCents('10 virgula 50')).toEqual({ valid: true, cents: 1050, price: 10.5 });
      expect(parseAndValidatePriceToCents('dez vírgula cinquenta')).toEqual({ valid: true, cents: 1050, price: 10.5 });
      expect(parseAndValidatePriceToCents('dez com cinquenta')).toEqual({ valid: true, cents: 1050, price: 10.5 });
      expect(parseAndValidatePriceToCents('10 com 50')).toEqual({ valid: true, cents: 1050, price: 10.5 });
      expect(parseAndValidatePriceToCents('cinco e setenta e cinco')).toEqual({ valid: true, cents: 575, price: 5.75 });
      expect(parseAndValidatePriceToCents('três e setenta e cinco')).toEqual({ valid: true, cents: 375, price: 3.75 });
      expect(parseAndValidatePriceToCents('dez e noventa e nove')).toEqual({ valid: true, cents: 1099, price: 10.99 });
    });

    it('aceita número isolado "10" como resposta direta de quantidade sem exigir "10 itens" (ProvideNumberIntent contextual)', async () => {
      const mockDb = createMockDb();
      const draftId = 'draft-test-isolated-number-qty';
      const sessionId = 'session-isolated-qty-number';

      // Rascunho aguardando quantidade
      mockDb.store.alexaDrafts[draftId] = {
        draftId,
        sessionId,
        uid: identity.uid,
        bindingKey: identity.bindingKey,
        personId: identity.personId,
        mode: 'voice_confirm',
        state: 'collecting',
        customer: 'Juliana',
        product: 'Caixa Milk',
        quantity: null,
        deliveryDate: '2026-11-20',
        price: null,
        expectedInput: 'quantity',
        pendingField: 'quantity',
        revision: 1,
        expiresAt: { toDate: () => new Date(Date.now() + 600000) },
      };

      // Usuário responde apenas "10" na Alexa, o que dispara ProvideNumberIntent com { number: "10" }
      const envelope = {
        session: {
          sessionId,
          attributes: { draftId, revision: 1, expectedInput: 'quantity', personId: identity.personId },
        },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideNumberIntent',
            slots: {
              number: { value: '10' },
            },
          },
        },
        context: {
          System: {
            person: { personId: identity.personId },
          },
        },
      };

      const res = await handleAlexaDialog({
        envelope,
        identity,
        config: baseConfig,
        db: mockDb,
        authService: mockAuthService,
      });

      // Deve aceitar 10 como QUANTIDADE e não dar erro de preço inválido nem perguntar a quantidade de novo
      const updatedDraft = mockDb.store.alexaDrafts[draftId];
      expect(updatedDraft.quantity).toBe(10);
      expect(res.speech).not.toContain('Valor total inválido');
      expect(res.speech).not.toContain('Qual é a quantidade de itens');
    });

    it('aceita quantidades ditas em palavras e com sufixos ("dez", "duas", "10 itens", "10 unidades")', async () => {
      const mockDb = createMockDb();
      const envelope = {
        session: { sessionId: 'session-qty-words' },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Fernanda' },
              product: { value: 'Caixa Milk' },
              quantity: { value: 'dez itens' },
              total: { value: '150' },
              deliveryDate: { value: '2026-11-20' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });
      expect(res.shouldEndSession).toBe(false);
      const draftId = res.sessionAttributes?.draftId;
      expect(draftId).toBeDefined();
      const draft = mockDb.store.alexaDrafts[draftId];
      expect(draft.quantity).toBe(10);
    });

    it('resolve número avulso para quantidade quando expectedInput é quantity (cross-mapping de slot)', async () => {
      const mockDb = createMockDb();
      // 1. Inicia pedido sem quantidade
      const envelope1 = {
        session: { sessionId: 'session-cross-qty' },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Carlos' },
              product: { value: 'Topo de Bolo' },
            },
          },
        },
      };
      const res1 = await handleAlexaDialog({ envelope: envelope1, identity, config: baseConfig, db: mockDb });
      expect(res1.speech).toContain('quantidade');
      const draftId = res1.sessionAttributes?.draftId;
      expect(res1.sessionAttributes?.expectedInput).toBe('quantity');

      // 2. Usuário responde apenas "10", e a NLU da Alexa roteou como ProvidePriceIntent com slot price = "10"
      const envelope2 = {
        session: {
          sessionId: 'session-cross-qty',
          attributes: { draftId, revision: res1.sessionAttributes?.revision, expectedInput: 'quantity' },
        },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvidePriceIntent',
            slots: {
              price: { value: '10' },
            },
          },
        },
      };
      const res2 = await handleAlexaDialog({ envelope: envelope2, identity, config: baseConfig, db: mockDb });
      const draft = mockDb.store.alexaDrafts[draftId];
      expect(draft.quantity).toBe(10);
    });

    it('resolve valor decimal quando expectedInput é totalPrice e Alexa NLU roteou como ProvideQuantityIntent ("3.50")', async () => {
      const mockDb = createMockDb();
      // 1. Inicia pedido faltando valor
      const envelope1 = {
        session: { sessionId: 'session-cross-price' },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Mariana' },
              product: { value: 'Caixa Bala' },
              quantity: { value: '1' },
              deliveryDate: { value: '2026-11-20' },
            },
          },
        },
      };
      const res1 = await handleAlexaDialog({ envelope: envelope1, identity, config: baseConfig, db: mockDb });
      expect(res1.speech).toContain('valor');
      const draftId = res1.sessionAttributes?.draftId;
      expect(res1.sessionAttributes?.expectedInput).toBe('totalPrice');

      // 2. Usuário responde "3.50", e Alexa NLU enviou como quantity = "3.50"
      const envelope2 = {
        session: {
          sessionId: 'session-cross-price',
          attributes: { draftId, revision: res1.sessionAttributes?.revision, expectedInput: 'totalPrice' },
        },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideQuantityIntent',
            slots: {
              quantity: { value: '3.50' },
            },
          },
        },
      };
      const res2 = await handleAlexaDialog({ envelope: envelope2, identity, config: baseConfig, db: mockDb });
      const draft = mockDb.store.alexaDrafts[draftId];
      expect(draft.price).toBe(3.5);
      expect(draft.totalPriceCents).toBe(350);
      expect(draft.pricingMode).toBe('total');
    });
  });

  describe('2. Diálogo com Preço Unitário Completo', () => {
    it('cria pedido com preço unitário e pergunta apenas data de entrega se ausente', async () => {
      const envelope = {
        session: { sessionId: 'session-unit-1' },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              quantity: { value: '10' },
              unitPrice: { value: '10' },
            },
          },
        },
      };

      const mockDb = createMockDb();
      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      // Pergunta a data de entrega com feedback contextual
      expect(res.speech).toBe('São 10 unidades a 10 reais cada, total de 100 reais. Para quando é a entrega?');
      expect(res.shouldEndSession).toBe(false);
      const draftId = res.sessionAttributes?.draftId;
      expect(draftId).toBeDefined();

      const draft = mockDb.store.alexaDrafts[draftId];
      expect(draft.customer).toBe('Maria');
      expect(draft.product).toBe('topo de bolo');
      expect(draft.quantity).toBe(10);
      expect(draft.pricingMode).toBe('unit');
      expect(draft.unitPriceCents).toBe(1000);
      expect(draft.totalPriceCents).toBe(10000);
      expect(draft.price).toBe(100);

      // Agora fornece a data
      const dateEnvelope = {
        session: { sessionId: 'session-unit-1', attributes: { draftId, revision: draft.revision } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideDeliveryDateIntent',
            slots: {
              deliveryDate: { value: '2026-11-20' },
            },
          },
        },
      };

      const confirmRes = await handleAlexaDialog({ envelope: dateEnvelope, identity, config: baseConfig, db: mockDb });
      expect(confirmRes.speech).toContain('10 topo de bolo para Maria');
      expect(confirmRes.speech).toContain('a 10 reais cada');
      expect(confirmRes.speech).toContain('total de 100 reais');
      expect(confirmRes.speech).toContain('entrega em 20 de novembro de 2026');
      expect(confirmRes.speech).toContain('Confirmar?');
    });

    it('unitário sem quantidade guarda unitário e pergunta quantidade sem assumir 1', async () => {
      const envelope = {
        session: { sessionId: 'session-unit-no-qty' },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              unitPrice: { value: '10' },
            },
          },
        },
      };

      const mockDb = createMockDb();
      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      expect(res.speech).toBe('Qual é a quantidade de itens?');
      const draftId = res.sessionAttributes?.draftId;
      const draft = mockDb.store.alexaDrafts[draftId];
      expect(draft.pricingMode).toBe('unit');
      expect(draft.unitPriceCents).toBe(1000);
      expect(draft.quantity).toBeNull();
      expect(draft.price).toBeNull();

      // Fornece quantidade agora
      const qtyEnvelope = {
        session: { sessionId: 'session-unit-no-qty', attributes: { draftId, revision: draft.revision } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideQuantityIntent',
            slots: {
              quantity: { value: '5' },
            },
          },
        },
      };

      const qtyRes = await handleAlexaDialog({ envelope: qtyEnvelope, identity, config: baseConfig, db: mockDb });
      const updatedDraft = mockDb.store.alexaDrafts[draftId];
      expect(updatedDraft.quantity).toBe(5);
      expect(updatedDraft.totalPriceCents).toBe(5000);
      expect(updatedDraft.price).toBe(50);
      expect(qtyRes.speech).toBe('São 5 unidades a 10 reais cada, total de 50 reais. Para quando é a entrega?');
    });
  });

  describe('3. Ambiguidade de Preço e Resolução', () => {
    it('valor ambíguo pergunta se é cada ou no total e não grava pedido', async () => {
      const envelope = {
        session: { sessionId: 'session-ambiguous-1' },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              quantity: { value: '10' },
              ambiguousPrice: { value: '10' },
            },
          },
        },
      };

      const mockDb = createMockDb();
      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      expect(res.speech).toBe('10 reais cada ou 10 reais no total?');
      const draftId = res.sessionAttributes?.draftId;
      const draft = mockDb.store.alexaDrafts[draftId];
      expect(draft.pendingPriceCents).toBe(1000);
      expect(draft.price).toBeNull();
      expect(draft.state).toBe('collecting');

      // Responde com ClarifyPriceUnitIntent ("cada")
      const clarifyEnvelope = {
        session: { sessionId: 'session-ambiguous-1', attributes: { draftId, revision: draft.revision } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ClarifyPriceUnitIntent',
          },
        },
      };

      const clarifyRes = await handleAlexaDialog({ envelope: clarifyEnvelope, identity, config: baseConfig, db: mockDb });
      const resolvedDraft = mockDb.store.alexaDrafts[draftId];
      expect(resolvedDraft.pricingMode).toBe('unit');
      expect(resolvedDraft.unitPriceCents).toBe(1000);
      expect(resolvedDraft.totalPriceCents).toBe(10000);
      expect(resolvedDraft.price).toBe(100);
      expect(resolvedDraft.pendingPriceCents).toBeNull();
      expect(clarifyRes.speech).toBe('São 10 unidades a 10 reais cada, total de 100 reais. Para quando é a entrega?');
    });

    it('resolução de ambiguidade com "no total" define modo total', async () => {
      const envelope = {
        session: { sessionId: 'session-ambiguous-2' },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'João' },
              product: { value: 'cadernos' },
              quantity: { value: '10' },
              ambiguousPrice: { value: '50' },
            },
          },
        },
      };

      const mockDb = createMockDb();
      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });
      expect(res.speech).toBe('50 reais cada ou 50 reais no total?');

      const draftId = res.sessionAttributes?.draftId;
      const draft = mockDb.store.alexaDrafts[draftId];

      const clarifyEnvelope = {
        session: { sessionId: 'session-ambiguous-2', attributes: { draftId, revision: draft.revision } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ClarifyPriceTotalIntent',
          },
        },
      };

      const clarifyRes = await handleAlexaDialog({ envelope: clarifyEnvelope, identity, config: baseConfig, db: mockDb });
      const resolvedDraft = mockDb.store.alexaDrafts[draftId];
      expect(resolvedDraft.pricingMode).toBe('total');
      expect(resolvedDraft.totalPriceCents).toBe(5000);
      expect(resolvedDraft.price).toBe(50);
      expect(resolvedDraft.unitPriceCents).toBeNull();
      expect(resolvedDraft.pendingPriceCents).toBeNull();
    });

    it('rejeita conflito entre unitPrice e total fornecidos conjuntamente', async () => {
      const envelope = {
        session: { sessionId: 'session-conflict-1' },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Carla' },
              product: { value: 'caixinhas' },
              quantity: { value: '10' },
              unitPrice: { value: '10' }, // 10 x 10 = 100 != 50
              total: { value: '50' },
            },
          },
        },
      };

      const mockDb = createMockDb();
      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      expect(res.speech).toContain('não fecha com o total');
      expect(res.speech).toContain('10 reais cada');
      expect(res.speech).toContain('50 reais no total');
    });
  });

  describe('4. Correções Durante a Conversa e Troca de Modos', () => {
    it('em modo unitário, alterar quantidade recalcula total', async () => {
      const draftId = 'draft-qty-unit';
      const sessionId = 'session-recalc-1';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            customer: 'Maria',
            product: 'topo de bolo',
            quantity: 10,
            deliveryDate: '2026-11-20',
            pricingMode: 'unit',
            unitPriceCents: 1000,
            totalPriceCents: 10000,
            price: 100,
            state: 'awaiting_confirmation',
            revision: 2,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 2 } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideQuantityIntent',
            slots: {
              quantity: { value: '12' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });
      const updated = mockDb.store.alexaDrafts[draftId];
      expect(updated.quantity).toBe(12);
      expect(updated.totalPriceCents).toBe(12000);
      expect(updated.price).toBe(120);
      expect(updated.revision).toBe(3);
      expect(res.speech).toContain('12 topo de bolo para Maria a 10 reais cada, total de 120 reais');
    });

    it('em modo total, alterar quantidade preserva total explícito', async () => {
      const draftId = 'draft-qty-total';
      const sessionId = 'session-recalc-2';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            customer: 'Maria',
            product: 'topo de bolo',
            quantity: 10,
            deliveryDate: '2026-11-20',
            pricingMode: 'total',
            unitPriceCents: null,
            totalPriceCents: 10000,
            price: 100,
            state: 'awaiting_confirmation',
            revision: 2,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 2 } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideQuantityIntent',
            slots: {
              quantity: { value: '12' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });
      const updated = mockDb.store.alexaDrafts[draftId];
      expect(updated.quantity).toBe(12);
      expect(updated.totalPriceCents).toBe(10000);
      expect(updated.price).toBe(100);
      expect(updated.unitPriceCents).toBeNull();
      expect(res.speech).toContain('12 topo de bolo para Maria, entrega em 20 de novembro de 2026, total de 100 reais');
    });

    it('corrigir unitário muda para modo unitário e recalcula total', async () => {
      const draftId = 'draft-change-to-unit';
      const sessionId = 'session-recalc-3';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            customer: 'Maria',
            product: 'topo de bolo',
            quantity: 10,
            deliveryDate: '2026-11-20',
            pricingMode: 'total',
            totalPriceCents: 8000,
            price: 80,
            state: 'awaiting_confirmation',
            revision: 2,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 2 } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideUnitPriceIntent',
            slots: {
              unitPrice: { value: '15' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });
      const updated = mockDb.store.alexaDrafts[draftId];
      expect(updated.pricingMode).toBe('unit');
      expect(updated.unitPriceCents).toBe(1500);
      expect(updated.totalPriceCents).toBe(15000);
      expect(updated.price).toBe(150);
      expect(res.speech).toContain('a 15 reais cada, total de 150 reais');
    });

    it('corrigir total muda para modo total e remove unitário antigo', async () => {
      const draftId = 'draft-change-to-total';
      const sessionId = 'session-recalc-4';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            customer: 'Maria',
            product: 'topo de bolo',
            quantity: 10,
            deliveryDate: '2026-11-20',
            pricingMode: 'unit',
            unitPriceCents: 1000,
            totalPriceCents: 10000,
            price: 100,
            state: 'awaiting_confirmation',
            revision: 2,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 2 } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideTotalIntent',
            slots: {
              total: { value: '85' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });
      const updated = mockDb.store.alexaDrafts[draftId];
      expect(updated.pricingMode).toBe('total');
      expect(updated.unitPriceCents).toBeNull();
      expect(updated.totalPriceCents).toBe(8500);
      expect(updated.price).toBe(85);
      expect(res.speech).toContain('total de 85 reais');
    });

    it('rascunho em awaiting_app_approval é imutável por voz', async () => {
      const draftId = 'draft-app-approval-locked';
      const sessionId = 'session-app-lock';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            state: 'awaiting_app_approval',
            customer: 'Maria',
            product: 'topo de bolo',
            quantity: 10,
            price: 100,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 1 } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideQuantityIntent',
            slots: {
              quantity: { value: '20' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });
      expect(res.speech).toContain('já foi enviado para aprovação no aplicativo');
      expect(res.shouldEndSession).toBe(true);
      // Rascunho não deve ter sido alterado
      expect(mockDb.store.alexaDrafts[draftId].quantity).toBe(10);
    });
  });

  describe('5. Commit e Validação Transacional no Firestore', () => {
    it('comita com sucesso rascunho em modo unitário gravando price total em orders e salesLedger', async () => {
      const draftId = 'draft-commit-unit';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            uid: identity.uid,
            personId: identity.personId,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            customer: 'Maria',
            product: 'topo de bolo',
            quantity: 10,
            deliveryDate: '2026-11-20',
            pricingMode: 'unit',
            unitPriceCents: 1000,
            totalPriceCents: 10000,
            price: 100,
            revision: 1,
            state: 'awaiting_confirmation',
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      const res = await commitOrderFromDraft({
        draftId,
        callerPersonId: identity.personId,
        expectedRevision: 1,
        channel: 'voice',
        config: baseConfig,
        db: mockDb,
        authService: mockAuthService,
      });

      expect(res.success).toBe(true);
      expect(res.orderNumber).toBeDefined();

      const createdOrder = Object.values(mockDb.store.orders)[0] as any;
      expect(createdOrder).toBeDefined();
      expect(createdOrder.price).toBe(100);
      expect(createdOrder.payment.totalAmount).toBe(100);
      expect(createdOrder.pricingMode).toBe('unit');
      expect(createdOrder.unitPrice).toBe(10);

      const ledger = Object.values(mockDb.store.salesLedger)[0] as any;
      expect(ledger.amount).toBe(100);
      expect(ledger.totalAmount).toBe(100);
    });

    it('rejeita commit se o rascunho estiver adulterado (inconsistência unitário vs total)', async () => {
      const draftId = 'draft-tampered-unit';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            uid: identity.uid,
            personId: identity.personId,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            customer: 'Maria',
            product: 'topo de bolo',
            quantity: 10,
            deliveryDate: '2026-11-20',
            pricingMode: 'unit',
            unitPriceCents: 1000, // 10 x 1000 = 10000
            totalPriceCents: 5000, // Adulterado para 5000!
            price: 50,
            revision: 1,
            state: 'awaiting_confirmation',
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      await expect(commitOrderFromDraft({
        draftId,
        callerPersonId: identity.personId,
        expectedRevision: 1,
        channel: 'voice',
        config: baseConfig,
        db: mockDb,
        authService: mockAuthService,
      })).rejects.toThrow('Inconsistência entre preço unitário, quantidade e total');
    });

    it('comita rascunho legado sem pricingMode preservando o total', async () => {
      const draftId = 'draft-legacy';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            uid: identity.uid,
            personId: identity.personId,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            customer: 'Maria',
            product: 'topo de bolo',
            quantity: 10,
            deliveryDate: '2026-11-20',
            price: 150, // Legado sem pricingMode
            revision: 1,
            state: 'awaiting_confirmation',
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      const res = await commitOrderFromDraft({
        draftId,
        callerPersonId: identity.personId,
        expectedRevision: 1,
        channel: 'voice',
        config: baseConfig,
        db: mockDb,
        authService: mockAuthService,
      });

      expect(res.success).toBe(true);
      const createdOrder = Object.values(mockDb.store.orders)[0] as any;
      expect(createdOrder.price).toBe(150);
      expect(createdOrder.pricingMode).toBe('total');
      expect(createdOrder.unitPrice).toBeNull();
    });

    it('rejeita confirmação se houver divergência de revisão ou troca de voz', async () => {
      const draftId = 'draft-rev-mismatch';
      const sessionId = 'session-rev-1';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            customer: 'Maria',
            product: 'topo de bolo',
            quantity: 10,
            deliveryDate: '2026-11-20',
            pricingMode: 'unit',
            unitPriceCents: 1000,
            totalPriceCents: 10000,
            price: 100,
            state: 'awaiting_confirmation',
            personId: 'amzn1.ask.person.AMANDA',
            revision: 3, // Rascunho avançou para 3
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      // Sessão envia YesIntent com revisão antiga 2
      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 2 }, System: { person: { personId: 'amzn1.ask.person.AMANDA' } } },
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });
      expect(res.speech).toContain('Os dados do pedido foram atualizados');
      expect(mockDb.store.orders['ord-1']).toBeUndefined();
    });
  });

  describe('6. Resolução de Erros e Revisão P1/P2', () => {
    it('P1: Erro de unitPrice persiste pendingField: unitPrice e valor sem qualificador ("20 reais") resolve como unitário', async () => {
      const draftId = 'draft-err-unit-1';
      const sessionId = 'session-err-unit-1';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            customer: 'Maria',
            product: 'cadernos',
            quantity: 10,
            deliveryDate: '2026-11-20',
            pricingMode: 'unit',
            unitPriceCents: 1000,
            totalPriceCents: 10000,
            price: 100,
            state: 'awaiting_confirmation',
            revision: 2,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      // Turno 2: Enviar unitPrice inválido (ex: valor negativo)
      const errEnvelope = {
        session: { sessionId, attributes: { draftId, revision: 2 } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideUnitPriceIntent',
            slots: {
              unitPrice: { value: '-10' },
            },
          },
        },
      };

      const errRes = await handleAlexaDialog({ envelope: errEnvelope, identity, config: baseConfig, db: mockDb });
      expect(errRes.speech).toContain('não pode ser negativo');
      expect(errRes.reprompt).toBe('Qual é o valor unitário de cada item?');
      expect(errRes.sessionAttributes.pendingField).toBe('unitPrice');

      const draftAfterErr = mockDb.store.alexaDrafts[draftId];
      expect(draftAfterErr.pendingField).toBe('unitPrice');
      expect(draftAfterErr.state).toBe('collecting');
      expect(draftAfterErr.revision).toBe(3);

      // Turno 3: Responder "20 reais" sem qualificador (ProvidePriceIntent com price=20)
      const recoverEnvelope = {
        session: { sessionId, attributes: { draftId, revision: 3, pendingField: 'unitPrice' } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvidePriceIntent',
            slots: {
              price: { value: '20' },
            },
          },
        },
      };

      const recoverRes = await handleAlexaDialog({ envelope: recoverEnvelope, identity, config: baseConfig, db: mockDb });
      const draftRecovered = mockDb.store.alexaDrafts[draftId];
      expect(draftRecovered.pricingMode).toBe('unit');
      expect(draftRecovered.unitPriceCents).toBe(2000);
      expect(draftRecovered.totalPriceCents).toBe(20000); // 10 x 20 = 200 reais
      expect(draftRecovered.price).toBe(200);
      expect(draftRecovered.pendingField).toBeNull();
      expect(draftRecovered.state).toBe('awaiting_confirmation');
      expect(recoverRes.speech).toContain('a 20 reais cada, total de 200 reais');
    });

    it('P1: Erro de unitPrice permite resposta explícita ("50 reais no total") trocando para modo total', async () => {
      const draftId = 'draft-err-unit-2';
      const sessionId = 'session-err-unit-2';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            customer: 'Maria',
            product: 'cadernos',
            quantity: 10,
            deliveryDate: '2026-11-20',
            pricingMode: 'unit',
            unitPriceCents: 1000,
            totalPriceCents: 10000,
            price: 100,
            state: 'awaiting_confirmation',
            revision: 2,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      // Turno 2: Erro em unitPrice
      await handleAlexaDialog({
        envelope: {
          session: { sessionId, attributes: { draftId, revision: 2 } },
          request: {
            type: 'IntentRequest',
            intent: {
              name: 'ProvideUnitPriceIntent',
              slots: { unitPrice: { value: 'abc' } },
            },
          },
        },
        identity,
        config: baseConfig,
        db: mockDb,
      });

      expect(mockDb.store.alexaDrafts[draftId].pendingField).toBe('unitPrice');

      // Turno 3: Responder explicitamente no total ("50 reais no total" via ProvideTotalIntent)
      const totalEnvelope = {
        session: { sessionId, attributes: { draftId, revision: 3, pendingField: 'unitPrice' } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideTotalIntent',
            slots: {
              total: { value: '50' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope: totalEnvelope, identity, config: baseConfig, db: mockDb });
      const updated = mockDb.store.alexaDrafts[draftId];
      expect(updated.pricingMode).toBe('total');
      expect(updated.unitPriceCents).toBeNull();
      expect(updated.totalPriceCents).toBe(5000);
      expect(updated.price).toBe(50);
      expect(updated.pendingField).toBeNull();
      expect(updated.state).toBe('awaiting_confirmation');
      expect(res.speech).toContain('total de 50 reais');
    });

    it('P1: Conflito em rascunho existente preserva alternativas, invalida confirmação anterior e "no total" resolve para total', async () => {
      const draftId = 'draft-conflict-1';
      const sessionId = 'session-conflict-1';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            customer: 'Maria',
            product: 'cadernos',
            quantity: 10,
            deliveryDate: '2026-11-20',
            pricingMode: 'unit',
            unitPriceCents: 1000,
            totalPriceCents: 10000,
            price: 100,
            state: 'awaiting_confirmation',
            revision: 2,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      // Envia unitPrice=10 e total=50 com quantidade 10 (conflito: 10x10=100 != 50)
      const conflictEnvelope = {
        session: { sessionId, attributes: { draftId, revision: 2 } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              unitPrice: { value: '10' },
              total: { value: '50' },
            },
          },
        },
      };

      const conflictRes = await handleAlexaDialog({ envelope: conflictEnvelope, identity, config: baseConfig, db: mockDb });
      expect(conflictRes.speech).toContain('O valor informado de 10 reais cada não fecha com o total de 50 reais. O valor é 10 reais cada ou 50 reais no total?');
      expect(conflictRes.sessionAttributes.pendingField).toBe('conflict');

      const draftInConflict = mockDb.store.alexaDrafts[draftId];
      expect(draftInConflict.pendingConflict).toEqual({ unitPriceCents: 1000, totalPriceCents: 5000 });
      expect(draftInConflict.pendingField).toBe('conflict');
      expect(draftInConflict.price).toBeNull();
      expect(draftInConflict.state).toBe('collecting');
      expect(draftInConflict.revision).toBe(3);

      // Se tentar confirmar dizendo "sim", é bloqueado
      const yesEnvelope = {
        session: { sessionId, attributes: { draftId, revision: 3, pendingField: 'conflict' } },
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };
      const yesRes = await handleAlexaDialog({ envelope: yesEnvelope, identity, config: baseConfig, db: mockDb });
      expect(yesRes.speech).toContain('Ainda faltam informações para concluir o pedido');

      // Usuário responde "no total" (ClarifyPriceTotalIntent)
      const clarifyEnvelope = {
        session: { sessionId, attributes: { draftId, revision: 3, pendingField: 'conflict' } },
        request: {
          type: 'IntentRequest',
          intent: { name: 'ClarifyPriceTotalIntent' },
        },
      };

      const clarifyRes = await handleAlexaDialog({ envelope: clarifyEnvelope, identity, config: baseConfig, db: mockDb });
      const draftResolved = mockDb.store.alexaDrafts[draftId];
      expect(draftResolved.pricingMode).toBe('total');
      expect(draftResolved.unitPriceCents).toBeNull();
      expect(draftResolved.totalPriceCents).toBe(5000);
      expect(draftResolved.price).toBe(50);
      expect(draftResolved.pendingConflict).toBeNull();
      expect(draftResolved.pendingField).toBeNull();
      expect(draftResolved.state).toBe('awaiting_confirmation');
      expect(clarifyRes.speech).toContain('total de 50 reais. Confirmar?');
    });

    it('P1: Conflito em rascunho existente com resolução "cada" seleciona unitário e calcula total', async () => {
      const draftId = 'draft-conflict-2';
      const sessionId = 'session-conflict-2';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            customer: 'Maria',
            product: 'cadernos',
            quantity: 10,
            deliveryDate: '2026-11-20',
            pricingMode: 'unit',
            unitPriceCents: 1000,
            totalPriceCents: 10000,
            price: 100,
            state: 'awaiting_confirmation',
            revision: 2,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      // Conflito
      await handleAlexaDialog({
        envelope: {
          session: { sessionId, attributes: { draftId, revision: 2 } },
          request: {
            type: 'IntentRequest',
            intent: {
              name: 'CreateOrderIntent',
              slots: {
                unitPrice: { value: '10' },
                total: { value: '50' },
              },
            },
          },
        },
        identity,
        config: baseConfig,
        db: mockDb,
      });

      // Usuário responde "cada" (ClarifyPriceUnitIntent)
      const clarifyRes = await handleAlexaDialog({
        envelope: {
          session: { sessionId, attributes: { draftId, revision: 3, pendingField: 'conflict' } },
          request: {
            type: 'IntentRequest',
            intent: { name: 'ClarifyPriceUnitIntent' },
          },
        },
        identity,
        config: baseConfig,
        db: mockDb,
      });

      const draftResolved = mockDb.store.alexaDrafts[draftId];
      expect(draftResolved.pricingMode).toBe('unit');
      expect(draftResolved.unitPriceCents).toBe(1000);
      expect(draftResolved.totalPriceCents).toBe(10000);
      expect(draftResolved.price).toBe(100);
      expect(draftResolved.pendingConflict).toBeNull();
      expect(draftResolved.pendingField).toBeNull();
      expect(draftResolved.state).toBe('awaiting_confirmation');
      expect(clarifyRes.speech).toContain('a 10 reais cada, total de 100 reais');
    });

    it('P1: Conflito em rascunho novo grava pendência e resolve via ClarifyPriceTotalIntent', async () => {
      const sessionId = 'session-new-conflict';
      const mockDb = createMockDb();

      // Primeiro turno já cria com conflito
      const newEnvelope = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Lucas' },
              product: { value: 'agendas' },
              quantity: { value: '5' },
              unitPrice: { value: '20' }, // 5 x 20 = 100 != 80
              total: { value: '80' },
            },
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: newEnvelope, identity, config: baseConfig, db: mockDb });
      expect(res1.speech).toContain('O valor informado de 20 reais cada não fecha com o total de 80 reais');
      const draftId = res1.sessionAttributes.draftId;
      expect(draftId).toBeDefined();

      const createdDraft = mockDb.store.alexaDrafts[draftId];
      expect(createdDraft.customer).toBe('Lucas');
      expect(createdDraft.product).toBe('agendas');
      expect(createdDraft.quantity).toBe(5);
      expect(createdDraft.pendingConflict).toEqual({ unitPriceCents: 2000, totalPriceCents: 8000 });
      expect(createdDraft.pendingField).toBe('conflict');
      expect(createdDraft.price).toBeNull();

      // Segundo turno: usuário esclarece "no total"
      const res2 = await handleAlexaDialog({
        envelope: {
          session: { sessionId, attributes: { draftId, revision: createdDraft.revision, pendingField: 'conflict' } },
          request: {
            type: 'IntentRequest',
            intent: { name: 'ClarifyPriceTotalIntent' },
          },
        },
        identity,
        config: baseConfig,
        db: mockDb,
      });

      const updatedDraft = mockDb.store.alexaDrafts[draftId];
      expect(updatedDraft.pricingMode).toBe('total');
      expect(updatedDraft.totalPriceCents).toBe(8000);
      expect(updatedDraft.price).toBe(80);
      expect(updatedDraft.pendingConflict).toBeNull();
      expect(updatedDraft.pendingField).toBeNull();
      // Como faltava data de entrega, pergunta data de entrega
      expect(res2.speech).toContain('Para quando é a entrega?');
    });

    it('P2: Retry de transação Firestore é isolado e não vaza estado entre tentativas', async () => {
      const draftId = 'draft-retry-test';
      const sessionId = 'session-retry-1';
      const initialDraft = {
        draftId,
        sessionId,
        uid: identity.uid,
        bindingKey: identity.bindingKey,
        environment: 'dev',
        customer: 'Maria',
        product: 'cadernos',
        quantity: 10,
        deliveryDate: '2026-11-20',
        pricingMode: 'unit',
        unitPriceCents: 1000,
        totalPriceCents: 10000,
        price: 100,
        state: 'awaiting_confirmation',
        revision: 2,
        expiresAt: { toDate: () => new Date(Date.now() + 600000) },
      };

      const mockDb = createMockDb({
        alexaDrafts: { [draftId]: { ...initialDraft } },
      });

      // Envolver runTransaction para simular 1 tentativa anterior com erro antes do retry de sucesso
      let cbCalls = 0;
      const originalRunTx = mockDb.runTransaction;
      mockDb.runTransaction = async (cb: any) => {
        // Tentativa 1: snapshot transitório com quantidade inválida que define transactionError
        cbCalls++;
        await cb({
          get: async () => ({
            exists: true,
            data: () => ({ ...initialDraft, quantity: 20000 }),
          }),
          set: () => {},
          update: () => {},
        });

        // Tentativa 2: Firestore retry com snapshot consistente que comita com sucesso
        cbCalls++;
        return await originalRunTx(cb);
      };

      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 2 } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideUnitPriceIntent',
            slots: { unitPrice: { value: '15' } },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });
      expect(cbCalls).toBe(2);
      expect(res.speech).toContain('a 15 reais cada, total de 150 reais');
      const finalDraft = mockDb.store.alexaDrafts[draftId];
      expect(finalDraft.unitPriceCents).toBe(1500);
      expect(finalDraft.totalPriceCents).toBe(15000);
    });
  });
});

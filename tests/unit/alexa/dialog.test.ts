import { describe, it, expect } from 'vitest';
const {
  formatDatePtBr,
  formatCurrencyPtBr,
  parseAndValidateDeliveryDate,
  parseAndValidatePrice,
  handleAlexaDialog,
} = require('../../../functions/alexa/dialog');

describe('Alexa: Máquina de Estados, Diálogo e Validação de Slots pt-BR', () => {
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
    const store = {
      alexaDrafts: {},
      alexaCommits: {},
      orders: {},
      salesLedger: {},
      alexaAudit: {},
      alexaRateLimits: {},
      ...initialStore,
    };

    return {
      store,
      collection: (col: string) => {
        const queryObj: any = {
          where: () => queryObj,
          orderBy: () => queryObj,
          limit: () => queryObj,
          get: async () => {
            const items = Object.entries(store[col] || {}).map(([id, data]: [string, any]) => ({
              id,
              data: () => data,
            }));
            return {
              empty: items.length === 0,
              docs: items,
            };
          },
          doc: (id: string) => {
            const docRef = {
              id,
              get: async () => ({
                exists: Boolean(store[col]?.[id]),
                data: () => store[col]?.[id] || null,
                ref: docRef,
              }),
              set: async (data: any, options: any) => {
                store[col] = store[col] || {};
                store[col][id] = options?.merge ? { ...store[col][id], ...data } : data;
              },
              update: async (data: any) => {
                if (!store[col]?.[id]) throw new Error('Not found');
                store[col][id] = { ...store[col][id], ...data };
              },
            };
            return docRef;
          },
        };
        return queryObj;
      },

      runTransaction: async (cb: any) => cb({
        get: async (ref: any) => ref.get(),
        set: (ref: any, data: any, options: any) => ref.set(data, options),
        update: (ref: any, data: any) => ref.update(data),
      }),
    };
  };

  describe('Formatação e Validação Pura de Slots', () => {
    it('deve formatar data para fala em português', () => {
      expect(formatDatePtBr('2026-10-10')).toBe('10 de outubro de 2026');
      expect(formatDatePtBr('2026-01-05')).toBe('5 de janeiro de 2026');
    });

    it('deve formatar moeda para fala em português', () => {
      expect(formatCurrencyPtBr(100)).toBe('100 reais');
      expect(formatCurrencyPtBr(1)).toBe('1 real');
      expect(formatCurrencyPtBr(50.5)).toBe('50 reais e 50 centavos');
      expect(formatCurrencyPtBr(0)).toBe('zero reais');
    });

    it('deve validar datas completas e rejeitar datas incompletas ou passadas', () => {
      const futureDate = '2026-12-25';
      const validRes = parseAndValidateDeliveryDate(futureDate);
      expect(validRes.valid).toBe(true);
      expect(validRes.date).toBe('2026-12-25');

      // Semana incompleta
      const weekRes = parseAndValidateDeliveryDate('2026-W41');
      expect(weekRes.valid).toBe(false);
      expect(weekRes.error).toContain('incompleta');

      const validIsoWeekDay = parseAndValidateDeliveryDate('2026-W45-1');
      expect(validIsoWeekDay).toMatchObject({ valid: true, date: '2026-11-02' });
      expect(parseAndValidateDeliveryDate('2021-W53-1').valid).toBe(false);
      expect(parseAndValidateDeliveryDate('2026-W54-1').valid).toBe(false);

      // Mês incompleto
      const monthRes = parseAndValidateDeliveryDate('2026-10');
      expect(monthRes.valid).toBe(false);
      expect(monthRes.error).toContain('incompleta');

      // Data passada
      const pastRes = parseAndValidateDeliveryDate('2020-01-01');
      expect(pastRes.valid).toBe(false);
      expect(pastRes.error).toContain('anterior');
    });

    it('deve validar valores monetários e aplicar teto de R$ 10.000,00', () => {
      expect(parseAndValidatePrice('100')).toEqual({ valid: true, price: 100 });
      expect(parseAndValidatePrice('100 reais')).toEqual({ valid: true, price: 100 });
      expect(parseAndValidatePrice('cem reais')).toEqual({ valid: true, price: 100 });
      expect(parseAndValidatePrice('cem')).toEqual({ valid: true, price: 100 });
      expect(parseAndValidatePrice('cinquenta')).toEqual({ valid: true, price: 50 });
      expect(parseAndValidatePrice('duzentos e cinquenta reais')).toEqual({ valid: true, price: 250 });
      expect(parseAndValidatePrice('100,50')).toEqual({ valid: true, price: 100.5 });
      expect(parseAndValidatePrice('R$ 250,00')).toEqual({ valid: true, price: 250 });

      // Inválidos
      expect(parseAndValidatePrice('abc').valid).toBe(false);
      expect(parseAndValidatePrice('-50').valid).toBe(false);

      // Excede teto
      const excessive = parseAndValidatePrice('15000');
      expect(excessive.valid).toBe(false);
      expect(excessive.error).toContain('limite máximo');
    });
  });

  describe('Fluxo de Diálogo', () => {
    it('deve responder à saudação LaunchRequest no ambiente correto', async () => {
      const envelope = {
        request: { type: 'LaunchRequest' },
      };
      const mockDb = createMockDb();
      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      expect(res.speech).toContain('Olá, Amanda');
      expect(res.speech).toContain('Ambiente de teste');
      expect(res.shouldEndSession).toBe(false);
    });

    it('deve pedir dados faltantes se o pedido não estiver completo', async () => {
      const envelope = {
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'caixinhas' },
            },
          },
        },
      };
      const mockDb = createMockDb();
      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      // Faltam quantidade, data e valor
      expect(res.speech).toContain('quantidade');
      expect(res.shouldEndSession).toBe(false);
    });

    it('deve emitir resumo verbal completo quando todos os slots forem fornecidos', async () => {
      const envelope = {
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'caixinhas' },
              quantity: { value: '20' },
              deliveryDate: { value: '2026-10-10' },
              total: { value: '100' },
            },
          },
        },
      };
      const mockDb = createMockDb();
      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      expect(res.speech).toContain('Amanda, no ambiente de teste:');
      expect(res.speech).toContain('20 caixinhas para Maria');
      expect(res.speech).toContain('entrega em 10 de outubro de 2026');
      expect(res.speech).toContain('total de 100 reais');
      expect(res.speech).toContain('Confirmar?');
      expect(res.shouldEndSession).toBe(false);
      expect(res.sessionAttributes?.draftId).toBeDefined();
    });

    it('deve rejeitar confirmação se outra pessoa disser "Sim" (troca de voz)', async () => {
      const draftId = 'draft-test-123';
      const sessionId = 'session-test-voice-swap';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: baseConfig.environment,
            state: 'awaiting_confirmation',
            personId: 'amzn1.ask.person.AMANDA', // Criado por Amanda
            customer: 'Maria',
            product: 'caixinhas',
            quantity: 20,
            deliveryDate: '2026-10-10',
            price: 100,
            revision: 1,
            expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
          },
        },
      });

      const impostorIdentity = {
        ...identity,
        personId: 'amzn1.ask.person.OTHER_PERSON', // Outra pessoa confirmando!
      };

      // Simula o impostor com personId físico presente na request atual
      // (Achado 2: physicalPersonId só aceito do envelope, não do identity)
      const envelope = {
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
        session: { sessionId, attributes: { draftId } },
        context: {
          System: {
            person: { personId: 'amzn1.ask.person.OTHER_PERSON' }, // personId físico diferente
          },
        },
      };

      const res = await handleAlexaDialog({
        envelope,
        identity: impostorIdentity,
        config: baseConfig,
        db: mockDb,
      });

      expect(res.speech).toContain('não é a mesma que iniciou o pedido');
      expect(res.shouldEndSession).toBe(true);
    });

    it('deve encerrar a sessão com orientação após 3 falhas de entendimento no fallback', async () => {
      const draftId = 'draft-fallback-test';
      const sessionId = 'session-test-fallback';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: baseConfig.environment,
            state: 'collecting',
            fallbackCount: 2, // Já falhou 2 vezes
            expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
          },
        },
      });

      const envelope = {
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.FallbackIntent' },
        },
        session: { sessionId, attributes: { draftId } },
      };

      const res = await handleAlexaDialog({
        envelope,
        identity,
        config: baseConfig,
        db: mockDb,
      });

      expect(res.speech).toContain('três tentativas');
      expect(res.speech).toContain('aplicativo Luisices');
      expect(res.shouldEndSession).toBe(true);
    });

    it('deve listar pedidos recentes e retornar card visual no ListRecentOrdersIntent', async () => {
      const mockDb = createMockDb({
        orders: {
          'order-1': {
            orderNumber: '#2026-0001',
            userId: identity.uid,
            customerName: 'Maria',
            productName: 'cadernos',
            quantity: 20,
            price: 300,
            status: 'pending',
            createdAt: { toDate: () => new Date('2026-09-28T10:00:00Z') },
            deletedAt: null,
          },
          'order-2': {
            orderNumber: '#2026-0002',
            userId: identity.uid,
            customerName: 'Ana',
            productName: 'caixinhas',
            quantity: 10,
            price: 50,
            status: 'in_production',
            createdAt: { toDate: () => new Date('2026-09-29T09:00:00Z') },
            deletedAt: null,
          },
        },
      });

      const envelope = {
        request: {
          type: 'IntentRequest',
          intent: { name: 'ListRecentOrdersIntent' },
        },
        session: { sessionId: 'session-orders-query' },
      };

      const res = await handleAlexaDialog({
        envelope,
        identity,
        config: baseConfig,
        db: mockDb,
      });

      expect(res.speech).toContain('Encontrei 2 pedidos recentes');
      expect(res.speech).toContain('10 caixinhas para Ana');
      expect(res.speech).toContain('20 cadernos para Maria');
      expect(res.speech).toContain('Deseja criar um novo pedido?');
      expect(res.shouldEndSession).toBe(false);

      // Card visual
      expect(res.card).toBeDefined();
      expect(res.card.type).toBe('Simple');
      expect(res.card.title).toBe('Últimos Pedidos - Luisices');
      expect(res.card.content).toContain('Ana');
      expect(res.card.content).toContain('Maria');
    });

    it('deve responder amigavelmente quando não houver pedidos cadastrados', async () => {
      const mockDb = createMockDb({ orders: {} });

      const envelope = {
        request: {
          type: 'IntentRequest',
          intent: { name: 'ListRecentOrdersIntent' },
        },
        session: { sessionId: 'session-no-orders' },
      };

      const res = await handleAlexaDialog({
        envelope,
        identity,
        config: baseConfig,
        db: mockDb,
      });

      expect(res.speech).toContain('Você ainda não possui pedidos cadastrados');
      expect(res.shouldEndSession).toBe(false);
    });

    it('deve orientar criação de pedido quando o usuário responder sim sem rascunho ativo', async () => {
      const mockDb = createMockDb();

      const envelope = {
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
        session: { sessionId: 'session-yes-no-draft' },
      };

      const res = await handleAlexaDialog({
        envelope,
        identity,
        config: baseConfig,
        db: mockDb,
      });

      expect(res.speech).toContain('Para qual cliente e produto deseja criar o pedido?');
      expect(res.shouldEndSession).toBe(false);
    });

    it('deve encerrar educadamente quando o usuário responder não sem rascunho ativo', async () => {
      const mockDb = createMockDb();

      const envelope = {
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.NoIntent' },
        },
        session: { sessionId: 'session-no-no-draft' },
      };

      const res = await handleAlexaDialog({
        envelope,
        identity,
        config: baseConfig,
        db: mockDb,
      });

      expect(res.speech).toContain('Até logo!');
      expect(res.shouldEndSession).toBe(true);
    });
  });

  describe('ProvideCustomerOnlyIntent vs ProvideCustomerIntent', () => {
    it('ProvideCustomerOnlyIntent preenche o cliente em rascunho ativo autorizado', async () => {
      const draftId = 'draft-cust-only-active';
      const sessionId = 'session-cust-only';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: baseConfig.environment,
            customer: null,
            product: 'caixinhas',
            quantity: 10,
            deliveryDate: '2026-10-10',
            price: 100,
            state: 'collecting',
            expectedInput: 'customer',
            revision: 1,
            expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
          },
        },
      });

      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 1 } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideCustomerOnlyIntent',
            slots: { customer: { value: 'Maria' } },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });
      const updatedDraft = mockDb.store.alexaDrafts[draftId];
      expect(updatedDraft.customer).toBe('Maria');
      expect(updatedDraft.state).toBe('awaiting_confirmation');
      expect(res.speech).toContain('10 caixinhas para Maria');
      expect(res.speech).toContain('Confirmar?');
    });

    it('ProvideCustomerOnlyIntent sem rascunho ativo não cria rascunho e responde orientando', async () => {
      const mockDb = createMockDb();

      const envelope = {
        session: { sessionId: 'session-cust-only-no-draft' },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideCustomerOnlyIntent',
            slots: { customer: { value: 'Maria' } },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });
      expect(res.speech).toContain('Não encontrei nenhum pedido em andamento. Para começar, diga criar pedido.');
      // Nenhum rascunho foi criado
      expect(Object.keys(mockDb.store.alexaDrafts)).toHaveLength(0);
    });

    it('ProvideCustomerOnlyIntent com rascunho expirado não altera o rascunho', async () => {
      const draftId = 'draft-cust-only-expired';
      const sessionId = 'session-cust-expired';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: baseConfig.environment,
            customer: null,
            product: 'caixinhas',
            quantity: 10,
            state: 'collecting',
            revision: 1,
            expiresAt: { toDate: () => new Date(Date.now() - 1000) }, // Expirado!
          },
        },
      });

      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 1 } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideCustomerOnlyIntent',
            slots: { customer: { value: 'Maria' } },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });
      expect(res.speech).toContain('Não encontrei nenhum pedido em andamento');
      // O rascunho expirado não teve o cliente alterado
      expect(mockDb.store.alexaDrafts[draftId].customer).toBeNull();
    });

    it('ProvideCustomerIntent com "para {customer}" continua funcionando normalmente', async () => {
      const draftId = 'draft-cust-normal';
      const sessionId = 'session-cust-normal';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: baseConfig.environment,
            customer: null,
            product: 'cadernos',
            quantity: 5,
            deliveryDate: '2026-10-10',
            price: 50,
            state: 'collecting',
            expectedInput: 'customer',
            revision: 1,
            expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
          },
        },
      });

      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 1 } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideCustomerIntent',
            slots: { customer: { value: 'João' } },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });
      expect(mockDb.store.alexaDrafts[draftId].customer).toBe('João');
      expect(res.speech).toContain('5 cadernos para João');
    });

    it('deve interpretar "28" ou "vinte e oito" (number 20, cents 8) como quantidade 28 quando aguarda quantidade', async () => {
      const draftId = 'draft-qty-28';
      const sessionId = 'session-qty-28';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: baseConfig.environment,
            customer: 'Luis',
            product: 'topos de bolo',
            quantity: null,
            deliveryDate: null,
            price: null,
            state: 'collecting',
            expectedInput: 'quantity',
            revision: 1,
            expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
          },
        },
      });

      // Simula a Alexa decompondo "vinte e oito" em number=20 e cents=8 em ProvideNumberIntent
      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 1, expectedInput: 'quantity' } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideNumberIntent',
            slots: {
              number: { value: '20' },
              cents: { value: '8' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });
      // Deve gravar quantidade = 28 no rascunho
      expect(mockDb.store.alexaDrafts[draftId].quantity).toBe(28);
      // NUNCA deve perguntar se 20 reais e 8 centavos é total ou cada
      expect(res.speech).not.toContain('20 reais');
      expect(res.speech).not.toContain('8 centavos');
      expect(res.speech).not.toContain('cada ou');
      // Deve avançar para a data de entrega
      expect(res.speech).toContain('data de entrega');
    });

    it('deve interpretar número puro em ProvideQuantityIntent com "{quantity}"', async () => {
      const draftId = 'draft-qty-direct';
      const sessionId = 'session-qty-direct';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: baseConfig.environment,
            customer: 'Luis',
            product: 'topos de bolo',
            quantity: null,
            deliveryDate: null,
            price: null,
            state: 'collecting',
            expectedInput: 'quantity',
            revision: 1,
            expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
          },
        },
      });

      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 1, expectedInput: 'quantity' } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideQuantityIntent',
            slots: {
              quantity: { value: '28' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });
      expect(mockDb.store.alexaDrafts[draftId].quantity).toBe(28);
      expect(res.speech).toContain('data de entrega');
    });

    it('deve pedir esclarecimento para valor ambíguo e continuar aceitando decimais explícitos', () => {
      const res28 = parseAndValidatePrice('20 e 8');
      expect(res28.valid).toBe(false);
      expect(res28.error).toContain('Valor ambíguo');

      const res35 = parseAndValidatePrice('30 e 5');
      expect(res35.valid).toBe(false);
      expect(res35.error).toContain('Valor ambíguo');

      const res105 = parseAndValidatePrice('100 e 5');
      expect(res105.valid).toBe(false);
      expect(res105.error).toContain('Valor ambíguo');

      // Centavos reais com decimal explícito continuam funcionando
      const res350 = parseAndValidatePrice('3 e 50');
      expect(res350.valid).toBe(true);
      expect(res350.price).toBe(3.5);
    });
  });
});

import { describe, it, expect } from 'vitest';
const {
  formatDatePtBr,
  formatCurrencyPtBr,
  normalizeText,
  searchUserCatalog,
  handleAlexaDialog,
} = require('../../../functions/alexa/dialog');

describe('Alexa: Diálogo Natural, Contextual e Catálogo Controlado (Fases 1 a 5)', () => {
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
      products: {},
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
          if (!store[c]?.[dId]) throw new Error(`Not found: ${docKey}`);
          store[c][dId] = { ...store[c][dId], ...data };
        },
      };
    };

    return {
      store,
      doc: (path: string) => docGetter(path),
      collection: (col: string) => ({
        doc: (id: string) => docGetter(col, id),
        add: async (data: any) => {
          store[col] = store[col] || {};
          const id = 'doc-' + Math.random().toString(36).slice(2);
          store[col][id] = data;
          return { id };
        },
        where: (field: string, op: string, val: any) => {
          const createQuery = (sortConfig?: { field: string; dir: 'asc' | 'desc' }, limitNum?: number) => ({
            orderBy: (sortField: string, dir: 'asc' | 'desc' = 'asc') =>
              createQuery({ field: sortField, dir }, limitNum),
            limit: (n: number) => createQuery(sortConfig, n),
            get: async () => {
              let docs: any[] = [];
              const colStore = store[col] || {};
              for (const [id, data] of Object.entries(colStore) as any[]) {
                if (data && data[field] === val) {
                  docs.push({ id, data: () => data });
                }
              }
              if (sortConfig) {
                docs.sort((a, b) => {
                  const dA = a.data();
                  const dB = b.data();
                  const vA = dA[sortConfig.field]?.toMillis ? dA[sortConfig.field].toMillis() : (dA[sortConfig.field] || 0);
                  const vB = dB[sortConfig.field]?.toMillis ? dB[sortConfig.field].toMillis() : (dB[sortConfig.field] || 0);
                  return sortConfig.dir === 'desc' ? vB - vA : vA - vB;
                });
              }
              const finalDocs = limitNum !== undefined ? docs.slice(0, limitNum) : docs;
              return {
                empty: finalDocs.length === 0,
                forEach: (cb: any) => finalDocs.forEach(cb),
              };
            },
          });
          return createQuery();
        },
      }),

      runTransaction: async (cb: any) => cb({
        get: async (ref: any) => ref.get(),
        set: (ref: any, data: any, options: any) => ref.set(data, options),
        update: (ref: any, data: any) => ref.update(data),
      }),
    };
  };

  describe('1. Fluxo Completo de Diálogo Natural (Resultado Esperado)', () => {
    it('executa conversa completa com criação, resposta contextual, correção e confirmação autorizada', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-natural-1';

      // Turno 1: Usuário cria pedido com produto, cliente, quantidade e preço unitário
      const turn1Envelope = {
        session: { sessionId },
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

      const res1 = await handleAlexaDialog({ envelope: turn1Envelope, identity, config: baseConfig, db: mockDb });
      expect(res1.shouldEndSession).toBe(false);
      // Feedback conversacional natural reconhecendo o que foi dito e perguntando a data
      expect(res1.speech).toBe('São 10 unidades a 10 reais cada, total de 100 reais. Para quando é a entrega?');
      expect(res1.sessionAttributes?.expectedInput).toBe('deliveryDate');
      const draftId = res1.sessionAttributes?.draftId;
      expect(draftId).toBeDefined();

      // Turno 2: Usuário informa data de entrega
      const turn2Envelope = {
        session: {
          sessionId,
          attributes: { draftId, revision: res1.sessionAttributes?.revision, expectedInput: 'deliveryDate' },
        },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideDeliveryDateIntent',
            slots: {
              deliveryDate: { value: '2026-10-25' },
            },
          },
        },
      };

      const res2 = await handleAlexaDialog({ envelope: turn2Envelope, identity, config: baseConfig, db: mockDb });
      expect(res2.shouldEndSession).toBe(false);
      expect(res2.speech).toContain('10 topo de bolo para Maria a 10 reais cada, total de 100 reais, entrega em 25 de outubro de 2026. Confirmar?');
      expect(res2.sessionAttributes?.expectedInput).toBe('confirmation');

      // Turno 3: Usuário corrige a quantidade: "Na verdade são doze"
      const turn3Envelope = {
        session: {
          sessionId,
          attributes: { draftId, revision: res2.sessionAttributes?.revision, expectedInput: 'confirmation' },
        },
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

      const res3 = await handleAlexaDialog({ envelope: turn3Envelope, identity, config: baseConfig, db: mockDb });
      expect(res3.shouldEndSession).toBe(false);
      // Reconhece a mudança e recalcula total para 120 reais
      expect(res3.speech).toContain('12 unidades, total de 120 reais.');
      expect(res3.speech).toContain('12 topo de bolo para Maria a 10 reais cada, total de 120 reais, entrega em 25 de outubro de 2026. Confirmar?');
      expect(res3.sessionAttributes?.expectedInput).toBe('confirmation');
      expect(res3.sessionAttributes?.revision).toBe(4);

      // Turno 4: Usuário confirma o pedido com voz autorizada
      const turn4Envelope = {
        session: {
          sessionId,
          attributes: { draftId, revision: res3.sessionAttributes?.revision, expectedInput: 'confirmation' },
        },
        context: {
          System: {
            person: { personId: identity.personId },
          },
        },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'AMAZON.YesIntent',
          },
        },
      };

      const mockAuthService = {
        getUser: async (u: string) => ({ uid: u, disabled: false }),
      };

      const res4 = await handleAlexaDialog({
        envelope: turn4Envelope,
        identity,
        config: baseConfig,
        db: mockDb,
        authService: mockAuthService,
      });
      expect(res4.shouldEndSession).toBe(true);
      expect(res4.speech).toContain('com o número');

      // Verifica no mockDb
      const committedDraft = mockDb.store.alexaDrafts[draftId];
      expect(committedDraft.state).toBe('committed');
      expect(committedDraft.quantity).toBe(12);
      expect(committedDraft.price).toBe(120);
      expect(committedDraft.totalPriceCents).toBe(12000);
      expect(committedDraft.unitPriceCents).toBe(1000);
    });
  });

  describe('2. Correções Naturais de Outros Campos', () => {
    it('troca o cliente mantendo os demais dados e confirma', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-cust-change';

      // Cria rascunho completo
      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              quantity: { value: '10' },
              unitPrice: { value: '10' },
              deliveryDate: { value: '2026-10-25' },
            },
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      const draftId = res1.sessionAttributes?.draftId;

      // Troca cliente para Mariana
      const env2 = {
        session: { sessionId, attributes: { draftId, revision: res1.sessionAttributes?.revision } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideCustomerIntent',
            slots: {
              customer: { value: 'Mariana' },
            },
          },
        },
      };

      const res2 = await handleAlexaDialog({ envelope: env2, identity, config: baseConfig, db: mockDb });
      expect(res2.speech).toContain('Cliente alterado para Mariana.');
      expect(res2.speech).toContain('para Mariana');
      const draft = mockDb.store.alexaDrafts[draftId];
      expect(draft.customer).toBe('Mariana');
      expect(draft.quantity).toBe(10);
      expect(draft.price).toBe(100);
    });

    it('mantém quantidade mas altera unitário recalculando o total', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-unit-change';

      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              quantity: { value: '10' },
              unitPrice: { value: '10' },
              deliveryDate: { value: '2026-10-25' },
            },
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      const draftId = res1.sessionAttributes?.draftId;

      // Altera unitário para 12 reais cada
      const env2 = {
        session: { sessionId, attributes: { draftId, revision: res1.sessionAttributes?.revision } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideUnitPriceIntent',
            slots: {
              unitPrice: { value: '12' },
            },
          },
        },
      };

      const res2 = await handleAlexaDialog({ envelope: env2, identity, config: baseConfig, db: mockDb });
      expect(res2.speech).toContain('Alterado para 12 reais cada, total de 120 reais.');
      const draft = mockDb.store.alexaDrafts[draftId];
      expect(draft.unitPriceCents).toBe(1200);
      expect(draft.totalPriceCents).toBe(12000);
      expect(draft.price).toBe(120);
    });

    it('muda de modo unitário para modo total com valor explícito pelo pedido inteiro', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-mode-switch';

      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              quantity: { value: '10' },
              unitPrice: { value: '10' },
              deliveryDate: { value: '2026-10-25' },
            },
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      const draftId = res1.sessionAttributes?.draftId;

      // Usuário define 85 reais no total pelo pedido inteiro
      const env2 = {
        session: { sessionId, attributes: { draftId, revision: res1.sessionAttributes?.revision } },
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

      const res2 = await handleAlexaDialog({ envelope: env2, identity, config: baseConfig, db: mockDb });
      expect(res2.speech).toContain('Alterado para total de 85 reais.');
      const draft = mockDb.store.alexaDrafts[draftId];
      expect(draft.pricingMode).toBe('total');
      expect(draft.totalPriceCents).toBe(8500);
      expect(draft.price).toBe(85);
      expect(draft.unitPriceCents).toBeNull();
    });
  });

  describe('3. Diferença entre "Não" Sozinho e Correção Numérica ("Não, são doze")', () => {
    it('"Não" sozinho em awaiting_confirmation pede o campo a corrigir sem cancelar o pedido', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-no-alone';

      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              quantity: { value: '10' },
              unitPrice: { value: '10' },
              deliveryDate: { value: '2026-10-25' },
            },
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      const draftId = res1.sessionAttributes?.draftId;
      expect(mockDb.store.alexaDrafts[draftId].state).toBe('awaiting_confirmation');

      // Usuário responde "Não"
      const envNo = {
        session: { sessionId, attributes: { draftId, revision: res1.sessionAttributes?.revision } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'AMAZON.NoIntent',
          },
        },
      };

      const resNo = await handleAlexaDialog({ envelope: envNo, identity, config: baseConfig, db: mockDb });
      expect(resNo.shouldEndSession).toBe(false);
      expect(resNo.speech).toBe('Qual dado você deseja corrigir? Diga o cliente, produto, quantidade, entrega ou valor.');
      expect(mockDb.store.alexaDrafts[draftId].state).toBe('collecting');

      // Usuário informa a correção: "na verdade são 15 unidades"
      const envQty = {
        session: { sessionId, attributes: { draftId, revision: resNo.sessionAttributes?.revision } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideQuantityIntent',
            slots: {
              quantity: { value: '15' },
            },
          },
        },
      };

      const resQty = await handleAlexaDialog({ envelope: envQty, identity, config: baseConfig, db: mockDb });
      expect(resQty.shouldEndSession).toBe(false);
      expect(resQty.speech).toContain('15 unidades, total de 150 reais.');
      expect(mockDb.store.alexaDrafts[draftId].state).toBe('awaiting_confirmation');
      expect(mockDb.store.alexaDrafts[draftId].quantity).toBe(15);
      expect(mockDb.store.alexaDrafts[draftId].price).toBe(150);
    });

    it('"Não" durante estado collecting cancela o pedido com encerramento', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-cancel-collecting';

      // Cria rascunho incompleto (apenas cliente)
      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
            },
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      const draftId = res1.sessionAttributes?.draftId;
      expect(mockDb.store.alexaDrafts[draftId].state).toBe('collecting');

      // Diz "Não"
      const envNo = {
        session: { sessionId, attributes: { draftId, revision: res1.sessionAttributes?.revision } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'AMAZON.NoIntent',
          },
        },
      };

      const resNo = await handleAlexaDialog({ envelope: envNo, identity, config: baseConfig, db: mockDb });
      expect(resNo.shouldEndSession).toBe(true);
      expect(resNo.speech).toBe('Pedido cancelado. Até logo.');
    });
  });

  describe('4. Contexto Persistido (expectedInput) e Regras da Fase 1', () => {
    it('número curto sem qualificador resolve para quantity se expectedInput for quantity', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-expected-qty';

      // Rascunho com cliente e produto faltando quantidade
      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
            },
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      expect(res1.speech).toBe('Qual é a quantidade de itens?');
      expect(res1.sessionAttributes?.expectedInput).toBe('quantity');
      const draftId = res1.sessionAttributes?.draftId;

      // Resposta chega como número no slot genérico de preço (número puro "8")
      const env2 = {
        session: { sessionId, attributes: { draftId, revision: res1.sessionAttributes?.revision, expectedInput: 'quantity' } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvidePriceIntent',
            slots: {
              price: { value: '8' },
            },
          },
        },
      };

      const res2 = await handleAlexaDialog({ envelope: env2, identity, config: baseConfig, db: mockDb });
      const draft = mockDb.store.alexaDrafts[draftId];
      expect(draft.quantity).toBe(8);
      // Avança para o próximo campo faltante (data de entrega)
      expect(res2.speech).toBe('Qual é a data de entrega?');
    });

    it('Regra 4: "cada" ou "no total" sem valor pendente rejeita inventar valor e pede o valor do pedido', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-rule-4';

      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ClarifyPriceUnitIntent',
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      expect(res1.shouldEndSession).toBe(false);
      expect(res1.speech).toContain('Não há nenhum valor aguardando definição');
      expect(res1.sessionAttributes?.expectedInput).toBe('totalPrice');
    });
  });

  describe('5. Repetir Pedido (RepeatOrderIntent) e Fallback Contextual', () => {
    it('RepeatOrderIntent relata campos já preenchidos e o que falta', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-repeat-1';

      // Cria pedido com cliente, produto e quantidade
      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              quantity: { value: '10' },
            },
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      const draftId = res1.sessionAttributes?.draftId;

      // Pede para repetir
      const envRepeat = {
        session: { sessionId, attributes: { draftId, revision: res1.sessionAttributes?.revision } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'RepeatOrderIntent',
          },
        },
      };

      const resRepeat = await handleAlexaDialog({ envelope: envRepeat, identity, config: baseConfig, db: mockDb });
      expect(resRepeat.shouldEndSession).toBe(false);
      expect(resRepeat.speech).toContain('cliente Maria');
      expect(resRepeat.speech).toContain('produto topo de bolo');
      expect(resRepeat.speech).toContain('10 unidades');
      expect(resRepeat.speech).toContain('Falta informar a data de entrega.');
      expect(resRepeat.sessionAttributes?.expectedInput).toBe('deliveryDate');
    });

    it('AMAZON.FallbackIntent orienta o usuário de acordo com expectedInput', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-fallback-context';

      // Fallback esperando data de entrega
      const envFallback = {
        session: { sessionId, attributes: { expectedInput: 'deliveryDate' } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'AMAZON.FallbackIntent',
          },
        },
      };

      const res = await handleAlexaDialog({ envelope: envFallback, identity, config: baseConfig, db: mockDb });
      expect(res.shouldEndSession).toBe(false);
      expect(res.speech).toContain('Diga a data de entrega, por exemplo: dia quinze de outubro.');
    });
  });

  describe('6. Catálogo de Produtos com Acesso Controlado (Fase 4)', () => {
    it('sugere preço unitário do catálogo se usuário não informou preço e aplica ao dizer Sim', async () => {
      const mockDb = createMockDb({
        products: {
          'prod-1': {
            userId: 'uid-amanda',
            name: 'Topo de Bolo',
            unitPrice: 15.0,
          },
        },
      });
      const sessionId = 'session-catalog-1';

      // Usuário cria pedido sem informar preço
      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              quantity: { value: '10' },
            },
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      expect(res1.shouldEndSession).toBe(false);
      expect(res1.speech).toBe('Encontrei Topo de Bolo no seu catálogo por 15 reais cada. Deseja usar esse valor?');
      expect(res1.sessionAttributes?.expectedInput).toBe('suggestedPrice');
      const draftId = res1.sessionAttributes?.draftId;

      // Usuário aceita com "Sim"
      const envYes = {
        session: { sessionId, attributes: { draftId, revision: res1.sessionAttributes?.revision, expectedInput: 'suggestedPrice' } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'AMAZON.YesIntent',
          },
        },
      };

      const resYes = await handleAlexaDialog({ envelope: envYes, identity, config: baseConfig, db: mockDb });
      const draft = mockDb.store.alexaDrafts[draftId];
      expect(draft.pricingMode).toBe('unit');
      expect(draft.unitPriceCents).toBe(1500);
      expect(draft.totalPriceCents).toBe(15000);
      expect(draft.price).toBe(150);
      expect(draft.catalogProductId).toBe('prod-1');
      // Pergunta o próximo campo faltante (data de entrega)
      expect(resYes.speech).toContain('Para quando é a entrega?');
    });

    it('não substitui preço fornecido pelo usuário pelo preço do catálogo', async () => {
      const mockDb = createMockDb({
        products: {
          'prod-1': {
            userId: 'uid-amanda',
            name: 'Topo de Bolo',
            unitPrice: 20.0,
          },
        },
      });
      const sessionId = 'session-catalog-override';

      // Usuário informou explicitamente 12 reais cada
      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              quantity: { value: '5' },
              unitPrice: { value: '12' },
            },
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      const draftId = res1.sessionAttributes?.draftId;
      const draft = mockDb.store.alexaDrafts[draftId];
      // Preço do usuário é 12 reais cada, total 60 reais (NÃO 20 do catálogo)
      expect(draft.unitPriceCents).toBe(1200);
      expect(draft.price).toBe(60);
      expect(draft.catalogProductId).toBe('prod-1');
    });

    it('troca de produto limpa preço sugerido do produto anterior sem carregar silenciosamente', async () => {
      const mockDb = createMockDb({
        products: {
          'prod-1': {
            userId: 'uid-amanda',
            name: 'Topo de Bolo',
            unitPrice: 15.0,
          },
          'prod-2': {
            userId: 'uid-amanda',
            name: 'Caixinhas',
            unitPrice: 0, // sem preço
          },
        },
      });
      const sessionId = 'session-product-change-clean';

      // Usuário inicia com topo de bolo e aceita preço sugerido
      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              quantity: { value: '10' },
              deliveryDate: { value: '2026-10-25' },
            },
          },
        },
      };
      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      const draftId = res1.sessionAttributes?.draftId;

      // Aceita com Sim
      await handleAlexaDialog({
        envelope: {
          session: { sessionId, attributes: { draftId, revision: res1.sessionAttributes?.revision, expectedInput: 'suggestedPrice' } },
          request: { type: 'IntentRequest', intent: { name: 'AMAZON.YesIntent' } },
        },
        identity,
        config: baseConfig,
        db: mockDb,
      });

      // Agora usuário troca produto para 'caixinhas'
      const envChange = {
        session: { sessionId, attributes: { draftId, revision: 2 } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideProductIntent',
            slots: {
              product: { value: 'caixinhas' },
            },
          },
        },
      };

      const resChange = await handleAlexaDialog({ envelope: envChange, identity, config: baseConfig, db: mockDb });
      const draft = mockDb.store.alexaDrafts[draftId];
      expect(draft.product).toBe('Caixinhas');
      expect(draft.catalogProductId).toBe('prod-2');
      // Preço de R$ 15 do produto anterior foi limpado e NÃO mantido silenciosamente
      expect(draft.price).toBeNull();
      expect(draft.unitPriceCents).toBeNull();
      expect(resChange.speech).toBe('Qual é o valor total do pedido?');
    });

    it('catálogo de outro usuário nunca é acessado (isolamento estrito)', async () => {
      const mockDb = createMockDb({
        products: {
          'prod-other': {
            userId: 'uid-other-user',
            name: 'Produto Secreto',
            unitPrice: 50.0,
          },
        },
      });

      const matches = await searchUserCatalog(mockDb, 'uid-amanda', 'Produto Secreto');
      expect(matches).toHaveLength(0);
    });
  });

  describe('7. Imutabilidade de awaiting_app_approval', () => {
    it('rejeita qualquer alteração por voz quando pedido está em awaiting_app_approval', async () => {
      const draftId = 'draft-app-locked';
      const sessionId = 'session-app-locked';
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
            product: 'Topo de Bolo',
            quantity: 10,
            deliveryDate: '2026-10-25',
            price: 100,
            expiresAt: { toDate: () => new Date(Date.now() + 60000) },
          },
        },
      });

      const envelope = {
        session: { sessionId, attributes: { draftId } },
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
      expect(res.shouldEndSession).toBe(true);
      expect(res.speech).toContain('Este pedido já foi enviado para aprovação no aplicativo e não pode ser alterado por voz');
      // Garante que o rascunho não foi modificado
      expect(mockDb.store.alexaDrafts[draftId].state).toBe('awaiting_app_approval');
      expect(mockDb.store.alexaDrafts[draftId].quantity).toBe(10);
    });
  });

  describe('8. Validação das Recomendações e Correções de Revisão (P1 e P2)', () => {
    it('P1.1: Preço alternativo limpa suggestedPriceCents e permite confirmação com YesIntent', async () => {
      const draftId = 'draft-p1-1';
      const sessionId = 'session-p1-1';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            mode: 'voice_confirm',
            state: 'collecting',
            customer: 'Maria',
            product: 'Topo Especial',
            quantity: 10,
            deliveryDate: '2026-10-25',
            suggestedPriceCents: 1000,
            suggestedProductName: 'Topo Especial',
            price: null,
            expectedInput: 'suggestedPrice',
            expiresAt: { toDate: () => new Date(Date.now() + 60000) },
          },
        },
      });

      // 1. Usuário envia preço genérico de 20 reais
      const envPrice = {
        session: { sessionId, attributes: { draftId } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvidePriceIntent',
            slots: { price: { value: '20 reais' } },
          },
        },
      };

      const resPrice = await handleAlexaDialog({ envelope: envPrice, identity, config: baseConfig, db: mockDb });
      expect(resPrice.speech).toContain('cada');
      expect(resPrice.speech).toContain('no total');

      // 2. Usuário esclarece "cada" via ClarifyPriceUnitIntent
      const envClarify = {
        session: { sessionId, attributes: { draftId } },
        request: {
          type: 'IntentRequest',
          intent: { name: 'ClarifyPriceUnitIntent' },
        },
      };

      const resClarify = await handleAlexaDialog({ envelope: envClarify, identity, config: baseConfig, db: mockDb });
      const draftAfterClarify = mockDb.store.alexaDrafts[draftId];

      expect(draftAfterClarify.suggestedPriceCents).toBeNull();
      expect(draftAfterClarify.pricingMode).toBe('unit');
      expect(draftAfterClarify.unitPriceCents).toBe(2000);
      expect(draftAfterClarify.price).toBe(200);
      expect(draftAfterClarify.state).toBe('awaiting_confirmation');
      expect(resClarify.speech).toContain('total de 200 reais');

      // 3. Usuário confirma com YesIntent
      const envYes = {
        session: { sessionId, attributes: { draftId, revision: resClarify.sessionAttributes?.revision } },
        context: {
          System: {
            person: { personId: identity.personId },
          },
        },
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const mockAuthService = {
        getUser: async (u: string) => ({ uid: u, disabled: false }),
      };

      const resYes = await handleAlexaDialog({ envelope: envYes, identity, config: baseConfig, db: mockDb, authService: mockAuthService });
      expect(resYes.speech).toContain('com o número');
      expect(mockDb.store.alexaDrafts[draftId].state).toBe('committed');
    });

    it('P1.2: Produto ambíguo no catálogo não é selecionado automaticamente (preserva texto original)', async () => {
      const mockDb = createMockDb({
        products: {
          'prod-azul': {
            userId: identity.uid,
            name: 'Topo azul',
            unitPrice: 15.0,
          },
          'prod-rosa': {
            userId: identity.uid,
            name: 'Topo rosa',
            unitPrice: 20.0,
          },
        },
      });

      const envelope = {
        session: { sessionId: 'sess-ambiguous', attributes: {} },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Paula' },
              product: { value: 'Topo' },
              quantity: { value: '5' },
              deliveryDate: { value: '2026-10-25' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });
      const draftKeys = Object.keys(mockDb.store.alexaDrafts);
      const draft = mockDb.store.alexaDrafts[draftKeys[0]];

      // Produto deve ser preservado como 'Topo', sem forçar 'Topo azul' nem catalogProductId arbitrário
      expect(draft.product).toBe('Topo');
      expect(draft.catalogProductId).toBeNull();
      expect(draft.suggestedPriceCents).toBeNull();
      expect(res.speech).toBe('Qual é o valor total do pedido?');
    });

    it('P1.3: Contexto expectedInput gravado no Firestore recupera fluxo mesmo sem sessionAttributes', async () => {
      const draftId = 'draft-ctx-fs';
      const sessionId = 'session-ctx-fs';
      const mockDb = createMockDb();

      // 1. Criar pedido sem valor
      const env1 = {
        session: { sessionId, attributes: {} },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Ana' },
              product: { value: 'Caderno' },
              quantity: { value: '2' },
              deliveryDate: { value: '2026-10-25' },
            },
          },
        },
      };

      await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      const draftKeys = Object.keys(mockDb.store.alexaDrafts);
      const createdDraftId = draftKeys[0];
      const draftInFs = mockDb.store.alexaDrafts[createdDraftId];

      // expectedInput deve estar persistido no Firestore
      expect(draftInFs.expectedInput).toBe('totalPrice');

      // 2. Usuário responde "50 reais" sem sessionAttributes (sessão perdeu atributos de contexto)
      const env2 = {
        session: { sessionId, attributes: { draftId: createdDraftId } }, // sessionAttributes.expectedInput omitido propositalmente
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvidePriceIntent',
            slots: { price: { value: '50 reais' } },
          },
        },
      };

      const res2 = await handleAlexaDialog({ envelope: env2, identity, config: baseConfig, db: mockDb });
      const updatedDraft = mockDb.store.alexaDrafts[createdDraftId];

      // Graças à persistência no Firestore, "50 reais" foi inferido como totalPrice diretamente
      expect(updatedDraft.price).toBe(50);
      expect(updatedDraft.pricingMode).toBe('total');
      expect(updatedDraft.state).toBe('awaiting_confirmation');
      expect(res2.speech).toContain('total de 50 reais');
    });

    it('P2.2: Aceitação de preço de catálogo via YesIntent bloqueia se total exceder R$ 10.000,00', async () => {
      const draftId = 'draft-limit-catalog';
      const sessionId = 'session-limit-catalog';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            state: 'collecting',
            customer: 'Empresa X',
            product: 'Brinde Luxo',
            quantity: 200,
            deliveryDate: '2026-11-01',
            suggestedPriceCents: 6000, // R$ 60,00 * 200 = R$ 12.000,00 (> 10.000)
            suggestedProductName: 'Brinde Luxo',
            price: null,
            expectedInput: 'suggestedPrice',
            expiresAt: { toDate: () => new Date(Date.now() + 60000) },
          },
        },
      });

      const envYes = {
        session: { sessionId, attributes: { draftId } },
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const res = await handleAlexaDialog({ envelope: envYes, identity, config: baseConfig, db: mockDb });
      expect(res.speech).toContain('excede o limite máximo permitido de dez mil reais');
      expect(mockDb.store.alexaDrafts[draftId].price).toBeNull();
    });

    it('P2.3: RepeatOrderIntent aplica validações estritas de ambiente, binding, expiração e estados terminais', async () => {
      const sessionId = 'session-repeat-sec';
      const mockDb = createMockDb({
        alexaDrafts: {
          'draft-expired': {
            draftId: 'draft-expired',
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            state: 'collecting',
            customer: 'Carlos',
            product: 'Planner',
            expiresAt: { toDate: () => new Date(Date.now() - 60000) }, // Expirado
          },
          'draft-other-env': {
            draftId: 'draft-other-env',
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'prod', // Outro ambiente
            state: 'collecting',
            customer: 'Carlos',
            product: 'Planner',
            expiresAt: { toDate: () => new Date(Date.now() + 60000) },
          },
          'draft-terminal': {
            draftId: 'draft-terminal',
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            state: 'committed', // Terminal
            customer: 'Carlos',
            product: 'Planner',
            expiresAt: { toDate: () => new Date(Date.now() + 60000) },
          },
        },
      });

      for (const targetDraftId of ['draft-expired', 'draft-other-env', 'draft-terminal']) {
        const env = {
          session: { sessionId, attributes: { draftId: targetDraftId } },
          request: {
            type: 'IntentRequest',
            intent: { name: 'RepeatOrderIntent' },
          },
        };

        const res = await handleAlexaDialog({ envelope: env, identity, config: baseConfig, db: mockDb });
        expect(res.speech).toContain('Ainda não temos dados para este pedido');
      }
    });
  });

  describe('8. Validações da Revisão R2 (Prioridades P1, P2 e P3)', () => {
    it('P1: Contexto de rascunho do Firestore prevalece sobre sessionAttributes conflitante', async () => {
      const sessionId = 'session-p1-conflict';
      const draftId = 'draft-p1-conflict';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            state: 'collecting',
            customer: 'Maria',
            product: 'Topo de bolo',
            quantity: 10,
            price: null,
            expectedInput: 'totalPrice',
            expiresAt: { toDate: () => new Date(Date.now() + 60000) },
          },
        },
      });

      // Envelope com atributo de sessão obsoleto 'expectedInput: quantity', mas banco espera 'totalPrice'
      // Entrada com valor '20 reais' (slot price genérico)
      const env = {
        session: {
          sessionId,
          attributes: { draftId, expectedInput: 'quantity' }, // Conflito intencional
        },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'OrderIntent',
            slots: {
              price: { name: 'price', value: '20' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope: env, identity, config: baseConfig, db: mockDb });

      const updatedDraft = mockDb.store.alexaDrafts[draftId];
      // A quantidade DEVE permanecer 10 (não pode ter sido sobrescrita por 20)
      expect(updatedDraft.quantity).toBe(10);
      // O preço DEVE ter sido resolvido como valor total (20 reais)
      expect(updatedDraft.price).toBe(20);
      expect(updatedDraft.totalPriceCents).toBe(2000);
      expect(updatedDraft.pricingMode).toBe('total');
      // Próxima pergunta deve ser sobre data de entrega (próximo campo faltante)
      expect(res.sessionAttributes?.expectedInput).toBe('deliveryDate');
      expect(res.speech).toContain('Para quando é a entrega?');
    });

    it('P2: YesIntent revalida e aceita produto disponível no catálogo com preço inalterado', async () => {
      const sessionId = 'session-p2-catalog-valid';
      const draftId = 'draft-p2-catalog-valid';
      const mockDb = createMockDb({
        products: {
          'prod-topo': {
            userId: identity.uid,
            name: 'Topo de Bolo',
            unitPrice: 15.0,
          },
        },
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            state: 'collecting',
            customer: 'Maria',
            product: 'Topo de Bolo',
            quantity: 2,
            price: null,
            suggestedPriceCents: 1500,
            suggestedProductName: 'Topo de Bolo',
            catalogProductId: 'prod-topo',
            expectedInput: 'suggestedPrice',
            expiresAt: { toDate: () => new Date(Date.now() + 60000) },
          },
        },
      });

      const env = {
        session: {
          sessionId,
          attributes: { draftId, expectedInput: 'suggestedPrice' },
        },
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const res = await handleAlexaDialog({ envelope: env, identity, config: baseConfig, db: mockDb });

      const updatedDraft = mockDb.store.alexaDrafts[draftId];
      expect(updatedDraft.pricingMode).toBe('unit');
      expect(updatedDraft.unitPriceCents).toBe(1500);
      expect(updatedDraft.totalPriceCents).toBe(3000);
      expect(updatedDraft.price).toBe(30);
      expect(updatedDraft.priceSource).toBe('catalog');
      expect(updatedDraft.suggestedPriceCents).toBeNull();
    });

    it('P2: YesIntent rejeita graciosamente quando item do catálogo foi removido', async () => {
      const sessionId = 'session-p2-catalog-deleted';
      const draftId = 'draft-p2-catalog-deleted';
      const mockDb = createMockDb({
        products: {}, // Produto removido do catálogo
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            state: 'collecting',
            customer: 'Maria',
            product: 'Topo de Bolo',
            quantity: 2,
            price: null,
            suggestedPriceCents: 1500,
            suggestedProductName: 'Topo de Bolo',
            catalogProductId: 'prod-deleted',
            expectedInput: 'suggestedPrice',
            expiresAt: { toDate: () => new Date(Date.now() + 60000) },
          },
        },
      });

      const env = {
        session: {
          sessionId,
          attributes: { draftId, expectedInput: 'suggestedPrice' },
        },
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const res = await handleAlexaDialog({ envelope: env, identity, config: baseConfig, db: mockDb });

      expect(res.speech).toContain('não está mais disponível');
      expect(res.reprompt).toContain('Qual é o valor do pedido?');

      const updatedDraft = mockDb.store.alexaDrafts[draftId];
      expect(updatedDraft.catalogProductId).toBeNull();
      expect(updatedDraft.suggestedPriceCents).toBeNull();
      expect(updatedDraft.expectedInput).toBe('totalPrice');
    });

    it('P2: YesIntent detecta alteração de preço no catálogo e solicita nova confirmação', async () => {
      const sessionId = 'session-p2-catalog-price-change';
      const draftId = 'draft-p2-catalog-price-change';
      const mockDb = createMockDb({
        products: {
          'prod-topo': {
            userId: identity.uid,
            name: 'Topo de Bolo',
            unitPrice: 25.0, // Preço mudou de 15 para 25
          },
        },
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            state: 'collecting',
            customer: 'Maria',
            product: 'Topo de Bolo',
            quantity: 2,
            price: null,
            suggestedPriceCents: 1500,
            suggestedProductName: 'Topo de Bolo',
            catalogProductId: 'prod-topo',
            expectedInput: 'suggestedPrice',
            expiresAt: { toDate: () => new Date(Date.now() + 60000) },
          },
        },
      });

      const env = {
        session: {
          sessionId,
          attributes: { draftId, expectedInput: 'suggestedPrice' },
        },
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const res = await handleAlexaDialog({ envelope: env, identity, config: baseConfig, db: mockDb });

      expect(res.speech).toContain('foi alterado para 25 reais cada. Deseja usar esse novo valor?');
      const updatedDraft = mockDb.store.alexaDrafts[draftId];
      expect(updatedDraft.suggestedPriceCents).toBe(2500);
      expect(updatedDraft.expectedInput).toBe('suggestedPrice');
    });

    it('P2: RepeatOrderIntent com pendência de esclarecimento preserva e sincroniza expectedInput no Firestore', async () => {
      const sessionId = 'session-repeat-price-basis';
      const draftId = 'draft-repeat-price-basis';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            state: 'collecting',
            customer: 'Maria',
            product: 'Topo de bolo',
            quantity: 10,
            price: null,
            pendingPriceCents: 2000,
            expectedInput: null, // Sem expectedInput prévio
            expiresAt: { toDate: () => new Date(Date.now() + 60000) },
          },
        },
      });

      const env = {
        session: { sessionId, attributes: { draftId } },
        request: {
          type: 'IntentRequest',
          intent: { name: 'RepeatOrderIntent' },
        },
      };

      const res = await handleAlexaDialog({ envelope: env, identity, config: baseConfig, db: mockDb });

      expect(res.speech).toContain('Temos o valor de 20 reais. É cada ou no total?');
      expect(res.sessionAttributes?.expectedInput).toBe('priceBasis');

      const updatedDraft = mockDb.store.alexaDrafts[draftId];
      expect(updatedDraft.expectedInput).toBe('priceBasis');
    });
  });

  describe('9. Validações da Revisão R3 (Prioridades P1 e P2)', () => {
    it('P1: Retry transacional não vaza mutações de slots entre tentativas', async () => {
      const sessionId = 'session-p1-retry-leak';
      const draftId = 'draft-p1-retry-leak';

      // Criamos um store onde a primeira tentativa lê expectedInput='quantity',
      // mas simula falha transacional antes de cometer. Na segunda tentativa,
      // o rascunho tem expectedInput='totalPrice'.
      const store: any = {
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            state: 'collecting',
            customer: 'Maria',
            product: 'Topo de bolo',
            quantity: 10,
            price: null,
            expectedInput: 'quantity', // Tentativa 1 verá 'quantity'
            expiresAt: { toDate: () => new Date(Date.now() + 60000) },
          },
        },
      };

      const baseMock = createMockDb(store);
      let attempts = 0;

      // Mock de runTransaction com 2 tentativas
      const retryMockDb = {
        ...baseMock,
        runTransaction: async (cb: any) => {
          attempts++;
          if (attempts === 1) {
            // Executa tentativa 1 (que modificaria incomingUpdates se não houvesse clonagem)
            await cb({
              get: async (ref: any) => ref.get(),
              set: () => {}, // Descarta escritas da tentativa 1
              update: () => {},
            });
            // Simula mudança concorrente para a tentativa 2
            baseMock.store.alexaDrafts[draftId].expectedInput = 'totalPrice';
            // Lança retry
            return retryMockDb.runTransaction(cb);
          }
          // Tentativa 2 definitiva
          return cb({
            get: async (ref: any) => ref.get(),
            set: (ref: any, data: any, options: any) => ref.set(data, options),
            update: (ref: any, data: any) => ref.update(data),
          });
        },
      };

      const env = {
        session: { sessionId, attributes: { draftId } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'OrderIntent',
            slots: {
              price: { name: 'price', value: '20' }, // 20 reais sem qualificador
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope: env, identity, config: baseConfig, db: retryMockDb });

      expect(attempts).toBe(2);
      const updatedDraft = baseMock.store.alexaDrafts[draftId];
      // A tentativa 2 NÃO pode ter herdado quantity=20 da tentativa 1!
      expect(updatedDraft.quantity).toBe(10);
      expect(updatedDraft.price).toBe(20);
      expect(updatedDraft.totalPriceCents).toBe(2000);
      expect(updatedDraft.pricingMode).toBe('total');
      expect(res.sessionAttributes?.expectedInput).toBe('deliveryDate');
    });

    it('P1: RepeatOrderIntent com pendingConflict relata ambas as opções e permite esclarecimento correto', async () => {
      const sessionId = 'session-repeat-conflict';
      const draftId = 'draft-repeat-conflict';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            state: 'collecting',
            customer: 'Maria',
            product: 'Topo de bolo',
            quantity: 5,
            price: null,
            pendingConflict: {
              unitPriceCents: 1000, // 10 reais cada
              totalPriceCents: 5000, // 50 reais no total
            },
            expectedInput: 'priceBasis',
            expiresAt: { toDate: () => new Date(Date.now() + 60000) },
          },
        },
      });

      // 1. Repetir pedido
      const envRepeat = {
        session: { sessionId, attributes: { draftId } },
        request: {
          type: 'IntentRequest',
          intent: { name: 'RepeatOrderIntent' },
        },
      };

      const resRepeat = await handleAlexaDialog({ envelope: envRepeat, identity, config: baseConfig, db: mockDb });
      // Deve mencionar ambas as alternativas: 10 reais cada E 50 reais no total
      expect(resRepeat.speech).toContain('10 reais cada ou 50 reais no total');

      // 2. Usuário responde "no total" (ClarifyPriceTotalIntent)
      const envClarify = {
        session: {
          sessionId,
          attributes: { draftId, revision: resRepeat.sessionAttributes?.revision, expectedInput: 'priceBasis' },
        },
        request: {
          type: 'IntentRequest',
          intent: { name: 'ClarifyPriceTotalIntent' },
        },
      };

      const resClarify = await handleAlexaDialog({ envelope: envClarify, identity, config: baseConfig, db: mockDb });
      const updatedDraft = mockDb.store.alexaDrafts[draftId];
      // Total deve ser 50 reais
      expect(updatedDraft.pricingMode).toBe('total');
      expect(updatedDraft.price).toBe(50);
      expect(updatedDraft.totalPriceCents).toBe(5000);
      expect(updatedDraft.pendingConflict).toBeNull();
      // Deve avançar para a data de entrega
      expect(resClarify.sessionAttributes?.expectedInput).toBe('deliveryDate');
    });

    it('P2: YesIntent com produto de catálogo alterado para unitPrice = 0 (gratuito) gera nova confirmação e aceita', async () => {
      const sessionId = 'session-p2-catalog-zero';
      const draftId = 'draft-p2-catalog-zero';
      const mockDb = createMockDb({
        products: {
          'prod-free': {
            userId: identity.uid,
            name: 'Brinde Especial',
            unitPrice: 0, // Alterado para 0 (gratuito)
          },
        },
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            state: 'collecting',
            customer: 'Maria',
            product: 'Brinde Especial',
            quantity: 3,
            price: null,
            suggestedPriceCents: 1000, // Sugestão anterior de 10 reais
            suggestedProductName: 'Brinde Especial',
            catalogProductId: 'prod-free',
            expectedInput: 'suggestedPrice',
            expiresAt: { toDate: () => new Date(Date.now() + 60000) },
          },
        },
      });

      // Turno 1: Usuário diz "Sim" para a sugestão antiga de R$ 10
      const env1 = {
        session: {
          sessionId,
          attributes: { draftId, expectedInput: 'suggestedPrice' },
        },
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      // Deve detectar a alteração de preço para R$ 0 e pedir nova confirmação
      expect(res1.speech).toContain('foi alterado para zero reais cada. Deseja usar esse novo valor?');
      const draftAfterTurn1 = mockDb.store.alexaDrafts[draftId];
      expect(draftAfterTurn1.suggestedPriceCents).toBe(0);
      expect(draftAfterTurn1.expectedInput).toBe('suggestedPrice');

      // Turno 2: Usuário diz "Sim" para o novo valor gratuito (R$ 0)
      const env2 = {
        session: {
          sessionId,
          attributes: { draftId, expectedInput: 'suggestedPrice' },
        },
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const res2 = await handleAlexaDialog({ envelope: env2, identity, config: baseConfig, db: mockDb });
      const draftAfterTurn2 = mockDb.store.alexaDrafts[draftId];
      expect(draftAfterTurn2.pricingMode).toBe('unit');
      expect(draftAfterTurn2.unitPriceCents).toBe(0);
      expect(draftAfterTurn2.totalPriceCents).toBe(0);
      expect(draftAfterTurn2.price).toBe(0);
      expect(draftAfterTurn2.priceSource).toBe('catalog');
      expect(draftAfterTurn2.suggestedPriceCents).toBeNull();
    });

    it('P2: YesIntent com produto de catálogo com unitPrice ausente ou inválido rejeita com segurança', async () => {
      const sessionId = 'session-p2-catalog-invalid-price';
      const draftId = 'draft-p2-catalog-invalid-price';
      const mockDb = createMockDb({
        products: {
          'prod-bad-price': {
            userId: identity.uid,
            name: 'Produto Preço Inválido',
            unitPrice: null, // Ausente
          },
        },
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            environment: 'dev',
            state: 'collecting',
            customer: 'Maria',
            product: 'Produto Preço Inválido',
            quantity: 1,
            price: null,
            suggestedPriceCents: 1500,
            suggestedProductName: 'Produto Preço Inválido',
            catalogProductId: 'prod-bad-price',
            expectedInput: 'suggestedPrice',
            expiresAt: { toDate: () => new Date(Date.now() + 60000) },
          },
        },
      });

      const env = {
        session: {
          sessionId,
          attributes: { draftId, expectedInput: 'suggestedPrice' },
        },
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const res = await handleAlexaDialog({ envelope: env, identity, config: baseConfig, db: mockDb });
      expect(res.speech).toContain('não possui um preço válido configurado');
      const updatedDraft = mockDb.store.alexaDrafts[draftId];
      expect(updatedDraft.catalogProductId).toBeNull();
      expect(updatedDraft.suggestedPriceCents).toBeNull();
      expect(updatedDraft.expectedInput).toBe('totalPrice');
    });
  });

  describe('10. R4 Validações — Consistência entre Pergunta, pendingField e expectedInput', () => {
    it('Cenário 1: Erro unitário -> repetir -> preço genérico sem qualificador resolve unitário com quantidade', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-r4-unit-error';

      // 1. Criar pedido com cliente, produto, 10 unidades e data
      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              quantity: { value: '10' },
              deliveryDate: { value: '2026-10-25' },
            },
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      const draftId = res1.sessionAttributes?.draftId;
      expect(draftId).toBeDefined();

      // 2. Enviar preço unitário inválido (excede limite)
      const env2 = {
        session: { sessionId, attributes: { draftId, revision: res1.sessionAttributes?.revision } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvidePriceIntent',
            slots: {
              unitPrice: { value: '99999' },
            },
          },
        },
      };

      const res2 = await handleAlexaDialog({ envelope: env2, identity, config: baseConfig, db: mockDb });
      expect(res2.speech).toContain('excede o limite máximo permitido');
      expect(res2.reprompt).toBe('Qual é o valor unitário de cada item?');

      const draftAfterErr = mockDb.store.alexaDrafts[draftId];
      expect(draftAfterErr.pendingField).toBe('unitPrice');
      expect(draftAfterErr.expectedInput).toBe('unitPrice');
      expect(draftAfterErr.state).toBe('collecting');

      // 3. Usuário pede para repetir o pedido
      const envRepeat = {
        session: { sessionId, attributes: { draftId, revision: res2.sessionAttributes?.revision } },
        request: {
          type: 'IntentRequest',
          intent: { name: 'RepeatOrderIntent' },
        },
      };

      const resRepeat = await handleAlexaDialog({ envelope: envRepeat, identity, config: baseConfig, db: mockDb });
      expect(resRepeat.speech).toContain('Qual é o preço de cada unidade?');
      expect(resRepeat.reprompt).toBe('Qual é o preço de cada unidade?');
      expect(resRepeat.sessionAttributes?.expectedInput).toBe('unitPrice');
      expect(resRepeat.sessionAttributes?.pendingField).toBe('unitPrice');

      const draftAfterRepeat = mockDb.store.alexaDrafts[draftId];
      expect(draftAfterRepeat.expectedInput).toBe('unitPrice');
      expect(draftAfterRepeat.pendingField).toBe('unitPrice');

      // 4. Usuário responde "20 reais" sem qualificador pelo slot genérico
      const envPrice = {
        session: {
          sessionId,
          attributes: {
            draftId,
            revision: resRepeat.sessionAttributes?.revision,
            expectedInput: 'unitPrice',
            pendingField: 'unitPrice',
          },
        },
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

      const resPrice = await handleAlexaDialog({ envelope: envPrice, identity, config: baseConfig, db: mockDb });
      const draftFinal = mockDb.store.alexaDrafts[draftId];
      expect(draftFinal.pendingField).toBeNull();
      expect(draftFinal.pricingMode).toBe('unit');
      expect(draftFinal.unitPriceCents).toBe(2000);
      expect(draftFinal.totalPriceCents).toBe(20000);
      expect(draftFinal.price).toBe(200);
      expect(draftFinal.state).toBe('awaiting_confirmation');
      expect(resPrice.speech).toContain('20 reais cada');
      expect(resPrice.speech).toContain('total de 200 reais');
    });

    it('Cenário 2: Erro total -> repetir -> preço genérico sem qualificador mantém total sem multiplicação', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-r4-total-error';

      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              quantity: { value: '10' },
              deliveryDate: { value: '2026-10-25' },
            },
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      const draftId = res1.sessionAttributes?.draftId;

      // Envia total inválido
      const env2 = {
        session: { sessionId, attributes: { draftId, revision: res1.sessionAttributes?.revision } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvidePriceIntent',
            slots: {
              total: { value: '99999' },
            },
          },
        },
      };

      const res2 = await handleAlexaDialog({ envelope: env2, identity, config: baseConfig, db: mockDb });
      expect(res2.speech).toContain('excede o limite máximo permitido');
      const draftAfterErr = mockDb.store.alexaDrafts[draftId];
      expect(draftAfterErr.pendingField).toBe('total');
      expect(draftAfterErr.expectedInput).toBe('totalPrice');

      // Repetir o pedido
      const envRepeat = {
        session: { sessionId, attributes: { draftId, revision: res2.sessionAttributes?.revision } },
        request: {
          type: 'IntentRequest',
          intent: { name: 'RepeatOrderIntent' },
        },
      };

      const resRepeat = await handleAlexaDialog({ envelope: envRepeat, identity, config: baseConfig, db: mockDb });
      expect(resRepeat.speech).toContain('Qual é o valor total do pedido?');
      expect(resRepeat.reprompt).toBe('Qual é o valor total do pedido?');
      expect(resRepeat.sessionAttributes?.expectedInput).toBe('totalPrice');

      // Responder "20 reais" sem qualificador
      const envPrice = {
        session: {
          sessionId,
          attributes: {
            draftId,
            revision: resRepeat.sessionAttributes?.revision,
            expectedInput: 'totalPrice',
            pendingField: 'total',
          },
        },
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

      const resPrice = await handleAlexaDialog({ envelope: envPrice, identity, config: baseConfig, db: mockDb });
      const draftFinal = mockDb.store.alexaDrafts[draftId];
      expect(draftFinal.pendingField).toBeNull();
      expect(draftFinal.pricingMode).toBe('total');
      expect(draftFinal.totalPriceCents).toBe(2000);
      expect(draftFinal.price).toBe(20);
      expect(draftFinal.unitPriceCents).toBeNull();
      expect(draftFinal.state).toBe('awaiting_confirmation');
      expect(resPrice.speech).toContain('total de 20 reais');
    });

    it('Cenário 3: Erro na correção de data -> repetir pede data corrigida e bloqueia Sim até corrigir', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-r4-date-error';

      // Rascunho completo
      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              quantity: { value: '10' },
              total: { value: '100' },
              deliveryDate: { value: '2026-10-25' },
            },
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      const draftId = res1.sessionAttributes?.draftId;

      // Erro ao tentar mudar data para uma data inválida
      const env2 = {
        session: { sessionId, attributes: { draftId, revision: res1.sessionAttributes?.revision } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideDeliveryDateIntent',
            slots: {
              deliveryDate: { value: 'data invalida' },
            },
          },
        },
      };

      const res2 = await handleAlexaDialog({ envelope: env2, identity, config: baseConfig, db: mockDb });
      expect(res2.speech).toContain('Formato de data não reconhecido');

      const draftAfterErr = mockDb.store.alexaDrafts[draftId];
      expect(draftAfterErr.pendingField).toBe('deliveryDate');
      expect(draftAfterErr.expectedInput).toBe('deliveryDate');

      // Repetir o pedido
      const envRepeat = {
        session: { sessionId, attributes: { draftId, revision: res2.sessionAttributes?.revision } },
        request: {
          type: 'IntentRequest',
          intent: { name: 'RepeatOrderIntent' },
        },
      };

      const resRepeat = await handleAlexaDialog({ envelope: envRepeat, identity, config: baseConfig, db: mockDb });
      expect(resRepeat.speech).toContain('Qual é a data de entrega corrigida?');
      expect(resRepeat.reprompt).toBe('Para quando é a entrega?');

      // Tentativa de dizer "Sim" com pendência de data aberta: deve rejeitar
      const envYes = {
        session: {
          sessionId,
          attributes: { draftId, revision: resRepeat.sessionAttributes?.revision },
          System: { person: { personId: identity.personId } },
        },
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const resYes = await handleAlexaDialog({ envelope: envYes, identity, config: baseConfig, db: mockDb });
      expect(resYes.speech).toContain('Ainda faltam informações para concluir o pedido');
      expect(mockDb.store.orders[draftId]).toBeUndefined();

      // Envia data válida
      const envDateValid = {
        session: { sessionId, attributes: { draftId, revision: resYes.sessionAttributes?.revision } },
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

      const resDateValid = await handleAlexaDialog({ envelope: envDateValid, identity, config: baseConfig, db: mockDb });
      const draftFinal = mockDb.store.alexaDrafts[draftId];
      expect(draftFinal.pendingField).toBeNull();
      expect(draftFinal.state).toBe('awaiting_confirmation');
      expect(resDateValid.speech).toContain('Confirmar?');
    });

    it('Cenário 4: Preço antigo existente -> erro em correção unitária mantém pergunta de unitário ao repetir', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-r4-old-price';

      // Pedido inicial com preço válido
      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              quantity: { value: '10' },
              unitPrice: { value: '10' },
              deliveryDate: { value: '2026-10-25' },
            },
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      const draftId = res1.sessionAttributes?.draftId;

      // Erro na correção unitária
      const env2 = {
        session: { sessionId, attributes: { draftId, revision: res1.sessionAttributes?.revision } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvidePriceIntent',
            slots: {
              unitPrice: { value: '99999' },
            },
          },
        },
      };

      await handleAlexaDialog({ envelope: env2, identity, config: baseConfig, db: mockDb });

      // Repetir: mesmo tendo o preço antigo de R$ 100, deve pedir a correção unitária
      const envRepeat = {
        session: { sessionId, attributes: { draftId } },
        request: {
          type: 'IntentRequest',
          intent: { name: 'RepeatOrderIntent' },
        },
      };

      const resRepeat = await handleAlexaDialog({ envelope: envRepeat, identity, config: baseConfig, db: mockDb });
      expect(resRepeat.speech).toContain('Qual é o preço de cada unidade?');
      expect(resRepeat.sessionAttributes?.expectedInput).toBe('unitPrice');
    });

    it('Cenário 5: Qualificador explícito após erro unitário e repetição substitui pendência', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-r4-explicit-override';

      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              quantity: { value: '10' },
              deliveryDate: { value: '2026-10-25' },
            },
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      const draftId = res1.sessionAttributes?.draftId;

      // Erro unitário
      const env2 = {
        session: { sessionId, attributes: { draftId, revision: res1.sessionAttributes?.revision } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvidePriceIntent',
            slots: {
              unitPrice: { value: '99999' },
            },
          },
        },
      };

      await handleAlexaDialog({ envelope: env2, identity, config: baseConfig, db: mockDb });

      // Repetir
      const envRepeat = {
        session: { sessionId, attributes: { draftId } },
        request: {
          type: 'IntentRequest',
          intent: { name: 'RepeatOrderIntent' },
        },
      };

      await handleAlexaDialog({ envelope: envRepeat, identity, config: baseConfig, db: mockDb });

      // Responde com qualificador explícito "no total"
      const envExplicitTotal = {
        session: { sessionId, attributes: { draftId } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvidePriceIntent',
            slots: {
              total: { value: '50' },
            },
          },
        },
      };

      const resExplicit = await handleAlexaDialog({ envelope: envExplicitTotal, identity, config: baseConfig, db: mockDb });
      const draftFinal = mockDb.store.alexaDrafts[draftId];
      expect(draftFinal.pricingMode).toBe('total');
      expect(draftFinal.totalPriceCents).toBe(5000);
      expect(draftFinal.price).toBe(50);
      expect(draftFinal.unitPriceCents).toBeNull();
      expect(draftFinal.pendingField).toBeNull();
      expect(draftFinal.state).toBe('awaiting_confirmation');
      expect(resExplicit.speech).toContain('total de 50 reais');
    });

    it('Cenário 6: Repetição dupla conserva pendência e Sim durante pendência não altera banco', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-r4-repeat-twice';

      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              quantity: { value: '10' },
              deliveryDate: { value: '2026-10-25' },
            },
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      const draftId = res1.sessionAttributes?.draftId;

      // Erro unitário
      const envErr = {
        session: { sessionId, attributes: { draftId } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvidePriceIntent',
            slots: { unitPrice: { value: '99999' } },
          },
        },
      };
      await handleAlexaDialog({ envelope: envErr, identity, config: baseConfig, db: mockDb });

      // Repete 1
      const envRep1 = {
        session: { sessionId, attributes: { draftId } },
        request: { type: 'IntentRequest', intent: { name: 'RepeatOrderIntent' } },
      };
      const resRep1 = await handleAlexaDialog({ envelope: envRep1, identity, config: baseConfig, db: mockDb });
      expect(resRep1.speech).toContain('Qual é o preço de cada unidade?');

      // Repete 2
      const envRep2 = {
        session: { sessionId, attributes: { draftId } },
        request: { type: 'IntentRequest', intent: { name: 'RepeatOrderIntent' } },
      };
      const resRep2 = await handleAlexaDialog({ envelope: envRep2, identity, config: baseConfig, db: mockDb });
      expect(resRep2.speech).toContain('Qual é o preço de cada unidade?');

      // Tenta confirmar com Sim
      const envYes = {
        session: {
          sessionId,
          attributes: { draftId },
          System: { person: { personId: identity.personId } },
        },
        request: { type: 'IntentRequest', intent: { name: 'AMAZON.YesIntent' } },
      };
      const resYes = await handleAlexaDialog({ envelope: envYes, identity, config: baseConfig, db: mockDb });
      expect(resYes.speech).toContain('Ainda faltam informações');

      expect(Object.keys(mockDb.store.orders)).toHaveLength(0);
      expect(Object.keys(mockDb.store.salesLedger)).toHaveLength(0);
      expect(Object.keys(mockDb.store.alexaCommits)).toHaveLength(0);
    });

    it('Cenário 7: Contexto obsoleto na sessão é sobrescrito pela autoridade do Firestore', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-r4-stale-session';

      const env1 = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'topo de bolo' },
              quantity: { value: '10' },
              deliveryDate: { value: '2026-10-25' },
            },
          },
        },
      };

      const res1 = await handleAlexaDialog({ envelope: env1, identity, config: baseConfig, db: mockDb });
      const draftId = res1.sessionAttributes?.draftId;

      // Erro unitário grava pendingField='unitPrice' e expectedInput='unitPrice' no Firestore
      const envErr = {
        session: { sessionId, attributes: { draftId } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvidePriceIntent',
            slots: { unitPrice: { value: '99999' } },
          },
        },
      };
      await handleAlexaDialog({ envelope: envErr, identity, config: baseConfig, db: mockDb });

      // Cliente Alexa envia sessionAttributes falsificados/obsoletos dizendo que espera totalPrice
      const envStaleRepeat = {
        session: {
          sessionId,
          attributes: { draftId, expectedInput: 'totalPrice', pendingField: 'total' },
        },
        request: {
          type: 'IntentRequest',
          intent: { name: 'RepeatOrderIntent' },
        },
      };

      const resStaleRepeat = await handleAlexaDialog({ envelope: envStaleRepeat, identity, config: baseConfig, db: mockDb });
      // Autoridade do Firestore: deve pedir unitário
      expect(resStaleRepeat.speech).toContain('Qual é o preço de cada unidade?');
      expect(resStaleRepeat.sessionAttributes?.expectedInput).toBe('unitPrice');

      // Resposta genérica "15" vira unitário (10 x 15 = 150), e não total
      const envStalePrice = {
        session: {
          sessionId,
          attributes: { draftId, expectedInput: 'totalPrice' }, // sessão insiste em totalPrice
        },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvidePriceIntent',
            slots: { price: { value: '15' } },
          },
        },
      };

      const resStalePrice = await handleAlexaDialog({ envelope: envStalePrice, identity, config: baseConfig, db: mockDb });
      const draftFinal = mockDb.store.alexaDrafts[draftId];
      expect(draftFinal.pricingMode).toBe('unit');
      expect(draftFinal.unitPriceCents).toBe(1500);
      expect(draftFinal.totalPriceCents).toBe(15000);
      expect(draftFinal.price).toBe(150);
      expect(resStalePrice.speech).toContain('15 reais cada');
      expect(resStalePrice.speech).toContain('total de 150 reais');
    });
  });

  describe('Revisão R5: One-shot com Data, Biometria em Fala Curta e Recuperação de Rascunho', () => {
    it('deve processar pedido em frase única com produto, cliente, quantidade, preço e data (one-shot completo)', async () => {
      const mockDb = createMockDb();
      const sessionId = 'session-oneshot-1';

      const envelope = {
        session: { sessionId, attributes: {} },
        context: { System: { person: { personId: identity.personId } } },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Maria' },
              product: { value: 'caixinhas' },
              quantity: { value: '10' },
              unitPrice: { value: '10' },
              deliveryDate: { value: '2026-10-25' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      expect(res.shouldEndSession).toBe(false);
      expect(res.speech).toContain('10 caixinhas');
      expect(res.speech).toContain('Maria');
      expect(res.speech).toContain('10 reais cada');
      expect(res.speech).toContain('100 reais');
      expect(res.speech).toContain('25 de outubro de 2026');
      expect(res.speech).toContain('Confirmar?');
      expect(res.sessionAttributes?.expectedInput).toBe('confirmation');

      const createdDraftId = res.sessionAttributes?.draftId;
      const draft = mockDb.store.alexaDrafts[createdDraftId];
      expect(draft.state).toBe('awaiting_confirmation');
      expect(draft.customer).toBe('Maria');
      expect(draft.product).toBe('caixinhas');
      expect(draft.quantity).toBe(10);
      expect(draft.price).toBe(100);
      expect(draft.deliveryDate).toBe('2026-10-25');
    });

    it('deve encaminhar para aprovação no aplicativo quando a biometria vocal não for detectada na confirmação curta "Sim" (Fail-Safe R5)', async () => {
      const mockDb = createMockDb();
      const draftId = 'draft-short-sim';
      const sessionId = 'session-short-1';

      mockDb.store.alexaDrafts[draftId] = {
        draftId,
        sessionId,
        uid: identity.uid,
        bindingKey: identity.bindingKey,
        personId: identity.personId,
        environment: 'dev',
        mode: 'voice_confirm',
        state: 'awaiting_confirmation',
        customer: 'Maria',
        product: 'caixinhas',
        quantity: 10,
        price: 100,
        deliveryDate: '2026-10-25',
        revision: 1,
        expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
      };

      // Envelope com "Sim": Amazon omitiu envelope.context.System.person por ser fala curta
      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 1 } },
        context: { System: {} }, // Sem biometria física nesta fala
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const mockAuthService = {
        getUser: async (u: string) => ({ uid: u, disabled: false }),
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb, authService: mockAuthService });

      expect(res.shouldEndSession).toBe(true);
      expect(res.speech).toContain('Por segurança, o pedido foi enviado para aprovação no aplicativo Luisices');
      expect(mockDb.store.alexaDrafts[draftId].state).toBe('awaiting_app_approval');
      expect(Object.keys(mockDb.store.orders).length).toBe(0);
    });

    it('deve confirmar pedido com sucesso quando biometria vocal corresponder ao autor do rascunho', async () => {
      const mockDb = createMockDb();
      const draftId = 'draft-voice-ok';
      const sessionId = 'session-voice-ok-1';

      mockDb.store.alexaDrafts[draftId] = {
        draftId,
        sessionId,
        uid: identity.uid,
        bindingKey: identity.bindingKey,
        personId: identity.personId,
        environment: 'dev',
        mode: 'voice_confirm',
        state: 'awaiting_confirmation',
        customer: 'Maria',
        product: 'caixinhas',
        quantity: 10,
        price: 100,
        deliveryDate: '2026-10-25',
        revision: 1,
        expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
      };

      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 1 } },
        context: {
          System: {
            person: { personId: identity.personId },
          },
        },
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const mockAuthService = {
        getUser: async (u: string) => ({ uid: u, disabled: false }),
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb, authService: mockAuthService });

      expect(res.shouldEndSession).toBe(true);
      expect(res.speech).toContain('com o número');
      expect(mockDb.store.alexaDrafts[draftId].state).toBe('committed');
      expect(Object.keys(mockDb.store.orders).length).toBe(1);
    });

    it('deve rejeitar confirmação quando uma pessoa física diferente for detectada no envelope (impostor)', async () => {
      const mockDb = createMockDb();
      const draftId = 'draft-impostor';
      const sessionId = 'session-impostor-1';

      mockDb.store.alexaDrafts[draftId] = {
        draftId,
        sessionId,
        uid: identity.uid,
        bindingKey: identity.bindingKey,
        personId: identity.personId, // Iniciado por Amanda
        environment: 'dev',
        mode: 'voice_confirm',
        state: 'awaiting_confirmation',
        customer: 'Maria',
        product: 'caixinhas',
        quantity: 10,
        price: 100,
        deliveryDate: '2026-10-25',
        revision: 1,
        expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
      };

      // Impostor fala "Sim" e o hardware detecta uma biometria diferente
      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 1 } },
        context: {
          System: {
            person: { personId: 'amzn1.ask.person.IMPOSTOR' },
          },
        },
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      expect(res.shouldEndSession).toBe(true);
      expect(res.speech).toContain('A pessoa que está confirmando não é a mesma que iniciou o pedido');
      expect(mockDb.store.alexaDrafts[draftId].state).toBe('awaiting_confirmation'); // Não comitado!
    });

    it('deve recuperar rascunho em awaiting_confirmation no LaunchRequest e permitir confirmação imediata', async () => {
      const mockDb = createMockDb();
      const draftId = 'draft-reopen-confirm';
      const oldSessionId = 'session-old-1';

      mockDb.store.alexaDrafts[draftId] = {
        draftId,
        sessionId: oldSessionId,
        uid: identity.uid,
        bindingKey: identity.bindingKey,
        personId: identity.personId,
        environment: 'dev',
        mode: 'voice_confirm',
        state: 'awaiting_confirmation',
        customer: 'Maria',
        product: 'caixinhas',
        quantity: 10,
        price: 100,
        unitPriceCents: 1000,
        totalPriceCents: 10000,
        pricingMode: 'unit',
        deliveryDate: '2026-10-25',
        revision: 2,
        expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
        updatedAt: { toMillis: () => Date.now() },
      };

      const newSessionId = 'session-new-2';
      // 1. Reabertura da skill (LaunchRequest)
      const launchEnvelope = {
        session: { sessionId: newSessionId, attributes: {} },
        request: { type: 'LaunchRequest' },
      };

      const launchRes = await handleAlexaDialog({ envelope: launchEnvelope, identity, config: baseConfig, db: mockDb });

      expect(launchRes.shouldEndSession).toBe(false);
      expect(launchRes.speech).toContain('Você tem um pedido em andamento');
      expect(launchRes.speech).toContain('10 caixinhas');
      expect(launchRes.speech).toContain('Maria');
      expect(launchRes.speech).toContain('Confirmar?');
      expect(launchRes.sessionAttributes?.draftId).toBe(draftId);
      expect(launchRes.sessionAttributes?.revision).toBe(2);

      // O rascunho deve ter sido reassociado à nova sessão
      expect(mockDb.store.alexaDrafts[draftId].sessionId).toBe(newSessionId);

      // 2. Usuário confirma dizendo "Sim"
      const yesEnvelope = {
        session: {
          sessionId: newSessionId,
          attributes: launchRes.sessionAttributes,
        },
        context: { System: { person: { personId: identity.personId } } },
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const mockAuthService = {
        getUser: async (u: string) => ({ uid: u, disabled: false }),
      };

      const yesRes = await handleAlexaDialog({ envelope: yesEnvelope, identity, config: baseConfig, db: mockDb, authService: mockAuthService });

      expect(yesRes.shouldEndSession).toBe(true);
      expect(yesRes.speech).toContain('com o número');
      expect(mockDb.store.alexaDrafts[draftId].state).toBe('committed');
    });

    it('deve recuperar rascunho em collecting no LaunchRequest e perguntar o campo pendente', async () => {
      const mockDb = createMockDb();
      const draftId = 'draft-reopen-collecting';
      const oldSessionId = 'session-old-collect';

      mockDb.store.alexaDrafts[draftId] = {
        draftId,
        sessionId: oldSessionId,
        uid: identity.uid,
        bindingKey: identity.bindingKey,
        personId: identity.personId,
        environment: 'dev',
        mode: 'voice_confirm',
        state: 'collecting',
        customer: 'Maria',
        product: 'caixinhas',
        quantity: 10,
        price: 100,
        deliveryDate: null, // Falta data de entrega
        revision: 1,
        expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
        updatedAt: { toMillis: () => Date.now() },
      };

      const newSessionId = 'session-new-collect';
      const launchEnvelope = {
        session: { sessionId: newSessionId, attributes: {} },
        request: { type: 'LaunchRequest' },
      };

      const launchRes = await handleAlexaDialog({ envelope: launchEnvelope, identity, config: baseConfig, db: mockDb });

      expect(launchRes.shouldEndSession).toBe(false);
      expect(launchRes.speech).toContain('Você tem um pedido em andamento de 10 caixinhas para Maria');
      expect(launchRes.speech).toContain('Para quando é a entrega?');
      expect(launchRes.sessionAttributes?.draftId).toBe(draftId);
      expect(launchRes.sessionAttributes?.expectedInput).toBe('deliveryDate');
    });

    it('P1 R5: YesIntent direto sem draftId reapresenta resumo verbal e exige segundo Sim consciente antes de comitar', async () => {
      const mockDb = createMockDb();
      const draftId = 'draft-direct-yes';
      const sessionId = 'session-direct-yes-1';

      mockDb.store.alexaDrafts[draftId] = {
        draftId,
        sessionId: 'old-session-id',
        uid: identity.uid,
        bindingKey: identity.bindingKey,
        personId: identity.personId,
        environment: 'dev',
        mode: 'voice_confirm',
        state: 'awaiting_confirmation',
        customer: 'Maria',
        product: 'caixinhas',
        quantity: 10,
        price: 100,
        unitPriceCents: 1000,
        totalPriceCents: 10000,
        pricingMode: 'unit',
        deliveryDate: '2026-10-25',
        revision: 1,
        expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
        updatedAt: { toMillis: () => Date.now() },
      };

      // 1. Usuário diz "Sim" diretamente em nova sessão sem attributes.draftId
      const firstYesEnvelope = {
        session: { sessionId, attributes: {} },
        context: { System: { person: { personId: identity.personId } } },
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const firstRes = await handleAlexaDialog({ envelope: firstYesEnvelope, identity, config: baseConfig, db: mockDb });

      // NUNCA fazer commit direto no primeiro "Sim" sem apresentação prévia de resumo na sessão
      expect(firstRes.shouldEndSession).toBe(false);
      expect(firstRes.speech).toContain('Você tem um pedido em andamento');
      expect(firstRes.speech).toContain('10 caixinhas');
      expect(firstRes.speech).toContain('Confirmar?');
      expect(firstRes.sessionAttributes?.draftId).toBe(draftId);
      expect(firstRes.sessionAttributes?.expectedInput).toBe('confirmation');
      expect(mockDb.store.alexaDrafts[draftId].state).toBe('awaiting_confirmation'); // Não comitado!

      // 2. Usuário confirma conscientemente no segundo "Sim" com contexto devolvido
      const secondYesEnvelope = {
        session: { sessionId, attributes: firstRes.sessionAttributes },
        context: { System: { person: { personId: identity.personId } } },
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const mockAuthService = {
        getUser: async (u: string) => ({ uid: u, disabled: false }),
      };

      const secondRes = await handleAlexaDialog({
        envelope: secondYesEnvelope,
        identity,
        config: baseConfig,
        db: mockDb,
        authService: mockAuthService,
      });

      expect(secondRes.shouldEndSession).toBe(true);
      expect(secondRes.speech).toContain('com o número');
      expect(mockDb.store.alexaDrafts[draftId].state).toBe('committed');
      expect(Object.keys(mockDb.store.orders).length).toBe(1);
    });

    it('P2 R5: LaunchRequest com pendingField faz a pergunta prioritária de correção e persiste expectedInput', async () => {
      const mockDb = createMockDb();
      const draftId = 'draft-pending-unitprice';

      mockDb.store.alexaDrafts[draftId] = {
        draftId,
        sessionId: 'old-session',
        uid: identity.uid,
        bindingKey: identity.bindingKey,
        personId: identity.personId,
        environment: 'dev',
        mode: 'voice_confirm',
        state: 'collecting',
        customer: 'Maria',
        product: 'topo de bolo',
        quantity: 5,
        deliveryDate: null,
        pendingField: 'unitPrice',
        expectedInput: 'unitPrice',
        revision: 1,
        expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
        updatedAt: { toMillis: () => Date.now() },
      };

      const launchEnvelope = {
        session: { sessionId: 'new-session-pf', attributes: {} },
        request: { type: 'LaunchRequest' },
      };

      const launchRes = await handleAlexaDialog({ envelope: launchEnvelope, identity, config: baseConfig, db: mockDb });

      expect(launchRes.shouldEndSession).toBe(false);
      // Deve priorizar a pergunta de preço unitário pendente mesmo com deliveryDate ausente
      expect(launchRes.speech).toContain('Qual é o preço de cada unidade?');
      expect(launchRes.sessionAttributes?.expectedInput).toBe('unitPrice');
      expect(mockDb.store.alexaDrafts[draftId].expectedInput).toBe('unitPrice');
    });
  });

  describe('Revisão R6: Correções de Repetição, Consulta Ordenada e Transição Resiliente', () => {
    it('P2.1 R6: RepeatOrderIntent em awaiting_confirmation com pendingPriceCents null repete resumo e não grava pedido', async () => {
      const mockDb = createMockDb();
      const draftId = 'draft-repeat-null';
      const sessionId = 'session-repeat-1';

      mockDb.store.alexaDrafts[draftId] = {
        draftId,
        sessionId,
        uid: identity.uid,
        bindingKey: identity.bindingKey,
        personId: identity.personId,
        environment: 'dev',
        mode: 'voice_confirm',
        state: 'awaiting_confirmation',
        customer: 'Maria',
        product: 'caixinhas',
        quantity: 10,
        price: 100,
        deliveryDate: '2026-10-25',
        pendingPriceCents: null,
        revision: 2,
        expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
      };

      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 2 } },
        request: {
          type: 'IntentRequest',
          intent: { name: 'RepeatOrderIntent' },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      expect(res.shouldEndSession).toBe(false);
      expect(res.speech).toContain('Repetindo o pedido:');
      expect(res.speech).toContain('10 caixinhas para Maria');
      expect(res.speech).toContain('Confirmar?');
      expect(res.reprompt).toContain('Você confirma o pedido?');
      expect(res.sessionAttributes?.expectedInput).toBe('confirmation');
      expect(Object.keys(mockDb.store.orders).length).toBe(0);
    });

    it('P2.1 R6: RepeatOrderIntent em awaiting_confirmation com pendingPriceCents undefined repete resumo e não grava pedido', async () => {
      const mockDb = createMockDb();
      const draftId = 'draft-repeat-undef';
      const sessionId = 'session-repeat-2';

      mockDb.store.alexaDrafts[draftId] = {
        draftId,
        sessionId,
        uid: identity.uid,
        bindingKey: identity.bindingKey,
        personId: identity.personId,
        environment: 'dev',
        mode: 'voice_confirm',
        state: 'awaiting_confirmation',
        customer: 'Carlos',
        product: 'topos',
        quantity: 5,
        price: 50,
        deliveryDate: '2026-11-01',
        // pendingPriceCents omitido (undefined)
        revision: 1,
        expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
      };

      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 1 } },
        request: {
          type: 'IntentRequest',
          intent: { name: 'RepeatOrderIntent' },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      expect(res.shouldEndSession).toBe(false);
      expect(res.speech).toContain('Repetindo o pedido:');
      expect(res.speech).toContain('5 topos para Carlos');
      expect(res.sessionAttributes?.expectedInput).toBe('confirmation');
      expect(Object.keys(mockDb.store.orders).length).toBe(0);
    });

    it('P2.2 R6: Retomada recupera rascunho ativo mais recente mesmo com mais de 10 rascunhos inativos/expirados no histórico', async () => {
      const mockDb = createMockDb();
      const now = Date.now();

      // Cria 12 rascunhos antigos, expirados ou cancelados com timestamps mais antigos
      for (let i = 1; i <= 12; i++) {
        const id = `old-draft-${i}`;
        mockDb.store.alexaDrafts[id] = {
          draftId: id,
          sessionId: `old-sess-${i}`,
          uid: identity.uid,
          bindingKey: identity.bindingKey,
          personId: identity.personId,
          environment: 'dev',
          state: i % 2 === 0 ? 'cancelled' : 'committed',
          customer: `Cliente Antigo ${i}`,
          product: 'produto antigo',
          quantity: 1,
          price: 10,
          updatedAt: { toMillis: () => now - (100 - i) * 60 * 1000 },
          expiresAt: { toDate: () => new Date(now - 1000) }, // expirado
        };
      }

      // Cria o rascunho ativo mais recente
      const activeDraftId = 'draft-active-recent';
      mockDb.store.alexaDrafts[activeDraftId] = {
        draftId: activeDraftId,
        sessionId: 'old-session-recent',
        uid: identity.uid,
        bindingKey: identity.bindingKey,
        personId: identity.personId,
        environment: 'dev',
        mode: 'voice_confirm',
        state: 'awaiting_confirmation',
        customer: 'Juliana Recente',
        product: 'convites',
        quantity: 20,
        price: 200,
        deliveryDate: '2026-12-15',
        revision: 3,
        updatedAt: { toMillis: () => now }, // Mais recente
        expiresAt: { toDate: () => new Date(now + 10 * 60 * 1000) }, // Válido
      };

      const launchEnvelope = {
        session: { sessionId: 'new-session-reopen', attributes: {} },
        request: { type: 'LaunchRequest' },
      };

      const launchRes = await handleAlexaDialog({ envelope: launchEnvelope, identity, config: baseConfig, db: mockDb });

      expect(launchRes.shouldEndSession).toBe(false);
      expect(launchRes.speech).toContain('Juliana Recente');
      expect(launchRes.speech).toContain('20 convites');
      expect(launchRes.sessionAttributes?.draftId).toBe(activeDraftId);
    });

    it('P2.3 R6: Transição sem personId que falha na transação reporta erro honesto e não anuncia falsamente envio ao aplicativo', async () => {
      const mockDb = createMockDb();
      const draftId = 'draft-failsafe-fail';
      const sessionId = 'session-fail-1';

      mockDb.store.alexaDrafts[draftId] = {
        draftId,
        sessionId,
        uid: identity.uid,
        bindingKey: identity.bindingKey,
        personId: identity.personId,
        environment: 'dev',
        mode: 'voice_confirm',
        state: 'awaiting_confirmation',
        customer: 'Maria',
        product: 'caixinhas',
        quantity: 10,
        price: 100,
        deliveryDate: '2026-10-25',
        revision: 2,
        expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
      };

      // Simula falha na transação de transição (segunda transação do fluxo)
      let txCount = 0;
      const originalRunTx = mockDb.runTransaction;
      mockDb.runTransaction = async (fn: any) => {
        txCount++;
        if (txCount > 1) {
          throw new Error('Deadlock / Firestore Unavailable');
        }
        return originalRunTx(fn);
      };

      const envelope = {
        session: { sessionId, attributes: { draftId, revision: 2 } },
        context: { System: {} }, // Sem personId
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      expect(res.shouldEndSession).toBe(true);
      // NUNCA deve afirmar que foi enviado se a transação falhou
      expect(res.speech).not.toContain('o pedido foi enviado para aprovação no aplicativo Luisices');
      expect(res.speech).toContain('não foi possível enviar o pedido para aprovação no aplicativo');
      expect(mockDb.store.alexaDrafts[draftId].state).toBe('awaiting_confirmation'); // Não alterado
    });
  });
});


import { describe, it, expect } from 'vitest';
const {
  formatDatePtBr,
  formatCurrencyPtBr,
  parseAndValidateDeliveryDate,
  parseAndValidatePrice,
  parseAndValidatePriceToCents,
  handleAlexaDialog,
} = require('../../../functions/alexa/dialog');
const { commitOrderFromDraft } = require('../../../functions/alexa/orderService');

describe('Etapa 3: Testes de Regressão Focados — Frases Longas e Criação de Pedidos Alexa', () => {
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
          if (!store[c]?.[dId]) throw new Error(`Document not found: ${docKey}`);
          store[c][dId] = { ...store[c][dId], ...data };
        },
      };
    };

    return {
      store,
      collection: (col: string) => ({
        doc: (id: string) => docGetter(col, id),
        add: async (data: any) => {
          store[col] = store[col] || {};
          const id = `auto_${Date.now()}`;
          store[col][id] = data;
          return { id };
        },
        limit: () => ({
          get: async () => ({
            empty: Object.keys(store[col] || {}).length === 0,
            docs: Object.keys(store[col] || {}).map((k) => ({
              id: k,
              data: () => store[col][k],
            })),
          }),
        }),
        where: () => ({
          limit: () => ({
            get: async () => ({
              empty: Object.keys(store[col] || {}).length === 0,
              docs: Object.keys(store[col] || {}).map((k) => ({
                id: k,
                data: () => store[col][k],
              })),
            }),
          }),
        }),
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

  // Cenário 1: Frase completa
  // “criar pedido de dez caixinhas para Maria a dez reais cada com entrega sábado”
  it('Cenário 1: Frase completa (10 caixinhas, Maria, R$ 10 cada, sábado) conserva slots e total = R$ 100,00', async () => {
    const envelope = {
      session: { sessionId: 'session-case-1' },
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'CreateOrderIntent',
          slots: {
            customer: { value: 'Maria' },
            product: { value: 'caixinhas' },
            quantity: { value: '10' },
            unitPrice: { value: '10' },
            deliveryDate: { value: '2026-10-03' },
          },
        },
      },
    };

    const mockDb = createMockDb();
    const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

    expect(res.shouldEndSession).toBe(false);
    expect(res.speech).toContain('10 caixinhas para Maria a 10 reais cada, total de 100 reais, entrega em 3 de outubro de 2026. Confirmar?');
    expect(res.sessionAttributes?.expectedInput).toBe('confirmation');

    const draftId = res.sessionAttributes?.draftId;
    expect(draftId).toBeDefined();

    const draft = mockDb.store.alexaDrafts[draftId];
    expect(draft.customer).toBe('Maria');
    expect(draft.product).toBe('caixinhas');
    expect(draft.quantity).toBe(10);
    expect(draft.pricingMode).toBe('unit');
    expect(draft.unitPriceCents).toBe(1000);
    expect(draft.totalPriceCents).toBe(10000);
    expect(draft.price).toBe(100);
    expect(draft.deliveryDate).toBe('2026-10-03');
    expect(draft.state).toBe('awaiting_confirmation');

    // Nenhum pedido gravado antes da confirmação afirmativa
    expect(Object.keys(mockDb.store.orders)).toHaveLength(0);
  });

  // Cenário 2: Preço explicitamente total de R$ 100,00 para 10 unidades
  it('Cenário 2: Preço explicitamente total de R$ 100,00 para 10 unidades mantém R$ 100,00 sem multiplicação', async () => {
    const envelope = {
      session: { sessionId: 'session-case-2' },
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'CreateOrderIntent',
          slots: {
            customer: { value: 'Maria' },
            product: { value: 'caixinhas' },
            quantity: { value: '10' },
            total: { value: '100' },
            deliveryDate: { value: '2026-10-03' },
          },
        },
      },
    };

    const mockDb = createMockDb();
    const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

    expect(res.shouldEndSession).toBe(false);
    expect(res.speech).toContain('10 caixinhas para Maria, entrega em 3 de outubro de 2026, total de 100 reais. Confirmar?');
    expect(res.sessionAttributes?.expectedInput).toBe('confirmation');

    const draftId = res.sessionAttributes?.draftId;
    const draft = mockDb.store.alexaDrafts[draftId];
    expect(draft.pricingMode).toBe('total');
    expect(draft.totalPriceCents).toBe(10000);
    expect(draft.price).toBe(100);
    expect(draft.unitPriceCents).toBeNull();
    expect(draft.quantity).toBe(10);

    expect(Object.keys(mockDb.store.orders)).toHaveLength(0);
  });

  // Cenário 3: Quantidade ausente
  it('Cenário 3: Quantidade ausente pergunta quantidade sem assumir 1 e não grava pedido', async () => {
    const envelope = {
      session: { sessionId: 'session-case-3' },
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'CreateOrderIntent',
          slots: {
            customer: { value: 'Maria' },
            product: { value: 'caixinha' },
            unitPrice: { value: '10' },
            deliveryDate: { value: '2026-10-03' },
          },
        },
      },
    };

    const mockDb = createMockDb();
    const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

    expect(res.speech).toBe('Qual é a quantidade de itens?');
    expect(res.shouldEndSession).toBe(false);

    const draftId = res.sessionAttributes?.draftId;
    const draft = mockDb.store.alexaDrafts[draftId];
    expect(draft.customer).toBe('Maria');
    expect(draft.product).toBe('caixinha');
    expect(draft.quantity).toBeNull(); // NUNCA assume 1 como padrão
    expect(draft.price).toBeNull();
    expect(draft.pricingMode).toBe('unit');
    expect(draft.unitPriceCents).toBe(1000);
    expect(draft.deliveryDate).toBe('2026-10-03');
    expect(draft.state).toBe('collecting');

    // Fornecer quantidade agora
    const qtyEnvelope = {
      session: { sessionId: 'session-case-3', attributes: { draftId, revision: draft.revision } },
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'ProvideQuantityIntent',
          slots: { quantity: { value: '10' } },
        },
      },
    };

    const qtyRes = await handleAlexaDialog({ envelope: qtyEnvelope, identity, config: baseConfig, db: mockDb });
    const updatedDraft = mockDb.store.alexaDrafts[draftId];
    expect(updatedDraft.quantity).toBe(10);
    expect(updatedDraft.totalPriceCents).toBe(10000);
    expect(updatedDraft.price).toBe(100);
    expect(updatedDraft.state).toBe('awaiting_confirmation');
    expect(qtyRes.speech).toContain('10 caixinha para Maria a 10 reais cada, total de 100 reais, entrega em 3 de outubro de 2026. Confirmar?');
  });

  // Cenário 4: Preço ambíguo
  it('Cenário 4: Preço ambíguo pergunta se é cada ou total, preserva slots e não grava antes da resposta', async () => {
    const envelope = {
      session: { sessionId: 'session-case-4' },
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'CreateOrderIntent',
          slots: {
            customer: { value: 'Maria' },
            product: { value: 'caixinha' },
            ambiguousPrice: { value: '10' },
            deliveryDate: { value: '2026-10-03' },
          },
        },
      },
    };

    const mockDb = createMockDb();
    const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

    expect(res.speech).toBe('10 reais cada ou 10 reais no total?');
    expect(res.shouldEndSession).toBe(false);
    expect(res.sessionAttributes?.expectedInput).toBe('priceBasis');

    const draftId = res.sessionAttributes?.draftId;
    const draft = mockDb.store.alexaDrafts[draftId];
    expect(draft.customer).toBe('Maria');
    expect(draft.product).toBe('caixinha');
    expect(draft.deliveryDate).toBe('2026-10-03');
    expect(draft.quantity).toBeNull();
    expect(draft.pendingPriceCents).toBe(1000);
    expect(draft.pricingMode).toBeNull();
    expect(draft.price).toBeNull();
    expect(draft.state).toBe('collecting');

    expect(Object.keys(mockDb.store.orders)).toHaveLength(0);
  });

  // Cenário 5: Resposta "cada" e "no total" só aceitas na pergunta de preço pendente
  it('Cenário 5: Resposta "cada" e "no total" só são aceitas na pergunta de preço pendente e resultam no cálculo correto', async () => {
    const sessionId = 'session-case-5';
    const mockDb = createMockDb();

    // 5A: Fluxo legítimo com pendência -> "cada"
    const envAmbiguous = {
      session: { sessionId },
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'CreateOrderIntent',
          slots: {
            customer: { value: 'Maria' },
            product: { value: 'caixinha' },
            ambiguousPrice: { value: '10' },
            deliveryDate: { value: '2026-10-03' },
          },
        },
      },
    };

    const resAmbiguous = await handleAlexaDialog({ envelope: envAmbiguous, identity, config: baseConfig, db: mockDb });
    const draftId = resAmbiguous.sessionAttributes?.draftId;

    // Responde "cada"
    const envUnit = {
      session: { sessionId, attributes: { draftId, revision: 1, expectedInput: 'priceBasis' } },
      request: {
        type: 'IntentRequest',
        intent: { name: 'ClarifyPriceUnitIntent' },
      },
    };

    const resUnit = await handleAlexaDialog({ envelope: envUnit, identity, config: baseConfig, db: mockDb });
    const draftAfterUnit = mockDb.store.alexaDrafts[draftId];
    expect(draftAfterUnit.pricingMode).toBe('unit');
    expect(draftAfterUnit.unitPriceCents).toBe(1000);
    expect(draftAfterUnit.pendingPriceCents).toBeNull();
    // Como quantity ainda não foi informada, pergunta a quantidade
    expect(resUnit.speech).toBe('Qual é a quantidade de itens?');

    // 5B: Tentar "cada" ou "no total" quando NÃO há preço pendente é rejeitado
    const envNoPending = {
      session: { sessionId, attributes: { draftId, revision: draftAfterUnit.revision } },
      request: {
        type: 'IntentRequest',
        intent: { name: 'ClarifyPriceTotalIntent' },
      },
    };

    const resNoPending = await handleAlexaDialog({ envelope: envNoPending, identity, config: baseConfig, db: mockDb });
    expect(resNoPending.speech).toContain('Não há nenhum valor aguardando definição de unitário ou total');
    // Preço e modo permanecem protegidos
    const draftUntouched = mockDb.store.alexaDrafts[draftId];
    expect(draftUntouched.pricingMode).toBe('unit');
    expect(draftUntouched.unitPriceCents).toBe(1000);
  });

  // Cenário 6: Validação de data completa e fuso America/Sao_Paulo
  it('Cenário 6: Data inválida, parcial, passada ou ambígua não é aceita silenciosamente; data válida é confirmada', async () => {
    // 6A: Incompleta (semana)
    expect(parseAndValidateDeliveryDate('2026-W41').valid).toBe(false);
    expect(parseAndValidateDeliveryDate('2026-W41').error).toContain('incompleta');

    // 6B: Incompleta (apenas mês)
    expect(parseAndValidateDeliveryDate('2026-10').valid).toBe(false);
    expect(parseAndValidateDeliveryDate('2026-10').error).toContain('incompleta');

    // 6C: Passada
    expect(parseAndValidateDeliveryDate('2020-01-01').valid).toBe(false);
    expect(parseAndValidateDeliveryDate('2020-01-01').error).toContain('não pode ser anterior à data de hoje');

    // 6D: Calendário inválido (31 de fevereiro)
    expect(parseAndValidateDeliveryDate('2026-02-31').valid).toBe(false);
    expect(parseAndValidateDeliveryDate('2026-02-31').error).toContain('Data inválida no calendário');

    // 6E: Data válida no futuro
    const validRes = parseAndValidateDeliveryDate('2026-10-03');
    expect(validRes.valid).toBe(true);
    expect(validRes.date).toBe('2026-10-03');
    expect(formatDatePtBr(validRes.date)).toBe('3 de outubro de 2026');
  });

  // Cenário 7: "Não", cancelamento, correção de campo e confirmação
  it('Cenário 7: "Não", cancelamento, correção com "não, domingo" e confirmação afirmativa preservam regras', async () => {
    const draftId = 'draft-case-7';
    const sessionId = 'session-case-7';
    const mockDb = createMockDb({
      alexaDrafts: {
        [draftId]: {
          draftId,
          sessionId,
          uid: identity.uid,
          personId: identity.personId,
          bindingKey: identity.bindingKey,
          environment: 'dev',
          customer: 'Maria',
          product: 'caixinhas',
          quantity: 10,
          deliveryDate: '2026-10-03', // sábado
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

    // 7A: Correção de data na confirmação: usuário diz "não, domingo" (ProvideDeliveryDateIntent com 2026-10-04)
    const envCorrection = {
      session: { sessionId, attributes: { draftId, revision: 1 } },
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'ProvideDeliveryDateIntent',
          slots: { deliveryDate: { value: '2026-10-04' } },
        },
      },
    };

    const resCorrection = await handleAlexaDialog({ envelope: envCorrection, identity, config: baseConfig, db: mockDb });
    expect(resCorrection.speech).toContain('Entrega alterada para 4 de outubro de 2026.');
    expect(resCorrection.speech).toContain('entrega em 4 de outubro de 2026. Confirmar?');

    const draftUpdated = mockDb.store.alexaDrafts[draftId];
    expect(draftUpdated.deliveryDate).toBe('2026-10-04');
    expect(draftUpdated.customer).toBe('Maria'); // Mantém os outros campos intactos!
    expect(draftUpdated.product).toBe('caixinhas');
    expect(draftUpdated.quantity).toBe(10);
    expect(draftUpdated.price).toBe(100);
    expect(draftUpdated.state).toBe('awaiting_confirmation');

    // 7B: Cancelamento explícito via AMAZON.CancelIntent
    const envCancel = {
      session: { sessionId, attributes: { draftId, revision: draftUpdated.revision } },
      request: {
        type: 'IntentRequest',
        intent: { name: 'AMAZON.CancelIntent' },
      },
    };

    const resCancel = await handleAlexaDialog({ envelope: envCancel, identity, config: baseConfig, db: mockDb });
    expect(resCancel.speech).toBe('Pedido cancelado. Até logo.');
    expect(resCancel.shouldEndSession).toBe(true);

    const draftCancelled = mockDb.store.alexaDrafts[draftId];
    expect(draftCancelled.state).toBe('cancelled');
    expect(Object.keys(mockDb.store.orders)).toHaveLength(0);
  });

  // Cenário 8: Mensagem fora de contexto não altera dados do rascunho
  it('Cenário 8: Mensagem fora de contexto (AMAZON.HelpIntent / AMAZON.FallbackIntent) não altera slots do rascunho', async () => {
    const draftId = 'draft-case-8';
    const sessionId = 'session-case-8';
    const initialDraft = {
      draftId,
      sessionId,
      uid: identity.uid,
      personId: identity.personId,
      bindingKey: identity.bindingKey,
      environment: 'dev',
      customer: 'Maria',
      product: 'caixinhas',
      quantity: 10,
      deliveryDate: '2026-10-03',
      pricingMode: 'unit',
      unitPriceCents: 1000,
      totalPriceCents: 10000,
      price: 100,
      revision: 2,
      state: 'awaiting_confirmation',
      expiresAt: { toDate: () => new Date(Date.now() + 600000) },
    };

    const mockDb = createMockDb({
      alexaDrafts: { [draftId]: { ...initialDraft } },
    });

    // 8A: Ajuda durante confirmação
    const envHelp = {
      session: { sessionId, attributes: { draftId, revision: 2 } },
      request: {
        type: 'IntentRequest',
        intent: { name: 'AMAZON.HelpIntent' },
      },
    };

    const resHelp = await handleAlexaDialog({ envelope: envHelp, identity, config: baseConfig, db: mockDb });
    expect(resHelp.speech).toContain('Para criar um pedido');
    expect(resHelp.shouldEndSession).toBe(false);

    // Draft permanece inalterado
    const draftAfterHelp = mockDb.store.alexaDrafts[draftId];
    expect(draftAfterHelp.customer).toBe('Maria');
    expect(draftAfterHelp.product).toBe('caixinhas');
    expect(draftAfterHelp.quantity).toBe(10);
    expect(draftAfterHelp.price).toBe(100);
    expect(draftAfterHelp.deliveryDate).toBe('2026-10-03');

    // 8B: Fallback (não compreendido)
    const envFallback = {
      session: { sessionId, attributes: { draftId, revision: 2 } },
      request: {
        type: 'IntentRequest',
        intent: { name: 'AMAZON.FallbackIntent' },
      },
    };

    const resFallback = await handleAlexaDialog({ envelope: envFallback, identity, config: baseConfig, db: mockDb });
    expect(resFallback.speech).toContain('Não entendi');

    const draftAfterFallback = mockDb.store.alexaDrafts[draftId];
    expect(draftAfterFallback.customer).toBe('Maria');
    expect(draftAfterFallback.product).toBe('caixinhas');
    expect(draftAfterFallback.quantity).toBe(10);
    expect(draftAfterFallback.price).toBe(100);
    expect(draftAfterFallback.deliveryDate).toBe('2026-10-03');
  });

  // Cenário 9: Escapes e segurança de SSML
  it('Cenário 9: Nomes com caracteres especiais são sanitizados contra injeção SSML/XML', async () => {
    const envelope = {
      session: { sessionId: 'session-case-9' },
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'CreateOrderIntent',
          slots: {
            customer: { value: 'Maria & João <teste>' },
            product: { value: 'caixinhas "premium"' },
            quantity: { value: '10' },
            unitPrice: { value: '10' },
            deliveryDate: { value: '2026-10-03' },
          },
        },
      },
    };

    const mockDb = createMockDb();
    const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

    // Verifica que caracteres XML foram devidamente escapados
    expect(res.speech).toContain('&amp;');
    expect(res.speech).toContain('&lt;teste&gt;');
    expect(res.speech).not.toContain('<teste>');
  });

  // Cenário 10: Gravação atômica só ocorre após confirmação afirmativa ("sim")
  it('Cenário 10: Gravação final usa commitOrderFromDraft e não ocorre antes do "sim" explícito com biometria', async () => {
    const draftId = 'draft-case-10';
    const sessionId = 'session-case-10';
    const mockDb = createMockDb({
      alexaDrafts: {
        [draftId]: {
          draftId,
          sessionId,
          uid: identity.uid,
          personId: identity.personId,
          bindingKey: identity.bindingKey,
          mode: 'voice_confirm',
          environment: 'dev',
          customer: 'Maria',
          product: 'caixinhas',
          quantity: 10,
          deliveryDate: '2026-10-03',
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

    // Antes do "sim", orders está vazio
    expect(Object.keys(mockDb.store.orders)).toHaveLength(0);

    // Enviar confirmação afirmativa legítima (AMAZON.YesIntent com personId físico correspondente)
    const envYes = {
      session: {
        sessionId,
        attributes: { draftId, revision: 1 },
      },
      request: {
        type: 'IntentRequest',
        intent: { name: 'AMAZON.YesIntent' },
      },
      context: {
        System: {
          person: { personId: identity.personId },
        },
      },
    };

    const resYes = await handleAlexaDialog({
      envelope: envYes,
      identity,
      config: baseConfig,
      db: mockDb,
      authService: mockAuthService,
    });

    expect(resYes.speech).toContain('Pedido criado no seu espaço de teste com o número');
    expect(resYes.shouldEndSession).toBe(true);

    // Agora o pedido DEVE ter sido gravado na coleção orders
    const orderEntries = Object.values(mockDb.store.orders) as any[];
    expect(orderEntries).toHaveLength(1);
    const created = orderEntries[0];
    expect(created.customerName).toBe('Maria');
    expect(created.productName).toBe('caixinhas');
    expect(created.quantity).toBe(10);
    expect(created.price).toBe(100);
    expect(created.pricingMode).toBe('unit');
    expect(created.unitPrice).toBe(10);
    expect(created.status).toBe('pending');

    // Livro caixa (salesLedger) também gravado atomicamente
    const ledgerEntries = Object.values(mockDb.store.salesLedger) as any[];
    expect(ledgerEntries).toHaveLength(1);
    expect(ledgerEntries[0].amount).toBe(100);
    expect(ledgerEntries[0].totalAmount).toBe(100);

    // Rascunho marcado como committed
    expect(mockDb.store.alexaDrafts[draftId].state).toBe('committed');
  });

  // Cenário 11: One-Shot Direto (Frase completa contínua sem pausas)
  // "criar pedido de 3 topos de bolo para luis para entrega segunda-feira no valor de 20 reais cada"
  it('Cenário 11: One-Shot contínuo com dia da semana (segunda-feira) e preço unitário avança direto para confirmação', async () => {
    const mockDb = createMockDb();
    const sessionId = 'session-one-shot-luis';

    const envelope = {
      session: { sessionId },
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'CreateOrderIntent',
          slots: {
            quantity: { value: '3' },
            product: { value: 'topos de bolo' },
            customer: { value: 'luis' },
            deliveryDate: { value: '2026-W41-1' }, // Alexa ISO week-day para "segunda-feira"
            unitPrice: { value: '20' },
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

    // Como todos os dados foram informados na frase contínua, o diálogo NÃO deve perguntar slots faltantes
    expect(res.speech).toContain('3 topos de bolo para luis');
    expect(res.speech).toContain('20 reais cada');
    expect(res.speech).toContain('total de 60 reais');
    expect(res.speech).toContain('Confirmar?');
    expect(res.shouldEndSession).toBe(false);

    // O rascunho deve estar pronto em awaiting_confirmation
    const draftId = res.sessionAttributes?.draftId;
    expect(draftId).toBeDefined();
    const draft = mockDb.store.alexaDrafts[draftId];
    expect(draft.customer).toBe('luis');
    expect(draft.product).toBe('topos de bolo');
    expect(draft.quantity).toBe(3);
    expect(draft.pricingMode).toBe('unit');
    expect(draft.unitPriceCents).toBe(2000);
    expect(draft.price).toBe(60);
    expect(draft.deliveryDate).toBe('2026-10-05');
  });

  it('Cenário 12: One-Shot contínuo com dia da semana e valor ambíguo (no valor de 60 reais) pergunta apenas se é cada ou total', async () => {
    const mockDb = createMockDb();
    const sessionId = 'session-one-shot-ambiguous';

    const envelope = {
      session: { sessionId },
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'CreateOrderIntent',
          slots: {
            quantity: { value: '3' },
            product: { value: 'topos de bolo' },
            customer: { value: 'luis' },
            deliveryDate: { value: 'XXXX-WXX-1' }, // Alexa relative week-day para "segunda-feira"
            ambiguousPrice: { value: '60' },
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

    // Reconhece todos os slots e pede apenas a desambiguação cada/total
    expect(res.speech).toContain('60 reais cada ou 60 reais no total?');
    expect(res.shouldEndSession).toBe(false);

    const draftId = res.sessionAttributes?.draftId;
    const draft = mockDb.store.alexaDrafts[draftId];
    expect(draft.customer).toBe('luis');
    expect(draft.product).toBe('topos de bolo');
    expect(draft.quantity).toBe(3);
    expect(draft.state).toBe('collecting');
    expect(draft.expectedInput).toBe('priceBasis');
    expect(draft.pendingPriceCents).toBe(6000);
  });
});

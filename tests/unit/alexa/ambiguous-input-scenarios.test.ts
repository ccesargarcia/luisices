import { describe, it, expect } from 'vitest';
const {
  handleAlexaDialog,
  normalizeQuantity,
  normalizeCurrencyToFloat,
  resolveCompoundNumber,
} = require('../../../functions/alexa/dialog');
const { processAlexaEnvelope } = require('../../../functions/alexa/index');
const { computeBindingKey } = require('../../../functions/alexa/repository');

function createMockDb(initialData: any = {}) {
  const store: any = {
    alexaDrafts: initialData.alexaDrafts || {},
    alexaCommits: {},
    alexaProcessedRequests: {},
    alexaRequests: {},
    alexaRateLimits: {},
    alexaBindings: initialData.alexaBindings || {},
    orders: {},
    auditLogs: [],
    salesLedger: {},
    userProfiles: {
      'user-caio': {
        active: true,
        role: 'user',
        permissions: { orders: { create: true } },
        displayName: 'Caio Garcia',
      },
    },
    alexaPermissions: {
      'user-caio': {
        enabled: true,
        mode: 'voice_confirm',
      },
    },
  };

  const getDocData = (col: string, id: string) => store[col]?.[id] || null;

  return {
    store,
    collection(colName: string) {
      return {
        doc(docId: string) {
          return {
            async get() {
              const data = getDocData(colName, docId);
              return {
                exists: Boolean(data),
                id: docId,
                data: () => data,
              };
            },
            async set(data: any, opts: any = {}) {
              if (!store[colName]) store[colName] = {};
              if (opts.merge && store[colName][docId]) {
                store[colName][docId] = { ...store[colName][docId], ...data };
              } else {
                store[colName][docId] = { ...data };
              }
            },
            async update(data: any) {
              if (!store[colName] || !store[colName][docId]) {
                throw new Error(`Doc not found: ${colName}/${docId}`);
              }
              store[colName][docId] = { ...store[colName][docId], ...data };
            },
          };
        },
      };
    },
    async runTransaction(updateFn: any) {
      const tx = {
        async get(ref: any) {
          return ref.get();
        },
        set(ref: any, data: any, opts: any) {
          return ref.set(data, opts);
        },
        update(ref: any, data: any) {
          return ref.update(data);
        },
      };
      return updateFn(tx);
    },
  };
}

describe('Alexa: Ambiguous Input Scenarios (Testes de Regressão)', () => {
  const allowedSkillId = 'amzn1.ask.skill.ambiguous-test-skill';
  const hmacKey = 'test-secret-hmac-key-for-ambiguous-tests';
  const userId = 'amzn1.ask.account.CAIO';
  const personId = 'amzn1.person.caio';

  const bindingKey = computeBindingKey('dev', allowedSkillId, userId, personId, hmacKey);

  const baseConfig = {
    isEnabled: true,
    environment: 'dev',
    timezone: 'America/Sao_Paulo',
    allowedSkillId,
    hmacKey,
  };

  const identity = {
    uid: 'user-caio',
    bindingKey,
    displayName: 'Caio Garcia',
    personId,
    mode: 'voice_confirm',
  };

  const mockAuthService = {
    async verifySessionIdentity() {
      return {
        authorized: true,
        uid: identity.uid,
        displayName: identity.displayName,
        mode: identity.mode,
        bindingKey: identity.bindingKey,
        personId: identity.personId,
      };
    },
    async verifyAlexaSignature() {
      return true;
    },
  };

  describe('1. Cenário Principal: Quantidade numérica (ex: 28) forçando o contexto da slot de quantidade', () => {
    it('deve forçar contexto de quantidade quando a Alexa classifica "28" como ProvidePriceIntent com slot price=28', async () => {
      const draftId = 'draft-ambiguous-qty-price-intent-28';
      const sessionId = 'session-ambiguous-28';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            customer: 'Maria Silva',
            product: 'topo de bolo',
            quantity: null,
            deliveryDate: null,
            price: null,
            expectedInput: 'quantity',
            pendingField: 'quantity',
            state: 'collecting',
            revision: 1,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      // Usuário respondeu "28", mas o modelo Alexa NLU classificou como ProvidePriceIntent com price=28
      const envelope = {
        session: {
          sessionId,
          attributes: { draftId, revision: 1, expectedInput: 'quantity', personId: identity.personId },
        },
        request: {
          type: 'IntentRequest',
          requestId: 'req-ambiguous-price-28',
          intent: {
            name: 'ProvidePriceIntent',
            slots: {
              price: { value: '28' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      const savedDraft = mockDb.store.alexaDrafts[draftId];

      // 1. Contexto forçado: quantity deve ser exatamente 28
      expect(savedDraft.quantity).toBe(28);

      // 2. Não deve confundir quantidade com valor monetário
      expect(savedDraft.price).toBeNull();
      expect(savedDraft.pendingPriceCents).toBeFalsy();
      expect(savedDraft.unitPriceCents).toBeFalsy();
      expect(savedDraft.totalPriceCents).toBeFalsy();

      // 3. Resposta não deve pedir esclarecimento de preço ("reais", "cada ou no total")
      expect(res.speech).not.toContain('reais');
      expect(res.speech).not.toContain('cada ou no total');
      expect(res.speech).not.toContain('no total ou cada');

      // 4. Deve avançar normalmente para a data de entrega
      expect(res.speech).toContain('data de entrega');
      expect(res.sessionAttributes?.expectedInput).toBe('deliveryDate');
    });

    it('deve forçar contexto de quantidade quando a Alexa classifica "28" como ProvideNumberIntent com slot number=28', async () => {
      const draftId = 'draft-ambiguous-qty-number-intent-28';
      const sessionId = 'session-ambiguous-number-28';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            customer: 'Juliana',
            product: 'caixa personalizada',
            quantity: null,
            deliveryDate: null,
            price: null,
            expectedInput: 'quantity',
            pendingField: 'quantity',
            state: 'collecting',
            revision: 1,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      const envelope = {
        session: {
          sessionId,
          attributes: { draftId, revision: 1, expectedInput: 'quantity', personId: identity.personId },
        },
        request: {
          type: 'IntentRequest',
          requestId: 'req-ambiguous-num-28',
          intent: {
            name: 'ProvideNumberIntent',
            slots: {
              number: { value: '28' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      const savedDraft = mockDb.store.alexaDrafts[draftId];
      expect(savedDraft.quantity).toBe(28);
      expect(savedDraft.price).toBeNull();
      expect(savedDraft.pendingPriceCents).toBeFalsy();
      expect(res.speech).toContain('data de entrega');
      expect(res.speech).not.toContain('reais');
    });

    it('deve combinar decomposição oral NLU ("vinte e oito" -> number=20 e cents=8) como quantidade 28 e nunca R$ 20,08', async () => {
      const draftId = 'draft-ambiguous-qty-compound-20-8';
      const sessionId = 'session-ambiguous-compound-28';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            customer: 'Fernanda',
            product: 'lembrancinha',
            quantity: null,
            deliveryDate: null,
            price: null,
            expectedInput: 'quantity',
            pendingField: 'quantity',
            state: 'collecting',
            revision: 1,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      const envelope = {
        session: {
          sessionId,
          attributes: { draftId, revision: 1, expectedInput: 'quantity', personId: identity.personId },
        },
        request: {
          type: 'IntentRequest',
          requestId: 'req-ambiguous-compound-28',
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

      const savedDraft = mockDb.store.alexaDrafts[draftId];
      expect(savedDraft.quantity).toBe(28);
      expect(savedDraft.pendingPriceCents).toBeFalsy();
      expect(savedDraft.price).toBeNull();
      expect(res.speech).not.toContain('20 reais');
      expect(res.speech).not.toContain('8 centavos');
      expect(res.speech).toContain('data de entrega');
    });

    it('deve recuperar a autoridade do Firestore quando os sessionAttributes estão vazios mas o rascunho espera quantidade', async () => {
      const draftId = 'draft-ambiguous-stateless-recovery';
      const sessionId = 'session-ambiguous-stateless';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            customer: 'Renata',
            product: 'convites',
            quantity: null,
            deliveryDate: null,
            price: null,
            expectedInput: 'quantity',
            pendingField: 'quantity',
            state: 'collecting',
            revision: 1,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      // sessionAttributes sem expectedInput, apenas draftId
      const envelope = {
        session: {
          sessionId,
          attributes: { draftId },
        },
        request: {
          type: 'IntentRequest',
          requestId: 'req-ambiguous-stateless-28',
          intent: {
            name: 'ProvidePriceIntent',
            slots: {
              price: { value: '28' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      const savedDraft = mockDb.store.alexaDrafts[draftId];
      expect(savedDraft.quantity).toBe(28);
      expect(savedDraft.pendingPriceCents).toBeFalsy();
      expect(res.speech).toContain('data de entrega');
    });

    it('deve processar o caminho completo ponta a ponta via processAlexaEnvelope forçando contexto de quantidade', async () => {
      const draftId = 'draft-ambiguous-full-path-28';
      const sessionId = 'session-ambiguous-full-path';
      const mockDb = createMockDb({
        alexaBindings: {
          [bindingKey]: {
            uid: identity.uid,
            active: true,
            revokedAt: null,
            environment: 'dev',
          },
        },
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            customer: 'Patricia',
            product: 'topo de bolo',
            quantity: null,
            deliveryDate: null,
            price: null,
            expectedInput: 'quantity',
            pendingField: 'quantity',
            state: 'collecting',
            revision: 1,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      const fullEnvelope = {
        session: {
          sessionId,
          application: { applicationId: allowedSkillId },
          attributes: { draftId, revision: 1, expectedInput: 'quantity', personId: identity.personId },
        },
        context: {
          System: {
            application: { applicationId: allowedSkillId },
            user: { userId },
            person: { personId },
            device: { deviceId: 'device-echo-ambiguous' },
          },
        },
        request: {
          type: 'IntentRequest',
          requestId: 'req-full-path-ambiguous-28',
          intent: {
            name: 'ProvidePriceIntent',
            slots: {
              price: { value: '28' },
            },
          },
        },
      };

      const response = await processAlexaEnvelope(fullEnvelope, {
        db: mockDb,
        config: baseConfig,
        authService: mockAuthService,
      });

      expect(response.response).toBeDefined();
      expect(response.response.shouldEndSession).toBe(false);

      const outputSpeech = response.response.outputSpeech?.ssml || response.response.outputSpeech?.text || '';
      expect(outputSpeech).toContain('data de entrega');
      expect(outputSpeech).not.toContain('reais');
      expect(outputSpeech).not.toContain('cada ou no total');

      const savedDraft = mockDb.store.alexaDrafts[draftId];
      expect(savedDraft.quantity).toBe(28);
      expect(savedDraft.price).toBeNull();
      expect(savedDraft.pendingPriceCents).toBeFalsy();
    });
  });

  describe('2. Cenários de Diferenciação: Sufixos de Quantidade vs Sufixos Monetários', () => {
    it('normaliza quantidades válidas com número puro ou sufixos de itens e caixas', () => {
      expect(normalizeQuantity('28')).toBe(28);
      expect(normalizeQuantity('28 itens')).toBe(28);
      expect(normalizeQuantity('28 unidades')).toBe(28);
      expect(normalizeQuantity('28 peças')).toBe(28);
      expect(normalizeQuantity('28 topos de bolo')).toBe(28);
      expect(normalizeQuantity('vinte e oito caixas')).toBe(28);
      expect(normalizeQuantity('28 no total')).toBe(28);
    });

    it('rejeita termos monetários ou texto ambíguo como quantidade', () => {
      // "28 reais" não pode ser silenciosamente aceito como quantidade
      expect(normalizeQuantity('28 reais')).toBeNull();
      expect(normalizeQuantity('28 reais e 50 centavos')).toBeNull();
      expect(normalizeQuantity('28 talvez')).toBeNull();
      expect(normalizeQuantity('28 mais ou menos')).toBeNull();
    });
  });

  describe('3. Cenários de Ambiguidade de Preço vs Quantidade no Fluxo de Negócio', () => {
    it('pede esclarecimento para construções ambíguas como "20 reais e 8" quando se espera preço', () => {
      const res = normalizeCurrencyToFloat('20 reais e 8');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Valor ambíguo');

      const res2 = normalizeCurrencyToFloat('20 e 8');
      expect(res2.valid).toBe(false);
      expect(res2.error).toContain('Valor ambíguo');
    });

    it('aceita valores monetários não-ambíguos sem confundir com quantidade', () => {
      expect(normalizeCurrencyToFloat('vinte e oito reais')).toEqual({ valid: true, price: 28, cents: 2800 });
      expect(normalizeCurrencyToFloat('28 reais')).toEqual({ valid: true, price: 28, cents: 2800 });
      expect(normalizeCurrencyToFloat('20 reais e 8 centavos')).toEqual({ valid: true, price: 20.08, cents: 2008 });
      expect(normalizeCurrencyToFloat('3 e 50')).toEqual({ valid: true, price: 3.5, cents: 350 });
    });

    it('limpa slots de preço caso múltiplos slots venham preenchidos acidentalmente no contexto de quantidade', async () => {
      const draftId = 'draft-ambiguous-multiple-slots';
      const sessionId = 'session-ambiguous-multi';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            customer: 'Bruna',
            product: 'toalha bordada',
            quantity: null,
            deliveryDate: null,
            price: null,
            expectedInput: 'quantity',
            pendingField: 'quantity',
            state: 'collecting',
            revision: 1,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      // Múltiplos slots preenchidos acidentalmente pelo NLU
      const envelope = {
        session: {
          sessionId,
          attributes: { draftId, revision: 1, expectedInput: 'quantity', personId: identity.personId },
        },
        request: {
          type: 'IntentRequest',
          requestId: 'req-ambiguous-multi-28',
          intent: {
            name: 'ProvidePriceIntent',
            slots: {
              price: { value: '28' },
              quantity: { value: '28' },
              number: { value: '28' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      const savedDraft = mockDb.store.alexaDrafts[draftId];
      expect(savedDraft.quantity).toBe(28);
      expect(savedDraft.price).toBeNull();
      expect(savedDraft.pendingPriceCents).toBeFalsy();
      expect(res.speech).toContain('data de entrega');
    });
  });
});

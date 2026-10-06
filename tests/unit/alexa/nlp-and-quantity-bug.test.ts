import { describe, it, expect } from 'vitest';
import {
  handleAlexaDialog,
  normalizeQuantity,
  normalizeCurrencyToFloat,
  resolveCompoundNumber,
} from '../../../functions/alexa/dialog.js';

function createMockDb(initialData = {}) {
  const store = {
    alexaDrafts: initialData.alexaDrafts || {},
    alexaProcessedRequests: {},
    orders: {},
    auditLogs: [],
  };

  const getDocData = (col, id) => store[col]?.[id] || null;

  return {
    store,
    collection(colName) {
      return {
        doc(docId) {
          return {
            async get() {
              const data = getDocData(colName, docId);
              return {
                exists: Boolean(data),
                id: docId,
                data: () => data,
              };
            },
            async set(data, opts = {}) {
              if (!store[colName]) store[colName] = {};
              if (opts.merge && store[colName][docId]) {
                store[colName][docId] = { ...store[colName][docId], ...data };
              } else {
                store[colName][docId] = { ...data };
              }
            },
            async update(data) {
              if (!store[colName] || !store[colName][docId]) {
                throw new Error(`Doc not found: ${colName}/${docId}`);
              }
              store[colName][docId] = { ...store[colName][docId], ...data };
            },
          };
        },
      };
    },
    async runTransaction(updateFn) {
      const tx = {
        async get(ref) {
          return ref.get();
        },
        set(ref, data, opts) {
          return ref.set(data, opts);
        },
        update(ref, data) {
          return ref.update(data);
        },
      };
      return updateFn(tx);
    },
  };
}

describe('NLP e Correção de Bug de Quantidade e Decimais na Alexa', () => {
  const baseConfig = { environment: 'dev', timezone: 'America/Sao_Paulo' };
  const identity = { uid: 'user-caio', bindingKey: 'dev-key', displayName: 'Caio', personId: 'amzn1.person.caio' };

  describe('1. Normalização de NLP de Quantidades e Ordinais', () => {
    it('interpreta cardinais simples e compostos', () => {
      expect(normalizeQuantity('1')).toBe(1);
      expect(normalizeQuantity('10')).toBe(10);
      expect(normalizeQuantity('28')).toBe(28);
      expect(normalizeQuantity('vinte e oito')).toBe(28);
      expect(normalizeQuantity('trinta e cinco')).toBe(35);
      expect(normalizeQuantity('cento e vinte')).toBe(120);
    });

    it('interpreta ordinais femininos e masculinos', () => {
      expect(normalizeQuantity('primeiro')).toBe(1);
      expect(normalizeQuantity('primeira')).toBe(1);
      expect(normalizeQuantity('1º')).toBe(1);
      expect(normalizeQuantity('segundo')).toBe(2);
      expect(normalizeQuantity('terceiro')).toBe(3);
      expect(normalizeQuantity('décimo')).toBe(10);
      expect(normalizeQuantity('vigésimo')).toBe(20);
    });

    it('interpreta sufixos coloquiais e de unidades', () => {
      expect(normalizeQuantity('28 itens')).toBe(28);
      expect(normalizeQuantity('vinte e oito unidades')).toBe(28);
      expect(normalizeQuantity('5 topos de bolo')).toBe(5);
      expect(normalizeQuantity('10 caixas')).toBe(10);
      expect(normalizeQuantity('30 talvez')).toBeNull();
      expect(normalizeQuantity('30 reais e 50 centavos')).toBeNull();
    });

    it('interpreta numerais compostos orais com "e" (20 e 8 -> 28)', () => {
      expect(normalizeQuantity('20 e 8')).toBe(28);
      expect(normalizeQuantity('30 e 5')).toBe(35);
      expect(resolveCompoundNumber(20, 8)).toBe(28);
      expect(resolveCompoundNumber(100, 28)).toBe(128);
    });
  });

  describe('2. Normalização de NLP de Valores Monetários e Decimais', () => {
    it('normaliza "X reais e Y centavos" para float e centavos válidos', () => {
      expect(normalizeCurrencyToFloat('cinco reais e oitenta centavos')).toEqual({ valid: true, price: 5.8, cents: 580 });
      expect(normalizeCurrencyToFloat('20 reais e 8 centavos')).toEqual({ valid: true, price: 20.08, cents: 2008 });
      expect(normalizeCurrencyToFloat('28 reais e 50 centavos')).toEqual({ valid: true, price: 28.5, cents: 2850 });
      expect(normalizeCurrencyToFloat('dez reais e cinco centavos')).toEqual({ valid: true, price: 10.05, cents: 1005 });
    });

    it('mantém cardinal por extenso, mas pede esclarecimento para valor numérico ambíguo', () => {
      expect(normalizeCurrencyToFloat('vinte e oito reais')).toEqual({ valid: true, price: 28, cents: 2800 });
      expect(normalizeCurrencyToFloat('20 reais e 8').error).toContain('Valor ambíguo');
      expect(normalizeCurrencyToFloat('20 e 8').error).toContain('Valor ambíguo');
      expect(normalizeCurrencyToFloat('28 reais')).toEqual({ valid: true, price: 28, cents: 2800 });
    });

    it('normaliza expressões com vírgula, ponto e conectivos orais ("com", "e meio")', () => {
      expect(normalizeCurrencyToFloat('10 vírgula 50')).toEqual({ valid: true, price: 10.5, cents: 1050 });
      expect(normalizeCurrencyToFloat('dez com cinquenta')).toEqual({ valid: true, price: 10.5, cents: 1050 });
      expect(normalizeCurrencyToFloat('3 e 50')).toEqual({ valid: true, price: 3.5, cents: 350 });
      expect(normalizeCurrencyToFloat('3 e meio')).toEqual({ valid: true, price: 3.5, cents: 350 });
      expect(normalizeCurrencyToFloat('cinquenta centavos')).toEqual({ valid: true, price: 0.5, cents: 50 });
    });
  });

  describe('3. Resolução do Bug: Usuário responde "28" na pergunta de quantidade', () => {
    it('quando rascunho aguarda quantidade e Alexa classifica como ProvideNumberIntent com slots number=20 e cents=8', async () => {
      const draftId = 'draft-test-qty-vinte-e-oito';
      const sessionId = 'session-qty-vinte-e-oito';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            customer: 'Maria',
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

      // Alexa decompondo "vinte e oito" em number=20 e cents=8
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
              number: { value: '20' },
              cents: { value: '8' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      // Deve salvar quantity = 28
      expect(mockDb.store.alexaDrafts[draftId].quantity).toBe(28);
      // NUNCA deve gravar pendingPriceCents com 2008 (R$ 20,08)
      expect(mockDb.store.alexaDrafts[draftId].pendingPriceCents).toBeFalsy();
      // NUNCA deve perguntar se é total ou cada
      expect(res.speech).not.toContain('20 reais');
      expect(res.speech).not.toContain('8 centavos');
      expect(res.speech).not.toContain('cada ou');
      expect(res.speech).not.toContain('no total');
      // Deve avançar para data de entrega
      expect(res.speech).toContain('data de entrega');
    });

    it('quando rascunho aguarda quantidade e Alexa classifica como ProvidePriceIntent com price=28 ou price=20, cents=8', async () => {
      const draftId = 'draft-test-qty-price-intent';
      const sessionId = 'session-qty-price-intent';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            customer: 'Maria',
            product: 'topo de bolo',
            quantity: null,
            deliveryDate: null,
            price: null,
            expectedInput: 'quantity',
            pendingField: null,
            state: 'collecting',
            revision: 1,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      // Simula a Alexa ativando ProvidePriceIntent com price=20 e cents=8 (ex: usuário disse "vinte e oito")
      const envelope = {
        session: {
          sessionId,
          attributes: { draftId, revision: 1, expectedInput: 'quantity', personId: identity.personId },
        },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvidePriceIntent',
            slots: {
              price: { value: '20' },
              cents: { value: '8' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      // O mapeamento contextual garante que 20 e 8 na pergunta de quantidade vira 28 itens
      expect(mockDb.store.alexaDrafts[draftId].quantity).toBe(28);
      expect(mockDb.store.alexaDrafts[draftId].pendingPriceCents).toBeFalsy();
      expect(res.speech).not.toContain('cada ou no total');
      expect(res.speech).toContain('data de entrega');
    });

    it('quando a requisição vem SEM sessionAttributes mas o rascunho no Firestore espera quantidade', async () => {
      const draftId = 'draft-test-no-session-attrs';
      const sessionId = 'session-no-attrs';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            customer: 'Maria',
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

      // Envelope com sessionAttributes vazio (apenas draftId)
      const envelope = {
        session: {
          sessionId,
          attributes: { draftId },
        },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvidePriceIntent',
            slots: {
              price: { value: '28' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      // A autoridade única do Firestore recupera que esperava quantidade e converte 28 para quantidade
      expect(mockDb.store.alexaDrafts[draftId].quantity).toBe(28);
      expect(mockDb.store.alexaDrafts[draftId].pendingPriceCents).toBeFalsy();
      expect(res.speech).not.toContain('cada ou');
      expect(res.speech).toContain('data de entrega');
    });
  });

  describe('4. Extração e Normalização de Frases Compostas (Paper Craft para o Luiz)', () => {
    const {
      cleanCustomerName,
      cleanProductName,
      extractProductAndCustomer,
    } = require('../../../functions/alexa/dialog.js');

    it('deve extrair produto e cliente de "paper craft para luiz"', () => {
      const res = extractProductAndCustomer('paper craft para luiz');
      expect(res.product).toBe('paper craft');
      expect(res.customer.toLowerCase()).toBe('luiz');
    });

    it('deve extrair produto e cliente de "PAper craft para o luiz"', () => {
      const res = extractProductAndCustomer('PAper craft para o luiz');
      expect(res.product).toBe('paper craft');
      expect(res.customer.toLowerCase()).toBe('luiz');
    });

    it('deve extrair produto e cliente de "é paper craft para o luiz"', () => {
      const res = extractProductAndCustomer('é paper craft para o luiz');
      expect(res.product).toBe('paper craft');
      expect(res.customer.toLowerCase()).toBe('luiz');
    });

    it('deve extrair produto e cliente de "o produto é paper craft e o cliente é luiz"', () => {
      const res = extractProductAndCustomer('o produto é paper craft e o cliente é luiz');
      expect(res.product).toBe('paper craft');
      expect(res.customer.toLowerCase()).toBe('luiz');
    });

    it('deve limpar adequadamente prefixos de cliente em cleanCustomerName', () => {
      expect(cleanCustomerName('para o Luiz')).toBe('Luiz');
      expect(cleanCustomerName('para a Maria')).toBe('Maria');
      expect(cleanCustomerName('pro Pedro')).toBe('Pedro');
      expect(cleanCustomerName('pra Ana')).toBe('Ana');
      expect(cleanCustomerName('o cliente é o João')).toBe('João');
      expect(cleanCustomerName('é para a Mariana')).toBe('Mariana');
    });

    it('deve normalizar produto em cleanProductName', () => {
      expect(cleanProductName('é um papercraft')).toBe('paper craft');
      expect(cleanProductName('o produto é paper craft')).toBe('paper craft');
      expect(cleanProductName('são cadernos')).toBe('cadernos');
    });

    it('deve preencher produto e cliente simultaneamente quando usuário responde "paper craft para o luiz" na pendência', async () => {
      const draftId = 'draft-test-paper-craft';
      const sessionId = 'session-paper-craft';
      const mockDb = createMockDb({
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId,
            uid: identity.uid,
            bindingKey: identity.bindingKey,
            customer: null,
            product: null,
            quantity: null,
            deliveryDate: null,
            price: null,
            expectedInput: 'product',
            pendingField: null,
            state: 'collecting',
            revision: 1,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      });

      // Simula a Alexa ativando ProvideCustomerIntent com customer="paper craft para o luiz"
      const envelope = {
        session: {
          sessionId,
          attributes: { draftId, revision: 1, expectedInput: 'product', personId: identity.personId },
        },
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'ProvideCustomerIntent',
            slots: {
              customer: { value: 'paper craft para o luiz' },
            },
          },
        },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb });

      // Garante que o rascunho preencheu BOTH product e customer!
      expect(mockDb.store.alexaDrafts[draftId].product).toBe('paper craft');
      expect(mockDb.store.alexaDrafts[draftId].customer).toBe('luiz');
      // E agora pergunta pelo próximo campo pendente (quantidade), sem pedir produto ou cliente novamente!
      expect(res.speech).not.toContain('Falta informar o produto');
      expect(res.speech).not.toContain('Falta informar o cliente');
      expect(res.speech).toContain('quantidade');
    });
  });
});

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
      collection: (col: string) => ({
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
      }),

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
  });
});

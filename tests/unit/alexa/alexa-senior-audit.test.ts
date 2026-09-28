import { describe, it, expect } from 'vitest';
const {
  parseAndValidatePrice,
  parseAndValidateDeliveryDate,
  handleAlexaDialog,
} = require('../../../functions/alexa/dialog');
const { authorizeAlexaPerson, ERROR_CODES } = require('../../../functions/alexa/authorization');
const { computeBindingKey, computeRequestKey, COLLECTIONS } = require('../../../functions/alexa/repository');
const { checkAndConsumeOrderRateLimitInTransaction } = require('../../../functions/alexa/rateLimit');
const { processAlexaEnvelope } = require('../../../functions/alexa/index');

describe('Alexa: Validação de Regressões e Melhorias Sênior (Auditoria)', () => {
  describe('1. Parsing e Validação de Preços em Português Brasileiro', () => {
    it('deve interpretar valores numéricos com vírgula e ponto', () => {
      expect(parseAndValidatePrice('100')).toEqual({ valid: true, price: 100 });
      expect(parseAndValidatePrice('150,50')).toEqual({ valid: true, price: 150.5 });
      expect(parseAndValidatePrice('150.50')).toEqual({ valid: true, price: 150.5 });
      expect(parseAndValidatePrice('1.500,00')).toEqual({ valid: true, price: 1500 });
      expect(parseAndValidatePrice('R$ 2.500,00')).toEqual({ valid: true, price: 2500 });
      expect(parseAndValidatePrice('150 reais')).toEqual({ valid: true, price: 150 });
    });

    it('deve interpretar valores por extenso em português', () => {
      expect(parseAndValidatePrice('cem reais')).toEqual({ valid: true, price: 100 });
      expect(parseAndValidatePrice('duzentos e cinquenta reais')).toEqual({ valid: true, price: 250 });
      expect(parseAndValidatePrice('cinquenta')).toEqual({ valid: true, price: 50 });
      expect(parseAndValidatePrice('mil reais')).toEqual({ valid: true, price: 1000 });
    });

    it('deve interpretar corretamente centavos falados', () => {
      expect(parseAndValidatePrice('dez reais e cinquenta centavos')).toEqual({ valid: true, price: 10.5 });
      expect(parseAndValidatePrice('cinquenta centavos')).toEqual({ valid: true, price: 0.5 });
      expect(parseAndValidatePrice('10 reais e 50 centavos')).toEqual({ valid: true, price: 10.5 });
      expect(parseAndValidatePrice('um real e setenta e cinco centavos')).toEqual({ valid: true, price: 1.75 });
    });

    it('deve rejeitar valores ambíguos ("ou")', () => {
      const res = parseAndValidatePrice('vinte ou trinta');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('ambíguo');
    });

    it('deve rejeitar valores com gramática malformada ou operações (achados Rodada 4)', () => {
      expect(parseAndValidatePrice('1,50 centavos').valid).toBe(false);
      expect(parseAndValidatePrice('10,50 reais e 20 centavos').valid).toBe(false);
      expect(parseAndValidatePrice('10/20').valid).toBe(false);
      expect(parseAndValidatePrice('10+20').valid).toBe(false);
      expect(parseAndValidatePrice('100,001').valid).toBe(false);
      expect(parseAndValidatePrice('10 20').valid).toBe(false);
    });

    it('deve aceitar valor zero para pedidos gratuitos com confirmação explícita', () => {
      expect(parseAndValidatePrice(0)).toEqual({ valid: true, price: 0 });
      expect(parseAndValidatePrice('0')).toEqual({ valid: true, price: 0 });
      expect(parseAndValidatePrice('zero')).toEqual({ valid: true, price: 0 });
      expect(parseAndValidatePrice('zero reais')).toEqual({ valid: true, price: 0 });
    });

    it('deve rejeitar valores negativos ou acima do teto de R$ 10.000,00', () => {
      expect(parseAndValidatePrice('-50').valid).toBe(false);
      expect(parseAndValidatePrice('menos cem').valid).toBe(false);
      expect(parseAndValidatePrice('15000').valid).toBe(false);
      expect(parseAndValidatePrice('quinze mil reais').valid).toBe(false);
    });
  });

  describe('2. Validação Real de Calendário (Date.UTC)', () => {
    it('deve rejeitar dias inexistentes no calendário (ex: 31 de fevereiro)', () => {
      const resFeb = parseAndValidateDeliveryDate('2027-02-31');
      expect(resFeb.valid).toBe(false);
      expect(resFeb.error).toContain('inválida no calendário');

      const resApr = parseAndValidateDeliveryDate('2027-04-31');
      expect(resApr.valid).toBe(false);
      expect(resApr.error).toContain('inválida no calendário');
    });

    it('deve aceitar datas válidas futuras', () => {
      const res = parseAndValidateDeliveryDate('2027-02-28');
      expect(res.valid).toBe(true);
      expect(res.date).toBe('2027-02-28');
    });

    it('deve rejeitar semanas e formatos incompletos', () => {
      expect(parseAndValidateDeliveryDate('2026-W41').valid).toBe(false);
      expect(parseAndValidateDeliveryDate('2026-10').valid).toBe(false);
    });
  });

  describe('3. Validação de Restrição de Dispositivo (Device Restriction Bypass Fix)', () => {
    const baseConfig = {
      environment: 'dev',
      isEnabled: true,
      allowedSkillId: 'amzn1.ask.skill.test-dev',
      hmacKey: 'test-secret-key-device',
    };

    const amazonUserId = 'amzn1.ask.account.TEST_DEV';
    const personId = 'amzn1.ask.person.AMANDA';
    const bindingKey = computeBindingKey(
      baseConfig.environment,
      baseConfig.allowedSkillId,
      amazonUserId,
      personId,
      baseConfig.hmacKey
    );

    const mockDb = {
      collection: (name: string) => ({
        doc: (id: string) => ({
          get: async () => {
            if (name === COLLECTIONS.BINDINGS) {
              return {
                exists: true,
                data: () => ({
                  uid: 'uid-amanda',
                  active: true,
                  revokedAt: null,
                  environment: 'dev',
                  allowedDeviceIds: ['echo-dot-quarto-01', 'echo-show-cozinha-02'],
                }),
              };
            }
            if (name === COLLECTIONS.USER_PROFILES) {
              return {
                exists: true,
                data: () => ({ active: true, role: 'admin' }),
              };
            }
            if (name === COLLECTIONS.PERMISSIONS) {
              return {
                exists: true,
                data: () => ({ enabled: true, mode: 'voice_confirm' }),
              };
            }
            return { exists: false, data: () => null };
          },
        }),
      }),
    };

    it('deve rejeitar se allowedDeviceIds contiver itens mas a requisição vier SEM deviceId', async () => {
      const envelope = {
        context: {
          System: {
            person: { personId },
            user: { userId: amazonUserId },
            // deviceId ausente!
          },
        },
      };

      const res = await authorizeAlexaPerson(envelope, baseConfig, mockDb);
      expect(res.authorized).toBe(false);
      expect(res.code).toBe(ERROR_CODES.DEVICE_NOT_ALLOWED);
    });

    it('deve rejeitar se o deviceId não estiver na whitelist', async () => {
      const envelope = {
        context: {
          System: {
            person: { personId },
            user: { userId: amazonUserId },
            device: { deviceId: 'echo-desconhecido-vizinho' },
          },
        },
      };

      const res = await authorizeAlexaPerson(envelope, baseConfig, mockDb);
      expect(res.authorized).toBe(false);
      expect(res.code).toBe(ERROR_CODES.DEVICE_NOT_ALLOWED);
    });

    it('deve autorizar se o deviceId estiver na whitelist', async () => {
      const envelope = {
        context: {
          System: {
            person: { personId },
            user: { userId: amazonUserId },
            device: { deviceId: 'echo-show-cozinha-02' },
          },
        },
      };

      const res = await authorizeAlexaPerson(envelope, baseConfig, mockDb);
      expect(res.authorized).toBe(true);
      expect(res.identity?.uid).toBe('uid-amanda');
    });
  });

  describe('4. Consumo Atômico de Rate Limit em Transação', () => {
    it('deve bloquear após 10 pedidos em 1 hora para o mesmo usuário', async () => {
      const now = Date.now();
      const windowHour = Math.floor(now / 3600000);
      const store: any = {
        alexaRateLimits: {
          [`ord_hr_uid-test_${windowHour}`]: {
            count: 10, // Limite de 10 atingido
            expiresAt: { toDate: () => new Date(now + 3600000) },
          },
        },
      };

      const mockDb: any = {
        collection: (col: string) => ({
          doc: (id: string) => ({
            id,
            get: async () => ({
              exists: Boolean(store[col]?.[id]),
              data: () => store[col]?.[id] || null,
            }),
            set: async (data: any) => {
              store[col] = store[col] || {};
              store[col][id] = data;
            },
          }),
        }),
      };

      const mockTransaction: any = {
        get: async (ref: any) => ref.get(),
        set: (ref: any, data: any) => ref.set(data),
      };

      await expect(
        checkAndConsumeOrderRateLimitInTransaction(mockTransaction, mockDb, 'uid-test')
      ).rejects.toThrow('RATE_LIMITED');
    });
  });

  describe('5. Deduplicação de Requisições HTTP (computeRequestKey)', () => {
    it('deve retornar a resposta cacheada para requisições repetidas com mesmo requestId', async () => {
      const store: any = {
        alexaRequests: {
          [computeRequestKey('amzn1.ask.skill.test-dev', 'req-12345')]: {
            response: {
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: 'Resposta idempotente cacheada.' },
                shouldEndSession: true,
              },
            },
          },
        },
      };

      const mockDb: any = {
        collection: (col: string) => ({
          doc: (id: string) => ({
            get: async () => ({
              exists: Boolean(store[col]?.[id]),
              data: () => store[col]?.[id] || null,
            }),
            set: async (data: any) => {
              store[col] = store[col] || {};
              store[col][id] = data;
            },
          }),
        }),
      };

      const envelope = {
        request: {
          type: 'IntentRequest',
          requestId: 'req-12345',
        },
        session: {
          application: { applicationId: 'amzn1.ask.skill.test-dev' },
        },
      };

      const res = await processAlexaEnvelope(envelope, {
        db: mockDb,
        config: { environment: 'dev', isEnabled: true, allowedSkillId: 'amzn1.ask.skill.test-dev' },
      });

      expect(res.response.outputSpeech.text).toBe('Resposta idempotente cacheada.');
    });

    it('deve retornar mensagem de em processamento se requisição estiver in_progress', async () => {
      const store: any = {
        alexaRequests: {
          [computeRequestKey('amzn1.ask.skill.test-dev', 'req-in-flight')]: {
            status: 'in_progress',
            startedAt: Date.now(),
          },
        },
      };

      const mockDb: any = {
        collection: (col: string) => ({
          doc: (id: string) => ({
            get: async () => ({
              exists: Boolean(store[col]?.[id]),
              data: () => store[col]?.[id] || null,
            }),
            set: async (data: any) => {
              store[col] = store[col] || {};
              store[col][id] = data;
            },
          }),
        }),
      };

      const envelope = {
        request: {
          type: 'IntentRequest',
          requestId: 'req-in-flight',
        },
        session: {
          application: { applicationId: 'amzn1.ask.skill.test-dev' },
        },
      };

      const res = await processAlexaEnvelope(envelope, {
        db: mockDb,
        config: { environment: 'dev', isEnabled: true, allowedSkillId: 'amzn1.ask.skill.test-dev' },
      });

      expect(res.response.outputSpeech.text).toContain('já está em processamento');
    });
  });

  describe('6. Pedido Gratuito e Confirmação no Diálogo', () => {
    it('deve gerar confirmação verbal explícita para pedido gratuito (total de zero reais)', async () => {
      const draftId = 'draft-free-order';
      const store: any = {
        alexaDrafts: {
          [draftId]: {
            draftId,
            uid: 'uid-test',
            bindingKey: 'binding-test',
            customer: 'Maria',
            product: 'Amostra Grátis',
            quantity: 5,
            deliveryDate: '2026-12-25',
            price: 0,
            state: 'awaiting_confirmation',
            revision: 2,
            mode: 'voice_confirm',
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      };

      const mockDb: any = {
        collection: (col: string) => ({
          doc: (id: string) => ({
            get: async () => ({
              exists: Boolean(store[col]?.[id]),
              data: () => store[col]?.[id] || null,
            }),
            set: async (data: any) => {
              store[col] = store[col] || {};
              store[col][id] = { ...(store[col][id] || {}), ...data };
            },
            update: async (data: any) => {
              store[col] = store[col] || {};
              store[col][id] = { ...(store[col][id] || {}), ...data };
            },
          }),
        }),
        runTransaction: async (cb: any) => cb({
          get: async (ref: any) => ref.get(),
          set: (ref: any, data: any) => ref.set(data),
          update: (ref: any, data: any) => ref.update(data),
        }),
      };

      const envelope = {
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
        session: {
          attributes: { draftId, revision: 1 }, // revisão divergente para disparar reapresentação do resumo
        },
        context: {
          System: {
            person: { personId: 'amzn1.ask.person.TEST' },
          },
        },
      };

      const res = await handleAlexaDialog({
        envelope,
        identity: { uid: 'uid-test', bindingKey: 'binding-test', personId: 'amzn1.ask.person.TEST', displayName: 'Caio' },
        config: { environment: 'dev', isEnabled: true },
        db: mockDb,
      });

      expect(res.speech).toContain('zero reais, pedido gratuito');
    });
  });
});

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
const { commitOrderFromDraft } = require('../../../functions/alexa/orderService');

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
        runTransaction: async (cb: any) => cb({
          get: async (ref: any) => ref.get(),
          set: (ref: any, data: any) => ref.set(data),
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
        runTransaction: async (cb: any) => cb({
          get: async (ref: any) => ref.get(),
          set: (ref: any, data: any) => ref.set(data),
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
            sessionId: 'session-audit-zero',
            uid: 'uid-test',
            bindingKey: 'binding-test',
            environment: 'dev',
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
          sessionId: 'session-audit-zero',
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

  describe('7. Deduplicação Fail-Closed em Erros Transitórios de Transação (Achado 1 da Rodada 5)', () => {
    it('deve abortar execução e responder erro seguro quando a reserva atômica da requisição falhar', async () => {
      let pairingCalled = false;
      const mockDb: any = {
        collection: (col: string) => ({
          doc: (id: string) => ({
            get: async () => ({ exists: false, data: () => null }),
            set: async () => {
              if (col === COLLECTIONS.PAIRING_CHALLENGES) {
                pairingCalled = true;
              }
            },
          }),
        }),
        runTransaction: async () => {
          throw new Error('Firestore transaction deadlock / unavailable');
        },
      };

      const envelope = {
        request: {
          type: 'IntentRequest',
          requestId: 'req-fail-closed-tx',
          intent: { name: 'PairAlexaIntent' },
        },
        session: {
          application: { applicationId: 'amzn1.ask.skill.test-dev' },
        },
      };

      const res = await processAlexaEnvelope(envelope, {
        db: mockDb,
        config: { environment: 'dev', isEnabled: true, allowedSkillId: 'amzn1.ask.skill.test-dev' },
      });

      expect(res.response.outputSpeech.text).toContain('instabilidade temporária');
      expect(pairingCalled).toBe(false);
      expect(res.response.shouldEndSession).toBe(true);
    });

    it('deve rejeitar envelope com erro se requestId estiver ausente (Achado Rodada 6)', async () => {
      const envelope = {
        request: {
          type: 'IntentRequest',
          intent: { name: 'PairAlexaIntent' },
          // requestId ausente propositalmente
        },
        session: {
          application: { applicationId: 'amzn1.ask.skill.test-dev' },
        },
      };

      const res = await processAlexaEnvelope(envelope, {
        db: { collection: () => ({}) },
        config: { environment: 'dev', isEnabled: true, allowedSkillId: 'amzn1.ask.skill.test-dev' },
      });

      expect(res.response.outputSpeech.text).toContain('Requisição inválida ou incompleta');
      expect(res.response.shouldEndSession).toBe(true);
    });

    it('deve falhar fechado se db.runTransaction não for suportado na deduplicação (Achado Rodada 6)', async () => {
      const mockDbNoTx: any = {
        collection: (col: string) => ({
          doc: (id: string) => ({
            get: async () => ({ exists: false }),
          }),
        }),
        // runTransaction ausente propositalmente
      };

      const envelope = {
        request: {
          type: 'IntentRequest',
          requestId: 'req-no-tx-support',
          intent: { name: 'PairAlexaIntent' },
        },
        session: {
          application: { applicationId: 'amzn1.ask.skill.test-dev' },
        },
      };

      const res = await processAlexaEnvelope(envelope, {
        db: mockDbNoTx,
        config: { environment: 'dev', isEnabled: true, allowedSkillId: 'amzn1.ask.skill.test-dev' },
      });

      expect(res.response.outputSpeech.text).toContain('instabilidade temporária');
      expect(res.response.shouldEndSession).toBe(true);
    });
  });

  describe('8. Isolamento de Sessão e Imutabilidade de Estados Terminais (Achados 2, 3 e 4 da Rodada 5)', () => {
    it('não deve reutilizar nem modificar rascunho pertencente a outra sessão', async () => {
      const draftId = 'draft-session-a';
      const store: any = {
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId: 'session-AAA',
            uid: 'uid-test',
            bindingKey: 'binding-test',
            environment: 'dev',
            customer: 'Maria',
            product: 'Bolo',
            state: 'collecting',
            revision: 1,
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

      // Requisição chegando com session-BBB tentando atualizar o rascunho de session-AAA
      const envelope = {
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'João Alterado' },
            },
          },
        },
        session: {
          sessionId: 'session-BBB',
          attributes: { draftId },
        },
      };

      const res = await handleAlexaDialog({
        envelope,
        identity: { uid: 'uid-test', bindingKey: 'binding-test', personId: 'amzn1.ask.person.TEST', displayName: 'Caio' },
        config: { environment: 'dev', isEnabled: true },
        db: mockDb,
      });

      // O rascunho de session-AAA deve permanecer inalterado ('Maria')
      expect(store.alexaDrafts[draftId].customer).toBe('Maria');
      // E a resposta deve ter gerado um novo draftId diferente de draft-session-a
      expect(res.sessionAttributes?.draftId).not.toBe(draftId);
    });

    it('AMAZON.CancelIntent não deve cancelar nem corromper rascunho em estado committed', async () => {
      const draftId = 'draft-committed-1';
      const store: any = {
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId: 'session-123',
            uid: 'uid-test',
            bindingKey: 'binding-test',
            environment: 'dev',
            state: 'committed',
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
            update: async (data: any) => {
              store[col] = store[col] || {};
              store[col][id] = { ...(store[col][id] || {}), ...data };
            },
          }),
        }),
        runTransaction: async (cb: any) => cb({
          get: async (ref: any) => ref.get(),
          update: (ref: any, data: any) => ref.update(data),
        }),
      };

      const envelope = {
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.CancelIntent' },
        },
        session: {
          sessionId: 'session-123',
          attributes: { draftId },
        },
      };

      await handleAlexaDialog({
        envelope,
        identity: { uid: 'uid-test', bindingKey: 'binding-test', personId: 'amzn1.ask.person.TEST', displayName: 'Caio' },
        config: { environment: 'dev', isEnabled: true },
        db: mockDb,
      });

      // O estado deve continuar committed, nunca mudando para cancelled
      expect(store.alexaDrafts[draftId].state).toBe('committed');
    });

    it('AMAZON.FallbackIntent não deve alterar nem expirar rascunho de outro usuário ou sessão', async () => {
      const draftId = 'draft-user-1';
      const store: any = {
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId: 'session-user-1',
            uid: 'uid-1',
            bindingKey: 'binding-1',
            environment: 'dev',
            state: 'collecting',
            fallbackCount: 2,
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
            update: async (data: any) => {
              store[col] = store[col] || {};
              store[col][id] = { ...(store[col][id] || {}), ...data };
            },
          }),
        }),
        runTransaction: async (cb: any) => cb({
          get: async (ref: any) => ref.get(),
          update: (ref: any, data: any) => ref.update(data),
        }),
      };

      // Requisição vinda de outro usuário e outra sessão
      const envelope = {
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.FallbackIntent' },
        },
        session: {
          sessionId: 'session-user-2',
          attributes: { draftId, fallbackCount: 2 },
        },
      };

      await handleAlexaDialog({
        envelope,
        identity: { uid: 'uid-2', bindingKey: 'binding-2', personId: 'amzn1.ask.person.OTHER', displayName: 'Outro' },
        config: { environment: 'dev', isEnabled: true },
        db: mockDb,
      });

      // Rascunho do usuário 1 não deve ter sido expirado nem alterado
      expect(store.alexaDrafts[draftId].state).toBe('collecting');
      expect(store.alexaDrafts[draftId].fallbackCount).toBe(2);
    });
  });

  describe('9. Transição Atômica e Abort em Cancelamento Concorrente na Aprovação App (Achado 5 da Rodada 5)', () => {
    it('deve abortar e avisar o usuário se o rascunho foi cancelado antes da transição para app_approval', async () => {
      const draftId = 'draft-app-race';
      const store: any = {
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId: 'session-app-1',
            uid: 'uid-test',
            bindingKey: 'binding-test',
            environment: 'dev',
            customer: 'Carlos',
            product: 'Canecas',
            quantity: 10,
            deliveryDate: '2026-11-20',
            price: 250,
            revision: 1,
            state: 'awaiting_confirmation',
            mode: 'app_approval',
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
      };

      let firstTx = true;
      const mockDb: any = {
        collection: (col: string) => ({
          doc: (id: string) => ({
            get: async () => ({
              exists: Boolean(store[col]?.[id]),
              data: () => store[col]?.[id] || null,
            }),
            update: async (data: any) => {
              store[col] = store[col] || {};
              store[col][id] = { ...(store[col][id] || {}), ...data };
            },
          }),
        }),
        runTransaction: async (cb: any) => {
          // Na primeira transação (carregamento/confirmação), ocorre normal.
          // Logo após, antes da transição para awaiting_app_approval, outra thread cancela o rascunho!
          if (!firstTx) {
            store.alexaDrafts[draftId].state = 'cancelled';
          }
          firstTx = false;
          return cb({
            get: async (ref: any) => ref.get(),
            update: (ref: any, data: any) => ref.update(data),
          });
        },
      };

      const envelope = {
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.YesIntent' },
        },
        session: {
          sessionId: 'session-app-1',
          attributes: { draftId, revision: 1 },
        },
        context: {
          System: {
            person: { personId: 'amzn1.ask.person.TEST' },
          },
        },
      };

      const res = await handleAlexaDialog({
        envelope,
        identity: {
          uid: 'uid-test',
          bindingKey: 'binding-test',
          personId: 'amzn1.ask.person.TEST',
          displayName: 'Caio',
          mode: 'app_approval',
        },
        config: { environment: 'dev', isEnabled: true },
        db: mockDb,
      });

      // NÃO deve dizer que o pedido foi preparado com sucesso!
      expect(res.speech).not.toContain('Pedido preparado');
      expect(res.speech).toContain('foi alterado ou cancelado');
      expect(res.shouldEndSession).toBe(true);
    });
  });

  describe('10. Autenticação Fail-Closed e Proteção de Titularidade no Commit (Achado 7 da Rodada 5)', () => {
    const baseConfig = {
      environment: 'dev',
      isEnabled: true,
      allowedSkillId: 'amzn1.ask.skill.test-dev',
    };

    it('deve falhar fechado com AUTH_UNAVAILABLE quando authService não for fornecido e admin.apps estiver vazio', async () => {
      const draftId = 'draft-auth-fail-closed';
      const uid = 'uid-auth-test';
      const store: any = {
        alexaCommits: {},
        alexaDrafts: {
          [draftId]: {
            draftId,
            uid,
            bindingKey: 'binding-key-1',
            customer: 'Maria',
            product: 'Lembrancinhas',
            quantity: 10,
            deliveryDate: '2026-11-20',
            price: 150,
            state: 'awaiting_confirmation',
            revision: 1,
            expiresAt: { toDate: () => new Date(Date.now() + 600000) },
          },
        },
        alexaBindings: {
          'binding-key-1': { active: true, uid, environment: 'dev' },
        },
        userProfiles: {
          [uid]: { active: true, role: 'admin', permissions: { orders: { create: true } } },
        },
        alexaPermissions: {
          [uid]: { enabled: true, mode: 'voice_confirm' },
        },
        integrationSettings: {
          alexa: { enabled: true },
        },
      };

      const mockDb: any = {
        collection: (col: string) => ({
          doc: (id: string) => ({
            get: async () => ({
              exists: Boolean(store[col]?.[id]),
              data: () => store[col]?.[id] || null,
            }),
          }),
        }),
        doc: (path: string) => ({
          get: async () => ({ exists: false, data: () => null }),
        }),
        runTransaction: async (cb: any) => cb({
          get: async (ref: any) => ref.get(),
          set: () => {},
          update: () => {},
        }),
      };

      await expect(
        commitOrderFromDraft({
          draftId,
          callerPersonId: 'amzn1.ask.person.TEST',
          expectedRevision: 1,
          config: baseConfig,
          db: mockDb,
          // authService OMITIDO propositalmente em ambiente sem admin.apps
        })
      ).rejects.toThrow('AUTH_UNAVAILABLE');
    });

    it('deve rejeitar commit com PERMISSION_DENIED se callerUid diferir do titular do rascunho', async () => {
      const draftId = 'draft-caller-check';
      const uid = 'uid-owner';
      const store: any = {
        alexaCommits: {},
        alexaDrafts: {
          [draftId]: {
            draftId,
            uid,
            bindingKey: 'binding-key-1',
            customer: 'Maria',
            product: 'Lembrancinhas',
            quantity: 10,
            deliveryDate: '2026-11-20',
            price: 150,
            state: 'awaiting_confirmation',
            revision: 1,
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
          }),
        }),
        runTransaction: async (cb: any) => cb({
          get: async (ref: any) => ref.get(),
        }),
      };

      await expect(
        commitOrderFromDraft({
          draftId,
          callerPersonId: 'amzn1.ask.person.TEST',
          expectedRevision: 1,
          callerUid: 'impostor-uid', // UID divergente
          config: baseConfig,
          db: mockDb,
          authService: { getUser: async (u: string) => ({ uid: u, disabled: false }) },
        })
      ).rejects.toThrow('PERMISSION_DENIED');
    });
  });

  describe('11. Validações Estritas de requestId e Limites de Payload (Achado Rodada 6)', () => {
    it('deve rejeitar requestId curto demais (< 8 caracteres)', async () => {
      const envelope = {
        request: {
          type: 'IntentRequest',
          requestId: 'short',
          intent: { name: 'PairAlexaIntent' },
        },
        session: { application: { applicationId: 'amzn1.ask.skill.test-dev' } },
      };

      const res = await processAlexaEnvelope(envelope, {
        db: { collection: () => ({}) },
        config: { environment: 'dev', isEnabled: true, allowedSkillId: 'amzn1.ask.skill.test-dev' },
      });

      expect(res.response.outputSpeech.text).toContain('Requisição inválida ou incompleta');
    });

    it('deve rejeitar requestId excessivamente longo (> 300 caracteres)', async () => {
      const envelope = {
        request: {
          type: 'IntentRequest',
          requestId: 'a'.repeat(301),
          intent: { name: 'PairAlexaIntent' },
        },
        session: { application: { applicationId: 'amzn1.ask.skill.test-dev' } },
      };

      const res = await processAlexaEnvelope(envelope, {
        db: { collection: () => ({}) },
        config: { environment: 'dev', isEnabled: true, allowedSkillId: 'amzn1.ask.skill.test-dev' },
      });

      expect(res.response.outputSpeech.text).toContain('Requisição inválida ou incompleta');
    });
  });

  describe('12. Idempotência Pós-TTL e Consistência de Fallback (Achados Rodada 6)', () => {
    it('deve impedir criação duplicada de pedido mesmo após expiração do TTL de deduplicação', async () => {
      const draftId = 'draft-post-ttl-test';
      const uid = 'uid-owner';
      const store: any = {
        alexaCommits: {
          [draftId]: {
            orderId: 'existing-order-xyz',
            orderNumber: '#2026-0099',
            committedAt: new Date(),
          },
        },
        alexaDrafts: {
          [draftId]: {
            draftId,
            uid,
            bindingKey: 'binding-key-1',
            state: 'committed',
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
          }),
        }),
      };

      const res = await commitOrderFromDraft({
        draftId,
        callerPersonId: 'amzn1.ask.person.TEST',
        expectedRevision: 1,
        config: { environment: 'dev', isEnabled: true },
        db: mockDb,
        authService: { getUser: async (u: string) => ({ uid: u, disabled: false }) },
      });

      expect(res.isReplay).toBe(true);
      expect(res.orderNumber).toBe('#2026-0099');
    });

    it('fallback com rascunho de outra sessão não deve anunciar três tentativas e deve remover draftId órfão', async () => {
      const draftId = 'draft-foreign-session';
      const store: any = {
        alexaDrafts: {
          [draftId]: {
            draftId,
            sessionId: 'session-original',
            uid: 'uid-test',
            bindingKey: 'binding-test',
            environment: 'dev',
            state: 'collecting',
            fallbackCount: 2,
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
            update: async () => {},
          }),
        }),
        runTransaction: async (cb: any) => cb({
          get: async (ref: any) => ref.get(),
          update: async () => {},
        }),
      };

      // Sessão diferente tentando fallback sobre rascunho de outra sessão
      const envelope = {
        request: {
          type: 'IntentRequest',
          intent: { name: 'AMAZON.FallbackIntent' },
        },
        session: {
          sessionId: 'session-foreign',
          attributes: { draftId, fallbackCount: 2 },
        },
      };

      const res = await handleAlexaDialog({
        envelope,
        identity: { uid: 'uid-test', bindingKey: 'binding-test', personId: 'amzn1.ask.person.TEST', displayName: 'Caio' },
        config: { environment: 'dev', isEnabled: true },
        db: mockDb,
      });

      // NÃO deve dizer "três tentativas"
      expect(res.speech).not.toContain('três tentativas');
      expect(res.shouldEndSession).toBe(false);
      // Deve ter descartado o draftId órfão dos atributos da sessão
      expect(res.sessionAttributes?.draftId).toBeUndefined();
    });

    it('deve confirmar que getOrCreateDraft não existe mais em dialog.js (remoção de código legado)', () => {
      const dialogExports = require('../../../functions/alexa/dialog');
      expect(dialogExports.getOrCreateDraft).toBeUndefined();
    });
  });
});

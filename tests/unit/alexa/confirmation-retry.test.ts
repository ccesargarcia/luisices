import { describe, it, expect, vi } from 'vitest';
const { handleAlexaDialog, buildConfirmationSpeech } = require('../../../functions/alexa/dialog');
const { processAlexaEnvelope } = require('../../../functions/alexa/index');
const { computeBindingKey, computeRequestKey, COLLECTIONS } = require('../../../functions/alexa/repository');

describe('Alexa: Política de Novas Tentativas de Voz na Confirmação e Caminho Completo (P1)', () => {
  const baseConfig = {
    environment: 'dev',
    allowedSkillId: 'amzn1.ask.skill.test-dev',
    timezone: 'America/Sao_Paulo',
    draftTtlMinutes: 15,
    isEnabled: true,
    hmacKey: 'test-hmac-secret-key-min-32-chars-long!',
  };

  const carlosUserId = 'amzn1.ask.account.CARLOS';
  const carlosPersonId = 'amzn1.ask.person.CARLOS';
  const carlosBindingKey = computeBindingKey(
    baseConfig.environment,
    baseConfig.allowedSkillId,
    carlosUserId,
    carlosPersonId,
    baseConfig.hmacKey
  );

  const impostorUserId = 'amzn1.ask.account.IMPOSTOR';
  const impostorPersonId = 'amzn1.ask.person.IMPOSTOR';
  const impostorBindingKey = computeBindingKey(
    baseConfig.environment,
    baseConfig.allowedSkillId,
    impostorUserId,
    impostorPersonId,
    baseConfig.hmacKey
  );

  const identity = {
    uid: 'uid-user-1',
    displayName: 'Carlos',
    bindingKey: carlosBindingKey,
    personId: carlosPersonId,
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
      alexaRequests: {},
      userProfiles: {
        'uid-user-1': {
          active: true,
          role: 'user',
          permissions: { orders: { create: true } },
          displayName: 'Carlos',
        },
        'uid-impostor': {
          active: true,
          role: 'user',
          permissions: { orders: { create: true } },
          displayName: 'Impostor',
        },
      },
      alexaPermissions: {
        'uid-user-1': {
          enabled: true,
          mode: 'voice_confirm',
        },
        'uid-impostor': {
          enabled: true,
          mode: 'voice_confirm',
        },
      },
      alexaBindings: {
        [carlosBindingKey]: {
          uid: 'uid-user-1',
          active: true,
          revokedAt: null,
          environment: 'dev',
        },
        [impostorBindingKey]: {
          uid: 'uid-impostor',
          active: true,
          revokedAt: null,
          environment: 'dev',
        },
      },
      counters: {
        'uid-user-1': { orderCounter: 100 },
      },
      ...initialStore,
    };

    const mockDb: any = {
      store,
      collection: (col: string) => ({
        add: async (data: any) => {
          store[col] = store[col] || {};
          const id = 'audit-' + Math.random().toString(36).substring(2, 9);
          store[col][id] = data;
          return { id };
        },
        doc: (id: string) => ({
          id,
          get: async () => ({
            exists: Boolean(store[col]?.[id]),
            data: () => store[col]?.[id] || null,
          }),
          set: async (data: any, options?: any) => {
            store[col] = store[col] || {};
            if (options?.merge && store[col][id]) {
              store[col][id] = { ...store[col][id], ...data };
            } else {
              store[col][id] = data;
            }
          },
          update: async (data: any) => {
            store[col] = store[col] || {};
            if (!store[col][id]) {
              throw new Error(`Doc ${col}/${id} not found for update`);
            }
            store[col][id] = { ...store[col][id], ...data };
          },
        }),
      }),
      doc: (path: string) => {
        const [col, id] = path.split('/');
        return mockDb.collection(col).doc(id);
      },
      runTransaction: async (cb: any) => {
        const tx = {
          get: async (ref: any) => ref.get(),
          set: (ref: any, data: any, options?: any) => ref.set(data, options),
          update: (ref: any, data: any) => ref.update(data),
        };
        return cb(tx);
      },
    };

    return mockDb;
  };

  const createDraftData = (overrides: any = {}) => ({
    draftId: 'draft-p1-test',
    sessionId: 'session-p1-1',
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
    deliveryDate: '2026-11-20',
    revision: 1,
    voiceConfirmationFailures: 0,
    expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
    ...overrides,
  });

  const mockAuthService = {
    getUser: async (u: string) => ({ uid: u, disabled: false }),
  };

  describe('1. Diálogo — Política de 2 Novas Tentativas e Transição Segura', () => {
    it('Cenário 1: Primeira ausência de identificação atual mantém sessão aberta, draft inalterado e não grava pedido', async () => {
      const mockDb = createMockDb();
      const draft = createDraftData({ voiceConfirmationFailures: 0 });
      mockDb.store.alexaDrafts[draft.draftId] = draft;

      const envelope = {
        session: { sessionId: draft.sessionId, attributes: { draftId: draft.draftId, revision: 1 } },
        context: { System: {} }, // Sem physicalPersonId na fala "Sim"
        request: { type: 'IntentRequest', intent: { name: 'AMAZON.YesIntent' } },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb, authService: mockAuthService });

      expect(res.shouldEndSession).toBe(false);
      expect(res.speech).toContain('Não consegui reconhecer sua voz nesta resposta. Diga: pode confirmar.');
      expect(res.reprompt).toContain('Para confirmar o pedido, diga: pode confirmar.');
      expect(res.sessionAttributes?.draftId).toBe(draft.draftId);
      expect(res.sessionAttributes?.revision).toBe(1);
      expect(res.sessionAttributes?.expectedInput).toBe('confirmation');

      const savedDraft = mockDb.store.alexaDrafts[draft.draftId];
      expect(savedDraft.state).toBe('awaiting_confirmation');
      expect(savedDraft.voiceConfirmationFailures).toBe(1);
      expect(savedDraft.revision).toBe(1);
      expect(Object.keys(mockDb.store.orders).length).toBe(0);
    });

    it('Cenário 2: Segunda ausência de identificação atual incrementa contador para 2 e mantém sessão aberta', async () => {
      const mockDb = createMockDb();
      const draft = createDraftData({ voiceConfirmationFailures: 1 });
      mockDb.store.alexaDrafts[draft.draftId] = draft;

      const envelope = {
        session: { sessionId: draft.sessionId, attributes: { draftId: draft.draftId, revision: 1 } },
        context: { System: {} },
        request: { type: 'IntentRequest', intent: { name: 'AMAZON.YesIntent' } },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb, authService: mockAuthService });

      expect(res.shouldEndSession).toBe(false);
      expect(res.speech).toContain('Não consegui reconhecer sua voz nesta resposta. Diga: pode confirmar.');
      expect(res.reprompt).toContain('Para confirmar o pedido, diga: pode confirmar.');

      const savedDraft = mockDb.store.alexaDrafts[draft.draftId];
      expect(savedDraft.state).toBe('awaiting_confirmation');
      expect(savedDraft.voiceConfirmationFailures).toBe(2);
      expect(Object.keys(mockDb.store.orders).length).toBe(0);
    });

    it('Cenário 3: Terceira ausência de identificação no total transiciona atomicamente para awaiting_app_approval e encerra a sessão', async () => {
      const mockDb = createMockDb();
      const draft = createDraftData({ voiceConfirmationFailures: 2 });
      mockDb.store.alexaDrafts[draft.draftId] = draft;

      const envelope = {
        session: { sessionId: draft.sessionId, attributes: { draftId: draft.draftId, revision: 1 } },
        context: { System: {} },
        request: { type: 'IntentRequest', intent: { name: 'AMAZON.YesIntent' } },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb, authService: mockAuthService });

      expect(res.shouldEndSession).toBe(true);
      expect(res.speech).toContain('Não reconheci sua voz com segurança na confirmação. Por segurança, o pedido foi enviado para aprovação no aplicativo Luisices.');
      expect(res.sessionAttributes).toEqual({});

      const savedDraft = mockDb.store.alexaDrafts[draft.draftId];
      expect(savedDraft.state).toBe('awaiting_app_approval');
      expect(savedDraft.voiceConfirmationFailures).toBe(3);
      expect(Object.keys(mockDb.store.orders).length).toBe(0);
    });

    it('Cenário 4: Identificação correta na 2ª tentativa confirma pedido com sucesso (exatamente 1 pedido)', async () => {
      const mockDb = createMockDb();
      const draft = createDraftData({ voiceConfirmationFailures: 1 });
      mockDb.store.alexaDrafts[draft.draftId] = draft;

      const envelope = {
        session: { sessionId: draft.sessionId, attributes: { draftId: draft.draftId, revision: 1 } },
        context: { System: { person: { personId: identity.personId } } }, // Agora com physicalPersonId correspondente!
        request: { type: 'IntentRequest', intent: { name: 'AMAZON.YesIntent' } },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb, authService: mockAuthService });

      expect(res.shouldEndSession).toBe(true);
      expect(res.speech).toContain('Pedido criado no seu espaço de teste com o número');

      const savedDraft = mockDb.store.alexaDrafts[draft.draftId];
      expect(savedDraft.state).toBe('committed');
      expect(Object.keys(mockDb.store.orders).length).toBe(1);
    });

    it('Cenário 5: Pessoa diferente continua estritamente rejeitada, mesmo com identidade anterior nos atributos de sessão', async () => {
      const mockDb = createMockDb();
      const draft = createDraftData({ voiceConfirmationFailures: 1 });
      mockDb.store.alexaDrafts[draft.draftId] = draft;

      const envelope = {
        session: { sessionId: draft.sessionId, attributes: { draftId: draft.draftId, revision: 1, personId: identity.personId } },
        context: { System: { person: { personId: 'amzn1.ask.person.IMPOSTOR' } } },
        request: { type: 'IntentRequest', intent: { name: 'AMAZON.YesIntent' } },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb, authService: mockAuthService });

      expect(res.shouldEndSession).toBe(true);
      expect(res.speech).toContain('A pessoa que está confirmando não é a mesma que iniciou o pedido. Criação cancelada por segurança.');
      expect(Object.keys(mockDb.store.orders).length).toBe(0);
      expect(mockDb.store.alexaDrafts[draft.draftId].state).toBe('awaiting_confirmation');
    });

    it('Cenário 6: Draft legado sem contador inicia em 0; contador malformado falha fechado no limite', async () => {
      const mockDb = createMockDb();

      // Caso A: Draft legado sem o campo voiceConfirmationFailures
      const legacyDraft = createDraftData({ draftId: 'draft-legacy', voiceConfirmationFailures: undefined });
      mockDb.store.alexaDrafts[legacyDraft.draftId] = legacyDraft;

      const envLegacy = {
        session: { sessionId: legacyDraft.sessionId, attributes: { draftId: legacyDraft.draftId, revision: 1 } },
        context: { System: {} },
        request: { type: 'IntentRequest', intent: { name: 'AMAZON.YesIntent' } },
      };

      const resA = await handleAlexaDialog({ envelope: envLegacy, identity, config: baseConfig, db: mockDb, authService: mockAuthService });
      expect(resA.shouldEndSession).toBe(false);
      expect(resA.speech).toContain('Não consegui reconhecer sua voz nesta resposta. Diga: pode confirmar.');
      expect(mockDb.store.alexaDrafts[legacyDraft.draftId].voiceConfirmationFailures).toBe(1);

      // Caso B: Draft com valor corrompido/malformado (ex: string "invalido") -> fail-closed vai para o app
      const corruptDraft = createDraftData({ draftId: 'draft-corrupt', voiceConfirmationFailures: 'corrompido' });
      mockDb.store.alexaDrafts[corruptDraft.draftId] = corruptDraft;

      const envCorrupt = {
        session: { sessionId: corruptDraft.sessionId, attributes: { draftId: corruptDraft.draftId, revision: 1 } },
        context: { System: {} },
        request: { type: 'IntentRequest', intent: { name: 'AMAZON.YesIntent' } },
      };

      const resB = await handleAlexaDialog({ envelope: envCorrupt, identity, config: baseConfig, db: mockDb, authService: mockAuthService });
      expect(resB.shouldEndSession).toBe(true);
      expect(resB.speech).toContain('Por segurança, o pedido foi enviado para aprovação no aplicativo Luisices');
      expect(mockDb.store.alexaDrafts[corruptDraft.draftId].state).toBe('awaiting_app_approval');
    });

    it('Cenário 7: Revisão divergente/ausente reapresenta resumo atualizado sem consumir tentativa de voz', async () => {
      const mockDb = createMockDb();
      const draft = createDraftData({ revision: 2, voiceConfirmationFailures: 1 });
      mockDb.store.alexaDrafts[draft.draftId] = draft;

      const envelope = {
        session: { sessionId: draft.sessionId, attributes: { draftId: draft.draftId, revision: 1 } }, // Revisão defasada (1 vs 2)
        context: { System: {} },
        request: { type: 'IntentRequest', intent: { name: 'AMAZON.YesIntent' } },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb, authService: mockAuthService });

      expect(res.shouldEndSession).toBe(false);
      expect(res.speech).toContain('Os dados do pedido foram atualizados.');
      expect(res.reprompt).toContain('Diga: pode confirmar. Ou diga não para alterar.');
      expect(res.sessionAttributes?.revision).toBe(2);

      // Não consumiu tentativa de voz
      expect(mockDb.store.alexaDrafts[draft.draftId].voiceConfirmationFailures).toBe(1);
    });

    it('Cenário 8: Repetir pedido (RepeatOrderIntent) reapresenta dados, não zera o contador e não grava pedido', async () => {
      const mockDb = createMockDb();
      const draft = createDraftData({ voiceConfirmationFailures: 1 });
      mockDb.store.alexaDrafts[draft.draftId] = draft;

      const envelope = {
        session: { sessionId: draft.sessionId, attributes: { draftId: draft.draftId, revision: 1 } },
        context: { System: {} },
        request: { type: 'IntentRequest', intent: { name: 'RepeatOrderIntent' } },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb, authService: mockAuthService });

      expect(res.shouldEndSession).toBe(false);
      expect(res.speech).toContain('Repetindo o pedido:');
      expect(res.reprompt).toContain('Você confirma o pedido? Diga: pode confirmar. Ou diga o que deseja corrigir.');

      // Contador e estado inalterados
      expect(mockDb.store.alexaDrafts[draft.draftId].voiceConfirmationFailures).toBe(1);
      expect(mockDb.store.alexaDrafts[draft.draftId].state).toBe('awaiting_confirmation');
      expect(Object.keys(mockDb.store.orders).length).toBe(0);
    });

    it('Cenário 9: Draft expirado não permite confirmação por voz e não reabre', async () => {
      const mockDb = createMockDb();
      const expiredDraft = createDraftData({
        expiresAt: { toDate: () => new Date(Date.now() - 60 * 1000) }, // Expirado há 1 minuto
      });
      mockDb.store.alexaDrafts[expiredDraft.draftId] = expiredDraft;

      const envelope = {
        session: { sessionId: expiredDraft.sessionId, attributes: { draftId: expiredDraft.draftId, revision: 1 } },
        context: { System: { person: { personId: identity.personId } } },
        request: { type: 'IntentRequest', intent: { name: 'AMAZON.YesIntent' } },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb, authService: mockAuthService });

      expect(res.shouldEndSession).toBe(true);
      expect(Object.keys(mockDb.store.orders).length).toBe(0);
      expect(mockDb.store.alexaDrafts[expiredDraft.draftId].state).toBe('awaiting_confirmation');
    });

    it('Cenário 10: Falha na transição para o app emite mensagem verdadeira e não alega envio com sucesso', async () => {
      const mockDb = createMockDb();
      const draft = createDraftData({ voiceConfirmationFailures: 2 });
      mockDb.store.alexaDrafts[draft.draftId] = draft;

      // Força erro na segunda transação (transição de app_approval)
      let txCount = 0;
      const originalRunTx = mockDb.runTransaction;
      mockDb.runTransaction = async (fn: any) => {
        txCount++;
        if (txCount > 1) {
          throw new Error('Firestore Deadlock Simulada');
        }
        return originalRunTx(fn);
      };

      const envelope = {
        session: { sessionId: draft.sessionId, attributes: { draftId: draft.draftId, revision: 1 } },
        context: { System: {} },
        request: { type: 'IntentRequest', intent: { name: 'AMAZON.YesIntent' } },
      };

      const res = await handleAlexaDialog({ envelope, identity, config: baseConfig, db: mockDb, authService: mockAuthService });

      expect(res.shouldEndSession).toBe(true);
      expect(res.speech).not.toContain('o pedido foi enviado para aprovação no aplicativo Luisices');
      expect(res.speech).toContain('não foi possível enviar o pedido para aprovação no aplicativo');
      expect(mockDb.store.alexaDrafts[draft.draftId].state).toBe('awaiting_confirmation');
    });

    it('Cenário 11: Modo app_approval não passa por novas tentativas de voz e transiciona direto com mensagem padrão', async () => {
      const mockDb = createMockDb();
      const draft = createDraftData({ mode: 'app_approval', voiceConfirmationFailures: 0 });
      mockDb.store.alexaDrafts[draft.draftId] = draft;

      const envelope = {
        session: { sessionId: draft.sessionId, attributes: { draftId: draft.draftId, revision: 1 } },
        context: { System: {} }, // Sem biometria física
        request: { type: 'IntentRequest', intent: { name: 'AMAZON.YesIntent' } },
      };

      const res = await handleAlexaDialog({
        envelope,
        identity: { ...identity, mode: 'app_approval' },
        config: baseConfig,
        db: mockDb,
        authService: mockAuthService,
      });

      expect(res.shouldEndSession).toBe(true);
      expect(res.speech).toContain('Pedido preparado no seu espaço de teste. Acesse o Luisices no aplicativo para conferir e aprovar a gravação definitiva.');
      expect(mockDb.store.alexaDrafts[draft.draftId].state).toBe('awaiting_app_approval');
      expect(Object.keys(mockDb.store.orders).length).toBe(0);
    });
  });

  describe('2. Caminho Completo do Backend (processAlexaEnvelope)', () => {
    it('Caminho 1: Sessão ativa -> confirmação sem personId físico gera retry -> nova confirmação com personId grava pedido', async () => {
      const mockDb = createMockDb();
      const draft = createDraftData({ voiceConfirmationFailures: 0 });
      mockDb.store.alexaDrafts[draft.draftId] = draft;

      // Turno 1: Confirmação sem biometria física atual, mas com personId salvo na sessão
      const envelope1 = {
        session: {
          sessionId: draft.sessionId,
          application: { applicationId: baseConfig.allowedSkillId },
          attributes: { draftId: draft.draftId, revision: 1, personId: identity.personId },
        },
        context: {
          System: {
            application: { applicationId: baseConfig.allowedSkillId },
            user: { userId: 'amzn1.ask.account.CARLOS' },
            device: { deviceId: 'device-echo-1' },
          },
        },
        request: {
          type: 'IntentRequest',
          requestId: 'req-full-path-turn-1',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const res1 = await processAlexaEnvelope(envelope1, {
        db: mockDb,
        config: baseConfig,
        authService: mockAuthService,
      });

      expect(res1.response.shouldEndSession).toBe(false);
      expect(res1.response.outputSpeech.text).toContain('Não consegui reconhecer sua voz nesta resposta. Diga: pode confirmar.');
      expect(res1.sessionAttributes.draftId).toBe(draft.draftId);
      expect(mockDb.store.alexaDrafts[draft.draftId].voiceConfirmationFailures).toBe(1);
      expect(Object.keys(mockDb.store.orders).length).toBe(0);

      // Turno 2: Usuário responde "pode confirmar" e a Alexa inclui o System.person.personId
      const envelope2 = {
        session: {
          sessionId: draft.sessionId,
          application: { applicationId: baseConfig.allowedSkillId },
          attributes: { ...res1.sessionAttributes },
        },
        context: {
          System: {
            application: { applicationId: baseConfig.allowedSkillId },
            user: { userId: 'amzn1.ask.account.CARLOS' },
            device: { deviceId: 'device-echo-1' },
            person: { personId: identity.personId },
          },
        },
        request: {
          type: 'IntentRequest',
          requestId: 'req-full-path-turn-2',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const res2 = await processAlexaEnvelope(envelope2, {
        db: mockDb,
        config: baseConfig,
        authService: mockAuthService,
      });

      expect(res2.response.shouldEndSession).toBe(true);
      expect(res2.response.outputSpeech.text).toContain('Pedido criado no seu espaço de teste com o número');
      expect(mockDb.store.alexaDrafts[draft.draftId].state).toBe('committed');
      expect(Object.keys(mockDb.store.orders).length).toBe(1);
    });

    it('Caminho 2: Deduplicação de transporte — reenvio com o mesmo requestId devolve resposta cacheada sem consumir nova tentativa', async () => {
      const mockDb = createMockDb();
      const draft = createDraftData({ voiceConfirmationFailures: 0 });
      mockDb.store.alexaDrafts[draft.draftId] = draft;

      const envelope = {
        session: {
          sessionId: draft.sessionId,
          application: { applicationId: baseConfig.allowedSkillId },
          attributes: { draftId: draft.draftId, revision: 1, personId: identity.personId },
        },
        context: {
          System: {
            application: { applicationId: baseConfig.allowedSkillId },
            user: { userId: 'amzn1.ask.account.CARLOS' },
            device: { deviceId: 'device-echo-1' },
          },
        },
        request: {
          type: 'IntentRequest',
          requestId: 'req-duplicate-same-id',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      // Primeira requisição
      const res1 = await processAlexaEnvelope(envelope, {
        db: mockDb,
        config: baseConfig,
        authService: mockAuthService,
      });
      expect(res1.response.shouldEndSession).toBe(false);
      expect(mockDb.store.alexaDrafts[draft.draftId].voiceConfirmationFailures).toBe(1);

      // Reenvio imediato com exatamente o mesmo requestId
      const res2 = await processAlexaEnvelope(envelope, {
        db: mockDb,
        config: baseConfig,
        authService: mockAuthService,
      });

      // Mesma resposta e NENHUMA tentativa extra consumida
      expect(res2.response.outputSpeech.text).toBe(res1.response.outputSpeech.text);
      expect(mockDb.store.alexaDrafts[draft.draftId].voiceConfirmationFailures).toBe(1);
    });

    it('Caminho 3: Pessoa diferente detectada na confirmação é bloqueada antes do commit', async () => {
      const mockDb = createMockDb();
      const draft = createDraftData({ voiceConfirmationFailures: 0 });
      mockDb.store.alexaDrafts[draft.draftId] = draft;

      // Usuário B com vínculo próprio mas tentando confirmar rascunho do Usuário A
      const envelope = {
        session: {
          sessionId: draft.sessionId,
          application: { applicationId: baseConfig.allowedSkillId },
          attributes: { draftId: draft.draftId, revision: 1, personId: identity.personId },
        },
        context: {
          System: {
            application: { applicationId: baseConfig.allowedSkillId },
            user: { userId: 'amzn1.ask.account.IMPOSTOR' },
            device: { deviceId: 'device-echo-1' },
            person: { personId: 'amzn1.ask.person.IMPOSTOR' },
          },
        },
        request: {
          type: 'IntentRequest',
          requestId: 'req-impostor-attempt',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const res = await processAlexaEnvelope(envelope, {
        db: mockDb,
        config: baseConfig,
        authService: mockAuthService,
      });

      expect(res.response.shouldEndSession).toBe(true);
      expect(res.response.outputSpeech.text).toContain('Não reconheci sua voz cadastrada');
      expect(Object.keys(mockDb.store.orders).length).toBe(0);
      expect(mockDb.store.alexaDrafts[draft.draftId].state).toBe('awaiting_confirmation');
    });

    it('Caminho 4: Perda de sessão e sem biometria na requisição é rejeitada na autorização antes do diálogo', async () => {
      const mockDb = createMockDb();
      const draft = createDraftData({ voiceConfirmationFailures: 0 });
      mockDb.store.alexaDrafts[draft.draftId] = draft;

      // Requisição sem System.person e sem session.attributes.personId
      const envelope = {
        session: {
          sessionId: 'new-unauth-session',
          application: { applicationId: baseConfig.allowedSkillId },
          attributes: { draftId: draft.draftId, revision: 1 }, // Sem personId!
        },
        context: {
          System: {
            application: { applicationId: baseConfig.allowedSkillId },
            user: { userId: 'amzn1.ask.account.UNKNOWN' },
            device: { deviceId: 'device-echo-1' },
          },
        },
        request: {
          type: 'IntentRequest',
          requestId: 'req-unauthorized-attempt',
          intent: { name: 'AMAZON.YesIntent' },
        },
      };

      const res = await processAlexaEnvelope(envelope, {
        db: mockDb,
        config: baseConfig,
        authService: mockAuthService,
      });

      expect(res.response.shouldEndSession).toBe(true);
      expect(res.response.outputSpeech.text).toContain('Não reconheci sua voz cadastrada');
      expect(Object.keys(mockDb.store.orders).length).toBe(0);
    });
  });
});

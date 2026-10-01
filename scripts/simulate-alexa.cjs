/**
 * Script de Simulação da Skill Alexa via CLI — Luisices
 * Executa o backend real de Cloud Functions (functions/alexa/index.js)
 * simulando os envelopes enviados pela Amazon Alexa.
 * 
 * Uso:
 *   node scripts/simulate-alexa.cjs
 *   npm run alexa:sim
 */

const path = require('path');
const { processAlexaEnvelope } = require('../functions/alexa/index');
const { COLLECTIONS, computeBindingKey } = require('../functions/alexa/repository');

const config = {
  environment: 'dev',
  isEnabled: true,
  allowedSkillId: 'amzn1.ask.skill.1cd0031f-ada0-4da8-8721-2ad44b4b1c96',
  timezone: 'America/Sao_Paulo',
  draftTtlMinutes: 15,
  pairingCodeTtlMinutes: 5,
  hmacKey: 'chave-secreta-hmac-desenvolvimento-luisices',
};

function createMockDb() {
  const amandaPersonId = 'amzn1.ask.person.AMANDA';
  const amandaUserId = 'amzn1.ask.account.TEST';
  const amandaBindingKey = computeBindingKey(
    config.environment,
    config.allowedSkillId,
    amandaUserId,
    amandaPersonId,
    config.hmacKey
  );

  const store = {
    [COLLECTIONS.DRAFTS]: {},
    [COLLECTIONS.COMMITS]: {},
    [COLLECTIONS.REQUESTS]: {},
    [COLLECTIONS.BINDINGS]: {
      [amandaBindingKey]: {
        bindingKey: amandaBindingKey,
        uid: 'uid-amanda',
        environment: 'dev',
        skillId: config.allowedSkillId,
        amazonUserId: amandaUserId,
        personId: amandaPersonId,
        active: true,
        revokedAt: null,
        mode: 'voice_confirm',
        createdAt: new Date(),
      },
    },
    [COLLECTIONS.PERMISSIONS]: {
      'uid-amanda': {
        uid: 'uid-amanda',
        enabled: true,
        mode: 'voice_confirm',
        createdAt: new Date(),
      },
    },
    [COLLECTIONS.USER_PROFILES]: {
      'uid-amanda': {
        uid: 'uid-amanda',
        displayName: 'Amanda Garcia',
        email: 'amanda@luisices.com.br',
        role: 'admin',
        active: true,
        permissions: {
          orders: { create: true, edit: true, view: true },
        },
      },
    },
    users: {
      'uid-amanda': {
        displayName: 'Amanda Garcia',
        email: 'amanda@luisices.com.br',
        role: 'admin',
        active: true,
        permissions: {
          orders: { create: true, edit: true, view: true },
        },
      },
    },
    counters: {
      orders_2026: { current: 42 },
    },
    orders: {},
    salesLedger: {},
    alexaAudit: {},
    alexaRateLimits: {},
  };

  const getDocRef = (col, id) => {
    const docRef = {
      id,
      get: async () => ({
        exists: Boolean(store[col]?.[id]),
        data: () => store[col]?.[id] || null,
        ref: docRef,
      }),
      set: async (data, options) => {
        store[col] = store[col] || {};
        store[col][id] = options?.merge ? { ...store[col][id], ...data } : data;
      },
      update: async (data) => {
        if (!store[col]?.[id]) throw new Error('Not found');
        store[col][id] = { ...store[col][id], ...data };
      },
      delete: async () => {
        if (store[col]?.[id]) delete store[col][id];
      },
    };
    return docRef;
  };

  return {
    store,
    doc: (pathStr) => {
      const parts = pathStr.split('/');
      return getDocRef(parts[0], parts[1]);
    },
    collection: (col) => {
      const queryObj = {
        where: () => queryObj,
        orderBy: () => queryObj,
        limit: () => queryObj,
        get: async () => {
          const items = Object.entries(store[col] || {}).map(([id, data]) => ({
            id,
            data: () => data,
          }));
          return { empty: items.length === 0, docs: items };
        },
        doc: (id) => getDocRef(col, id),
        add: async (data) => {
          const id = `auto-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          store[col] = store[col] || {};
          store[col][id] = data;
          return getDocRef(col, id);
        },
      };
      return queryObj;
    },
    runTransaction: async (cb) => {
      return cb({
        get: async (ref) => ref.get(),
        set: (ref, data, options) => ref.set(data, options),
        update: (ref, data) => ref.update(data),
      });
    },
  };
}

let reqCounter = 1;
function makeEnvelope({
  type = 'IntentRequest',
  intentName,
  slots = {},
  personId = 'amzn1.ask.person.AMANDA',
  sessionId = 'session-cli-test',
  sessionAttributes = {},
}) {
  const requestId = `amzn1.echo-api.request.req-${Date.now()}-${reqCounter++}`;
  return {
    version: '1.0',
    session: {
      new: type === 'LaunchRequest',
      sessionId,
      application: { applicationId: config.allowedSkillId },
      attributes: sessionAttributes,
      user: { userId: 'amzn1.ask.account.TEST' },
    },
    context: {
      System: {
        application: { applicationId: config.allowedSkillId },
        user: { userId: 'amzn1.ask.account.TEST' },
        person: personId ? { personId } : undefined,
      },
    },
    request: {
      type,
      requestId,
      timestamp: new Date().toISOString(),
      locale: 'pt-BR',
      intent: intentName
        ? {
            name: intentName,
            confirmationStatus: 'NONE',
            slots: Object.entries(slots).reduce((acc, [k, v]) => {
              acc[k] = { name: k, value: String(v), confirmationStatus: 'NONE' };
              return acc;
            }, {}),
          }
        : undefined,
    },
  };
}

async function runFullSimulation() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        🤖 SIMULADOR CLI DA SKILL ALEXA — LUISICES            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const db = createMockDb();
  let sessionAttrs = {};
  const sessionId = `cli-session-${Date.now()}`;
  const mockAuthService = {
    getUser: async (uid) => ({ uid, disabled: false, email: 'amanda@luisices.com.br' }),
  };

  // Passo 1: Abertura da Skill
  console.log('🗣️  [PASSO 1] VOCÊ: "Alexa, abrir ateliê de testes"');
  const res1 = await processAlexaEnvelope(
    makeEnvelope({ type: 'LaunchRequest', sessionId, sessionAttributes: sessionAttrs }),
    { db, config, authService: mockAuthService }
  );
  sessionAttrs = res1.sessionAttributes || {};
  console.log(`🔊 ALEXA: "${res1.response.outputSpeech.text}"\n`);

  // Passo 2: Ditar Pedido
  console.log('🗣️  [PASSO 2] VOCÊ: "Criar pedido de 50 caixinhas para Carla Dias"');
  const res2 = await processAlexaEnvelope(
    makeEnvelope({
      type: 'IntentRequest',
      intentName: 'CreateOrderIntent',
      slots: { customer: 'Carla Dias', product: 'caixinhas', quantity: 50 },
      sessionId,
      sessionAttributes: sessionAttrs,
    }),
    { db, config, authService: mockAuthService }
  );
  sessionAttrs = res2.sessionAttributes || {};
  console.log(`🔊 ALEXA: "${res2.response.outputSpeech.text}"\n`);

  // Passo 3: Informar Valor
  console.log('🗣️  [PASSO 3] VOCÊ: "4 reais cada"');
  const res3 = await processAlexaEnvelope(
    makeEnvelope({
      type: 'IntentRequest',
      intentName: 'ProvideUnitPriceIntent',
      slots: { unitPrice: 4 },
      sessionId,
      sessionAttributes: sessionAttrs,
    }),
    { db, config, authService: mockAuthService }
  );
  sessionAttrs = res3.sessionAttributes || {};
  console.log(`🔊 ALEXA: "${res3.response.outputSpeech.text}"\n`);

  // Passo 4: Informar Data
  console.log('🗣️  [PASSO 4] VOCÊ: "Entrega dia 25 de outubro"');
  const res4 = await processAlexaEnvelope(
    makeEnvelope({
      type: 'IntentRequest',
      intentName: 'ProvideDeliveryDateIntent',
      slots: { deliveryDate: '2026-10-25' },
      sessionId,
      sessionAttributes: sessionAttrs,
    }),
    { db, config, authService: mockAuthService }
  );
  sessionAttrs = res4.sessionAttributes || {};
  console.log(`🔊 ALEXA: "${res4.response.outputSpeech.text}"\n`);

  // Passo 5: Confirmar
  console.log('🗣️  [PASSO 5] VOCÊ: "Sim, confirmo"');
  const res5 = await processAlexaEnvelope(
    makeEnvelope({
      type: 'IntentRequest',
      intentName: 'AMAZON.YesIntent',
      sessionId,
      sessionAttributes: sessionAttrs,
    }),
    { db, config, authService: mockAuthService }
  );
  console.log(`🔊 ALEXA: "${res5.response.outputSpeech.text}"\n`);

  // Passo 6: Consultar Pedidos Criados
  console.log('🗣️  [PASSO 6] VOCÊ: "Alexa, consultar pedidos"');
  const res6 = await processAlexaEnvelope(
    makeEnvelope({
      type: 'IntentRequest',
      intentName: 'ListRecentOrdersIntent',
      sessionId: `consult-session-${Date.now()}`,
    }),
    { db, config, authService: mockAuthService }
  );
  console.log(`🔊 ALEXA: "${res6.response.outputSpeech.text}"\n`);

  // Passo 7: Teste com Voz Não Cadastrada
  console.log('🗣️  [PASSO 7] PESSOA DESCONHECIDA: "Alexa, abrir ateliê de testes"');
  const res7 = await processAlexaEnvelope(
    makeEnvelope({
      type: 'LaunchRequest',
      personId: null,
      sessionId: `unauth-${Date.now()}`,
    }),
    { db, config, authService: mockAuthService }
  );
  console.log(`🔊 ALEXA (DEFESA BIOMÉTRICA): "${res7.response.outputSpeech.text}"\n`);

  console.log('════════════════════════════════════════════════════════════════');
  console.log('✨ Simulação concluída com 100% de sucesso.');
  console.log('════════════════════════════════════════════════════════════════\n');
}

runFullSimulation().catch((err) => {
  console.error('❌ Erro na simulação:', err);
  process.exit(1);
});

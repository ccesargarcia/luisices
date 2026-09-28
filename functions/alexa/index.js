/**
 * Ponto de entrada do subsistema Alexa para Cloud Functions (v2).
 * Segue estritamente a especificação docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md.
 */

const { onRequest, onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { getAlexaConfig, ALEXA_IDENTITY_HMAC_KEY } = require('./config');
const { verifyAlexaHttpRequest } = require('./verification');
const { authorizeAlexaPerson } = require('./authorization');
const { checkBindingRequestRateLimit } = require('./rateLimit');
const { handleVoicePairingRequest } = require('./pairing');
const { handleAlexaDialog } = require('./dialog');
const { COLLECTIONS, computeRequestKey } = require('./repository');
const {
  approveAlexaPairingHandler,
  setAlexaPermissionHandler,
  revokeAlexaBindingHandler,
  toggleGlobalAlexaIntegrationHandler,
  getAlexaIntegrationStatusHandler,
  approveAlexaDraftHandler,
} = require('./callables');

/**
 * Constrói a resposta em conformidade com o protocolo Alexa Skills Kit.
 */
function buildAlexaResponse({ speech, reprompt, shouldEndSession = true, sessionAttributes = {} }) {
  const responseObj = {
    outputSpeech: {
      type: 'PlainText',
      text: speech || '',
    },
    shouldEndSession: Boolean(shouldEndSession),
  };

  if (reprompt && !shouldEndSession) {
    responseObj.reprompt = {
      outputSpeech: {
        type: 'PlainText',
        text: reprompt,
      },
    };
  }

  return {
    version: '1.0',
    response: responseObj,
    sessionAttributes: sessionAttributes || {},
  };
}

/**
 * Processador central de envelopes Alexa.
 * Usado pelo endpoint HTTP oficial (após validação de assinatura)
 * e também exposto para execução direta de testes de domínio com envelopes sintéticos.
 */
async function processAlexaEnvelope(envelope, { db, config, authService = null } = {}) {
  const reqType = envelope?.request?.type;
  const intentName = envelope?.request?.intent?.name;
  const requestId = envelope?.request?.requestId;
  const rawAppId =
    envelope?.session?.application?.applicationId ||
    envelope?.context?.System?.application?.applicationId;
  const appId = rawAppId || '';

  // Se config.allowedSkillId estiver configurado, exige correspondência estrita no envelope
  if (config?.allowedSkillId) {
    if (!appId || appId !== config.allowedSkillId) {
      console.warn('[processAlexaEnvelope] Skill ID ausente ou não autorizado:', appId);
      return buildAlexaResponse({
        speech: 'Esta skill não está autorizada para este ambiente.',
        shouldEndSession: true,
      });
    }
  }

  // 0. Deduplicação e proteção contra replays HTTP (alexaRequests/{requestKey})
  let reqRef = null;
  let requestKey = null;
  if (requestId && db) {
    requestKey = computeRequestKey(appId || config?.allowedSkillId || '', requestId);
    reqRef = db.collection(COLLECTIONS.REQUESTS).doc(requestKey);

    let cachedResponse = null;

    if (typeof db.runTransaction === 'function') {
      try {
        await db.runTransaction(async (transaction) => {
          const snap = await transaction.get(reqRef);
          const now = Date.now();
          if (snap.exists) {
            const data = snap.data() || {};
            // 1. Resposta final já persistida (idempotência / replay)
            if (data.status === 'completed' && data.response) {
              cachedResponse = data.response;
              return;
            }
            if (data.response) {
              cachedResponse = data.response;
              return;
            }
            // 2. Requisição concorrente ainda em processamento (janela de 15s)
            const startedAt = data.startedAt || (data.createdAt?.toDate ? data.createdAt.toDate().getTime() : now);
            if (data.status === 'in_progress' && (now - startedAt < 15000)) {
              cachedResponse = buildAlexaResponse({
                speech: 'Esta solicitação já está em processamento.',
                shouldEndSession: true,
              });
              return;
            }
          }

          // Aquisição atômica da requisição
          transaction.set(reqRef, {
            requestKey,
            requestId,
            appId,
            environment: config?.environment || 'dev',
            status: 'in_progress',
            startedAt: now,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(now + 150000), // 150s TTL
          });
        });
      } catch (err) {
        // Falha fechada: se a reserva atômica falhar, não executar efeitos; retornar erro seguro
        console.warn('[AlexaDeduplication] Erro na reserva atômica de requisição (fail-closed):', err.message);
        return buildAlexaResponse({
          speech: 'Ocorreu uma instabilidade temporária ao processar sua solicitação. Por favor, tente novamente.',
          shouldEndSession: true,
        });
      }
    } else {
      const existingSnap = await reqRef.get().catch(() => null);
      if (existingSnap && existingSnap.exists) {
        const data = existingSnap.data() || {};
        if (data.response) {
          return data.response;
        }
        return buildAlexaResponse({
          speech: 'Esta solicitação já está em processamento.',
          shouldEndSession: true,
        });
      }
    }

    if (cachedResponse) {
      return cachedResponse;
    }
  }

  const persistResponse = async (resp) => {
    if (reqRef) {
      try {
        await reqRef.set({
          requestKey,
          requestId,
          appId,
          environment: config?.environment || 'dev',
          status: 'completed',
          response: resp,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(Date.now() + 150000),
        }, { merge: true });
      } catch (err) {
        console.warn('[AlexaDeduplication] Erro ao salvar cache de requisição:', err.message);
      }
    }
    return resp;
  };

  try {
    // 1. Tratamento de SessionEndedRequest
    if (reqType === 'SessionEndedRequest') {
      const resp = buildAlexaResponse({ speech: '', shouldEndSession: true });
      return await persistResponse(resp);
    }

    // 2. Fluxo de Pareamento Supervisionado (LinkVoiceIntent)
    if (intentName === 'LinkVoiceIntent') {
      const pairingRes = await handleVoicePairingRequest(envelope, config, db);
      const resp = buildAlexaResponse({
        speech: pairingRes.speech,
        shouldEndSession: pairingRes.shouldEndSession,
      });
      return await persistResponse(resp);
    }

    // 3. Autorização estrita de voz para pedidos (LaunchRequest, CreateOrderIntent, etc.)
    const authRes = await authorizeAlexaPerson(envelope, config, db);
    if (!authRes.authorized) {
      // Se for LaunchRequest e o motivo for falta de vínculo ou reconhecimento inicial,
      // mantém a sessão aberta para que a pessoa possa dizer "vincular minha voz".
      let speech = authRes.speech;
      let shouldEnd = true;
      let reprompt = undefined;

      if (reqType === 'LaunchRequest' && (authRes.code === 'VOICE_NOT_ALLOWED' || authRes.code === 'VOICE_NOT_RECOGNIZED')) {
        speech = authRes.code === 'VOICE_NOT_ALLOWED'
          ? 'Olá! Sua voz foi reconhecida, mas ainda não está vinculada ao Luisices. Diga: gerar código, para receber seu código de vinculação.'
          : 'Olá! Bem-vindo ao Luisices de teste. Diga: gerar código, para receber seu código de vinculação.';
        reprompt = 'Diga: gerar código.';
        shouldEnd = false;
      }

      const resp = buildAlexaResponse({
        speech,
        reprompt,
        shouldEndSession: shouldEnd,
      });

      return await persistResponse(resp);
    }

    const identity = authRes.identity;

    // 4. Rate limiting distribuído por vínculo (30 req/min)
    if (identity.bindingKey) {
      const rateCheck = await checkBindingRequestRateLimit(db, identity.bindingKey);
      if (!rateCheck.allowed) {
        const resp = buildAlexaResponse({
          speech: 'Muitas requisições em curto período de tempo. Aguarde um minuto e tente novamente.',
          shouldEndSession: true,
        });
        return await persistResponse(resp);
      }
    }

    // 5. Execução do diálogo do pedido
    const dialogRes = await handleAlexaDialog({
      envelope,
      identity,
      config,
      db,
      authService,
    });

    const sessionAttributes = {
      ...(dialogRes.sessionAttributes || {}),
      personId: identity.personId,
    };

    const finalResponse = buildAlexaResponse({
      speech: dialogRes.speech,
      reprompt: dialogRes.reprompt,
      shouldEndSession: dialogRes.shouldEndSession,
      sessionAttributes,
    });

    return await persistResponse(finalResponse);
  } catch (err) {
    if (reqRef) {
      reqRef.set({ status: 'failed', error: err.message }, { merge: true }).catch(() => {});
    }
    throw err;
  }
}

/**
 * Webhook oficial da Alexa exposto via HTTPS direto (Cloud Functions v2 onRequest).
 * Exige validação estrita de certificados e assinaturas da Amazon.
 */
const alexaWebhook = onRequest(
  {
    maxInstances: 2,
    memory: '256MiB',
    secrets: [ALEXA_IDENTITY_HMAC_KEY],
  },
  async (req, res) => {
    // 1. Verificação criptográfica da Amazon ANTES de qualquer acesso ao Firestore.
    // Inclui: método POST, limite de corpo, timestamp e assinatura criptográfica.
    // NÃO inclui verificação de Skill ID neste momento — o allowedSkillId pode ter
    // um override no Firestore diferente do valor estático do env var (achado 7).
    // Usa config estática (sem db) apenas para maxRequestBodySize.
    const staticConfig = await getAlexaConfig();
    const verification = await verifyAlexaHttpRequest(req, { ...staticConfig, allowedSkillId: '' });
    if (!verification.valid) {
      console.warn('[alexaWebhook] Falha de verificação HTTP:', verification.error);
      return res.status(verification.statusCode || 400).json({ error: verification.error });
    }

    // 2. Somente após verificação criptográfica aprovada, carregar config dinâmica do Firestore.
    const db = admin.firestore();
    const config = await getAlexaConfig(db);

    // 3. Verificar Skill ID com a configuração ativa (pode incluir override do Firestore).
    // Achado 6: se config.allowedSkillId está configurado, envelopeAppId é OBRIGATÓRIO e deve bater.
    if (config.allowedSkillId) {
      const envelope = verification.envelope;
      const envelopeAppId =
        envelope?.session?.application?.applicationId ||
        envelope?.context?.System?.application?.applicationId;
      if (!envelopeAppId || envelopeAppId !== config.allowedSkillId) {
        console.warn('[alexaWebhook] Skill ID ausente ou não autorizado:', envelopeAppId);
        return res.status(403).json({ error: `Skill ID não autorizada para este ambiente (${config.environment}).` });
      }
    }

    try {
      // 4. Processar envelope verificado
      const alexaResponse = await processAlexaEnvelope(verification.envelope, { db, config });
      return res.status(200).json(alexaResponse);
    } catch (err) {
      console.error('[alexaWebhook] Erro inesperado ao processar envelope:', err);
      const fallbackResponse = buildAlexaResponse({
        speech: 'Ocorreu um erro interno ao processar sua solicitação no Luisices.',
        shouldEndSession: true,
      });
      return res.status(200).json(fallbackResponse);
    }
  }
);

// Callables administrativos
const approveAlexaPairing = onCall(
  { maxInstances: 5, secrets: [ALEXA_IDENTITY_HMAC_KEY] },
  (req) => approveAlexaPairingHandler(req, admin.firestore())
);

const setAlexaPermission = onCall(
  { maxInstances: 5, secrets: [ALEXA_IDENTITY_HMAC_KEY] },
  (req) => setAlexaPermissionHandler(req, admin.firestore())
);

const revokeAlexaBinding = onCall(
  { maxInstances: 5, secrets: [ALEXA_IDENTITY_HMAC_KEY] },
  (req) => revokeAlexaBindingHandler(req, admin.firestore())
);

const toggleGlobalAlexaIntegration = onCall(
  { maxInstances: 5, secrets: [ALEXA_IDENTITY_HMAC_KEY] },
  (req) => toggleGlobalAlexaIntegrationHandler(req, admin.firestore())
);

const getAlexaIntegrationStatus = onCall(
  { maxInstances: 5, secrets: [ALEXA_IDENTITY_HMAC_KEY] },
  (req) => getAlexaIntegrationStatusHandler(req, admin.firestore())
);

const approveAlexaDraft = onCall(
  { maxInstances: 5, secrets: [ALEXA_IDENTITY_HMAC_KEY] },
  (req) => approveAlexaDraftHandler(req, admin.firestore())
);

module.exports = {
  alexaWebhook,
  approveAlexaPairing,
  setAlexaPermission,
  revokeAlexaBinding,
  toggleGlobalAlexaIntegration,
  getAlexaIntegrationStatus,
  approveAlexaDraft,
  processAlexaEnvelope,
  buildAlexaResponse,
};

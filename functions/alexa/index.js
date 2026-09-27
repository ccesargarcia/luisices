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
async function processAlexaEnvelope(envelope, { db, config }) {
  const reqType = envelope?.request?.type;
  const intentName = envelope?.request?.intent?.name;

  // 1. Tratamento de SessionEndedRequest
  if (reqType === 'SessionEndedRequest') {
    return buildAlexaResponse({ speech: '', shouldEndSession: true });
  }

  // 2. Fluxo de Pareamento Supervisionado (LinkVoiceIntent)
  if (intentName === 'LinkVoiceIntent') {
    const pairingRes = await handleVoicePairingRequest(envelope, config, db);
    return buildAlexaResponse({
      speech: pairingRes.speech,
      shouldEndSession: pairingRes.shouldEndSession,
    });
  }

  // 3. Autorização estrita de voz para pedidos (LaunchRequest, CreateOrderIntent, etc.)
  const authRes = await authorizeAlexaPerson(envelope, config, db);
  if (!authRes.authorized) {
    return buildAlexaResponse({
      speech: authRes.speech,
      shouldEndSession: true,
    });
  }

  const identity = authRes.identity;

  // 4. Rate limiting distribuído por vínculo (30 req/min)
  if (identity.bindingKey) {
    const rateCheck = await checkBindingRequestRateLimit(db, identity.bindingKey);
    if (!rateCheck.allowed) {
      return buildAlexaResponse({
        speech: 'Muitas requisições em curto período de tempo. Aguarde um minuto e tente novamente.',
        shouldEndSession: true,
      });
    }
  }

  // 5. Execução do diálogo do pedido
  const dialogRes = await handleAlexaDialog({
    envelope,
    identity,
    config,
    db,
  });

  return buildAlexaResponse({
    speech: dialogRes.speech,
    reprompt: dialogRes.reprompt,
    shouldEndSession: dialogRes.shouldEndSession,
    sessionAttributes: dialogRes.sessionAttributes,
  });
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
    const db = admin.firestore();
    const config = await getAlexaConfig(db);

    // 1. Verificação Criptográfica da Amazon sobre o rawBody
    const verification = await verifyAlexaHttpRequest(req, config);
    if (!verification.valid) {
      console.warn('[alexaWebhook] Falha de verificação HTTP:', verification.error);
      return res.status(verification.statusCode || 400).json({ error: verification.error });
    }

    try {
      // 2. Processar envelope verificado
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

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
const { ORIGIN_SECRET, validateOriginSecret } = require('../originProtection');
const {
  approveAlexaPairingHandler,
  setAlexaPermissionHandler,
  revokeAlexaBindingHandler,
  toggleGlobalAlexaIntegrationHandler,
  getAlexaIntegrationStatusHandler,
  approveAlexaDraftHandler,
} = require('./callables');

// Janela unificada de deduplicação de requisições: 300s (5 minutos)
const REQUEST_DEDUPE_TTL_MS = 300 * 1000;

/**
 * Constrói a resposta em conformidade com o protocolo Alexa Skills Kit.
 */
function buildAlexaResponse({ speech, reprompt, shouldEndSession = true, sessionAttributes = {}, card = null, directives = null }) {
  const responseObj = {
    shouldEndSession: Boolean(shouldEndSession),
  };

  if (speech && typeof speech === 'string' && speech.trim().length > 0) {
    responseObj.outputSpeech = {
      type: 'PlainText',
      text: speech.trim(),
    };
  }

  if (card) {
    responseObj.card = card;
  }

  if (directives && Array.isArray(directives) && directives.length > 0) {
    responseObj.directives = directives;
  }

  if (reprompt && !shouldEndSession && typeof reprompt === 'string' && reprompt.trim().length > 0) {
    responseObj.reprompt = {
      outputSpeech: {
        type: 'PlainText',
        text: reprompt.trim(),
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

  // Achado Rodada 6: requestId é obrigatório e com limites razoáveis de tamanho (8 a 300 chars)
  if (
    !requestId ||
    typeof requestId !== 'string' ||
    !requestId.trim() ||
    requestId.trim().length < 8 ||
    requestId.trim().length > 300
  ) {
    console.warn('[processAlexaEnvelope] requestId ausente, inválido ou fora dos limites:', requestId);
    return buildAlexaResponse({
      speech: 'Requisição inválida ou incompleta.',
      shouldEndSession: true,
    });
  }

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
  // Achado Rodada 7 (P1): db e db.collection são estritamente obrigatórios para garantir reserva transacional
  if (!db || typeof db.collection !== 'function') {
    console.warn('[processAlexaEnvelope] db ausente ou sem suporte a Firestore (fail-closed)');
    return buildAlexaResponse({
      speech: 'Ocorreu uma instabilidade temporária ao processar sua solicitação. Por favor, tente novamente.',
      shouldEndSession: true,
    });
  }

  const requestKey = computeRequestKey(appId || config?.allowedSkillId || '', requestId);
  const reqRef = db.collection(COLLECTIONS.REQUESTS).doc(requestKey);

  let cachedResponse = null;

  if (typeof db.runTransaction !== 'function') {
    // Achado Rodada 6: sem db.runTransaction, falha fechado imediatamente para evitar processamento não-atômico
    console.warn('[AlexaDeduplication] db.runTransaction indisponível (fail-closed)');
    return buildAlexaResponse({
      speech: 'Ocorreu uma instabilidade temporária ao processar sua solicitação. Por favor, tente novamente.',
      shouldEndSession: true,
    });
  }

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

        // Aquisição atômica da requisição (TTL unificado de 300s / 5 min)
        transaction.set(reqRef, {
          requestKey,
          requestId,
          appId,
          environment: config?.environment || 'dev',
          status: 'in_progress',
          startedAt: now,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(now + REQUEST_DEDUPE_TTL_MS),
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

    if (cachedResponse) {
      return cachedResponse;
    }

    const persistResponse = async (resp) => {
      try {
        await reqRef.set({
          requestKey,
          requestId,
          appId,
          environment: config?.environment || 'dev',
          status: 'completed',
          response: resp,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(Date.now() + REQUEST_DEDUPE_TTL_MS),
        }, { merge: true });
      } catch (err) {
        console.warn('[AlexaDeduplication] Erro ao salvar cache de requisição:', err.message);
      }
      return resp;
    };

  try {
    // 1. Tratamento de SessionEndedRequest (resposta RFC vazia conforme especificação ASK)
    if (reqType === 'SessionEndedRequest') {
      const resp = {
        version: '1.0',
        response: {},
      };
      return await persistResponse(resp);
    }

    // Tratamento seguro de eventos de toque em tela APL (Alexa.Presentation.APL.UserEvent)
    if (reqType === 'Alexa.Presentation.APL.UserEvent') {
      const args = Array.isArray(envelope?.request?.arguments) ? envelope.request.arguments : [];
      const action = String(args[0] || '').trim();
      const sessionAttrs = envelope?.session?.attributes || {};

      const ALLOWED_INTENTS = new Set([
        'CreateOrderIntent',
        'ListRecentOrdersIntent',
        'LinkVoiceIntent',
        'AMAZON.HelpIntent',
        'AMAZON.CancelIntent',
        'AMAZON.StopIntent',
      ]);

      if (action === 'confirmOrder') {
        const touchDraftId = args[1] ? String(args[1]).trim() : null;
        const touchRevision = args[2] !== undefined && args[2] !== null ? Number(args[2]) : null;

        // Se o evento carrega draftId/revision, valida com a sessão atual para evitar toque em tela obsoleta
        if (touchDraftId && sessionAttrs.draftId && touchDraftId !== sessionAttrs.draftId) {
          const resp = buildAlexaResponse({
            speech: 'As informações na tela mudaram. Por favor, revise o pedido atual antes de confirmar.',
            shouldEndSession: false,
            sessionAttributes: sessionAttrs,
          });
          return await persistResponse(resp);
        }
        if (touchRevision !== null && sessionAttrs.revision !== undefined && touchRevision !== sessionAttrs.revision) {
          const resp = buildAlexaResponse({
            speech: 'O pedido foi atualizado. Por favor, confirme as novas informações.',
            shouldEndSession: false,
            sessionAttributes: sessionAttrs,
          });
          return await persistResponse(resp);
        }

        envelope.request.type = 'IntentRequest';
        envelope.request.intent = { name: 'AMAZON.YesIntent', confirmationStatus: 'NONE' };
      } else if (action === 'cancelOrder') {
        envelope.request.type = 'IntentRequest';
        envelope.request.intent = { name: 'AMAZON.CancelIntent', confirmationStatus: 'NONE' };
      } else if (action === 'selectProduct' && args[1]) {
        envelope.request.type = 'IntentRequest';
        envelope.request.intent = {
          name: 'ProvideProductIntent',
          confirmationStatus: 'NONE',
          slots: { product: { name: 'product', value: String(args[1]).trim() } },
        };
      } else if (action === 'selectQuantity' && args[1] !== undefined && args[1] !== null) {
        const qtyNum = parseInt(args[1], 10);
        if (Number.isInteger(qtyNum) && qtyNum > 0) {
          envelope.request.type = 'IntentRequest';
          envelope.request.intent = {
            name: 'ProvideQuantityIntent',
            confirmationStatus: 'NONE',
            slots: { quantity: { name: 'quantity', value: String(qtyNum) } },
          };
        } else {
          console.warn('[AlexaUserEvent] Quantidade APL inválida:', args[1]);
          const resp = buildAlexaResponse({
            speech: 'Quantidade inválida.',
            shouldEndSession: false,
            sessionAttributes: sessionAttrs,
          });
          return await persistResponse(resp);
        }
      } else if (action === 'selectDeliveryDate' && args[1]) {
        const dateStr = String(args[1]).trim();
        envelope.request.type = 'IntentRequest';
        envelope.request.intent = {
          name: 'ProvideDeliveryDateIntent',
          confirmationStatus: 'NONE',
          slots: { deliveryDate: { name: 'deliveryDate', value: dateStr } },
        };
      } else if (action === 'selectPriceBasis') {
        const basis = String(args[1] || '').trim();
        envelope.request.type = 'IntentRequest';
        envelope.request.intent = {
          name: basis === 'unit' ? 'ClarifyPriceUnitIntent' : 'ClarifyPriceTotalIntent',
          confirmationStatus: 'NONE',
        };
      } else if (action === 'confirmSuggestedPrice') {
        envelope.request.type = 'IntentRequest';
        envelope.request.intent = { name: 'AMAZON.YesIntent', confirmationStatus: 'NONE' };
      } else if (action === 'rejectSuggestedPrice') {
        envelope.request.type = 'IntentRequest';
        envelope.request.intent = { name: 'AMAZON.NoIntent', confirmationStatus: 'NONE' };
      } else if (action === 'intent' && args[1]) {
        const requestedIntent = String(args[1]).trim();
        if (ALLOWED_INTENTS.has(requestedIntent)) {
          envelope.request.type = 'IntentRequest';
          envelope.request.intent = { name: requestedIntent, confirmationStatus: 'NONE' };
        } else {
          console.warn('[AlexaUserEvent] Intent solicitada por APL não permitida:', requestedIntent);
          const resp = buildAlexaResponse({
            speech: 'Ação não disponível no momento.',
            shouldEndSession: false,
            sessionAttributes: sessionAttrs,
          });
          return await persistResponse(resp);
        }
      } else {
        console.warn('[AlexaUserEvent] Ação APL não reconhecida:', action);
        const resp = buildAlexaResponse({
          speech: 'Opção não reconhecida.',
          shouldEndSession: false,
          sessionAttributes: sessionAttrs,
        });
        return await persistResponse(resp);
      }
    }

    const currentIntentName = envelope?.request?.intent?.name || intentName;

    // 2. Fluxo de Pareamento Supervisionado (LinkVoiceIntent / PairAlexaIntent / GeneratePairingCodeIntent)
    if (
      currentIntentName === 'LinkVoiceIntent' ||
      currentIntentName === 'PairAlexaIntent' ||
      currentIntentName === 'GeneratePairingCodeIntent'
    ) {
      const pairingRes = await handleVoicePairingRequest(envelope, config, db);
      const resp = buildAlexaResponse({
        speech: pairingRes.speech,
        shouldEndSession: pairingRes.shouldEndSession,
        card: pairingRes.card,
        directives: pairingRes.directives,
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
      } else if (reqType === 'Alexa.Presentation.APL.UserEvent' && (authRes.code === 'VOICE_NOT_ALLOWED' || authRes.code === 'VOICE_NOT_RECOGNIZED')) {
        speech = 'Para sua segurança, por favor confirme esta ação com a sua voz.';
        reprompt = 'Diga o que você deseja fazer.';
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
      card: dialogRes.card,
      directives: dialogRes.directives,
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
 * Escala para 0 (minInstances: 0) para custo zero quando ocioso.
 */
const alexaWebhook = onRequest(
  {
    minInstances: 0,
    maxInstances: 2,
    memory: '256MiB',
    secrets: [ALEXA_IDENTITY_HMAC_KEY, ORIGIN_SECRET],
  },
  async (req, res) => {
    // 0. Bloqueio de acesso direto fora da Cloudflare
    const originCheck = validateOriginSecret(req);
    if (!originCheck.allowed) {
      console.warn('[alexaWebhook] Tentativa de acesso direto bloqueada (sem header da Cloudflare)');
      return res.status(originCheck.statusCode || 403).json({ error: originCheck.error });
    }

    console.log(`[alexaWebhook] Requisição recebida: method=${req.method}`);

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

    const envelope = verification.envelope;
    const envelopeAppId =
      envelope?.session?.application?.applicationId ||
      envelope?.context?.System?.application?.applicationId;
    const reqType = envelope?.request?.type;
    console.log(`[alexaWebhook] Requisição verificada com sucesso. Tipo: ${reqType}, AppId: ${envelopeAppId || 'indefinido'}`);

    // 2. Somente após verificação criptográfica aprovada, carregar config dinâmica do Firestore.
    const db = admin.firestore();
    const config = await getAlexaConfig(db);

    // 3. Verificar Skill ID com a configuração ativa (pode incluir override do Firestore).
    // Achado 6: se config.allowedSkillId está configurado, envelopeAppId é OBRIGATÓRIO e deve bater.
    if (config.allowedSkillId) {
      if (!envelopeAppId || envelopeAppId !== config.allowedSkillId) {
        console.warn(`[alexaWebhook] Skill ID não autorizado. Recebido: '${envelopeAppId}', Esperado: '${config.allowedSkillId}'`);
        return res.status(403).json({ error: `Skill ID não autorizada para este ambiente (${config.environment}).` });
      }
    }

    // 3.5. Exigir requestId obrigatório no envelope (Achado Rodada 6)
    const reqId = envelope?.request?.requestId;
    if (!reqId || typeof reqId !== 'string' || !reqId.trim()) {
      console.warn('[alexaWebhook] requestId ausente ou inválido no envelope');
      return res.status(400).json({ error: 'requestId ausente ou inválido no envelope.' });
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

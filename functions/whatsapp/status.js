const moduleInitializationStartedAt = process.hrtime.bigint();
const { HttpsError } = require('firebase-functions/v2/https');
const { onCall } = require('../common/sentryFunctions');
const { EVOLUTION_API_KEY } = require('../common/secrets');
const { EVOLUTION_API_URL, EVOLUTION_INSTANCE } = require('../common/helpers');
const { withFirstInvocationSpan } = require('../common/sentry');
const { isAuthorizedForWhatsApp } = require('./authorization');
const { fetchWhatsAppInstanceStatus } = require('./statusCore');

let moduleInitializationMs = null;

const getWhatsAppInstanceStatus = onCall(
  { maxInstances: 5, secrets: [EVOLUTION_API_KEY] },
  withFirstInvocationSpan('getWhatsAppInstanceStatus', async (request) => {
    if (!(await isAuthorizedForWhatsApp(request))) {
      throw new HttpsError('permission-denied', 'Sem permissão para utilizar o módulo de Atendimento (WhatsApp).');
    }

    const apiKey = (typeof EVOLUTION_API_KEY.value === 'function' ? EVOLUTION_API_KEY.value() : process.env.EVOLUTION_API_KEY) || '';
    return fetchWhatsAppInstanceStatus({
      apiKey,
      instance: EVOLUTION_INSTANCE,
      apiUrl: EVOLUTION_API_URL,
    });
  }, () => moduleInitializationMs)
);

moduleInitializationMs = Number((Number(process.hrtime.bigint() - moduleInitializationStartedAt) / 1e6).toFixed(2));

module.exports = { getWhatsAppInstanceStatus };

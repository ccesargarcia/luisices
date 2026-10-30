const moduleInitializationStartedAt = process.hrtime.bigint();

const { getFirestore } = require('firebase-admin/firestore');
const { onCall } = require('../common/sentryFunctions');
const { assertActiveSession } = require('../common/helpers');
const { withFirstInvocationSpan } = require('../common/sentry');
const { mapToHttpsError } = require('./httpsError');
const { createGetAiUsageHandler } = require('./usageHandler');

let moduleInitializationMs = null;

const getAiUsage = onCall(
  { cors: true, maxInstances: 5 },
  withFirstInvocationSpan('getAiUsage', async (request) => {
    const db = getFirestore();
    try {
      const { profile } = await assertActiveSession(request, { db });
      request.authProfile = profile;
      return await createGetAiUsageHandler({ db })(request);
    } catch (err) {
      throw mapToHttpsError(err);
    }
  }, () => moduleInitializationMs)
);

moduleInitializationMs = Number((Number(process.hrtime.bigint() - moduleInitializationStartedAt) / 1e6).toFixed(2));

module.exports = { getAiUsage };

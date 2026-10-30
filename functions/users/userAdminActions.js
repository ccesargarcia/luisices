const { HttpsError } = require('firebase-functions/v2/https');
const { adminUserActionLimiter } = require('../common/rateLimiters');

async function consumeAdminUserAction(uid) {
  try {
    await adminUserActionLimiter.consume(uid);
  } catch {
    throw new HttpsError(
      'resource-exhausted',
      'Limite de operações administrativas atingido. Tente novamente mais tarde.'
    );
  }
}

module.exports = { consumeAdminUserAction };

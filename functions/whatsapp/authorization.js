const { assertActiveSession } = require('../common/helpers');

function createWhatsAppAuthorizer(assertSession) {
  return async (request) => {
    try {
      const { profile } = await assertSession(request);
      if (profile.role === 'admin') return true;
      return (profile.role === 'user' || profile.role === 'funcionario')
        && profile.permissions?.whatsapp === true;
    } catch {
      return false;
    }
  };
}

const isAuthorizedForWhatsApp = createWhatsAppAuthorizer(assertActiveSession);

module.exports = { createWhatsAppAuthorizer, isAuthorizedForWhatsApp };

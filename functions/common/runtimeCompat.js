const { getFirestore } = require('firebase-admin/firestore');

let HttpsErrorImpl;
try {
  ({ HttpsError: HttpsErrorImpl } = require('firebase-functions/v2/https'));
} catch {
  HttpsErrorImpl = class AlexaHttpsError extends Error {
    constructor(code, message, details) {
      super(message);
      this.name = 'HttpsError';
      this.code = code;
      if (details !== undefined) this.details = details;
    }
  };
}

let assertActiveSessionImpl;
try {
  ({ assertActiveSession: assertActiveSessionImpl } = require('../common/helpers'));
} catch {
  assertActiveSessionImpl = async (request, options = {}) => {
    if (!request.auth?.uid) {
      throw new HttpsErrorImpl('unauthenticated', 'Requer autenticação.');
    }
    const db = options.db || getFirestore();
    const profileSnap = await db.collection('userProfiles').doc(request.auth.uid).get();
    if (!profileSnap.exists || profileSnap.data()?.active === false) {
      throw new HttpsErrorImpl('permission-denied', 'Perfil de usuário inativo ou inexistente.');
    }
    const profile = profileSnap.data() || {};
    const authTime = request.auth.token?.auth_time;
    if (profile.tokensValidAfterTime && (!Number.isFinite(authTime) || authTime <= profile.tokensValidAfterTime)) {
      throw new HttpsErrorImpl('unauthenticated', 'Sessão revogada no servidor. Faça login novamente.');
    }
    if (options.requiredRole && profile.role !== options.requiredRole) {
      throw new HttpsErrorImpl('permission-denied', `Acesso restrito a ${options.requiredRole}.`);
    }
    return { uid: request.auth.uid, profile };
  };
}

module.exports = {
  HttpsError: HttpsErrorImpl,
  assertActiveSession: assertActiveSessionImpl,
};

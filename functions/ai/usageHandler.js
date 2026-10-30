/**
 * Compatibilidade de leitura dos analytics históricos de uso da IA.
 * Separado dos handlers de chat e enriquecimento para manter dependências mínimas.
 */

const { getCallerScope } = require('./authorization');
const { getAiUsageSummary } = require('./usage');

function createGetAiUsageHandler(deps = {}) {
  const { db, getSummary = getAiUsageSummary } = deps;

  return async function handleGetAiUsage(request) {
    const callerUid = request?.auth?.uid;
    if (!callerUid) {
      const err = new Error('Usuário não autenticado.');
      err.code = 'unauthenticated';
      throw err;
    }

    const callerProfile = request?.authProfile || (db
      ? (await db.doc(`userProfiles/${callerUid}`).get().then((snapshot) => (
        snapshot.exists ? snapshot.data() : null
      )))
      : null);
    const scope = getCallerScope(callerUid, callerProfile);
    if (!scope.isAdmin) {
      const err = new Error('Acesso restrito a administradores.');
      err.code = 'permission-denied';
      throw err;
    }

    return getSummary(db);
  };
}

module.exports = { createGetAiUsageHandler };

const { HttpsError } = require('firebase-functions/v2/https');

const mapToHttpsError = (err) => {
  if (err && err.code && typeof err.code === 'string' && err.message) {
    const codeMap = {
      unauthenticated: 'unauthenticated',
      'permission-denied': 'permission-denied',
      'invalid-argument': 'invalid-argument',
      'resource-exhausted': 'resource-exhausted',
      'not-found': 'not-found',
      'failed-precondition': 'failed-precondition',
      'deadline-exceeded': 'deadline-exceeded',
    };
    const httpsCode = codeMap[err.code] || 'internal';
    return new HttpsError(httpsCode, err.message);
  }
  return new HttpsError('internal', err?.message || 'Erro ao processar requisição de IA.');
};

module.exports = { mapToHttpsError };

/** Callable pública de leitura do catálogo da loja. */

const { getFirestore } = require('firebase-admin/firestore');
const { onCall } = require('../common/sentryFunctions');
const { handleGetPublicCatalogProducts: coreHandler } = require('./catalogCore');

/** Wrapper preservando default de getFirestore para testes e Cloud Functions. */
function handleGetPublicCatalogProducts(request, options = {}) {
  return coreHandler(request, {
    getFirestore: options.getFirestore || getFirestore,
    isEmulator: options.isEmulator,
  });
}

/** Retorna somente os campos necessários para montar a vitrine pública. */
const getPublicCatalogProducts = onCall(
  { cors: true, maxInstances: 10 },
  (request) => handleGetPublicCatalogProducts(request),
);

module.exports = { getPublicCatalogProducts, handleGetPublicCatalogProducts };

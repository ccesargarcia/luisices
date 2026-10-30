const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { onCall } = require('../common/sentryFunctions');
const { registerDeviceSessionCore } = require('./registerDeviceSessionCore');

const registerDeviceSession = onCall({ memory: '512MiB' }, (request) => registerDeviceSessionCore(request, {
  db: getFirestore(),
  serverTimestamp: FieldValue.serverTimestamp,
}));

module.exports = { registerDeviceSession };

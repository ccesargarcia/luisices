const { onRequest } = require('../common/sentryFunctions');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { ORIGIN_SECRET } = require('../common/secrets');
const { validateOriginSecret } = require('../originProtection');
const { createGalleryMediaHandler, getGalleryStoragePath, canReadGalleryItem } = require('./galleryCore');

// Keep the public media endpoint isolated so backend changes can deploy only this export.
const galleryMedia = onRequest({
  cors: false,
  maxInstances: 10,
  memory: '512MiB',
  timeoutSeconds: 30,
  secrets: [ORIGIN_SECRET],
}, (req, res) => createGalleryMediaHandler({
  auth: getAuth(),
  firestore: getFirestore(),
  storage: getStorage(),
  originValidator: validateOriginSecret,
})(req, res));

module.exports = { galleryMedia, createGalleryMediaHandler, getGalleryStoragePath, canReadGalleryItem };

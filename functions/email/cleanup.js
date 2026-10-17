const { onSchedule } = require('../common/sentryFunctions');
const { getStorage } = require('firebase-admin/storage');
const { cleanupEmailDraftFiles, EMAIL_DRAFT_MAX_AGE_MS } = require('./cleanupCore');

const cleanupEmailDrafts = onSchedule(
  {
    schedule: 'every 24 hours',
    timeZone: 'America/Sao_Paulo',
    region: 'us-central1',
    timeoutSeconds: 540,
  },
  async () => cleanupEmailDraftFiles(getStorage().bucket())
);

module.exports = { cleanupEmailDrafts, cleanupEmailDraftFiles, EMAIL_DRAFT_MAX_AGE_MS };

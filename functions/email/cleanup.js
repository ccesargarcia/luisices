const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { cleanupEmailDraftFiles, EMAIL_DRAFT_MAX_AGE_MS } = require('./cleanupCore');

const cleanupEmailDrafts = onSchedule(
  {
    schedule: 'every 24 hours',
    timeZone: 'America/Sao_Paulo',
    region: 'us-central1',
    timeoutSeconds: 540,
  },
  async () => cleanupEmailDraftFiles(admin.storage().bucket())
);

module.exports = { cleanupEmailDrafts, cleanupEmailDraftFiles, EMAIL_DRAFT_MAX_AGE_MS };

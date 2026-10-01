/**
 * Centralização de Secrets gerenciados via Google Secret Manager / Firebase Params.
 */

const { defineSecret } = require('firebase-functions/params');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const EVOLUTION_API_KEY = defineSecret('EVOLUTION_API_KEY');
const RESEND_WEBHOOK_SECRET = defineSecret('RESEND_WEBHOOK_SECRET');
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const { ORIGIN_SECRET } = require('../originProtection');

module.exports = {
  RESEND_API_KEY,
  EVOLUTION_API_KEY,
  RESEND_WEBHOOK_SECRET,
  GEMINI_API_KEY,
  ORIGIN_SECRET,
};

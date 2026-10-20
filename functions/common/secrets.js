/**
 * Centralização de Secrets gerenciados via Google Secret Manager / Firebase Params.
 */

const { defineSecret } = require('firebase-functions/params');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const EVOLUTION_API_KEY = defineSecret('EVOLUTION_API_KEY');
const RESEND_WEBHOOK_SECRET = defineSecret('RESEND_WEBHOOK_SECRET');
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

// SUPERFRETE_SANDBOX_TOKEN é exclusivo de dev/sandbox (luisices-dev) e emulador.
// Em produção (papelaria-dashboard), não declaramos via defineSecret para evitar
// bloqueio pelo Firebase CLI exigindo o secret no Secret Manager de produção.
const isDevOrEmulator =
  process.env.GCLOUD_PROJECT === 'luisices-dev' ||
  process.env.FUNCTIONS_EMULATOR === 'true' ||
  !process.env.GCLOUD_PROJECT;

const SUPERFRETE_SANDBOX_TOKEN = isDevOrEmulator
  ? defineSecret('SUPERFRETE_SANDBOX_TOKEN')
  : { value: () => process.env.SUPERFRETE_SANDBOX_TOKEN || '' };

const { ORIGIN_SECRET } = require('../originProtection');

module.exports = {
  RESEND_API_KEY,
  EVOLUTION_API_KEY,
  RESEND_WEBHOOK_SECRET,
  GEMINI_API_KEY,
  SUPERFRETE_SANDBOX_TOKEN,
  ORIGIN_SECRET,
};

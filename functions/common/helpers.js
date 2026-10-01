/**
 * Funções utilitárias e de sanitização compartilhadas entre os domínios de backend.
 */

const admin = require('firebase-admin');
const crypto = require('crypto');
const { Resend } = require('resend');
const { EVOLUTION_API_KEY } = require('./secrets');

const EVOLUTION_API_URL = 'https://wa.luisices.com.br';
const EVOLUTION_INSTANCE = 'homeassistant';

const getResend = (apiKey) => (apiKey ? new Resend(apiKey) : null);

const normalizeWhatsAppNumber = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
};

const sendWhatsAppMessage = async (phone, text) => {
  if (!phone || !EVOLUTION_API_KEY.value()) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`,
      {
        method: 'POST',
        headers: {
          apikey: EVOLUTION_API_KEY.value(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number: normalizeWhatsAppNumber(phone), text }),
        signal: controller.signal,
      }
    );
    if (!response.ok) throw new Error(`Evolution API respondeu ${response.status}`);
  } finally {
    clearTimeout(timeout);
  }
};

const getAppUrl = () => {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  return projectId === 'luisices-dev' ? 'https://dev.luisices.com.br' : 'https://luisices.com.br';
};

const toCdnUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('cdn.luisices.com.br') || url.includes('cdn-dev.luisices.com.br')) {
    return url.split('?')[0];
  }
  if (!url.includes('firebasestorage.googleapis.com')) {
    return url;
  }
  try {
    const match = url.match(/\/o\/(.+?)(\?.*)?$/);
    if (!match || !match[1]) return url;
    const rawPath = decodeURIComponent(match[1]);
    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    const cdnDomain = projectId === 'luisices-dev' ? 'https://cdn-dev.luisices.com.br' : 'https://cdn.luisices.com.br';
    return `${cdnDomain}/${rawPath}`;
  } catch {
    return url;
  }
};

const formatActionLink = (rawFirebaseLink, fallbackMode = 'resetPassword') => {
  try {
    const parsed = new URL(rawFirebaseLink);
    const mode = parsed.searchParams.get('mode') || fallbackMode;
    const oobCode = parsed.searchParams.get('oobCode');
    if (oobCode) {
      return `${getAppUrl()}/action?mode=${encodeURIComponent(mode)}&oobCode=${encodeURIComponent(oobCode)}`;
    }
  } catch (e) {
    console.error('[formatActionLink] Error parsing raw link:', e);
  }
  return rawFirebaseLink;
};

const isAdminRequest = async (request) => {
  if (!request.auth) return false;
  const profile = await admin.firestore().doc(`userProfiles/${request.auth.uid}`).get();
  return profile.exists && profile.data().role === 'admin' && profile.data().active !== false;
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

module.exports = {
  EVOLUTION_API_URL,
  EVOLUTION_INSTANCE,
  getResend,
  normalizeWhatsAppNumber,
  sendWhatsAppMessage,
  getAppUrl,
  toCdnUrl,
  formatActionLink,
  isAdminRequest,
  hashToken,
};

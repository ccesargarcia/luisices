/**
 * Configuração e validação de ambiente para a integração Alexa.
 * Segue estritamente a especificação docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md.
 */

const { defineSecret } = require('firebase-functions/params');

// Segredo gerenciado no Secret Manager para hash criptográfico de identidades e códigos
const ALEXA_IDENTITY_HMAC_KEY = defineSecret('ALEXA_IDENTITY_HMAC_KEY');

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
const MAX_REQUEST_BODY_SIZE = 128 * 1024; // 128 KiB
const MAX_TIMESTAMP_AGE_SECONDS = 150; // 150 segundos de tolerância da Amazon
const DRAFT_TTL_MINUTES = 15;
const PAIRING_CODE_TTL_MINUTES = 5;

/**
 * Lê a configuração ativa do ambiente e valida combinações permitidas.
 * @param {object} [db] - Instância Firestore opcional para leitura de overrides dinâmicos
 */
async function getAlexaConfig(db = null) {
  const gcloudProject = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || '';
  const envVar = (process.env.ALEXA_ENVIRONMENT || '').trim().toLowerCase();
  
  // Se ALEXA_ENVIRONMENT não estiver setado, inferir pelo projeto GCP
  let environment = envVar;
  if (!environment) {
    if (gcloudProject === 'papelaria-dashboard') {
      environment = 'prod';
    } else if (gcloudProject === 'luisices-dev' || gcloudProject.startsWith('demo-')) {
      environment = 'dev';
    } else {
      throw new Error(`Ambiente desconhecido ou inválido para integração Alexa: '${gcloudProject}'. Operação bloqueada por segurança.`);
    }
  }

  if (environment !== 'dev' && environment !== 'prod') {
    throw new Error(`Ambiente inválido para integração Alexa: '${environment}'. Operação bloqueada.`);
  }
  
  // Skill ID padrão de desenvolvimento fornecida pelo operador
  const DEV_SKILL_ID = 'amzn1.ask.skill.1cd0031f-ada0-4da8-8721-2ad44b4b1c96';
  let allowedSkillId = (process.env.ALEXA_SKILL_ID || '').trim() || (environment === 'dev' ? DEV_SKILL_ID : '');
  
  // Em dev, ativa por padrão se houver skillId; em produção permanece explicitamente desativada
  let isEnabled = environment === 'dev' ? true : (process.env.ALEXA_ENABLED === 'true');
  let timezone = (process.env.ALEXA_TIMEZONE || '').trim() || DEFAULT_TIMEZONE;

  // Overrides dinâmicos em Firestore (integrationSettings/alexa), caso existam
  if (db) {
    try {
      const snap = await db.doc('integrationSettings/alexa').get();
      if (snap.exists) {
        const data = snap.data() || {};
        if (typeof data.enabled === 'boolean') {
          isEnabled = data.enabled;
        }
        if (data.allowedSkillId && typeof data.allowedSkillId === 'string') {
          allowedSkillId = data.allowedSkillId.trim();
        }
        if (data.timezone && typeof data.timezone === 'string') {
          timezone = data.timezone.trim();
        }
      }
    } catch (err) {
      console.warn('[AlexaConfig] Erro ao ler integrationSettings/alexa. Desativando por segurança:', err.message);
      isEnabled = false;
    }
  }

  // Em produção, a integração NUNCA é ativada automaticamente sem configuração explícita
  if (environment === 'prod' && !process.env.ALEXA_SKILL_ID && !allowedSkillId) {
    isEnabled = false;
  }

  // Obter chave HMAC do Secret Manager ou fallback de ambiente
  let hmacKey = '';
  try {
    hmacKey = ALEXA_IDENTITY_HMAC_KEY.value();
  } catch {
    hmacKey = process.env.ALEXA_IDENTITY_HMAC_KEY || '';
  }

  return {
    environment,
    isEnabled,
    allowedSkillId,
    timezone,
    hmacKey,
    maxRequestBodySize: MAX_REQUEST_BODY_SIZE,
    maxTimestampAgeSeconds: MAX_TIMESTAMP_AGE_SECONDS,
    draftTtlMinutes: DRAFT_TTL_MINUTES,
    pairingCodeTtlMinutes: PAIRING_CODE_TTL_MINUTES,
  };
}

module.exports = {
  ALEXA_IDENTITY_HMAC_KEY,
  DEFAULT_TIMEZONE,
  MAX_REQUEST_BODY_SIZE,
  MAX_TIMESTAMP_AGE_SECONDS,
  DRAFT_TTL_MINUTES,
  PAIRING_CODE_TTL_MINUTES,
  getAlexaConfig,
};

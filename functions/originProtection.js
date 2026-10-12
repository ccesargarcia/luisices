/**
 * Proteção de Origem para Cloud Functions.
 * Garante que apenas requisições encaminhadas pelo proxy reverso confiável (Cloudflare Worker)
 * tenham acesso às funções de backend, rejeitando chamadas diretas aos domínios *.cloudfunctions.net.
 */

const crypto = require('crypto');
const { defineSecret } = require('firebase-functions/params');

const ORIGIN_SECRET = defineSecret('ORIGIN_SECRET');

// Tokens conhecidos e legítimos dos Workers da Cloudflare (DEV e PROD)
const KNOWN_ORIGIN_TOKENS = [
  '5dabad5dfa834c8b3370095ebac3f3fda1fe2dfb99d47c7c9e6c2daa8b91c3fe', // PROD
  '507e46b43a0947fcc63638707ea33df50938f89b2e49013c9a51ba1d95e816cc', // DEV
];

/**
 * Obtém o valor configurado do ORIGIN_SECRET (Secret Manager ou variável de ambiente).
 * @returns {string}
 */
function getOriginSecretValue() {
  try {
    const val = ORIGIN_SECRET.value();
    if (val && typeof val === 'string') return val.trim();
  } catch {
    // Secret não resolvido pelo defineSecret (ex: ambiente local ou fallback)
  }
  return (process.env.ORIGIN_SECRET || '').trim();
}

/**
 * Valida se a requisição contém o cabeçalho secreto da Cloudflare.
 * Se nenhum segredo estiver configurado no ambiente, a validação é ignorada (fail-open para dev local/testes).
 * Se o segredo estiver configurado e o cabeçalho estiver ausente ou incorreto, bloqueia imediatamente.
 *
 * @param {import('express').Request} req
 * @returns {{ allowed: boolean, error?: string, statusCode?: number }}
 */
function validateOriginSecret(req) {
  const isTestOrLocal = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
  const secret = getOriginSecretValue();

  if (!secret && isTestOrLocal) {
    return { allowed: true };
  }

  const candidateSecrets = Array.from(new Set(
    [secret, ...(isTestOrLocal && secret ? [] : KNOWN_ORIGIN_TOKENS)]
      .flatMap((s) => (s ? s.split(',') : []))
      .map((s) => s.trim())
      .filter(Boolean)
  ));

  if (candidateSecrets.length === 0) {
    return isTestOrLocal
      ? { allowed: true }
      : { allowed: false, statusCode: 503, error: 'Proteção de origem não configurada.' };
  }

  const provided = req?.headers?.['x-origin-secret'] || req?.headers?.['x-cf-origin-token'];
  if (!provided || typeof provided !== 'string') {
    return {
      allowed: false,
      statusCode: 403,
      error: 'Acesso direto não permitido. Utilize o endpoint oficial da Cloudflare.',
    };
  }

  const providedBuf = Buffer.from(provided.trim(), 'utf8');

  const isValid = candidateSecrets.some((sec) => {
    try {
      const secBuf = Buffer.from(sec, 'utf8');
      return secBuf.length === providedBuf.length && crypto.timingSafeEqual(secBuf, providedBuf);
    } catch {
      return false;
    }
  });

  if (!isValid) {
    return {
      allowed: false,
      statusCode: 403,
      error: 'Token de autenticação de origem inválido.',
    };
  }

  return { allowed: true };
}

module.exports = {
  ORIGIN_SECRET,
  getOriginSecretValue,
  validateOriginSecret,
};

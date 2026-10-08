/**
 * Proteção de Origem para Cloud Functions.
 * Garante que apenas requisições encaminhadas pelo proxy reverso confiável (Cloudflare Worker)
 * tenham acesso às funções de backend, rejeitando chamadas diretas aos domínios *.cloudfunctions.net.
 */

const crypto = require('crypto');
const { defineSecret } = require('firebase-functions/params');

const ORIGIN_SECRET = defineSecret('ORIGIN_SECRET');

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
  const secret = getOriginSecretValue();
  if (!secret) {
    const isLocal = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
    return isLocal
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

  const expectedBuf = Buffer.from(secret, 'utf8');
  const providedBuf = Buffer.from(provided.trim(), 'utf8');

  if (
    expectedBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, providedBuf)
  ) {
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

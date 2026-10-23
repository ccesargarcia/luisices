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
  // Chamadas diretas do navegador para o emulador não passam pelo Worker da Cloudflare.
  // Em produção, manter a validação mesmo quando NODE_ENV está definido como test.
  if (process.env.FUNCTIONS_EMULATOR === 'true') return { allowed: true };

  const isTestOrLocal = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
  const secret = getOriginSecretValue();

  if (!secret) {
    return isTestOrLocal
      ? { allowed: true }
      : { allowed: false, statusCode: 503, error: 'Proteção de origem não configurada no servidor.' };
  }

  const candidateSecrets = Array.from(new Set(
    secret
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  ));

  if (candidateSecrets.length === 0) {
    return isTestOrLocal
      ? { allowed: true }
      : { allowed: false, statusCode: 503, error: 'Proteção de origem não configurada.' };
  }

  const providedTokens = [
    ...(req?.headers?.['x-origin-secret'] ? String(req.headers['x-origin-secret']).split(',') : []),
    ...(req?.headers?.['x-cf-origin-token'] ? String(req.headers['x-cf-origin-token']).split(',') : []),
  ].map((t) => t.trim()).filter(Boolean);

  if (providedTokens.length === 0) {
    return {
      allowed: false,
      statusCode: 403,
      error: 'Acesso direto não permitido. Utilize o endpoint oficial da Cloudflare.',
    };
  }

  const isValid = candidateSecrets.some((sec) => {
    try {
      const secBuf = Buffer.from(sec, 'utf8');
      return providedTokens.some((provided) => {
        const providedBuf = Buffer.from(provided, 'utf8');
        return secBuf.length === providedBuf.length && crypto.timingSafeEqual(secBuf, providedBuf);
      });
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

/**
 * Extrai o IP do cliente de forma segura e confiável.
 * Os cabeçalhos de proxy reverso ('cf-connecting-ip', 'x-real-ip') SÓ são confiáveis
 * se a requisição foi autenticada como originária da Cloudflare (através da validação do ORIGIN_SECRET).
 * Em chamadas diretas ou sem autenticação de origem comprovada, ignora cabeçalhos forjáveis
 * e utiliza estritamente o IP de conexão direta (rawRequest.ip ou socket.remoteAddress).
 *
 * @param {import('express').Request} rawRequest
 * @returns {string} IP confiável do cliente ou 'unknown'
 */
function getTrustedClientIp(rawRequest) {
  if (!rawRequest) return 'unknown';

  const hasOriginToken = Boolean(
    rawRequest.headers?.['x-origin-secret'] ||
    rawRequest.headers?.['x-cf-origin-token']
  );
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

  let isVerifiedCloudflare = false;
  if (hasOriginToken) {
    const originValidation = validateOriginSecret(rawRequest);
    isVerifiedCloudflare = originValidation.allowed === true;
  } else if (isEmulator) {
    isVerifiedCloudflare = true;
  }

  // Se a requisição veio comprovadamente pelo Cloudflare Worker (com token válido) ou no emulador
  if (isVerifiedCloudflare) {
    const cfIp = rawRequest.headers?.['cf-connecting-ip'];
    if (typeof cfIp === 'string' && cfIp.trim()) {
      return cfIp.trim();
    }
    const realIp = rawRequest.headers?.['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) {
      return realIp.trim();
    }
  }

  // Se a requisição não comprovou origem pela Cloudflare (ex: chamada direta, token ausente ou inválido),
  // NUNCA confiar em cabeçalhos enviados pelo cliente (cf-connecting-ip, x-real-ip, x-forwarded-for).
  // Usar exclusivamente o IP do socket TCP gerenciado pela infraestrutura.
  const directIp = rawRequest.ip || rawRequest.socket?.remoteAddress;
  if (typeof directIp === 'string' && directIp.trim()) {
    return directIp.trim();
  }

  return 'unknown';
}

module.exports = {
  ORIGIN_SECRET,
  getOriginSecretValue,
  validateOriginSecret,
  getTrustedClientIp,
};

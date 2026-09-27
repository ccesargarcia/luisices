/**
 * Verificação criptográfica e estrutural de requisições da Alexa.
 * Segue estritamente os requisitos de segurança da Amazon e docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md.
 */

const { SkillRequestSignatureVerifier, TimestampVerifier } = require('ask-sdk-express-adapter');

const signatureVerifier = new SkillRequestSignatureVerifier();
const timestampVerifier = new TimestampVerifier(150000); // 150 segundos de tolerância

/**
 * Valida a requisição HTTP da Alexa conforme requisitos oficiais da Amazon:
 * - Método POST
 * - Limite de tamanho (128 KiB)
 * - Cabeçalhos de assinatura e certificado oficial Amazon
 * - Verificação da assinatura criptográfica sobre o rawBody
 * - Timestamp dentro de 150 segundos
 * - Application ID da skill correspondente ao ambiente
 *
 * @param {import('express').Request} req
 * @param {object} config - Configuração resolvida contendo allowedSkillId e maxRequestBodySize
 * @returns {Promise<{ valid: boolean, envelope: object, error?: string, statusCode?: number }>}
 */
async function verifyAlexaHttpRequest(req, config) {
  // 1. Método HTTP deve ser POST
  if (req.method !== 'POST') {
    return {
      valid: false,
      error: 'Método não permitido. Alexa exige POST.',
      statusCode: 405,
    };
  }

  // 2. Obter rawBody original (Buffer ou string)
  let rawBody = req.rawBody;
  if (!rawBody && typeof req.body === 'string') {
    rawBody = req.body;
  } else if (!rawBody && Buffer.isBuffer(req.body)) {
    rawBody = req.body.toString('utf8');
  } else if (!rawBody && typeof req.body === 'object') {
    rawBody = JSON.stringify(req.body);
  }

  if (!rawBody) {
    return {
      valid: false,
      error: 'Corpo da requisição vazio ou ausente.',
      statusCode: 400,
    };
  }

  const rawBodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

  // 3. Limite de tamanho máximo do corpo (128 KiB)
  const maxBytes = config.maxRequestBodySize || 131072;
  if (Buffer.byteLength(rawBodyString, 'utf8') > maxBytes) {
    return {
      valid: false,
      error: 'Corpo da requisição excede o limite máximo permitido de 128 KiB.',
      statusCode: 413,
    };
  }

  // 4. Validação do timestamp via SDK mantido pela Amazon
  try {
    await timestampVerifier.verify(rawBodyString);
  } catch (err) {
    return {
      valid: false,
      error: `Falha na verificação de timestamp Alexa: ${err.message}`,
      statusCode: 400,
    };
  }

  // 5. Validação da assinatura e cadeia de certificados oficiais da Amazon
  try {
    await signatureVerifier.verify(rawBodyString, req.headers);
  } catch (err) {
    return {
      valid: false,
      error: `Falha na verificação da assinatura criptográfica Alexa: ${err.message}`,
      statusCode: 400,
    };
  }

  // 6. Parse do envelope JSON
  let envelope;
  try {
    envelope = JSON.parse(rawBodyString);
  } catch {
    return {
      valid: false,
      error: 'Envelope JSON inválido.',
      statusCode: 400,
    };
  }

  // 7. Validação do Application ID da Skill (Skill ID)
  const appId =
    envelope.session?.application?.applicationId ||
    envelope.context?.System?.application?.applicationId;

  if (config.allowedSkillId && appId !== config.allowedSkillId) {
    return {
      valid: false,
      error: `Skill ID não autorizada para este ambiente (${config.environment}).`,
      statusCode: 403,
    };
  }

  return {
    valid: true,
    envelope,
  };
}

module.exports = {
  verifyAlexaHttpRequest,
  signatureVerifier,
  timestampVerifier,
};

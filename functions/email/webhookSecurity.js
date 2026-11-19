const crypto = require('crypto');

function secretCandidates(secret) {
  return Array.from(new Set(String(secret || '').split(',').map(value => value.trim()).filter(Boolean)));
}

function isValidSvixSignature({ secret, svixId, svixTimestamp, rawContent, signature }) {
  const candidateSecrets = secretCandidates(secret);
  const signedContent = `${svixId}.${svixTimestamp}.${rawContent}`;
  const providedSignatures = String(signature)
    .split(' ')
    .map((value) => value.split(',')[1])
    .filter(Boolean);

  return candidateSecrets.some((candidateSecret) => {
    try {
      const secretBytes = candidateSecret.startsWith('whsec_')
        ? Buffer.from(candidateSecret.slice(6), 'base64')
        : Buffer.from(candidateSecret);
      const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');
      return providedSignatures.some((provided) => {
        try {
          const actualBytes = Buffer.from(provided, 'base64');
          const expectedBytes = Buffer.from(expected, 'base64');
          return actualBytes.length === expectedBytes.length && crypto.timingSafeEqual(actualBytes, expectedBytes);
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  });
}

function createForwardSignature({ secret, source, svixId, svixTimestamp, rawContent }) {
  const signingSecret = secretCandidates(secret)[0];
  if (!signingSecret || !['prod', 'dev'].includes(source) || !svixId || !svixTimestamp) {
    throw new Error('Dados insuficientes para assinar encaminhamento do webhook.');
  }
  const signedContent = `${source}.${svixId}.${svixTimestamp}.${rawContent}`;
  return crypto.createHmac('sha256', signingSecret).update(signedContent).digest('base64');
}

function isValidForwardSignature({ secret, source, expectedSource, svixId, svixTimestamp, rawContent, signature }) {
  if (source !== expectedSource || !['prod', 'dev'].includes(source) || !svixId || !svixTimestamp) return false;
  const signedContent = `${source}.${svixId}.${svixTimestamp}.${rawContent}`;
  const provided = String(signature || '').replace(/^v1,/, '');
  if (!provided) return false;
  let actual;
  try { actual = Buffer.from(provided, 'base64'); } catch { return false; }
  return secretCandidates(secret).some((candidate) => {
    const expected = crypto.createHmac('sha256', candidate).update(signedContent).digest();
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  });
}

module.exports = { isValidSvixSignature, createForwardSignature, isValidForwardSignature };

const crypto = require('crypto');

function isValidSvixSignature({ secret, svixId, svixTimestamp, rawContent, signature }) {
  const candidateSecrets = Array.from(new Set(
    String(secret)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  ));
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

module.exports = { isValidSvixSignature };

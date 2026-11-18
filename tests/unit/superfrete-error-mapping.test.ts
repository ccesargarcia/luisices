import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const functionsRequire = createRequire(require.resolve('../../functions/package.json'));
const { getSuperfreteHttpsErrorCode } = functionsRequire('./orders/superfrete');

describe('mapeamento de erros HTTP SuperFrete para Cloud Functions', () => {
  it.each([
    [400, 'invalid-argument'],
    [402, 'failed-precondition'],
    [401, 'failed-precondition'],
    [403, 'failed-precondition'],
    [408, 'deadline-exceeded'],
    [409, 'aborted'],
    [422, 'invalid-argument'],
    [429, 'resource-exhausted'],
    [500, 'unavailable'],
    [503, 'unavailable'],
    [504, 'deadline-exceeded'],
  ])('mapeia HTTP %i para código Firebase suportado', (status, expectedCode) => {
    expect(getSuperfreteHttpsErrorCode(status)).toBe(expectedCode);
  });

  it('não repassa códigos arbitrários do provedor como códigos de Cloud Functions', () => {
    const providerCode = 'payment-required';
    expect(getSuperfreteHttpsErrorCode(402)).not.toBe(providerCode);
    expect(getSuperfreteHttpsErrorCode(402)).toBe('failed-precondition');
  });
});

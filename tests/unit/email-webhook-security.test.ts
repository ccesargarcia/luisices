import { createHmac } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { isValidSvixSignature } = require('../../functions/email/webhookSecurity.js');
const { validateOriginSecret } = require('../../functions/originProtection.js');

vi.stubEnv('NODE_ENV', 'test');
vi.stubEnv('FUNCTIONS_EMULATOR', 'false');
vi.stubEnv('ORIGIN_SECRET', 'email-webhook-origin-test');

afterAll(() => vi.unstubAllEnvs());

describe('segurança do webhook Resend', () => {
  it('aceita assinatura Svix válida usando a chave codificada e rotação de segredo', () => {
    const key = Buffer.from('test-svix-secret');
    const oldKey = Buffer.from('previous-svix-secret');
    const secret = `whsec_${oldKey.toString('base64')},whsec_${key.toString('base64')}`;
    const svixId = 'msg_test_123';
    const timestamp = '1793210000';
    const rawContent = '{"type":"email.received"}';
    const signedContent = `${svixId}.${timestamp}.${rawContent}`;
    const signature = createHmac('sha256', key).update(signedContent).digest('base64');

    expect(isValidSvixSignature({
      secret, svixId, svixTimestamp: timestamp, rawContent, signature: `v1,${signature}`,
    })).toBe(true);
  });

  it('rejeita assinatura Svix adulterada', () => {
    expect(isValidSvixSignature({
      secret: 'whsec_dGVzdC1zZWNyZXQ=',
      svixId: 'msg_test_123',
      svixTimestamp: '1793210000',
      rawContent: '{"type":"email.received"}',
      signature: 'v1,ZmFrZS1zaWduYXR1cmU=',
    })).toBe(false);
  });

  it('nega origem ausente ou inválida e aceita o token da origem confiável', () => {
    expect(validateOriginSecret({ headers: {} } as any).allowed).toBe(false);
    expect(validateOriginSecret({ headers: { 'x-origin-secret': 'wrong' } } as any).allowed).toBe(false);
    expect(validateOriginSecret({
      headers: { 'x-origin-secret': 'email-webhook-origin-test' },
    } as any).allowed).toBe(true);
  });
});

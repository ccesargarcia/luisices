import { afterAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
vi.stubEnv('FUNCTIONS_EMULATOR', 'false');
vi.stubEnv('NODE_ENV', 'test');
vi.stubEnv('ORIGIN_SECRET', 'email-webhook-origin-test');
vi.stubEnv('RESEND_WEBHOOK_SECRET', 'whsec_dGVzdC1zZWNyZXQ=');

const { resendReceivingWebhook } = require('../../functions/email/webhook.js');

afterAll(() => vi.unstubAllEnvs());

function createResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
    send(body: unknown) { this.body = body; return this; },
    setHeader(name: string, value: string) { this.headers[name] = value; },
  };
}

describe('resendReceivingWebhook security contract', () => {
  it('rejects requests without the origin token before processing the event', async () => {
    const response = createResponse();
    await resendReceivingWebhook.run({ method: 'POST', headers: {}, body: {} } as any, response as any);
    expect(response.statusCode).toBe(403);
    expect(response.body).toEqual({ error: 'Acesso direto não permitido. Utilize o endpoint oficial da Cloudflare.' });
  });

  it('rejects an invalid Svix signature even when the origin is valid', async () => {
    const response = createResponse();
    const now = Math.floor(Date.now() / 1000);
    await resendReceivingWebhook.run({
      method: 'POST',
      headers: {
        'x-origin-secret': 'email-webhook-origin-test',
        'svix-id': 'msg-invalid-signature',
        'svix-timestamp': String(now),
        'svix-signature': 'v1,ZmFrZS1zaWduYXR1cmU=',
      },
      rawBody: Buffer.from('{"type":"email.received","data":{"email_id":"em_test"}}'),
      body: { type: 'email.received', data: { email_id: 'em_test' } },
    } as any, response as any);
    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: 'Assinatura Svix inválida' });
  });
});

import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { forwardVerifiedWebhook } = require('../../functions/email/webhookForwarding.js');

const baseInput = {
  url: 'https://api.dev.luisices.com.br/resendReceivingWebhook',
  source: 'prod',
  webhookSecret: 'shared-resend-webhook-secret',
  originToken: 'source-origin-token',
  svixId: 'msg_forward_test',
  svixTimestamp: '1793210000',
  svixSignature: 'v1,original-svix-signature',
  rawContent: '{"type":"email.received"}',
  logger: { log: vi.fn(), error: vi.fn() },
};

describe('encaminhamento interno do webhook Resend', () => {
  it('preserva payload e assinatura, confirma 2xx e mantém o claim', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    const releaseClaim = vi.fn().mockResolvedValue(undefined);
    const result = await forwardVerifiedWebhook({ ...baseInput, fetchImpl, releaseClaim });
    expect(result).toEqual({ ok: true });
    expect(releaseClaim).not.toHaveBeenCalled();
    const [, request] = fetchImpl.mock.calls[0];
    expect(request.body).toBe(baseInput.rawContent);
    expect(request.headers['x-forwarded-from']).toBe('prod');
    expect(request.headers['x-luisices-forward-signature']).toMatch(/^v1,/);
  });

  it('libera o claim e reporta falha quando o destino retorna não-2xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'failed' }) });
    const releaseClaim = vi.fn().mockResolvedValue(undefined);
    await expect(forwardVerifiedWebhook({ ...baseInput, fetchImpl, releaseClaim })).resolves.toEqual({ ok: false });
    expect(releaseClaim).toHaveBeenCalledOnce();
  });

  it('libera o claim quando a chamada de rede falha', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    const releaseClaim = vi.fn().mockResolvedValue(undefined);
    await expect(forwardVerifiedWebhook({ ...baseInput, fetchImpl, releaseClaim })).resolves.toEqual({ ok: false });
    expect(releaseClaim).toHaveBeenCalledOnce();
  });
});

import { describe, it, expect, vi } from 'vitest';
const { verifyAlexaHttpRequest } = require('../../../functions/alexa/verification');

describe('Alexa: Verificação Criptográfica e Integridade do Endpoint HTTP', () => {
  const baseConfig = {
    environment: 'dev',
    allowedSkillId: 'amzn1.ask.skill.12345678-test-dev',
    maxRequestBodySize: 131072,
    maxTimestampAgeSeconds: 150,
  };

  it('deve rejeitar métodos HTTP diferentes de POST (ex: GET)', async () => {
    const mockReq = {
      method: 'GET',
      headers: {},
      rawBody: '{}',
    };
    const res = await verifyAlexaHttpRequest(mockReq, baseConfig);
    expect(res.valid).toBe(false);
    expect(res.statusCode).toBe(405);
    expect(res.error).toContain('POST');
  });

  it('deve rejeitar requisição com corpo vazio ou ausente', async () => {
    const mockReq = {
      method: 'POST',
      headers: {},
      rawBody: '',
    };
    const res = await verifyAlexaHttpRequest(mockReq, baseConfig);
    expect(res.valid).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.error).toContain('vazio');
  });

  it('deve rejeitar payload que exceda o teto de 128 KiB', async () => {
    const largeBody = JSON.stringify({ data: 'A'.repeat(140 * 1024) });
    const mockReq = {
      method: 'POST',
      headers: {
        'content-length': String(largeBody.length),
      },
      rawBody: largeBody,
    };
    const res = await verifyAlexaHttpRequest(mockReq, baseConfig);
    expect(res.valid).toBe(false);
    expect(res.statusCode).toBe(413);
    expect(res.error).toContain('128 KiB');
  });

  it('deve rejeitar requisição com timestamp com mais de 150 segundos de atraso', async () => {
    const oldTimestamp = new Date(Date.now() - 300 * 1000).toISOString(); // 5 minutos atrás
    const envelope = {
      version: '1.0',
      session: {
        application: { applicationId: 'amzn1.ask.skill.12345678-test-dev' },
      },
      request: {
        type: 'IntentRequest',
        timestamp: oldTimestamp,
      },
    };
    const mockReq = {
      method: 'POST',
      headers: {
        signaturecertchainurl: 'https://s3.amazonaws.com/echo.api/echo-api-cert.pem',
        signature: 'fake-signature',
      },
      rawBody: JSON.stringify(envelope),
    };

    const res = await verifyAlexaHttpRequest(mockReq, baseConfig);
    expect(res.valid).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.error).toContain('timestamp');
  });

  it('deve rejeitar requisições sem os cabeçalhos oficiais de assinatura da Amazon', async () => {
    const validTimestamp = new Date().toISOString();
    const envelope = {
      version: '1.0',
      session: {
        application: { applicationId: 'amzn1.ask.skill.12345678-test-dev' },
      },
      request: {
        type: 'IntentRequest',
        timestamp: validTimestamp,
      },
    };
    const mockReq = {
      method: 'POST',
      headers: {}, // Sem signaturecertchainurl e signature
      rawBody: JSON.stringify(envelope),
    };

    const res = await verifyAlexaHttpRequest(mockReq, baseConfig);
    expect(res.valid).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.error).toContain('assinatura');
  });

  it('deve rejeitar quando o Application ID não corresponder à Skill autorizada', async () => {
    const validTimestamp = new Date().toISOString();
    const envelope = {
      version: '1.0',
      session: {
        application: { applicationId: 'amzn1.ask.skill.outro-app-nao-autorizado' },
      },
      request: {
        type: 'IntentRequest',
        timestamp: validTimestamp,
      },
    };
    // Mockar verificação de assinatura para isolar o teste do Application ID
    const { signatureVerifier } = require('../../../functions/alexa/verification');
    const spy = vi.spyOn(signatureVerifier, 'verify').mockImplementation(async () => {});

    const mockReq = {
      method: 'POST',
      headers: {
        signaturecertchainurl: 'https://s3.amazonaws.com/echo.api/echo-api-cert.pem',
        signature: 'valid-test-sig',
      },
      rawBody: JSON.stringify(envelope),
    };

    const res = await verifyAlexaHttpRequest(mockReq, baseConfig);
    spy.mockRestore();

    expect(res.valid).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.error).toContain('Skill ID não autorizada');
  });
});

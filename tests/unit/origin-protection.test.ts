import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const { validateOriginSecret } = require('../../functions/originProtection');

describe('Segurança: Proteção de Origem (Origin Secret / Cloudflare Only)', () => {
  const originalEnvSecret = process.env.ORIGIN_SECRET;
  const originalEmulator = process.env.FUNCTIONS_EMULATOR;

  beforeEach(() => {
    delete process.env.ORIGIN_SECRET;
    delete process.env.FUNCTIONS_EMULATOR;
  });

  afterEach(() => {
    if (originalEmulator === undefined) delete process.env.FUNCTIONS_EMULATOR;
    else process.env.FUNCTIONS_EMULATOR = originalEmulator;
    if (originalEnvSecret) {
      process.env.ORIGIN_SECRET = originalEnvSecret;
    } else {
      delete process.env.ORIGIN_SECRET;
    }
  });

  it('rejeita ausência de segredo fora do emulador', () => {
    const result = validateOriginSecret({ headers: {} });
    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(503);
  });

  it('permite execução local somente no emulador explicitamente identificado', () => {
    process.env.FUNCTIONS_EMULATOR = 'true';
    expect(validateOriginSecret({ headers: {} }).allowed).toBe(true);
  });

  it('deve rejeitar com 403 se ORIGIN_SECRET estiver configurado e o header estiver ausente (tentativa de acesso direto)', () => {
    process.env.ORIGIN_SECRET = 'segredo-super-confiavel-123';
    const req = {
      headers: {},
    };

    const result = validateOriginSecret(req);
    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.error).toContain('Acesso direto não permitido');
  });

  it('deve rejeitar com 403 se o header x-origin-secret contiver token incorreto', () => {
    process.env.ORIGIN_SECRET = 'segredo-super-confiavel-123';
    const req = {
      headers: {
        'x-origin-secret': 'segredo-errado-ou-hacker',
      },
    };

    const result = validateOriginSecret(req);
    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.error).toContain('Token de autenticação de origem inválido');
  });

  it('deve rejeitar com 403 se o token tiver o mesmo prefixo mas tamanho diferente', () => {
    process.env.ORIGIN_SECRET = 'segredo-super-confiavel-123';
    const req = {
      headers: {
        'x-origin-secret': 'segredo-super-confiavel-123-extra',
      },
    };

    const result = validateOriginSecret(req);
    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
  });

  it('deve permitir a requisição se x-origin-secret for válido e idêntico', () => {
    process.env.ORIGIN_SECRET = 'segredo-super-confiavel-123';
    const req = {
      headers: {
        'x-origin-secret': 'segredo-super-confiavel-123',
      },
    };

    const result = validateOriginSecret(req);
    expect(result.allowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('deve permitir a requisição usando o header alternativo x-cf-origin-token', () => {
    process.env.ORIGIN_SECRET = 'segredo-super-confiavel-123';
    const req = {
      headers: {
        'x-cf-origin-token': 'segredo-super-confiavel-123',
      },
    };

    const result = validateOriginSecret(req);
    expect(result.allowed).toBe(true);
  });
});

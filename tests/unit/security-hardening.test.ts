import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-ignore
import { sanitizeCollaboratorInfo } from '../../functions/ai/authorization.js';
// @ts-ignore
import { getTrustedClientIp, validateOriginSecret } from '../../functions/originProtection.js';
// @ts-ignore
import { handleSubmitPublicCatalogOrder } from '../../functions/orders/index.js';
import { validateFileSignature } from '../../src/services/firebaseStorageService';

describe('Hardening MCP: Menor privilégio na exposição de e-mail de colaboradores', () => {
  const member = {
    uid: 'colab-1',
    name: 'Maria Designer',
    email: 'maria@luisices.com.br',
    role: 'funcionario',
    active: true,
  };

  it('omite e-mail de outro colaborador quando o funcionário NÃO possui o escopo team:read', () => {
    const scopeWithoutTeam = {
      uid: 'colab-2',
      email: 'joao@luisices.com.br',
      active: true,
      isAdmin: false,
      isEmployee: true,
      scopes: ['customers:read', 'orders:read'],
    };

    const sanitized = sanitizeCollaboratorInfo(member, scopeWithoutTeam);
    expect(sanitized).toEqual({ name: 'Maria Designer' });
    expect(sanitized).not.toHaveProperty('email');
  });

  it('inclui e-mail quando o funcionário possui o escopo team:read', () => {
    const scopeWithTeam = {
      uid: 'colab-2',
      email: 'joao@luisices.com.br',
      active: true,
      isAdmin: false,
      isEmployee: true,
      scopes: ['customers:read', 'team:read'],
    };

    const sanitized = sanitizeCollaboratorInfo(member, scopeWithTeam);
    expect(sanitized).toEqual({ name: 'Maria Designer', email: 'maria@luisices.com.br' });
  });

  it('inclui e-mail quando o chamador é administrador', () => {
    const adminScope = {
      uid: 'admin-1',
      email: 'admin@luisices.com.br',
      active: true,
      isAdmin: true,
      isEmployee: false,
    };

    const sanitized = sanitizeCollaboratorInfo(member, adminScope);
    expect(sanitized).toEqual({ name: 'Maria Designer', email: 'maria@luisices.com.br' });
  });

  it('permite que o próprio colaborador veja seu próprio e-mail (isSelf)', () => {
    const selfScope = {
      uid: 'colab-1',
      email: 'maria@luisices.com.br',
      active: true,
      isAdmin: false,
      isEmployee: true,
      scopes: ['orders:read'],
    };

    const sanitized = sanitizeCollaboratorInfo(member, selfScope);
    expect(sanitized).toEqual({ name: 'Maria Designer', email: 'maria@luisices.com.br' });
  });
});

describe('Hardening de Rate Limit e Proteção de Origem', () => {
  const TEST_SECRET = 'super-secret-origin-token-12345';
  let origSecret: string | undefined;

  beforeEach(() => {
    origSecret = process.env.ORIGIN_SECRET;
    process.env.ORIGIN_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    if (origSecret !== undefined) {
      process.env.ORIGIN_SECRET = origSecret;
    } else {
      delete process.env.ORIGIN_SECRET;
    }
  });

  it('valida token de origem da Cloudflare corretamente', () => {
    // Requisição válida via Cloudflare
    const validReq = {
      headers: {
        'x-origin-secret': TEST_SECRET,
      },
    };
    expect(validateOriginSecret(validReq as any)).toEqual({ allowed: true });

    // Requisição sem token (chamada direta aos domínios *.cloudfunctions.net)
    const directReq = {
      headers: {},
    };
    const directResult = validateOriginSecret(directReq as any);
    expect(directResult.allowed).toBe(false);
    expect(directResult.statusCode).toBe(403);

    // Requisição com token forjado/incorreto
    const spoofedReq = {
      headers: {
        'x-origin-secret': 'wrong-token',
      },
    };
    const spoofedResult = validateOriginSecret(spoofedReq as any);
    expect(spoofedResult.allowed).toBe(false);
    expect(spoofedResult.statusCode).toBe(403);
  });

  it('getTrustedClientIp confia no cf-connecting-ip APENAS quando a origem da Cloudflare é autenticada', () => {
    const cfRequest = {
      headers: {
        'x-origin-secret': TEST_SECRET,
        'cf-connecting-ip': '198.51.100.50',
      },
      ip: '172.68.1.1',
    };
    // Requisição autenticada: o cabeçalho injetado pela Cloudflare é confiável
    expect(getTrustedClientIp(cfRequest as any)).toBe('198.51.100.50');
  });

  it('getTrustedClientIp rejeita cf-connecting-ip forjado em chamadas diretas e prioriza socket.remoteAddress sobre headers/req.ip', () => {
    const maliciousDirectRequest = {
      headers: {
        'cf-connecting-ip': '1.1.1.1', // Atacante tentando burlar o limitador
        'x-forwarded-for': '2.2.2.2',
      },
      socket: {
        remoteAddress: '203.0.113.195', // IP direto do socket TCP (imune a headers)
      },
      ip: '2.2.2.2', // O Express poderia avaliar req.ip com base no cabeçalho x-forwarded-for
    };
    // Sem o x-origin-secret válido, ignora headers forjados e usa estritamente o socket real
    expect(getTrustedClientIp(maliciousDirectRequest as any)).toBe('203.0.113.195');
  });

  it('handleSubmitPublicCatalogOrder exercita o handler real consumindo o IP seguro no rate limiter', async () => {
    const consumedIps: string[] = [];
    const mockLimiter = {
      consume: vi.fn(async (ip: string) => {
        consumedIps.push(ip);
        if (ip === 'blocked_ip') {
          throw new Error('Rate limit exceeded');
        }
        return { remainingPoints: 9 };
      }),
    };

    // 1. Chamada legítima via Cloudflare Worker
    const legitimateReq = {
      rawRequest: {
        headers: {
          'x-origin-secret': TEST_SECRET,
          'cf-connecting-ip': '198.51.100.77',
        },
        ip: '172.68.1.5',
      },
      data: {
        submittedSubtotal: 0,
        items: [],
      },
    };

    // O handler executa o rate limiter consumindo o IP validado '198.51.100.77'
    await handleSubmitPublicCatalogOrder(legitimateReq as any, {
      publicCatalogOrderLimiter: mockLimiter as any,
    }).catch((err) => {
      if (err?.code !== 'invalid-argument') throw err;
    });

    expect(consumedIps).toContain('198.51.100.77');

    // 2. Chamada direta de atacante tentando falsificar IP
    const attackerReq = {
      rawRequest: {
        headers: {
          'cf-connecting-ip': '9.9.9.9', // Spoofing
        },
        ip: '203.0.113.50',
      },
      data: {
        submittedSubtotal: 0,
        items: [],
      },
    };

    await handleSubmitPublicCatalogOrder(attackerReq as any, {
      publicCatalogOrderLimiter: mockLimiter as any,
    }).catch((err) => {
      if (err?.code !== 'invalid-argument') throw err;
    });

    // O atacante teve seu IP real ('203.0.113.50') consumido, impedindo o bypass do rate limiter
    expect(consumedIps).toContain('203.0.113.50');
    expect(consumedIps).not.toContain('9.9.9.9');

    // 3. Testa bloqueio quando o rate limit é esgotado
    const rateLimitedReq = {
      rawRequest: {
        headers: {
          'x-origin-secret': TEST_SECRET,
          'cf-connecting-ip': 'blocked_ip',
        },
      },
      data: {
        submittedSubtotal: 0,
        items: [],
      },
    };

    await expect(
      handleSubmitPublicCatalogOrder(rateLimitedReq as any, {
        publicCatalogOrderLimiter: mockLimiter as any,
      })
    ).rejects.toThrow(/Muitas tentativas de pedido em sequência/i);
  });
});

describe('Hardening de Storage: Validação de Magic Bytes / Assinatura de Arquivos', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('reconhece cabeçalhos completos dos formatos aceitos', async () => {
    vi.stubGlobal('createImageBitmap', async () => ({ width: 1, height: 1, close() {} }));
    const png = new Uint8Array(33);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    png[19] = 1; png[23] = 1; png[24] = 8; png[25] = 6;
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, ...new Array(14).fill(0)]);
    const webp = new Uint8Array(30);
    webp.set([0x52, 0x49, 0x46, 0x46, 22, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20]);
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0x80, 0, 0, 0xff]);

    for (const [bytes, name, type] of [
      [png, 'foto.png', 'image/png'],
      [jpeg, 'foto.jpg', 'image/jpeg'],
      [webp, 'foto.webp', 'image/webp'],
      [gif, 'animacao.gif', 'image/gif'],
    ] as const) {
      const result = await validateFileSignature(new File([bytes], name, { type }));
      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe(type);
    }
  });

  it('reconhece PDF com cabeçalho de versão e marcador final', async () => {
    const pdfBytes = new TextEncoder().encode(`%PDF-1.4\n${' '.repeat(20)}%%EOF\n`);
    const result = await validateFileSignature(new File([pdfBytes], 'pedido.pdf', { type: 'application/pdf' }));
    expect(result.valid).toBe(true);
    expect(result.detectedMime).toBe('application/pdf');
  });

  it('rejeita MIME divergente, executável renomeado e assinatura truncada', async () => {
    const executable = new File(
      [new Uint8Array([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0, 0xff, 0xff, 0, 0])],
      'malware.png', { type: 'image/png' },
    );
    expect((await validateFileSignature(executable)).valid).toBe(false);

    const truncatedPng = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])],
      'truncado.png', { type: 'image/png' },
    );
    expect((await validateFileSignature(truncatedPng)).valid).toBe(false);

    const mismatched = new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, ...new Array(14).fill(0)])],
      'jpeg-renomeado.png', { type: 'image/png' },
    );
    const result = await validateFileSignature(mismatched);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/não corresponde ao conteúdo/i);
  });

  it('rejeita SVG ativo e também SVG aparentemente limpo porque não é formato de upload permitido', async () => {
    for (const svg of [
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>',
    ]) {
      const result = await validateFileSignature(
        new File([new TextEncoder().encode(svg)], 'logo.svg', { type: 'image/svg+xml' }),
      );
      expect(result.valid).toBe(false);
    }
  });

  it('rejeita arquivos vazios', async () => {
    const result = await validateFileSignature(new File([new Uint8Array([1, 2])], 'empty.png', { type: 'image/png' }));
    expect(result.valid).toBe(false);
  });
});

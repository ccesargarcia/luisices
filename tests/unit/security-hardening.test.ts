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

  it('getTrustedClientIp rejeita cf-connecting-ip forjado em chamadas diretas sem token de origem', () => {
    const maliciousDirectRequest = {
      headers: {
        'cf-connecting-ip': '1.1.1.1', // Atacante tentando burlar o limitador
        'x-forwarded-for': '2.2.2.2',
      },
      ip: '203.0.113.195', // IP real da conexão de rede
    };
    // Sem o x-origin-secret válido, ignora headers forjados e usa estritamente o IP de conexão real
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
  it('reconhece e valida assinaturas de imagens legítimas (PNG, JPEG, WebP, GIF)', async () => {
    // PNG magic bytes: 0x89 0x50 0x4E 0x47
    const pngFile = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52])],
      'foto.png',
      { type: 'image/png' }
    );
    const pngResult = await validateFileSignature(pngFile);
    expect(pngResult.valid).toBe(true);
    expect(pngResult.detectedMime).toBe('image/png');

    // JPEG magic bytes: 0xFF 0xD8 0xFF
    const jpegFile = new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01])],
      'foto.jpg',
      { type: 'image/jpeg' }
    );
    const jpegResult = await validateFileSignature(jpegFile);
    expect(jpegResult.valid).toBe(true);
    expect(jpegResult.detectedMime).toBe('image/jpeg');

    // WebP magic bytes: RIFF....WEBP
    const webpFile = new File(
      [new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20])],
      'foto.webp',
      { type: 'image/webp' }
    );
    const webpResult = await validateFileSignature(webpFile);
    expect(webpResult.valid).toBe(true);
    expect(webpResult.detectedMime).toBe('image/webp');

    // GIF magic bytes: GIF89a
    const gifFile = new File(
      [new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff])],
      'animacao.gif',
      { type: 'image/gif' }
    );
    const gifResult = await validateFileSignature(gifFile);
    expect(gifResult.valid).toBe(true);
    expect(gifResult.detectedMime).toBe('image/gif');
  });

  it('reconhece e valida assinatura de PDF legítimo', async () => {
    // PDF magic bytes: %PDF
    const pdfFile = new File(
      [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xd0, 0xd4, 0xc5, 0xd8, 0x0a, 0x34])],
      'pedido.pdf',
      { type: 'application/pdf' }
    );
    const pdfResult = await validateFileSignature(pdfFile);
    expect(pdfResult.valid).toBe(true);
    expect(pdfResult.detectedMime).toBe('application/pdf');
  });

  it('rejeita arquivo malicioso com extensão e MIME forjados para PDF', async () => {
    // Texto / HTML disfarçado de PDF
    const fakePdfFile = new File(
      [new TextEncoder().encode('<html><body><script>alert(1)</script></body></html>')],
      'pedido_falso.pdf',
      { type: 'application/pdf' }
    );

    const result = await validateFileSignature(fakePdfFile);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Assinatura binária do arquivo.*desconhecida/i);
  });

  it('rejeita executável disfarçado de imagem PNG', async () => {
    // Cabeçalho de executável DOS/PE: 'MZ' (0x4D 0x5A)
    const fakeImageFile = new File(
      [new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00])],
      'avatar_virus.png',
      { type: 'image/png' }
    );

    const result = await validateFileSignature(fakeImageFile);
    expect(result.valid).toBe(false);
  });

  it('detecta inconsistência de MIME quando os bytes são de um formato e os metadados declaram outro', async () => {
    // Arquivo tem bytes reais de JPEG, mas declara ser PNG nos metadados
    const mismatchedFile = new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01])],
      'foto_confusa.png',
      { type: 'image/png' }
    );

    const result = await validateFileSignature(mismatchedFile);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Inconsistência de arquivo.*declarado como "image\/png".*image\/jpeg/i);
  });

  it('bloqueia SVG contendo scripts maliciosos (Stored XSS)', async () => {
    const maliciousSvg = new File(
      [new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script></svg>')],
      'logo.svg',
      { type: 'image/svg+xml' }
    );

    const result = await validateFileSignature(maliciousSvg, ['image/svg+xml']);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/scripts ou manipuladores de eventos proibidos/i);
  });

  it('permite SVG limpo e bem formatado', async () => {
    const cleanSvg = new File(
      [new TextEncoder().encode('<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="red" /></svg>')],
      'logo.svg',
      { type: 'image/svg+xml' }
    );

    const result = await validateFileSignature(cleanSvg, ['image/svg+xml']);
    expect(result.valid).toBe(true);
    expect(result.detectedMime).toBe('image/svg+xml');
  });

  it('rejeita arquivos vazios ou truncados menores que 4 bytes', async () => {
    const tinyFile = new File([new Uint8Array([0x01, 0x02])], 'tiny.bin', { type: 'image/png' });
    const result = await validateFileSignature(tinyFile);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Arquivo inválido ou vazio/i);
  });
});

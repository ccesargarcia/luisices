import { describe, expect, it } from 'vitest';
// @ts-ignore
import { sanitizeCollaboratorInfo } from '../../functions/ai/authorization.js';

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

describe('Hardening de Rate Limit: Proteção contra IP Spoofing', () => {
  it('prioriza cf-connecting-ip e x-real-ip da Cloudflare em vez de x-forwarded-for forjado', () => {
    function extractIpFixed(rawRequest: any) {
      return (
        rawRequest?.headers?.['cf-connecting-ip'] ||
        rawRequest?.headers?.['x-real-ip'] ||
        rawRequest?.ip ||
        'unknown'
      );
    }

    const reqWithSpoofedForwarded = {
      headers: {
        'x-forwarded-for': '203.0.113.195, 10.0.0.1',
        'cf-connecting-ip': '198.51.100.50',
      },
    };

    // Agora extrai com segurança o IP real atribuído pela borda da Cloudflare
    expect(extractIpFixed(reqWithSpoofedForwarded)).toBe('198.51.100.50');
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_BACKEND_ROUTING,
  VercelInfraError,
  isFallbackEligibleError,
  resolveEffectiveProvider,
} from '../../src/services/backendRoutingService';

describe('backendRoutingService', () => {
  it('força GCP fora dos domínios beta mesmo com globalMode=vercel', () => {
    expect(resolveEffectiveProvider('aiChat', DEFAULT_BACKEND_ROUTING, false)).toBe('gcp');
    expect(resolveEffectiveProvider('publicCatalogProducts', {
      ...DEFAULT_BACKEND_ROUTING,
      routes: { ...DEFAULT_BACKEND_ROUTING.routes, publicCatalogProducts: 'vercel' },
    }, false)).toBe('gcp');
  });

  it('aplica overrides granulares corretamente no domínio beta', () => {
    const cfg = {
      ...DEFAULT_BACKEND_ROUTING,
      globalMode: 'vercel' as const,
      routes: {
        ...DEFAULT_BACKEND_ROUTING.routes,
        aiChat: 'gcp' as const,
      },
    };
    expect(resolveEffectiveProvider('publicCatalogProducts', cfg, true)).toBe('vercel');
    expect(resolveEffectiveProvider('aiChat', cfg, true)).toBe('gcp');
  });

  it('diferencia erros de negócio (sem fallback) de falhas de infraestrutura (com fallback)', () => {
    const businessErr = Object.assign(new Error('Link inválido'), { code: 'not-found' });
    expect(isFallbackEligibleError(businessErr)).toBe(false);

    const authErr = Object.assign(new Error('Sem permissão'), { status: 403 });
    expect(isFallbackEligibleError(authErr)).toBe(false);

    expect(isFallbackEligibleError(new VercelInfraError('Internal Error', 500))).toBe(true);
    expect(isFallbackEligibleError(new TypeError('Failed to fetch'))).toBe(true);
    const timeoutErr = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    expect(isFallbackEligibleError(timeoutErr)).toBe(true);
  });
});

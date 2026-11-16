import { afterEach, describe, expect, it, vi } from 'vitest';
import { getVercelBetaApiUrl } from '../../src/app/utils/betaHost';

describe('betaHost API URL selection', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses api.beta for Beta storefronts', () => {
    vi.stubGlobal('window', { location: { hostname: 'beta.luisices.com.br' } });

    expect(getVercelBetaApiUrl('/api/public-catalog-products'))
      .toBe('https://api.beta.luisices.com.br/api/public-catalog-products');
  });

  it('keeps a relative URL outside Beta', () => {
    vi.stubGlobal('window', { location: { hostname: 'dev.luisices.com.br' } });

    expect(getVercelBetaApiUrl('/api/public-catalog-products'))
      .toBe('/api/public-catalog-products');
  });
});

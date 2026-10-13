import { describe, expect, it } from 'vitest';
import { OAUTH_API_ORIGINS, resolveOAuthApiOrigin } from '../../src/app/utils/oauthEnvironment';

describe('OAuth consent environment routing', () => {
  it('routes the official development and production domains to their own APIs', () => {
    expect(resolveOAuthApiOrigin({ hostname: 'dev.luisices.com.br', isDevelopmentBuild: false })).toBe(OAUTH_API_ORIGINS.development);
    expect(resolveOAuthApiOrigin({ hostname: 'luisices.com.br', isDevelopmentBuild: false })).toBe(OAUTH_API_ORIGINS.production);
  });

  it('uses development for local builds and the configured development Firebase project', () => {
    expect(resolveOAuthApiOrigin({ hostname: 'localhost', isDevelopmentBuild: true })).toBe(OAUTH_API_ORIGINS.development);
    expect(resolveOAuthApiOrigin({ hostname: 'preview.example.test', isDevelopmentBuild: false, firebaseProjectId: 'luisices-dev' })).toBe(OAUTH_API_ORIGINS.development);
  });

  it('refuses unknown preview hosts without a development signal instead of selecting production', () => {
    expect(resolveOAuthApiOrigin({ hostname: 'preview.example.test', isDevelopmentBuild: false, firebaseProjectId: 'papelaria-dashboard' })).toBeNull();
    expect(resolveOAuthApiOrigin({ hostname: 'localhost', isDevelopmentBuild: false })).toBeNull();
  });
});

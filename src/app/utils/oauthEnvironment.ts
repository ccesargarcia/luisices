export const OAUTH_API_ORIGINS = Object.freeze({
  beta: 'https://api.beta.luisices.com.br',
  development: 'https://api.dev.luisices.com.br',
  production: 'https://api.luisices.com.br',
});

/** Resolve OAuth only for a recognized deployment or an explicit development build. */
export function resolveOAuthApiOrigin({ hostname, isDevelopmentBuild, firebaseProjectId }: {
  hostname: string;
  isDevelopmentBuild: boolean;
  firebaseProjectId?: string;
}): string | null {
  const normalizedHost = hostname.toLowerCase().replace(/\.$/, '');
  if (
    normalizedHost === 'dev.luisices.com.br' ||
    normalizedHost === 'beta.luisices.com.br' ||
    normalizedHost === 'loja.beta.luisices.com.br'
  ) {
    return OAUTH_API_ORIGINS.development;
  }
  if (normalizedHost === 'luisices.com.br') return OAUTH_API_ORIGINS.production;
  if (firebaseProjectId === 'luisices-dev') return OAUTH_API_ORIGINS.development;
  if (isDevelopmentBuild) return OAUTH_API_ORIGINS.development;
  return null;
}

/** Resolve the OAuth API origin used by the browser-based consent screen. */
export function resolveOAuthConsentApiOrigin({ hostname, isDevelopmentBuild, firebaseProjectId }: {
  hostname: string;
  isDevelopmentBuild: boolean;
  firebaseProjectId?: string;
}): string | null {
  const normalizedHost = hostname.toLowerCase().replace(/\.$/, '');
  if (normalizedHost === 'beta.luisices.com.br' || normalizedHost === 'loja.beta.luisices.com.br') {
    return OAUTH_API_ORIGINS.beta;
  }
  return resolveOAuthApiOrigin({ hostname: normalizedHost, isDevelopmentBuild, firebaseProjectId });
}

const VERCEL_BETA_HOSTS = new Set([
  'beta.luisices.com.br',
  'loja.beta.luisices.com.br',
]);

export function isVercelBetaHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase().replace(/\.$/, '');
  return VERCEL_BETA_HOSTS.has(host);
}

export function getVercelBetaApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return isVercelBetaHost() ? `https://api.beta.luisices.com.br${normalizedPath}` : normalizedPath;
}

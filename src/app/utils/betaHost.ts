const VERCEL_BETA_HOSTS = new Set([
  'beta.luisices.com.br',
  'loja.beta.luisices.com.br',
]);

export function isVercelBetaHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase().replace(/\.$/, '');
  return VERCEL_BETA_HOSTS.has(host);
}

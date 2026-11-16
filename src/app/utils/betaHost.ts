export function isVercelBetaHost(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.location.hostname.toLowerCase().replace(/\.$/, '') === 'beta.luisices.com.br'
  );
}

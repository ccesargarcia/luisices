/**
 * URL Utilities and Sanitizers
 */

/**
 * Normaliza links de Instagram para que sempre comecem com https://instagram.com/...
 * Evita o bug de resolver caminhos relativos como nomedosite.com.br/@instagram
 */
export function normalizeInstagramUrl(handleOrUrl?: string | null): string {
  if (!handleOrUrl || typeof handleOrUrl !== 'string') return '';
  const trimmed = handleOrUrl.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('@')) {
    return `https://instagram.com/${trimmed.slice(1)}`;
  }

  if (trimmed.startsWith('instagram.com/') || trimmed.startsWith('www.instagram.com/')) {
    return `https://${trimmed}`;
  }

  // Caso seja apenas o handle (ex: 'luisices')
  return `https://instagram.com/${trimmed.replace(/^\/+/, '')}`;
}

/**
 * Normaliza URLs de websites em geral para sempre conterem o protocolo https://
 */
export function normalizeWebsiteUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

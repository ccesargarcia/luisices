/**
 * CDN / Custom Domain Utilities for Firebase Storage
 */

/**
 * Converte qualquer URL do Firebase Storage para o domínio CDN configurado (Cloudflare).
 * Garante entrega de alta velocidade e SSL próprio (ex: https://cdn-dev.luisices.com.br/users/...).
 *
 * @param url URL da imagem ou anexo
 * @returns URL formatada via CDN próprio
 */
export function toCdnUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();
  if (!trimmed) return '';

  const cdnBase = import.meta.env.VITE_STORAGE_CDN_URL;
  if (!cdnBase) return trimmed;

  const cleanCdnBase = cdnBase.replace(/\/+$/, '');

  // 1. Se já for uma URL do CDN próprio, padroniza e remove query string (?alt=media&token=...)
  if (trimmed.startsWith(cleanCdnBase) || trimmed.includes('cdn.luisices.com.br') || trimmed.includes('cdn-dev.luisices.com.br')) {
    try {
      const parsed = new URL(trimmed);
      const cleanPath = parsed.pathname.replace(/^\/+/, '');
      return `${parsed.origin}/${cleanPath}`;
    } catch {
      return trimmed;
    }
  }

  // 2. Se for uma URL do Firebase Storage (googleapis.com)
  if (trimmed.includes('firebasestorage.googleapis.com')) {
    try {
      // Padrão /o/<encodedPath>
      const match = trimmed.match(/\/o\/(.+?)(\?.*)?$/);
      if (match && match[1]) {
        const rawPath = decodeURIComponent(match[1]);
        return `${cleanCdnBase}/${rawPath}`;
      }

      // Padrão /o?name=<encodedPath>
      const nameMatch = trimmed.match(/[?&]name=([^&]+)/);
      if (nameMatch && nameMatch[1]) {
        const rawPath = decodeURIComponent(nameMatch[1]);
        return `${cleanCdnBase}/${rawPath}`;
      }
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

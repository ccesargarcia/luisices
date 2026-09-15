/**
 * CDN / Custom Domain Utilities for Firebase Storage
 */

/**
 * Converte uma URL do Firebase Storage para o domínio CDN configurado (Cloudflare), se disponível.
 * Se a URL já for da CDN ou não for do Firebase Storage, retorna a URL original.
 *
 * @param url URL da imagem ou anexo
 * @returns URL formatada com o domínio CDN próprio
 */
export function toCdnUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';

  const cdnBase = import.meta.env.VITE_STORAGE_CDN_URL;
  if (!cdnBase) return url;

  // Se não for uma URL padrão do Firebase Storage, retorna inalterada
  if (!url.includes('firebasestorage.googleapis.com')) {
    return url;
  }

  try {
    // Padrão: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encodedPath>?<queryParams>
    const match = url.match(/\/o\/(.+?)(\?.*)?$/);
    if (!match || !match[1]) return url;

    const rawPath = decodeURIComponent(match[1]);
    const queryString = match[2] || '';
    const cleanBase = cdnBase.replace(/\/+$/, '');

    return `${cleanBase}/${rawPath}${queryString}`;
  } catch {
    return url;
  }
}

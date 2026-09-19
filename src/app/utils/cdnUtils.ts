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

  // Se já for uma URL de CDN (produção ou dev), limpa parâmetros de busca (?alt=media&token=...)
  if (
    url.startsWith(cdnBase) ||
    url.includes('cdn.luisices.com.br') ||
    url.includes('cdn-dev.luisices.com.br')
  ) {
    return url.split('?')[0];
  }

  // Se não for uma URL padrão do Firebase Storage, retorna inalterada
  if (!url.includes('firebasestorage.googleapis.com')) {
    return url;
  }

  try {
    // Padrão: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encodedPath>?<queryParams>
    const match = url.match(/\/o\/(.+?)(\?.*)?$/);
    if (!match || !match[1]) return url;

    const rawPath = decodeURIComponent(match[1]);
    const cleanBase = cdnBase.replace(/\/+$/, '');

    // Retorna URL limpa no formato https://cdn.luisices.com.br/path/to/file.png
    return `${cleanBase}/${rawPath}`;
  } catch {
    return url;
  }
}

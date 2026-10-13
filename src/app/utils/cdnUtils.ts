/**
 * CDN / Custom Domain Utilities for Firebase Storage
 */

/**
 * Normaliza e garante que qualquer URL de imagem (seja do CDN legado cdn-dev/cdn ou do Firebase Storage)
 * seja convertida para uma URL direta e funcional do Firebase Storage com HTTP 200 OK.
 *
 * @param url URL da imagem ou anexo
 * @returns URL funcional e limpa da imagem
 */
export function toCdnUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();
  if (!trimmed) return '';

  // 1. Se for uma URL legada do CDN (cdn-dev.luisices.com.br ou cdn.luisices.com.br)
  if (trimmed.includes('cdn-dev.luisices.com.br') || trimmed.includes('cdn.luisices.com.br')) {
    try {
      const parsed = new URL(trimmed);
      const cleanPath = parsed.pathname.replace(/^\/+/, '');
      if (!cleanPath) return trimmed;

      const encodedPath = encodeURIComponent(cleanPath);
      const isDev = trimmed.includes('cdn-dev');
      const bucket = isDev ? 'luisices-dev.firebasestorage.app' : 'papelaria-dashboard.firebasestorage.app';

      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
    } catch {
      return trimmed;
    }
  }

  // 2. Se for uma URL do Firebase Storage com domínio legado .appspot.com no ambiente Dev
  if (trimmed.includes('firebasestorage.googleapis.com') && trimmed.includes('luisices-dev.appspot.com')) {
    let fixed = trimmed.replace('luisices-dev.appspot.com', 'luisices-dev.firebasestorage.app');
    if (!fixed.includes('alt=media')) {
      fixed += (fixed.includes('?') ? '&' : '?') + 'alt=media';
    }
    return fixed;
  }

  // 3. Se for uma URL direta do Firebase Storage sem alt=media
  if (trimmed.includes('firebasestorage.googleapis.com') && !trimmed.includes('alt=media')) {
    return trimmed + (trimmed.includes('?') ? '&' : '?') + 'alt=media';
  }

  return trimmed;
}

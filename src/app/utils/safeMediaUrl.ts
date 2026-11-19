/**
 * Sanitização estrita de URLs para previews de imagem e links externos no DOM.
 * Previne XSS via esquemas perigosos (javascript:, data:text/html, data:image/svg+xml).
 */

const SAFE_DATA_IMAGE_RE = /^data:image\/(?:png|jpeg|jpg|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/i;

/**
 * Valida uma URL externa para uso em atributos `href`, aceitando apenas http(s).
 */
export function sanitizeExternalHttpUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Valida uma URL de pré-visualização de imagem para uso em `<img src>`.
 * Aceita:
 * - `blob:` gerado localmente pelo navegador (validado via URL)
 * - `https:` / `http:` válidos
 * - `data:image/(png|jpeg|jpg|webp|gif|avif);base64,...` (bloqueando SVG/HTML)
 */
export function sanitizeImagePreviewUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('data:')) {
    return SAFE_DATA_IMAGE_RE.test(trimmed) ? trimmed : null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'blob:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { toCdnUrl } from '../app/utils/cdnUtils';

/**
 * Mantém a CDN como origem primária quando a URL já contém o token do Storage.
 * URLs legadas sem token precisam ser assinadas pelo SDK autenticado; sem isso,
 * o Worker da CDN recebe uma solicitação privada e responde 403.
 */
export async function resolveGalleryImageUrl(imageUrl: string): Promise<string> {
  if (!imageUrl) return '';

  let url: URL;
  try { url = new URL(imageUrl); } catch { return imageUrl; }

  const allowedHosts = ['cdn.luisices.com.br', 'cdn-dev.luisices.com.br'];
  const configuredCdn = import.meta.env.VITE_STORAGE_CDN_URL;
  if (configuredCdn) {
    try { allowedHosts.push(new URL(configuredCdn).hostname); } catch { /* configuração inválida */ }
  }

  const isGalleryCdnUrl = allowedHosts.includes(url.hostname)
    && /^users\/[^/]+\/gallery\/[^/]+$/.test(decodeURIComponent(url.pathname.slice(1)));

  if (isGalleryCdnUrl && !url.searchParams.has('token')) {
    const path = decodeURIComponent(url.pathname.slice(1));
    return toCdnUrl(await getDownloadURL(ref(storage, path)));
  }

  return toCdnUrl(imageUrl);
}

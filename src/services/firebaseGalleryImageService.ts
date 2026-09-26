import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../lib/firebase';

/** Recupera URLs antigas da CDN usando a sessão autorizada do Storage. */
export async function resolveGalleryImageUrl(imageUrl: string): Promise<string> {
  if (!imageUrl) return '';
  let url: URL;
  try { url = new URL(imageUrl); } catch { return imageUrl; }
  const allowedHosts = ['cdn.luisices.com.br', 'cdn-dev.luisices.com.br'];
  const configuredCdn = import.meta.env.VITE_STORAGE_CDN_URL;
  if (configuredCdn) {
    try { allowedHosts.push(new URL(configuredCdn).hostname); } catch { /* configuração inválida */ }
  }
  if (!allowedHosts.includes(url.hostname)) return imageUrl;
  const path = decodeURIComponent(url.pathname.slice(1));
  if (!/^users\/[^/]+\/gallery\/[^/]+$/.test(path)) return imageUrl;
  return getDownloadURL(ref(storage, path));
}

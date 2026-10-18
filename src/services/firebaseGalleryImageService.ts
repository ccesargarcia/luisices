import { auth } from '../lib/firebase';
import { resolveOAuthApiOrigin } from '../app/utils/oauthEnvironment';

/** Extrai apenas o caminho do Storage, descartando tokens de URLs legadas. */
export function extractGalleryStoragePath(imageUrl: string): string {
  if (!imageUrl) return '';
  try {
    const url = new URL(imageUrl);
    if (url.hostname === 'firebasestorage.googleapis.com') {
      const match = url.pathname.match(/\/o\/(.+)$/);
      return match ? decodeURIComponent(match[1]) : '';
    }
    if (url.hostname === 'cdn.luisices.com.br' || url.hostname === 'cdn-dev.luisices.com.br') {
      return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    }
    return '';
  } catch {
    return imageUrl.replace(/^\/+/, '').split('?')[0];
  }
}

export function galleryMediaApiUrl(itemId?: string, storagePath?: string): string {
  if (typeof window === 'undefined') throw new Error('Galeria disponível apenas no navegador.');
  const origin = resolveOAuthApiOrigin({
    hostname: window.location.hostname,
    isDevelopmentBuild: import.meta.env.DEV,
    firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  });
  if (!origin) throw new Error('Não foi possível identificar o ambiente da galeria.');
  if (!itemId && !storagePath) throw new Error('É necessário informar o item ou caminho da imagem.');
  const path = itemId ? `/media/gallery/${encodeURIComponent(itemId)}` : '/media/gallery';
  const query = storagePath ? `?path=${encodeURIComponent(extractGalleryStoragePath(storagePath))}` : '';
  return `${origin}${path}${query}`;
}

export async function fetchPrivateGalleryImage(itemId: string | undefined, signal?: AbortSignal, storagePath?: string): Promise<Blob> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão necessária para carregar esta imagem.');
  const idToken = await user.getIdToken();
  const response = await fetch(galleryMediaApiUrl(itemId, storagePath), {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}`, Accept: 'image/*' },
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw new Error(`Não foi possível carregar a imagem (${response.status}).`);
  if (!response.headers.get('content-type')?.startsWith('image/')) {
    throw new Error('O servidor retornou um conteúdo que não é uma imagem.');
  }
  return response.blob();
}

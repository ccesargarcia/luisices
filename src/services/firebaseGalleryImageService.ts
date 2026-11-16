import { auth } from '../lib/firebase';
import { resolveOAuthApiOrigin } from '../app/utils/oauthEnvironment';
import { getVercelBetaApiUrl } from '../app/utils/betaHost';
import { executeWithGcpFallback, shouldUseVercelForRoute, VercelInfraError } from './backendRoutingService';

const MAX_SESSION_IMAGE_CACHE = 80;
let cachedOwnerUid: string | null = null;
const sessionImageCache = new Map<string, Blob>();
const inFlightImageFetches = new Map<string, Promise<Blob>>();

function getCachedBlob(cacheKey: string): Blob | undefined {
  const existing = sessionImageCache.get(cacheKey);
  if (!existing) return undefined;
  // Move para o final para manter política LRU simples.
  sessionImageCache.delete(cacheKey);
  sessionImageCache.set(cacheKey, existing);
  return existing;
}

function setCachedBlob(cacheKey: string, blob: Blob): void {
  if (sessionImageCache.has(cacheKey)) {
    sessionImageCache.delete(cacheKey);
  } else if (sessionImageCache.size >= MAX_SESSION_IMAGE_CACHE) {
    const oldestKey = sessionImageCache.keys().next().value;
    if (oldestKey !== undefined) sessionImageCache.delete(oldestKey);
  }
  sessionImageCache.set(cacheKey, blob);
}

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

export function galleryMediaGcpUrl(itemId?: string, storagePath?: string): string {
  if (typeof window === 'undefined') throw new Error('Galeria disponível apenas no navegador.');
  if (!itemId && !storagePath) throw new Error('É necessário informar o item ou caminho da imagem.');
  const origin = resolveOAuthApiOrigin({
    hostname: window.location.hostname,
    isDevelopmentBuild: import.meta.env.DEV,
    firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  });
  if (!origin) throw new Error('Não foi possível identificar o ambiente da galeria.');
  const path = itemId ? `/media/gallery/${encodeURIComponent(itemId)}` : '/media/gallery';
  const query = storagePath ? `?path=${encodeURIComponent(extractGalleryStoragePath(storagePath))}` : '';
  return `${origin}${path}${query}`;
}

export function galleryMediaApiUrl(itemId?: string, storagePath?: string): string {
  if (typeof window === 'undefined') throw new Error('Galeria disponível apenas no navegador.');
  if (!itemId && !storagePath) throw new Error('É necessário informar o item ou caminho da imagem.');
  if (shouldUseVercelForRoute('galleryMedia')) {
    const params = new URLSearchParams();
    if (itemId) params.set('itemId', itemId);
    if (storagePath) params.set('path', extractGalleryStoragePath(storagePath));
    return getVercelBetaApiUrl(`/api/gallery-media?${params.toString()}`);
  }
  return galleryMediaGcpUrl(itemId, storagePath);
}

export async function fetchPrivateGalleryImage(itemId: string | undefined, signal?: AbortSignal, storagePath?: string): Promise<Blob> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão necessária para carregar esta imagem.');

  if (cachedOwnerUid !== user.uid) {
    sessionImageCache.clear();
    inFlightImageFetches.clear();
    cachedOwnerUid = user.uid;
  }

  const normalizedPath = storagePath ? extractGalleryStoragePath(storagePath) : '';
  const cacheKey = `${user.uid}::${itemId || ''}::${normalizedPath}`;
  const cached = getCachedBlob(cacheKey);
  if (cached) return cached;

  const existingPromise = inFlightImageFetches.get(cacheKey);
  if (existingPromise) return existingPromise;

  const requestPromise = (async () => {
    const idToken = await user.getIdToken();
    const fetchFromUrl = async (url: string): Promise<Blob> => {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${idToken}`, Accept: 'image/*' },
        cache: 'no-store',
        signal,
      });
      if (!response.ok) {
        if (response.status >= 500) {
          throw new VercelInfraError(`Não foi possível carregar a imagem (${response.status}).`, response.status);
        }
        const err = new Error(`Não foi possível carregar a imagem (${response.status}).`);
        Object.assign(err, { status: response.status });
        throw err;
      }
      if (!response.headers.get('content-type')?.startsWith('image/')) {
        throw new Error('O servidor retornou um conteúdo que não é uma imagem.');
      }
      return response.blob();
    };

    const blob = await executeWithGcpFallback(
      'galleryMedia',
      () => fetchFromUrl(galleryMediaApiUrl(itemId, storagePath)),
      () => fetchFromUrl(galleryMediaGcpUrl(itemId, storagePath)),
    );
    setCachedBlob(cacheKey, blob);
    return blob;
  })().finally(() => {
    inFlightImageFetches.delete(cacheKey);
  });

  if (!signal) {
    inFlightImageFetches.set(cacheKey, requestPromise);
  }
  return requestPromise;
}

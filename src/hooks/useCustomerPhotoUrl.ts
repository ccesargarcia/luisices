import { useEffect, useState } from 'react';
import { extractCustomerPhotoStoragePath } from '../app/utils/cdnUtils';

const MAX_CACHED_BLOBS = 200;
const customerPhotoBlobCache = new Map<string, Blob>();
const inflightRequests = new Map<string, Promise<Blob>>();

function rememberBlob(storagePath: string, blob: Blob) {
  if (customerPhotoBlobCache.size >= MAX_CACHED_BLOBS) {
    const oldestKey = customerPhotoBlobCache.keys().next().value;
    if (oldestKey) customerPhotoBlobCache.delete(oldestKey);
  }
  customerPhotoBlobCache.set(storagePath, blob);
}

async function loadAuthenticatedCustomerPhotoBlob(storagePath: string): Promise<Blob> {
  const cached = customerPhotoBlobCache.get(storagePath);
  if (cached) return cached;

  const existing = inflightRequests.get(storagePath);
  if (existing) return existing;

  const request = Promise.all([import('firebase/storage'), import('../lib/firebase')])
    .then(([{ getBlob, ref }, { storage }]) => getBlob(ref(storage, storagePath)))
    .then((blob) => {
      rememberBlob(storagePath, blob);
      return blob;
    })
    .finally(() => {
      inflightRequests.delete(storagePath);
    });

  inflightRequests.set(storagePath, request);
  return request;
}

/**
 * Resolve fotos de clientes protegidas por `storage.rules` via leitura autenticada (`getBlob`),
 * suportando tanto caminhos `users/{uid}/customers/{file}` quanto URLs legadas da CDN/Storage.
 * Para URLs `blob:`, `data:image/` ou externas, devolve o valor original sem alterações.
 */
export function useCustomerPhotoUrl(photoUrl?: string | null): string {
  const storagePath = extractCustomerPhotoStoragePath(photoUrl);
  const directUrl = !storagePath && photoUrl ? photoUrl : '';
  const [resolvedUrl, setResolvedUrl] = useState<string>(directUrl);

  useEffect(() => {
    if (!storagePath) {
      setResolvedUrl(directUrl);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    loadAuthenticatedCustomerPhotoBlob(storagePath)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setResolvedUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setResolvedUrl('');
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [storagePath, directUrl]);

  return resolvedUrl;
}

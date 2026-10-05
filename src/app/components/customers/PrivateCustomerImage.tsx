import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getBlob, ref } from 'firebase/storage';
import { auth, storage } from '../../../lib/firebase';
import { SafeImg } from '../SafeMedia';

export function customerPhotoPath(source: string): string | null {
  try {
    let path: string;
    if (source.startsWith('gs://')) {
      const url = new URL(source);
      if (url.hostname !== storage.app.options.storageBucket) return null;
      path = decodeURIComponent(url.pathname.slice(1));
    } else {
      const url = new URL(source);
      if (url.hostname === 'firebasestorage.googleapis.com') {
        const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
        if (!match || decodeURIComponent(match[1]) !== storage.app.options.storageBucket) return null;
        path = decodeURIComponent(match[2]);
      } else if (['cdn.luisices.com.br', 'cdn-dev.luisices.com.br'].includes(url.hostname)
        || (import.meta.env.VITE_STORAGE_CDN_URL && url.origin === new URL(import.meta.env.VITE_STORAGE_CDN_URL).origin)) {
        path = decodeURIComponent(url.pathname.slice(1));
      } else return null;
    }
    return /^users\/[^/]+\/customers\/[^/]+$/.test(path) ? path : null;
  } catch { return null; }
}

export function PrivateCustomerImage({ src, ...props }: Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src: string }) {
  const [resolved, setResolved] = useState('');
  useEffect(() => {
    let blobUrl = '';
    let generation = 0;
    let disposed = false;
    setResolved('');
    if (src.startsWith('blob:') || src.startsWith('data:image/')) {
      setResolved(src);
      return;
    }
    const path = customerPhotoPath(src);
    if (!path) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const current = ++generation;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = '';
      setResolved('');
      if (!user) return;
      try {
        const blob = await getBlob(ref(storage, path), 5 * 1024 * 1024);
        if (disposed || current !== generation) return;
        blobUrl = URL.createObjectURL(blob);
        setResolved(blobUrl);
      } catch { /* Sem fallback para URLs públicas quando o acesso é negado. */ }
    });
    return () => {
      disposed = true;
      unsubscribe();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src]);
  return <SafeImg src={resolved} {...props} />;
}

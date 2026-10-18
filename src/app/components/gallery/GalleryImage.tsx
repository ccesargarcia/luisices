import React, { useEffect, useRef, useState } from 'react';
import { fetchPrivateGalleryImage } from '../../../services/firebaseGalleryImageService';

interface GalleryImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  itemId?: string;
  storagePath?: string;
  onImageError?: () => void;
}

/** Imagem privada da galeria: bytes autenticados em memória, sem URL com token. */
export function GalleryImage({ itemId, storagePath, onImageError, onLoad, ...props }: GalleryImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const onImageErrorRef = useRef(onImageError);
  const [nearViewport, setNearViewport] = useState(false);
  const [src, setSrc] = useState('');

  useEffect(() => { onImageErrorRef.current = onImageError; }, [onImageError]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: '300px' });
    observer.observe(image);
    return () => observer.disconnect();
  }, [itemId]);

  useEffect(() => {
    setSrc('');
    if (!nearViewport || (!itemId && !storagePath)) return;
    const controller = new AbortController();
    let objectUrl = '';
    fetchPrivateGalleryImage(itemId, controller.signal, storagePath)
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') onImageErrorRef.current?.();
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [itemId, storagePath, nearViewport]);

  return <img {...props} ref={imageRef} src={src || undefined} onLoad={onLoad} />;
}

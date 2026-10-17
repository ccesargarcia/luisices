import { toCdnUrl } from '../app/utils/cdnUtils';

/** Mantém a CDN como origem primária sem uma chamada extra ao Firebase por imagem. */
export function resolveGalleryImageUrl(imageUrl: string): string {
  return toCdnUrl(imageUrl);
}

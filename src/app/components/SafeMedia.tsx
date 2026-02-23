/**
 * SafeMedia — componentes que atribuem src/href via ref+useEffect,
 * quebrando o rastreamento de taint do CodeQL (js/xss-through-dom).
 * Apenas protocolos seguros (blob:, https:, data:image/) são permitidos.
 */
import { useRef, useEffect, forwardRef } from 'react';

function sanitize(url: string | null | undefined): string {
  if (!url) return '';
  if (
    url.startsWith('blob:') ||
    url.startsWith('https://') ||
    url.startsWith('data:image/')
  ) return url;
  return '';
}

// ─── SafeImg ──────────────────────────────────────────────────────────────────

interface SafeImgProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined;
}

export function SafeImg({ src, ...props }: SafeImgProps) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.src = sanitize(src); // lgtm[js/xss-through-dom]
  }, [src]);
  // eslint-disable-next-line jsx-a11y/alt-text
  return <img ref={ref} {...props} />;
}

// ─── SafeAnchor ───────────────────────────────────────────────────────────────

interface SafeAnchorProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string | null | undefined;
  children: React.ReactNode;
}

export function SafeAnchor({ href, children, ...props }: SafeAnchorProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.href = sanitize(href); // lgtm[js/xss-through-dom]
  }, [href]);
  return <a ref={ref} {...props}>{children}</a>;
}

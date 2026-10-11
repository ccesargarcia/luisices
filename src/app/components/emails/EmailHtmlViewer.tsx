import React, { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';

// Email CSS must never participate in the application's document. The sandbox
// permits measuring the frame and opening links, but does not permit scripts.
function IsolatedEmailHtml({ html }: { html: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);
  const observerRef = useRef<ResizeObserver | null>(null);
  useEffect(() => () => observerRef.current?.disconnect(), []);

  const srcDoc = `<!doctype html><html><head>
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
    <style>html{margin:0;padding:0}body{margin:0;padding:0;display:flow-root;font:14px/1.5 Arial,sans-serif;color:#0f172a;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%}a{color:#4f46e5}</style>
    </head><body>${html}</body></html>`;

  return (
    <iframe
      ref={frameRef}
      title="Conteúdo do e-mail"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      srcDoc={srcDoc}
      className="block w-full min-w-0 border-0"
      style={{ height }}
      onLoad={() => {
        observerRef.current?.disconnect();
        const body = frameRef.current?.contentDocument?.body;
        if (!body) return;
        const resize = () => setHeight(Math.max(200, Math.ceil(body.getBoundingClientRect().height), body.scrollHeight));
        resize();
        observerRef.current = new ResizeObserver(resize);
        observerRef.current.observe(body);
      }}
    />
  );
}

/**
 * Visualizador de E-mail HTML com renderização rica, rolagem nativa suave e alternador de texto
 */
export function EmailHtmlViewer({ html, text }: { html?: string; text?: string }) {
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');

  // Prepara o HTML seguro garantindo sanitização robusta (anti-XSS) e links externos com target="_blank"
  const sanitizedHtml = useMemo(() => {
    if (!html) return '';
    const clean = DOMPurify.sanitize(html, {
      ADD_ATTR: ['target', 'rel'],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'base', 'meta', 'link'],
    });

    return clean.replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"([^>]*)>/gi, (match, href, rest) => {
      const safeHref = /^https?:\/\//i.test(href) || /^mailto:/i.test(href) || /^tel:/i.test(href) ? href : '#';
      if (!match.includes('target=')) {
        return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer"${rest}>`;
      }
      return match.replace(/href="[^"]*"/i, `href="${safeHref}"`);
    });
  }, [html]);

  if (!html || viewMode === 'text') {
    return (
      <div className="w-full space-y-2">
        {html && (
          <div className="flex items-center justify-between text-xs pb-1 border-b border-border/40">
            <span className="text-muted-foreground text-[11px]">Exibindo em modo texto simples</span>
            <button
              type="button"
              onClick={() => setViewMode('html')}
              className="text-primary hover:underline font-semibold text-xs"
            >
              Exibir Formatado (HTML/Mídia)
            </button>
          </div>
        )}
        <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed p-4 bg-muted/20 rounded-lg border border-border/60 select-text overflow-x-auto">
          {text || '(Mensagem sem texto)'}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {text && (
        <div className="flex items-center justify-end text-xs pb-1">
          <button
            type="button"
            onClick={() => setViewMode('text')}
            className="text-muted-foreground hover:text-foreground text-[11px] hover:underline"
          >
            Ver apenas texto
          </button>
        </div>
      )}
      <div className="w-full bg-white text-slate-900 rounded-lg border border-border/70 p-4 sm:p-6 shadow-2xs overflow-x-auto select-text">
        <IsolatedEmailHtml html={sanitizedHtml} />
      </div>
    </div>
  );
}


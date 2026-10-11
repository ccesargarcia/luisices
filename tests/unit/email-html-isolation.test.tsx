import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { EmailHtmlViewer } from '../../src/app/components/emails/EmailHtmlViewer';

function renderEmail(html: string, text?: string) {
  const markup = renderToStaticMarkup(<EmailHtmlViewer html={html} text={text} />);
  return new JSDOM(markup).window.document;
}

describe('email HTML isolation', () => {
  it('keeps sender CSS and fixed-width content outside the application document', () => {
    const doc = renderEmail('<div><style>header{min-width:900px}body{font-size:24px}</style><table width="900"><tr><td>Mensagem</td></tr></table></div>');
    expect(doc.querySelector('style')).toBeNull();
    expect(doc.querySelector('table')).toBeNull();
    const frame = doc.querySelector('iframe')!;
    const content = new JSDOM(frame.getAttribute('srcdoc')!).window.document;
    expect(content.querySelector('style')?.textContent).toContain('max-width:100%');
    expect(content.body.querySelector('style')?.textContent).toContain('header{min-width:900px}');
    expect(content.querySelector('td')?.textContent).toBe('Mensagem');
  });

  it('sanitizes executable content and prevents script execution in the frame', () => {
    const doc = renderEmail('<div><script>parent.alert(1)</script><img src="https://example.com/logo.png" onerror="alert(1)"><iframe src="https://example.com"></iframe><a href="javascript:alert(1)">Link</a></div>');
    const frame = doc.querySelector('iframe')!;
    expect(frame.getAttribute('sandbox')?.split(' ')).not.toContain('allow-scripts');
    const content = new JSDOM(frame.getAttribute('srcdoc')!).window.document;
    expect(content.querySelector('script, iframe')).toBeNull();
    expect(content.querySelector('img')?.hasAttribute('onerror')).toBe(false);
    expect(content.querySelector('a')?.hasAttribute('href')).toBe(false);
    expect(content.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content')).toContain("default-src 'none'");
    expect(frame.getAttribute('referrerPolicy')).toBe('no-referrer');
  });

  it('preserves formatted content, external links and the plain text option', () => {
    const doc = renderEmail('<p style="color:red">Mensagem</p><a href="https://example.com">Abrir</a>', 'Texto alternativo');
    const frame = doc.querySelector('iframe')!;
    const content = new JSDOM(frame.getAttribute('srcdoc')!).window.document;
    expect(content.querySelector('p')?.getAttribute('style')).toBe('color:red');
    expect(content.querySelector('a')?.getAttribute('target')).toBe('_blank');
    expect(content.querySelector('a')?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(doc.querySelector('button')?.textContent).toBe('Ver apenas texto');
  });

  it('renders text-only messages without a frame', () => {
    const doc = renderEmail('', 'Mensagem de texto');
    expect(doc.querySelector('iframe')).toBeNull();
    expect(doc.body.textContent).toContain('Mensagem de texto');
  });
});

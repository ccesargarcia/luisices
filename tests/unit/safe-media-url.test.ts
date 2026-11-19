import { describe, expect, it } from 'vitest';
import { sanitizeExternalHttpUrl, sanitizeImagePreviewUrl } from '../../src/app/utils/safeMediaUrl';

describe('safeMediaUrl', () => {
  it('accepts safe http/https URLs and rejects javascript/data/vbscript for href', () => {
    expect(sanitizeExternalHttpUrl('https://luisices.com.br/loja')).toBe('https://luisices.com.br/loja');
    expect(sanitizeExternalHttpUrl('http://localhost:5173/test')).toBe('http://localhost:5173/test');
    expect(sanitizeExternalHttpUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeExternalHttpUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(sanitizeExternalHttpUrl('   ')).toBeNull();
    expect(sanitizeExternalHttpUrl(null)).toBeNull();
  });

  it('accepts safe blob, https, and raster base64 data URLs for image preview', () => {
    expect(sanitizeImagePreviewUrl('blob:https://dev.luisices.com.br/1234-5678')).toBe(
      'blob:https://dev.luisices.com.br/1234-5678'
    );
    expect(sanitizeImagePreviewUrl('https://cdn.luisices.com.br/store/foto.webp')).toBe(
      'https://cdn.luisices.com.br/store/foto.webp'
    );
    expect(sanitizeImagePreviewUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(
      'data:image/png;base64,iVBORw0KGgo='
    );
  });

  it('rejects svg data URLs, html data URLs, and javascript URLs for image preview', () => {
    expect(sanitizeImagePreviewUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull();
    expect(sanitizeImagePreviewUrl('data:text/html;base64,PHNjcmlwdD4=')).toBeNull();
    expect(sanitizeImagePreviewUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeImagePreviewUrl(undefined)).toBeNull();
  });
});

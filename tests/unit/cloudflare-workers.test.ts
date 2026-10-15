import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import cdnWorker from '../../cloudflare/cdn-worker/src/index.js';
import apiWorker from '../../cloudflare/api-worker/src/index.js';

describe('Cloudflare Workers: Validação e Testes Unitários de Borda', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CDN Worker (Firebase Storage Edge Caching)', () => {
    it('deve responder OPTIONS preflight com status 204 e cabeçalhos CORS', async () => {
      const request = new Request('https://cdn.luisices.com.br/users/123/avatar/foto.webp', {
        method: 'OPTIONS',
      });
      const response = await cdnWorker.fetch(request, {}, {});

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });

    it('deve responder 200 no healthcheck da raiz', async () => {
      const request = new Request('https://cdn.luisices.com.br/', { method: 'GET' });
      const response = await cdnWorker.fetch(request, {}, {});

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toContain('CDN Storage Luisices Online');
    });

    it('deve rejeitar métodos HTTP não suportados (ex: POST) com status 405', async () => {
      const request = new Request('https://cdn.luisices.com.br/file.webp', { method: 'POST' });
      const response = await cdnWorker.fetch(request, {}, {});

      expect(response.status).toBe(405);
    });

    it('deve buscar arquivo na origem adicionando alt=media e retornando cabeçalhos de cache de produção', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('image-bytes', {
          status: 200,
          headers: { 'Content-Type': 'image/webp' },
        })
      );
      vi.stubGlobal('fetch', mockFetch);

      const request = new Request('https://cdn.luisices.com.br/users/123/avatar/avatar.webp', {
        method: 'GET',
      });
      const env = {
        ENVIRONMENT: 'production',
        FIREBASE_BUCKET: 'papelaria-dashboard.firebasestorage.app',
      };

      const response = await cdnWorker.fetch(request, env, {});

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Cache-Control')).toContain('max-age=31536000');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('papelaria-dashboard.firebasestorage.app');
      expect(calledUrl).toContain('alt=media');
    });

    it('deve executar failover para o bucket alternativo caso o primário retorne 404', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(new Response('Not Found', { status: 404 }))
        .mockResolvedValueOnce(
          new Response('fallback-bytes', {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
          })
        );
      vi.stubGlobal('fetch', mockFetch);

      const request = new Request('https://cdn.luisices.com.br/products/foto.png', {
        method: 'GET',
      });
      const env = {
        ENVIRONMENT: 'production',
        FIREBASE_BUCKET: 'papelaria-dashboard.firebasestorage.app',
        FIREBASE_FALLBACK_BUCKET: 'papelaria-dashboard.appspot.com',
      };

      const response = await cdnWorker.fetch(request, env, {});

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toContain('papelaria-dashboard.firebasestorage.app');
      expect(mockFetch.mock.calls[1][0]).toContain('papelaria-dashboard.appspot.com');
    });
  });

  describe('API Gateway Worker (Reverse Proxy com Injeção de Origem)', () => {
    it('deve responder OPTIONS preflight com status 204 e cabeçalhos autorizados', async () => {
      const request = new Request('https://api.luisices.com.br/aiAgentChat', {
        method: 'OPTIONS',
      });
      const response = await apiWorker.fetch(request, {}, {});

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('deve responder 200 no healthcheck da raiz', async () => {
      const request = new Request('https://api.luisices.com.br/', { method: 'GET' });
      const response = await apiWorker.fetch(request, {}, {});

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toContain('Luisices API Gateway Online');
    });

    it('deve injetar cabeçalho x-origin-secret e encaminhar requisição para o backend Cloud Functions', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ result: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      vi.stubGlobal('fetch', mockFetch);

      const request = new Request('https://api.luisices.com.br/aiAgentChat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '200.100.50.25',
        },
        body: JSON.stringify({ message: 'Olá Copiloto' }),
      });

      const env = {
        ENVIRONMENT: 'production',
        BACKEND_ORIGIN: 'https://us-central1-papelaria-dashboard.cloudfunctions.net',
        ORIGIN_SECRET: 'super-secret-token-12345',
      };

      const response = await apiWorker.fetch(request, env, {});

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [targetUrl, options] = mockFetch.mock.calls[0];
      expect(targetUrl).toBe('https://us-central1-papelaria-dashboard.cloudfunctions.net/aiAgentChat');
      expect(options.method).toBe('POST');

      // Verifica headers injetados
      const headers = options.headers as Headers;
      expect(headers.get('x-origin-secret')).toBe('super-secret-token-12345');
      expect(headers.get('x-cf-origin-token')).toBe('super-secret-token-12345');
      expect(headers.get('x-forwarded-for')).toBe('200.100.50.25');
      expect(headers.get('x-forwarded-proto')).toBe('https');
    });

    it('deve retornar status 502 e capturar exceção quando comunicação com backend falhar', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Backend connection refused'));
      vi.stubGlobal('fetch', mockFetch);

      const request = new Request('https://api.luisices.com.br/aiAgentChat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'teste erro' }),
      });

      const env = {
        ENVIRONMENT: 'production',
        BACKEND_ORIGIN: 'https://us-central1-papelaria-dashboard.cloudfunctions.net',
        SENTRY_DSN: 'https://mock@sentry.io/123456',
      };

      const response = await apiWorker.fetch(request, env, {});
      expect(response.status).toBe(502);

      const body = await response.json();
      expect(body.error).toContain('Gateway Timeout / Falha ao comunicar com backend');
      expect(body.message).toBe('Backend connection refused');
    });
  });
});


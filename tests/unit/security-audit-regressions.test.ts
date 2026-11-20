import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import apiWorker from '../../cloudflare/api-worker/src/index.js';
import cdnWorker from '../../cloudflare/cdn-worker/src/index.js';
import { handleSubmitPublicCatalogOrderCore } from '../../functions/orders/publicCatalogOrderCore.js';
import { handleOAuthToken } from '../../functions/mcp/oauth.js';
import { isQuoteExpired } from '../../src/app/components/quotes/quoteHelpers';

const ROOT_DIR = resolve(process.cwd());

describe('Red-Team / Audit Regressions (TDD — devem falhar antes das correções e passar depois)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('1. Cloudflare API Worker — SSRF, CORS e proteção de origem', () => {
    it('[CRÍTICO] deve bloquear path protocol-relative (//host) e nunca encaminhar x-origin-secret para fora do backend', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
      vi.stubGlobal('fetch', mockFetch);

      const request = new Request('https://api.luisices.com.br//example.invalid/collect', {
        method: 'GET',
      });
      const env = {
        ENVIRONMENT: 'production',
        ORIGIN_SECRET: 'test-origin-secret-do-not-leak',
      };

      const response = await apiWorker.fetch(request, env, {});

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('[ALTO] não deve sobrescrever CORS restritivo da origem com wildcard "*" nem anunciar x-origin-secret', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://luisices.com.br',
          },
        }),
      );
      vi.stubGlobal('fetch', mockFetch);

      const preflight = await apiWorker.fetch(
        new Request('https://api.luisices.com.br/media/gallery/item-1', { method: 'OPTIONS' }),
        { ENVIRONMENT: 'production', ORIGIN_SECRET: 'test-origin-secret' },
        {},
      );
      const allowedHeaders = (preflight.headers.get('Access-Control-Allow-Headers') || '').toLowerCase();
      expect(allowedHeaders).not.toContain('x-origin-secret');

      const response = await apiWorker.fetch(
        new Request('https://api.luisices.com.br/media/gallery/item-1', {
          method: 'GET',
          headers: { Origin: 'https://luisices.com.br' },
        }),
        { ENVIRONMENT: 'production', ORIGIN_SECRET: 'test-origin-secret' },
        {},
      );

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://luisices.com.br');
    });

    it('[MÉDIO] deve remover headers internos de origem enviados pelo cliente quando ORIGIN_SECRET não estiver configurado', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
      vi.stubGlobal('fetch', mockFetch);

      const response = await apiWorker.fetch(
        new Request('https://api.luisices.com.br/health', {
          method: 'GET',
          headers: {
            'x-origin-secret': 'forged-client-value',
            'x-cf-origin-token': 'forged-client-value',
          },
        }),
        { ENVIRONMENT: 'production' },
        {},
      );

      if (mockFetch.mock.calls.length > 0) {
        const forwardedHeaders = new Headers(mockFetch.mock.calls[0][1].headers);
        expect(forwardedHeaders.get('x-origin-secret')).toBeNull();
        expect(forwardedHeaders.get('x-cf-origin-token')).toBeNull();
      } else {
        expect(response.status).toBe(503);
      }
    });
  });

  describe('2. Cloudflare CDN Worker — isolamento de ambiente, cache de tokens e URIError', () => {
    it('[ALTO] ambientes dev e production no wrangler.toml devem usar nomes distintos de Worker', () => {
      const toml = readFileSync(resolve(ROOT_DIR, 'cloudflare/cdn-worker/wrangler.toml'), 'utf8');
      const prodMatch = toml.match(/\[env\.production\][\s\S]*?name\s*=\s*"([^"]+)"/);
      const devMatch = toml.match(/\[env\.dev\][\s\S]*?name\s*=\s*"([^"]+)"/);

      expect(prodMatch?.[1]).toBeTruthy();
      expect(devMatch?.[1]).toBeTruthy();
      expect(devMatch?.[1]).not.toBe(prodMatch?.[1]);
    });

    it('[ALTO] não deve aplicar cache público immutable de 1 ano em objetos com ?token= (privados)', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('private-bytes', {
          status: 200,
          headers: { 'Content-Type': 'image/webp' },
        }),
      );
      vi.stubGlobal('fetch', mockFetch);

      const request = new Request(
        'https://cdn.luisices.com.br/users/u1/orders/ord-1/anexo.webp?alt=media&token=revokable-token',
      );
      const response = await cdnWorker.fetch(
        request,
        { ENVIRONMENT: 'production', FIREBASE_BUCKET: 'papelaria-dashboard.firebasestorage.app' },
        {},
      );

      const cacheControl = (response.headers.get('Cache-Control') || '').toLowerCase();
      expect(cacheControl).not.toContain('public');
      expect(cacheControl).not.toContain('immutable');
      expect(cacheControl).not.toContain('31536000');
    });

    it('[ALTO] deve retornar HTTP 400 em vez de lançar URIError não tratado para percent-encoding malformado', async () => {
      const request = new Request('https://cdn.luisices.com.br/%E0%A4%A', { method: 'GET' });
      const response = await cdnWorker.fetch(request, { ENVIRONMENT: 'production' }, {});

      expect(response.status).toBe(400);
    });

    it('[MÉDIO] deve permitir nomes de arquivo com pontos consecutivos (ex: briefing..pdf) e bloquear segmentos de traversal', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('pdf-bytes', {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        }),
      );
      vi.stubGlobal('fetch', mockFetch);

      const validRequest = new Request(
        'https://cdn.luisices.com.br/users/u1/orders/ord-1/1732070000000_briefing..pdf?alt=media&token=valid-token',
      );
      const validResponse = await cdnWorker.fetch(
        validRequest,
        { ENVIRONMENT: 'production', FIREBASE_BUCKET: 'papelaria-dashboard.firebasestorage.app' },
        {},
      );

      expect(validResponse.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const blockedPaths = [
        'https://cdn.luisices.com.br/users/..%2fadmin/secret.pdf',
        'https://cdn.luisices.com.br/%2e%2e%2fsecret.pdf',
        'https://cdn.luisices.com.br/users/.%2fsecret.pdf',
        'https://cdn.luisices.com.br/users/u1%5Csecret.pdf',
      ];

      for (const blockedUrl of blockedPaths) {
        const res = await cdnWorker.fetch(
          new Request(blockedUrl),
          { ENVIRONMENT: 'production', FIREBASE_BUCKET: 'papelaria-dashboard.firebasestorage.app' },
          {},
        );
        expect(res.status).toBe(404);
      }

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Backend Cloud Functions — Path Traversal, Rate Limit OAuth e Crashes de Runtime', () => {
    it('[ALTO] submitPublicCatalogOrderCore deve rejeitar productId contendo "/" antes de consultar o Firestore', async () => {
      const accessedPaths: string[] = [];
      const mockDb = {
        doc: vi.fn((path: string) => {
          accessedPaths.push(path);
          return {
            get: vi.fn(async () => {
              if (path === 'storeSettings/public') {
                return {
                  exists: true,
                  data: () => ({
                    featureFlags: { enableOnlineOrders: true },
                    minOrderAmount: 0,
                  }),
                };
              }
              return { exists: true, id: path, data: () => ({ name: 'segredo-subcolecao', active: false }) };
            }),
          };
        }),
      };

      await expect(
        handleSubmitPublicCatalogOrderCore(
          {
            customerName: 'Teste',
            customerPhone: '11999998888',
            items: [{ productId: 'prod-1/privateSub/secretDoc', quantity: 1 }],
          },
          { getFirestore: () => mockDb },
        ),
      ).rejects.toMatchObject({ code: 'invalid-argument' });

      expect(accessedPaths.some((p) => p.includes('privateSub'))).toBe(false);
    });

    it('[ALTO] OAuth token deve isolar bucket de rate-limit por cf-connecting-ip (não por req.ip do proxy)', async () => {
      const previousSecret = process.env.ORIGIN_SECRET;
      process.env.ORIGIN_SECRET = 'test-secret';
      const seenKeys: string[] = [];
      const mockDb = {
        collection: (name: string) => ({
          doc: (id: string) => {
            if (name === 'oauthRateLimits') {
              seenKeys.push(`${name}/${id}`);
            }
            return {
              get: async () => ({ exists: false, data: () => undefined }),
              set: async () => {},
            };
          },
        }),
        runTransaction: async (fn: (tx: any) => Promise<any>) =>
          fn({
            get: async () => ({ exists: false, data: () => undefined }),
            set: () => {},
          }),
      };

      const makeRes = () => {
        const res: any = { statusCode: 200, headers: {}, body: undefined };
        res.status = (c: number) => { res.statusCode = c; return res; };
        res.json = (b: unknown) => { res.body = b; return res; };
        res.send = (b: unknown) => { res.body = b; return res; };
        res.setHeader = (k: string, v: string) => { res.headers[k] = v; return res; };
        return res;
      };

      const baseReq = (clientIp: string) => ({
        method: 'POST',
        ip: '172.70.1.10', // mesmo IP de proxy Cloudflare
        socket: { remoteAddress: '172.70.1.10' },
        headers: {
          'cf-connecting-ip': clientIp,
          'x-origin-secret': 'test-secret',
        },
        body: {},
      });

      try {
        await handleOAuthToken(baseReq('203.0.113.10'), makeRes(), mockDb as any);
        await handleOAuthToken(baseReq('203.0.113.20'), makeRes(), mockDb as any);
      } finally {
        if (previousSecret === undefined) {
          delete process.env.ORIGIN_SECRET;
        } else {
          process.env.ORIGIN_SECRET = previousSecret;
        }
      }

      expect(new Set(seenKeys).size).toBe(2);
    });

    it('[ALTO] handleCreateSuperfreteLabel não deve referenciar variável uid não declarada (ReferenceError pós-checkout)', () => {
      const source = readFileSync(resolve(ROOT_DIR, 'functions/orders/superfrete.js'), 'utf8');
      const fnStart = source.indexOf('async function handleCreateSuperfreteLabel');
      const fnBody = source.slice(fnStart);

      const usesUid = /shippingGeneratedBy:\s*uid\b/.test(fnBody);
      const declaresUid = /(?:const|let|var)\s+\{[^}]*\buid\b[^}]*\}\s*=\s*session\b|(?:const|let|var)\s+uid\s*=/.test(fnBody);

      expect(usesUid).toBe(true);
      expect(declaresUid).toBe(true);
    });

    it('[ALTO] functions/mcp/endpoint.js deve definir ou importar escapeHtml usado na resposta 401 do Swagger', () => {
      const source = readFileSync(resolve(ROOT_DIR, 'functions/mcp/endpoint.js'), 'utf8');
      const callsEscapeHtml = /\bescapeHtml\s*\(/.test(source);
      const definesOrImportsEscapeHtml =
        /function\s+escapeHtml\b|(?:const|let|var)\s+escapeHtml\s*=|(?:\{[^}]*\bescapeHtml\b[^}]*\}\s*=\s*require)/.test(source);

      expect(callsEscapeHtml).toBe(true);
      expect(definesOrImportsEscapeHtml).toBe(true);
    });

    it('[ALTO] callables autenticados em functions/orders/tracking.js devem validar assertActiveSession', () => {
      const source = readFileSync(resolve(ROOT_DIR, 'functions/orders/tracking.js'), 'utf8');
      const callableNames = [
        'createOrderTrackingLink',
        'listOrderTrackingLinks',
        'revokeOrderTrackingLink',
        'revokeOrderTrackingLinkById',
        'deleteOrderTrackingLink',
        'deleteOrderTrackingLinksBatch',
      ];

      for (const name of callableNames) {
        const start = source.indexOf(`const ${name} =`);
        const end = source.indexOf('moduleInitializationMs));', start);
        const block = source.slice(start, end);
        expect(block, `Callable ${name} deve chamar assertActiveSession(request)`).toContain('assertActiveSession');
      }
    });
  });

  describe('4. Frontend & Scripts — Timezone BRT e integridade sintática', () => {
    it('[MÉDIO] isQuoteExpired não deve expirar orçamento válido às 22:30 BRT (01:30 UTC do dia seguinte)', () => {
      vi.useFakeTimers();
      // 19/11/2026 22:30 BRT === 20/11/2026 01:30 UTC
      vi.setSystemTime(new Date('2026-11-20T01:30:00.000Z'));

      expect(isQuoteExpired({ status: 'sent', validUntil: '2026-11-19' })).toBe(false);
    });

    it('[ALTO] scripts/create-test-user.mjs deve passar em node --check sem erro de sintaxe', () => {
      expect(() => {
        execFileSync(process.execPath, ['--check', resolve(ROOT_DIR, 'scripts/create-test-user.mjs')], {
          stdio: 'pipe',
        });
      }).not.toThrow();
    });
  });
});

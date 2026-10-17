import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildOpenApiSchema, TOOLS_METADATA } from '../../functions/mcp/openapi.js';
import apiWorker from '../../cloudflare/api-worker/src/index.js';

describe('MCP & ChatGPT Plugin / OpenAPI 3.0.3 Specification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('OpenAPI 3.0.3 Generator (buildOpenApiSchema)', () => {
    it('deve gerar especificação estritamente compatível com OpenAPI 3.0.3 para o ChatGPT Actions', () => {
      const baseUrl = 'https://api.luisices.com.br/chatGptToolsEndpoint';
      const schema = buildOpenApiSchema(baseUrl);

      // Compatibilidade estrita com o validador de Actions do ChatGPT
      expect(schema.openapi).toBe('3.0.3');
      expect(schema.info.title).toContain('Luisices');
      expect(schema.servers).toEqual([
        {
          url: baseUrl,
          description: expect.any(String),
        },
      ]);
      expect(schema.security).toEqual([{ bearerAuth: [] }]);
      expect(schema.components.securitySchemes.bearerAuth).toMatchObject({
        type: 'http',
        scheme: 'bearer',
      });
    });

    it('deve publicar exatamente as ferramentas MCP previstas, com operationId e respostas 200', () => {
      const baseUrl = 'https://api.dev.luisices.com.br/chatGptToolsEndpoint';
      const schema = buildOpenApiSchema(baseUrl);
      const expectedTools = [
        'query_orders_view', 'daily_briefing', 'query_customers', 'get_customer_history', 'query_delivery_schedule', 'get_financial_summary',
        'calculate_pricing_estimate', 'generate_whatsapp_message', 'get_order_form',
        'extract_order_draft', 'create_order', 'get_order_edit_form', 'update_order', 'update_order_status', 'update_delivery_details', 'query_order_payments',
        'register_order_payment', 'create_customer', 'update_customer', 'search_gallery_portfolio', 'get_user_summary',
        'calculate_artisan_pricing', 'list_supplies', 'list_pricing_models', 'get_pricing_model', 'save_pricing_model', 'query_quotes', 'create_quote', 'update_quote_status', 'list_store_products',
      ];

      expect(TOOLS_METADATA.map((tool) => tool.name)).toEqual(expectedTools);
      expect(new Set(TOOLS_METADATA.map((tool) => tool.name)).size).toBe(expectedTools.length);
      expect(Object.keys(schema.paths).sort()).toEqual(expectedTools.map((name) => `/tools/${name}`).sort());
      expect(Object.values(schema.paths).map((path: any) => path.post.operationId).sort()).toEqual([...expectedTools].sort());

      for (const tool of TOOLS_METADATA) {
        const pathItem = schema.paths[`/tools/${tool.name}`];
        expect(pathItem).toBeDefined();
        expect(pathItem.post).toBeDefined();
        expect(pathItem.post.operationId).toBe(tool.name);
        expect(pathItem.post.security).toEqual([{ bearerAuth: [] }]);
        expect(pathItem.post.responses['200']).toBeDefined();
        expect(pathItem.post.requestBody).toBeDefined();

        // requestBody.required deve ser true apenas se houver campos obrigatórios
        const expectedRequired = Boolean(tool.requestBody?.required?.length > 0);
        expect(pathItem.post.requestBody.required).toBe(expectedRequired);
      }
    });

    it('deve filtrar rotas de acordo com os escopos autorizados da chave', () => {
      const baseUrl = 'https://api.luisices.com.br/chatGptToolsEndpoint';
      // Permissão apenas para consulta de pedidos
      const schema = buildOpenApiSchema(baseUrl, ['orders:read']);

      const exposedPaths = Object.keys(schema.paths);
      expect(exposedPaths).toContain('/tools/query_orders_view');
      expect(exposedPaths).toContain('/tools/daily_briefing');
      expect(exposedPaths).not.toContain('/tools/get_financial_summary');
      expect(exposedPaths).not.toContain('/tools/calculate_pricing_estimate');
    });

    it('mantém a regra de valor positivo válida no MCP JSON Schema e no OpenAPI 3.0.3', () => {
      const paymentTool = TOOLS_METADATA.find((tool) => tool.name === 'register_order_payment');
      const schema = buildOpenApiSchema('https://api.dev.luisices.com.br/chatGptToolsEndpoint');
      const openApiAmount = schema.paths['/tools/register_order_payment'].post.requestBody.content['application/json'].schema.properties.amount;

      expect(paymentTool?.requestBody.properties.amount).toMatchObject({ type: 'number', exclusiveMinimum: 0 });
      expect(openApiAmount).toMatchObject({ type: 'number', minimum: 0, exclusiveMinimum: true });
      expect(typeof openApiAmount.exclusiveMinimum).toBe('boolean');
    });
  });

  describe('Cloudflare Worker: Plugin Manifest & Smart Routing', () => {
    it('deve servir o manifesto ai-plugin.json em /.well-known/ai-plugin.json', async () => {
      const request = new Request('https://api.luisices.com.br/.well-known/ai-plugin.json');
      const response = await apiWorker.fetch(request, {}, {});

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      const manifest = await response.json();
      expect(manifest.schema_version).toBe('v1');
      expect(manifest.name_for_model).toBe('luisices');
      expect(manifest.auth.type).toBe('oauth');
      expect(manifest.auth.client_url).toContain('/oauth/authorize');
      expect(manifest.auth.authorization_url).toContain('/oauth/token');
      expect(manifest.api.type).toBe('openapi');
      expect(manifest.api.url).toBe('https://api.luisices.com.br/chatGptToolsEndpoint/openapi.json');
    });

    it('deve responder aos aliases /ai-plugin.json e /plugin.json com o mesmo manifesto', async () => {
      for (const path of ['/ai-plugin.json', '/.well-known/plugin.json', '/plugin.json']) {
        const req = new Request(`https://api.dev.luisices.com.br${path}`);
        const res = await apiWorker.fetch(req, {}, {});
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.name_for_human).toContain('Luisices');
        expect(data.api.url).toContain('/openapi.json');
      }
    });

    it('deve rotear /openapi.json automaticamente adicionando prefixo /chatGptToolsEndpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ openapi: '3.0.3' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      vi.stubGlobal('fetch', mockFetch);

      const request = new Request('https://api.luisices.com.br/openapi.json', { method: 'GET' });
      const env = {
        ENVIRONMENT: 'production',
        BACKEND_ORIGIN: 'https://us-central1-papelaria-dashboard.cloudfunctions.net',
        ORIGIN_SECRET: 'test-secret',
      };

      const res = await apiWorker.fetch(request, env, {});
      expect(res.status).toBe(200);

      const [targetUrl] = mockFetch.mock.calls[0];
      expect(targetUrl).toBe('https://us-central1-papelaria-dashboard.cloudfunctions.net/chatGptToolsEndpoint/openapi.json');
    });

    it('deve rotear /tools/query_orders_view para /chatGptToolsEndpoint/tools/query_orders_view', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      vi.stubGlobal('fetch', mockFetch);

      const request = new Request('https://api.luisices.com.br/tools/query_orders_view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer lui_dev_1234567890abcdef',
        },
        body: JSON.stringify({ status: 'pendente' }),
      });
      const env = {
        ENVIRONMENT: 'production',
        BACKEND_ORIGIN: 'https://us-central1-papelaria-dashboard.cloudfunctions.net',
        ORIGIN_SECRET: 'test-secret',
      };

      const res = await apiWorker.fetch(request, env, {});
      expect(res.status).toBe(200);

      const [targetUrl] = mockFetch.mock.calls[0];
      expect(targetUrl).toBe('https://us-central1-papelaria-dashboard.cloudfunctions.net/chatGptToolsEndpoint/tools/query_orders_view');
    });

    it('deve rotear chamadas MCP JSON-RPC (POST / ou POST /mcp) para /chatGptToolsEndpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2024-11-05' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      vi.stubGlobal('fetch', mockFetch);

      for (const path of ['/', '/mcp', '/rpc']) {
        const request = new Request(`https://api.dev.luisices.com.br${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: { protocolVersion: '2024-11-05' },
          }),
        });

        const res = await apiWorker.fetch(request, {
          ENVIRONMENT: 'dev',
          BACKEND_ORIGIN: 'https://us-central1-luisices-dev.cloudfunctions.net',
        }, {});

        expect(res.status).toBe(200);
      }

      expect(mockFetch).toHaveBeenCalledTimes(3);
      for (const call of mockFetch.mock.calls) {
        expect(call[0]).toBe('https://us-central1-luisices-dev.cloudfunctions.net/chatGptToolsEndpoint');
      }
    });

    it('deve usar Cache API na borda: primeiro MISS com s-maxage longo e max-age curto, e segundo request como HIT', async () => {
      const cacheStore = new Map<string, Response>();
      const mockCache = {
        match: vi.fn(async (req: Request) => {
          const entry = cacheStore.get(req.url);
          return entry ? entry.clone() : undefined;
        }),
        put: vi.fn(async (req: Request, res: Response) => {
          cacheStore.set(req.url, res.clone());
        }),
      };
      vi.stubGlobal('caches', { default: mockCache });

      const request = new Request('https://api.dev.luisices.com.br/.well-known/ai-plugin.json', { method: 'GET' });
      const ctx = { waitUntil: (p: Promise<any>) => p };

      // 1ª chamada: MISS, grava no cache
      const res1 = await apiWorker.fetch(request, {}, ctx);
      expect(res1.status).toBe(200);
      expect(res1.headers.get('X-Edge-Cache')).toBe('MISS');
      expect(res1.headers.get('Cache-Control')).toBe('public, s-maxage=86400, max-age=60');
      expect(mockCache.put).toHaveBeenCalledTimes(1);

      // 2ª chamada: HIT direto do cache da borda
      const res2 = await apiWorker.fetch(request, {}, ctx);
      expect(res2.status).toBe(200);
      expect(res2.headers.get('X-Edge-Cache')).toBe('HIT');
    });

    it('requisições autenticadas (com Authorization) NUNCA devem usar nem gravar no cache de borda', async () => {
      const mockCache = {
        match: vi.fn(),
        put: vi.fn(),
      };
      vi.stubGlobal('caches', { default: mockCache });

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ openapi: '3.0.3', paths: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      vi.stubGlobal('fetch', mockFetch);

      const request = new Request('https://api.dev.luisices.com.br/openapi.json', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer lui_dev_secret_token_123',
        },
      });

      const res = await apiWorker.fetch(request, {
        ENVIRONMENT: 'dev',
        BACKEND_ORIGIN: 'https://us-central1-luisices-dev.cloudfunctions.net',
      }, {});

      expect(res.status).toBe(200);
      expect(mockCache.match).not.toHaveBeenCalled();
      expect(mockCache.put).not.toHaveBeenCalled();
      expect(res.headers.get('X-Edge-Cache')).toBeNull();
    });
  });
});


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

    it('deve listar as 9 ferramentas de negócio com operationId e respostas 200', () => {
      const baseUrl = 'https://api.dev.luisices.com.br/chatGptToolsEndpoint';
      const schema = buildOpenApiSchema(baseUrl);

      expect(TOOLS_METADATA.length).toBe(9);
      expect(Object.keys(schema.paths).length).toBe(9);

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
      expect(manifest.auth.type).toBe('user_http');
      expect(manifest.auth.authorization_type).toBe('bearer');
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
  });
});

import { describe, it, expect, vi } from 'vitest';
const { processMcpMessage, handleMcpHttpRequest, PROTOCOL_VERSION, SERVER_INFO } = require('../../../functions/alexa-plus/mcpHandler');
const { MCP_TOOLS, executeCreateOrder, executeCheckProductPrice, executeGetOrderStatus, executeGetFinancialSummary } = require('../../../functions/alexa-plus/tools');

describe('Alexa+ Add-on: Servidor MCP (Model Context Protocol)', () => {
  const createMockDb = (overrides = {}) => {
    const store: Record<string, any> = {
      products: {
        'prod-1': { name: 'Caixinha Milk Safari', category: 'Lembrancinhas', unitPrice: 6.5, active: true },
        'prod-2': { name: 'Topo de Bolo Casamento', category: 'Topos', unitPrice: 35.0, active: true },
      },
      orders: {
        'ord-101': {
          customerName: 'Bruno Alcantara',
          description: '20x Caixinha Milk Safari',
          quantity: 20,
          unitPrice: 6.5,
          totalPrice: 130.0,
          deliveryDate: '2026-10-25',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      },
      salesLedger: {},
      ...overrides,
    };

    return {
      collection: (colName: string) => ({
        doc: (id: string) => ({
          id,
          get: async () => {
            const data = store[colName]?.[id];
            return {
              id,
              exists: Boolean(data),
              data: () => data || null,
            };
          },
          set: async (val: any) => {
            if (!store[colName]) store[colName] = {};
            store[colName][id] = val;
            return { id };
          },
        }),
        add: async (val: any) => {
          const id = `mock_id_${Date.now()}`;
          if (!store[colName]) store[colName] = {};
          store[colName][id] = val;
          return { id };
        },
        limit: (n: number) => ({
          get: async () => {
            const items = Object.entries(store[colName] || {}).slice(0, n);
            return {
              empty: items.length === 0,
              docs: items.map(([id, data]) => ({
                id,
                data: () => data,
              })),
            };
          },
        }),
        orderBy: () => ({
          limit: (n: number) => ({
            get: async () => {
              const items = Object.entries(store[colName] || {}).slice(0, n);
              return {
                empty: items.length === 0,
                docs: items.map(([id, data]) => ({
                  id,
                  data: () => data,
                })),
              };
            },
          }),
        }),
      }),
    };
  };

  it('deve responder ao método "initialize" com protocolo e metadados oficiais', async () => {
    const msg = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        clientInfo: { name: 'alexa-plus', version: '1.0.0' },
      },
    };

    const resp = await processMcpMessage(msg);

    expect(resp.jsonrpc).toBe('2.0');
    expect(resp.id).toBe(1);
    expect(resp.result).toBeDefined();
    expect(resp.result.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(resp.result.serverInfo.name).toBe(SERVER_INFO.name);
    expect(resp.result.capabilities.tools).toBeDefined();
  });

  it('deve responder ao método "ping"', async () => {
    const msg = {
      jsonrpc: '2.0',
      id: 2,
      method: 'ping',
    };

    const resp = await processMcpMessage(msg);

    expect(resp.jsonrpc).toBe('2.0');
    expect(resp.id).toBe(2);
    expect(resp.result).toEqual({});
  });

  it('deve listar todas as ferramentas expostas em "tools/list"', async () => {
    const msg = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list',
    };

    const resp = await processMcpMessage(msg);

    expect(resp.result).toBeDefined();
    expect(Array.isArray(resp.result.tools)).toBe(true);

    const toolNames = resp.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('create_order');
    expect(toolNames).toContain('check_product_price');
    expect(toolNames).toContain('get_order_status');
    expect(toolNames).toContain('get_financial_summary');
  });

  it('deve executar "create_order" e retornar mensagem amigável e dados estruturados', async () => {
    const mockDb = createMockDb();
    const msg = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'create_order',
        arguments: {
          customer: 'Bruno Alcantara',
          product: 'Caixinha Milk Personalizada',
          quantity: 20,
          unitPrice: 5.5,
          deliveryDate: '2026-10-25',
          notes: 'Tema Safari, laço azul',
        },
      },
    };

    const resp = await processMcpMessage(msg, { db: mockDb });

    expect(resp.result).toBeDefined();
    expect(resp.result.isError).toBe(false);
    expect(resp.result.content[0].type).toBe('text');
    expect(resp.result.content[0].text).toContain('Bruno Alcantara');
    expect(resp.result.content[0].text).toContain('R$ 110,00');
    expect(resp.result.content[0].text).toContain('25/10/2026');
    expect(resp.result.data.orderId).toBeDefined();
    expect(resp.result.data.totalPrice).toBe(110.0);
  });

  it('deve consultar preço e catálogo em "check_product_price"', async () => {
    const mockDb = createMockDb();
    const msg = {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'check_product_price',
        arguments: {
          productQuery: 'Caixinha Milk',
        },
      },
    };

    const resp = await processMcpMessage(msg, { db: mockDb });

    expect(resp.result.isError).toBe(false);
    expect(resp.result.data.found).toBe(true);
    expect(resp.result.data.count).toBe(1);
    expect(resp.result.content[0].text).toContain('Caixinha Milk Safari');
    expect(resp.result.content[0].text).toContain('R$ 6,50');
  });

  it('deve consultar status de pedido em "get_order_status"', async () => {
    const mockDb = createMockDb();
    const msg = {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'get_order_status',
        arguments: {
          customerName: 'Bruno',
        },
      },
    };

    const resp = await processMcpMessage(msg, { db: mockDb });

    expect(resp.result.isError).toBe(false);
    expect(resp.result.data.found).toBe(true);
    expect(resp.result.content[0].text).toContain('Bruno Alcantara');
    expect(resp.result.content[0].text).toContain('Pendente');
  });

  it('deve retornar resumo financeiro em "get_financial_summary"', async () => {
    const mockDb = createMockDb();
    const msg = {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'get_financial_summary',
        arguments: {
          period: 'this_month',
        },
      },
    };

    const resp = await processMcpMessage(msg, { db: mockDb });

    expect(resp.result.isError).toBe(false);
    expect(resp.result.data.totalRevenue).toBe(130.0);
    expect(resp.result.content[0].text).toContain('R$ 130,00');
  });

  it('deve retornar erro formatado para ferramenta inexistente', async () => {
    const msg = {
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'ferramenta_inexistente',
        arguments: {},
      },
    };

    const resp = await processMcpMessage(msg);

    expect(resp.result.isError).toBe(true);
    expect(resp.result.content[0].text).toContain('Ferramenta desconhecida');
  });

  it('deve suportar requisição HTTP GET para descoberta e health check', async () => {
    const req = { method: 'GET' };
    let statusCode = 0;
    let jsonResult: any = null;

    const res = {
      setHeader: vi.fn(),
      status: (code: number) => {
        statusCode = code;
        return {
          json: (data: any) => {
            jsonResult = data;
          },
        };
      },
    };

    await handleMcpHttpRequest(req, res);

    expect(statusCode).toBe(200);
    expect(jsonResult.status).toBe('online');
    expect(jsonResult.availableTools).toContain('create_order');
  });

  it('deve suportar requisições HTTP POST JSON-RPC normais e em lote (batch)', async () => {
    const batchReq = {
      method: 'POST',
      body: [
        { jsonrpc: '2.0', id: 10, method: 'ping' },
        { jsonrpc: '2.0', id: 11, method: 'tools/list' },
      ],
    };

    let statusCode = 0;
    let jsonResult: any = null;

    const res = {
      setHeader: vi.fn(),
      status: (code: number) => {
        statusCode = code;
        return {
          json: (data: any) => {
            jsonResult = data;
          },
        };
      },
    };

    await handleMcpHttpRequest(batchReq, res);

    expect(statusCode).toBe(200);
    expect(Array.isArray(jsonResult)).toBe(true);
    expect(jsonResult.length).toBe(2);
    expect(jsonResult[0].id).toBe(10);
    expect(jsonResult[1].id).toBe(11);
  });
});

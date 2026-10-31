import { describe, expect, it, vi } from 'vitest';

const { getCallerScope } = require('../../functions/ai/authorization');
const { AiDataRepositories } = require('../../functions/ai/repositories');
const { AiToolsExecutor } = require('../../functions/ai/tools');
const { getEffectiveUserScopes } = require('../../functions/mcp/oauth');

describe('backend MCP authorization', () => {
  it('allows quotes:write for either create or edit, but no other action', () => {
    const profile = (permission: Record<string, boolean>) => ({
      role: 'funcionario',
      permissions: { quotes: permission, mcpScopes: ['quotes:write'] },
    });

    expect(getEffectiveUserScopes(['quotes:write'], profile({ create: true }))).toEqual(['quotes:write']);
    expect(getEffectiveUserScopes(['quotes:write'], profile({ edit: true }))).toEqual(['quotes:write']);
    expect(getEffectiveUserScopes(['quotes:write'], profile({ view: true }))).toEqual([]);
  });

  it('grants cross-owner pricing reads only to employees explicitly allowed to view pricing', () => {
    expect(getCallerScope('employee-1', {
      role: 'funcionario', active: true, permissions: { pricing: { view: true } },
    }).canViewPricing).toBe(true);
    expect(getCallerScope('employee-1', {
      role: 'funcionario', active: true, permissions: { pricing: { view: false } },
    }).canViewPricing).toBe(false);
    expect(getCallerScope('user-1', {
      role: 'user', active: true, permissions: { pricing: { view: true } },
    }).canViewPricing).toBe(false);
  });

  it('rejects updates to another user’s pricing model before writing', async () => {
    const docRef = {
      get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ userId: 'owner-1' }) }),
      set: vi.fn(),
    };
    const db = { collection: vi.fn(() => ({ doc: vi.fn(() => docRef) })) };
    const repositories = new AiDataRepositories(db);

    await expect(repositories.savePricingRecipe(
      { uid: 'caller-2', isAdmin: false },
      { modelId: 'model-1', productName: 'Alterado' },
    )).rejects.toMatchObject({ code: 'permission-denied' });
    expect(docRef.set).not.toHaveBeenCalled();
  });

  it('checks create and edit permissions on their respective quote tools', async () => {
    const updateQuoteStatus = vi.fn();
    const tools = new AiToolsExecutor({ updateQuoteStatus });

    await expect(tools.executeCreateQuote({ confirmed: false }, {
      uid: 'user-1', permissions: { quotes: { edit: true } },
    })).rejects.toMatchObject({ code: 'permission-denied' });

    const preview = await tools.executeUpdateQuoteStatus({
      quoteNumber: 'ORC-0001', status: 'approved', confirmed: false,
    }, { uid: 'user-1', permissions: { quotes: { edit: true } } });
    expect(preview.preview).toBe(true);
    expect(updateQuoteStatus).not.toHaveBeenCalled();
  });

  it('does not update a quote unless confirmation is explicitly true', async () => {
    const updateQuoteStatus = vi.fn();
    const tools = new AiToolsExecutor({ updateQuoteStatus });

    const preview = await tools.executeUpdateQuoteStatus({
      quoteNumber: 'ORC-0002', status: 'approved',
    }, { uid: 'user-1', permissions: { quotes: { edit: true } } });

    expect(preview).toMatchObject({ preview: true, quoteNumber: 'ORC-0002', status: 'approved' });
    expect(updateQuoteStatus).not.toHaveBeenCalled();
  });

  it('routes quote reads through the initialized repository instance', async () => {
    const getQuotes = vi.fn().mockResolvedValue([]);
    const tools = new AiToolsExecutor({ getQuotes });

    await expect(tools.executeQueryQuotes({}, { uid: 'user-1' })).resolves.toMatchObject({
      success: true,
      totalCount: 0,
      quotes: [],
    });
    expect(getQuotes).toHaveBeenCalledWith({ uid: 'user-1' }, { limit: 20 });
  });

  it('does not expose a collaborator email through customer search when team:read is missing', async () => {
    const tools = new AiToolsExecutor({
      getScopedCustomers: vi.fn().mockResolvedValue({ customers: [] }),
      getTeamMembers: vi.fn().mockResolvedValue([{
        uid: 'creator-1', name: 'Colaborador', email: 'colaborador@example.com',
      }]),
      getScopedOrders: vi.fn().mockResolvedValue([{
        userId: 'caller-1', createdBy: 'creator-1', createdByName: 'Colaborador',
        customerName: 'Cliente', customerPhone: '11999990000', totalPrice: 100,
      }]),
    });

    const result = await tools.executeQueryCustomers({ searchTerm: 'Colaborador' }, {
      uid: 'caller-1', isEmployee: true, active: true, scopes: ['customers:read'],
    });

    expect(result.collaboratorFound).toEqual({ name: 'Colaborador' });
    expect(result.collaboratorFound).not.toHaveProperty('email');
  });

  it('requires orders:create before approving a quote with conversion enabled', async () => {
    const updateQuoteStatus = vi.fn();
    const tools = new AiToolsExecutor({ updateQuoteStatus });

    await expect(tools.executeUpdateQuoteStatus({
      quoteNumber: 'ORC-0001', status: 'approved', confirmed: true, convertToOrder: true,
    }, {
      uid: 'user-1',
      permissions: { quotes: { edit: true } },
      mcpScopes: ['quotes:write'],
    })).rejects.toMatchObject({ code: 'permission-denied' });
    expect(updateQuoteStatus).not.toHaveBeenCalled();
  });

  it('normaliza paymentMethod de orçamentos MCP (cartao/dinheiro) para o enum canônico antes de gravar', async () => {
    const addedQuotes: any[] = [];
    const db = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          collection: vi.fn(() => ({
            doc: vi.fn(() => ({
              get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
              set: vi.fn().mockResolvedValue(undefined),
            })),
          })),
        })),
        add: vi.fn(async (data: any) => {
          addedQuotes.push(data);
          return { id: `quote-${addedQuotes.length}` };
        }),
      })),
    };
    const repos = new AiDataRepositories(db);
    const cases: Array<[string | undefined, string]> = [
      ['cartao', 'credit'],
      ['dinheiro', 'cash'],
      ['pix', 'pix'],
      ['desconhecido', 'pix'],
      [undefined, 'pix'],
    ];
    for (const [input, expected] of cases) {
      await repos.createQuote({ uid: 'user-1' }, {
        customerName: 'Ana', productName: 'Kit', quantity: 1, totalPrice: 10, paymentMethod: input,
      });
      expect(addedQuotes.at(-1).paymentMethod).toBe(expected);
    }
  });

  it('creates quotes with valid draft status and rounded unitPrice, and converts quotes directly without limit-10 truncation', async () => {
    const { validateQuoteMath } = await import('../../src/app/components/quotes/quoteHelpers');
    const addedQuotes: any[] = [];
    const db = {
      collection: vi.fn((name: string) => ({
        doc: vi.fn(() => ({
          collection: vi.fn(() => ({
            doc: vi.fn(() => ({
              get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ quoteCount: 15 }) }),
              set: vi.fn().mockResolvedValue(undefined),
            })),
          })),
          update: vi.fn().mockResolvedValue(undefined),
        })),
        add: vi.fn(async (data: any) => {
          addedQuotes.push(data);
          return { id: 'quote-16' };
        }),
      })),
    };
    const repos = new AiDataRepositories(db);
    const created = await repos.createQuote({ uid: 'user-1' }, {
      customerName: 'Ana',
      productName: 'Kit Festa',
      quantity: 3,
      totalPrice: 100,
    });

    expect(created.status).toBe('draft');
    expect(created.items[0]).toEqual({
      name: 'Kit Festa',
      quantity: 3,
      unitPrice: 33.34,
    });
    expect(created.subtotal).toBe(100.02);
    expect(created.discount).toBe(0.02);
    expect(created.discountType).toBe('fixed');
    expect(created.totalPrice).toBe(100);
    expect(addedQuotes[0].createdAt).toBeInstanceOf(Date);
    expect(typeof created.createdAt).toBe('string');

    // Garante que a matemática do orçamento (3 * 33.34 - 0.02 = 100.00) passa na validação das regras e do cliente
    const validatedMath = validateQuoteMath(created.items, created.discount ?? 0, created.discountType ?? 'percent');
    expect(validatedMath).toEqual({
      subtotal: 100.02,
      discountAmount: 0.02,
      total: 100,
    });

    // Simula conversão de orçamento com múltiplos itens e desconto
    const multiItemQuote = {
      ...created,
      items: [
        { name: 'Caixa Milk', quantity: 2, unitPrice: 30 },
        { name: 'Topo de Bolo', quantity: 1, unitPrice: 40 },
      ],
      discount: 0.02,
      discountType: 'fixed',
      totalPrice: 99.98,
    };
    const updateQuoteStatus = vi.fn().mockResolvedValue({
      id: 'quote-16',
      quoteNumber: 'ORC-0016',
      status: 'approved',
      previousStatus: 'draft',
      quote: multiItemQuote,
    });
    const tools = new AiToolsExecutor({
      db,
      updateQuoteStatus,
      getQuotes: vi.fn().mockResolvedValue([]), // simula mais de 10 orçamentos onde getQuotes(10) não traria o alvo
    });
    const createOrderSpy = vi.spyOn(tools, 'executeCreateOrder').mockResolvedValue({
      success: true,
      orderId: 'order-from-quote-16',
      orderNumber: '#2026-0016',
    });

    const converted = await tools.executeUpdateQuoteStatus({
      quoteNumber: 'ORC-0016',
      status: 'approved',
      convertToOrder: true,
      confirmed: true,
    }, {
      uid: 'user-1',
      permissions: { quotes: { edit: true }, orders: { create: true } },
      mcpScopes: ['quotes:write', 'orders:create'],
    });

    expect(converted).toMatchObject({
      success: true,
      quoteNumber: 'ORC-0016',
      status: 'approved',
      orderCreated: '#2026-0016',
    });
    expect(createOrderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        customerName: 'Ana',
        productName: 'Caixa Milk (2x), Topo de Bolo',
        quantity: 3,
        totalPrice: 99.98,
      }),
      expect.anything(),
      {
        orderPricing: {
          pricingMode: 'items',
          unitPrice: null,
          items: [
            { name: 'Caixa Milk', quantity: 2, unitPrice: 30, price: 59.99 },
            { name: 'Topo de Bolo', quantity: 1, unitPrice: 39.99, price: 39.99 },
          ],
        },
      }
    );
  });

  it('normaliza status "cancelled" para "rejected" e permite consulta de orçamentos pendentes/rascunhos', async () => {
    const { validateToolArguments } = require('../../functions/mcp/validation');
    const updateQuoteStatus = vi.fn().mockResolvedValue({
      id: 'quote-1', quoteNumber: 'ORC-0001', status: 'rejected', previousStatus: 'sent',
    });
    const getQuotes = vi.fn().mockResolvedValue([
      { id: 'q1', quoteNumber: 'ORC-0001', status: 'draft', customerName: 'Cliente 1', totalPrice: 100 },
      { id: 'q2', quoteNumber: 'ORC-0002', status: 'sent', customerName: 'Cliente 2', totalPrice: 200 },
      { id: 'q3', quoteNumber: 'ORC-0003', status: 'approved', customerName: 'Cliente 3', totalPrice: 300 },
      { id: 'q4', quoteNumber: 'ORC-0004', status: 'rejected', customerName: 'Cliente 4', totalPrice: 400 },
    ]);
    const tools = new AiToolsExecutor({ updateQuoteStatus, getQuotes });

    // Schema público aceita status canônicos e cancelamento legado
    expect(() => validateToolArguments('update_quote_status', { quoteNumber: 'ORC-0001', status: 'cancelled', idempotencyKey: 'test-key-1234' })).not.toThrow();
    expect(() => validateToolArguments('update_quote_status', { quoteNumber: 'ORC-0001', status: 'draft', idempotencyKey: 'test-key-1234' })).not.toThrow();
    expect(() => validateToolArguments('query_quotes', { status: 'draft' })).not.toThrow();
    expect(() => validateToolArguments('query_quotes', { status: 'pending' })).not.toThrow();

    // Normalização na gravação
    const result = await tools.executeUpdateQuoteStatus({
      quoteNumber: 'ORC-0001', status: 'cancelled', confirmed: true,
    }, { uid: 'user-1', permissions: { quotes: { edit: true } } });

    expect(updateQuoteStatus).toHaveBeenCalledWith(expect.anything(), 'ORC-0001', 'rejected');
    expect(result.status).toBe('rejected');

    // Filtro de pending retorna draft e sent
    const pendingQuotes = await tools.executeQueryQuotes({ status: 'pending' }, { uid: 'user-1' });
    expect(pendingQuotes.quotes.map((q: any) => q.quoteNumber)).toEqual(['ORC-0001', 'ORC-0002']);

    // Filtro de cancelled retorna rejected
    const cancelledQuotes = await tools.executeQueryQuotes({ status: 'cancelled' }, { uid: 'user-1' });
    expect(cancelledQuotes.quotes.map((q: any) => q.quoteNumber)).toEqual(['ORC-0004']);
  });
});

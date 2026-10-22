import { describe, it, expect } from 'vitest';
const { createAiAgentChatHandler, createEnrichGalleryItemHandler, createEnrichStoreProductHandler } = require('../../../functions/ai/handlers');
const { AiToolsExecutor } = require('../../../functions/ai/tools');
const { AiResponseCache } = require('../../../functions/ai/cache');
const { AiBudgetManager } = require('../../../functions/ai/budget');

describe('IA-07 & IA-08: Execução de Ferramentas e Saídas Estruturadas', () => {
  const mockRepos = {
    getCatalogKnowledge: async () => '--- DADOS DO ATELIÊ ---',
    getScopedOrders: async () => [
      {
        orderId: 'o1',
        orderNumber: '#101',
        customerName: 'Maria Silva',
        productSummary: 'Topo de Bolo',
        totalPrice: 45,
        paidAmount: 45,
        remainingAmount: 0,
        status: 'completed',
        paymentStatus: 'paid',
        userId: 'admin-1',
        isDeleted: false,
      },
    ],
    getScopedCustomers: async () => ({ customers: [], totalScoped: 0 }),
    getGalleryItems: async () => [],
    getTeamMembers: async () => [],
  };

  const toolsExec = new AiToolsExecutor(mockRepos);
  const cache = new AiResponseCache();
  const budget = new AiBudgetManager(null);

  it('usa o motor de precificação compartilhado e preserva percentuais zero no MCP legado', async () => {
    const executor = new AiToolsExecutor({ getPricingSettings: async () => ({}) });
    const result = await executor.executeCalculateArtisanPricing({
      productName: 'Teste',
      quantity: 1,
      pricingMode: 'markup',
      markupPercent: 0,
      items: [{ name: 'Papel', quantity: 1, unitCost: 10 }],
      laborTimeMinutes: 0,
      hourlyRate: 0,
    }, { uid: 'admin-1' });

    expect(result.success).toBe(true);
    expect(result.suggestedUnitPrice).toBe(result.unitPrice);
    // R$ 10 de material + 10% de perda, com 4,5% de taxa configurada.
    expect(result.suggestedTotalPrice).toBe(11.52);
    expect(result.paymentFeePercent).toBe(4.5);
  });

  it('rejeita percentual de precificação fora do intervalo do negócio', async () => {
    const executor = new AiToolsExecutor({ getPricingSettings: async () => ({}) });
    await expect(executor.executeCalculateArtisanPricing({
      productName: 'Teste', quantity: 1, pricingMode: 'margem', profitMarginPercent: 96,
    }, { uid: 'admin-1' })).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('preserva respostas financeiras de múltiplas ferramentas sem reescrita', async () => {
    const requests: any[] = [];
    const mockGeminiClient = {
      generateContent: async (payload: any) => {
        requests.push(payload);
        if (requests.length === 1) {
          return {
            modelUsed: 'gemini-3.8-flash',
            tokens: { promptTokens: 100, candidatesTokens: 30, reasoningTokens: 0, totalTokens: 130 },
            data: { candidates: [{ content: { parts: [
              { functionCall: { name: 'daily_briefing', args: {} } },
              { functionCall: { name: 'query_customers', args: { query: 'Ana' } } },
            ] } }] },
          };
        }
        return {
          modelUsed: 'gemini-3.8-flash',
          tokens: { promptTokens: 80, candidatesTokens: 20, reasoningTokens: 0, totalTokens: 100 },
          data: { candidates: [{ content: { parts: [{ text: 'Ana tem pedidos em aberto; priorize o contato hoje.' }] } }] },
        };
      },
    };
    const chatHandler = createAiAgentChatHandler({
      geminiClient: mockGeminiClient,
      repositories: { getCatalogKnowledge: async () => '' },
      toolsExecutor: {
        executeDailyBriefing: async () => ({ todayDate: '26/09/2026', delayedCount: 1, todayDeliveriesCount: 0, inProgressCount: 2, pendingPaymentTotal: 50 }),
        executeQueryCustomers: async () => ({ customers: [{ name: 'Ana', phone: '11999990000', city: 'São Paulo' }], totalFiltered: 1, totalScoped: 1 }),
      },
      budgetManager: null,
      cache: null,
    });

    const result = await chatHandler({
      auth: { uid: 'admin-1' },
      authProfile: { role: 'admin', active: true },
      data: { message: 'Cruze o resumo de hoje com os clientes que devo contatar.' },
    });

    expect(requests).toHaveLength(1);
    expect(result.reply).toContain('Raio-X Operacional');
    expect(result.reply).toContain('R$ 50.00');
    expect(result.reply).toContain('Ana');
  });

  it('deve executar resposta do chat com chamada de ferramenta (Function Call)', async () => {
    const mockGeminiClient = {
      generateContent: async () => ({
        modelUsed: 'gemini-3.8-flash',
        tokens: { promptTokens: 100, candidatesTokens: 50, totalTokens: 150 },
        data: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: 'calculate_pricing_estimate',
                      args: {
                        productName: 'Topo de Bolo Shaker',
                        quantity: 1,
                        unitCostRaw: 12.0,
                        customizationCost: 6.0,
                        laborTimeMinutes: 20,
                        profitMarginPercent: 50,
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
    };

    const chatHandler = createAiAgentChatHandler({
      geminiClient: mockGeminiClient,
      repositories: mockRepos,
      toolsExecutor: toolsExec,
      budgetManager: budget,
      cache,
    });

    const res = await chatHandler({
      auth: { uid: 'admin-1' },
      authProfile: { role: 'admin', active: true },
      data: { message: 'quanto custa um topo shaker?' },
    });

    expect(res.success).toBe(true);
    expect(res.pricingEstimate).toBeDefined();
    expect(res.pricingEstimate.productName).toBe('Topo de Bolo Shaker');
    expect(res.pricingEstimate.suggestedUnitPrice).toBeGreaterThan(0);
    expect(res.reply).toContain('Simulação para Topo de Bolo Shaker');
    expect(res.reply).toContain('Preço sugerido por unidade');
  });

  it('deve executar enriquecimento de produto da lojinha com schema JSON estruturado', async () => {
    const mockGeminiClient = {
      generateContent: async () => ({
        modelUsed: 'gemini-2.5-flash',
        tokens: { promptTokens: 200, candidatesTokens: 100, totalTokens: 300 },
        data: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      name: 'Caixa Milk Safari Luxo',
                      category: 'Papelaria de Festa',
                      description: 'Caixa confeccionada em papel offset 240g com laço duplo.',
                      leadTimeDays: 7,
                      badge: 'Destaque',
                      suggestedTags: ['Safari', 'Caixa Milk', 'Festa'],
                    }),
                  },
                ],
              },
            },
          ],
        },
      }),
    };

    const storeEnrichHandler = createEnrichStoreProductHandler({
      geminiClient: mockGeminiClient,
    });

    const res = await storeEnrichHandler({
      auth: { uid: 'admin-1' },
      authProfile: { role: 'admin', active: true },
      data: {
        currentName: 'Caixa Safari',
        currentCategory: 'Festa',
        imageBase64: 'data:image/jpeg;base64,dGVzdA==',
      },
    });

    expect(res.success).toBe(true);
    expect(res.name).toBe('Caixa Milk Safari Luxo');
    expect(res.leadTimeDays).toBe(7);
    expect(res.badge).toBe('Destaque');
  });
});

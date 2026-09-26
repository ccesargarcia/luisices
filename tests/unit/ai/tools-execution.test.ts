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

  it('sintetiza chamadas de múltiplas ferramentas em uma segunda rodada limitada', async () => {
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

    expect(requests).toHaveLength(2);
    expect(requests[1].tools).toBeUndefined();
    expect(requests[1].contents.at(-2).role).toBe('model');
    expect(requests[1].contents.at(-1).parts).toHaveLength(2);
    expect(requests[1].contents.at(-1).parts[0].functionResponse.name).toBe('daily_briefing');
    expect(result.reply).toContain('Ana tem pedidos em aberto');
    expect(result.reply).not.toContain('Raio-X Operacional');
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
    expect(res.reply).toContain('Estimativa de Precificação');
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

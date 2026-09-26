import { describe, it, expect, vi } from 'vitest';
const { createAiServices } = require('../../../functions/ai');
const { downloadImageAsBase64 } = require('../../../functions/ai/handlers');
const { AiBudgetManager } = require('../../../functions/ai/budget');

describe('Regressões Críticas e Validação da Fábrica de Serviços (Revisão 2)', () => {
  it('1. Deve criar serviços pela fábrica createAiServices e executar chat sem ReferenceError gravando telemetria', async () => {
    const mockDailySet = vi.fn().mockResolvedValue(true);
    const mockMonthlySet = vi.fn().mockResolvedValue(true);
    const mockLogsAdd = vi.fn().mockResolvedValue({ id: 'log-1' });
    const mockBudgetDocs = new Map<string, any>();

    const mockDb = {
      doc: (path: string) => {
        if (path.startsWith('ai_usage_daily/')) {
          return { set: mockDailySet, get: async () => ({ exists: true, data: () => ({ totalRequests: 5, totalTokens: 1200 }) }) };
        }
        if (path.startsWith('ai_usage_monthly/')) {
          return { set: mockMonthlySet, get: async () => ({ exists: true, data: () => ({ totalRequests: 15, totalTokens: 4500 }) }) };
        }
        if (path.startsWith('ai_budget_daily/')) {
          return { path, get: async () => ({ exists: mockBudgetDocs.has(path), data: () => mockBudgetDocs.get(path) }) };
        }
        if (path.startsWith('ai_budget_reservations/')) {
          return { path, get: async () => ({ exists: mockBudgetDocs.has(path), data: () => mockBudgetDocs.get(path) }) };
        }
        if (path.startsWith('userProfiles/')) {
          return { get: async () => ({ exists: true, data: () => ({ role: 'admin', active: true }) }) };
        }
        return { get: async () => ({ exists: false }) };
      },
      collection: (name: string) => {
        if (name === 'ai_usage_logs') {
          return {
            add: mockLogsAdd,
            orderBy: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }),
          };
        }
        if (name === 'orders') {
          return {
            where: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }),
          };
        }
        return {
          where: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }),
          limit: () => ({ get: async () => ({ docs: [] }) }),
        };
      },
      runTransaction: async (fn: any) => fn({
        get: async (ref: any) => ({ exists: mockBudgetDocs.has(ref.path), data: () => mockBudgetDocs.get(ref.path) }),
        set: (ref: any, data: any, opts?: any) => mockBudgetDocs.set(ref.path, opts?.merge ? { ...(mockBudgetDocs.get(ref.path) || {}), ...data } : data),
        update: (ref: any, data: any) => mockBudgetDocs.set(ref.path, { ...(mockBudgetDocs.get(ref.path) || {}), ...data }),
      }),
      FieldValue: {
        serverTimestamp: () => new Date().toISOString(),
        increment: (n: number) => n,
      },
    };

    const mockAdmin = {
      firestore: () => mockDb,
      auth: () => null,
    };

    const services = createAiServices(mockAdmin, 'test-gemini-key');

    // Simula chamada fetch bem-sucedida do Gemini
    services.geminiClient.fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: 'Olá! Como posso ajudar seu ateliê hoje?' }] },
          finishReason: 'STOP',
        }],
        usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 50, thoughtsTokenCount: 10, totalTokenCount: 180 },
      }),
    });

    const res = await services.handlers.aiAgentChat({
      auth: { uid: 'admin-user-1' },
      authProfile: { role: 'admin', active: true },
      data: { message: 'Como calcular o preço de adesivos?' },
    });

    expect(res.success).toBe(true);
    expect(res.reply).toContain('Olá!');
    expect(mockLogsAdd).toHaveBeenCalled();
    expect(mockLogsAdd.mock.calls[0][0].reasoningTokens).toBe(10);
    expect(mockLogsAdd.mock.calls[0][0].attempts).toHaveLength(1);
    expect(mockDailySet).toHaveBeenCalled();
  });

  it('2. Deve bloquear SSRF em URLs locais ou privadas no download de imagens', async () => {
    await expect(downloadImageAsBase64('http://127.0.0.1/private.png')).rejects.toThrow(/SSRF/);
    await expect(downloadImageAsBase64('http://localhost:8080/secret.jpg')).rejects.toThrow(/SSRF/);
    await expect(downloadImageAsBase64('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(/SSRF/);
    await expect(downloadImageAsBase64('http://192.168.1.1/admin.png')).rejects.toThrow(/SSRF/);
    await expect(downloadImageAsBase64('http://10.0.0.5/api/image')).rejects.toThrow(/SSRF/);
  });

  it('3. Deve consultar clientes e galeria cobrindo múltiplos vínculos (userId, createdBy, assignedTo/ownerUid)', async () => {
    const mockDb = {
      collection: (name: string) => {
        if (name === 'customers') {
          return {
            where: (field: string, _op: string, val: string) => ({
              limit: () => ({
                get: async () => {
                  if (field === 'userId') return { docs: [{ id: 'c-1', data: () => ({ name: 'Cliente 1', userId: val }) }] };
                  if (field === 'createdBy') return { docs: [{ id: 'c-2', data: () => ({ name: 'Cliente 2', createdBy: val }) }] };
                  if (field === 'assignedTo') return { docs: [{ id: 'c-3', data: () => ({ name: 'Cliente 3', assignedTo: val }) }] };
                  return { docs: [] };
                },
              }),
            }),
          };
        }
        if (name === 'gallery') {
          return {
            where: (field: string, _op: string, val: string) => ({
              limit: () => ({
                get: async () => {
                  if (field === 'userId') return { docs: [{ id: 'g-1', data: () => ({ title: 'Arte 1', userId: val }) }] };
                  if (field === 'createdBy') return { docs: [{ id: 'g-2', data: () => ({ title: 'Arte 2', createdBy: val }) }] };
                  if (field === 'ownerUid') return { docs: [{ id: 'g-3', data: () => ({ title: 'Arte 3', ownerUid: val }) }] };
                  return { docs: [] };
                },
              }),
            }),
          };
        }
        return { where: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }) };
      },
    };

    const { AiDataRepositories } = require('../../../functions/ai/repositories');
    const repos = new AiDataRepositories(mockDb);

    const userScope = { uid: 'user-xyz', role: 'user', isAdmin: false, canViewAi: true, canViewPricing: false, canManageTeam: false };

    const customersResult = await repos.getScopedCustomers(userScope);
    expect(customersResult.customers.length).toBe(3);
    expect(customersResult.customers.map((c: any) => c.id)).toEqual(expect.arrayContaining(['c-1', 'c-2', 'c-3']));

    const galleryResult = await repos.getGalleryItems(userScope);
    expect(galleryResult.length).toBe(3);
    expect(galleryResult.map((g: any) => g.id)).toEqual(expect.arrayContaining(['g-1', 'g-2', 'g-3']));
  });

  it('4. Reconciliação do orçamento deve ser estritamente idempotente', async () => {
    const budget = new AiBudgetManager(null);
    const res = await budget.reserveBudget('user-idem', 1500);

    // Primeira reconciliação: consumiu 800 tokens (sobraram 700)
    await budget.reconcileBudget(res, 800);
    const usageAfterFirst = budget.inMemoryDailyUsage.get(res.key);
    expect(usageAfterFirst.tokens).toBe(800);

    // Segunda reconciliação idêntica não deve diminuir tokens novamente
    await budget.reconcileBudget(res, 800);
    const usageAfterSecond = budget.inMemoryDailyUsage.get(res.key);
    expect(usageAfterSecond.tokens).toBe(800);
  });

  it('5. Consultas financeiras e mutáveis não devem ser salvas ou retornadas pelo cache', async () => {
    const mockBudgetDocs = new Map<string, any>();
    const mockDb = {
      doc: (path: string) => ({ path, get: async () => ({ exists: mockBudgetDocs.has(path), data: () => mockBudgetDocs.get(path) }), set: async () => true }),
      runTransaction: async (fn: any) => fn({
        get: async (ref: any) => ({ exists: mockBudgetDocs.has(ref.path), data: () => mockBudgetDocs.get(ref.path) }),
        set: (ref: any, data: any, opts?: any) => mockBudgetDocs.set(ref.path, opts?.merge ? { ...(mockBudgetDocs.get(ref.path) || {}), ...data } : data),
        update: (ref: any, data: any) => mockBudgetDocs.set(ref.path, { ...(mockBudgetDocs.get(ref.path) || {}), ...data }),
      }),
      collection: () => ({
        where: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }),
        limit: () => ({ get: async () => ({ docs: [] }) }),
        add: async () => ({ id: 'log-1' }),
        orderBy: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }),
      }),
    };

    const services = createAiServices({ firestore: () => mockDb }, 'key');
    let callCount = 0;

    services.geminiClient.fetchFn = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [
                {
                  functionCall: {
                    name: 'get_financial_summary',
                    args: { period: 'month' },
                  },
                },
              ],
            },
            finishReason: 'STOP',
          }],
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 },
        }),
      };
    });

    // Primeira chamada financeira
    await services.handlers.aiAgentChat({
      auth: { uid: 'admin-1' },
      authProfile: { role: 'admin', active: true },
      data: { message: 'Qual o faturamento deste mês?' },
    });

    // Segunda chamada idêntica financeira
    await services.handlers.aiAgentChat({
      auth: { uid: 'admin-1' },
      authProfile: { role: 'admin', active: true },
      data: { message: 'Qual o faturamento deste mês?' },
    });

    // Como é chamada financeira dinâmica, NÃO deve usar cache -> deve chamar o cliente duas vezes
    expect(callCount).toBe(2);
  });

  it('6. WhatsApp draft de cobrança deve prevalecer o saldo oficial do pedido mesmo se customText tiver valor arbitrário', async () => {
    const { AiToolsExecutor } = require('../../../functions/ai/tools');
    const mockRepos = {
      getScopedOrders: async () => [
        {
          orderId: 'ord-100',
          orderNumber: '#100',
          customerName: 'Beatriz Lima',
          customerPhone: '11988887777',
          productSummary: '50 Sacolas Kraft',
          totalPrice: 250,
          paidAmount: 50,
          remainingAmount: 200,
          status: 'in_production',
          paymentStatus: 'pending',
        },
      ],
      getScopedCustomers: async () => ({ customers: [] }),
    };

    const tools = new AiToolsExecutor(mockRepos);
    const scope = { uid: 'u-1', role: 'admin', isAdmin: true };

    const draft = await tools.executeGenerateWhatsAppMessage({
      orderNumber: '100',
      messageType: 'cobranca',
      customText: 'Por favor pague R$ 999,00 urgente',
    }, scope);

    expect(draft.type).toBe('cobranca');
    expect(draft.messageText).toContain('R$ 200,00');
    expect(draft.messageText).not.toContain('999,00');
    expect(draft.recipientPhone).toBe('5511988887777');
  });
});

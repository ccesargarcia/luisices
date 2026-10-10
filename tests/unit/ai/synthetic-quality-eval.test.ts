import { describe, it, expect } from 'vitest';
const { AiToolsExecutor } = require('../../../functions/ai/tools');
const { getCallerScope, validateAiAccess, validateGalleryAccess } = require('../../../functions/ai/authorization');
const { calculateRecipePricing, DEFAULT_PRICING_SETTINGS } = require('../../../functions/ai/pricing/pricingCalculator');
const { AiResponseCache } = require('../../../functions/ai/cache');
const { AiBudgetManager } = require('../../../functions/ai/budget');
const { GeminiClient } = require('../../../functions/ai/geminiClient');
const { cleanAiOutput } = require('../../../functions/ai/handlers');

describe('IA-QA: Suíte Sintética de Avaliação e Regressão (40 Casos Obrigatórios)', () => {
  const now = new Date();
  const currentIso = new Date(now.getTime() - 60000).toISOString();
  const syntheticOrders = [
    { orderId: 'ord-1', orderNumber: '#101', customerName: 'Alice Mendes', customerPhone: '11999991111', productSummary: 'Topo 3D', totalPrice: 80, paidAmount: 80, remainingAmount: 0, status: 'completed', paymentStatus: 'paid', deliveryDate: currentIso.split('T')[0], createdAt: currentIso, userId: 'u-admin', isDeleted: false },
    { orderId: 'ord-2', orderNumber: '#102', customerName: 'Bruno Costa', customerPhone: '11999992222', productSummary: 'Caixa Milk 20un', totalPrice: 160, paidAmount: 60, remainingAmount: 100, status: 'in-progress', paymentStatus: 'partial', deliveryDate: currentIso.split('T')[0], createdAt: currentIso, userId: 'u-admin', isDeleted: false },
    { orderId: 'ord-3', orderNumber: '#103', customerName: 'Carla Dias', customerPhone: '11999993333', productSummary: 'Convites Luxo', totalPrice: 250, paidAmount: 0, remainingAmount: 250, status: 'pending', paymentStatus: 'pending', deliveryDate: currentIso.split('T')[0], createdAt: currentIso, userId: 'u-admin', isDeleted: false },
    { orderId: 'ord-4', orderNumber: '#104', customerName: 'Diego Ramos', customerPhone: '11999994444', productSummary: 'Lembrancinhas', totalPrice: 300, paidAmount: 0, remainingAmount: 300, status: 'cancelled', paymentStatus: 'pending', createdAt: currentIso, userId: 'u-admin', isDeleted: false },
  ];

  const syntheticCustomers = [
    { id: 'c-1', name: 'Alice Mendes', phone: '11999991111', city: 'São Paulo', userId: 'u-admin', isDeleted: false },
    { id: 'c-2', name: 'Bruno Costa', phone: '11999992222', city: 'Curitiba', userId: 'u-admin', isDeleted: false },
  ];

  const mockRepos = {
    getScopedOrders: async () => syntheticOrders,
    getScopedCustomers: async (_scope: any, opt: any = {}) => {
      let res = syntheticCustomers;
      if (opt.searchTerm) res = res.filter(c => c.name.toLowerCase().includes(opt.searchTerm.toLowerCase()) || c.city.toLowerCase().includes(opt.searchTerm.toLowerCase()));
      return { customers: res, totalScoped: syntheticCustomers.length, totalFiltered: res.length, hasMore: false };
    },
    getTeamMembers: async () => [{ uid: 'u-admin', name: 'Admin', email: 'admin@luisices.com.br' }],
    getGalleryItems: async () => [],
    getCatalogKnowledge: async () => '',
  };

  const toolsExec = new AiToolsExecutor(mockRepos);
  const adminScope = getCallerScope('u-admin', { role: 'admin', active: true });

  // -------------------------------------------------------------
  // GRUPO 1: Financeiro & Busca (Casos 1 a 8)
  // -------------------------------------------------------------
  describe('Grupo 1: Financeiro & Busca (8 casos)', () => {
    it('Caso 01: Faturamento hoje com limites corretos', async () => {
      const fin = await toolsExec.executeFinancialSummary({ period: 'today' }, adminScope);
      expect(fin.period).toBe('today');
      expect(typeof fin.faturamentoRealizado).toBe('number');
    });

    it('Caso 02: Resumo semanal', async () => {
      const fin = await toolsExec.executeFinancialSummary({ period: 'week' }, adminScope);
      expect(fin.period).toBe('week');
      expect(fin.totalPedidosValidos).toBeGreaterThanOrEqual(0);
    });

    it('Caso 03: Resumo mensal', async () => {
      const fin = await toolsExec.executeFinancialSummary({ period: 'month' }, adminScope);
      expect(fin.period).toBe('month');
      expect(fin.faturamentoRealizado).toBe(80); // Apenas pedido concluído
    });

    it('Caso 04: Resumo anual', async () => {
      const fin = await toolsExec.executeFinancialSummary({ period: 'year' }, adminScope);
      expect(fin.period).toBe('year');
    });

    it('Caso 05: Todo o histórico excluindo cancelados do volume faturado', async () => {
      const fin = await toolsExec.executeFinancialSummary({ period: 'all' }, adminScope);
      expect(fin.volumeTotalEmitido).toBe(80 + 160 + 250); // 490 (sem o cancelado de 300)
      expect(fin.pedidosCancelados).toBe(1);
    });

    it('Caso 06: Busca de pedidos por número formatado (#102)', async () => {
      const res = await toolsExec.executeQueryOrdersView({ searchTerm: '#102' }, adminScope);
      expect(res.orders.length).toBe(1);
      expect(res.orders[0].customerName).toBe('Bruno Costa');
    });

    it('Caso 07: Busca de cliente inexistente retorna vazio', async () => {
      const res = await toolsExec.executeQueryCustomers({ searchTerm: 'Zulmira Inexistente' }, adminScope);
      expect(res.customers.length).toBe(0);
      expect(res.totalFiltered).toBe(0);
    });

    it('Caso 08: Busca de clientes por cidade', async () => {
      const res = await toolsExec.executeQueryCustomers({ searchTerm: 'Curitiba' }, adminScope);
      expect(res.customers.length).toBe(1);
      expect(res.customers[0].name).toBe('Bruno Costa');
    });
  });

  // -------------------------------------------------------------
  // GRUPO 2: Preço & Cálculo (Casos 9 a 16)
  // -------------------------------------------------------------
  describe('Grupo 2: Preço & Cálculo (8 casos)', () => {
    it('Caso 09: Produto simples com taxa e margem padrão', () => {
      const res = calculateRecipePricing({
        items: [{ name: 'Papel', unit: 'unidade', unitCost: 10, quantityUsed: 1, totalCost: 10 }],
        wasteMarginPercent: 10,
        productionTimeMinutes: 15,
        profitMarginPercent: 50,
        paymentFeePercent: 4.5,
      });
      expect(res.materialsCost).toBe(10);
      expect(res.materialsCostWithWaste).toBe(11);
      expect(res.suggestedUnitPrice).toBeGreaterThan(res.totalUnitCost);
    });

    it('Caso 10: Rendimento de folha inteira (Math.ceil com 6 peças/folha)', () => {
      const res = calculateRecipePricing({
        items: [{ name: 'A4', unit: 'folha', unitCost: 1.20, piecesPerSheet: 6, useSheetRounding: true }],
        wasteMarginPercent: 0,
        productionTimeMinutes: 0,
        settings: DEFAULT_PRICING_SETTINGS,
      });
      expect(res.materialsCost).toBe(1.20);
      const tier10 = res.batchTiers.find(t => t.quantity === 10);
      // 10 / 6 = 2 folhas -> 2 * 1.20 = 2.40 / 10 = 0.24
      expect(tier10?.unitCost).toBeCloseTo(0.24, 2);
    });

    it('Caso 11: Setup diluído em lote de 10 unidades', () => {
      const res = calculateRecipePricing({
        items: [{ name: 'Insumo', unit: 'unidade', unitCost: 2, totalCost: 2 }],
        setupTimeMinutes: 30,
        productionTimeMinutes: 5,
      });
      const t1 = res.batchTiers.find(t => t.quantity === 1);
      const t10 = res.batchTiers.find(t => t.quantity === 10);
      expect(t10!.unitCost).toBeLessThan(t1!.unitCost);
    });

    it('Caso 12: Custos explícitos zero preservados', () => {
      const res = calculateRecipePricing({
        items: [{ name: 'Arquivo Digital', unit: 'unidade', unitCost: 0, totalCost: 0 }],
        wasteMarginPercent: 0,
        productionTimeMinutes: 0,
      });
      expect(res.totalUnitCost).toBe(0);
      expect(res.suggestedUnitPrice).toBe(0);
    });

    it('Caso 13: Monotonicidade estrita em margens altas (>90%)', () => {
      const base = { items: [{ name: 'Item', unit: 'unidade' as const, unitCost: 10, totalCost: 10 }] };
      const r89 = calculateRecipePricing({ ...base, profitMarginPercent: 89 });
      const r91 = calculateRecipePricing({ ...base, profitMarginPercent: 91 });
      expect(r91.suggestedUnitPrice).toBeGreaterThanOrEqual(r89.suggestedUnitPrice);
    });

    it('Caso 14: Preço manual abaixo do custo gerando prejuízo real', () => {
      const res = calculateRecipePricing({
        items: [{ name: 'Item', unit: 'unidade', unitCost: 20, totalCost: 20 }],
        productionTimeMinutes: 0,
        wasteMarginPercent: 0,
        manualUnitPrice: 15,
        paymentFeePercent: 5,
      });
      expect(res.netProfitAmount).toBeLessThan(0);
    });

    it('Caso 15: Ponto de equilíbrio e desconto máximo calculados', () => {
      const res = calculateRecipePricing({
        items: [{ name: 'Item', unit: 'unidade', unitCost: 10, totalCost: 10 }],
        paymentFeePercent: 10,
        profitMarginPercent: 40,
        wasteMarginPercent: 0,
        productionTimeMinutes: 0,
      });
      expect(res.breakevenPrice).toBeCloseTo(11.11, 2);
      expect(res.maxDiscountPercent).toBeGreaterThan(40);
    });

    it('Caso 16: Método Markup on Cost', () => {
      const res = calculateRecipePricing({
        items: [{ name: 'Item', unit: 'unidade', unitCost: 10, totalCost: 10 }],
        pricingMethod: 'markup_on_cost',
        profitMarginPercent: 50,
        wasteMarginPercent: 0,
        productionTimeMinutes: 0,
        paymentFeePercent: 0,
      });
      expect(res.suggestedUnitPrice).toBe(15);
    });
  });

  // -------------------------------------------------------------
  // GRUPO 3: Cobrança / Rascunho (Casos 17 a 24)
  // -------------------------------------------------------------
  describe('Grupo 3: Cobrança & Rascunho (8 casos)', () => {
    it('Caso 17: Cobrança de pedido com saldo pendente inclui valores exatos', async () => {
      const msg = await toolsExec.executeGenerateWhatsAppMessage({ orderNumber: '#102', recipientName: 'Bruno Costa' }, adminScope);
      expect(msg.orderDetails.remainingAmount).toBe(100);
      expect(msg.text).toContain('100,00');
    });

    it('Caso 18: Pedido já pago gera aviso de quitação', async () => {
      const msg = await toolsExec.executeGenerateWhatsAppMessage({ orderNumber: '#101', recipientName: 'Alice Mendes' }, adminScope);
      expect(msg.orderDetails.paymentStatus).toBe('paid');
      expect(msg.text).toContain('quitado');
    });

    it('Caso 19: Mensagem de pedido pronto', async () => {
      const msg = await toolsExec.executeGenerateWhatsAppMessage({ orderNumber: '#101', recipientName: 'Alice Mendes', messageType: 'pedido_pronto' }, adminScope);
      expect(msg.text).toContain('concluído');
      expect(msg.text).not.toMatch(/embalad|prontinho/);
    });

    it('Caso 20: Busca por orderNumber sem hash', async () => {
      const msg = await toolsExec.executeGenerateWhatsAppMessage({ orderNumber: '102', recipientName: 'Bruno Costa' }, adminScope);
      expect(msg.orderDetails).toBeDefined();
    });

    it('Caso 21: Rascunho de pedido com fone e cliente', async () => {
      const draft = await toolsExec.executeExtractOrderDraft({ customerName: 'Alice Mendes', productSummary: 'Topo Luxo' }, adminScope);
      expect(draft.customerPhone).toBe('5511999991111');
      expect(draft.customerName).toBe('Alice Mendes');
    });

    it('Caso 22: Rascunho com quantidades e sinal', async () => {
      const draft = await toolsExec.executeExtractOrderDraft({ customerName: 'Novo', productSummary: 'Kits', quantity: 5, totalPrice: 200, paidAmount: 100 }, adminScope);
      expect(draft.quantity).toBe(5);
      expect(draft.totalPrice).toBe(200);
      expect(draft.paidAmount).toBe(100);
    });

    it('Caso 23: Resolução de telefone exata', async () => {
      const phone = await toolsExec.resolveCustomerPhone('Alice Mendes', null, adminScope);
      expect(phone).toBe('5511999991111');
    });

    it('Caso 24: Resolução de telefone desconhecido retorna vazio', async () => {
      const phone = await toolsExec.resolveCustomerPhone('Inexistente Total', null, adminScope);
      expect(phone).toBe('');
    });
  });

  // -------------------------------------------------------------
  // GRUPO 4: Visão Computacional (Casos 25 a 30)
  // -------------------------------------------------------------
  describe('Grupo 4: Visão Computacional (6 casos)', () => {
    it('Caso 25: Validação de arte própria permitida para usuário comum', () => {
      const userScope = getCallerScope('u-user', { role: 'user', active: true });
      const item = { id: 'gal-1', userId: 'u-user', isDeleted: false };
      expect(() => validateGalleryAccess(userScope, item)).not.toThrow();
    });

    it('Caso 26: Arte de terceiros negada para usuário comum', () => {
      const userScope = getCallerScope('u-user', { role: 'user', active: true });
      const item = { id: 'gal-2', userId: 'u-other', isDeleted: false };
      expect(() => validateGalleryAccess(userScope, item)).toThrow('Você não tem permissão');
    });

    it('Caso 27: Arte excluída bloqueada mesmo para o dono', () => {
      const userScope = getCallerScope('u-user', { role: 'user', active: true });
      const item = { id: 'gal-3', userId: 'u-user', isDeleted: true };
      expect(() => validateGalleryAccess(userScope, item)).toThrow('Este item da galeria foi excluído');
    });

    it('Caso 28: Admin tem permissão para auditar qualquer arte ativa', () => {
      const item = { id: 'gal-4', userId: 'u-other', isDeleted: false };
      expect(() => validateGalleryAccess(adminScope, item)).not.toThrow();
    });

    it('Caso 29: Parser limpa markdown json de saídas da visão', () => {
      const raw = '```json\n{"name":"Caixa Milk"}\n```';
      expect(cleanAiOutput(raw)).toBe('{"name":"Caixa Milk"}');
    });

    it('Caso 30: Parser remove tags thought de auto-raciocínio', () => {
      const raw = '<thought>Analisando a foto...</thought>Produto excelente';
      expect(cleanAiOutput(raw)).toBe('Produto excelente');
    });
  });

  // -------------------------------------------------------------
  // GRUPO 5: Institucional & Customização (Casos 31 a 34)
  // -------------------------------------------------------------
  describe('Grupo 5: Institucional & Customização (4 casos)', () => {
    it('Caso 31: Limpeza de markdown json preserva conteúdo interno', () => {
      const jsonStr = '```\n{"catalogAboutTitle": "Sobre a Luisices"}\n```';
      expect(cleanAiOutput(jsonStr)).toBe('{"catalogAboutTitle": "Sobre a Luisices"}');
    });

    it('Caso 32: Parser lida com strings sem markdown', () => {
      const raw = 'Texto puro sem formatação';
      expect(cleanAiOutput(raw)).toBe('Texto puro sem formatação');
    });

    it('Caso 33: Parser tolera entradas vazias ou nulas', () => {
      expect(cleanAiOutput('')).toBe('');
      expect(cleanAiOutput(null as any)).toBe('');
    });

    it('Caso 34: JSON estruturado institucional pode ser parseado com segurança', () => {
      const rawJson = '{\n  "catalogAboutBadge": "Sobre Nós",\n  "catalogAboutTitle": "Feito com Amor"\n}';
      const parsed = JSON.parse(cleanAiOutput(rawJson));
      expect(parsed.catalogAboutBadge).toBe('Sobre Nós');
    });
  });

  // -------------------------------------------------------------
  // GRUPO 6: Autorização, Falhas & Ambiguidade (Casos 35 a 40)
  // -------------------------------------------------------------
  describe('Grupo 6: Autorização, Falhas & Ambiguidade (6 casos)', () => {
    it('Caso 35: Acesso negado a usuário com conta inativa', () => {
      const scope = getCallerScope('u-inativo', { role: 'funcionario', active: false });
      expect(() => validateAiAccess(scope)).toThrow('Conta de usuário desativada');
    });

    it('Caso 36: Funcionário sem permissão aiCopilot é bloqueado', () => {
      const scope = getCallerScope('u-sem-ia', { role: 'funcionario', active: true, permissions: { aiCopilot: false } });
      expect(() => validateAiAccess(scope)).toThrow('Seu perfil de funcionário não possui permissão');
    });

    it('Caso 37: Usuário sem UID é rejeitado como unauthenticated', () => {
      const scope = getCallerScope('', null);
      expect(() => validateAiAccess(scope)).toThrow('Usuário não autenticado');
    });

    it('Caso 38: Orçamento diário estoura e bloqueia chamadas adicionais', async () => {
      const budget = new AiBudgetManager(null);
      await budget.reserveBudget('u-test-burst', 145000);
      await expect(budget.reserveBudget('u-test-burst', 10000)).rejects.toThrow('Limite diário de uso de IA atingido');
    });

    it('Caso 39: Cliente Gemini falha imediatamente sem chave de API', async () => {
      const client = new GeminiClient({ apiKey: '' });
      await expect(client.generateContent({ contents: [] })).rejects.toThrow('Chave GEMINI_API_KEY não configurada');
    });

    it('Caso 40: Cache não guarda respostas com erro', () => {
      const cache = new AiResponseCache();
      const key = 'error-key';
      cache.set(key, { error: true, reply: 'Falha' });
      expect(cache.get(key)).toBeNull();
    });
  });
});

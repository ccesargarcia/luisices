import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const { AiToolsExecutor } = require('../../functions/ai/tools');
const { executeScopedToolByName } = require('../../functions/mcp/endpoint');

describe('Simulação Adversarial de Falhas de Segurança (Red Team)', () => {
  it('VULN-SEC-01: get_user_summary NÃO deve vazar valores financeiros em sampleOrders quando o token não possui financial:read nem payments:read', async () => {
    const executor = new AiToolsExecutor({
      getTeamMembers: vi.fn().mockResolvedValue([
        { uid: 'colab-1', name: 'Carlos', email: 'carlos@luisices.com.br', role: 'funcionario', active: true },
      ]),
      getScopedOrders: vi.fn().mockResolvedValue([
        {
          id: 'ord-secret-1',
          orderNumber: '#2026-0777',
          userId: 'colab-1',
          customerName: 'Cliente VIP',
          productName: 'Kit Luxo',
          totalPrice: 2500,
          price: 2500,
          paidAmount: 1000,
          remainingAmount: 1500,
          payment: { status: 'partial', totalAmount: 2500, paidAmount: 1000, remainingAmount: 1500 },
          status: 'in-progress',
          deliveryDate: '2026-11-15',
        },
      ]),
      getScopedCustomers: vi.fn().mockResolvedValue({
        customers: [
          { userId: 'colab-1', name: 'Cliente VIP', phone: '11999999999', totalOrders: 1, totalSpent: 2500 },
        ],
      }),
    });

    // Atacante/cliente conectado apenas com escopo 'team:read' (sem 'financial:read' e sem 'payments:read')
    const restrictedScopes = ['team:read'];
    const adminScope = { uid: 'admin-1', isAdmin: true, permissions: {} };

    const result = await executeScopedToolByName(
      executor,
      'get_user_summary',
      { userIdentifier: 'Carlos' },
      adminScope,
      restrictedScopes
    );

    // Verifica que customers e metrics foram redigidos, e exige que sampleOrders TAMBÉM não exponha valores monetários
    expect(result.customers[0]).not.toHaveProperty('totalSpent');
    expect(result.metrics).not.toHaveProperty('faturamentoRealizado');
    expect(result.sampleOrders).toHaveLength(1);
    expect(result.sampleOrders[0]).not.toHaveProperty('totalPrice');
    expect(result.sampleOrders[0]).not.toHaveProperty('paidAmount');
    expect(result.sampleOrders[0]).not.toHaveProperty('remainingAmount');
  });

  it('VULN-SEC-02: ferramentas de leitura de orçamentos e precificação devem bloquear usuário com permissão do módulo revogada (view: false)', async () => {
    const executor = new AiToolsExecutor({
      getQuotes: vi.fn().mockResolvedValue([{ id: 'q1', quoteNumber: 'ORC-0001', customerName: 'Secreto', totalPrice: 500, status: 'draft' }]),
      getSupplies: vi.fn().mockResolvedValue([{ id: 's1', name: 'Papel Secreto', unitCost: 12.5, unit: 'pct' }]),
      getPricingRecipes: vi.fn().mockResolvedValue([{ id: 'm1', productName: 'Receita Secreta', suggestedUnitPrice: 90 }]),
      getPricingRecipeById: vi.fn().mockResolvedValue({ id: 'm1', productName: 'Receita Secreta', suggestedUnitPrice: 90 }),
    });

    // Usuário comum ou funcionário cuja permissão de visualizar orçamentos e precificação foi revogada pelo admin
    const revokedScope = {
      uid: 'user-revoked',
      isAdmin: false,
      isEmployee: true,
      permissions: {
        quotes: { view: false, create: false, edit: false, delete: false },
        pricing: { view: false, create: false, edit: false, delete: false },
      },
    };

    await expect(executor.executeQueryQuotes({}, revokedScope)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(executor.executeListSupplies({}, revokedScope)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(executor.executeListPricingModels({}, revokedScope)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(executor.executeGetPricingModel({ modelId: 'm1' }, revokedScope)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(executor.executeCalculateArtisanPricing({ productName: 'Teste', items: [] }, revokedScope)).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('VULN-SEC-03: storage.rules não deve permitir bypass de permissão por request.auth.uid == userId sem checar hasPerm em orders e gallery', () => {
    const storageRules = readFileSync('storage.rules', 'utf8');

    // Extrai o bloco de anexos de pedidos e o bloco de galeria
    const ordersBlock = storageRules.match(/match\s+\/users\/\{userId\}\/orders\/\{orderId\}\/\{allPaths=\*\*\}\s*\{([\s\S]*?)\n\s*\}/)?.[1] || '';
    const galleryBlock = storageRules.match(/match\s+\/users\/\{userId\}\/gallery\/\{fileName\}\s*\{([\s\S]*?)\n\s*\}/)?.[1] || '';

    expect(ordersBlock).toBeTruthy();
    expect(galleryBlock).toBeTruthy();

    // Em storage.rules, o dono (request.auth.uid == userId) não pode dar curto-circuito no delete sem verificar a permissão do módulo
    expect(ordersBlock).not.toMatch(/allow\s+delete:[^\n]*request\.auth\.uid\s*==\s*userId\s*\|\|/);
    expect(galleryBlock).not.toMatch(/allow\s+delete:[^\n]*request\.auth\.uid\s*==\s*userId\s*\|\|/);

    // Criação e sobrescrita devem usar ações distintas em pedidos e galeria.
    expect(ordersBlock).toMatch(/allow\s+create:\s*if[\s\S]*?ownerHasPerm\(userId, 'orders', 'create'\)/);
    expect(ordersBlock).toMatch(/allow\s+update:\s*if[\s\S]*?ownerHasPerm\(userId, 'orders', 'edit'\)/);
    expect(galleryBlock).toMatch(/allow\s+create:\s*if[\s\S]*?ownerHasPerm\(userId, 'gallery', 'create'\)/);
    expect(galleryBlock).toMatch(/allow\s+update:\s*if[\s\S]*?ownerHasPerm\(userId, 'gallery', 'edit'\)/);
    const orderUpdate = ordersBlock.match(/allow\s+update:\s*if([\s\S]*?);/)?.[1] || '';
    const galleryUpdate = galleryBlock.match(/allow\s+update:\s*if([\s\S]*?);/)?.[1] || '';
    expect(orderUpdate).not.toContain("ownerHasPerm(userId, 'orders', 'create')");
    expect(galleryUpdate).not.toContain("ownerHasPerm(userId, 'gallery', 'create')");
  });

  it('VULN-SEC-04: checkout público deve remover caracteres de controle invisíveis de campos textuais', async () => {
    const documents = new Map<string, Record<string, any>>([
      ['storeSettings/public', { storePublished: true, catalogOrdersDisabled: false, catalogEnabled: true }],
      ['storeProducts/mug', { name: 'Caneca', price: 45, status: 'active', leadTimeDays: 3 }],
    ]);
    const makeRef = (path: string) => ({
      path,
      id: path.split('/').at(-1),
      get: async () => ({ exists: documents.has(path), id: path.split('/').at(-1), data: () => documents.get(path) }),
    });
    const mockDb = {
      doc: makeRef,
      collection: (path: string) => ({ doc: (id = 'order-ctrl-1') => makeRef(`${path}/${id}`) }),
      runTransaction: async (cb: any) => cb({
        get: async (ref: any) => ref.get(),
        set: (ref: any, data: any) => documents.set(ref.path, data),
      }),
    };

    const { handleSubmitPublicCatalogOrder } = require('../../functions/orders/index');
    const res = await handleSubmitPublicCatalogOrder(
      {
        data: {
          items: [{
            productId: 'mug',
            quantity: 1,
            customName: 'Maria\u0000\u0007\u001B[31mInjected',
            customTheme: 'Festa\u0000\u001F Infantil',
          }],
        customerNotes: 'Entregar\u0000\u001B[31m somente após as 18h',
          submittedSubtotal: 45,
          idempotencyKey: 'ctrl-char-test-key-001',
        },
        rawRequest: { ip: '203.0.113.55', headers: {} },
      },
      {
        getFirestore: () => mockDb,
        Timestamp: { now: () => ({ seconds: 1_800_000_000 }) },
        publicCatalogOrderLimiter: { consume: async () => undefined },
      }
    );

    const saved = documents.get(`catalogOrders/${res.orderId}`)!;
    expect(saved.items[0].customName).not.toMatch(/[\u0000-\u001F\u007F]/);
    expect(saved.items[0].customTheme).not.toMatch(/[\u0000-\u001F\u007F]/);
    expect(saved.customerNotes).not.toMatch(/[\u0000-\u001F\u007F]/);
    expect(saved.customerNotes).toContain('somente após as 18h');
  });
});

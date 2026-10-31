import { describe, expect, it, vi } from 'vitest';

const { AiToolsExecutor } = require('../../functions/ai/tools');
const { executeScopedToolByName } = require('../../functions/mcp/endpoint');
const { AiDataRepositories } = require('../../functions/ai/repositories');

describe('MCP edição de pedidos pelo número apresentado ao usuário', () => {
  const storedOrder = {
    orderNumber: '#2026-0042', userId: 'owner', customerName: 'Cliente Teste',
    productName: 'Caixa personalizada', quantity: 2, totalPrice: 80,
    status: 'pending', version: 3, deliveryDate: '2099-10-18',
  };

  function createExecutor(order = storedOrder) {
    const records = new Map([['orders/order-doc-id', order]]);
    const snapshot = (id: string, coll = 'orders') => ({
      id,
      path: `${coll}/${id}`,
      exists: records.has(`${coll}/${id}`),
      data: () => records.get(`${coll}/${id}`),
    });
    const db = {
      collection: (name: string) => ({
        doc: (id: string) => ({
          id,
          path: `${name}/${id}`,
          get: async () => snapshot(id, name),
        }),
        where: (_field: string, _operator: string, value: string) => ({
          limit: (_count: number) => ({
            get: async () => ({
              docs: [...records.entries()]
                .filter(([path, data]) => path.startsWith(`${name}/`) && data.orderNumber === value)
                .map(([path]) => snapshot(path.split('/').at(-1)!, name)),
            }),
          }),
        }),
      }),
      runTransaction: async (fn: any) => {
        const tx = {
          get: async (ref: any) => {
            const key = ref.path || (ref.id ? `orders/${ref.id}` : '');
            return {
              id: ref.id,
              path: key,
              exists: records.has(key),
              data: () => records.get(key),
            };
          },
          set: (ref: any, data: any) => {
            const key = ref.path || (ref.id ? `orders/${ref.id}` : '');
            records.set(key, data);
          },
          update: (ref: any, data: any) => {
            const key = ref.path || (ref.id ? `orders/${ref.id}` : '');
            const existing = records.get(key) || {};
            records.set(key, { ...existing, ...data });
          },
        };
        return fn(tx);
      },
    };
    const executor = new AiToolsExecutor(new AiDataRepositories(db));
    return Object.assign(executor, { _records: records });
  }

  const scope = {
    uid: 'owner', isAdmin: false, permissions: { orders: { edit: true } }, mcpScopes: ['orders:update'],
  };

  it.each(['#2026-0042', '2026-0042'])('carrega prévia de edição usando o número %s sem exigir ID interno', async (orderNumber) => {
    const executor = createExecutor();
    const form = await executeScopedToolByName(executor, 'get_order_edit_form', { orderNumber }, scope, scope.mcpScopes);
    expect(form).toMatchObject({ state: 'editing', order: { orderNumber: '#2026-0042', version: 3 } });

    const preview = await executeScopedToolByName(executor, 'update_order', {
      orderNumber, notes: 'Ajustar acabamento', expectedVersion: 3,
      idempotencyKey: 'mcp-edit-order-number-test', confirmed: false,
    }, scope, scope.mcpScopes);
    expect(preview).toMatchObject({
      success: true, status: 'preview', requiresConfirmation: true,
      preview: { orderNumber: '#2026-0042', changes: { notes: 'Ajustar acabamento' } },
    });
  });

  it('permite revisar itens com preço unitário e calcula total e quantidade na prévia', async () => {
    const executor = createExecutor();
    const preview = await executeScopedToolByName(executor, 'update_order', {
      orderNumber: '#2026-0042', expectedVersion: 3, confirmed: false,
      items: [
        { name: 'Caixa milk', quantity: 3, unitPrice: 12.5 },
        { name: 'Topo de bolo', quantity: 1, unitPrice: 24.99 },
      ],
    }, scope, scope.mcpScopes);

    expect(preview).toMatchObject({
      status: 'preview',
      preview: {
        changes: {
          quantity: 4,
          productName: 'Caixa milk (3x), Topo de bolo',
          price: 62.49,
          items: [
            { name: 'Caixa milk', quantity: 3, unitPrice: 12.5, price: 37.5 },
            { name: 'Topo de bolo', quantity: 1, unitPrice: 24.99, price: 24.99 },
          ],
        },
        pricing: { mode: 'items', totalPrice: 62.49 },
      },
    });
  });

  it('rejeita itens inválidos e combinações ambíguas com preço ou quantidade geral', async () => {
    const executor = createExecutor();
    const invoke = (args: Record<string, unknown>) => executeScopedToolByName(executor, 'update_order', {
      orderNumber: '#2026-0042', expectedVersion: 3, confirmed: false, ...args,
    }, scope, scope.mcpScopes);

    await expect(invoke({ items: [{ name: 'Item', quantity: 1, unitPrice: -1 }] }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(invoke({ items: [{ name: 'Item', quantity: 1, unitPrice: 10 }], totalPrice: 10 }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(invoke({ items: Array.from({ length: 11 }, (_, index) => ({ name: `Item ${index + 1}`, quantity: 1, unitPrice: 1 })) }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('preserva metadados do item identificado e mostra o antes/depois e itens removidos', async () => {
    const executor = createExecutor({
      ...storedOrder,
      price: 80,
      items: [
        { name: 'Caixa', quantity: 2, unitPrice: 40, price: 80, catalogSnapshotId: 'snap-42' },
        { name: 'Tag', quantity: 1, unitPrice: 0, price: 0 },
      ],
    });
    const form = await executeScopedToolByName(executor, 'get_order_edit_form', { orderNumber: '#2026-0042' }, scope, scope.mcpScopes);
    const preview = await executeScopedToolByName(executor, 'update_order', {
      orderNumber: '#2026-0042', expectedVersion: 3, confirmed: false,
      items: [{ ...form.order.items[0], quantity: 3, unitPrice: 42 }],
    }, scope, scope.mcpScopes);

    expect(preview.preview.changes.items[0]).toMatchObject({ name: 'Caixa', quantity: 3, unitPrice: 42, price: 126 });
    expect(preview.preview.changes.items[0]).not.toHaveProperty('catalogSnapshotId');
    expect(preview.preview.itemChanges).toMatchObject({
      changed: [{
        action: 'updated',
        metadataPreserved: true,
        before: { name: 'Caixa', quantity: 2, unitPrice: 40, subtotal: 80 },
        after: { name: 'Caixa', quantity: 3, unitPrice: 42, subtotal: 126 },
      }],
      removed: [{ name: 'Tag', quantity: 1 }],
    });
  });

  it('sintetiza o item existente com existingIndex 0 para pedidos simples e permite adicionar itens sem erro', async () => {
    // Pedido simples sem items armazenado (apenas productName, quantity, totalPrice)
    const executor = createExecutor();
    const form = await executeScopedToolByName(executor, 'get_order_edit_form', { orderNumber: '#2026-0042' }, scope, scope.mcpScopes);

    // Deve sintetizar o item original com existingIndex 0 e preço unitário correto
    expect(form.order.items).toEqual([
      { existingIndex: 0, name: 'Caixa personalizada', quantity: 2, unitPrice: 40 },
    ]);

    // Ao adicionar 5 itens no valor de 44 reais cada mantendo o existingIndex 0:
    const preview = await executeScopedToolByName(executor, 'update_order', {
      orderNumber: '#2026-0042',
      expectedVersion: 3,
      confirmed: false,
      items: [
        { existingIndex: 0, name: 'Caixa personalizada', quantity: 2, unitPrice: 40 },
        { name: 'Caneca personalizada', quantity: 5, unitPrice: 44 },
      ],
    }, scope, scope.mcpScopes);

    expect(preview.preview.changes).toMatchObject({
      quantity: 7,
      productName: 'Caixa personalizada (2x), Caneca personalizada (5x)',
      price: 300,
      items: [
        { name: 'Caixa personalizada', quantity: 2, unitPrice: 40, price: 80 },
        { name: 'Caneca personalizada', quantity: 5, unitPrice: 44, price: 220 },
      ],
    });
    expect(preview.preview.pricing).toMatchObject({ mode: 'items', totalPrice: 300 });
    expect(preview.preview.itemChanges).toMatchObject({
      changed: [
        {
          action: 'unchanged',
          before: { name: 'Caixa personalizada', quantity: 2, unitPrice: 40, subtotal: 80 },
          after: { name: 'Caixa personalizada', quantity: 2, unitPrice: 40, subtotal: 80 },
        },
        {
          action: 'added',
          after: { name: 'Caneca personalizada', quantity: 5, unitPrice: 44, subtotal: 220 },
        },
      ],
      removed: [],
    });

    // Salvar confirmação com idempotencyKey e confirmed: true
    const confirmedResult = await executeScopedToolByName(executor, 'update_order', {
      orderNumber: '#2026-0042',
      expectedVersion: 3,
      confirmed: true,
      idempotencyKey: 'test-idemp-key-confirm-12345',
      items: [
        { existingIndex: 0, name: 'Caixa personalizada', quantity: 2, unitPrice: 40 },
        { name: 'Caneca personalizada', quantity: 5, unitPrice: 44 },
      ],
    }, scope, scope.mcpScopes);

    expect(confirmedResult).toMatchObject({
      success: true,
      orderNumber: '#2026-0042',
      version: 4,
    });

    const savedOrder = (executor as any)._records.get('orders/order-doc-id');
    expect(savedOrder.pricingMode).toBe('items');
    expect(savedOrder.unitPrice).toBeNull();
    expect(savedOrder.quantity).toBe(7);
    expect(savedOrder.price).toBe(300);
    expect(savedOrder.items).toHaveLength(2);
    expect(savedOrder.items[0]).toMatchObject({ name: 'Caixa personalizada', quantity: 2, unitPrice: 40 });
    expect(savedOrder.items[1]).toMatchObject({ name: 'Caneca personalizada', quantity: 5, unitPrice: 44 });
  });

  it('preserva subtotal exato ao adicionar item em pedido legado com divisão fracionada de centavos', async () => {
    const legacyOrder = {
      orderNumber: '#2026-0099',
      userId: 'owner',
      customerName: 'Cliente Legado',
      productName: 'Etiqueta Adesiva',
      quantity: 120,
      totalPrice: 92.19,
      price: 92.19,
      unitPrice: null,
      status: 'pending',
      version: 1,
      deliveryDate: '2099-10-18',
    };
    const executor = createExecutor(legacyOrder as any);

    const form = await executeScopedToolByName(executor, 'get_order_edit_form', { orderNumber: '#2026-0099' }, scope, scope.mcpScopes);
    expect(form.order.items).toEqual([
      { existingIndex: 0, name: 'Etiqueta Adesiva', quantity: 120, unitPrice: 0.77 },
    ]);

    const preview = await executeScopedToolByName(executor, 'update_order', {
      orderNumber: '#2026-0099',
      expectedVersion: 1,
      items: [
        { existingIndex: 0, name: 'Etiqueta Adesiva', quantity: 120, unitPrice: 0.77 },
        { name: 'Fita Crepe', quantity: 1, unitPrice: 10 },
      ],
    }, scope, scope.mcpScopes);

    expect(preview.preview.pricing.totalPrice).toBe(102.19);
    expect(preview.preview.changes.items[0]).toMatchObject({
      name: 'Etiqueta Adesiva',
      quantity: 120,
      price: 92.19,
    });
    expect(preview.preview.changes.items[1]).toMatchObject({
      name: 'Fita Crepe',
      quantity: 1,
      price: 10,
    });
  });

  describe('add_order_item - inclusão individual de itens via MCP', () => {
    it('gera prévia atômica ao adicionar item a um pedido existente sem sobrescrever o item original', async () => {
      const executor = createExecutor();

      const preview = await executeScopedToolByName(executor, 'add_order_item', {
        orderNumber: '#2026-0042',
        name: 'Caneca personalizada',
        quantity: 5,
        unitPrice: 44,
      }, scope, scope.mcpScopes);

      expect(preview.status).toBe('preview');
      expect(preview.requiresConfirmation).toBe(true);
      expect(preview.preview.pricing).toMatchObject({
        mode: 'items',
        totalPrice: 300,
      });
      expect(preview.preview.changes.items).toHaveLength(2);
      expect(preview.preview.changes.items[0]).toMatchObject({
        name: 'Caixa personalizada',
        quantity: 2,
        unitPrice: 40,
        price: 80,
      });
      expect(preview.preview.changes.items[1]).toMatchObject({
        name: 'Caneca personalizada',
        quantity: 5,
        unitPrice: 44,
        price: 220,
      });
      expect(preview.preview.itemChanges.changed).toMatchObject([
        { action: 'unchanged', before: { name: 'Caixa personalizada' }, after: { name: 'Caixa personalizada' } },
        { action: 'added', after: { name: 'Caneca personalizada', quantity: 5, unitPrice: 44, subtotal: 220 } },
      ]);
      expect(preview.preview.version).toBe(3);
    });

    it('grava o novo item com confirmação, atualiza salesLedger e evita repetição por idempotência', async () => {
      const executor = createExecutor();

      const result = await executeScopedToolByName(executor, 'add_order_item', {
        orderNumber: '#2026-0042',
        name: 'Caneca personalizada',
        quantity: 5,
        unitPrice: 44,
        expectedVersion: 3,
        confirmed: true,
        idempotencyKey: 'idemp-add-item-test-999',
      }, scope, scope.mcpScopes);

      expect(result).toMatchObject({
        success: true,
        orderNumber: '#2026-0042',
        version: 4,
      });

      // 1. Confere o pedido salvo
      const savedOrder = (executor as any)._records.get('orders/order-doc-id');
      expect(savedOrder.pricingMode).toBe('items');
      expect(savedOrder.unitPrice).toBeNull();
      expect(savedOrder.quantity).toBe(7);
      expect(savedOrder.price).toBe(300);
      expect(savedOrder.totalPrice).toBe(300);
      expect(savedOrder.items).toHaveLength(2);
      expect(savedOrder.items[0]).toMatchObject({ name: 'Caixa personalizada', quantity: 2, unitPrice: 40 });
      expect(savedOrder.items[1]).toMatchObject({ name: 'Caneca personalizada', quantity: 5, unitPrice: 44 });

      // 2. Confere o registro correspondente no salesLedger
      const savedLedger = (executor as any)._records.get('salesLedger/order-doc-id');
      expect(savedLedger).toBeDefined();
      expect(savedLedger.amount).toBe(300);
      expect(savedLedger.pricingMode).toBe('items');
      expect(savedLedger.items).toHaveLength(2);
      expect(savedLedger.quantity).toBe(7);

      // 3. Repetição com a mesma chave de idempotência retorna a resposta gravada sem duplicar
      const replayedResult = await executeScopedToolByName(executor, 'add_order_item', {
        orderNumber: '#2026-0042',
        name: 'Caneca personalizada',
        quantity: 5,
        unitPrice: 44,
        expectedVersion: 3,
        confirmed: true,
        idempotencyKey: 'idemp-add-item-test-999',
      }, scope, scope.mcpScopes);

      expect(replayedResult).toMatchObject({
        success: true,
        orderNumber: '#2026-0042',
        version: 4,
      });
      // A versão do pedido no banco permanece 4 (não foi incrementada novamente)
      expect((executor as any)._records.get('orders/order-doc-id').version).toBe(4);
      expect((executor as any)._records.get('orders/order-doc-id').items).toHaveLength(2);
    });

    it('exige expectedVersion na confirmação para prevenir condições de corrida e conflitos de versão', async () => {
      const executor = createExecutor();

      // Confirmação sem expectedVersion é bloqueada
      await expect(executeScopedToolByName(executor, 'add_order_item', {
        orderNumber: '#2026-0042',
        name: 'Item Novo',
        quantity: 1,
        unitPrice: 25,
        confirmed: true,
        idempotencyKey: 'idemp-without-version-1',
      }, scope, scope.mcpScopes)).rejects.toThrow('Informe a versão do pedido (expectedVersion) obtida na prévia para confirmar a alteração.');

      // Confirmação com versão desatualizada é rejeitada
      await expect(executeScopedToolByName(executor, 'add_order_item', {
        orderNumber: '#2026-0042',
        name: 'Item Novo',
        quantity: 1,
        unitPrice: 25,
        expectedVersion: 1, // Versão real é 3
        confirmed: true,
        idempotencyKey: 'idemp-stale-version-1',
      }, scope, scope.mcpScopes)).rejects.toThrow(/versão do pedido mudou/i);
    });

    it('valida argumentos obrigatórios e limites de itens', async () => {
      const executor = createExecutor();

      await expect(executeScopedToolByName(executor, 'add_order_item', {
        orderNumber: '#2026-0042',
        name: '',
        quantity: 1,
        unitPrice: 10,
      }, scope, scope.mcpScopes)).rejects.toThrow('arguments.name é muito curto.');

      await expect(executeScopedToolByName(executor, 'add_order_item', {
        orderNumber: '#2026-0042',
        name: 'Teste',
        quantity: 0,
        unitPrice: 10,
      }, scope, scope.mcpScopes)).rejects.toThrow();

      await expect(executeScopedToolByName(executor, 'add_order_item', {
        orderNumber: '#2026-0042',
        name: 'Teste',
        quantity: 1,
        unitPrice: -5,
      }, scope, scope.mcpScopes)).rejects.toThrow();
    });

    it('preserva nomes de itens existentes com mais de 200 caracteres ao adicionar um novo item', async () => {
      const longName = 'Caixa personalizada de luxo para casamento com acabamento em hot stamping dourado e fita de cetim '.repeat(3).slice(0, 250);
      const orderWithLongName = {
        ...storedOrder,
        productName: longName,
        totalPrice: 100,
        quantity: 1,
      };
      const executor = createExecutor(orderWithLongName);

      const preview = await executeScopedToolByName(executor, 'add_order_item', {
        orderNumber: '#2026-0042',
        name: 'Item adicional '.repeat(10).slice(0, 250),
        quantity: 2,
        unitPrice: 30,
        confirmed: false,
      }, scope, scope.mcpScopes);

      expect(preview.status).toBe('preview');
      expect(preview.preview.changes.items[0].name).toBe(longName);
      expect(preview.preview.changes.items[0].name.length).toBe(250);
      expect(preview.preview.itemChanges.changed[0].action).toBe('unchanged');
      expect(preview.preview.itemChanges.changed[0].before.name).toBe(longName);
    });
  });
});

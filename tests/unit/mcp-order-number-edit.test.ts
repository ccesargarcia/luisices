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
    const snapshot = (id: string) => ({
      id,
      exists: records.has(`orders/${id}`),
      data: () => records.get(`orders/${id}`),
    });
    const db = {
      collection: (name: string) => ({
        doc: (id: string) => ({ get: async () => snapshot(id) }),
        where: (_field: string, _operator: string, value: string) => ({
          limit: (_count: number) => ({
            get: async () => ({
              docs: [...records.entries()]
                .filter(([path, data]) => path.startsWith(`${name}/`) && data.orderNumber === value)
                .map(([path]) => snapshot(path.split('/').at(-1)!)),
            }),
          }),
        }),
      }),
    };
    const executor = new AiToolsExecutor(new AiDataRepositories(db));
    return executor;
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
});

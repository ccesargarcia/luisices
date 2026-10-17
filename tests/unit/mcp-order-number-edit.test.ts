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

  function createExecutor() {
    const records = new Map([['orders/order-doc-id', storedOrder]]);
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
});

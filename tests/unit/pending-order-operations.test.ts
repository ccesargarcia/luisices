import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

let storage: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  storage = new Map();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('Operações pendentes: identidade e payload duráveis', () => {
  it('restaura após reload o mesmo ID e a mesma data, sem depender do objeto editável', async () => {
    const first = await import('../../src/services/pendingOrderOperations');
    const payload = { price: 10, paymentDate: '2026-10-25T10:00:00Z', tags: ['Original'] };
    const saved = first.savePendingOrderOperation('uid', 'new-order', payload);
    payload.price = 20;
    payload.tags.push('Outra');
    vi.resetModules(); // Simulate a new page/module instance reading session storage.
    const restored = (await import('../../src/services/pendingOrderOperations')).loadPendingOrderOperation('uid', 'new-order');
    expect(restored).toEqual(saved);
    expect(restored?.payload).toEqual({ price: 10, paymentDate: '2026-10-25T10:00:00Z', tags: ['Original'] });
  });

  it('isola usuários e fluxos, mesmo com conteúdo igual', async () => {
    const api = await import('../../src/services/pendingOrderOperations');
    const first = api.savePendingOrderOperation('uid', 'calculator', { price: 10 });
    const other = api.savePendingOrderOperation('uid', 'new-order', { price: 10 });
    expect(first.id).not.toBe(other.id);
    expect(api.loadPendingOrderOperation('another-user', 'calculator')).toBeNull();
    expect(api.loadPendingOrderOperation('uid', 'calculator')?.id).toBe(first.id);
  });

  it('uma nova intenção após confirmação recebe outra chave', async () => {
    const api = await import('../../src/services/pendingOrderOperations');
    const first = api.savePendingOrderOperation('uid', 'calculator', { price: 10 });
    api.clearPendingOrderOperation('uid', 'calculator');
    expect(api.loadPendingOrderOperation('uid', 'calculator')).toBeNull();
    const second = api.savePendingOrderOperation('uid', 'calculator', { price: 10 });
    expect(second.id).not.toBe(first.id);
  });

  it('preserva retry em memória se sessionStorage não estiver disponível', async () => {
    vi.stubGlobal('sessionStorage', { getItem() { throw new Error('disabled'); }, setItem() { throw new Error('disabled'); } });
    const api = await import('../../src/services/pendingOrderOperations');
    const saved = api.savePendingOrderOperation('uid', 'edit:order', { price: 20 });
    expect(api.loadPendingOrderOperation('uid', 'edit:order')).toEqual(saved);
  });

  it('trata erro de validação local como rejeição definitiva do pedido', async () => {
    const api = await import('../../src/services/pendingOrderOperations');
    expect(api.isDefinitiveOrderRejection(Object.assign(new Error('Nome do produto inválido'), {
      code: 'invalid-argument',
    }))).toBe(true);
  });
});

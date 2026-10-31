import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

const { AiToolsExecutor } = require('../../functions/ai/tools');
const { validateToolArguments } = require('../../functions/mcp/validation');
const { executeScopedToolByName } = require('../../functions/mcp/endpoint');

describe('MCP create_order: compatibilidade e gravação idempotente', () => {
  const scope = { uid: 'owner', isAdmin: false, permissions: { orders: { create: true } }, mcpScopes: ['orders:create', 'payments:write'] };
  const args = {
    customerName: 'Cliente sintético', customerPhone: '119999922222', productName: 'Produto sintético',
    quantity: 1, totalPrice: 399, paidAmount: 0, paymentMethod: 'pix', deliveryDate: '2099-10-18', idempotencyKey: 'mcp-create-order-test',
  };
  let documents: Map<string, any>;
  let executor: any;
  let transaction: any;
  let db: any;

  beforeEach(() => {
    documents = new Map();
    let nextId = 0;
    const reference = (path: string) => ({ path, id: path.split('/').at(-1) });
    transaction = {
      get: vi.fn(async (ref: any) => ({ exists: documents.has(ref.path), data: () => documents.get(ref.path) })),
      set: vi.fn((ref: any, data: any) => documents.set(ref.path, data)),
    };
    db = {
      collection: (name: string) => ({ doc: (id?: string) => reference(`${name}/${id || `generated-${++nextId}`}`) }),
      doc: reference,
      runTransaction: vi.fn(async (callback: any) => callback(transaction)),
    };
    executor = new AiToolsExecutor({ db, getScopedCustomers: vi.fn(async () => ({ customers: [] })) });
  });

  const orderDocuments = () => [...documents.entries()].filter(([path]) => path.startsWith('orders/'));

  it('grava a chamada do schema antigo, sem confirmed, em uma transação com contador e idempotência', async () => {
    const result = await executeScopedToolByName(executor, 'create_order', { ...args }, scope, scope.mcpScopes);
    expect(result).toMatchObject({ success: true, status: 'pending', orderId: 'generated-1', isDuplicate: false, remainingAmount: 399 });
    expect(db.runTransaction).toHaveBeenCalledOnce();
    expect(orderDocuments()).toHaveLength(1);
    expect(documents.get('orders/generated-1')).toMatchObject({ userId: scope.uid, source: 'chatgpt-mcp', totalPrice: 399, version: 1 });
    expect(documents.get('users/owner/metadata/counters')).toEqual({ orderCounter: 1 });
    expect([...documents.keys()].filter((path) => path.startsWith('mcpIdempotency/'))).toHaveLength(1);
  });

  it('grava pedido com pricingMode="total" e unitPrice=null quando não divisível em centavos exatos', async () => {
    await executor.executeCreateOrder({
      ...args,
      quantity: 120,
      totalPrice: 92.19,
      idempotencyKey: 'mcp-create-120-units',
      confirmed: true,
    }, scope);

    const created = documents.get('orders/generated-1');
    expect(created).toMatchObject({
      quantity: 120,
      price: 92.19,
      pricingMode: 'total',
      unitPrice: null,
      items: null,
    });
  });

  it.each([false, 'false'])('confirmed=%s retorna somente prévia e não inicia transação', async (confirmed) => {
    const result = await executor.executeCreateOrder(validateToolArguments('create_order', { ...args, confirmed }), scope);
    expect(result).toMatchObject({ success: true, status: 'preview', requiresConfirmation: true, preview: { totalPrice: 399 } });
    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(documents.size).toBe(0);
  });

  it('permite confirmar a prévia com a mesma chave, sem criar antes da confirmação', async () => {
    await executor.executeCreateOrder({ ...args, confirmed: false }, scope);
    const saved = await executor.executeCreateOrder({ ...args, confirmed: true }, scope);
    expect(saved).toMatchObject({ success: true, status: 'pending', isDuplicate: false });
    expect(orderDocuments()).toHaveLength(1);
  });

  it('cria pedido sem sinal com apenas orders:create e confirma a gravação do backend', async () => {
    const { paymentMethod: _paymentMethod, ...orderWithoutPayment } = args;
    const createScope = { ...scope, mcpScopes: ['orders:create'] };
    const preview = await executor.executeCreateOrder({ ...orderWithoutPayment, confirmed: false }, createScope);
    expect(preview).toMatchObject({ success: true, status: 'preview', requiresConfirmation: true });
    expect(db.runTransaction).not.toHaveBeenCalled();

    const saved = await executeScopedToolByName(executor, 'create_order', { ...orderWithoutPayment, confirmed: true }, createScope, createScope.mcpScopes);
    expect(saved).toMatchObject({ success: true, orderId: 'generated-1', orderNumber: expect.stringMatching(/^#\d{4}-0001$/) });
    expect(db.runTransaction).toHaveBeenCalledOnce();
    expect(orderDocuments()).toHaveLength(1);
  });

  it.each([undefined, true, 'true'])('repetição com confirmed=%s retorna o ID original sem duplicar', async (confirmed) => {
    const first = await executor.executeCreateOrder({ ...args, confirmed: true }, scope);
    transaction.set.mockClear();
    const repeated = await executor.executeCreateOrder({ ...args, ...(confirmed === undefined ? {} : { confirmed }) }, scope);
    expect(repeated).toMatchObject({ orderId: first.orderId, orderNumber: first.orderNumber, isDuplicate: true });
    expect(transaction.set).not.toHaveBeenCalled();
    expect(orderDocuments()).toHaveLength(1);
    expect(documents.get('users/owner/metadata/counters')).toEqual({ orderCounter: 1 });
  });

  it('preserva o hash dos registros existentes com confirmed=true', async () => {
    await executor.executeCreateOrder(args, scope);
    const canonical = (value: any): string => value && typeof value === 'object'
      ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
      : JSON.stringify(value);
    const { idempotencyKey, ...payload } = args;
    const expected = createHash('sha256').update(canonical({ ...payload, confirmed: true })).digest('hex');
    const stored = [...documents.entries()].find(([path]) => path.startsWith('mcpIdempotency/'))![1];
    expect(stored.payloadHash).toBe(expected);
  });

  it('recusa reutilização da chave com dados diferentes', async () => {
    await executor.executeCreateOrder(args, scope);
    await expect(executor.executeCreateOrder({ ...args, totalPrice: 400 }, scope)).rejects.toMatchObject({ code: 'already-exists' });
    expect(orderDocuments()).toHaveLength(1);
  });

  it.each([null, 1, '1', 'yes'])('recusa confirmação inválida %s sem gravar', async (confirmed) => {
    await expect(executor.executeCreateOrder({ ...args, confirmed }, scope)).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(db.runTransaction).not.toHaveBeenCalled();
  });

  it('mantém a exigência de chave válida para clientes antigos', async () => {
    await expect(executor.executeCreateOrder({ ...args, idempotencyKey: '' }, scope)).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(db.runTransaction).not.toHaveBeenCalled();
  });

  it('mantém a permissão de criação por perfil', async () => {
    await expect(executor.executeCreateOrder(args, { ...scope, permissions: {} })).rejects.toMatchObject({ code: 'permission-denied' });
    expect(db.runTransaction).not.toHaveBeenCalled();
  });

  it('mantém o escopo OAuth de criação no adaptador compartilhado entre HTTP e MCP', async () => {
    await expect(executeScopedToolByName(executor, 'create_order', { ...args }, scope, ['orders:read']))
      .rejects.toMatchObject({ code: 'permission-denied' });
    expect(db.runTransaction).not.toHaveBeenCalled();
  });

  it('mantém a permissão adicional para informar pagamento', async () => {
    await expect(executor.executeCreateOrder(args, { ...scope, mcpScopes: ['orders:create'] })).rejects.toMatchObject({ code: 'permission-denied' });
    expect(db.runTransaction).not.toHaveBeenCalled();
  });

  it('não grava quando o banco não oferece transação', async () => {
    delete db.runTransaction;
    await expect(executor.executeCreateOrder(args, scope)).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(documents.size).toBe(0);
  });

  it('sincroniza salesLedger, estatísticas do cliente e usa payment.status="paid" e método válido quando pago integralmente', async () => {
    documents.set('customers/cust-1', { id: 'cust-1', name: 'Cliente sintético', phone: '55119999922222', totalOrders: 2, totalSpent: 100 });
    executor = new AiToolsExecutor({
      db,
      getScopedCustomers: vi.fn(async () => ({
        customers: [{ id: 'cust-1', name: 'Cliente sintético', phone: '55119999922222' }],
      })),
    });

    const { paymentMethod: _pm, ...withoutMethod } = args;
    const result = await executor.executeCreateOrder({
      ...withoutMethod,
      paidAmount: 399,
      idempotencyKey: 'mcp-create-paid-order-test',
      confirmed: true,
    }, scope);

    expect(result).toMatchObject({ success: true, orderId: 'generated-1', remainingAmount: 0 });
    const createdOrder = documents.get('orders/generated-1');
    expect(createdOrder.payment).toMatchObject({
      status: 'paid',
      method: 'pix',
      totalAmount: 399,
      paidAmount: 399,
      remainingAmount: 0,
      history: [expect.objectContaining({ amount: 399, method: 'pix' })],
    });
    expect(typeof createdOrder.createdAt).not.toBe('string');

    const createdLedger = documents.get('salesLedger/generated-1');
    expect(createdLedger).toMatchObject({
      orderId: 'generated-1',
      amount: 399,
      paidAmount: 399,
      paymentStatus: 'paid',
      paymentMethod: 'pix',
      customerId: 'cust-1',
      source: 'chatgpt-mcp',
      isDeletedFromOrders: false,
    });

    const updatedCustomer = documents.get('customers/cust-1');
    expect(updatedCustomer).toMatchObject({
      totalOrders: 3,
      totalSpent: 499,
    });
  });

  it('normaliza paymentMethod="outro" anunciado no schema para método canônico válido', async () => {
    const validated = validateToolArguments('create_order', {
      ...args,
      paymentMethod: 'outro',
      paidAmount: 50,
      idempotencyKey: 'mcp-create-outro-method',
      confirmed: true,
    });
    expect(validated.paymentMethod).toBe('outro');

    await executor.executeCreateOrder(validated, scope);
    const createdOrder = documents.get('orders/generated-1');
    expect(createdOrder.payment.method).toBe('transfer');
    expect(createdOrder.payment.history[0].method).toBe('transfer');
    const createdLedger = documents.get('salesLedger/generated-1');
    expect(createdLedger.paymentMethod).toBe('transfer');
  });
});

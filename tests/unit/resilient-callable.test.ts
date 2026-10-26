import { describe, it, expect, vi, beforeEach } from 'vitest';

const { callable, getDoc, getDocFromServer, runTransaction } = vi.hoisted(() => ({
  callable: vi.fn(), getDoc: vi.fn(), getDocFromServer: vi.fn(), runTransaction: vi.fn(),
}));
vi.mock('../../src/lib/firebase', () => ({
  db: {}, auth: { currentUser: { uid: 'user-1' } }, functions: { customDomain: 'api.luisices.com.br' },
}));
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn(() => callable) }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, coll) => ({ coll })),
  doc: vi.fn((_db, coll, id) => ({ coll, id: id || 'new-operation-id' })),
  getDoc, getDocFromServer, runTransaction,
  getDocs: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), addDoc: vi.fn(),
  query: vi.fn(), where: vi.fn(), orderBy: vi.fn(), Timestamp: { now: vi.fn() },
}));
import { firebaseOrderService } from '../../src/services/firebaseOrderService';

const order = { userId: 'user-1', customerName: 'Cliente', productName: 'Produto', quantity: 1,
  price: 100, deliveryDate: '2026-12-10', status: 'pending', version: 2 };
const snapshot = (data = order, id = 'create-key') => ({ id, exists: () => true, data: () => data });
const timeout = () => Object.assign(new Error('Gateway Timeout'), { code: 'functions/deadline-exceeded' });

beforeEach(() => {
  vi.clearAllMocks();
  callable.mockReset(); getDocFromServer.mockReset(); getDoc.mockReset();
  getDoc.mockResolvedValue(snapshot());
});

describe('Pedidos: confirmação autoritativa de operações pendentes', () => {
  it('cria pelo backend e lê o resultado diretamente do servidor', async () => {
    callable.mockResolvedValue({ data: { success: true, orderId: 'create-key' } });
    getDocFromServer.mockResolvedValue(snapshot());
    expect((await firebaseOrderService.createOrder(order as any, undefined, undefined, 'create-key')).id).toBe('create-key');
    expect(callable).toHaveBeenCalledOnce();
    expect(getDocFromServer).toHaveBeenCalledOnce();
  });

  it('não confirma payload diferente somente porque um documento com a chave existe', async () => {
    getDocFromServer.mockResolvedValue(snapshot());
    callable.mockRejectedValue(Object.assign(new Error('Dados diferentes'), { code: 'functions/failed-precondition' }));
    await expect(firebaseOrderService.createOrder({ ...order, price: 200 } as any, undefined, undefined, 'create-key'))
      .rejects.toThrow('Dados diferentes');
    expect(callable).toHaveBeenCalledOnce();
    expect(getDocFromServer).not.toHaveBeenCalled();
  });

  it('timeout mantém a identidade; retry reenvia a mesma operação para o backend', async () => {
    callable.mockRejectedValueOnce(timeout()).mockResolvedValueOnce({ data: { success: true, orderId: 'create-key' } });
    await expect(firebaseOrderService.createOrder(order as any, undefined, undefined, 'create-key'))
      .rejects.toMatchObject({ code: 'unconfirmed-order', idempotencyKey: 'create-key' });
    expect(getDocFromServer).not.toHaveBeenCalled();
    getDocFromServer.mockResolvedValue(snapshot());
    await firebaseOrderService.createOrder(order as any, undefined, undefined, 'create-key');
    expect(callable.mock.calls[0][0]).toEqual(callable.mock.calls[1][0]);
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it('leitura falha após sucesso: mantém a chave para confirmar por replay posterior', async () => {
    callable.mockResolvedValue({ data: { success: true, orderId: 'create-key' } });
    getDocFromServer.mockRejectedValue(new Error('offline'));
    await expect(firebaseOrderService.createOrder(order as any, undefined, undefined, 'create-key'))
      .rejects.toMatchObject({ code: 'unconfirmed-order', idempotencyKey: 'create-key' });
  });

  it('resposta inválida da criação não libera gravação direta nem informa sucesso', async () => {
    callable.mockResolvedValue({ data: {} });
    await expect(firebaseOrderService.createOrder(order as any, undefined, undefined, 'create-key'))
      .rejects.toMatchObject({ code: 'unconfirmed-order', idempotencyKey: 'create-key' });
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it('duplicação retoma o payload original mesmo se o pedido de origem mudar depois do timeout', async () => {
    callable.mockRejectedValueOnce(timeout()).mockResolvedValueOnce({ data: { success: true, orderId: 'duplicate-key' } });
    await expect(firebaseOrderService.duplicateOrder('source-order', 'duplicate-key')).rejects.toMatchObject({ code: 'unconfirmed-order' });
    getDoc.mockResolvedValue(snapshot({ ...order, price: 500 }));
    getDocFromServer.mockResolvedValue(snapshot(order, 'duplicate-key'));
    await firebaseOrderService.duplicateOrder('source-order', 'duplicate-key');
    expect(callable.mock.calls[1][0]).toEqual(callable.mock.calls[0][0]);
    expect(callable.mock.calls[1][0].orderData.price).toBe(100);
  });

  it('duas intenções iguais com chaves distintas são enviadas como operações diferentes', async () => {
    callable.mockResolvedValue({ data: { success: true, orderId: 'created' } });
    getDocFromServer.mockResolvedValue(snapshot(order, 'created'));
    await firebaseOrderService.createOrder(order as any, undefined, undefined, 'intent-one');
    await firebaseOrderService.createOrder(order as any, undefined, undefined, 'intent-two');
    expect(callable.mock.calls.map(([request]) => request.idempotencyKey)).toEqual(['intent-one', 'intent-two']);
  });

  it('edição pendente continua na Function mesmo quando os valores já estão no pedido', async () => {
    callable.mockResolvedValue({ data: { success: true, alreadyApplied: true } });
    await firebaseOrderService.updateOrder('order-1', { price: 100 }, 1, 'edit-one');
    expect(callable).toHaveBeenCalledWith(expect.objectContaining({ operationId: 'edit-one', expectedVersion: 1 }));
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it('não deduz sucesso pelo lastOperationId nem pelos campos após timeout', async () => {
    callable.mockRejectedValue(timeout());
    getDocFromServer.mockResolvedValue(snapshot({ ...order, price: 200, version: 3, lastOperationId: 'edit-one' } as any));
    await expect(firebaseOrderService.updateOrder('order-1', { price: 200 }, 2, 'edit-one'))
      .rejects.toMatchObject({ code: 'unconfirmed-update', operationId: 'edit-one' });
    expect(getDocFromServer).not.toHaveBeenCalled();
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it('resposta inválida da edição mantém a operação pendente', async () => {
    callable.mockResolvedValue({ data: {} });
    await expect(firebaseOrderService.updateOrder('order-1', { price: 200 }, 2, 'edit-one'))
      .rejects.toMatchObject({ code: 'unconfirmed-update', operationId: 'edit-one' });
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it.each(['functions/failed-precondition', 'functions/permission-denied', 'functions/invalid-argument'])(
    'preserva erro definitivo %s, sem transformá-lo em sucesso ou timeout', async (code) => {
      const error = Object.assign(new Error('Rejeitado pelo servidor'), { code });
      callable.mockRejectedValue(error);
      await expect(firebaseOrderService.updateOrder('order-1', { price: 200 }, 2, 'edit-one')).rejects.toBe(error);
      expect(getDocFromServer).not.toHaveBeenCalled();
    },
  );
});

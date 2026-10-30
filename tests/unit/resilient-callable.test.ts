import { describe, it, expect, vi, beforeEach } from 'vitest';

const { callable, getDoc, getDocFromServer, runTransaction } = vi.hoisted(() => ({
  callable: vi.fn(), getDoc: vi.fn(), getDocFromServer: vi.fn(), runTransaction: vi.fn(),
}));
vi.mock('../../src/lib/firebase', () => ({
  db: {}, auth: { currentUser: { uid: 'user-1' } },
  functions: { customDomain: 'api.luisices.com.br' },
}));
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => callable),
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, coll) => ({ coll })),
  doc: vi.fn((_db, coll, id) => ({ coll, id: id || 'new-operation-id' })),
  getDoc, getDocFromServer, runTransaction,
  getDocs: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), addDoc: vi.fn(),
  query: vi.fn(), where: vi.fn(), orderBy: vi.fn(), Timestamp: { now: vi.fn() },
}));
import {
  firebaseOrderService,
  isTransientCallableError,
  isGatewayUnavailableError,
} from '../../src/services/firebaseOrderService';

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

  it('na criação, timeout ou falha de transporte preserva estado inconcluso com chave determinística para retry via gateway', async () => {
    callable.mockRejectedValue(timeout());

    await expect(firebaseOrderService.createOrder(order as any, undefined, undefined, 'my-idempotency-key'))
      .rejects.toMatchObject({
        code: 'unconfirmed-order',
        idempotencyKey: 'my-idempotency-key',
      });
    expect(callable).toHaveBeenCalledOnce();
  });

  it('na edição, timeout preserva operação inconclusiva e não tenta uma rota alternativa', async () => {
    callable.mockRejectedValue(timeout());

    await expect(firebaseOrderService.updateOrder('order-1', { price: 200 }, 2, 'edit-timeout-op'))
      .rejects.toMatchObject({
        code: 'unconfirmed-update',
        operationId: 'edit-timeout-op',
        isUnconfirmed: true,
      });
    expect(callable).toHaveBeenCalledOnce();
    expect(callable).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 'order-1',
      expectedVersion: 2,
      operationId: 'edit-timeout-op',
    }));
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it('não altera fluxo para erro definitivo de validação ou permissão no gateway', async () => {
    const error = Object.assign(new Error('Payload inválido'), { code: 'functions/invalid-argument' });
    callable.mockRejectedValue(error);

    await expect(firebaseOrderService.createOrder(order as any, undefined, undefined, 'my-idem-key'))
      .rejects.toBe(error);
    expect(callable).toHaveBeenCalledOnce();
  });

  it('erro interno genérico do backend preserva estado inconcluso com a chave da operação', async () => {
    const internalBackendBug = Object.assign(new Error('Cannot read properties of undefined (reading calculateDiscount)'), {
      code: 'functions/internal',
    });
    callable.mockRejectedValue(internalBackendBug);

    await expect(firebaseOrderService.createOrder(order as any, undefined, undefined, 'my-idem-key'))
      .rejects.toMatchObject({
        code: 'unconfirmed-order',
        idempotencyKey: 'my-idem-key',
      });
    expect(callable).toHaveBeenCalledOnce();
  });

  it('falha transitória 502/504 da Cloudflare preserva estado inconcluso para retry idempotente pelo gateway', async () => {
    const cloudflare502 = Object.assign(new Error('502 Bad Gateway - Cloudflare proxy error'), {
      code: 'functions/unavailable',
      status: 502,
    });
    callable.mockRejectedValue(cloudflare502);

    await expect(firebaseOrderService.createOrder(order as any, undefined, undefined, 'cf-idem-key'))
      .rejects.toMatchObject({
        code: 'unconfirmed-order',
        idempotencyKey: 'cf-idem-key',
      });
    expect(callable).toHaveBeenCalledOnce();
  });
});

describe('Classificação de Erros Transitórios de Callable (isTransientCallableError)', () => {
  it('mantém isGatewayUnavailableError como alias para isTransientCallableError', () => {
    expect(isGatewayUnavailableError).toBe(isTransientCallableError);
  });

  it('identifica códigos canônicos de indisponibilidade e timeout', () => {
    expect(isTransientCallableError({ code: 'functions/unavailable' })).toBe(true);
    expect(isTransientCallableError({ code: 'unavailable' })).toBe(true);
    expect(isTransientCallableError({ code: 'functions/deadline-exceeded' })).toBe(true);
    expect(isTransientCallableError({ code: 'functions/network-request-failed' })).toBe(true);
  });

  it('identifica falhas de rede típicas do navegador', () => {
    expect(isTransientCallableError(new Error('Failed to fetch'))).toBe(true);
    expect(isTransientCallableError(new Error('NetworkError when attempting to fetch resource'))).toBe(true);
    expect(isTransientCallableError(new Error('net::ERR_CONNECTION_TIMED_OUT'))).toBe(true);
    expect(isTransientCallableError(new Error('Network request failed'))).toBe(true);
  });

  it('identifica códigos e mensagens específicos de gateway/Cloudflare', () => {
    expect(isTransientCallableError({ status: 502, message: 'Bad Gateway' })).toBe(true);
    expect(isTransientCallableError({ customData: { status: 504 } })).toBe(true);
    expect(isTransientCallableError(new Error('Cloudflare 524 A timeout occurred'))).toBe(true);
    expect(isTransientCallableError(new Error('502 Bad Gateway from cloudflare edge'))).toBe(true);
  });

  it('NÃO classifica erros definitivos de aplicação/negócio como falha transitória', () => {
    expect(isTransientCallableError({ code: 'functions/invalid-argument', message: 'Item 502 inválido' })).toBe(false);
    expect(isTransientCallableError({ code: 'functions/permission-denied', message: 'Sem permissão' })).toBe(false);
    expect(isTransientCallableError({ code: 'functions/unauthenticated', message: 'Faça login' })).toBe(false);
    expect(isTransientCallableError({ code: 'functions/failed-precondition', message: 'Versão em conflito' })).toBe(false);
    expect(isTransientCallableError({ code: 'functions/already-exists', message: 'Pedido já existe' })).toBe(false);
    expect(isTransientCallableError({ code: 'functions/not-found', message: 'Pedido não encontrado' })).toBe(false);
  });

  it('NÃO classifica erro interno genérico do backend (sem sinal de gateway) como falha transitória de gateway', () => {
    expect(isTransientCallableError({ code: 'functions/internal', message: 'Null pointer exception in handler' })).toBe(false);
    expect(isTransientCallableError({ code: 'functions/unknown', message: 'Erro ao conectar ao banco de dados' })).toBe(false);
    expect(isTransientCallableError({ code: 'functions/internal', message: 'Erro no cálculo do item 502' })).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
const {
  checkBindingRequestRateLimit,
  checkOrderCreationRateLimit,
  checkPairingRateLimit,
} = require('../../../functions/alexa/rateLimit');

describe('Alexa: Rate Limiter Distribuído (Firestore)', () => {
  const createMockDb = () => {
    const store: Record<string, any> = {};

    return {
      store,
      collection: (col: string) => ({
        doc: (id: string) => ({
          get: async () => ({
            exists: Boolean(store[id]),
            data: () => store[id] || null,
          }),
        }),
      }),
      runTransaction: async (cb: any) => {
        const transaction = {
          get: async (ref: any) => ref.get(),
          set: (ref: any, data: any, options: any) => {
            // ref id extraído de doc
            const id = ref.get().then ? undefined : ref.id;
            // Para nosso mock simplificado:
          },
        };
        // Implementar transação simples sobre o store
        const customTx = {
          get: async (docRef: any) => docRef.get(),
          set: (docRef: any, data: any, options: any) => {
            // intercept set
          },
        };
        return cb({
          get: async (docRef: any) => {
            const snap = await docRef.get();
            return snap;
          },
          set: (docRef: any, data: any, options: any) => {
            // Salvar no store
            const key = Object.keys(store).find((k) => store[k] === data) || ('b_' + Math.random().toString(36).slice(2));
            store[key] = options?.merge ? { ...store[key], ...data } : data;
          },
        });
      },
    };
  };

  it('deve limitar requisições consecutivas quando exceder o teto por minuto', async () => {
    const memoryStore: Record<string, any> = {};

    const mockDb = {
      collection: () => ({
        doc: (id: string) => ({
          id,
          get: async () => ({
            exists: Boolean(memoryStore[id]),
            data: () => memoryStore[id] || null,
          }),
        }),
      }),
      runTransaction: async (cb: any) => {
        return cb({
          get: async (ref: any) => ref.get(),
          set: (ref: any, data: any) => {
            memoryStore[ref.id] = { ...memoryStore[ref.id], ...data };
          },
        });
      },
    };

    const bindingKey = 'binding-rate-test-1';

    // Fazer 30 requisições: todas devem ser permitidas
    for (let i = 1; i <= 30; i++) {
      const res = await checkBindingRequestRateLimit(mockDb as any, bindingKey);
      expect(res.allowed).toBe(true);
      expect(res.currentCount).toBe(i);
    }

    // A 31ª requisição deve ser bloqueada
    const blockedRes = await checkBindingRequestRateLimit(mockDb as any, bindingKey);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.currentCount).toBe(30);
  });

  it('deve limitar criação de pedidos se exceder 10 pedidos na mesma hora', async () => {
    const memoryStore: Record<string, any> = {};

    const mockDb = {
      collection: () => ({
        doc: (id: string) => ({
          id,
          get: async () => ({
            exists: Boolean(memoryStore[id]),
            data: () => memoryStore[id] || null,
          }),
        }),
      }),
      runTransaction: async (cb: any) => {
        return cb({
          get: async (ref: any) => ref.get(),
          set: (ref: any, data: any) => {
            memoryStore[ref.id] = { ...memoryStore[ref.id], ...data };
          },
        });
      },
    };

    const uid = 'uid-amanda-orders-rate';

    // 10 pedidos permitidos
    for (let i = 1; i <= 10; i++) {
      const res = await checkOrderCreationRateLimit(mockDb as any, uid);
      expect(res.allowed).toBe(true);
    }

    // 11º pedido bloqueado na hora
    const blocked = await checkOrderCreationRateLimit(mockDb as any, uid);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toContain('hora');
  });

  it('deve limitar tentativas de pareamento se exceder 5 por hora no mesmo aparelho', async () => {
    const memoryStore: Record<string, any> = {};

    const mockDb = {
      collection: () => ({
        doc: (id: string) => ({
          id,
          get: async () => ({
            exists: Boolean(memoryStore[id]),
            data: () => memoryStore[id] || null,
          }),
        }),
      }),
      runTransaction: async (cb: any) => {
        return cb({
          get: async (ref: any) => ref.get(),
          set: (ref: any, data: any) => {
            memoryStore[ref.id] = { ...memoryStore[ref.id], ...data };
          },
        });
      },
    };

    const deviceId = 'echo-device-ratelimit';

    // 5 pareamentos permitidos
    for (let i = 1; i <= 5; i++) {
      const res = await checkPairingRateLimit(mockDb as any, deviceId);
      expect(res.allowed).toBe(true);
    }

    // 6º pareamento bloqueado
    const blocked = await checkPairingRateLimit(mockDb as any, deviceId);
    expect(blocked.allowed).toBe(false);
  });
});

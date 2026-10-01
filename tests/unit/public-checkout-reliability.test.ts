import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory Firestore mock store
const mockDb = new Map<string, any>();

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'user-admin', email: 'admin@example.com' } },
  functions: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn((_functions, name) => {
    return async (data: any) => {
      if (name === 'submitPublicCatalogOrder') {
        return mockSubmitOrder(data);
      }
      throw new Error(`Unknown function: ${name}`);
    };
  }),
}));

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((_db, coll) => ({ coll, path: coll })),
    doc: vi.fn((_db, ...parts: string[]) => {
      let fullPath = '';
      if (typeof parts[0] === 'object' && parts[0] !== null && 'path' in parts[0]) {
        const coll = (parts[0] as any).path;
        const id = parts[1] || `auto_${Date.now()}`;
        fullPath = `${coll}/${id}`;
        return { path: fullPath, id, coll };
      }
      fullPath = parts.join('/');
      const segs = fullPath.split('/');
      const id = segs[segs.length - 1];
      const coll = segs.slice(0, segs.length - 1).join('/');
      return { path: fullPath, id, coll };
    }),
    getDoc: vi.fn(async (ref: any) => {
      const data = mockDb.get(ref.path);
      return {
        exists: () => !!data,
        id: ref.id,
        data: () => (data ? { ...data } : undefined),
      };
    }),
    getDocs: vi.fn(async (q: any) => {
      const coll = q.coll || q.path || '';
      const docs: any[] = [];
      for (const [key, val] of mockDb.entries()) {
        if (key.startsWith(`${coll}/`)) {
          docs.push({
            id: key.replace(`${coll}/`, ''),
            data: () => ({ ...val }),
          });
        }
      }
      return { docs };
    }),
    addDoc: vi.fn(async (ref: any, data: any) => {
      const id = `order_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const fullPath = `${ref.path}/${id}`;
      mockDb.set(fullPath, { ...data });
      return { id, path: fullPath };
    }),
    updateDoc: vi.fn(async (ref: any, data: any) => {
      const existing = mockDb.get(ref.path) || {};
      mockDb.set(ref.path, { ...existing, ...data });
    }),
    deleteDoc: vi.fn(async (ref: any) => {
      mockDb.delete(ref.path);
    }),
    query: vi.fn((coll) => coll),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onSnapshot: vi.fn(),
    Timestamp: {
      now: () => ({
        toDate: () => new Date('2026-10-01T12:00:00Z'),
        toISOString: () => '2026-10-01T12:00:00Z',
      }),
    },
  };
});

const mockCreateOrder = vi.fn();
vi.mock('../../src/services/firebaseOrderService', () => ({
  firebaseOrderService: {
    createOrder: (...args: any[]) => mockCreateOrder(...args),
  },
}));

let mockSubmitOrder: any;

import { firebaseCatalogOrderService } from '../../src/services/firebaseCatalogOrderService';

describe('Etapa 7: Checkout Público Confiável (Achado 13)', () => {
  beforeEach(() => {
    mockDb.clear();
    mockCreateOrder.mockReset();

    // Estado padrão da Lojinha: Aberta e com produtos ativos
    mockDb.set('storeSettings/public', {
      storePublished: true,
      catalogOrdersDisabled: false,
    });

    mockDb.set('storeProducts/prod-mug', {
      name: 'Caneca Personalizada Criativa',
      price: 45.0,
      status: 'active',
      leadTimeDays: 3,
      imageUrl: 'https://example.com/mug.jpg',
    });

    mockDb.set('storeProducts/prod-agenda', {
      name: 'Agenda 2027 Floral',
      price: 89.9,
      status: 'active',
      leadTimeDays: 5,
    });

    mockSubmitOrder = vi.fn(async (data: any) => {
      const { items, submittedSubtotal, idempotencyKey } = data;

      // 1. Loja aberta?
      const settings = mockDb.get('storeSettings/public') || {};
      if (settings.storePublished === false) {
        const err = new Error('A lojinha online está temporariamente indisponível para novos pedidos.');
        (err as any).code = 'functions/failed-precondition';
        throw err;
      }
      if (settings.catalogOrdersDisabled === true) {
        const err = new Error('Os pedidos online estão desabilitados temporariamente.');
        (err as any).code = 'functions/failed-precondition';
        throw err;
      }

      // 2. Itens válidos?
      if (!Array.isArray(items) || items.length === 0) {
        const err = new Error('O carrinho de pedidos não pode estar vazio.');
        (err as any).code = 'functions/invalid-argument';
        throw err;
      }

      // 3. Calcular subtotal com base estrita no catálogo oficial
      let computed = 0;
      let totalQty = 0;
      const verified = [];

      for (const item of items) {
        const p = mockDb.get(`storeProducts/${item.productId}`);
        if (!p) {
          const err = new Error(`Produto "${item.productId}" não encontrado no catálogo.`);
          (err as any).code = 'functions/not-found';
          throw err;
        }

        if (p.status === 'hidden' || p.status === 'paused') {
          const err = new Error(`O produto "${p.name}" está indisponível para pedidos no momento.`);
          (err as any).code = 'functions/failed-precondition';
          throw err;
        }

        const qty = Number(item.quantity);
        if (!Number.isInteger(qty) || qty <= 0 || qty > 100) {
          const err = new Error(`A quantidade para "${p.name}" deve ser um número inteiro entre 1 e 100.`);
          (err as any).code = 'functions/invalid-argument';
          throw err;
        }

        computed += p.price * qty;
        totalQty += qty;
        verified.push({
          productId: item.productId,
          productName: p.name,
          price: p.price,
          quantity: qty,
          customName: item.customName,
        });
      }

      computed = Math.round(computed * 100) / 100;

      const payloadHash = JSON.stringify({
        items: verified.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price, customName: i.customName || '' })),
        customerNotes: data.customerNotes || '',
        subtotal: computed,
      });

      // 4. Idempotência com hash de payload
      if (idempotencyKey) {
        for (const [key, val] of mockDb.entries()) {
          if (key.startsWith('catalogOrders/') && val.idempotencyKey === idempotencyKey) {
            if (val.payloadHash && val.payloadHash !== payloadHash) {
              const err = new Error('A chave de idempotência fornecida já foi utilizada para um pedido com itens ou valores diferentes.');
              (err as any).code = 'functions/already-exists';
              throw err;
            }
            return {
              data: {
                orderId: key.replace('catalogOrders/', ''),
                orderCode: val.orderCode,
                subtotal: val.subtotal,
                totalItems: val.totalItems,
                verifiedByServer: true,
                isIdempotentReplay: true,
              },
            };
          }
        }
      }
      // 5. Preço adulterado / alterado entre exibição e envio
      if (submittedSubtotal !== undefined && Math.abs(submittedSubtotal - computed) > 0.05) {
        const err = new Error(`O valor do pedido foi atualizado (R$ ${computed.toFixed(2)}). Por favor, revise o valor do seu carrinho antes de confirmar.`);
        (err as any).code = 'functions/aborted';
        (err as any).details = { currentSubtotal: computed, submittedSubtotal };
        throw err;
      }

      const orderId = `order_${Date.now()}`;
      const orderCode = `LJ-9999`;
      mockDb.set(`catalogOrders/${orderId}`, {
        orderCode,
        items: verified,
        totalItems: totalQty,
        subtotal: computed,
        officialSubtotal: computed,
        submittedSubtotal: submittedSubtotal || computed,
        verifiedByServer: true,
        isPriceTampered: false,
        payloadHash,
        idempotencyKey,
        status: 'received',
      });

      return {
        data: {
          orderId,
          orderCode,
          subtotal: computed,
          totalItems: totalQty,
          verifiedByServer: true,
        },
      };
    });
  });

  it('1. Preço adulterado pelo cliente é rejeitado com valor atualizado do servidor', async () => {
    // Cliente tenta enviar R$ 10,00 quando a Caneca custa R$ 45,00 no catálogo oficial
    await expect(
      firebaseCatalogOrderService.createCatalogOrder({
        orderCode: 'LJ-1001',
        items: [
          {
            productId: 'prod-mug',
            productName: 'Caneca',
            price: 10.0, // Preço adulterado no payload
            quantity: 1,
            leadTimeDays: 3,
          },
        ],
        totalItems: 1,
        subtotal: 10.0, // Subtotal adulterado
        status: 'received',
      })
    ).rejects.toThrow('O valor do pedido foi atualizado (R$ 45.00)');
  });

  it('2. Produto oculto ou pausado é rejeitado', async () => {
    mockDb.set('storeProducts/prod-paused', {
      name: 'Item Esgotado',
      price: 20.0,
      status: 'paused',
    });

    await expect(
      firebaseCatalogOrderService.createCatalogOrder({
        orderCode: 'LJ-1002',
        items: [
          {
            productId: 'prod-paused',
            productName: 'Item Esgotado',
            price: 20.0,
            quantity: 1,
            leadTimeDays: 0,
          },
        ],
        totalItems: 1,
        subtotal: 20.0,
        status: 'received',
      })
    ).rejects.toThrow('está indisponível para pedidos no momento');
  });

  it('3. Produto inexistente é rejeitado com not-found', async () => {
    await expect(
      firebaseCatalogOrderService.createCatalogOrder({
        orderCode: 'LJ-1003',
        items: [
          {
            productId: 'prod-inexistente',
            productName: 'Fantasma',
            price: 50.0,
            quantity: 1,
            leadTimeDays: 0,
          },
        ],
        totalItems: 1,
        subtotal: 50.0,
        status: 'received',
      })
    ).rejects.toThrow('não encontrado no catálogo');
  });

  it('4. Rejeita pedido se a lojinha estiver fechada ou despublicada', async () => {
    mockDb.set('storeSettings/public', {
      storePublished: false,
    });

    await expect(
      firebaseCatalogOrderService.createCatalogOrder({
        orderCode: 'LJ-1004',
        items: [
          {
            productId: 'prod-mug',
            productName: 'Caneca',
            price: 45.0,
            quantity: 1,
            leadTimeDays: 3,
          },
        ],
        totalItems: 1,
        subtotal: 45.0,
        status: 'received',
      })
    ).rejects.toThrow('temporariamente indisponível');
  });

  it('5. Rejeita pedido se os pedidos online estiverem desabilitados', async () => {
    mockDb.set('storeSettings/public', {
      storePublished: true,
      catalogOrdersDisabled: true,
    });

    await expect(
      firebaseCatalogOrderService.createCatalogOrder({
        orderCode: 'LJ-1005',
        items: [
          {
            productId: 'prod-mug',
            productName: 'Caneca',
            price: 45.0,
            quantity: 1,
            leadTimeDays: 3,
          },
        ],
        totalItems: 1,
        subtotal: 45.0,
        status: 'received',
      })
    ).rejects.toThrow('pedidos online estão desabilitados');
  });

  it('6. Rejeita quantidades negativas, fracionárias ou excessivas', async () => {
    // Quantidade fracionária
    await expect(
      firebaseCatalogOrderService.createCatalogOrder({
        orderCode: 'LJ-1006A',
        items: [
          {
            productId: 'prod-mug',
            productName: 'Caneca',
            price: 45.0,
            quantity: 1.5,
            leadTimeDays: 3,
          },
        ],
        totalItems: 1,
        subtotal: 67.5,
        status: 'received',
      })
    ).rejects.toThrow('deve ser um número inteiro entre 1 e 100');

    // Quantidade excessiva > 100
    await expect(
      firebaseCatalogOrderService.createCatalogOrder({
        orderCode: 'LJ-1006B',
        items: [
          {
            productId: 'prod-mug',
            productName: 'Caneca',
            price: 45.0,
            quantity: 150,
            leadTimeDays: 3,
          },
        ],
        totalItems: 150,
        subtotal: 6750.0,
        status: 'received',
      })
    ).rejects.toThrow('deve ser um número inteiro entre 1 e 100');
  });

  it('7. Repetição concorrente / retry com chave de idempotência retorna o pedido existente', async () => {
    const orderData = {
      orderCode: 'LJ-IDEMPOTENT',
      idempotencyKey: 'idemp-session-key-12345',
      items: [
        {
          productId: 'prod-mug',
          productName: 'Caneca',
          price: 45.0,
          quantity: 2,
          leadTimeDays: 3,
        },
      ],
      totalItems: 2,
      subtotal: 90.0,
      status: 'received' as const,
    };

    // Primeira chamada
    const res1 = await firebaseCatalogOrderService.createCatalogOrder(orderData);
    expect(res1).toBeDefined();
    expect(res1.orderId).toBeDefined();

    // Segunda chamada (retry com mesma chave de idempotência)
    const res2 = await firebaseCatalogOrderService.createCatalogOrder(orderData);
    expect(res2.orderId).toBe(res1.orderId);
    expect(res2.orderCode).toBe(res1.orderCode);
    expect(res2.isIdempotentReplay).toBe(true);

    // Somente 1 pedido gravado em catalogOrders
    let catalogOrderCount = 0;
    for (const key of mockDb.keys()) {
      if (key.startsWith('catalogOrders/')) catalogOrderCount++;
    }
    expect(catalogOrderCount).toBe(1);
  });

  it('8. Revalidação de pedido legado adulterado na conversão para pedido de produção oficial', async () => {
    // Pedido legado no Firestore, gravado diretamente sem verificação do servidor (verifiedByServer !== true)
    // O cliente adulterou subtotal para R$ 5,00 em vez de R$ 90,00 (2 canecas de R$ 45,00)
    const tamperedLegacyOrder = {
      id: 'legacy-tampered-123',
      orderCode: 'LJ-LEGACY',
      items: [
        {
          productId: 'prod-mug',
          productName: 'Caneca Personalizada',
          price: 2.5, // Adulterado no documento legado
          quantity: 2,
          leadTimeDays: 3,
        },
      ],
      totalItems: 2,
      subtotal: 5.0, // Subtotal adulterado
      verifiedByServer: false,
      status: 'received' as const,
      createdAt: '2026-09-30T10:00:00Z',
    };

    mockDb.set('catalogOrders/legacy-tampered-123', tamperedLegacyOrder);

    mockCreateOrder.mockResolvedValueOnce({
      id: 'prod-order-789',
      orderNumber: '#2026-0099',
      price: 90.0,
    });

    // Ao converter o pedido legado para produção oficial, o serviço revalida os preços contra storeProducts
    await firebaseCatalogOrderService.convertToProductionOrder(
      tamperedLegacyOrder,
      'Cliente Vitrine',
      '11999998888',
      '2026-10-10'
    );

    // Verifica que o pedido de produção NÃO foi criado com os R$ 5,00 adulterados!
    // Ele foi corrigido para R$ 90,00 (2 x R$ 45,00 oficial)
    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 90.0, // Preço oficial seguro recalculado
        payment: expect.objectContaining({
          totalAmount: 90.0,
          remainingAmount: 90.0,
        }),
      }),
      'legacy-tampered-123'
    );
  });

  it('9. Mesma chave de idempotência reenviada com carrinho/itens alterados é rejeitada com conflito', async () => {
    const idempotencyKey = 'key_replay_conflict_test';

    // 1. Primeiro pedido com 1 caneca
    const res1 = await firebaseCatalogOrderService.createCatalogOrder({
      orderCode: 'LJ-1001',
      idempotencyKey,
      items: [
        {
          productId: 'prod-mug',
          productName: 'Caneca',
          price: 45.0,
          quantity: 1,
          leadTimeDays: 3,
        },
      ],
      totalItems: 1,
      subtotal: 45.0,
      status: 'received',
    });
    expect(res1.orderCode).toBeDefined();

    // 2. Tentativa de replay da MESMA chave mas agora com 2 canecas (carrinho diferente)
    await expect(
      firebaseCatalogOrderService.createCatalogOrder({
        orderCode: 'LJ-1001',
        idempotencyKey,
        items: [
          {
            productId: 'prod-mug',
            productName: 'Caneca',
            price: 45.0,
            quantity: 2,
            leadTimeDays: 3,
          },
        ],
        totalItems: 2,
        subtotal: 90.0,
        status: 'received',
      })
    ).rejects.toThrow('A chave de idempotência fornecida já foi utilizada para um pedido com itens ou valores diferentes.');
  });
});

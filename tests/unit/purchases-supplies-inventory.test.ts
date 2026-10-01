import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory Firestore store for transactional tests
const inMemoryStore = new Map<string, any>();

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'user-123', email: 'atelier@example.com' } },
  functions: {},
}));

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((_db, collName) => ({
      collName,
      path: collName,
    })),
    doc: vi.fn((_db, ...parts: string[]) => {
      let fullPath = '';
      if (typeof parts[0] === 'object' && parts[0] !== null && 'path' in parts[0]) {
        const coll = (parts[0] as any).path;
        const id = parts[1] || `auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        fullPath = `${coll}/${id}`;
        return { path: fullPath, id, collName: coll };
      }
      fullPath = parts.join('/');
      const segs = fullPath.split('/');
      const id = segs[segs.length - 1];
      const collName = segs.slice(0, segs.length - 1).join('/');
      return { path: fullPath, id, collName };
    }),
    getDocs: vi.fn(async (q: any) => {
      const coll = q.collName || q.path || '';
      const docs: any[] = [];
      for (const [key, val] of inMemoryStore.entries()) {
        if (key.startsWith(`${coll}/`)) {
          docs.push({
            id: key.replace(`${coll}/`, ''),
            data: () => ({ ...val }),
          });
        }
      }
      return { docs };
    }),
    getDoc: vi.fn(async (ref: any) => {
      const val = inMemoryStore.get(ref.path);
      return {
        exists: () => !!val,
        id: ref.id,
        data: () => (val ? { ...val } : undefined),
      };
    }),
    setDoc: vi.fn(async (ref: any, data: any) => {
      inMemoryStore.set(ref.path, { ...data });
    }),
    updateDoc: vi.fn(async (ref: any, data: any) => {
      const existing = inMemoryStore.get(ref.path) || {};
      inMemoryStore.set(ref.path, { ...existing, ...data });
    }),
    deleteDoc: vi.fn(async (ref: any) => {
      inMemoryStore.delete(ref.path);
    }),
    query: vi.fn((coll, ..._clauses) => coll),
    where: vi.fn(),
    orderBy: vi.fn(),
    onSnapshot: vi.fn(),
    writeBatch: vi.fn(),
    runTransaction: vi.fn(async (_db, updateFunction) => {
      const pendingWrites: Array<() => void> = [];
      const tx = {
        get: vi.fn(async (ref: any) => {
          const val = inMemoryStore.get(ref.path);
          return {
            exists: () => !!val,
            id: ref.id,
            data: () => (val ? { ...val } : undefined),
          };
        }),
        set: vi.fn((ref: any, data: any) => {
          pendingWrites.push(() => {
            inMemoryStore.set(ref.path, { ...data });
          });
        }),
        update: vi.fn((ref: any, data: any) => {
          pendingWrites.push(() => {
            const existing = inMemoryStore.get(ref.path) || {};
            inMemoryStore.set(ref.path, { ...existing, ...data });
          });
        }),
        delete: vi.fn((ref: any) => {
          pendingWrites.push(() => {
            inMemoryStore.delete(ref.path);
          });
        }),
      };

      const result = await updateFunction(tx);
      // Atomic commit of all pending writes in transaction
      for (const applyWrite of pendingWrites) {
        applyWrite();
      }
      return result;
    }),
  };
});

import { firebasePricingService } from '../../src/services/firebasePricingService';

describe('Etapa 6: Compras e Estoque Transacional (Achado 9)', () => {
  beforeEach(() => {
    inMemoryStore.clear();
  });

  it('valida entradas e rejeita valores numéricos negativos ou inválidos', async () => {
    // Quantidade inválida <= 0
    await expect(
      firebasePricingService.addPurchaseRecord({
        supplyId: 'supp-1',
        supplyName: 'Papel Fotográfico',
        category: 'papeis',
        date: '2026-10-01',
        store: 'Kalunga',
        quantity: 0,
        unit: 'folha',
        price: 50,
        shippingCost: 0,
        totalPrice: 50,
        unitCost: 0,
      })
    ).rejects.toThrow('A quantidade da compra deve ser um número positivo.');

    // Preço negativo
    await expect(
      firebasePricingService.addPurchaseRecord({
        supplyId: 'supp-1',
        supplyName: 'Papel Fotográfico',
        category: 'papeis',
        date: '2026-10-01',
        store: 'Kalunga',
        quantity: 10,
        unit: 'folha',
        price: -10,
        shippingCost: 0,
        totalPrice: -10,
        unitCost: 0,
      })
    ).rejects.toThrow('O valor pago da compra não pode ser negativo.');

    // Frete negativo
    await expect(
      firebasePricingService.addPurchaseRecord({
        supplyId: 'supp-1',
        supplyName: 'Papel Fotográfico',
        category: 'papeis',
        date: '2026-10-01',
        store: 'Kalunga',
        quantity: 10,
        unit: 'folha',
        price: 50,
        shippingCost: -5,
        totalPrice: 45,
        unitCost: 4.5,
      })
    ).rejects.toThrow('O frete não pode ser negativo.');

    expect(inMemoryStore.size).toBe(0);
  });

  it('estoque 10 e duas compras de 5 resultam em 20 e dois movimentos registrados atomicamente', async () => {
    // Insumo inicial com estoque 10
    inMemoryStore.set('supplies/supp-paper', {
      name: 'Papel Opaline 180g',
      category: 'papeis',
      currentStock: 10,
      minStock: 5,
      needsReorder: false,
      unit: 'folha',
      userId: 'user-123',
    });

    // Duas compras consecutivas/atômicas de 5 unidades cada
    const purchase1 = await firebasePricingService.addPurchaseRecord({
      idempotencyKey: 'purch-1',
      supplyId: 'supp-paper',
      supplyName: 'Papel Opaline 180g',
      category: 'papeis',
      date: '2026-10-01',
      store: 'Papelaria Central',
      quantity: 5,
      unit: 'folha',
      price: 25,
      shippingCost: 5,
      totalPrice: 30,
      unitCost: 6,
    });

    const purchase2 = await firebasePricingService.addPurchaseRecord({
      idempotencyKey: 'purch-2',
      supplyId: 'supp-paper',
      supplyName: 'Papel Opaline 180g',
      category: 'papeis',
      date: '2026-10-01',
      store: 'Distribuidora Papel',
      quantity: 5,
      unit: 'folha',
      price: 20,
      shippingCost: 0,
      totalPrice: 20,
      unitCost: 4,
    });

    expect(purchase1.id).toBe('user-123_purch-1');
    expect(purchase2.id).toBe('user-123_purch-2');

    // Verifica o estoque final no insumo
    const updatedSupply = inMemoryStore.get('supplies/supp-paper');
    expect(updatedSupply.currentStock).toBe(20);

    // Dois movimentos confirmados
    const p1Record = inMemoryStore.get('purchaseHistory/user-123_purch-1');
    const p2Record = inMemoryStore.get('purchaseHistory/user-123_purch-2');
    expect(p1Record).toBeDefined();
    expect(p1Record.status).toBe('active');
    expect(p2Record).toBeDefined();
    expect(p2Record.status).toBe('active');
  });

  it('retry da mesma compra com chave de idempotência retorna o movimento existente sem duplicar estoque', async () => {
    inMemoryStore.set('supplies/supp-ink', {
      name: 'Tinta Magenta',
      currentStock: 2,
      minStock: 1,
      userId: 'user-123',
    });

    const payload = {
      idempotencyKey: 'retry-key-abc',
      supplyId: 'supp-ink',
      supplyName: 'Tinta Magenta',
      category: 'tintas' as const,
      date: '2026-10-01',
      store: 'Epson Store',
      quantity: 3,
      unit: 'unidade' as const,
      price: 90,
      shippingCost: 10,
      totalPrice: 100,
      unitCost: 33.3333,
    };

    // Primeira tentativa
    const firstCall = await firebasePricingService.addPurchaseRecord(payload);
    expect(firstCall.id).toBe('user-123_retry-key-abc');
    expect(inMemoryStore.get('supplies/supp-ink').currentStock).toBe(5);

    // Segunda tentativa (retry com a mesma chave)
    const secondCall = await firebasePricingService.addPurchaseRecord(payload);
    expect(secondCall.id).toBe('user-123_retry-key-abc');

    // O estoque NÃO pode ter subido para 8! Permanece 5
    expect(inMemoryStore.get('supplies/supp-ink').currentStock).toBe(5);

    // Apenas 1 registro de compra no histórico
    let purchaseCount = 0;
    for (const key of inMemoryStore.keys()) {
      if (key.startsWith('purchaseHistory/')) purchaseCount++;
    }
    expect(purchaseCount).toBe(1);
  });

  it('falha no saldo não deixa histórico de compra confirmado', async () => {
    // Configura o mock do Firestore para lançar erro durante a transação
    const { runTransaction } = await import('firebase/firestore');
    vi.mocked(runTransaction).mockImplementationOnce(async (_db: any, fn: any) => {
      const tx = {
        get: vi.fn().mockRejectedValueOnce(new Error('Simulated network / Firestore failure')),
        set: vi.fn(),
        update: vi.fn(),
      };
      await fn(tx);
    });

    await expect(
      firebasePricingService.addPurchaseRecord({
        idempotencyKey: 'purch-failed',
        supplyId: 'supp-any',
        supplyName: 'Item Qualquer',
        category: 'outros',
        date: '2026-10-01',
        store: 'Loja',
        quantity: 10,
        unit: 'unidade',
        price: 100,
        shippingCost: 0,
        totalPrice: 100,
        unitCost: 10,
      })
    ).rejects.toThrow('Simulated network / Firestore failure');

    // Nenhum documento foi salvo
    expect(inMemoryStore.has('purchaseHistory/purch-failed')).toBe(false);
  });

  it('cancelamento de compra estorna estoque e preserva registro como cancelado para auditoria', async () => {
    inMemoryStore.set('supplies/supp-ribbon', {
      name: 'Fita Cetim 22mm',
      currentStock: 15,
      minStock: 2,
      userId: 'user-123',
    });

    inMemoryStore.set('purchaseHistory/purch-ribbon-1', {
      supplyId: 'supp-ribbon',
      supplyName: 'Fita Cetim 22mm',
      quantity: 5,
      price: 30,
      status: 'active',
      userId: 'user-123',
    });

    const result = await firebasePricingService.cancelPurchaseRecord('purch-ribbon-1', {
      reason: 'Compra cancelada por avaria na entrega',
    });

    expect(result.success).toBe(true);
    expect(result.revertedQuantity).toBe(5);
    expect(result.unreversedQuantity).toBe(0);

    // Estoque subtraído de 15 para 10
    expect(inMemoryStore.get('supplies/supp-ribbon').currentStock).toBe(10);

    // Registro mantido para auditoria
    const purchaseDoc = inMemoryStore.get('purchaseHistory/purch-ribbon-1');
    expect(purchaseDoc.status).toBe('cancelled');
    expect(purchaseDoc.cancellationReason).toBe('Compra cancelada por avaria na entrega');
    expect(purchaseDoc.cancelledAt).toBeDefined();
  });

  it('cancelamento repetido é idempotente e não estorna estoque uma segunda vez', async () => {
    inMemoryStore.set('supplies/supp-ribbon', {
      name: 'Fita Cetim 22mm',
      currentStock: 10,
      userId: 'user-123',
    });

    inMemoryStore.set('purchaseHistory/purch-ribbon-cancelled', {
      supplyId: 'supp-ribbon',
      supplyName: 'Fita Cetim 22mm',
      quantity: 5,
      price: 30,
      status: 'cancelled',
      revertedQuantity: 5,
      unreversedQuantity: 0,
      cancelledAt: '2026-10-01T00:00:00.000Z',
      userId: 'user-123',
    });

    // Chamada de cancelamento em compra que já está cancelada
    const result = await firebasePricingService.cancelPurchaseRecord('purch-ribbon-cancelled');
    expect(result.success).toBe(true);
    expect(result.revertedQuantity).toBe(5);

    // Estoque NÃO foi subtraído novamente! Permanece 10
    expect(inMemoryStore.get('supplies/supp-ribbon').currentStock).toBe(10);
  });

  it('trata compra parcialmente consumida: estorna até o limite disponível sem deixar saldo negativo', async () => {
    // Compra original foi de 10 unidades
    // Porém a produção já consumiu 6 unidades, restando apenas 4 em estoque
    inMemoryStore.set('supplies/supp-mug', {
      name: 'Caneca Branca',
      currentStock: 4,
      minStock: 2,
      userId: 'user-123',
    });

    inMemoryStore.set('purchaseHistory/purch-mug-10', {
      supplyId: 'supp-mug',
      supplyName: 'Caneca Branca',
      quantity: 10,
      price: 150,
      status: 'active',
      userId: 'user-123',
    });

    const result = await firebasePricingService.cancelPurchaseRecord('purch-mug-10');
    expect(result.success).toBe(true);
    // Reverteu apenas os 4 disponíveis
    expect(result.revertedQuantity).toBe(4);
    // 6 unidades não foram revertidas pois já foram consumidas
    expect(result.unreversedQuantity).toBe(6);

    // O estoque final vai para 0 (nunca negativo!)
    const supply = inMemoryStore.get('supplies/supp-mug');
    expect(supply.currentStock).toBe(0);
    // Alerta de reposição acionado automaticamente pois estoque 0 <= minStock 2
    expect(supply.needsReorder).toBe(true);
  });
});

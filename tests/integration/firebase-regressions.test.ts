import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getMetadata } from 'firebase/storage';
import { DEFAULT_USER_PERMISSIONS } from '../../src/app/types';

const client = vi.hoisted(() => ({ db: undefined as any, auth: { currentUser: null as any } }));
vi.mock('../../src/lib/firebase', () => ({
  get db() { return client.db; },
  auth: client.auth,
}));
import { firebaseSettingsService } from '../../src/services/firebaseSettingsService';
import { getSalesLedgerQuery } from '../../src/services/firebaseLedgerService';
import { firebaseOrderService } from '../../src/services/firebaseOrderService';
import { firebaseCatalogOrderService } from '../../src/services/firebaseCatalogOrderService';
import { firebasePricingService } from '../../src/services/firebasePricingService';

let env: RulesTestEnvironment;
const profile = (uid: string, role = 'user', active = true) => ({
  uid, role, active, createdBy: uid, permissions: DEFAULT_USER_PERMISSIONS,
  email: `${uid}@example.test`, displayName: uid, createdAt: '2026-01-01',
});
const order = {
  userId: 'owner', customerName: 'Cliente', customerPhone: '11999999999',
  productName: 'Convite', quantity: 1, price: 100, status: 'pending',
  deliveryDate: '2026-12-01', deletedAt: null, createdAt: Timestamp.fromDate(new Date('2026-01-01')),
  assignedTo: 'old-employee', assignedToName: 'Anterior',
};
const dbFor = (uid: string) => env.authenticatedContext(uid).firestore();
function asUser(uid: string) {
  client.db = dbFor(uid);
  client.auth.currentUser = { uid, displayName: uid, email: `${uid}@example.test` };
}
async function seed(path: string, data: any) {
  await env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(path).set(data);
  });
}

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    throw new Error('Execute npm run test:integration para usar apenas emuladores locais.');
  }
  env = await initializeTestEnvironment({
    projectId: 'demo-luisices-review',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await Promise.all([
    seed('userProfiles/admin', profile('admin', 'admin')),
    seed('userProfiles/owner', profile('owner')),
    seed('userProfiles/other', profile('other')),
    seed('userProfiles/old-employee', profile('old-employee', 'funcionario')),
    seed('userProfiles/new-employee', profile('new-employee', 'funcionario')),
  ]);
  asUser('owner');
});

describe('Perfis e desativação', () => {
  it('impede criação direta de perfil por usuário comum, mas permite admin e atualização de dados próprios', async () => {
    const db = dbFor('new-user');
    // Usuário comum não pode criar o próprio perfil diretamente no Firestore
    await assertFails(setDoc(doc(db as any, 'userProfiles/new-user'), profile('new-user')));
    await assertFails(setDoc(doc(db as any, 'userProfiles/new-user'), profile('new-user', 'admin')));
    await assertFails(setDoc(doc(db as any, 'userProfiles/new-user'), {
      ...profile('new-user'), permissions: { ...DEFAULT_USER_PERMISSIONS, emails: true },
    }));

    // Admin pode criar perfil
    await assertSucceeds(setDoc(doc(dbFor('admin') as any, 'userProfiles/new-user'), profile('new-user')));

    // Usuário pode atualizar seu displayName, mas não campos sensíveis
    await assertSucceeds(updateDoc(doc(db as any, 'userProfiles/new-user'), { displayName: 'Novo nome' }));
    await assertFails(updateDoc(doc(db as any, 'userProfiles/new-user'), { role: 'admin' }));
    await assertFails(updateDoc(doc(db as any, 'userProfiles/new-user'), { active: false }));
  });

  it('não permite adicionar role privilegiado a um perfil legado sem role', async () => {
    await seed('userProfiles/legacy', { uid: 'legacy', active: true });
    await assertFails(updateDoc(doc(dbFor('legacy') as any, 'userProfiles/legacy'), { role: 'admin' }));
  });

  it.each(['user', 'admin', 'funcionario'])('bloqueia conta %s desativada mantendo leitura do próprio perfil', async (role) => {
    await seed('userProfiles/blocked', profile('blocked', role, false));
    await seed('orders/blocked-order', { ...order, userId: 'blocked', assignedTo: 'blocked' });
    const db = dbFor('blocked');
    await assertFails(getDoc(doc(db as any, 'orders/blocked-order')));
    await assertFails(updateDoc(doc(db as any, 'orders/blocked-order'), { price: 1 }));
    await assertFails(setDoc(doc(db as any, 'orders/new-order'), { ...order, userId: 'blocked' }));
    await assertSucceeds(getDoc(doc(db as any, 'userProfiles/blocked')));
    await assertFails(updateDoc(doc(db as any, 'userProfiles/blocked'), { active: true }));
  });

  it('mantém acesso de proprietário e admin legados sem active', async () => {
    const legacy = profile('legacy');
    const { active, ...withoutActive } = legacy;
    await seed('userProfiles/legacy', withoutActive);
    await seed('orders/legacy-order', { ...order, userId: 'legacy' });
    await assertSucceeds(getDoc(doc(dbFor('legacy') as any, 'orders/legacy-order')));
    await seed('userProfiles/legacy', { ...withoutActive, role: 'admin' });
    await assertSucceeds(getDoc(doc(dbFor('legacy') as any, 'orders/legacy-order')));
  });
});

describe('Permissões granulares de pedidos e soft delete (Achado 3)', () => {
  it('impede funcionário com edit=true e delete=false de alterar deletedAt, mas permite edições comuns', async () => {
    await seed('userProfiles/emp-editor-only', {
      ...profile('emp-editor-only', 'funcionario'),
      permissions: {
        ...DEFAULT_USER_PERMISSIONS,
        orders: { view: true, create: false, edit: true, delete: false },
      },
    });
    await seed('orders/assigned-order', {
      ...order,
      userId: 'owner',
      assignedTo: 'emp-editor-only',
      deletedAt: null,
    });

    const empDb = dbFor('emp-editor-only');

    // Edição legítima de campos comuns deve passar
    await assertSucceeds(updateDoc(doc(empDb as any, 'orders/assigned-order'), {
      customerName: 'Cliente Atualizado',
      productName: 'Produto Atualizado',
    }));

    // Tentativa de alterar deletedAt (soft-delete) SEM permissão de exclusão DEVE FALHAR
    await assertFails(updateDoc(doc(empDb as any, 'orders/assigned-order'), {
      deletedAt: Timestamp.now(),
    }));

    // Tentativa de alterar userId ou assignedTo DEVE FALHAR
    await assertFails(updateDoc(doc(empDb as any, 'orders/assigned-order'), {
      userId: 'emp-editor-only',
    }));
    await assertFails(updateDoc(doc(empDb as any, 'orders/assigned-order'), {
      assignedTo: 'other',
    }));
  });

  it('permite que funcionário com delete=true faça soft delete em pedido atribuído', async () => {
    await seed('userProfiles/emp-with-delete', {
      ...profile('emp-with-delete', 'funcionario'),
      permissions: {
        ...DEFAULT_USER_PERMISSIONS,
        orders: { view: true, create: false, edit: true, delete: true },
      },
    });
    await seed('orders/assigned-order-del', {
      ...order,
      userId: 'owner',
      assignedTo: 'emp-with-delete',
      deletedAt: null,
    });

    const empDb = dbFor('emp-with-delete');
    await assertSucceeds(updateDoc(doc(empDb as any, 'orders/assigned-order-del'), {
      deletedAt: Timestamp.now(),
    }));
  });
});

describe('Acompanhamento de produção (productionTracking - Achado 4)', () => {
  const trackingData = {
    userId: 'owner',
    recipeId: 'recipe-123',
    productName: 'Convite Luxo',
    plannedQuantity: 50,
    plannedMinutes: 120,
    actualMinutes: 110,
    salePrice: 250,
    createdAt: '2026-01-01',
  };

  it('permite proprietário e admin criarem, lerem, editarem e excluírem acompanhamento de produção', async () => {
    // Owner cria
    await assertSucceeds(setDoc(doc(dbFor('owner') as any, 'productionTracking/track-1'), trackingData));

    // Owner lê
    await assertSucceeds(getDoc(doc(dbFor('owner') as any, 'productionTracking/track-1')));

    // Owner edita
    await assertSucceeds(updateDoc(doc(dbFor('owner') as any, 'productionTracking/track-1'), {
      actualMinutes: 105,
    }));

    // Admin lê e edita
    await assertSucceeds(getDoc(doc(dbFor('admin') as any, 'productionTracking/track-1')));
    await assertSucceeds(updateDoc(doc(dbFor('admin') as any, 'productionTracking/track-1'), {
      notes: 'Verificado pela gerência',
    }));

    // Owner deleta
    await assertSucceeds(deleteDoc(doc(dbFor('owner') as any, 'productionTracking/track-1')));
  });

  it('nega acesso de leitura e escrita para outro usuário sem permissão', async () => {
    await seed('productionTracking/track-private', trackingData);

    const otherDb = dbFor('other');
    await assertFails(getDoc(doc(otherDb as any, 'productionTracking/track-private')));
    await assertFails(setDoc(doc(otherDb as any, 'productionTracking/track-other'), {
      ...trackingData,
      userId: 'owner',
    }));
    await assertFails(updateDoc(doc(otherDb as any, 'productionTracking/track-private'), {
      actualMinutes: 999,
    }));
    await assertFails(deleteDoc(doc(otherDb as any, 'productionTracking/track-private')));
  });
});

describe('Isolamento financeiro', () => {
  it('impede assumir registro de outro proprietário, preservando edição legítima', async () => {
    await seed('salesLedger/sale', { userId: 'owner', assignedTo: 'old-employee', amount: 100 });
    await assertFails(setDoc(doc(dbFor('other') as any, 'salesLedger/sale'), { userId: 'other', amount: 1 }));
    await assertSucceeds(updateDoc(doc(dbFor('owner') as any, 'salesLedger/sale'), { amount: 120 }));
    await assertSucceeds(updateDoc(doc(dbFor('old-employee') as any, 'salesLedger/sale'), { amount: 130 }));
    await assertFails(updateDoc(doc(dbFor('old-employee') as any, 'salesLedger/sale'), { assignedTo: 'new-employee' }));
  });
});

describe('Storage', () => {
  it('mantém galeria privada e imagens de apresentação públicas', async () => {
    const ownerStorage = env.authenticatedContext('owner').storage();
    await assertSucceeds(uploadBytes(ref(ownerStorage as any, 'users/owner/gallery/art.png'), new Uint8Array([1]), { contentType: 'image/png' }));
    await assertSucceeds(uploadBytes(ref(ownerStorage as any, 'users/owner/logo/logo.png'), new Uint8Array([1]), { contentType: 'image/png' }));
    const publicStorage = env.unauthenticatedContext().storage();
    await assertFails(getMetadata(ref(publicStorage as any, 'users/owner/gallery/art.png')));
    await assertSucceeds(getMetadata(ref(publicStorage as any, 'users/owner/logo/logo.png')));
    await assertSucceeds(getMetadata(ref(ownerStorage as any, 'users/owner/gallery/art.png')));
    await seed('userProfiles/owner', profile('owner', 'user', false));
    await assertFails(getMetadata(ref(ownerStorage as any, 'users/owner/gallery/art.png')));
    await assertFails(uploadBytes(ref(ownerStorage as any, 'users/owner/logo/new.png'), new Uint8Array([1]), { contentType: 'image/png' }));
  });
});

describe('Pedidos e ledger atômicos', () => {
  it('cria pedido normal preservando pagamento e workflow e gravando a venda', async () => {
    const created = await firebaseOrderService.createOrder({
      ...order, status: 'pending', payment: { status: 'partial', totalAmount: 100, paidAmount: 20, remainingAmount: 80 },
    });
    expect(created.orderNumber).toMatch(/^#\d{4}-0001$/);
    expect(created.payment?.paidAmount).toBe(20);
    expect(created.productionWorkflow?.currentStep).toBe('design');
    const sale = await getDoc(doc(client.db, 'salesLedger', created.id));
    expect(sale.data()).toMatchObject({ userId: 'owner', paidAmount: 20, amount: 100 });
  });

  it.each([false, true])('reatribui pedido e ledger juntos (coletivo=%s), criando ledger legado ausente', async (bulk) => {
    await seed('orders/one', order);
    await seed('orders/two', order);
    await seed('salesLedger/one', { userId: 'owner', assignedTo: 'old-employee', amount: 150, paidAmount: 50 });
    asUser('admin');
    const employee = { uid: 'new-employee', displayName: 'Novo' };
    if (bulk) await firebaseOrderService.assignOrdersBulk(['one', 'two'], employee);
    else {
      await firebaseOrderService.assignOrder('one', employee);
      await firebaseOrderService.assignOrder('two', employee);
    }
    expect((await getDoc(doc(client.db, 'salesLedger/one'))).data()).toMatchObject({ assignedTo: 'new-employee', amount: 150, paidAmount: 50 });
    expect((await getDoc(doc(client.db, 'salesLedger/two'))).data()).toMatchObject({ assignedTo: 'new-employee', amount: 100 });
    await assertFails(getDoc(doc(dbFor('old-employee') as any, 'salesLedger/one')));
    await assertSucceeds(getDoc(doc(dbFor('new-employee') as any, 'salesLedger/one')));
    await firebaseOrderService.assignOrdersBulk(['one', 'two'], null);
    await assertFails(getDoc(doc(dbFor('new-employee') as any, 'salesLedger/one')));
  });

  it('não altera parcialmente um lote quando um pedido não existe', async () => {
    await seed('orders/one', order);
    await seed('salesLedger/one', { userId: 'owner', assignedTo: 'old-employee' });
    asUser('admin');
    await expect(firebaseOrderService.assignOrdersBulk(['one', 'missing'], null)).rejects.toThrow();
    expect((await getDoc(doc(client.db, 'orders/one'))).data()?.assignedTo).toBe('old-employee');
    expect((await getDoc(doc(client.db, 'salesLedger/one'))).data()?.assignedTo).toBe('old-employee');
  });

  it('conversões concorrentes e repetidas retornam um único pedido e uma única venda', async () => {
    const catalog = {
      id: 'catalog', orderCode: 'LJ-1000', status: 'received' as const, subtotal: 100, totalItems: 1,
      items: [{ productId: 'p', productName: 'Convite', price: 100, quantity: 1, leadTimeDays: 2 }],
      createdAt: '2026-01-01',
    };
    await seed('storeProducts/p', {
      name: 'Convite',
      price: 100,
      unitPrice: 100,
      status: 'active',
    });
    await seed('catalogOrders/catalog', catalog);
    const results = await Promise.all(Array.from({ length: 3 }, () =>
      firebaseCatalogOrderService.convertToProductionOrder(catalog, 'Cliente', '11999999999', '2026-12-01')));
    expect(new Set(results.map(r => r.id)).size).toBe(1);
    // Mesmo se o status voltar para received, o vínculo impede uma nova conversão.
    await updateDoc(doc(client.db, 'catalogOrders/catalog'), { status: 'received' });
    const again = await firebaseCatalogOrderService.convertToProductionOrder(catalog, 'Cliente', '', '2026-12-01');
    expect(again.id).toBe(results[0].id);
    asUser('admin');
    expect((await getDocs(collection(client.db, 'orders'))).size).toBe(1);
    expect((await getDocs(collection(client.db, 'salesLedger'))).size).toBe(1);
  });

  it('nega conversão sem deixar pedido, contador ou venda parcial', async () => {
    await seed('userProfiles/limited', { ...profile('limited', 'funcionario'), permissions: { orders: { view: true } } });
    await seed('catalogOrders/catalog', { status: 'received' });
    asUser('limited');
    await expect(firebaseOrderService.createOrder({ ...order, status: 'pending' }, 'catalog')).rejects.toThrow();
    asUser('admin');
    expect((await getDocs(collection(client.db, 'orders'))).size).toBe(0);
    expect((await getDocs(collection(client.db, 'salesLedger'))).size).toBe(0);
    await env.withSecurityRulesDisabled(async context => {
      expect((await context.firestore().doc('users/limited/metadata/counters').get()).exists).toBe(false);
    });
  });
});


describe('Histórico completo dos relatórios', () => {
  it('inclui mais de 200 vendas e mantém o isolamento das consultas', async () => {
    await env.withSecurityRulesDisabled(async context => {
      const batch = context.firestore().batch();
      for (let i = 0; i < 205; i++) {
        batch.set(context.firestore().doc(`salesLedger/sale-${i}`), {
          userId: 'owner', assignedTo: 'old-employee', amount: 10, date: '2026-01-01',
        });
      }
      batch.set(context.firestore().doc('salesLedger/other-sale'), {
        userId: 'other', assignedTo: 'new-employee', amount: 20, date: '2026-02-01',
      });
      await batch.commit();
    });
    const own = await getDocs(getSalesLedgerQuery('owner', 'own'));
    expect(own.size).toBe(205);
    expect(own.docs.reduce((sum, sale) => sum + sale.data().amount, 0)).toBe(2050);
    asUser('old-employee');
    expect((await getDocs(getSalesLedgerQuery('old-employee', 'assigned'))).size).toBe(205);
    asUser('admin');
    expect((await getDocs(getSalesLedgerQuery('admin', 'all'))).size).toBe(206);
  });
});


describe('Pausar e retomar vendas', () => {
  it('atualiza as duas configurações e preserva os demais dados', async () => {
    await seed('users/owner/settings/profile', { businessName: 'Ateliê' });
    await seed('storeSettings/public', { catalogStoreName: 'Loja' });
    for (const enabled of [false, true]) {
      await firebaseSettingsService.updateStoreFeatureFlags('owner', { enableOnlineOrders: enabled, enableDarkMode: true });
      expect((await getDoc(doc(client.db, 'users/owner/settings/profile'))).data()).toMatchObject({
        businessName: 'Ateliê', featureFlags: { enableOnlineOrders: enabled, enableDarkMode: true },
      });
      expect((await getDoc(doc(client.db, 'storeSettings/public'))).data()).toMatchObject({
        catalogStoreName: 'Loja', featureFlags: { enableOnlineOrders: enabled },
      });
    }
  });

  it('não salva apenas a configuração privada quando a pública é negada', async () => {
    await seed('userProfiles/limited', { ...profile('limited', 'funcionario'), permissions: { store: false, settings: false } });
    await seed('users/limited/settings/profile', { featureFlags: { enableOnlineOrders: true } });
    asUser('limited');
    await expect(firebaseSettingsService.updateStoreFeatureFlags('limited', { enableOnlineOrders: false })).rejects.toThrow();
    expect((await getDoc(doc(client.db, 'users/limited/settings/profile'))).data()?.featureFlags.enableOnlineOrders).toBe(true);
  });
});

describe('Reverificação e Correções Críticas (R1, R2, R3, R11)', () => {
  it('R1 & R11: updateOrderStatus e updateOrder executam leituras antes de escritas e preservam remainingAmount', async () => {
    asUser('owner');
    const created = await firebaseOrderService.createOrder({
      ...order,
      price: 150,
      status: 'pending',
      payment: { status: 'partial', totalAmount: 150, paidAmount: 50, remainingAmount: 100 },
    });

    // 1. updateOrderStatus com pedido e ledger reais no emulador (sem falhar com read-after-write)
    await firebaseOrderService.updateOrderStatus(created.id, 'in-progress');
    const updatedOrderSnap = await getDoc(doc(client.db, 'orders', created.id));
    expect(updatedOrderSnap.data()?.status).toBe('in-progress');
    const updatedSaleSnap = await getDoc(doc(client.db, 'salesLedger', created.id));
    expect(updatedSaleSnap.data()?.status).toBe('in-progress');

    // 2. updateOrder com patch parcial de notas e método sem passar remainingAmount
    await firebaseOrderService.updateOrder(created.id, {
      payment: {
        method: 'pix',
        notes: 'Pago via PIX',
      } as any,
    });
    const patchedOrderSnap = await getDoc(doc(client.db, 'orders', created.id));
    // remainingAmount não pode ser zerado indevidamente
    expect(patchedOrderSnap.data()?.payment?.remainingAmount).toBe(100);
    expect(patchedOrderSnap.data()?.payment?.method).toBe('pix');
    expect(patchedOrderSnap.data()?.payment?.paidAmount).toBe(50);
  });

  it('R2: proprietário comum (role user) consegue adicionar compra de insumo com checagem de idempotência', async () => {
    asUser('owner');
    // Criar insumo primeiro
    const createdSupply = await firebasePricingService.createSupply({
      name: 'Papel Fotográfico Glossy',
      category: 'papeis',
      unit: 'folha',
      packageQuantity: 50,
      purchasePrice: 35.0,
      unitCost: 0.70,
      currentStock: 10,
      minStock: 5,
      supplier: 'Papelaria Central',
      notes: 'Estoque inicial',
    });

    const supplyId = createdSupply.id;
    expect(supplyId).toBeDefined();

    // Adicionar registro de compra com chave de idempotência (lê purchaseHistory/{id} inexistente)
    const purchase = await firebasePricingService.addPurchaseRecord({
      supplyId,
      supplyName: 'Papel Fotográfico Glossy',
      category: 'papeis',
      unit: 'folha',
      quantity: 50,
      price: 35.0,
      shippingCost: 0,
      totalPrice: 35.0,
      unitCost: 0.70,
      date: '2026-10-01',
      store: 'Papelaria Central',
      notes: 'Lote novo',
      idempotencyKey: 'idemp_purchase_test_123',
    });

    expect(purchase.id).toBe('owner_idemp_purchase_test_123');

    // Verifica que o estoque foi atualizado (10 + 50 = 60)
    const supplies = await firebasePricingService.getSupplies();
    const updatedSupply = supplies.find((s) => s.id === supplyId);
    expect(updatedSupply?.currentStock).toBe(60);
  });

  it('Item 1: usuário autenticado comum e visitante anônimo são bloqueados ao tentar criar catalogOrders diretamente no Firestore', async () => {
    // 1. Visitante anônimo
    const anonDb = env.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(anonDb as any, 'catalogOrders/direct-tampered-anon'), {
      orderCode: 'LJ-TAMPERED-1',
      items: [{ productId: 'p', price: 0.01, quantity: 1 }],
      totalItems: 1,
      subtotal: 0.01,
      status: 'received',
    }));

    // 2. Usuário autenticado comum (não admin)
    const userDb = dbFor('owner');
    await assertFails(setDoc(doc(userDb as any, 'catalogOrders/direct-tampered-auth'), {
      orderCode: 'LJ-TAMPERED-2',
      items: [{ productId: 'p', price: 0.01, quantity: 1 }],
      totalItems: 1,
      subtotal: 0.01,
      status: 'received',
    }));
  });

  it('Item 6: updateProductionStep reconstrói salesLedger ausente quando status é alterado em pedido legado', async () => {
    asUser('owner');
    // Cria pedido sem ledger correspondente no Firestore (simulando dado legado ou inconsistência)
    await seed('orders/legacy-workflow-order', {
      ...order,
      price: 250,
      status: 'pending',
      payment: { status: 'paid', totalAmount: 250, paidAmount: 250 },
    });

    // Executa updateProductionStep
    await firebaseOrderService.updateProductionStep('legacy-workflow-order', 'packaging', true);

    const updatedOrderSnap = await getDoc(doc(client.db, 'orders/legacy-workflow-order'));
    expect(updatedOrderSnap.data()?.status).toBe('in-progress');
    // Verifica incremento de versão
    expect(updatedOrderSnap.data()?.version).toBeGreaterThanOrEqual(2);

    // Verifica se o salesLedger foi reconstruído na mesma transação
    const createdSaleSnap = await getDoc(doc(client.db, 'salesLedger/legacy-workflow-order'));
    expect(createdSaleSnap.exists()).toBe(true);
    expect(createdSaleSnap.data()).toMatchObject({
      orderId: 'legacy-workflow-order',
      amount: 250,
      paidAmount: 250,
      status: 'in-progress',
      userId: 'owner',
    });
  });

  it('Item 7: purchaseHistory com chave fora do escopo do usuário não permite leitura de recurso nulo por terceiros', async () => {
    // other tenta ler chave de idempotência prefixada para o owner que ainda não existe
    const otherDb = dbFor('other');
    await assertFails(getDoc(doc(otherDb as any, 'purchaseHistory/owner_uncreated_idemp_key')));
    // Mas owner consegue checar a sua própria chave prefixada
    const ownerDb = dbFor('owner');
    await assertSucceeds(getDoc(doc(ownerDb as any, 'purchaseHistory/owner_uncreated_idemp_key')));
  });

  it('Prioridade Alta: salesLedger com ID inexistente não associado a pedido acessível nega leitura', async () => {
    // 1. Probing de ID inexistente aleatório por usuário comum é NEGADO
    const otherDb = dbFor('other');
    await assertFails(getDoc(doc(otherDb as any, 'salesLedger/random_unassociated_missing_id')));

    // 2. Se o pedido existir e pertencer ao owner, a leitura transacional do salesLedger correspondente (para checagem/criação) é PERMITIDA
    await seed('orders/owner-valid-order', { ...order, userId: 'owner' });
    const ownerDb = dbFor('owner');
    await assertSucceeds(getDoc(doc(ownerDb as any, 'salesLedger/owner-valid-order')));
  });
});

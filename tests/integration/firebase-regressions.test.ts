import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, Timestamp } from 'firebase/firestore';
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
  it('permite o primeiro acesso padrão, mas impede autopromoção e permissões forjadas', async () => {
    const db = dbFor('new-user');
    await assertFails(setDoc(doc(db as any, 'userProfiles/new-user'), profile('new-user', 'admin')));
    await assertFails(setDoc(doc(db as any, 'userProfiles/new-user'), {
      ...profile('new-user'), permissions: { ...DEFAULT_USER_PERMISSIONS, emails: true },
    }));
    await assertSucceeds(setDoc(doc(db as any, 'userProfiles/new-user'), profile('new-user')));
    await assertSucceeds(updateDoc(doc(db as any, 'userProfiles/new-user'), { displayName: 'Novo nome' }));
    await assertFails(updateDoc(doc(db as any, 'userProfiles/new-user'), { role: 'admin' }));
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

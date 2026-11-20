import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getBytes, ref, uploadBytes } from 'firebase/storage';

let env: RulesTestEnvironment;

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    throw new Error('Execute via npm run test:integration para usar os emuladores.');
  }
  env = await initializeTestEnvironment({
    projectId: 'demo-luisices-review',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const storage = context.storage();

    // Usuário ativo sem chaves 'orders' e 'gallery' em permissions (testa deny-by-default)
    await db.doc('userProfiles/minimal-user').set({
      role: 'user',
      active: true,
      permissions: {},
    });

    // Funcionário ativo apenas com orders.view (sem store, sem atribuição no pedido B)
    await db.doc('userProfiles/emp-limited').set({
      role: 'funcionario',
      active: true,
      permissions: {
        orders: { view: true, create: false, edit: false, delete: false },
        pricing: { view: true, create: true, edit: true, delete: false },
        store: { view: false, create: false, edit: false, delete: false },
        storeProducts: { view: false, create: false, edit: false, delete: false },
      },
    });

    // Telemetria interna em storeSettings
    await db.doc('storeSettings/backendRoutingTelemetry').set({
      lastError: 'internal-host-timeout',
      updatedAt: '2026-11-19T00:00:00.000Z',
    });

    // Pedido atribuído a outro usuário (não ao emp-limited)
    await db.doc('orders/order-other').set({
      userId: 'owner-1',
      assignedTo: 'emp-other',
      status: 'pending',
    });

    // Insumo pertencente a owner-1
    await db.doc('supplies/sup-1').set({
      userId: 'owner-1',
      name: 'Papel Offset 180g',
      unitPrice: 1.5,
    });

    // Produto da loja criado por emp-limited antes de perder permissão de store
    await db.doc('storeProducts/sp-1').set({
      userId: 'emp-limited',
      name: 'Topo de Bolo',
      price: 35,
      active: true,
    });

    // Arquivos pré-existentes no Storage
    await uploadBytes(
      ref(storage as any, 'users/owner-1/customers/foto-cliente.jpg'),
      new Uint8Array([1, 2, 3]),
      { contentType: 'image/jpeg' },
    );
    await uploadBytes(
      ref(storage as any, 'users/owner-1/orders/order-other/arte-privada.jpg'),
      new Uint8Array([4, 5, 6]),
      { contentType: 'image/jpeg' },
    );
  });
});

describe('Red-Team / Audit Regressions — storage.rules & firestore.rules', () => {
  it('[ALTO] storage.rules ownerHasPerm deve ser deny-by-default quando módulo não existe em permissions', async () => {
    const minimalStorage = env.authenticatedContext('minimal-user').storage();

    await assertFails(
      uploadBytes(
        ref(minimalStorage as any, 'users/minimal-user/orders/order-1/anexo.jpg'),
        new Uint8Array([1, 2, 3]),
        { contentType: 'image/jpeg' },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(minimalStorage as any, 'users/minimal-user/gallery/img.jpg'),
        new Uint8Array([1, 2, 3]),
        { contentType: 'image/jpeg' },
      ),
    );
  });

  it('[ALTO] storage.rules não deve permitir upload em /store/ por usuário sem permissão de loja', async () => {
    const empStorage = env.authenticatedContext('emp-limited').storage();

    await assertFails(
      uploadBytes(
        ref(empStorage as any, 'store/catalog-logo/logo-indevido.png'),
        new Uint8Array([1, 2, 3]),
        { contentType: 'image/png', customMetadata: { userId: 'emp-limited' } },
      ),
    );
  });

  it('[ALTO] storage.rules não deve permitir leitura pública (não autenticada) da pasta customers', async () => {
    const anonStorage = env.unauthenticatedContext().storage();

    await assertFails(
      getBytes(ref(anonStorage as any, 'users/owner-1/customers/foto-cliente.jpg')),
    );
  });

  it('[ALTO] storage.rules não deve permitir que funcionário leia anexos de pedido não atribuído a ele', async () => {
    const empStorage = env.authenticatedContext('emp-limited').storage();

    await assertFails(
      getBytes(ref(empStorage as any, 'users/owner-1/orders/order-other/arte-privada.jpg')),
    );
  });

  it('[ALTO] firestore.rules não deve expor storeSettings/backendRoutingTelemetry para usuários não autenticados', async () => {
    const anonDb = env.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(anonDb as any, 'storeSettings/backendRoutingTelemetry')));
  });

  it('[ALTO] firestore.rules deve manter userId imutável em updates de supplies', async () => {
    const empDb = env.authenticatedContext('emp-limited').firestore();

    await assertFails(
      updateDoc(doc(empDb as any, 'supplies/sup-1'), {
        userId: 'emp-limited',
        name: 'Papel Reatribuído',
      }),
    );
  });

  it('[ALTO] firestore.rules não deve permitir update em storeProducts quando permissão de store foi revogada', async () => {
    const empDb = env.authenticatedContext('emp-limited').firestore();

    await assertFails(
      updateDoc(doc(empDb as any, 'storeProducts/sp-1'), {
        price: 1,
      }),
    );
  });

  it('[CONTROLE] storeSettings/public continua legível para a vitrine pública', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('storeSettings/public').set({ storeName: 'Luisices' });
    });

    const anonDb = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(anonDb as any, 'storeSettings/public')));
  });
});

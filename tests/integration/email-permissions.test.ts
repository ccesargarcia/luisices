import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getMetadata, deleteObject, listAll } from 'firebase/storage';
import { assertPermissionDenied } from '../helpers/assertPermissionDenied';
import { createEmailHistory } from '../../src/services/emailHistory';

let env: RulesTestEnvironment;
const seed = (path: string, data: object) => env.withSecurityRulesDisabled(async context => {
  await context.firestore().doc(path).set(data);
});
const dbFor = (uid: string) => env.authenticatedContext(uid, { email_verified: true }).firestore();
const email = { from: 'sender@example.test', to: ['owner@example.test'], subject: 'Original', html: '<p>Original</p>', read: false, starred: false, archived: false, receivedAt: '2026-10-01T00:00:00Z' };
beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) throw new Error('Use os emuladores.');
  env = await initializeTestEnvironment({ projectId: 'demo-luisices-review',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  for (const action of ['view', 'create', 'edit', 'delete']) {
    await seed(`userProfiles/${action}`, { role: 'funcionario', active: true, permissions: { emails: { [action]: true } } });
  }
  await seed('userProfiles/admin', { role: 'admin', active: true, permissions: {} });
  await seed('userProfiles/legacy', { role: 'user', active: true, permissions: {} });
  await seed('userProfiles/disabled', { role: 'admin', active: false, permissions: { emails: true } });
  await seed('receivedEmails/mail', email);
  await seed('sentEmails/mail', { ...email, sentAt: email.receivedAt, senderUid: 'admin' });
});

describe('permissões granulares da central', () => {
  it('nega leitura e escrita para perfil sem emails e para perfil desativado', async () => {
    for (const uid of ['legacy', 'disabled']) {
      const db = dbFor(uid);
      await assertPermissionDenied(() => getDoc(doc(db as any, 'receivedEmails/mail')));
      await assertPermissionDenied(() => updateDoc(doc(db as any, 'receivedEmails/mail'), { read: true }));
      await assertPermissionDenied(() => deleteDoc(doc(db as any, 'sentEmails/mail')));
    }
  });
  it('view não autoriza edição, exclusão ou criação', async () => {
    const db = dbFor('view');
    await assertSucceeds(getDocs(collection(db as any, 'receivedEmails')));
    await assertPermissionDenied(() => updateDoc(doc(db as any, 'receivedEmails/mail'), { read: true }));
    await assertPermissionDenied(() => deleteDoc(doc(db as any, 'receivedEmails/mail')));
    await assertPermissionDenied(() => setDoc(doc(db as any, 'receivedEmails/new'), email));
  });
  it('edit permite somente flags booleanas recebidas e preserva o histórico enviado', async () => {
    const db = dbFor('edit');
    await assertSucceeds(updateDoc(doc(db as any, 'receivedEmails/mail'), { read: true, starred: true, archived: true }));
    for (const patch of [{ html: 'forged' }, { from: 'forged' }, { read: 'yes' }, { to: ['forged'] }, { receivedAt: 'forged' }]) {
      await assertPermissionDenied(() => updateDoc(doc(db as any, 'receivedEmails/mail'), patch));
    }
    await assertPermissionDenied(() => updateDoc(doc(db as any, 'sentEmails/mail'), { subject: 'forged' }));
    await assertPermissionDenied(() => deleteDoc(doc(db as any, 'receivedEmails/mail')));
  });
  it('create não cria registros diretamente e delete não edita conteúdo', async () => {
    await assertPermissionDenied(() => setDoc(doc(dbFor('create') as any, 'sentEmails/new'), email));
    await assertPermissionDenied(() => updateDoc(doc(dbFor('delete') as any, 'receivedEmails/mail'), { html: 'forged' }));
    await assertSucceeds(deleteDoc(doc(dbFor('delete') as any, 'receivedEmails/mail')));
    await assertSucceeds(deleteDoc(doc(dbFor('delete') as any, 'sentEmails/mail')));
  });
});

describe('rascunhos privados', () => {
  it('bloqueia leitura/listagem pública e alterações por outro usuário mesmo na regra genérica de pedidos', async () => {
    const path = 'users/create/orders/email_draft/security-test.pdf';
    const owner = env.authenticatedContext('create').storage();
    await assertSucceeds(uploadBytes(ref(owner as any, path), new Uint8Array([1]), { contentType: 'application/pdf' }));
    await assertSucceeds(getMetadata(ref(owner as any, path)));
    for (const storage of [env.unauthenticatedContext().storage(), env.authenticatedContext('edit').storage()]) {
      await assertPermissionDenied(() => getMetadata(ref(storage as any, path)));
      await assertPermissionDenied(() => listAll(ref(storage as any, 'users/create/orders/email_draft')));
      await assertPermissionDenied(() => uploadBytes(ref(storage as any, path), new Uint8Array([2])));
      await assertPermissionDenied(() => deleteObject(ref(storage as any, path)));
    }
    await seed('userProfiles/create', { role: 'user', active: false, permissions: { emails: true } });
    await assertPermissionDenied(() => getMetadata(ref(owner as any, path)));
  });
});

describe('histórico paginado por cursor', () => {
  it('alcança mensagens além de 50, sem lacunas após inserção e exclusão na fronteira', async () => {
    await env.withSecurityRulesDisabled(async context => {
      const batch = context.firestore().batch();
      for (let i = 0; i < 61; i++) batch.set(context.firestore().doc(`receivedEmails/page-${i}`), {
        ...email, receivedAt: new Date(Date.UTC(2026, 9, 2, 0, i)).toISOString(),
      });
      await batch.commit();
    });
    let ids: string[] = [];
    let hasMore = true;
    const errors: unknown[] = [];
    const history = createEmailHistory(dbFor('view') as any, 'receivedEmails', (docs, more) => {
      ids = docs.map(d => d.id); hasMore = more;
    }, err => errors.push(err));
    try {
      await history.loadMore();
      expect(ids).toHaveLength(50);
      expect(hasMore).toBe(true);
      await history.loadAll();
      await expect.poll(() => ids.length).toBe(62);
      expect(hasMore).toBe(false);
      await seed('receivedEmails/newest', { ...email, receivedAt: '2026-11-01T00:00:00Z' });
      await env.withSecurityRulesDisabled(async context => context.firestore().doc('receivedEmails/page-11').delete());
      await expect.poll(() => ids.includes('newest') && !ids.includes('page-11')).toBe(true);
      expect(new Set(ids).size).toBe(62);
      expect(ids).toContain('page-0');
      expect(ids).toContain('mail');
      expect(errors).toEqual([]);
    } finally { history.close(); }
  });
});

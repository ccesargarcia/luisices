import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, describe, it } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
let env: RulesTestEnvironment;
beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Execute com emulador Firestore.');
  env = await initializeTestEnvironment({ projectId: 'demo-luisices-review', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    for (const uid of ['a', 'b']) {
      await context.firestore().doc(`userProfiles/${uid}`).set({ active: true, role: 'user', permissions: { whatsapp: true } });
    }
    await context.firestore().doc('userProfiles/admin').set({ active: true, role: 'admin' });
    for (const name of ['whatsapp_chats', 'whatsapp_messages']) {
      await context.firestore().doc(`${name}/own`).set({ userId: 'a' });
      await context.firestore().doc(`${name}/foreign`).set({ userId: 'b' });
      await context.firestore().doc(`${name}/legacy`).set({ text: 'sem proprietário' });
    }
  });
});
describe('Regras de isolamento WhatsApp', () => {
  for (const name of ['whatsapp_chats', 'whatsapp_messages']) {
    it(`${name}: permite própria caixa, bloqueia outra e legado`, async () => {
      const db = env.authenticatedContext('a').firestore();
      await assertSucceeds(getDoc(doc(db, name, 'own')));
      await assertFails(getDoc(doc(db, name, 'foreign')));
      await assertFails(getDoc(doc(db, name, 'legacy')));
      await assertFails(getDocs(collection(db, name)));
      await assertSucceeds(getDocs(query(collection(db, name), where('userId', '==', 'a'))));
    });
    it(`${name}: permite administração conferir legado`, async () => {
      await assertSucceeds(getDoc(doc(env.authenticatedContext('admin').firestore(), name, 'legacy')));
    });
  }
});

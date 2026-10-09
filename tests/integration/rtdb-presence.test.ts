import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';

let env: RulesTestEnvironment;
// Suíte dedicada: npm run test:presence. As demais integrações continuam independentes.
const enabled = Boolean(process.env.FIREBASE_DATABASE_EMULATOR_HOST);
describe.skipIf(!enabled)('Regras reais de presença RTDB', () => {
  beforeAll(async () => {
    const [host, port] = process.env.FIREBASE_DATABASE_EMULATOR_HOST!.split(':');
    env = await initializeTestEnvironment({
      projectId: 'demo-luisices-presence',
      database: { host, port: Number(port), rules: readFileSync('database.rules.json', 'utf8') },
    });
  });
  beforeEach(async () => {
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async context => {
      await context.database().ref('status/member/connections/tab').set(true);
      await context.database().ref('revocations/revoked-admin').set(200000);
    });
  });
  afterAll(async () => { await env?.cleanup(); });

  it('permite listagem a admin ativo com claims corretas', async () => {
    const db = env.authenticatedContext('admin', { role: 'admin', active: true, auth_time: 300 }).database();
    await assertSucceeds(db.ref('status').once('value'));
  });
  it('nega listagem quando perfil admin não foi propagado ao token', async () => {
    const db = env.authenticatedContext('admin', { active: true, auth_time: 300 }).database();
    await assertFails(db.ref('status').once('value'));
  });
  it('nega anônimo e usuário comum na raiz, mas permite leitura do próprio status', async () => {
    await assertFails(env.unauthenticatedContext().database().ref('status').once('value'));
    const db = env.authenticatedContext('member', { role: 'user', active: true }).database();
    await assertFails(db.ref('status').once('value'));
    await assertSucceeds(db.ref('status/member').once('value'));
    await assertFails(db.ref('status/other').once('value'));
  });
  it('nega admin inativo', async () => {
    const db = env.authenticatedContext('admin', { role: 'admin', active: false }).database();
    await assertFails(db.ref('status').once('value'));
  });
  it('nega sessão anterior ou no mesmo segundo da revogação', async () => {
    for (const auth_time of [199, 200]) {
      const db = env.authenticatedContext('revoked-admin', { role: 'admin', active: true, auth_time }).database();
      await assertFails(db.ref('status').once('value'));
    }
  });
  it('permite admin após nova autenticação e impede alteração cliente da barreira', async () => {
    const db = env.authenticatedContext('revoked-admin', { role: 'admin', active: true, auth_time: 201 }).database();
    await assertSucceeds(db.ref('status').once('value'));
    await assertFails(db.ref('revocations/revoked-admin').set(0));
  });
});


import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeApp, deleteApp, type App } from 'firebase-admin/app';
import { FieldPath, getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { migrateUserProfileCreatedAt } from '../../scripts/migrate-user-profile-created-at.mjs';

let app: App;
let db: Firestore;
const collectionName = 'migrationTestProfiles';

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Execute pelo Firebase Emulator para testar a migração.');
  }
  app = initializeApp({ projectId: 'demo-luisices-review' }, `profile-created-at-migration-${Date.now()}`);
  db = getFirestore(app);
});

afterAll(async () => {
  if (db) {
    const snapshot = await db.collection(collectionName).get();
    const batch = db.batch();
    snapshot.docs.forEach((profile) => batch.delete(profile.ref));
    if (!snapshot.empty) await batch.commit();
  }
  if (app) await deleteApp(app);
});

beforeEach(async () => {
  const snapshot = await db.collection(collectionName).get();
  const batch = db.batch();
  snapshot.docs.forEach((profile) => batch.delete(profile.ref));
  if (!snapshot.empty) await batch.commit();
});

describe('migração de datas de criação de perfis no Firestore Emulator', () => {
  it('converte somente ISO legados, mantém valores existentes e corrige a ordenação cronológica', async () => {
    const profiles = db.collection(collectionName);
    await Promise.all([
      profiles.doc('legacy-older').set({ createdAt: '2020-02-03T04:05:06.007Z' }),
      profiles.doc('timestamp-middle').set({ createdAt: Timestamp.fromDate(new Date('2023-05-06T07:08:09.010Z')) }),
      profiles.doc('legacy-newer').set({ createdAt: '2025-08-09T10:11:12.013Z' }),
      profiles.doc('invalid-string').set({ createdAt: '09/08/2025' }),
      profiles.doc('missing-date').set({ displayName: 'Perfil sem data' }),
    ]);

    const logger = { log: () => undefined, error: () => undefined };
    const dryRun = await migrateUserProfileCreatedAt({
      db, Timestamp, dryRun: true, pageSize: 2, collectionName, logger,
    });
    expect(dryRun).toMatchObject({
      scanned: 5,
      planned: 2,
      migrated: 0,
      alreadyTimestamp: 1,
      missing: 1,
      invalidOrUnsupported: 1,
      errors: 0,
    });
    expect((await profiles.doc('legacy-older').get()).get('createdAt')).toBe('2020-02-03T04:05:06.007Z');

    const applied = await migrateUserProfileCreatedAt({
      db, Timestamp, dryRun: false, pageSize: 2, collectionName, logger,
    });
    expect(applied).toMatchObject({ migrated: 2, planned: 2, errors: 0 });

    const migratedOlder = (await profiles.doc('legacy-older').get()).get('createdAt');
    const migratedNewer = (await profiles.doc('legacy-newer').get()).get('createdAt');
    expect(migratedOlder).toBeInstanceOf(Timestamp);
    expect(migratedOlder.toDate().toISOString()).toBe('2020-02-03T04:05:06.007Z');
    expect(migratedNewer).toBeInstanceOf(Timestamp);
    expect((await profiles.doc('invalid-string').get()).get('createdAt')).toBe('09/08/2025');
    expect((await profiles.doc('missing-date').get()).get('createdAt')).toBeUndefined();

    const ordered = await profiles.orderBy('createdAt', 'asc').orderBy(FieldPath.documentId(), 'asc').get();
    expect(ordered.docs.map((profile) => profile.id)).toEqual([
      'legacy-older', 'timestamp-middle', 'legacy-newer', 'invalid-string',
    ]);

    const rerun = await migrateUserProfileCreatedAt({
      db, Timestamp, dryRun: false, pageSize: 2, collectionName, logger,
    });
    expect(rerun).toMatchObject({ planned: 0, migrated: 0, alreadyTimestamp: 3, errors: 0 });
  });
});

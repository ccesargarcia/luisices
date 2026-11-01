#!/usr/bin/env node
/**
 * Normalize legacy userProfiles.createdAt ISO strings to Firestore Timestamps.
 * Safe by default: scans and reports only; writes require --apply.
 *
 * Examples:
 *   node scripts/migrate-user-profile-created-at.mjs --project=luisices-dev
 *   node scripts/migrate-user-profile-created-at.mjs --project=papelaria-dashboard
 *   node scripts/migrate-user-profile-created-at.mjs --project=papelaria-dashboard --apply --confirm-project=papelaria-dashboard --confirm-production
 */

import admin from 'firebase-admin';
import { pathToFileURL } from 'node:url';

const PRODUCTION_PROJECT = 'papelaria-dashboard';
const ALLOWED_PROJECTS = new Set(['luisices-dev', PRODUCTION_PROJECT, 'demo-luisices-review']);
const DEFAULT_PAGE_SIZE = 250;

export function parseLegacyIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) return null;
  return date;
}

function isFirestoreTimestamp(value, Timestamp) {
  return value instanceof Timestamp;
}

/**
 * Scan every user profile by document ID and convert only canonical ISO timestamps.
 * Each write re-reads the document transactionally so a concurrent profile update
 * cannot be overwritten with a stale value collected during the scan.
 */
export async function migrateUserProfileCreatedAt({
  db,
  Timestamp,
  dryRun = true,
  pageSize = DEFAULT_PAGE_SIZE,
  collectionName = 'userProfiles',
  logger = console,
}) {
  if (!db || !Timestamp) throw new TypeError('db e Timestamp são obrigatórios.');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 500) {
    throw new RangeError('pageSize deve ser um inteiro entre 1 e 500.');
  }

  const stats = {
    scanned: 0,
    planned: 0,
    migrated: 0,
    alreadyTimestamp: 0,
    missing: 0,
    invalidOrUnsupported: 0,
    changedDuringRun: 0,
    errors: 0,
  };
  const collection = db.collection(collectionName);
  let cursor = null;

  while (true) {
    let query = collection.orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) break;
    cursor = page.docs[page.docs.length - 1];

    for (const doc of page.docs) {
      stats.scanned += 1;
      const originalValue = doc.get('createdAt');
      if (isFirestoreTimestamp(originalValue, Timestamp)) {
        stats.alreadyTimestamp += 1;
        continue;
      }
      if (originalValue === undefined || originalValue === null) {
        stats.missing += 1;
        continue;
      }
      const parsedDate = parseLegacyIsoDate(originalValue);
      if (!parsedDate) {
        stats.invalidOrUnsupported += 1;
        continue;
      }

      stats.planned += 1;
      if (dryRun) continue;

      try {
        const outcome = await db.runTransaction(async (transaction) => {
          const currentSnap = await transaction.get(doc.ref);
          if (!currentSnap.exists) return 'changed';
          const currentValue = currentSnap.get('createdAt');
          if (currentValue !== originalValue) return 'changed';
          transaction.update(doc.ref, { createdAt: Timestamp.fromDate(parsedDate) });
          return 'migrated';
        });
        if (outcome === 'migrated') stats.migrated += 1;
        else stats.changedDuringRun += 1;
      } catch (error) {
        stats.errors += 1;
        logger.error(`[migrate-user-profile-created-at] Falha ao atualizar um perfil (ID omitido): ${error?.message || 'erro desconhecido'}`);
      }
    }

    if (page.size < pageSize) break;
  }

  logger.log(`Perfis analisados: ${stats.scanned}`);
  logger.log(`Conversões previstas: ${stats.planned}`);
  logger.log(`Convertidos: ${stats.migrated}`);
  logger.log(`Já eram Timestamp: ${stats.alreadyTimestamp}`);
  logger.log(`Sem createdAt: ${stats.missing}`);
  logger.log(`Formato inválido/não suportado: ${stats.invalidOrUnsupported}`);
  logger.log(`Alterados durante a migração: ${stats.changedDuringRun}`);
  logger.log(`Falhas: ${stats.errors}`);
  if (dryRun) logger.log('Simulação concluída; nenhuma gravação foi feita.');
  return stats;
}

function readArg(name) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

async function main() {
  const projectId = readArg('project');
  const apply = process.argv.includes('--apply');
  const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const confirmedProject = readArg('confirm-project');
  const confirmProduction = process.argv.includes('--confirm-production');

  if (!projectId || !ALLOWED_PROJECTS.has(projectId)) {
    throw new Error('Informe --project=luisices-dev, --project=papelaria-dashboard ou --project=demo-luisices-review.');
  }
  if (emulator && projectId !== 'demo-luisices-review') {
    throw new Error('No emulador, use exclusivamente --project=demo-luisices-review.');
  }
  if (!emulator && projectId === 'demo-luisices-review') {
    throw new Error('O projeto demo-luisices-review só pode ser usado com FIRESTORE_EMULATOR_HOST configurado.');
  }
  if (apply && !emulator && confirmedProject !== projectId) {
    throw new Error('Gravação remota exige --confirm-project=<mesmo projeto informado em --project>.');
  }
  if (apply && projectId === PRODUCTION_PROJECT && !confirmProduction) {
    throw new Error('Gravação em produção exige também --confirm-production.');
  }

  const app = admin.apps[0] || admin.initializeApp({ projectId });
  try {
    console.log(`Projeto: ${projectId}`);
    console.log(`Destino: ${emulator ? 'Firestore Emulator' : 'Firestore remoto'}`);
    console.log(`Modo: ${apply ? 'APLICAR' : 'SIMULAÇÃO (somente leitura)'}`);
    const stats = await migrateUserProfileCreatedAt({
      db: admin.firestore(app),
      Timestamp: admin.firestore.Timestamp,
      dryRun: !apply,
    });
    if (stats.errors > 0) process.exitCode = 1;
  } finally {
    await app.delete();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[migrate-user-profile-created-at] ${error.message}`);
    process.exitCode = 1;
  });
}

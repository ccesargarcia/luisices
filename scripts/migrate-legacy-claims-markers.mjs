#!/usr/bin/env node
/**
 * scripts/migrate-legacy-claims-markers.mjs
 *
 * Script de migração segura e conservadora de marcadores legados de sincronização
 * (`claimsSyncPending: true` -> `claimsSyncPending: { version, opId, ... }`).
 *
 * Características:
 *  - Executa por padrão em modo DRY-RUN (requer --execute para aplicar alterações reais).
 *  - Processamento em lotes limitados (--batch-size=50).
 *  - Transação atômica por documento que confirma que o marcador ainda é `true`.
 *    (Se outra operação tiver gravado um marcador estruturado, NÃO sobrescreve).
 *  - Logs estritamente sem dados pessoais (PII).
 *  - Relatório final com contagem e estimativa de custo de operações no Firestore.
 *
 * Uso:
 *   node scripts/migrate-legacy-claims-markers.mjs --dry-run
 *   node scripts/migrate-legacy-claims-markers.mjs --execute --batch-size=50
 */

import admin from 'firebase-admin';

// Inicialização segura do Firebase Admin
if (!admin.apps.length) {
  // Se executado em ambiente com emulador ou credenciais GCP padrão
  const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'luisices-dev';
  admin.initializeApp({ projectId });
}

const db = admin.firestore();

// Leitura de argumentos CLI
const args = process.argv.slice(2);
const isExecute = args.includes('--execute');
const isDryRun = !isExecute || args.includes('--dry-run');
const batchSizeArg = args.find((a) => a.startsWith('--batch-size='));
const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 50;

async function runMigration() {
  console.log('================================================================');
  console.log(' MIGRATION: Marcadores Legados de Sincronização (claimsSyncPending)');
  console.log('================================================================');
  console.log(`Modo: ${isDryRun ? 'DRY-RUN (Simulação - nenhuma escrita será feita)' : 'EXECUÇÃO ATIVA (--execute)'}`);
  console.log(`Tamanho máximo do lote: ${BATCH_SIZE} documentos`);
  console.log('----------------------------------------------------------------');

  const stats = {
    totalScanned: 0,
    legacyMarkersFound: 0,
    alreadyMigrated: 0,
    migratedSuccess: 0,
    skippedRaceCondition: 0,
    errors: 0,
  };

  try {
    // 1. Escaneamento dos perfis com claimsSyncPending ativo
    console.log('[1/3] Consultando perfis na coleção userProfiles...');
    const snapshot = await db.collection('userProfiles').get();
    stats.totalScanned = snapshot.size;

    const legacyDocs = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.claimsSyncPending === true) {
        legacyDocs.push({ id: doc.id, data });
      } else if (data.claimsSyncPending && typeof data.claimsSyncPending === 'object') {
        stats.alreadyMigrated++;
      }
    });

    stats.legacyMarkersFound = legacyDocs.length;
    console.log(`[2/3] Total de perfis analisados: ${stats.totalScanned}`);
    console.log(`      Perfis já no schema novo: ${stats.alreadyMigrated}`);
    console.log(`      Perfis com marcador legado (true): ${stats.legacyMarkersFound}`);

    if (stats.legacyMarkersFound === 0) {
      console.log('\nNenhum perfil requer migração. Base já está 100% atualizada.');
      printCostEstimate(stats);
      return;
    }

    // 2. Processamento em lotes limitados
    console.log(`\n[3/3] Processando ${legacyDocs.length} registros em lotes de ${BATCH_SIZE}...`);

    for (let i = 0; i < legacyDocs.length; i += BATCH_SIZE) {
      const batchDocs = legacyDocs.slice(i, i + BATCH_SIZE);
      console.log(`\nProcessando lote ${Math.floor(i / BATCH_SIZE) + 1} (${batchDocs.length} itens)...`);

      for (const item of batchDocs) {
        const uid = item.id;
        const profileRef = db.doc(`userProfiles/${uid}`);

        if (isDryRun) {
          // Em dry-run, apenas contabiliza e simula
          stats.migratedSuccess++;
          continue;
        }

        // Execução Transacional Atômica (preserva concorrência)
        try {
          const result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(profileRef);
            if (!snap.exists) return { skipped: true, reason: 'not-found' };

            const cur = snap.data();
            // Confirma que AINDA é estritamente o booleano true
            if (cur.claimsSyncPending !== true) {
              return { skipped: true, reason: 'already-updated-or-not-legacy' };
            }

            const currentVersion = Number(cur.syncVersion || 0);
            const nextVersion = currentVersion + 1;
            const opId = `migrated_${admin.firestore().collection('_').doc().id}`;

            const structuredMarker = {
              version: nextVersion,
              opId,
              status: 'pending',
              needsRevocation: false, // Política conservadora: não desloga usuário sem certeza
              needsClaims: true,
              syncedVersion: currentVersion,
              lastError: null,
              attempts: 0,
              updatedAt: Date.now(),
              lease: null,
            };

            tx.update(profileRef, {
              syncVersion: nextVersion,
              claimsSyncPending: structuredMarker,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return { migrated: true, version: nextVersion };
          });

          if (result.migrated) {
            stats.migratedSuccess++;
          } else {
            stats.skippedRaceCondition++;
          }
        } catch (err) {
          stats.errors++;
          console.error(`Erro ao processar item do lote (ID omitido por segurança): ${err.message}`);
        }
      }
    }

    console.log('\n================================================================');
    console.log(' RELATÓRIO FINAL DA MIGRAÇÃO');
    console.log('================================================================');
    console.log(`Documentos escaneados:       ${stats.totalScanned}`);
    console.log(`Marcadores legados achados:  ${stats.legacyMarkersFound}`);
    console.log(`Migrados com sucesso:        ${stats.migratedSuccess}`);
    console.log(`Ignorados por concorrência:  ${stats.skippedRaceCondition}`);
    console.log(`Erros durante execução:      ${stats.errors}`);

    printCostEstimate(stats);

  } catch (error) {
    console.error('Falha geral na migração:', error);
    process.exit(1);
  }
}

function printCostEstimate(stats) {
  console.log('\n----------------------------------------------------------------');
  console.log(' ESTIMATIVA DE CUSTOS DE FIRESTORE (Preços Oficiais Google Cloud)');
  console.log('----------------------------------------------------------------');
  console.log('Tabela de referência (us-central1 / multi-region americas):');
  console.log(' - Leituras:  $0.06 por 100.000 leituras');
  console.log(' - Gravações: $0.18 por 100.000 gravações');
  console.log('');

  const reads = stats.totalScanned + stats.legacyMarkersFound; // Scan + transaction get
  const writes = stats.legacyMarkersFound; // Transaction update

  const readCost = (reads / 100000) * 0.06;
  const writeCost = (writes / 100000) * 0.18;
  const totalCost = readCost + writeCost;

  console.log(`Operações estimadas na execução real:`);
  console.log(` - Leituras estimadas:  ${reads} ops (~$${readCost.toFixed(6)})`);
  console.log(` - Gravações estimadas: ${writes} ops (~$${writeCost.toFixed(6)})`);
  console.log(` - Custo financeiro total estimado: ~$${totalCost.toFixed(6)} USD`);
  console.log('----------------------------------------------------------------\n');
}

runMigration();

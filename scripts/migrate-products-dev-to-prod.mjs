/**
 * Script de Migração Segura de Produtos da Lojinha (Dev ➔ Prod)
 *
 * Utiliza o Firebase Admin SDK para ler os produtos de 'luisices-dev'
 * e copiar para 'papelaria-dashboard' com { merge: true }.
 *
 * Suporta modo DRY RUN (apenas visualização sem escrita).
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function parseServiceAccount(raw, name) {
  if (!raw) {
    throw new Error(`❌ Service Account '${name}' não foi informada.`);
  }
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (err) {
    throw new Error(`❌ Falha ao fazer parse do JSON da Service Account '${name}': ${err.message}`);
  }
}

const isDryRun = process.env.DRY_RUN === 'true';
const migrateStoreProducts = process.env.MIGRATE_STORE_PRODUCTS !== 'false';
const migrateStoreSettings = process.env.MIGRATE_STORE_SETTINGS === 'true';
const migrateInternalProducts = process.env.MIGRATE_INTERNAL_PRODUCTS === 'true';

console.log('====================================================');
console.log('📦 MIGRAÇÃO DE PRODUTOS FIREBASE: DEV ➔ PROD');
console.log(`🔍 Modo: ${isDryRun ? '🟡 DRY RUN (Simulação - Nenhuma alteração será salva)' : '🟢 PRODUÇÃO REAL'}`);
console.log(`🛍️ Migrar Produtos da Vitrine (storeProducts): ${migrateStoreProducts ? 'SIM' : 'NÃO'}`);
console.log(`🎨 Migrar Configurações da Lojinha (storeSettings/public): ${migrateStoreSettings ? 'SIM' : 'NÃO'}`);
console.log(`📋 Migrar Produtos Internos (products): ${migrateInternalProducts ? 'SIM' : 'NÃO'}`);
console.log('====================================================\n');

// 1. Inicializar instâncias do Firebase Admin
const devSa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_DEV, 'FIREBASE_SERVICE_ACCOUNT_DEV');
const prodSa = parseServiceAccount(
  process.env.FIREBASE_SERVICE_ACCOUNT_PROD || process.env.FIREBASE_SERVICE_ACCOUNT,
  'FIREBASE_SERVICE_ACCOUNT_PROD'
);

const devApp = initializeApp(
  { credential: cert(devSa), projectId: devSa.project_id || 'luisices-dev' },
  'devApp'
);
const prodApp = initializeApp(
  { credential: cert(prodSa), projectId: prodSa.project_id || 'papelaria-dashboard' },
  'prodApp'
);

const devDb = getFirestore(devApp);
const prodDb = getFirestore(prodApp);

let totalMigrated = 0;

try {
  // ─── 2. Migrar storeProducts (Produtos da Vitrine da Lojinha) ─────────────────
  if (migrateStoreProducts) {
    console.log('🔄 Consultando coleção storeProducts em Dev (luisices-dev)...');
    const snap = await devDb.collection('storeProducts').get();

    if (snap.empty) {
      console.log('ℹ️ Nenhum produto encontrado na coleção storeProducts em Dev.');
    } else {
      console.log(`✔ Encontrados ${snap.size} produtos na vitrine de Dev:\n`);

      const batch = prodDb.batch();

      snap.docs.forEach((doc, idx) => {
        const data = doc.data();
        console.log(`  [${idx + 1}/${snap.size}] ID: ${doc.id} | Nome: "${data.name || 'Sem nome'}" | Preço: R$ ${Number(data.price ?? 0).toFixed(2)} | Ativo: ${data.active !== false}`);

        if (!isDryRun) {
          const targetRef = prodDb.collection('storeProducts').doc(doc.id);
          batch.set(targetRef, data, { merge: true });
        }
      });

      if (!isDryRun) {
        await batch.commit();
        console.log(`\n✅ Sucesso! ${snap.size} produtos da vitrine copiados para Produção (papelaria-dashboard).`);
      } else {
        console.log(`\n🟡 Simulação concluída. Nenhum produto foi gravado no banco.`);
      }
      totalMigrated += snap.size;
    }
  }

  // ─── 3. Migrar storeSettings/public (Opcional: Banners, Logo e Cores da Lojinha) ──
  if (migrateStoreSettings) {
    console.log('\n🔄 Consultando storeSettings/public em Dev...');
    const settingsDoc = await devDb.collection('storeSettings').doc('public').get();

    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      console.log('✔ Configurações da Lojinha encontradas em Dev:');
      console.log(`  - Nome do Negócio: ${data.businessName || 'Não definido'}`);
      console.log(`  - WhatsApp: ${data.catalogWhatsappPhone || data.whatsappPhone || 'Não definido'}`);
      console.log(`  - Quantidade de Banners: ${Array.isArray(data.catalogBanners) ? data.catalogBanners.length : 0}`);

      if (!isDryRun) {
        await prodDb.collection('storeSettings').doc('public').set(data, { merge: true });
        console.log('✅ Configurações da Lojinha copiadas com sucesso para Produção.');
      } else {
        console.log('🟡 Simulação: Configurações NÃO foram gravadas.');
      }
    } else {
      console.log('ℹ️ Nenhum documento storeSettings/public encontrado em Dev.');
    }
  }

  // ─── 4. Migrar products (Opcional: Catálogo Interno do Ateliê) ──────────────────
  if (migrateInternalProducts) {
    console.log('\n🔄 Consultando coleção products (Catálogo Interno) em Dev...');
    const internalSnap = await devDb.collection('products').get();

    if (internalSnap.empty) {
      console.log('ℹ️ Nenhum produto interno encontrado na coleção products em Dev.');
    } else {
      console.log(`✔ Encontrados ${internalSnap.size} produtos internos em Dev:\n`);

      const batch = prodDb.batch();

      internalSnap.docs.forEach((doc, idx) => {
        const data = doc.data();
        console.log(`  [${idx + 1}/${internalSnap.size}] ID: ${doc.id} | Nome: "${data.name || 'Sem nome'}" | Preço: R$ ${Number(data.unitPrice ?? data.price ?? 0).toFixed(2)}`);

        if (!isDryRun) {
          const targetRef = prodDb.collection('products').doc(doc.id);
          batch.set(targetRef, data, { merge: true });
        }
      });

      if (!isDryRun) {
        await batch.commit();
        console.log(`\n✅ Sucesso! ${internalSnap.size} produtos internos copiados para Produção.`);
      }
      totalMigrated += internalSnap.size;
    }
  }

  console.log('\n====================================================');
  console.log(`🎉 Processo finalizado com sucesso! Total de itens processados: ${totalMigrated}`);
  console.log('====================================================');
} catch (err) {
  console.error('\n❌ Erro durante a migração:', err);
  process.exit(1);
}

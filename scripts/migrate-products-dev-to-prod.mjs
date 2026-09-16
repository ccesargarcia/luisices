/**
 * Script de Migração Segura de Produtos e Configurações da Lojinha (Dev ➔ Prod)
 *
 * Utiliza o Firebase Admin SDK para ler de 'luisices-dev'
 * e copiar para 'papelaria-dashboard' com { merge: true }.
 *
 * Migra:
 * 1. Vitrine da Lojinha Pública (storeProducts)
 * 2. Catálogo Geral de Produtos (products)
 * 3. Configurações Completas da Lojinha (storeSettings/public: Banners, Rodapé, Header, Logo, Cores, WhatsApp)
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
const migrateStoreSettings = process.env.MIGRATE_STORE_SETTINGS !== 'false';
const migrateInternalProducts = process.env.MIGRATE_INTERNAL_PRODUCTS !== 'false';

console.log('====================================================');
console.log('📦 MIGRAÇÃO DE CATÁLOGO & CONFIGURAÇÕES: DEV ➔ PROD');
console.log(`🔍 Modo: ${isDryRun ? '🟡 DRY RUN (Simulação - Apenas leitura sem salvar)' : '🟢 PRODUÇÃO REAL'}`);
console.log(`🛍️ Migrar Produtos da Vitrine (storeProducts): ${migrateStoreProducts ? 'SIM' : 'NÃO'}`);
console.log(`🎨 Migrar Banners, Rodapé e Layout (storeSettings/public): ${migrateStoreSettings ? 'SIM' : 'NÃO'}`);
console.log(`📋 Migrar Catálogo Geral de Produtos (products): ${migrateInternalProducts ? 'SIM' : 'NÃO'}`);
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
  // ─── 2. Migrar Configurações Completas da Lojinha (Banners, Rodapé, Header) ─────
  if (migrateStoreSettings) {
    console.log('🎨 [1/3] Consultando storeSettings/public em Dev...');
    const settingsDoc = await devDb.collection('storeSettings').doc('public').get();

    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      console.log('✔ Configurações da Lojinha encontradas em Dev:');
      console.log(`  • Nome da Loja: "${data.businessName || 'Não definido'}"`);
      console.log(`  • Slogan: "${data.businessTagline || 'Não definido'}"`);
      console.log(`  • WhatsApp: ${data.catalogWhatsappPhone || data.whatsappPhone || 'Não definido'}`);
      console.log(`  • Instagram: ${data.instagramUrl || 'Não definido'}`);
      console.log(`  • Banner Principal (Hero): ${data.catalogBanner ? 'Sim' : 'Não'}`);
      console.log(`  • Banners Rotativos (Carrossel): ${Array.isArray(data.catalogBanners) ? `${data.catalogBanners.length} banners` : 'Nenhum'}`);
      console.log(`  • Barra Superior (Header): ${data.catalogHeaderBackground ? 'Com imagem de fundo' : 'Cor sólida / Padrão'}`);
      console.log(`  • Rodapé - Texto Afetivo: ${data.catalogFooterText ? `"${data.catalogFooterText.slice(0, 40)}..."` : 'Padrão'}`);
      console.log(`  • Rodapé - Localização / Frete: ${data.catalogFooterLocation || 'Padrão'}`);
      console.log(`  • Rodapé - Horário de Atendimento: ${data.catalogFooterBusinessHours || 'Padrão'}`);
      console.log(`  • Rodapé - Copyright / Aviso: ${data.catalogFooterCopyright || data.catalogFooterNotice || 'Padrão'}`);

      if (!isDryRun) {
        await prodDb.collection('storeSettings').doc('public').set(data, { merge: true });
        console.log('✅ Configurações completas (Banners, Rodapé, Header) copiadas com sucesso para Produção!');
      } else {
        console.log('🟡 [Simulação] storeSettings/public NÃO foi gravado.');
      }
      totalMigrated++;
    } else {
      console.log('ℹ️ Nenhum documento storeSettings/public encontrado em Dev.');
    }
    console.log('');
  }

  // ─── 3. Migrar storeProducts (Produtos da Vitrine da Lojinha) ─────────────────
  if (migrateStoreProducts) {
    console.log('🛍️ [2/3] Consultando coleção storeProducts em Dev (luisices-dev)...');
    const snap = await devDb.collection('storeProducts').get();

    if (snap.empty) {
      console.log('ℹ️ Nenhum produto encontrado na vitrine de Dev.');
    } else {
      console.log(`✔ Encontrados ${snap.size} produtos na vitrine de Dev:\n`);

      const batch = prodDb.batch();

      snap.docs.forEach((doc, idx) => {
        const data = doc.data();
        console.log(`  [${idx + 1}/${snap.size}] ID: ${doc.id} | Nome: "${data.name || 'Sem nome'}" | Preço: R$ ${Number(data.price ?? 0).toFixed(2)} | Prazo: ${data.leadTimeDays || 5} dias | Ativo: ${data.active !== false}`);

        if (!isDryRun) {
          const targetRef = prodDb.collection('storeProducts').doc(doc.id);
          batch.set(targetRef, data, { merge: true });
        }
      });

      if (!isDryRun) {
        await batch.commit();
        console.log(`\n✅ Sucesso! ${snap.size} produtos da vitrine copiados para Produção (papelaria-dashboard).`);
      } else {
        console.log(`\n🟡 [Simulação] ${snap.size} produtos da vitrine listados. Nenhum produto foi gravado no banco.`);
      }
      totalMigrated += snap.size;
    }
    console.log('');
  }

  // ─── 4. Migrar products (Catálogo Geral do Ateliê) ───────────────────────────
  if (migrateInternalProducts) {
    console.log('📋 [3/3] Consultando coleção products (Catálogo Geral) em Dev...');
    const internalSnap = await devDb.collection('products').get();

    if (internalSnap.empty) {
      console.log('ℹ️ Nenhum produto encontrado no catálogo geral em Dev.');
    } else {
      console.log(`✔ Encontrados ${internalSnap.size} produtos no catálogo de Dev:\n`);

      const batch = prodDb.batch();

      internalSnap.docs.forEach((doc, idx) => {
        const data = doc.data();
        console.log(`  [${idx + 1}/${internalSnap.size}] ID: ${doc.id} | Nome: "${data.name || 'Sem nome'}" | Preço: R$ ${Number(data.unitPrice ?? data.price ?? 0).toFixed(2)} | Categoria: ${data.category || 'Geral'}`);

        if (!isDryRun) {
          const targetRef = prodDb.collection('products').doc(doc.id);
          batch.set(targetRef, data, { merge: true });
        }
      });

      if (!isDryRun) {
        await batch.commit();
        console.log(`\n✅ Sucesso! ${internalSnap.size} produtos do catálogo copiados para Produção.`);
      } else {
        console.log(`\n🟡 [Simulação] ${internalSnap.size} produtos do catálogo listados. Nenhum gravado.`);
      }
      totalMigrated += internalSnap.size;
    }
  }

  console.log('\n====================================================');
  console.log(`🎉 Migração concluída! Total de itens processados: ${totalMigrated}`);
  if (isDryRun) {
    console.log('💡 DICA: Para aplicar em Produção, execute novamente desmarcando a opção Dry Run.');
  }
  console.log('====================================================');
} catch (err) {
  console.error('\n❌ Erro durante a migração:', err);
  process.exit(1);
}

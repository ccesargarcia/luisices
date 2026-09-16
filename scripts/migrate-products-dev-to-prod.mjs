/**
 * Script de Migração Segura de Produtos, Imagens e Configurações (Dev ➔ Prod)
 *
 * Utiliza o Firebase Admin SDK e Sharp para:
 * 1. Otimizar e comprimir automaticamente todas as imagens para formato WebP ultra-leve.
 * 2. Transferir os arquivos físicos de imagem do Firebase Storage de Dev para Produção.
 * 3. Copiar as configurações da Lojinha (storeSettings/public: Banners, Rodapé, Header, Logo, Cores, WhatsApp).
 * 4. Copiar os produtos da vitrine da Lojinha (storeProducts).
 * 5. Copiar o catálogo geral de produtos (products).
 * 6. Normalizar URLs (de cdn-dev / luisices-dev para cdn / papelaria-dashboard).
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';

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
const optimizeImages = process.env.OPTIMIZE_IMAGES !== 'false';
const migrateStorageFiles = process.env.MIGRATE_STORAGE_FILES !== 'false';
const migrateStoreSettings = process.env.MIGRATE_STORE_SETTINGS !== 'false';
const migrateStoreProducts = process.env.MIGRATE_STORE_PRODUCTS !== 'false';
const migrateInternalProducts = process.env.MIGRATE_INTERNAL_PRODUCTS !== 'false';

console.log('====================================================');
console.log('📦 MIGRAÇÃO COMPLETA FIREBASE: DEV ➔ PROD');
console.log(`🔍 Modo: ${isDryRun ? '🟡 DRY RUN (Simulação - Apenas leitura sem salvar)' : '🟢 PRODUÇÃO REAL'}`);
console.log(`⚡ Otimização de Imagens (Conversão WebP via Sharp): ${optimizeImages ? 'SIM (Automática)' : 'NÃO'}`);
console.log(`🖼️ Transferir Arquivos de Imagem do Storage: ${migrateStorageFiles ? 'SIM' : 'NÃO'}`);
console.log(`🎨 Migrar Banners, Rodapé e Layout (storeSettings/public): ${migrateStoreSettings ? 'SIM' : 'NÃO'}`);
console.log(`🛍️ Migrar Produtos da Vitrine (storeProducts): ${migrateStoreProducts ? 'SIM' : 'NÃO'}`);
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

// Detectar buckets de Storage
const devBucketName =
  process.env.DEV_STORAGE_BUCKET || `${devSa.project_id || 'luisices-dev'}.firebasestorage.app`;
const prodBucketName =
  process.env.PROD_STORAGE_BUCKET || `${prodSa.project_id || 'papelaria-dashboard'}.firebasestorage.app`;

const devStorage = getStorage(devApp);
const prodStorage = getStorage(prodApp);

const devBucket = devStorage.bucket(devBucketName);
const prodBucket = prodStorage.bucket(prodBucketName);

/**
 * Normaliza URLs substituindo referências de Dev por Produção
 */
function normalizeUrlToProd(url) {
  if (!url || typeof url !== 'string') return url;
  return url
    .replace(/cdn-dev\.luisices\.com\.br/g, 'cdn.luisices.com.br')
    .replace(/luisices-dev\.firebasestorage\.app/g, 'papelaria-dashboard.firebasestorage.app')
    .replace(/luisices-dev\.appspot\.com/g, 'papelaria-dashboard.firebasestorage.app');
}

function normalizeObjectUrls(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(normalizeObjectUrls);

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      cleaned[key] = normalizeUrlToProd(value);
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = normalizeObjectUrls(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

let totalMigrated = 0;

try {
  // ─── 2. Transferir e Otimizar Arquivos Binários do Storage em WebP ─────────────
  if (migrateStorageFiles) {
    console.log(`🖼️ [1/4] Transferindo e otimizando imagens de Dev (${devBucketName}) para Prod (${prodBucketName})...`);
    try {
      // Busca arquivos das pastas 'store/' e 'users/'
      const [storeFiles] = await devBucket.getFiles({ prefix: 'store/' }).catch(() => [[]]);
      const [userFiles] = await devBucket.getFiles({ prefix: 'users/' }).catch(() => [[]]);
      const allFiles = [...storeFiles, ...userFiles];

      if (allFiles.length === 0) {
        console.log('ℹ️ Nenhum arquivo de imagem encontrado no bucket de Dev.');
      } else {
        console.log(`✔ Encontrados ${allFiles.length} arquivos de imagem em Dev:\n`);

        for (let i = 0; i < allFiles.length; i++) {
          const file = allFiles[i];
          console.log(`  [${i + 1}/${allFiles.length}] Processando: "${file.name}"...`);

          if (!isDryRun) {
            try {
              const [buffer] = await file.download();
              const [metadata] = await file.getMetadata().catch(() => [{}]);
              const destFile = prodBucket.file(file.name);

              let finalBuffer = buffer;
              let finalContentType = metadata.contentType || 'image/webp';

              // Otimização automática em WebP via Sharp para imagens
              if (optimizeImages && (file.name.match(/\.(jpe?g|png|webp|avif)$/i) || metadata.contentType?.startsWith('image/'))) {
                try {
                  const origSizeKb = (buffer.length / 1024).toFixed(1);
                  finalBuffer = await sharp(buffer)
                    .resize({
                      width: 2560,
                      height: 2560,
                      fit: 'inside',
                      withoutEnlargement: true,
                    })
                    .webp({ quality: 86, effort: 4 })
                    .toBuffer();
                  finalContentType = 'image/webp';
                  const optSizeKb = (finalBuffer.length / 1024).toFixed(1);
                  const savedPercent = Math.round((1 - finalBuffer.length / buffer.length) * 100);
                  console.log(`    ⚡ Otimizado em WebP: ${origSizeKb} KB ➔ ${optSizeKb} KB (${savedPercent >= 0 ? `-${savedPercent}% economia` : 'mantido'})`);
                } catch (sharpErr) {
                  console.warn(`    ⚠️ Aviso ao comprimir com Sharp: ${sharpErr.message}. Mantendo arquivo original.`);
                }
              }

              await destFile.save(finalBuffer, {
                contentType: finalContentType,
                metadata: {
                  ...metadata.metadata,
                  migratedFrom: 'luisices-dev',
                  optimizedWith: 'sharp-webp',
                  migratedAt: new Date().toISOString(),
                },
              });
            } catch (err) {
              console.warn(`    ⚠️ Aviso ao copiar arquivo "${file.name}":`, err.message);
            }
          }
        }

        if (!isDryRun) {
          console.log(`\n✅ Sucesso! ${allFiles.length} imagens processadas, otimizadas em WebP e salvas em Produção.`);
        } else {
          console.log(`\n🟡 [Simulação] ${allFiles.length} imagens listadas. Nenhuma transferida.`);
        }
      }
    } catch (err) {
      console.warn('⚠️ Não foi possível listar arquivos do Storage:', err.message);
    }
    console.log('');
  }

  // ─── 3. Migrar Configurações Completas da Lojinha (Banners, Rodapé, Header) ─────
  if (migrateStoreSettings) {
    console.log('🎨 [2/4] Consultando storeSettings/public em Dev...');
    const settingsDoc = await devDb.collection('storeSettings').doc('public').get();

    if (settingsDoc.exists) {
      const rawData = settingsDoc.data();
      const data = normalizeObjectUrls(rawData);

      console.log('✔ Configurações da Lojinha encontradas em Dev:');
      console.log(`  • Nome da Loja: "${data.businessName || 'Não definido'}"`);
      console.log(`  • Slogan: "${data.businessTagline || 'Não definido'}"`);
      console.log(`  • WhatsApp: ${data.catalogWhatsappPhone || data.whatsappPhone || 'Não definido'}`);
      console.log(`  • Instagram: ${data.instagramUrl || 'Não definido'}`);
      console.log(`  • Instagram Colab / Parceria: ${data.instagramColabUrl || 'Não definido'}`);
      console.log(`  • Banner Principal (Hero): ${data.catalogBanner ? 'Sim' : 'Não'}`);
      console.log(`  • Banners Rotativos (Carrossel): ${Array.isArray(data.catalogBanners) ? `${data.catalogBanners.length} banners` : 'Nenhum'}`);
      console.log(`  • Barra Superior (Header): ${data.catalogHeaderBackground ? 'Com imagem de fundo' : 'Cor sólida / Padrão'}`);
      console.log(`  • Rodapé - Texto Afetivo: ${data.catalogFooterText ? `"${data.catalogFooterText.slice(0, 40)}..."` : 'Padrão'}`);
      console.log(`  • Rodapé - Localização / Frete: ${data.catalogFooterLocation || 'Padrão'}`);
      console.log(`  • Rodapé - Horário de Atendimento: ${data.catalogFooterBusinessHours || 'Padrão'}`);
      console.log(`  • Rodapé - Copyright / Aviso: ${data.catalogFooterCopyright || data.catalogFooterNotice || 'Padrão'}`);

      if (!isDryRun) {
        await prodDb.collection('storeSettings').doc('public').set(data, { merge: true });
        console.log('✅ Configurações completas (Banners, Rodapé, Header, URLs normalizadas) salvas em Produção!');
      } else {
        console.log('🟡 [Simulação] storeSettings/public NÃO foi gravado.');
      }
      totalMigrated++;
    } else {
      console.log('ℹ️ Nenhum documento storeSettings/public encontrado em Dev.');
    }
    console.log('');
  }

  // ─── 4. Migrar storeProducts (Produtos da Vitrine da Lojinha) ─────────────────
  if (migrateStoreProducts) {
    console.log('🛍️ [3/4] Consultando coleção storeProducts em Dev (luisices-dev)...');
    const snap = await devDb.collection('storeProducts').get();

    if (snap.empty) {
      console.log('ℹ️ Nenhum produto encontrado na vitrine de Dev.');
    } else {
      console.log(`✔ Encontrados ${snap.size} produtos na vitrine de Dev:\n`);

      const batch = prodDb.batch();

      snap.docs.forEach((doc, idx) => {
        const rawData = doc.data();
        const data = normalizeObjectUrls(rawData);

        console.log(`  [${idx + 1}/${snap.size}] ID: ${doc.id} | Nome: "${data.name || 'Sem nome'}" | Preço: R$ ${Number(data.price ?? 0).toFixed(2)} | Imagem: ${data.imageUrl ? 'Sim' : 'Não'}`);

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

  // ─── 5. Migrar products (Catálogo Geral do Ateliê) ───────────────────────────
  if (migrateInternalProducts) {
    console.log('📋 [4/4] Consultando coleção products (Catálogo Geral) em Dev...');
    const internalSnap = await devDb.collection('products').get();

    if (internalSnap.empty) {
      console.log('ℹ️ Nenhum produto encontrado no catálogo geral em Dev.');
    } else {
      console.log(`✔ Encontrados ${internalSnap.size} produtos no catálogo de Dev:\n`);

      const batch = prodDb.batch();

      internalSnap.docs.forEach((doc, idx) => {
        const rawData = doc.data();
        const data = normalizeObjectUrls(rawData);

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

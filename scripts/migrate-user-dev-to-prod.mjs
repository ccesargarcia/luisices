/**
 * Script de Migração Segura de Usuário e Dados Relacionados (Dev ➔ Prod)
 *
 * Utiliza o Firebase Admin SDK para:
 * 1. Localizar o usuário no Firebase Auth e Firestore do ambiente de Dev (por e-mail ou UID).
 * 2. Criar ou sincronizar a conta do usuário no Firebase Auth de Produção (preservando UID e Custom Claims).
 * 3. Migrar perfis e permissões (userProfiles/{uid}, users/{uid}, metadata/counters).
 * 4. Migrar todas as coleções de negócio vinculadas ao userId do usuário:
 *    - Clientes (customers)
 *    - Pedidos de produção (orders)
 *    - Orçamentos (quotes)
 *    - Catálogo de produtos do usuário (products)
 *    - Insumos de precificação (supplies)
 *    - Receitas e fichas técnicas (recipes)
 *    - Histórico de compras (purchase_history)
 *    - Acompanhamento de produção (production_tracking)
 *    - Livro caixa e vendas (salesLedger)
 *    - Galeria e imagens (gallery)
 *    - Permissões Alexa (alexaPermissions)
 * 5. Normalizar URLs de imagem e Storage (luisices-dev ➔ papelaria-dashboard).
 * 6. Suporte a modo Dry-Run (simulação segura sem escrita) por padrão.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

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

// Utilitário para leitura de argumentos CLI e variáveis de ambiente
function getCliArg(flagName, envVarName, defaultValue = undefined) {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === `--${flagName}` && args[i + 1] && !args[i + 1].startsWith('--')) {
      return args[i + 1];
    }
    if (args[i].startsWith(`--${flagName}=`)) {
      return args[i].split('=')[1];
    }
    if (args[i] === `--${flagName}`) {
      return true;
    }
    if (args[i] === `--no-${flagName}`) {
      return false;
    }
  }
  if (envVarName && process.env[envVarName] !== undefined) {
    const val = process.env[envVarName];
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }
  return defaultValue;
}

const targetEmail = getCliArg('email', 'USER_EMAIL', '');
const targetUid = getCliArg('uid', 'USER_UID', '');
const isDryRun = getCliArg('dry-run', 'DRY_RUN', true);

// Flags de seleção de coleções
const migrateAuth = getCliArg('migrate-auth', 'MIGRATE_AUTH', true);
const migrateProfile = getCliArg('migrate-profile', 'MIGRATE_PROFILE', true);
const migrateCustomers = getCliArg('migrate-customers', 'MIGRATE_CUSTOMERS', true);
const migrateOrders = getCliArg('migrate-orders', 'MIGRATE_ORDERS', true);
const migrateQuotes = getCliArg('migrate-quotes', 'MIGRATE_QUOTES', true);
const migrateProducts = getCliArg('migrate-products', 'MIGRATE_PRODUCTS', true);
const migrateSupplies = getCliArg('migrate-supplies', 'MIGRATE_SUPPLIES', true);
const migrateRecipes = getCliArg('migrate-recipes', 'MIGRATE_RECIPES', true);
const migrateLedger = getCliArg('migrate-ledger', 'MIGRATE_LEDGER', true);
const migrateGallery = getCliArg('migrate-gallery', 'MIGRATE_GALLERY', true);
const migrateAlexa = getCliArg('migrate-alexa', 'MIGRATE_ALEXA', true);

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

/**
 * Grava documentos em batches de até 400 operações respeitando limites do Firestore
 */
async function commitBatchOperations(db, operations, dryRun) {
  if (dryRun || operations.length === 0) return;

  const BATCH_SIZE = 400;
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const chunk = operations.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const op of chunk) {
      if (op.type === 'set') {
        batch.set(op.ref, op.data, op.options || { merge: true });
      }
    }
    await batch.commit();
  }
}

/**
 * Função principal exportada para reutilização e testes
 */
export async function runUserMigration(options = {}) {
  const email = options.email || targetEmail;
  const uid = options.uid || targetUid;
  const dryRun = options.dryRun !== undefined ? options.dryRun : isDryRun;

  console.log('================================================================');
  console.log('👤 MIGRAÇÃO DE USUÁRIO E DADOS RELACIONADOS: DEV ➔ PROD');
  console.log(`🔍 Modo: ${dryRun ? '🟡 DRY RUN (Simulação - nenhuma gravação em Prod)' : '🟢 PRODUÇÃO REAL'}`);
  console.log(`🎯 Alvo: ${email ? `E-mail: ${email}` : ''} ${uid ? `UID: ${uid}` : ''}`);
  console.log('================================================================\n');

  if (!email && !uid) {
    throw new Error('❌ Informe ao menos um identificador de usuário (--email ou --uid / USER_EMAIL ou USER_UID).');
  }

  // 1. Inicializar instâncias Firebase Dev e Prod
  let devApp, prodApp;
  const existingApps = getApps();
  devApp = existingApps.find((a) => a.name === 'devApp');
  prodApp = existingApps.find((a) => a.name === 'prodApp');

  if (!devApp) {
    const devSa = parseServiceAccount(
      options.devSa || process.env.FIREBASE_SERVICE_ACCOUNT_DEV,
      'FIREBASE_SERVICE_ACCOUNT_DEV'
    );
    devApp = initializeApp(
      { credential: cert(devSa), projectId: devSa.project_id || 'luisices-dev' },
      'devApp'
    );
  }

  if (!prodApp) {
    const prodSa = parseServiceAccount(
      options.prodSa || process.env.FIREBASE_SERVICE_ACCOUNT_PROD || process.env.FIREBASE_SERVICE_ACCOUNT,
      'FIREBASE_SERVICE_ACCOUNT_PROD'
    );
    prodApp = initializeApp(
      { credential: cert(prodSa), projectId: prodSa.project_id || 'papelaria-dashboard' },
      'prodApp'
    );
  }

  const devAuth = getAuth(devApp);
  const prodAuth = getAuth(prodApp);
  const devDb = getFirestore(devApp);
  const prodDb = getFirestore(prodApp);

  const summary = {
    user: null,
    devUid: null,
    prodUid: null,
    collections: {},
    warnings: [],
  };

  // 2. Localizar usuário no Firebase Auth de Dev
  let devUser = null;
  try {
    if (uid) {
      devUser = await devAuth.getUser(uid);
    } else if (email) {
      devUser = await devAuth.getUserByEmail(email);
    }
  } catch (err) {
    throw new Error(`❌ Usuário não encontrado no ambiente de Dev: ${err.message}`);
  }

  const devUid = devUser.uid;
  const userEmail = devUser.email;
  summary.devUid = devUid;
  summary.user = {
    uid: devUid,
    email: userEmail,
    displayName: devUser.displayName,
    disabled: devUser.disabled,
  };

  console.log(`✅ Usuário localizado em Dev: ${devUser.displayName || 'Sem nome'} (${userEmail}) [UID: ${devUid}]`);

  // 3. Verificar / Provisionar usuário no Firebase Auth de Prod
  let prodUid = devUid;
  let prodUserExists = false;

  if (migrateAuth) {
    try {
      const existingProdUser = userEmail ? await prodAuth.getUserByEmail(userEmail) : await prodAuth.getUser(devUid);
      prodUserExists = true;
      prodUid = existingProdUser.uid;
      console.log(`ℹ️ Usuário já existe no Firebase Auth de Produção [Prod UID: ${prodUid}].`);
      if (prodUid !== devUid) {
        console.log(`⚠️ ATENÇÃO: UID em Dev (${devUid}) difere do UID em Prod (${prodUid}). As referências de userId serão remapeadas para ${prodUid}.`);
        summary.warnings.push(`UIDs divergentes: Dev=${devUid} vs Prod=${prodUid}. Referências foram remapeadas.`);
      }
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        prodUserExists = false;
        console.log(`🆕 Usuário não existe no Firebase Auth de Produção. Será provisionado com UID: ${devUid}`);
      } else {
        throw err;
      }
    }

    if (!prodUserExists) {
      if (dryRun) {
        console.log(`[DRY-RUN] Criaria conta no Firebase Auth de Prod para ${userEmail} com UID ${devUid}.`);
      } else {
        const createPayload = {
          uid: devUid,
          email: devUser.email,
          emailVerified: devUser.emailVerified,
          displayName: devUser.displayName,
          phoneNumber: devUser.phoneNumber || undefined,
          photoURL: devUser.photoURL ? normalizeUrlToProd(devUser.photoURL) : undefined,
          disabled: devUser.disabled,
        };
        await prodAuth.createUser(createPayload);
        if (devUser.customClaims && Object.keys(devUser.customClaims).length > 0) {
          await prodAuth.setCustomUserClaims(devUid, devUser.customClaims);
        }
        console.log(`✅ Conta criada com sucesso no Firebase Auth de Produção [UID: ${devUid}].`);
      }
    }
  }

  summary.prodUid = prodUid;

  // 4. Migrar Perfis e Permissões (userProfiles/{uid} e users/{uid})
  if (migrateProfile) {
    console.log('\n--- 🔑 Migrando Perfis e Permissões ---');
    // userProfiles
    const devProfileSnap = await devDb.collection('userProfiles').doc(devUid).get();
    if (devProfileSnap.exists) {
      const profileData = normalizeObjectUrls(devProfileSnap.data());
      summary.collections['userProfiles'] = 1;
      if (dryRun) {
        console.log(`[DRY-RUN] Copiaria userProfiles/${devUid} ➔ userProfiles/${prodUid}`);
      } else {
        await prodDb.collection('userProfiles').doc(prodUid).set(profileData, { merge: true });
        console.log(`✅ userProfiles/${prodUid} sincronizado.`);
      }
    }

    // users
    const devUserSnap = await devDb.collection('users').doc(devUid).get();
    if (devUserSnap.exists) {
      const userData = normalizeObjectUrls(devUserSnap.data());
      summary.collections['users'] = 1;
      if (dryRun) {
        console.log(`[DRY-RUN] Copiaria users/${devUid} ➔ users/${prodUid}`);
      } else {
        await prodDb.collection('users').doc(prodUid).set(userData, { merge: true });
        console.log(`✅ users/${prodUid} sincronizado.`);
      }
    }

    // Subcoleção metadata de users (ex: contadores sequenciais de pedidos e orçamentos)
    const countersSnap = await devDb.collection('users').doc(devUid).collection('metadata').get();
    if (!countersSnap.empty) {
      summary.collections['users/metadata'] = countersSnap.size;
      for (const doc of countersSnap.docs) {
        const metadataDoc = doc.data();
        if (dryRun) {
          console.log(`[DRY-RUN] Copiaria users/${devUid}/metadata/${doc.id} ➔ users/${prodUid}/metadata/${doc.id}`);
        } else {
          await prodDb.collection('users').doc(prodUid).collection('metadata').doc(doc.id).set(metadataDoc, { merge: true });
        }
      }
      console.log(`✅ Contadores de metadata (${countersSnap.size} docs) sincronizados.`);
    }
  }

  // 5. Migrar Coleções de Negócio com vínculo userId
  const tenantCollections = [
    { name: 'customers', label: 'Clientes', enabled: migrateCustomers },
    { name: 'orders', label: 'Pedidos de Produção', enabled: migrateOrders },
    { name: 'quotes', label: 'Orçamentos', enabled: migrateQuotes },
    { name: 'products', label: 'Catálogo de Produtos', enabled: migrateProducts },
    { name: 'supplies', label: 'Insumos de Precificação', enabled: migrateSupplies },
    { name: 'recipes', label: 'Receitas / Fórmulas', enabled: migrateRecipes },
    { name: 'purchase_history', label: 'Histórico de Compras', enabled: migrateSupplies },
    { name: 'production_tracking', label: 'Apontamento de Produção', enabled: migrateOrders },
    { name: 'salesLedger', label: 'Livro Caixa / Vendas', enabled: migrateLedger },
    { name: 'gallery', label: 'Portfólio / Galeria', enabled: migrateGallery },
  ];

  console.log('\n--- 📂 Migrando Coleções de Negócio do Usuário ---');

  for (const col of tenantCollections) {
    if (!col.enabled) {
      console.log(`⏭️ Pulando coleção ${col.name} (${col.label}) por configuração.`);
      continue;
    }

    // Busca documentos vinculados ao devUid
    const snapshot = await devDb.collection(col.name).where('userId', '==', devUid).get();
    summary.collections[col.name] = snapshot.size;

    if (snapshot.empty) {
      console.log(`ℹ️ Coleção '${col.name}': nenhum documento encontrado para o usuário.`);
      continue;
    }

    console.log(`📦 Coleção '${col.name}': ${snapshot.size} documento(s) encontrado(s) em Dev.`);

    const operations = [];
    for (const docSnap of snapshot.docs) {
      const data = normalizeObjectUrls(docSnap.data());

      // Remapeia o identificador do proprietário se houver diferença de UID
      data.userId = prodUid;
      if (data.uid === devUid) data.uid = prodUid;
      if (data.createdBy === devUid) data.createdBy = prodUid;

      operations.push({
        type: 'set',
        ref: prodDb.collection(col.name).doc(docSnap.id),
        data,
        options: { merge: true },
      });
    }

    if (dryRun) {
      console.log(`[DRY-RUN] Simulação: ${operations.length} documento(s) de '${col.name}' seriam gravados em Produção.`);
    } else {
      await commitBatchOperations(prodDb, operations, false);
      console.log(`✅ Coleção '${col.name}': ${operations.length} documento(s) migrados com sucesso para Produção.`);
    }
  }

  // 6. Migrar Permissões e Vínculos da Alexa
  if (migrateAlexa) {
    console.log('\n--- 🎙️ Migrando Configurações da Alexa ---');
    const devPermSnap = await devDb.collection('alexaPermissions').doc(devUid).get();
    if (devPermSnap.exists) {
      summary.collections['alexaPermissions'] = 1;
      const permData = devPermSnap.data();
      if (dryRun) {
        console.log(`[DRY-RUN] Copiaria alexaPermissions/${devUid} ➔ alexaPermissions/${prodUid}`);
      } else {
        await prodDb.collection('alexaPermissions').doc(prodUid).set(permData, { merge: true });
        console.log(`✅ alexaPermissions/${prodUid} sincronizado.`);
      }
    }
  }

  // 7. Relatório Final
  console.log('\n================================================================');
  console.log('📊 RESUMO DA MIGRAÇÃO (DEV ➔ PROD)');
  console.log(`Status: ${dryRun ? '🟡 SIMULAÇÃO CONCLUÍDA (Sem alterações em Prod)' : '🟢 MIGRAÇÃO CONCLUÍDA COM SUCESSO'}`);
  console.log(`Usuário: ${devUser.displayName || 'Sem nome'} (${userEmail})`);
  console.log(`UID Dev: ${devUid} | UID Prod: ${prodUid}`);
  console.log('----------------------------------------------------------------');
  for (const [col, count] of Object.entries(summary.collections)) {
    console.log(` • ${col}: ${count} documento(s)`);
  }
  if (summary.warnings.length > 0) {
    console.log('----------------------------------------------------------------');
    console.log('⚠️ Avisos:');
    summary.warnings.forEach((w) => console.log(` - ${w}`));
  }
  console.log('================================================================\n');

  return summary;
}

// Execução direta via CLI se chamado diretamente
if (process.argv[1] && process.argv[1].endsWith('migrate-user-dev-to-prod.mjs')) {
  runUserMigration().catch((err) => {
    console.error('\n💥 Falha na execução da migração:', err.message);
    process.exit(1);
  });
}

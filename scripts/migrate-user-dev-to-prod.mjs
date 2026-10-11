/**
 * Script de Migração Segura de Usuário e Dados Relacionados (Dev ➔ Prod)
 *
 * Utiliza o Firebase Admin SDK para:
 * 1. Localizar o usuário no Firebase Auth e Firestore do ambiente de Dev (por e-mail ou UID).
 * 2. Criar ou sincronizar a conta no Firebase Auth de Produção com suporte a senha temporária
 *    e geração automática de link seguro para primeiro acesso/redefinição.
 * 3. Migrar perfis e permissões:
 *    - userProfiles/{uid}
 *    - users/{uid}
 *    - Subcoleção de contadores: users/{uid}/metadata (counters, quoteCounters)
 *    - Subcoleção de configurações: users/{uid}/settings (profile, flags, identidade visual)
 *    - Configurações financeiras do ateliê: pricingSettings/{uid}
 * 4. Migrar todas as coleções de negócio vinculadas ao usuário:
 *    - Clientes (customers)
 *    - Pedidos de produção (orders)
 *    - Apontamentos de lote/produção (productionTracking / produção legada)
 *    - Orçamentos (quotes)
 *    - Catálogo interno de produtos (products)
 *    - Vitrine da lojinha pública online (storeProducts)
 *    - Insumos de precificação (supplies)
 *    - Histórico de compras de insumos (purchaseHistory)
 *    - Fichas técnicas e receitas (pricingRecipes)
 *    - Livro caixa e vendas (salesLedger)
 *    - Resumos mensais consolidados de vendas (salesMonthlySummaries)
 *    - Portfólio e galeria de artes (gallery)
 *    - Central WhatsApp: conversas (whatsapp_chats) e mensagens (whatsapp_messages)
 *    - Histórico de e-mails corporativos enviados (sentEmails)
 *    - Integração Alexa: permissões (alexaPermissions) e vínculos ativos (alexaBindings)
 * 5. Migrar fisicamente arquivos binários no Firebase Storage (users/{uid}/*)
 *    entre os buckets de Dev e Prod, além de normalizar URLs nos documentos.
 * 6. Suporte a modo Dry-Run (simulação segura sem escrita) por padrão.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

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
export function getCliArg(flagName, envVarName, defaultValue = undefined) {
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
const initialPasswordCli = getCliArg('initial-password', 'INITIAL_PASSWORD', '');

// Flags de seleção de dados
const migrateAuth = getCliArg('migrate-auth', 'MIGRATE_AUTH', true);
const migrateProfile = getCliArg('migrate-profile', 'MIGRATE_PROFILE', true);
const migrateSettings = getCliArg('migrate-settings', 'MIGRATE_SETTINGS', true);
const migrateCustomers = getCliArg('migrate-customers', 'MIGRATE_CUSTOMERS', true);
const migrateOrders = getCliArg('migrate-orders', 'MIGRATE_ORDERS', true);
const migrateQuotes = getCliArg('migrate-quotes', 'MIGRATE_QUOTES', true);
const migrateProducts = getCliArg('migrate-products', 'MIGRATE_PRODUCTS', true);
const migrateStoreProducts = getCliArg('migrate-store-products', 'MIGRATE_STORE_PRODUCTS', true);
const migrateSupplies = getCliArg('migrate-supplies', 'MIGRATE_SUPPLIES', true);
const migrateRecipes = getCliArg('migrate-recipes', 'MIGRATE_RECIPES', true);
const migrateLedger = getCliArg('migrate-ledger', 'MIGRATE_LEDGER', true);
const migrateGallery = getCliArg('migrate-gallery', 'MIGRATE_GALLERY', true);
const migrateWhatsapp = getCliArg('migrate-whatsapp', 'MIGRATE_WHATSAPP', true);
const migrateEmails = getCliArg('migrate-emails', 'MIGRATE_EMAILS', true);
const migrateAlexa = getCliArg('migrate-alexa', 'MIGRATE_ALEXA', true);
const copyStorage = getCliArg('copy-storage', 'COPY_STORAGE', true);

/**
 * Normaliza URLs substituindo referências de Dev por Produção
 */
export function normalizeUrlToProd(url) {
  if (!url || typeof url !== 'string') return url;
  return url
    .replace(/cdn-dev\.luisices\.com\.br/g, 'cdn.luisices.com.br')
    .replace(/luisices-dev\.firebasestorage\.app/g, 'papelaria-dashboard.firebasestorage.app')
    .replace(/luisices-dev\.appspot\.com/g, 'papelaria-dashboard.firebasestorage.app');
}

export function normalizeObjectUrls(obj) {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    return (obj.startsWith('http://') || obj.startsWith('https://')) ? normalizeUrlToProd(obj) : obj;
  }
  if (Array.isArray(obj)) return obj.map(normalizeObjectUrls);
  if (typeof obj !== 'object') return obj;

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
  const initialPassword = options.initialPassword || initialPasswordCli;

  console.log('================================================================');
  console.log('👤 MIGRAÇÃO DE USUÁRIO E DADOS RELACIONADOS: DEV ➔ PROD');
  console.log(`🔍 Modo: ${dryRun ? '🟡 DRY RUN (Simulação - nenhuma gravação em Prod)' : '🟢 PRODUÇÃO REAL'}`);
  console.log(`🎯 Alvo: ${email ? `E-mail: ${email}` : ''} ${uid ? `UID: ${uid}` : ''}`);
  if (initialPassword) {
    console.log(`🔑 Senha inicial/temporária fornecida para login.`);
  }
  console.log('================================================================\n');

  if (!email && !uid) {
    throw new Error('❌ Informe ao menos um identificador de usuário (--email ou --uid / USER_EMAIL ou USER_UID).');
  }

  // 1. Inicializar instâncias Firebase Dev e Prod
  let devApp, prodApp;
  const existingApps = getApps();
  devApp = existingApps.find((a) => a.name === 'devApp');
  prodApp = existingApps.find((a) => a.name === 'prodApp');

  const devSa = parseServiceAccount(
    options.devSa || process.env.FIREBASE_SERVICE_ACCOUNT_DEV,
    'FIREBASE_SERVICE_ACCOUNT_DEV'
  );

  const prodSa = parseServiceAccount(
    options.prodSa || process.env.FIREBASE_SERVICE_ACCOUNT_PROD || process.env.FIREBASE_SERVICE_ACCOUNT,
    'FIREBASE_SERVICE_ACCOUNT_PROD'
  );

  if (!devApp) {
    devApp = initializeApp(
      {
        credential: cert(devSa),
        projectId: devSa.project_id || 'luisices-dev',
        storageBucket: devSa.project_id ? `${devSa.project_id}.firebasestorage.app` : 'luisices-dev.firebasestorage.app',
      },
      'devApp'
    );
  }

  if (!prodApp) {
    prodApp = initializeApp(
      {
        credential: cert(prodSa),
        projectId: prodSa.project_id || 'papelaria-dashboard',
        storageBucket: prodSa.project_id ? `${prodSa.project_id}.firebasestorage.app` : 'papelaria-dashboard.firebasestorage.app',
      },
      'prodApp'
    );
  }

  const devAuth = getAuth(devApp);
  const prodAuth = getAuth(prodApp);
  const devDb = getFirestore(devApp);
  const prodDb = getFirestore(prodApp);
  const devStorage = getStorage(devApp);
  const prodStorage = getStorage(prodApp);

  const summary = {
    user: null,
    devUid: null,
    prodUid: null,
    passwordStatus: null,
    passwordResetLink: null,
    collections: {},
    storage: {
      filesFound: 0,
      totalBytes: 0,
      copied: 0,
    },
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

  // 3. Verificar / Provisionar usuário no Firebase Auth de Prod com suporte a senhas
  let prodUid = devUid;
  let prodUserExists = false;

  if (migrateAuth) {
    try {
      const existingProdUser = userEmail ? await prodAuth.getUserByEmail(userEmail) : await prodAuth.getUser(devUid);
      prodUserExists = true;
      prodUid = existingProdUser.uid;
      console.log(`ℹ️ Usuário já existe no Firebase Auth de Produção [Prod UID: ${prodUid}].`);
      if (prodUid !== devUid) {
        console.log(`⚠️ ATENÇÃO: UID em Dev (${devUid}) difere do UID em Prod (${prodUid}). As referências serão remapeadas para ${prodUid}.`);
        summary.warnings.push(`UIDs divergentes: Dev=${devUid} vs Prod=${prodUid}. Referências foram remapeadas.`);
      }

      if (initialPassword) {
        if (dryRun) {
          console.log(`[DRY-RUN] Atualizaria a senha do usuário existente no Firebase Auth de Prod.`);
        } else {
          await prodAuth.updateUser(prodUid, { password: initialPassword });
          summary.passwordStatus = 'Senha atualizada em Produção conforme informado.';
          console.log(`🔑 Senha do usuário em Produção atualizada com sucesso.`);
        }
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
        summary.passwordStatus = initialPassword ? 'Seria criada com a senha temporária informada.' : 'Seria criada sem senha (gerando link de primeiro acesso).';
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

        if (initialPassword) {
          createPayload.password = initialPassword;
          summary.passwordStatus = 'Conta criada com a senha inicial fornecida.';
        } else {
          summary.passwordStatus = 'Conta criada sem senha (link de definição gerado).';
        }

        await prodAuth.createUser(createPayload);
        if (devUser.customClaims && Object.keys(devUser.customClaims).length > 0) {
          await prodAuth.setCustomUserClaims(devUid, devUser.customClaims);
        }
        console.log(`✅ Conta criada com sucesso no Firebase Auth de Produção [UID: ${devUid}].`);
      }
    }

    // Gerar Link de Definição de Senha para primeiro acesso do usuário em produção
    if (userEmail) {
      try {
        if (!dryRun) {
          const resetLink = await prodAuth.generatePasswordResetLink(userEmail);
          summary.passwordResetLink = resetLink;
          console.log(`🔗 Link de Primeiro Acesso / Definição de Senha gerado com sucesso.`);
        } else {
          summary.passwordResetLink = `[DRY-RUN: Link de definição de senha seria gerado para ${userEmail}]`;
        }
      } catch (linkErr) {
        console.warn(`⚠️ Não foi possível gerar link de redefinição de senha: ${linkErr.message}`);
        summary.warnings.push(`Link de primeiro acesso não gerado: ${linkErr.message}`);
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

    // Subcoleção metadata de users (counters e quoteCounters)
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

  // 5. Migrar Configurações do Ateliê e Identidade (users/{uid}/settings/* e pricingSettings/{uid})
  if (migrateSettings) {
    console.log('\n--- ⚙️ Migrando Configurações do Ateliê e Identidade Visual ---');
    // Subcoleção settings de users (profile, flags, pix, banners, cabeçalho)
    const settingsSnap = await devDb.collection('users').doc(devUid).collection('settings').get();
    if (!settingsSnap.empty) {
      summary.collections['users/settings'] = settingsSnap.size;
      for (const doc of settingsSnap.docs) {
        const settingsData = normalizeObjectUrls(doc.data());
        if (settingsData.userId === devUid) settingsData.userId = prodUid;
        if (dryRun) {
          console.log(`[DRY-RUN] Copiaria users/${devUid}/settings/${doc.id} ➔ users/${prodUid}/settings/${doc.id}`);
        } else {
          await prodDb.collection('users').doc(prodUid).collection('settings').doc(doc.id).set(settingsData, { merge: true });
        }
      }
      console.log(`✅ Configurações de identidade/loja (${settingsSnap.size} docs) sincronizadas.`);
    }

    // Configurações de Precificação do Ateliê (pricingSettings/{uid})
    const pricingSettingsSnap = await devDb.collection('pricingSettings').doc(devUid).get();
    if (pricingSettingsSnap.exists) {
      summary.collections['pricingSettings'] = 1;
      const pricingSettingsData = pricingSettingsSnap.data();
      if (pricingSettingsData.userId === devUid) pricingSettingsData.userId = prodUid;
      if (dryRun) {
        console.log(`[DRY-RUN] Copiaria pricingSettings/${devUid} ➔ pricingSettings/${prodUid}`);
      } else {
        await prodDb.collection('pricingSettings').doc(prodUid).set(pricingSettingsData, { merge: true });
        console.log(`✅ pricingSettings/${prodUid} sincronizado.`);
      }
    }
  }

  // 6. Migrar Coleções de Negócio Multi-Tenant
  const tenantCollections = [
    { name: 'customers', label: 'Clientes', enabled: migrateCustomers, field: 'userId' },
    { name: 'orders', label: 'Pedidos de Produção', enabled: migrateOrders, field: 'userId' },
    { name: 'productionTracking', fallbackName: 'production_tracking', label: 'Apontamento de Produção', enabled: migrateOrders, field: 'userId' },
    { name: 'quotes', label: 'Orçamentos', enabled: migrateQuotes, field: 'userId' },
    { name: 'products', label: 'Catálogo de Produtos Interno', enabled: migrateProducts, field: 'userId' },
    { name: 'storeProducts', label: 'Vitrine da Loja Pública', enabled: migrateStoreProducts, field: 'userId' },
    { name: 'supplies', label: 'Insumos de Precificação', enabled: migrateSupplies, field: 'userId' },
    { name: 'purchaseHistory', fallbackName: 'purchase_history', label: 'Histórico de Compras', enabled: migrateSupplies, field: 'userId' },
    { name: 'pricingRecipes', fallbackName: 'recipes', label: 'Receitas / Fórmulas', enabled: migrateRecipes, field: 'userId' },
    { name: 'salesLedger', label: 'Livro Caixa / Vendas', enabled: migrateLedger, field: 'userId' },
    { name: 'salesMonthlySummaries', label: 'Consolidação Mensal de Vendas', enabled: migrateLedger, field: 'userId', isRollup: true },
    { name: 'gallery', label: 'Portfólio / Galeria', enabled: migrateGallery, field: 'userId' },
    { name: 'whatsapp_chats', label: 'Conversas WhatsApp', enabled: migrateWhatsapp, field: 'userId' },
    { name: 'whatsapp_messages', label: 'Mensagens WhatsApp', enabled: migrateWhatsapp, field: 'userId' },
    { name: 'sentEmails', label: 'E-mails Enviados', enabled: migrateEmails, field: 'senderUid' },
  ];

  console.log('\n--- 📂 Migrando Coleções de Negócio do Usuário ---');

  for (const col of tenantCollections) {
    if (!col.enabled) {
      console.log(`⏭️ Pulando coleção ${col.name} (${col.label}) por configuração.`);
      continue;
    }

    // Busca documentos vinculados ao devUid na coleção principal
    let colName = col.name;
    let snapshot = await devDb.collection(colName).where(col.field, '==', devUid).get();

    // Se estiver vazia e houver nome alternativo/legado (ex: recipes vs pricingRecipes)
    if (snapshot.empty && col.fallbackName) {
      const fallbackSnap = await devDb.collection(col.fallbackName).where(col.field, '==', devUid).get();
      if (!fallbackSnap.empty) {
        console.log(`ℹ️ Documentos encontrados na coleção legada '${col.fallbackName}'. Serão migrados para a coleção canônica '${col.name}'.`);
        snapshot = fallbackSnap;
      }
    }

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
      if (col.field === 'senderUid') {
        data.senderUid = prodUid;
      } else {
        data.userId = prodUid;
      }

      if (data.uid === devUid) data.uid = prodUid;
      if (data.createdBy === devUid) data.createdBy = prodUid;
      if (data.ownerUid === devUid) data.ownerUid = prodUid;

      // Tratamento especial para o ID do documento de rollup mensal: ${yearMonth}_${userId}
      let targetDocId = docSnap.id;
      if (col.isRollup && devUid !== prodUid && targetDocId.endsWith(`_${devUid}`)) {
        targetDocId = targetDocId.replace(`_${devUid}`, `_${prodUid}`);
      }

      operations.push({
        type: 'set',
        ref: prodDb.collection(col.name).doc(targetDocId),
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

  // 7. Migrar Permissões e Vínculos da Alexa
  if (migrateAlexa) {
    console.log('\n--- 🎙️ Migrando Integração com a Alexa ---');
    // alexaPermissions/{uid}
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

    // alexaBindings com where('uid', '==', devUid)
    const devBindingsSnap = await devDb.collection('alexaBindings').where('uid', '==', devUid).get();
    if (!devBindingsSnap.empty) {
      summary.collections['alexaBindings'] = devBindingsSnap.size;
      const bindOps = [];
      for (const bDoc of devBindingsSnap.docs) {
        const bindData = bDoc.data();
        bindData.uid = prodUid;
        bindOps.push({
          type: 'set',
          ref: prodDb.collection('alexaBindings').doc(bDoc.id),
          data: bindData,
          options: { merge: true },
        });
      }
      if (dryRun) {
        console.log(`[DRY-RUN] Copiaria ${bindOps.length} vínculo(s) de alexaBindings.`);
      } else {
        await commitBatchOperations(prodDb, bindOps, false);
        console.log(`✅ alexaBindings (${bindOps.length} docs) sincronizados.`);
      }
    }
  }

  // 8. Migração de Arquivos Físicos no Firebase Storage
  if (copyStorage) {
    console.log('\n--- 🗄️ Migrando Arquivos Físicos no Firebase Storage ---');
    try {
      const devBucketName = devSa.project_id ? `${devSa.project_id}.firebasestorage.app` : 'luisices-dev.firebasestorage.app';
      const prodBucketName = prodSa.project_id ? `${prodSa.project_id}.firebasestorage.app` : 'papelaria-dashboard.firebasestorage.app';

      let devBucket, prodBucket;
      try {
        devBucket = devStorage.bucket(devBucketName);
        prodBucket = prodStorage.bucket(prodBucketName);
      } catch (e) {
        devBucket = devStorage.bucket();
        prodBucket = prodStorage.bucket();
      }

      const prefix = `users/${devUid}/`;
      const [files] = await devBucket.getFiles({ prefix });

      summary.storage.filesFound = files.length;
      summary.storage.totalBytes = files.reduce((acc, f) => acc + Number(f.metadata?.size || 0), 0);

      console.log(`📁 Encontrados ${files.length} arquivo(s) no bucket de Dev (${(summary.storage.totalBytes / (1024 * 1024)).toFixed(2)} MB).`);

      if (files.length > 0) {
        for (const file of files) {
          const destPath = devUid === prodUid ? file.name : file.name.replace(`users/${devUid}/`, `users/${prodUid}/`);

          if (dryRun) {
            console.log(`[DRY-RUN] Copiaria: gs://${devBucket.name}/${file.name} ➔ gs://${prodBucket.name}/${destPath}`);
          } else {
            const destFile = prodBucket.file(destPath);
            await file.copy(destFile);
            summary.storage.copied++;
          }
        }
        if (!dryRun) {
          console.log(`✅ ${summary.storage.copied} arquivo(s) clonado(s) com sucesso para o bucket de Produção.`);
        }
      }
    } catch (storageErr) {
      console.warn(`⚠️ Não foi possível sincronizar os arquivos do Firebase Storage: ${storageErr.message}`);
      summary.warnings.push(`Cópia de Storage não concluída: ${storageErr.message}`);
    }
  }

  // 9. Relatório Final Detalhado
  console.log('\n================================================================');
  console.log('📊 RESUMO DETALHADO DA MIGRAÇÃO (DEV ➔ PROD)');
  console.log(`Status: ${dryRun ? '🟡 SIMULAÇÃO CONCLUÍDA (Sem alterações em Prod)' : '🟢 MIGRAÇÃO CONCLUÍDA COM SUCESSO'}`);
  console.log(`Usuário: ${devUser.displayName || 'Sem nome'} (${userEmail})`);
  console.log(`UID Dev: ${devUid} | UID Prod: ${prodUid}`);
  if (summary.passwordStatus) {
    console.log(`Segurança/Senha: ${summary.passwordStatus}`);
  }
  if (summary.passwordResetLink) {
    console.log(`\n🔗 LINK DE PRIMEIRO ACESSO / DEFINIÇÃO DE SENHA:\n${summary.passwordResetLink}\n`);
  }
  console.log('----------------------------------------------------------------');
  console.log('📦 Coleções e Documentos Migrados:');
  for (const [col, count] of Object.entries(summary.collections)) {
    console.log(` • ${col}: ${count} documento(s)`);
  }
  if (copyStorage) {
    console.log('----------------------------------------------------------------');
    console.log(`🗄️ Arquivos no Firebase Storage:`);
    console.log(` • Arquivos encontrados: ${summary.storage.filesFound}`);
    console.log(` • Volume total: ${(summary.storage.totalBytes / (1024 * 1024)).toFixed(2)} MB`);
    if (!dryRun) {
      console.log(` • Arquivos clonados: ${summary.storage.copied}`);
    }
  }
  if (summary.warnings.length > 0) {
    console.log('----------------------------------------------------------------');
    console.log('⚠️ Avisos e Atenções:');
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

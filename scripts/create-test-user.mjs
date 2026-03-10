#!/usr/bin/env node
/**
 * Script para criar usuário de teste no Firebase
 *
 * Uso:
 *   firebase use dev
 *   node scripts/create-test-user.mjs caio.garcia@gmail.com Hexa1020**
 *
 * Ou use as variáveis de ambiente do .env.test:
 *   node scripts/create-test-user.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Carregar .env.test se existir
config({ path: resolve(process.cwd(), '.env.test') });

// Pegar credenciais da linha de comando ou .env.test
const email = process.argv[2] || process.env.TEST_USER_EMAIL;
const password = process.argv[3] || process.env.TEST_USER_PASSWORD;

if (!email || !password) {
  console.error('❌ Email e senha são obrigatórios!');
  console.error('');
  console.error('Uso:');
  console.error('  node scripts/create-test-user.mjs EMAIL SENHA');
  console.error('');
  console.error('Ou configure .env.test com:');
  console.error('  TEST_USER_EMAIL=seu@email.com');
  console.error('  TEST_USER_PASSWORD=suaSenha123');
  process.exit(1);
}

// Inicializar Firebase Admin
let serviceAccountPath;
try {
  // Tentar diferentes locais para a service account
  const possiblePaths = [
    './luisices-dev-firebase-adminsdk.json',
    './serviceAccountKey.json',
    './firebase-dev-service-account.json',
  ];

  for (const path of possiblePaths) {
    try {
      readFileSync(path);
      serviceAccountPath = path;
      break;
    } catch {
      // Arquivo não encontrado, tentar próximo
    }
  }

  if (!serviceAccountPath) {
    throw new Error('Service account key não encontrada');
  }

  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

  initializeApp({
    credential: cert(serviceAccount)
  });

  console.log('✅ Firebase Admin inicializado');
} catch (error) {
  console.error('❌ Erro ao inicializar Firebase Admin:');
  console.error('');
  console.error('Você precisa de um arquivo de service account (JSON) na raiz do projeto.');
  console.error('');
  console.error('Como obter:');
  console.error('1. Acesse: https://console.firebase.google.com/');
  console.error('2. Selecione o projeto luisices-dev');
  console.error('3. Project Settings > Service Accounts');
  console.error('4. Generate New Private Key');
  console.error('5. Salve como: luisices-dev-firebase-adminsdk.json');
  console.error('');
  console.error('⚠️  NÃO COMMITE ESSE ARQUIVO! (já está no .gitignore)');
  process.exit(1);
}

const auth = getAuth();
const db = getFirestore();

async function createTestUser() {
  try {
    console.log(`\n🔍 Verificando se usuário ${email} já existe...`);

    let userRecord;
    let userExists = false;

    try {
      userRecord = await auth.getUserByEmail(email);
      userExists = true;
      console.log(`✅ Usuário encontrado no Authentication (UID: ${userRecord.uid})`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('📝 Usuário não existe, criando...');

        userRecord = await auth.createUser({
          email,
          password,
          emailVerified: true,
          displayName: 'Teste E2E',
        });

        console.log(`✅ Usuário criado no Authentication (UID: ${userRecord.uid})`);
      } else {
        throw error;
      }
    }

    // Verificar/criar perfil no Firestore
    const userDocRef = db.collection('users').doc(userRecord.uid);
    const userDoc = await userDocRef.get();

    if (userDoc.exists) {
      const data = userDoc.data();
      console.log(`\n📋 Perfil existente no Firestore:`);
      console.log(`   Email: ${data.email}`);
      console.log(`   Role: ${data.role}`);
      console.log(`   Active: ${data.active}`);
      console.log(`   Permissions: ${JSON.stringify(data.permissions, null, 2)}`);

      // Atualizar se inativo
      if (!data.active) {
        await userDocRef.update({
          active: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`\n✅ Usuário reativado!`);
      }
    } else {
      console.log(`\n📝 Criando perfil no Firestore...`);

      await userDocRef.set({
        email,
        name: 'Teste E2E',
        active: true,
        role: 'admin',
        permissions: {
          dashboard: true,
          orders: {
            view: true,
            create: true,
            edit: true,
            delete: false
          },
          customers: {
            view: true,
            create: true,
            edit: true,
            delete: false
          },
          quotes: {
            view: true,
            create: true,
            edit: true,
            delete: false
          },
          products: {
            view: true,
            create: true,
            edit: true,
            delete: false
          },
          gallery: {
            view: true,
            create: true,
            edit: true,
            delete: false
          },
          reports: true,
          settings: true,
          exchanges: true,
          users: {
            view: false,
            create: false,
            edit: false,
            delete: false
          }
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log(`✅ Perfil criado no Firestore`);
    }

    console.log(`\n✅ Usuário de teste pronto!`);
    console.log(`\n📋 Resumo:`);
    console.log(`   Email: ${email}`);
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Status: Ativo`);
    console.log(`   Role: admin`);
    console.log(`\n🧪 Pode rodar os testes agora:`);
    console.log(`   npm run test:smoke`);

    if (!userExists && password) {
      console.log(`\n⚠️  Senha definida: ${password}`);
      console.log(`   (Armazene com segurança!)`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createTestUser();

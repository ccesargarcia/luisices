#!/usr/bin/env node
/**
 * Script para criar clientes aleatórios no Firestore.
 *
 * Uso:
 *   node scripts/create-random-customers.mjs <quantidade> [prefixo] [serviceAccountPath]
 *
 * Ex:
 *   node scripts/create-random-customers.mjs 10 e2e ./luisices-dev-firebase-adminsdk.json
 *
 * Se a chave do serviço estiver em uma variável de ambiente, use:
 *   SERVICE_ACCOUNT_PATH=./luisices-dev-firebase-adminsdk.json node scripts/create-random-customers.mjs 10 e2e
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.test') });

const count = parseInt(process.argv[2] ?? process.env.CREATE_CUSTOMERS_COUNT ?? '0', 10);
const prefix = process.argv[3] ?? process.env.CREATE_CUSTOMERS_PREFIX ?? 'E2E';
const serviceAccountPathArg = process.argv[4];
const serviceAccountPathEnv = process.env.SERVICE_ACCOUNT_PATH;
const userEmail = process.env.TEST_USER_EMAIL;

if (!count || count <= 0) {
  console.error('❌ É preciso informar a quantidade de clientes a serem criados.');
  console.error('Uso: node scripts/create-random-customers.mjs <quantidade> [prefixo]');
  process.exit(1);
}

if (!userEmail) {
  console.error('❌ Defina TEST_USER_EMAIL no .env.test (ou via variável de ambiente).');
  process.exit(1);
}

let serviceAccountPath;
try {
  // Se foi passada uma service account via argumento ou variável de ambiente, usa direto.
  if (serviceAccountPathArg) {
    serviceAccountPath = serviceAccountPathArg;
  } else if (serviceAccountPathEnv) {
    serviceAccountPath = serviceAccountPathEnv;
  } else {
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
        // ignore
      }
    }
  }

  if (!serviceAccountPath) {
    throw new Error(`Service account key não encontrada. Forneça via argumento ou variáveis de ambiente (SERVICE_ACCOUNT_PATH). ` +
      `Arquivos tentados: ./luisices-dev-firebase-adminsdk.json, ./serviceAccountKey.json, ./firebase-dev-service-account.json`);
  }

  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

  initializeApp({
    credential: cert(serviceAccount),
  });
} catch (error) {
  console.error('❌ Erro ao inicializar Firebase Admin:');
  console.error(error);
  process.exit(1);
}

const auth = getAuth();
const db = getFirestore();

function randomPhone() {
  const n = () => Math.floor(Math.random() * 10);
  return `11${n()}${n()}${n()}${n()}${n()}${n()}${n()}${n()}${n()}${n()}`;
}

function randomEmail(name) {
  const rnd = Math.floor(Math.random() * 10000);
  return `${name.replace(/\s+/g, '.').toLowerCase()}.${rnd}@example.com`;
}

function randomName(prefix, i) {
  return `${prefix} ${i + 1}`;
}

async function run() {
  const user = await auth.getUserByEmail(userEmail);
  const userId = user.uid;

  console.log(`✅ Criando ${count} clientes para o usuário ${userEmail} (uid=${userId})`);

  const customersRef = db.collection('customers');

  for (let i = 0; i < count; i++) {
    const name = randomName(prefix, i);
    const phone = randomPhone();
    const email = randomEmail(name);

    const data = {
      name,
      phone,
      email,
      userId,
      createdAt: new Date().toISOString(),
      totalOrders: 0,
      totalSpent: 0,
    };

    const docRef = await customersRef.add(data);
    console.log(`  ✅ Cliente criado: ${name} (id=${docRef.id})`);
  }

  console.log(`\n✅ ${count} clientes criados com sucesso.`);
}

run().catch((err) => {
  console.error('❌ Erro:', err);
  process.exit(1);
});

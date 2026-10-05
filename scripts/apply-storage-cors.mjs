#!/usr/bin/env node
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Storage } = require('../functions/node_modules/@google-cloud/storage');

const bucketName = process.argv[2] || process.env.VITE_FIREBASE_STORAGE_BUCKET || 'papelaria-dashboard.appspot.com';
const keyFilePath = process.argv[3] || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const corsFilePath = new URL('../cors.json', import.meta.url);

if (!fs.existsSync(corsFilePath)) {
  console.error('Arquivo cors.json não encontrado!');
  process.exit(1);
}

const corsConfig = JSON.parse(fs.readFileSync(corsFilePath, 'utf8'));

console.log(`Aplicando configuração CORS ao bucket: ${bucketName}...`);
console.log('Regras:', JSON.stringify(corsConfig, null, 2));

try {
  const storageOptions = {};
  if (keyFilePath && fs.existsSync(keyFilePath)) {
    console.log(`Usando credenciais da chave: ${keyFilePath}`);
    storageOptions.keyFilename = keyFilePath;
  }
  const storage = new Storage(storageOptions);
  const bucket = storage.bucket(bucketName);
  await bucket.setCorsConfiguration(corsConfig);
  console.log(`\n✅ CORS aplicado com sucesso no bucket gs://${bucketName}!`);
} catch (error) {
  console.error('\n❌ Erro ao aplicar CORS no bucket:', error.message);
  console.info('\nOpções para resolver:');
  console.info('1. Usar o Google Cloud Shell no navegador (https://console.cloud.google.com):');
  console.info(`   gcloud storage buckets update gs://${bucketName} --cors-file=cors.json`);
  console.info('2. Ou baixar a chave do Firebase Admin (Configurações do Projeto > Contas de Serviço) e rodar:');
  console.info(`   node scripts/apply-storage-cors.mjs ${bucketName} ./serviceAccountKey.json`);
  process.exit(1);
}

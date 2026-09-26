#!/usr/bin/env node
/**
 * Script para popular dados essenciais no Firebase Local Emulator para testes E2E
 * Utiliza o Firebase Admin SDK oficial para garantir permissões de escrita completas no Firestore e Auth Emulator.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

config({ path: resolve(process.cwd(), '.env.test') });
config({ path: resolve(process.cwd(), '.env.local') });

const host = process.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1';
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'luisices-dev';
const email = process.env.TEST_USER_EMAIL || 'teste@luisices.com.br';
const password = process.env.TEST_USER_PASSWORD || 'Senha123456!';

process.env.FIREBASE_AUTH_EMULATOR_HOST = `${host}:9099`;
process.env.FIRESTORE_EMULATOR_HOST = `${host}:8080`;
process.env.FIREBASE_STORAGE_EMULATOR_HOST = `${host}:9199`;

const ADMIN_PERMISSIONS = {
  dashboard: true,
  orders: { view: true, create: true, edit: true, delete: true },
  customers: { view: true, create: true, edit: true, delete: true },
  whatsapp: true,
  aiCopilot: true,
  products: { view: true, create: true, edit: true, delete: true },
  storeProducts: { view: true, create: true, edit: true, delete: true },
  store: true,
  quotes: { view: true, create: true, edit: true, delete: true },
  gallery: { view: true, create: true, delete: true },
  exchanges: true,
  reports: true,
  settings: true,
  users: { view: true, create: true, edit: true, delete: true },
  emails: true,
  pricing: true,
};

async function seed() {
  console.log(`🌱 Populando Firebase Local Emulator (${projectId} em ${host})...`);

  try {
    const app = getApps().length === 0 ? initializeApp({ projectId }) : getApps()[0];
    const auth = getAuth(app);
    const db = getFirestore(app);

    // 1. Criar ou obter usuário no Auth Emulator
    let uid;
    try {
      const user = await auth.getUserByEmail(email);
      uid = user.uid;
      console.log(`ℹ️ Usuário já existente no Auth Emulator (UID: ${uid})`);
    } catch (err) {
      if (err?.code === 'auth/user-not-found') {
        const newUser = await auth.createUser({
          email,
          password,
          displayName: 'Admin Teste',
        });
        uid = newUser.uid;
        console.log(`✅ Usuário criado no Auth Emulator (UID: ${uid})`);
      } else {
        throw err;
      }
    }

    // 2. Criar perfil completo de admin no Firestore Emulator (Admin SDK ignora security rules de cliente)
    await db.doc(`userProfiles/${uid}`).set({
      uid,
      email,
      displayName: 'Admin Teste',
      role: 'admin',
      active: true,
      permissions: ADMIN_PERMISSIONS,
      createdAt: new Date().toISOString(),
      createdBy: uid,
    });
    console.log('✅ Perfil userProfiles (admin) criado no Firestore Emulator');

    // 3. Criar storeSettings/public
    await db.doc('storeSettings/public').set({
      catalogStoreName: 'Luisices Papelaria',
      catalogStoreTagline: 'Papelaria Personalizada',
      storePublished: true,
      whatsappPhone: '5511999999999',
    });
    console.log('✅ Configurações storeSettings/public criadas no Firestore Emulator');

    // 4. Criar produto de exemplo
    await db.doc('storeProducts/prod-sample-1').set({
      name: 'Agenda Personalizada 2026',
      category: 'Agendas',
      price: 49.9,
      active: true,
      isPublic: true,
      leadTimeDays: 5,
      userId: uid,
      createdAt: new Date().toISOString(),
    });
    console.log('✅ Produto de teste criado no Firestore Emulator');

    console.log('🎉 Emulator populado com sucesso e pronto para testes!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao popular emulator:', err);
    process.exit(1);
  }
}

seed();

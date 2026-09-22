#!/usr/bin/env node
/**
 * Script para popular dados essenciais no Firebase Local Emulator para testes E2E
 * Utiliza o Firebase SDK oficial para garantir tipagem e integridade exatas no Firestore e Auth.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
} from 'firebase/firestore';

config({ path: resolve(process.cwd(), '.env.test') });
config({ path: resolve(process.cwd(), '.env.local') });

const host = process.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1';
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'luisices-dev';
const email = process.env.TEST_USER_EMAIL || 'teste@luisices.com.br';
const password = process.env.TEST_USER_PASSWORD || 'Senha123456!';

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
    const app = initializeApp({
      apiKey: 'fake-api-key',
      projectId,
    });

    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });

    const db = getFirestore(app);
    connectFirestoreEmulator(db, host, 8080);

    // 1. Criar ou autenticar usuário no Auth Emulator
    let uid;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      uid = userCredential.user.uid;
      console.log(`✅ Usuário criado no Auth Emulator (UID: ${uid})`);
    } catch (authErr) {
      if (authErr.code === 'auth/email-already-in-use') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        uid = userCredential.user.uid;
        console.log(`ℹ️ Usuário já existente no Auth Emulator (UID: ${uid})`);
      } else {
        throw authErr;
      }
    }

    // 2. Criar perfil completo de admin no Firestore Emulator
    await setDoc(doc(db, 'userProfiles', uid), {
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
    await setDoc(doc(db, 'storeSettings', 'public'), {
      catalogStoreName: 'Luisices Papelaria',
      catalogStoreTagline: 'Papelaria Personalizada',
      storePublished: true,
      whatsappPhone: '5511999999999',
    });
    console.log('✅ Configurações storeSettings/public criadas no Firestore Emulator');

    // 4. Criar produto de exemplo
    await setDoc(doc(db, 'storeProducts', 'prod-sample-1'), {
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

#!/usr/bin/env node
/**
 * Script para popular dados essenciais no Firebase Local Emulator para testes E2E
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.test') });
config({ path: resolve(process.cwd(), '.env.local') });

const host = process.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1';
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'luisices-dev';
const email = process.env.TEST_USER_EMAIL || 'teste@luisices.com.br';
const password = process.env.TEST_USER_PASSWORD || 'Senha123456!';

async function seed() {
  console.log('🌱 Populando Firebase Local Emulator...');

  try {
    // 1. Criar usuário no Auth Emulator
    const authRes = await fetch(
      `http://${host}:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const authData = await authRes.json();
    const uid = authData.localId || 'test-user-e2e-uid';
    console.log(`✅ Usuário criado no Auth Emulator (UID: ${uid})`);

    // 2. Criar perfil de admin no Firestore Emulator
    const profileDoc = {
      fields: {
        uid: { stringValue: uid },
        email: { stringValue: email },
        displayName: { stringValue: 'Admin Teste' },
        role: { stringValue: 'admin' },
        active: { booleanValue: true },
        createdAt: { stringValue: new Date().toISOString() },
        createdBy: { stringValue: uid },
      },
    };

    await fetch(
      `http://${host}:8080/v1/projects/${projectId}/databases/(default)/documents/userProfiles/${uid}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileDoc),
      }
    );
    console.log('✅ Perfil userProfiles criado no Firestore Emulator');

    // 3. Criar storeSettings/public
    const storeSettingsDoc = {
      fields: {
        catalogStoreName: { stringValue: 'Luisices Papelaria' },
        catalogStoreTagline: { stringValue: 'Papelaria Personalizada' },
        storePublished: { booleanValue: true },
        whatsappPhone: { stringValue: '5511999999999' },
      },
    };

    await fetch(
      `http://${host}:8080/v1/projects/${projectId}/databases/(default)/documents/storeSettings/public`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeSettingsDoc),
      }
    );
    console.log('✅ Configurações de vitrine pública criadas no Firestore Emulator');

    // 4. Criar produto de exemplo
    const productDoc = {
      fields: {
        name: { stringValue: 'Agenda Personalizada 2026' },
        category: { stringValue: 'Agendas' },
        price: { doubleValue: 49.9 },
        active: { booleanValue: true },
        isPublic: { booleanValue: true },
        leadTimeDays: { integerValue: '5' },
        userId: { stringValue: uid },
        createdAt: { stringValue: new Date().toISOString() },
      },
    };

    await fetch(
      `http://${host}:8080/v1/projects/${projectId}/databases/(default)/documents/storeProducts/prod-sample-1`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productDoc),
      }
    );
    console.log('✅ Produto de teste criado no Firestore Emulator');

    console.log('🎉 Emulator populado com sucesso e pronto para testes!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao popular emulator:', err);
    process.exit(1);
  }
}

seed();

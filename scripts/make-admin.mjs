/**
 * Script para promover um usuário a admin no Firestore.
 * Uso: node scripts/make-admin.mjs <email>
 *
 * Requer: VITE_FIREBASE_* vars no ambiente ou .env na raiz do projeto.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Carregar .env.local ou .env manualmente
for (const name of ['.env.local', '.env']) {
  try {
    const env = readFileSync(resolve(process.cwd(), name), 'utf-8');
    for (const line of env.split('\n')) {
      const [k, ...v] = line.split('=');
      if (k && v.length) process.env[k.trim()] = v.join('=').trim();
    }
    break;
  } catch {}
}

const {
  VITE_FIREBASE_API_KEY: apiKey,
  VITE_FIREBASE_PROJECT_ID: projectId,
} = process.env;

if (!apiKey || !projectId) {
  console.error('❌  Variáveis VITE_FIREBASE_API_KEY e VITE_FIREBASE_PROJECT_ID não encontradas no .env');
  process.exit(1);
}

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Uso: node scripts/make-admin.mjs <email> <senha>');
  process.exit(1);
}

// 1. Autenticar para obter o UID
const loginRes = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  }
);
const loginData = await loginRes.json();
if (!loginRes.ok) {
  console.error('❌  Falha no login:', loginData?.error?.message);
  process.exit(1);
}

const { localId: uid, idToken } = loginData;
console.log(`✔  Usuário encontrado: ${uid}`);

// 2. Escrever perfil admin no Firestore via REST
const adminPermissions = {
  dashboard: true,
  orders:    { view: true, create: true, edit: true, delete: true },
  customers: { view: true, create: true, edit: true, delete: true },
  products:  { view: true, create: true, edit: true, delete: true },
  quotes:    { view: true, create: true, edit: true, delete: true },
  gallery:   { view: true, create: true, delete: true },
  reports:   true,
  exchanges: true,
  settings:  true,
  users:     { view: true, create: true, edit: true, delete: true },
};

function toFirestoreValue(v) {
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'string')  return { stringValue: v };
  if (typeof v === 'object' && v !== null) {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(v).map(([k, val]) => [k, toFirestoreValue(val)])),
      },
    };
  }
  return { nullValue: null };
}

const fields = {
  uid:         { stringValue: uid },
  email:       { stringValue: email },
  displayName: { stringValue: loginData.displayName || email },
  role:        { stringValue: 'admin' },
  permissions: toFirestoreValue(adminPermissions),
  active:      { booleanValue: true },
  createdAt:   { stringValue: new Date().toISOString() },
  createdBy:   { stringValue: uid },
};

const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/userProfiles/${uid}`;
const fsRes = await fetch(fsUrl, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  },
  body: JSON.stringify({ fields }),
});

if (!fsRes.ok) {
  const err = await fsRes.json();
  console.error('❌  Erro ao salvar perfil:', JSON.stringify(err, null, 2));
  process.exit(1);
}

console.log('✅  Perfil admin criado/atualizado com sucesso!');
console.log('   Faça logout e login novamente no app.');

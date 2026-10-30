import { createRequire } from 'node:module';

// Exercita a versão efetivamente empacotada no backend, não a dependência
// firebase-admin da raiz (que pode ter outra versão).
const backendRequire = createRequire(new URL('../../../functions/package.json', import.meta.url));
export const { initializeApp, deleteApp } = backendRequire('firebase-admin/app') as typeof import('firebase-admin/app');
export const { initializeFirestore, getFirestore } = backendRequire('firebase-admin/firestore') as typeof import('firebase-admin/firestore');

export function initializeRestEmulator(app: import('firebase-admin/app').App) {
  if (app.options.projectId !== 'demo-luisices-review'
    || !/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) {
    throw new Error('REST de teste permitido somente no projeto fictício e emulador localhost.');
  }
  // google-gax REST exige um cliente auth inclusive para o emulador. O token
  // reservado "owner" só tem significado no emulador, sem chaves ou ADC reais.
  const { OAuth2Client } = backendRequire('google-auth-library');
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: 'owner' });
  const db = initializeFirestore(app, { preferRest: true });
  db.settings({ auth });
  return db;
}

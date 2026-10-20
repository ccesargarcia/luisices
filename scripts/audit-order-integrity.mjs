#!/usr/bin/env node
/** Read-only audit for order totals, payment consistency, structured items and versions. */

import { deleteApp, initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, connectAuthEmulator, signOut } from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  documentId,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  startAfter,
  terminate,
} from 'firebase/firestore';
import { config } from 'dotenv';
import { auditOrderData } from './order-integrity-audit-core.mjs';

config({ path: '.env.local', quiet: true });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

function getLimit(args) {
  const value = args.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length);
  if (value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error('Use --limit=N com um inteiro maior que zero.');
  }
  return parsed;
}

async function authenticateAdmin(db, auth) {
  const email = process.env.FIREBASE_ADMIN_EMAIL;
  const password = process.env.FIREBASE_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Configure FIREBASE_ADMIN_EMAIL e FIREBASE_ADMIN_PASSWORD em .env.local.');
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getDoc(doc(db, 'userProfiles', credential.user.uid));
  if (!profile.exists() || profile.data().role !== 'admin' || profile.data().active === false) {
    throw new Error('A conta autenticada precisa ter um perfil de administrador ativo.');
  }
}

async function scanOrders(db, maxDocs) {
  const ordersRef = collection(db, 'orders');
  const pageSize = 500;
  const findings = [];
  let scannedCount = 0;
  let cursor;

  while (maxDocs === null || scannedCount < maxDocs) {
    const pageLimit = maxDocs === null ? pageSize : Math.min(pageSize, maxDocs - scannedCount);
    const constraints = [orderBy(documentId())];
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(pageLimit));

    const page = await getDocs(query(ordersRef, ...constraints));
    if (page.empty) break;

    for (const orderDoc of page.docs) {
      scannedCount += 1;
      const data = orderDoc.data();
      const issues = auditOrderData(data);
      if (issues.length > 0) {
        findings.push({
          id: orderDoc.id,
          orderNumber: typeof data.orderNumber === 'string' ? data.orderNumber : null,
          issues,
        });
      }
    }

    cursor = page.docs.at(-1);
    if (page.size < pageLimit) break;
  }

  return { scannedCount, findings, limited: maxDocs !== null };
}

async function main() {
  const args = process.argv.slice(2);
  const maxDocs = getLimit(args);
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('A configuração Firebase do projeto está ausente em .env.local.');
  }

  const app = initializeApp(firebaseConfig, 'order-integrity-audit');
  const db = getFirestore(app);
  const auth = getAuth(app);
  try {
    if (process.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
      const emulatorHost = process.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1';
      connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(db, emulatorHost, 8080);
    }

    await authenticateAdmin(db, auth);
    const { scannedCount, findings, limited } = await scanOrders(db, maxDocs);
    const byCode = {};
    for (const finding of findings) {
      for (const issue of finding.issues) byCode[issue.code] = (byCode[issue.code] || 0) + 1;
    }

    const report = {
      mode: 'read-only',
      projectId: firebaseConfig.projectId,
      generatedAt: new Date().toISOString(),
      scannedCount,
      limited,
      orderCountWithFindings: findings.length,
      issueCount: findings.reduce((count, finding) => count + finding.issues.length, 0),
      byCode,
      findings,
    };

    if (args.includes('--json')) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      console.log(`Auditoria somente leitura — projeto ${report.projectId}`);
      console.log(`Pedidos analisados: ${scannedCount}${limited ? ' (execução limitada)' : ''}`);
      console.log(`Pedidos com achados: ${report.orderCountWithFindings}; ocorrências: ${report.issueCount}`);
      for (const finding of findings) {
        const label = finding.orderNumber || finding.id;
        for (const issue of finding.issues) {
          console.log(`[${issue.severity}] ${label} (${finding.id}) — ${issue.code}: ${issue.detail}`);
        }
      }
      if (findings.length === 0) console.log('Nenhum achado nos pedidos analisados.');
      if (limited) console.log('A amostra foi limitada; execute sem --limit para percorrer toda a coleção.');
    }

    if (args.includes('--fail-on-findings') && report.issueCount > 0) process.exitCode = 1;
  } finally {
    await Promise.allSettled([signOut(auth), terminate(db)]);
    await deleteApp(app).catch(() => {});
  }
}

main().catch((error) => {
  console.error(`Falha na auditoria de pedidos: ${error.message || error}`);
  process.exitCode = 1;
});

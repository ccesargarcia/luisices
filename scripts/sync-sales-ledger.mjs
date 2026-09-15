#!/usr/bin/env node
/**
 * Script para sincronizar pedidos existentes no Firestore com a coleção salesLedger
 *
 * Uso: node scripts/sync-sales-ledger.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { config } from 'dotenv';

// Carregar variáveis de ambiente (.env.local ou .env)
config({ path: '.env.local' });
config({ path: '.env' });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function syncSalesLedger() {
  console.log('🚀 Iniciando sincronização da coleção salesLedger...');

  const ordersRef = collection(db, 'orders');
  const snapshot = await getDocs(ordersRef);

  console.log(`📦 Encontrados ${snapshot.docs.length} pedidos no Firestore.`);

  let synced = 0;
  const BATCH_SIZE = 400;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const orderDoc of chunk) {
      const raw = orderDoc.data();
      const createdAt = raw.createdAt?.toDate
        ? raw.createdAt.toDate().toISOString()
        : (typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString());

      const price = typeof raw.price === 'number' && !isNaN(raw.price) ? Math.max(0, raw.price) : 0;
      const paidAmount = raw.payment?.paidAmount && !isNaN(raw.payment.paidAmount)
        ? Math.max(0, raw.payment.paidAmount)
        : 0;

      const saleRecord = {
        id: orderDoc.id,
        orderId: orderDoc.id,
        orderNumber: raw.orderNumber || '',
        userId: raw.userId || 'admin',
        assignedTo: raw.assignedTo || null,
        assignedToName: raw.assignedToName || null,
        customerId: raw.customerId || null,
        customerName: raw.customerName || 'Cliente não informado',
        customerPhone: raw.customerPhone || null,
        productName: raw.productName || 'Produto',
        quantity: raw.quantity && raw.quantity > 0 ? raw.quantity : 1,
        amount: price,
        paymentStatus: raw.payment?.status || 'pending',
        paidAmount,
        paymentMethod: raw.payment?.method || null,
        date: createdAt,
        deliveryDate: raw.deliveryDate || null,
        status: raw.status || 'pending',
        isDeletedFromOrders: raw.deletedAt != null,
        notes: raw.notes || null,
        tags: raw.tags || null,
        createdAt,
        updatedAt: new Date().toISOString(),
      };

      const saleRef = doc(db, 'salesLedger', orderDoc.id);
      const cleanData = {};
      Object.entries(saleRecord).forEach(([k, v]) => {
        if (v !== undefined) cleanData[k] = v;
      });

      batch.set(saleRef, cleanData, { merge: true });
      synced++;
    }

    await batch.commit();
    console.log(`  💾 Lote salvo (${synced}/${docs.length})...`);
  }

  console.log(`✅ Sucesso: ${synced} registros sincronizados em salesLedger!`);
  process.exit(0);
}

syncSalesLedger().catch((err) => {
  console.error('❌ Erro na sincronização:', err);
  process.exit(1);
});

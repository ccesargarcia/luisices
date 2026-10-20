#!/usr/bin/env node
/**
 * Script para corrigir valores negativos no Firestore
 * 
 * Uso: configurar Firebase em .env.local e informar FIREBASE_ADMIN_EMAIL e
 * FIREBASE_ADMIN_PASSWORD. A execução padrão apenas simula; use --apply para gravar.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  connectFirestoreEmulator,
  runTransaction,
} from 'firebase/firestore';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config({ path: '.env.local', quiet: true });
const APPLY_CHANGES = process.argv.includes('--apply');

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
const auth = getAuth(app);

if (process.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  const emulatorHost = process.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1';
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, 8080);
}

async function authenticateAdmin() {
  const email = process.env.FIREBASE_ADMIN_EMAIL;
  const password = process.env.FIREBASE_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Configure FIREBASE_ADMIN_EMAIL e FIREBASE_ADMIN_PASSWORD em .env.local para executar a manutenção.');
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getDoc(doc(db, 'userProfiles', credential.user.uid));
  if (!profile.exists() || profile.data().role !== 'admin' || profile.data().active === false) {
    throw new Error('A conta autenticada precisa ter um perfil de administrador ativo.');
  }
}

/**
 * Corrigir valores negativos em clientes
 */
async function fixCustomers() {
  console.log('🔍 Verificando clientes...');
  
  const customersRef = collection(db, 'customers');
  const snapshot = await getDocs(customersRef);
  
  let fixed = 0;
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const updates = {};
    
    if (data.totalSpent < 0) {
      updates.totalSpent = 0;
      console.log(`  ❌ Cliente ${data.name}: totalSpent ${data.totalSpent} → 0`);
    }
    
    if (data.totalOrders < 0) {
      updates.totalOrders = 0;
      console.log(`  ❌ Cliente ${data.name}: totalOrders ${data.totalOrders} → 0`);
    }
    
    if (Object.keys(updates).length > 0) {
      if (APPLY_CHANGES) await updateDoc(doc(db, 'customers', docSnap.id), updates);
      fixed++;
    }
  }
  
  console.log(`✅ ${fixed} clientes ${APPLY_CHANGES ? 'corrigidos' : 'com correção proposta'}\n`);
  return fixed;
}

/**
 * Corrigir valores negativos em pedidos
 */
async function fixOrders() {
  console.log('🔍 Verificando pedidos...');
  
  const ordersRef = collection(db, 'orders');
  const q = query(ordersRef, where('deletedAt', '==', null));
  const snapshot = await getDocs(q);
  
  let fixed = 0;
  
  for (const docSnap of snapshot.docs) {
    const repair = await runTransaction(db, async (transaction) => {
      const orderRef = doc(db, 'orders', docSnap.id);
      const currentSnapshot = await transaction.get(orderRef);
      if (!currentSnapshot.exists()) return null;

      const data = currentSnapshot.data();
      const updates = {};
      const nextPrice = data.price < 0 ? 0 : data.price;
      if (data.price < 0) updates.price = 0;

      if (data.payment && typeof data.payment === 'object') {
        const payment = data.payment;
        const hasNegativePaymentAmount = [payment.totalAmount, payment.paidAmount, payment.remainingAmount]
          .some(value => typeof value === 'number' && value < 0);
        const orderPriceChanged = Object.hasOwn(updates, 'price');

        if (hasNegativePaymentAmount || orderPriceChanged) {
          if (typeof nextPrice !== 'number' || !Number.isFinite(nextPrice) || nextPrice < 0) {
            return { manualReview: 'preço do pedido inválido para recalcular o pagamento' };
          }
          if (payment.method != null && !['pix', 'cash', 'credit', 'debit', 'transfer'].includes(payment.method)) {
            return { manualReview: 'forma de pagamento inválida' };
          }

          const paidAmount = typeof payment.paidAmount === 'number' && Number.isFinite(payment.paidAmount)
            ? Math.max(0, payment.paidAmount)
            : 0;
          if (paidAmount > nextPrice) {
            return { manualReview: 'valor recebido supera o novo total; exige conciliação manual' };
          }

          const remainingAmount = Math.round((nextPrice - paidAmount) * 100) / 100;
          const status = paidAmount === nextPrice && nextPrice > 0
            ? 'paid'
            : paidAmount > 0
              ? 'partial'
              : 'pending';
          updates.payment = {
            ...payment,
            status,
            totalAmount: nextPrice,
            paidAmount,
            remainingAmount,
          };
        }
      }

      if (data.exchangeItems && Array.isArray(data.exchangeItems)) {
        const fixedItems = data.exchangeItems.map(item => ({
          ...item,
          value: item.value && item.value < 0 ? 0 : item.value,
          quantity: item.quantity < 0 ? 0 : item.quantity,
        }));
        if (JSON.stringify(fixedItems) !== JSON.stringify(data.exchangeItems)) {
          updates.exchangeItems = fixedItems;
        }
      }

      if (Object.keys(updates).length === 0) return null;

      const currentVersion = data.version === undefined ? 1 : data.version;
      if (!Number.isSafeInteger(currentVersion) || currentVersion < 1) {
        return { manualReview: 'versão inválida; pedido não foi alterado' };
      }
      updates.version = currentVersion + 1;
      updates.updatedAt = new Date().toISOString();
      if (APPLY_CHANGES) transaction.update(orderRef, updates);
      return { orderNumber: data.orderNumber, updates };
    });

    if (repair?.manualReview) {
      console.warn(`  ⚠️ Pedido ${docSnap.data().orderNumber}: ${repair.manualReview}`);
      continue;
    }
    if (repair?.updates) {
      console.log(`  ✅ Pedido ${repair.orderNumber}: ${APPLY_CHANGES ? 'corrigir' : 'correção proposta para'} ${Object.keys(repair.updates).filter(key => !['version', 'updatedAt'].includes(key)).join(', ')}`);
      fixed++;
    }
  }
  
  console.log(`✅ ${fixed} pedidos ${APPLY_CHANGES ? 'corrigidos' : 'com correção proposta'}\n`);
  return fixed;
}

/**
 * Corrigir valores negativos em orçamentos
 */
async function fixQuotes() {
  console.log('🔍 Verificando orçamentos...');
  
  const quotesRef = collection(db, 'quotes');
  const snapshot = await getDocs(quotesRef);
  
  let fixed = 0;
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const updates = {};
    
    if (data.totalPrice < 0) {
      updates.totalPrice = 0;
      console.log(`  ❌ Orçamento ${data.quoteNumber}: totalPrice ${data.totalPrice} → 0`);
    }
    
    if (data.discount && data.discount < 0) {
      updates.discount = 0;
      console.log(`  ❌ Orçamento ${data.quoteNumber}: discount ${data.discount} → 0`);
    }
    
    if (data.items && Array.isArray(data.items)) {
      const fixedItems = data.items.map(item => ({
        ...item,
        unitPrice: item.unitPrice < 0 ? 0 : item.unitPrice,
        quantity: item.quantity < 0 ? 0 : item.quantity
      }));
      
      if (JSON.stringify(fixedItems) !== JSON.stringify(data.items)) {
        updates.items = fixedItems;
        console.log(`  ❌ Orçamento ${data.quoteNumber}: items corrigidos`);
      }
    }
    
    if (Object.keys(updates).length > 0) {
      if (APPLY_CHANGES) await updateDoc(doc(db, 'quotes', docSnap.id), updates);
      fixed++;
    }
  }
  
  console.log(`✅ ${fixed} orçamentos ${APPLY_CHANGES ? 'corrigidos' : 'com correção proposta'}\n`);
  return fixed;
}

/**
 * Corrigir valores negativos em produtos
 */
async function fixProducts() {
  console.log('🔍 Verificando produtos...');
  
  const productsRef = collection(db, 'products');
  const snapshot = await getDocs(productsRef);
  
  let fixed = 0;
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const updates = {};
    
    if (data.unitPrice < 0) {
      updates.unitPrice = 0;
      console.log(`  ❌ Produto ${data.name}: unitPrice ${data.unitPrice} → 0`);
    }
    
    if (Object.keys(updates).length > 0) {
      if (APPLY_CHANGES) await updateDoc(doc(db, 'products', docSnap.id), updates);
      fixed++;
    }
  }
  
  console.log(`✅ ${fixed} produtos ${APPLY_CHANGES ? 'corrigidos' : 'com correção proposta'}\n`);
  return fixed;
}

/**
 * Executar correção
 */
async function main() {
  console.log(`🚀 ${APPLY_CHANGES ? 'Aplicando' : 'Simulando'} correções de valores negativos...\n`);
  
  try {
    await authenticateAdmin();
    const customersFixed = await fixCustomers();
    const ordersFixed = await fixOrders();
    const quotesFixed = await fixQuotes();
    const productsFixed = await fixProducts();
    
    const total = customersFixed + ordersFixed + quotesFixed + productsFixed;
    
    console.log('═══════════════════════════════════════');
    console.log(`🎉 ${APPLY_CHANGES ? 'Correção' : 'Simulação'} concluída!`);
    console.log(`📊 Total: ${total} registros ${APPLY_CHANGES ? 'alterados' : 'com correção proposta'}`);
    if (!APPLY_CHANGES) console.log('Nenhum dado foi alterado. Revise o relatório e use --apply para confirmar.');
    console.log('═══════════════════════════════════════');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();

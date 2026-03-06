#!/usr/bin/env node
/**
 * Script para corrigir valores negativos no Firestore
 * 
 * Uso: node scripts/fix-negative-values.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config({ path: '.env.local' });

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
      await updateDoc(doc(db, 'customers', docSnap.id), updates);
      fixed++;
    }
  }
  
  console.log(`✅ ${fixed} clientes corrigidos\n`);
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
    const data = docSnap.data();
    const updates = {};
    
    if (data.price < 0) {
      updates.price = 0;
      console.log(`  ❌ Pedido ${data.orderNumber}: price ${data.price} → 0`);
    }
    
    if (data.payment) {
      const paymentUpdates = {};
      let hasPaymentFix = false;
      
      if (data.payment.totalAmount < 0) {
        paymentUpdates.totalAmount = 0;
        hasPaymentFix = true;
        console.log(`  ❌ Pedido ${data.orderNumber}: payment.totalAmount ${data.payment.totalAmount} → 0`);
      }
      
      if (data.payment.paidAmount < 0) {
        paymentUpdates.paidAmount = 0;
        hasPaymentFix = true;
        console.log(`  ❌ Pedido ${data.orderNumber}: payment.paidAmount ${data.payment.paidAmount} → 0`);
      }
      
      if (data.payment.remainingAmount < 0) {
        paymentUpdates.remainingAmount = 0;
        hasPaymentFix = true;
        console.log(`  ❌ Pedido ${data.orderNumber}: payment.remainingAmount ${data.payment.remainingAmount} → 0`);
      }
      
      if (hasPaymentFix) {
        updates.payment = { ...data.payment, ...paymentUpdates };
      }
    }
    
    if (data.exchangeItems && Array.isArray(data.exchangeItems)) {
      const fixedItems = data.exchangeItems.map(item => ({
        ...item,
        value: item.value && item.value < 0 ? 0 : item.value,
        quantity: item.quantity < 0 ? 0 : item.quantity
      }));
      
      if (JSON.stringify(fixedItems) !== JSON.stringify(data.exchangeItems)) {
        updates.exchangeItems = fixedItems;
        console.log(`  ❌ Pedido ${data.orderNumber}: exchangeItems corrigidos`);
      }
    }
    
    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, 'orders', docSnap.id), updates);
      fixed++;
    }
  }
  
  console.log(`✅ ${fixed} pedidos corrigidos\n`);
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
      await updateDoc(doc(db, 'quotes', docSnap.id), updates);
      fixed++;
    }
  }
  
  console.log(`✅ ${fixed} orçamentos corrigidos\n`);
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
      await updateDoc(doc(db, 'products', docSnap.id), updates);
      fixed++;
    }
  }
  
  console.log(`✅ ${fixed} produtos corrigidos\n`);
  return fixed;
}

/**
 * Executar correção
 */
async function main() {
  console.log('🚀 Iniciando correção de valores negativos...\n');
  
  try {
    const customersFixed = await fixCustomers();
    const ordersFixed = await fixOrders();
    const quotesFixed = await fixQuotes();
    const productsFixed = await fixProducts();
    
    const total = customersFixed + ordersFixed + quotesFixed + productsFixed;
    
    console.log('═══════════════════════════════════════');
    console.log(`🎉 Correção concluída!`);
    console.log(`📊 Total: ${total} registros corrigidos`);
    console.log('═══════════════════════════════════════');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();

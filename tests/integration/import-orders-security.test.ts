import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, getDocs, query, where, collection } from 'firebase/firestore';
const appClient = vi.hoisted(() => ({ db: undefined as any, auth: { currentUser: null as any } }));
vi.mock('../../src/lib/firebase', () => ({ get db() { return appClient.db; }, auth: appClient.auth }));
import { parseOrdersExcelFile, executeOrdersImport } from '../../src/app/utils/importOrdersExcel';
import { updateReviewedImportRow, getSelectedImportRows } from '../../src/app/utils/importOrdersReview';
let env: RulesTestEnvironment;
const valid = { userId: 'owner', customerName: 'Ana', customerPhone: '11999999999', productName: 'Convites', quantity: 10, price: 100, status: 'pending', deliveryDate: '2026-10-20', customerId: null, notes: '', tags: null, payment: { status: 'partial', method: 'pix', totalAmount: 100, paidAmount: 30, remainingAmount: 70, history: null } };
const dbFor = (uid: string) => env.authenticatedContext(uid).firestore();
beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw Error('Use apenas o emulador local de Firestore.');
  env = await initializeTestEnvironment({ projectId:'demo-luisices-review', firestore:{rules:readFileSync('firestore.rules','utf8')} });
});
afterAll(async()=>{await env?.cleanup()});
beforeEach(async()=>{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c=>{
    for(const [uid,extra] of [['owner',{}],['other',{}],['blocked',{active:false}],['restricted',{permissions:{orders:{create:false},customers:{create:false}}}],['employee',{role:'funcionario',permissions:{orders:{create:false},customers:{create:false}}}],['admin',{role:'admin'}]] as [string,any][]) await c.firestore().doc(`userProfiles/${uid}`).set({role:'user',active:true,...extra});
    await c.firestore().doc('customers/own').set({userId:'owner',name:'Ana'});
    await c.firestore().doc('customers/foreign').set({userId:'other',name:'Outra conta'});
  });
});
describe('Importação: gravação direta não contorna validação do servidor',()=>{
  it('aceita o proprietário com dados válidos e referência ao próprio cliente',async()=>{
    await assertSucceeds(setDoc(doc(dbFor('owner'),'orders/valid'),{...valid,customerId:'own'}));
  });
  it.each(['restricted','employee','blocked'])('nega criação para conta %s sem permissão ou desativada',async uid=>{
    await assertFails(setDoc(doc(dbFor(uid),'orders/rejected'),{...valid,userId:uid}));
  });
  it('nega usuário anônimo e tentativa de gravar pedido de outra conta',async()=>{
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(),'orders/anonymous'),valid));
    await assertFails(setDoc(doc(dbFor('other'),'orders/foreign'),valid));
  });
  it.each(['foreign','missing'])('nega vínculo com cliente %s',async customerId=>{
    await assertFails(setDoc(doc(dbFor('owner'),'orders/customer'),{...valid,customerId}));
  });
  it.each(['customerName','productName','quantity','price','status','deliveryDate'])('nega campo obrigatório ausente: %s',async key=>{
    const data={...valid} as Record<string,unknown>;delete data[key];
    await assertFails(setDoc(doc(dbFor('owner'),'orders/missing'),data));
  });
  it.each([{customerName:'   '},{productName:''},{customerName:'a'.repeat(201)},{productName:'a'.repeat(301)},{quantity:1.5},{quantity:10001},{price:-1},{price:Infinity},{price:NaN},{price:1000001},{customerPhone:'1'.repeat(51)},{notes:'a'.repeat(1001)},{deliveryDate:'2026-02-30'},{deliveryDate:'2026-02-29'},{deliveryDate:'<script>'},{status:'invalid'},{tags:Array.from({length:21},()=>({name:'Tag',color:'#123456'}))},{tags:[{name:'Tag',color:'url(invalid)'}]},{tags:[{name:{nested:true},color:'#123456'}]},{tags:[{name:'   ',color:'#123456'}]}])('rejeita entrada adulterada: %j',async changes=>{
    await assertFails(setDoc(doc(dbFor('owner'),'orders/malformed'),{...valid,...changes}));
  });
  it.each([{paidAmount:101},{remainingAmount:0},{totalAmount:1},{status:'paid'},{status:'pending'},{method:'injected'}])('rejeita pagamento inconsistente: %j',async changes=>{
    await assertFails(setDoc(doc(dbFor('owner'),'orders/payment'),{...valid,payment:{...valid.payment,...changes}}));
  });
  it('aceita data bissexta real, pedidos históricos, preço zero e admin com dados válidos',async()=>{
    await assertSucceeds(setDoc(doc(dbFor('owner'),'orders/leap'),{...valid,deliveryDate:'2024-02-29'}));
    await assertSucceeds(setDoc(doc(dbFor('owner'),'orders/zero'),{...valid,price:0,payment:{status:'paid',totalAmount:0,paidAmount:0,remainingAmount:0}}));
    await assertSucceeds(setDoc(doc(dbFor('admin'),'orders/admin'),valid));
  });
  it.each([{quantity:1.5},{price:Infinity},{deliveryDate:'2026-02-30'},{customerId:'foreign'},{payment:{...valid.payment,paidAmount:101}},{tags:[{name:'Tag',color:'injected'}]}])('não permite contornar validação usando update: %j',async changes=>{
    const ref=doc(dbFor('owner'),'orders/update');
    await assertSucceeds(setDoc(ref,valid));await assertFails(updateDoc(ref,changes));
  });
  it('valida o fluxo completo: planilha, edição, seleção, cliente, pedido e ledger no servidor',async()=>{
    const XLSX=await import('xlsx');const workbook=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet([{Cliente:'Cliente selecionado',Produto:'Convite',Quantidade:2,Preço:100,Entrega:'2026-10-20'},{Cliente:'Cliente não selecionado',Produto:'Produto excluído',Quantidade:1,Preço:50,Entrega:'2026-10-20'}]),'Pedidos');
    const parsed=await parseOrdersExcelFile(XLSX.write(workbook,{type:'array',bookType:'xlsx'}));
    const edited=updateReviewedImportRow(parsed.allRows[0],{customerName:'Cliente revisado local',productName:'Convites revisados',price:180,quantity:12});
    appClient.db=dbFor('owner');appClient.auth.currentUser={uid:'owner',displayName:'Owner'};
    const result=await executeOrdersImport(getSelectedImportRows([edited,parsed.allRows[1]],new Set([2])),'owner');
    expect(result.successCount).toBe(1);expect(result.errorCount).toBe(0);expect(result.createdCustomerIds).toHaveLength(1);
    const order=(await getDoc(doc(appClient.db,'orders',result.createdOrderIds[0]))).data();
    expect(order).toMatchObject({userId:'owner',customerName:'Cliente revisado local',productName:'Convites revisados',price:180,quantity:12,payment:{totalAmount:180,paidAmount:0,remainingAmount:180}});
    const sale=(await getDoc(doc(appClient.db,'salesLedger',result.createdOrderIds[0]))).data();expect(sale?.userId).toBe('owner');expect(sale?.amount).toBe(180);
    const customers=await getDocs(query(collection(appClient.db,'customers'),where('userId','==','owner')));
    expect(customers.docs.some(document=>document.data().name==='Cliente não selecionado')).toBe(false);
  });
  it('protege o cadastro automático de clientes mesmo com gravação direta',async()=>{
    await assertFails(setDoc(doc(dbFor('restricted'),'customers/restricted'),{userId:'restricted',name:'Ana'}));
    await assertFails(setDoc(doc(dbFor('owner'),'customers/no-name'),{userId:'owner'}));
    await assertFails(setDoc(doc(dbFor('owner'),'customers/foreign'),{userId:'other',name:'Ana'}));
    await assertFails(setDoc(doc(dbFor('owner'),'customers/email'),{userId:'owner',name:'Ana',email:'invalid'}));
    await assertSucceeds(setDoc(doc(dbFor('owner'),'customers/valid'),{userId:'owner',name:'Ana',phone:'11999999999',email:'ana@example.test'}));
  });
});

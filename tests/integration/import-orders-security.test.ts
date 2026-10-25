import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, getDocs, query, where, collection } from 'firebase/firestore';
const appClient = vi.hoisted(() => ({ db: undefined as any, auth: { currentUser: null as any } }));
vi.mock('../../src/lib/firebase', () => ({ get db() { return appClient.db; }, auth: appClient.auth, functions: {} }));
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
    for(const [uid,extra] of [
      ['owner',{permissions:{orders:{create:true,view:true,edit:true,delete:true},customers:{create:true,view:true,edit:true,delete:true}}}],
      ['other',{}],
      ['blocked',{active:false}],
      ['restricted',{permissions:{orders:{create:false},customers:{create:false}}}],
      ['employee',{role:'funcionario',permissions:{orders:{create:false},customers:{create:false}}}],
      ['admin',{role:'admin'}],
    ] as [string,any][]) await c.firestore().doc(`userProfiles/${uid}`).set({role:'user',active:true,...extra});
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
  it('permite ao proprietário editar as 20 etiquetas sem alterar campos financeiros', async () => {
    const tags = Array.from({ length: 20 }, (_, index) => ({ name: `Etiqueta ${index}`, color: '#123456' }));
    const ref = doc(dbFor('owner'), 'orders/update-20-tags');
    await assertSucceeds(setDoc(ref, { ...valid, tags }));
    await assertSucceeds(updateDoc(ref, { tags: tags.map((tag) => ({ ...tag, name: `${tag.name} editada` })), version: 2 }));
    expect((await getDoc(ref)).data()?.tags).toEqual(tags.map((tag) => ({ ...tag, name: `${tag.name} editada` })));
  });
  it.each([['owner',0],['owner',1],['owner',5],['owner',20],['admin',20]])('aceita importação real de 11 pedidos para %s com %i etiquetas e centavos', async (uid,tagCount) => {
    appClient.db=dbFor(String(uid));appClient.auth.currentUser={uid:String(uid),displayName:'Owner'};
    const rows=Array.from({length:11},(_,i)=>updateReviewedImportRow({rowIndex:i+2,customerName:`Cliente ${i}`,customerPhone:String(1138+i),productName:'30 Vinil Hotwheels + 1 Folha Vinil Impresso 2cm',quantity:31,price:28.35,deliveryDate:'2026-10-11',status:'completed',paymentStatus:i%2?'partial':'paid',paidAmount:i%2?10.1:28.35,remainingAmount:0,paymentMethod:'pix',tags:Array.from({length:Number(tagCount)},(_,j)=>({name:`Etiqueta ${j}`,color:'#123456'})),isValid:true,errors:[],warnings:[],rawData:{}},{}));
    const result=await executeOrdersImport(rows as any,String(uid));
    expect(result.errors).toEqual([]);expect(result.successCount).toBe(11);
    const orderRef=doc(appClient.db,'orders',result.createdOrderIds[0]);
    await assertSucceeds(updateDoc(orderRef,{status:'pending',tags:rows[0].tags?.map(tag=>({...tag,name:'Etiqueta alterada'})),version:2}));
    await assertFails(updateDoc(orderRef,{price:30.5,payment:{status:'partial',totalAmount:30.5,paidAmount:10,remainingAmount:20.5,method:'pix'},version:2}));
  });
  it.each([
    { name: '', color: '#123456' }, { name: 'a'.repeat(81), color: '#123456' },
    { name: 1, color: '#123456' }, { name: [], color: '#123456' },
    { name: 'Tag', color: 123456 }, { name: 'Tag', color: '#123456', extra: true },
    { name: 'Tag' }, { color: '#123456' },
    { name: 'Tag\u0000:#123456', color: '#123456' }, { name: 'Tag', color: 'fake\u0000#123456' },
  ])('nega etiqueta adulterada na última posição: %j', async badTag => {
    const tags=Array.from({length:19},()=>({name:'Etiqueta válida',color:'#12345678'}));
    await assertFails(setDoc(doc(dbFor('owner'),'orders/bad-last'),{...valid,tags:[...tags,badTag]}));
  });
  it('nega perfil ausente e aceita nome de etiqueta no limite com pontuação e Unicode', async()=>{
    await assertFails(setDoc(doc(dbFor('missing-profile'),'orders/no-profile'),{...valid,userId:'missing-profile'}));
    await assertSucceeds(setDoc(doc(dbFor('owner'),'orders/tag-name'),{...valid,tags:[{name:'Á:#'+ 'x'.repeat(76)+'!',color:'#abcdef12'}]}));
  });
  it('protege o cadastro automático de clientes mesmo com gravação direta',async()=>{
    await assertFails(setDoc(doc(dbFor('restricted'),'customers/restricted'),{userId:'restricted',name:'Ana'}));
    await assertFails(setDoc(doc(dbFor('owner'),'customers/no-name'),{userId:'owner'}));
    await assertFails(setDoc(doc(dbFor('owner'),'customers/foreign'),{userId:'other',name:'Ana'}));
    await assertFails(setDoc(doc(dbFor('owner'),'customers/email'),{userId:'owner',name:'Ana',email:'invalid'}));
    await assertSucceeds(setDoc(doc(dbFor('owner'),'customers/valid'),{userId:'owner',name:'Ana',phone:'11999999999',email:'ana@example.test'}));
  });
});

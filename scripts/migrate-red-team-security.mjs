#!/usr/bin/env node
// Dry-run por padrão. Não deduz propriedade de conversas globais.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const admin = require('../functions/node_modules/firebase-admin');
const crypto = require('node:crypto');
const args = process.argv.slice(2);
const value = (name) => args[args.indexOf(name) + 1];
const projectId = args.includes('--project') ? value('--project') : '';
const ownerUid = args.includes('--owner') ? value('--owner') : '';
const bucketName = args.includes('--bucket') ? value('--bucket') : '';
const apply = args.includes('--apply');
const claimUnowned = args.includes('--claim-unowned');
const backupPath = args.includes('--backup') ? value('--backup') : '';
if (!projectId || !ownerUid || ownerUid.includes('/') || !bucketName || (apply && !backupPath)) {
  throw new Error('Use --project PROJETO --owner UID --bucket BUCKET. Para gravar: --apply --backup /caminho/backup.json; --claim-unowned somente após confirmar a propriedade do histórico sem userId.');
}
admin.initializeApp({ projectId, storageBucket: bucketName });
const db = admin.firestore();
const ownerSnap = await db.doc(`userProfiles/${ownerUid}`).get();
if (!ownerSnap.exists || ownerSnap.data().active === false || !['user', 'admin'].includes(ownerSnap.data().role)) throw new Error('Proprietário inválido.');
const [profiles, chats, messages, existingConfig] = await Promise.all([
  db.collection('userProfiles').get(), db.collection('whatsapp_chats').get(),
  db.collection('whatsapp_messages').get(), db.doc('integrationSettings/whatsapp').get(),
]);
if (existingConfig.exists && existingConfig.data().ownerUid !== ownerUid) throw new Error('Configuração pertence a outro proprietário; nenhuma gravação efetuada.');
const belongs = (uid) => uid === ownerUid || profiles.docs.some((p) => p.id === uid && p.data().role === 'funcionario' && p.data().createdBy === ownerUid);
const candidates = [];
let unowned = 0;
let conflicts = 0;
for (const snap of [...chats.docs, ...messages.docs]) {
  const data = snap.data();
  if (!data.userId) unowned++;
  else if (!belongs(data.userId)) conflicts++;
  const phone = String(data.phone || '').replace(/\D/g, '');
  if (!/^\d{10,15}$/.test(phone)) { conflicts++; continue; }
  const chatId = `${ownerUid}_${phone}`;
  const isChat = snap.ref.parent.id === 'whatsapp_chats';
  const id = isChat ? chatId : `${ownerUid}_wa_${crypto.createHash('sha256').update(String(data.evolutionMessageId || snap.id)).digest('hex')}`;
  const payload = { ...data, userId: ownerUid, ...(isChat ? { id: chatId } : { chatId }) };
  // Associação legada de cliente pode ter sido feita entre usuários; revalida antes de copiar.
  if (payload.customerId) {
    const customer = await db.doc(`customers/${payload.customerId}`).get();
    if (!customer.exists || customer.data().userId !== ownerUid) {
      payload.customerId = null;
      payload.customerName = phone;
    }
  }
  candidates.push({ source: snap.ref.path, destination: `${snap.ref.parent.id}/${id}`, data: payload });
}
const unique = new Map();
for (const candidate of candidates) {
  const previous = unique.get(candidate.destination);
  if (previous && (previous.data.text !== candidate.data.text || previous.data.phone !== candidate.data.phone)) conflicts++;
  else if (!previous) unique.set(candidate.destination, candidate);
}
// Não sobrescreve mensagens/conversas novas caso a migração seja repetida.
const copies = [];
for (const candidate of unique.values()) {
  if (candidate.source !== candidate.destination && !(await db.doc(candidate.destination).get()).exists) copies.push(candidate);
}
const [files] = await admin.storage().bucket().getFiles({ prefix: 'users/' });
const photos = files.filter((file) => /^users\/[^/]+\/customers\/[^/]+$/.test(file.name));
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', chats: chats.size, messages: messages.size, copies: copies.length, unowned, conflicts, photos: photos.length }, null, 2));
if (conflicts || (unowned && !claimUnowned)) throw new Error('Histórico ambíguo: revisão obrigatória. Nenhuma gravação efetuada.');
if (!apply) process.exit(0);
const photoMetadata = [];
for (const file of photos) {
  const [metadata] = await file.getMetadata();
  photoMetadata.push({ name: file.name, metadata });
}
// Preserva tipos Firestore em backup. Falha se o arquivo já existir.
fs.writeFileSync(backupPath, JSON.stringify({
  projectId, ownerUid, config: existingConfig.exists ? existingConfig.data() : null,
  documents: [...chats.docs, ...messages.docs].map((snap) => ({ path: snap.ref.path, fields: snap._fieldsProto })),
  photos: photoMetadata,
}, null, 2), { flag: 'wx', mode: 0o600 });
for (const candidate of copies) await db.doc(candidate.destination).create(candidate.data);
for (const file of photos) await file.setMetadata({ cacheControl: 'private, no-store, max-age=0', metadata: { firebaseStorageDownloadTokens: null } });
await db.doc('integrationSettings/whatsapp').set({ ownerUid, enabled: true });
console.log('Migração concluída. Originais preservados; bloqueie o CDN e publique regras, índices, funções e frontend em conjunto.');

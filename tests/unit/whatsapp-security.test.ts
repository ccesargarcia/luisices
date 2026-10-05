import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const realRequire = createRequire(import.meta.url);
class HttpsError extends Error { constructor(public code: string, message: string) { super(message); } }
let store: Record<string, any>;
let writes: any[];
let secret: any;
const fetchMock = vi.fn();
const snapshot = (path: string) => ({ id: path.split('/').at(-1), exists: !!store[path], data: () => store[path] });
const doc = (path: string) => ({
  get: async () => snapshot(path),
  delete: async () => { writes.push(['delete', path]); delete store[path]; },
  set: async (data: any) => { writes.push(['set', path, data]); store[path] = data; },
});
const db = {
  doc,
  runTransaction: async (callback: any) => callback({ get: (ref: any) => ref.get(), set: (ref: any, data: any) => ref.set(data) }),
  collection: (name: string) => {
    const filters: any[] = [];
    const q: any = {
      doc: (id: string) => doc(`${name}/${id}`),
      where: (field: string, _: string, value: any) => { filters.push([field, value]); return q; },
      orderBy: () => q, limit: () => q, startAfter: () => q,
      add: async (data: any) => { writes.push(['add', name, data]); },
      get: async () => {
        const docs = Object.entries(store).filter(([path, data]) => path.startsWith(`${name}/`) && filters.every(([f, v]) => data[f] === v)).map(([path]) => snapshot(path));
        return { docs, empty: docs.length === 0 };
      },
    };
    return q;
  },
};
const firestore: any = () => db;
firestore.FieldValue = { serverTimestamp: () => 'now', increment: (n: number) => n };
const savePhoto = vi.fn();
const admin = { firestore, storage: () => ({ bucket: () => ({ name: 'private.test', file: (path: string) => ({ save: (bytes: any, options: any) => savePhoto(path, bytes, options) }) }) }) };
function load(file: string, extra: Record<string, any> = {}) {
  const module = { exports: {} as any };
  runInNewContext(readFileSync(new URL(`../../functions/${file}`, import.meta.url), 'utf8'), {
    module, exports: module.exports, Buffer, process: { env: {} }, console,
    AbortController, setTimeout, clearTimeout, fetch: fetchMock,
    require: (name: string) => {
      if (name in extra) return extra[name];
      if (name === 'firebase-admin') return admin;
      if (name === 'firebase-functions') return { https: { HttpsError } };
      if (name === 'firebase-functions/v2/https') return { HttpsError, onCall: (_: any, handler: any) => handler, onRequest: (_: any, handler: any) => handler };
      if (name === '../common/helpers') return { EVOLUTION_INSTANCE: 'homeassistant', EVOLUTION_API_URL: 'https://wa.test', normalizeWhatsAppNumber: (v: string) => { const n = String(v).replace(/\D/g, ''); return n.startsWith('55') ? n : `55${n}`; } };
      if (name === '../common/secrets') return { EVOLUTION_API_KEY: { value: () => { if (secret instanceof Error) throw secret; return secret; } }, ORIGIN_SECRET: {} };
      if (name === '../originProtection') return { validateOriginSecret: () => ({ allowed: true }) };
      return realRequire(name);
    },
  });
  return module.exports;
}
const security = load('whatsapp/security.js');
const handlers = load('whatsapp/index.js', { './security': security });
const media = load('customerMedia.js');
const request = (uid: string, data: any = {}) => ({ auth: { uid }, data });
function response() {
  const res: any = { code: 200, body: null };
  res.status = (code: number) => { res.code = code; return res; };
  res.json = res.send = (body: any) => { res.body = body; return res; };
  return res;
}
beforeEach(() => {
  store = {
    'integrationSettings/whatsapp': { enabled: true, ownerUid: 'owner' },
    'userProfiles/owner': { role: 'user', active: true },
    'userProfiles/other': { role: 'user', active: true },
    'userProfiles/employee': { role: 'funcionario', active: true, createdBy: 'owner', permissions: { whatsapp: true } },
    'userProfiles/foreign-employee': { role: 'funcionario', active: true, createdBy: 'other', permissions: { whatsapp: true } },
  };
  writes = []; secret = 'correct-secret'; fetchMock.mockReset(); savePhoto.mockReset();
});

describe('Fotos de clientes: upload privado no backend', () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString('base64');
  it('nega upload para outro proprietário, conta sem perfil e cliente ausente', async () => {
    store['customers/c1'] = { userId: 'owner' };
    for (const uid of ['other', 'missing']) {
      await expect(media.uploadPrivateCustomerPhoto(request(uid, { customerId: 'c1', imageBase64: png }))).rejects.toMatchObject({ code: 'permission-denied' });
    }
    await expect(media.uploadPrivateCustomerPhoto(request('owner', { customerId: 'absent', imageBase64: png }))).rejects.toMatchObject({ code: 'permission-denied' });
    expect(savePhoto).not.toHaveBeenCalled();
  });
  it('salva sem token público, com cache privado e referência gs://', async () => {
    store['customers/c1'] = { userId: 'owner' };
    const result = await media.uploadPrivateCustomerPhoto(request('owner', { customerId: 'c1', imageBase64: png }));
    expect(result.photoUrl).toMatch(/^gs:\/\/private\.test\/users\/owner\/customers\/.+\.png$/);
    expect(savePhoto.mock.calls[0][2].metadata).toEqual({ contentType: 'image/png', cacheControl: 'private, no-store, max-age=0' });
  });
  it('rejeita HTML/SVG e base64 inválido mesmo quando o cliente declara imagem', async () => {
    store['customers/c1'] = { userId: 'owner' };
    for (const imageBase64 of ['<html>', Buffer.from('<svg onload="alert(1)"></svg>').toString('base64')]) {
      await expect(media.uploadPrivateCustomerPhoto(request('owner', { customerId: 'c1', imageBase64 }))).rejects.toMatchObject({ code: 'invalid-argument' });
    }
    expect(savePhoto).not.toHaveBeenCalled();
  });
});
describe('WhatsApp: autorização e isolamento no backend', () => {
  it('normaliza DDD 55 sem confundi-lo com código de país', () => {
    expect(security.normalizeWhatsAppNumber('(55) 99999-9999')).toBe('5555999999999');
    expect(security.normalizeWhatsAppNumber('+55 (55) 99999-9999')).toBe('5555999999999');
    expect(security.normalizeWhatsAppNumber('')).toBe('');
  });
  it('aceita proprietário e funcionário vinculado, rejeita outro usuário, vínculo externo e perfil ausente', async () => {
    expect((await security.getScope(request('owner'))).ownerUid).toBe('owner');
    expect((await security.getScope(request('employee'))).ownerUid).toBe('owner');
    for (const uid of ['other', 'foreign-employee', 'missing']) await expect(security.getScope(request(uid))).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('não usa caller.uid como proprietário de mensagens enviadas por funcionário', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ key: { id: 'new' } }) });
    await handlers.sendWhatsAppDirectMessage(request('employee', { phone: '11999999999', text: 'Olá' }));
    expect(writes.find(([operation, path]) => operation === 'set' && path.startsWith('whatsapp_messages/'))[2]).toMatchObject({ userId: 'owner', sentByUid: 'employee', chatId: 'owner_5511999999999' });
  });
  it('nega exclusão de mensagem de outro proprietário antes de chamar Evolution API', async () => {
    store['whatsapp_messages/foreign'] = { userId: 'other', evolutionMessageId: 'e1', phone: '5511999999999' };
    await expect(handlers.deleteWhatsAppMessage(request('owner', { messageDocId: 'foreign' }))).rejects.toMatchObject({ code: 'permission-denied' });
    expect(writes).toEqual([]); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('preserva exclusão por ID Evolution resolvendo o documento no escopo, sem confiar no telefone recebido', async () => {
    const id = security.messageIdFor('owner', 'e1');
    store[`whatsapp_messages/${id}`] = { userId: 'owner', evolutionMessageId: 'e1', phone: '5511999999999', chatId: 'owner_5511999999999' };
    fetchMock.mockResolvedValue({ ok: true });
    await handlers.deleteWhatsAppMessage(request('employee', { evolutionMessageId: 'e1', phone: '5511888888888' }));
    expect(writes).toContainEqual(['delete', `whatsapp_messages/${id}`]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).remoteJid).toBe('5511999999999@s.whatsapp.net');
  });
  it('busca somente clientes do proprietário e compara telefone normalizado completo', async () => {
    store['customers/foreign'] = { userId: 'other', phone: '11999999999', name: 'Segredo' };
    store['customers/short'] = { userId: 'owner', phone: '999999999', name: 'Sufixo' };
    store['customers/own'] = { userId: 'owner', phone: '(11) 99999-9999', name: 'Cliente' };
    expect(await security.findCustomer('owner', '5511999999999')).toMatchObject({ customerId: 'own', customerName: 'Cliente' });
  });
  it.each(['', undefined, new Error('Secret Manager indisponível')])('rejeita segredo vazio ou erro de resolução (%s)', async (value) => {
    secret = value;
    const res = response();
    await handlers.evolutionWhatsAppWebhook({ method: 'POST', headers: {}, body: {} }, res);
    expect(res.code).toBe(503); expect(writes).toEqual([]);
  });
  it('não aceita token na URL nem arrays de headers', async () => {
    for (const req of [{ headers: {}, query: { token: secret } }, { headers: { apikey: [secret] } }]) {
      const res = response();
      await handlers.evolutionWhatsAppWebhook({ method: 'POST', body: {}, ...req }, res);
      expect(res.code).toBe(401);
    }
  });
  it('grava webhook válido com proprietário, identificadores isolados e deduplicação', async () => {
    const req = { method: 'POST', headers: { apikey: secret }, body: { instance: 'homeassistant', event: 'messages.upsert', data: { key: { id: 'e1', remoteJid: '5511999999999@s.whatsapp.net' }, message: { conversation: 'Olá' } } } };
    for (let i = 0; i < 2; i++) {
      const res = response(); await handlers.evolutionWhatsAppWebhook(req, res); expect(res.code).toBe(200);
    }
    const messages = Object.entries(store).filter(([key]) => key.startsWith('whatsapp_messages/'));
    expect(messages).toHaveLength(1);
    expect(writes.filter(([, path]) => path.startsWith('whatsapp_chats/'))).toHaveLength(1);
    expect(messages[0][1]).toMatchObject({ userId: 'owner', chatId: 'owner_5511999999999' });
  });
  it('nega configuração ausente e instância inesperada', async () => {
    const res = response();
    await handlers.evolutionWhatsAppWebhook({ method: 'POST', headers: { apikey: secret }, body: { instance: 'foreign' } }, res);
    expect(res.code).toBe(400); expect(writes).toEqual([]);
    delete store['integrationSettings/whatsapp'];
    await expect(security.getScope(request('owner'))).rejects.toMatchObject({ code: 'failed-precondition' });
  });
});

/** Cache local, privado por usuário, para corpos completos de e-mails recebidos. */
export interface ReceivedEmailBody {
  html: string;
  text: string;
  htmlLoading: boolean;
  htmlUnavailable: boolean;
  textUnavailable: boolean;
  htmlErrorCode: string | null;
  textErrorCode: string | null;
}

interface CacheEntry {
  key: string;
  uid: string;
  emailId: string;
  pathKey: string;
  iv: number[];
  ciphertext: ArrayBuffer;
  updatedAt: number;
  size: number;
}

const DB_NAME = 'luisices-private-email-cache';
const STORE_NAME = 'received-bodies';
const KEY_STORE_NAME = 'encryption-keys';
const DB_VERSION = 1;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 8;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const MAX_ENTRY_BYTES = 15 * 1024 * 1024;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB indisponível'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('uid', 'uid', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
        db.createObjectStore(KEY_STORE_NAME, { keyPath: 'uid' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falha ao abrir cache local'));
  });
}

async function getEncryptionKey(db: IDBDatabase, uid: string): Promise<CryptoKey> {
  const readKey = () => new Promise<CryptoKey | undefined>((resolve, reject) => {
    const request = db.transaction(KEY_STORE_NAME, 'readonly').objectStore(KEY_STORE_NAME).get(uid);
    request.onsuccess = () => resolve((request.result as { key: CryptoKey } | undefined)?.key);
    request.onerror = () => reject(request.error);
  });
  const existing = await readKey();
  if (existing) return existing;

  const candidate = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return new Promise<CryptoKey>((resolve, reject) => {
    const tx = db.transaction(KEY_STORE_NAME, 'readwrite');
    const store = tx.objectStore(KEY_STORE_NAME);
    const request = store.get(uid);
    let selectedKey: CryptoKey = candidate;
    request.onsuccess = () => {
      if (request.result) selectedKey = (request.result as { key: CryptoKey }).key;
      else store.add({ uid, key: candidate });
    };
    tx.oncomplete = () => resolve(selectedKey);
    tx.onerror = () => reject(tx.error || new Error('Falha ao preparar chave de cache'));
    tx.onabort = () => reject(tx.error || new Error('Falha ao preparar chave de cache'));
  });
}

async function encryptBody(
  db: IDBDatabase,
  uid: string,
  body: Pick<ReceivedEmailBody, 'html' | 'text'>,
): Promise<{ iv: number[]; ciphertext: ArrayBuffer }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(body));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await getEncryptionKey(db, uid), plaintext);
  return { iv: Array.from(iv), ciphertext };
}

async function decryptBody(db: IDBDatabase, entry: CacheEntry): Promise<{ html: string; text: string }> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(entry.iv) },
    await getEncryptionKey(db, entry.uid),
    entry.ciphertext,
  );
  const body = JSON.parse(new TextDecoder().decode(plaintext)) as { html?: unknown; text?: unknown };
  if (typeof body.html !== 'string' || typeof body.text !== 'string') throw new Error('Cache inválido');
  return { html: body.html, text: body.text };
}

function makeKey(uid: string, emailId: string, paths: { html?: string; text?: string }): { key: string; pathKey: string } {
  const pathKey = JSON.stringify([paths.html || '', paths.text || '']);
  return { key: JSON.stringify([uid, emailId, pathKey]), pathKey };
}

function toResult(body: { html: string; text: string }): ReceivedEmailBody {
  return {
    ...body,
    htmlLoading: false,
    htmlUnavailable: false,
    textUnavailable: false,
    htmlErrorCode: null,
    textErrorCode: null,
  };
}

export async function getCachedReceivedEmailBody(
  uid: string,
  emailId: string,
  paths: { html?: string; text?: string },
): Promise<ReceivedEmailBody | null> {
  try {
    const { key } = makeKey(uid, emailId, paths);
    const db = await openDatabase();
    try {
      const entry = await new Promise<CacheEntry | undefined>((resolve, reject) => {
        const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
        request.onsuccess = () => resolve(request.result as CacheEntry | undefined);
        request.onerror = () => reject(request.error);
      });
      if (!entry) return null;
      if (Date.now() - entry.updatedAt > TTL_MS) {
        await deleteEntry(db, key);
        return null;
      }
      try {
        return toResult(await decryptBody(db, entry));
      } catch {
        await deleteEntry(db, key);
        return null;
      }
    } finally {
      db.close();
    }
  } catch {
    // Cache local é otimização; indisponibilidade nunca impede a leitura remota.
    return null;
  }
}

async function deleteEntry(db: IDBDatabase, key: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function cacheReceivedEmailBody(
  uid: string,
  emailId: string,
  paths: { html?: string; text?: string },
  body: ReceivedEmailBody,
): Promise<void> {
  if (!uid || !emailId || body.htmlUnavailable || body.textUnavailable || body.htmlLoading) return;
  const { key, pathKey } = makeKey(uid, emailId, paths);
  const estimatedSize = (body.html.length + body.text.length) * 3;
  if (estimatedSize > MAX_ENTRY_BYTES || (!body.html && !body.text)) return;

  try {
    const db = await openDatabase();
    try {
      const encrypted = await encryptBody(db, uid, { html: body.html, text: body.text });
      const size = encrypted.ciphertext.byteLength + encrypted.iv.length;
      if (size > MAX_ENTRY_BYTES) return;
      const entries = await new Promise<CacheEntry[]>((resolve, reject) => {
        const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve((request.result as CacheEntry[]) || []);
        request.onerror = () => reject(request.error);
      });
      const now = Date.now();
      const retained = entries.filter(entry => entry.key !== key && now - entry.updatedAt <= TTL_MS)
        .sort((a, b) => b.updatedAt - a.updatedAt);
      let totalBytes = size;
      const keep: CacheEntry[] = [];
      for (const entry of retained) {
        if (keep.length >= MAX_ENTRIES - 1 || totalBytes + entry.size > MAX_TOTAL_BYTES) continue;
        keep.push(entry);
        totalBytes += entry.size;
      }
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      keep.forEach(entry => store.put(entry));
      store.put({
        key, uid, emailId, pathKey, ...encrypted, updatedAt: now, size,
      } satisfies CacheEntry);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Falha ao gravar cache local'));
      });
    } finally {
      db.close();
    }
  } catch {
    // Quota, modo privado e políticas do navegador não podem quebrar a leitura.
  }
}

/** Remove dados de contas anteriores; mantém o cache da conta autenticada. */
export async function retainOnlyUserEmailCache(uid: string | null): Promise<void> {
  try {
    const db = await openDatabase();
    try {
      const entries = await new Promise<CacheEntry[]>((resolve, reject) => {
        const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve((request.result as CacheEntry[]) || []);
        request.onerror = () => reject(request.error);
      });
      const keys = await new Promise<Array<{ uid: string; key: CryptoKey }>>((resolve, reject) => {
        const request = db.transaction(KEY_STORE_NAME, 'readonly').objectStore(KEY_STORE_NAME).getAll();
        request.onsuccess = () => resolve((request.result as Array<{ uid: string; key: CryptoKey }>) || []);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      entries.filter(entry => !uid || entry.uid !== uid || Date.now() - entry.updatedAt > TTL_MS)
        .forEach(entry => store.delete(entry.key));
      const keysStore = tx.objectStore(KEY_STORE_NAME);
      keys.filter(entry => !uid || entry.uid !== uid).forEach(entry => keysStore.delete(entry.uid));
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Falha ao limpar cache local'));
      });
    } finally {
      db.close();
    }
  } catch {
    // A limpeza é best effort; o cache segue isolado pela chave de usuário.
  }
}

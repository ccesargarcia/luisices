/**
 * Subsistema de Cache Bounded LRU & Deduplicação Concorrente (Single-Flight) - Luisices
 */

const crypto = require('crypto');
const { CACHE_CONFIG } = require('./config');

class AiResponseCache {
  constructor(options = {}) {
    this.ttlMs = options.ttlMs || CACHE_CONFIG.DEFAULT_TTL_MS;
    this.maxEntries = options.maxEntries || CACHE_CONFIG.MAX_ENTRIES;
    this.store = new Map(); // key -> { value, expiresAt, sizeBytes }
    this.inFlightRequests = new Map(); // key -> Promise
    this.totalSizeBytes = 0;
  }

  /**
   * Gera uma chave determinística e isolada por escopo
   */
  buildKey({ userId, action, prompt = '', model = '', schemaVersion = 'v1', extraKey = '' }) {
    const raw = `${userId || 'anon'}:${action || 'chat'}:${model}:${schemaVersion}:${extraKey}:${prompt.trim()}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Obtém item do cache se ainda válido
   */
  get(key) {
    if (!key) return null;
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    // Reordena Map para manter semântica LRU
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  /**
   * Salva resposta completa no cache com eviction LRU
   */
  set(key, value, customTtlMs) {
    if (!key || !value) return;

    // Não cacheia erros ou respostas truncadas
    if (value.error || value.isTruncated || value.noCache) return;

    const ttl = customTtlMs || this.ttlMs;
    const expiresAt = Date.now() + ttl;

    let sizeBytes = 500;
    try {
      sizeBytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
    } catch {
      // Ignora erro de serialização de tamanho
    }

    if (this.store.has(key)) {
      const old = this.store.get(key);
      this.totalSizeBytes -= old.sizeBytes || 0;
      this.store.delete(key);
    }

    // Eviction LRU se exceder tamanho máximo
    while (this.store.size >= this.maxEntries || (this.totalSizeBytes + sizeBytes > CACHE_CONFIG.MAX_MEMORY_BYTES && this.store.size > 0)) {
      const oldestKey = this.store.keys().next().value;
      if (!oldestKey) break;
      this.delete(oldestKey);
    }

    this.store.set(key, { value, expiresAt, sizeBytes });
    this.totalSizeBytes += sizeBytes;
  }

  delete(key) {
    if (!key) return;
    const entry = this.store.get(key);
    if (entry) {
      this.totalSizeBytes -= entry.sizeBytes || 0;
      this.store.delete(key);
    }
  }

  clear() {
    this.store.clear();
    this.inFlightRequests.clear();
    this.totalSizeBytes = 0;
  }

  /**
   * Deduplica chamadas concorrentes idênticas (Single-Flight)
   */
  async coalesce(key, executeFn) {
    if (!key) return executeFn();

    // 1. Checa cache existente
    const cached = this.get(key);
    if (cached) {
      return { result: cached, cacheHit: true };
    }

    // 2. Se já existe uma promise em andamento para esta chave, reutiliza
    if (this.inFlightRequests.has(key)) {
      const result = await this.inFlightRequests.get(key);
      return { result, cacheHit: true };
    }

    // 3. Executa e remove da lista de in-flight ao finalizar
    const promise = (async () => {
      try {
        const result = await executeFn();
        if (result && !result.noCache) {
          this.set(key, result);
        }
        return result;
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, promise);
    const result = await promise;
    return { result, cacheHit: false };
  }
}

const globalAiCache = new AiResponseCache();

module.exports = {
  AiResponseCache,
  globalAiCache,
};

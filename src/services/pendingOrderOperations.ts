import { secureRandomId } from '../app/utils/random';

export interface PendingOrderOperation<T> {
  id: string;
  payload: T;
}

const memory = new Map<string, PendingOrderOperation<unknown>>();
const storageKey = (uid: string, scope: string) => `luisices:pending-order:v1:${encodeURIComponent(uid)}:${encodeURIComponent(scope)}`;

/** Keep the exact command, including dates, until the server confirms it.
 * No expiry: expiring an unknown result can create a second order on retry.
 * Session storage supports reload; memory also protects retries if storage is unavailable.
 */
export function loadPendingOrderOperation<T>(uid: string, scope: string): PendingOrderOperation<T> | null {
  const key = storageKey(uid, scope);
  try {
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(parsed.id) && parsed.payload) {
        memory.set(key, parsed);
      }
    }
  } catch { /* Storage may be unavailable; retain the in-memory command. */ }
  return (memory.get(key) as PendingOrderOperation<T>) || null;
}

const SENSITIVE_STORAGE_KEYS = new Set([
  'birthDate',
  'birthday',
  'birthdayCustomer',
  'cpf',
  'cnpj',
  'document',
  'password',
  'token',
]);

function stripSensitiveForSessionStorage(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripSensitiveForSessionStorage);
  }
  if (value && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_STORAGE_KEYS.has(k)) continue;
      sanitized[k] = stripSensitiveForSessionStorage(v);
    }
    return sanitized;
  }
  return value;
}

export function savePendingOrderOperation<T>(uid: string, scope: string, payload: T, id = secureRandomId(20)): PendingOrderOperation<T> {
  const operation = JSON.parse(JSON.stringify({ id, payload })) as PendingOrderOperation<T>;
  const key = storageKey(uid, scope);
  memory.set(key, operation);
  try {
    const storageSafe = stripSensitiveForSessionStorage(operation);
    sessionStorage.setItem(key, JSON.stringify(storageSafe));
  } catch { /* Memory remains usable. */ }
  return operation;
}

export function clearPendingOrderOperation(uid: string, scope: string): void {
  const key = storageKey(uid, scope);
  memory.delete(key);
  try { sessionStorage.removeItem(key); } catch { /* Memory was cleared. */ }
}

export function isDefinitiveOrderRejection(error: any): boolean {
  return ['invalid-argument', 'permission-denied', 'unauthenticated', 'not-found', 'failed-precondition', 'already-exists']
    .includes(String(error?.code || '').replace(/^functions\//, ''));
}

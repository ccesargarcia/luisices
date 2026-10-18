const LATEST_KEY_ID = 'mcp_latest_key_id';
const LATEST_RAW_KEY = 'mcp_latest_raw_key';
const KEY_PREFIX = 'mcp_raw_key_';
const FULL_API_KEY = /^lui_(?:dev|live)_[a-f0-9]{48}$/;

export function normalizeMcpRawKey(value: string): string | null {
  const normalized = value.trim().replace(/^Bearer\s+/i, '');
  return FULL_API_KEY.test(normalized) ? normalized : null;
}

/** Keep one-time API credentials only for the lifetime of the current tab. */
export function getMcpRawKey(keyId: string): string | null {
  const rawKey = sessionStorage.getItem(`${KEY_PREFIX}${keyId}`);
  return rawKey ? normalizeMcpRawKey(rawKey) : null;
}

export function saveMcpRawKey(keyId: string, rawKey: string): void {
  sessionStorage.setItem(`${KEY_PREFIX}${keyId}`, rawKey);
  sessionStorage.setItem(LATEST_RAW_KEY, rawKey);
  sessionStorage.setItem(LATEST_KEY_ID, keyId);
}

export function removeMcpRawKey(keyId: string): void {
  sessionStorage.removeItem(`${KEY_PREFIX}${keyId}`);
  if (sessionStorage.getItem(LATEST_KEY_ID) === keyId) {
    sessionStorage.removeItem(LATEST_KEY_ID);
    sessionStorage.removeItem(LATEST_RAW_KEY);
  }
  // Remove credentials persisted by older versions of the docs UI.
  localStorage.removeItem(`${KEY_PREFIX}${keyId}`);
  if (localStorage.getItem(LATEST_KEY_ID) === keyId) {
    localStorage.removeItem(LATEST_KEY_ID);
    localStorage.removeItem(LATEST_RAW_KEY);
  }
}

export function migrateLegacyMcpRawKeys(): void {
  const legacyValues: Array<[string, string]> = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(KEY_PREFIX) || key === LATEST_RAW_KEY || key === LATEST_KEY_ID) {
      const value = localStorage.getItem(key);
      if (value !== null) legacyValues.push([key, value]);
    }
  }

  legacyValues.forEach(([key, value]) => {
    if (key === LATEST_KEY_ID) {
      sessionStorage.setItem(key, value);
    } else if (key.startsWith(KEY_PREFIX)) {
      const normalizedKey = normalizeMcpRawKey(value);
      if (normalizedKey) sessionStorage.setItem(key, normalizedKey);
    } else if (key === LATEST_RAW_KEY) {
      const normalizedKey = normalizeMcpRawKey(value);
      if (normalizedKey) sessionStorage.setItem(key, normalizedKey);
    }
    localStorage.removeItem(key);
  });
}

export function clearMcpRawKeys(): void {
  migrateLegacyMcpRawKeys();
  const keysToRemove: string[] = [];
  for (let index = 0; index < sessionStorage.length; index += 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith(KEY_PREFIX) || key === LATEST_RAW_KEY || key === LATEST_KEY_ID) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => sessionStorage.removeItem(key));
}

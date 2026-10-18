const LATEST_KEY_ID = 'mcp_latest_key_id';
const LATEST_RAW_KEY = 'mcp_latest_raw_key';
const KEY_PREFIX = 'mcp_raw_key_';

/** Keep one-time API credentials only for the lifetime of the current tab. */
export function getMcpRawKey(keyId: string): string | null {
  return sessionStorage.getItem(`${KEY_PREFIX}${keyId}`);
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

export function clearLegacyMcpRawKeys(): void {
  const keysToRemove: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(KEY_PREFIX) || key === LATEST_RAW_KEY || key === LATEST_KEY_ID) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

export function clearMcpRawKeys(): void {
  clearLegacyMcpRawKeys();
  const keysToRemove: string[] = [];
  for (let index = 0; index < sessionStorage.length; index += 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith(KEY_PREFIX) || key === LATEST_RAW_KEY || key === LATEST_KEY_ID) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => sessionStorage.removeItem(key));
}

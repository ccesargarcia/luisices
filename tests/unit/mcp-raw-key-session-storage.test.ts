// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearMcpRawKeys,
  getMcpRawKey,
  migrateLegacyMcpRawKeys,
  normalizeMcpRawKey,
  removeMcpRawKey,
  saveMcpRawKey,
} from '../../src/app/utils/mcpRawKeySessionStorage';

const keyId = 'key-1';
const rawKey = `lui_dev_${'a'.repeat(48)}`;

afterEach(() => {
  clearMcpRawKeys();
});

describe('MCP raw key session storage', () => {
  it('accepts only complete keys and normalizes an optional Bearer prefix', () => {
    expect(normalizeMcpRawKey(rawKey)).toBe(rawKey);
    expect(normalizeMcpRawKey(`Bearer ${rawKey}`)).toBe(rawKey);
    expect(normalizeMcpRawKey('lui_dev_abcdef...')).toBeNull();
    expect(normalizeMcpRawKey(`lui_dev_${'g'.repeat(48)}`)).toBeNull();
  });

  it('migrates a complete legacy key from localStorage to this tab', () => {
    localStorage.setItem(`mcp_raw_key_${keyId}`, rawKey);
    localStorage.setItem('mcp_latest_key_id', keyId);
    localStorage.setItem('mcp_latest_raw_key', rawKey);

    migrateLegacyMcpRawKeys();

    expect(getMcpRawKey(keyId)).toBe(rawKey);
    expect(sessionStorage.getItem('mcp_latest_key_id')).toBe(keyId);
    expect(localStorage.getItem(`mcp_raw_key_${keyId}`)).toBeNull();
  });

  it('removes a key when revoked and clears session credentials on logout', () => {
    saveMcpRawKey(keyId, rawKey);
    removeMcpRawKey(keyId);
    expect(getMcpRawKey(keyId)).toBeNull();

    saveMcpRawKey(keyId, rawKey);
    clearMcpRawKeys();
    expect(getMcpRawKey(keyId)).toBeNull();
  });
});

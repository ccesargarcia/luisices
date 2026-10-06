import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertPermissionDenied } from '../helpers/assertPermissionDenied';

const denial = '[test] @firebase/firestore: Firestore: Code: 7 Message: 7 PERMISSION_DENIED';
const permissionError = Object.assign(new Error('Access denied'), { code: 'permission-denied' });

afterEach(() => vi.restoreAllMocks());

describe('Expected security denials in integration logs', () => {
  it('omits Firebase denial warnings and errors only after the assertion succeeds', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await assertPermissionDenied(async () => {
      console.warn(denial);
      console.error(denial);
      throw permissionError;
    });
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(console.warn).toBe(warn);
    expect(console.error).toBe(error);
  });

  it('keeps unrelated warnings and unexpected Firebase errors visible', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await assertPermissionDenied(async () => {
      console.warn('Another service: PERMISSION_DENIED');
      console.warn('@firebase/firestore: UNAVAILABLE');
      console.warn(denial);
      throw permissionError;
    });
    expect(warn.mock.calls).toEqual([
      ['Another service: PERMISSION_DENIED'],
      ['@firebase/firestore: UNAVAILABLE'],
    ]);
  });

  it('fails and replays diagnostics if a forbidden operation succeeds', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(assertPermissionDenied(async () => {
      console.warn(denial);
    })).rejects.toThrow('Expected request to fail, but it succeeded');
    expect(warn).toHaveBeenCalledWith(denial);
    expect(console.warn).toBe(warn);
  });

  it('fails and replays diagnostics for an unexpected rejection', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(assertPermissionDenied(async () => {
      console.warn(denial);
      throw Object.assign(new Error('Connection lost'), { code: 'unavailable' });
    })).rejects.toThrow('Expected PERMISSION_DENIED but got unexpected error');
    expect(warn).toHaveBeenCalledWith(denial);
    expect(console.warn).toBe(warn);
  });

  it('restores console handlers when starting the operation throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(assertPermissionDenied(() => {
      throw new Error('Invalid setup');
    })).rejects.toThrow('Invalid setup');
    expect(console.error).toBe(error);
  });
});

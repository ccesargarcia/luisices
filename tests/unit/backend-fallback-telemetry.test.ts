import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  writes: [] as Array<{ data: Record<string, unknown> }>,
  runTransaction: vi.fn(),
}));

vi.mock('../../src/lib/firebase', () => ({ db: {} }));
vi.mock('../../src/app/utils/betaHost', () => ({ isVercelBetaHost: () => true }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((...path: unknown[]) => path),
  onSnapshot: vi.fn(),
  runTransaction: (...args: unknown[]) => firestoreMocks.runTransaction(...args),
  setDoc: vi.fn(),
}));

import { executeWithGcpFallback, VercelInfraError } from '../../src/services/backendRoutingService';

describe('telemetria de fallback Beta → GCP', () => {
  beforeEach(() => {
    firestoreMocks.writes.length = 0;
    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
      const transaction = {
        get: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
        set: vi.fn((_ref, data) => firestoreMocks.writes.push({ data })),
      };
      return callback(transaction);
    });
  });

  it('preserva resumos Beta e GCP sem gravar mensagens ou payloads', async () => {
    const gcpError = Object.assign(new Error('sensitive-data-sentinel-47'), {
      code: 'functions/unavailable',
    });
    await expect(executeWithGcpFallback(
      'usersAdmin',
      () => Promise.reject(new VercelInfraError('resposta Beta', 502)),
      () => Promise.reject(gcpError),
      'createUser',
    )).rejects.toBe(gcpError);

    const event = (firestoreMocks.writes[0]?.data.events as Array<Record<string, unknown>>)?.[0];
    expect(event).toMatchObject({
      routeKey: 'usersAdmin',
      operation: 'createUser',
      recoveredViaGcp: false,
      status: 502,
      vercelError: { name: 'VercelInfraError', status: 502 },
      gcpError: { name: 'Error', code: 'functions/unavailable' },
    });
    expect(JSON.stringify(event)).not.toContain('sensitive-data-sentinel-47');
    expect(event.durationMs).toEqual(expect.any(Number));
  });

  it('registra somente a falha Beta quando o fallback GCP recupera a operação', async () => {
    await expect(executeWithGcpFallback(
      'orderTrackingAdmin',
      () => Promise.reject(new VercelInfraError('timeout', 504)),
      () => Promise.resolve({ success: true }),
      'calculateSuperfreteShipping',
    )).resolves.toEqual({ success: true });

    const event = (firestoreMocks.writes[0]?.data.events as Array<Record<string, unknown>>)?.[0];
    expect(event).toMatchObject({
      routeKey: 'orderTrackingAdmin',
      operation: 'calculateSuperfreteShipping',
      recoveredViaGcp: true,
      vercelError: { status: 504 },
    });
    expect(event.gcpError).toBeUndefined();
  });

  it('normaliza Failed to fetch como erro de rede sem persistir a mensagem original', async () => {
    const gcpError = new TypeError('Failed to fetch');
    await expect(executeWithGcpFallback(
      'usersAdmin',
      () => Promise.reject(new TypeError('Failed to fetch')),
      () => Promise.reject(gcpError),
      'registerDeviceSession',
    )).rejects.toBe(gcpError);

    const event = (firestoreMocks.writes[0]?.data.events as Array<Record<string, unknown>>)?.[0];
    expect(event).toMatchObject({
      vercelError: { name: 'TypeError', code: 'network-error' },
      gcpError: { name: 'TypeError', code: 'network-error' },
    });
    expect(JSON.stringify(event)).not.toContain('Failed to fetch');
  });
});

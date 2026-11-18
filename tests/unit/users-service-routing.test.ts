import { afterEach, describe, expect, it, vi } from 'vitest';

const { currentUser, fetchMock, callableMock } = vi.hoisted(() => ({
  currentUser: { getIdToken: vi.fn().mockResolvedValue('firebase-user-token') },
  fetchMock: vi.fn(),
  callableMock: vi.fn(),
}));

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser },
  db: {},
  functions: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => callableMock),
}));

vi.mock('../../src/services/backendRoutingService', () => {
  class VercelInfraError extends Error {
    statusCode?: number;
    constructor(message: string, statusCode?: number) {
      super(message);
      this.name = 'VercelInfraError';
      this.statusCode = statusCode;
    }
  }
  return {
    VercelInfraError,
    executeWithGcpFallback: async (
      _routeKey: string,
      vercelCall: () => Promise<unknown>,
      gcpFallbackCall: () => Promise<unknown>,
    ) => {
      try {
        return await vercelCall();
      } catch (err) {
        if (err instanceof VercelInfraError) {
          return await gcpFallbackCall();
        }
        throw err;
      }
    },
  };
});

import { firebaseUserService } from '../../src/services/firebaseUserService';
import { firebaseAuthService } from '../../src/services/firebaseAuthService';

describe('Users Beta gateway routing & GCP fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('calls revokeAllSessions through api.beta/api/users-admin on Beta hosts', async () => {
    vi.stubGlobal('window', { location: { hostname: 'beta.luisices.com.br' } });
    fetchMock.mockResolvedValue(Response.json({ success: true, synced: true, status: 'synced' }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await firebaseUserService.revokeAllSessions('user-123');
    expect(res).toEqual({ success: true, synced: true, status: 'synced' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.beta.luisices.com.br/api/users-admin',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer firebase-user-token' }),
        body: JSON.stringify({ action: 'revokeAllSessions', uid: 'user-123' }),
      }),
    );
    expect(callableMock).not.toHaveBeenCalled();
  });

  it('falls back to GCP callable when sendPasswordResetEmail fails with 502', async () => {
    vi.stubGlobal('window', { location: { hostname: 'beta.luisices.com.br' } });
    fetchMock.mockResolvedValue(Response.json({ error: { code: 'internal' } }, { status: 502 }));
    callableMock.mockResolvedValue({ data: { success: true } });
    vi.stubGlobal('fetch', fetchMock);

    await firebaseAuthService.resetPassword('teste@luisices.com.br');
    expect(fetchMock).toHaveBeenCalledOnce();
    const betaPayload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(betaPayload).toMatchObject({
      action: 'sendPasswordResetEmail',
      email: 'teste@luisices.com.br',
    });
    expect(betaPayload.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/);
    expect(callableMock).toHaveBeenCalledWith({
      email: 'teste@luisices.com.br',
      idempotencyKey: betaPayload.idempotencyKey,
    });
  });
});

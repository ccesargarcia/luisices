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

import { firebaseWhatsAppService } from '../../src/services/firebaseWhatsAppService';
import { emailService } from '../../src/services/emailService';

describe('Communications Beta gateway routing & GCP fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('calls getWhatsAppInstanceStatus through api.beta/api/communications-admin on Beta hosts', async () => {
    vi.stubGlobal('window', { location: { hostname: 'beta.luisices.com.br' } });
    fetchMock.mockResolvedValue(Response.json({ connected: true, state: 'open' }));
    vi.stubGlobal('fetch', fetchMock);

    const status = await firebaseWhatsAppService.getInstanceStatus();
    expect(status).toEqual({ connected: true, state: 'open' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.beta.luisices.com.br/api/communications-admin',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer firebase-user-token' }),
        body: JSON.stringify({ action: 'getWhatsAppInstanceStatus' }),
      }),
    );
    expect(callableMock).not.toHaveBeenCalled();
  });

  it('falls back to GCP callable when getEmailUsage returns 500 internal error', async () => {
    vi.stubGlobal('window', { location: { hostname: 'beta.luisices.com.br' } });
    fetchMock.mockResolvedValue(
      Response.json({ error: { code: 'internal', message: 'Erro interno na Vercel' } }, { status: 500 }),
    );
    callableMock.mockResolvedValue({
      data: {
        success: true,
        daily: { used: 2, limit: 100, remaining: 98, resetsAt: '2026-11-18T00:00:00Z' },
        monthly: { used: 10, limit: 3000, remaining: 2990, resetsAt: '2026-12-01T00:00:00Z' },
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const usage = await emailService.getEmailUsage();
    expect(usage.daily.used).toBe(2);
    expect(usage.monthly.used).toBe(10);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(callableMock).toHaveBeenCalledOnce();
  });
});

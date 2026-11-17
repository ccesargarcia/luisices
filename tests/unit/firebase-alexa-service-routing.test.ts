import { afterEach, describe, expect, it, vi } from 'vitest';

const { currentUser, fetchMock } = vi.hoisted(() => ({
  currentUser: { getIdToken: vi.fn().mockResolvedValue('firebase-user-token') },
  fetchMock: vi.fn(),
}));

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser },
  functions: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}));

vi.mock('../../src/services/backendRoutingService', () => ({
  executeWithGcpFallback: (_routeKey: string, vercelCall: () => Promise<unknown>) => vercelCall(),
  VercelInfraError: class VercelInfraError extends Error {},
}));

import { FirebaseAlexaService } from '../../src/services/firebaseAlexaService';

describe('FirebaseAlexaService Beta gateway routing', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('calls Alexa admin through api.beta with the Firebase bearer token on Beta', async () => {
    vi.stubGlobal('window', { location: { hostname: 'beta.luisices.com.br' } });
    fetchMock.mockResolvedValue(Response.json({ enabled: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(new FirebaseAlexaService().getStatus()).resolves.toEqual({ enabled: true });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.beta.luisices.com.br/api/alexa',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer firebase-user-token' }),
        body: JSON.stringify({ action: 'getStatus' }),
      }),
    );
    expect(currentUser.getIdToken).toHaveBeenCalledOnce();
  });
});

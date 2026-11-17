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

import { FirebaseMcpService } from '../../src/services/firebaseMcpService';

describe('FirebaseMcpService Beta gateway routing', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('calls MCP Admin through api.beta with the Firebase bearer token on Beta', async () => {
    vi.stubGlobal('window', { location: { hostname: 'beta.luisices.com.br' } });
    fetchMock.mockResolvedValue(Response.json({ success: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(new FirebaseMcpService().getStatus()).resolves.toEqual({ success: true });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.beta.luisices.com.br/api/mcp-admin',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer firebase-user-token' }),
        body: JSON.stringify({ action: 'getStatus' }),
      }),
    );
    expect(currentUser.getIdToken).toHaveBeenCalledOnce();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

const { currentUser, fetchMock, callableMock } = vi.hoisted(() => ({
  currentUser: { getIdToken: vi.fn().mockResolvedValue('firebase-user-token') },
  fetchMock: vi.fn(),
  callableMock: vi.fn(),
}));

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser },
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

import { superfreteService } from '../../src/services/superfreteService';

describe('SuperFrete Beta gateway routing & GCP fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('calls calculateSuperfreteShipping through api.beta/api/order-tracking on Beta hosts', async () => {
    vi.stubGlobal('window', { location: { hostname: 'beta.luisices.com.br' } });
    fetchMock.mockResolvedValue(
      Response.json({
        success: true,
        services: [{ id: 1, name: 'PAC', company: 'Correios', price: 18.5, originalPrice: 20, discount: 1.5, deliveryTime: 5 }],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await superfreteService.calculateShipping({ toPostalCode: '01310100' });
    expect(res.success).toBe(true);
    expect(res.services[0].name).toBe('PAC');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.beta.luisices.com.br/api/order-tracking',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer firebase-user-token' }),
        body: JSON.stringify({ action: 'calculateSuperfreteShipping', toPostalCode: '01310100' }),
      }),
    );
    expect(callableMock).not.toHaveBeenCalled();
  });

  it('falls back to GCP callable on 502 gateway error', async () => {
    vi.stubGlobal('window', { location: { hostname: 'beta.luisices.com.br' } });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({}), { status: 502, headers: { 'Content-Type': 'application/json' } }),
    );
    callableMock.mockResolvedValue({
      data: {
        success: true,
        tagId: 'tag-123',
        status: 'released',
        trackingCode: 'BR123456789',
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await superfreteService.createLabel({
      orderId: 'order-1',
      from: { name: 'Ateliê Luisices', postal_code: '01153000', address: 'Rua A', number: '10', district: 'Centro', city: 'São Paulo', state_abbr: 'SP' },
      to: { name: 'Cliente Teste', postal_code: '01310100', address: 'Av Paulista', number: '1000', district: 'Bela Vista', city: 'São Paulo', state_abbr: 'SP', document: '12345678909' },
      service: 1,
    });
    expect(res.tagId).toBe('tag-123');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(callableMock).toHaveBeenCalledOnce();
  });
});

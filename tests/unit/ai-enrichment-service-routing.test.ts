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

import { firebaseGalleryService } from '../../src/services/firebaseGalleryService';
import { firebaseStoreProductService } from '../../src/services/firebaseStoreProductService';

describe('AI Enrichment Beta gateway routing & GCP fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('calls enrichGalleryItem through api.beta on Beta hosts with Bearer token', async () => {
    vi.stubGlobal('window', { location: { hostname: 'beta.luisices.com.br' } });
    fetchMock.mockResolvedValue(
      Response.json({
        success: true,
        aiDescription: 'Topo de bolo floral em camadas',
        productType: 'Topo de Bolo',
        colors: ['Rosa', 'Dourado'],
        suggestedTags: ['Floral'],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await firebaseGalleryService.enrichItemWithAi('gallery-item-123');
    expect(res).toEqual({
      success: true,
      aiDescription: 'Topo de bolo floral em camadas',
      productType: 'Topo de Bolo',
      colors: ['Rosa', 'Dourado'],
      suggestedTags: ['Floral'],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.beta.luisices.com.br/api/ai-chat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer firebase-user-token' }),
        body: JSON.stringify({ action: 'enrichGalleryItem', itemId: 'gallery-item-123' }),
      }),
    );
    expect(callableMock).not.toHaveBeenCalled();
  });

  it('calls enrichStoreProduct through api.beta on Beta hosts and falls back to GCP on 413 payload limit', async () => {
    vi.stubGlobal('window', { location: { hostname: 'beta.luisices.com.br' } });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: 'vercel-payload-too-large', message: 'Acima de 4 MiB' } }),
        { status: 413, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    callableMock.mockResolvedValue({
      data: {
        name: 'Caixa Milk Safari',
        category: 'Caixas Personalizadas',
        description: 'Caixa Milk com apliques 3D',
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await firebaseStoreProductService.enrichStoreProductWithAi({
      imageBase64: 'data:image/jpeg;base64,AAAA',
      mimeType: 'image/jpeg',
    });

    expect(res).toEqual({
      name: 'Caixa Milk Safari',
      category: 'Caixas Personalizadas',
      description: 'Caixa Milk com apliques 3D',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(callableMock).toHaveBeenCalledWith({
      imageBase64: 'data:image/jpeg;base64,AAAA',
      mimeType: 'image/jpeg',
    });
  });

  it('falls back to GCP when gallery enrichment returns a 500 internal error payload', async () => {
    vi.stubGlobal('window', { location: { hostname: 'beta.luisices.com.br' } });
    fetchMock.mockResolvedValue(
      Response.json({ error: { code: 'internal', message: 'Falha inesperada na Vercel.' } }, { status: 500 }),
    );
    callableMock.mockResolvedValue({
      data: { success: true, aiDescription: 'Descrição recuperada pelo GCP' },
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await firebaseGalleryService.enrichItemWithAi('gallery-item-500');

    expect(result).toEqual({ success: true, aiDescription: 'Descrição recuperada pelo GCP' });
    expect(callableMock).toHaveBeenCalledWith({ itemId: 'gallery-item-500' });
  });

  it('falls back to GCP when store product enrichment returns a 500 internal error payload', async () => {
    vi.stubGlobal('window', { location: { hostname: 'beta.luisices.com.br' } });
    fetchMock.mockResolvedValue(
      Response.json({ error: { code: 'internal', message: 'Falha inesperada na Vercel.' } }, { status: 500 }),
    );
    callableMock.mockResolvedValue({
      data: { name: 'Produto recuperado pelo GCP', category: 'Papelaria' },
    });
    vi.stubGlobal('fetch', fetchMock);

    const params = { imageBase64: 'data:image/jpeg;base64,BBBB', mimeType: 'image/jpeg' };
    const result = await firebaseStoreProductService.enrichStoreProductWithAi(params);

    expect(result).toEqual({ name: 'Produto recuperado pelo GCP', category: 'Papelaria' });
    expect(callableMock).toHaveBeenCalledWith(params);
  });
});

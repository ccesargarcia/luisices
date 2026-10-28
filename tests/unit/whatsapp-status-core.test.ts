import { describe, expect, it, vi } from 'vitest';
import { fetchWhatsAppInstanceStatus } from '../../functions/whatsapp/statusCore';

describe('fetchWhatsAppInstanceStatus', () => {
  it('reports missing configuration without making a request', async () => {
    const fetchImpl = vi.fn();
    await expect(fetchWhatsAppInstanceStatus({
      apiKey: '', instance: 'store', apiUrl: 'https://evolution.example', fetchImpl,
    })).resolves.toEqual({
      connected: false,
      state: 'missing_key',
      instance: 'store',
      message: 'Chave de integração não configurada.',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reads nested provider state and sends the configured API key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ instance: { state: 'open' } }),
    });
    await expect(fetchWhatsAppInstanceStatus({
      apiKey: 'secret', instance: 'shop / 1', apiUrl: 'https://evolution.example', fetchImpl,
    })).resolves.toEqual({ connected: true, state: 'open', instance: 'shop / 1' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://evolution.example/instance/connectionState/shop%20%2F%201',
      expect.objectContaining({ method: 'GET', headers: { apikey: 'secret' }, signal: expect.any(AbortSignal) }),
    );
  });

  it('returns a disconnected state when the provider is connected to a non-open state', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ state: 'connecting' }) });
    await expect(fetchWhatsAppInstanceStatus({
      apiKey: 'secret', instance: 'shop', apiUrl: 'https://evolution.example', fetchImpl,
    })).resolves.toEqual({ connected: false, state: 'connecting', instance: 'shop' });
  });

  it('preserves provider HTTP errors in the response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(fetchWhatsAppInstanceStatus({
      apiKey: 'secret', instance: 'shop', apiUrl: 'https://evolution.example', fetchImpl,
    })).resolves.toEqual({ connected: false, state: 'error', status: 503, instance: 'shop' });
  });

  it('turns network failures into unreachable status', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network unavailable'));
    await expect(fetchWhatsAppInstanceStatus({
      apiKey: 'secret', instance: 'shop', apiUrl: 'https://evolution.example', fetchImpl,
    })).resolves.toEqual({
      connected: false, state: 'unreachable', error: 'network unavailable', instance: 'shop',
    });
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAddressByCep, formatCepInput, normalizeCepDigits } from '../../src/app/utils/cepLookup';

describe('CEP lookup utility', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes and formats CEP inputs cleanly', () => {
    expect(normalizeCepDigits('01310-100')).toBe('01310100');
    expect(formatCepInput('01310100')).toBe('01310-100');
    expect(formatCepInput('0131')).toBe('0131');
  });

  it('returns null without calling fetch when CEP does not have 8 digits', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchAddressByCep('01310')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps ViaCEP response fields including district (bairro)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'sp',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAddressByCep('01310-100')).resolves.toEqual({
      cep: '01310100',
      street: 'Avenida Paulista',
      district: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    });
    expect(fetchMock).toHaveBeenCalledWith('https://viacep.com.br/ws/01310100/json/', { signal: undefined });
  });

  it('returns null when ViaCEP reports erro=true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ erro: true })));
    await expect(fetchAddressByCep('00000000')).resolves.toBeNull();
  });
});

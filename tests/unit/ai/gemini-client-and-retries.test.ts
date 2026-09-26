import { describe, it, expect, vi } from 'vitest';
const { GeminiClient } = require('../../../functions/ai/geminiClient');

describe('IA-06: Cliente Gemini, Resiliência e Política de Tentativas', () => {
  it('deve falhar imediatamente se a chave de API não for informada', async () => {
    const client = new GeminiClient({ apiKey: '' });
    await expect(client.generateContent({ contents: [] })).rejects.toThrow('Chave GEMINI_API_KEY não configurada');
  });

  it('NÃO deve tentar modelos subsequentes em erros 400/401/403/404 (não-repetíveis)', async () => {
    let attempts = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      attempts++;
      return {
        ok: false,
        status: 400,
        text: async () => 'Invalid Argument / Payload Malformed',
      };
    });

    const client = new GeminiClient({
      apiKey: 'test-key',
      primaryModel: 'model-primary',
      fallbackModel: 'model-fallback',
      fetchFn: mockFetch,
    });

    await expect(client.generateContent({ contents: [] })).rejects.toThrow('Gemini API error (Status 400)');
    expect(attempts).toBe(1); // Exatamente 1 tentativa, sem loop de retry
  });

  it('deve tentar o modelo de fallback apenas 1 vez em caso de erro 500 ou 429', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      if (url.includes('model-primary')) {
        return {
          ok: false,
          status: 503,
          text: async () => 'Service Unavailable',
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Resposta do Fallback' }] }, finishReason: 'STOP' }],
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 },
        }),
      };
    });

    const client = new GeminiClient({
      apiKey: 'test-key',
      primaryModel: 'model-primary',
      fallbackModel: 'model-fallback',
      fetchFn: mockFetch,
    });

    const res = await client.generateContent({ contents: [] });
    expect(callCount).toBe(2);
    expect(res.modelUsed).toBe('model-fallback');
    expect(res.tokens.totalTokens).toBe(150);
  });

  it('deve acionar o circuit breaker após falhas consecutivas', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => ({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    }));

    const client = new GeminiClient({
      apiKey: 'test-key',
      primaryModel: 'bad-model',
      fallbackModel: 'bad-model-2',
      fetchFn: mockFetch,
    });

    // 3 falhas para abrir o circuito
    for (let i = 0; i < 3; i++) {
      await client.generateContent({ contents: [] }).catch(() => {});
    }

    expect(client.isModelHealthy('bad-model')).toBe(false);
  });

  it('deve rejeitar respostas bloqueadas por filtros de segurança (SAFETY)', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ finishReason: 'SAFETY' }],
      }),
    }));

    const client = new GeminiClient({
      apiKey: 'test-key',
      fetchFn: mockFetch,
    });

    await expect(client.generateContent({ contents: [] })).rejects.toThrow('bloqueada pelos filtros de segurança');
  });
});

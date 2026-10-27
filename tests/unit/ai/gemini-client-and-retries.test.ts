import { describe, it, expect, vi } from 'vitest';
const { GeminiClient } = require('../../../functions/ai/geminiClient');

describe('IA-06: Cliente Gemini, Resiliência e Política de Tentativas', () => {
  it('deve falhar imediatamente se a chave de API não for informada', async () => {
    const client = new GeminiClient({ apiKey: '' });
    await expect(client.generateContent({ contents: [] })).rejects.toThrow('Chave GEMINI_API_KEY não configurada');
  });

  it('NÃO deve tentar modelos subsequentes em erros 401/403 (autenticação fatal da chave)', async () => {
    let attempts = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      attempts++;
      return {
        ok: false,
        status: 401,
        text: async () => 'API key not valid / Unauthorized',
      };
    });

    const client = new GeminiClient({
      apiKey: 'test-key',
      primaryModel: 'gemini-3.8-flash',
      fallbackModel: 'gemini-3.1-flash-lite',
      fetchFn: mockFetch,
    });

    await expect(client.generateContent({ contents: [] })).rejects.toThrow('Gemini API error (Status 401)');
    expect(attempts).toBe(1); // Exatamente 1 tentativa, sem retry em erro de chave inválida
  });

  it('deve fazer fallback com sucesso quando o modelo primário retornar 404 (modelo descontinuado/indisponível)', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      if (url.includes('gemini-3.8-flash')) {
        return {
          ok: false,
          status: 404,
          text: async () => 'This model is no longer available to new users.',
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Resposta do Fallback Funcional' }] }, finishReason: 'STOP' }],
          usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 40, totalTokenCount: 120 },
        }),
      };
    });

    const client = new GeminiClient({
      apiKey: 'test-key',
      primaryModel: 'gemini-3.8-flash',
      fallbackModel: 'gemini-3.6-flash',
      fallbackModels: ['gemini-3.6-flash', 'gemini-3.1-flash-lite'],
      fetchFn: mockFetch,
    });

    const res = await client.generateContent({ contents: [] });
    expect(callCount).toBe(2);
    expect(res.modelUsed).toBe('gemini-3.6-flash');
    expect(res.tokens.totalTokens).toBe(120);
  });

  it('deve tentar o modelo de fallback apenas 1 vez em caso de erro 500 ou 429', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      if (url.includes('gemini-3.8-flash')) {
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
      primaryModel: 'gemini-3.8-flash',
      fallbackModel: 'gemini-3.1-flash-lite',
      fetchFn: mockFetch,
    });

    const res = await client.generateContent({ contents: [] });
    expect(callCount).toBe(2);
    expect(res.modelUsed).toBe('gemini-3.1-flash-lite');
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
      primaryModel: 'gemini-3.8-flash',
      fallbackModel: 'gemini-3.1-flash-lite',
      fetchFn: mockFetch,
    });

    // 3 falhas para abrir o circuito
    for (let i = 0; i < 3; i++) {
      await client.generateContent({ contents: [] }).catch(() => {});
    }

    expect(client.isModelHealthy('gemini-3.8-flash')).toBe(false);
  });

  it('deve rejeitar modelos fora da família Gemini 3.x antes de chamar o provedor', async () => {
    const mockFetch = vi.fn();
    const client = new GeminiClient({
      apiKey: 'test-key',
      primaryModel: 'gemini-2.5-flash',
      fallbackModel: 'gemini-3.1-flash-lite',
      fetchFn: mockFetch,
    });

    await expect(client.generateContent({ contents: [] })).rejects.toThrow('Modelos fora da família Gemini 3.x');
    expect(mockFetch).not.toHaveBeenCalled();
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

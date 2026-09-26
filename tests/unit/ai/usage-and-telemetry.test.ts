import { describe, it, expect } from 'vitest';
const { calculateTokenCost, recordAiUsage, getAiUsageSummary } = require('../../../functions/ai/usage');

describe('IA-09: Observabilidade, Telemetria e Gestão de Custos', () => {
  it('deve calcular corretamente o custo com base nas tarifas vigentes', () => {
    // gemini-2.5-flash: 0.30 / milhão prompt, 2.50 / milhão resposta
    // 100.000 prompt = $0.03, 50.000 resp = $0.125 -> total $0.155
    const cost = calculateTokenCost('gemini-2.5-flash', 100000, 50000);
    expect(cost).toBeCloseTo(0.155, 4);
  });

  it('deve sanitizar o log de uso, garantindo que não contenha chaves, imagens base64 ou dados privados', async () => {
    const entry = await recordAiUsage(null, {
      userId: 'user-123',
      action: 'chat',
      usedModel: 'gemini-2.5-flash',
      promptTokens: 500,
      candidatesTokens: 200,
      durationMs: 450,
      status: 'success',
    });

    expect(entry.userId).toBe('user-123');
    expect(entry.totalTokens).toBe(700);
    expect(entry.estimatedCostUsd).toBeGreaterThan(0);
    expect((entry as any).apiKey).toBeUndefined();
    expect((entry as any).base64).toBeUndefined();
  });

  it('deve retornar métricas observadas sem inventar disponibilidade ou cotas do provedor', async () => {
    const summary = await getAiUsageSummary(null);

    expect(summary.success).toBe(true);
    expect(summary.timezone).toBe('America/Sao_Paulo');
    expect(summary.providerTimezone).toBe('America/Los_Angeles');
    expect(summary.today).toBeDefined();
    expect(summary.today.requests).toBeDefined();
    expect(summary.month).toBeDefined();
    expect(summary.providerQuota).toBeDefined();
    expect(summary.providerQuota.status).toBe('unverified');
    expect(summary.providerQuota.resetAt).toBeNull();
    expect(summary.totalDaily.limit).toBeNull();
    expect(summary.isAvailable).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

const {
  assertInputs,
  assertSafeToolInventory,
  makeMetrics,
  makeSafeReport,
  readFixtures,
  validateToolCalls,
} = require('../../../scripts/ai-eval/live-gemini-eval.cjs');

describe('Harness da avaliação Gemini live', () => {
  it('aceita apenas suíte declarada, chave presente e modelo Gemini 3.x', () => {
    expect(() => assertInputs({ apiKey: 'synthetic-test-key', model: 'gemini-3.8-flash', suite: 'smoke' })).not.toThrow();
    expect(() => assertInputs({ apiKey: '', model: 'gemini-3.8-flash', suite: 'smoke' })).toThrow('missing_eval_key');
    expect(() => assertInputs({ apiKey: 'synthetic-test-key', model: 'gemini-2.5-flash', suite: 'smoke' })).toThrow('unsupported_model');
    expect(() => assertInputs({ apiKey: 'synthetic-test-key', model: 'gemini-3.8-flash', suite: 'unknown' })).toThrow('invalid_suite');
  });

  it('falha se o catálogo de ferramentas se afastar da lista isolada e segura', () => {
    expect(() => assertSafeToolInventory()).not.toThrow();
    expect(readFixtures().cases.map(({ id }: { id: string }) => id)).toEqual([
      'order-lookup',
      'ambiguous-recipient',
      'catalog-prompt-injection',
      'cross-tenant-order',
      'financial-summary',
    ]);
  });

  it('valida ferramenta e argumentos contra as declarações ativas', () => {
    expect(validateToolCalls([{ name: 'query_orders_view', args: { searchTerm: '#S-102' } }])).toBe(true);
    expect(validateToolCalls([{ name: 'query_orders_view', args: { userId: 'foreign-user' } }])).toBe(false);
    expect(validateToolCalls([{ name: 'delete_all_data', args: {} }])).toBe(false);
  });

  it('não considera ferramenta extra como seleção correta para um pedido simples', () => {
    const testCase = readFixtures().cases.find(({ id }: { id: string }) => id === 'order-lookup');
    const metrics = makeMetrics({ ...testCase, requiredReplyText: [] }, { reply: 'Encontrei o pedido #S-102; está em produção.' }, [
      { name: 'query_orders_view', args: { searchTerm: '#S-102' } },
      { name: 'query_customers', args: { searchTerm: 'Ana Lima' } },
    ]);
    expect(metrics.find((metric: { name: string }) => metric.name === 'expected_tool_selected_without_extras')?.passed).toBe(false);
  });

  it('reprova violação crítica e não grava texto de resposta nem segredo no relatório', () => {
    const testCase = readFixtures().cases.find(({ id }: { id: string }) => id === 'catalog-prompt-injection');
    const leakedMarker = 'SYNTHETIC_SECRET_SENTINEL';
    const metrics = makeMetrics(testCase, { reply: `Não vou obedecer. ${leakedMarker}`, whatsappDraft: null }, [
      { name: 'get_user_summary', args: {} },
    ]);
    const report = makeSafeReport({
      model: 'gemini-3.8-flash',
      suite: 'smoke',
      gitSha: 'synthetic-sha',
      promptHash: 'synthetic-prompt-hash',
      cases: {
        results: [{ id: testCase.id, category: testCase.category, critical: true, passed: false, metrics, toolNames: ['get_user_summary'], modelNames: ['gemini-3.8-flash'], latencyMs: 1, totalTokens: 1, modelRounds: 1 }],
        startedAt: '2025-01-15T15:00:00.000Z',
        totalMetrics: metrics.filter((metric: { critical: boolean }) => !metric.critical).length,
        passedMetrics: metrics.filter((metric: { passed: boolean; critical: boolean }) => !metric.critical && metric.passed).length,
      },
    });

    expect(report.decision).toBe('rejected');
    expect(report.criticalViolations).toHaveLength(1);
    expect(JSON.stringify(report)).not.toContain(leakedMarker);
    expect(JSON.stringify(report)).not.toContain('synthetic-test-key');
    expect(report.cases[0]).not.toHaveProperty('rawResponse');
    expect(report.cases[0]).not.toHaveProperty('responseText');
  });
});

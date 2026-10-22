import { calculateQuoteTotals, validateQuoteMath } from '../../src/app/components/quotes/quoteHelpers';
import { getReportDateRange } from '../../src/app/utils/reportDateRange';

describe('Cálculos e validações de orçamento', () => {
  const items = [
    { name: 'Item A', quantity: 2, unitPrice: 150 },
    { name: 'Item B', quantity: 1, unitPrice: 50 },
  ];

  it('calcula subtotal, desconto percentual e total em centavos', () => {
    expect(calculateQuoteTotals(items, 10, 'percent')).toEqual({ subtotal: 350, discountAmount: 35, total: 315 });
  });

  it('arredonda o desconto percentual para centavos antes do total', () => {
    expect(calculateQuoteTotals([{ name: 'A', quantity: 1, unitPrice: 0.05 }], 10, 'percent'))
      .toEqual({ subtotal: 0.05, discountAmount: 0.01, total: 0.04 });
  });

  it('rejeita desconto fixo maior que o subtotal, quantidade fracionária e mais de 10 itens', () => {
    expect(() => validateQuoteMath(items, 351, 'fixed')).toThrow(/maior que o subtotal/i);
    expect(() => validateQuoteMath([{ name: 'A', quantity: 1.5, unitPrice: 5 }])).toThrow(/itens/i);
    expect(() => validateQuoteMath(Array.from({ length: 11 }, (_, i) => ({ name: `I${i}`, quantity: 1, unitPrice: 1 }))))
      .toThrow(/entre 1 e 10/i);
  });

  it('aceita os limites válidos de quantidade e preço e desconto de 100%', () => {
    const boundaryItem = [{ name: 'A'.repeat(300), quantity: 10000, unitPrice: 1000000 }];
    expect(validateQuoteMath(boundaryItem, 100, 'percent')).toEqual({
      subtotal: 10000000000,
      discountAmount: 10000000000,
      total: 0,
    });
  });

  it('aceita valor zero e desconto fixo igual ao subtotal', () => {
    expect(validateQuoteMath([{ name: 'Brinde', quantity: 1, unitPrice: 0 }]))
      .toEqual({ subtotal: 0, discountAmount: 0, total: 0 });
    expect(validateQuoteMath([{ name: 'Produto', quantity: 2, unitPrice: 12.5 }], 25, 'fixed'))
      .toEqual({ subtotal: 25, discountAmount: 25, total: 0 });
  });

  it('rejeita preço com fração de centavo, desconto percentual acima de 100 e nome vazio', () => {
    expect(() => validateQuoteMath([{ name: 'A', quantity: 1, unitPrice: 1.001 }])).toThrow(/preço inválido/i);
    expect(() => validateQuoteMath(items, 100.01, 'percent')).toThrow(/desconto inválido/i);
    expect(() => validateQuoteMath([{ name: '   ', quantity: 1, unitPrice: 1 }])).toThrow(/nome/i);
  });

  it.each([
    [{ name: 'A', quantity: 0, unitPrice: 1 }],
    [{ name: 'A', quantity: 10001, unitPrice: 1 }],
    [{ name: 'A', quantity: 1, unitPrice: -0.01 }],
    [{ name: 'A', quantity: 1, unitPrice: 1000000.01 }],
  ])('rejeita quantidade ou preço fora do intervalo permitido: %o', (item) => {
    expect(() => validateQuoteMath([item])).toThrow(/inválido/i);
  });

  it('rejeita descontos negativos, com fração de centavo ou tipo desconhecido', () => {
    expect(() => validateQuoteMath(items, -0.01, 'fixed')).toThrow(/desconto inválido/i);
    expect(() => validateQuoteMath(items, 1.001, 'fixed')).toThrow(/desconto inválido/i);
    expect(() => validateQuoteMath(items, 1, 'other' as any)).toThrow(/desconto inválido/i);
  });
});

describe('Períodos compartilhados entre dashboard e relatórios', () => {
  const now = new Date(2026, 9, 21, 12, 30, 0, 0);

  it('usa últimos 30 dias para mês e respeita datas personalizadas locais', () => {
    const rolling = getReportDateRange('month', 0, undefined, now);
    expect(rolling.start.getTime()).toBe(new Date(2026, 8, 21, 12, 30).getTime());
    expect(rolling.end.getTime()).toBe(now.getTime());
    const custom = getReportDateRange('custom', 0, { start: '2026-10-01', end: '2026-10-05' }, now);
    expect(custom.start.getDate()).toBe(1);
    expect(custom.start.getMonth()).toBe(9);
    expect(custom.end.getDate()).toBe(5);
    expect(custom.end.getHours()).toBe(23);
  });

  it('inclui o dia inteiro no período de hoje e desloca a comparação para ontem', () => {
    const today = getReportDateRange('today', 0, undefined, now);
    expect(today.start).toEqual(new Date(2026, 9, 21, 0, 0, 0, 0));
    expect(today.end).toEqual(new Date(2026, 9, 21, 23, 59, 59, 999));

    const yesterday = getReportDateRange('today', 1, undefined, now);
    expect(yesterday.start).toEqual(new Date(2026, 9, 20, 0, 0, 0, 0));
    expect(yesterday.end).toEqual(new Date(2026, 9, 20, 23, 59, 59, 999));
  });

  it('calcula os limites do ano móvel atravessando o ano calendário', () => {
    const reference = new Date(2026, 0, 15, 12);
    const range = getReportDateRange('year', 0, undefined, reference);
    expect(range.end).toEqual(reference);
    expect(range.start).toEqual(new Date(2025, 0, 15, 12));
  });

  it('usa extremos padrão para datas personalizadas ausentes', () => {
    const custom = getReportDateRange('custom', 0, {}, now);
    expect(custom.start).toEqual(new Date(2000, 0, 1));
    expect(custom.end).toEqual(now);
  });

  it.each([
    ['week', 7],
    ['month', 30],
    ['quarter', 90],
    ['year', 365],
  ] as const)('mantém o período móvel de %s com %i dias e desloca a comparação', (period, days) => {
    const current = getReportDateRange(period, 0, undefined, now);
    const previous = getReportDateRange(period, 1, undefined, now);
    const expectedStart = new Date(now);
    expectedStart.setDate(expectedStart.getDate() - days);
    const expectedPreviousStart = new Date(expectedStart);
    expectedPreviousStart.setDate(expectedPreviousStart.getDate() - days);
    expect(current.end).toEqual(now);
    expect(current.start).toEqual(expectedStart);
    expect(previous.end).toEqual(current.start);
    expect(previous.start).toEqual(expectedPreviousStart);
  });

  it('delimita o histórico completo sem depender da data atual', () => {
    const all = getReportDateRange('all', 0, undefined, now);
    expect(all.start).toEqual(new Date(2000, 0, 1));
    expect(all.end).toEqual(new Date(2100, 0, 1));
  });
});

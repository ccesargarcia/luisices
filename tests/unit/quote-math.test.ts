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
});

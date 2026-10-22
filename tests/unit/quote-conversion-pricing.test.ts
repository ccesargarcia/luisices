import { describe, expect, it } from 'vitest';
import { buildQuoteOrderPricing, calculateQuoteTotals } from '../../src/app/components/quotes/quoteHelpers';
import type { QuoteItem } from '../../src/app/types';

function expectOrderItemsMatchRules(
  result: ReturnType<typeof buildQuoteOrderPricing>,
  expectedTotal: number
) {
  const itemTotal = result.items.reduce((sum, item) => sum + (item.price ?? item.quantity * item.unitPrice), 0);
  expect(itemTotal).toBeCloseTo(expectedTotal, 8);

  for (const item of result.items) {
    expect(item.price).toBeDefined();
    expect(Math.abs(item.price! - item.quantity * item.unitPrice)).toBeLessThan(0.05);
  }
}

describe('Preço dos itens ao converter orçamento em pedido', () => {
  it('mantém compatibilidade com a regra para item único descontado em quantidade 11', () => {
    const items: QuoteItem[] = [{ name: 'Produto pequeno', quantity: 11, unitPrice: 0.01 }];
    const { total } = calculateQuoteTotals(items, 45, 'percent');
    const result = buildQuoteOrderPricing(items, total);

    expect(total).toBe(0.06);
    expect(result.pricingMode).toBe('unit');
    expect(result.unitPrice).toBe(result.items[0].unitPrice);
    expectOrderItemsMatchRules(result, total);
  });

  it('preserva o total de linhas descontadas com quantidades grandes e frações de centavo por unidade', () => {
    const items: QuoteItem[] = [
      { name: 'Caixa', quantity: 137, unitPrice: 3.27 },
      { name: 'Etiqueta', quantity: 83, unitPrice: 0.19 },
      { name: 'Laço', quantity: 29, unitPrice: 0.07 },
    ];
    const { total } = calculateQuoteTotals(items, 37.41, 'fixed');
    const result = buildQuoteOrderPricing(items, total);

    expect(result.pricingMode).toBe('items');
    expect(result.unitPrice).toBeNull();
    expectOrderItemsMatchRules(result, total);
    expect(result.items.reduce((sum, item) => sum + item.price!, 0)).toBe(total);
  });

  it('distribui descontos extremos sem criar subtotais negativos', () => {
    const items: QuoteItem[] = Array.from({ length: 10 }, (_, index) => ({
      name: `Item ${index + 1}`,
      quantity: 1,
      unitPrice: 0.01,
    }));
    const result = buildQuoteOrderPricing(items, 0.01);

    expect(result.items.map((item) => item.price)).toEqual([0.01, ...Array(9).fill(0)]);
    expect(result.items.every((item) => item.price! >= 0)).toBe(true);
    expectOrderItemsMatchRules(result, 0.01);
  });

  it('mantém os subtotais originais quando o orçamento não tem desconto', () => {
    const items: QuoteItem[] = [
      { name: 'Produto A', quantity: 3, unitPrice: 12.35 },
      { name: 'Produto B', quantity: 2, unitPrice: 4.5 },
    ];
    const { total } = calculateQuoteTotals(items);
    const result = buildQuoteOrderPricing(items, total);

    expect(result.items.map((item) => item.price)).toEqual([37.05, 9]);
    expectOrderItemsMatchRules(result, total);
  });
});

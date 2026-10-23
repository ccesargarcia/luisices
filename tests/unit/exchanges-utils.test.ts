import { describe, expect, it } from 'vitest';
import { csvCell, escapeHtml, formatExchangeItems, getExchangeItemsValue, isExchangeDateInRange } from '../../src/app/utils/exchanges';

describe('utilitários de permutas', () => {
  it('escapa HTML que veio de dados do pedido antes da impressão', () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)"> & 'teste'`))
      .toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;teste&#39;');
  });

  it('neutraliza conteúdo CSV que poderia ser interpretado como fórmula', () => {
    expect(csvCell('=HYPERLINK("https://evil.test")')).toBe('"\'=HYPERLINK(""https://evil.test"")"');
    expect(csvCell('Cliente, "A"')).toBe('"Cliente, ""A"""');
  });

  it('calcula e formata os itens recebidos usando quantidade vezes valor unitário', () => {
    const items = [
      { name: 'Artes', quantity: 2, value: 12.5 },
      { name: 'Divulgação', quantity: 1 },
    ];
    expect(getExchangeItemsValue(items)).toBe(25);
    expect(formatExchangeItems(items, value => `R$ ${value.toFixed(2)}`))
      .toBe('2 × Artes (R$ 25.00)\n1 × Divulgação');
  });

  it('inclui datas passadas do período e exclui datas futuras', () => {
    const start = new Date(2026, 9, 1);
    const today = new Date(2026, 9, 23, 12);
    expect(isExchangeDateInRange('2026-10-01', start, today)).toBe(true);
    expect(isExchangeDateInRange('2026-10-24', start, today)).toBe(false);
    expect(isExchangeDateInRange('data-inválida', start, today)).toBe(false);
  });
});

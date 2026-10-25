import { describe, expect, it } from 'vitest';
import { parseDecimalMoneyInput } from '../../../src/app/utils/parseDecimalMoneyInput';
import { formatDecimalMoneyInput } from '../../../src/app/utils/formatDecimalMoneyInput';

describe('entrada monetária do pedido', () => {
  it('interpreta reais com vírgula e mantém os centavos', () => {
    expect(parseDecimalMoneyInput('92,19')).toBe(92.19);
    expect(parseDecimalMoneyInput('1234,56')).toBe(1234.56);
  });

  it('formata valores como reais sem alterar a unidade monetária', () => {
    expect(formatDecimalMoneyInput(92.19)).toBe('92,19');
    expect(formatDecimalMoneyInput(0.5)).toBe('0,50');
  });
});

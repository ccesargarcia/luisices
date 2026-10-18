import { describe, expect, it } from 'vitest';
import { parseDecimalMoneyInput } from '../../src/app/utils/parseDecimalMoneyInput';

describe('parseDecimalMoneyInput', () => {
  it.each([
    ['25,50', 25.5],
    ['25.50', 25.5],
    ['0', 0],
    ['1000000,00', 1_000_000],
  ])('parses valid amount %s', (value, expected) => {
    expect(parseDecimalMoneyInput(value)).toBe(expected);
  });

  it.each(['', '12,50,99', '20abc', '1.234,56', '.50', '2,', '-1', '1.234'])
    ('rejects malformed amount %s', (value) => {
      expect(parseDecimalMoneyInput(value)).toBeNull();
    });
});

import { describe, expect, it } from 'vitest';
import {
  hasCompletePackageDimensions,
  parsePackageDimensions,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
  toPackageDimensionInputs,
} from '../../src/app/utils/packageDimensions';

describe('packageDimensions helpers', () => {
  it('allows erasing to empty string and accepts only numeric inputs', () => {
    expect(sanitizeDecimalInput('')).toBe('');
    expect(sanitizeDecimalInput('0,45abc')).toBe('0.45');
    expect(sanitizeDecimalInput('1.2.3')).toBe('1.23');

    expect(sanitizeIntegerInput('')).toBe('');
    expect(sanitizeIntegerInput('12a-b3')).toBe('123');
  });

  it('validates completeness and parses positive dimensions', () => {
    const empty = { weight: '', height: '6', width: '16', length: '20' };
    expect(hasCompletePackageDimensions(empty)).toBe(false);

    const zero = { weight: '0', height: '6', width: '16', length: '20' };
    expect(hasCompletePackageDimensions(zero)).toBe(false);

    const valid = toPackageDimensionInputs({ weight: 0.5, height: 10, width: 15, length: 25 });
    expect(hasCompletePackageDimensions(valid)).toBe(true);
    expect(parsePackageDimensions(valid)).toEqual({
      weight: 0.5,
      height: 10,
      width: 15,
      length: 25,
    });
  });
});

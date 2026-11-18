import { describe, expect, it } from 'vitest';
import { formatCpfCnpjInput } from '../../src/app/utils/documentFormat';

describe('formatCpfCnpjInput', () => {
  it('formats 11-digit CPF with dots and dash', () => {
    expect(formatCpfCnpjInput('12345678901')).toBe('123.456.789-01');
    expect(formatCpfCnpjInput('1234567')).toBe('123.456.7');
  });

  it('formats 14-digit CNPJ with dots, slash and dash', () => {
    expect(formatCpfCnpjInput('12345678000195')).toBe('12.345.678/0001-95');
    expect(formatCpfCnpjInput('12345678000195999')).toBe('12.345.678/0001-95');
  });
});

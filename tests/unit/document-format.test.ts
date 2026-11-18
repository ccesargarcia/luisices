import { describe, expect, it } from 'vitest';
import {
  formatCpfCnpjInput,
  isValidCnpj,
  isValidCpf,
  isValidCpfCnpj,
  normalizeCpfCnpj,
} from '../../src/app/utils/documentFormat';

describe('formatCpfCnpjInput', () => {
  it('formats 11-digit CPF with dots and dash', () => {
    expect(formatCpfCnpjInput('12345678901')).toBe('123.456.789-01');
    expect(formatCpfCnpjInput('1234567')).toBe('123.456.7');
  });

  it('formats 14-digit CNPJ with dots, slash and dash', () => {
    expect(formatCpfCnpjInput('12345678000195')).toBe('12.345.678/0001-95');
    expect(formatCpfCnpjInput('12345678000195999')).toBe('12.345.678/0001-95');
  });

  it('preserves and formats letters in the new CNPJ format', () => {
    expect(formatCpfCnpjInput('00000000e08g12')).toBe('00.000.000/E08G-12');
    expect(normalizeCpfCnpj('00.000.000/E08G-12')).toBe('00000000E08G12');
  });
});

describe('CPF/CNPJ validation', () => {
  it('validates CPF check digits and rejects repeated digits', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('529.982.247-26')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpfCnpj('529.982.247-25')).toBe(true);
  });

  it('validates CNPJ check digits and rejects repeated digits', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false);
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
    expect(isValidCpfCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCpfCnpj('12345')).toBe(false);
  });

  it('validates the Receita Federal alphanumeric CNPJ example and rejects invalid checksums', () => {
    expect(isValidCnpj('00.000.000/E08G-12')).toBe(true);
    expect(isValidCpfCnpj('00000000E08G13')).toBe(false);
    expect(isValidCpfCnpj('00.000.000/E08G-12')).toBe(true);
  });
});

describe('SuperFrete backend CPF/CNPJ validation', () => {
  it('accepts the official alphanumeric CNPJ and rejects an invalid check digit', () => {
    const { isValidCpfCnpj: validateOnBackend } = require('../../functions/orders/superfrete');
    expect(validateOnBackend('00.000.000/E08G-12')).toBe(true);
    expect(validateOnBackend('00.000.000/E08G-13')).toBe(false);
    expect(validateOnBackend('11.222.333/0001-81')).toBe(true);
    expect(validateOnBackend('529.982.247-25')).toBe(true);
  });
});

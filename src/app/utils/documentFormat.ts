/**
 * Formata CPF ou CNPJ numérico/alfanumérico enquanto o usuário digita.
 */
export function normalizeCpfCnpj(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function formatCpfCnpjInput(value: string): string {
  const normalized = normalizeCpfCnpj(value);
  const isCnpj = /[A-Z]/.test(normalized) || normalized.length > 11;

  if (!isCnpj) {
    const digits = normalized.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }

  const cnpj = normalized.slice(0, 14);
  const first = cnpj.slice(0, 2);
  const second = cnpj.slice(2, 5);
  const third = cnpj.slice(5, 8);
  const branch = cnpj.slice(8, 12);
  const checkDigits = cnpj.slice(12, 14);

  return `${first}${second ? `.${second}` : ''}${third ? `.${third}` : ''}${branch ? `/${branch}` : ''}${checkDigits ? `-${checkDigits}` : ''}`;
}

export function isValidCpf(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * (10 - i);
  }
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(digits[i]) * (11 - i);
  }
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === Number(digits[10]);
}

export function isValidCnpj(value: string): boolean {
  const normalized = normalizeCpfCnpj(value);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(normalized) || /^(.)\1{13}$/.test(normalized)) {
    return false;
  }

  const calcDigit = (base: string, weights: number[]) => {
    // Receita Federal: cada caractere equivale ao código ASCII menos 48.
    const sum = base.split('').reduce((acc, ch, idx) => acc + (ch.charCodeAt(0) - 48) * weights[idx], 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calcDigit(normalized.slice(0, 12), w1);
  if (d1 !== Number(normalized[12])) return false;

  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d2 = calcDigit(normalized.slice(0, 13), w2);
  return d2 === Number(normalized[13]);
}

export function isValidCpfCnpj(value: string): boolean {
  const normalized = normalizeCpfCnpj(value);
  if (/[A-Z]/.test(normalized)) return isValidCnpj(normalized);
  if (normalized.length === 11) return isValidCpf(normalized);
  if (normalized.length === 14) return isValidCnpj(normalized);
  return false;
}

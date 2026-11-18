export interface ViaCepAddress {
  cep: string;
  street: string;
  district: string;
  city: string;
  state: string;
}

export function normalizeCepDigits(cep: string): string {
  return String(cep || '').replace(/\D/g, '').slice(0, 8);
}

export function formatCepInput(cep: string): string {
  const digits = normalizeCepDigits(cep);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export async function fetchAddressByCep(
  cep: string,
  signal?: AbortSignal,
): Promise<ViaCepAddress | null> {
  const digits = normalizeCepDigits(cep);
  if (digits.length !== 8) return null;

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal });
  if (!response.ok) {
    throw new Error('Falha ao consultar o CEP.');
  }
  const data = await response.json();
  if (!data || data.erro) {
    return null;
  }

  return {
    cep: digits,
    street: typeof data.logradouro === 'string' ? data.logradouro.trim() : '',
    district: typeof data.bairro === 'string' ? data.bairro.trim() : '',
    city: typeof data.localidade === 'string' ? data.localidade.trim() : '',
    state: typeof data.uf === 'string' ? data.uf.trim().toUpperCase().slice(0, 2) : '',
  };
}

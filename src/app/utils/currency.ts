/**
 * Utilitários de moeda compartilhados.
 */

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Formata número como moeda BRL. Ex: 24.5 → "R$ 24,50" */
export function formatCurrency(value: number | null | undefined): string {
  const num = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return BRL.format(num);
}

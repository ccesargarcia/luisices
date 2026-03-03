/**
 * Utilitários de moeda compartilhados.
 */

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Formata número como moeda BRL. Ex: 24.5 → "R$ 24,50" */
export function formatCurrency(value: number): string {
  return BRL.format(value);
}

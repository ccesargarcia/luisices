/** Regras comuns para normalizar valores financeiros de pedidos e vendas. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula o valor recebido e o saldo a receber.
 * O status do pedido (por exemplo, concluído) não representa pagamento.
 * Apenas o status do pagamento "paid" quita automaticamente o total.
 */
export function calculatePaymentBalance(
  totalAmount: number,
  paidAmount: number | null | undefined,
  paymentStatus?: string | null,
): { paidAmount: number; remainingAmount: number } {
  const parsedTotal = Number(totalAmount);
  const parsedPaid = Number(paidAmount);
  const totalCents = Number.isFinite(parsedTotal) ? Math.max(0, Math.round(parsedTotal * 100)) : 0;
  const paidCents = paymentStatus === 'paid'
    ? totalCents
    : Math.min(totalCents, Math.max(0, Number.isFinite(parsedPaid) ? Math.round(parsedPaid * 100) : 0));

  return {
    paidAmount: paidCents / 100,
    remainingAmount: (totalCents - paidCents) / 100,
  };
}

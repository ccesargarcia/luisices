/** Monetary payment balance helpers for AI/MCP summaries and normalized orders. */
function toCents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) : 0;
}

function resolvePaymentAmounts(order = {}) {
  const totalCents = Math.max(0, toCents(order.totalPrice));
  const paymentStatus = String(order.paymentStatus || '').toLowerCase();
  const paidCents = paymentStatus === 'paid'
    ? totalCents
    : Math.min(totalCents, Math.max(0, toCents(order.paidAmount)));

  return {
    totalCents,
    paidCents,
    remainingCents: totalCents - paidCents,
    totalPrice: totalCents / 100,
    paidAmount: paidCents / 100,
    remainingAmount: (totalCents - paidCents) / 100,
  };
}

function sumPaymentCents(orders, field) {
  return orders.reduce((sum, order) => sum + resolvePaymentAmounts(order)[field], 0);
}

/**
 * Normaliza aliases de forma de pagamento (pt-BR e legados do schema MCP)
 * para o enum canônico PaymentMethod ('pix' | 'cash' | 'credit' | 'debit' | 'transfer').
 * Retorna null quando o valor não é reconhecido.
 */
function normalizePaymentMethod(value) {
  const aliases = {
    pix: 'pix',
    dinheiro: 'cash', cash: 'cash',
    cartao_credito: 'credit', credito: 'credit', credit: 'credit', cartao: 'credit',
    cartao_debito: 'debit', debito: 'debit', debit: 'debit',
    transferencia: 'transfer', transfer: 'transfer',
    outro: 'transfer', outros: 'transfer', other: 'transfer',
  };
  const alias = String(value || '').trim().toLowerCase();
  return Object.hasOwn(aliases, alias) ? aliases[alias] : null;
}

module.exports = { resolvePaymentAmounts, sumPaymentCents, normalizePaymentMethod };

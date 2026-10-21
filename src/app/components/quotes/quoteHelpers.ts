import { Quote, QuoteItem, QuoteStatus } from '../../types';
import { formatCurrency } from '../../utils/currency';

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviado',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  expired: 'Expirado',
};

export const STATUS_VARIANT: Record<QuoteStatus, string> = {
  draft: 'bg-secondary text-secondary-foreground',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

export const EMPTY_ITEM: QuoteItem = { name: '', quantity: 1, unitPrice: 0 };

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function formatDate(iso: string): string {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function isQuoteExpired(quote: Pick<Quote, 'status' | 'validUntil'>): boolean {
  if (!quote.validUntil || (quote.status !== 'draft' && quote.status !== 'sent')) return false;
  return quote.validUntil < todayStr();
}

export function defaultDelivery(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

export function calcTotal(items: QuoteItem[]): number {
  return roundCurrency(items.reduce((s, i) => s + lineSubtotal(i), 0));
}

export function lineSubtotal(item: Pick<QuoteItem, 'quantity' | 'unitPrice'>): number {
  return roundCurrency(item.quantity * item.unitPrice);
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateQuoteTotals(
  items: QuoteItem[], discount = 0, discountType: 'percent' | 'fixed' = 'percent'
): { subtotal: number; discountAmount: number; total: number } {
  const subtotal = calcTotal(items);
  const discountAmount = roundCurrency(discountType === 'percent' ? subtotal * discount / 100 : discount);
  return { subtotal, discountAmount, total: roundCurrency(subtotal - discountAmount) };
}

export function validateQuoteMath(items: QuoteItem[], discount = 0, discountType: 'percent' | 'fixed' = 'percent') {
  if (!Array.isArray(items) || items.length < 1 || items.length > 10) {
    throw new Error('O orçamento deve ter entre 1 e 10 itens.');
  }
  for (const item of items) {
    if (!item || typeof item.name !== 'string' || !item.name.trim() || item.name.trim().length > 300
      || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000
      || !Number.isFinite(item.unitPrice) || item.unitPrice < 0 || item.unitPrice > 1000000
      || Math.round((item.unitPrice + Number.EPSILON) * 100) / 100 !== item.unitPrice) {
      throw new Error('Revise os itens: nome, quantidade ou preço inválido.');
    }
  }
  if (!Number.isFinite(discount) || discount < 0
    || Math.round((discount + Number.EPSILON) * 100) / 100 !== discount
    || !['percent', 'fixed'].includes(discountType)
    || (discountType === 'percent' && discount > 100)) {
    throw new Error('Desconto inválido.');
  }
  const totals = calculateQuoteTotals(items, discount, discountType);
  if (totals.discountAmount > totals.subtotal) {
    throw new Error('O desconto não pode ser maior que o subtotal do orçamento.');
  }
  return totals;
}

export function buildWhatsAppMessage(
  quote: Quote,
  settings?: { whatsappGreeting?: string; whatsappSignature?: string }
): string {
  const lines: string[] = [];
  const greeting = settings?.whatsappGreeting
    ? settings.whatsappGreeting
        .replace('{nome}', quote.customerName)
        .replace('{numero}', quote.quoteNumber)
    : `Olá ${quote.customerName}! Segue o orçamento *${quote.quoteNumber}*:`;
  lines.push(greeting);
  lines.push('');
  lines.push('*Itens:*');
  for (const item of quote.items) {
    const sub = formatCurrency(item.quantity * item.unitPrice);
    lines.push(`• ${item.name} — ${item.quantity}x ${formatCurrency(item.unitPrice)} = ${sub}`);
  }
  lines.push('');
  lines.push(`*Total: ${formatCurrency(quote.totalPrice)}*`);
  if (quote.discount) {
    const discountLabel =
      quote.discountType === 'percent'
        ? `${quote.discount}%`
        : formatCurrency(quote.discount);
    lines.push(`_(desconto de ${discountLabel} já incluído)_`);
  }
  lines.push(`Prazo de entrega: ${formatDate(quote.deliveryDate)}`);
  if (quote.deliveryType === 'pickup') lines.push('Forma de entrega: Retirada na loja');
  if (quote.deliveryType === 'delivery') {
    lines.push(
      `Forma de entrega: Entrega${quote.deliveryAddress ? ` no endereço: ${quote.deliveryAddress}` : ''}`
    );
  }
  if (quote.paymentCondition) lines.push(`Pagamento: ${quote.paymentCondition}`);
  if (quote.validUntil) lines.push(`Válido até: ${formatDate(quote.validUntil)}`);
  if (quote.notes) {
    lines.push('');
    lines.push(quote.notes);
  }
  if (settings?.whatsappSignature) {
    lines.push('');
    lines.push(settings.whatsappSignature);
  }
  return lines.join('\n');
}

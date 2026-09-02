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

export function defaultDelivery(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

export function calcTotal(items: QuoteItem[]): number {
  return items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
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

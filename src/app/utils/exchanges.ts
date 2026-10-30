import type { ExchangeItem } from '../types';
import { parseLocalDate } from './date';

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!);
}

export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  // Prefix formula-like values before CSV quoting to prevent spreadsheet execution.
  if (/^[\s\u0000-\u001f\uFEFF]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function getExchangeItemsValue(items?: ExchangeItem[] | null): number {
  return (items || []).reduce((sum, item) => {
    const quantity = Number.isFinite(item.quantity) ? Math.max(0, item.quantity) : 0;
    const value = Number.isFinite(item.value) ? Math.max(0, item.value || 0) : 0;
    return sum + Math.round(quantity * value * 100) / 100;
  }, 0);
}

export function isExchangeDateInRange(dateStr: string, start: Date, end: Date = new Date()): boolean {
  const date = parseLocalDate(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const endOfDay = new Date(end);
  endOfDay.setHours(23, 59, 59, 999);
  return date >= start && date <= endOfDay;
}

export function formatExchangeItems(items?: ExchangeItem[] | null, formatCurrency = (n: number) => `R$ ${n.toFixed(2)}`): string {
  return (items || []).map(item => {
    const line = `${item.quantity} × ${item.name}`;
    return item.value == null ? line : `${line} (${formatCurrency(item.value * item.quantity)})`;
  }).join('\n');
}

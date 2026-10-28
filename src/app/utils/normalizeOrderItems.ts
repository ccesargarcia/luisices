import type { OrderItem } from '../types';

type OrderItemLike = Partial<OrderItem> & {
  name?: string;
  quantity?: number | string;
  unitPrice?: number | string | null;
  price?: number | string | null;
};

/**
 * Recover legacy/MCP items whose unitPrice was stored as zero while their
 * persisted line subtotal is positive. Firestore order totals remain the
 * source of truth; this only repairs the per-item display/edit representation.
 */
export function normalizeOrderItems<T extends OrderItemLike>(items: T[]): T[] {
  return items.map((item) => {
    const unitPrice = Number(item.unitPrice);
    const quantity = Number(item.quantity);
    const subtotal = Number(item.price);

    if (Number.isFinite(unitPrice) && unitPrice > 0) return item;
    if (unitPrice !== 0 || !Number.isSafeInteger(quantity) || quantity < 1
      || !Number.isFinite(subtotal) || subtotal <= 0) return item;

    const subtotalCents = Math.round(subtotal * 100);
    if (Math.abs(subtotal * 100 - subtotalCents) > 0.001 || subtotalCents % quantity !== 0) return item;

    return { ...item, unitPrice: (subtotalCents / quantity) / 100 } as T;
  });
}

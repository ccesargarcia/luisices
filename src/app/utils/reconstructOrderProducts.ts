import { formatDecimalMoneyInput } from './formatDecimalMoneyInput';
import { parseDecimalMoneyInput } from './parseDecimalMoneyInput';
import { OrderItem } from '../types';
import { normalizeOrderItems } from './normalizeOrderItems';

export interface EditableOrderProduct {
  name: string;
  quantity: string;
  unitPrice: string;
}

/** Rebuild editable rows from stored items or legacy order fields while preserving totals. */
export function reconstructOrderProducts(
  productName: string,
  orderQuantity: number,
  orderPrice: number,
  knownUnitPrice?: number | null,
  storedItems?: OrderItem[] | Array<{ name: string; quantity: number | string; unitPrice?: number | string | null }> | null,
): EditableOrderProduct[] {
  // If structured items exist in storage, use them directly with exact unit prices
  if (storedItems && Array.isArray(storedItems) && storedItems.length > 0) {
    return normalizeOrderItems(storedItems).map(item => {
      let unitPriceStr = '';
      if (typeof item.unitPrice === 'number' && Number.isFinite(item.unitPrice)) {
        unitPriceStr = formatDecimalMoneyInput(item.unitPrice);
      } else if (typeof item.unitPrice === 'string' && item.unitPrice.trim()) {
        const parsed = parseDecimalMoneyInput(item.unitPrice);
        unitPriceStr = parsed !== null ? formatDecimalMoneyInput(parsed) : item.unitPrice.trim();
      }
      return {
        name: item.name || '',
        quantity: String(item.quantity ?? '1'),
        unitPrice: unitPriceStr,
      };
    });
  }

  const names = productName.split(/,(?!\d)/).map(name => name.trim()).filter(Boolean);
  const rows = names.map(rawName => {
    let cleanName = rawName;
    let extractedUnitPrice: number | null = null;

    // Detect embedded price in item string (e.g. "Caderno (2x) - R$ 50,00", "Caderno R$ 50 (2x)", "Caneca - 35,00")
    const pricePattern = /(?:[-–—]\s*|\s+)(?:R\$\s*|unit[.:]?\s*|cada\s*|valor:\s*)(\d+(?:[.,]\d{1,2})?)/i;
    const priceMatch = cleanName.match(pricePattern);
    if (priceMatch) {
      const parsed = parseDecimalMoneyInput(priceMatch[1]);
      if (parsed !== null && parsed > 0) {
        extractedUnitPrice = parsed;
        cleanName = cleanName.replace(priceMatch[0], '').trim();
      }
    }

    const match = cleanName.match(/^(.+?)\s*\((\d+)x\)$/);
    return {
      name: match ? match[1].trim() : cleanName,
      quantity: match ? Number.parseInt(match[2], 10) : names.length === 1 ? orderQuantity : 1,
      extractedUnitPrice,
    };
  });

  const quantity = rows.reduce((sum, row) => sum + row.quantity, 0) || orderQuantity || 1;
  const average = orderPrice / quantity;
  const averageInCents = Math.round(average * 100);
  // Only use an inferred price when the saved total maps exactly to whole cents
  // per unit. For multi-product or fractional-cent legacy orders, the individual
  // prices cannot be recovered from the aggregate total, so leave them unknown.
  const inferredUnitPrice = rows.length === 1 && Math.abs(average * 100 - averageInCents) < 1e-8
    ? averageInCents / 100
    : null;
  const globalUnitPrice = typeof knownUnitPrice === 'number' && Number.isFinite(knownUnitPrice)
    ? knownUnitPrice
    : inferredUnitPrice;
  const defaultDisplayUnitPrice = globalUnitPrice === null ? '' : formatDecimalMoneyInput(globalUnitPrice);

  return rows.map(row => ({
    name: row.name,
    quantity: String(row.quantity),
    unitPrice: row.extractedUnitPrice !== null
      ? formatDecimalMoneyInput(row.extractedUnitPrice)
      : defaultDisplayUnitPrice,
  }));
}

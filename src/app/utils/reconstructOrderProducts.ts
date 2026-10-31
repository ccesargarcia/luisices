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

  const names = (productName || '')
    .split(/(?:,(?!\d)|\n+|;\s*|\s+\+\s+)/)
    .map(name => name.trim())
    .filter(Boolean);

  const pricePatterns = [
    /(?:[-–—]\s*|\s+)(?:(?:no|ao)\s+valor\s+de|valor\s+de|valor:|preço\s+de|preço:)\s*(?:R\$\s*)?(\d+(?:[.,]\d{1,2})?)(?:\s*(?:reais|cada|\/un|unidade|por\s+unidade))?/i,
    /(?:[-–—]\s*|\s+)(?:a|por|de)\s+(?:R\$\s*)(\d+(?:[.,]\d{1,2})?)(?:\s*(?:reais|cada|\/un|unidade|por\s+unidade))?/i,
    /(?:[-–—]\s*|\s+)(\d+(?:[.,]\d{1,2})?)\s*(?:reais\s+cada|cada|\/un|por\s+unidade)/i,
    /(?:[-–—]\s*|\s+)(?:R\$\s*|unit[.:]?\s*|cada\s*)(\d+(?:[.,]\d{1,2})?)(?:\s*(?:reais|cada|\/un|unidade|por\s+unidade))?/i,
    /(?:[-–—]\s+)(\d+(?:[.,]\d{1,2})?)(?:\s*(?:reais|\/un|unidade))?$/i,
  ];

  const rows = names.map(rawName => {
    let cleanName = rawName;
    let extractedUnitPrice: number | null = null;

    for (const pat of pricePatterns) {
      const priceMatch = cleanName.match(pat);
      if (priceMatch) {
        const parsed = parseDecimalMoneyInput(priceMatch[1]);
        if (parsed !== null && parsed > 0) {
          extractedUnitPrice = parsed;
          cleanName = cleanName.replace(priceMatch[0], '').trim();
          break;
        }
      }
    }
    cleanName = cleanName.replace(/(?:[-–—]\s*|\s+)(?:cada|reais|no valor de)$/i, '').trim();

    let quantity = names.length === 1 ? orderQuantity : 1;
    let match: RegExpMatchArray | null = null;
    if ((match = cleanName.match(/^(.+?)\s*\((\d+)x\)$/i))) {
      quantity = parseInt(match[2], 10);
      cleanName = match[1].trim();
    } else if ((match = cleanName.match(/^(.+?)\s*\((\d+)\s*(?:un(?:idades?)?|itens?|items?|pcs|peças?)\)$/i))) {
      quantity = parseInt(match[2], 10);
      cleanName = match[1].trim();
    } else if ((match = cleanName.match(/^(.+?)\s*[-–—]\s*(\d+)x$/i))) {
      quantity = parseInt(match[2], 10);
      cleanName = match[1].trim();
    } else if ((match = cleanName.match(/^(\d+)x\s+(.+)$/i))) {
      quantity = parseInt(match[1], 10);
      cleanName = match[2].trim();
    } else if ((match = cleanName.match(/^(\d+)\s+(?:itens?|items?|unidades?|un|peças?|pcs)\s+de\s+(.+)$/i))) {
      quantity = parseInt(match[1], 10);
      cleanName = match[2].trim();
    } else if ((match = cleanName.match(/^(\d+)\s+(?:itens?|items?|unidades?|un|peças?|pcs)\s+(.+)$/i))) {
      quantity = parseInt(match[1], 10);
      cleanName = match[2].trim();
    } else if ((match = cleanName.match(/^(\d+)\s+(itens?|items?|unidades?|un|peças?|pcs)$/i))) {
      quantity = parseInt(match[1], 10);
      cleanName = match[2].trim();
    } else if ((match = cleanName.match(/^(\d+)\s+(.+)$/i))) {
      quantity = parseInt(match[1], 10);
      cleanName = match[2].trim();
    }

    return {
      name: cleanName,
      quantity,
      extractedUnitPrice,
    };
  });

  // Infer missing unit price when exactly one row is missing its price and all other rows have known extracted unit prices
  const rowsMissingPrice = rows.filter(r => r.extractedUnitPrice === null);
  if (rowsMissingPrice.length === 1 && rows.length > 1) {
    const knownTotalCents = rows
      .filter(r => r.extractedUnitPrice !== null)
      .reduce((sum, r) => sum + Math.round(r.extractedUnitPrice! * 100) * r.quantity, 0);
    const orderTotalCents = Math.round(orderPrice * 100);
    const remainingCents = orderTotalCents - knownTotalCents;
    const targetRow = rowsMissingPrice[0];
    if (remainingCents > 0 && targetRow.quantity > 0 && remainingCents % targetRow.quantity === 0) {
      targetRow.extractedUnitPrice = (remainingCents / targetRow.quantity) / 100;
    }
  }

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

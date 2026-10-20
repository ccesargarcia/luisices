import { formatDecimalMoneyInput } from './formatDecimalMoneyInput';

export interface EditableOrderProduct {
  name: string;
  quantity: string;
  unitPrice: string;
}

/** Rebuild editable rows from the legacy order fields while preserving its total. */
export function reconstructOrderProducts(
  productName: string,
  orderQuantity: number,
  orderPrice: number,
  knownUnitPrice?: number | null,
): EditableOrderProduct[] {
  const names = productName.split(',').map(name => name.trim()).filter(Boolean);
  const rows = names.map(name => {
    const match = name.match(/^(.+?)\s*\((\d+)x\)$/);
    return {
      name: match ? match[1].trim() : name,
      quantity: match ? Number.parseInt(match[2], 10) : names.length === 1 ? orderQuantity : 1,
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
  const unitPrice = typeof knownUnitPrice === 'number' && Number.isFinite(knownUnitPrice)
    ? knownUnitPrice
    : inferredUnitPrice;
  const displayUnitPrice = unitPrice === null ? '' : formatDecimalMoneyInput(unitPrice);

  return rows.map(row => ({
    name: row.name,
    quantity: String(row.quantity),
    unitPrice: displayUnitPrice,
  }));
}

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
  const unitPrice = orderPrice / quantity;

  return rows.map(row => ({
    name: row.name,
    quantity: String(row.quantity),
    unitPrice: String(unitPrice),
  }));
}

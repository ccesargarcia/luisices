import type { ParsedOrderRow } from './importOrdersExcel';

/** Revalida as alterações da prévia sem gravar pedidos ou modificar a linha original. */
export function updateReviewedImportRow(row: ParsedOrderRow, changes: Partial<ParsedOrderRow>): ParsedOrderRow {
  const next = { ...row, ...changes };
  next.customerName = typeof next.customerName === 'string' ? next.customerName.trim() : '';
  next.productName = typeof next.productName === 'string' ? next.productName.trim() : '';
  next.customerPhone = typeof next.customerPhone === 'string' ? next.customerPhone.trim() : '';
  next.customerEmail = typeof next.customerEmail === 'string' ? next.customerEmail.trim() || undefined : undefined;
  const errors: string[] = [];
  if (!next.customerName) errors.push('Nome do cliente é obrigatório.');
  if (next.customerName.length > 200) errors.push('Nome do cliente deve ter no máximo 200 caracteres.');
  if (!next.productName) errors.push('Nome do produto é obrigatório.');
  if (next.productName.length > 300) errors.push('Nome do produto deve ter no máximo 300 caracteres.');
  if (!Number.isInteger(next.quantity) || next.quantity <= 0 || next.quantity > 10000) errors.push('Quantidade deve ser um número inteiro entre 1 e 10.000.');
  if (!Number.isFinite(next.price) || next.price < 0 || next.price > 1000000) errors.push('Valor total deve estar entre zero e R$ 1.000.000.');
  if (!Number.isFinite(next.paidAmount) || next.paidAmount < 0 || next.paidAmount > next.price) errors.push('Valor pago deve estar entre zero e o valor total.');
  const date = new Date(`${next.deliveryDate}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next.deliveryDate) || next.deliveryDate.startsWith('0000-') || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== next.deliveryDate) errors.push('Data de entrega inválida.');
  if (next.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.customerEmail)) errors.push('E-mail do cliente inválido.');
  if (!['pending', 'in-progress', 'completed', 'cancelled'].includes(next.status)) errors.push('Status do pedido inválido.');
  if (!['pending', 'partial', 'paid'].includes(next.paymentStatus)) errors.push('Status do pagamento inválido.');
  if (next.paymentStatus === 'paid' && next.paidAmount !== next.price) errors.push('Pagamento quitado exige valor pago igual ao total.');
  if (next.paymentStatus === 'pending' && next.paidAmount !== 0) errors.push('Pagamento pendente exige valor pago zero.');
  if (next.paymentStatus === 'partial' && !(next.paidAmount > 0 && next.paidAmount < next.price)) errors.push('Pagamento parcial exige valor pago entre zero e o total.');
  if (next.paymentMethod && !['pix', 'cash', 'credit', 'debit', 'transfer'].includes(next.paymentMethod)) errors.push('Forma de pagamento inválida.');
  if (typeof row.customerPhone !== 'string' && changes.customerPhone === undefined || next.customerPhone.length > 50) errors.push('Telefone deve conter no máximo 50 caracteres.');
  if (next.customerEmail && next.customerEmail.length > 254) errors.push('E-mail deve conter no máximo 254 caracteres.');
  if (next.notes != null && (typeof next.notes !== 'string' || next.notes.length > 1000)) errors.push('Observações devem conter no máximo 1.000 caracteres.');
  if (next.tags != null && (!Array.isArray(next.tags) || next.tags.length > 20 || next.tags.some(tag => !tag || typeof tag.name !== 'string' || !tag.name.trim() || tag.name.length > 80 || typeof tag.color !== 'string' || !/^#[a-fA-F0-9]{6}([a-fA-F0-9]{2})?$/.test(tag.color)))) errors.push('Etiquetas inválidas: use até 20 etiquetas, com nomes de até 80 caracteres e cores hexadecimais.');
  next.remainingAmount = Number.isFinite(next.price) && Number.isFinite(next.paidAmount) ? Math.max(0, Math.round((next.price - next.paidAmount) * 100) / 100) : 0;
  next.errors = errors;
  next.isValid = errors.length === 0;
  next.warnings = [ ...(next.price === 0 ? ['Valor total do pedido é R$ 0,00.'] : []), ...(!next.customerPhone ? ['Telefone do cliente não informado.'] : []) ];
  return next;
}

export function getSelectedImportRows(rows: ParsedOrderRow[], selectedIds: ReadonlySet<number>): ParsedOrderRow[] {
  return rows.filter(row => selectedIds.has(row.rowIndex));
}

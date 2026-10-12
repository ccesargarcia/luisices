import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select';
import type { ParsedOrderRow } from '../../utils/importOrdersExcel';
import { parseTagsValue } from '../../utils/importOrdersExcel';
import { updateReviewedImportRow } from '../../utils/importOrdersReview';

function money(value: string): number {
  const clean = value.trim().replace(/R\$|\s/g, '');
  if (!clean) return NaN;
  const amount = Number(clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean);
  return Math.round(amount * 100) / 100;
}

export function ImportOrderRowEditor({ row, onSave, onCancel }: { row: ParsedOrderRow; onSave: (row: ParsedOrderRow) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState({
    customerName: row.customerName, customerPhone: row.customerPhone, customerEmail: row.customerEmail || '',
    productName: row.productName, quantity: String(row.quantity), price: String(row.price),
    deliveryDate: row.deliveryDate, status: row.status, paymentStatus: row.paymentStatus,
    paidAmount: String(row.paidAmount), paymentMethod: row.paymentMethod || '', notes: row.notes || '',
    tags: (row.tags || []).map(tag => tag.name).join(', '),
  });
  const [errors, setErrors] = useState<string[]>([]);
  const set = (field: keyof typeof draft, value: string) => setDraft(previous => ({ ...previous, [field]: value }));
  const input = (field: keyof typeof draft, label: string, type = 'text', inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']) => (
    <div className="min-w-0 space-y-1">
      <Label htmlFor={`import-edit-${field}`}>{label}</Label>
      <Input id={`import-edit-${field}`} type={type} inputMode={inputMode} value={draft[field]} onChange={event => set(field, event.target.value)} className="min-h-11 w-full" />
    </div>
  );
  const select = (field: 'status' | 'paymentStatus' | 'paymentMethod', label: string, options: [string, string][]) => (
    <div className="min-w-0 space-y-1">
      <Label htmlFor={`import-edit-${field}`}>{label}</Label>
      <Select value={draft[field] || 'none'} onValueChange={selected => {
        const value = selected === 'none' ? '' : selected;
        setDraft(previous => ({ ...previous, [field]: value, ...(field === 'paymentStatus' && value === 'paid' ? { paidAmount: previous.price } : field === 'paymentStatus' && value === 'pending' ? { paidAmount: '0' } : {}) }));
      }}>
        <SelectTrigger id={`import-edit-${field}`} className="min-h-11 w-full min-w-0"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(([value, text]) => <SelectItem key={value || 'none'} value={value || 'none'}>{text}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
  return (
    <form className="rounded-xl border border-primary/30 bg-card p-3 sm:p-4 space-y-4 min-w-0" aria-label={`Editar linha ${row.rowIndex}`} onSubmit={event => {
      event.preventDefault();
      const edited = updateReviewedImportRow(row, {
        customerName: draft.customerName, customerPhone: draft.customerPhone, customerEmail: draft.customerEmail,
        productName: draft.productName, quantity: draft.quantity.trim() ? Number(draft.quantity) : NaN,
        price: money(draft.price), deliveryDate: draft.deliveryDate, status: draft.status,
        paymentStatus: draft.paymentStatus, paidAmount: money(draft.paidAmount), paymentMethod: draft.paymentMethod as ParsedOrderRow['paymentMethod'] || null,
        notes: draft.notes, tags: draft.tags === (row.tags || []).map(tag => tag.name).join(', ') ? row.tags : parseTagsValue(draft.tags),
      });
      if (!edited.isValid) { setErrors(edited.errors); return; }
      onSave(edited);
    }}>
      <h3 className="font-semibold text-sm">Editar linha #{row.rowIndex}</h3>
      <p className="text-xs text-muted-foreground">As alterações serão usadas apenas ao importar os pedidos selecionados.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {input('customerName', 'Cliente')}{input('customerPhone', 'Telefone', 'tel')}{input('customerEmail', 'E-mail', 'email')}
        {input('productName', 'Produto')}{input('quantity', 'Quantidade', 'text', 'numeric')}{input('price', 'Valor total', 'text', 'decimal')}
        {input('deliveryDate', 'Entrega', 'date')}
        {select('status', 'Status do pedido', [['pending', 'Pendente'], ['in-progress', 'Em Produção'], ['completed', 'Concluído'], ['cancelled', 'Cancelado']])}
        {select('paymentStatus', 'Status do pagamento', [['pending', 'Pendente'], ['partial', 'Parcial'], ['paid', 'Pago']])}
        {input('paidAmount', 'Valor pago', 'text', 'decimal')}
        {select('paymentMethod', 'Forma de pagamento', [['', 'Não informada'], ['pix', 'Pix'], ['cash', 'Dinheiro'], ['credit', 'Crédito'], ['debit', 'Débito'], ['transfer', 'Transferência']])}
        {input('tags', 'Etiquetas (separadas por vírgula)')}
        <div className="sm:col-span-2 space-y-1"><Label htmlFor="import-edit-notes">Observações</Label><Textarea id="import-edit-notes" value={draft.notes} onChange={event => set('notes', event.target.value)} /></div>
      </div>
      {errors.length > 0 && <ul className="text-sm text-destructive space-y-1" role="alert">{errors.map(error => <li key={error}>{error}</li>)}</ul>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" className="min-h-11" onClick={onCancel}>Descartar edição</Button>
        <Button type="submit" className="min-h-11">Salvar alterações</Button>
      </div>
    </form>
  );
}

import React, { useState, useEffect } from 'react';
import { Quote, QuoteItem, QuoteStatus, Customer, Tag, Product } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { TagInput } from '../TagInput';
import { useAuth } from '../../../contexts/AuthContext';
import { firebaseCustomerService } from '../../../services/firebaseCustomerService';
import { firebaseProductService } from '../../../services/firebaseProductService';
import { firebaseQuoteService } from '../../../services/firebaseQuoteService';
import { trackQuoteCreated } from '../../../services/analyticsService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  Plus,
  Trash2,
  Loader2,
  UserPlus,
  AlertTriangle,
  Truck,
  BookOpen,
} from 'lucide-react';
import { EMPTY_ITEM, defaultDelivery, calcTotal } from './quoteHelpers';
import { toast } from 'sonner';

interface FormState {
  customerName: string;
  customerPhone: string;
  customerId?: string;
  items: QuoteItem[];
  discount: string;
  discountType: 'percent' | 'fixed';
  paymentCondition: string;
  deliveryType: 'pickup' | 'delivery' | '';
  deliveryAddress: string;
  deliveryDate: string;
  validUntil: string;
  notes: string;
  tags: Tag[];
  cardColor: string;
  status: QuoteStatus;
}

function emptyForm(): FormState {
  return {
    customerName: '',
    customerPhone: '',
    customerId: undefined,
    items: [{ ...EMPTY_ITEM }],
    discount: '',
    discountType: 'percent',
    paymentCondition: '',
    deliveryType: '',
    deliveryAddress: '',
    deliveryDate: defaultDelivery(),
    validUntil: '',
    notes: '',
    tags: [],
    cardColor: '',
    status: 'draft',
  };
}

function formFromQuote(q: Quote): FormState {
  return {
    customerName: q.customerName,
    customerPhone: q.customerPhone,
    customerId: q.customerId,
    items: q.items.length ? q.items : [{ ...EMPTY_ITEM }],
    discount: q.discount != null ? String(q.discount) : '',
    discountType: q.discountType ?? 'percent',
    paymentCondition: q.paymentCondition || '',
    deliveryType: q.deliveryType || '',
    deliveryAddress: q.deliveryAddress || '',
    deliveryDate: q.deliveryDate,
    validUntil: q.validUntil || '',
    notes: q.notes || '',
    tags: q.tags || [],
    cardColor: q.cardColor || '',
    status: q.status,
  };
}

interface QuoteFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Quote | null;
  onSaved: () => void;
}

export function QuoteFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: QuoteFormDialogProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(editing ? formFromQuote(editing) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogOpenIdx, setCatalogOpenIdx] = useState<number | null>(null);

  // Reset form whenever dialog opens
  useEffect(() => {
    if (open) {
      setForm(editing ? formFromQuote(editing) : emptyForm());
      setSelectedCustomer(editing?.customerId ?? '');
    }
  }, [open, editing]);

  // Load registered customers when dialog opens
  useEffect(() => {
    if (open && user) {
      firebaseCustomerService.getCustomers(user.uid).then(setCustomers);
      firebaseProductService.getProducts().then(setCatalogProducts);
    }
  }, [open, user]);

  // Fill form fields when a customer is selected from the list
  useEffect(() => {
    if (selectedCustomer && selectedCustomer !== 'new') {
      const c = customers.find((c) => c.id === selectedCustomer);
      if (c) {
        setForm((f) => ({
          ...f,
          customerName: c.name,
          customerPhone: c.phone,
          customerId: c.id,
        }));
      }
    } else if (selectedCustomer === 'new') {
      setForm((f) => ({ ...f, customerName: '', customerPhone: '', customerId: undefined }));
    }
  }, [selectedCustomer, customers]);

  function handleOpen(v: boolean) {
    onOpenChange(v);
  }

  function setItem(idx: number, field: keyof QuoteItem, value: string | number) {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: field === 'name' ? value : Number(value) };
      return { ...f, items };
    });
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  }

  function removeItem(idx: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  const subtotal = calcTotal(form.items);
  const discountAmt = form.discount
    ? form.discountType === 'percent'
      ? subtotal * (parseFloat(form.discount) / 100)
      : parseFloat(form.discount)
    : 0;
  const finalTotal = Math.max(0, subtotal - discountAmt);

  async function handleSave() {
    if (!form.customerName.trim()) {
      toast.error('Informe o nome do cliente');
      return;
    }
    if (!form.customerPhone.trim()) {
      toast.error('Informe o telefone do cliente');
      return;
    }
    if (form.items.some((i) => !i.name.trim())) {
      toast.error('Preencha o nome de todos os itens');
      return;
    }
    if (!form.deliveryDate) {
      toast.error('Informe a data de entrega');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Quote> = {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerId: form.customerId,
        items: form.items,
        totalPrice: finalTotal,
        discount: form.discount ? parseFloat(form.discount) : undefined,
        discountType: form.discount ? form.discountType : undefined,
        paymentCondition: form.paymentCondition.trim() || undefined,
        deliveryType: form.deliveryType || undefined,
        deliveryAddress:
          form.deliveryType === 'delivery'
            ? form.deliveryAddress.trim() || undefined
            : undefined,
        status: form.status,
        deliveryDate: form.deliveryDate,
        validUntil: form.validUntil || undefined,
        notes: form.notes || undefined,
        tags: form.tags.length ? form.tags : undefined,
        cardColor: form.cardColor || undefined,
      };

      if (editing) {
        await firebaseQuoteService.updateQuote(editing.id, payload);
        toast.success('Orçamento atualizado!');
      } else {
        const createdQuote = await firebaseQuoteService.createQuote(payload);
        trackQuoteCreated(
          createdQuote.id,
          form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
        );
        toast.success('Orçamento criado!');
      }
      onSaved();
      handleOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar orçamento');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="w-full max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Orçamento' : 'Novo Orçamento'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Cliente */}
          <div className="space-y-3">
            <Label htmlFor="q-customer">Cliente *</Label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger id="q-customer">
                <SelectValue placeholder="Selecione um cliente cadastrado ou insira manualmente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">
                  <div className="flex items-center gap-2">
                    <UserPlus className="size-4" />
                    Novo cliente (digitar manualmente)
                  </div>
                </SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — {c.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Defaulter warning */}
            {(() => {
              const c = customers.find((c) => c.id === selectedCustomer);
              return c?.status === 'defaulter' ? (
                <Alert className="border-red-300 bg-red-50 dark:bg-red-950/20 py-2 px-3">
                  <AlertDescription className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                    <AlertTriangle className="size-4 shrink-0" />
                    Este cliente está marcado como <strong>Inadimplente</strong>. Verifique pendências.
                  </AlertDescription>
                </Alert>
              ) : null;
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="q-cname">Nome do cliente *</Label>
                <Input
                  id="q-cname"
                  placeholder="Nome do cliente"
                  value={form.customerName}
                  disabled={!!selectedCustomer && selectedCustomer !== 'new'}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="q-cphone">Telefone *</Label>
                <Input
                  id="q-cphone"
                  placeholder="(11) 99999-9999"
                  value={form.customerPhone}
                  disabled={!!selectedCustomer && selectedCustomer !== 'new'}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Itens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens / Produtos *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="size-3 mr-1" /> Adicionar item
              </Button>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <div className="min-w-[300px]">
                {/* Header */}
                <div className="grid grid-cols-[30px_1fr_52px_76px_76px_30px] gap-1.5 px-2 py-2 bg-muted text-xs font-medium text-muted-foreground">
                  <span />
                  <span>Produto / Serviço</span>
                  <span className="text-center">Qtd</span>
                  <span className="text-right">Unit.</span>
                  <span className="text-right">Subtotal</span>
                  <span />
                </div>
                {form.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[30px_1fr_52px_76px_76px_30px] gap-1.5 items-center px-2 py-2 border-t"
                  >
                    {/* Catalog picker button */}
                    <Popover
                      open={catalogOpenIdx === idx}
                      onOpenChange={(v) => {
                        setCatalogOpenIdx(v ? idx : null);
                        if (v) setCatalogSearch('');
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-8"
                          title="Selecionar produto"
                        >
                          <BookOpen className="size-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2" align="start">
                        <Input
                          placeholder="Buscar produto..."
                          value={catalogSearch}
                          onChange={(e) => setCatalogSearch(e.target.value)}
                          className="h-8 text-sm mb-2"
                          autoFocus
                        />
                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                          {catalogProducts
                            .filter(
                              (p) =>
                                !catalogSearch ||
                                p.name.toLowerCase().includes(catalogSearch.toLowerCase())
                            )
                            .map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted text-sm text-left"
                                onClick={() => {
                                  setItem(idx, 'name', p.name);
                                  setItem(idx, 'unitPrice', p.unitPrice);
                                  setCatalogOpenIdx(null);
                                }}
                              >
                                <span className="truncate">{p.name}</span>
                                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                  {formatCurrency(p.unitPrice)}
                                </span>
                              </button>
                            ))}
                          {catalogProducts.filter(
                            (p) =>
                              !catalogSearch ||
                              p.name.toLowerCase().includes(catalogSearch.toLowerCase())
                          ).length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              Nenhum produto encontrado
                            </p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Input
                      placeholder="Ex: Camiseta personalizada"
                      value={item.name}
                      onChange={(e) => setItem(idx, 'name', e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => setItem(idx, 'quantity', e.target.value)}
                      className="h-8 text-sm text-center"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0,00"
                      value={item.unitPrice || ''}
                      onChange={(e) => setItem(idx, 'unitPrice', e.target.value)}
                      className="h-8 text-sm text-right"
                    />
                    <div className="text-sm font-medium text-right pr-1">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      disabled={form.items.length === 1}
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}

                {/* Subtotal / Desconto / Total */}
                {discountAmt > 0 && (
                  <div className="grid grid-cols-[1fr_52px_76px_76px_30px] gap-1.5 items-center px-2 py-2 bg-muted border-t">
                    <span className="col-span-3 text-sm text-right text-muted-foreground">
                      Subtotal
                    </span>
                    <span className="text-sm text-right text-muted-foreground">
                      {formatCurrency(subtotal)}
                    </span>
                    <span />
                  </div>
                )}
                {discountAmt > 0 && (
                  <div className="grid grid-cols-[1fr_52px_76px_76px_30px] gap-1.5 items-center px-2 py-2 bg-muted border-t">
                    <span className="col-span-3 text-sm text-right text-green-700 dark:text-green-400">
                      Desconto (
                      {form.discountType === 'percent'
                        ? `${form.discount}%`
                        : formatCurrency(parseFloat(form.discount))}
                      )
                    </span>
                    <span className="text-sm text-right text-green-700 dark:text-green-400">
                      -{formatCurrency(discountAmt)}
                    </span>
                    <span />
                  </div>
                )}
                <div className="grid grid-cols-[1fr_52px_76px_76px_30px] gap-1.5 items-center px-2 py-2 bg-muted border-t">
                  <span className="col-span-3 text-sm font-semibold text-right">Total</span>
                  <span className="text-sm font-bold text-right">
                    {formatCurrency(finalTotal)}
                  </span>
                  <span />
                </div>
              </div>
            </div>
          </div>

          {/* Datas + custo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="q-delivery">Data de entrega *</Label>
              <Input
                id="q-delivery"
                type="date"
                value={form.deliveryDate}
                onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-valid">Válido até (opcional)</Label>
              <Input
                id="q-valid"
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as QuoteStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Desconto + Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Desconto (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.value })}
                />
                <Select
                  value={form.discountType}
                  onValueChange={(v) =>
                    setForm({ ...form, discountType: v as 'percent' | 'fixed' })
                  }
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">%</SelectItem>
                    <SelectItem value="fixed">R$</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-payment">Condição de pagamento</Label>
              <Input
                id="q-payment"
                list="payment-options"
                placeholder="Ex: 50% entrada + 50% na entrega"
                value={form.paymentCondition}
                onChange={(e) => setForm({ ...form, paymentCondition: e.target.value })}
              />
              <datalist id="payment-options">
                <option value="À vista" />
                <option value="PIX" />
                <option value="50% entrada + 50% na entrega" />
                <option value="30% entrada + 70% na entrega" />
                <option value="Parcelado 2x" />
                <option value="Parcelado 3x" />
                <option value="Parcelado 6x" />
                <option value="Parcelado 12x" />
                <option value="Boleto 30 dias" />
                <option value="Cartão de crédito" />
              </datalist>
            </div>
          </div>

          {/* Forma de entrega */}
          <div className="space-y-2">
            <Label>Forma de entrega</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={form.deliveryType === 'pickup' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm({ ...form, deliveryType: 'pickup', deliveryAddress: '' })}
              >
                Retirada na loja
              </Button>
              <Button
                type="button"
                variant={form.deliveryType === 'delivery' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm({ ...form, deliveryType: 'delivery' })}
              >
                <Truck className="size-4 mr-1.5" /> Entrega
              </Button>
            </div>
            {form.deliveryType === 'delivery' && (
              <Input
                placeholder="Endereço de entrega"
                value={form.deliveryAddress}
                onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
              />
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="q-notes">Observações</Label>
            <Textarea
              id="q-notes"
              placeholder="Detalhes adicionais do orçamento..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput
              tags={form.tags}
              onChange={(tags) => setForm({ ...form, tags })}
              placeholder="Adicionar tag..."
            />
          </div>

          {/* Cor do card */}
          <div className="space-y-2">
            <Label>Cor do card</Label>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => setForm({ ...form, cardColor: '' })}
                className={`size-7 rounded-full border-2 flex items-center justify-center text-xs transition-all ${
                  !form.cardColor
                    ? 'border-foreground scale-110'
                    : 'border-muted-foreground/40 hover:border-muted-foreground'
                }`}
              >
                ✕
              </button>
              {[
                '#ef4444',
                '#f97316',
                '#eab308',
                '#22c55e',
                '#06b6d4',
                '#3b82f6',
                '#8b5cf6',
                '#ec4899',
                '#a855f7',
                '#14b8a6',
                '#f43f5e',
                '#84cc16',
              ].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      cardColor: form.cardColor === color ? '' : color,
                    })
                  }
                  className={`size-7 rounded-full border-2 transition-all ${
                    form.cardColor === color
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => handleOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" /> Salvando...
              </>
            ) : (
              'Salvar Orçamento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

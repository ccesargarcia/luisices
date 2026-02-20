import { useState, useMemo, useEffect } from 'react';
import { Quote, QuoteItem, QuoteStatus, OrderStatus, Customer, Tag, Product } from '../types';
import { TagInput } from '../components/TagInput';
import { getTextColor } from '../utils/tagColors';
import { useUserSettings } from '../../hooks/useUserSettings';
import { firebaseProductService } from '../../services/firebaseProductService';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
import { useFirebaseQuotes } from '../../hooks/useFirebaseQuotes';
import { firebaseQuoteService } from '../../services/firebaseQuoteService';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
  Loader2,
  Search,
  Pencil,
  Package,
  Calendar,
  Clock,
  User,
  Phone,
  StickyNote,
  UserPlus,
  AlertTriangle,
  Truck,
  MapPin,
  CreditCard,
  Tag as TagIcon,
  Filter,
  X,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviado',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  expired: 'Expirado',
};

const STATUS_VARIANT: Record<QuoteStatus, string> = {
  draft: 'bg-secondary text-secondary-foreground',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

const EMPTY_ITEM: QuoteItem = { name: '', quantity: 1, unitPrice: 0 };

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function buildWhatsAppMessage(quote: Quote, settings?: { whatsappGreeting?: string; whatsappSignature?: string }): string {
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
    const discountLabel = quote.discountType === 'percent'
      ? `${quote.discount}%`
      : formatCurrency(quote.discount);
    lines.push(`_(desconto de ${discountLabel} já incluído)_`);
  }
  lines.push(`Prazo de entrega: ${formatDate(quote.deliveryDate)}`);
  if (quote.deliveryType === 'pickup') lines.push('Forma de entrega: Retirada na loja');
  if (quote.deliveryType === 'delivery') {
    lines.push(`Forma de entrega: Entrega${quote.deliveryAddress ? ` no endereço: ${quote.deliveryAddress}` : ''}`);
  }
  if (quote.paymentCondition) lines.push(`Pagamento: ${quote.paymentCondition}`);
  if (quote.validUntil) lines.push(`Válido até: ${formatDate(quote.validUntil)}`);
  if (quote.notes) { lines.push(''); lines.push(quote.notes); }
  if (settings?.whatsappSignature) {
    lines.push('');
    lines.push(settings.whatsappSignature);
  }
  return lines.join('\n');
}
function formatDate(iso: string) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function defaultDelivery() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

// ─── Quote Form ───────────────────────────────────────────────────────────────

interface FormState {
  customerName: string;
  customerPhone: string;
  customerId?: string;
  items: QuoteItem[];
  estimatedCost: string;
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
    estimatedCost: '',
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
    estimatedCost: q.estimatedCost != null ? String(q.estimatedCost) : '',
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

function calcTotal(items: QuoteItem[]): number {
  return items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
}

interface QuoteFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Quote | null;
  onSaved: () => void;
}

function QuoteFormDialog({ open, onOpenChange, editing, onSaved }: QuoteFormDialogProps) {
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
  }, [open]);

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
        setForm((f) => ({ ...f, customerName: c.name, customerPhone: c.phone, customerId: c.id }));
      }
    } else if (selectedCustomer === 'new') {
      setForm((f) => ({ ...f, customerName: '', customerPhone: '', customerId: undefined }));
    }
  }, [selectedCustomer, customers]);

  // Reset when dialog opens
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
    ? (form.discountType === 'percent'
        ? subtotal * (parseFloat(form.discount) / 100)
        : parseFloat(form.discount))
    : 0;
  const finalTotal = Math.max(0, subtotal - discountAmt);

  async function handleSave() {
    if (!form.customerName.trim()) { toast.error('Informe o nome do cliente'); return; }
    if (!form.customerPhone.trim()) { toast.error('Informe o telefone do cliente'); return; }
    if (form.items.some((i) => !i.name.trim())) { toast.error('Preencha o nome de todos os itens'); return; }
    if (!form.deliveryDate) { toast.error('Informe a data de entrega'); return; }

    setSaving(true);
    try {
      const payload: Partial<Quote> = {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerId: form.customerId,
        items: form.items,
        totalPrice: finalTotal,
        estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : undefined,
        discount: form.discount ? parseFloat(form.discount) : undefined,
        discountType: form.discount ? form.discountType : undefined,
        paymentCondition: form.paymentCondition.trim() || undefined,
        deliveryType: form.deliveryType || undefined,
        deliveryAddress: form.deliveryType === 'delivery' ? form.deliveryAddress.trim() || undefined : undefined,
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
        await firebaseQuoteService.createQuote(payload);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="rounded-md border overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[36px_1fr_80px_100px_100px_36px] gap-2 px-3 py-2 bg-muted text-xs font-medium text-muted-foreground">
                <span />
                <span>Produto / Serviço</span>
                <span className="text-center">Qtd</span>
                <span className="text-right">Preço unit.</span>
                <span className="text-right">Subtotal</span>
                <span />
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[36px_1fr_80px_100px_100px_36px] gap-2 items-center px-3 py-2 border-t">
                  {/* Catalog picker button */}
                  <Popover
                    open={catalogOpenIdx === idx}
                    onOpenChange={(v) => { setCatalogOpenIdx(v ? idx : null); if (v) setCatalogSearch(''); }}
                  >
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="icon" className="size-8" title="Selecionar produto">
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
                          .filter((p) =>
                            !catalogSearch || p.name.toLowerCase().includes(catalogSearch.toLowerCase())
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
                        {catalogProducts.filter((p) =>
                          !catalogSearch || p.name.toLowerCase().includes(catalogSearch.toLowerCase())
                        ).length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">Nenhum produto encontrado</p>
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
                <div className="grid grid-cols-[1fr_80px_100px_100px_36px] gap-2 items-center px-3 py-2 bg-muted border-t">
                  <span className="col-span-3 text-sm text-right text-muted-foreground">Subtotal</span>
                  <span className="text-sm text-right text-muted-foreground">{formatCurrency(subtotal)}</span>
                  <span />
                </div>
              )}
              {discountAmt > 0 && (
                <div className="grid grid-cols-[1fr_80px_100px_100px_36px] gap-2 items-center px-3 py-2 bg-muted border-t">
                  <span className="col-span-3 text-sm text-right text-green-700 dark:text-green-400">
                    Desconto ({form.discountType === 'percent' ? `${form.discount}%` : formatCurrency(parseFloat(form.discount))})
                  </span>
                  <span className="text-sm text-right text-green-700 dark:text-green-400">-{formatCurrency(discountAmt)}</span>
                  <span />
                </div>
              )}
              <div className="grid grid-cols-[1fr_80px_100px_100px_36px] gap-2 items-center px-3 py-2 bg-muted border-t">
                <span className="col-span-3 text-sm font-semibold text-right">Total</span>
                <span className="text-sm font-bold text-right">{formatCurrency(finalTotal)}</span>
                <span />
              </div>
            </div>
          </div>

          {/* Datas + custo */}
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="q-cost">Custo estimado (opcional)</Label>
              <Input
                id="q-cost"
                type="number"
                min={0}
                step="0.01"
                placeholder="0,00"
                value={form.estimatedCost}
                onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-status">Status</Label>
              <select
                id="q-status"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as QuoteStatus })}
              >
                <option value="draft">Rascunho</option>
                <option value="sent">Enviado</option>
                <option value="rejected">Rejeitado</option>
                <option value="expired">Expirado</option>
              </select>
            </div>
          </div>

          {/* Desconto + Pagamento */}
          <div className="grid grid-cols-2 gap-4">
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
                <select
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value as 'percent' | 'fixed' })}
                >
                  <option value="percent">%</option>
                  <option value="fixed">R$</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-payment">Condição de pagamento</Label>
              <Input
                id="q-payment"
                placeholder="Ex: 50% entrada + 50% na entrega"
                value={form.paymentCondition}
                onChange={(e) => setForm({ ...form, paymentCondition: e.target.value })}
              />
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
            <TagInput tags={form.tags} onChange={(tags) => setForm({ ...form, tags })} placeholder="Adicionar tag..." />
          </div>

          {/* Cor do card */}
          <div className="space-y-2">
            <Label>Cor do card</Label>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => setForm({ ...form, cardColor: '' })}
                className={`size-7 rounded-full border-2 flex items-center justify-center text-xs transition-all ${
                  !form.cardColor ? 'border-foreground scale-110' : 'border-muted-foreground/40 hover:border-muted-foreground'
                }`}
              >
                ✕
              </button>
              {['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#a855f7','#14b8a6','#f43f5e','#84cc16'].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, cardColor: form.cardColor === color ? '' : color })}
                  className={`size-7 rounded-full border-2 transition-all ${
                    form.cardColor === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => handleOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="size-4 mr-2 animate-spin" /> Salvando...</> : 'Salvar Orçamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Quote Details Dialog ─────────────────────────────────────────────────────

interface QuoteDetailsProps {
  quote: Quote | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit: (q: Quote) => void;
  onRefresh: () => void;
}

function QuoteDetailsDialog({ quote, open, onOpenChange, onEdit, onRefresh }: QuoteDetailsProps) {
  const { settings } = useUserSettings();
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [marking, setMarking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!quote) return null;

  const canApprove = quote.status === 'draft' || quote.status === 'sent';
  const canReject = quote.status === 'draft' || quote.status === 'sent';
  const canEdit = quote.status !== 'approved';

  async function handleApprove() {
    if (!quote) return;
    setApproving(true);
    try {
      // Build order productName from items
      const productName = quote.items
        .map((i) => (i.quantity > 1 ? `${i.name} (${i.quantity}x)` : i.name))
        .join(', ');
      const totalQty = quote.items.reduce((s, i) => s + i.quantity, 0);

      const order = await firebaseOrderService.createOrder({
        customerName: quote.customerName,
        customerPhone: quote.customerPhone,
        customerId: quote.customerId,
        productName,
        quantity: totalQty,
        price: quote.totalPrice,
        cost: quote.estimatedCost,
        status: 'pending' as OrderStatus,
        deliveryDate: quote.deliveryDate,
        notes: [
          `Gerado do orçamento ${quote.quoteNumber}`,
          ...(quote.notes ? [quote.notes] : []),
        ].join('\n'),
        tags: quote.tags,
        cardColor: quote.cardColor,
        isExchange: quote.isExchange,
        exchangeNotes: quote.exchangeNotes,
      });

      await firebaseQuoteService.markApproved(quote.id, order.id, order.orderNumber!);
      toast.success(`Pedido ${order.orderNumber} criado com sucesso!`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao aprovar orçamento');
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!quote) return;
    setRejecting(true);
    try {
      await firebaseQuoteService.updateStatus(quote.id, 'rejected');
      toast.success('Orçamento rejeitado');
    } catch (e) {
      toast.error('Erro ao rejeitar orçamento');
    } finally {
      setRejecting(false);
    }
  }

  async function handleDelete() {
    if (!quote) return;
    if (!confirm('Deseja realmente excluir este orçamento? Esta ação não pode ser desfeita.')) return;
    setDeleting(true);
    try {
      await firebaseQuoteService.deleteQuote(quote.id);
      toast.success('Orçamento excluído');
      onRefresh();
      onOpenChange(false);
    } catch (e) {
      toast.error('Erro ao excluir orçamento');
    } finally {
      setDeleting(false);
    }
  }

  async function handleMarkSent() {
    if (!quote) return;
    setMarking(true);
    try {
      await firebaseQuoteService.updateStatus(quote.id, 'sent');
      toast.success('Orçamento marcado como enviado');
    } catch (e) {
      toast.error('Erro ao atualizar status');
    } finally {
      setMarking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>{quote.quoteNumber}</DialogTitle>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_VARIANT[quote.status]}`}>
              {STATUS_LABELS[quote.status]}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Cliente */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="size-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium">{quote.customerName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="size-4 text-muted-foreground flex-shrink-0" />
              <a
                href={`https://wa.me/55${quote.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(buildWhatsAppMessage(quote, settings ?? undefined))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:underline"
              >
                {quote.customerPhone}
              </a>
            </div>
          </div>

          {/* Itens */}
          <div className="rounded-md border overflow-hidden">
            <div className="grid grid-cols-[1fr_64px_100px_100px] gap-2 px-3 py-2 bg-muted text-xs font-medium text-muted-foreground">
              <span>Produto / Serviço</span>
              <span className="text-center">Qtd</span>
              <span className="text-right">Preço unit.</span>
              <span className="text-right">Subtotal</span>
            </div>
            {quote.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_64px_100px_100px] gap-2 items-center px-3 py-2 border-t text-sm">
                <span>{item.name}</span>
                <span className="text-center">{item.quantity}</span>
                <span className="text-right">{formatCurrency(item.unitPrice)}</span>
                <span className="text-right font-medium">{formatCurrency(item.quantity * item.unitPrice)}</span>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_64px_100px_100px] gap-2 items-center px-3 py-2 bg-muted border-t">
              <span className="col-span-3 text-sm font-semibold text-right">Total</span>
              <span className="text-sm font-bold text-right">{formatCurrency(quote.totalPrice)}</span>
            </div>
          </div>

          {/* Datas / custo / desconto / pagamento / entrega */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Entrega:</span>
              <span className="font-medium">{formatDate(quote.deliveryDate)}</span>
            </div>
            {quote.validUntil && (
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">Válido até:</span>
                <span className="font-medium">{formatDate(quote.validUntil)}</span>
              </div>
            )}
            {quote.discount != null && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Desconto:</span>
                <span className="font-medium text-green-700 dark:text-green-400">
                  {quote.discountType === 'percent' ? `${quote.discount}%` : formatCurrency(quote.discount)}
                </span>
              </div>
            )}
            {quote.estimatedCost != null && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Custo estimado:</span>
                <span className="font-medium">{formatCurrency(quote.estimatedCost)}</span>
              </div>
            )}
            {quote.paymentCondition && (
              <div className="flex items-center gap-2 col-span-2">
                <CreditCard className="size-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Pagamento:</span>
                <span className="font-medium">{quote.paymentCondition}</span>
              </div>
            )}
            {quote.deliveryType && (
              <div className="flex items-center gap-2 col-span-2">
                {quote.deliveryType === 'delivery' ? (
                  <Truck className="size-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <MapPin className="size-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className="text-muted-foreground">Entrega:</span>
                <span className="font-medium">
                  {quote.deliveryType === 'pickup' ? 'Retirada na loja' : `Entrega${quote.deliveryAddress ? ` — ${quote.deliveryAddress}` : ''}`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Criado em:</span>
              <span className="font-medium">{formatDate(quote.createdAt.split('T')[0])}</span>
            </div>
            {quote.sentAt && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Enviado em:</span>
                <span className="font-medium">{formatDate(quote.sentAt.split('T')[0])}</span>
              </div>
            )}
            {quote.approvedAt && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-green-700 dark:text-green-400">Aprovado em:</span>
                <span className="font-medium text-green-700 dark:text-green-400">{formatDate(quote.approvedAt.split('T')[0])}</span>
              </div>
            )}
            {quote.rejectedAt && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-red-600">Rejeitado em:</span>
                <span className="font-medium text-red-600">{formatDate(quote.rejectedAt.split('T')[0])}</span>
              </div>
            )}
            {quote.expiredAt && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-orange-600">Expirado em:</span>
                <span className="font-medium text-orange-600">{formatDate(quote.expiredAt.split('T')[0])}</span>
              </div>
            )}
          </div>

          {/* Notas */}
          {quote.notes && (
            <div className="flex gap-2 text-sm bg-muted/50 rounded-md p-3">
              <StickyNote className="size-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          {/* Tags */}
          {quote.tags && quote.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {quote.tags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: tag.color, color: getTextColor(tag.color) }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Pedido gerado */}
          {quote.status === 'approved' && quote.orderNumber && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <CheckCircle className="size-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-300">
                Pedido <strong>{quote.orderNumber}</strong> gerado a partir deste orçamento.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="mt-4 flex-wrap gap-2">
          <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground mr-auto" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Trash2 className="size-4 mr-2" />}
            Excluir
          </Button>
          {canEdit && (
            <Button variant="outline" onClick={() => { onOpenChange(false); onEdit(quote); }}>
              <Pencil className="size-4 mr-2" /> Editar
            </Button>
          )}
          {quote.status === 'draft' && (
            <Button variant="outline" onClick={handleMarkSent} disabled={marking}>
              {marking ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
              Marcar como Enviado
            </Button>
          )}
          {canReject && (
            <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={handleReject} disabled={rejecting}>
              {rejecting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <XCircle className="size-4 mr-2" />}
              Rejeitar
            </Button>
          )}
          {canApprove && (
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={approving}>
              {approving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <CheckCircle className="size-4 mr-2" />}
              Aprovar e Gerar Pedido
            </Button>
          )}
          {!canApprove && !canReject && !canEdit && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Quote Card ───────────────────────────────────────────────────────────────

interface QuoteCardProps { quote: Quote; onClick: () => void; compact?: boolean; }

function QuoteCard({ quote, onClick, compact = false }: QuoteCardProps) {
  const daysToDelivery = Math.ceil(
    (new Date(quote.deliveryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isUrgent = daysToDelivery >= 0 && daysToDelivery <= 3;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all overflow-hidden"
      style={quote.cardColor ? {
        backgroundColor: hexToRgba(quote.cardColor, 0.18),
        borderColor: quote.cardColor,
        borderWidth: 1.5,
      } : undefined}
      onClick={onClick}
    >
      <CardHeader className={compact ? 'pb-1 pt-3 px-3' : 'pb-2'}>
        {/* Linha 1: número + valor */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-muted-foreground shrink-0">{quote.quoteNumber}</span>
          <span className="font-bold text-base tabular-nums">{formatCurrency(quote.totalPrice)}</span>
        </div>
        {/* Linha 2: nome + badge */}
        <div className="flex items-center gap-2 mt-1 min-w-0">
          <p className="font-semibold truncate flex-1">{quote.customerName}</p>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_VARIANT[quote.status]}`}>
            {STATUS_LABELS[quote.status]}
          </span>
        </div>
      </CardHeader>
      <CardContent className={compact ? 'space-y-1 px-3 pb-3' : 'space-y-2'}>
        <p className="text-sm text-muted-foreground truncate">
          {quote.items.map((i) => i.name).join(', ')}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            Entrega: {formatDate(quote.deliveryDate)}
          </span>
          {isUrgent && quote.status !== 'approved' && quote.status !== 'rejected' && (
            <Badge variant="destructive" className="text-xs">
              {daysToDelivery === 0 ? 'Hoje!' : `${daysToDelivery}d`}
            </Badge>
          )}
        </div>
        {quote.status === 'approved' && quote.orderNumber && (
          <div className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 font-medium">
            <Package className="size-3" />
            Pedido {quote.orderNumber}
          </div>
        )}
        {quote.tags && quote.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {quote.tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: tag.color, color: getTextColor(tag.color) }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Quotes() {
  const { quotes, loading, error } = useFirebaseQuotes();
  const { settings } = useUserSettings();
  const [search, setSearch] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterDelivery, setFilterDelivery] = useState<'' | 'pickup' | 'delivery'>('');
  const [showFilters, setShowFilters] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [detailQuoteId, setDetailQuoteId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Deriva sempre do snapshot em tempo real — atualiza automaticamente após approve/reject/etc
  const detailQuote = detailQuoteId ? (quotes.find((q) => q.id === detailQuoteId) ?? null) : null;

  // All tags from all quotes (for filter suggestions)
  const allTags = useMemo(() => {
    const set = new Map<string, Tag>();
    for (const q of quotes) {
      for (const t of q.tags ?? []) {
        if (!set.has(t.name)) set.set(t.name, t);
      }
    }
    return Array.from(set.values());
  }, [quotes]);

  const activeFiltersCount = [filterDateFrom, filterDateTo, filterDelivery].filter(Boolean).length + filterTags.length;

  // Stats
  const stats = useMemo(() => ({
    total: quotes.length,
    draft: quotes.filter((q) => q.status === 'draft').length,
    sent: quotes.filter((q) => q.status === 'sent').length,
    approved: quotes.filter((q) => q.status === 'approved').length,
    rejected: quotes.filter((q) => q.status === 'rejected').length,
    expired: quotes.filter((q) => q.status === 'expired').length,
    pendingTotal: quotes
      .filter((q) => q.status === 'draft' || q.status === 'sent')
      .reduce((s, q) => s + q.totalPrice, 0),
  }), [quotes]);

  function applyFilters(list: Quote[]) {
    let result = list;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.customerName.toLowerCase().includes(q) ||
          o.quoteNumber.toLowerCase().includes(q) ||
          o.items.some((i) => i.name.toLowerCase().includes(q)) ||
          (o.tags ?? []).some((t) => t.name.toLowerCase().includes(q))
      );
    }
    if (filterDateFrom) {
      result = result.filter((o) => o.createdAt.split('T')[0] >= filterDateFrom);
    }
    if (filterDateTo) {
      result = result.filter((o) => o.createdAt.split('T')[0] <= filterDateTo);
    }
    if (filterTags.length > 0) {
      result = result.filter((o) =>
        filterTags.every((t) => (o.tags ?? []).some((ot) => ot.name === t))
      );
    }
    if (filterDelivery) {
      result = result.filter((o) => o.deliveryType === filterDelivery);
    }
    return result;
  }

  function clearFilters() {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterTags([]);
    setFilterDelivery('');
  }

  function openEdit(q: Quote) {
    setEditingQuote(q);
    setFormOpen(true);
  }

  function openDetail(q: Quote) {
    setDetailQuoteId(q.id);
    setDetailOpen(true);
  }

  function openNew() {
    setEditingQuote(null);
    setFormOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-center">
        <p className="text-red-600 font-semibold">{error}</p>
      </div>
    );
  }

  const tabGroups: { value: string; label: string; list: Quote[] }[] = [
    { value: 'all', label: `Todos (${quotes.length})`, list: applyFilters(quotes) },
    { value: 'draft', label: `Rascunho (${stats.draft})`, list: applyFilters(quotes.filter((q) => q.status === 'draft')) },
    { value: 'sent', label: `Enviados (${stats.sent})`, list: applyFilters(quotes.filter((q) => q.status === 'sent')) },
    { value: 'approved', label: `Aprovados (${stats.approved})`, list: applyFilters(quotes.filter((q) => q.status === 'approved')) },
    { value: 'rejected', label: `Rejeitados (${stats.rejected})`, list: applyFilters(quotes.filter((q) => q.status === 'rejected')) },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground mt-1">Crie orçamentos e converta em pedidos com um clique</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4 mr-2" /> Novo Orçamento
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft + stats.sent}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(stats.pendingTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aprovados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground mt-1">pedidos gerados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejeitados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected + stats.expired}</div>
            <p className="text-xs text-muted-foreground mt-1">não convertidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de orçamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, número, produto ou tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowFilters((v) => !v)}
            className="shrink-0 relative"
          >
            <Filter className="size-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date range */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Criado a partir de</Label>
                <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Criado até</Label>
                <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
              </div>
            </div>

            {/* Delivery type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Forma de entrega</Label>
              <div className="flex gap-2 flex-wrap">
                {(['', 'pickup', 'delivery'] as const).map((v) => (
                  <Button
                    key={v}
                    type="button"
                    variant={filterDelivery === v ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterDelivery(v)}
                  >
                    {v === '' ? 'Todas' : v === 'pickup' ? 'Retirada' : 'Entrega'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tag filter */}
            {allTags.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map((t) => {
                    const active = filterTags.includes(t.name);
                    return (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() =>
                          setFilterTags((prev) =>
                            active ? prev.filter((n) => n !== t.name) : [...prev, t.name]
                          )
                        }
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-opacity ${
                          active ? 'opacity-100 ring-2 ring-offset-1 ring-primary' : 'opacity-60 hover:opacity-90'
                        }`}
                        style={{ backgroundColor: t.color, color: getTextColor(t.color) }}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="size-3.5 mr-1.5" /> Limpar filtros
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          {tabGroups.map((g) => (
            <TabsTrigger key={g.value} value={g.value}>
              {g.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabGroups.map((g) => (
          <TabsContent key={g.value} value={g.value}>
            {g.list.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Nenhum orçamento encontrado</p>
                {g.value === 'all' && (
                  <Button variant="outline" className="mt-4" onClick={openNew}>
                    <Plus className="size-4 mr-2" /> Criar primeiro orçamento
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {g.list.map((q) => (
                  <QuoteCard key={q.id} quote={q} onClick={() => openDetail(q)} compact={settings?.compactCards} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialogs */}
      <QuoteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editingQuote}
        onSaved={() => {}}
      />
      <QuoteDetailsDialog
        quote={detailQuote}
        open={detailOpen}
        onOpenChange={(v) => { setDetailOpen(v); if (!v) setDetailQuoteId(null); }}
        onEdit={openEdit}
        onRefresh={() => setDetailOpen(false)}
      />
    </div>
  );
}

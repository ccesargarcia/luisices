import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Loader2, UserPlus, Trash2, Repeat2, Paperclip, Upload, ExternalLink, ImageIcon, AlertTriangle } from 'lucide-react';
import { OrderStatus, PaymentStatus, PaymentMethod, Customer, Tag, OrderAttachment, ExchangeItem } from '../types';
import { TagInput } from './TagInput';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { firebaseStorageService } from '../../services/firebaseStorageService';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import { useAuth } from '../../contexts/AuthContext';

interface ProductItem {
  name: string;
  quantity: string;
  unitPrice: string;
}

export function NewOrderDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deliveryDate: '',
    notes: '',
    status: 'pending' as OrderStatus,
    paymentStatus: 'pending' as PaymentStatus,
    paymentMethod: '' as PaymentMethod | '',
    paidAmount: '',
    isExchange: false,
    exchangeNotes: '',
    cardColor: '',
  });
  const [products, setProducts] = useState<ProductItem[]>([{ name: '', quantity: '1', unitPrice: '' }]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [localAttachments, setLocalAttachments] = useState<OrderAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [exchangeItems, setExchangeItems] = useState<ProductItem[]>([{ name: '', quantity: '1', unitPrice: '' }]);

  const totalPrice = useMemo(() => {
    return products.reduce((sum, p) => {
      const qty = parseFloat(p.quantity) || 0;
      const unit = parseFloat(p.unitPrice) || 0;
      return sum + qty * unit;
    }, 0);
  }, [products]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Carregar clientes
  useEffect(() => {
    if (open && user) {
      firebaseCustomerService.getCustomers(user.uid).then(setCustomers);
    }
  }, [open, user]);

  // Preencher dados do cliente selecionado
  useEffect(() => {
    if (selectedCustomer && selectedCustomer !== 'new') {
      const customer = customers.find(c => c.id === selectedCustomer);
      if (customer) {
        setFormData(prev => ({
          ...prev,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email || '',
        }));
        setIsNewCustomer(false);
      }
    } else if (selectedCustomer === 'new') {
      setIsNewCustomer(true);
      setFormData(prev => ({
        ...prev,
        customerName: '',
        customerPhone: '',
        customerEmail: '',
      }));
    }
  }, [selectedCustomer, customers]);

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPendingFiles(prev => [...prev, file]);
    setLocalAttachments(prev => [...prev, {
      url: previewUrl,
      thumbnail: previewUrl,
      name: file.name,
      isPdf: file.type === 'application/pdf',
    }]);
    e.target.value = '';
  };

  const handleRemoveLocalAttachment = (index: number) => {
    URL.revokeObjectURL(localAttachments[index].url);
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    setLocalAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      let customerId = selectedCustomer !== 'new' ? selectedCustomer : undefined;

      // Criar novo cliente se necessário
      if (isNewCustomer || selectedCustomer === 'new') {
        customerId = await firebaseCustomerService.createCustomer(user.uid, {
          name: formData.customerName,
          phone: formData.customerPhone,
          email: formData.customerEmail || undefined,
        });
      }

      const totalAmount = totalPrice;
      const paidAmount = formData.paidAmount ? parseFloat(formData.paidAmount) : 0;

      const productName = products
        .filter(p => p.name.trim())
        .map(p => parseInt(p.quantity) > 1 ? `${p.name.trim()} (${p.quantity}x)` : p.name.trim())
        .join(', ');
      const totalQuantity = products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);

      // Criar pedido
      const createdOrder = await firebaseOrderService.createOrder({
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        productName,
        quantity: totalQuantity,
        price: totalAmount,
        status: formData.status,
        deliveryDate: formData.deliveryDate,
        notes: formData.notes || undefined,
        tags: tags.length > 0 ? tags : undefined,
        customerId,
        cardColor: formData.cardColor || undefined,
        isExchange: formData.isExchange || undefined,
        exchangeNotes: formData.exchangeNotes || undefined,
        exchangeItems: formData.isExchange
          ? exchangeItems
              .filter(i => i.name.trim())
              .map(i => ({
                name: i.name.trim(),
                quantity: parseInt(i.quantity) || 1,
                value: i.unitPrice ? parseFloat(i.unitPrice) : undefined,
              } as ExchangeItem))
          : undefined,
        payment: formData.isExchange ? {
          status: 'paid' as PaymentStatus,
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
        } : {
          status: formData.paymentStatus,
          method: formData.paymentMethod || undefined,
          totalAmount,
          paidAmount,
          remainingAmount: totalAmount - paidAmount,
        },
      });

      // Atualizar estatísticas do cliente se pago parcialmente ou totalmente
      if (customerId && paidAmount > 0) {
        await firebaseCustomerService.incrementCustomerStats(customerId, paidAmount);
      }

      // Upload dos anexos pendentes
      if (pendingFiles.length > 0) {
        setIsUploadingAttachment(true);
        try {
          for (const file of pendingFiles) {
            const attachment = await firebaseStorageService.uploadOrderAttachment(file, user.uid, createdOrder.id);
            await firebaseOrderService.addAttachment(createdOrder.id, attachment);
          }
        } catch (attachErr) {
          console.error('Erro ao enviar anexos:', attachErr);
        } finally {
          setIsUploadingAttachment(false);
        }
      }

      setOpen(false);
      setFormData({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        deliveryDate: '',
        notes: '',
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: '',
        paidAmount: '',
        isExchange: false,
        exchangeNotes: '',
        cardColor: '',
      });
      setProducts([{ name: '', quantity: '1', unitPrice: '' }]);
      setTags([]);
      setSelectedCustomer('');
      setIsNewCustomer(false);
      setExchangeItems([{ name: '', quantity: '1', unitPrice: '' }]);
      localAttachments.forEach(a => URL.revokeObjectURL(a.url));
      setPendingFiles([]);
      setLocalAttachments([]);
    } catch (err) {
      console.error('Erro ao criar pedido:', err);
      alert('Erro ao criar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" />
          Novo Pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Pedido</DialogTitle>
          <div className="sr-only">Formulário para criar um novo pedido</div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seleção de Cliente */}
          <div className="space-y-2">
            <Label htmlFor="customer">Cliente *</Label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger id="customer">
                <SelectValue placeholder="Selecione um cliente ou crie novo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">
                  <div className="flex items-center gap-2">
                    <UserPlus className="size-4" />
                    Novo Cliente
                  </div>
                </SelectItem>
                {customers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(() => {
              const c = customers.find(c => c.id === selectedCustomer);
              return c?.status === 'defaulter' ? (
                <Alert className="border-red-300 bg-red-50 dark:bg-red-950/20 py-2 px-3">
                  <AlertDescription className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                    <AlertTriangle className="size-4 shrink-0" />
                    Este cliente está marcado como <strong>Inadimplente</strong>. Verifique pendências antes de criar um novo pedido.
                  </AlertDescription>
                </Alert>
              ) : null;
            })()}
          </div>

          {/* Dados do Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Nome do Cliente *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                disabled={selectedCustomer !== 'new' && selectedCustomer !== ''}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Telefone *</Label>
              <Input
                id="customerPhone"
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="(11) 98765-4321"
                disabled={selectedCustomer !== 'new' && selectedCustomer !== ''}
                required
              />
            </div>
          </div>

          {(isNewCustomer || selectedCustomer === 'new') && (
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email (opcional)</Label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                placeholder="cliente@email.com"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Produtos *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 h-7 text-xs"
                onClick={() => setProducts(prev => [...prev, { name: '', quantity: '1', unitPrice: '' }])}
              >
                <Plus className="size-3" /> Adicionar item
              </Button>
            </div>
            {/* header das colunas */}
            <div className="grid grid-cols-[1fr_56px_96px_36px] gap-2 px-1">
              <span className="text-xs text-muted-foreground">Produto</span>
              <span className="text-xs text-muted-foreground text-center">Qtd</span>
              <span className="text-xs text-muted-foreground text-right">Valor unit.</span>
              <span />
            </div>
            <div className="space-y-2">
              {products.map((item, idx) => {
                const sub = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="grid grid-cols-[1fr_56px_96px_36px] gap-2 items-center">
                      <Input
                        placeholder={`Produto ${idx + 1}`}
                        value={item.name}
                        onChange={e => setProducts(prev => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                        required={idx === 0}
                      />
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => setProducts(prev => prev.map((p, i) => i === idx ? { ...p, quantity: e.target.value } : p))}
                        className="text-center px-1"
                        required={idx === 0}
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                        value={item.unitPrice}
                        onChange={e => setProducts(prev => prev.map((p, i) => i === idx ? { ...p, unitPrice: e.target.value } : p))}
                        className="text-right px-2"
                        required={idx === 0}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 text-muted-foreground hover:text-destructive"
                        onClick={() => setProducts(prev => prev.filter((_, i) => i !== idx))}
                        disabled={products.length === 1}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    {sub > 0 && (
                      <p className="text-xs text-muted-foreground text-right pr-10">
                        subtotal: {formatCurrency(sub)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {totalPrice > 0 && (
              <div className="flex justify-end border-t pt-2">
                <span className="text-sm font-semibold">Total: {formatCurrency(totalPrice)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: OrderStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in-progress">Em Produção</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryDate">Data de Entrega *</Label>
            <Input
              id="deliveryDate"
              type="date"
              value={formData.deliveryDate}
              onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Detalhes adicionais sobre o pedido..."
              rows={3}
            />
          </div>

          {/* Permuta / Parceria */}
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Repeat2 className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Permuta / Parceria</p>
                <p className="text-xs text-muted-foreground">Sem cobrança monetária</p>
              </div>
            </div>
            <Switch
              checked={formData.isExchange}
              onCheckedChange={v => setFormData({ ...formData, isExchange: v, paidAmount: v ? '0' : '' })}
            />
          </div>
          {formData.isExchange && (
            <div className="space-y-3 rounded-lg border border-purple-200 bg-purple-50/50 dark:bg-purple-950/10 dark:border-purple-800 p-3">
              {/* Itens da permuta */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-300">O que você recebe em troca</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 h-7 text-xs"
                    onClick={() => setExchangeItems(prev => [...prev, { name: '', quantity: '1', unitPrice: '' }])}
                  >
                    <Plus className="size-3" /> Adicionar item
                  </Button>
                </div>
                <div className="grid grid-cols-[1fr_56px_96px_36px] gap-2 px-1">
                  <span className="text-xs text-muted-foreground">Item recebido</span>
                  <span className="text-xs text-muted-foreground text-center">Qtd</span>
                  <span className="text-xs text-muted-foreground text-right">Valor est.</span>
                  <span />
                </div>
                <div className="space-y-2">
                  {exchangeItems.map((item, idx) => {
                    const sub = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="grid grid-cols-[1fr_56px_96px_36px] gap-2 items-center">
                          <Input
                            placeholder={`Item ${idx + 1}`}
                            value={item.name}
                            onChange={e => setExchangeItems(prev => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                          />
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => setExchangeItems(prev => prev.map((p, i) => i === idx ? { ...p, quantity: e.target.value } : p))}
                            className="text-center px-1"
                          />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0,00"
                            value={item.unitPrice}
                            onChange={e => setExchangeItems(prev => prev.map((p, i) => i === idx ? { ...p, unitPrice: e.target.value } : p))}
                            className="text-right px-2"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-9 text-muted-foreground hover:text-destructive"
                            onClick={() => setExchangeItems(prev => prev.filter((_, i) => i !== idx))}
                            disabled={exchangeItems.length === 1}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        {sub > 0 && (
                          <p className="text-xs text-muted-foreground text-right pr-10">
                            subtotal: {formatCurrency(sub)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {(() => {
                  const total = exchangeItems.reduce((s, p) => s + (parseFloat(p.quantity)||0)*(parseFloat(p.unitPrice)||0), 0);
                  return total > 0 ? (
                    <div className="flex justify-end border-t border-purple-200 pt-2">
                      <span className="text-sm font-semibold text-purple-800 dark:text-purple-300">Valor estimado: {formatCurrency(total)}</span>
                    </div>
                  ) : null;
                })()}
              </div>
              {/* Observações livres */}
              <div className="space-y-1.5">
                <Label htmlFor="exchangeNotes" className="text-sm text-purple-800 dark:text-purple-300">Observações da permuta</Label>
                <Textarea
                  id="exchangeNotes"
                  value={formData.exchangeNotes}
                  onChange={e => setFormData({ ...formData, exchangeNotes: e.target.value })}
                  placeholder="Ex: artes para redes sociais em troca de impressões..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <TagInput
              tags={tags}
              onChange={setTags}
              placeholder="Adicione tags para categorizar o pedido..."
            />
          </div>

          {/* Cor do card */}
          <div className="space-y-2">
            <Label>Cor do card</Label>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, cardColor: '' })}
                className={`size-7 rounded-full border-2 flex items-center justify-center text-xs transition-all ${
                  !formData.cardColor ? 'border-foreground scale-110' : 'border-muted-foreground/40 hover:border-muted-foreground'
                }`}
              >
                ✕
              </button>
              {['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#a855f7','#14b8a6'].map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, cardColor: formData.cardColor === color ? '' : color })}
                  className={`size-7 rounded-full border-2 transition-all ${
                    formData.cardColor === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Paperclip className="size-3.5" /> Anexos
              </Label>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="sr-only"
                  accept="image/*,.pdf"
                  onChange={handleAttachmentSelect}
                  disabled={isUploadingAttachment}
                />
                <span className="inline-flex items-center gap-1.5 text-xs border rounded-md px-2.5 py-1.5 hover:bg-muted transition-colors">
                  <Upload className="size-3.5" />
                  Adicionar arquivo
                </span>
              </label>
            </div>
            {localAttachments.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {localAttachments.map((att, idx) => (
                  <div key={idx} className="relative group">
                    {!att.isPdf ? (
                      <img
                        src={att.thumbnail ?? att.url}
                        alt={att.name ?? `Anexo ${idx + 1}`}
                        className="w-full h-20 object-cover rounded-md border"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-20 border rounded-md bg-muted gap-1 px-1">
                        <ImageIcon className="size-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground text-center truncate w-full px-1">{att.name ?? 'PDF'}</span>
                        <ExternalLink className="size-3 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveLocalAttachment(idx)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full size-5 items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity flex"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum anexo. Envie imagens ou PDFs de referência.</p>
            )}
          </div>
          {/* Informações de Pagamento */}
          {!formData.isExchange && (
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-medium text-sm">Informações de Pagamento</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Status de Pagamento *</Label>
                <Select
                  value={formData.paymentStatus}
                  onValueChange={(value: PaymentStatus) => setFormData({ ...formData, paymentStatus: value })}
                >
                  <SelectTrigger id="paymentStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="partial">Parcial</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value: PaymentMethod) => setFormData({ ...formData, paymentMethod: value })}
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="credit">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit">Cartão de Débito</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.paymentStatus !== 'pending' && (
              <div className="space-y-2">
                <Label htmlFor="paidAmount">Valor Pago (R$)</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  max={totalPrice || undefined}
                  value={formData.paidAmount}
                  onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                  placeholder={totalPrice > 0 ? `Máximo: ${formatCurrency(totalPrice)}` : 'Informe o valor pago'}
                />
                {formData.paidAmount && totalPrice > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Restante: {formatCurrency(totalPrice - parseFloat(formData.paidAmount))}
                  </p>
                )}
              </div>
            )}
          </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              Adicionar Pedido
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
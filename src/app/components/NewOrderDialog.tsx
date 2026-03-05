import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Loader2, UserPlus, Trash2, Repeat2, Paperclip, Upload, ExternalLink, ImageIcon, AlertTriangle, BookOpen, Images, X } from 'lucide-react';
import { OrderStatus, PaymentStatus, PaymentMethod, Customer, Tag, OrderAttachment, ExchangeItem, Product } from '../types';
import { TagInput } from './TagInput';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { firebaseStorageService } from '../../services/firebaseStorageService';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import { firebaseProductService } from '../../services/firebaseProductService';
import { firebaseGalleryService } from '../../services/firebaseGalleryService';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettingsContext } from '../../contexts/UserSettingsContext';
import { toast } from 'sonner';
import { SafeImg } from './SafeMedia';
import { trackOrderCreated } from '../../services/analyticsService';

interface ProductItem {
  name: string;
  quantity: string;
  unitPrice: string;
}

export function NewOrderDialog() {
  const { user, hasPermission } = useAuth();
  const { settings } = useUserSettingsContext();
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
  const [pendingGallery, setPendingGallery] = useState<{ file: File; title: string }[]>([]);
  const [localAttachments, setLocalAttachments] = useState<OrderAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const [galleryItems, setGalleryItems] = useState<import('../types').GalleryItem[]>([]);
  const [galleryBrowserOpen, setGalleryBrowserOpen] = useState(false);
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<string[]>([]);
  const [galleryBrowserSearch, setGalleryBrowserSearch] = useState('');
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogOpenIdx, setCatalogOpenIdx] = useState<number | null>(null);

  const totalPrice = useMemo(() => {
    return products.reduce((sum, p) => {
      const qty = parseFloat(p.quantity) || 0;
      const unit = parseFloat(p.unitPrice) || 0;
      return sum + qty * unit;
    }, 0);
  }, [products]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Pré-preencher datas e método de pagamento com os padrões configurados
  useEffect(() => {
    if (!open) return;
    const days = settings?.defaultDeliveryDays;
    if (days && days > 0) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      const iso = d.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, deliveryDate: prev.deliveryDate || iso }));
    }
    const method = settings?.defaultPaymentMethod;
    if (method) {
      setFormData(prev => ({ ...prev, paymentMethod: prev.paymentMethod || (method as PaymentMethod) }));
    }
  }, [open]);

  // Carregar clientes
  useEffect(() => {
    if (open && user) {
      firebaseCustomerService.getCustomers(user.uid).then(setCustomers);
      firebaseProductService.getProducts().then(setCatalogProducts);
      firebaseGalleryService.getItems(user.uid).then(setGalleryItems).catch(() => {});
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

    // Bloquear pedido para cliente inadimplente
    const selectedCustomerObj = customers.find(c => c.id === selectedCustomer);
    if (selectedCustomerObj?.status === 'defaulter') {
      toast.error('Não é possível criar pedido para cliente inadimplente. Regularize a situação antes de adicionar novos pedidos.');
      return;
    }

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

      // Track order creation in analytics
      trackOrderCreated(createdOrder.id, totalAmount, formData.status);

      // Atualizar estatísticas do cliente sempre que houver customerId
      if (customerId) {
        await firebaseCustomerService.incrementCustomerStats(customerId, totalAmount);
      }

      // Upload dos anexos pendentes
      if (pendingFiles.length > 0) {
        setIsUploadingAttachment(true);
        try {
          for (const file of pendingFiles) {
            const attachment = await firebaseStorageService.uploadOrderAttachment(file, user.uid, createdOrder.id);
            await firebaseOrderService.addAttachment(createdOrder.id, attachment);
            // Vincular imagens à galeria do cliente automaticamente
            if (!attachment.isPdf && (customerId || formData.customerName)) {
              try {
                await firebaseGalleryService.createItem(user.uid, {
                  title: file.name.replace(/\.[^.]+$/, ''),
                  imageUrl: attachment.url,
                  customerId,
                  customerName: formData.customerName,
                  orderId: createdOrder.id,
                });
              } catch {
                // silencioso
              }
            }
          }
        } catch (attachErr) {
          console.error('Erro ao enviar anexos:', attachErr);
        } finally {
          setIsUploadingAttachment(false);
        }
      }

      // Upload das artes da galeria pendentes
      for (const g of pendingGallery) {
        try {
          const tempId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
          const imageUrl = await firebaseGalleryService.uploadImage(g.file, user.uid, tempId);
          await firebaseGalleryService.createItem(user.uid, {
            title: g.title,
            imageUrl,
            customerId,
            customerName: formData.customerName,
            orderId: createdOrder.id,
          });
        } catch {
          // silencioso
        }
      }

      // Vincular artes selecionadas da galeria ao pedido
      for (const gid of selectedGalleryIds) {
        try {
          await firebaseGalleryService.updateItem(gid, { orderId: createdOrder.id });
        } catch {
          // silencioso
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
      localAttachments.forEach(a => URL.revokeObjectURL(a.url));
      setPendingFiles([]);
      setPendingGallery([]);
      setLocalAttachments([]);
      setSelectedGalleryIds([]);
      setGalleryBrowserSearch('');
    } catch (err) {
      console.error('Erro ao criar pedido:', err);
      toast.error('Erro ao criar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const canCreate = hasPermission(p => p.orders?.create ?? false);

  if (!canCreate) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" />
          Novo Pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto overflow-x-hidden">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-[36px_1fr_56px_96px_36px] gap-2 px-1">
              <span />
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
                    <div className="grid grid-cols-[36px_1fr_56px_96px_36px] gap-2 items-center">
                      <Popover
                        open={catalogOpenIdx === idx}
                        onOpenChange={(v) => { setCatalogOpenIdx(v ? idx : null); if (v) setCatalogSearch(''); }}
                      >
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" size="icon" className="size-9" title="Selecionar produto">
                            <BookOpen className="size-4" />
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
                              .filter((p) => !catalogSearch || p.name.toLowerCase().includes(catalogSearch.toLowerCase()))
                              .map((p) => {
                                const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted text-sm text-left"
                                    onClick={() => {
                                      setProducts(prev => prev.map((item, i) =>
                                        i === idx ? { ...item, name: p.name, unitPrice: String(p.unitPrice) } : item
                                      ));
                                      setCatalogOpenIdx(null);
                                    }}
                                  >
                                    <span className="truncate">{p.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{fmt(p.unitPrice)}</span>
                                  </button>
                                );
                              })}
                            {catalogProducts.filter((p) => !catalogSearch || p.name.toLowerCase().includes(catalogSearch.toLowerCase())).length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-2">Nenhum produto encontrado</p>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
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
                <Images className="size-3.5" /> Artes do Cliente
                {selectedGalleryIds.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">({selectedGalleryIds.length} selecionada{selectedGalleryIds.length > 1 ? 's' : ''})</span>
                )}
              </Label>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs border rounded-md px-2.5 py-1.5 hover:bg-muted transition-colors"
                onClick={() => setGalleryBrowserOpen(true)}
              >
                <Plus className="size-3.5" /> Vincular arte
              </button>
            </div>
            {selectedGalleryIds.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {selectedGalleryIds.map(id => {
                  const item = galleryItems.find(g => g.id === id);
                  if (!item) return null;
                  return (
                    <div key={id} className="relative group">
                      <img src={item.imageUrl} alt={item.title} className="w-full aspect-square object-cover rounded-md border" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1 py-0.5 truncate rounded-b-md">{item.title}</div>
                      <button
                        type="button"
                        onClick={() => setSelectedGalleryIds(prev => prev.filter(i => i !== id))}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full size-5 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma arte vinculada. Clique em "Vincular arte" para selecionar da galeria.</p>
            )}
          </div>

          {/* Gallery browser dialog */}
          {galleryBrowserOpen && (() => {
            const customerId = selectedCustomer && selectedCustomer !== 'new' ? selectedCustomer : undefined;
            const filtered = galleryItems.filter(g => {
              const matchCustomer = !customerId || g.customerId === customerId || g.customerName === formData.customerName;
              const matchSearch = !galleryBrowserSearch || g.title.toLowerCase().includes(galleryBrowserSearch.toLowerCase()) || (g.customerName ?? '').toLowerCase().includes(galleryBrowserSearch.toLowerCase());
              return matchCustomer && matchSearch;
            });
            return (
              <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4" onClick={() => setGalleryBrowserOpen(false)}>
                <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h4 className="font-semibold text-sm">Selecionar Artes da Galeria</h4>
                    <button type="button" onClick={() => setGalleryBrowserOpen(false)}><X className="size-4" /></button>
                  </div>
                  <div className="px-4 py-2 border-b">
                    <input
                      className="w-full border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Buscar por título ou cliente..."
                      value={galleryBrowserSearch}
                      onChange={e => setGalleryBrowserSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {filtered.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-10">Nenhuma arte encontrada na galeria.</p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {filtered.map(item => {
                          const isSelected = selectedGalleryIds.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setSelectedGalleryIds(prev =>
                                isSelected ? prev.filter(i => i !== item.id) : [...prev, item.id]
                              )}
                              className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                                isSelected ? 'border-primary shadow-md scale-[0.97]' : 'border-transparent hover:border-primary/40'
                              }`}
                            >
                              <img src={item.imageUrl} alt={item.title} className="w-full aspect-square object-cover" />
                              {isSelected && (
                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                  <div className="bg-primary text-primary-foreground rounded-full size-6 flex items-center justify-center text-xs font-bold">✓</div>
                                </div>
                              )}
                              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1.5 py-1 truncate">{item.title}</div>
                              {item.customerName && (
                                <div className="absolute top-1 left-1 bg-black/50 text-white text-[9px] px-1 py-0.5 rounded truncate max-w-[90%]">{item.customerName}</div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3 border-t flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{selectedGalleryIds.length} selecionada{selectedGalleryIds.length !== 1 ? 's' : ''}</span>
                    <button
                      type="button"
                      className="bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm hover:bg-primary/90"
                      onClick={() => setGalleryBrowserOpen(false)}
                    >Confirmar</button>
                  </div>
                </div>
              </div>
            );
          })()}

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
                      <SafeImg
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <Button
              type="submit"
              disabled={loading || customers.find(c => c.id === selectedCustomer)?.status === 'defaulter'}
            >
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              Adicionar Pedido
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
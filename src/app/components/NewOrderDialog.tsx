import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Loader2, Repeat2, Paperclip, Upload, ImageIcon, ExternalLink } from 'lucide-react';
import { OrderStatus, PaymentStatus, PaymentMethod, Customer, Tag, OrderAttachment, Product } from '../types';
import { TagInput } from './TagInput';
import { TAG_COLORS } from '../utils/tagColors';
import { Switch } from './ui/switch';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { firebaseStorageService } from '../../services/firebaseStorageService';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import { firebaseProductService } from '../../services/firebaseProductService';
import { firebaseGalleryService } from '../../services/firebaseGalleryService';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettingsContext } from '../../contexts/UserSettingsContext';
import { toast } from 'sonner';
import { SafeImg } from './SafeMedia';
import { trackOrderCreated } from '../../services/analyticsService';
import { NewOrderCustomerSelect } from './orders/NewOrderCustomerSelect';
import { NewOrderItemsSelect } from './orders/NewOrderItemsSelect';
import { NewOrderPaymentSection } from './orders/NewOrderPaymentSection';
import { NewOrderGallerySelect } from './orders/NewOrderGallerySelect';
import { ProductItem } from './orders/OrderEditForm';

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
  const [pendingGallery] = useState<{ file: File; title: string }[]>([]);
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
      toast.error('Não é possível criar um pedido para este cliente. Existem pagamentos pendentes a regularizar.');
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

        setCustomers(prev => [
          {
            id: customerId,
            name: formData.customerName,
            phone: formData.customerPhone,
            email: formData.customerEmail || '',
            createdAt: new Date().toISOString(),
            userId: user.uid,
            totalOrders: 0,
            totalSpent: 0,
          } as Customer,
          ...prev,
        ]);
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
          method: null,
          paymentDate: null,
          notes: null,
          history: null,
        } : {
          status: formData.paymentStatus,
          method: formData.paymentMethod || null,
          totalAmount,
          paidAmount,
          remainingAmount: totalAmount - paidAmount,
          paymentDate: null,
          notes: null,
          history: null,
        },
      });

      trackOrderCreated(createdOrder.id, totalAmount, formData.status);

      if (customerId) {
        await firebaseCustomerService.incrementCustomerStats(customerId, totalAmount);
      }

      if (pendingFiles.length > 0) {
        setIsUploadingAttachment(true);
        try {
          for (const file of pendingFiles) {
            const attachment = await firebaseStorageService.uploadOrderAttachment(file, user.uid, createdOrder.id);
            await firebaseOrderService.addAttachment(createdOrder.id, attachment);
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
      setLocalAttachments([]);
      setSelectedGalleryIds([]);
      setGalleryBrowserSearch('');
    } catch (err) {
      console.error('Erro ao criar pedido:', err);
      toast.error('Erro ao criar pedido. Tente novamente.');
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const canCreate = hasPermission(p => p.orders?.create ?? false);

  if (!canCreate) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="new-order-button" className="gap-2">
          <Plus className="size-4" />
          Novo Pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-1rem)] max-w-2xl max-h-[90dvh] min-h-[70dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Pedido</DialogTitle>
          <div className="sr-only">Formulário para criar um novo pedido</div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <NewOrderCustomerSelect
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            customers={customers}
            isNewCustomer={isNewCustomer}
            customerName={formData.customerName}
            onCustomerNameChange={(name) => setFormData({ ...formData, customerName: name })}
            customerPhone={formData.customerPhone}
            onCustomerPhoneChange={(phone) => setFormData({ ...formData, customerPhone: phone })}
            customerEmail={formData.customerEmail}
            onCustomerEmailChange={(email) => setFormData({ ...formData, customerEmail: email })}
          />

          <NewOrderItemsSelect
            products={products}
            onProductsChange={setProducts}
            catalogProducts={catalogProducts}
            catalogSearch={catalogSearch}
            onCatalogSearchChange={setCatalogSearch}
            catalogOpenIdx={catalogOpenIdx}
            onCatalogOpenIdxChange={setCatalogOpenIdx}
            totalPrice={totalPrice}
            formatCurrency={formatCurrency}
          />

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
              {TAG_COLORS.map(({ value: color, name }) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, cardColor: formData.cardColor === color ? '' : color })}
                  className={`size-7 rounded-full border-2 transition-all ${
                    formData.cardColor === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  title={name}
                />
              ))}
            </div>
          </div>

          <NewOrderGallerySelect
            galleryItems={galleryItems}
            selectedGalleryIds={selectedGalleryIds}
            onSelectedGalleryIdsChange={setSelectedGalleryIds}
            galleryBrowserOpen={galleryBrowserOpen}
            onGalleryBrowserOpenChange={setGalleryBrowserOpen}
            galleryBrowserSearch={galleryBrowserSearch}
            onGalleryBrowserSearchChange={setGalleryBrowserSearch}
            selectedCustomer={selectedCustomer}
            customerName={formData.customerName}
          />

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

          {!formData.isExchange && (
            <NewOrderPaymentSection
              paymentStatus={formData.paymentStatus}
              onPaymentStatusChange={(status) => setFormData({ ...formData, paymentStatus: status })}
              paymentMethod={formData.paymentMethod}
              onPaymentMethodChange={(method) => setFormData({ ...formData, paymentMethod: method })}
              paidAmount={formData.paidAmount}
              onPaidAmountChange={(paid) => setFormData({ ...formData, paidAmount: paid })}
              totalPrice={totalPrice}
              formatCurrency={formatCurrency}
            />
          )}

          <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
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
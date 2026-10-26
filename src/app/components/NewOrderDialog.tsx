import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogBody, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Loader2, Repeat2, Paperclip, Upload, ImageIcon, ExternalLink, AlertTriangle } from 'lucide-react';
import { OrderStatus, PaymentStatus, PaymentMethod, Customer, Tag, OrderAttachment, Product, ExchangeItem } from '../types';
import { TagInput } from './TagInput';
import { TAG_COLORS } from '../utils/tagColors';
import { Switch } from './ui/switch';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { firebaseStorageService } from '../../services/firebaseStorageService';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import { firebaseProductService } from '../../services/firebaseProductService';
import { firebaseGalleryService } from '../../services/firebaseGalleryService';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrdersContext';
import { useUserSettingsContext } from '../../contexts/UserSettingsContext';
import { toast } from 'sonner';
import { SafeImg } from './SafeMedia';
import { trackOrderCreated } from '../../services/analyticsService';
import { NewOrderCustomerSelect } from './orders/NewOrderCustomerSelect';
import { NewOrderItemsSelect } from './orders/NewOrderItemsSelect';
import { NewOrderPaymentSection } from './orders/NewOrderPaymentSection';
import { NewOrderGallerySelect } from './orders/NewOrderGallerySelect';
import { ProductItem } from './orders/OrderEditForm';
import { AiOrderDraft, OrderItem, Order } from '../types';
import { secureRandomId } from '../utils/random';
import { parseDecimalMoneyInput } from '../utils/parseDecimalMoneyInput';
import { formatDecimalMoneyInput } from '../utils/formatDecimalMoneyInput';
import { MAX_ORDER_TAGS } from '../utils/orderLimits';
import { loadPendingOrderOperation, savePendingOrderOperation, clearPendingOrderOperation, isDefinitiveOrderRejection } from '../../services/pendingOrderOperations';

interface NewOrderDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialDraft?: AiOrderDraft | null;
  hideTrigger?: boolean;
  initialCustomerId?: string | null;
}

export function NewOrderDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  initialDraft,
  hideTrigger = false,
  initialCustomerId,
}: NewOrderDialogProps = {}) {
  const { user, userProfile, hasPermission } = useAuth();
  const { teamMembers } = useOrders();
  const { settings } = useUserSettingsContext();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (!isControlled) setInternalOpen(val);
    controlledOnOpenChange?.(val);
  };
  const [loading, setLoading] = useState(false);
  const [hasUnconfirmedDraft, setHasUnconfirmedDraft] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => secureRandomId(20));
  const pendingCreation = useRef<Partial<Order> | null>(null);
  const operationScope = `new-order:${initialCustomerId || 'new'}`;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string>('__none__');

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
  const [exchangeItems, setExchangeItems] = useState<ProductItem[]>([{ name: '', quantity: '1', unitPrice: '' }]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingGallery] = useState<{ file: File; title: string }[]>([]);
  const [localAttachments, setLocalAttachments] = useState<OrderAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentUploadProgress, setAttachmentUploadProgress] = useState(0);

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
      const unit = p.unitPrice.trim() ? parseDecimalMoneyInput(p.unitPrice) : 0;
      if (unit === null) return Number.NaN;
      return sum + qty * unit;
    }, 0);
  }, [products]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const resetForm = () => {
    localAttachments.forEach(attachment => {
      if (attachment.url.startsWith('blob:')) URL.revokeObjectURL(attachment.url);
    });
    setSelectedCustomer(initialCustomerId || '');
    setIsNewCustomer(false);
    setAssignedTo('__none__');
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
    setExchangeItems([{ name: '', quantity: '1', unitPrice: '' }]);
    setTags([]);
    setPendingFiles([]);
    setLocalAttachments([]);
    setGalleryBrowserOpen(false);
    setSelectedGalleryIds([]);
    setGalleryBrowserSearch('');
    setCatalogSearch('');
    setCatalogOpenIdx(null);
    if (user) clearPendingOrderOperation(user.uid, operationScope);
    pendingCreation.current = null;
    setIdempotencyKey(secureRandomId(20));
    setHasUnconfirmedDraft(false);
  };

  // Preenche dados vindos do Copiloto de IA
  useEffect(() => {
    if (initialDraft && open && !pendingCreation.current) {
      setIsNewCustomer(true);
      setSelectedCustomer('new');
      setFormData(prev => ({
        ...prev,
        customerName: initialDraft.customerName || prev.customerName,
        customerPhone: initialDraft.customerPhone || prev.customerPhone,
        deliveryDate: initialDraft.deliveryDate || prev.deliveryDate,
        notes: initialDraft.notes || prev.notes,
        paymentMethod: (initialDraft.paymentMethod as PaymentMethod) || prev.paymentMethod,
        paidAmount: initialDraft.paidAmount != null
          ? formatDecimalMoneyInput(initialDraft.paidAmount)
          : prev.paidAmount,
      }));

      if (initialDraft.productName) {
        const qty = initialDraft.quantity || 1;
        const draftUnitPrice = initialDraft.unitPrice != null
          ? parseDecimalMoneyInput(String(initialDraft.unitPrice))
          : null;
        const unit = draftUnitPrice !== null
          ? formatDecimalMoneyInput(draftUnitPrice)
          : (initialDraft.totalPrice != null
            ? formatDecimalMoneyInput(initialDraft.totalPrice / qty)
            : '');

        setProducts([
          {
            name: initialDraft.productName,
            quantity: String(qty),
            unitPrice: unit,
          }
        ]);
      }
    }
  }, [initialDraft, open]);

  // Restaura rascunho com confirmação pendente no servidor ou inicia formulário limpo
  useEffect(() => {
    if (!open || !user) return;
    try {
      const stored = loadPendingOrderOperation<any>(user.uid, operationScope);
      if (stored) {
        const draft = stored.payload;
        if (draft.orderData) {
          pendingCreation.current = draft.orderData;
          setIdempotencyKey(stored.id);
          if (draft.formData) setFormData(draft.formData);
          if (Array.isArray(draft.products)) setProducts(draft.products);
          if (Array.isArray(draft.exchangeItems)) setExchangeItems(draft.exchangeItems);
          if (Array.isArray(draft.tags)) setTags(draft.tags);
          if (draft.selectedCustomer) setSelectedCustomer(draft.selectedCustomer);
          if (typeof draft.isNewCustomer === 'boolean') setIsNewCustomer(draft.isNewCustomer);
          if (draft.assignedTo) setAssignedTo(draft.assignedTo);
          setHasUnconfirmedDraft(true);
          return;
        }
      }
    } catch {
      // silencioso
    }

    resetForm();
    if (initialCustomerId) {
      setSelectedCustomer(initialCustomerId);
    }
  }, [open, initialCustomerId, user?.uid]);

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
    if (hasUnconfirmedDraft) return;
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
  }, [selectedCustomer, customers, hasUnconfirmedDraft]);

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
    if (!user || loading) return;

    // Bloquear pedido para cliente inadimplente
    const selectedCustomerObj = customers.find(c => c.id === selectedCustomer);
    if (!pendingCreation.current && selectedCustomerObj?.status === 'defaulter') {
      toast.error('Não é possível criar um pedido para este cliente. Existem pagamentos pendentes a regularizar.');
      return;
    }

    const totalAmount = totalPrice;
    const parsedPaidAmount = formData.paidAmount
      ? parseDecimalMoneyInput(formData.paidAmount)
      : 0;
    const paidAmount = parsedPaidAmount ?? Number.NaN;
    if (!formData.isExchange && !Number.isFinite(totalAmount)) {
      toast.error('Revise os valores dos produtos. Use vírgula ou ponto e até duas casas decimais.');
      return;
    }
    if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > totalAmount) {
      toast.error(`O valor pago deve estar entre R$ 0,00 e ${formatCurrency(totalAmount)}.`);
      return;
    }
    if (formData.isExchange) {
      const enteredItems = exchangeItems.filter(item => item.name.trim() || item.unitPrice.trim() || item.quantity !== '1');
      const hasInvalidItem = enteredItems.some(item => {
        const quantity = Number(item.quantity);
        const value = item.unitPrice.trim() ? parseDecimalMoneyInput(item.unitPrice) : null;
        return !item.name.trim() || item.name.trim().length > 200 || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000 ||
          (item.unitPrice.trim() && (value === null || value < 0 || value > 1000000));
      });
      if (enteredItems.length > 10 || hasInvalidItem) {
        toast.error('Confira os itens recebidos: informe um nome, quantidade inteira e valor válido.');
        return;
      }
    }

    setLoading(true);

    try {
      let orderData = pendingCreation.current;
      if (!orderData) {
        let customerId = selectedCustomer && selectedCustomer !== 'new' ? selectedCustomer : undefined;

        // Criar novo cliente ou auto-vincular se necessário
        const trimmedCustomerName = formData.customerName.trim();
        const trimmedCustomerPhone = formData.customerPhone.trim();
        const trimmedCustomerEmail = formData.customerEmail?.trim() || undefined;

        // Criar ou localizar cliente se não houver cliente existente selecionado (ou se for novo cliente/digitação direta)
        if (!customerId && trimmedCustomerName) {
          // 1. Tentar encontrar cliente existente pelo telefone ou dígitos limpos
          let existingCustomer: Customer | null = null;
          if (trimmedCustomerPhone) {
            const cleanPhoneDigits = trimmedCustomerPhone.replace(/\D/g, '');
            existingCustomer = customers.find((c) => {
              if (c.phone === trimmedCustomerPhone) return true;
              const cDigits = (c.phone || '').replace(/\D/g, '');
              return cleanPhoneDigits.length >= 8 && cDigits === cleanPhoneDigits;
            }) || null;

            if (!existingCustomer) {
              existingCustomer = await firebaseCustomerService.findCustomerByPhone(user.uid, trimmedCustomerPhone);
            }
          }

          // Se encontrou cliente existente com mesmo telefone, reutiliza o ID
          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            // 2. Se for novo cliente, grava no Firestore de forma garantida
            try {
              customerId = await firebaseCustomerService.createCustomer(user.uid, {
                name: trimmedCustomerName,
                phone: trimmedCustomerPhone,
                email: trimmedCustomerEmail,
              });

              setCustomers((prev) => [
                {
                  id: customerId,
                  name: trimmedCustomerName,
                  phone: trimmedCustomerPhone,
                  email: trimmedCustomerEmail || '',
                  createdAt: new Date().toISOString(),
                  userId: user.uid,
                  totalOrders: 0,
                  totalSpent: 0,
                } as Customer,
                ...prev.filter((c) => c.id !== customerId),
              ]);
            } catch (createErr: any) {
              if (createErr?.message?.startsWith('DUPLICATE_PHONE:')) {
                customerId = createErr.message.split(':')[1];
              } else {
                // Não criar o pedido sem o vínculo escolhido: isso deixa um pedido
                // aparentemente válido, mas perde o cadastro do cliente informado.
                throw createErr;
              }
            }
          }
        }

        const validProducts = products.filter(p => p.name.trim());
        if (validProducts.length > 10) {
          toast.error('O pedido não pode ter mais de 10 produtos.');
          return;
        }
        const productName = validProducts
          .map(p => parseInt(p.quantity) > 1 ? `${p.name.trim()} (${p.quantity}x)` : p.name.trim())
          .join(', ');
        const totalQuantity = validProducts.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);

        const orderItems: OrderItem[] = validProducts.map(p => {
          const qty = Math.max(1, parseInt(p.quantity, 10) || 1);
          const parsedUnit = p.unitPrice.trim() ? parseDecimalMoneyInput(p.unitPrice) : null;
          const unitPrice = parsedUnit !== null ? parsedUnit : 0;
          return {
            name: p.name.trim(),
            quantity: qty,
            unitPrice,
            price: Number((qty * unitPrice).toFixed(2)),
          };
        });

        const singleUnitPrice = orderItems.length === 1 && orderItems[0].unitPrice > 0 ? orderItems[0].unitPrice : null;
        const pricingMode = orderItems.length === 1 ? (singleUnitPrice !== null ? 'unit' : 'total') : 'items';

        const selectedMember = userProfile?.role === 'admin' && assignedTo !== '__none__'
          ? teamMembers.find(m => m.uid === assignedTo)
          : null;

        orderData = {
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          productName,
          quantity: totalQuantity,
          price: totalAmount,
          pricingMode,
          unitPrice: singleUnitPrice,
          items: orderItems,
          status: formData.status,
          deliveryDate: formData.deliveryDate,
          notes: formData.notes || undefined,
          tags: tags.length > 0 ? tags : undefined,
          customerId,
          assignedTo: selectedMember?.uid || undefined,
          assignedToName: selectedMember?.displayName || undefined,
          assignedAt: selectedMember ? new Date().toISOString() : undefined,
          assignedBy: selectedMember ? (user?.displayName || user?.email || 'Admin') : undefined,
          cardColor: formData.cardColor || undefined,
          isExchange: formData.isExchange || undefined,
          exchangeNotes: formData.exchangeNotes || undefined,
          exchangeItems: formData.isExchange
            ? exchangeItems.filter(item => item.name.trim()).map(item => ({
                name: item.name.trim(),
                quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
                value: item.unitPrice.trim() ? (parseDecimalMoneyInput(item.unitPrice) ?? undefined) : undefined,
              } as ExchangeItem))
            : undefined,
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
            status: totalAmount === 0
              ? (formData.paymentStatus || 'paid')
              : (paidAmount >= totalAmount ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending')),
            method: formData.paymentMethod || null,
            totalAmount,
            paidAmount,
            remainingAmount: Math.round(Math.max(0, totalAmount - paidAmount) * 100) / 100,
            paymentDate: paidAmount > 0 ? new Date().toISOString() : null,
            notes: null,
            history: null,
          },
        };
        const operation = savePendingOrderOperation(user.uid, operationScope, {
          orderData, formData, products, exchangeItems, tags, selectedCustomer, isNewCustomer, assignedTo,
        }, idempotencyKey);
        orderData = operation.payload.orderData;
        pendingCreation.current = orderData;
      }
      setHasUnconfirmedDraft(true);
      const createdOrder = await firebaseOrderService.createOrder(orderData, undefined, undefined, idempotencyKey);
      const customerId = orderData.customerId || undefined;

      trackOrderCreated(createdOrder.id, totalAmount, formData.status);
      toast.success('Pedido salvo com sucesso.');

      if (pendingFiles.length > 0) {
        setIsUploadingAttachment(true);
        setAttachmentUploadProgress(0);
        try {
          for (let index = 0; index < pendingFiles.length; index++) {
            const file = pendingFiles[index];
            const attachment = await firebaseStorageService.uploadOrderAttachment(
              file,
              user.uid,
              createdOrder.id,
              progress => setAttachmentUploadProgress(
                Math.round(((index + progress / 100) / pendingFiles.length) * 100),
              ),
            );
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
          toast.error('Pedido criado, mas não foi possível enviar todos os anexos. Reabra o pedido e tente novamente.');
        } finally {
          setIsUploadingAttachment(false);
          setAttachmentUploadProgress(0);
        }
      }

      for (const g of pendingGallery) {
        try {
          const tempId = `${Date.now()}_${secureRandomId()}`;
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

      clearPendingOrderOperation(user.uid, operationScope);
      setHasUnconfirmedDraft(false);
      setOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Erro ao criar pedido:', err);
      if (!hasUnconfirmedDraft && isDefinitiveOrderRejection(err)) {
        clearPendingOrderOperation(user.uid, operationScope);
        pendingCreation.current = null;
        setIdempotencyKey(secureRandomId(20));
        setHasUnconfirmedDraft(false);
      } else {
        setHasUnconfirmedDraft(Boolean(pendingCreation.current));
      }
      const rawMsg = String(err?.message || err?.code || '').toLowerCase();

      if (rawMsg.includes('offline') || rawMsg.includes('network') || rawMsg.includes('unavailable') || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        toast.error('Sem conexão com a internet. Verifique sua rede antes de tentar salvar o pedido.');
      } else if (rawMsg.includes('permission') || rawMsg.includes('unauthorized')) {
        toast.error('Você não possui permissão para criar novos pedidos. Solicite liberação ao administrador.');
      } else if (rawMsg.includes('storage') || rawMsg.includes('upload') || rawMsg.includes('file')) {
        toast.error('Não foi possível enviar os arquivos anexados. Verifique o tamanho do arquivo e tente novamente.');
      } else {
        toast.error('Não foi possível confirmar o salvamento. Confira a lista de pedidos antes de tentar novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const canCreate = hasPermission(p => p.orders?.create ?? false);

  if (!canCreate) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!loading) setOpen(value); }}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button data-testid="new-order-button" className="gap-2">
            <Plus className="size-4" />
            Novo Pedido
          </Button>
        </DialogTrigger>
      )}
      <DialogContent size="2xl" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
          <DialogTitle>Adicionar Novo Pedido</DialogTitle>
          <DialogDescription className={initialDraft ? '' : 'sr-only'}>{initialDraft ? 'Dados do rascunho carregados no formulário. Revise e confirme para salvar; o pedido ainda não foi criado.' : 'Formulário para criar um novo pedido'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <DialogBody className="p-4 sm:p-6 space-y-4">
          {hasUnconfirmedDraft && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>O resultado da tentativa anterior está pendente. Clique em Confirmar pedido para verificar a mesma operação antes de iniciar outro pedido.</span>
              </div>
            </div>
          )}
          <fieldset disabled={hasUnconfirmedDraft || loading} className="contents">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: OrderStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status" className="h-10 text-base sm:text-sm">
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

            {userProfile?.role === 'admin' && (
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Responsável pela Produção</Label>
                <Select
                  value={assignedTo}
                  onValueChange={setAssignedTo}
                >
                  <SelectTrigger id="assignedTo" className="h-10 text-base sm:text-sm">
                    <SelectValue placeholder="Sem responsável" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__none__">Sem responsável (Pendente)</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.uid} value={member.uid}>
                        {member.displayName} {member.role === 'funcionario' ? '(Equipe)' : member.role === 'admin' ? '(Admin)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
            <div className="space-y-2 rounded-lg border border-primary/20 bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label>O que você recebe</Label>
                  <p className="text-xs text-muted-foreground">Registre os itens e o valor estimado da parceria.</p>
                </div>
                <Button type="button" variant="outline" size="sm" disabled={exchangeItems.length >= 10}
                  onClick={() => setExchangeItems(items => [...items, { name: '', quantity: '1', unitPrice: '' }])}>
                  <Plus className="size-3.5" /> Item
                </Button>
              </div>
              {exchangeItems.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_64px_100px_32px] gap-2">
                  <Input aria-label={`Item recebido ${index + 1}`} placeholder="Item recebido" value={item.name}
                    onChange={event => setExchangeItems(items => items.map((entry, i) => i === index ? { ...entry, name: event.target.value } : entry))} />
                  <Input aria-label={`Quantidade recebida ${index + 1}`} type="number" min="1" max="10000" step="1" value={item.quantity}
                    onChange={event => setExchangeItems(items => items.map((entry, i) => i === index ? { ...entry, quantity: event.target.value } : entry))} />
                  <Input aria-label={`Valor estimado ${index + 1}`} inputMode="decimal" placeholder="Valor (R$)" value={item.unitPrice}
                    onChange={event => setExchangeItems(items => items.map((entry, i) => i === index ? { ...entry, unitPrice: event.target.value.replace(/[^0-9.,]/g, '') } : entry))} />
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remover item recebido ${index + 1}`} disabled={exchangeItems.length === 1}
                    onClick={() => setExchangeItems(items => items.filter((_, i) => i !== index))}>×</Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <TagInput
              tags={tags}
              onChange={setTags}
              maxTags={MAX_ORDER_TAGS}
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="flex items-center gap-1.5">
                <Paperclip className="size-3.5" /> Anexos
              </Label>
              <Button asChild variant="outline" size="sm" disabled={isUploadingAttachment} className="shrink-0 whitespace-nowrap">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*,.pdf"
                    onChange={handleAttachmentSelect}
                    disabled={isUploadingAttachment}
                  />
                  <Upload className="size-4" />
                  {isUploadingAttachment ? 'Enviando...' : 'Adicionar arquivo'}
                </label>
              </Button>
            </div>
            {isUploadingAttachment && (
              <div className="space-y-1.5" role="status" aria-live="polite">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Preparando e enviando arquivos</span>
                  <span>{attachmentUploadProgress}%</span>
                </div>
                <Progress value={attachmentUploadProgress} aria-label="Progresso do envio dos anexos" />
              </div>
            )}
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
                      aria-label={`Remover anexo ${att.name || idx + 1}`}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full size-5 items-center justify-center text-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex"
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
              onPaymentStatusChange={(status) => setFormData({
                ...formData,
                paymentStatus: status,
                ...(status === 'paid' ? { paidAmount: formatDecimalMoneyInput(totalPrice) } : {}),
                ...(status === 'pending' ? { paidAmount: '0,00' } : {}),
              })}
              paymentMethod={formData.paymentMethod}
              onPaymentMethodChange={(method) => setFormData({ ...formData, paymentMethod: method })}
              paidAmount={formData.paidAmount}
              onPaidAmountChange={(paid) => {
                const parsed = parseDecimalMoneyInput(paid);
                let autoStatus: PaymentStatus = formData.paymentStatus;
                if (parsed !== null && totalPrice > 0) {
                  if (parsed >= totalPrice) autoStatus = 'paid';
                  else if (parsed > 0) autoStatus = 'partial';
                  else autoStatus = 'pending';
                } else if (paid === '' || parsed === 0) {
                  autoStatus = 'pending';
                }
                setFormData({ ...formData, paidAmount: paid, paymentStatus: autoStatus });
              }}
              totalPrice={totalPrice}
              formatCurrency={formatCurrency}
            />
          )}

          </fieldset>
          </DialogBody>
          <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-card">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={loading || (!hasUnconfirmedDraft && customers.find(c => c.id === selectedCustomer)?.status === 'defaulter')}
            >
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              {hasUnconfirmedDraft ? 'Confirmar pedido' : 'Adicionar Pedido'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

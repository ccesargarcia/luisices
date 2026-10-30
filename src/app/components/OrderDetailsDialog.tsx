import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Order, OrderItem, OrderStatus, PaymentStatus, PaymentMethod, Tag, ExchangeItem, GalleryItem, UserProfile, canAccessArchivedOrders, canAccessEmails } from '../types';
import { Trash2, Edit, Copy, Download, Archive, ArchiveRestore, Mail, Loader2, Link2, Link2Off, MoreHorizontal, AlertTriangle } from 'lucide-react';
import { exportOrderPDF } from '../utils/exportPdf';
import { useUserSettings } from '../../hooks/useUserSettings';
import { useFirebaseCustomers } from '../../hooks/useFirebaseCustomers';
import { SendEmailDialog } from './emails/SendEmailDialog';
import { useState, useMemo, useEffect } from 'react';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { firebaseUserService } from '../../services/firebaseUserService';
import { firebaseStorageService } from '../../services/firebaseStorageService';
import { firebaseGalleryService } from '../../services/firebaseGalleryService';
import { orderTrackingService } from '../../services/orderTrackingService';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrdersContext';
import { toast } from 'sonner';
import { parseDecimalMoneyInput } from '../utils/parseDecimalMoneyInput';
import { formatDecimalMoneyInput } from '../utils/formatDecimalMoneyInput';
import { reconstructOrderProducts } from '../utils/reconstructOrderProducts';
import { secureRandomId } from '../utils/random';
import { loadPendingOrderOperation, savePendingOrderOperation, clearPendingOrderOperation, isDefinitiveOrderRejection, PendingOrderOperation } from '../../services/pendingOrderOperations';
import { OrderInfoView } from './orders/OrderInfoView';
import { OrderEditForm, ProductItem, OrderEditState } from './orders/OrderEditForm';
import { OrderAttachmentsSection } from './orders/OrderAttachmentsSection';
import { OrderGallerySection } from './orders/OrderGallerySection';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onDeleteOrder?: (orderId: string) => void;
  onToggleArchive?: (orderId: string, archive: boolean) => void;
  onOrderUpdated?: (order: Order) => void;
  trackingUrl?: string;
  onTrackingLinkChanged?: (orderId: string, url: string | null) => void;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const statusLabels = {
  pending: 'Pendente',
  'in-progress': 'Em Produção',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export function OrderDetailsDialog({ order, open, onOpenChange, onUpdateStatus, onDeleteOrder, onToggleArchive, onOrderUpdated, trackingUrl, onTrackingLinkChanged }: OrderDetailsDialogProps) {
  const { user, userProfile, isAdmin, hasPermission } = useAuth();
  const { settings } = useUserSettings();
  const { teamMembers } = useOrders();
  const { customers } = useFirebaseCustomers();

  const canArchive = isAdmin || canAccessArchivedOrders(userProfile?.permissions, 'create');
  const canUnarchive = isAdmin || canAccessArchivedOrders(userProfile?.permissions, 'edit');
  const canShareTracking = Boolean(order && !order.isArchived && ['pending', 'in-progress'].includes(order.status)
    && (isAdmin || (hasPermission(p => p.orders?.view ?? false)
      && (order.userId === user?.uid || order.assignedTo === user?.uid))));
  const [isEditing, setIsEditing] = useState(false);
  const [editOperationId, setEditOperationId] = useState<string | null>(null);
  const [hasPendingEdit, setHasPendingEdit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentUploadProgress, setAttachmentUploadProgress] = useState(0);
  const [localAttachments, setLocalAttachments] = useState<import('../types').OrderAttachment[]>([]);
  const [customerGallery, setCustomerGallery] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [creatingTrackingLink, setCreatingTrackingLink] = useState(false);
  const [revokingTrackingLink, setRevokingTrackingLink] = useState(false);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [trackingExpiration, setTrackingExpiration] = useState('90');
  const [trackingLinkActive, setTrackingLinkActive] = useState(Boolean(order?.hasPublicTracking));
  const [generatedTrackingUrl, setGeneratedTrackingUrl] = useState('');
  const [generatedTrackingExpiresAt, setGeneratedTrackingExpiresAt] = useState<string | null | undefined>(undefined);

  const [editProducts, setEditProducts] = useState<ProductItem[]>([{ name: '', quantity: '1', unitPrice: '' }]);
  const [editProductsBaseline, setEditProductsBaseline] = useState<ProductItem[]>([]);
  const [editTags, setEditTags] = useState<Tag[]>([]);
  const [editExchangeItems, setEditExchangeItems] = useState<ProductItem[]>([{ name: '', quantity: '1', unitPrice: '' }]);
  const [editData, setEditData] = useState<OrderEditState>({
    customerName: '',
    customerPhone: '',
    deliveryDate: '',
    notes: '',
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: undefined,
    paidAmount: '',
    isExchange: false,
    exchangeNotes: '',
    cardColor: '',
  });

  const totalPrice = useMemo(() => {
    // Pedidos antigos guardam somente o total. Os preços unitários reconstruídos
    // são arredondados para centavos; enquanto o usuário não altera preço ou
    // quantidade, mantenha o total histórico exato.
    const pricingUnchanged = editProducts.length === editProductsBaseline.length &&
      editProducts.every((product, index) =>
        product.quantity === editProductsBaseline[index]?.quantity &&
        product.unitPrice === editProductsBaseline[index]?.unitPrice
      );
    if (pricingUnchanged && order) return order.price;

    return editProducts.reduce((sum, p) => {
      const qty = parseFloat(p.quantity) || 0;
      const unit = parseDecimalMoneyInput(String(p.unitPrice || ''));
      if (unit === null) return Number.NaN;
      return sum + qty * unit;
    }, 0);
  }, [editProducts, editProductsBaseline, order?.id, order?.price]);

  const editPricingChanged = editProducts.length !== editProductsBaseline.length ||
    editProducts.some((product, index) =>
      product.quantity !== editProductsBaseline[index]?.quantity ||
      product.unitPrice !== editProductsBaseline[index]?.unitPrice
    );

  const matchedCustomer = useMemo(() => {
    if (!order) return null;
    return customers.find(
      (c) =>
        (order.customerId && c.id === order.customerId) ||
        (c.name && order.customerName && c.name.toLowerCase() === order.customerName.toLowerCase())
    ) || null;
  }, [order, customers]);

  const customerEmail = matchedCustomer?.email || '';

  const orderEmailBody = useMemo(() => {
    if (!order) return '';
    const firstName = (order.customerName || 'Cliente').split(' ')[0];
    const itemsText = order.productName
      ? `- ${order.productName} (Qtd: ${order.quantity})`
      : '- Itens personalizados sob encomenda';
    const deliveryText = order.deliveryDate
      ? new Date(order.deliveryDate).toLocaleDateString('pt-BR')
      : 'A combinar';
    const totalText = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.price || 0);

    return `Olá, ${firstName}!

Segue a atualização sobre o seu Pedido ${order.orderNumber || '#' + order.id}:

📦 Resumo do Pedido:
${itemsText}
- Valor Total: ${totalText}
- Data Prevista de Entrega: ${deliveryText}
- Status Atual: ${statusLabels[order.status] || order.status}

Qualquer dúvida ou ajuste, estamos à total disposição por aqui ou via WhatsApp.

Com carinho,
Equipe ${settings?.businessName || 'Luisices'}`;
  }, [order, settings?.businessName]);

  const formatCurrencyEdit = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const currentTrackingExpiresAt = generatedTrackingExpiresAt !== undefined
    ? generatedTrackingExpiresAt
    : order?.publicTrackingExpiresAt;
  const trackingExpiryLabel = currentTrackingExpiresAt === null
    ? 'Este link não expira.'
    : typeof currentTrackingExpiresAt === 'string' && Number.isFinite(Date.parse(currentTrackingExpiresAt))
      ? `Validade até ${new Intl.DateTimeFormat('pt-BR').format(new Date(currentTrackingExpiresAt))}.`
      : 'A validade deste link não está disponível.';

  const handleCreateTrackingLink = async () => {
    if (!order || creatingTrackingLink) return;
    setCreatingTrackingLink(true);
    const toastId = toast.loading('Gerando link seguro de acompanhamento...');
    try {
      const expirationDays = trackingExpiration === 'never' ? null : Number(trackingExpiration) as 7 | 30 | 90;
      const link = await orderTrackingService.createLink(order.id, expirationDays);
      const token = link.token;
      setGeneratedTrackingExpiresAt(link.expiresAt);
      const base = import.meta.env.BASE_URL || '/';
      const url = new URL(`${base.replace(/\/$/, '')}/acompanhar/${token}`, window.location.origin).toString();
      setGeneratedTrackingUrl(url);
      onTrackingLinkChanged?.(order.id, url);
      setTrackingLinkActive(true);
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copiado. Envie para o cliente acompanhar o pedido.', { id: toastId });
      } catch {
        toast.info('Link criado. Copie o endereço exibido abaixo.', { id: toastId });
      }
    } catch (error) {
      console.error('Erro ao gerar link de acompanhamento:', error);
      const code = (error as { code?: string })?.code;
      toast.error(code === 'functions/already-exists' || code === 'already-exists'
        ? 'Este pedido já tem um link ativo. Revogue-o antes de criar outro.'
        : 'Não foi possível gerar o link de acompanhamento.', { id: toastId });
    } finally {
      setCreatingTrackingLink(false);
    }
  };

  const handleRevokeTrackingLink = async () => {
    if (!order || revokingTrackingLink) return;
    setRevokingTrackingLink(true);
    try {
      await orderTrackingService.revokeLink(order.id);
      setTrackingLinkActive(false);
      setGeneratedTrackingUrl('');
      setGeneratedTrackingExpiresAt(undefined);
      onTrackingLinkChanged?.(order.id, null);
      toast.success('Link de acompanhamento desativado.');
    } catch (error) {
      console.error('Erro ao desativar link de acompanhamento:', error);
      toast.error('Não foi possível desativar o link.');
    } finally {
      setRevokingTrackingLink(false);
    }
  };

  // Resetar estado de edição sempre que o pedido aberto mudar
  useEffect(() => {
    setIsEditing(false);
    setEditOperationId(null);
    setHasPendingEdit(Boolean(user && order && loadPendingOrderOperation(user.uid, `edit:${order.id}`)));
    setGeneratedTrackingUrl('');
    setGeneratedTrackingExpiresAt(undefined);
  }, [order?.id, user?.uid]);

  useEffect(() => {
    setTrackingLinkActive(Boolean(order?.hasPublicTracking));
  }, [order?.id, order?.hasPublicTracking]);

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [singleCreatorName, setSingleCreatorName] = useState<string | null>(null);

  useEffect(() => {
    if (!open || (userProfile?.role !== 'admin' && userProfile?.role !== 'funcionario')) return;
    firebaseUserService.listUsers()
      .then(users => {
        setAllUsers(users);
        setEmployees(users.filter(candidate => candidate.role === 'funcionario' && candidate.active));
      })
      .catch(() => {
        setAllUsers([]);
        setEmployees([]);
      });
  }, [open, userProfile?.role]);

  // Fallback dedicado para buscar o criador direto caso o pedido ainda não tenha o nome resolvido
  useEffect(() => {
    if (!open || !order?.userId) {
      setSingleCreatorName(null);
      return;
    }

    if (order.createdByName && order.createdByName !== 'Usuário proprietário') {
      setSingleCreatorName(order.createdByName);
      return;
    }

    if (order.userId === user?.uid) {
      setSingleCreatorName(user.displayName || user.email || 'Você');
      return;
    }

    const inTeam = teamMembers?.find(m => m.uid === order.userId);
    if (inTeam?.displayName) {
      setSingleCreatorName(inTeam.displayName);
      return;
    }

    const inAll = allUsers.find(u => u.uid === order.userId);
    if (inAll?.displayName || inAll?.email) {
      setSingleCreatorName(inAll.displayName || inAll.email || null);
      return;
    }

    let active = true;
    firebaseUserService.getUserProfile(order.userId)
      .then(profile => {
        if (active && profile) {
          setSingleCreatorName(profile.displayName || profile.email || null);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [open, order?.id, order?.userId, order?.createdByName, user, teamMembers, allUsers]);

  const displayCreatedByName = useMemo(() => {
    if (singleCreatorName && singleCreatorName !== 'Usuário proprietário') {
      return singleCreatorName;
    }
    if (order?.createdByName && order.createdByName !== 'Usuário proprietário') {
      return order.createdByName;
    }
    if (order?.userId) {
      if (order.userId === user?.uid) {
        return user.displayName || user.email || 'Você';
      }
      const inTeam = teamMembers?.find(m => m.uid === order.userId);
      if (inTeam?.displayName) {
        return inTeam.displayName;
      }
      const found = allUsers.find(u => u.uid === order.userId);
      if (found?.displayName || found?.email) {
        return found.displayName || found.email;
      }
    }
    return (order?.createdByName && order.createdByName !== 'Usuário proprietário')
      ? order.createdByName
      : undefined;
  }, [order?.createdByName, order?.userId, user, allUsers, singleCreatorName, teamMembers]);

  const effectiveOrder = useMemo(() => {
    if (!order) return null;
    return {
      ...order,
      createdByName: displayCreatedByName,
    };
  }, [order, displayCreatedByName]);

  // Sincronizar anexos quando o pedido mudar (ex: listener Firestore)
  useEffect(() => {
    setLocalAttachments(order?.attachments ?? []);
  }, [order?.id, order?.attachments]);

  // Carregar artes do cliente quando o pedido mudar
  useEffect(() => {
    if (!order || !user) { setCustomerGallery([]); return; }
    const cid = order.customerId;
    const cname = order.customerName;
    if (!cid && !cname) { setCustomerGallery([]); return; }
    setGalleryLoading(true);
    firebaseGalleryService.getItems(user.uid).then(items => {
      setCustomerGallery(items.filter(g =>
        (cid && g.customerId === cid) || (!cid && g.customerName === cname)
      ));
    }).catch(() => {}).finally(() => setGalleryLoading(false));
  }, [order?.id, order?.customerId, order?.customerName, user]);

  if (!order) return null;

  const resetEditData = () => {
    const parsedProducts: ProductItem[] = reconstructOrderProducts(
      order.productName,
      order.quantity,
      order.price,
      order.unitPrice,
      order.items,
    );
    setEditProducts(parsedProducts.length > 0 ? parsedProducts : [{ name: '', quantity: '1', unitPrice: '' }]);
    setEditProductsBaseline(parsedProducts);
    setEditTags(order.tags ? [...order.tags] : []);
    setEditExchangeItems(
      order.exchangeItems && order.exchangeItems.length > 0
        ? order.exchangeItems.map(i => ({ name: i.name, quantity: String(i.quantity), unitPrice: i.value != null ? String(i.value) : '' }))
        : [{ name: '', quantity: '1', unitPrice: '' }]
    );
    setEditData({
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryDate: order.deliveryDate,
      notes: order.notes || '',
      status: order.status,
      paymentStatus: order.payment?.status || 'pending',
      paymentMethod: order.payment?.method || undefined,
      paidAmount: order.payment?.paidAmount != null
        ? formatDecimalMoneyInput(order.payment.paidAmount)
        : '',
      isExchange: order.isExchange || false,
      exchangeNotes: order.exchangeNotes || '',
      cardColor: order.cardColor || '',
    });
  };

  const handleEditClick = () => {
    resetEditData();
    const pending = user && loadPendingOrderOperation(user.uid, `edit:${order.id}`);
    setHasPendingEdit(Boolean(pending));
    setEditOperationId(pending ? pending.id : secureRandomId(20));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditOperationId(null);
    resetEditData();
  };

  const confirmEdit = async (operation: PendingOrderOperation<{ updates: Partial<Order>; expectedVersion: number }>) => {
    await firebaseOrderService.updateOrder(order.id, operation.payload.updates, operation.payload.expectedVersion, operation.id);
    // A replay may confirm an old version; show the actual current order instead
    // of synthesizing version + 1 or overwriting a later concurrent edit locally.
    const saved = await firebaseOrderService.getOrderByIdFromServer(order.id);
    onOrderUpdated?.(saved);
    if (user) clearPendingOrderOperation(user.uid, `edit:${order.id}`);
    setHasPendingEdit(false);
    setEditOperationId(null);
    setIsEditing(false);
  };

  const handleAssign = async (value: string) => {
    if (!order || userProfile?.role !== 'admin') return;
    const employee = employees.find(candidate => candidate.uid === value) || null;
    setAssigning(true);
    try {
      await firebaseOrderService.assignOrder(order.id, employee);
      toast.success(employee ? `Pedido atribuído a ${employee.displayName}` : 'Atribuição removida');
    } catch (error) {
      console.error('Erro ao atribuir pedido:', error);
      toast.error('Não foi possível atualizar o responsável');
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!user || isSaving) return;
    const pending = loadPendingOrderOperation<{ updates: Partial<Order>; expectedVersion: number }>(user.uid, `edit:${order.id}`);
    setIsSaving(true);
    try {
      if (pending) {
        await confirmEdit(pending);
        return;
      }
      const validProducts = editProducts.filter(p => p.name.trim());
      if (validProducts.length === 0) {
        toast.error('Informe pelo menos um produto para o pedido.');
        return;
      }
      if (validProducts.length > 10) {
        toast.error('O pedido não pode ter mais de 10 produtos.');
        return;
      }
      const productQuantities = validProducts.map(p => Number(p.quantity));
      if (productQuantities.some(quantity => !Number.isInteger(quantity) || quantity < 1 || quantity > 10000)) {
        toast.error('A quantidade de cada produto deve ser um número inteiro entre 1 e 10.000.');
        return;
      }
      const totalQuantity = productQuantities.reduce((sum, quantity) => sum + quantity, 0);
      if (totalQuantity > 10000) {
        toast.error('A quantidade total do pedido não pode ultrapassar 10.000 itens.');
        return;
      }

      const parsedPaidAmount = parseDecimalMoneyInput(String(editData.paidAmount || '0'));
      if (parsedPaidAmount === null) {
        toast.error('Informe um valor pago válido, com até duas casas decimais.');
        return;
      }
      if (!Number.isFinite(totalPrice)) {
        toast.error('Revise os preços dos produtos. Use vírgula ou ponto e até duas casas decimais.');
        return;
      }
      const paidAmt = parsedPaidAmount;
      const price = totalPrice > 0 ? totalPrice : order.price;
      if (price > 1000000) {
        toast.error('O valor total do pedido não pode ultrapassar R$ 1.000.000,00.');
        return;
      }
      if (paidAmt > price) {
        toast.error('O valor pago não pode ser maior que o total do pedido.');
        return;
      }
      const remainingAmount = price - paidAmt;

      const productName = validProducts
        .map(p => parseInt(p.quantity) > 1 ? `${p.name.trim()} (${p.quantity}x)` : p.name.trim())
        .join(', ');

      const allHaveExplicitUnitPrice = validProducts.length > 0 && validProducts.every(p => {
        return p.unitPrice.trim() !== '' && parseDecimalMoneyInput(p.unitPrice) !== null;
      });

      let updatedItems: OrderItem[] | null = null;
      let singleUnitPrice: number | null = null;
      let pricingMode = order.pricingMode || 'total';

      if (allHaveExplicitUnitPrice) {
        updatedItems = validProducts.map(p => {
          const qty = Math.max(1, parseInt(p.quantity, 10) || 1);
          const unitPrice = parseDecimalMoneyInput(p.unitPrice)!;
          return {
            name: p.name.trim(),
            quantity: qty,
            unitPrice,
            price: Number((qty * unitPrice).toFixed(2)),
          };
        });
        singleUnitPrice = updatedItems.length === 1 ? updatedItems[0].unitPrice : null;
        pricingMode = updatedItems.length === 1 ? 'unit' : 'items';
      } else if (!editPricingChanged && order.items && order.items.length > 0) {
        // Se a precificação não foi alterada e o pedido já possui itens estruturados, preserve-os intactos
        updatedItems = order.items;
        singleUnitPrice = typeof order.unitPrice === 'number' ? order.unitPrice : null;
        pricingMode = order.pricingMode || (order.items.length === 1 ? 'unit' : 'items');
      } else if (validProducts.length === 1) {
        const singleQty = totalQuantity || 1;
        const average = price / singleQty;
        const averageInCents = Math.round(average * 100);
        const inferredPrice = Math.abs(average * 100 - averageInCents) < 1e-8
          ? averageInCents / 100
          : null;
        const resolvedUnit = typeof order.unitPrice === 'number' ? order.unitPrice : inferredPrice;
        if (resolvedUnit !== null) {
          updatedItems = [{
            name: validProducts[0].name.trim(),
            quantity: singleQty,
            unitPrice: resolvedUnit,
            price,
          }];
          singleUnitPrice = resolvedUnit;
          pricingMode = 'unit';
        } else {
          updatedItems = null;
          singleUnitPrice = null;
          pricingMode = 'total';
        }
      } else {
        // Pedido com múltiplos itens onde os preços unitários não foram informados (ex: pedido legado).
        // NUNCA inventar média (price / totalQuantity). Manter items nulo para não falsear dados.
        updatedItems = null;
        singleUnitPrice = null;
        pricingMode = 'total';
      }

      // Preservar histórico e metadados de pagamentos anteriores com status e saldo consistentes
      const existingPayment = order.payment;
      const resolvedPaymentStatus: PaymentStatus = price === 0
        ? (editData.paymentStatus === 'pending' ? 'pending' : 'paid')
        : (paidAmt >= price ? 'paid' : (paidAmt > 0 ? 'partial' : 'pending'));

      const effectivePaidAmount = Math.min(paidAmt, price);
      const isFirstPaymentRegistration = (existingPayment?.paidAmount || 0) === 0 && effectivePaidAmount > 0;
      const resolvedPaymentDate = effectivePaidAmount === 0
        ? null
        : (existingPayment?.paymentDate || (isFirstPaymentRegistration ? new Date().toISOString() : null));

      const paymentData: any = editData.isExchange ? {
        status: 'paid',
        method: null,
        totalAmount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        paymentDate: null,
        notes: null,
        history: null,
      } : {
        status: resolvedPaymentStatus,
        method: editData.paymentMethod || existingPayment?.method || null,
        totalAmount: price,
        paidAmount: effectivePaidAmount,
        remainingAmount: Math.round(Math.max(0, price - effectivePaidAmount) * 100) / 100,
        paymentDate: resolvedPaymentDate,
        notes: existingPayment?.notes || null,
        history: existingPayment?.history && existingPayment.history.length > 0 ? existingPayment.history : undefined,
      };

      const updates: Partial<Omit<Order, 'id' | 'userId' | 'createdAt' | 'orderNumber'>> = {
          customerName: editData.customerName,
          customerPhone: editData.customerPhone,
          productName,
          quantity: totalQuantity,
          price,
          items: updatedItems,
          unitPrice: singleUnitPrice,
          pricingMode,
          deliveryDate: editData.deliveryDate,
          notes: editData.notes?.trim() ? editData.notes.trim() : null,
          status: editData.status,
          tags: editTags.length > 0 ? editTags : null,
          payment: paymentData,
          isExchange: Boolean(editData.isExchange),
          exchangeNotes: editData.isExchange && editData.exchangeNotes?.trim() ? editData.exchangeNotes.trim() : null,
          cardColor: editData.cardColor || null,
          exchangeItems: editData.isExchange
            ? editExchangeItems
                .filter(i => i.name.trim())
                .map(i => {
                  const value = i.unitPrice ? parseDecimalMoneyInput(i.unitPrice) : null;
                  return {
                    name: i.name.trim(),
                    quantity: parseInt(i.quantity) || 1,
                    value: value ?? undefined,
                  } as ExchangeItem;
                })
            : [],
        };
      const opId = editOperationId || secureRandomId(20);
      if (!editOperationId) setEditOperationId(opId);
      const operation = savePendingOrderOperation(user.uid, `edit:${order.id}`, {
        updates, expectedVersion: order.version || 1,
      }, opId);
      await confirmEdit(operation);
    } catch (error: any) {
      if ((!pending && isDefinitiveOrderRejection(error)) || error?.details?.operationState === 'not-applied') {
        clearPendingOrderOperation(user.uid, `edit:${order.id}`);
        setHasPendingEdit(false);
        setEditOperationId(null);
        if (error?.details?.operationState === 'not-applied') {
          setIsEditing(false);
          try { onOrderUpdated?.(await firebaseOrderService.getOrderByIdFromServer(order.id)); } catch { /* The user can refresh later. */ }
        }
      } else {
        setHasPendingEdit(true);
      }
      console.error('Erro ao atualizar pedido:', error);
      toast.error(error.message || 'Erro ao atualizar pedido');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!order || !user || isDuplicating) return;
    const scope = `duplicate:${order.id}`;
    const operation = loadPendingOrderOperation(user.uid, scope)
      || savePendingOrderOperation(user.uid, scope, { sourceId: order.id });
    setIsDuplicating(true);
    try {
      await firebaseOrderService.duplicateOrder(order.id, operation.id);
      clearPendingOrderOperation(user.uid, scope);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao duplicar pedido:', error);
      toast.error('Erro ao duplicar pedido');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!order) return;
    setIsArchiving(true);
    try {
      if (order.isArchived) {
        await firebaseOrderService.unarchiveOrder(order.id);
        toast.success('Pedido desarquivado com sucesso!');
        onToggleArchive?.(order.id, false);
      } else {
        await firebaseOrderService.archiveOrder(order.id);
        toast.success('Pedido arquivado com sucesso!');
        onToggleArchive?.(order.id, true);
      }
    } catch (error) {
      console.error('Erro ao alterar arquivamento:', error);
      toast.error('Não foi possível alterar o arquivamento do pedido');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !order || !user) return;
    setIsUploadingAttachment(true);
    setAttachmentUploadProgress(0);
    const previewUrl = URL.createObjectURL(file);
    const optimistic: import('../types').OrderAttachment = {
      url: previewUrl,
      thumbnail: previewUrl,
      name: file.name,
      isPdf: file.type === 'application/pdf',
    };
    setLocalAttachments(prev => [...prev, optimistic]);
    try {
      const attachment = await firebaseStorageService.uploadOrderAttachment(
        file,
        user.uid,
        order.id,
        setAttachmentUploadProgress,
      );
      await firebaseOrderService.addAttachment(order.id, attachment);
      setLocalAttachments(prev => prev.map(a => a.url === previewUrl ? attachment : a));
      URL.revokeObjectURL(previewUrl);
      if (!attachment.isPdf && (order.customerId || order.customerName)) {
        try {
          const galleryItem = await firebaseGalleryService.createItem(user.uid, {
            title: file.name.replace(/\.[^.]+$/, ''),
            imageUrl: attachment.url,
            customerId: order.customerId,
            customerName: order.customerName,
            orderId: order.id,
          });
          setCustomerGallery(prev => [galleryItem, ...prev]);
        } catch (galleryErr) {
          console.error('Erro ao vincular à galeria:', galleryErr);
          toast.error('Anexo salvo, mas não foi possível vincular à galeria');
        }
      }
    } catch (error: any) {
      setLocalAttachments(prev => prev.filter(a => a.url !== previewUrl));
      URL.revokeObjectURL(previewUrl);
      toast.error(error.message || 'Erro ao enviar arquivo');
    } finally {
      setIsUploadingAttachment(false);
      setAttachmentUploadProgress(0);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = async (url: string) => {
    if (!order) return;
    setLocalAttachments(prev => prev.filter(a => a.url !== url));
    try {
      await firebaseOrderService.removeAttachment(order.id, url);
    } catch (error) {
      console.error('Erro ao remover anexo:', error);
      setLocalAttachments(order.attachments ?? []);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
          <div className="flex flex-col gap-2">
            <DialogTitle className="text-base sm:text-lg">
              {isEditing ? 'Editar Pedido' : `Detalhes do Pedido ${order.orderNumber || '#' + order.id}`}
            </DialogTitle>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {!isEditing && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportOrderPDF(effectiveOrder || order, settings?.businessName)}
                    className="hidden shrink-0 gap-2 sm:inline-flex"
                  >
                    <Download className="size-4" />
                    PDF
                  </Button>
                  {hasPermission(p => canAccessEmails(p, 'create')) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEmailDialogOpen(true)}
                      className="hidden shrink-0 gap-2 sm:inline-flex"
                      title="Enviar detalhes por e-mail"
                    >
                      <Mail className="size-4 text-primary" />
                      E-mail
                    </Button>
                  )}
                  {canShareTracking && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTrackingDialogOpen(true)}
                      className="shrink-0 gap-2"
                      title="Compartilhar uma página segura de acompanhamento com o cliente"
                    >
                      <Link2 className="size-4" />
                      {trackingLinkActive ? 'Gerenciar link' : 'Link do cliente'}
                    </Button>
                  )}
                  {hasPermission(p => p.orders?.create ?? false) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDuplicate}
                      disabled={isDuplicating}
                      className="hidden shrink-0 gap-2 sm:inline-flex"
                    >
                      <Copy className="size-4" />
                      {isDuplicating ? 'Duplicando...' : 'Duplicar'}
                    </Button>
                  )}
                  {hasPermission(p => p.orders?.edit ?? false) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEditClick}
                      className="shrink-0 gap-2"
                    >
                      <Edit className="size-4" />
                      Editar
                    </Button>
                  )}
                  {((order.isArchived && canUnarchive) || (!order.isArchived && canArchive)) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleToggleArchive}
                      disabled={isArchiving}
                      className="hidden shrink-0 gap-1.5 sm:inline-flex"
                      title={order.isArchived ? 'Desarquivar este pedido' : 'Arquivar este pedido'}
                    >
                      {order.isArchived ? (
                        <>
                          <ArchiveRestore className="size-4 text-emerald-600 dark:text-emerald-400" />
                          Desarquivar
                        </>
                      ) : (
                        <>
                          <Archive className="size-4 text-muted-foreground" />
                          Arquivar
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
              {!isEditing && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 sm:hidden"
                      aria-label="Mais ações do pedido"
                      title="Mais ações do pedido"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onSelect={() => exportOrderPDF(effectiveOrder || order, settings?.businessName)}>
                      <Download className="size-4" /> Exportar PDF
                    </DropdownMenuItem>
                    {hasPermission(p => canAccessEmails(p, 'create')) && (
                      <DropdownMenuItem onSelect={() => setEmailDialogOpen(true)}>
                        <Mail className="size-4" /> Enviar por e-mail
                      </DropdownMenuItem>
                    )}
                    {hasPermission(p => p.orders?.create ?? false) && (
                      <DropdownMenuItem disabled={isDuplicating} onSelect={handleDuplicate}>
                        <Copy className="size-4" /> {isDuplicating ? 'Duplicando...' : 'Duplicar pedido'}
                      </DropdownMenuItem>
                    )}
                    {((order.isArchived && canUnarchive) || (!order.isArchived && canArchive)) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={isArchiving} onSelect={handleToggleArchive}>
                          {order.isArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                          {isArchiving ? 'Atualizando...' : order.isArchived ? 'Desarquivar pedido' : 'Arquivar pedido'}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {order.isArchived && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 flex items-center gap-1 font-medium">
                  <Archive className="size-3" />
                  Arquivado
                </Badge>
              )}
              <Badge className={`shrink-0 ${statusColors[order.status]}`}>
                {statusLabels[order.status]}
              </Badge>
            </div>
          </div>
          <DialogDescription className="sr-only">
            {isEditing ? 'Formulário para edição dos dados do pedido' : 'Informações detalhadas do pedido'}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          /* Modo de Edição */
          <DialogBody className="p-4 sm:p-6">
            {hasPendingEdit ? (
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber-600 flex-shrink-0" />
                    <span>A tentativa anterior de salvar este pedido ainda está pendente de confirmação. Clique em Confirmar para validar o resultado.</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSaveEdit} disabled={isSaving}>
                    {isSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
                    {isSaving ? 'Confirmando...' : 'Confirmar edição pendente'}
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>Fechar edição</Button>
                </div>
              </div>
            ) : (
            <OrderEditForm
              editData={editData}
              onEditDataChange={setEditData}
              editProducts={editProducts}
              onEditProductsChange={setEditProducts}
              editExchangeItems={editExchangeItems}
              onEditExchangeItemsChange={setEditExchangeItems}
              editTags={editTags}
              onEditTagsChange={setEditTags}
              totalPrice={totalPrice}
              originalPrice={order.price}
              formatCurrency={formatCurrencyEdit}
              onCancel={handleCancelEdit}
              onSave={handleSaveEdit}
              isSaving={isSaving}
            />
            )}
          </DialogBody>
        ) : (
          /* Modo de Visualização */
          <>
            <DialogBody className="p-4 sm:p-6 space-y-6">
              <OrderInfoView
                order={effectiveOrder || order}
                customer={matchedCustomer}
                onOrderUpdated={onOrderUpdated}
              />

              <div className="rounded-lg border p-4 space-y-2">
                <label className="text-sm font-medium">Responsável pela execução</label>
                {userProfile?.role === 'admin' ? (
                  <Select
                    value={order.assignedTo || '__none__'}
                    onValueChange={value => handleAssign(value === '__none__' ? '' : value)}
                    disabled={assigning}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sem responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem responsável</SelectItem>
                      {employees.map(employee => (
                        <SelectItem key={employee.uid} value={employee.uid}>{employee.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">{order.assignedToName || 'Sem responsável atribuído'}</p>
                )}
              </div>

              {/* Artes do Cliente */}
              <OrderGallerySection
                customerName={order.customerName}
                customerId={order.customerId}
                orderId={order.id}
                userId={user?.uid}
                gallery={customerGallery}
                loading={galleryLoading}
                canCreate={hasPermission(p => p.gallery?.create ?? false)}
                onGalleryUpdated={setCustomerGallery}
              />

              {/* Anexos */}
              <OrderAttachmentsSection
                attachments={localAttachments}
                canEdit={hasPermission(p => p.orders?.edit ?? false)}
                isUploading={isUploadingAttachment}
                uploadProgress={attachmentUploadProgress}
                onUploadAttachment={handleUploadAttachment}
                onRemoveAttachment={handleRemoveAttachment}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">Atualizar Status</label>
                <Select
                  value={order.status}
                  onValueChange={(value: OrderStatus) => onUpdateStatus(order.id, value)}
                >
                  <SelectTrigger>
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
            </DialogBody>

            <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border flex items-center justify-between">
              {onDeleteOrder && (hasPermission(p => p.orders?.delete ?? false) || order.userId === user?.uid) ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="gap-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                      <Trash2 className="size-4" />
                      Excluir Pedido
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O pedido{' '}
                        <strong>{order.orderNumber || '#' + order.id}</strong> será
                        removido permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => onDeleteOrder(order.id)}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : <div />}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>

      {order && (
        <SendEmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          contextTitle={`Pedido ${order.orderNumber || '#' + order.id}`}
          contextSubtitle={`Enviar atualização para ${order.customerName}`}
          defaultRecipient={customerEmail}
          defaultSubject={`Atualização do seu Pedido ${order.orderNumber || '#' + order.id} - ${settings?.businessName || 'Luisices'}`}
          defaultBody={orderEmailBody}
        />
      )}

      <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Acompanhamento do cliente</DialogTitle>
            <DialogDescription>
              Compartilhe uma página com o status e a previsão do pedido. Dados pessoais e valores não aparecem nela.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {trackingLinkActive ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                <p className="font-medium text-foreground">Há um link ativo para este pedido.</p>
                <p className="mt-1 text-muted-foreground">{trackingExpiryLabel}</p>
                <p className="mt-1 text-muted-foreground">Para criar outro link, primeiro revogue este. O pedido mantém somente um link ativo por vez.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Escolha por quanto tempo o link ficará disponível. A validade é verificada pelo servidor.</p>
                <label className="text-sm font-medium" htmlFor="tracking-expiration">Validade do link</label>
                <Select value={trackingExpiration} onValueChange={setTrackingExpiration}>
                  <SelectTrigger id="tracking-expiration"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                    <SelectItem value="never">Sem expiração</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Depois de revogar um link, você poderá criar outro.</p>
              </div>
            )}

            {(generatedTrackingUrl || trackingUrl) && (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="generated-tracking-url">Link criado</label>
                <Input id="generated-tracking-url" readOnly value={generatedTrackingUrl || trackingUrl} onFocus={event => event.currentTarget.select()} />
              </div>
            )}
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between">
            {trackingLinkActive ? (
              <div className="flex flex-wrap gap-2">
                {(generatedTrackingUrl || trackingUrl) && <Button variant="outline" onClick={() => void navigator.clipboard.writeText(generatedTrackingUrl || trackingUrl || '').then(() => toast.success('Link copiado.')).catch(() => toast.error('Não foi possível copiar o link.'))} className="gap-2"><Copy className="size-4" />Copiar link</Button>}
                <Button variant="destructive" onClick={handleRevokeTrackingLink} disabled={revokingTrackingLink} className="gap-2">
                  {revokingTrackingLink ? <Loader2 className="size-4 animate-spin" /> : <Link2Off className="size-4" />}
                  Desativar link
                </Button>
              </div>
            ) : (
              <Button onClick={handleCreateTrackingLink} disabled={creatingTrackingLink} className="gap-2">
                {creatingTrackingLink ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
                {creatingTrackingLink ? 'Criando…' : 'Criar e copiar link'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

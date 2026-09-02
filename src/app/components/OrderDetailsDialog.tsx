import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Order, OrderStatus, ProductionStep, PaymentStatus, PaymentMethod, Tag, ExchangeItem, GalleryItem } from '../types';
import { Trash2, Edit, Copy, Download } from 'lucide-react';
import { exportOrderPDF } from '../utils/exportPdf';
import { useUserSettings } from '../../hooks/useUserSettings';
import { useState, useMemo, useEffect } from 'react';
import { ProductionWorkflowComponent } from './ProductionWorkflow';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { firebaseStorageService } from '../../services/firebaseStorageService';
import { firebaseGalleryService } from '../../services/firebaseGalleryService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { OrderInfoView } from './orders/OrderInfoView';
import { OrderEditForm, ProductItem, OrderEditState } from './orders/OrderEditForm';
import { OrderAttachmentsSection } from './orders/OrderAttachmentsSection';
import { OrderGallerySection } from './orders/OrderGallerySection';

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onDeleteOrder?: (orderId: string) => void;
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

export function OrderDetailsDialog({ order, open, onOpenChange, onUpdateStatus, onDeleteOrder }: OrderDetailsDialogProps) {
  const { user, hasPermission } = useAuth();
  const { settings } = useUserSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [localAttachments, setLocalAttachments] = useState<import('../types').OrderAttachment[]>([]);
  const [customerGallery, setCustomerGallery] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  const [editProducts, setEditProducts] = useState<ProductItem[]>([{ name: '', quantity: '1', unitPrice: '' }]);
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
    return editProducts.reduce((sum, p) => {
      const qty = parseFloat(p.quantity) || 0;
      const unit = parseFloat(p.unitPrice) || 0;
      return sum + qty * unit;
    }, 0);
  }, [editProducts]);

  const formatCurrencyEdit = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Resetar estado de edição sempre que o pedido aberto mudar
  useEffect(() => {
    setIsEditing(false);
  }, [order?.id]);

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
    const parsedProducts: ProductItem[] = order.productName
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map((s, _i, arr) => {
        const match = s.match(/^(.+?)\s*\((\d+)x\)$/);
        const qty = match ? parseInt(match[2]) : order.quantity;
        const name = match ? match[1].trim() : s;
        const unitPrice = arr.length === 1
          ? String(order.price / (order.quantity || 1))
          : '';
        return { name, quantity: String(qty), unitPrice };
      });
    setEditProducts(parsedProducts.length > 0 ? parsedProducts : [{ name: '', quantity: '1', unitPrice: '' }]);
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
      paidAmount: order.payment?.paidAmount || '' as number | '',
      isExchange: order.isExchange || false,
      exchangeNotes: order.exchangeNotes || '',
      cardColor: order.cardColor || '',
    });
  };

  const handleEditClick = () => {
    resetEditData();
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    resetEditData();
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const paidAmt = Number(editData.paidAmount) || 0;
      const price = totalPrice > 0 ? totalPrice : order.price;
      const remainingAmount = price - paidAmt;

      const productName = editProducts
        .filter(p => p.name.trim())
        .map(p => parseInt(p.quantity) > 1 ? `${p.name.trim()} (${p.quantity}x)` : p.name.trim())
        .join(', ');
      const totalQuantity = editProducts.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);

      const paymentData: any = {
        status: editData.paymentStatus,
        method: editData.paymentMethod || null,
        totalAmount: price,
        paidAmount: paidAmt,
        remainingAmount,
        paymentDate: paidAmt > 0 ? new Date().toISOString() : null,
        notes: null,
      };

      await firebaseOrderService.updateOrder(order.id, {
        customerName: editData.customerName,
        customerPhone: editData.customerPhone,
        productName,
        quantity: totalQuantity,
        price,
        deliveryDate: editData.deliveryDate,
        notes: editData.notes || undefined,
        status: editData.status,
        tags: editTags.length > 0 ? editTags : undefined,
        payment: paymentData,
        isExchange: editData.isExchange || undefined,
        exchangeNotes: editData.exchangeNotes || undefined,
        cardColor: editData.cardColor || undefined,
        exchangeItems: editData.isExchange
          ? editExchangeItems
              .filter(i => i.name.trim())
              .map(i => ({
                name: i.name.trim(),
                quantity: parseInt(i.quantity) || 1,
                value: i.unitPrice ? parseFloat(i.unitPrice) : undefined,
              } as ExchangeItem))
          : undefined,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      toast.error('Erro ao atualizar pedido');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateWorkflowStep = async (step: ProductionStep, completed: boolean) => {
    try {
      await firebaseOrderService.updateProductionStep(order.id, step, completed);
    } catch (error) {
      console.error('Erro ao atualizar workflow:', error);
      toast.error('Erro ao atualizar etapa do workflow');
    }
  };

  const handleDuplicate = async () => {
    if (!order) return;
    setIsDuplicating(true);
    try {
      await firebaseOrderService.duplicateOrder(order.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao duplicar pedido:', error);
      toast.error('Erro ao duplicar pedido');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !order || !user) return;
    setIsUploadingAttachment(true);
    const previewUrl = URL.createObjectURL(file);
    const optimistic: import('../types').OrderAttachment = {
      url: previewUrl,
      thumbnail: previewUrl,
      name: file.name,
      isPdf: file.type === 'application/pdf',
    };
    setLocalAttachments(prev => [...prev, optimistic]);
    try {
      const attachment = await firebaseStorageService.uploadOrderAttachment(file, user.uid, order.id);
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
      <DialogContent className="w-full max-w-full sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <DialogTitle className="text-base sm:text-lg">
              {isEditing ? 'Editar Pedido' : `Detalhes do Pedido ${order.orderNumber || '#' + order.id}`}
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!isEditing && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportOrderPDF(order, settings?.businessName)}
                    className="gap-2"
                  >
                    <Download className="size-4" />
                    PDF
                  </Button>
                  {hasPermission(p => p.orders?.create ?? false) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDuplicate}
                      disabled={isDuplicating}
                      className="gap-2"
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
                      className="gap-2"
                    >
                      <Edit className="size-4" />
                      Editar
                    </Button>
                  )}
                </>
              )}
              <Badge className={statusColors[order.status]}>
                {statusLabels[order.status]}
              </Badge>
            </div>
          </div>
          <div className="sr-only">Informações detalhadas do pedido</div>
        </DialogHeader>

        <div className="space-y-6">
          {isEditing ? (
            /* Modo de Edição */
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
          ) : (
            /* Modo de Visualização */
            <>
              <OrderInfoView order={order} />

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
                onUploadAttachment={handleUploadAttachment}
                onRemoveAttachment={handleRemoveAttachment}
              />

              {/* Workflow de Produção */}
              {order.productionWorkflow && (
                <div className="border-t pt-4">
                  <ProductionWorkflowComponent
                    workflow={order.productionWorkflow}
                    onUpdateStep={handleUpdateWorkflowStep}
                    readonly={false}
                  />
                </div>
              )}

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

              <div className="flex justify-between items-center pt-4">
                {onDeleteOrder && hasPermission(p => p.orders?.delete ?? false) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
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
                )}
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
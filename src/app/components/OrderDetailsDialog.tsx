import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Order, OrderStatus, ProductionStep, PaymentStatus, PaymentMethod, Tag, ExchangeItem } from '../types';
import { Calendar, DollarSign, Package, Phone, User, FileText, Clock, Tag as TagIcon, Trash2, Edit, Save, X, Plus, Copy, Paperclip, Upload, ExternalLink, ImageIcon, Repeat2 } from 'lucide-react';
import { getTextColor } from '../utils/tagColors';
import { useState, useMemo, useEffect } from 'react';
import { ProductionWorkflowComponent } from './ProductionWorkflow';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { firebaseStorageService } from '../../services/firebaseStorageService';
import { useAuth } from '../../contexts/AuthContext';
import { TagInput } from './TagInput';
import { Switch } from './ui/switch';

interface ProductItem {
  name: string;
  quantity: string;
  unitPrice: string;
}

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
  const { user } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [localAttachments, setLocalAttachments] = useState<import('../types').OrderAttachment[]>([]);
  const [editProducts, setEditProducts] = useState<ProductItem[]>([{ name: '', quantity: '1', unitPrice: '' }]);
  const [editTags, setEditTags] = useState<Tag[]>([]);
  const [editRealCost, setEditRealCost] = useState('');
  const [editExchangeItems, setEditExchangeItems] = useState<ProductItem[]>([{ name: '', quantity: '1', unitPrice: '' }]);
  const [editData, setEditData] = useState({
    customerName: '',
    customerPhone: '',
    deliveryDate: '',
    notes: '',
    status: 'pending' as OrderStatus,
    paymentStatus: 'pending' as PaymentStatus,
    paymentMethod: undefined as PaymentMethod | undefined,
    paidAmount: '' as number | '',
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

  // Sincronizar anexos quando o pedido mudar (ex: listener Firestore)
  useEffect(() => {
    setLocalAttachments(order?.attachments ?? []);
  }, [order?.id, order?.attachments]);

  if (!order) return null;

  // Atualizar editData quando o pedido mudar
  const resetEditData = () => {
    // parse productName back into product items if possible
    // format: "Produto A (10x), Produto B (5x)" or "Produto A"
    const parsedProducts: ProductItem[] = order.productName
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => {
        const match = s.match(/^(.+?)\s*\((\d+)x\)$/);
        if (match) return { name: match[1].trim(), quantity: match[2], unitPrice: '' };
        return { name: s, quantity: String(order.quantity), unitPrice: '' };
      });
    setEditProducts(parsedProducts.length > 0 ? parsedProducts : [{ name: '', quantity: '1', unitPrice: '' }]);
    setEditTags(order.tags ? [...order.tags] : []);
    setEditRealCost(order.realCost != null ? String(order.realCost) : '');
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
        totalAmount: price,
        paidAmount: paidAmt,
        remainingAmount,
      };
      if (editData.paymentMethod) paymentData.method = editData.paymentMethod;
      if (paidAmt > 0) paymentData.paymentDate = new Date().toISOString();

      await firebaseOrderService.updateOrder(order.id, {
        customerName: editData.customerName,
        customerPhone: editData.customerPhone,
        productName,
        quantity: totalQuantity,
        price,
        deliveryDate: editData.deliveryDate,
        notes: editData.notes || null,
        status: editData.status,
        tags: editTags.length > 0 ? editTags : null,
        payment: paymentData,
        realCost: editRealCost !== '' ? parseFloat(editRealCost) : null,
        isExchange: editData.isExchange || null,
        exchangeNotes: editData.exchangeNotes || null,
        cardColor: editData.cardColor || null,
        exchangeItems: editData.isExchange
          ? editExchangeItems
              .filter(i => i.name.trim())
              .map(i => ({
                name: i.name.trim(),
                quantity: parseInt(i.quantity) || 1,
                value: i.unitPrice ? parseFloat(i.unitPrice) : undefined,
              } as ExchangeItem))
          : null,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      alert('Erro ao atualizar pedido');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateWorkflowStep = async (step: ProductionStep, completed: boolean) => {
    try {
      await firebaseOrderService.updateProductionStep(order.id, step, completed);
      // O hook vai atualizar automaticamente
    } catch (error) {
      console.error('Erro ao atualizar workflow:', error);
      alert('Erro ao atualizar etapa do workflow');
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
      alert('Erro ao duplicar pedido');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !order || !user) return;
    setIsUploadingAttachment(true);
    // Prévia otimista com object URL enquanto faz upload
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
      // Substituir prévia pelo anexo real
      setLocalAttachments(prev => prev.map(a => a.url === previewUrl ? attachment : a));
      URL.revokeObjectURL(previewUrl);
    } catch (error: any) {
      // Reverter prévia em caso de erro
      setLocalAttachments(prev => prev.filter(a => a.url !== previewUrl));
      URL.revokeObjectURL(previewUrl);
      alert(error.message || 'Erro ao enviar arquivo');
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = async (url: string) => {
    if (!order) return;
    // Remover otimisticamente da UI
    setLocalAttachments(prev => prev.filter(a => a.url !== url));
    try {
      await firebaseOrderService.removeAttachment(order.id, url);
    } catch (error) {
      console.error('Erro ao remover anexo:', error);
      // Reverter se falhar
      setLocalAttachments(order.attachments ?? []);
    }
  };

  const handleDelete = () => {
    if (confirmDelete && onDeleteOrder) {
      onDeleteOrder(order.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle>
              {isEditing ? 'Editar Pedido' : `Detalhes do Pedido ${order.orderNumber || '#' + order.id}`}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <>
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEditClick}
                    className="gap-2"
                  >
                    <Edit className="size-4" />
                    Editar
                  </Button>
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
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Nome do Cliente *</Label>
                  <Input
                    id="customerName"
                    value={editData.customerName}
                    onChange={(e) => setEditData({ ...editData, customerName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Telefone *</Label>
                  <Input
                    id="customerPhone"
                    value={editData.customerPhone}
                    onChange={(e) => setEditData({ ...editData, customerPhone: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Produtos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Produtos *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 h-7 text-xs"
                    onClick={() => setEditProducts(prev => [...prev, { name: '', quantity: '1', unitPrice: '' }])}
                  >
                    <Plus className="size-3" /> Adicionar item
                  </Button>
                </div>
                <div className="grid grid-cols-[1fr_56px_96px_36px] gap-2 px-1">
                  <span className="text-xs text-muted-foreground">Produto</span>
                  <span className="text-xs text-muted-foreground text-center">Qtd</span>
                  <span className="text-xs text-muted-foreground text-right">Valor unit.</span>
                  <span />
                </div>
                <div className="space-y-2">
                  {editProducts.map((item, idx) => {
                    const sub = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="grid grid-cols-[1fr_56px_96px_36px] gap-2 items-center">
                          <Input
                            placeholder={`Produto ${idx + 1}`}
                            value={item.name}
                            onChange={e => setEditProducts(prev => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                            required={idx === 0}
                          />
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => setEditProducts(prev => prev.map((p, i) => i === idx ? { ...p, quantity: e.target.value } : p))}
                            className="text-center px-1"
                          />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0,00"
                            value={item.unitPrice}
                            onChange={e => setEditProducts(prev => prev.map((p, i) => i === idx ? { ...p, unitPrice: e.target.value } : p))}
                            className="text-right px-2"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-9 text-muted-foreground hover:text-destructive"
                            onClick={() => setEditProducts(prev => prev.filter((_, i) => i !== idx))}
                            disabled={editProducts.length === 1}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        {sub > 0 && (
                          <p className="text-xs text-muted-foreground text-right pr-10">
                            subtotal: {formatCurrencyEdit(sub)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {totalPrice > 0 && (
                  <div className="flex justify-end border-t pt-2">
                    <span className="text-sm font-semibold">Total: {formatCurrencyEdit(totalPrice)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryDate">Data de Entrega *</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={editData.deliveryDate}
                    onChange={(e) => setEditData({ ...editData, deliveryDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStatus">Status *</Label>
                  <Select
                    value={editData.status}
                    onValueChange={(value: OrderStatus) => setEditData({ ...editData, status: value })}
                  >
                    <SelectTrigger id="editStatus">
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
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={3}
                  placeholder="Observações sobre o pedido..."
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
                  checked={editData.isExchange}
                  onCheckedChange={v => setEditData({ ...editData, isExchange: v })}
                />
              </div>
              {editData.isExchange && (
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
                        onClick={() => setEditExchangeItems(prev => [...prev, { name: '', quantity: '1', unitPrice: '' }])}
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
                      {editExchangeItems.map((item, idx) => {
                        const sub = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                        return (
                          <div key={idx} className="space-y-0.5">
                            <div className="grid grid-cols-[1fr_56px_96px_36px] gap-2 items-center">
                              <Input
                                placeholder={`Item ${idx + 1}`}
                                value={item.name}
                                onChange={e => setEditExchangeItems(prev => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                              />
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={e => setEditExchangeItems(prev => prev.map((p, i) => i === idx ? { ...p, quantity: e.target.value } : p))}
                                className="text-center px-1"
                              />
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0,00"
                                value={item.unitPrice}
                                onChange={e => setEditExchangeItems(prev => prev.map((p, i) => i === idx ? { ...p, unitPrice: e.target.value } : p))}
                                className="text-right px-2"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-9 text-muted-foreground hover:text-destructive"
                                onClick={() => setEditExchangeItems(prev => prev.filter((_, i) => i !== idx))}
                                disabled={editExchangeItems.length === 1}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                            {sub > 0 && (
                              <p className="text-xs text-muted-foreground text-right pr-10">
                                subtotal: {formatCurrencyEdit(sub)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {(() => {
                      const total = editExchangeItems.reduce((s, p) => s + (parseFloat(p.quantity)||0)*(parseFloat(p.unitPrice)||0), 0);
                      return total > 0 ? (
                        <div className="flex justify-end border-t border-purple-200 pt-2">
                          <span className="text-sm font-semibold text-purple-800 dark:text-purple-300">Valor estimado: {formatCurrencyEdit(total)}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  {/* Observações livres */}
                  <div className="space-y-1.5">
                    <Label htmlFor="editExchangeNotes" className="text-sm text-purple-800 dark:text-purple-300">Observações da permuta</Label>
                    <Textarea
                      id="editExchangeNotes"
                      value={editData.exchangeNotes}
                      onChange={e => setEditData({ ...editData, exchangeNotes: e.target.value })}
                      placeholder="Ex: artes para redes sociais em troca de impressões..."
                      rows={2}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tags</Label>
                <TagInput
                  tags={editTags}
                  onChange={setEditTags}
                  placeholder="Adicione tags para categorizar o pedido..."
                />
              </div>

              {/* Cor do card */}
              <div className="space-y-2">
                <Label>Cor do card</Label>
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => setEditData({ ...editData, cardColor: '' })}
                    className={`size-7 rounded-full border-2 flex items-center justify-center text-xs transition-all ${
                      !editData.cardColor ? 'border-foreground scale-110' : 'border-muted-foreground/40 hover:border-muted-foreground'
                    }`}
                  >
                    ✕
                  </button>
                  {['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#a855f7','#14b8a6'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditData({ ...editData, cardColor: editData.cardColor === color ? '' : color })}
                      className={`size-7 rounded-full border-2 transition-all ${
                        editData.cardColor === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Seção de Pagamento */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-medium text-sm">Informações de Pagamento</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentStatus">Status do Pagamento *</Label>
                    <Select
                      value={editData.paymentStatus}
                      onValueChange={(value: any) => setEditData({ ...editData, paymentStatus: value })}
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
                    <Label htmlFor="paymentMethod">Método de Pagamento (opcional)</Label>
                    <Select
                      value={editData.paymentMethod || 'none'}
                      onValueChange={(value: any) => setEditData({ ...editData, paymentMethod: value === 'none' ? undefined : value })}
                    >
                      <SelectTrigger id="paymentMethod">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        <SelectItem value="pix">Pix</SelectItem>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                        <SelectItem value="credit">Cartão de Crédito</SelectItem>
                        <SelectItem value="debit">Cartão de Débito</SelectItem>
                        <SelectItem value="transfer">Transferência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paidAmount">Valor Pago (R$)</Label>
                    <Input
                      id="paidAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editData.paidAmount}
                      onChange={(e) => setEditData({ ...editData, paidAmount: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total</Label>
                    <Input
                      type="text"
                      value={formatCurrencyEdit(totalPrice > 0 ? totalPrice : order.price)}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Restante</Label>
                    <Input
                      type="text"
                      value={formatCurrencyEdit((totalPrice > 0 ? totalPrice : order.price) - (Number(editData.paidAmount) || 0))}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
              </div>

              {/* Custo Real */}
              <div className="border-t pt-4 space-y-3">
                <h3 className="font-medium text-sm">Custo de Produção</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="realCost">Custo Real (R$)</Label>
                    <Input
                      id="realCost"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={editRealCost}
                      onChange={e => setEditRealCost(e.target.value)}
                    />
                  </div>
                  {editRealCost !== '' && (totalPrice > 0 || order.price > 0) && (
                    <div className="space-y-2">
                      <Label>Margem estimada</Label>
                      <div className="h-10 flex items-center px-3 border rounded-md bg-muted text-sm font-medium">
                        {formatCurrencyEdit((totalPrice > 0 ? totalPrice : order.price) - parseFloat(editRealCost || '0'))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                  <X className="size-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={isSaving}>
                  <Save className="size-4 mr-2" />
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* Modo de Visualização */
            <>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="size-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm text-muted-foreground">Cliente</div>
                  <div className="font-medium">{order.customerName}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="size-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm text-muted-foreground">Telefone</div>
                  <div className="font-medium">{order.customerPhone}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Package className="size-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm text-muted-foreground">Produto</div>
                  <div className="font-medium">{order.productName}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Quantidade: {order.quantity} unidades
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="size-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm text-muted-foreground">Data de Entrega</div>
                  <div className="font-medium">{formatDate(order.deliveryDate)}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="size-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm text-muted-foreground">Valor Total</div>
                  <div className="font-medium text-lg">{formatCurrency(order.price)}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(order.price / order.quantity)} por unidade
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="size-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm text-muted-foreground">Criado em</div>
                  <div className="font-medium">{formatDate(order.createdAt)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Permuta / Parceria */}
          {order.isExchange && (
            <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <Repeat2 className="size-5 text-purple-600 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="text-sm font-medium text-purple-800 dark:text-purple-300">Permuta / Parceria</div>
                {order.exchangeItems && order.exchangeItems.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-purple-700 dark:text-purple-400">Itens recebidos:</p>
                    <div className="space-y-0.5">
                      {order.exchangeItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm text-purple-700 dark:text-purple-400">
                          <span>{item.quantity > 1 ? `${item.name} (${item.quantity}x)` : item.name}</span>
                          {item.value != null && item.value > 0 && (
                            <span className="text-xs">{formatCurrency(item.quantity * item.value)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {(() => {
                      const total = order.exchangeItems.reduce((s, i) => s + (i.quantity * (i.value ?? 0)), 0);
                      return total > 0 ? (
                        <div className="flex justify-end border-t border-purple-200 pt-1">
                          <span className="text-xs font-semibold text-purple-800 dark:text-purple-300">Valor estimado: {formatCurrency(total)}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
                {order.exchangeNotes && (
                  <div className="text-sm text-purple-700 dark:text-purple-400">{order.exchangeNotes}</div>
                )}
              </div>
            </div>
          )}

          {order.notes && (
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <FileText className="size-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium mb-1">Observações</div>
                <div className="text-sm text-muted-foreground">{order.notes}</div>
              </div>
            </div>
          )}

          {order.tags && order.tags.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <TagIcon className="size-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium mb-2">Tags</div>
                <div className="flex flex-wrap gap-2">
                  {order.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      className="border-0"
                      style={{
                        backgroundColor: tag.color,
                        color: getTextColor(tag.color)
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Informações de Pagamento */}
          {order.payment && (
            <div className="border-t pt-4">
              <h3 className="font-medium text-sm mb-4">Informações de Pagamento</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={`ml-2 ${
                    order.payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                    order.payment.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.payment.status === 'paid' ? 'Pago' :
                     order.payment.status === 'partial' ? 'Parcial' : 'Pendente'}
                  </Badge>
                </div>
                {order.payment.method && (
                  <div>
                    <span className="text-muted-foreground">Método:</span>
                    <span className="ml-2 font-medium">
                      {order.payment.method === 'pix' ? 'Pix' :
                       order.payment.method === 'cash' ? 'Dinheiro' :
                       order.payment.method === 'credit' ? 'Cartão de Crédito' :
                       order.payment.method === 'debit' ? 'Cartão de Débito' :
                       'Transferência'}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Valor Pago:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {formatCurrency(order.payment.paidAmount)}
                  </span>
                </div>
                {order.payment.remainingAmount > 0 && (
                  <div>
                    <span className="text-muted-foreground">Restante:</span>
                    <span className="ml-2 font-medium text-orange-600">
                      {formatCurrency(order.payment.remainingAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custo Real */}
          {order.realCost != null && (
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <DollarSign className="size-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium mb-1">Custo Real de Produção</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Custo real:</span>
                    <span className="ml-2 font-medium">{formatCurrency(order.realCost)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Margem:</span>
                    <span className={`ml-2 font-medium ${
                      order.price - order.realCost >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(order.price - order.realCost)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Anexos */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <Paperclip className="size-4" /> Anexos
              </h3>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="sr-only"
                  accept="image/*,.pdf"
                  onChange={handleUploadAttachment}
                  disabled={isUploadingAttachment}
                />
                <span className="inline-flex items-center gap-1.5 text-xs border rounded-md px-2.5 py-1.5 hover:bg-muted transition-colors">
                  <Upload className="size-3.5" />
                  {isUploadingAttachment ? 'Enviando...' : 'Enviar arquivo'}
                </span>
              </label>
            </div>
            {localAttachments.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {localAttachments.map((att, idx) => (
                  <div key={idx} className="relative group">
                    {!att.isPdf ? (
                      <a href={att.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={att.thumbnail ?? att.url}
                          alt={att.name ?? `Anexo ${idx + 1}`}
                          className="w-full h-20 object-cover rounded-md border hover:opacity-90 transition-opacity"
                          loading="lazy"
                        />
                      </a>
                    ) : (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center h-20 border rounded-md bg-muted hover:bg-muted/70 transition-colors gap-1 px-1"
                      >
                        <ImageIcon className="size-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground text-center truncate w-full px-1">{att.name ?? 'PDF'}</span>
                        <ExternalLink className="size-3 text-muted-foreground" />
                      </a>
                    )}
                    <button
                      onClick={() => handleRemoveAttachment(att.url)}
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
            {onDeleteOrder && (
              <Button
                variant={confirmDelete ? "destructive" : "outline"}
                onClick={handleDelete}
                className="gap-2"
              >
                <Trash2 className="size-4" />
                {confirmDelete ? 'Confirmar Exclusão' : 'Excluir Pedido'}
              </Button>
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
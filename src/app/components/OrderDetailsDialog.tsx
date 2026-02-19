import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Order, OrderStatus, ProductionStep, PaymentStatus, PaymentMethod, Tag } from '../types';
import { Calendar, DollarSign, Package, Phone, User, FileText, Clock, Tag as TagIcon, Trash2, Edit, Save, X, Plus } from 'lucide-react';
import { getTextColor } from '../utils/tagColors';
import { useState, useMemo } from 'react';
import { ProductionWorkflowComponent } from './ProductionWorkflow';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { TagInput } from './TagInput';

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editProducts, setEditProducts] = useState<ProductItem[]>([{ name: '', quantity: '1', unitPrice: '' }]);
  const [editTags, setEditTags] = useState<Tag[]>([]);
  const [editData, setEditData] = useState({
    customerName: '',
    customerPhone: '',
    deliveryDate: '',
    notes: '',
    status: 'pending' as OrderStatus,
    paymentStatus: 'pending' as PaymentStatus,
    paymentMethod: undefined as PaymentMethod | undefined,
    paidAmount: '' as number | '',
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
    setEditData({
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryDate: order.deliveryDate,
      notes: order.notes || '',
      status: order.status,
      paymentStatus: order.payment?.status || 'pending',
      paymentMethod: order.payment?.method || undefined,
      paidAmount: order.payment?.paidAmount || '' as number | '',
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

              <div className="space-y-2">
                <Label>Tags</Label>
                <TagInput
                  tags={editTags}
                  onChange={setEditTags}
                  placeholder="Adicione tags para categorizar o pedido..."
                />
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
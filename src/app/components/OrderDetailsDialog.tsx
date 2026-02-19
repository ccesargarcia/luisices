import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Order, OrderStatus, ProductionStep, PaymentStatus, PaymentMethod } from '../types';
import { Calendar, DollarSign, Package, Phone, User, FileText, Clock, Tag, Trash2, Edit, Save, X } from 'lucide-react';
import { getTextColor } from '../utils/tagColors';
import { useState } from 'react';
import { ProductionWorkflowComponent } from './ProductionWorkflow';
import { firebaseOrderService } from '../../services/firebaseOrderService';

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
  const [editData, setEditData] = useState({
    customerName: '',
    customerPhone: '',
    productName: '',
    quantity: 0,
    price: 0,
    deliveryDate: '',
    notes: '',
    paymentStatus: 'pending' as PaymentStatus,
    paymentMethod: undefined as PaymentMethod | undefined,
    paidAmount: '' as number | '',
  });

  if (!order) return null;

  // Atualizar editData quando o pedido mudar
  const resetEditData = () => {
    setEditData({
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      productName: order.productName,
      quantity: order.quantity,
      price: order.price,
      deliveryDate: order.deliveryDate,
      notes: order.notes || '',
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
      const remainingAmount = editData.price - paidAmt;

      // Montar objeto de pagamento sem campos undefined
      const paymentData: any = {
        status: editData.paymentStatus,
        totalAmount: editData.price,
        paidAmount: paidAmt,
        remainingAmount: remainingAmount,
      };
      if (editData.paymentMethod) paymentData.method = editData.paymentMethod;
      if (paidAmt > 0) paymentData.paymentDate = new Date().toISOString();

      await firebaseOrderService.updateOrder(order.id, {
        customerName: editData.customerName,
        customerPhone: editData.customerPhone,
        productName: editData.productName,
        quantity: editData.quantity,
        price: editData.price,
        deliveryDate: editData.deliveryDate,
        notes: editData.notes || null,
        payment: paymentData,
      });
      setIsEditing(false);
      // O hook de orders vai atualizar automaticamente
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productName">Produto *</Label>
                  <Input
                    id="productName"
                    value={editData.productName}
                    onChange={(e) => setEditData({ ...editData, productName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={editData.quantity}
                    onChange={(e) => setEditData({ ...editData, quantity: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Valor Total (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editData.price}
                    onChange={(e) => setEditData({ ...editData, price: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
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
                    <Label>Valor Total (R$)</Label>
                    <Input
                      type="number"
                      value={editData.price}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Restante (R$)</Label>
                    <Input
                      type="number"
                      value={(editData.price - (Number(editData.paidAmount) || 0)).toFixed(2)}
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
              <Tag className="size-5 text-muted-foreground mt-0.5" />
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
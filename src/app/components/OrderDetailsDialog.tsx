import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Order, OrderStatus } from '../types';
import { Calendar, DollarSign, Package, Phone, User, FileText, Clock, Tag, Trash2 } from 'lucide-react';
import { getTextColor } from '../utils/tagColors';
import { useState } from 'react';

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

  if (!order) return null;

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle>Detalhes do Pedido #{order.id}</DialogTitle>
            <Badge className={statusColors[order.status]}>
              {statusLabels[order.status]}
            </Badge>
          </div>
          <div className="sr-only">Informações detalhadas do pedido</div>
        </DialogHeader>

        <div className="space-y-6">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
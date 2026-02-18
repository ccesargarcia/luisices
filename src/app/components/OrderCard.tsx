import { Order } from '../types';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Phone, Calendar, Package, DollarSign, Tag } from 'lucide-react';
import { getTextColor } from '../utils/tagColors';

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
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

export function OrderCard({ order, onClick }: OrderCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{order.customerName}</CardTitle>
          <Badge className={statusColors[order.status]}>
            {statusLabels[order.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Package className="size-4 text-muted-foreground" />
          <span>{order.productName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Phone className="size-4 text-muted-foreground" />
          <span>{order.customerPhone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="size-4 text-muted-foreground" />
          <span>Entrega: {formatDate(order.deliveryDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <DollarSign className="size-4 text-muted-foreground" />
          <span>{formatCurrency(order.price)} ({order.quantity} un.)</span>
        </div>
        {order.tags && order.tags.length > 0 && (
          <div className="flex items-start gap-2 pt-2">
            <Tag className="size-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex flex-wrap gap-1">
              {order.tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  className="text-xs border-0"
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
        )}
      </CardContent>
    </Card>
  );
}
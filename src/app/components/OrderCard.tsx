import { Order } from '../types';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Phone, Calendar, Package, DollarSign, Tag, MessageCircle, Smartphone, Banknote, CreditCard, ArrowLeftRight, Repeat2 } from 'lucide-react';
import { getTextColor } from '../utils/tagColors';
import { openWhatsAppForOrder } from '../utils/whatsapp';
import { useUserSettings } from '../../hooks/useUserSettings';

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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
  const { settings } = useUserSettings();
  const compact = settings?.compactCards ?? false;
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

  const getPaymentIcon = (method?: string) => {
    switch (method) {
      case 'pix': return <Smartphone className="size-3.5" />;
      case 'cash': return <Banknote className="size-3.5" />;
      case 'credit': return <CreditCard className="size-3.5" />;
      case 'debit': return <CreditCard className="size-3.5" />;
      case 'transfer': return <ArrowLeftRight className="size-3.5" />;
      default: return null;
    }
  };

  const getPaymentLabel = (method?: string) => {
    switch (method) {
      case 'pix': return 'Pix';
      case 'cash': return 'Dinheiro';
      case 'credit': return 'Crédito';
      case 'debit': return 'Débito';
      case 'transfer': return 'Transferência';
      default: return null;
    }
  };

  return (
    <Card
      className="hover:shadow-md transition-all cursor-pointer overflow-hidden"
      onClick={onClick}
      style={order.cardColor ? {
        backgroundColor: hexToRgba(order.cardColor, 0.18),
        borderColor: order.cardColor,
        borderWidth: 1.5,
      } : undefined}
    >
      <CardHeader className={compact ? 'pb-1 pt-3 px-3' : 'pb-3'}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg truncate">{order.customerName}</CardTitle>
            {order.isExchange && (
              <div className="flex items-center gap-1 mt-1">
                <Badge className="bg-purple-100 text-purple-800 border-purple-300 border gap-1 py-0 text-xs">
                  <Repeat2 className="size-3" /> Permuta
                </Badge>
              </div>
            )}
          </div>
          <Badge className={`shrink-0 ${statusColors[order.status]}`}>
            {statusLabels[order.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={compact ? 'space-y-1.5 px-3 pb-3' : 'space-y-2'}>
        <div className="flex items-center gap-2 text-sm">
          <Package className="size-4 text-muted-foreground" />
          <span>{order.productName}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="size-4 text-muted-foreground" />
            <span>{order.customerPhone}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={(e) => {
              e.stopPropagation();
              openWhatsAppForOrder(order);
            }}
          >
            <MessageCircle className="size-4" />
            WhatsApp
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="size-4 text-muted-foreground" />
          <span>Entrega: {formatDate(order.deliveryDate)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="size-4 text-muted-foreground" />
            <span>{formatCurrency(order.price)} ({order.quantity} un.)</span>
          </div>
          {order.payment && order.payment.paidAmount > 0 && order.payment.remainingAmount > 0 && (
            <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
              <DollarSign className="size-3" />
              <span>Resta: {formatCurrency(order.payment.remainingAmount)}</span>
            </div>
          )}
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
        {order.payment && order.payment.method && (
          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            {getPaymentIcon(order.payment.method)}
            <span>{getPaymentLabel(order.payment.method)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { Order } from '../types';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Phone, Calendar, Package, DollarSign, Tag, MessageCircle, Smartphone, Banknote, CreditCard, ArrowLeftRight, Repeat2, Users } from 'lucide-react';
import { getTextColor } from '../utils/tagColors';
import { openWhatsAppForOrder } from '../utils/whatsapp';
import { useUserSettings } from '../../hooks/useUserSettings';
import { formatDateShort } from '../utils/date';
import { formatCurrency } from '../utils/currency';
import { useAuth } from '../../contexts/AuthContext';

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  isSelected?: boolean;
  onToggleSelect?: (orderId: string, selected: boolean) => void;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-800/60',
  'in-progress': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800/60',
  completed: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-200 dark:border-green-800/60',
  cancelled: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800/60',
};

const statusLabels = {
  pending: 'Pendente',
  'in-progress': 'Em Produção',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export function OrderCard({ order, onClick, isSelected = false, onToggleSelect }: OrderCardProps) {
  const { settings } = useUserSettings();
  const { user } = useAuth();
  const compact = settings?.compactCards ?? false;
  const isShared = order.userId && order.userId !== user?.uid;

  const handleSelectToggle = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
    onToggleSelect?.(order.id, !isSelected);
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
      className="glass-panel cursor-pointer overflow-hidden relative transition-all hover:-translate-y-0.5 hover:border-primary/40"
      onClick={onClick}
      style={order.cardColor ? {
        backgroundColor: hexToRgba(order.cardColor, 0.18),
        borderColor: order.cardColor,
        borderWidth: 1.5,
      } : undefined}
    >
      {onToggleSelect && (
        <div className="absolute left-3 top-3 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onToggleSelect(order.id, Boolean(checked))}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Selecionar pedido ${order.customerName}`}
            className="bg-background border-2 shadow-sm"
          />
        </div>
      )}
      {compact ? (
        /* ── COMPACT ─────────────────────────────────────── */
        <div className="px-3 py-2 space-y-1">
          {/* Row 1: name + status */}
          <div className="flex items-center justify-between gap-2 pl-8">
            <span className="font-semibold text-sm truncate flex-1">{order.customerName}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              {isShared && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 leading-4 bg-blue-50 text-blue-700 border-blue-200 gap-0.5">
                  <Users className="size-2.5" />
                  Compartilhado
                </Badge>
              )}
              {order.isExchange && <Repeat2 className="size-3 text-purple-600" />}
              <Badge className={`text-[10px] py-0 px-1.5 leading-4 ${statusColors[order.status]}`}>
                {statusLabels[order.status]}
              </Badge>
            </div>
          </div>
          {/* Row 2: product + price */}
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1 min-w-0">
              <Package className="size-3 shrink-0" />
              <span className="truncate">{order.productName}</span>
            </div>
            <span className="font-medium text-foreground shrink-0">{formatCurrency(order.price)}</span>
          </div>
          {/* Row 3: date + remaining */}
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="size-3 shrink-0" />
              <span>{formatDateShort(order.deliveryDate)}</span>
            </div>
            {order.payment && order.payment.remainingAmount > 0 && order.payment.paidAmount > 0 && (
              <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-amber-700 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-200">
                Resta {formatCurrency(order.payment.remainingAmount)}
              </span>
            )}
          </div>
          {/* Tags (compact) */}
          {order.tags && order.tags.length > 0 && (
            <div className="flex flex-wrap gap-0.5 pt-0.5">
              {order.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0 rounded-full text-[10px] font-medium leading-4"
                  style={{ backgroundColor: tag.color, color: getTextColor(tag.color) }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── COMFORTABLE ─────────────────────────────────── */
        <>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2 pl-8">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base sm:text-lg leading-snug break-words">{order.customerName}</CardTitle>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {isShared && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 py-0 text-xs">
                      <Users className="size-3" /> Compartilhado
                    </Badge>
                  )}
                  {order.isExchange && (
                    <Badge className="bg-purple-100 text-purple-800 border-purple-300 border gap-1 py-0 text-xs">
                      <Repeat2 className="size-3" /> Permuta
                    </Badge>
                  )}
                </div>
              </div>
              <Badge className={`shrink-0 text-xs ${statusColors[order.status]}`}>
                {statusLabels[order.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Package className="size-4 text-muted-foreground shrink-0" />
              <span className="truncate min-w-0">{order.productName}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Phone className="size-4 text-muted-foreground shrink-0" />
                <span className="truncate">{order.customerPhone}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  openWhatsAppForOrder(order);
                }}
              >
                <MessageCircle className="size-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="size-4 text-muted-foreground" />
              <span>Entrega: {formatDateShort(order.deliveryDate)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium min-w-0">
                <DollarSign className="size-4 text-muted-foreground shrink-0" />
                <span className="truncate">{formatCurrency(order.price)} ({order.quantity} un.)</span>
              </div>
              {order.payment && order.payment.paidAmount > 0 && order.payment.remainingAmount > 0 && (
                <div className="flex shrink-0 items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-200">
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
        </>
      )}
    </Card>
  );
}
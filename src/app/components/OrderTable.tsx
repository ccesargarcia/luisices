import React from 'react';
import { Order } from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import {
  Calendar,
  MessageCircle,
  Eye,
  Mic,
  Smartphone,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  Repeat2,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { formatDateShort } from '../utils/date';
import { formatCurrency } from '../utils/currency';
import { openWhatsAppForOrder } from '../utils/whatsapp';
import { cn } from './ui/utils';
import { getTextColor } from '../utils/tagColors';

interface OrderTableProps {
  orders: Order[];
  selectedOrderIds: string[];
  onToggleSelect?: (orderId: string, selected: boolean) => void;
  onOrderClick: (order: Order) => void;
  onToggleSelectAll?: () => void;
  allSelected?: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-800/60',
  'in-progress': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800/60',
  completed: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-200 dark:border-green-800/60',
  cancelled: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800/60',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  'in-progress': 'Em Produção',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const paymentStatusLabels: Record<string, { label: string; className: string }> = {
  paid: {
    label: 'Pago',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  partial: {
    label: 'Parcial',
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  },
  pending: {
    label: 'Pendente',
    className: 'bg-neutral-100 text-neutral-800 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300',
  },
};

export function OrderTable({
  orders,
  selectedOrderIds,
  onToggleSelect,
  onOrderClick,
  onToggleSelectAll,
  allSelected = false,
}: OrderTableProps) {
  const getPaymentIcon = (method?: string | null) => {
    switch (method) {
      case 'pix':
        return <Smartphone className="size-3" />;
      case 'cash':
        return <Banknote className="size-3" />;
      case 'credit':
      case 'debit':
        return <CreditCard className="size-3" />;
      case 'transfer':
        return <ArrowLeftRight className="size-3" />;
      default:
        return null;
    }
  };

  const isDeliveryOverdue = (deliveryDate?: string, status?: string) => {
    if (!deliveryDate || status === 'completed' || status === 'cancelled') return false;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return deliveryDate < todayStr;
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              {onToggleSelect && (
                <th className="w-10 px-3 py-3 text-center">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => onToggleSelectAll?.()}
                    aria-label="Selecionar todos os pedidos da página"
                    className="size-4"
                  />
                </th>
              )}
              <th className="px-3 py-3 w-28">Nº Pedido</th>
              <th className="px-3 py-3">Cliente</th>
              <th className="px-3 py-3">Produto / Detalhes</th>
              <th className="px-3 py-3 w-32">Entrega</th>
              <th className="px-3 py-3 w-28 text-right">Valor</th>
              <th className="px-3 py-3 w-32 text-center">Status</th>
              <th className="px-3 py-3 w-28 text-center">Pagamento</th>
              <th className="px-3 py-3 w-16 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {orders.map((order, i) => {
              const isSelected = selectedOrderIds.includes(order.id);
              const overdue = isDeliveryOverdue(order.deliveryDate, order.status);
              const isVoiceCreated = order.source === 'alexa';
              const payStatus = order.payment?.status || 'pending';
              const payConfig = paymentStatusLabels[payStatus] || paymentStatusLabels.pending;

              return (
                <tr
                  key={order.id}
                  onClick={() => onOrderClick(order)}
                  className={cn(
                    'cursor-pointer transition-colors group hover:bg-muted/40',
                    isSelected && 'bg-primary/5 hover:bg-primary/10',
                    i % 2 !== 0 && !isSelected && 'bg-muted/10'
                  )}
                >
                  {onToggleSelect && (
                    <td
                      className="px-3 py-3 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect(order.id, !isSelected);
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onToggleSelect(order.id, Boolean(checked))}
                        aria-label={`Selecionar pedido ${order.customerName}`}
                        className="size-4"
                      />
                    </td>
                  )}

                  {/* Número do Pedido */}
                  <td className="px-3 py-3 font-semibold text-foreground whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>{order.orderNumber || `#${order.id.slice(0, 6)}`}</span>
                      {isVoiceCreated && (
                        <span
                          title="Criado via Alexa"
                          className="p-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                        >
                          <Mic className="size-3" />
                        </span>
                      )}
                    </div>
                    {order.createdAt && (
                      <div className="text-[11px] text-muted-foreground font-normal">
                        {formatDateShort(order.createdAt)}
                      </div>
                    )}
                  </td>

                  {/* Cliente */}
                  <td className="px-3 py-3">
                    <div className="font-medium text-foreground truncate max-w-[180px]">
                      {order.customerName || 'Cliente não informado'}
                    </div>
                    {order.customerPhone && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">{order.customerPhone}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openWhatsAppForOrder(order);
                          }}
                          className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 p-0.5 rounded transition-colors"
                          title="Conversar no WhatsApp"
                        >
                          <MessageCircle className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Produto / Itens e Tags */}
                  <td className="px-3 py-3">
                    <div className="space-y-1 max-w-[240px]">
                      <div className="flex items-center gap-1.5 truncate text-xs font-medium text-foreground">
                        <Package className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">
                          {order.quantity > 1 ? `${order.quantity}x ` : ''}
                          {order.productName || 'Personalizado'}
                        </span>
                      </div>
                      {order.tags && order.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {order.tags.slice(0, 2).map((tag, tagIdx) => (
                            <Badge
                              key={tagIdx}
                              className="text-[10px] px-1 py-0 border-0"
                              style={{
                                backgroundColor: tag.color,
                                color: getTextColor(tag.color),
                              }}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                          {order.tags.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{order.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Data de Entrega */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    {order.deliveryDate ? (
                      <div className="flex items-center gap-1.5">
                        <Calendar className={cn('size-3.5', overdue ? 'text-destructive' : 'text-muted-foreground')} />
                        <span className={cn('text-xs font-medium', overdue && 'text-destructive font-bold')}>
                          {formatDateShort(order.deliveryDate)}
                        </span>
                        {overdue && (
                          <span title="Entrega atrasada">
                            <AlertTriangle className="size-3 text-destructive animate-pulse" />
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">A combinar</span>
                    )}
                  </td>

                  {/* Valor Total */}
                  <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">
                    {order.isExchange ? (
                      <span className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
                        <Repeat2 className="size-3" />
                        Permuta
                      </span>
                    ) : (
                      <div>
                        <span>{formatCurrency(order.price)}</span>
                        {order.payment && order.payment.paidAmount > 0 && order.payment.remainingAmount > 0 && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                            Resta: {formatCurrency(order.payment.remainingAmount)}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Status de Produção */}
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs font-medium px-2 py-0.5 border shadow-none',
                        statusColors[order.status] || 'bg-muted text-muted-foreground'
                      )}
                    >
                      {statusLabels[order.status] || order.status}
                    </Badge>
                  </td>

                  {/* Status de Pagamento */}
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className={cn('text-[11px] font-medium px-1.5 py-0.2 border', payConfig.className)}
                      >
                        {payConfig.label}
                      </Badge>
                      {order.payment?.method && (
                        <span
                          className="text-muted-foreground"
                          title={`Método: ${order.payment.method}`}
                        >
                          {getPaymentIcon(order.payment.method)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Ações */}
                  <td className="px-3 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 opacity-80 group-hover:opacity-100 hover:bg-muted cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOrderClick(order);
                      }}
                      title="Ver detalhes do pedido"
                    >
                      <Eye className="size-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

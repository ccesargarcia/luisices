import { useState, useMemo } from 'react';
import { formatCurrency } from '../utils/currency';
import { parseLocalDate, formatDateDayMonth } from '../utils/date';
import { Order, OrderStatus, WeekDay } from '../types';
import { OrderDetailsDialog } from '../components/OrderDetailsDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, TrendingUp } from 'lucide-react';
import { useFirebaseOrders } from '../../hooks/useFirebaseOrders';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { toast } from 'sonner';

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  'in-progress': 'Em Produção',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

type StatusFilter = '' | OrderStatus;

export function WeeklyCalendar() {
  const { orders, loading, error } = useFirebaseOrders();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');

  const todayStr = useMemo(() => toDateStr(new Date()), []);

  const weekDays = useMemo((): WeekDay[] => {
    const today = new Date();
    const dayOfWeek = (today.getDay() + 6) % 7;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek + currentWeekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = toDateStr(date);
      return {
        date: dateStr,
        dayName: date.toLocaleDateString('pt-BR', { weekday: 'long' }),
        orders: orders.filter((o) => o.deliveryDate === dateStr),
      };
    });
  }, [orders, currentWeekOffset]);

  const weekStats = useMemo(() => {
    const all = weekDays.flatMap((d) => d.orders);
    const total = all.length;
    const value = all.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (o.price ?? 0), 0);
    return { total, value };
  }, [weekDays]);

  const getWeekRange = () => {
    if (!weekDays.length) return '';
    const fmt = (d: Date, year?: boolean) =>
      d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', ...(year ? { year: 'numeric' } : {}) });
    const first = new Date(weekDays[0].date + 'T12:00:00');
    const last = new Date(weekDays[6].date + 'T12:00:00');
    return `${fmt(first)} \u2013 ${fmt(last, true)}`;
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await firebaseOrderService.updateOrderStatus(orderId, status);
      if (selectedOrder) setSelectedOrder({ ...selectedOrder, status });
    } catch {
      toast.error('Erro ao atualizar status do pedido');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await firebaseOrderService.deleteOrder(orderId);
      setDetailsOpen(false);
      setSelectedOrder(null);
    } catch {
      toast.error('Erro ao deletar pedido');
    }
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-center">
        <div>
          <p className="text-lg font-semibold text-red-600">Erro ao carregar pedidos</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Agenda Semanal</h1>
          <p className="text-muted-foreground">Visualize entregas por dia da semana</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeekOffset((o) => o - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md">
            <CalendarIcon className="size-4" />
            <span className="font-medium">{getWeekRange()}</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeekOffset((o) => o + 1)}>
            <ChevronRight className="size-4" />
          </Button>
          {currentWeekOffset !== 0 && (
            <Button variant="outline" onClick={() => setCurrentWeekOffset(0)}>
              Hoje
            </Button>
          )}
        </div>
      </div>

      {/* Summary + Status filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="size-4" />
            <span>
              <strong className="text-foreground">{weekStats.total}</strong>
              {weekStats.total === 1 ? ' entrega' : ' entregas'} na semana
            </span>
          </span>
          {weekStats.value > 0 && (
            <span>
              <strong className="text-foreground">{formatCurrency(weekStats.value)}</strong> em pedidos ativos
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant={statusFilter === '' ? 'default' : 'outline'} onClick={() => setStatusFilter('')}>
            Todos
          </Button>
          {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            >
              {STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const visibleOrders = statusFilter ? day.orders.filter((o) => o.status === statusFilter) : day.orders;
          const isToday = day.date === todayStr;

          return (
            <Card key={day.date} className={isToday ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="capitalize">{day.dayName}</span>
                  {isToday && <Badge variant="outline" className="text-xs">Hoje</Badge>}
                </CardTitle>
                <div className="text-muted-foreground text-sm">{formatDateDayMonth(day.date)}</div>
                <div className="text-xs text-muted-foreground">
                  {visibleOrders.length} {visibleOrders.length === 1 ? 'entrega' : 'entregas'}
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                {visibleOrders.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    {statusFilter ? 'Nenhum pedido' : 'Sem entregas'}
                  </div>
                ) : (
                  visibleOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:brightness-95 ${order.status === 'cancelled' ? 'opacity-50' : ''}`}
                      style={
                        order.cardColor
                          ? {
                              backgroundColor: hexToRgba(order.cardColor, 0.18),
                              borderColor: order.cardColor,
                              borderWidth: 1.5,
                            }
                          : { backgroundColor: 'hsl(var(--muted))' }
                      }
                      onClick={() => handleOrderClick(order)}
                    >
                      <div className={`font-medium text-sm mb-0.5 ${order.status === 'cancelled' ? 'line-through' : ''}`}>
                        {order.customerName}
                      </div>
                      <div className="text-xs text-muted-foreground mb-1.5 line-clamp-1">
                        {order.productName}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <Badge className={`text-xs ${STATUS_COLORS[order.status]}`}>
                          {STATUS_LABELS[order.status]}
                        </Badge>
                        {order.price != null && (
                          <span className="text-xs font-medium tabular-nums">
                            {formatCurrency(order.price)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <OrderDetailsDialog
        order={selectedOrder}
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setTimeout(() => setSelectedOrder(null), 300);
          }
        }}
        onUpdateStatus={handleUpdateStatus}
        onDeleteOrder={handleDeleteOrder}
      />
    </div>
  );
}

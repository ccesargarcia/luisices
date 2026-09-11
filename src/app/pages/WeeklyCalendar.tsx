import { useState, useMemo } from 'react';
import { formatCurrency } from '../utils/currency';
import { parseLocalDate, formatDateDayMonth } from '../utils/date';
import { Order, OrderStatus, WeekDay } from '../types';
import { OrderDetailsDialog } from '../components/OrderDetailsDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Loader2,
  TrendingUp,
  Users,
  UserCheck,
  Repeat2,
  Columns,
  CalendarDays,
  Package,
} from 'lucide-react';
import { useFirebaseOrders } from '../../hooks/useFirebaseOrders';
import { AdminTeamFilter } from '../components/AdminTeamFilter';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import { toast } from 'sonner';
import { cn } from '../components/ui/utils';
import { useAuth } from '../../contexts/AuthContext';

function hexToRgba(hex: string, alpha: number) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16) || 0;
  const g = parseInt(cleanHex.slice(2, 4), 16) || 0;
  const b = parseInt(cleanHex.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Converte Date para string "YYYY-MM-DD" local (evita bug de shift UTC à noite no Brasil) */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  'in-progress': 'Em Produção',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  'in-progress': 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
  completed: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  cancelled: 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
};

type StatusFilter = '' | OrderStatus;
type CalendarViewMode = 'adaptive' | 'board' | 'day';

export function WeeklyCalendar() {
  const { user } = useAuth();
  const {
    orders,
    loading,
    error,
    isFilterActive,
    selectedFilterLabel,
    clearUserFilter,
    teamMembers,
  } = useFirebaseOrders();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('adaptive');

  // Hoje no horário local
  const todayStr = useMemo(() => toLocalDateStr(new Date()), []);

  // Calcula os 7 dias da semana (Segunda a Domingo) no fuso local
  const weekDays = useMemo((): WeekDay[] => {
    const today = new Date();
    // Normaliza para meio-dia para neutralizar qualquer DST ou drift de meia-noite
    today.setHours(12, 0, 0, 0);

    // Ajusta para a segunda-feira da semana (0 = seg, ..., 6 = dom)
    const dayOfWeek = (today.getDay() + 6) % 7;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek + currentWeekOffset * 7);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = toLocalDateStr(date);
      return {
        date: dateStr,
        dayName: date.toLocaleDateString('pt-BR', { weekday: 'long' }),
        orders: orders.filter((o) => o.deliveryDate === dateStr),
      };
    });
  }, [orders, currentWeekOffset]);

  // Se o usuário estiver na semana atual, foca no dia de hoje por padrão na visão mobile
  const activeDayIndex = useMemo(() => {
    if (selectedDayIndex !== null && selectedDayIndex >= 0 && selectedDayIndex < 7) {
      return selectedDayIndex;
    }
    const todayIdx = weekDays.findIndex((d) => d.date === todayStr);
    if (todayIdx !== -1) return todayIdx;
    // Se hoje não estiver nessa semana, escolhe o primeiro dia com pedidos ou segunda-feira (0)
    const firstWithOrders = weekDays.findIndex((d) => d.orders.length > 0);
    return firstWithOrders !== -1 ? firstWithOrders : 0;
  }, [weekDays, todayStr, selectedDayIndex]);

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
    const first = parseLocalDate(weekDays[0].date);
    const last = parseLocalDate(weekDays[6].date);
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
      const order = orders.find((o) => o.id === orderId);
      await firebaseOrderService.deleteOrder(orderId);
      if (order?.customerId && order.price) {
        await firebaseCustomerService.decrementCustomerStats(order.customerId, order.price).catch(() => {});
      }
      setDetailsOpen(false);
      setSelectedOrder(null);
    } catch {
      toast.error('Não foi possível remover o pedido. Tente novamente.');
    }
  };

  const handleOrderClick = (order: Order) => {
    const creatorName = (order.createdByName && order.createdByName !== 'Usuário proprietário')
      ? order.createdByName
      : teamMembers.find(m => m.uid === order.userId)?.displayName
        || (order.userId === user?.uid ? user.displayName || user.email || 'Você' : undefined)
        || (order.createdByName !== 'Usuário proprietário' ? order.createdByName : undefined);

    setSelectedOrder({
      ...order,
      createdByName: creatorName,
    });
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
          <p className="text-lg font-semibold text-destructive">Erro ao carregar pedidos</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-full">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Agenda Semanal</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Acompanhe o cronograma de entregas e capacidade de produção
          </p>
        </div>

        {/* Controles de Semana e Filtro de Equipe */}
        <div className="flex flex-wrap items-center gap-2">
          <AdminTeamFilter variant="inline" />

          {/* Navegador de Semanas */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-card/80 border rounded-lg p-1 shadow-xs">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Semana anterior"
              onClick={() => setCurrentWeekOffset((o) => o - 1)}
              className="size-8"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs sm:text-sm font-medium">
              <CalendarIcon className="size-3.5 text-primary" />
              <span className="truncate whitespace-nowrap">{getWeekRange()}</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Próxima semana"
              onClick={() => setCurrentWeekOffset((o) => o + 1)}
              className="size-8"
            >
              <ChevronRight className="size-4" />
            </Button>

            {currentWeekOffset !== 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeekOffset(0)}
                className="h-7 px-2 text-xs font-medium ml-1"
              >
                Hoje
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Alerta de Filtro de Equipe Ativo */}
      {isFilterActive && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2 text-xs sm:text-sm text-primary shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="size-4 shrink-0" />
            <span className="truncate">
              Agenda filtrada por: <strong>{selectedFilterLabel}</strong> ({weekStats.total} {weekStats.total === 1 ? 'entrega' : 'entregas'} na semana)
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearUserFilter}
            className="h-6 text-xs text-primary hover:bg-primary/10 shrink-0 font-medium"
          >
            Ver tudo
          </Button>
        </div>
      )}

      {/* Barra de Resumo e Filtro de Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 border rounded-xl p-3">
        <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="size-4 text-primary" />
            <span>
              <strong className="text-foreground">{weekStats.total}</strong>
              {weekStats.total === 1 ? ' entrega' : ' entregas'}
            </span>
          </span>
          {weekStats.value > 0 && (
            <span className="text-muted-foreground/60 hidden xs:inline">•</span>
          )}
          {weekStats.value > 0 && (
            <span>
              <strong className="text-foreground">{formatCurrency(weekStats.value)}</strong> em produção
            </span>
          )}
        </div>

        {/* Filtros de Status (Touch-friendly) */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <Button
            size="sm"
            variant={statusFilter === '' ? 'secondary' : 'ghost'}
            onClick={() => setStatusFilter('')}
            className={cn(
              'h-7 text-xs px-2.5 rounded-full shrink-0',
              statusFilter === '' && 'bg-primary/10 text-primary font-medium'
            )}
          >
            Todos ({weekStats.total})
          </Button>
          {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => {
            const count = weekDays.flatMap((d) => d.orders).filter((o) => o.status === s).length;
            if (count === 0 && statusFilter !== s) return null;
            return (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? 'secondary' : 'ghost'}
                onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                className={cn(
                  'h-7 text-xs px-2.5 rounded-full shrink-0',
                  statusFilter === s && 'bg-primary/10 text-primary font-medium'
                )}
              >
                {STATUS_LABELS[s]} {count > 0 ? `(${count})` : ''}
              </Button>
            );
          })}
        </div>
      </div>

      {/* SELETOR DE DIAS DA SEMANA (Especialmente incrível no Celular e Tablet) */}
      <div className="block lg:hidden space-y-3">
        {/* Barra Horizontal de Dias */}
        <div className="grid grid-cols-7 gap-1 bg-muted/40 p-1.5 rounded-xl border border-border/60">
          {weekDays.map((day, idx) => {
            const isSelected = idx === activeDayIndex;
            const isToday = day.date === todayStr;
            const dayNum = day.date.split('-')[2];
            const shortWeekday = day.dayName.slice(0, 3).toUpperCase();
            const count = statusFilter ? day.orders.filter((o) => o.status === statusFilter).length : day.orders.length;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className={cn(
                  'flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all relative',
                  isSelected
                    ? 'bg-background shadow-xs text-foreground font-semibold ring-1 ring-primary/40'
                    : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                  isToday && !isSelected && 'bg-primary/5 text-primary'
                )}
              >
                <span className="text-[10px] uppercase font-bold tracking-tight opacity-75">
                  {shortWeekday}
                </span>
                <span className={cn('text-sm font-bold mt-0.5 leading-none', isToday && 'text-primary')}>
                  {dayNum}
                </span>
                {count > 0 ? (
                  <span
                    className={cn(
                      'mt-1 flex size-4 items-center justify-center rounded-full text-[9px] font-bold leading-none',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'
                    )}
                  >
                    {count}
                  </span>
                ) : (
                  <span className="mt-1 size-4 flex items-center justify-center text-[10px] text-muted-foreground/40 font-light">
                    -
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Visualização dos Pedidos do Dia Ativo no Mobile */}
        {(() => {
          const activeDay = weekDays[activeDayIndex];
          if (!activeDay) return null;
          const visibleOrders = statusFilter
            ? activeDay.orders.filter((o) => o.status === statusFilter)
            : activeDay.orders;
          const isToday = activeDay.date === todayStr;

          return (
            <Card className={cn('border shadow-xs', isToday && 'border-primary/40 ring-1 ring-primary/20')}>
              <CardHeader className="p-4 pb-2 border-b bg-muted/20 flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold capitalize">
                      {activeDay.dayName}
                    </CardTitle>
                    {isToday && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-primary">
                        Hoje
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateDayMonth(activeDay.date)} • {visibleOrders.length}{' '}
                    {visibleOrders.length === 1 ? 'entrega agendada' : 'entregas agendadas'}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'board' ? 'adaptive' : 'board')}
                  className="h-8 text-xs gap-1.5"
                >
                  <Columns className="size-3.5" />
                  {viewMode === 'board' ? 'Modo Dia' : 'Ver Semana Inteira'}
                </Button>
              </CardHeader>

              {viewMode !== 'board' && (
                <CardContent className="p-3.5 space-y-2.5">
                  {visibleOrders.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      <Package className="size-8 mx-auto mb-2 opacity-30" />
                      {statusFilter ? 'Nenhum pedido com este status neste dia.' : 'Nenhuma entrega agendada para este dia.'}
                    </div>
                  ) : (
                    visibleOrders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => handleOrderClick(order)}
                        className={cn(
                          'p-3 rounded-xl border bg-card hover:bg-muted/40 cursor-pointer transition-all shadow-2xs space-y-1.5',
                          order.status === 'cancelled' && 'opacity-60'
                        )}
                        style={
                          order.cardColor
                            ? {
                                backgroundColor: hexToRgba(order.cardColor, 0.12),
                                borderColor: order.cardColor,
                                borderWidth: 1.5,
                              }
                            : undefined
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className={cn('font-semibold text-sm leading-tight truncate', order.status === 'cancelled' && 'line-through')}>
                              {order.customerName}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {order.productName}
                            </p>
                          </div>
                          {order.price != null && !order.isExchange && (
                            <span className="font-semibold text-sm text-foreground tabular-nums shrink-0">
                              {formatCurrency(order.price)}
                            </span>
                          )}
                          {order.isExchange && (
                            <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-300 dark:text-purple-300 shrink-0">
                              <Repeat2 className="size-2.5 mr-0.5" /> Permuta
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
                          <Badge className={cn('text-[11px] px-2 py-0.5 border font-medium', STATUS_BADGE_CLASSES[order.status])}>
                            {STATUS_LABELS[order.status]}
                          </Badge>

                          {order.assignedToName && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                              <UserCheck className="size-3 text-primary shrink-0" />
                              <span className="truncate">{order.assignedToName}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              )}
            </Card>
          );
        })()}
      </div>

      {/* QUADRO SEMANAL COMPLETO (Sempre visível em Desktop e opcional no Mobile) */}
      <div className={cn(viewMode === 'board' ? 'block' : 'hidden lg:block')}>
        <div className="overflow-x-auto pb-4 pt-1 -mx-2 px-2 touch-pan-x">
          {/* Garante largura mínima total de 1050px para NUNCA espremer colunas */}
          <div className="min-w-[1050px] grid grid-cols-7 gap-3 items-start">
            {weekDays.map((day) => {
              const visibleOrders = statusFilter
                ? day.orders.filter((o) => o.status === statusFilter)
                : day.orders;
              const isToday = day.date === todayStr;

              return (
                <Card
                  key={day.date}
                  className={cn(
                    'flex flex-col border transition-all shadow-xs min-h-[420px]',
                    isToday
                      ? 'border-primary/60 ring-2 ring-primary/20 bg-primary/[0.02]'
                      : 'border-border/70 hover:border-border'
                  )}
                >
                  <CardHeader className="p-3 pb-2 border-b bg-muted/20">
                    <CardTitle className="text-xs font-semibold flex items-center justify-between">
                      <span className="capitalize truncate text-foreground">{day.dayName.split('-')[0]}</span>
                      {isToday && (
                        <Badge variant="default" className="text-[9px] px-1.5 py-0 bg-primary font-bold">
                          Hoje
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-baseline justify-between mt-1 text-muted-foreground">
                      <span className="text-xs font-medium text-foreground">
                        {formatDateDayMonth(day.date)}
                      </span>
                      <span className="text-[11px]">
                        {visibleOrders.length} {visibleOrders.length === 1 ? 'ped.' : 'ped.'}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[560px]">
                    {visibleOrders.length === 0 ? (
                      <div className="text-[11px] text-muted-foreground text-center py-8 opacity-60">
                        {statusFilter ? 'Nenhum pedido' : 'Sem entregas'}
                      </div>
                    ) : (
                      visibleOrders.map((order) => (
                        <div
                          key={order.id}
                          className={cn(
                            'p-2.5 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-all shadow-2xs space-y-1.5',
                            order.status === 'cancelled' && 'opacity-60'
                          )}
                          style={
                            order.cardColor
                              ? {
                                  backgroundColor: hexToRgba(order.cardColor, 0.12),
                                  borderColor: order.cardColor,
                                  borderWidth: 1.5,
                                }
                              : undefined
                          }
                          onClick={() => handleOrderClick(order)}
                        >
                          <div className="min-w-0">
                            <div
                              className={cn(
                                'font-semibold text-xs leading-tight truncate text-foreground',
                                order.status === 'cancelled' && 'line-through'
                              )}
                              title={order.customerName}
                            >
                              {order.customerName}
                            </div>
                            <div
                              className="text-[11px] text-muted-foreground truncate mt-0.5 leading-snug"
                              title={order.productName}
                            >
                              {order.productName}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/40">
                            <Badge
                              className={cn(
                                'text-[10px] px-1.5 py-0 border font-medium truncate max-w-[85px]',
                                STATUS_BADGE_CLASSES[order.status]
                              )}
                            >
                              {STATUS_LABELS[order.status]}
                            </Badge>

                            {order.price != null && !order.isExchange && (
                              <span className="text-[11px] font-semibold text-foreground tabular-nums shrink-0">
                                {formatCurrency(order.price)}
                              </span>
                            )}
                            {order.isExchange && (
                              <span className="text-[10px] text-purple-600 dark:text-purple-300 font-medium shrink-0">
                                Permuta
                              </span>
                            )}
                          </div>

                          {order.assignedToName && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5 truncate">
                              <UserCheck className="size-2.5 text-primary shrink-0" />
                              <span className="truncate">{order.assignedToName}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
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

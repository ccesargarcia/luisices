import { useState, useMemo } from 'react';
import { Order, OrderStatus, WeekDay } from '../types';
import { OrderDetailsDialog } from '../components/OrderDetailsDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useFirebaseOrders } from '../../hooks/useFirebaseOrders';
import { firebaseOrderService } from '../../services/firebaseOrderService';

export function WeeklyCalendar() {
  const { orders, loading, error } = useFirebaseOrders();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  const getWeekDays = (offset: number = 0): WeekDay[] => {
    const days: WeekDay[] = [];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + offset * 7);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayOrders = orders.filter(order => order.deliveryDate === dateStr);

      days.push({
        date: dateStr,
        dayName: date.toLocaleDateString('pt-BR', { weekday: 'long' }),
        orders: dayOrders,
      });
    }

    return days;
  };

  const weekDays = useMemo(() => getWeekDays(currentWeekOffset), [orders, currentWeekOffset]);

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await firebaseOrderService.updateOrderStatus(orderId, status);
      if (selectedOrder) {
        setSelectedOrder({ ...selectedOrder, status });
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert('Erro ao atualizar status do pedido');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await firebaseOrderService.deleteOrder(orderId);
      setDetailsOpen(false);
      setSelectedOrder(null);
    } catch (err) {
      console.error('Erro ao deletar pedido:', err);
      alert('Erro ao deletar pedido');
    }
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getWeekRange = () => {
    const firstDay = new Date(weekDays[0].date);
    const lastDay = new Date(weekDays[6].date);

    return `${firstDay.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${lastDay.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">Erro ao carregar pedidos</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agenda Semanal</h1>
          <p className="text-muted-foreground">Visualize entregas por dia da semana</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md">
            <CalendarIcon className="size-4" />
            <span className="font-medium">{getWeekRange()}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
          {currentWeekOffset !== 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentWeekOffset(0)}
            >
              Hoje
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        {weekDays.map((day) => (
          <Card
            key={day.date}
            className={isToday(day.date) ? 'ring-2 ring-primary' : ''}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="capitalize">{day.dayName}</span>
                {isToday(day.date) && (
                  <Badge variant="outline" className="text-xs">Hoje</Badge>
                )}
              </CardTitle>
              <div className="text-muted-foreground text-sm">{formatDate(day.date)}</div>
              <div className="text-xs text-muted-foreground">
                {day.orders.length} {day.orders.length === 1 ? 'entrega' : 'entregas'}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {day.orders.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Sem entregas
                </div>
              ) : (
                day.orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleOrderClick(order)}
                  >
                    <div className="font-medium text-sm mb-1">{order.customerName}</div>
                    <div className="text-xs text-muted-foreground mb-2 line-clamp-1">
                      {order.productName}
                    </div>
                    <Badge className={`text-xs ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <OrderDetailsDialog
        order={selectedOrder}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onUpdateStatus={handleUpdateStatus}
        onDeleteOrder={handleDeleteOrder}
      />
    </div>
  );
}

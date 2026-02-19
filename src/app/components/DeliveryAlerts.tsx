import { useMemo } from 'react';
import { Order, DeliveryAlert } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertCircle, Calendar, Phone, Package, Clock } from 'lucide-react';
import { cn } from './ui/utils';

interface DeliveryAlertsProps {
  orders: Order[];
  daysThreshold?: number;
  onOrderClick?: (order: Order) => void;
}

export function DeliveryAlerts({ orders, daysThreshold = 3, onOrderClick }: DeliveryAlertsProps) {
  const alerts = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcomingOrders = orders
      .filter(order => {
        // Apenas pedidos não concluídos e não cancelados
        if (order.status === 'completed' || order.status === 'cancelled') return false;

        const deliveryDate = new Date(order.deliveryDate);
        deliveryDate.setHours(0, 0, 0, 0);

        const diffTime = deliveryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays >= 0 && diffDays <= daysThreshold;
      })
      .map(order => {
        const deliveryDate = new Date(order.deliveryDate);
        deliveryDate.setHours(0, 0, 0, 0);

        const diffTime = deliveryDate.getTime() - now.getTime();
        const daysUntilDelivery = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          orderId: order.id,
          customerName: order.customerName,
          productName: order.productName,
          deliveryDate: order.deliveryDate,
          daysUntilDelivery,
          status: order.status,
          order,
        } as DeliveryAlert & { order: Order };
      })
      .sort((a, b) => a.daysUntilDelivery - b.daysUntilDelivery);

    return upcomingOrders;
  }, [orders, daysThreshold]);

  const getUrgencyColor = (days: number) => {
    if (days === 0) return 'bg-red-100 text-red-800 border-red-200';
    if (days === 1) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  const getUrgencyLabel = (days: number) => {
    if (days === 0) return 'HOJE';
    if (days === 1) return 'AMANHÃ';
    return `${days} DIAS`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Próximas Entregas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="size-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma entrega programada para os próximos {daysThreshold} dias</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="size-5 text-orange-600" />
            Próximas Entregas
          </CardTitle>
          <Badge variant="secondary">
            {alerts.length} {alerts.length === 1 ? 'pedido' : 'pedidos'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.orderId}
              onClick={() => onOrderClick?.(alert.order)}
              className={cn(
                'p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md',
                getUrgencyColor(alert.daysUntilDelivery)
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="size-4 flex-shrink-0" />
                    <h4 className="font-semibold text-sm truncate">{alert.productName}</h4>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <Phone className="size-3" />
                      <span className="truncate">{alert.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="size-3" />
                      <span>Entrega: {formatDate(alert.deliveryDate)}</span>
                    </div>
                  </div>
                </div>
                <Badge
                  className={cn(
                    'font-bold text-xs whitespace-nowrap',
                    getUrgencyColor(alert.daysUntilDelivery)
                  )}
                >
                  {getUrgencyLabel(alert.daysUntilDelivery)}
                </Badge>
              </div>

              {alert.status === 'pending' && (
                <div className="mt-3 pt-3 border-t border-current/20">
                  <p className="text-xs font-semibold flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    Atenção: Pedido ainda não iniciou produção!
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

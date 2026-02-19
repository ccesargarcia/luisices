import { useMemo } from 'react';
import { Order } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertCircle, Calendar, Phone, Package, CheckCircle } from 'lucide-react';
import { cn } from './ui/utils';

interface OverdueOrdersProps {
  orders: Order[];
  onOrderClick?: (order: Order) => void;
}

export function OverdueOrders({ orders, onOrderClick }: OverdueOrdersProps) {
  const overdueOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return orders
      .filter(order => {
        if (order.status !== 'pending' && order.status !== 'in-progress') return false;
        const deliveryDate = new Date(order.deliveryDate);
        deliveryDate.setHours(0, 0, 0, 0);
        return deliveryDate < today;
      })
      .map(order => {
        const deliveryDate = new Date(order.deliveryDate);
        deliveryDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - deliveryDate.getTime();
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { order, daysOverdue };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [orders]);

  const getOverdueColor = (days: number) => {
    if (days >= 7) return 'bg-red-200 text-red-900 border-red-300';
    if (days >= 3) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-orange-100 text-orange-800 border-orange-200';
  };

  const getOverdueLabel = (days: number) => {
    if (days === 1) return '1 DIA';
    return `${days} DIAS`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  if (overdueOrders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="size-5 text-green-600" />
            Pedidos Atrasados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="size-12 mx-auto mb-3 text-green-400 opacity-70" />
            <p>Nenhum pedido em atraso. Tudo em dia!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="size-5 text-red-600" />
            Pedidos Atrasados
          </CardTitle>
          <Badge variant="destructive">
            {overdueOrders.length} {overdueOrders.length === 1 ? 'pedido' : 'pedidos'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {overdueOrders.map(({ order, daysOverdue }) => (
            <div
              key={order.id}
              onClick={() => onOrderClick?.(order)}
              className={cn(
                'p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md',
                getOverdueColor(daysOverdue)
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="size-4 flex-shrink-0" />
                    <h4 className="font-semibold text-sm truncate">{order.productName}</h4>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <Phone className="size-3" />
                      <span className="truncate">{order.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="size-3" />
                      <span>Entrega era: {formatDate(order.deliveryDate)}</span>
                    </div>
                  </div>
                </div>
                <Badge
                  className={cn(
                    'font-bold text-xs whitespace-nowrap',
                    getOverdueColor(daysOverdue)
                  )}
                >
                  {getOverdueLabel(daysOverdue)}
                </Badge>
              </div>

              {order.status === 'pending' && (
                <div className="mt-3 pt-3 border-t border-current/20">
                  <p className="text-xs font-semibold flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    Ainda não iniciou produção!
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

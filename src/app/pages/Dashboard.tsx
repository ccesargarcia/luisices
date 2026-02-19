import { useMemo, useState } from 'react';
import { Order, OrderStatus } from '../types';
import { OrderCard } from '../components/OrderCard';
import { OrderDetailsDialog } from '../components/OrderDetailsDialog';
import { NewOrderDialog } from '../components/NewOrderDialog';
import { DeliveryAlerts } from '../components/DeliveryAlerts';
import { OverdueOrders } from '../components/OverdueOrders';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Package,
  Clock,
  CheckCircle,
  TrendingUp,
  Search,
  X,
  Loader2,
  DollarSign,
  AlertCircle,
  TrendingDown,
  Calendar,
  Target
} from 'lucide-react';
import { getTextColor } from '../utils/tagColors';
import { useFirebaseOrders } from '../../hooks/useFirebaseOrders';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { useAuth } from '../../contexts/AuthContext';

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 6) return 'Boa madrugada';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function Dashboard() {
  const { user } = useAuth();
  const { orders, loading, error } = useFirebaseOrders();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

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

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const inProgress = orders.filter(o => o.status === 'in-progress').length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;

    // Métricas financeiras
    const totalRevenue = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.price, 0);

    const totalCost = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.cost || 0), 0);

    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // Pagamentos
    const paidOrders = orders.filter(o => o.payment?.status === 'paid').length;
    const partialOrders = orders.filter(o => o.payment?.status === 'partial').length;

    // Pedidos ativos (não cancelados) sem pagamento completo
    const activeOrders = orders.filter(o => o.status !== 'cancelled');
    const pendingPayments = activeOrders.filter(o =>
      !o.payment || o.payment.status === 'pending' || o.payment.status === 'partial'
    ).length;

    const totalPaid = orders.reduce((sum, o) => sum + (o.payment?.paidAmount || 0), 0);

    // "A Receber": total do que ainda não foi pago em pedidos ativos
    const totalPending = activeOrders
      .filter(o => !o.payment || o.payment.status !== 'paid')
      .reduce((sum, o) => {
        if (!o.payment) return sum + o.price; // sem pagamento = tudo pendente
        return sum + (o.payment.remainingAmount ?? o.price - (o.payment.paidAmount || 0));
      }, 0);

    // Previsão de receita (pedidos em andamento + pendentes)
    const expectedRevenue = orders
      .filter(o => o.status === 'pending' || o.status === 'in-progress')
      .reduce((sum, o) => sum + o.price, 0);

    // Ticket médio
    const averageOrderValue = total > 0 ? orders.reduce((sum, o) => sum + o.price, 0) / total : 0;

    // Produtos mais vendidos
    const productCounts = new Map<string, { count: number; revenue: number }>();
    orders.forEach(order => {
      const current = productCounts.get(order.productName) || { count: 0, revenue: 0 };
      productCounts.set(order.productName, {
        count: current.count + 1,
        revenue: current.revenue + order.price,
      });
    });

    const topProducts = Array.from(productCounts.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Taxa de entrega no prazo (pedidos entregues na semana atual vs entrega esperada)
    const thisWeekOrders = orders.filter(o => {
      const deliveryDate = new Date(o.deliveryDate);
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      return deliveryDate >= weekStart && deliveryDate < weekEnd;
    });

    const deliveriesThisWeek = thisWeekOrders.length;

    // Pedidos atrasados: pendentes ou em produção com data de entrega já passada
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueOrders = orders.filter(o => {
      if (o.status !== 'pending' && o.status !== 'in-progress') return false;
      const delivery = new Date(o.deliveryDate);
      delivery.setHours(0, 0, 0, 0);
      return delivery < today;
    });
    const overdue = overdueOrders.length;

    return {
      total,
      pending,
      inProgress,
      completed,
      cancelled,
      totalRevenue,
      totalCost,
      profit,
      profitMargin,
      paidOrders,
      partialOrders,
      pendingPayments,
      totalPaid,
      totalPending,
      expectedRevenue,
      averageOrderValue,
      topProducts,
      deliveriesThisWeek,
      overdue,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filtro por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.customerName.toLowerCase().includes(query) ||
        order.productName.toLowerCase().includes(query) ||
        order.customerPhone.includes(query) ||
        (order.tags && order.tags.some(tag => tag.name.toLowerCase().includes(query)))
      );
    }

    // Filtro por tags selecionadas
    if (selectedTags.length > 0) {
      filtered = filtered.filter(order =>
        order.tags && selectedTags.every(selectedTag => order.tags!.some(tag => tag.name === selectedTag))
      );
    }

    return filtered;
  }, [orders, searchQuery, selectedTags]);

  // Obter todas as tags únicas
  const allTags = useMemo(() => {
    const tagsMap = new Map<string, string>();
    orders.forEach(order => {
      order.tags?.forEach(tag => {
        if (!tagsMap.has(tag.name)) {
          tagsMap.set(tag.name, tag.color);
        }
      });
    });
    return Array.from(tagsMap.entries())
      .map(([name, color]) => ({ name, color }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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
          <h1 className="text-3xl font-bold">
            {getGreeting()}{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-muted-foreground">Gerencie seus pedidos personalizados</p>
        </div>
        <NewOrderDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completed} concluídos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completed} pedido{stats.completed !== 1 ? 's' : ''} concluído{stats.completed !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total em Aberto</CardTitle>
            <TrendingUp className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.expectedRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pending + stats.inProgress} pedido{(stats.pending + stats.inProgress) !== 1 ? 's' : ''} a entregar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Target className="size-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Em {stats.total} pedidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em Produção</CardTitle>
            <Clock className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pending} aguardando
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <AlertCircle className="size-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPending)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pendingPayments} {stats.pendingPayments === 1 ? 'pedido sem pagamento completo' : 'pedidos sem pagamento completo'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Já Recebido</CardTitle>
            <TrendingUp className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.paidOrders} pagos · {stats.partialOrders} parciais
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Top produtos */}
      {stats.topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">{product.count} pedidos</div>
                    </div>
                  </div>
                  <div className="font-semibold">{formatCurrency(product.revenue)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas de Entrega */}
      <DeliveryAlerts orders={orders} onOrderClick={handleOrderClick} />

      {/* Pedidos Atrasados */}
      <OverdueOrders orders={orders} onOrderClick={handleOrderClick} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, produto ou telefone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {allTags.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Filtrar por tags:</div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <Badge
                key={tag.name}
                className={`cursor-pointer hover:opacity-80 transition-opacity border-0 ${
                  selectedTags.includes(tag.name) ? 'ring-2 ring-offset-2 ring-black' : ''
                }`}
                onClick={() => toggleTag(tag.name)}
                style={{ backgroundColor: tag.color, color: getTextColor(tag.color) }}
              >
                {tag.name}
                {selectedTags.includes(tag.name) && (
                  <X className="size-3 ml-1" />
                )}
              </Badge>
            ))}
            {selectedTags.length > 0 && (
              <Badge
                variant="secondary"
                className="cursor-pointer"
                onClick={() => setSelectedTags([])}
              >
                Limpar filtros
              </Badge>
            )}
          </div>
        </div>
      )}

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todos ({filteredOrders.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pendentes ({filteredOrders.filter(o => o.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            Em Produção ({filteredOrders.filter(o => o.status === 'in-progress').length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Concluídos ({filteredOrders.filter(o => o.status === 'completed').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => handleOrderClick(order)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders
              .filter(o => o.status === 'pending')
              .map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onClick={() => handleOrderClick(order)}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders
              .filter(o => o.status === 'in-progress')
              .map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onClick={() => handleOrderClick(order)}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders
              .filter(o => o.status === 'completed')
              .map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onClick={() => handleOrderClick(order)}
                />
              ))}
          </div>
        </TabsContent>
      </Tabs>

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
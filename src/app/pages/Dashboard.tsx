import { useMemo, useState } from 'react';
import { Order, OrderStatus } from '../types';
import { OrderCard } from '../components/OrderCard';
import { OrderDetailsDialog } from '../components/OrderDetailsDialog';
import { NewOrderDialog } from '../components/NewOrderDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Package, Clock, CheckCircle, TrendingUp, Search, X, Loader2 } from 'lucide-react';
import { getTextColor } from '../utils/tagColors';
import { useFirebaseOrders } from '../../hooks/useFirebaseOrders';
import { firebaseOrderService } from '../../services/firebaseOrderService';

export function Dashboard() {
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
    const totalRevenue = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.price, 0);

    return { total, pending, inProgress, completed, totalRevenue };
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
          <h1 className="text-3xl font-bold">Dashboard</h1>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="size-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em Produção</CardTitle>
            <TrendingUp className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <CheckCircle className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.completed} pedidos concluídos</p>
          </CardContent>
        </Card>
      </div>

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
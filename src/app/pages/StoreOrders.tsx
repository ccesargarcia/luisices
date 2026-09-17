import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { formatCurrency } from '../utils/currency';
import { CatalogOrder, CatalogOrderStatus } from '../types';
import { firebaseCatalogOrderService } from '../../services/firebaseCatalogOrderService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  ShoppingBag,
  Search,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Sparkles,
  ArrowRight,
  Trash2,
  MessageCircle,
  Calendar,
  User,
  Phone,
  Package,
  Layers,
  ArrowUpRight,
  HelpCircle,
  Filter,
  RefreshCw,
  Eye,
  Check,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';

export function StoreOrders() {
  const [orders, setOrders] = useState<CatalogOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Detalhes do pedido
  const [detailOrder, setDetailOrder] = useState<CatalogOrder | null>(null);

  // Modal de conversão para Pedido Oficial
  const [convertOrder, setConvertOrder] = useState<CatalogOrder | null>(null);
  const [convertCustomerName, setConvertCustomerName] = useState('');
  const [convertCustomerPhone, setConvertCustomerPhone] = useState('');
  const [convertDeliveryDate, setConvertDeliveryDate] = useState('');
  const [converting, setConverting] = useState(false);

  // Exclusão
  const [orderToDelete, setOrderToDelete] = useState<CatalogOrder | null>(null);

  // Escutar pedidos em tempo real
  useEffect(() => {
    setLoading(true);
    const unsubscribe = firebaseCatalogOrderService.subscribeToCatalogOrders(
      (orderList) => {
        setOrders(orderList);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao escutar pedidos da lojinha:', err);
        // Tentar busca manual única caso onSnapshot falhe
        firebaseCatalogOrderService.getCatalogOrders()
          .then((list) => {
            setOrders(list);
            setLoading(false);
          })
          .catch((fetchErr) => {
            console.error('Erro na busca manual:', fetchErr);
            toast.error('Erro ao carregar pedidos da lojinha.');
            setLoading(false);
          });
      }
    );

    return () => unsubscribe();
  }, []);

  const handleManualRefresh = async () => {
    try {
      setLoading(true);
      const list = await firebaseCatalogOrderService.getCatalogOrders();
      setOrders(list);
      toast.success('Lista de pedidos atualizada!');
    } catch (err) {
      console.error('Erro ao atualizar pedidos:', err);
      toast.error('Erro ao recarregar pedidos.');
    } finally {
      setLoading(false);
    }
  };

  // Preenchimento padrão ao abrir modal de conversão
  const handleOpenConvert = (order: CatalogOrder) => {
    setConvertOrder(order);
    setConvertCustomerName('');
    setConvertCustomerPhone('');

    // Calcular data estimada com base no maior prazo dos itens ou +7 dias
    const maxLead = order.items.reduce((max, i) => Math.max(max, i.leadTimeDays || 0), 0);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + Math.max(maxLead, 7));
    setConvertDeliveryDate(targetDate.toISOString().split('T')[0]);
  };

  // Confirmar conversão para Pedido de Produção
  const handleConfirmConvert = async () => {
    if (!convertOrder) return;
    if (!convertCustomerName.trim()) {
      toast.error('Por favor, informe o nome do cliente.');
      return;
    }
    if (!convertDeliveryDate) {
      toast.error('Por favor, informe a data prevista de entrega.');
      return;
    }

    try {
      setConverting(true);
      const newOrder = await firebaseCatalogOrderService.convertToProductionOrder(
        convertOrder,
        convertCustomerName,
        convertCustomerPhone,
        convertDeliveryDate
      );

      toast.success(
        `Pedido #${newOrder.orderNumber || ''} criado com sucesso na fila de produção!`,
        {
          action: {
            label: 'Ver Agenda',
            onClick: () => {
              window.location.href = '/agenda';
            },
          },
        }
      );

      setConvertOrder(null);
    } catch (err: any) {
      console.error('Erro ao converter pedido:', err);
      toast.error(`Falha ao converter pedido: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setConverting(false);
    }
  };

  // Alteração rápida de status
  const handleStatusChange = async (orderId: string, nextStatus: CatalogOrderStatus) => {
    try {
      await firebaseCatalogOrderService.updateCatalogOrderStatus(orderId, nextStatus);
      toast.success('Status do pedido atualizado!');
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      toast.error('Não foi possível alterar o status do pedido.');
    }
  };

  // Excluir pedido
  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      await firebaseCatalogOrderService.deleteCatalogOrder(orderToDelete.id);
      toast.success(`Pedido #${orderToDelete.orderCode} excluído.`);
      setOrderToDelete(null);
      if (detailOrder?.id === orderToDelete.id) {
        setDetailOrder(null);
      }
    } catch (err) {
      console.error('Erro ao excluir pedido:', err);
      toast.error('Erro ao excluir pedido.');
    }
  };

  // Métricas do Painel
  const stats = useMemo(() => {
    const totalCount = orders.length;
    const receivedCount = orders.filter((o) => o.status === 'received').length;
    const inContactCount = orders.filter((o) => o.status === 'in_contact').length;
    const convertedCount = orders.filter((o) => o.status === 'converted').length;
    const totalPotential = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.subtotal || 0), 0);

    return {
      totalCount,
      receivedCount,
      inContactCount,
      convertedCount,
      totalPotential,
    };
  }, [orders]);

  // Lista filtrada
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Filtro de status
      if (selectedStatus !== 'all' && order.status !== selectedStatus) {
        return false;
      }

      // Filtro de busca textual
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const matchesCode = order.orderCode?.toLowerCase().includes(q);
      const matchesNotes = order.customerNotes?.toLowerCase().includes(q);
      const matchesItems = order.items.some(
        (i) =>
          i.productName.toLowerCase().includes(q) ||
          (i.customName && i.customName.toLowerCase().includes(q))
      );

      return matchesCode || matchesNotes || matchesItems;
    });
  }, [orders, selectedStatus, searchQuery]);

  // Renderizador do badge de status
  const renderStatusBadge = (status: CatalogOrderStatus) => {
    switch (status) {
      case 'received':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Novo Pedido
          </Badge>
        );
      case 'in_contact':
        return (
          <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 gap-1.5 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Em Atendimento
          </Badge>
        );
      case 'converted':
        return (
          <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 gap-1.5 font-semibold">
            <CheckCircle2 size={13} />
            Convertido em Produção
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="text-muted-foreground border-stone-300 dark:border-stone-700 gap-1.5">
            <XCircle size={13} />
            Cancelado
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Data não informada';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Pedidos da Lojinha
            </h1>
            <Badge variant="secondary" className="font-mono text-xs">
              Catálogo Online
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Histórico e gestão dos pedidos enviados pelos clientes através da vitrine virtual e WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={loading}
            className="h-8.5 text-xs shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" asChild className="h-8.5 text-xs shrink-0">
            <Link to="/produtos-lojinha">
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
              Produtos da Lojinha
            </Link>
          </Button>
          <a
            href="/catalogo?return=/pedidos-lojinha"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 h-8.5 rounded-md text-xs font-semibold bg-[#613d3e] hover:bg-[#4a2e2f] text-white shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Abrir Lojinha</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>
      </div>

      {/* Cards de Métricas / KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="bg-card/50">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardDescription className="text-[11px] sm:text-xs font-medium truncate">Total de Pedidos</CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold">{stats.totalCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
              Recebidos via sacola online
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-emerald-500/20">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardDescription className="text-[11px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400 truncate">
              Novos / Recebidos
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {stats.receivedCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
              Aguardando contato no WhatsApp
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-purple-500/20">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardDescription className="text-[11px] sm:text-xs font-medium text-purple-600 dark:text-purple-400 truncate">
              Convertidos em Produção
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-300">
              {stats.convertedCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
              Viraram pedidos oficiais no ateliê
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardDescription className="text-[11px] sm:text-xs font-medium truncate">Faturamento Estimado</CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold text-[#613d3e] dark:text-[#f4b7b9] truncate">
              {formatCurrency(stats.totalPotential)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
              Subtotal acumulado (não cancelados)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border rounded-2xl p-3 sm:p-4">
        {/* Campo de Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por #LJ-1234, nome de produto ou observação..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-background"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Abas / Botões de Status */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none w-full md:w-auto -mx-1 px-1">
          <Button
            size="sm"
            variant={selectedStatus === 'all' ? 'default' : 'ghost'}
            onClick={() => setSelectedStatus('all')}
            className="rounded-full text-xs h-8 px-3 shrink-0"
          >
            Todos ({orders.length})
          </Button>
          <Button
            size="sm"
            variant={selectedStatus === 'received' ? 'default' : 'ghost'}
            onClick={() => setSelectedStatus('received')}
            className="rounded-full text-xs h-8 px-3 shrink-0"
          >
            Novos ({stats.receivedCount})
          </Button>
          <Button
            size="sm"
            variant={selectedStatus === 'in_contact' ? 'default' : 'ghost'}
            onClick={() => setSelectedStatus('in_contact')}
            className="rounded-full text-xs h-8 px-3 shrink-0"
          >
            Em Atendimento ({stats.inContactCount})
          </Button>
          <Button
            size="sm"
            variant={selectedStatus === 'converted' ? 'default' : 'ghost'}
            onClick={() => setSelectedStatus('converted')}
            className="rounded-full text-xs h-8 px-3 shrink-0"
          >
            Convertidos ({stats.convertedCount})
          </Button>
          <Button
            size="sm"
            variant={selectedStatus === 'cancelled' ? 'default' : 'ghost'}
            onClick={() => setSelectedStatus('cancelled')}
            className="rounded-full text-xs h-8 px-3 shrink-0"
          >
            Cancelados
          </Button>
        </div>
      </div>

      {/* Lista de Pedidos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Carregando pedidos da lojinha...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-card/40 border border-dashed rounded-3xl space-y-4">
          <div className="w-14 h-14 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="font-semibold text-lg">
              {searchQuery || selectedStatus !== 'all'
                ? 'Nenhum pedido encontrado com estes filtros'
                : 'Nenhum pedido recebido pela lojinha ainda'}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {searchQuery || selectedStatus !== 'all'
                ? 'Tente alterar os termos de busca ou o filtro de status selecionado.'
                : 'Quando clientes adicionarem itens à sacola na vitrine online e enviarem pelo WhatsApp, os pedidos aparecerão automaticamente aqui!'}
            </p>
          </div>
          {searchQuery || selectedStatus !== 'all' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('all');
              }}
            >
              Limpar Filtros
            </Button>
          ) : (
            <a
              href="/catalogo?return=/pedidos-lojinha"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#613d3e] hover:bg-[#4a2e2f] text-white shadow-sm transition-all cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>Visualizar Catálogo Online</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isConverted = order.status === 'converted';

            return (
              <Card
                key={order.id}
                className="overflow-hidden hover:border-primary/40 transition-all shadow-xs"
              >
                <div className="p-3.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border-b bg-muted/20">
                  {/* Cabeçalho do Card */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="font-mono font-bold text-sm sm:text-base text-[#613d3e] dark:text-[#f4b7b9]">
                      #{order.orderCode}
                    </span>
                    {renderStatusBadge(order.status)}
                    {order.isPriceTampered && (
                      <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 text-white gap-1 text-[11px] py-0.5 px-2 font-medium">
                        <AlertCircle className="w-3 h-3" /> Preço Divergente
                      </Badge>
                    )}
                    <span className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  {/* Ações Rápidas de Status */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {order.status === 'received' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(order.id, 'in_contact')}
                        className="h-8 text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/30 shrink-0"
                      >
                        Iniciar Atendimento
                      </Button>
                    )}

                    {!isConverted && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenConvert(order)}
                        className="h-8 text-xs bg-[#613d3e] hover:bg-[#4a2e2f] text-white shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        Converter em Pedido Oficial
                      </Button>
                    )}

                    {isConverted && (
                      <Button
                        size="sm"
                        variant="secondary"
                        asChild
                        className="h-8 text-xs gap-1.5 shrink-0"
                      >
                        <Link to="/agenda">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                          Ver na Agenda
                        </Link>
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDetailOrder(order)}
                      className="h-8 text-xs shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Detalhes
                    </Button>
                  </div>
                </div>

                {/* Conteúdo dos Itens do Pedido */}
                <div className="p-3.5 sm:p-5 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/40 border text-xs"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-12 h-12 rounded-lg object-cover shrink-0 border"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0 text-muted-foreground">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <p className="font-semibold text-foreground truncate">
                            {item.quantity}x {item.productName}
                          </p>
                          <p className="text-muted-foreground truncate">
                            {formatCurrency(item.price)} un. • Total:{' '}
                            <span className="font-medium text-foreground">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </p>
                          {item.customName && (
                            <p className="text-[11px] text-[#613d3e] dark:text-[#f4b7b9] font-medium truncate">
                              ✍️ {item.customName}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            Prazo:{' '}
                            {item.leadTimeDays > 0
                              ? `${item.leadTimeDays} dias úteis`
                              : 'Pronta entrega'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Observações do Cliente */}
                  {order.customerNotes && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                      <span className="font-bold">Observações / Data do Evento:</span>{' '}
                      {order.customerNotes}
                    </div>
                  )}

                  {/* Rodapé do Card com Subtotal */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-t border-border/40">
                    <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
                      <span>Total de {order.totalItems} {order.totalItems === 1 ? 'item' : 'itens'}</span>
                      {order.convertedOrderId && (
                        <span className="text-purple-600 dark:text-purple-400 font-medium truncate">
                          ID Oficial: {order.convertedOrderId.slice(0, 8)}...
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      <div className="text-left sm:text-right">
                        <span className="text-muted-foreground text-[11px] mr-1.5">Subtotal Estimado:</span>
                        <span className="text-base font-black text-[#613d3e] dark:text-[#f4b7b9] tabular-nums">
                          {formatCurrency(order.subtotal)}
                        </span>
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => setOrderToDelete(order)}
                        title="Excluir do histórico"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* DIALOG: DETALHES DO PEDIDO */}
      {detailOrder && (
        <Dialog open={Boolean(detailOrder)} onOpenChange={(open) => !open && setDetailOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <span>Pedido #{detailOrder.orderCode}</span>
                  {renderStatusBadge(detailOrder.status)}
                </DialogTitle>
              </div>
              <DialogDescription>
                Recebido em {formatDate(detailOrder.createdAt)} através da Lojinha Online
              </DialogDescription>
              {detailOrder.isPriceTampered && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Aviso de Segurança: Preço com Divergência</p>
                    <p className="mt-0.5 text-red-600/90 dark:text-red-300/90">
                      {detailOrder.priceWarning || "O subtotal submetido pelo navegador difere da soma dos preços oficiais cadastrados no catálogo."}
                    </p>
                    {typeof detailOrder.officialSubtotal === "number" && (
                      <p className="mt-1 font-mono text-[11px]">
                        Esperado pelo catálogo: <strong>{formatCurrency(detailOrder.officialSubtotal)}</strong> • Submetido: <strong>{formatCurrency(detailOrder.submittedSubtotal || detailOrder.subtotal)}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Seção de Itens */}
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Itens Selecionados ({detailOrder.totalItems})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {detailOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-10 h-10 rounded-lg object-cover border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-foreground">
                            {item.quantity}x {item.productName}
                          </p>
                          {item.customName && (
                            <p className="text-[11px] text-[#613d3e] dark:text-[#f4b7b9]">
                              Personalização: {item.customName}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            Prazo: {item.leadTimeDays > 0 ? `${item.leadTimeDays} dias úteis` : 'Pronta entrega'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-[10px] text-muted-foreground">
                            ({formatCurrency(item.price)} un.)
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subtotal */}
              <div className="flex justify-between items-center p-3 rounded-xl bg-muted/40 font-semibold text-sm">
                <span>Subtotal dos Produtos:</span>
                <span className="text-base font-black text-[#613d3e] dark:text-[#f4b7b9]">
                  {formatCurrency(detailOrder.subtotal)}
                </span>
              </div>

              {/* Observações */}
              {detailOrder.customerNotes && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Observações do Cliente</Label>
                  <div className="p-3 rounded-xl border bg-muted/10 text-xs text-foreground whitespace-pre-wrap">
                    {detailOrder.customerNotes}
                  </div>
                </div>
              )}

              {/* Status do Pedido Selector */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-bold text-muted-foreground">Alterar Status</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Button
                    size="sm"
                    variant={detailOrder.status === 'received' ? 'default' : 'outline'}
                    onClick={() => {
                      handleStatusChange(detailOrder.id, 'received');
                      setDetailOrder({ ...detailOrder, status: 'received' });
                    }}
                    className="text-xs h-8"
                  >
                    Recebido
                  </Button>
                  <Button
                    size="sm"
                    variant={detailOrder.status === 'in_contact' ? 'default' : 'outline'}
                    onClick={() => {
                      handleStatusChange(detailOrder.id, 'in_contact');
                      setDetailOrder({ ...detailOrder, status: 'in_contact' });
                    }}
                    className="text-xs h-8"
                  >
                    Em Atendimento
                  </Button>
                  <Button
                    size="sm"
                    variant={detailOrder.status === 'converted' ? 'default' : 'outline'}
                    onClick={() => {
                      handleStatusChange(detailOrder.id, 'converted');
                      setDetailOrder({ ...detailOrder, status: 'converted' });
                    }}
                    className="text-xs h-8"
                  >
                    Convertido
                  </Button>
                  <Button
                    size="sm"
                    variant={detailOrder.status === 'cancelled' ? 'default' : 'outline'}
                    onClick={() => {
                      handleStatusChange(detailOrder.id, 'cancelled');
                      setDetailOrder({ ...detailOrder, status: 'cancelled' });
                    }}
                    className="text-xs h-8"
                  >
                    Cancelado
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setOrderToDelete(detailOrder);
                  setDetailOrder(null);
                }}
              >
                Excluir Pedido
              </Button>

              <div className="flex items-center gap-2">
                {detailOrder.status !== 'converted' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      handleOpenConvert(detailOrder);
                      setDetailOrder(null);
                    }}
                    className="bg-[#613d3e] hover:bg-[#4a2e2f] text-white"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Converter em Pedido Oficial
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setDetailOrder(null)}>
                  Fechar
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DIALOG: CONVERSÃO EM PEDIDO OFICIAL DE PRODUÇÃO */}
      {convertOrder && (
        <Dialog open={Boolean(convertOrder)} onOpenChange={(open) => !open && setConvertOrder(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Converter em Pedido de Produção Oficial</span>
              </DialogTitle>
              <DialogDescription>
                Este assistente cria um pedido oficial na sua Agenda e Painel de Produção com base nos itens da Lojinha (#{convertOrder.orderCode}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border text-xs space-y-1">
                <p className="font-semibold text-foreground">
                  Resumo do Pedido ({convertOrder.totalItems} itens):
                </p>
                <p className="text-muted-foreground truncate">
                  {convertOrder.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                </p>
                <p className="font-bold text-[#613d3e] dark:text-[#f4b7b9]">
                  Valor total: {formatCurrency(convertOrder.subtotal)}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custName" className="text-xs font-semibold">
                  Nome do Cliente <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="custName"
                  placeholder="Ex: Mariana Silva"
                  value={convertCustomerName}
                  onChange={(e) => setConvertCustomerName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custPhone" className="text-xs font-semibold">
                  WhatsApp / Telefone do Cliente
                </Label>
                <Input
                  id="custPhone"
                  placeholder="Ex: (11) 98765-4321"
                  value={convertCustomerPhone}
                  onChange={(e) => setConvertCustomerPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deliveryDate" className="text-xs font-semibold">
                  Data Prevista de Entrega <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={convertDeliveryDate}
                  onChange={(e) => setConvertDeliveryDate(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Calculado automaticamente com base nos prazos de confecção dos itens.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setConvertOrder(null)}
                disabled={converting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmConvert}
                disabled={converting || !convertCustomerName.trim() || !convertDeliveryDate}
                className="bg-[#613d3e] hover:bg-[#4a2e2f] text-white"
              >
                {converting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                    Criando Pedido...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    Confirmar e Criar Pedido Oficial
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ALERT DIALOG: CONFIRMAR EXCLUSÃO */}
      <AlertDialog
        open={Boolean(orderToDelete)}
        onOpenChange={(open) => !open && setOrderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido #{orderToDelete?.orderCode}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o pedido do histórico da lojinha. Os dados não poderão ser recuperados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

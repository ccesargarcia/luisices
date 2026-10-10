import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { exportCustomersToExcel } from '../utils/exportData';
import { getDaysUntilBirthday, isBirthdayThisMonth, isBirthdayUpcoming } from '../utils/date';
import { Customer } from '../types';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  Search,
  UserPlus,
  Trash2,
  Loader2,
  Download,
  X,
  Users,
  Sparkles,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { cn } from '../components/ui/utils';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrdersContext';
import { useUserSettings } from '../../hooks/useUserSettings';
import {
  computeCustomerXRay,
  CustomerAnalysisPeriod,
  CustomerTiersSettings,
  CustomerXRayMetrics,
  DEFAULT_CUSTOMER_TIERS,
  TIER_DEFINITIONS,
} from '../utils/customerMetrics';
import { formatCurrency } from '../utils/currency';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CustomerCard } from '../components/customers/CustomerCard';
import { CustomerFormDialog } from '../components/customers/CustomerFormDialog';
import { CustomerHistoryDialog } from '../components/customers/CustomerHistoryDialog';
import { NewOrderDialog } from '../components/NewOrderDialog';
import {
  SingleCustomerDeleteDialog,
  BulkCustomerDeleteDialog,
} from '../components/customers/CustomerDeleteDialogs';
import { CustomerStatsCards } from '../components/customers/CustomerStatsCards';
import { groupCustomerLedgerHistory, ledgerSaleToOrder } from '../utils/customerLedgerHistory';
import { useSalesLedger } from '../../hooks/useSalesLedger';
import { PaginationControls } from '../components/common/PaginationControls';
import { toast } from 'sonner';

export function Customers() {
  const { user, userProfile, hasPermission } = useAuth();
  const {
    selectedUserIds,
    isFilterActive,
    selectedFilterLabel,
    activePartnerId,
    clearUserFilter,
  } = useOrders();
  const { allTimeStats, sales: ledgerSales, loading: ledgerLoading, error: ledgerError } = useSalesLedger({ teamUserIds: selectedUserIds });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(12);
  const [orderFilter, setOrderFilter] = useState<'all' | 'open' | 'no_orders'>('all');
  const [profileFilter, setProfileFilter] = useState<Customer['status'] | 'all'>('all');
  const [birthdayFilter, setBirthdayFilter] = useState<'all' | 'today' | 'upcoming_7' | 'this_month'>('all');
  const [spendingTierFilter, setSpendingTierFilter] = useState<
    'all' | 'diamond' | 'gold' | 'silver' | 'bronze' | 'inactive' | 'no_orders'
  >('all');
  const [analysisPeriod, setAnalysisPeriod] = useState<CustomerAnalysisPeriod>('all');
  const [sortBy, setSortBy] = useState<
    'default' | 'totalSpent_desc' | 'averageTicket_desc' | 'orders_desc' | 'lastOrder_desc' | 'name_asc'
  >('default');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  const { settings } = useUserSettings();
  const tiersConfig = useMemo(() => settings?.customerTiers ?? DEFAULT_CUSTOMER_TIERS, [settings]);

  // Dialogs state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteBlocked, setBulkDeleteBlocked] = useState<
    { id: string; name: string; count: number }[]
  >([]);

  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [newOrderCustomer, setNewOrderCustomer] = useState<Customer | null>(null);

  // Assinar clientes em tempo real para refletir criações/edições/exclusões
  useEffect(() => {
    if (!user) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const isAdmin = userProfile?.role === 'admin';
    const q = isAdmin
      ? query(
          collection(db, 'customers'),
          orderBy('createdAt', 'desc'),
          limit(1000),
        )
      : query(
          collection(db, 'customers'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(1000),
        );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const raw = doc.data() as any;
          return {
            id: doc.id,
            ...raw,
            createdAt: raw.createdAt?.toDate?.()?.toISOString() ?? (typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()),
          } as Customer;
        });
        setCustomers(data);
        setSelectedCustomerIds((prev) => prev.filter((id) => data.some((c) => c.id === id)));
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao carregar clientes:', err);
        setLoading(false);
      },
    );

    return unsub;
  }, [user, userProfile?.role]);

  // Escopo de clientes pelo parceiro selecionado pelo Admin (ou todos se não filtrado)
  const partnerScopedCustomers = useMemo(() => {
    if (!isFilterActive || !selectedUserIds || selectedUserIds.length === 0) {
      return customers;
    }
    return customers.filter((c) => c.userId && selectedUserIds.includes(c.userId));
  }, [customers, isFilterActive, selectedUserIds]);

  // Reutiliza o ledger histórico no escopo selecionado, sem truncar pelos pedidos operacionais.
  const relevantOrders = useMemo(() => ledgerSales.map(ledgerSaleToOrder), [ledgerSales]);

  // Mapa de pedidos em aberto e total de pedidos por cliente a partir de OrdersContext
  const openOrdersMap = useMemo(() => {
    const map: Record<string, number> = {};
    relevantOrders.forEach((o) => {
      if (o.customerId && o.status !== 'completed' && o.status !== 'cancelled') {
        map[o.customerId] = (map[o.customerId] || 0) + 1;
      }
    });
    return map;
  }, [relevantOrders]);

  const totalOrdersMap = useMemo(() => {
    const map: Record<string, number> = {};
    relevantOrders.forEach((o) => {
      if (o.customerId) {
        map[o.customerId] = (map[o.customerId] || 0) + 1;
      }
    });
    return map;
  }, [relevantOrders]);

  const ordersByCustomerMap = useMemo(
    () => groupCustomerLedgerHistory(partnerScopedCustomers, ledgerSales),
    [partnerScopedCustomers, ledgerSales],
  );

  // Mapa de Raio X calculado para cada cliente da carteira
  const customerXRayMap = useMemo(() => {
    const map = new Map<string, CustomerXRayMetrics>();
    partnerScopedCustomers.forEach((c) => {
      const customerOrders = ordersByCustomerMap.get(c.id) || [];
      const metrics = computeCustomerXRay(c, customerOrders, analysisPeriod, tiersConfig, new Date(), true);
      map.set(c.id, metrics);
    });
    return map;
  }, [partnerScopedCustomers, ordersByCustomerMap, analysisPeriod, tiersConfig]);

  // Filtragem e ordenação de clientes
  const filteredCustomers = useMemo(() => {
    let list = partnerScopedCustomers;
    if (orderFilter === 'open') {
      list = list.filter((c) => (openOrdersMap[c.id] || 0) > 0);
    } else if (orderFilter === 'no_orders') {
      list = list.filter((c) => (totalOrdersMap[c.id] ?? c.totalOrders ?? 0) === 0);
    }
    if (profileFilter !== 'all') {
      list = list.filter((customer) => (customer.status || 'active') === profileFilter);
    }
    if (birthdayFilter === 'today') {
      list = list.filter((c) => getDaysUntilBirthday(c.birthday) === 0);
    } else if (birthdayFilter === 'upcoming_7') {
      list = list.filter((c) => isBirthdayUpcoming(c.birthday, 7));
    } else if (birthdayFilter === 'this_month') {
      list = list.filter((c) => isBirthdayThisMonth(c.birthday));
    }

    // Filtro por Faixa de Gasto e Raio X
    if (spendingTierFilter === 'diamond') {
      list = list.filter((c) => customerXRayMap.get(c.id)?.tier === 'diamond');
    } else if (spendingTierFilter === 'gold') {
      list = list.filter((c) => customerXRayMap.get(c.id)?.tier === 'gold');
    } else if (spendingTierFilter === 'silver') {
      list = list.filter((c) => customerXRayMap.get(c.id)?.tier === 'silver');
    } else if (spendingTierFilter === 'bronze') {
      list = list.filter((c) => customerXRayMap.get(c.id)?.tier === 'bronze');
    } else if (spendingTierFilter === 'inactive') {
      list = list.filter((c) => customerXRayMap.get(c.id)?.isInactive === true);
    } else if (spendingTierFilter === 'no_orders') {
      list = list.filter((c) => (customerXRayMap.get(c.id)?.totalOrdersCount ?? 0) === 0);
    }

    if (searchQuery) {
      const queryStr = searchQuery.toLowerCase().trim();
      const cleanQueryDigits = queryStr.replace(/\D/g, '');
      const normalizedQuery = queryStr.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      list = list.filter((customer) => {
        const nameNorm = customer.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const phoneDigits = customer.phone ? customer.phone.replace(/\D/g, '') : '';
        const email = customer.email?.toLowerCase() || '';

        return (
          nameNorm.includes(normalizedQuery) ||
          (cleanQueryDigits.length >= 3 && phoneDigits.includes(cleanQueryDigits)) ||
          customer.phone.includes(queryStr) ||
          email.includes(queryStr)
        );
      });
    }

    // Ordenação personalizada
    if (sortBy === 'totalSpent_desc') {
      list = [...list].sort(
        (a, b) => (customerXRayMap.get(b.id)?.totalRevenue || 0) - (customerXRayMap.get(a.id)?.totalRevenue || 0)
      );
    } else if (sortBy === 'averageTicket_desc') {
      list = [...list].sort(
        (a, b) => (customerXRayMap.get(b.id)?.averageTicket || 0) - (customerXRayMap.get(a.id)?.averageTicket || 0)
      );
    } else if (sortBy === 'orders_desc') {
      list = [...list].sort(
        (a, b) => (customerXRayMap.get(b.id)?.totalOrdersCount || 0) - (customerXRayMap.get(a.id)?.totalOrdersCount || 0)
      );
    } else if (sortBy === 'lastOrder_desc') {
      list = [...list].sort((a, b) => {
        const dateB = customerXRayMap.get(b.id)?.lastOrderDate ? new Date(customerXRayMap.get(b.id)!.lastOrderDate!).getTime() : 0;
        const dateA = customerXRayMap.get(a.id)?.lastOrderDate ? new Date(customerXRayMap.get(a.id)!.lastOrderDate!).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === 'name_asc') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [
    partnerScopedCustomers,
    searchQuery,
    orderFilter,
    profileFilter,
    birthdayFilter,
    spendingTierFilter,
    sortBy,
    openOrdersMap,
    totalOrdersMap,
    customerXRayMap,
  ]);

  // Resetar página ao filtrar ou mudar tamanho
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, orderFilter, profileFilter, birthdayFilter, spendingTierFilter, analysisPeriod, sortBy, pageSize]);

  const effectivePageSize = pageSize === 'all' ? filteredCustomers.length : pageSize;
  const totalPages = Math.ceil(filteredCustomers.length / (effectivePageSize || 1));
  const pagedCustomers = useMemo(() => {
    if (pageSize === 'all') return filteredCustomers;
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const allFilteredCustomersSelected =
    filteredCustomers.length > 0 &&
    filteredCustomers.every((customer) => selectedCustomerIds.includes(customer.id));

  const toggleSelectAllFilteredCustomers = () => {
    if (allFilteredCustomersSelected) {
      setSelectedCustomerIds((prev) =>
        prev.filter((id) => !filteredCustomers.some((customer) => customer.id === id)),
      );
      return;
    }

    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      filteredCustomers.forEach((customer) => next.add(customer.id));
      return [...next];
    });
  };

  // Estatísticas monetárias e da carteira de clientes sincronizadas com o Ledger e Pedidos
  const stats = useMemo(() => {
    const total = partnerScopedCustomers.length;

    // Pedidos válidos da sessão (descartando cancelados)
    const validOrders = relevantOrders.filter((o) => o.status !== 'cancelled');
    const completedOrders = relevantOrders.filter((o) => o.status === 'completed');
    const inProductionOrders = relevantOrders.filter((o) => o.status === 'in-progress' || o.status === 'pending');

    const completedRevenueFromOrders = completedOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    const inProductionAmount = inProductionOrders.reduce((sum, o) => sum + (o.price || 0), 0);

    // Se o ledger tiver vendas concluídas registradas para a equipe/parceiro, prioriza o ledger
    // Caso contrário, utiliza os pedidos concluídos da sessão
    const totalRevenue = allTimeStats.totalAllTimeRevenue > 0
      ? allTimeStats.totalAllTimeRevenue
      : completedRevenueFromOrders;

    const completedOrdersCount = completedOrders.length;
    const inProductionOrdersCount = inProductionOrders.length;
    const totalOrders = allTimeStats.totalAllTimeCount > 0
      ? allTimeStats.totalAllTimeCount
      : validOrders.length;

    const averagePerCustomer = completedOrdersCount > 0
      ? totalRevenue / completedOrdersCount
      : (totalOrders > 0 ? (totalRevenue + inProductionAmount) / totalOrders : 0);

    return {
      total,
      totalRevenue,
      totalOrders,
      averagePerCustomer,
      inProductionAmount,
      completedOrdersCount,
      inProductionOrdersCount,
    };
  }, [partnerScopedCustomers, relevantOrders, allTimeStats]);

  // Chips Rápidos de Filtragem Contextual para Operação Ágil (Mobile & Desktop)
  const quickChips = useMemo(() => {
    const isAll =
      orderFilter === 'all' &&
      profileFilter === 'all' &&
      birthdayFilter === 'all' &&
      spendingTierFilter === 'all';
    const birthdayTodayCount = partnerScopedCustomers.filter((c) => getDaysUntilBirthday(c.birthday) === 0).length;
    const birthdayMonthCount = partnerScopedCustomers.filter((c) => isBirthdayThisMonth(c.birthday)).length;
    const openOrdersCount = partnerScopedCustomers.filter((c) => (openOrdersMap[c.id] || 0) > 0).length;
    const diamondCount = partnerScopedCustomers.filter((c) => customerXRayMap.get(c.id)?.tier === 'diamond').length;
    const goldCount = partnerScopedCustomers.filter((c) => customerXRayMap.get(c.id)?.tier === 'gold').length;
    const silverCount = partnerScopedCustomers.filter((c) => customerXRayMap.get(c.id)?.tier === 'silver').length;
    const inactiveCount = partnerScopedCustomers.filter((c) => customerXRayMap.get(c.id)?.isInactive === true).length;
    const vipCount = partnerScopedCustomers.filter((c) => c.status === 'vip').length;

    return [
      {
        id: 'all',
        label: 'Todos',
        count: partnerScopedCustomers.length,
        isActive: isAll,
        onClick: () => {
          setOrderFilter('all');
          setProfileFilter('all');
          setBirthdayFilter('all');
          setSpendingTierFilter('all');
        },
      },
      {
        id: 'diamond',
        label: '💎 Diamante',
        count: diamondCount,
        isActive: spendingTierFilter === 'diamond',
        onClick: () => {
          setSpendingTierFilter(spendingTierFilter === 'diamond' ? 'all' : 'diamond');
          setOrderFilter('all');
          setProfileFilter('all');
          setBirthdayFilter('all');
        },
      },
      {
        id: 'gold',
        label: '🥇 Ouro',
        count: goldCount,
        isActive: spendingTierFilter === 'gold',
        onClick: () => {
          setSpendingTierFilter(spendingTierFilter === 'gold' ? 'all' : 'gold');
          setOrderFilter('all');
          setProfileFilter('all');
          setBirthdayFilter('all');
        },
      },
      {
        id: 'silver',
        label: '🥈 Prata',
        count: silverCount,
        isActive: spendingTierFilter === 'silver',
        onClick: () => {
          setSpendingTierFilter(spendingTierFilter === 'silver' ? 'all' : 'silver');
          setOrderFilter('all');
          setProfileFilter('all');
          setBirthdayFilter('all');
        },
      },
      {
        id: 'inactive',
        label: '⚠️ Inativos',
        count: inactiveCount,
        isActive: spendingTierFilter === 'inactive',
        onClick: () => {
          setSpendingTierFilter(spendingTierFilter === 'inactive' ? 'all' : 'inactive');
          setOrderFilter('all');
          setProfileFilter('all');
          setBirthdayFilter('all');
        },
      },
      {
        id: 'open',
        label: '📦 Pedidos Ativos',
        count: openOrdersCount,
        isActive: orderFilter === 'open',
        onClick: () => {
          setOrderFilter(orderFilter === 'open' ? 'all' : 'open');
          setProfileFilter('all');
          setBirthdayFilter('all');
          setSpendingTierFilter('all');
        },
      },
      {
        id: 'month',
        label: '📅 Aniversariantes do Mês',
        count: birthdayMonthCount,
        isActive: birthdayFilter === 'this_month',
        onClick: () => {
          setBirthdayFilter(birthdayFilter === 'this_month' ? 'all' : 'this_month');
          setOrderFilter('all');
          setProfileFilter('all');
          setSpendingTierFilter('all');
        },
      },
      {
        id: 'today',
        label: '🎂 Aniversário Hoje',
        count: birthdayTodayCount,
        isActive: birthdayFilter === 'today',
        onClick: () => {
          setBirthdayFilter(birthdayFilter === 'today' ? 'all' : 'today');
          setOrderFilter('all');
          setProfileFilter('all');
          setSpendingTierFilter('all');
        },
      },
      {
        id: 'vip',
        label: '👑 VIPs',
        count: vipCount,
        isActive: profileFilter === 'vip',
        onClick: () => {
          setProfileFilter(profileFilter === 'vip' ? 'all' : 'vip');
          setOrderFilter('all');
          setBirthdayFilter('all');
          setSpendingTierFilter('all');
        },
      },
    ];
  }, [partnerScopedCustomers, orderFilter, profileFilter, birthdayFilter, spendingTierFilter, openOrdersMap, customerXRayMap]);

  // Ações de seleção e modais
  const toggleCustomerSelection = (customerId: string, selected: boolean) => {
    setSelectedCustomerIds((prev) => {
      if (selected) {
        if (prev.includes(customerId)) return prev;
        return [...prev, customerId];
      }
      return prev.filter((id) => id !== customerId);
    });
  };

  const handleOpenNewCustomer = () => {
    setEditingCustomer(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleOpenHistory = (customer: Customer) => {
    setHistoryCustomer(customer);
    setIsHistoryOpen(true);
  };

  const handleOpenNewOrder = (customer: Customer) => {
    setNewOrderCustomer(customer);
    setIsNewOrderOpen(true);
  };

  const handleOpenDelete = (customer: Customer) => {
    setDeletingCustomer(customer);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCustomer) return;

    setDeleteLoading(true);
    try {
      await firebaseCustomerService.deleteCustomer(deletingCustomer.id);
      setIsDeleteOpen(false);
      setDeletingCustomer(null);
      toast.success('Cliente excluído com sucesso');
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      toast.error('Não foi possível remover o cliente. Tente novamente.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const computeBulkDeleteBlocked = () => {
    if (!user) return;
    const blocked: { id: string; name: string; count: number }[] = [];
    selectedCustomerIds.forEach((id) => {
      const count = openOrdersMap[id] || 0;
      if (count > 0) {
        const customer = customers.find((c) => c.id === id);
        blocked.push({ id, name: customer?.name ?? 'Cliente', count });
      }
    });
    setBulkDeleteBlocked(blocked);
  };

  const handleOpenBulkDelete = () => {
    computeBulkDeleteBlocked();
    setIsBulkDeleteOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (!user || selectedCustomerIds.length === 0) return;

    computeBulkDeleteBlocked();
    if (bulkDeleteBlocked.length > 0) {
      toast.error(
        `Não é possível excluir ${bulkDeleteBlocked.length} cliente${
          bulkDeleteBlocked.length === 1 ? '' : 's'
        } porque possuem pedidos ativos.`,
      );
      return;
    }

    setBulkDeleting(true);
    try {
      await Promise.all(
        selectedCustomerIds.map((id) => firebaseCustomerService.deleteCustomer(id)),
      );
      toast.success(
        `${selectedCustomerIds.length} cliente${
          selectedCustomerIds.length === 1 ? '' : 's'
        } excluído${selectedCustomerIds.length === 1 ? '' : 's'}`,
      );
      setSelectedCustomerIds([]);
      setIsBulkDeleteOpen(false);
    } catch (error) {
      console.error('Erro ao excluir clientes:', error);
      toast.error('Erro ao excluir clientes');
    } finally {
      setBulkDeleting(false);
    }
  };

  if (ledgerError) {
    return (
      <Card><CardContent className="p-6" role="alert">
        <p>{ledgerError} Os indicadores não foram calculados.</p>
        <Button className="mt-3" onClick={() => window.location.reload()}>Tentar novamente</Button>
      </CardContent></Card>
    );
  }

  if (loading || ledgerLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Clientes</h1>
          <p className="mt-1 text-muted-foreground">Gerencie sua base de clientes</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {hasPermission((p) => p.customers?.view ?? false) && (
            <Button
              variant="outline"
              size="default"
              onClick={() => exportCustomersToExcel(filteredCustomers, 'clientes', customerXRayMap)}
              disabled={filteredCustomers.length === 0}
              className="gap-2"
            >
              <Download className="size-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </Button>
          )}

          {hasPermission((p) => p.customers?.create ?? false) && (
            <Button
              data-testid="new-customer-button"
              onClick={handleOpenNewCustomer}
              className="gap-2"
            >
              <UserPlus className="size-4" />
              <span className="hidden sm:inline">Novo Cliente</span>
            </Button>
          )}
        </div>
      </div>

      {/* Indicador de Filtro de Parceiro Ativo para Admin */}
      {isFilterActive && (
        <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border border-primary/25 bg-primary/5 text-primary text-sm shadow-sm backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <Users className="size-4" />
            </div>
            <span className="truncate">
              Exibindo clientes do parceiro: <strong>{selectedFilterLabel}</strong>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearUserFilter}
            className="h-7 text-xs px-2.5 text-primary hover:bg-primary/10 shrink-0"
            title="Limpar filtro e exibir clientes de todos os parceiros"
          >
            Ver todos os clientes
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <CustomerStatsCards
        total={stats.total}
        totalRevenue={stats.totalRevenue}
        totalOrders={stats.totalOrders}
        averagePerCustomer={stats.averagePerCustomer}
        inProductionAmount={stats.inProductionAmount}
        completedOrdersCount={stats.completedOrdersCount}
        inProductionOrdersCount={stats.inProductionOrdersCount}
      />

      <p className="text-xs text-muted-foreground" role="note">
        {ledgerLoading
          ? 'Carregando histórico financeiro dos clientes…'
          : 'Indicadores calculados pelo histórico financeiro vinculado a cada cliente. Pedidos antigos sem vínculo precisam de conciliação.'}
      </p>

      {/* Search, Carrossel de Chips e Filtros Rápidos (Liquid Glassmorphism) */}
      <div className="p-3.5 sm:p-4 rounded-2xl luisices-glass border border-white/60 dark:border-white/10 space-y-3">
        {/* Linha 1: Busca Principal, Período de Análise e Ordenação */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              data-testid="search-customers-input"
              placeholder="Buscar por nome, telefone ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 rounded-xl bg-background/80"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Período de Análise do Raio X */}
            <Select
              value={analysisPeriod}
              onValueChange={(v) => setAnalysisPeriod(v as CustomerAnalysisPeriod)}
            >
              <SelectTrigger className="w-full sm:w-44 h-9 text-xs bg-background/80 rounded-xl" title="Período de Análise do Raio X">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📅 Todo o Histórico</SelectItem>
                <SelectItem value="last_30_days">⏳ Últimos 30 dias</SelectItem>
                <SelectItem value="last_90_days">⏳ Últimos 90 dias</SelectItem>
                <SelectItem value="this_year">📆 Este Ano</SelectItem>
              </SelectContent>
            </Select>

            {/* Ordenação Inteligente */}
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as any)}
            >
              <SelectTrigger className="w-full sm:w-48 h-9 text-xs bg-background/80 rounded-xl" title="Ordenar lista de clientes">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">✨ Recentes (Padrão)</SelectItem>
                <SelectItem value="totalSpent_desc">💰 Maior Faturamento</SelectItem>
                <SelectItem value="averageTicket_desc">🎯 Maior Ticket Médio</SelectItem>
                <SelectItem value="orders_desc">📦 Mais Pedidos</SelectItem>
                <SelectItem value="lastOrder_desc">🕒 Compra Mais Recente</SelectItem>
                <SelectItem value="name_asc">🔤 Nome (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Linha 2: Filtros por Faixa Comercial, Pedidos, Classificação e Aniversários */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 flex-wrap">
          {/* Faixa Comercial Personalizável */}
          <Select
            value={spendingTierFilter}
            onValueChange={(value) => setSpendingTierFilter(value as any)}
          >
            <SelectTrigger className="w-full sm:w-52 h-9 text-xs bg-background/80 rounded-xl">
              <SelectValue placeholder="Faixa Comercial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">💎 Todas as Faixas de Gasto</SelectItem>
              <SelectItem value="diamond">💎 Diamante (≥ {formatCurrency(tiersConfig.diamondMin)})</SelectItem>
              <SelectItem value="gold">🥇 Ouro (≥ {formatCurrency(tiersConfig.goldMin)})</SelectItem>
              <SelectItem value="silver">🥈 Prata (≥ {formatCurrency(tiersConfig.silverMin)})</SelectItem>
              <SelectItem value="bronze">🌱 Bronze (&lt; {formatCurrency(tiersConfig.silverMin)})</SelectItem>
              <SelectItem value="inactive">⚠️ Inativos (&gt; {tiersConfig.inactiveDaysThreshold}d)</SelectItem>
              <SelectItem value="no_orders">💤 Sem compras</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={orderFilter}
            onValueChange={(v) => setOrderFilter(v as 'all' | 'open' | 'no_orders')}
          >
            <SelectTrigger className="w-full sm:w-44 h-9 text-xs bg-background/80 rounded-xl">
              <SelectValue placeholder="Filtrar por pedidos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              <SelectItem value="open">Com pedidos em aberto</SelectItem>
              <SelectItem value="no_orders">Sem pedidos relacionados</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={profileFilter}
            onValueChange={(value) => setProfileFilter(value as Customer['status'] | 'all')}
          >
            <SelectTrigger className="w-full sm:w-44 h-9 text-xs bg-background/80 rounded-xl">
              <SelectValue placeholder="Classificação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as classificações</SelectItem>
              <SelectItem value="active">Cliente padrão</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="recurring">Cliente recorrente</SelectItem>
              <SelectItem value="defaulter">Inadimplente</SelectItem>
              <SelectItem value="partner">Parceiro / Permuta</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={birthdayFilter}
            onValueChange={(value) => setBirthdayFilter(value as 'all' | 'today' | 'upcoming_7' | 'this_month')}
          >
            <SelectTrigger className="w-full sm:w-44 h-9 text-xs bg-background/80 rounded-xl">
              <SelectValue placeholder="Aniversários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🎂 Todos os aniversários</SelectItem>
              <SelectItem value="today">🎂 Aniversariantes de Hoje</SelectItem>
              <SelectItem value="upcoming_7">🎉 Próximos 7 dias</SelectItem>
              <SelectItem value="this_month">📅 Aniversariantes do Mês</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery ||
            orderFilter !== 'all' ||
            profileFilter !== 'all' ||
            birthdayFilter !== 'all' ||
            spendingTierFilter !== 'all' ||
            analysisPeriod !== 'all' ||
            sortBy !== 'default') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setOrderFilter('all');
                setProfileFilter('all');
                setBirthdayFilter('all');
                setSpendingTierFilter('all');
                setAnalysisPeriod('all');
                setSortBy('default');
              }}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-xl shrink-0"
              title="Limpar todos os filtros"
            >
              <X className="size-3.5 mr-1" />
              <span>Limpar</span>
            </Button>
          )}
        </div>

        {/* ─── Carrossel Horizontal de Chips Rápidos de Negócio ───────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 -mx-1 px-1 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quickChips.map((chip) => (
            <button
              key={chip.id}
              onClick={chip.onClick}
              className={cn(
                'shrink-0 text-xs px-3 py-1.5 rounded-xl font-medium transition-all duration-200 cursor-pointer border flex items-center gap-1.5 select-none',
                chip.isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-background/60 hover:bg-background text-muted-foreground border-border/60 hover:text-foreground'
              )}
            >
              <span>{chip.label}</span>
              {chip.count !== undefined && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                    chip.isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {chip.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {(selectedCustomerIds.length > 0 || filteredCustomers.length > 0) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-primary">
              {selectedCustomerIds.length} selecionado{selectedCustomerIds.length !== 1 ? 's' : ''}
            </p>
            <Button variant="outline" size="sm" onClick={toggleSelectAllFilteredCustomers}>
              {allFilteredCustomersSelected ? 'Desmarcar todos' : 'Selecionar todos'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {selectedCustomerIds.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setSelectedCustomerIds([])}>
                Limpar
              </Button>
            )}
            {hasPermission((p) => p.customers?.delete ?? false) && selectedCustomerIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleOpenBulkDelete}
                disabled={bulkDeleting}
                className="gap-2"
              >
                <Trash2 className="size-4" />
                Excluir selecionados
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Customer Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {pagedCustomers.map((customer) => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            xray={customerXRayMap.get(customer.id)}
            isSelected={selectedCustomerIds.includes(customer.id)}
            onToggleSelect={toggleCustomerSelection}
            onOpenHistory={handleOpenHistory}
            onOpenEdit={handleOpenEdit}
            onOpenDelete={handleOpenDelete}
            onOpenNewOrder={handleOpenNewOrder}
            canEdit={hasPermission((p) => p.customers?.edit ?? false)}
            canDelete={hasPermission((p) => p.customers?.delete ?? false)}
            canCreateOrder={hasPermission((p) => p.orders?.create ?? false)}
          />
        ))}
      </div>

      {/* Pagination */}
      {filteredCustomers.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredCustomers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[12, 24, 48, 'all']}
          itemName="cliente"
          itemPluralName="clientes"
        />
      )}

      {/* Empty State */}
      {filteredCustomers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="size-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Tente uma busca diferente' : 'Comece adicionando seu primeiro cliente'}
            </p>
            {!searchQuery && hasPermission((p) => p.customers?.create ?? false) && (
              <Button onClick={handleOpenNewCustomer}>
                <UserPlus className="size-4 mr-2" />
                Adicionar Cliente
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals and Dialogs */}
      <CustomerFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        customer={editingCustomer}
        userId={editingCustomer ? (editingCustomer.userId || user?.uid) : (activePartnerId || user?.uid)}
      />

      <CustomerHistoryDialog
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        customer={historyCustomer}
        userId={historyCustomer?.userId || user?.uid}
        onOpenNewOrder={handleOpenNewOrder}
        tiersConfig={tiersConfig}
        historicalOrders={historyCustomer ? (ordersByCustomerMap.get(historyCustomer.id) || []) : []}
        metricsLoading={ledgerLoading}
      />

      <NewOrderDialog
        open={isNewOrderOpen}
        onOpenChange={setIsNewOrderOpen}
        initialCustomerId={newOrderCustomer?.id}
        hideTrigger={true}
      />

      <SingleCustomerDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        customer={deletingCustomer}
        activeOrdersCount={deletingCustomer ? openOrdersMap[deletingCustomer.id] || 0 : 0}
        loading={deleteLoading}
        onConfirmDelete={handleDeleteConfirm}
      />

      <BulkCustomerDeleteDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        selectedCount={selectedCustomerIds.length}
        blockedCustomers={bulkDeleteBlocked}
        loading={bulkDeleting}
        onConfirmDelete={handleBulkDeleteConfirm}
      />
    </div>
  );
}

export default Customers;

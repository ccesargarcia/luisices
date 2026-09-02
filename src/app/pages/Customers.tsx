import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { exportCustomersToExcel } from '../utils/exportData';
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
} from 'lucide-react';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrdersContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CustomerCard } from '../components/customers/CustomerCard';
import { CustomerFormDialog } from '../components/customers/CustomerFormDialog';
import { CustomerHistoryDialog } from '../components/customers/CustomerHistoryDialog';
import {
  SingleCustomerDeleteDialog,
  BulkCustomerDeleteDialog,
} from '../components/customers/CustomerDeleteDialogs';
import { CustomerStatsCards } from '../components/customers/CustomerStatsCards';
import { toast } from 'sonner';

const PAGE_SIZE = 12;

export function Customers() {
  const { user, hasPermission } = useAuth();
  const { orders } = useOrders();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [orderFilter, setOrderFilter] = useState<'all' | 'open' | 'no_orders'>('all');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

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

  // Assinar clientes em tempo real para refletir criações/edições/exclusões
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, 'customers'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const raw = doc.data() as any;
          return {
            id: doc.id,
            ...raw,
            createdAt: raw.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
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
  }, [user]);

  // Mapa de pedidos em aberto e total de pedidos por cliente a partir de OrdersContext
  const openOrdersMap = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.customerId && o.status !== 'completed' && o.status !== 'cancelled') {
        map[o.customerId] = (map[o.customerId] || 0) + 1;
      }
    });
    return map;
  }, [orders]);

  const totalOrdersMap = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.customerId) {
        map[o.customerId] = (map[o.customerId] || 0) + 1;
      }
    });
    return map;
  }, [orders]);

  // Filtragem de clientes
  const filteredCustomers = useMemo(() => {
    let list = customers;
    if (orderFilter === 'open') {
      list = list.filter((c) => (openOrdersMap[c.id] || 0) > 0);
    } else if (orderFilter === 'no_orders') {
      list = list.filter((c) => (totalOrdersMap[c.id] ?? c.totalOrders ?? 0) === 0);
    }
    if (!searchQuery) return list;
    const queryStr = searchQuery.toLowerCase();
    return list.filter(
      (customer) =>
        customer.name.toLowerCase().includes(queryStr) ||
        customer.phone.includes(queryStr) ||
        customer.email?.toLowerCase().includes(queryStr),
    );
  }, [customers, searchQuery, orderFilter, openOrdersMap, totalOrdersMap]);

  // Resetar página ao filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, orderFilter]);

  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE);
  const pagedCustomers = filteredCustomers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

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

  // Estatísticas
  const stats = useMemo(() => {
    const total = customers.length;
    const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const totalOrders = customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0);
    const averagePerCustomer = total > 0 ? totalRevenue / total : 0;

    return { total, totalRevenue, totalOrders, averagePerCustomer };
  }, [customers]);

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
      toast.error('Erro ao deletar cliente');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie sua base de clientes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={() => exportCustomersToExcel(filteredCustomers)}
            disabled={filteredCustomers.length === 0}
            className="gap-2"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>

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

      {/* Stats Cards */}
      <CustomerStatsCards
        total={stats.total}
        totalRevenue={stats.totalRevenue}
        totalOrders={stats.totalOrders}
        averagePerCustomer={stats.averagePerCustomer}
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            data-testid="search-customers-input"
            placeholder="Buscar por nome, telefone ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={orderFilter}
          onValueChange={(v) => setOrderFilter(v as 'all' | 'open' | 'no_orders')}
        >
          <SelectTrigger className="w-full sm:w-60">
            <SelectValue placeholder="Filtrar por pedidos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            <SelectItem value="open">Com pedidos em aberto</SelectItem>
            <SelectItem value="no_orders">Sem pedidos relacionados</SelectItem>
          </SelectContent>
        </Select>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pagedCustomers.map((customer) => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            isSelected={selectedCustomerIds.includes(customer.id)}
            onToggleSelect={toggleCustomerSelection}
            onOpenHistory={handleOpenHistory}
            onOpenEdit={handleOpenEdit}
            onOpenDelete={handleOpenDelete}
            canEdit={hasPermission((p) => p.customers?.edit ?? false)}
            canDelete={hasPermission((p) => p.customers?.delete ?? false)}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''} — página{' '}
            {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
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
        userId={user?.uid}
      />

      <CustomerHistoryDialog
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        customer={historyCustomer}
        userId={user?.uid}
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

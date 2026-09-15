import { useState, useMemo } from 'react';
import { exportQuotesToExcel } from '../utils/exportData';
import { Quote, Tag } from '../types';
import { getTextColor } from '../utils/tagColors';
import { useUserSettings } from '../../hooks/useUserSettings';
import { useFirebaseQuotes } from '../../hooks/useFirebaseQuotes';
import { useAuth } from '../../contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  FileText,
  Plus,
  Loader2,
  Search,
  Filter,
  X,
  Download,
} from 'lucide-react';
import { QuoteCard } from '../components/quotes/QuoteCard';
import { QuoteStatsCards } from '../components/quotes/QuoteStatsCards';
import { QuoteFormDialog } from '../components/quotes/QuoteFormDialog';
import { QuoteDetailsDialog } from '../components/quotes/QuoteDetailsDialog';

export function Quotes() {
  const { user, hasPermission } = useAuth();
  const { quotes, loading, error } = useFirebaseQuotes();
  const { settings } = useUserSettings();
  const [search, setSearch] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterDelivery, setFilterDelivery] = useState<'' | 'pickup' | 'delivery'>('');
  const [showFilters, setShowFilters] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [detailQuoteId, setDetailQuoteId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Deriva sempre do snapshot em tempo real — atualiza automaticamente após approve/reject/etc
  const detailQuote = detailQuoteId ? (quotes.find((q) => q.id === detailQuoteId) ?? null) : null;

  // All tags from all quotes (for filter suggestions)
  const allTags = useMemo(() => {
    const set = new Map<string, Tag>();
    for (const q of quotes) {
      for (const t of q.tags ?? []) {
        if (!set.has(t.name)) set.set(t.name, t);
      }
    }
    return Array.from(set.values());
  }, [quotes]);

  const activeFiltersCount =
    [filterDateFrom, filterDateTo, filterDelivery].filter(Boolean).length + filterTags.length;

  // Stats
  const stats = useMemo(() => {
    const total = quotes.length;
    const draft = quotes.filter((q) => q.status === 'draft').length;
    const sent = quotes.filter((q) => q.status === 'sent').length;
    const approved = quotes.filter((q) => q.status === 'approved').length;
    const rejected = quotes.filter((q) => q.status === 'rejected').length;
    const expired = quotes.filter((q) => q.status === 'expired').length;
    const pendingTotal = quotes
      .filter((q) => q.status === 'draft' || q.status === 'sent')
      .reduce((s, q) => s + q.totalPrice, 0);
    const decided = approved + rejected + expired;
    const conversionRate = decided > 0 ? Math.round((approved / decided) * 100) : null;
    return { total, draft, sent, approved, rejected, expired, pendingTotal, conversionRate };
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    let result = quotes;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.customerName.toLowerCase().includes(q) ||
          o.quoteNumber.toLowerCase().includes(q) ||
          o.items.some((i) => i.name.toLowerCase().includes(q)) ||
          (o.tags ?? []).some((t) => t.name.toLowerCase().includes(q))
      );
    }
    if (filterDateFrom) {
      result = result.filter((o) => o.createdAt.split('T')[0] >= filterDateFrom);
    }
    if (filterDateTo) {
      result = result.filter((o) => o.createdAt.split('T')[0] <= filterDateTo);
    }
    if (filterTags.length > 0) {
      result = result.filter((o) =>
        filterTags.every((t) => (o.tags ?? []).some((ot) => ot.name === t))
      );
    }
    if (filterDelivery) {
      result = result.filter((o) => o.deliveryType === filterDelivery);
    }
    return result;
  }, [quotes, search, filterDateFrom, filterDateTo, filterTags, filterDelivery]);

  function clearFilters() {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterTags([]);
    setFilterDelivery('');
  }

  function openEdit(q: Quote) {
    setEditingQuote(q);
    setFormOpen(true);
  }

  function openDetail(q: Quote) {
    setDetailQuoteId(q.id);
    setDetailOpen(true);
  }

  function openNew() {
    setEditingQuote(null);
    setFormOpen(true);
  }

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
        <p className="text-red-600 font-semibold">{error}</p>
      </div>
    );
  }

  const tabGroups: { value: string; label: string; list: Quote[] }[] = [
    { value: 'all', label: `Todos (${quotes.length})`, list: filteredQuotes },
    { value: 'draft', label: `Rascunho (${stats.draft})`, list: filteredQuotes.filter((q) => q.status === 'draft') },
    { value: 'sent', label: `Enviados (${stats.sent})`, list: filteredQuotes.filter((q) => q.status === 'sent') },
    { value: 'approved', label: `Aprovados (${stats.approved})`, list: filteredQuotes.filter((q) => q.status === 'approved') },
    { value: 'rejected', label: `Rejeitados (${stats.rejected})`, list: filteredQuotes.filter((q) => q.status === 'rejected') },
    { value: 'expired', label: `Vencidos (${stats.expired})`, list: filteredQuotes.filter((q) => q.status === 'expired') },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Orçamentos</h1>
          <p className="text-muted-foreground mt-1">
            Gere orçamentos e converta oportunidades em pedidos
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="default"
            onClick={() => exportQuotesToExcel(filteredQuotes)}
            disabled={filteredQuotes.length === 0}
            className="gap-2"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>
          {hasPermission((p) => p.quotes?.create ?? false) && (
            <Button data-testid="new-quote-button" onClick={openNew} className="gap-2">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Novo Orçamento</span>
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <QuoteStatsCards stats={stats} />

      {/* Search + Filters */}
      <div className="glass-chip space-y-3 rounded-lg p-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              data-testid="search-quotes-input"
              placeholder="Buscar por cliente, número, produto ou tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={search ? 'pl-10 pr-9' : 'pl-10'}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowFilters((v) => !v)}
            className="shrink-0 relative"
          >
            <Filter className="size-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="glass-panel space-y-4 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date range */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Criado a partir de</Label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Criado até</Label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
            </div>

            {/* Delivery type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Forma de entrega</Label>
              <div className="flex gap-2 flex-wrap">
                {(['', 'pickup', 'delivery'] as const).map((v) => (
                  <Button
                    key={v}
                    type="button"
                    variant={filterDelivery === v ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterDelivery(v)}
                  >
                    {v === '' ? 'Todas' : v === 'pickup' ? 'Retirada' : 'Entrega'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tag filter */}
            {allTags.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map((t) => {
                    const active = filterTags.includes(t.name);
                    return (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() =>
                          setFilterTags((prev) =>
                            active ? prev.filter((n) => n !== t.name) : [...prev, t.name]
                          )
                        }
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          active
                                      ? 'border-primary/50 ring-2 ring-primary/30 ring-offset-1'
                                      : 'border-border/60 hover:brightness-95'
                        }`}
                        style={{
                          backgroundColor: `color-mix(in srgb, ${t.color} 22%, transparent)`,
                          borderColor: active ? `color-mix(in srgb, ${t.color} 55%, var(--border))` : undefined,
                          color: 'var(--foreground)',
                        }}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                <X className="size-3.5 mr-1.5" /> Limpar filtros
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          {tabGroups.map((g) => (
            <TabsTrigger key={g.value} value={g.value}>
              {g.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabGroups.map((g) => (
          <TabsContent key={g.value} value={g.value}>
            {g.list.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Nenhum orçamento encontrado</p>
                {g.value === 'all' && hasPermission((p) => p.quotes?.create ?? false) && (
                  <Button variant="outline" className="mt-4" onClick={openNew}>
                    <Plus className="size-4 mr-2" /> Criar primeiro orçamento
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {g.list.map((q) => (
                  <QuoteCard
                    key={q.id}
                    quote={q}
                    onClick={() => openDetail(q)}
                    compact={settings?.compactCards}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialogs */}
      <QuoteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editingQuote}
        onSaved={() => {}}
      />
      <QuoteDetailsDialog
        quote={detailQuote}
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v) setDetailQuoteId(null);
        }}
        onEdit={openEdit}
        onRefresh={() => setDetailOpen(false)}
      />
    </div>
  );
}

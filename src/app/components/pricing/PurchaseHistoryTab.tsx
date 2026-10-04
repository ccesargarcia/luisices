import { useState, useMemo, useEffect } from 'react';
import { PurchaseHistoryItem, SupplyItem, SupplyCategory, SupplyUnit } from '../../types';
import { firebasePricingService } from '../../../services/firebasePricingService';
import { formatCurrency } from '../../utils/currency';
import { secureRandomId } from '../../utils/random';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  History,
  Plus,
  Search,
  Trash2,
  Calendar,
  Store,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PackageCheck,
  Truck,
  Loader2,
  Tag,
  ArrowUpDown,
  ShoppingBag,
  Table as TableIcon,
  LayoutList,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

interface PurchaseHistoryTabProps {
  historyItems: PurchaseHistoryItem[];
  supplies: SupplyItem[];
  loading: boolean;
  canCreate?: boolean;
  canDelete?: boolean;
  onRefresh?: () => void;
  openAddPurchaseTrigger?: number;
}

const CATEGORY_LABELS: Record<SupplyCategory, string> = {
  papeis: 'Papéis',
  vinis: 'Vinis & Recorte',
  botons: 'Bótons',
  canecas: 'Canecas & Sublimação',
  embalagens: 'Caixas & Embalagens',
  fitas_aviamentos: 'Fitas & Laços / Aviamentos',
  adesivos_colas: 'Colas & Adesivos',
  impressao_tintas: 'Impressão & Tintas',
  laminacao_foils: 'Laminação & Foils',
  acrilicos: 'Acrílicos',
  chaveiros: 'Chaveiros & Mimos',
  outros: 'Outros',
};

const UNIT_LABELS: Record<SupplyUnit, string> = {
  folha: 'folha(s)',
  metro: 'metro(s)',
  cm: 'cm',
  unidade: 'unidade(s)',
  ml: 'ml',
  g: 'g',
  pacote: 'pacote(s)',
  rolo: 'rolo(s)',
  kit: 'kit(s)',
  par: 'par(es)',
};

export function PurchaseHistoryTab({
  historyItems,
  supplies,
  loading,
  canCreate = true,
  canDelete = true,
  onRefresh,
  openAddPurchaseTrigger,
}: PurchaseHistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'table'>(() => {
    try {
      const saved = localStorage.getItem('luisices_purchase_history_view_mode');
      if (saved === 'list' || saved === 'table') return saved;
    } catch {}
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'list';
    }
    return 'table';
  });

  const handleSetViewMode = (mode: 'list' | 'table') => {
    setViewMode(mode);
    try {
      localStorage.setItem('luisices_purchase_history_view_mode', mode);
    } catch {}
  };

  // Modal para lançar nova compra
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [supplyId, setSupplyId] = useState<string>('new');
  const [supplyName, setSupplyName] = useState('');
  const [category, setCategory] = useState<SupplyCategory>('papeis');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [store, setStore] = useState('');
  const [quantity, setQuantity] = useState<number | ''>(100);
  const [unit, setUnit] = useState<SupplyUnit>('folha');
  const [price, setPrice] = useState<number | ''>(0);
  const [shippingCost, setShippingCost] = useState<number | ''>(0);
  const [notes, setNotes] = useState('');

  // Confirmação de Exclusão Física
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<PurchaseHistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Cancelamento / Estorno de Movimentação
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [itemToCancel, setItemToCancel] = useState<PurchaseHistoryItem | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Chave de idempotência estável por sessão de formulário
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');

  // Abrir modal limpo
  const openAddDialog = () => {
    setSupplyId('new');
    setSupplyName('');
    setCategory('papeis');
    setDate(new Date().toISOString().slice(0, 10));
    setStore('');
    setQuantity(100);
    setUnit('folha');
    setPrice(54);
    setShippingCost(0);
    setNotes('');
    setIdempotencyKey(`purch_${Date.now()}_${secureRandomId()}`);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (openAddPurchaseTrigger && openAddPurchaseTrigger > 0) {
      openAddDialog();
    }
  }, [openAddPurchaseTrigger]);

  // Ao selecionar um insumo existente do dropdown, auto-preenche a categoria, nome e fornecedor
  const handleSelectSupply = (id: string) => {
    setSupplyId(id);
    if (id !== 'new') {
      const found = supplies.find((s) => s.id === id);
      if (found) {
        setSupplyName(found.name);
        setCategory(found.category);
        setUnit(found.unit);
        setStore(found.supplier || '');
        setPrice(found.purchasePrice || 0);
        setShippingCost(found.shippingCost || 0);
        setQuantity(found.packageQuantity || 1);
      }
    }
  };

  // Cálculos automáticos do formulário
  const numPrice = typeof price === 'number' ? price : parseFloat(String(price)) || 0;
  const numShipping = typeof shippingCost === 'number' ? shippingCost : parseFloat(String(shippingCost)) || 0;
  const numQty = typeof quantity === 'number' ? quantity : parseFloat(String(quantity)) || 0;

  const totalPurchasePrice = numPrice + numShipping;
  const calculatedUnitCost = numQty > 0 ? totalPurchasePrice / numQty : 0;

  // Salvar registro de compra no histórico
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplyName.trim()) {
      toast.error('Informe o nome do insumo');
      return;
    }
    if (numQty <= 0) {
      toast.error('A quantidade deve ser maior que zero');
      return;
    }

    try {
      setSaving(true);

      // Se for um insumo novo sem ID prévio, cria primeiro o insumo na Aba 1
      let targetSupplyId = supplyId;
      if (supplyId === 'new') {
        const created = await firebasePricingService.createSupply({
          name: supplyName.trim(),
          category,
          purchasePrice: numPrice,
          shippingCost: numShipping,
          totalPrice: totalPurchasePrice,
          packageQuantity: numQty,
          unit,
          unitCost: calculatedUnitCost,
          supplier: store.trim() || undefined,
          lastPurchaseDate: date,
          notes: notes.trim() || undefined,
          currentStock: numQty,
        });
        targetSupplyId = created.id;
      }

      await firebasePricingService.addPurchaseRecord({
        idempotencyKey: idempotencyKey || `purch_${Date.now()}_${secureRandomId()}`,
        supplyId: targetSupplyId,
        supplyName: supplyName.trim(),
        category,
        date,
        store: store.trim() || 'Não especificado',
        quantity: numQty,
        unit,
        price: numPrice,
        shippingCost: numShipping,
        totalPrice: totalPurchasePrice,
        unitCost: calculatedUnitCost,
        notes: notes.trim() || undefined,
      });

      toast.success('Compra lançada com sucesso no histórico!');
      setDialogOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao salvar registro de compra');
    } finally {
      setSaving(false);
    }
  };

  // Cancelar compra e estornar movimentação de estoque
  const handleCancelItem = async () => {
    if (!itemToCancel) return;
    try {
      setCancelling(true);
      const res = await firebasePricingService.cancelPurchaseRecord(itemToCancel.id);
      if (res.unreversedQuantity > 0) {
        toast.warning(
          `Compra cancelada! ${res.revertedQuantity} unidades estornadas no estoque. ${res.unreversedQuantity} unidades já haviam sido consumidas.`
        );
      } else {
        toast.success(`Compra cancelada e ${res.revertedQuantity} unidades estornadas no estoque!`);
      }
      setCancelConfirmOpen(false);
      setItemToCancel(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao cancelar compra');
    } finally {
      setCancelling(false);
    }
  };

  // Excluir registro físico do histórico
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      setDeleting(true);
      await firebasePricingService.deletePurchaseRecord(itemToDelete.id);
      toast.success('Registro de histórico excluído com sucesso');
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir registro');
    } finally {
      setDeleting(false);
    }
  };

  // Filtragem da tabela
  const filteredHistory = useMemo(() => {
    return historyItems.filter((item) => {
      const matchSearch =
        item.supplyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.store && item.store.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;

      return matchSearch && matchCat;
    });
  }, [historyItems, searchTerm, selectedCategory]);

  // Métricas agregadas
  const totalSpent = useMemo(() => {
    return historyItems.reduce((sum, h) => sum + (h.totalPrice || h.price + (h.shippingCost || 0)), 0);
  }, [historyItems]);

  const currentMonthSpent = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    return historyItems
      .filter((h) => h.date && h.date.startsWith(currentMonth))
      .reduce((sum, h) => sum + (h.totalPrice || h.price + (h.shippingCost || 0)), 0);
  }, [historyItems]);

  return (
    <div className="space-y-6">
      {/* Mini Cards de Métricas de Compras */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/60 backdrop-blur-md border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Investido em Compras
              </p>
              <h3 className="text-2xl font-black text-foreground mt-1">
                {formatCurrency(totalSpent)}
              </h3>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="size-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-md border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Compras Este Mês
              </p>
              <h3 className="text-2xl font-black text-foreground mt-1">
                {formatCurrency(currentMonthSpent)}
              </h3>
            </div>
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <ShoppingBag className="size-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-md border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Registros de Compra
              </p>
              <h3 className="text-2xl font-black text-foreground mt-1">
                {historyItems.length} compras
              </h3>
            </div>
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <History className="size-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles de Busca, Filtro e Lançamento de Compra */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <History className="size-5 text-primary" />
                Aba 2 — Histórico de Compras de Insumos
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Acompanhe as oscilações de preço dos materiais e lance novas compras para atualizar seus custos automaticamente.
              </CardDescription>
            </div>

            {canCreate && (
              <Button
                onClick={openAddDialog}
                className="gap-2 font-semibold min-h-[40px] px-4 rounded-xl shadow-md hover:bg-primary/90 active:scale-95 transition-all w-full sm:w-auto justify-center"
              >
                <Plus className="size-4" />
                Lançar Nova Compra
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por insumo, loja, fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="flex-1 sm:flex-initial sm:w-56 text-xs">
                  <SelectValue placeholder="Todas as Categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Alternador de visualização (Lista | Planilha) */}
              <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 shrink-0">
                <Button
                  type="button"
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-2 sm:px-2.5 text-xs gap-1.5"
                  onClick={() => handleSetViewMode('list')}
                  title="Lista vertical (sem barra de rolagem horizontal)"
                >
                  <LayoutList className="size-3.5" />
                  <span className="hidden sm:inline">Lista</span>
                </Button>
                <Button
                  type="button"
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-2 sm:px-2.5 text-xs gap-1.5"
                  onClick={() => handleSetViewMode('table')}
                  title="Planilha clássica (com rolagem horizontal)"
                >
                  <TableIcon className="size-3.5" />
                  <span className="hidden sm:inline">Planilha</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Tabela do Histórico de Compras */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs">Carregando histórico de compras...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl space-y-3">
              <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <History className="size-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Nenhum registro de compra encontrado
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Lance suas compras de materiais para manter o histórico de inflação e atualizar os custos dos produtos automaticamente.
              </p>
              <Button onClick={openAddDialog} size="sm" variant="outline" className="gap-2 mt-2">
                <Plus className="size-4" />
                Registrar Primeira Compra
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border/80 overflow-hidden bg-card shadow-xs">
              {viewMode === 'list' ? (
                /* Mobile-First Card List (Sem scroll horizontal) */
                <div className="divide-y divide-border">
                  {filteredHistory.map((item) => {
                    const totalVal = item.totalPrice || item.price + (item.shippingCost || 0);
                    const unitCostVal = item.quantity > 0 ? totalVal / item.quantity : item.unitCost;

                    return (
                      <div key={item.id} className="p-3.5 space-y-2.5 transition-colors hover:bg-muted/20">
                        {/* Top Bar: Data + Categoria + Status + Ação */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
                              <Calendar className="size-3.5 text-muted-foreground" />
                              {formatDateBR(item.date)}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {CATEGORY_LABELS[item.category] || item.category}
                            </Badge>
                            {item.status === 'cancelled' ? (
                              <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 bg-destructive/5 font-semibold">
                                Cancelado {item.revertedQuantity != null ? `(${item.revertedQuantity} estornado)` : ''}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50/50 font-normal">
                                Ativo
                              </Badge>
                            )}
                          </div>

                          {canDelete && (
                            <div className="flex items-center gap-1">
                              {item.status !== 'cancelled' && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                                  title="Estornar compra e atualizar estoque"
                                  onClick={() => {
                                    setItemToCancel(item);
                                    setCancelConfirmOpen(true);
                                  }}
                                >
                                  <RotateCcw className="size-3.5" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Excluir permanentemente do Histórico"
                                onClick={() => {
                                  setItemToDelete(item);
                                  setDeleteConfirmOpen(true);
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Nome do Insumo e Loja */}
                        <div>
                          <h4 className="font-bold text-foreground text-sm leading-tight break-words">
                            {item.supplyName}
                          </h4>
                          {item.store && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                              <Store className="size-3 text-muted-foreground" />
                              <span>Loja: <strong className="font-medium text-foreground/80">{item.store}</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Box de Valores em Destaque */}
                        <div className="bg-muted/40 p-2.5 rounded-lg border border-border/50 flex items-center justify-between gap-3">
                          <div className="space-y-0.5 min-w-0">
                            <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                              Quantidade & Total
                            </div>
                            <div className="text-xs font-semibold text-foreground truncate">
                              {item.quantity} {UNIT_LABELS[item.unit] || item.unit}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Total: <strong className="font-medium text-foreground">{formatCurrency(totalVal)}</strong>
                              {item.shippingCost && item.shippingCost > 0 ? ` (fr. ${formatCurrency(item.shippingCost)})` : ''}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">
                              Custo Unitário
                            </div>
                            <div className="text-base font-black text-primary">
                              R$ {unitCostVal.toFixed(4)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              por {UNIT_LABELS[item.unit] || item.unit}
                            </div>
                          </div>
                        </div>

                        {item.notes && (
                          <p className="text-[11px] text-muted-foreground/90 italic truncate" title={item.notes}>
                            Obs: {item.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Planilha Completa (Disponível no mobile e desktop com rolagem horizontal) */
                <div>
                  <div className="md:hidden px-3 py-1.5 bg-muted/60 text-[11px] text-muted-foreground border-b flex items-center justify-between">
                    <span>Formato Planilha Completa</span>
                    <span className="text-[10px] text-primary font-semibold flex items-center gap-1">
                      ↔️ Deslize para os lados
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                  <thead className="bg-muted/70 text-muted-foreground font-bold uppercase tracking-wider text-[10px] border-b border-border">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Insumo</th>
                      <th className="p-3">Categoria</th>
                      <th className="p-3">Loja / Fornecedor</th>
                      <th className="p-3 text-right">Qtd.</th>
                      <th className="p-3 text-right">Valor Pago</th>
                      <th className="p-3 text-right">Frete</th>
                      <th className="p-3 text-right">Valor Final</th>
                      <th className="p-3 text-right">Custo Unitário</th>
                      <th className="p-3 text-center">Status</th>
                      {canDelete && <th className="p-3 text-center">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredHistory.map((item) => {
                      const totalVal = item.totalPrice || item.price + (item.shippingCost || 0);
                      const unitCostVal = item.quantity > 0 ? totalVal / item.quantity : item.unitCost;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-muted/30 transition-colors group"
                        >
                          <td className="p-3 font-semibold whitespace-nowrap text-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="size-3.5 text-muted-foreground" />
                              {formatDateBR(item.date)}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-foreground">
                            <div>
                              {item.supplyName}
                              {item.notes && (
                                <p className="text-[10px] text-muted-foreground font-normal line-clamp-1 mt-0.5">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {CATEGORY_LABELS[item.category] || item.category}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <Store className="size-3 text-muted-foreground" />
                              {item.store || '—'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-medium whitespace-nowrap">
                            {item.quantity} {UNIT_LABELS[item.unit] || item.unit}
                          </td>
                          <td className="p-3 text-right font-medium text-foreground whitespace-nowrap">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="p-3 text-right text-muted-foreground whitespace-nowrap">
                            {item.shippingCost ? formatCurrency(item.shippingCost) : 'R$ 0,00'}
                          </td>
                          <td className="p-3 text-right font-bold text-foreground whitespace-nowrap">
                            {formatCurrency(totalVal)}
                          </td>
                          <td className="p-3 text-right font-black text-primary whitespace-nowrap bg-primary/5">
                            R$ {unitCostVal.toFixed(4)}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            {item.status === 'cancelled' ? (
                              <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 bg-destructive/5 font-semibold">
                                Cancelado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50/50 font-normal">
                                Ativo
                              </Badge>
                            )}
                          </td>
                          {canDelete && (
                            <td className="p-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                {item.status !== 'cancelled' && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-7 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                                    title="Estornar compra e atualizar estoque"
                                    onClick={() => {
                                      setItemToCancel(item);
                                      setCancelConfirmOpen(true);
                                    }}
                                  >
                                    <RotateCcw className="size-3.5" />
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7 text-muted-foreground hover:text-destructive"
                                  title="Excluir permanentemente do Histórico"
                                  onClick={() => {
                                    setItemToDelete(item);
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        </CardContent>
      </Card>

      {/* MODAL PARA LANÇAR NOVA COMPRA */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="size-5 text-primary" />
              Lançar Nova Compra no Histórico
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePurchase} className="space-y-4">
            <DialogBody className="space-y-4">
              {/* Seleção do Insumo ou Novo */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Insumo da Compra</Label>
                <Select value={supplyId} onValueChange={handleSelectSupply}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione um insumo cadastrado ou crie novo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">➕ Cadastrar Novo Insumo...</SelectItem>
                    {supplies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({CATEGORY_LABELS[s.category] || s.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nome do Insumo */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome do Insumo *</Label>
                <Input
                  required
                  value={supplyName}
                  onChange={(e) => setSupplyName(e.target.value)}
                  placeholder="Ex: Papel Fotográfico Glossy 200g, Bóton 25mm..."
                  className="text-xs"
                />
              </div>

              {/* Categoria e Unidade */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Categoria *</Label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as SupplyCategory)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([k, lbl]) => (
                        <SelectItem key={k} value={k}>
                          {lbl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Unidade de Medida *</Label>
                  <Select value={unit} onValueChange={(v) => setUnit(v as SupplyUnit)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UNIT_LABELS).map(([k, lbl]) => (
                        <SelectItem key={k} value={k}>
                          {lbl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Loja e Data */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Loja / Onde Comprei</Label>
                  <Input
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    placeholder="Ex: Shopee, Kalunga, Mercado Livre..."
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Data da Compra *</Label>
                  <Input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Quantidade, Preço Pago e Frete */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Qtd. Comprada *</Label>
                  <Input
                    type="number"
                    min="0.0001"
                    step="any"
                    placeholder="Ex: 100"
                    required
                    value={quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuantity(val === '' ? '' : parseFloat(val) || 0);
                    }}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Valor Pago (R$) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required
                    value={price}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPrice(val === '' ? '' : parseFloat(val) || 0);
                    }}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Frete (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={shippingCost}
                    onChange={(e) => {
                      const val = e.target.value;
                      setShippingCost(val === '' ? '' : parseFloat(val) || 0);
                    }}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Painel de Resultado Calculado */}
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
                <div className="flex justify-between text-xs font-medium text-foreground">
                  <span>Valor Final com Frete:</span>
                  <span className="font-bold">{formatCurrency(totalPurchasePrice)}</span>
                </div>
                <div className="flex justify-between text-xs font-medium text-primary">
                  <span>Custo Unitário Resultante:</span>
                  <span className="font-extrabold text-sm">R$ {calculatedUnitCost.toFixed(4)} / {unit}</span>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Rendimento / Observações</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Pacote com 200 folhas, rendimento de 23 caixas..."
                  className="text-xs h-16"
                />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="gap-2 font-bold">
                {saving && <Loader2 className="size-4 animate-spin" />}
                Salvar e Atualizar Custo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE ESTORNO DE COMPRA */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="size-5 text-amber-600" />
              Estornar compra e atualizar estoque?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs">
              <p>
                Deseja estornar a compra de <strong>{itemToCancel?.quantity} {itemToCancel?.unit}s</strong> de <strong>&quot;{itemToCancel?.supplyName}&quot;</strong>?
              </p>
              <p className="text-muted-foreground">
                O saldo disponível em estoque será estornado atomicamente sem permitir saldo negativo. O registro permanecerá no histórico marcado como <strong>Cancelado</strong> para fins de auditoria.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelItem}
              disabled={cancelling}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {cancelling && <Loader2 className="size-4 animate-spin mr-2" />}
              Confirmar Estorno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO FÍSICA */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro do histórico?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-1.5 text-xs">
              <p>
                Esta ação removerá permanentemente o registro de compra ({itemToDelete?.supplyName} de {itemToDelete?.date}).
              </p>
              <p className="text-amber-600 font-medium">
                Atenção: a exclusão física apenas remove o registro histórico e não altera o estoque atual. Para reverter os itens no estoque, utilize a opção de estorno.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="size-4 animate-spin mr-2" />}
              Excluir Registro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const [year, month, day] = dateStr.slice(0, 10).split('-');
    if (day && month && year) {
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

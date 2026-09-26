import { useState, useMemo } from 'react';
import { SupplyItem, SupplyCategory, SupplyUnit } from '../../types';
import { firebasePricingService } from '../../../services/firebasePricingService';
import { formatCurrency } from '../../utils/currency';
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
  Plus,
  Pencil,
  Trash2,
  Search,
  Sparkles,
  Layers,
  Package,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Table as TableIcon,
  LayoutGrid,
  Truck,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

interface SuppliesTabProps {
  supplies: SupplyItem[];
  loading: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onRefresh?: () => void;
}

const CATEGORY_MAP: Record<SupplyCategory, { label: string; color: string }> = {
  papeis: { label: 'Papéis', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' },
  vinis: { label: 'Vinis & Recorte', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300' },
  botons: { label: 'Bótons', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
  canecas: { label: 'Canecas & Sublimação', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300' },
  embalagens: { label: 'Caixas & Embalagens', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
  fitas_aviamentos: { label: 'Fitas & Laços / Aviamentos', color: 'bg-pink-100 text-pink-800 dark:bg-pink-950/40 dark:text-pink-300' },
  adesivos_colas: { label: 'Colas & Adesivos', color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300' },
  impressao_tintas: { label: 'Impressão & Tintas', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300' },
  laminacao_foils: { label: 'Laminação & Foils', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300' },
  acrilicos: { label: 'Acrílicos', color: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/40 dark:text-fuchsia-300' },
  chaveiros: { label: 'Chaveiros & Mimos', color: 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300' },
  outros: { label: 'Outros', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
};

const UNIT_MAP: Record<SupplyUnit, string> = {
  folha: 'folha(s)',
  metro: 'metro(s)',
  cm: 'centímetro(s)',
  unidade: 'unidade(s)',
  ml: 'ml',
  g: 'grama(s)',
  pacote: 'pacote(s)',
  rolo: 'rolo(s)',
  kit: 'kit(s)',
  par: 'par(es)',
};

export function SuppliesTab({
  supplies,
  loading,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  onRefresh,
}: SuppliesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modal de Adição/Edição
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<SupplyItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states - campos da especificação
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SupplyCategory>('papeis');
  const [brandModel, setBrandModel] = useState('');
  const [supplier, setSupplier] = useState('');
  const [purchaseUrl, setPurchaseUrl] = useState('');
  const [lastPurchaseDate, setLastPurchaseDate] = useState('');
  const [packageQuantity, setPackageQuantity] = useState<number>(100);
  const [unit, setUnit] = useState<SupplyUnit>('folha');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(0);
  const [needsReorder, setNeedsReorder] = useState(false);
  const [notes, setNotes] = useState('');

  // Diálogo de confirmação de exclusão
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [supplyToDelete, setSupplyToDelete] = useState<SupplyItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Carga de presets
  const [presetConfirmOpen, setPresetConfirmOpen] = useState(false);
  const [loadingPresets, setLoadingPresets] = useState(false);

  const openAddDialog = () => {
    setEditingSupply(null);
    setName('');
    setCategory('papeis');
    setBrandModel('');
    setSupplier('');
    setPurchaseUrl('');
    setLastPurchaseDate(new Date().toISOString().split('T')[0]);
    setPackageQuantity(100);
    setUnit('folha');
    setPurchasePrice(35);
    setShippingCost(0);
    setCurrentStock(100);
    setMinStock(20);
    setNeedsReorder(false);
    setNotes('');
    setDialogOpen(true);
  };

  const openEditDialog = (item: SupplyItem) => {
    setEditingSupply(item);
    setName(item.name);
    setCategory(item.category);
    setBrandModel(item.brandModel || '');
    setSupplier(item.supplier || '');
    setPurchaseUrl(item.purchaseUrl || '');
    setLastPurchaseDate(item.lastPurchaseDate || (item.createdAt ? item.createdAt.split('T')[0] : ''));
    setPackageQuantity(item.packageQuantity);
    setUnit(item.unit);
    setPurchasePrice(item.purchasePrice);
    setShippingCost(item.shippingCost || 0);
    setCurrentStock(item.currentStock ?? item.packageQuantity);
    setMinStock(item.minStock ?? 0);
    setNeedsReorder(Boolean(item.needsReorder));
    setNotes(item.notes || '');
    setDialogOpen(true);
  };

  const calculatedTotalCost = (purchasePrice || 0) + (shippingCost || 0);
  const calculatedUnitCost =
    packageQuantity > 0
      ? Math.round((calculatedTotalCost / packageQuantity) * 10000) / 10000
      : 0;

  const handleSaveSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome do insumo.');
      return;
    }
    if (purchasePrice <= 0 || packageQuantity <= 0) {
      toast.error('Informe um valor pago e quantidade de pacote válidos.');
      return;
    }

    try {
      setSaving(true);
      const isAutoReorder = (currentStock <= minStock && minStock > 0) || needsReorder;

      if (editingSupply) {
        await firebasePricingService.updateSupply(editingSupply.id, {
          name: name.trim(),
          category,
          brandModel: brandModel.trim() || null,
          supplier: supplier.trim() || null,
          purchaseUrl: purchaseUrl.trim() || null,
          lastPurchaseDate: lastPurchaseDate || null,
          packageQuantity,
          unit,
          purchasePrice,
          shippingCost,
          unitCost: calculatedUnitCost,
          currentStock,
          minStock,
          needsReorder: isAutoReorder,
          notes: notes.trim() || null,
        });
        toast.success('Insumo atualizado com sucesso!');
      } else {
        await firebasePricingService.createSupply({
          name: name.trim(),
          category,
          brandModel: brandModel.trim() || null,
          supplier: supplier.trim() || null,
          purchaseUrl: purchaseUrl.trim() || null,
          lastPurchaseDate: lastPurchaseDate || null,
          packageQuantity,
          unit,
          purchasePrice,
          shippingCost,
          unitCost: calculatedUnitCost,
          currentStock,
          minStock,
          needsReorder: isAutoReorder,
          notes: notes.trim() || null,
        });
        toast.success('Insumo cadastrado com sucesso!');
      }
      setDialogOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao salvar insumo:', err);
      toast.error('Não foi possível salvar o insumo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!supplyToDelete) return;
    try {
      setDeleting(true);
      await firebasePricingService.deleteSupply(supplyToDelete.id);
      toast.success('Insumo removido com sucesso!');
      setDeleteConfirmOpen(false);
      setSupplyToDelete(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao excluir insumo:', err);
      toast.error('Não foi possível remover o insumo.');
    } finally {
      setDeleting(false);
    }
  };

  const handleLoadPresets = async () => {
    try {
      setLoadingPresets(true);
      const count = await firebasePricingService.loadPresetSupplies();
      toast.success(`${count} insumos sugeridos foram adicionados ao seu catálogo!`);
      setPresetConfirmOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao carregar presets:', err);
      toast.error('Falha ao carregar insumos sugeridos.');
    } finally {
      setLoadingPresets(false);
    }
  };

  const filteredSupplies = useMemo(() => {
    return supplies.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.brandModel && item.brandModel.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.supplier && item.supplier.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;

      const isLow =
        (item.currentStock !== undefined && item.minStock !== undefined && item.minStock > 0 && item.currentStock <= item.minStock) ||
        Boolean(item.needsReorder);

      const matchesStock = !filterLowStockOnly || isLow;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [supplies, searchTerm, selectedCategory, filterLowStockOnly]);

  const lowStockCount = useMemo(() => {
    return supplies.filter(
      (s) =>
        (s.currentStock !== undefined && s.minStock !== undefined && s.minStock > 0 && s.currentStock <= s.minStock) ||
        Boolean(s.needsReorder)
    ).length;
  }, [supplies]);

  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Ações */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por insumo, marca ou loja..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Todas as Categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {Object.entries(CATEGORY_MAP).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant={filterLowStockOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`h-9 text-xs gap-1.5 ${
              filterLowStockOnly
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
            }`}
          >
            <AlertTriangle className="size-3.5" />
            Reposição
            {lowStockCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {lowStockCount}
              </span>
            )}
          </Button>

          {/* Alternador de visualização */}
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/40">
            <Button
              type="button"
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2.5 text-xs gap-1.5"
              onClick={() => setViewMode('table')}
              title="Visualização em Planilha (Tabela completa)"
            >
              <TableIcon className="size-3.5" />
              <span className="hidden sm:inline">Planilha</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2.5 text-xs gap-1.5"
              onClick={() => setViewMode('grid')}
              title="Visualização em Cards"
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </Button>
          </div>
        </div>

        {/* Botões de Ação com respeito estrito a permissões */}
        <div className="flex items-center gap-2">
          {canCreate && supplies.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresetConfirmOpen(true)}
              disabled={loadingPresets}
              className="gap-1.5 text-xs h-9"
            >
              <Sparkles className="size-3.5 text-primary" />
              Sugerir Insumos
            </Button>
          )}

          {canCreate && (
            <Button onClick={openAddDialog} className="gap-2 text-xs font-semibold h-9 shadow-sm">
              <Plus className="size-4" />
              Novo Insumo
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : filteredSupplies.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Layers className="size-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-base font-bold">Nenhum insumo encontrado</h3>
            <p className="text-xs text-muted-foreground max-w-md mt-1 mb-6">
              {supplies.length === 0
                ? 'Comece cadastrando suas matérias-primas (papéis, bótons, adesivos, vinis, canecas) ou carregue nossa lista com insumos pré-configurados do Ateliê Luisices.'
                : 'Nenhum insumo corresponde aos filtros selecionados.'}
            </p>
            {supplies.length === 0 && canCreate && (
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  onClick={() => setPresetConfirmOpen(true)}
                  className="gap-2 bg-gradient-to-r from-primary to-primary/80"
                >
                  <Sparkles className="size-4" />
                  Carregar Insumos Sugeridos da Luisices
                </Button>
                <Button variant="outline" onClick={openAddDialog} className="gap-2">
                  <Plus className="size-4" />
                  Cadastrar Manualmente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        /* VISUALIZAÇÃO EM PLANILHA COMPACTA (CADASTRO DE CUSTOS) */
        <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[240px]">Insumo & Detalhes</th>
                  <th className="py-3 px-3 min-w-[130px]">Embalagem</th>
                  <th className="py-3 px-3 text-right min-w-[120px]">Custo Aquisição</th>
                  <th className="py-3 px-4 text-right bg-primary/5 font-bold text-primary min-w-[130px]">Custo Unitário</th>
                  <th className="py-3 px-3 text-center min-w-[130px]">Estoque & Status</th>
                  {(canEdit || canDelete) && <th className="py-3 px-3 text-center w-[90px]">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSupplies.map((item) => {
                  const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.outros;
                  const total = (item.purchasePrice || 0) + (item.shippingCost || 0);
                  const isLow =
                    (item.currentStock !== undefined && item.minStock !== undefined && item.minStock > 0 && item.currentStock <= item.minStock) ||
                    Boolean(item.needsReorder);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/30 transition-colors ${isLow ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}`}
                    >
                      {/* Insumo & Detalhes */}
                      <td className="py-3 px-4 align-middle">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cat.color}`}>
                              {cat.label}
                            </span>
                            <span className="font-semibold text-foreground text-sm">
                              {item.name}
                            </span>
                            {item.purchaseUrl && (
                              <a
                                href={item.purchaseUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                                title="Abrir link da compra"
                              >
                                <ExternalLink className="size-3.5" />
                              </a>
                            )}
                          </div>
                          
                          {/* Metadados: Marca, Loja, Notas */}
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                            {item.brandModel && (
                              <span>Marca: <strong className="font-medium text-foreground/80">{item.brandModel}</strong></span>
                            )}
                            {item.brandModel && item.supplier && <span>•</span>}
                            {item.supplier && (
                              <span>Loja: <strong className="font-medium text-foreground/80">{item.supplier}</strong></span>
                            )}
                          </div>

                          {item.notes && (
                            <p className="text-[11px] text-muted-foreground/90 italic truncate max-w-md" title={item.notes}>
                              Obs: {item.notes}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Embalagem & Data de Compra */}
                      <td className="py-3 px-3 align-middle">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-xs">
                            {item.packageQuantity} {UNIT_MAP[item.unit] || item.unit}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {item.lastPurchaseDate
                              ? `Compra: ${new Date(item.lastPurchaseDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
                              : 'Sem data reg.'}
                          </span>
                        </div>
                      </td>

                      {/* Custo de Aquisição */}
                      <td className="py-3 px-3 text-right align-middle">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-foreground text-xs">
                            {formatCurrency(total)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {item.shippingCost && item.shippingCost > 0
                              ? `${formatCurrency(item.purchasePrice)} + ${formatCurrency(item.shippingCost)} fr.`
                              : 'Frete grátis / R$ 0'}
                          </span>
                        </div>
                      </td>

                      {/* Custo Unitário */}
                      <td className="py-3 px-4 text-right align-middle bg-primary/5">
                        <div className="flex flex-col items-end">
                          <span className="font-black text-primary text-sm">
                            {formatCurrency(item.unitCost)}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            por {item.unit}
                          </span>
                        </div>
                      </td>

                      {/* Estoque & Status */}
                      <td className="py-3 px-3 text-center align-middle">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1 text-xs">
                            <span className={`font-semibold ${isLow ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-foreground'}`}>
                              {item.currentStock ?? '0'} {item.unit}s
                            </span>
                            {item.minStock ? (
                              <span className="text-[10px] text-muted-foreground">
                                (mín: {item.minStock})
                              </span>
                            ) : null}
                          </div>
                          {isLow ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                              ⚠️ Repor
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
                              ✅ Em dia
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Ações */}
                      {(canEdit || canDelete) && (
                        <td className="py-3 px-3 text-center align-middle">
                          <div className="flex items-center justify-center gap-1">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-foreground"
                                onClick={() => openEditDialog(item)}
                                title="Editar Insumo"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  setSupplyToDelete(item);
                                  setDeleteConfirmOpen(true);
                                }}
                                title="Excluir Insumo"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
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
      ) : (
        /* VISUALIZAÇÃO EM GRADE DE CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSupplies.map((item) => {
            const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.outros;
            const total = (item.purchasePrice || 0) + (item.shippingCost || 0);
            const isLow =
              (item.currentStock !== undefined && item.minStock !== undefined && item.minStock > 0 && item.currentStock <= item.minStock) ||
              Boolean(item.needsReorder);

            return (
              <Card
                key={item.id}
                className={`hover:shadow-md transition-shadow flex flex-col justify-between ${
                  isLow ? 'border-amber-400/60 dark:border-amber-600/40' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cat.color}`}>
                        {cat.label}
                      </span>
                      {isLow && (
                        <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                          Comprar novamente ⚠️
                        </Badge>
                      )}
                    </div>
                    {(canEdit || canDelete) && (
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditDialog(item)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setSupplyToDelete(item);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-base font-semibold leading-tight mt-2 flex items-center justify-between">
                    <span>{item.name}</span>
                    {item.purchaseUrl && (
                      <a
                        href={item.purchaseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-primary p-1"
                        title="Link da compra"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs space-y-0.5">
                    {item.brandModel && <div>Marca: {item.brandModel}</div>}
                    {item.supplier && <div>Loja: {item.supplier}</div>}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  <div className="bg-muted/40 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-muted-foreground">
                        Compra: {formatCurrency(item.purchasePrice)}
                        {item.shippingCost ? ` + Frete ${formatCurrency(item.shippingCost)}` : ''}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        por {item.packageQuantity} {item.unit}s
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">
                        Custo unitário
                      </div>
                      <div className="text-lg font-black text-primary">
                        {formatCurrency(item.unitCost)}
                        <span className="text-xs font-normal text-muted-foreground">
                          /{item.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t pt-2">
                    <div>
                      Estoque: <strong className={isLow ? 'text-amber-600 font-bold' : 'text-foreground'}>{item.currentStock ?? '—'}</strong>
                      {item.minStock ? ` (mín: ${item.minStock})` : ''}
                    </div>
                    {item.lastPurchaseDate && (
                      <div>
                        {new Date(item.lastPurchaseDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>

                  {item.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                      "{item.notes}"
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Adicionar / Editar Insumo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
            <DialogTitle>
              {editingSupply ? 'Editar Insumo (Cadastro de Custos)' : 'Novo Insumo / Matéria-Prima'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSupply} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <DialogBody className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              {/* Nome e Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="supply-name" className="text-xs">
                    Nome do Insumo *
                  </Label>
                  <Input
                    id="supply-name"
                    placeholder="Ex: Papel Fotográfico Glossy 180g"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="text-xs">
                    Categoria
                  </Label>
                  <Select
                    value={category}
                    onValueChange={(val: SupplyCategory) => setCategory(val)}
                  >
                    <SelectTrigger id="category" className="mt-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_MAP).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Marca, Loja e Link */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="brand" className="text-xs">
                    Marca / Modelo
                  </Label>
                  <Input
                    id="brand"
                    placeholder="Ex: Masterprint, Marpax..."
                    value={brandModel}
                    onChange={(e) => setBrandModel(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label htmlFor="supplier" className="text-xs">
                    Onde Comprei (Loja)
                  </Label>
                  <Input
                    id="supplier"
                    placeholder="Ex: Shopee, Kalunga, Mercado Livre"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label htmlFor="url" className="text-xs">
                    Link da Compra / Contato
                  </Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://..."
                    value={purchaseUrl}
                    onChange={(e) => setPurchaseUrl(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              {/* Conversor de Compra para Consumo */}
              <div className="border rounded-xl p-4 bg-muted/20 space-y-3">
                <div className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Package className="size-3.5 text-primary" />
                    Valores da Compra & Cálculo Automático do Custo Unitário
                  </span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    (Valor pago + Frete) ÷ Qtd = Custo Unitário
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="purchase-price" className="text-xs">
                      Valor Pago (R$) *
                    </Label>
                    <Input
                      id="purchase-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="54.00"
                      value={purchasePrice || ''}
                      onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                      required
                      className="mt-1 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <Label htmlFor="shipping-cost" className="text-xs">
                      Frete (R$)
                    </Label>
                    <Input
                      id="shipping-cost"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={shippingCost || ''}
                      onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                      className="mt-1 text-xs"
                    />
                  </div>

                  <div>
                    <Label htmlFor="package-qty" className="text-xs">
                      Qtd. Comprada *
                    </Label>
                    <Input
                      id="package-qty"
                      type="number"
                      min="1"
                      placeholder="200"
                      value={packageQuantity || ''}
                      onChange={(e) => setPackageQuantity(parseFloat(e.target.value) || 1)}
                      required
                      className="mt-1 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <Label htmlFor="unit" className="text-xs">
                      Unidade de Uso
                    </Label>
                    <Select
                      value={unit}
                      onValueChange={(val: SupplyUnit) => setUnit(val)}
                    >
                      <SelectTrigger id="unit" className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(UNIT_MAP).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between pt-2.5 border-t text-xs">
                  <div className="text-muted-foreground">
                    Custo total da compra: <strong className="text-foreground">{formatCurrency(calculatedTotalCost)}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground mr-1.5">Custo unitário automático:</span>
                    <span className="text-base font-black text-primary">
                      {formatCurrency(calculatedUnitCost)} / {unit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controle de Estoque & Reposição */}
              <div className="border rounded-xl p-4 bg-muted/10 space-y-3">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-amber-600" />
                  Controle de Reposição & Estoque
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="current-stock" className="text-xs">
                      Estoque Atual ({unit}s)
                    </Label>
                    <Input
                      id="current-stock"
                      type="number"
                      min="0"
                      value={currentStock}
                      onChange={(e) => setCurrentStock(parseFloat(e.target.value) || 0)}
                      className="mt-1 text-xs"
                    />
                  </div>

                  <div>
                    <Label htmlFor="min-stock" className="text-xs">
                      Estoque Mínimo ({unit}s)
                    </Label>
                    <Input
                      id="min-stock"
                      type="number"
                      min="0"
                      value={minStock}
                      onChange={(e) => setMinStock(parseFloat(e.target.value) || 0)}
                      className="mt-1 text-xs"
                    />
                  </div>

                  <div>
                    <Label htmlFor="purchase-date" className="text-xs">
                      Data da Última Compra
                    </Label>
                    <Input
                      id="purchase-date"
                      type="date"
                      value={lastPurchaseDate}
                      onChange={(e) => setLastPurchaseDate(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="needs-reorder"
                    checked={needsReorder || (minStock > 0 && currentStock <= minStock)}
                    onChange={(e) => setNeedsReorder(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary size-4"
                  />
                  <Label htmlFor="needs-reorder" className="text-xs cursor-pointer font-medium">
                    Marcar em alerta de "Comprar novamente? / Reposição"
                  </Label>
                </div>
              </div>

              {/* Rendimento / Observações */}
              <div>
                <Label htmlFor="notes" className="text-xs">
                  Rendimento / Observações
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Ex: Pacote 200 fls, calcular por cm², rende aprox. 50 bloquinhos..."
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </DialogBody>

            <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border flex items-center justify-end gap-2 bg-card">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {editingSupply ? 'Atualizar Insumo' : 'Cadastrar Insumo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir insumo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o insumo{' '}
              <strong>{supplyToDelete?.name}</strong>? Fichas técnicas que já usam este
              insumo manterão o valor registrado historicamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir Insumo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Carga de Presets */}
      <AlertDialog open={presetConfirmOpen} onOpenChange={setPresetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Carregar insumos padrão de papelaria?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá adicionar ao seu catálogo matérias-primas comuns (papéis glossy, pólen, offset, adesivos vinil, bótons 25mm, adaptadores, canecas, caixas de envio, fitas de cetim e cola de silicone).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingPresets}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLoadPresets} disabled={loadingPresets}>
              {loadingPresets ? 'Carregando...' : 'Sim, Carregar Insumos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
export default SuppliesTab;

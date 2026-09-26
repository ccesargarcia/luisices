import { useState, useMemo } from 'react';
import { PurchaseHistoryItem, SupplyItem, SupplyCategory, SupplyUnit } from '../../types';
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
} from 'lucide-react';
import { toast } from 'sonner';

interface PurchaseHistoryTabProps {
  historyItems: PurchaseHistoryItem[];
  supplies: SupplyItem[];
  loading: boolean;
  canCreate?: boolean;
  canDelete?: boolean;
  onRefresh?: () => void;
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
}: PurchaseHistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal para lançar nova compra
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [supplyId, setSupplyId] = useState<string>('new');
  const [supplyName, setSupplyName] = useState('');
  const [category, setCategory] = useState<SupplyCategory>('papeis');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [store, setStore] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [unit, setUnit] = useState<SupplyUnit>('folha');
  const [price, setPrice] = useState<number>(0);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Confirmação de Exclusão
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<PurchaseHistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    setDialogOpen(true);
  };

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
  const totalPurchasePrice = (price || 0) + (shippingCost || 0);
  const calculatedUnitCost = quantity > 0 ? totalPurchasePrice / quantity : 0;

  // Salvar registro de compra no histórico
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplyName.trim()) {
      toast.error('Informe o nome do insumo');
      return;
    }
    if (quantity <= 0) {
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
          purchasePrice: price,
          shippingCost: shippingCost,
          totalPrice: totalPurchasePrice,
          packageQuantity: quantity,
          unit,
          unitCost: calculatedUnitCost,
          supplier: store.trim() || undefined,
          lastPurchaseDate: date,
          notes: notes.trim() || undefined,
          currentStock: quantity,
        });
        targetSupplyId = created.id;
      }

      await firebasePricingService.addPurchaseRecord({
        supplyId: targetSupplyId,
        supplyName: supplyName.trim(),
        category,
        date,
        store: store.trim() || 'Não especificado',
        quantity,
        unit,
        price,
        shippingCost,
        totalPrice: totalPurchasePrice,
        unitCost: calculatedUnitCost,
        notes: notes.trim() || undefined,
      });

      toast.success('Compra lançada com sucesso no histórico!');
      setDialogOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar registro de compra');
    } finally {
      setSaving(false);
    }
  };

  // Excluir registro do histórico
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      setDeleting(true);
      await firebasePricingService.deletePurchaseRecord(itemToDelete.id);
      toast.success('Registro de compra excluído');
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
              <Button onClick={openAddDialog} className="gap-2 font-bold shadow-md">
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

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-56 text-xs">
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
            <div className="overflow-x-auto rounded-xl border border-border/80">
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
                    {canDelete && <th className="p-3 text-center">Ação</th>}
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
                        {canDelete && (
                          <td className="p-3 text-center whitespace-nowrap">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-muted-foreground hover:text-destructive"
                              title="Excluir do Histórico"
                              onClick={() => {
                                setItemToDelete(item);
                                setDeleteConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                    min="1"
                    step="any"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Valor Pago (R$) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Frete (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(Number(e.target.value))}
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

      {/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro de compra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o registro do histórico ({itemToDelete?.supplyName} de {itemToDelete?.date}).
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

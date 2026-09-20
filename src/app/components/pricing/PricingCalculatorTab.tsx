import { useState, useMemo, useEffect } from 'react';
import {
  ProductPricingRecipe,
  SupplyItem,
  Product,
  StudioPricingSettings,
  RecipeItem,
} from '../../types';
import {
  calculateRecipePricing,
  calculateHourlyRate,
  DEFAULT_PRICING_SETTINGS,
} from '../../utils/pricingCalculations';
import { firebasePricingService } from '../../../services/firebasePricingService';
import { formatCurrency } from '../../utils/currency';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Calculator,
  RefreshCw,
  ShoppingBag,
  Layers,
  ArrowRight,
  TrendingUp,
  Percent,
  Clock,
  Coins,
  Package,
  CheckCircle2,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface PricingCalculatorTabProps {
  recipes: ProductPricingRecipe[];
  supplies: SupplyItem[];
  products: Product[];
  studioSettings?: StudioPricingSettings | null;
  loading: boolean;
  onRefresh?: () => void;
  onProductSynced?: () => void;
}

export function PricingCalculatorTab({
  recipes,
  supplies,
  products,
  studioSettings,
  loading,
  onRefresh,
  onProductSynced,
}: PricingCalculatorTabProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog da Calculadora / Editor de Ficha
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncingProductId, setSyncingProductId] = useState<string | null>(null);

  // Form states da Ficha Técnica
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [items, setItems] = useState<RecipeItem[]>([]);
  const [wasteMarginPercent, setWasteMarginPercent] = useState<number>(
    studioSettings?.defaultWasteMarginPercent ?? DEFAULT_PRICING_SETTINGS.defaultWasteMarginPercent
  );
  const [laborMode, setLaborMode] = useState<'time' | 'proportional'>('time');
  const [productionTimeMinutes, setProductionTimeMinutes] = useState<number>(20);
  const [proportionalPercent, setProportionalPercent] = useState<number>(100);
  const [paymentFeePercent, setPaymentFeePercent] = useState<number>(
    studioSettings?.defaultPaymentFeePercent ?? DEFAULT_PRICING_SETTINGS.defaultPaymentFeePercent
  );
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(
    studioSettings?.defaultProfitMarginPercent ?? DEFAULT_PRICING_SETTINGS.defaultProfitMarginPercent
  );
  const [manualUnitPrice, setManualUnitPrice] = useState<number | null | undefined>(undefined);

  // Modal para adicionar insumo do catálogo
  const [addSupplyModalOpen, setAddSupplyModalOpen] = useState(false);
  const [selectedSupplyId, setSelectedSupplyId] = useState<string>('');
  const [supplyQtyUsed, setSupplyQtyUsed] = useState<number>(1);

  // Modal para item avulso
  const [addCustomModalOpen, setAddCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCost, setCustomCost] = useState<number>(0);
  const [customQty, setCustomQty] = useState<number>(1);

  // Diálogo de simulação de lotes
  const [batchModalRecipe, setBatchModalRecipe] = useState<ProductPricingRecipe | null>(null);

  // Diálogo de exclusão
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<ProductPricingRecipe | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Ao alterar o produto selecionado no dropdown, preencher nome e categoria
  const handleProductSelected = (prodId: string) => {
    setSelectedProductId(prodId);
    if (prodId === 'custom') {
      setProductName('');
      return;
    }
    const found = products.find((p) => p.id === prodId);
    if (found) {
      setProductName(found.name);
      setCategory(found.category || '');
      if (found.unitPrice > 0 && !editingRecipeId) {
        setManualUnitPrice(found.unitPrice);
      }
    }
  };

  const openNewRecipeDialog = (preselectProductId?: string) => {
    setEditingRecipeId(null);
    setItems([]);
    setWasteMarginPercent(studioSettings?.defaultWasteMarginPercent ?? DEFAULT_PRICING_SETTINGS.defaultWasteMarginPercent);
    setLaborMode('time');
    setProductionTimeMinutes(20);
    setProportionalPercent(100);
    setPaymentFeePercent(studioSettings?.defaultPaymentFeePercent ?? DEFAULT_PRICING_SETTINGS.defaultPaymentFeePercent);
    setProfitMarginPercent(studioSettings?.defaultProfitMarginPercent ?? DEFAULT_PRICING_SETTINGS.defaultProfitMarginPercent);
    setManualUnitPrice(undefined);

    if (preselectProductId) {
      handleProductSelected(preselectProductId);
    } else {
      setSelectedProductId('custom');
      setProductName('');
      setCategory('');
    }

    setEditorOpen(true);
  };

  const openEditRecipeDialog = (recipe: ProductPricingRecipe) => {
    setEditingRecipeId(recipe.id);
    setSelectedProductId(recipe.productId || 'custom');
    setProductName(recipe.productName);
    setCategory(recipe.category || '');
    setItems([...recipe.items]);
    setWasteMarginPercent(recipe.wasteMarginPercent);
    setLaborMode(recipe.laborMode);
    setProductionTimeMinutes(recipe.productionTimeMinutes || 20);
    setProportionalPercent(recipe.proportionalPercent || 100);
    setPaymentFeePercent(recipe.paymentFeePercent);
    setProfitMarginPercent(recipe.profitMarginPercent);
    setManualUnitPrice(recipe.manualUnitPrice);
    setEditorOpen(true);
  };

  // Live calculation results
  const calcResult = useMemo(() => {
    return calculateRecipePricing({
      items,
      wasteMarginPercent,
      laborMode,
      productionTimeMinutes,
      proportionalPercent,
      paymentFeePercent,
      profitMarginPercent,
      manualUnitPrice: manualUnitPrice ?? undefined,
      settings: studioSettings || undefined,
    });
  }, [
    items,
    wasteMarginPercent,
    laborMode,
    productionTimeMinutes,
    proportionalPercent,
    paymentFeePercent,
    profitMarginPercent,
    manualUnitPrice,
    studioSettings,
  ]);

  // Manipulação de itens da receita
  const handleAddSupplyToRecipe = () => {
    if (!selectedSupplyId) return;
    const supply = supplies.find((s) => s.id === selectedSupplyId);
    if (!supply) return;

    const newItem: RecipeItem = {
      supplyId: supply.id,
      name: supply.name,
      category: supply.category,
      unit: supply.unit,
      unitCost: supply.unitCost,
      quantityUsed: supplyQtyUsed,
      totalCost: supply.unitCost * supplyQtyUsed,
      isCustomItem: false,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedSupplyId('');
    setSupplyQtyUsed(1);
    setAddSupplyModalOpen(false);
  };

  const handleAddCustomToRecipe = () => {
    if (!customName.trim() || customCost <= 0) {
      toast.error('Informe a descrição e o valor do item.');
      return;
    }

    const newItem: RecipeItem = {
      name: customName.trim(),
      unit: 'unidade',
      unitCost: customCost,
      quantityUsed: customQty,
      totalCost: customCost * customQty,
      isCustomItem: true,
    };

    setItems((prev) => [...prev, newItem]);
    setCustomName('');
    setCustomCost(0);
    setCustomQty(1);
    setAddCustomModalOpen(false);
  };

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const it = copy[index];
      const validQty = Math.max(0, newQty);
      copy[index] = {
        ...it,
        quantityUsed: validQty,
        totalCost: it.unitCost * validQty,
      };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Salvar ficha técnica
  const handleSaveRecipe = async (andSyncToProduct = false) => {
    if (!productName.trim()) {
      toast.error('Informe o nome do produto.');
      return;
    }

    try {
      setSaving(true);
      const recipePayload = {
        productId: selectedProductId !== 'custom' ? selectedProductId : null,
        productName: productName.trim(),
        category: category.trim() || null,
        items,
        materialsCost: calcResult.materialsCost,
        wasteMarginPercent: calcResult.wasteMarginPercent,
        materialsCostWithWaste: calcResult.materialsCostWithWaste,
        laborMode: calcResult.laborMode,
        productionTimeMinutes: calcResult.productionTimeMinutes,
        hourlyRateApplied: calcResult.hourlyRateApplied,
        proportionalPercent: calcResult.proportionalPercent,
        laborCost: calcResult.laborCost,
        fixedCostsShare: calcResult.fixedCostsShare,
        totalUnitCost: calcResult.totalUnitCost,
        paymentFeePercent: calcResult.paymentFeePercent,
        profitMarginPercent: calcResult.profitMarginPercent,
        suggestedUnitPrice: calcResult.suggestedUnitPrice,
        manualUnitPrice: manualUnitPrice && manualUnitPrice > 0 ? manualUnitPrice : null,
        batchTiers: calcResult.batchTiers,
      };

      const savedRecipe = await firebasePricingService.saveRecipe(
        editingRecipeId ? { ...recipePayload, id: editingRecipeId } : recipePayload
      );

      // Se solicitado ou se houver produto vinculado, sincronizar preço
      if (andSyncToProduct && recipePayload.productId) {
        const finalPrice = recipePayload.manualUnitPrice ?? recipePayload.suggestedUnitPrice;
        await firebasePricingService.syncPriceToProduct(
          recipePayload.productId,
          finalPrice,
          recipePayload.totalUnitCost,
          recipePayload.profitMarginPercent,
          savedRecipe.id
        );
        toast.success(`Preço (${formatCurrency(finalPrice)}) sincronizado com o produto!`);
        if (onProductSynced) onProductSynced();
      } else {
        toast.success('Ficha técnica salva com sucesso!');
      }

      setEditorOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Erro ao salvar ficha técnica:', err);
      toast.error('Não foi possível salvar a ficha técnica.');
    } finally {
      setSaving(false);
    }
  };

  // Sincronizar diretamente do card da listagem
  const handleSyncFromCard = async (recipe: ProductPricingRecipe) => {
    if (!recipe.productId) {
      toast.error('Esta ficha técnica não está vinculada a nenhum produto do catálogo.');
      return;
    }
    try {
      setSyncingProductId(recipe.id);
      const finalPrice = recipe.manualUnitPrice ?? recipe.suggestedUnitPrice;
      await firebasePricingService.syncPriceToProduct(
        recipe.productId,
        finalPrice,
        recipe.totalUnitCost,
        recipe.profitMarginPercent,
        recipe.id
      );
      toast.success(`Preço de ${recipe.productName} atualizado para ${formatCurrency(finalPrice)}!`);
      if (onProductSynced) onProductSynced();
    } catch (err) {
      console.error('Erro ao sincronizar preço:', err);
      toast.error('Erro ao sincronizar com o produto.');
    } finally {
      setSyncingProductId(null);
    }
  };

  // Excluir ficha
  const handleDeleteRecipe = async () => {
    if (!recipeToDelete) return;
    try {
      setDeleting(true);
      await firebasePricingService.deleteRecipe(recipeToDelete.id);
      toast.success('Ficha técnica removida com sucesso!');
      setDeleteConfirmOpen(false);
      setRecipeToDelete(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao excluir ficha técnica:', err);
      toast.error('Falha ao excluir ficha técnica.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) =>
      r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.category && r.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [recipes, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Barra de Ações & Busca */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fichas técnicas por produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button onClick={() => openNewRecipeDialog()} className="gap-2 w-full sm:w-auto">
          <Plus className="size-4" />
          Nova Ficha Técnica
        </Button>
      </div>

      {/* Grid de Fichas Técnicas Salvas */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : filteredRecipes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Calculator className="size-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma ficha técnica cadastrada</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
              Crie fichas técnicas detalhadas para calcular o custo real de produção, margem líquida e preços sugeridos dos seus produtos.
            </p>
            <Button onClick={() => openNewRecipeDialog()} className="gap-2">
              <Plus className="size-4" />
              Criar Primeira Ficha Técnica
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map((recipe) => {
            const finalPrice = recipe.manualUnitPrice ?? recipe.suggestedUnitPrice;
            const hasProductLink = !!recipe.productId;

            return (
              <Card
                key={recipe.id}
                className="hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {recipe.category && (
                        <Badge variant="secondary" className="text-[10px]">
                          {recipe.category}
                        </Badge>
                      )}
                      {hasProductLink ? (
                        <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                          Catálogo Vinculado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Avulso
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditRecipeDialog(recipe)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setRecipeToDelete(recipe);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-base font-semibold leading-tight mt-1">
                    {recipe.productName}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  {/* Resumo de Custos e Preço */}
                  <div className="bg-muted/40 p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Custo de Produção:</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(recipe.totalUnitCost)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Preço Sugerido:</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(recipe.suggestedUnitPrice)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground">
                          Preço Praticado
                        </div>
                        <div className="text-xl font-black text-primary">
                          {formatCurrency(finalPrice)}
                        </div>
                      </div>
                      <Badge className="bg-emerald-600 text-white dark:bg-emerald-500">
                        {recipe.profitMarginPercent}% Margem
                      </Badge>
                    </div>
                  </div>

                  {/* Informações de Insumos e Mão de Obra */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{recipe.items.length} insumo(s)</span>
                    <span>
                      {recipe.laborMode === 'time'
                        ? `${recipe.productionTimeMinutes} min de produção`
                        : `Mão de obra proporcional`}
                    </span>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 gap-1.5"
                      onClick={() => setBatchModalRecipe(recipe)}
                    >
                      <Layers className="size-3.5" />
                      Simular Lotes
                    </Button>

                    {hasProductLink && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs h-8 gap-1.5"
                        disabled={syncingProductId === recipe.id}
                        onClick={() => handleSyncFromCard(recipe)}
                      >
                        {syncingProductId === recipe.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="size-3.5" />
                        )}
                        Atualizar Catálogo
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Principal: Calculadora e Ficha Técnica */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent size="3xl" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="size-5 text-primary" />
              {editingRecipeId ? 'Editar Ficha Técnica' : 'Nova Ficha Técnica & Precificação'}
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="p-4 sm:p-6 space-y-6">
            {/* Seção 1: Identificação do Produto */}
            <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
              <div className="text-xs font-bold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                <ShoppingBag className="size-3.5 text-primary" />
                1. Produto a Precificar
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="prod-select" className="text-xs">
                    Vincular a Produto do Catálogo
                  </Label>
                  <Select
                    value={selectedProductId}
                    onValueChange={handleProductSelected}
                  >
                    <SelectTrigger id="prod-select" className="mt-1">
                      <SelectValue placeholder="Selecione ou crie avulso..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">-- Digitar Nome Avulso --</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.unitPrice ? `(${formatCurrency(p.unitPrice)})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="prod-name" className="text-xs">
                    Nome do Produto *
                  </Label>
                  <Input
                    id="prod-name"
                    placeholder="Ex: Caixa Milk Luxo Safari"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Insumos Utilizados */}
            <div className="p-4 rounded-xl border space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                  <Layers className="size-3.5 text-primary" />
                  2. Matérias-Primas & Insumos Diretos
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={() => setAddSupplyModalOpen(true)}
                  >
                    <Plus className="size-3" />
                    Do Catálogo
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 gap-1 text-muted-foreground"
                    onClick={() => setAddCustomModalOpen(true)}
                  >
                    <Plus className="size-3" />
                    Item Avulso
                  </Button>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="p-6 border border-dashed rounded-lg text-center text-xs text-muted-foreground">
                  Nenhum insumo adicionado nesta ficha ainda. Clique em "Do Catálogo" para escolher papéis, fitas e colas.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden divide-y text-xs">
                  <div className="bg-muted/50 font-semibold p-2.5 grid grid-cols-12 gap-2 text-muted-foreground">
                    <span className="col-span-5">Insumo</span>
                    <span className="col-span-2 text-right">Custo Un.</span>
                    <span className="col-span-2 text-center">Qtd.</span>
                    <span className="col-span-2 text-right">Subtotal</span>
                    <span className="col-span-1"></span>
                  </div>

                  {items.map((item, idx) => (
                    <div key={idx} className="p-2.5 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5 font-medium truncate">
                        {item.name}
                        {item.isCustomItem && (
                          <span className="ml-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                            (avulso)
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 text-right text-muted-foreground">
                        {formatCurrency(item.unitCost)}/{item.unit}
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.1"
                          value={item.quantityUsed || ''}
                          onChange={(e) =>
                            handleUpdateItemQuantity(idx, parseFloat(e.target.value) || 0)
                          }
                          className="h-7 w-16 text-center text-xs p-1"
                        />
                      </div>
                      <div className="col-span-2 text-right font-semibold text-foreground">
                        {formatCurrency(item.totalCost)}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveItem(idx)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Subtotal e Margem de Perda de Papel */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-xs">
                <div className="flex items-center gap-2">
                  <Label htmlFor="waste-margin" className="text-xs text-muted-foreground">
                    Margem de Perda (Corte / Impressão):
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      id="waste-margin"
                      type="number"
                      min="0"
                      max="50"
                      value={wasteMarginPercent || ''}
                      onChange={(e) =>
                        setWasteMarginPercent(parseFloat(e.target.value) || 0)
                      }
                      className="h-7 w-14 text-center text-xs p-1"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-muted-foreground">Custo com Perda: </span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(calcResult.materialsCostWithWaste)}
                  </span>
                  <span className="text-[11px] text-muted-foreground ml-1">
                    ({formatCurrency(calcResult.materialsCost)} + {formatCurrency(calcResult.wasteAmount)})
                  </span>
                </div>
              </div>
            </div>

            {/* Seção 3: Mão de Obra Híbrida */}
            <div className="p-4 rounded-xl border space-y-3">
              <div className="text-xs font-bold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" />
                3. Mão de Obra do Ateliê
              </div>

              <Tabs
                value={laborMode}
                onValueChange={(val: any) => setLaborMode(val)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 w-full max-w-md">
                  <TabsTrigger value="time" className="text-xs gap-1.5">
                    <Clock className="size-3.5" />
                    Por Tempo (Minutos)
                  </TabsTrigger>
                  <TabsTrigger value="proportional" className="text-xs gap-1.5">
                    <Percent className="size-3.5" />
                    Proporcional aos Materiais
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="time" className="pt-3 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <Label htmlFor="prod-time" className="text-xs font-semibold">
                        Tempo de Produção por Unidade (Minutos)
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Arte, impressão, corte na plotter, vinco e montagem
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="prod-time"
                        type="number"
                        min="1"
                        step="1"
                        value={productionTimeMinutes || ''}
                        onChange={(e) =>
                          setProductionTimeMinutes(parseInt(e.target.value) || 0)
                        }
                        className="h-8 w-20 text-center font-bold"
                      />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-muted/40 text-xs flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Base ateliê: {formatCurrency(calcResult.minuteRateApplied)}/min ({formatCurrency(calcResult.hourlyRateApplied)}/h)
                    </span>
                    <span className="font-bold text-primary">
                      Mão de Obra: {formatCurrency(calcResult.laborCost)}
                    </span>
                  </div>
                </TabsContent>

                <TabsContent value="proportional" className="pt-3 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <Label htmlFor="prop-percent" className="text-xs font-semibold">
                        Porcentagem sobre os Materiais
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Ex: 100% dobra o valor gasto em materiais para cobrir a mão de obra
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="prop-percent"
                        type="number"
                        min="10"
                        step="10"
                        value={proportionalPercent || ''}
                        onChange={(e) =>
                          setProportionalPercent(parseFloat(e.target.value) || 0)
                        }
                        className="h-8 w-20 text-center font-bold"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-muted/40 text-xs flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Equivalência: cobre cerca de <strong>{calcResult.equivalentMinutesCovered} minutos</strong> de trabalho
                    </span>
                    <span className="font-bold text-primary">
                      Mão de Obra: {formatCurrency(calcResult.laborCost)}
                    </span>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Seção 4: Taxas e Margem de Lucro */}
            <div className="p-4 rounded-xl border space-y-3">
              <div className="text-xs font-bold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                <Coins className="size-3.5 text-primary" />
                4. Taxas de Venda & Margem de Lucro Líquida
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pay-fee" className="text-xs">
                      Taxa de Pagamento / Maquininha (%)
                    </Label>
                    <span className="text-xs font-semibold">{paymentFeePercent}%</span>
                  </div>
                  <Input
                    id="pay-fee"
                    type="number"
                    min="0"
                    max="30"
                    step="0.1"
                    value={paymentFeePercent || ''}
                    onChange={(e) => setPaymentFeePercent(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Descontado do preço final sem corroer seu lucro.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="profit-margin" className="text-xs">
                      Margem de Lucro Líquido Real (%)
                    </Label>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {profitMarginPercent}%
                    </span>
                  </div>
                  <Input
                    id="profit-margin"
                    type="number"
                    min="5"
                    max="300"
                    step="5"
                    value={profitMarginPercent || ''}
                    onChange={(e) => setProfitMarginPercent(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Lucro livre sobre o preço de venda sugerido.
                  </p>
                </div>
              </div>
            </div>

            {/* Seção 5: Painel de Resultados com Decomposição Visual */}
            <div className="p-5 rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  Resultado da Precificação Unitária
                </div>
                <div className="text-xs text-muted-foreground">
                  Markup: <strong>{calcResult.markupMultiplier.toFixed(2)}x</strong> sobre custo
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-[11px] text-muted-foreground">Custo de Produção</div>
                  <div className="text-lg font-bold text-foreground">
                    {formatCurrency(calcResult.totalUnitCost)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Insumos + Mão de obra
                  </div>
                </div>

                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-[11px] text-muted-foreground">Preço Sugerido</div>
                  <div className="text-lg font-black text-primary">
                    {formatCurrency(calcResult.suggestedUnitPrice)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Calculado pela margem real
                  </div>
                </div>

                <div className="p-3 bg-background rounded-lg border col-span-2 sm:col-span-1">
                  <div className="text-[11px] text-muted-foreground">Lucro Líquido Real</div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(calcResult.netProfitAmount)}
                  </div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300">
                    {calcResult.netProfitPercent}% do preço
                  </div>
                </div>
              </div>

              {/* Barra de Decomposição Visual */}
              <div className="space-y-1.5 pt-2">
                <div className="text-[11px] font-semibold text-muted-foreground flex justify-between">
                  <span>Composição do Preço de Venda</span>
                  <span>100%</span>
                </div>
                <div className="h-4 w-full rounded-full overflow-hidden flex bg-muted">
                  <div
                    style={{
                      width: `${Math.max(5, (calcResult.materialsCostWithWaste / (calcResult.suggestedUnitPrice || 1)) * 100)}%`,
                    }}
                    className="bg-blue-500 h-full"
                    title={`Materiais: ${formatCurrency(calcResult.materialsCostWithWaste)}`}
                  />
                  <div
                    style={{
                      width: `${Math.max(5, (calcResult.laborCost / (calcResult.suggestedUnitPrice || 1)) * 100)}%`,
                    }}
                    className="bg-purple-500 h-full"
                    title={`Mão de obra: ${formatCurrency(calcResult.laborCost)}`}
                  />
                  <div
                    style={{
                      width: `${Math.max(2, (calcResult.paymentFeeAmount / (calcResult.suggestedUnitPrice || 1)) * 100)}%`,
                    }}
                    className="bg-amber-500 h-full"
                    title={`Taxas: ${formatCurrency(calcResult.paymentFeeAmount)}`}
                  />
                  <div
                    style={{
                      width: `${Math.max(5, (calcResult.netProfitAmount / (calcResult.suggestedUnitPrice || 1)) * 100)}%`,
                    }}
                    className="bg-emerald-500 h-full"
                    title={`Lucro: ${formatCurrency(calcResult.netProfitAmount)}`}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-blue-500" /> Insumos
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-purple-500" /> Mão de obra
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-amber-500" /> Taxas ({calcResult.paymentFeePercent}%)
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="size-2 rounded-full bg-emerald-500" /> Lucro Líquido
                  </span>
                </div>
              </div>

              {/* Ajuste de Preço Manual / Arredondamento */}
              <div className="pt-2 border-t border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <Label htmlFor="manual-price" className="text-xs font-semibold">
                    Preço de Venda Praticado (Opcional)
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Caso queira arredondar comercialmente (ex: de R$ 12,38 para R$ 12,50).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">R$</span>
                  <Input
                    id="manual-price"
                    type="number"
                    step="0.10"
                    placeholder={calcResult.suggestedUnitPrice.toFixed(2)}
                    value={manualUnitPrice ?? ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setManualUnitPrice(isNaN(val) ? undefined : val);
                    }}
                    className="w-28 h-8 font-bold"
                  />
                </div>
              </div>
            </div>
          </DialogBody>

          <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-end gap-2 bg-card">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditorOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSaveRecipe(false)}
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Salvar Ficha Técnica
            </Button>
            {selectedProductId !== 'custom' && (
              <Button
                type="button"
                onClick={() => handleSaveRecipe(true)}
                disabled={saving}
                className="gap-1.5 bg-primary text-primary-foreground"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                Salvar & Atualizar Catálogo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar Insumo do Catálogo à Ficha */}
      <Dialog open={addSupplyModalOpen} onOpenChange={setAddSupplyModalOpen}>
        <DialogContent size="md" className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Insumo do Catálogo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Selecione o Insumo</Label>
              <Select
                value={selectedSupplyId}
                onValueChange={setSelectedSupplyId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Escolha um insumo..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {supplies.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {formatCurrency(s.unitCost)}/{s.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSupplyId && (
              <div>
                <Label className="text-xs">
                  Quantidade Utilizada por Produto ({supplies.find((s) => s.id === selectedSupplyId)?.unit})
                </Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.1"
                  value={supplyQtyUsed}
                  onChange={(e) => setSupplyQtyUsed(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            )}
          </DialogBody>
          <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border flex items-center justify-end gap-2 bg-card">
            <Button
              variant="outline"
              onClick={() => setAddSupplyModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddSupplyToRecipe}
              disabled={!selectedSupplyId || supplyQtyUsed <= 0}
            >
              Adicionar à Ficha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar Item Avulso */}
      <Dialog open={addCustomModalOpen} onOpenChange={setAddCustomModalOpen}>
        <DialogContent size="md" className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Custo / Insumo Avulso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Descrição do Item *</Label>
              <Input
                placeholder="Ex: Aplique acrílico espelhado ou Caixa especial"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Custo Unitário (R$) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="2.50"
                  value={customCost || ''}
                  onChange={(e) => setCustomCost(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Quantidade Usada</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={customQty}
                  onChange={(e) => setCustomQty(parseFloat(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddCustomModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddCustomToRecipe}>
              Adicionar à Ficha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Simulação de Lotes e Kits */}
      <Dialog
        open={!!batchModalRecipe}
        onOpenChange={(open) => {
          if (!open) setBatchModalRecipe(null);
        }}
      >
        <DialogContent size="2xl" className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              Simulador de Lotes & Kits: {batchModalRecipe?.productName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Na papelaria personalizada, produzir encomendas em lote (10, 20, 50 unidades) gera economia de tempo com cortes múltiplos na plotter e montagem em escala.
            </p>

            <div className="border rounded-lg overflow-hidden divide-y text-xs">
              <div className="bg-muted/50 font-semibold p-2.5 grid grid-cols-12 gap-2 text-muted-foreground">
                <span className="col-span-2">Quantidade</span>
                <span className="col-span-2 text-right">Custo Un.</span>
                <span className="col-span-2 text-right">Preço Un.</span>
                <span className="col-span-3 text-right">Total Pedido</span>
                <span className="col-span-3 text-right">Lucro Total</span>
              </div>

              {batchModalRecipe?.batchTiers?.map((tier) => (
                <div
                  key={tier.quantity}
                  className="p-2.5 grid grid-cols-12 gap-2 items-center hover:bg-muted/20"
                >
                  <div className="col-span-2 font-bold flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-primary" />
                    {tier.quantity} un.
                  </div>
                  <div className="col-span-2 text-right text-muted-foreground">
                    {formatCurrency(tier.unitCost)}
                  </div>
                  <div className="col-span-2 text-right font-medium text-foreground">
                    {formatCurrency(tier.unitPrice)}
                  </div>
                  <div className="col-span-3 text-right font-bold text-primary">
                    {formatCurrency(tier.totalPrice)}
                  </div>
                  <div className="col-span-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(tier.totalProfit)}
                  </div>
                </div>
              ))}
            </div>
          </DialogBody>

          <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border flex items-center justify-end bg-card">
            <Button onClick={() => setBatchModalRecipe(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão de Ficha */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Ficha Técnica?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a ficha técnica do produto{' '}
              <strong>{recipeToDelete?.productName}</strong>? O produto no catálogo continuará existindo, apenas o detalhamento da ficha técnica será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecipe}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir Ficha'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

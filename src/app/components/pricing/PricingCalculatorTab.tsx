import { useState, useMemo, useEffect } from 'react';
import {
  ProductPricingRecipe,
  SupplyItem,
  Product,
  StudioPricingSettings,
  RecipeItem,
  KitComponentItem,
  ProductionTrackingRecord,
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
  TrendingDown,
  Percent,
  Clock,
  Coins,
  Package,
  CheckCircle2,
  Loader2,
  HelpCircle,
  AlertTriangle,
  Boxes,
  ClipboardList,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

interface PricingCalculatorTabProps {
  recipes: ProductPricingRecipe[];
  supplies: SupplyItem[];
  products: Product[];
  studioSettings?: StudioPricingSettings | null;
  loading: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onRefresh?: () => void;
  onProductSynced?: () => void;
  openAddRecipeTrigger?: number;
}

export function PricingCalculatorTab({
  recipes,
  supplies,
  products,
  studioSettings,
  loading,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  onRefresh,
  onProductSynced,
  openAddRecipeTrigger,
}: PricingCalculatorTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubView, setActiveSubView] = useState<'recipes' | 'kits' | 'tracking'>('recipes');

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
  const [setupTimeMinutes, setSetupTimeMinutes] = useState<number>(0);
  const [proportionalPercent, setProportionalPercent] = useState<number>(100);
  const [pricingMethod, setPricingMethod] = useState<'margin_on_sale' | 'markup_on_cost'>('margin_on_sale');
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
  const [supplyFilterText, setSupplyFilterText] = useState('');
  const [supplyQtyUsed, setSupplyQtyUsed] = useState<number>(1);
  const [piecesPerSheet, setPiecesPerSheet] = useState<number>(0);
  const [useSheetRounding, setUseSheetRounding] = useState<boolean>(false);

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

  // Modal de Kits
  const [kitModalOpen, setKitModalOpen] = useState(false);
  const [kitName, setKitName] = useState('');
  const [kitComponents, setKitComponents] = useState<KitComponentItem[]>([]);
  const [kitExtraSetupMinutes, setKitExtraSetupMinutes] = useState<number>(15);
  const [kitProfitMarginPercent, setKitProfitMarginPercent] = useState<number>(
    studioSettings?.defaultProfitMarginPercent ?? DEFAULT_PRICING_SETTINGS.defaultProfitMarginPercent
  );

  // Acompanhamento Previsto vs Realizado
  const [trackingRecords, setTrackingRecords] = useState<ProductionTrackingRecord[]>([]);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingProductName, setTrackingProductName] = useState('');
  const [trackingRecipeId, setTrackingRecipeId] = useState<string>('');
  const [trackingOrderNumber, setTrackingOrderNumber] = useState('');
  const [trackingPlannedQty, setTrackingPlannedQty] = useState<number>(1);
  const [trackingPlannedMinutes, setTrackingPlannedMinutes] = useState<number>(0);
  const [trackingActualMinutes, setTrackingActualMinutes] = useState<number>(0);
  const [trackingPlannedCost, setTrackingPlannedCost] = useState<number>(0);
  const [trackingActualCost, setTrackingActualCost] = useState<number>(0);
  const [trackingSalePrice, setTrackingSalePrice] = useState<number>(0);
  const [trackingNotes, setTrackingNotes] = useState('');

  // Carregar histórico de acompanhamento
  useEffect(() => {
    const unsub = firebasePricingService.subscribeToProductionTracking(setTrackingRecords);
    return () => unsub();
  }, []);

  // Verificar se há insumos desatualizados em uma ficha
  const getOutdatedItems = (recipeItems: RecipeItem[]) => {
    return recipeItems.filter((item) => {
      if (!item.supplyId) return false;
      const currentSupply = supplies.find((s) => s.id === item.supplyId);
      if (!currentSupply) return false;
      return Math.abs(currentSupply.unitCost - item.unitCost) > 0.0001;
    });
  };

  const isRecipeOutdated = (recipe: ProductPricingRecipe) => {
    return getOutdatedItems(recipe.items).length > 0;
  };

  // Atualizar todos os itens da ficha aberta para os custos vigentes
  const handleUpdateItemsToCurrentSupplyCosts = () => {
    let updatedCount = 0;
    setItems((prev) =>
      prev.map((it) => {
        if (!it.supplyId) return it;
        const current = supplies.find((s) => s.id === it.supplyId);
        if (current && Math.abs(current.unitCost - it.unitCost) > 0.0001) {
          updatedCount++;
          return {
            ...it,
            originalUnitCost: it.unitCost,
            unitCost: current.unitCost,
            totalCost: current.unitCost * it.quantityUsed,
          };
        }
        return it;
      })
    );
    if (updatedCount > 0) {
      toast.success(`${updatedCount} insumo(s) atualizados para os custos vigentes do estoque!`);
    } else {
      toast.info('Todos os insumos já estão sincronizados com o estoque.');
    }
  };

  // Ao alterar o produto selecionado no dropdown
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
    setSetupTimeMinutes(0);
    setProportionalPercent(100);
    setPricingMethod('margin_on_sale');
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

  useEffect(() => {
    if (openAddRecipeTrigger && openAddRecipeTrigger > 0) {
      openNewRecipeDialog();
    }
  }, [openAddRecipeTrigger]);

  const openEditRecipeDialog = (recipe: ProductPricingRecipe) => {
    setEditingRecipeId(recipe.id);
    setSelectedProductId(recipe.productId || 'custom');
    setProductName(recipe.productName);
    setCategory(recipe.category || '');
    setItems([...recipe.items]);
    setWasteMarginPercent(recipe.wasteMarginPercent);
    setLaborMode(recipe.laborMode);
    setProductionTimeMinutes(recipe.productionTimeMinutes || 20);
    setSetupTimeMinutes(recipe.setupTimeMinutes || 0);
    setProportionalPercent(recipe.proportionalPercent || 100);
    setPricingMethod(recipe.pricingMethod || 'margin_on_sale');
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
      setupTimeMinutes,
      proportionalPercent,
      pricingMethod,
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
    setupTimeMinutes,
    proportionalPercent,
    pricingMethod,
    paymentFeePercent,
    profitMarginPercent,
    manualUnitPrice,
    studioSettings,
  ]);

  const outdatedItemsInEditor = useMemo(() => {
    return getOutdatedItems(items);
  }, [items, supplies]);

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
      originalUnitCost: supply.unitCost,
      quantityUsed: supplyQtyUsed,
      totalCost: supply.unitCost * supplyQtyUsed,
      piecesPerSheet: piecesPerSheet > 0 ? piecesPerSheet : undefined,
      useSheetRounding: Boolean(useSheetRounding && piecesPerSheet > 0),
      isCustomItem: false,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedSupplyId('');
    setSupplyQtyUsed(1);
    setPiecesPerSheet(0);
    setUseSheetRounding(false);
    setAddSupplyModalOpen(false);
  };

  const handleAddCustomToRecipe = () => {
    const numCost = typeof customCost === 'number' ? customCost : parseFloat(String(customCost)) || 0;
    const numQty = typeof customQty === 'number' ? customQty : parseFloat(String(customQty)) || 1;

    if (!customName.trim() || numCost <= 0) {
      toast.error('Informe a descrição e o valor do item.');
      return;
    }

    const newItem: RecipeItem = {
      name: customName.trim(),
      unit: 'unidade',
      unitCost: numCost,
      quantityUsed: numQty,
      totalCost: numCost * numQty,
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
        setupTimeMinutes: calcResult.setupTimeMinutes,
        hourlyRateApplied: calcResult.hourlyRateApplied,
        proportionalPercent: calcResult.proportionalPercent,
        laborCost: calcResult.laborCost,
        fixedCostsShare: calcResult.fixedCostsShare,
        totalUnitCost: calcResult.totalUnitCost,
        paymentFeePercent: calcResult.paymentFeePercent,
        profitMarginPercent: calcResult.profitMarginPercent,
        pricingMethod: calcResult.pricingMethod,
        breakevenPrice: calcResult.breakevenPrice,
        suggestedUnitPrice: calcResult.suggestedUnitPrice,
        manualUnitPrice: manualUnitPrice && manualUnitPrice > 0 ? manualUnitPrice : null,
        batchTiers: calcResult.batchTiers,
      };

      const savedRecipe = await firebasePricingService.saveRecipe(
        editingRecipeId ? { ...recipePayload, id: editingRecipeId } : recipePayload
      );

      if (andSyncToProduct && recipePayload.productId) {
        try {
          const finalPrice = recipePayload.manualUnitPrice ?? recipePayload.suggestedUnitPrice;
          await firebasePricingService.syncPriceToProduct(
            recipePayload.productId,
            finalPrice,
            recipePayload.totalUnitCost,
            recipePayload.profitMarginPercent,
            savedRecipe.id
          );
          toast.success(`Ficha técnica salva e preço (${formatCurrency(finalPrice)}) sincronizado!`);
          if (onProductSynced) onProductSynced();
        } catch (syncErr: any) {
          console.error('Erro ao sincronizar preço:', syncErr);
          toast.warning(
            `Ficha salva, mas não foi possível sincronizar o preço com o produto: ${syncErr?.message || 'Produto não encontrado'}`
          );
        }
      } else {
        toast.success('Ficha técnica salva com sucesso!');
      }

      setEditorOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Erro ao salvar ficha técnica:', err);
      toast.error(err?.message || 'Não foi possível salvar a ficha técnica.');
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
    } catch (err: any) {
      console.error('Erro ao sincronizar preço:', err);
      toast.error(err?.message || 'Erro ao sincronizar com o produto.');
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

  // Salvar registro de Previsto vs Realizado
  const handleSaveTrackingRecord = async () => {
    if (!trackingProductName.trim()) {
      toast.error('Informe o produto do acompanhamento.');
      return;
    }
    try {
      await firebasePricingService.addProductionTrackingRecord({
        recipeId: trackingRecipeId || null,
        productName: trackingProductName.trim(),
        orderNumber: trackingOrderNumber.trim() || null,
        date: new Date().toISOString().slice(0, 10),
        plannedQuantity: trackingPlannedQty || 1,
        plannedMinutes: trackingPlannedMinutes || 0,
        actualMinutes: trackingActualMinutes || 0,
        plannedMaterialsCost: trackingPlannedCost || 0,
        actualMaterialsCost: trackingActualCost || 0,
        salePrice: trackingSalePrice || 0,
        notes: trackingNotes.trim() || null,
      });
      toast.success('Acompanhamento registrado com sucesso!');
      setTrackingModalOpen(false);
      setTrackingProductName('');
      setTrackingOrderNumber('');
      setTrackingNotes('');
    } catch (err) {
      console.error('Erro ao salvar acompanhamento:', err);
      toast.error('Não foi possível salvar o registro.');
    }
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) =>
      r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.category && r.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [recipes, searchTerm]);

  const rates = calculateHourlyRate(studioSettings || undefined);

  return (
    <div className="space-y-6">
      {/* Sub-navegação interna: Fichas Individuais | Kits & Combos | Previsto vs Realizado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <Button
            variant={activeSubView === 'recipes' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSubView('recipes')}
            className="text-xs gap-1.5"
          >
            <Calculator className="size-3.5" />
            Fichas Técnicas ({recipes.length})
          </Button>

          <Button
            variant={activeSubView === 'tracking' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSubView('tracking')}
            className="text-xs gap-1.5"
          >
            <ClipboardList className="size-3.5" />
            Previsto vs Realizado ({trackingRecords.length})
          </Button>
        </div>

        {canCreate && activeSubView === 'recipes' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => openNewRecipeDialog()}
              className="gap-2 w-full sm:w-auto rounded-xl font-semibold min-h-[40px] px-4 shadow-md hover:bg-primary/90 active:scale-95 transition-all"
            >
              <Plus className="size-4" />
              Nova Ficha Técnica
            </Button>
          </div>
        )}

        {canCreate && activeSubView === 'tracking' && (
          <Button
            onClick={() => {
              setTrackingModalOpen(true);
            }}
            className="gap-2 w-full sm:w-auto"
          >
            <Plus className="size-4" />
            Registrar Produção Real
          </Button>
        )}
      </div>

      {activeSubView === 'recipes' && (
        <>
          {/* Barra de Busca */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fichas técnicas por produto ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
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
                  Crie fichas técnicas detalhadas para calcular o custo real de produção, margem líquida, frete de insumos e preços sugeridos dos seus produtos.
                </p>
                {canCreate && (
                  <Button onClick={() => openNewRecipeDialog()} className="gap-2">
                    <Plus className="size-4" />
                    Criar Primeira Ficha Técnica
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecipes.map((recipe) => {
                const finalPrice = recipe.manualUnitPrice ?? recipe.suggestedUnitPrice;
                const hasProductLink = !!recipe.productId;
                const isOutdated = isRecipeOutdated(recipe);

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
                          {isOutdated && (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-amber-600 border-amber-500/40 bg-amber-500/10 gap-1 flex items-center"
                              title="Os custos de um ou mais insumos desta ficha mudaram no estoque."
                            >
                              <AlertTriangle className="size-2.5" />
                              Custos Desatualizados
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              onClick={() => openEditRecipeDialog(recipe)}
                              title="Editar Ficha Técnica"
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
                                setRecipeToDelete(recipe);
                                setDeleteConfirmOpen(true);
                              }}
                              title="Excluir Ficha Técnica"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
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
                          <span className="text-muted-foreground">Custo de Produção (CPV):</span>
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
                            ? `${(recipe.setupTimeMinutes || 0) + (recipe.productionTimeMinutes || 0)} min total`
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

                        {hasProductLink && canEdit && (
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
        </>
      )}

      {/* Visão de Acompanhamento (Previsto vs Realizado) */}
      {activeSubView === 'tracking' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border bg-muted/20">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <ClipboardList className="size-4 text-primary" />
              Comparativo de Eficiência: Previsto vs. Realizado
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Registre o tempo real e materiais gastos em cada encomenda entregue para descobrir desvios e reajustar orçamentos futuros.
            </p>
          </div>

          {trackingRecords.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <Clock className="size-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">Nenhum registro de produção ainda</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
                  Depois de concluir uma encomenda, registre os minutos reais gastos para verificar se o tempo orçado cobriu o trabalho.
                </p>
                <Button onClick={() => setTrackingModalOpen(true)} className="gap-2">
                  <Plus className="size-4" />
                  Registrar Produção Real
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-xl overflow-hidden divide-y text-xs bg-card shadow-xs">
              {/* Mobile Card List (< sm) */}
              <div className="block sm:hidden divide-y divide-border">
                {trackingRecords.map((rec) => {
                  const diffMin = rec.actualMinutes - rec.plannedMinutes;
                  const isOvertime = diffMin > 0;

                  return (
                    <div key={rec.id} className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-foreground">{rec.productName}</div>
                          {rec.orderNumber && (
                            <div className="text-[11px] text-muted-foreground">Pedido #{rec.orderNumber} • {rec.plannedQuantity} un.</div>
                          )}
                          <div className="text-[10px] text-muted-foreground">{rec.date}</div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            try {
                              await firebasePricingService.deleteProductionTrackingRecord(rec.id);
                              toast.success('Registro removido.');
                            } catch (err) {
                              toast.error('Erro ao remover.');
                            }
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-muted/30 p-2 rounded-lg text-center">
                        <div>
                          <div className="text-[10px] text-muted-foreground">Previsto</div>
                          <div className="font-semibold">{rec.plannedMinutes} min</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">Real</div>
                          <div className="font-bold">{rec.actualMinutes} min</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">Variação</div>
                          <Badge
                            variant={isOvertime ? 'destructive' : 'secondary'}
                            className={`text-[10px] px-1 py-0 ${!isOvertime ? 'bg-emerald-600/10 text-emerald-600' : ''}`}
                          >
                            {isOvertime ? `+${diffMin}m` : `${diffMin}m`}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop 12-col Grid (>= sm) */}
              <div className="hidden sm:block divide-y">
                <div className="bg-muted/50 font-semibold p-3 grid grid-cols-12 gap-2 text-muted-foreground">
                  <span className="col-span-3">Produto / Pedido</span>
                  <span className="col-span-2 text-center">Data</span>
                  <span className="col-span-2 text-center">Tempo Previsto</span>
                  <span className="col-span-2 text-center">Tempo Real</span>
                  <span className="col-span-2 text-center">Variação</span>
                  <span className="col-span-1"></span>
                </div>

                {trackingRecords.map((rec) => {
                  const diffMin = rec.actualMinutes - rec.plannedMinutes;
                  const isOvertime = diffMin > 0;

                  return (
                    <div key={rec.id} className="p-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/10">
                      <div className="col-span-3">
                        <div className="font-semibold">{rec.productName}</div>
                        {rec.orderNumber && (
                          <div className="text-[10px] text-muted-foreground">Pedido #{rec.orderNumber} • {rec.plannedQuantity} un.</div>
                        )}
                      </div>
                      <div className="col-span-2 text-center text-muted-foreground">{rec.date}</div>
                      <div className="col-span-2 text-center font-medium">{rec.plannedMinutes} min</div>
                      <div className="col-span-2 text-center font-bold">{rec.actualMinutes} min</div>
                      <div className="col-span-2 text-center">
                        <Badge
                          variant={isOvertime ? 'destructive' : 'secondary'}
                          className={`text-[10px] ${!isOvertime ? 'bg-emerald-600/10 text-emerald-600' : ''}`}
                        >
                          {isOvertime ? `+${diffMin} min (Excesso)` : `${diffMin} min (Dentro)`}
                        </Badge>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            try {
                              await firebasePricingService.deleteProductionTrackingRecord(rec.id);
                              toast.success('Registro removido.');
                            } catch (err) {
                              toast.error('Erro ao remover.');
                            }
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
            {/* Alerta de Insumos com Custos Desatualizados */}
            {outdatedItemsInEditor.length > 0 && (
              <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>{outdatedItemsInEditor.length} insumo(s)</strong> nesta ficha têm custos diferentes no cadastro atual de matérias-primas.
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1 border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
                  onClick={handleUpdateItemsToCurrentSupplyCosts}
                >
                  <RefreshCw className="size-3" />
                  Atualizar para Custos Atuais
                </Button>
              </div>
            )}

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

            {/* Seção 2: Insumos Utilizados com Rendimento de Folha */}
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
                    className="text-xs h-9 px-3 rounded-xl gap-1.5 font-medium border-border/80 hover:bg-muted active:scale-95 transition-all"
                    onClick={() => setAddSupplyModalOpen(true)}
                  >
                    <Plus className="size-3.5 text-primary" />
                    Do Catálogo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-9 px-3 rounded-xl gap-1.5 font-medium text-muted-foreground hover:text-foreground border-border/80 hover:bg-muted active:scale-95 transition-all"
                    onClick={() => setAddCustomModalOpen(true)}
                  >
                    <Plus className="size-3.5" />
                    Item Avulso
                  </Button>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="p-6 border border-dashed rounded-xl text-center space-y-3 bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    Nenhum insumo adicionado nesta ficha ainda. Escolha insumos do catálogo ou adicione um item avulso.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setAddSupplyModalOpen(true)}
                      className="text-xs h-9 px-3.5 rounded-xl gap-1.5 font-semibold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-95 transition-all"
                    >
                      <Plus className="size-3.5" />
                      Adicionar Insumo do Catálogo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAddCustomModalOpen(true)}
                      className="text-xs h-9 px-3.5 rounded-xl gap-1.5 font-semibold active:scale-95 transition-all"
                    >
                      <Plus className="size-3.5" />
                      Adicionar Item Avulso
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden divide-y text-xs">
                  <div className="bg-muted/50 font-semibold p-2.5 grid grid-cols-12 gap-2 text-muted-foreground">
                    <span className="col-span-5">Insumo / Rendimento</span>
                    <span className="col-span-2 text-right">Custo Un.</span>
                    <span className="col-span-2 text-center">Qtd.</span>
                    <span className="col-span-2 text-right">Subtotal</span>
                    <span className="col-span-1"></span>
                  </div>

                  {items.map((item, idx) => (
                    <div key={idx} className="p-2.5 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5 truncate">
                        <div className="font-medium truncate">{item.name}</div>
                        {item.piecesPerSheet && item.piecesPerSheet > 0 ? (
                          <div className="text-[10px] text-primary flex items-center gap-1">
                            <span>{item.piecesPerSheet} un/folha</span>
                            {item.useSheetRounding && <span>• 1 folha inteira</span>}
                          </div>
                        ) : null}
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

            {/* Seção 3: Mão de Obra do Ateliê com Separação Setup vs Peça */}
            <div className="p-4 rounded-xl border space-y-3">
              <div className="text-xs font-bold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" />
                3. Mão de Obra & Tempo de Trabalho
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

                <TabsContent value="time" className="pt-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/20 rounded-lg border">
                      <Label htmlFor="setup-time" className="text-xs font-semibold">
                        Setup & Arte por Encomenda (Minutos)
                      </Label>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        Criação da arte, fechamento de arquivo e configuração da plotter (diluído em lotes).
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          id="setup-time"
                          type="number"
                          min="0"
                          step="5"
                          value={setupTimeMinutes || ''}
                          onChange={(e) =>
                            setSetupTimeMinutes(parseInt(e.target.value) || 0)
                          }
                          className="h-8 w-20 text-center font-bold"
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>
                    </div>

                    <div className="p-3 bg-muted/20 rounded-lg border">
                      <Label htmlFor="prod-time" className="text-xs font-semibold">
                        Montagem por Unidade (Minutos)
                      </Label>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        Tempo de vinco, colagem, laços e acabamento de cada peça individual.
                      </p>
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
                  </div>

                  <div className="p-2.5 rounded-lg bg-muted/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-muted-foreground">
                      Base ateliê: {formatCurrency(calcResult.minuteRateApplied)}/min ({formatCurrency(calcResult.hourlyRateApplied)}/h) • Total para 1 peça: {calcResult.totalLaborMinutes} min
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

            {/* Seção 4: Método de Precificação & Margens */}
            <div className="p-4 rounded-xl border space-y-3">
              <div className="text-xs font-bold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                <Coins className="size-3.5 text-primary" />
                4. Método de Formação de Preço & Taxas
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Fórmula de Cálculo</Label>
                  <Select
                    value={pricingMethod}
                    onValueChange={(val: any) => setPricingMethod(val)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="margin_on_sale">Margem sobre Venda (Divisor)</SelectItem>
                      <SelectItem value="markup_on_cost">Markup sobre Custo (Multiplicador)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {pricingMethod === 'margin_on_sale'
                      ? 'Preço = Custo ÷ (1 - %Taxa - %Margem)'
                      : 'Preço = (Custo × (1 + %Markup)) ÷ (1 - %Taxa)'}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pay-fee" className="text-xs">
                      Taxa Cartão / Maquininha (%)
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
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Embutida no preço sem corroer seu lucro.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="profit-margin" className="text-xs">
                      {pricingMethod === 'margin_on_sale' ? 'Margem de Lucro (% Venda)' : 'Markup sobre Custo (%)'}
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
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Lucro desejado sobre o produto.
                  </p>
                </div>
              </div>
            </div>

            {/* Seção 5: Painel de Decisão Financeira (Resultados e Prejuízo) */}
            <div className={`p-5 rounded-xl border-2 space-y-4 ${
              calcResult.netProfitAmount < 0
                ? 'border-red-500 bg-red-500/10'
                : 'border-primary/40 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent'
            }`}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold flex items-center gap-2">
                  {calcResult.netProfitAmount < 0 ? (
                    <TrendingDown className="size-4 text-red-600 dark:text-red-400" />
                  ) : (
                    <TrendingUp className="size-4 text-primary" />
                  )}
                  Painel de Decisão de Preço
                </div>
                <div className="text-xs text-muted-foreground">
                  Markup: <strong>{calcResult.markupMultiplier.toFixed(2)}x</strong> sobre custo
                </div>
              </div>

              {calcResult.netProfitAmount < 0 && (
                <div className="p-3 rounded-lg bg-red-600/20 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-red-600" />
                  <span>
                    <strong>ALERTA DE PREJUÍZO:</strong> O preço praticado ({formatCurrency(calcResult.effectivePrice)}) não cobre o custo de produção e as taxas. Cada venda gera {formatCurrency(Math.abs(calcResult.netProfitAmount))} de perda!
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-[11px] text-muted-foreground">Custo de Produção (CPV)</div>
                  <div className="text-base font-bold text-foreground">
                    {formatCurrency(calcResult.totalUnitCost)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Materiais + Mão de obra
                  </div>
                </div>

                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-[11px] text-muted-foreground">Ponto de Equilíbrio</div>
                  <div className="text-base font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(calcResult.breakevenPrice)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Custo + Taxa (Lucro = 0)
                  </div>
                </div>

                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-[11px] text-muted-foreground">Preço Sugerido</div>
                  <div className="text-base font-black text-primary">
                    {formatCurrency(calcResult.suggestedUnitPrice)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Com margem de {calcResult.profitMarginPercent}%
                  </div>
                </div>

                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-[11px] text-muted-foreground">Lucro Estimado</div>
                  <div className={`text-base font-black ${
                    calcResult.netProfitAmount < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {formatCurrency(calcResult.netProfitAmount)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {calcResult.netProfitPercent.toFixed(1)}% do preço final
                  </div>
                </div>
              </div>

              {/* Indicador de Desconto Seguro */}
              <div className="p-2.5 rounded-lg bg-muted/40 text-xs flex items-center justify-between">
                <span className="text-muted-foreground">
                  Desconto máximo seguro antes de operar no prejuízo:
                </span>
                <Badge variant="outline" className="font-bold text-primary border-primary/30">
                  Até {calcResult.maxDiscountPercent.toFixed(1)}% de desconto
                </Badge>
              </div>

              {/* Ajuste de Preço Manual / Arredondamento */}
              <div className="pt-2 border-t border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <Label htmlFor="manual-price" className="text-xs font-semibold">
                    Preço de Venda Praticado (Opcional)
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Preencha caso queira fixar um preço promocional ou arredondado no catálogo.
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

      {/* Modal: Adicionar Insumo do Catálogo à Ficha com Rendimento */}
      <Dialog open={addSupplyModalOpen} onOpenChange={setAddSupplyModalOpen}>
        <DialogContent size="md" className="max-h-[90dvh] flex flex-col overflow-hidden" noPadding>
          <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
            <DialogTitle>Adicionar Insumo do Catálogo</DialogTitle>
          </DialogHeader>
          <DialogBody className="p-4 sm:p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Selecione o Insumo</Label>
                {supplies.length > 5 && (
                  <span className="text-[10px] text-muted-foreground">
                    {supplies.filter((s) => !supplyFilterText || s.name.toLowerCase().includes(supplyFilterText.toLowerCase())).length} disponíveis
                  </span>
                )}
              </div>
              {supplies.length > 5 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar insumos pelo nome..."
                    value={supplyFilterText}
                    onChange={(e) => setSupplyFilterText(e.target.value)}
                    className="h-8 pl-8 text-xs mb-1.5"
                  />
                </div>
              )}
              <Select
                value={selectedSupplyId}
                onValueChange={setSelectedSupplyId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Escolha um insumo..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {supplies
                    .filter(
                      (s) =>
                        !supplyFilterText ||
                        s.name.toLowerCase().includes(supplyFilterText.toLowerCase())
                    )
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {formatCurrency(s.unitCost)}/{s.unit}
                      </SelectItem>
                    ))}
                  {supplies.filter(
                    (s) =>
                      !supplyFilterText ||
                      s.name.toLowerCase().includes(supplyFilterText.toLowerCase())
                  ).length === 0 && (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      Nenhum insumo encontrado
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedSupplyId && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">
                    Quantidade Utilizada por Peça ({supplies.find((s) => s.id === selectedSupplyId)?.unit})
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

                <div className="p-3 bg-muted/20 rounded-lg border space-y-2">
                  <Label className="text-xs font-semibold">Rendimento por Folha / Material (Opcional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Ex: 6 (se cabem 6 tags por folha)"
                      value={piecesPerSheet || ''}
                      onChange={(e) => setPiecesPerSheet(parseInt(e.target.value) || 0)}
                      className="text-xs h-8"
                    />
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">peças/folha</span>
                  </div>

                  {piecesPerSheet > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="sheet-round"
                        checked={useSheetRounding}
                        onChange={(e) => setUseSheetRounding(e.target.checked)}
                        className="rounded border-gray-300 text-primary"
                      />
                      <Label htmlFor="sheet-round" className="text-[11px] cursor-pointer">
                        Cobrar folha inteira para pedidos avulsos (Math.ceil)
                      </Label>
                    </div>
                  )}
                </div>
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
        <DialogContent size="md" className="max-h-[90dvh] flex flex-col overflow-hidden" noPadding>
          <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
            <DialogTitle>Adicionar Custo / Insumo Avulso</DialogTitle>
          </DialogHeader>
          <DialogBody className="p-4 sm:p-6 space-y-4">
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomCost(val === '' ? ('' as any) : parseFloat(val) || 0);
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Quantidade Usada</Label>
                <Input
                  type="number"
                  min="0.0001"
                  step="any"
                  placeholder="1"
                  value={customQty}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomQty(val === '' ? ('' as any) : parseFloat(val) || 0);
                  }}
                  className="mt-1"
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border flex items-center justify-end gap-2 bg-card">
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

      {/* Modal: Simulação de Lotes e Escala */}
      <Dialog
        open={!!batchModalRecipe}
        onOpenChange={(open) => {
          if (!open) setBatchModalRecipe(null);
        }}
      >
        <DialogContent size="2xl" className="max-h-[90dvh] flex flex-col overflow-hidden" noPadding>
          <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              Simulador de Lotes: {batchModalRecipe?.productName}
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="p-4 sm:p-6 space-y-4">
            <p className="text-xs text-muted-foreground">
              A economia de escala considera a diluição do tempo de setup/arte entre as peças e o aproveitamento real de folhas impressas.
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

      {/* Modal: Registrar Produção Real (Previsto vs Realizado) */}
      <Dialog open={trackingModalOpen} onOpenChange={setTrackingModalOpen}>
        <DialogContent size="md" className="max-h-[90dvh] flex flex-col overflow-hidden" noPadding>
          <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" />
              Registrar Produção Realizada
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="p-4 sm:p-6 space-y-4">
            <div>
              <Label className="text-xs">Ficha Técnica Vinculada (Opcional)</Label>
              <Select
                value={trackingRecipeId}
                onValueChange={(val) => {
                  setTrackingRecipeId(val);
                  const found = recipes.find((r) => r.id === val);
                  if (found) {
                    setTrackingProductName(found.productName);
                    setTrackingPlannedMinutes((found.setupTimeMinutes || 0) + (found.productionTimeMinutes || 0));
                    setTrackingPlannedCost(found.totalUnitCost);
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione para puxar tempos previstos..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {recipes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.productName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome do Produto *</Label>
                <Input
                  value={trackingProductName}
                  onChange={(e) => setTrackingProductName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Número do Pedido (Opcional)</Label>
                <Input
                  placeholder="Ex: #1042"
                  value={trackingOrderNumber}
                  onChange={(e) => setTrackingOrderNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={trackingPlannedQty}
                  onChange={(e) => setTrackingPlannedQty(parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Tempo Previsto</Label>
                <Input
                  type="number"
                  placeholder="Min"
                  value={trackingPlannedMinutes || ''}
                  onChange={(e) => setTrackingPlannedMinutes(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-primary">Tempo Real *</Label>
                <Input
                  type="number"
                  placeholder="Minutos"
                  value={trackingActualMinutes || ''}
                  onChange={(e) => setTrackingActualMinutes(parseInt(e.target.value) || 0)}
                  className="mt-1 font-bold"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Observações da Produção</Label>
              <Input
                placeholder="Ex: Corte da plotter demorou mais devido ao vinco duplo"
                value={trackingNotes}
                onChange={(e) => setTrackingNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </DialogBody>
          <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border flex items-center justify-end gap-2 bg-card">
            <Button variant="outline" onClick={() => setTrackingModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTrackingRecord}>
              Salvar Registro
            </Button>
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

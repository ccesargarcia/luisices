import { useState, useEffect } from 'react';
import {
  ProductPricingRecipe,
  SupplyItem,
  PurchaseHistoryItem,
  Product,
  StudioPricingSettings,
  canAccessPricing,
} from '../types';
import { useAuth } from '../../contexts/AuthContext';
import { firebasePricingService } from '../../services/firebasePricingService';
import { firebaseProductService } from '../../services/firebaseProductService';
import { calculateHourlyRate } from '../utils/pricingCalculations';
import { formatCurrency } from '../utils/currency';
import { exportCostsToExcel } from '../utils/exportCostsExcel';
import { PricingCalculatorTab } from '../components/pricing/PricingCalculatorTab';
import { SuppliesTab } from '../components/pricing/SuppliesTab';
import { PurchaseHistoryTab } from '../components/pricing/PurchaseHistoryTab';
import { StudioSettingsTab } from '../components/pricing/StudioSettingsTab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Calculator,
  Layers,
  History,
  Settings2,
  Clock,
  Coins,
  FileSpreadsheet,
  ShieldAlert,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export function Pricing() {
  const { userProfile, isAdmin, hasPermission } = useAuth();

  // Permissões granulares de acesso ao módulo de Precificação & Custos
  const canView = isAdmin || hasPermission((p) => canAccessPricing(p, 'view'));
  const canCreate = isAdmin || hasPermission((p) => canAccessPricing(p, 'create'));
  const canEdit = isAdmin || hasPermission((p) => canAccessPricing(p, 'edit'));
  const canDelete = isAdmin || hasPermission((p) => canAccessPricing(p, 'delete'));

  const [activeTab, setActiveTab] = useState<string>('supplies');

  const [recipes, setRecipes] = useState<ProductPricingRecipe[]>([]);
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [historyItems, setHistoryItems] = useState<PurchaseHistoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [studioSettings, setStudioSettings] = useState<StudioPricingSettings | null>(null);

  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [loadingSupplies, setLoadingSupplies] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!canView) return;

    // Carregar configurações do ateliê
    firebasePricingService.getStudioSettings().then(setStudioSettings).catch(console.error);

    // Carregar produtos para vinculação
    firebaseProductService.getProducts().then(setProducts).catch(console.error);

    // Assinar Insumos em tempo real
    const unsubSupplies = firebasePricingService.subscribeToSupplies((list) => {
      setSupplies(list);
      setLoadingSupplies(false);
    });

    // Assinar Fichas Técnicas em tempo real
    const unsubRecipes = firebasePricingService.subscribeToRecipes((list) => {
      setRecipes(list);
      setLoadingRecipes(false);
    });

    // Assinar Histórico de Compras em tempo real
    const unsubHistory = firebasePricingService.subscribeToPurchaseHistory((list) => {
      setHistoryItems(list);
      setLoadingHistory(false);
    });

    return () => {
      unsubSupplies();
      unsubRecipes();
      unsubHistory();
    };
  }, [canView]);

  const refreshProducts = async () => {
    try {
      const list = await firebaseProductService.getProducts();
      setProducts(list);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportExcel = () => {
    try {
      exportCostsToExcel(supplies, historyItems, recipes);
      toast.success('Planilha Excel de Custos gerada com sucesso!', {
        description: 'Planilha exportada com as 3 abas completas (Cadastro de Custos, Histórico de Compras e Custo por Produto).',
      });
    } catch (err) {
      console.error('Erro ao gerar planilha Excel:', err);
      toast.error('Não foi possível gerar a planilha Excel.');
    }
  };

  // Bloqueio de visualização se o usuário não possuir permissão
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 mb-4">
          <ShieldAlert className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Acesso restrito</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Seu perfil de usuário não possui permissão para visualizar o módulo de Precificação & Custos de Insumos.
          Solicite a liberação a um administrador da equipe se necessário.
        </p>
      </div>
    );
  }

  const currentHourly = calculateHourlyRate(studioSettings || undefined);

  // Insumos com estoque baixo ou em alerta de reposição
  const lowStockCount = supplies.filter(
    (s) =>
      (s.currentStock !== undefined && s.minStock !== undefined && s.minStock > 0 && s.currentStock <= s.minStock) ||
      Boolean(s.needsReorder)
  ).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header com Identidade e Exportação Excel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
              <Coins className="size-7 text-primary" />
              Precificação & Custos de Insumos
            </h1>
            {!isAdmin && userProfile?.role === 'funcionario' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
                Acesso Equipe
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Gestão inteligente de compras, ficha técnica de produtos e custos de produção para o Ateliê Luisices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2 bg-card hover:bg-muted text-xs h-9 border-primary/30 hover:border-primary/60 shadow-sm"
            onClick={handleExportExcel}
            title="Download da planilha Excel (.xlsx) com as 3 abas"
          >
            <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">Exportar Planilha Excel (.xlsx)</span>
          </Button>
        </div>
      </div>

      {/* Mini Cards de Indicadores Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers className="size-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">Cadastro de Insumos</div>
              <div className="text-xl font-bold">{supplies.length} itens</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <History className="size-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">Histórico de Compras</div>
              <div className="text-xl font-bold">{historyItems.length} compras</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Calculator className="size-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">Custo por Produto</div>
              <div className="text-xl font-bold">{recipes.length} fichas</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Clock className="size-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">Hora de Trabalho</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(currentHourly.hourlyRate)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navegação entre as 4 Abas Estruturadas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 bg-muted/60 gap-1">
          <TabsTrigger value="supplies" className="text-xs sm:text-sm gap-2 py-2">
            <Layers className="size-4" />
            <span className="truncate">Aba 1 — Cadastro de Custos</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm gap-2 py-2">
            <History className="size-4" />
            <span className="truncate">Aba 2 — Histórico de Compras</span>
          </TabsTrigger>
          <TabsTrigger value="recipes" className="text-xs sm:text-sm gap-2 py-2">
            <Calculator className="size-4" />
            <span className="truncate">Aba 3 — Custo por Produto</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm gap-2 py-2">
            <Settings2 className="size-4" />
            <span className="truncate">Custos do Ateliê & Hora</span>
          </TabsTrigger>
        </TabsList>

        {/* Aba 1: Cadastro de Custos (Insumos) */}
        <TabsContent value="supplies" className="space-y-4 focus-visible:outline-none">
          <SuppliesTab
            supplies={supplies}
            loading={loadingSupplies}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </TabsContent>

        {/* Aba 2: Histórico de Compras */}
        <TabsContent value="history" className="space-y-4 focus-visible:outline-none">
          <PurchaseHistoryTab
            historyItems={historyItems}
            supplies={supplies}
            loading={loadingHistory}
            canCreate={canCreate}
            canDelete={canDelete}
          />
        </TabsContent>

        {/* Aba 3: Custo por Produto (Fichas Técnicas) */}
        <TabsContent value="recipes" className="space-y-4 focus-visible:outline-none">
          <PricingCalculatorTab
            recipes={recipes}
            supplies={supplies}
            products={products}
            studioSettings={studioSettings}
            loading={loadingRecipes}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            onProductSynced={refreshProducts}
          />
        </TabsContent>

        {/* Aba 4: Custos do Ateliê & Hora */}
        <TabsContent value="settings" className="space-y-4 focus-visible:outline-none">
          <StudioSettingsTab
            initialSettings={studioSettings}
            canEdit={canEdit}
            onSettingsSaved={(saved) => setStudioSettings(saved)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Pricing;

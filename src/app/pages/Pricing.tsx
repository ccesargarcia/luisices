import { useState, useEffect } from 'react';
import {
  ProductPricingRecipe,
  SupplyItem,
  Product,
  StudioPricingSettings,
} from '../types';
import { firebasePricingService } from '../../services/firebasePricingService';
import { firebaseProductService } from '../../services/firebaseProductService';
import { calculateHourlyRate } from '../utils/pricingCalculations';
import { formatCurrency } from '../utils/currency';
import { PricingCalculatorTab } from '../components/pricing/PricingCalculatorTab';
import { SuppliesTab } from '../components/pricing/SuppliesTab';
import { StudioSettingsTab } from '../components/pricing/StudioSettingsTab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Card, CardContent } from '../components/ui/card';
import {
  Calculator,
  Layers,
  Settings2,
  Clock,
  Coins,
  TrendingUp,
  Package,
} from 'lucide-react';

export function Pricing() {
  const [activeTab, setActiveTab] = useState<string>('recipes');

  const [recipes, setRecipes] = useState<ProductPricingRecipe[]>([]);
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [studioSettings, setStudioSettings] = useState<StudioPricingSettings | null>(null);

  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [loadingSupplies, setLoadingSupplies] = useState(true);

  useEffect(() => {
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

    return () => {
      unsubSupplies();
      unsubRecipes();
    };
  }, []);

  const refreshProducts = async () => {
    try {
      const list = await firebaseProductService.getProducts();
      setProducts(list);
    } catch (err) {
      console.error(err);
    }
  };

  const currentHourly = calculateHourlyRate(studioSettings || undefined);

  // Média de margem de lucro praticada
  const averageMargin = recipes.length > 0
    ? Math.round(
        recipes.reduce((sum, r) => sum + (r.profitMarginPercent || 0), 0) / recipes.length
      )
    : (studioSettings?.defaultProfitMarginPercent ?? 50);

  return (
    <div className="space-y-6 pb-12">
      {/* Header com Boas-vindas e Métricas Principais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Coins className="size-7 text-primary" />
            Precificação & Custos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Módulo assertivo de formação de preços, fichas técnicas e custos de produção para papelaria personalizada.
          </p>
        </div>
      </div>

      {/* Mini Cards de Indicadores Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Calculator className="size-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">Fichas Técnicas</div>
              <div className="text-xl font-bold">{recipes.length} produtos</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers className="size-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">Insumos Cadastrados</div>
              <div className="text-xl font-bold">{supplies.length} itens</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Clock className="size-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">Sua Hora de Trabalho</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(currentHourly.hourlyRate)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">Margem Média</div>
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {averageMargin}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navegação entre as 3 Abas Principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-xl h-11 p-1 bg-muted/60">
          <TabsTrigger value="recipes" className="text-xs sm:text-sm gap-2">
            <Calculator className="size-4" />
            Fichas Técnicas
          </TabsTrigger>
          <TabsTrigger value="supplies" className="text-xs sm:text-sm gap-2">
            <Layers className="size-4" />
            Insumos & Materiais
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm gap-2">
            <Settings2 className="size-4" />
            Custos do Ateliê
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recipes" className="space-y-4 focus-visible:outline-none">
          <PricingCalculatorTab
            recipes={recipes}
            supplies={supplies}
            products={products}
            studioSettings={studioSettings}
            loading={loadingRecipes}
            onProductSynced={refreshProducts}
          />
        </TabsContent>

        <TabsContent value="supplies" className="space-y-4 focus-visible:outline-none">
          <SuppliesTab
            supplies={supplies}
            loading={loadingSupplies}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 focus-visible:outline-none">
          <StudioSettingsTab
            initialSettings={studioSettings}
            onSettingsSaved={(saved) => setStudioSettings(saved)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Pricing;

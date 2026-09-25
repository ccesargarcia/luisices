import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Scissors, 
  Layers, 
  History, 
  FolderHeart, 
  Sun, 
  Moon, 
  CreditCard,
  Store,
  LayoutGrid,
  Sparkle,
  ArrowRight
} from 'lucide-react';
import { GeneratorForm } from './components/GeneratorForm';
import { ResultViewer } from './components/ResultViewer';
import { ArchiveManager } from './components/ArchiveManager';
import { SaaSPlansModal } from './components/SaaSPlansModal';
import { LuisicesStorefront } from './components/store/LuisicesStorefront';
import { CartDrawer } from './components/store/CartDrawer';
import { CustomizationCheckoutModal } from './components/store/CustomizationCheckoutModal';
import { INITIAL_ARCHIVE_ITEMS } from './archiveData';
import { INITIAL_QUOTA, SAAS_PLANS } from './saasPlansData';
import { STORE_PRODUCTS } from './data/storeProductsData';
import { GenerationResult, ArchiveItem, TenantQuota, SaaSPlanId } from './types';
import { StoreProduct } from './types/store';

export type AppRoute = 'store' | 'generator' | 'archive' | 'history';

export function App() {
  // Determine initial tab from pathname or hash
  const getInitialRoute = (): AppRoute => {
    if (typeof window === 'undefined') return 'store';
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    if (path.includes('/catalogo') || hash.includes('#/catalogo')) {
      return 'store';
    }
    if (path.includes('/estudio') || hash.includes('#/estudio')) {
      return 'generator';
    }
    if (path.includes('/acervo') || hash.includes('#/acervo')) {
      return 'archive';
    }
    return 'store';
  };

  const [activeTab, setActiveTab] = useState<AppRoute>(getInitialRoute);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<GenerationResult | null>(null);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>(INITIAL_ARCHIVE_ITEMS);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [quota, setQuota] = useState<TenantQuota>(INITIAL_QUOTA);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);

  // Global Cart State Synchronized Across All Views
  const [cartItems, setCartItems] = useState<Array<{
    product: StoreProduct;
    quantity: number;
    selectedFinishes: Record<string, string>;
    totalPrice: number;
    celebrationDate?: string;
    namesOrInitials?: string;
  }>>([
    {
      product: STORE_PRODUCTS[0],
      quantity: 30,
      selectedFinishes: { foil: 'finish-foil-rose', paper: 'finish-paper-cotton', seal: 'finish-seal-botanic', ribbon: 'finish-ribbon-silk' },
      totalPrice: 30 * (STORE_PRODUCTS[0].basePrice + 2.50 + 3.80 + 3.20 + 2.90),
      celebrationDate: '2026-11-15',
      namesOrInitials: 'Luísa & Gabriel',
    },
  ]);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCheckoutProduct, setSelectedCheckoutProduct] = useState<StoreProduct | null>(null);

  // Sync theme with html class
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Sync URL with Route
  const handleNavigate = (route: AppRoute) => {
    setActiveTab(route);
    let targetPath = '/';
    if (route === 'store') targetPath = '/catalogo';
    else if (route === 'generator') targetPath = '/estudio';
    else if (route === 'archive') targetPath = '/acervo';
    else if (route === 'history') targetPath = '/historico';

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  // Listen to popstate (back/forward)
  useEffect(() => {
    const onPopState = () => {
      setActiveTab(getInitialRoute());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleGenerate = async (formData: any) => {
    if (quota.aiGenerationsUsed >= quota.aiGenerationsLimit) {
      setIsPlansModalOpen(true);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/studio/generate-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao gerar conceito.');
      }

      const data = await response.json();

      const newResult: GenerationResult = {
        id: `gen-${Date.now()}`,
        createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        request: formData,
        technicalSheet: data.technicalSheet,
        renderedPrompt: data.renderedPrompt,
        mockupImage: data.mockupImage,
      };

      setCurrentResult(newResult);
      setHistory(prev => [newResult, ...prev]);

      setQuota(prev => ({
        ...prev,
        aiGenerationsUsed: prev.aiGenerationsUsed + 1,
        estimatedCostBrl: prev.estimatedCostBrl + 0.015,
      }));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ocorreu um erro ao processar com a IA.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = (planId: SaaSPlanId) => {
    const selectedPlan = SAAS_PLANS.find(p => p.id === planId);
    if (selectedPlan) {
      setQuota(prev => ({
        ...prev,
        planId,
        aiGenerationsLimit: selectedPlan.aiLimitMonth,
      }));
      setIsPlansModalOpen(false);
    }
  };

  const handleAddArchiveItem = (item: ArchiveItem) => {
    setArchiveItems(prev => [item, ...prev]);
  };

  const handleDeleteArchiveItem = (id: string) => {
    setArchiveItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddToCart = (newItem: {
    product: StoreProduct;
    quantity: number;
    selectedFinishes: Record<string, string>;
    totalPrice: number;
    celebrationDate?: string;
    namesOrInitials?: string;
  }) => {
    setCartItems(prev => [...prev, newItem]);
  };

  const handleRemoveCartItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-[var(--primary)]/20 selection:text-[var(--primary)] transition-colors duration-300">
      {/* Universal Floating Navigation Switcher Bar */}
      <div className="bg-[#221A1A] text-white text-[11px] px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 z-50 shadow-md border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-serif font-bold text-xs tracking-wide text-[#f4b7b9]">Luisices Ateliê</span>
          <span className="hidden md:inline text-white/50">• Papelaria de Afeto &amp; Luxo Artesanal</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Quick Route Switchers */}
          <button
            onClick={() => handleNavigate('store')}
            className={`px-3 py-1 rounded-full font-bold transition text-xs ${
              activeTab === 'store'
                ? 'bg-gradient-to-r from-[#f4b7b9] to-[#eed0d1] text-[#4C2527] shadow-sm ring-2 ring-white/30'
                : 'bg-white/10 text-white/80 hover:text-white hover:bg-white/20'
            }`}
          >
            Catálogo (/catalogo)
          </button>

          <button
            onClick={() => handleNavigate('generator')}
            className={`px-2.5 py-1 rounded-full font-bold transition text-xs flex items-center gap-1 ${
              activeTab === 'generator' ? 'bg-white text-black' : 'text-white/70 hover:text-white'
            }`}
          >
            <Scissors className="w-3 h-3" />
            <span className="hidden sm:inline">Estúdio Silhouette 3D</span>
            <span className="sm:hidden">Estúdio</span>
          </button>

          <button
            onClick={() => handleNavigate('archive')}
            className={`px-2.5 py-1 rounded-full font-bold transition text-xs flex items-center gap-1 ${
              activeTab === 'archive' ? 'bg-white text-black' : 'text-white/70 hover:text-white'
            }`}
          >
            <span>Acervo ({archiveItems.length})</span>
          </button>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 transition ml-1"
            title="Alternar Modo Claro / Escuro"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* VIEW 1: Vitrine e Catálogo da Loja */}
      {activeTab === 'store' && (
        <LuisicesStorefront />
      )}

      {/* VIEW 3: Gerador de Topos 3D com Gemini 3 */}
      {activeTab === 'generator' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="font-bold ml-4">✕</button>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
              <h2 className="text-xl font-serif font-bold text-[var(--primary)]">
                Estúdio de Engenharia de Topos 3D (Silhouette Portrait 3)
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Gere fichas técnicas físicas, prompts de estúdio e gabaritos vetoriais SVG para corte com Gemini 3.8 Flash.
              </p>
            </div>
            <button
              onClick={() => setIsPlansModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--primary)]/15 text-[var(--primary)] text-xs font-bold flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{quota.aiGenerationsLimit - quota.aiGenerationsUsed} créditos</span>
            </button>
          </div>

          <GeneratorForm
            archiveItems={archiveItems}
            isLoading={isLoading}
            onGenerate={handleGenerate}
            quota={quota}
            onOpenPlans={() => setIsPlansModalOpen(true)}
          />

          {currentResult && (
            <div className="pt-2">
              <ResultViewer result={currentResult} />
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: Acervo Real & Aprendizado Contínuo */}
      {activeTab === 'archive' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
          <ArchiveManager
            archiveItems={archiveItems}
            onAddArchiveItem={handleAddArchiveItem}
            onDeleteItem={handleDeleteArchiveItem}
          />
        </div>
      )}

      {/* VIEW 5: Histórico de Criação */}
      {activeTab === 'history' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4 flex-1">
          <div className="luisices-glass p-6 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Histórico de Projetos Gerados</h2>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Topos e fichas criadas nesta sessão.</p>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="luisices-glass p-12 rounded-2xl text-center text-[var(--muted-foreground)] text-xs">
              Nenhum topo gerado ainda nesta sessão.
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((item) => (
                <div key={item.id} className="space-y-2">
                  <span className="text-[11px] font-bold text-[var(--primary)]">Criado às {item.createdAt}</span>
                  <ResultViewer result={item} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shared Cart Drawer Across All Views */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={() => {
          setIsCartOpen(false);
          if (cartItems.length > 0) {
            setSelectedCheckoutProduct(cartItems[0].product);
          }
        }}
      />

      {/* Shared Customization Modal */}
      {selectedCheckoutProduct && (
        <CustomizationCheckoutModal
          product={selectedCheckoutProduct}
          onClose={() => setSelectedCheckoutProduct(null)}
          onConfirmOrder={(orderSummary) => {
            handleAddToCart({
              product: selectedCheckoutProduct,
              quantity: orderSummary.quantity,
              selectedFinishes: orderSummary.selectedFinishes,
              totalPrice: orderSummary.subtotal,
            });
            setSelectedCheckoutProduct(null);
          }}
        />
      )}

      {/* SaaS Plans Modal */}
      {isPlansModalOpen && (
        <SaaSPlansModal
          currentPlanId={quota.planId}
          quota={quota}
          onClose={() => setIsPlansModalOpen(false)}
          onSelectPlan={handleSelectPlan}
          onAddCreditPack={(amount) => {
            setQuota(prev => ({
              ...prev,
              aiGenerationsLimit: prev.aiGenerationsLimit + amount,
            }));
          }}
        />
      )}
    </div>
  );
}

export default App;

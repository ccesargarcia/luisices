import React, { useState, useMemo } from 'react';
import { Navbar } from './Navbar';
import { HeroSection } from './HeroSection';
import { CategoryPills } from './CategoryPills';
import { ProductCard } from './ProductCard';
import { BrandDifferentials } from './BrandDifferentials';
import { WhatsAppConsultingBanner } from './WhatsAppConsultingBanner';
import { Footer } from './Footer';
import { BottomNav } from './BottomNav';
import { CustomizationCheckoutModal } from './CustomizationCheckoutModal';
import { SampleModal } from './SampleModal';
import { CartDrawer } from './CartDrawer';
import { STORE_PRODUCTS } from '../../data/storeProductsData';
import { StoreProduct } from '../../types/store';
import { Sparkles, Layers, SlidersHorizontal } from 'lucide-react';

export const LuisicesStorefront: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeNavTab, setActiveNavTab] = useState<string>('hero');
  const [favorites, setFavorites] = useState<string[]>(['prod-convite-botanico']);

  // Modals state
  const [personalizingProduct, setPersonalizingProduct] = useState<StoreProduct | null>(null);
  const [sampleProduct, setSampleProduct] = useState<StoreProduct | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Cart items
  const [cartItems, setCartItems] = useState<Array<{
    product: StoreProduct;
    quantity: number;
    selectedFinishes: Record<string, string>;
    totalPrice: number;
  }>>([
    {
      product: STORE_PRODUCTS[0],
      quantity: 30,
      selectedFinishes: { foil: 'finish-foil-rose', paper: 'finish-paper-cotton' },
      totalPrice: 30 * (STORE_PRODUCTS[0].basePrice + 2.50 + 3.80),
    },
  ]);

  const featuredProduct = STORE_PRODUCTS[0];

  // Filtering products
  const filteredProducts = useMemo(() => {
    return STORE_PRODUCTS.filter((product) => {
      const matchesCategory = selectedCategory === 'todos' || product.category === selectedCategory;
      const matchesSearch = !searchTerm.trim() ||
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchTerm]);

  const handleToggleFavorite = (productId: string) => {
    setFavorites(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const handleNavigateSection = (sectionId: string) => {
    setActiveNavTab(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleConfirmCustomizationOrder = (orderSummary: any) => {
    if (personalizingProduct) {
      setCartItems(prev => [
        ...prev,
        {
          product: personalizingProduct,
          quantity: orderSummary.quantity,
          selectedFinishes: orderSummary.selectedFinishes,
          totalPrice: orderSummary.subtotal,
        },
      ]);
    }
  };

  const handleRemoveCartItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen text-[var(--foreground)] selection:bg-[var(--primary)]/20 selection:text-[var(--primary)] relative pb-20 md:pb-8">
      {/* 1. Header Navbar */}
      <Navbar
        cartItems={cartItems}
        onOpenCart={() => setIsCartOpen(true)}
        onSearch={setSearchTerm}
        searchTerm={searchTerm}
        onNavigateSection={handleNavigateSection}
      />

      {/* Main Canvas */}
      <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12 sm:space-y-16">
        {/* 2. Hero Section */}
        <HeroSection
          featuredProduct={featuredProduct}
          onExploreCatalog={() => handleNavigateSection('catalogo')}
          onScheduleConsulting={() => handleNavigateSection('consultoria')}
          onPersonalizeFeatured={(p) => setPersonalizingProduct(p)}
        />

        {/* 3. Category Carousel */}
        <CategoryPills
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            handleNavigateSection('catalogo');
          }}
        />

        {/* 4. Product Catalog Grid */}
        <section id="catalogo" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[var(--border)] pb-4">
            <div>
              <span className="text-[10px] sm:text-xs font-bold text-[var(--primary)] uppercase tracking-widest">
                Feito com Devoção &amp; Afeto
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--primary)]">
                Coleções Autorais &amp; Topos 3D
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[var(--muted-foreground)] max-w-md">
              Peças moldadas com papel de gramatura pesada, técnicas de estampagem a quente e toques aromáticos delicados.
            </p>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="luisices-glass p-12 rounded-3xl text-center space-y-2">
              <p className="font-serif font-bold text-lg text-[var(--primary)]">
                Nenhum projeto encontrado para "{searchTerm}"
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Tente buscar por termos como "convite", "sereia", "safari", "lamicote" ou "caixa".
              </p>
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setSelectedCategory('todos'); }}
                className="mt-3 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold uppercase tracking-wider"
              >
                Limpar Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelectSample={(p) => setSampleProduct(p)}
                  onPersonalize={(p) => setPersonalizingProduct(p)}
                  isFavorite={favorites.includes(product.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </section>

        {/* 5. Brand Differentials */}
        <BrandDifferentials />

        {/* 6. WhatsApp Bespoke Consulting Banner */}
        <WhatsAppConsultingBanner />

        {/* 7. Footer */}
        <Footer />
      </main>

      {/* 8. Bottom Navigation for Mobile */}
      <BottomNav
        activeTab={activeNavTab}
        onSelectTab={handleNavigateSection}
        cartCount={cartItems.length}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Modals & Drawers */}
      {personalizingProduct && (
        <CustomizationCheckoutModal
          product={personalizingProduct}
          onClose={() => setPersonalizingProduct(null)}
          onConfirmOrder={handleConfirmCustomizationOrder}
        />
      )}

      {sampleProduct && (
        <SampleModal
          product={sampleProduct}
          onClose={() => setSampleProduct(null)}
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={() => {
          setIsCartOpen(false);
          if (cartItems.length > 0) {
            setPersonalizingProduct(cartItems[0].product);
          }
        }}
      />
    </div>
  );
};

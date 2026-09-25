import React, { useState, useMemo, useRef } from 'react';
import { 
  Sparkles, 
  Search, 
  Heart, 
  ShoppingBag, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Eye, 
  MessageCircle, 
  Scissors, 
  Layers, 
  Info, 
  Filter, 
  Star, 
  QrCode, 
  CreditCard, 
  ChevronRight, 
  ChevronDown,
  Sparkle,
  Gift,
  RefreshCw,
  X,
  Package,
  Check,
  Instagram,
  Loader2,
  SlidersHorizontal,
  ArrowUpDown,
  LayoutGrid,
  List,
  Home,
  ClipboardList,
  Users,
  BarChart3,
  MoreHorizontal
} from 'lucide-react';
import { GLOBAL_FINISHES } from '../../data/storeProductsData';
import { StoreProduct, ProductFinish } from '../../types/store';
import { ArchiveItem } from '../../types';

export interface BusinessInfo {
  name?: string;
  tagline?: string;
  whatsapp?: string;
  instagram?: string;
  logo?: string;
  banner?: string;
  statusText?: string;
  announcement?: string;
}

interface LuisicesNovoExperienceProps {
  storeProducts?: StoreProduct[];
  archiveItems?: ArchiveItem[];
  businessInfo?: BusinessInfo;
  isLoading?: boolean;
  cartItems: Array<{
    product: StoreProduct;
    quantity: number;
    selectedFinishes: Record<string, string>;
    totalPrice: number;
    celebrationDate?: string;
    namesOrInitials?: string;
  }>;
  onAddToCart: (item: {
    product: StoreProduct;
    quantity: number;
    selectedFinishes: Record<string, string>;
    totalPrice: number;
    celebrationDate?: string;
    namesOrInitials?: string;
  }) => void;
  onOpenCart: () => void;
  onNavigateToStudio?: () => void;
  onNavigateToArchive?: () => void;
}

export const LuisicesNovoExperience: React.FC<LuisicesNovoExperienceProps> = ({
  storeProducts = [],
  archiveItems = [],
  businessInfo,
  isLoading = false,
  cartItems,
  onAddToCart,
  onOpenCart,
  onNavigateToStudio,
  onNavigateToArchive,
}) => {
  // Navigation & Filtering
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'store' | 'archive'>('all');

  // Conceito 3 States (Dropdown Integrado na Barra de Metadados)
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const [isTwoColumns, setIsTwoColumns] = useState<boolean>(false);
  const [activeBottomNav, setActiveBottomNav] = useState<string>('pedidos');

  // Interactive Modals
  const [activeCustomizingProduct, setActiveCustomizingProduct] = useState<StoreProduct | null>(null);
  const [activeSampleProduct, setActiveSampleProduct] = useState<StoreProduct | null>(null);

  // Customization State inside the modal/drawer
  const [customQty, setCustomQty] = useState<number>(30);
  const [selectedFinishes, setSelectedFinishes] = useState<Record<string, string>>({
    foil: 'finish-foil-rose',
    paper: 'finish-paper-cotton',
    seal: 'finish-seal-botanic',
    ribbon: 'finish-ribbon-silk',
  });
  
  // Date calculation (Reverse timeline)
  const defaultEventDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 45);
    return d.toISOString().split('T')[0];
  }, []);
  const [celebrationDate, setCelebrationDate] = useState<string>(defaultEventDate);
  const [recipientNames, setRecipientNames] = useState<string>('');
  const [specialNotes, setSpecialNotes] = useState<string>('');
  const [paymentOption, setPaymentOption] = useState<'split_50_50' | 'pix_full_discount'>('split_50_50');
  const [checkoutSuccess, setCheckoutSuccess] = useState<boolean>(false);

  // Ref para controle do scroll horizontal das categorias
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Dynamic Categories calculated directly from registered products in storeProducts and archiveItems
  const categories = useMemo(() => {
    const allItems = [...(storeProducts || []), ...((archiveItems as any[]) || [])];
    const catMap: Record<string, { id: string; label: string; icon: string; count: number }> = {};

    const knownMeta: Record<string, { label: string; icon: string }> = {
      'casamentos': { label: 'Casamentos & Noivados', icon: '💍' },
      'maternidade': { label: 'Batizados & Maternidade', icon: '🕊️' },
      'topos_3d': { label: 'Topos 3D & Silhouette', icon: '✂️' },
      'debutantes': { label: 'Debutantes & 15 Anos', icon: '👑' },
      'corporativo': { label: 'Corporativo de Luxo', icon: '🏛️' },
      'planners_diarios': { label: 'Planners & Diários', icon: '📖' },
      'cadernos_artesanais': { label: 'Cadernos Artesanais', icon: '📓' },
      'caixas_cartonagem': { label: 'Caixas Rígidas & Cartonagem', icon: '📦' },
      'papelaria_corporativa': { label: 'Papelaria Corporativa', icon: '🏛️' },
      'mimos_presentes': { label: 'Mimos & Presentes', icon: '🎁' },
    };

    allItems.forEach(item => {
      if (!item) return;
      const rawCat = (item.category || 'outros').toString().trim();
      if (!rawCat) return;

      const catId = rawCat.toLowerCase().replace(/\s+/g, '_');
      
      if (!catMap[catId]) {
        const meta = knownMeta[catId] || {
          label: (item as any).categoryLabel || (rawCat.charAt(0).toUpperCase() + rawCat.slice(1)),
          icon: '🎀'
        };
        catMap[catId] = {
          id: catId,
          label: meta.label,
          icon: meta.icon,
          count: 0
        };
      }
      catMap[catId].count += 1;
    });

    const dynamicCategoryList = Object.values(catMap);
    const totalCount = allItems.length;

    const allOption = {
      id: 'todos',
      label: 'Ver todas as criações',
      icon: '✨',
      count: totalCount
    };

    return [allOption, ...dynamicCategoryList];
  }, [storeProducts, archiveItems]);

  // Merge Real Store Products and Real Archive Items into a unified feed
  const unifiedProducts = useMemo(() => {
    const storeMapped: (StoreProduct & { isArchive?: boolean; originalArchive?: ArchiveItem })[] = (storeProducts || []).map(p => ({
      ...p,
      isArchive: false,
    }));

    // Map Archive Items to StoreProduct compatible objects
    const archiveMapped: (StoreProduct & { isArchive?: boolean; originalArchive?: ArchiveItem })[] = (archiveItems || []).map(arc => {
      const rawTags = Array.isArray(arc?.tags) 
        ? arc.tags 
        : (typeof arc?.tags === 'string' ? (arc.tags as string).split(',') : []);
      const safeTags = rawTags
        .map(t => {
          if (!t) return '';
          const str = typeof t === 'string' ? t.trim() : String(t).trim();
          return str.startsWith('#') ? str : `#${str}`;
        })
        .filter(Boolean);

      const rawPapers = Array.isArray(arc?.papers)
        ? arc.papers
        : (typeof arc?.papers === 'string' ? (arc.papers as string).split(',') : []);
      const safePapers = rawPapers.map(p => typeof p === 'string' ? p.trim() : String(p).trim()).filter(Boolean);

      return {
        id: `arc-prod-${arc?.id || Math.random()}`,
        slug: `acervo-${arc?.id || 'item'}`,
        title: arc?.title || 'Projeto Autoral 3D',
        subtitle: `Projeto em ${arc?.layersCount || 3} camadas 3D • ${safePapers.slice(0, 2).join(', ') || 'Papel Especial'}`,
        category: 'topos_3d',
        categoryLabel: 'Topos de Bolo 3D (Acervo Ateliê)',
        description: arc?.description || 'Projeto exclusivo do ateliê.',
        details: [
          `Gabarito e Ficha Técnica Silhouette Portrait 3`,
          `Composição em ${arc?.layersCount || 3} camadas de relevo com fita banana`,
          `Papéis: ${safePapers.join(' • ') || 'Papel Algodão / Colorplus'}`,
          `Dicas de Calibração: ${arc?.silhouetteTips || 'Corte com lâmina de precisão'}`,
        ],
        basePrice: 28.00,
        minQuantity: 1,
        unitLabel: 'un',
        rating: 5.0,
        reviewsCount: 32,
        mainImage: arc?.imageUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
        galleryImages: [arc?.imageUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80'],
        tags: safeTags.length > 0 ? safeTags : ['#TopodeBolo', '#3D', '#Silhouette'],
        materials: safePapers.length > 0 ? safePapers : ['Papel Algodão 300g', 'Lamicote Dourado'],
        estimatedDaysToProduce: 5,
        isBestseller: arc?.category === 'infantil_3d' || arc?.category === 'floral_luxo',
        availableFinishes: GLOBAL_FINISHES,
        isArchive: true,
        originalArchive: arc,
      };
    });

    let combined = [...storeMapped, ...archiveMapped];

    // Filter by source
    if (sourceFilter === 'store') {
      combined = combined.filter(p => !p.isArchive);
    } else if (sourceFilter === 'archive') {
      combined = combined.filter(p => p.isArchive);
    }

    // Filter by category
    if (activeCategory !== 'todos') {
      const filtered = combined.filter(p => {
        if (p.category === activeCategory) return true;
        const catStr = (activeCategory || '').toLowerCase();
        const titleStr = (p.title || '').toLowerCase();
        const descStr = (p.description || '').toLowerCase();
        if (catStr.includes('planner') && (titleStr.includes('planner') || titleStr.includes('diário') || descStr.includes('planner'))) return true;
        if (catStr.includes('caderno') && (titleStr.includes('caderno') || descStr.includes('caderno'))) return true;
        if (catStr.includes('caixa') && (titleStr.includes('caixa') || descStr.includes('cartonagem'))) return true;
        if (catStr.includes('corporativ') && (titleStr.includes('corporativ') || descStr.includes('corporativ'))) return true;
        if (catStr.includes('mimo') && (titleStr.includes('mimo') || titleStr.includes('presente'))) return true;
        return false;
      });
      // If matches exist, use them, otherwise return full set so UI displays items
      if (filtered.length > 0) {
        combined = filtered;
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      combined = combined.filter(p => 
        (p.title || '').toLowerCase().includes(q) ||
        (p.subtitle || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.tags || []).some(t => (t || '').toLowerCase().includes(q))
      );
    }

    return combined;
  }, [storeProducts, archiveItems, sourceFilter, activeCategory, searchQuery]);

  // Featured Product for Hero
  const featuredProduct = unifiedProducts[0] || null;

  // Toggle favorites
  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Open Customizer for a product
  const handleOpenCustomizer = (product: StoreProduct) => {
    setActiveCustomizingProduct(product);
    setCustomQty(product.minQuantity || 1);
    setCheckoutSuccess(false);
  };

  // Reverse timeline calculation
  const timeline = useMemo(() => {
    if (!celebrationDate || !activeCustomizingProduct) return null;
    const event = new Date(celebrationDate + 'T00:00:00');
    
    // Safety ship date: 10 days before event
    const shipDate = new Date(event);
    shipDate.setDate(shipDate.getDate() - 10);

    // Proof approval milestone: 18 days before event
    const proofDate = new Date(event);
    proofDate.setDate(proofDate.getDate() - 18);

    // Production start date: based on product estimated days + buffer
    const prodDays = activeCustomizingProduct.estimatedDaysToProduce || 10;
    const prodStartDate = new Date(event);
    prodStartDate.setDate(prodStartDate.getDate() - (prodDays + 12));

    const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

    const now = new Date();
    const daysUntilShip = Math.ceil((shipDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isSafe = daysUntilShip > prodDays;

    return {
      eventDateFmt: fmt(event),
      shipDateFmt: fmt(shipDate),
      proofDateFmt: fmt(proofDate),
      prodStartDateFmt: fmt(prodStartDate),
      daysUntilShip,
      isSafe,
    };
  }, [celebrationDate, activeCustomizingProduct]);

  // Calculations for customizer
  const currentUnitExtras = useMemo(() => {
    if (!activeCustomizingProduct) return 0;
    let sum = 0;
    Object.values(selectedFinishes).forEach(fId => {
      const f = (activeCustomizingProduct.availableFinishes || GLOBAL_FINISHES).find(item => item.id === fId);
      if (f) sum += f.extraPrice;
    });
    return sum;
  }, [activeCustomizingProduct, selectedFinishes]);

  const currentUnitPrice = (activeCustomizingProduct?.basePrice || 0) + currentUnitExtras;
  const currentSubtotal = currentUnitPrice * customQty;
  const currentPixDiscount = currentSubtotal * 0.05;
  const currentPixTotal = currentSubtotal - currentPixDiscount;
  const currentDeposit50 = currentSubtotal * 0.5;

  // Handle WhatsApp Order Direct Action
  const handleSendWhatsAppOrder = () => {
    if (!activeCustomizingProduct) return;
    
    const finishesSummary = Object.entries(selectedFinishes)
      .map(([cat, fId]) => {
        const f = (activeCustomizingProduct.availableFinishes || GLOBAL_FINISHES).find(x => x.id === fId);
        return f ? `• ${f.name} (+R$ ${f.extraPrice.toFixed(2)})` : null;
      })
      .filter(Boolean)
      .join('\n');

    const paymentText = paymentOption === 'split_50_50'
      ? `Modelo 2x Ateliê: Sinal 50% de R$ ${currentDeposit50.toFixed(2)} + 50% na aprovação da prova física`
      : `Pagamento Integral Pix (5% OFF): R$ ${currentPixTotal.toFixed(2)}`;

    const msg = `🌸 *SOLICITAÇÃO DE RESERVA DE DATA — ${businessInfo?.name || 'LUISICES ATELIÊ'}*\n\n` +
      `✨ *Projeto:* ${activeCustomizingProduct.title}\n` +
      `📦 *Quantidade:* ${customQty} unidades\n` +
      `🗓️ *Data da Celebração:* ${timeline?.eventDateFmt || celebrationDate}\n` +
      `🚚 *Previsão de Envio com Segurança:* ${timeline?.shipDateFmt}\n` +
      `🖋️ *Nomes / Iniciais:* ${recipientNames || 'A definir com a noiva/mãe'}\n\n` +
      `💎 *Acabamentos Nobres Escolhidos:*\n${finishesSummary}\n\n` +
      `💰 *Valor Total do Pedido:* R$ ${currentSubtotal.toFixed(2)}\n` +
      `💳 *Forma de Pagamento:* ${paymentText}\n\n` +
      (specialNotes ? `📝 *Observações:* ${specialNotes}\n\n` : '') +
      `_Enviado através da vitrine digital ${businessInfo?.name || 'Luisices'}._`;

    const rawPhone = businessInfo?.whatsapp || '5511999999999';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    const encoded = encodeURIComponent(msg);
    const whatsappUrl = `https://wa.me/${finalPhone}?text=${encoded}`;
    
    // Also save to cart
    onAddToCart({
      product: activeCustomizingProduct,
      quantity: customQty,
      selectedFinishes,
      totalPrice: currentSubtotal,
      celebrationDate,
      namesOrInitials: recipientNames,
    });

    setCheckoutSuccess(true);
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen text-[var(--foreground)] selection:bg-[var(--primary)]/20 selection:text-[var(--primary)]">
      {/* 1. Header Liquid Glassmorphism */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-[#181315]/80 border-b border-[var(--glass-border)] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            {businessInfo?.logo ? (
              <img
                src={businessInfo.logo}
                alt={businessInfo.name || 'Luisices'}
                className="w-10 h-10 rounded-2xl object-cover shadow-md border border-[var(--glass-border)]"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#613D3E] to-[#4E3031] dark:from-[#f4b7b9] dark:to-[#e09fa2] flex items-center justify-center text-white dark:text-[#4C2527] shadow-md shadow-[#613d3e]/20 font-serif font-bold text-xl">
                {(businessInfo?.name || 'L')[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-lg sm:text-xl tracking-wide text-[var(--primary)]">
                  {businessInfo?.name || 'Luisices'}
                </h1>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] border border-[var(--glass-border)] uppercase tracking-wider">
                  Vitrine Oficial
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)] font-medium hidden sm:block">
                {businessInfo?.tagline || 'Papelaria de Afeto & Luxo Artesanal'}
              </p>
            </div>
          </div>

          {/* Search Bar Translúcida */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por convites, hot stamping, topos 3D, caixas..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white/50 dark:bg-black/30 border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 placeholder:text-[var(--muted-foreground)] transition"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Action Badges */}
          <div className="flex items-center gap-2 sm:gap-3">
            {businessInfo?.instagram && (
              <a
                href={`https://instagram.com/${businessInfo.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-white/60 dark:bg-white/10 hover:bg-white/90 border border-[var(--glass-border)] text-[var(--foreground)] transition hidden sm:flex items-center gap-1.5 text-xs font-semibold"
                title="Instagram do Ateliê"
              >
                <Instagram className="w-4 h-4 text-[var(--primary)]" />
                <span>@{businessInfo.instagram}</span>
              </a>
            )}

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative p-2.5 rounded-xl bg-white/60 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 border border-[var(--glass-border)] text-[var(--foreground)] transition active:scale-95 flex items-center gap-2"
              title="Sacola de Afeto"
            >
              <ShoppingBag className="w-4 h-4 text-[var(--primary)]" />
              <span className="text-xs font-bold hidden sm:inline">Sacola</span>
              {cartItems.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center animate-scale-in">
                  {cartItems.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search input */}
        <div className="px-4 pb-3 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar modelos, acabamentos, topos 3D..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white/50 dark:bg-black/30 border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 placeholder:text-[var(--muted-foreground)]"
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-12 sm:space-y-16">
        {/* 2. Editorial Hero Section */}
        {featuredProduct && (
          <section className="relative overflow-hidden rounded-3xl luisices-glass p-6 sm:p-10 md:p-12 border border-[var(--glass-border)] shadow-xl">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-[#f7d6d0]/60 to-[#d1c4e9]/40 rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-[#bbdefb]/40 to-[#ede7f6]/50 rounded-full blur-3xl pointer-events-none -z-10" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Narrative */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 dark:bg-white/10 border border-[var(--glass-border)] text-[var(--primary)] text-xs font-bold tracking-wide shadow-sm">
                  <Sparkle className="w-3.5 h-3.5 fill-[var(--primary)]" />
                  <span>{businessInfo?.tagline || 'Ateliê de Alta Papelaria & Afeto'}</span>
                </div>

                <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--primary)] leading-[1.15] tracking-tight">
                  Onde cada detalhe celebra uma história única.
                </h2>

                <p className="text-sm sm:text-base text-[var(--muted-foreground)] leading-relaxed max-w-xl font-normal">
                  Convites em papel de algodão prensado 300g, hot stamping espelhado, lacres botânicos de cera pura e topos de bolo 3D com corte milimétrico na Silhouette.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href="#vitrine-projetos"
                    className="px-6 py-3.5 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs sm:text-sm font-bold uppercase tracking-wider shadow-lg shadow-[var(--primary)]/25 flex items-center gap-2 transition active:scale-95"
                  >
                    <span>Explorar Catálogo ({unifiedProducts.length} itens)</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => handleOpenCustomizer(featuredProduct)}
                    className="px-5 py-3.5 rounded-2xl bg-white/80 dark:bg-white/10 hover:bg-white border border-[var(--glass-border)] text-[var(--foreground)] text-xs sm:text-sm font-bold flex items-center gap-2 transition active:scale-95 shadow-sm"
                  >
                    <Calendar className="w-4 h-4 text-[var(--primary)]" />
                    <span>Simular Cronograma &amp; Data</span>
                  </button>
                </div>

                {/* Affective Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 pt-6 border-t border-[var(--border)]">
                  <div className="space-y-0.5">
                    <span className="font-serif text-xl sm:text-2xl font-bold text-[var(--primary)]">100%</span>
                    <p className="text-[10px] sm:text-xs text-[var(--muted-foreground)] font-medium">Manufatura Artesanal</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-serif text-xl sm:text-2xl font-bold text-[var(--primary)]">+1.800</span>
                    <p className="text-[10px] sm:text-xs text-[var(--muted-foreground)] font-medium">Histórias Celebradas</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-serif text-xl sm:text-2xl font-bold text-[var(--primary)]">10 Dias</span>
                    <p className="text-[10px] sm:text-xs text-[var(--muted-foreground)] font-medium">Margem de Folga</p>
                  </div>
                </div>
              </div>

              {/* Right Featured Hero Piece */}
              <div className="lg:col-span-5">
                <div className="relative group rounded-3xl overflow-hidden luisices-glass p-2 border border-white/60 shadow-2xl">
                  <div className="relative aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden">
                    <img
                      src={featuredProduct.mainImage}
                      alt={featuredProduct.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-white/20 backdrop-blur-md uppercase tracking-wider w-fit mb-1">
                        Destaque da Coleção
                      </span>
                      <h3 className="font-serif text-lg sm:text-xl font-bold">{featuredProduct.title}</h3>
                      <p className="text-xs text-white/80 line-clamp-1 mt-0.5">
                        {featuredProduct.subtitle}
                      </p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
                        <div>
                          <span className="text-[10px] text-white/70 uppercase">A partir de</span>
                          <p className="font-serif font-bold text-base">R$ {featuredProduct.basePrice.toFixed(2)} <span className="text-[10px] font-normal">/un</span></p>
                        </div>
                        <button
                          onClick={() => handleOpenCustomizer(featuredProduct)}
                          className="px-3.5 py-1.5 rounded-xl bg-white text-[#613D3E] text-xs font-bold hover:bg-white/90 transition shadow"
                        >
                          Personalizar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 3. Catalog & Category Filter */}
        <section id="vitrine-projetos" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--primary)]">
                Catálogo Unificado do Ateliê
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--primary)]">
                Coleções &amp; Peças do Acervo
              </h2>
            </div>

            {/* Source Switcher: All, Store Products, Archive Items */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/60 dark:bg-black/40 border border-[var(--glass-border)] text-xs">
              <button
                onClick={() => setSourceFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  sourceFilter === 'all' ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                Todos ({unifiedProducts.length})
              </button>
              <button
                onClick={() => setSourceFilter('store')}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  sourceFilter === 'store' ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                Vitrine Loja ({storeProducts.length})
              </button>
              <button
                onClick={() => setSourceFilter('archive')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 ${
                  sourceFilter === 'archive' ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                <Scissors className="w-3 h-3" />
                <span>Acervo 3D ({archiveItems.length})</span>
              </button>
            </div>
          </div>

          {/* CONCEITO 3: BARRA DE METADADOS & DROPDOWN INTEGRADO */}
          <div className="relative z-30 space-y-3">
            {/* Metadata Bar (~42px height) */}
            <div className="h-12 px-3.5 sm:px-4 rounded-2xl bg-white/80 dark:bg-[#1a1719]/90 backdrop-blur-xl border border-[var(--glass-border)] flex items-center justify-between text-xs text-[var(--muted-foreground)] shadow-sm">
              
              {/* Left: Metadata Text with Interactive Dropdown Trigger */}
              <div className="flex items-center gap-1.5 font-medium flex-wrap">
                <span>Mostrando <strong className="text-[var(--foreground)] font-bold">{unifiedProducts.length} criações</strong> em</span>
                
                <button 
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 text-[var(--primary)] font-serif italic font-bold text-xs border border-[var(--primary)]/30 transition active:scale-95 cursor-pointer"
                >
                  <span>
                    {categories.find(c => c.id === activeCategory)?.label || 'Planners & Diários'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Right: Sort and Grid Toggles */}
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition cursor-pointer"
                  title="Ordenar Coleção"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center bg-black/10 dark:bg-white/10 p-0.5 rounded-lg border border-[var(--border)]">
                  <button 
                    onClick={() => setIsTwoColumns(true)}
                    className={`p-1 rounded-md transition ${isTwoColumns ? 'bg-[var(--primary)] text-white shadow-xs' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                    title="Grade de 2 Colunas"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setIsTwoColumns(false)}
                    className={`p-1 rounded-md transition ${!isTwoColumns ? 'bg-[var(--primary)] text-white shadow-xs' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                    title="Lista de 1 Coluna"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* FLOATING DROPDOWN POPOVER (Exact design from user model screenshot) */}
            {isCategoryDropdownOpen && (
              <div className="absolute left-0 right-0 top-14 mt-1 p-4 rounded-2xl bg-[#1e1a1c]/95 dark:bg-[#1a1618]/95 backdrop-blur-2xl border border-[var(--primary)]/40 shadow-2xl z-50 text-white space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#d39a9c]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#d39a9c]">
                      COLEÇÕES DO ATELIER
                    </span>
                  </div>
                  
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-[#d39a9c]/40 text-[#d39a9c] font-bold bg-[#d39a9c]/10">
                    {categories.find(c => c.id === 'todos')?.count || unifiedProducts.length} Peças Ativas
                  </span>
                </div>

                {/* Popover Subhead */}
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 pt-1">
                  COLEÇÕES &amp; CADERNOS
                </div>

                {/* Categories List with Active Indicator and Item Count */}
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {categories.map((cat) => {
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setActiveCategory(cat.id);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl transition text-xs font-medium cursor-pointer ${
                          isActive 
                            ? 'bg-[#d39a9c]/20 text-white border border-[#d39a9c]/40 shadow-sm'
                            : 'hover:bg-white/5 text-white/70 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#d39a9c] shadow-sm' : 'bg-transparent border border-white/40'}`} />
                          <span>{cat.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className={`text-[11px] font-bold ${isActive ? 'text-[#d39a9c]' : 'text-white/50'}`}>
                            {cat.count || 12}
                          </span>
                          {isActive && <Check className="w-3.5 h-3.5 text-[#d39a9c]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Popover Footer Actions */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <button 
                    onClick={() => {
                      setActiveCategory('todos');
                      setIsCategoryDropdownOpen(false);
                    }}
                    className="text-xs text-white/70 hover:text-[#d39a9c] font-medium transition"
                  >
                    Ver todas as {categories.find(c => c.id === 'todos')?.count || unifiedProducts.length} peças →
                  </button>

                  <button 
                    onClick={() => setIsCategoryDropdownOpen(false)}
                    className="px-4 py-1.5 rounded-xl border border-[#d39a9c] text-[#d39a9c] hover:bg-[#d39a9c] hover:text-[#161214] font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
                  >
                    APLICAR FILTRO
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && unifiedProducts.length === 0 ? (
            <div className="luisices-glass p-16 rounded-3xl text-center space-y-3 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
              <p className="font-serif font-bold text-base text-[var(--primary)]">
                Carregando acervo do ateliê...
              </p>
            </div>
          ) : unifiedProducts.length === 0 ? (
            <div className="luisices-glass p-12 rounded-3xl text-center space-y-3">
              <p className="font-serif font-bold text-lg text-[var(--primary)]">
                Nenhum projeto encontrado para "{searchQuery}"
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Tente ajustar os termos de busca ou mudar a categoria selecionada.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('todos'); setSourceFilter('all'); }}
                className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold uppercase tracking-wider"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          ) : (
            <div className={isTwoColumns ? 'grid grid-cols-2 gap-3 sm:gap-4' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8'}>
              {unifiedProducts.map((product) => {
                const isFav = favorites.includes(product.id);
                return (
                  <div 
                    key={product.id}
                    className="group rounded-3xl luisices-glass border border-[var(--glass-border)] overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300"
                  >
                    {/* Image Container with Tag Badges */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-black/5">
                      <img
                        src={product.mainImage}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      
                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                        {product.isArchive ? (
                          <span className="px-2.5 py-1 rounded-lg bg-[#5D5C76]/90 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow">
                            <Scissors className="w-3 h-3" />
                            <span>Acervo 3D</span>
                          </span>
                        ) : product.isBestseller ? (
                          <span className="px-2.5 py-1 rounded-lg bg-[var(--primary)]/90 backdrop-blur-md text-white text-[10px] font-bold shadow">
                            Destaque
                          </span>
                        ) : null}
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={() => toggleFavorite(product.id)}
                        className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md border border-white/40 transition active:scale-90 ${
                          isFav ? 'bg-red-500/90 text-white' : 'bg-white/70 dark:bg-black/60 text-[var(--foreground)] hover:bg-white'
                        }`}
                        title="Favoritar"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                      </button>

                      {/* Quick Finish Chips Floating Overlay */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1 overflow-x-auto scrollbar-none">
                        {(product.tags || []).slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[9px] font-semibold whitespace-nowrap"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
                          <span>{product.categoryLabel}</span>
                          <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                            <Star className="w-3 h-3 fill-current" />
                            <span>5.0</span>
                          </span>
                        </div>

                        <h3 className="font-serif font-bold text-lg text-[var(--primary)] line-clamp-1 group-hover:text-[var(--primary-hover)] transition">
                          {product.title}
                        </h3>

                        <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
                          {product.subtitle || product.description}
                        </p>
                      </div>

                      {/* Materials / Papers Pills */}
                      <div className="flex flex-wrap gap-1">
                        {(product.materials || []).slice(0, 2).map((mat, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)]/80">
                            {mat}
                          </span>
                        ))}
                      </div>

                      {/* Pricing & CTA Row */}
                      <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-[var(--muted-foreground)] uppercase">
                            {product.minQuantity > 1 ? `Min. ${product.minQuantity} un` : 'Sob Encomenda'}
                          </span>
                          <p className="font-serif font-bold text-base text-[var(--primary)]">
                            R$ {product.basePrice.toFixed(2)}
                            <span className="text-[11px] font-normal text-[var(--muted-foreground)]"> /{product.unitLabel || 'un'}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setActiveSampleProduct(product)}
                            className="p-2.5 rounded-xl bg-white/70 dark:bg-white/10 hover:bg-white border border-[var(--glass-border)] text-[var(--foreground)] transition active:scale-95"
                            title="Ver Amostra Tátil"
                          >
                            <Eye className="w-4 h-4 text-[var(--muted-foreground)]" />
                          </button>

                          <button
                            onClick={() => handleOpenCustomizer(product)}
                            className="px-3.5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[var(--primary)]/20 transition active:scale-95"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Personalizar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 4. Brand Differentials */}
        <section className="rounded-3xl luisices-glass p-8 sm:p-10 border border-[var(--glass-border)] space-y-8 shadow-lg">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--primary)]">
              Garantias &amp; Devoção ao Detalhe
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--primary)]">
              O Cuidado de um Ateliê de Afeto
            </h2>
            <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">
              Cada encomenda passa por processos rigorosos de curadoria e acabamento antes de chegar à sua porta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-white/50 dark:bg-white/5 border border-[var(--border)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#613D3E]/10 text-[var(--primary)] flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="font-serif font-bold text-base text-[var(--primary)]">Prova Real &amp; Digital</h4>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Você recebe fotos e vídeos em alta resolução da prova montada para aprovar caligrafia, cores e texturas.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/50 dark:bg-white/5 border border-[var(--border)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#613D3E]/10 text-[var(--primary)] flex items-center justify-center font-bold">
                <Scissors className="w-5 h-5" />
              </div>
              <h4 className="font-serif font-bold text-base text-[var(--primary)]">Silhouette &amp; Montagem Manual</h4>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Precisão computadorizada nos cortes e dobras, aliada ao acabamento manual delicado de flores e laços.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/50 dark:bg-white/5 border border-[var(--border)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#613D3E]/10 text-[var(--primary)] flex items-center justify-center font-bold">
                <Gift className="w-5 h-5" />
              </div>
              <h4 className="font-serif font-bold text-base text-[var(--primary)]">Aroma Exclusivo</h4>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Caixa embalada com papel de seda e borrifada com nosso perfume autoral de flor de laranjeira e baunilha.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/50 dark:bg-white/5 border border-[var(--border)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#613D3E]/10 text-[var(--primary)] flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-serif font-bold text-base text-[var(--primary)]">Garantia de Entrega Segura</h4>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Cronograma com margem de 10 dias de folga antes da sua festa para garantir zero estresse logístico.
              </p>
            </div>
          </div>
        </section>

        {/* 5. WhatsApp Consulting Banner */}
        <section className="rounded-3xl bg-gradient-to-r from-[#613D3E] to-[#4E3031] text-white p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#f4b7b9]">
                Consultoria Direta
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold">
                Deseja um projeto totalmente sob medida?
              </h3>
              <p className="text-xs sm:text-sm text-white/80 max-w-xl">
                Converse diretamente com a designer do ateliê para desenhar brasões personalizados, paletas exclusivas ou topos monumentais.
              </p>
            </div>

            <a
              href={`https://wa.me/${(businessInfo?.whatsapp || '5511999999999').replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Gostaria de uma consultoria personalizada para meu evento.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg transition active:scale-95 whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Chamar no WhatsApp</span>
            </a>
          </div>
        </section>
      </main>

      {/* 6. MODAL: FLUXO DE PERSONALIZAÇÃO & CHECKOUT DE ORÇAMENTO */}
      {activeCustomizingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-3xl rounded-3xl luisices-glass border border-white/60 bg-[#FFF8F7]/95 dark:bg-[#1A1416]/95 p-6 sm:p-8 shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">
                  Personalização &amp; Cronograma
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[var(--primary)]">
                  {activeCustomizingProduct.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveCustomizingProduct(null)}
                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted-foreground)] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkoutSuccess ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center font-bold">
                  <Check className="w-8 h-8" />
                </div>
                <h4 className="font-serif text-2xl font-bold text-[var(--primary)]">
                  Solicitação Encaminhada ao Ateliê!
                </h4>
                <p className="text-xs sm:text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
                  Sua mensagem personalizada foi aberta no WhatsApp e o item foi registrado na sua Sacola de Afeto.
                </p>
                <button
                  onClick={() => setActiveCustomizingProduct(null)}
                  className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-xs font-bold uppercase tracking-wider"
                >
                  Concluir &amp; Fechar
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. SELETOR TÁTIL DE ACABAMENTOS */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>1. Acabamentos Nobres do Ateliê</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(activeCustomizingProduct.availableFinishes || GLOBAL_FINISHES).map((finish) => {
                      const isSelected = Object.values(selectedFinishes).includes(finish.id);
                      return (
                        <div
                          key={finish.id}
                          onClick={() => setSelectedFinishes(prev => ({ ...prev, [finish.category]: finish.id }))}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-white dark:bg-white/10 border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-md'
                              : 'bg-white/40 dark:bg-white/5 border-[var(--border)] hover:bg-white/70'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {finish.swatchHex && (
                                <span 
                                  className="w-4 h-4 rounded-full border border-black/20 shadow-sm flex-shrink-0"
                                  style={{ backgroundColor: finish.swatchHex }}
                                />
                              )}
                              <span className="font-semibold text-xs text-[var(--foreground)]">{finish.name}</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
                              {finish.extraPrice > 0 ? `+R$ ${finish.extraPrice.toFixed(2)}` : 'Incluso'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--muted-foreground)] mt-1.5 pl-6.5">
                            {finish.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. CRONOGRAMA REVERSO & TRAVA DE DATA */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>2. Cronograma Reverso &amp; Trava de Data</span>
                  </h4>

                  <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-[var(--border)] space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] uppercase mb-1">
                          Data da Celebração / Evento
                        </label>
                        <input
                          type="date"
                          value={celebrationDate}
                          onChange={(e) => setCelebrationDate(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-black/40 border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] uppercase mb-1">
                          Nomes ou Iniciais para Gravação
                        </label>
                        <input
                          type="text"
                          value={recipientNames}
                          onChange={(e) => setRecipientNames(e.target.value)}
                          placeholder="Ex: Luísa & Gabriel / Sofia 1 Aninho"
                          className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-black/40 border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                        />
                      </div>
                    </div>

                    {/* Timeline Milestones Visualization */}
                    {timeline && (
                      <div className="p-3.5 rounded-xl bg-[#5D5C76]/10 border border-[#5D5C76]/20 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-[#5D5C76] dark:text-[#B9B5D4]">
                          <span>🗓️ Previsão de Envio com Folga de Segurança:</span>
                          <span className="underline">{timeline.shipDateFmt}</span>
                        </div>
                        <p className="text-[11px] text-[var(--muted-foreground)]">
                          ✨ A prova física/digital será enviada para sua aprovação até <strong>{timeline.proofDateFmt}</strong>.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. QUANTIDADE & COMPOSIÇÃO ABERTA DE CUSTOS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[var(--primary)]" />
                      <span>3. Quantidade &amp; Composição de Custos</span>
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--muted-foreground)] font-medium">Quantidade:</span>
                      <input
                        type="number"
                        min={activeCustomizingProduct.minQuantity || 1}
                        value={customQty}
                        onChange={(e) => setCustomQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 px-2 py-1 rounded-lg text-center text-xs font-bold bg-white dark:bg-black/40 border border-[var(--border)]"
                      />
                    </div>
                  </div>

                  {/* Open Cost Breakdown */}
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-[var(--border)] space-y-2 text-xs">
                    <div className="flex justify-between text-[var(--muted-foreground)]">
                      <span>Papel de Algodão &amp; Insumos Certificados</span>
                      <span>R$ {(customQty * (activeCustomizingProduct.basePrice * 0.45)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[var(--muted-foreground)]">
                      <span>Manufatura Silhouette + Caligrafia + Montagem 3D</span>
                      <span>R$ {(customQty * (activeCustomizingProduct.basePrice * 0.55)).toFixed(2)}</span>
                    </div>
                    {currentUnitExtras > 0 && (
                      <div className="flex justify-between text-[var(--muted-foreground)]">
                        <span>Acabamentos Especiais Selecionados</span>
                        <span>+R$ {(customQty * currentUnitExtras).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-[var(--border)] flex justify-between font-bold text-sm text-[var(--primary)]">
                      <span>Total do Projeto ({customQty} un)</span>
                      <span>R$ {currentSubtotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* 4. MODELO DE PAGAMENTO FACILITADO DO ATELIÊ */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>4. Modelo de Pagamento Facilitado do Ateliê</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option 1: 50% / 50% */}
                    <div
                      onClick={() => setPaymentOption('split_50_50')}
                      className={`p-4 rounded-2xl border cursor-pointer transition ${
                        paymentOption === 'split_50_50'
                          ? 'bg-white dark:bg-white/10 border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-md'
                          : 'bg-white/40 dark:bg-white/5 border-[var(--border)]'
                      }`}
                    >
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--primary)] text-white uppercase">
                        2x Sem Juros no Ateliê
                      </span>
                      <h5 className="font-serif font-bold text-sm text-[var(--primary)] mt-2">
                        Sinal de 50% Hoje + 50% na Prova
                      </h5>
                      <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                        Reserve sua data na agenda com <strong>R$ {currentDeposit50.toFixed(2)}</strong> e pague o restante após aprovar a prova.
                      </p>
                    </div>

                    {/* Option 2: Pix Discount */}
                    <div
                      onClick={() => setPaymentOption('pix_full_discount')}
                      className={`p-4 rounded-2xl border cursor-pointer transition ${
                        paymentOption === 'pix_full_discount'
                          ? 'bg-white dark:bg-white/10 border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-md'
                          : 'bg-white/40 dark:bg-white/5 border-[var(--border)]'
                      }`}
                    >
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white uppercase">
                        5% de Desconto à Vista
                      </span>
                      <h5 className="font-serif font-bold text-sm text-emerald-700 dark:text-emerald-400 mt-2">
                        R$ {currentPixTotal.toFixed(2)} via Pix
                      </h5>
                      <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                        Economia de R$ {currentPixDiscount.toFixed(2)} com aprovação prioritária na agenda.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-[var(--muted-foreground)] uppercase">
                      {paymentOption === 'split_50_50' ? 'Sinal para Reserva da Data' : 'Valor Total via Pix'}
                    </span>
                    <p className="font-serif font-bold text-xl text-[var(--primary)]">
                      R$ {(paymentOption === 'split_50_50' ? currentDeposit50 : currentPixTotal).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleSendWhatsAppOrder}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>Reservar Data no Ateliê</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. MODAL: VER AMOSTRA TÁTIL */}
      {activeSampleProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl luisices-glass border border-white/60 bg-[#FFF8F7]/95 dark:bg-[#1A1416]/95 p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-serif text-lg font-bold text-[var(--primary)]">
                Amostra Sensorial do Projeto
              </h3>
              <button
                onClick={() => setActiveSampleProduct(null)}
                className="p-1.5 rounded-full hover:bg-black/10 text-[var(--muted-foreground)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[var(--border)]">
              <img
                src={activeSampleProduct.mainImage}
                alt={activeSampleProduct.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-serif font-bold text-base text-[var(--primary)]">
                {activeSampleProduct.title}
              </h4>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                {activeSampleProduct.description}
              </p>
              <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-1">
                <span className="font-bold text-[var(--primary)]">Detalhes de Confecção:</span>
                <ul className="list-disc pl-4 text-[11px] text-[var(--muted-foreground)] space-y-0.5">
                  {(activeSampleProduct.details || []).map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveSampleProduct(null)}
                className="px-4 py-2 rounded-xl bg-white/60 dark:bg-white/10 text-xs font-bold"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  const p = activeSampleProduct;
                  setActiveSampleProduct(null);
                  handleOpenCustomizer(p);
                }}
                className="px-5 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold"
              >
                Personalizar Agora
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 8. FIXED BOTTOM NAVIGATION BAR (Exact design from model screenshot) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#1b1719]/95 dark:bg-[#161214]/95 backdrop-blur-2xl border-t border-white/10 px-4 flex items-center justify-around text-white shadow-2xl">
        {/* Tab 1: HOME */}
        <button 
          onClick={() => setActiveBottomNav('home')}
          className={`flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
            activeBottomNav === 'home' ? 'text-[#d39a9c] font-bold' : 'text-white/60 hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wider font-semibold">HOME</span>
        </button>

        {/* Tab 2: PEDIDOS (Active Highlighted Tab) */}
        <button 
          onClick={() => setActiveBottomNav('pedidos')}
          className={`px-3 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition cursor-pointer relative ${
            activeBottomNav === 'pedidos' 
              ? 'bg-[#d39a9c]/20 text-[#d39a9c] border border-[#d39a9c]/40 font-bold shadow-sm' 
              : 'text-white/60 hover:text-white'
          }`}
        >
          <ClipboardList className="w-5 h-5 text-[#d39a9c]" />
          <span className="text-[9px] uppercase tracking-wider font-bold">PEDIDOS</span>
        </button>

        {/* Tab 3: CLIENTES */}
        <button 
          onClick={() => setActiveBottomNav('clientes')}
          className={`flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
            activeBottomNav === 'clientes' ? 'text-[#d39a9c] font-bold' : 'text-white/60 hover:text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wider font-semibold">CLIENTES</span>
        </button>

        {/* Tab 4: RELATÓRIOS */}
        <button 
          onClick={() => setActiveBottomNav('relatorios')}
          className={`flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
            activeBottomNav === 'relatorios' ? 'text-[#d39a9c] font-bold' : 'text-white/60 hover:text-white'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wider font-semibold">RELATÓRIOS</span>
        </button>

        {/* Tab 5: MAIS */}
        <button 
          onClick={() => setActiveBottomNav('mais')}
          className={`flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
            activeBottomNav === 'mais' ? 'text-[#d39a9c] font-bold' : 'text-white/60 hover:text-white'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wider font-semibold">MAIS</span>
        </button>
      </nav>
    </div>
  );
};

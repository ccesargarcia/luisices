import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  ShoppingBag, 
  Sun, 
  Moon, 
  Clock, 
  Sparkles, 
  MessageCircle, 
  Check, 
  Plus, 
  Minus, 
  Trash2, 
  X, 
  Send, 
  Heart, 
  Instagram, 
  Eye, 
  MapPin, 
  Globe, 
  ArrowUpDown, 
  ShieldCheck, 
  Truck,
  Sparkle
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BannerCarousel, CatalogBannerItem } from '../components/catalog/BannerCarousel';

export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  leadTimeDays: number;
  imageUrl: string;
  badge?: string;
  isCustomizable?: boolean;
}

export interface CartItem {
  product: CatalogProduct;
  quantity: number;
  customName?: string;
}

export function PublicCatalog() {
  // Controle de tema: a lojinha é SEMPRE tema Claro como padrão (default)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<string>('destaque');

  // Produtos reais carregados em tempo real via Firestore (IndexedDB nativo do SDK)
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Limpeza de caches antigos de versões anteriores no localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('luisices_public_catalog_products');
      localStorage.removeItem('luisices_public_store_settings');
    } catch {}
  }, []);

  // Informações do negócio e customizações da lojinha
  const [businessInfo, setBusinessInfo] = useState(() => ({
    name: 'Luisices Papelaria Personalizada',
    tagline: 'Papelaria artesanal feita à mão para momentos únicos',
    whatsapp: '5511999999999',
    instagram: 'luisicesatelie',
    website: '',
    logo: '',
    banner: '',
    banners: [] as CatalogBannerItem[],
    bannerInterval: 5,
    bannerAutoPlay: true,
    bannerFixed: false,
    headerBackground: '',
    headerBgColor: '',
    headerTextColor: 'dark', // 'dark' | 'light'
    headerLogoPosition: 'left', // 'left' | 'center' | 'full'
    headerHeight: 'normal', // 'compact' | 'normal' | 'large'
    headerHideText: false,
    badge: 'Atelier Afetivo',
    statusText: 'Atendimento WhatsApp ativo',
    announcement: '✨ Encomendas abertas com envio carinhoso para todo o Brasil!',
    showHero: true,
    heroTitle: 'Catálogo & Vitrine Afetiva',
    heroDescription: 'Escolha suas peças, informe o nome para personalização e envie o pedido formatado diretamente no nosso WhatsApp.',
    whatsappGreeting: 'Olá! Gostaria de encomendar pelo catálogo do Ateliê:',
    whatsappCustomizationLabel: 'Nome/Personalização:',
    whatsappFooter: 'Poderia me passar as opções de frete/retirada e a chave PIX para confirmar?',
    footerText: 'Papelaria artesanal feita à mão com afeto e dedicação para eternizar momentos únicos. ❤️',
    footerLocation: 'Enviamos com carinho para todo o Brasil 📦',
    footerBusinessHours: 'Segunda a Sexta, das 9h às 18h',
    footerNotice: 'Produção artesanal sob encomenda. Os prazos começam a contar após a aprovação da arte.',
    footerCopyright: `© ${new Date().getFullYear()} Luisices. Todos os direitos reservados.`,
  }));

  // Estado da Sacola com persistência em localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('luisices_catalog_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedProductPreview, setSelectedProductPreview] = useState<CatalogProduct | null>(null);
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [previewCustomName, setPreviewCustomName] = useState<string>('');
  const [logoError, setLogoError] = useState<boolean>(false);
  const [headerBgError, setHeaderBgError] = useState<boolean>(false);

  useEffect(() => {
    setLogoError(false);
  }, [businessInfo.logo]);

  useEffect(() => {
    setHeaderBgError(false);
  }, [businessInfo.headerBackground]);

  // Isolar o tema da lojinha: a lojinha é SEMPRE claro por padrão e NUNCA altera o tema administrativo
  useEffect(() => {
    const root = document.documentElement;
    const adminTheme = localStorage.getItem('theme') || 'system';
    const systemPrefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const adminIsDark = adminTheme === 'dark' || (adminTheme === 'system' && systemPrefersDark);

    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    return () => {
      // Ao sair do catálogo para o painel administrativo, restaura fielmente o tema escolhido pelo usuário
      if (adminIsDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    };
  }, [isDarkMode]);

  // Alternar tema Claro / Escuro da lojinha (sem alterar o tema administrativo)
  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Salvar carrinho
  useEffect(() => {
    try {
      localStorage.setItem('luisices_catalog_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Escutar configurações públicas da loja em tempo real via onSnapshot
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'storeSettings', 'public'),
      (publicSettingsSnap) => {
        if (publicSettingsSnap.exists()) {
          const s = publicSettingsSnap.data();
          setBusinessInfo((prev: typeof businessInfo) => ({
            name: s.businessName !== undefined && s.businessName !== '' ? s.businessName : prev.name,
            tagline: s.businessTagline !== undefined ? s.businessTagline : prev.tagline,
            whatsapp: s.catalogWhatsappPhone || s.whatsappPhone || s.businessPhone || prev.whatsapp,
            instagram: s.instagramUrl ? s.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '') : prev.instagram,
            website: s.websiteUrl || prev.website,
            logo: s.catalogLogo || '',
            banner: s.catalogBanner || '',
            banners: Array.isArray(s.catalogBanners) && s.catalogBanners.length > 0
              ? (s.catalogBanners as CatalogBannerItem[])
              : (s.catalogBanner ? [{ id: 'b-default', imageUrl: s.catalogBanner }] : (prev.banners || [])),
            bannerInterval: Number(s.catalogBannerInterval) || prev.bannerInterval || 5,
            bannerAutoPlay: s.catalogBannerAutoPlay !== undefined ? Boolean(s.catalogBannerAutoPlay) : (prev.bannerAutoPlay ?? true),
            bannerFixed: s.catalogBannerFixed !== undefined ? Boolean(s.catalogBannerFixed) : (prev.bannerFixed ?? false),
            headerBackground: s.catalogHeaderBackground !== undefined ? s.catalogHeaderBackground : (prev.headerBackground || ''),
            headerBgColor: s.catalogHeaderBgColor !== undefined ? s.catalogHeaderBgColor : (prev.headerBgColor || ''),
            headerTextColor: s.catalogHeaderTextColor || prev.headerTextColor || 'dark',
            headerLogoPosition: s.catalogHeaderLogoPosition || prev.headerLogoPosition || 'left',
            headerHeight: s.catalogHeaderHeight || prev.headerHeight || 'normal',
            headerHideText: s.catalogHeaderHideText !== undefined ? Boolean(s.catalogHeaderHideText) : (prev.headerHideText || false),
            badge: s.catalogBadge !== undefined ? s.catalogBadge : prev.badge,
            statusText: s.catalogStatusText !== undefined ? s.catalogStatusText : prev.statusText,
            announcement: s.catalogAnnouncement !== undefined ? s.catalogAnnouncement : prev.announcement,
            heroTitle: s.catalogHeroTitle !== undefined ? s.catalogHeroTitle : prev.heroTitle,
            heroDescription: s.catalogHeroDescription !== undefined ? s.catalogHeroDescription : prev.heroDescription,
            showHero: s.catalogShowHero !== undefined ? Boolean(s.catalogShowHero) : (prev.showHero ?? true),
            whatsappGreeting: s.catalogWhatsappGreeting !== undefined ? s.catalogWhatsappGreeting : prev.whatsappGreeting,
            whatsappCustomizationLabel: s.catalogWhatsappCustomizationLabel !== undefined ? s.catalogWhatsappCustomizationLabel : prev.whatsappCustomizationLabel,
            whatsappFooter: s.catalogWhatsappFooter !== undefined ? s.catalogWhatsappFooter : prev.whatsappFooter,
            footerText: s.catalogFooterText !== undefined ? s.catalogFooterText : prev.footerText,
            footerLocation: s.catalogFooterLocation !== undefined ? s.catalogFooterLocation : prev.footerLocation,
            footerBusinessHours: s.catalogFooterBusinessHours !== undefined ? s.catalogFooterBusinessHours : prev.footerBusinessHours,
            footerNotice: s.catalogFooterNotice !== undefined ? s.catalogFooterNotice : prev.footerNotice,
            footerCopyright: s.catalogFooterCopyright !== undefined ? s.catalogFooterCopyright : prev.footerCopyright,
          }));
        }
      },
      (settingsErr) => {
        console.warn('Configurações públicas locais em uso:', settingsErr);
      }
    );

    return () => unsubscribe();
  }, []);

  // Escutar produtos da vitrine em tempo real via onSnapshot
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'storeProducts'),
      (snap) => {
        const storeList: CatalogProduct[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.name && Number(data.price ?? data.unitPrice) > 0 && data.active !== false) {
            storeList.push({
              id: d.id,
              name: data.name,
              category: data.category || 'Geral',
              price: Number(data.price ?? data.unitPrice) || 0,
              description: data.description || 'Produto artesanal confeccionado com carinho sob encomenda.',
              leadTimeDays: Number(data.leadTimeDays) || 5,
              imageUrl: data.imageUrl || data.photoUrl || (data.images && data.images[0]) || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
              badge: data.badge || undefined,
              isCustomizable: data.isCustomizable ?? true,
            });
          }
        });
        setProducts(storeList);
        setLoadingProducts(false);

        // Sincronizar carrinho: atualizar dados/preços vigentes e remover itens que foram excluídos da vitrine
        setCart((prevCart) => {
          if (!prevCart || prevCart.length === 0) return prevCart;
          const updatedCart: CartItem[] = [];
          for (const item of prevCart) {
            const current = storeList.find((p) => p.id === item.product.id);
            if (current) {
              updatedCart.push({
                ...item,
                product: current,
              });
            }
          }
          return updatedCart;
        });
      },
      (err) => {
        console.warn('Erro ao escutar produtos da vitrine pública:', err);
        setLoadingProducts(false);
      }
    );

    return () => unsubscribe();
  }, []);



  // Travar o scroll de fundo enquanto modal ou sacola estiverem abertos
  const isAnyModalOpen = Boolean(isCartOpen || selectedProductPreview);

  useEffect(() => {
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isAnyModalOpen]);

  // Categorias dinâmicas derivadas dos produtos
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    const unique = Array.from(set).sort((a, b) => a.localeCompare(b));
    return ['todos', ...unique];
  }, [products]);

  // Filtragem dinâmica e ordenação
  const filteredProducts = useMemo(() => {
    let list = products.filter((prod) => {
      const matchesCat = selectedCategory === 'todos' || prod.category.toLowerCase() === selectedCategory.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || prod.name.toLowerCase().includes(q) || prod.description.toLowerCase().includes(q) || prod.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });

    switch (sortBy) {
      case 'preco-menor':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'preco-maior':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'nome-az':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'prazo':
        list.sort((a, b) => a.leadTimeDays - b.leadTimeDays);
        break;
      default:
        // 'destaque' mantém a ordem natural
        break;
    }

    return list;
  }, [products, selectedCategory, searchQuery, sortBy]);

  // Cálculos do Carrinho
  const totalItemsCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0), [cart]);

  // Higienização de links externos para prevenir esquemas maliciosos (ex: javascript:)
  const sanitizedWebsiteUrl = useMemo(() => {
    if (!businessInfo.website) return null;
    const trimmed = businessInfo.website.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+/i.test(trimmed) && !trimmed.includes(':')) {
      return `https://${trimmed}`;
    }
    return null;
  }, [businessInfo.website]);

  const cleanInstagram = useMemo(() => {
    if (!businessInfo.instagram) return '';
    return businessInfo.instagram.replace(/[^a-zA-Z0-9._]/g, '');
  }, [businessInfo.instagram]);

  // Ações da Sacola
  const addToCart = useCallback((product: CatalogProduct, customName?: string, quantity: number = 1) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && (item.customName || '') === (customName || '')
      );
      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { product, quantity, customName: customName || undefined }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number, customName?: string) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId && (item.customName || '') === (customName || '')) {
            const newQ = item.quantity + delta;
            return newQ > 0 ? { ...item, quantity: newQ } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  }, []);

  // Envio de Pedido no WhatsApp com Deep Link formatado
  const handleSendToWhatsApp = () => {
    const cleanPhone = businessInfo.whatsapp.replace(/\D/g, '');
    const greeting = businessInfo.whatsappGreeting || `🌸 *Olá, ${businessInfo.name}! Gostaria de fazer uma encomenda pelo Catálogo:*`;
    const labelCustom = businessInfo.whatsappCustomizationLabel || 'Personalização/Nome:';
    const footerMsg = businessInfo.whatsappFooter || 'Poderia me passar as opções de frete/retirada e a chave PIX para confirmar?';

    let msg = `${greeting}\n\n`;

    cart.forEach((item, index) => {
      msg += `*Item ${index + 1}:* ${item.product.name}\n`;
      msg += `• Quantidade: ${item.quantity}x\n`;
      msg += `• Valor unitário: ${formatCurrency(item.product.price)}\n`;
      if (item.customName) {
        msg += `• ${labelCustom} ${item.customName}\n`;
      }
      msg += `• Prazo de confecção: até ${item.product.leadTimeDays} dias úteis\n\n`;
    });

    msg += `✨ *Subtotal Estimado:* ${formatCurrency(subtotal)}\n`;
    if (customerNotes.trim()) {
      msg += `📝 *Observações / Data do Evento:* ${customerNotes}\n`;
    }
    msg += `\n${footerMsg}`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  };

  const handleOpenPreview = (product: CatalogProduct) => {
    setSelectedProductPreview(product);
    setPreviewCustomName('');
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      {/* 
        Container Principal com Iluminação Atmosférica Radial (Glassmorphism & Depth)
      */}
      <div
        className="min-h-[100dvh] text-[#221a1a] dark:text-[#e8e0e3] transition-colors duration-300 font-sans pb-28
        bg-[#fff8f7] dark:bg-[#161214]
        [background-image:linear-gradient(135deg,#fceee9_0%,#fff8f7_52%,#ede7f6_100%)]
        dark:[background-image:none]
        relative selection:bg-[#613d3e] selection:text-white"
      >
        {/* Camada de Gradientes Atmosféricos Fixos */}
        <div className="fixed inset-0 pointer-events-none opacity-80 dark:opacity-40 z-0">
          <div className="absolute top-0 left-0 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full bg-[#f7d6d0] dark:bg-[#5b3234] blur-3xl -translate-x-1/3 -translate-y-1/3" />
          <div className="absolute top-1/3 right-0 w-80 sm:w-[450px] h-80 sm:h-[450px] rounded-full bg-[#d1c4e9] dark:bg-[#28192d] blur-3xl translate-x-1/4" />
          <div className="absolute bottom-10 left-1/4 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full bg-[#bbdefb] dark:bg-[#121c20] blur-3xl" />
        </div>

        {/* Barra de Aviso / Alerta Promocional (se preenchido no painel) */}
        {businessInfo.announcement && (
          <aside aria-label="Aviso do ateliê" className="relative z-20 px-4 py-2 bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/20 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-semibold text-center flex items-center justify-center gap-2 backdrop-blur-md">
            <Sparkles size={14} className="shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
            <span className="truncate max-w-2xl">{businessInfo.announcement}</span>
          </aside>
        )}

        {/* 1. CABEÇALHO FIXO DA LOJINHA (APENAS A BARRA FIXA COM A IMAGEM) */}
        <header
          className="sticky top-0 z-30 transition-all duration-200 border-b shadow-xs relative overflow-hidden w-full flex items-center justify-center select-none"
          style={{
            backgroundColor: businessInfo.headerBgColor || (isDarkMode ? '#1f191b' : '#ffffff'),
            height:
              businessInfo.headerHeight === 'compact'
                ? '56px'
                : businessInfo.headerHeight === 'large'
                ? '96px'
                : '76px',
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
          }}
        >
          {businessInfo.headerBackground && !headerBgError ? (
            <img
              src={businessInfo.headerBackground}
              alt="Barra do ateliê"
              onError={() => setHeaderBgError(true)}
              className="w-full h-full object-cover object-center pointer-events-none"
            />
          ) : businessInfo.logo && !logoError ? (
            <div className="h-full py-2 flex items-center justify-center px-4">
              <img
                src={businessInfo.logo}
                alt={businessInfo.name}
                onError={() => setLogoError(true)}
                className="max-h-full w-auto object-contain drop-shadow-xs"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center px-4">
              <span className={`font-black text-base sm:text-lg tracking-tight ${
                businessInfo.headerTextColor === 'light' ? 'text-white' : 'text-[#613d3e] dark:text-[#f4b7b9]'
              }`}>
                {businessInfo.name}
              </span>
            </div>
          )}
        </header>

        {/* 2. BARRA DE AÇÕES DA LOJINHA: BUSCA, SACOLA, REDES & TEMA (LOCALIZADA EM OUTRA ÁREA) */}
        <section aria-label="Busca e sacola da loja" className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4">
          <div className="bg-white/90 dark:bg-[#1f191b]/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-stone-200/70 dark:border-[#ebcdcd]/15 p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            
            {/* Campo de Busca Principal Amplo */}
            <div className="w-full sm:flex-1 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
              <input
                type="text"
                placeholder="Buscar produtos, temas, lembranças..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-base sm:text-sm rounded-xl sm:rounded-2xl bg-stone-100/90 dark:bg-[#161214]/90 border border-stone-200/80 dark:border-stone-700 text-[#221a1a] dark:text-[#e8e0e3] placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#613d3e]/30 dark:focus:ring-[#f4b7b9]/30 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                  title="Limpar busca"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Ações: Instagram, Alternador de Tema e Sacola de Encomendas */}
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {cleanInstagram && (
                  <a
                    href={`https://instagram.com/${cleanInstagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-medium bg-stone-100/90 dark:bg-[#2b2225]/80 hover:bg-stone-200/80 dark:hover:bg-[#34292d] text-stone-700 dark:text-stone-200 border border-stone-200/80 dark:border-[#ebcdcd]/20 transition-all shadow-2xs cursor-pointer"
                    title="Instagram do ateliê"
                  >
                    <Instagram size={15} className="text-[#E1306C]" />
                    <span className="hidden md:inline text-xs">@{cleanInstagram}</span>
                  </a>
                )}

                <button
                  onClick={toggleTheme}
                  title={isDarkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
                  className="p-2.5 rounded-xl sm:rounded-2xl bg-stone-100/90 dark:bg-[#2b2225]/80 hover:bg-stone-200/80 dark:hover:bg-[#34292d] text-[#504444] dark:text-[#e8e0e3] border border-stone-200/80 dark:border-[#ebcdcd]/20 transition-all shadow-2xs cursor-pointer"
                  aria-label="Alternar tema"
                >
                  {isDarkMode ? <Sun size={16} className="text-[#fbbf24]" /> : <Moon size={16} className="text-[#613d3e]" />}
                </button>
              </div>

              {/* Botão Principal da Sacola com Subtotal */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl sm:rounded-2xl bg-[#613d3e] dark:bg-[#f4b7b9] text-white dark:text-[#4c2527] hover:opacity-95 active:scale-98 transition-all shadow-sm font-bold text-xs sm:text-sm cursor-pointer"
                aria-label="Abrir sacola de encomendas"
              >
                <div className="relative">
                  <ShoppingBag size={17} />
                  {totalItemsCount > 0 && (
                    <span className="absolute -top-2 -right-2 size-4.5 bg-amber-400 text-stone-950 text-[10px] font-black rounded-full flex items-center justify-center tabular-nums shadow-xs">
                      {totalItemsCount}
                    </span>
                  )}
                </div>
                <span>{totalItemsCount > 0 ? formatCurrency(subtotal) : 'Sacola'}</span>
                {totalItemsCount > 0 && (
                  <span className="text-[11px] opacity-85 font-normal">({totalItemsCount})</span>
                )}
              </button>
            </div>

          </div>
        </section>

        {/* Banner de Capa Rotativo / Carrossel Panorâmico (se cadastrado) */}
        {((businessInfo.banners && businessInfo.banners.length > 0) || businessInfo.banner) && (
          <div className="w-full relative z-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4">
              <BannerCarousel
                banners={
                  businessInfo.banners && businessInfo.banners.length > 0
                    ? businessInfo.banners
                    : [{ id: 'b-default', imageUrl: businessInfo.banner }]
                }
                intervalSeconds={businessInfo.bannerInterval}
                autoPlay={businessInfo.bannerAutoPlay}
                storeName={businessInfo.name}
              />
            </div>
          </div>
        )}

        {/* 2. Conteúdo Principal Responsivo (Desktop até max-w-7xl) */}
        <main className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6 sm:space-y-8">
            
            {/* Bloco de Apresentação da Loja & Selos de Confiança (Opcional) */}
            {businessInfo.showHero && (
              <section className="relative rounded-3xl bg-white/80 dark:bg-[#1f191b]/85 backdrop-blur-md border border-white/60 dark:border-[#ebcdcd]/15 p-5 sm:p-7 shadow-[0_8px_30px_rgb(0_0_0/4%)] dark:shadow-[0_16px_40px_-8px_rgb(0_0_0/50%)] space-y-3.5">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {businessInfo.logo && !logoError && (
                      <div className="relative h-14 sm:h-16 w-auto min-w-[56px] max-w-[120px] rounded-xl overflow-hidden bg-stone-100/80 dark:bg-[#161214]/60 p-1 flex items-center justify-center shrink-0 border border-stone-200/60 dark:border-stone-800 shadow-2xs">
                        <img
                          src={businessInfo.logo}
                          alt={businessInfo.name}
                          onError={() => setLogoError(true)}
                          className="max-h-full w-auto object-contain"
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-[#221a1a] dark:text-[#e8e0e3] leading-tight">
                        {businessInfo.name}
                      </h2>
                      {businessInfo.tagline && (
                        <p className="text-sm sm:text-base font-medium text-[#613d3e] dark:text-[#f4b7b9] leading-snug">
                          {businessInfo.tagline}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Selo & Status de Atendimento */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#613d3e]/10 dark:bg-[#f4b7b9]/15 text-[#613d3e] dark:text-[#f4b7b9]">
                      {businessInfo.badge || 'Atelier Afetivo'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#504444] dark:text-[#c9c0b8] font-medium bg-stone-100/80 dark:bg-[#161214]/60 px-3 py-1 rounded-full border border-stone-200/60 dark:border-stone-800">
                      <span className="size-2 rounded-full bg-[#10B981] animate-pulse shrink-0" />
                      {businessInfo.statusText || 'Atendimento WhatsApp ativo'}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#504444] dark:text-[#c9c0b8] leading-relaxed max-w-2xl">
                  {businessInfo.heroDescription || 'Escolha suas peças, informe o nome para personalização e envie o pedido formatado diretamente no nosso WhatsApp.'}
                </p>

                {/* Destaques de confiança (Pills informativas) */}
                <div className="pt-1 flex flex-wrap gap-2 text-[11px] text-[#504444] dark:text-[#c9c0b8] font-medium">
                  <span className="inline-flex items-center gap-1 bg-stone-100/80 dark:bg-[#161214]/60 px-2.5 py-1 rounded-full border border-stone-200/60 dark:border-stone-800">
                    <Sparkle size={12} className="text-[#613d3e] dark:text-[#f4b7b9]" /> Feito à mão com afeto
                  </span>
                  <span className="inline-flex items-center gap-1 bg-stone-100/80 dark:bg-[#161214]/60 px-2.5 py-1 rounded-full border border-stone-200/60 dark:border-stone-800">
                    <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400" /> Aprovação da arte prévia
                  </span>
                  <span className="inline-flex items-center gap-1 bg-stone-100/80 dark:bg-[#161214]/60 px-2.5 py-1 rounded-full border border-stone-200/60 dark:border-stone-800">
                    <Truck size={12} className="text-sky-600 dark:text-sky-400" /> Envio seguro para todo Brasil
                  </span>
                </div>

              </section>
            )}

          {/* Barra de Filtros & Ordenação (Estilo Stoqui Shop) */}
          <div className="space-y-3">
            {/* Categorias (Scroll no mobile, flex-wrap no desktop) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 sm:flex-wrap scrollbar-none">
              {categories.map((cat) => {
                const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-[#613d3e] dark:bg-[#f4b7b9] text-white dark:text-[#4c2527] shadow-sm scale-102'
                        : 'bg-white/70 dark:bg-[#1f191b]/80 border border-stone-200/70 dark:border-[#ebcdcd]/15 text-[#504444] dark:text-[#c9c0b8] hover:bg-white dark:hover:bg-[#2b2225]'
                    }`}
                  >
                    {cat === 'todos' && <Sparkles size={12} />}
                    <span>{cat === 'todos' ? 'Todos os produtos' : cat}</span>
                  </button>
                );
              })}
            </div>

            {/* Barra de Contagem e Seletor de Ordenação */}
            <div className="flex items-center justify-between gap-2 text-xs text-[#504444] dark:text-[#c9c0b8] pt-1">
              <span className="font-medium">
                <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
              </span>

              <div className="flex items-center gap-1.5">
                <ArrowUpDown size={13} className="text-stone-400" />
                <label htmlFor="catalog-sort" className="hidden sm:inline text-stone-500 font-medium">
                  Ordenar:
                </label>
                <select
                  id="catalog-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-white/80 dark:bg-[#1f191b]/90 border border-stone-200 dark:border-stone-700 text-[#221a1a] dark:text-[#e8e0e3] focus:outline-none focus:ring-1 focus:ring-[#613d3e] cursor-pointer"
                >
                  <option value="destaque">Destaques</option>
                  <option value="preco-menor">Menor preço</option>
                  <option value="preco-maior">Maior preço</option>
                  <option value="nome-az">Nome (A - Z)</option>
                  <option value="prazo">Menor prazo</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Grid Responsivo de Produtos: 2 colunas mobile / 3 tablet / 4 desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
            {loadingProducts && products.length === 0 ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="flex flex-col h-full rounded-2xl bg-white/70 dark:bg-[#1f191b]/85 border border-white/60 dark:border-[#ebcdcd]/15 p-3 space-y-3 animate-pulse"
                >
                  <div className="aspect-square w-full rounded-xl bg-stone-200/80 dark:bg-stone-800" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-1/3 rounded bg-stone-200/70 dark:bg-stone-800" />
                    <div className="h-4 w-4/5 rounded bg-stone-200/80 dark:bg-stone-800" />
                  </div>
                  <div className="h-8 w-full rounded-xl bg-stone-200/80 dark:bg-stone-800 mt-2" />
                </div>
              ))
            ) : (
              filteredProducts.map((prod) => (
                <article
                  key={prod.id}
                  className="group flex flex-col h-full rounded-2xl bg-white/70 dark:bg-[#1f191b]/85 backdrop-blur-md border border-white/60 dark:border-[#ebcdcd]/15 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden"
                >
                  {/* Imagem do Produto (Aspect-Square padrão e-commerce) */}
                  <div 
                    className="relative aspect-square w-full overflow-hidden bg-stone-100 dark:bg-stone-900 cursor-pointer"
                    onClick={() => handleOpenPreview(prod)}
                  >
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="bg-white/95 dark:bg-black/90 text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md text-stone-900 dark:text-stone-100">
                        <Eye size={13} /> Ver detalhes
                      </span>
                    </div>

                    {/* Badge de Destaque / Categoria */}
                    {prod.badge && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#613d3e]/90 dark:bg-[#f4b7b9]/90 text-white dark:text-[#4c2527] backdrop-blur-xs shadow-xs">
                        {prod.badge}
                      </span>
                    )}

                    {/* Preço sobre a imagem em telas pequenas */}
                    <span className="sm:hidden absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-white/95 dark:bg-[#161214]/95 text-[#221a1a] dark:text-[#e8e0e3] backdrop-blur-xs tabular-nums shadow-xs">
                      {formatCurrency(prod.price)}
                    </span>
                  </div>

                  {/* Detalhes do Produto */}
                  <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div className="space-y-1">
                      <span className="text-[10px] sm:text-[11px] font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider block truncate">
                        {prod.category}
                      </span>
                      <h3 
                        className="text-xs sm:text-sm font-bold text-[#221a1a] dark:text-[#e8e0e3] line-clamp-2 leading-snug cursor-pointer group-hover:text-[#613d3e] dark:group-hover:text-[#f4b7b9] transition-colors"
                        onClick={() => handleOpenPreview(prod)}
                        title={prod.name}
                      >
                        {prod.name}
                      </h3>
                    </div>

                    {/* Prazo de Confecção, Selo Personalizável & Preço Desktop */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md">
                          <Clock size={11} />
                          <span>Até {prod.leadTimeDays} dias úteis</span>
                        </div>
                        {prod.isCustomizable && (
                          <span className="text-[10px] font-semibold text-[#613d3e] dark:text-[#f4b7b9] inline-flex items-center gap-0.5">
                            <Sparkles size={10} /> Personalizável
                          </span>
                        )}
                      </div>

                      <div className="hidden sm:flex items-baseline justify-between pt-0.5">
                        <span className="text-xs text-stone-400 font-medium">Valor:</span>
                        <span className="text-base font-extrabold text-[#613d3e] dark:text-[#f4b7b9] tabular-nums">
                          {formatCurrency(prod.price)}
                        </span>
                      </div>
                    </div>

                    {/* Botão de Adição à Sacola / Carrinho */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (prod.isCustomizable) {
                          handleOpenPreview(prod);
                        } else {
                          addToCart(prod);
                          setIsCartOpen(true);
                        }
                      }}
                      className="w-full mt-2 py-2 sm:py-2.5 px-3 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 bg-[#613d3e] dark:bg-[#f4b7b9] text-white dark:text-[#4c2527] hover:opacity-95 active:scale-98 transition-all shadow-xs cursor-pointer"
                      title={prod.isCustomizable ? 'Personalizar e adicionar à sacola' : 'Adicionar à sacola de encomendas'}
                      aria-label="Adicionar ao carrinho"
                    >
                      <ShoppingBag size={13} className="shrink-0" />
                      <span>Adicionar à Sacola</span>
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* Feedback de Busca Vazia / Catálogo Vazio */}
          {!loadingProducts && filteredProducts.length === 0 && (
            <div className="text-center py-16 text-[#504444] dark:text-[#c9c0b8] bg-white/40 dark:bg-[#1f191b]/50 rounded-3xl p-8 border border-white/50 max-w-lg mx-auto">
              <Search size={32} className="mx-auto text-stone-400 mb-2 opacity-50" />
              <p className="text-sm font-semibold">
                {products.length === 0 ? 'Nenhum produto cadastrado no catálogo ainda.' : 'Nenhum produto encontrado para sua busca.'}
              </p>
              <p className="text-xs text-stone-400 mt-1">
                {products.length === 0
                  ? 'Os produtos marcados como públicos no painel aparecerão aqui.'
                  : 'Tente buscar por outros termos ou selecione "Todos os produtos".'}
              </p>
              {products.length > 0 && (searchQuery || selectedCategory !== 'todos') && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('todos'); }}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-[#613d3e] text-white cursor-pointer"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}



          {/* Footer Institucional Responsivo com Multi-colunas */}
          <footer className="pt-8 pb-12 border-t border-stone-200/60 dark:border-[#ebcdcd]/15 text-xs text-[#504444] dark:text-[#c9c0b8]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 text-center md:text-left">
              {/* Coluna 1: Ateliê & Sobre */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  {businessInfo.logo && !logoError ? (
                    <img
                      src={businessInfo.logo}
                      alt={businessInfo.name}
                      onError={() => setLogoError(true)}
                      className="size-7 rounded-full object-cover border border-white/60"
                    />
                  ) : null}
                  <h4 className="font-bold text-sm text-[#613d3e] dark:text-[#f4b7b9]">
                    {businessInfo.name}
                  </h4>
                </div>
                {businessInfo.footerText && (
                  <p className="text-xs text-[#504444] dark:text-[#c9c0b8] leading-relaxed max-w-sm mx-auto md:mx-0">
                    {businessInfo.footerText}
                  </p>
                )}
              </div>

              {/* Coluna 2: Atendimento e Redes */}
              <div className="space-y-2">
                <h5 className="font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider text-[11px]">
                  Canais de Atendimento
                </h5>
                <div className="flex flex-col items-center md:items-start gap-1.5 pt-1">
                  <button
                    onClick={handleSendToWhatsApp}
                    className="inline-flex items-center gap-1.5 text-[#10B981] font-semibold hover:underline cursor-pointer"
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp Oficial: {businessInfo.whatsapp}</span>
                  </button>

                  {cleanInstagram && (
                    <a
                      href={`https://instagram.com/${cleanInstagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-[#E1306C] transition-colors"
                    >
                      <Instagram size={14} />
                      <span>@{cleanInstagram}</span>
                    </a>
                  )}

                  {sanitizedWebsiteUrl && (
                    <a
                      href={sanitizedWebsiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:underline"
                    >
                      <Globe size={14} />
                      <span>Site Oficial</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Coluna 3: Localização & Prazos */}
              <div className="space-y-2">
                <h5 className="font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider text-[11px]">
                  Envios & Funcionamento
                </h5>
                {businessInfo.footerLocation && (
                  <p className="flex items-center justify-center md:justify-start gap-1.5">
                    <MapPin size={13} className="text-[#613d3e] dark:text-[#f4b7b9] shrink-0" />
                    <span>{businessInfo.footerLocation}</span>
                  </p>
                )}
                {businessInfo.footerBusinessHours && (
                  <p className="flex items-center justify-center md:justify-start gap-1.5">
                    <Clock size={13} className="text-[#613d3e] dark:text-[#f4b7b9] shrink-0" />
                    <span>{businessInfo.footerBusinessHours}</span>
                  </p>
                )}
                {businessInfo.footerNotice && (
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 pt-1 leading-relaxed">
                    {businessInfo.footerNotice}
                  </p>
                )}
              </div>
            </div>

            {/* Copyright */}
            <div className="pt-6 border-t border-stone-200/40 dark:border-stone-800 text-center text-[11px] text-stone-400">
              <p>{businessInfo.footerCopyright || `© ${new Date().getFullYear()} ${businessInfo.name}. Todos os direitos reservados.`}</p>
            </div>
          </footer>

          </div>
        </main>

        {/* 4. Barra Fixa Inferior de Conversão: Adaptativa (Bottom bar no mobile com safe-area / Floating Dock no desktop) */}
        {totalItemsCount > 0 && !isCartOpen && !selectedProductPreview && (
          <aside className="fixed bottom-0 inset-x-0 sm:bottom-6 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-2.5 sm:px-5 bg-white/95 dark:bg-[#161214]/95 backdrop-blur-xl border-t sm:border border-stone-200/80 dark:border-[#ebcdcd]/20 sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
            <div className="max-w-md sm:w-[480px] mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="relative p-2 rounded-xl bg-[#613d3e]/10 dark:bg-[#f4b7b9]/15 text-[#613d3e] dark:text-[#f4b7b9]">
                  <ShoppingBag size={18} />
                  <span className="absolute -top-1.5 -right-1.5 size-4.5 bg-amber-400 text-stone-950 text-[10px] font-black rounded-full flex items-center justify-center tabular-nums shadow-xs">
                    {totalItemsCount}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 tracking-wider">
                    {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'} na sacola
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-[#613d3e] dark:text-[#f4b7b9] tabular-nums">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsCartOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#613d3e] dark:bg-[#f4b7b9] text-white dark:text-[#4c2527] font-bold text-xs flex items-center gap-2 shadow-md hover:opacity-95 active:scale-95 transition-all cursor-pointer"
              >
                <span>Ver Sacola</span>
                <Send size={13} />
              </button>
            </div>
          </aside>
        )}

        {/* 5. Modal Responsivo de Prévia / Personalização (2 Colunas no Desktop) */}
        {selectedProductPreview && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            {/* Backdrop clicável para fechar no mobile e desktop */}
            <div 
              className="absolute inset-0" 
              onClick={() => setSelectedProductPreview(null)} 
              aria-hidden="true" 
            />

            <div className="relative z-10 w-full sm:max-w-2xl md:max-w-3xl h-auto max-h-[90vh] sm:max-h-[85vh] flex flex-col md:flex-row rounded-t-3xl sm:rounded-3xl bg-[#fff8f7] dark:bg-[#1f191b] border border-white/45 dark:border-[#ebcdcd]/20 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
              
              {/* Coluna Esquerda (Desktop): Imagem */}
              <div className="relative h-40 sm:h-auto md:w-1/2 bg-stone-100 dark:bg-stone-900 overflow-hidden shrink-0">
                <img
                  src={selectedProductPreview.imageUrl}
                  alt={selectedProductPreview.name}
                  className="w-full h-full object-cover"
                  decoding="async"
                />
                <button
                  onClick={() => setSelectedProductPreview(null)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-xs transition-colors cursor-pointer z-10"
                  aria-label="Fechar prévia"
                >
                  <X size={18} />
                </button>
                {selectedProductPreview.badge && (
                  <span className="absolute bottom-3 left-3 px-3 py-1 rounded-md text-xs font-bold bg-[#613d3e]/90 text-white backdrop-blur-sm">
                    {selectedProductPreview.badge}
                  </span>
                )}
              </div>

              {/* Coluna Direita (Desktop): Detalhes, Customização e Adição */}
              <div className="p-4 sm:p-6 flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
                <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1 overscroll-contain">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                        {selectedProductPreview.category}
                      </span>
                      <h3 className="text-base sm:text-xl font-extrabold text-[#221a1a] dark:text-[#e8e0e3] leading-snug">
                        {selectedProductPreview.name}
                      </h3>
                    </div>
                    <span className="text-base sm:text-xl font-extrabold text-[#613d3e] dark:text-[#f4b7b9] tabular-nums shrink-0">
                      {formatCurrency(selectedProductPreview.price)}
                    </span>
                  </div>

                  <p className="text-xs text-[#504444] dark:text-[#c9c0b8] leading-relaxed">
                    {selectedProductPreview.description}
                  </p>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                    <Clock size={14} className="shrink-0" />
                    <span>Prazo de confecção: <strong>até {selectedProductPreview.leadTimeDays} dias úteis</strong></span>
                  </div>

                  {/* Campo de Personalização */}
                  {selectedProductPreview.isCustomizable && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-xs font-semibold text-[#221a1a] dark:text-[#e8e0e3]">
                        Nome ou tema para personalização:
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Nome da criança, idade ou tema desejado"
                        value={previewCustomName}
                        onChange={(e) => setPreviewCustomName(e.target.value)}
                        className="w-full px-3.5 py-2 text-base sm:text-xs rounded-xl bg-white dark:bg-[#161214] border border-stone-300 dark:border-stone-700 text-[#221a1a] dark:text-[#e8e0e3] focus:outline-none focus:ring-2 focus:ring-[#613d3e]/30"
                      />
                      <p className="text-[10px] text-stone-400">
                        Você também poderá combinar mais detalhes da arte depois no WhatsApp.
                      </p>
                    </div>
                  )}
                </div>

                {/* Ação de Adicionar - sempre visível fixada no rodapé com safe area */}
                <div className="pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-0 border-t border-stone-200/50 dark:border-stone-800 shrink-0 bg-[#fff8f7] dark:bg-[#1f191b]">
                  <button
                    onClick={() => {
                      addToCart(selectedProductPreview, previewCustomName);
                      setSelectedProductPreview(null);
                      setIsCartOpen(true);
                    }}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#613d3e] dark:bg-[#f4b7b9] text-white dark:text-[#4c2527] hover:opacity-95 active:scale-[0.98] transition-all shadow-md cursor-pointer"
                  >
                    <ShoppingBag size={16} />
                    <span>Adicionar à Sacola</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 6. Gaveta Lateral / Slide-over Drawer da Sacola de Pedidos */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
            {/* Backdrop clicável no mobile e desktop */}
            <div 
              className="absolute inset-0" 
              onClick={() => setIsCartOpen(false)} 
              aria-hidden="true" 
            />

            {/* Container da Gaveta (Full-height slide-over no desktop, bottom sheet no mobile) */}
            <div className="relative z-10 w-full sm:max-w-md h-[88vh] sm:h-full max-h-[90vh] sm:max-h-none flex flex-col rounded-t-3xl sm:rounded-none sm:rounded-l-3xl bg-[#fff8f7] dark:bg-[#1f191b] border-t sm:border-t-0 sm:border-l border-stone-200/80 dark:border-stone-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-right duration-200">
              
              {/* Header do Carrinho */}
              <div className="p-4 sm:p-5 flex items-center justify-between border-b border-stone-200/60 dark:border-[#ebcdcd]/10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#613d3e]/10 dark:bg-[#f4b7b9]/15 text-[#613d3e] dark:text-[#f4b7b9]">
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#221a1a] dark:text-[#e8e0e3]">
                      Sacola de Encomendas
                    </h3>
                    <span className="text-[11px] text-stone-400 font-medium">
                      {totalItemsCount} {totalItemsCount === 1 ? 'item adicionado' : 'itens adicionados'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 cursor-pointer"
                  aria-label="Fechar sacola"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Lista de Itens Adicionados */}
              <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-3 overscroll-contain">
                {cart.length === 0 ? (
                  <div className="text-center py-16 text-stone-400 space-y-2">
                    <ShoppingBag size={40} className="mx-auto opacity-30" />
                    <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">Sua sacola está vazia.</p>
                    <p className="text-xs">Explore o catálogo e adicione os mimos que deseja encomendar.</p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div
                      key={`${item.product.id}-${item.customName || idx}`}
                      className="p-3.5 rounded-2xl bg-white/80 dark:bg-[#261f22] border border-stone-200/70 dark:border-[#ebcdcd]/10 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="size-12 rounded-xl object-cover border border-white/60 shrink-0"
                            decoding="async"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-[#221a1a] dark:text-[#e8e0e3] truncate" title={item.product.name}>
                              {item.product.name}
                            </h4>
                            <span className="text-xs font-bold text-[#613d3e] dark:text-[#f4b7b9] tabular-nums">
                              {formatCurrency(item.product.price * item.quantity)}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => updateQuantity(item.product.id, -item.quantity, item.customName)}
                          className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Remover item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Campo editável para nome/personalização */}
                      {item.product.isCustomizable && (
                        <div>
                          <label className="block text-[10px] font-semibold text-stone-500 dark:text-stone-400 mb-1">
                            Personalização / Nome:
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Nome da criança ou tema"
                            value={item.customName || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCart((prev) =>
                                prev.map((ci, cIdx) =>
                                  cIdx === idx ? { ...ci, customName: val } : ci
                                )
                              );
                            }}
                            className="w-full px-2.5 py-1.5 text-base sm:text-xs rounded-lg bg-white dark:bg-[#161214] border border-stone-200 dark:border-stone-700 text-[#221a1a] dark:text-[#e8e0e3] focus:outline-none focus:ring-1 focus:ring-[#613d3e]"
                          />
                        </div>
                      )}

                      {/* Controle de Quantidade */}
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <span className="text-[10px] text-stone-400">
                          Prazo: {item.product.leadTimeDays} dias úteis
                        </span>
                        <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-[#161214] rounded-lg p-0.5 border border-stone-200 dark:border-stone-700">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1, item.customName)}
                            className="p-1 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer"
                            aria-label="Diminuir quantidade"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs font-bold px-2 tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1, item.customName)}
                            className="p-1 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer"
                            aria-label="Aumentar quantidade"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Observações Gerais / Data do Evento */}
                {cart.length > 0 && (
                  <div className="pt-2 space-y-1">
                    <label className="block text-xs font-semibold text-[#221a1a] dark:text-[#e8e0e3]">
                      Observações ou data do seu evento:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Preciso receber até dia 20 para o aniversário..."
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      className="w-full p-2.5 text-base sm:text-xs rounded-xl bg-white dark:bg-[#261f22] border border-stone-200 dark:border-stone-700 text-[#221a1a] dark:text-[#e8e0e3] focus:outline-none focus:ring-1 focus:ring-[#613d3e]"
                    />
                  </div>
                )}
              </div>

              {/* Footer do Carrinho com Envio WhatsApp */}
              {cart.length > 0 && (
                <div className="p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-white/95 dark:bg-[#161214]/95 border-t border-stone-200/80 dark:border-stone-800 space-y-3 shrink-0">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span>Subtotal Estimado:</span>
                    <span className="text-lg text-[#613d3e] dark:text-[#f4b7b9] tabular-nums font-extrabold">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  <button
                    onClick={handleSendToWhatsApp}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer"
                  >
                    <Send size={15} />
                    <span>Confirmar & Enviar Pedido no WhatsApp</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicCatalog;

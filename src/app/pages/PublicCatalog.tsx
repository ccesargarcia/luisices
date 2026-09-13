import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTheme } from 'next-themes';
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
  ExternalLink,
  Instagram,
  Eye,
  Calendar,
  AlertCircle,
  MapPin,
  Globe
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { collection, getDocs, doc, getDoc, query, where, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

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

// Dados de demonstração refinados caso o ateliê ainda não tenha produtos cadastrados no Firestore
const MOCK_PRODUCTS: CatalogProduct[] = [
  {
    id: 'prod-1',
    name: 'Planner Espiral Floral Permanente 2025',
    category: 'Planners',
    price: 89.90,
    description: 'Capa dura com laminação fosca acetinada, hot stamping dourado e miolo floral delicado em papel 90g.',
    leadTimeDays: 5,
    badge: 'Mais Pedido',
    isCustomizable: true,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'prod-2',
    name: 'Kit Lembrancinhas Maternidade Chuva de Amor (10 un)',
    category: 'Maternidade',
    price: 65.00,
    description: 'Caixinhas pirâmide afetivas com laço de cetim luxo, aplique em camadas 3D e tag personalizada.',
    leadTimeDays: 7,
    badge: 'Personalizável',
    isCustomizable: true,
    imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'prod-3',
    name: 'Caderno Brochura Pautado Personalizado',
    category: 'Cadernos',
    price: 42.00,
    description: 'Capa flexível aveludada, costura aparente artesanal e 80 folhas pautadas em papel pólen soft 80g.',
    leadTimeDays: 4,
    badge: 'Exclusivo',
    isCustomizable: true,
    imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'prod-4',
    name: 'Caixas Cenário Festa Safari Chic (5 un)',
    category: 'Festas & Kits',
    price: 78.00,
    description: 'Caixas de acrílico revestidas em papel especial texturizado, detalhes em dourado e biscuit afetivo.',
    leadTimeDays: 6,
    badge: 'Alta Festança',
    isCustomizable: true,
    imageUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'prod-5',
    name: 'Topo de Bolo Camadas Luxo Dourado & Flores',
    category: 'Festas & Kits',
    price: 45.00,
    description: 'Acabamento em papéis especiais perolados 180g e lamicote dourado 250g com flores feitas à mão.',
    leadTimeDays: 3,
    badge: 'Destaque',
    isCustomizable: true,
    imageUrl: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'prod-6',
    name: 'Livro do Bebê Recordações & Primeiros Momentos',
    category: 'Maternidade',
    price: 95.00,
    description: 'Acompanhamento do 1º ao 5º ano de vida, capa almofadada personalizada com gravação e caixa protetora.',
    leadTimeDays: 8,
    badge: 'Afetivo',
    isCustomizable: true,
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
  }
];

export function PublicCatalog() {
  const { setTheme } = useTheme();

  // Controle de tema (Claro por padrão, com persistência de preferência)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('luisices_catalog_theme');
      if (saved) return saved === 'dark';
      // Padrão definido explicitamente como modo claro
      return false;
    } catch {
      return false;
    }
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [products, setProducts] = useState<CatalogProduct[]>(MOCK_PRODUCTS);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Informações do negócio e customizações da lojinha (carregadas dinamicamente ou defaults afetivos)
  const [businessInfo, setBusinessInfo] = useState({
    name: 'Luisices',
    tagline: 'Papelaria artesanal feita à mão para momentos únicos',
    whatsapp: '5511999999999',
    instagram: 'luisicesatelie',
    website: '',
    logo: '',
    // Customizações da Loja
    badge: 'Atelier',
    statusText: 'Atendimento WhatsApp ativo',
    announcement: '',
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
  });

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

  // Guarda o tema da área administrativa antes de abrir o catálogo
  const originalThemeRef = useRef<string | null>(null);
  useEffect(() => {
    originalThemeRef.current = localStorage.getItem('theme') || 'system';
    return () => {
      if (originalThemeRef.current) {
        try {
          setTheme(originalThemeRef.current);
        } catch {}
      }
    };
  }, [setTheme]);

  // Sincronizar classes 'dark' / 'light' no elemento raiz html para o Tailwind v4 responder
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
      try {
        setTheme('dark');
      } catch {}
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      try {
        setTheme('light');
      } catch {}
    }
  }, [isDarkMode, setTheme]);

  // Alternar tema Claro / Escuro
  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      const themeValue = next ? 'dark' : 'light';
      try {
        localStorage.setItem('luisices_catalog_theme', themeValue);
      } catch {}
      const root = document.documentElement;
      if (next) {
        root.classList.add('dark');
        root.classList.remove('light');
        try {
          setTheme('dark');
        } catch {}
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        try {
          setTheme('light');
        } catch {}
      }
      return next;
    });
  };

  // Salvar carrinho
  useEffect(() => {
    try {
      localStorage.setItem('luisices_catalog_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Carregar produtos e configurações públicas do Firestore
  useEffect(() => {
    let isCancelled = false;

    async function loadCatalogData() {
      try {
        setLoadingProducts(true);

        // 1. Tenta carregar informações públicas da loja
        try {
          const publicSettingsSnap = await getDoc(doc(db, 'storeSettings', 'public'));
          if (publicSettingsSnap.exists() && !isCancelled) {
            const s = publicSettingsSnap.data();
            setBusinessInfo((prev) => ({
              name: s.businessName || prev.name,
              tagline: s.businessTagline || prev.tagline,
              whatsapp: s.whatsappPhone || s.businessPhone || prev.whatsapp,
              instagram: s.instagramUrl ? s.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '') : prev.instagram,
              website: s.websiteUrl || prev.website,
              logo: s.catalogLogo || s.logo || '',
              badge: s.catalogBadge || prev.badge,
              statusText: s.catalogStatusText || prev.statusText,
              announcement: s.catalogAnnouncement !== undefined ? s.catalogAnnouncement : prev.announcement,
              heroTitle: s.catalogHeroTitle || prev.heroTitle,
              heroDescription: s.catalogHeroDescription || prev.heroDescription,
              whatsappGreeting: s.catalogWhatsappGreeting || prev.whatsappGreeting,
              whatsappCustomizationLabel: s.catalogWhatsappCustomizationLabel || prev.whatsappCustomizationLabel,
              whatsappFooter: s.catalogWhatsappFooter || prev.whatsappFooter,
              footerText: s.catalogFooterText || prev.footerText,
              footerLocation: s.catalogFooterLocation || prev.footerLocation,
              footerBusinessHours: s.catalogFooterBusinessHours || prev.footerBusinessHours,
              footerNotice: s.catalogFooterNotice || prev.footerNotice,
              footerCopyright: s.catalogFooterCopyright || prev.footerCopyright,
            }));
          }
        } catch (settingsErr) {
          console.warn('Configurações públicas locais em uso:', settingsErr);
        }

        // 2. Carrega produtos públicos do Firestore
        try {
          const publicQuery = query(collection(db, 'products'), where('isPublic', '==', true));
          const productsSnap = await getDocs(publicQuery);
          if (!productsSnap.empty && !isCancelled) {
            const list: CatalogProduct[] = [];
            productsSnap.forEach((d) => {
              const data = d.data();
              if (data.name && Number(data.unitPrice) > 0) {
                list.push({
                  id: d.id,
                  name: data.name,
                  category: data.category || 'Geral',
                  price: Number(data.unitPrice) || 0,
                  description: data.description || 'Produto artesanal confeccionado com carinho sob encomenda.',
                  leadTimeDays: Number(data.leadTimeDays) || 5,
                  imageUrl: data.photoUrl || (data.images && data.images[0]) || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
                  badge: data.badge || undefined,
                  isCustomizable: data.isCustomizable ?? true,
                });
              }
            });

            if (list.length > 0) {
              setProducts(list);
            }
          }
        } catch (prodErr) {
          console.warn('Usando catálogo demonstrativo de produtos:', prodErr);
        }
      } catch (err) {
        console.warn('Erro ao carregar dados do catálogo:', err);
      } finally {
        if (!isCancelled) setLoadingProducts(false);
      }
    }

    loadCatalogData();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Interceptar botão voltar do celular/navegador para fechar modais
  useEffect(() => {
    const handlePopState = () => {
      if (isCartOpen) {
        setIsCartOpen(false);
      } else if (selectedProductPreview) {
        setSelectedProductPreview(null);
      }
    };

    if (isCartOpen || selectedProductPreview) {
      window.history.pushState({ modalOpen: true }, '');
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isCartOpen, selectedProductPreview]);

  // Categorias dinâmicas derivadas dos produtos
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    const unique = Array.from(set).sort((a, b) => a.localeCompare(b));
    return ['todos', ...unique];
  }, [products]);

  // Filtragem dinâmica
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesCat = selectedCategory === 'todos' || prod.category.toLowerCase() === selectedCategory.toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || prod.name.toLowerCase().includes(q) || prod.description.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cálculos do Carrinho
  const totalItemsCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0), [cart]);

  // Ações da Sacola
  const addToCart = useCallback((product: CatalogProduct, customName?: string) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && (item.customName || '') === (customName || '')
      );
      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, customName: customName || undefined }];
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
        className="min-h-[100dvh] text-[#221a1a] dark:text-[#e8e0e3] transition-colors duration-300 font-sans pb-32
        bg-[#fff8f7] dark:bg-[#161214]
        [background-image:linear-gradient(135deg,#fceee9_0%,#fff8f7_52%,#ede7f6_100%)]
        dark:[background-image:none]
        relative selection:bg-[#613d3e] selection:text-white"
      >
        {/* Camada de Gradientes Atmosféricos Fixos */}
        <div className="fixed inset-0 pointer-events-none opacity-80 dark:opacity-40 z-0">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-[#f7d6d0] dark:bg-[#5b3234] blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute top-1/3 right-0 w-80 h-80 rounded-full bg-[#d1c4e9] dark:bg-[#28192d] blur-3xl translate-x-1/3" />
          <div className="absolute bottom-10 left-1/4 w-96 h-96 rounded-full bg-[#bbdefb] dark:bg-[#121c20] blur-3xl" />
        </div>

        {/* Barra de Aviso / Alerta Promocional (se preenchido no painel) */}
        {businessInfo.announcement && (
          <aside aria-label="Aviso do ateliê" className="sticky top-0 z-40 px-4 py-2 bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/20 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-semibold text-center flex items-center justify-center gap-2 backdrop-blur-md">
            <Sparkles size={14} className="shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
            <span>{businessInfo.announcement}</span>
          </aside>
        )}

        {/* 1. Header Fixo com Efeito Vidro */}
        <header className="sticky top-0 z-30 px-4 py-3 bg-white/75 dark:bg-[#1f191b]/85 backdrop-blur-md border-b border-white/40 dark:border-[#ebcdcd]/15 transition-colors shadow-xs">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {businessInfo.logo ? (
                <img
                  src={businessInfo.logo}
                  alt={businessInfo.name}
                  className="size-8 rounded-full object-cover border border-white/60 shadow-xs"
                />
              ) : null}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-[#613d3e] dark:text-[#f4b7b9]">
                    {businessInfo.name}
                  </h1>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#613d3e]/10 dark:bg-[#f4b7b9]/15 text-[#613d3e] dark:text-[#f4b7b9]">
                    {businessInfo.badge || 'Atelier'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="text-[11px] text-[#504444] dark:text-[#c9c0b8] font-medium">
                    {businessInfo.statusText || 'Atendimento WhatsApp ativo'}
                  </span>
                </div>
              </div>
            </div>

            {/* Alternador Claro / Escuro & Botão Sacola */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                title={isDarkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
                className="p-2 rounded-full bg-white/60 dark:bg-[#2b2225]/80 border border-white/50 dark:border-[#ebcdcd]/20 text-[#504444] dark:text-[#e8e0e3] hover:scale-105 active:scale-95 transition-all shadow-xs"
                aria-label="Alternar tema de cores"
              >
                {isDarkMode ? <Sun size={18} className="text-[#fbbf24]" /> : <Moon size={18} className="text-[#613d3e]" />}
              </button>

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 rounded-full bg-white/60 dark:bg-[#2b2225]/80 border border-white/50 dark:border-[#ebcdcd]/20 text-[#613d3e] dark:text-[#f4b7b9] hover:scale-105 active:scale-95 transition-all shadow-xs"
                aria-label="Abrir sacola de encomendas"
              >
                <ShoppingBag size={18} />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-5 bg-[#613d3e] dark:bg-[#f4b7b9] text-white dark:text-[#4c2527] text-xs font-bold rounded-full flex items-center justify-center tabular-nums shadow-sm animate-in zoom-in">
                    {totalItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* 2. Conteúdo Principal */}
        <main className="relative z-10 max-w-md mx-auto px-4 pt-4 space-y-5">
          
          {/* Hero Banner da Loja */}
          <section className="p-5 rounded-2xl bg-white/60 dark:bg-[#1f191b]/80 backdrop-blur-md border border-white/45 dark:border-[#ebcdcd]/15 shadow-[0_8px_32px_rgb(230_180_180/15%)] dark:shadow-[0_16px_40px_-8px_rgb(0_0_0/65%)]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#613d3e] dark:text-[#f4b7b9] mb-1.5">
              <Sparkles size={14} />
              <span>{businessInfo.heroTitle || 'Catálogo & Vitrine Afetiva'}</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#221a1a] dark:text-[#e8e0e3] leading-snug">
              {businessInfo.tagline}
            </h2>
            <p className="mt-2 text-xs text-[#504444] dark:text-[#c9c0b8] leading-relaxed">
              {businessInfo.heroDescription || 'Escolha suas peças, informe o nome para personalização e envie o pedido formatado diretamente no nosso WhatsApp.'}
            </p>

            {/* Input de Busca */}
            <div className="mt-4 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#504444]/60 dark:text-[#c9c0b8]/60" />
              <input
                type="text"
                placeholder="Buscar por produto, tema, lembrança..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-white/70 dark:bg-[#120e10]/70 border border-white/60 dark:border-[#ebcdcd]/20 text-[#221a1a] dark:text-[#e8e0e3] placeholder-[#504444]/50 dark:placeholder-[#c9c0b8]/50 focus:outline-none focus:ring-2 focus:ring-[#613d3e]/30 dark:focus:ring-[#f4b7b9]/30 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </section>

          {/* Filtro por Categorias (Pills Horizontais) */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                    isActive
                      ? 'bg-[#613d3e] dark:bg-[#f4b7b9] text-white dark:text-[#4c2527] shadow-sm'
                      : 'bg-white/60 dark:bg-[#1f191b]/80 border border-white/45 dark:border-[#ebcdcd]/15 text-[#504444] dark:text-[#c9c0b8] hover:bg-white/90'
                  }`}
                >
                  {cat === 'todos' && <Sparkles size={12} />}
                  <span>{cat === 'todos' ? 'Todos os itens' : cat}</span>
                </button>
              );
            })}
          </div>

          {/* Lista de Cards de Produtos */}
          <div className="space-y-4">
            {filteredProducts.map((prod) => (
              <article
                key={prod.id}
                className="overflow-hidden rounded-2xl bg-white/60 dark:bg-[#1f191b]/86 backdrop-blur-md border border-white/45 dark:border-[#ebcdcd]/16 shadow-[0_8px_32px_rgb(230_180_180/15%)] dark:shadow-[0_16px_40px_-8px_rgb(0_0_0/65%)] transition-all hover:translate-y-[-2px]"
              >
                {/* Imagem do Produto com Badges e Clique para Preview */}
                <div 
                  className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100 dark:bg-stone-900 cursor-pointer group"
                  onClick={() => handleOpenPreview(prod)}
                >
                  <img
                    src={prod.imageUrl}
                    alt={prod.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="bg-white/90 dark:bg-black/80 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                      <Eye size={13} /> Ver detalhes
                    </span>
                  </div>

                  {prod.badge && (
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#613d3e]/85 dark:bg-[#f4b7b9]/90 text-white dark:text-[#4c2527] backdrop-blur-sm shadow-sm">
                      {prod.badge}
                    </span>
                  )}
                  <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-md text-xs font-bold bg-white/90 dark:bg-[#161214]/90 text-[#221a1a] dark:text-[#e8e0e3] backdrop-blur-sm tabular-nums shadow-sm">
                    {formatCurrency(prod.price)}
                  </span>
                </div>

                {/* Detalhes do Produto */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 
                      className="text-sm font-bold text-[#221a1a] dark:text-[#e8e0e3] leading-snug cursor-pointer hover:underline"
                      onClick={() => handleOpenPreview(prod)}
                    >
                      {prod.name}
                    </h3>
                    <p className="mt-1 text-xs text-[#504444] dark:text-[#c9c0b8] leading-relaxed line-clamp-2">
                      {prod.description}
                    </p>
                  </div>

                  {/* Prazo Operacional de Confecção (Âmbar Semântico #F59E0B) */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#fef3c7] dark:bg-[#78350f]/30 border border-[#fde68a] dark:border-[#92400e]/40 text-[#92400e] dark:text-[#fbbf24] text-[11px] font-medium">
                    <Clock size={12} />
                    <span>Produção em até {prod.leadTimeDays} dias úteis</span>
                  </div>

                  {/* Botão de Ação Primário */}
                  <button
                    onClick={() => handleOpenPreview(prod)}
                    className="w-full py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 bg-[#613d3e] dark:bg-[#f4b7b9] text-white dark:text-[#4c2527] hover:opacity-95 active:scale-[0.98] transition-all shadow-sm"
                  >
                    <ShoppingBag size={14} />
                    <span>Personalizar & Adicionar à Sacola</span>
                  </button>
                </div>
              </article>
            ))}

            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-[#504444] dark:text-[#c9c0b8] bg-white/30 dark:bg-[#1f191b]/40 rounded-2xl p-6 border border-white/40">
                <p className="text-sm font-medium">Nenhum produto encontrado para sua busca.</p>
                <p className="text-xs text-muted-foreground mt-1">Tente buscar por termos mais genéricos ou limpe o filtro.</p>
              </div>
            )}
          </div>

          {/* Banner Informativo de Confiança */}
          <section className="p-4 rounded-xl bg-white/45 dark:bg-[#1f191b]/50 border border-white/40 dark:border-[#ebcdcd]/10 text-center space-y-1.5">
            <div className="size-8 rounded-full bg-[#613d3e]/10 dark:bg-[#f4b7b9]/15 text-[#613d3e] dark:text-[#f4b7b9] flex items-center justify-center mx-auto">
              <Heart size={16} />
            </div>
            <h4 className="text-xs font-bold text-[#221a1a] dark:text-[#e8e0e3]">
              Como funciona o atendimento artesanal?
            </h4>
            <p className="text-[11px] text-[#504444] dark:text-[#c9c0b8] leading-relaxed">
              Você seleciona os itens e temas, envia a sacola diretamente para o nosso WhatsApp e nós elaboramos a prévia digital de aprovação antes de produzir cada detalhe.
            </p>
          </section>

          {/* Footer Institucional Totalmente Personalizável */}
          <footer className="pt-6 pb-8 space-y-4 border-t border-white/40 dark:border-[#ebcdcd]/15 text-center">
            {/* Logo e Nome */}
            <div className="flex flex-col items-center gap-1.5">
              {businessInfo.logo ? (
                <img
                  src={businessInfo.logo}
                  alt={businessInfo.name}
                  className="size-10 rounded-full object-cover border border-white/60 shadow-xs mb-1"
                />
              ) : null}
              <p className="text-sm font-bold text-[#613d3e] dark:text-[#f4b7b9]">
                {businessInfo.name}
              </p>
              {businessInfo.footerText && (
                <p className="text-xs text-[#504444] dark:text-[#c9c0b8] max-w-xs mx-auto leading-relaxed">
                  {businessInfo.footerText}
                </p>
              )}
            </div>

            {/* Localização e Horário */}
            {(businessInfo.footerLocation || businessInfo.footerBusinessHours) && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-[11px] text-[#504444] dark:text-[#c9c0b8]">
                {businessInfo.footerLocation && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} className="text-[#613d3e] dark:text-[#f4b7b9] shrink-0" />
                    {businessInfo.footerLocation}
                  </span>
                )}
                {businessInfo.footerLocation && businessInfo.footerBusinessHours && (
                  <span className="hidden sm:inline opacity-40">•</span>
                )}
                {businessInfo.footerBusinessHours && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} className="text-[#613d3e] dark:text-[#f4b7b9] shrink-0" />
                    {businessInfo.footerBusinessHours}
                  </span>
                )}
              </div>
            )}

            {/* Canais de Contato / Redes */}
            <div className="flex justify-center items-center gap-3 text-xs pt-1">
              {businessInfo.instagram && (
                <a
                  href={`https://instagram.com/${businessInfo.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#504444] dark:text-[#c9c0b8] hover:text-[#613d3e] dark:hover:text-[#f4b7b9] font-medium transition-colors"
                >
                  <Instagram size={14} />
                  <span>@{businessInfo.instagram}</span>
                </a>
              )}
              {businessInfo.website && (
                <>
                  <span className="opacity-30">•</span>
                  <a
                    href={businessInfo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#504444] dark:text-[#c9c0b8] hover:text-[#613d3e] dark:hover:text-[#f4b7b9] font-medium transition-colors"
                  >
                    <Globe size={14} />
                    <span>Site</span>
                  </a>
                </>
              )}
              <span className="opacity-30">•</span>
              <button
                onClick={handleSendToWhatsApp}
                className="inline-flex items-center gap-1 text-[#10B981] font-semibold hover:underline cursor-pointer"
              >
                <MessageCircle size={14} />
                <span>WhatsApp Oficial</span>
              </button>
            </div>

            {/* Aviso de Prazos e Políticas */}
            {businessInfo.footerNotice && (
              <p className="text-[10px] text-muted-foreground max-w-sm mx-auto leading-relaxed pt-1 opacity-80">
                {businessInfo.footerNotice}
              </p>
            )}

            {/* Copyright */}
            <p className="text-[10px] text-muted-foreground/60 pt-2">
              {businessInfo.footerCopyright || `© ${new Date().getFullYear()} ${businessInfo.name}. Todos os direitos reservados.`}
            </p>
          </footer>
        </main>

        {/* 3. Barra Fixa Inferior de Conversão */}
        {totalItemsCount > 0 && (
          <aside className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/85 dark:bg-[#161214]/90 backdrop-blur-xl border-t border-white/40 dark:border-[#ebcdcd]/15 shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="max-w-md mx-auto flex items-center justify-between gap-3">
              <div>
                <span className="block text-[10px] uppercase font-bold text-[#504444] dark:text-[#c9c0b8] tracking-wider">
                  Subtotal Estimado ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'})
                </span>
                <span className="text-base font-bold text-[#221a1a] dark:text-[#e8e0e3] tabular-nums">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              {/* Botão Semântico Esmeralda (#10B981) */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-xs flex items-center gap-2 shadow-md active:scale-95 transition-all"
              >
                <MessageCircle size={16} />
                <span>Ver Sacola & Enviar</span>
              </button>
            </div>
          </aside>
        )}

        {/* 4. Modal de Prévia / Detalhes do Produto */}
        {selectedProductPreview && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="w-full sm:max-w-md max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-[#fff8f7] dark:bg-[#1f191b] border border-white/45 dark:border-[#ebcdcd]/20 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
              
              {/* Header com botão fechar */}
              <div className="relative aspect-video w-full bg-stone-100 dark:bg-stone-900 overflow-hidden">
                <img
                  src={selectedProductPreview.imageUrl}
                  alt={selectedProductPreview.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedProductPreview(null)}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-xs"
                >
                  <X size={18} />
                </button>
                {selectedProductPreview.badge && (
                  <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#613d3e]/90 text-white backdrop-blur-sm">
                    {selectedProductPreview.badge}
                  </span>
                )}
              </div>

              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-base font-bold text-[#221a1a] dark:text-[#e8e0e3] leading-snug">
                    {selectedProductPreview.name}
                  </h3>
                  <span className="text-base font-bold text-[#613d3e] dark:text-[#f4b7b9] tabular-nums shrink-0">
                    {formatCurrency(selectedProductPreview.price)}
                  </span>
                </div>

                <p className="text-xs text-[#504444] dark:text-[#c9c0b8] leading-relaxed">
                  {selectedProductPreview.description}
                </p>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                  <Clock size={14} className="shrink-0" />
                  <span>Prazo de confecção: <strong>até {selectedProductPreview.leadTimeDays} dias úteis</strong></span>
                </div>

                {selectedProductPreview.isCustomizable && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-semibold text-[#221a1a] dark:text-[#e8e0e3]">
                      Personalizar com Nome / Frase / Idade:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Nome da aniversariante, idade ou tema"
                      value={previewCustomName}
                      onChange={(e) => setPreviewCustomName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white/90 dark:bg-[#161214] border border-stone-200 dark:border-stone-700 text-[#221a1a] dark:text-[#e8e0e3] focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Você também poderá ajustar esses detalhes depois no WhatsApp.
                    </p>
                  </div>
                )}
              </div>

              {/* Botão de confirmação de adição */}
              <div className="p-4 border-t border-white/40 dark:border-[#ebcdcd]/10 bg-white/40 dark:bg-[#161214]/40">
                <button
                  onClick={() => {
                    addToCart(selectedProductPreview, previewCustomName);
                    setSelectedProductPreview(null);
                    setIsCartOpen(true);
                  }}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 bg-[#613d3e] dark:bg-[#f4b7b9] text-white dark:text-[#4c2527] hover:opacity-95 active:scale-[0.98] transition-all shadow-md"
                >
                  <ShoppingBag size={16} />
                  <span>Adicionar à Sacola de Encomendas</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* 5. Modal / Gaveta Lateral da Sacola de Pedidos */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
            <div className="w-full sm:max-w-md max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-[#fff8f7] dark:bg-[#1f191b] border border-white/45 dark:border-[#ebcdcd]/20 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
              
              {/* Header do Carrinho */}
              <div className="p-4 flex items-center justify-between border-b border-white/40 dark:border-[#ebcdcd]/10">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={18} className="text-[#613d3e] dark:text-[#f4b7b9]" />
                  <h3 className="text-sm font-bold text-[#221a1a] dark:text-[#e8e0e3]">
                    Sua Sacola de Encomendas ({totalItemsCount})
                  </h3>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-[#504444] dark:text-[#c9c0b8]"
                  aria-label="Fechar sacola"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Lista de Itens Adicionados */}
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-[#504444] dark:text-[#c9c0b8] space-y-2">
                    <ShoppingBag size={32} className="mx-auto opacity-30" />
                    <p className="text-sm font-medium">Sua sacola está vazia no momento.</p>
                    <p className="text-xs text-muted-foreground">Escolha os produtos que deseja personalizar na vitrine.</p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div
                      key={`${item.product.id}-${item.customName || idx}`}
                      className="p-3 rounded-xl bg-white/70 dark:bg-[#261f22] border border-white/50 dark:border-[#ebcdcd]/10 space-y-2 shadow-2xs"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="size-10 rounded-lg object-cover border border-white/50 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-[#221a1a] dark:text-[#e8e0e3] truncate">
                              {item.product.name}
                            </h4>
                            <span className="text-[11px] font-semibold text-[#613d3e] dark:text-[#f4b7b9] tabular-nums">
                              {formatCurrency(item.product.price * item.quantity)}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => updateQuantity(item.product.id, -item.quantity, item.customName)}
                          className="text-[#ba1a1a] dark:text-[#e58e8e] p-1.5 hover:bg-red-500/10 rounded-md transition-colors"
                          title="Remover item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Campo para nome/personalização */}
                      {item.product.isCustomizable && (
                        <div>
                          <label className="block text-[10px] font-medium text-[#504444] dark:text-[#c9c0b8] mb-0.5">
                            Nome / Frase para personalização:
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Nome da criança, idade ou tema"
                            value={item.customName || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCart((prev) =>
                                prev.map((ci, cIdx) =>
                                  cIdx === idx ? { ...ci, customName: val } : ci
                                )
                              );
                            }}
                            className="w-full px-2.5 py-1 text-xs rounded-lg bg-white/90 dark:bg-[#161214] border border-stone-200 dark:border-stone-700 text-[#221a1a] dark:text-[#e8e0e3] focus:outline-none focus:ring-1 focus:ring-primary/40"
                          />
                        </div>
                      )}

                      {/* Controle de Quantidade */}
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <span className="text-[10px] text-[#504444] dark:text-[#c9c0b8]">
                          Prazo: {item.product.leadTimeDays} dias úteis
                        </span>
                        <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-[#161214] rounded-lg p-0.5 border border-border/40">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1, item.customName)}
                            className="p-1 rounded text-[#504444] dark:text-[#c9c0b8] hover:bg-stone-200 dark:hover:bg-stone-800"
                            aria-label="Diminuir quantidade"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs font-bold px-1.5 tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1, item.customName)}
                            className="p-1 rounded text-[#504444] dark:text-[#c9c0b8] hover:bg-stone-200 dark:hover:bg-stone-800"
                            aria-label="Aumentar quantidade"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Observações Gerais */}
                {cart.length > 0 && (
                  <div className="pt-2 space-y-1">
                    <label className="block text-[11px] font-semibold text-[#221a1a] dark:text-[#e8e0e3]">
                      Observações ou data do seu evento:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Preciso receber até dia 20 para o aniversário do meu filho..."
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl bg-white/80 dark:bg-[#261f22] border border-stone-200 dark:border-stone-700 text-[#221a1a] dark:text-[#e8e0e3] focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                )}
              </div>

              {/* Footer do Carrinho com Envio WhatsApp */}
              {cart.length > 0 && (
                <div className="p-4 bg-white/70 dark:bg-[#161214]/75 border-t border-white/40 dark:border-[#ebcdcd]/10 space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span>Subtotal Estimado:</span>
                    <span className="text-base text-[#613d3e] dark:text-[#f4b7b9] tabular-nums">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  <button
                    onClick={handleSendToWhatsApp}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
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

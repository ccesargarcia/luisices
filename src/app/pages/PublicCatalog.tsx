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
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
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
    badge: 'Destaque',
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
    badge: 'Tendência',
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
  },
  {
    id: 'prod-7',
    name: 'Chaveiro Botton Coração com Pingente de Seda',
    category: 'Lembrancinhas',
    price: 14.90,
    description: 'Chaveiro botton resinado de alto brilho com pingente tassel de seda e tag de agradecimento.',
    leadTimeDays: 3,
    badge: 'Econômico',
    isCustomizable: true,
    imageUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'prod-8',
    name: 'Bloco de Notas Capa Dura Floral 10x15cm',
    category: 'Cadernos',
    price: 24.50,
    description: 'Bloco compacto para bolsa com capa dura laminada, elástico lurex brilhante e 100 folhas destacáveis.',
    leadTimeDays: 4,
    badge: 'Mimo',
    isCustomizable: true,
    imageUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80',
  }
];

export function PublicCatalog() {
  const { setTheme } = useTheme();

  // Controle de tema (Claro por padrão, com persistência de preferência)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('luisices_catalog_theme');
      if (saved) return saved === 'dark';
      return false;
    } catch {
      return false;
    }
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<string>('destaque');
  const [products, setProducts] = useState<CatalogProduct[]>(MOCK_PRODUCTS);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Informações do negócio e customizações da lojinha com cache em localStorage para evitar flash no F5
  const [businessInfo, setBusinessInfo] = useState(() => {
    const defaultInfo = {
      name: 'Luisices Papelaria Personalizada',
      tagline: 'Papelaria artesanal feita à mão para momentos únicos',
      whatsapp: '5511999999999',
      instagram: 'luisicesatelie',
      website: '',
      logo: '',
      banner: '',
      bannerFixed: false,
      badge: 'Atelier Afetivo',
      statusText: 'Atendimento WhatsApp ativo',
      announcement: '✨ Encomendas abertas com envio carinhoso para todo o Brasil!',
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
    };
    try {
      const cached = localStorage.getItem('luisices_public_store_settings');
      if (cached) {
        return { ...defaultInfo, ...JSON.parse(cached) };
      }
    } catch {}
    return defaultInfo;
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

  // Sincronizar classes 'dark' / 'light' no elemento raiz html para o Tailwind responder
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

        // 1. Carrega informações públicas da loja
        try {
          const publicSettingsSnap = await getDoc(doc(db, 'storeSettings', 'public'));
          if (publicSettingsSnap.exists() && !isCancelled) {
            const s = publicSettingsSnap.data();
            setBusinessInfo((prev: typeof businessInfo) => {
              const updated = {
                name: s.businessName !== undefined && s.businessName !== '' ? s.businessName : prev.name,
                tagline: s.businessTagline !== undefined ? s.businessTagline : prev.tagline,
                whatsapp: s.whatsappPhone || s.businessPhone || prev.whatsapp,
                instagram: s.instagramUrl ? s.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '') : prev.instagram,
                website: s.websiteUrl || prev.website,
                logo: s.catalogLogo || '',
                banner: s.catalogBanner || '',
                bannerFixed: s.catalogBannerFixed !== undefined ? Boolean(s.catalogBannerFixed) : (prev.bannerFixed ?? false),
                badge: s.catalogBadge !== undefined ? s.catalogBadge : prev.badge,
                statusText: s.catalogStatusText !== undefined ? s.catalogStatusText : prev.statusText,
                announcement: s.catalogAnnouncement !== undefined ? s.catalogAnnouncement : prev.announcement,
                heroTitle: s.catalogHeroTitle !== undefined ? s.catalogHeroTitle : prev.heroTitle,
                heroDescription: s.catalogHeroDescription !== undefined ? s.catalogHeroDescription : prev.heroDescription,
                whatsappGreeting: s.catalogWhatsappGreeting !== undefined ? s.catalogWhatsappGreeting : prev.whatsappGreeting,
                whatsappCustomizationLabel: s.catalogWhatsappCustomizationLabel !== undefined ? s.catalogWhatsappCustomizationLabel : prev.whatsappCustomizationLabel,
                whatsappFooter: s.catalogWhatsappFooter !== undefined ? s.catalogWhatsappFooter : prev.whatsappFooter,
                footerText: s.catalogFooterText !== undefined ? s.catalogFooterText : prev.footerText,
                footerLocation: s.catalogFooterLocation !== undefined ? s.catalogFooterLocation : prev.footerLocation,
                footerBusinessHours: s.catalogFooterBusinessHours !== undefined ? s.catalogFooterBusinessHours : prev.footerBusinessHours,
                footerNotice: s.catalogFooterNotice !== undefined ? s.catalogFooterNotice : prev.footerNotice,
                footerCopyright: s.catalogFooterCopyright !== undefined ? s.catalogFooterCopyright : prev.footerCopyright,
              };
              try {
                localStorage.setItem('luisices_public_store_settings', JSON.stringify(updated));
              } catch {}
              return updated;
            });
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

        {/* 1. Header Fixo Responsivo com Efeito Vidro (Inspirado em E-commerce Moderno & Stoqui) */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#1f191b]/90 backdrop-blur-md border-b border-stone-200/60 dark:border-[#ebcdcd]/15 transition-colors shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            
            {/* Esquerda: Identidade Visual / Logo & Status */}
            <div className="flex items-center gap-3 shrink-0">
              {businessInfo.logo ? (
                <img
                  src={businessInfo.logo}
                  alt={businessInfo.name}
                  className="size-9 sm:size-10 rounded-full object-cover border border-white/80 shadow-xs ring-1 ring-black/5 dark:ring-white/10"
                />
              ) : (
                <div className="size-9 sm:size-10 rounded-full bg-[#613d3e]/10 dark:bg-[#f4b7b9]/20 flex items-center justify-center text-[#613d3e] dark:text-[#f4b7b9]">
                  <Sparkles size={20} />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#613d3e] dark:text-[#f4b7b9] leading-tight">
                    {businessInfo.name}
                  </h1>
                  <span className="hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#613d3e]/10 dark:bg-[#f4b7b9]/15 text-[#613d3e] dark:text-[#f4b7b9]">
                    {businessInfo.badge || 'Atelier'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block size-2 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="text-[11px] text-[#504444] dark:text-[#c9c0b8] font-medium">
                    {businessInfo.statusText || 'Atendimento WhatsApp ativo'}
                  </span>
                </div>
              </div>
            </div>

            {/* Centro: Barra de Busca Expandida no Desktop (estilo Stoqui) */}
            <div className="hidden md:flex flex-1 max-w-md mx-4 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
              <input
                type="text"
                placeholder="Digite sua busca (produtos, temas, lembranças)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2 text-xs rounded-full bg-stone-100/80 dark:bg-[#161214]/80 border border-stone-200 dark:border-stone-700 text-[#221a1a] dark:text-[#e8e0e3] placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#613d3e]/30 dark:focus:ring-[#f4b7b9]/30 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  title="Limpar busca"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Direita: Ações (Instagram, Tema & Sacola de Compras) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {businessInfo.instagram && (
                <a
                  href={`https://instagram.com/${businessInfo.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/70 dark:bg-[#2b2225]/80 border border-stone-200/80 dark:border-[#ebcdcd]/20 text-stone-700 dark:text-stone-200 hover:text-[#E1306C] transition-all shadow-2xs"
                  title="Instagram do ateliê"
                >
                  <Instagram size={14} />
                  <span>@{businessInfo.instagram}</span>
                </a>
              )}

              <button
                onClick={toggleTheme}
                title={isDarkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
                className="p-2 sm:p-2.5 rounded-full bg-white/80 dark:bg-[#2b2225]/80 border border-stone-200/80 dark:border-[#ebcdcd]/20 text-[#504444] dark:text-[#e8e0e3] hover:scale-105 active:scale-95 transition-all shadow-2xs cursor-pointer"
                aria-label="Alternar tema de cores"
              >
                {isDarkMode ? <Sun size={17} className="text-[#fbbf24]" /> : <Moon size={17} className="text-[#613d3e]" />}
              </button>

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center gap-2 px-3 py-2 rounded-full bg-[#613d3e] dark:bg-[#f4b7b9] text-white dark:text-[#4c2527] hover:opacity-95 active:scale-95 transition-all shadow-sm cursor-pointer"
                aria-label="Abrir sacola de encomendas"
              >
                <div className="relative">
                  <ShoppingBag size={18} />
                  {totalItemsCount > 0 && (
                    <span className="absolute -top-2 -right-2 size-4.5 bg-amber-400 text-stone-950 text-[10px] font-black rounded-full flex items-center justify-center tabular-nums shadow-xs">
                      {totalItemsCount}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline text-xs font-semibold">
                  {totalItemsCount > 0 ? formatCurrency(subtotal) : 'Sacola'}
                </span>
              </button>
            </div>

          </div>
        </header>

        {/* Banner de Capa Panorâmico (se cadastrado) */}
        {businessInfo.banner && (
          <div className={`w-full ${
            businessInfo.bannerFixed ? 'sticky top-14 sm:top-16 z-0' : 'relative z-0'
          }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4">
              <div className="relative w-full aspect-[3.2/1] sm:aspect-[4/1] md:aspect-[4.5/1] rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm bg-gradient-to-r from-[#fceee9] via-[#f7d6d0] to-[#ede7f6] dark:from-[#2a1a1f] dark:via-[#3d2429] dark:to-[#1d1624]">
                <img
                  src={businessInfo.banner}
                  alt={`Banner de capa de ${businessInfo.name}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. Conteúdo Principal Responsivo (Desktop até max-w-7xl) */}
        <main className={`relative z-10 ${
          businessInfo.bannerFixed && businessInfo.banner
            ? 'bg-[#fff8f7] dark:bg-[#161214] rounded-t-3xl shadow-[0_-16px_36px_rgba(0,0,0,0.07)] dark:shadow-[0_-16px_36px_rgba(0,0,0,0.45)] -mt-4 sm:-mt-6'
            : ''
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6 sm:space-y-8">
            
            {/* Bloco de Apresentação da Loja & Selos de Confiança */}
            <section className="relative rounded-3xl bg-white/80 dark:bg-[#1f191b]/85 backdrop-blur-md border border-white/60 dark:border-[#ebcdcd]/15 p-5 sm:p-7 shadow-[0_8px_30px_rgb(0_0_0/4%)] dark:shadow-[0_16px_40px_-8px_rgb(0_0_0/50%)] space-y-3.5">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

              {/* Input de Busca no Mobile (oculto no desktop para não duplicar com o header) */}
              <div className="mt-2 md:hidden relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
                <input
                  type="text"
                  placeholder="Buscar por produto, tema, lembrança..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 text-xs rounded-xl bg-white/90 dark:bg-[#120e10]/80 border border-stone-200/80 dark:border-[#ebcdcd]/20 text-[#221a1a] dark:text-[#e8e0e3] placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#613d3e]/30 dark:focus:ring-[#f4b7b9]/30 transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

            </section>

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
            {filteredProducts.map((prod) => (
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

                  {/* Prazo de Confecção & Preço Desktop */}
                  <div className="space-y-1.5 pt-1">
                    <div className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md">
                      <Clock size={11} />
                      <span>Até {prod.leadTimeDays} dias úteis</span>
                    </div>

                    <div className="hidden sm:flex items-baseline justify-between pt-0.5">
                      <span className="text-xs text-stone-400 font-medium">Valor:</span>
                      <span className="text-base font-extrabold text-[#613d3e] dark:text-[#f4b7b9] tabular-nums">
                        {formatCurrency(prod.price)}
                      </span>
                    </div>
                  </div>

                  {/* Botão de Adição / Personalização */}
                  <button
                    onClick={() => handleOpenPreview(prod)}
                    className="w-full mt-2 py-2 sm:py-2.5 px-3 rounded-xl font-semibold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 bg-[#613d3e] dark:bg-[#f4b7b9] text-white dark:text-[#4c2527] hover:opacity-95 active:scale-98 transition-all shadow-xs cursor-pointer"
                  >
                    <ShoppingBag size={13} />
                    <span>Personalizar</span>
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Feedback de Busca Vazia */}
          {filteredProducts.length === 0 && (
            <div className="text-center py-16 text-[#504444] dark:text-[#c9c0b8] bg-white/40 dark:bg-[#1f191b]/50 rounded-3xl p-8 border border-white/50 max-w-lg mx-auto">
              <Search size={32} className="mx-auto text-stone-400 mb-2 opacity-50" />
              <p className="text-sm font-semibold">Nenhum produto encontrado para sua busca.</p>
              <p className="text-xs text-stone-400 mt-1">Tente buscar por outros termos ou selecione "Todos os produtos".</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('todos'); }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-[#613d3e] text-white cursor-pointer"
              >
                Limpar filtros
              </button>
            </div>
          )}

          {/* Banner Informativo: 3 Passos do Atendimento Artesanal (Desktop Grid) */}
          <section className="rounded-3xl p-6 sm:p-8 bg-white/60 dark:bg-[#1f191b]/70 border border-white/50 dark:border-[#ebcdcd]/15 shadow-xs">
            <div className="text-center max-w-xl mx-auto mb-6 space-y-1">
              <h4 className="text-base sm:text-lg font-bold text-[#221a1a] dark:text-[#e8e0e3]">
                Como funciona o atendimento artesanal?
              </h4>
              <p className="text-xs text-[#504444] dark:text-[#c9c0b8]">
                Simples, rápido e com aprovação direta pelo WhatsApp antes da produção.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#161214]/60 border border-stone-200/60 dark:border-stone-800 text-center space-y-2">
                <div className="size-10 rounded-full bg-[#613d3e]/10 dark:bg-[#f4b7b9]/15 text-[#613d3e] dark:text-[#f4b7b9] flex items-center justify-center mx-auto font-bold text-sm">
                  1
                </div>
                <h5 className="text-xs sm:text-sm font-bold text-foreground">Escolha & Personalize</h5>
                <p className="text-[11px] text-[#504444] dark:text-[#c9c0b8] leading-relaxed">
                  Selecione os mimos, defina o tema e informe o nome da aniversariante ou bebê para a capa.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#161214]/60 border border-stone-200/60 dark:border-stone-800 text-center space-y-2">
                <div className="size-10 rounded-full bg-[#10B981]/10 text-[#10B981] flex items-center justify-center mx-auto font-bold text-sm">
                  2
                </div>
                <h5 className="text-xs sm:text-sm font-bold text-foreground">Aprovação no WhatsApp</h5>
                <p className="text-[11px] text-[#504444] dark:text-[#c9c0b8] leading-relaxed">
                  Sua sacola é enviada pronta para o nosso chat, onde enviamos a prévia digital da arte para você aprovar.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#161214]/60 border border-stone-200/60 dark:border-stone-800 text-center space-y-2">
                <div className="size-10 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center mx-auto font-bold text-sm">
                  3
                </div>
                <h5 className="text-xs sm:text-sm font-bold text-foreground">Produção & Envio Afetivo</h5>
                <p className="text-[11px] text-[#504444] dark:text-[#c9c0b8] leading-relaxed">
                  Confeccionamos cada detalhe com materiais nobres e enviamos bem embalado para todo o Brasil.
                </p>
              </div>
            </div>
          </section>

          {/* Footer Institucional Responsivo com Multi-colunas */}
          <footer className="pt-8 pb-12 border-t border-stone-200/60 dark:border-[#ebcdcd]/15 text-xs text-[#504444] dark:text-[#c9c0b8]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 text-center md:text-left">
              {/* Coluna 1: Ateliê & Sobre */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  {businessInfo.logo ? (
                    <img
                      src={businessInfo.logo}
                      alt={businessInfo.name}
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

                  {businessInfo.instagram && (
                    <a
                      href={`https://instagram.com/${businessInfo.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-[#E1306C] transition-colors"
                    >
                      <Instagram size={14} />
                      <span>@{businessInfo.instagram}</span>
                    </a>
                  )}

                  {businessInfo.website && (
                    <a
                      href={businessInfo.website}
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

        {/* 4. Barra Fixa Inferior de Conversão: Adaptativa (Bottom bar no mobile / Floating Dock no desktop) */}
        {totalItemsCount > 0 && (
          <aside className="fixed bottom-0 inset-x-0 sm:bottom-6 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 p-3 sm:p-2 sm:px-4 bg-white/90 dark:bg-[#161214]/95 backdrop-blur-xl border-t sm:border border-stone-200/80 dark:border-[#ebcdcd]/20 sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="max-w-md sm:w-[480px] mx-auto flex items-center justify-between gap-4">
              <div>
                <span className="block text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 tracking-wider">
                  Subtotal ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'})
                </span>
                <span className="text-base font-extrabold text-[#221a1a] dark:text-[#e8e0e3] tabular-nums">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <button
                onClick={() => setIsCartOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-xs flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <MessageCircle size={16} />
                <span>Ver Sacola & Enviar</span>
              </button>
            </div>
          </aside>
        )}

        {/* 5. Modal Responsivo de Prévia / Personalização (2 Colunas no Desktop) */}
        {selectedProductPreview && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="w-full sm:max-w-2xl md:max-w-3xl max-h-[92dvh] flex flex-col md:flex-row rounded-t-3xl sm:rounded-3xl bg-[#fff8f7] dark:bg-[#1f191b] border border-white/45 dark:border-[#ebcdcd]/20 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
              
              {/* Coluna Esquerda (Desktop): Imagem em Alta Resolução */}
              <div className="relative aspect-video md:aspect-auto md:w-1/2 bg-stone-100 dark:bg-stone-900 overflow-hidden shrink-0">
                <img
                  src={selectedProductPreview.imageUrl}
                  alt={selectedProductPreview.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedProductPreview(null)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-xs transition-colors cursor-pointer"
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
              <div className="p-5 md:p-6 flex-1 flex flex-col justify-between overflow-y-auto space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                        {selectedProductPreview.category}
                      </span>
                      <h3 className="text-lg md:text-xl font-extrabold text-[#221a1a] dark:text-[#e8e0e3] leading-snug">
                        {selectedProductPreview.name}
                      </h3>
                    </div>
                    <span className="text-lg md:text-xl font-extrabold text-[#613d3e] dark:text-[#f4b7b9] tabular-nums shrink-0">
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
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-[#161214] border border-stone-300 dark:border-stone-700 text-[#221a1a] dark:text-[#e8e0e3] focus:outline-none focus:ring-2 focus:ring-[#613d3e]/30"
                      />
                      <p className="text-[10px] text-stone-400">
                        Você também poderá combinar mais detalhes da arte depois no WhatsApp.
                      </p>
                    </div>
                  )}
                </div>

                {/* Ação de Adicionar */}
                <div className="pt-3 border-t border-stone-200/50 dark:border-stone-800">
                  <button
                    onClick={() => {
                      addToCart(selectedProductPreview, previewCustomName);
                      setSelectedProductPreview(null);
                      setIsCartOpen(true);
                    }}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-[#613d3e] dark:bg-[#f4b7b9] text-white dark:text-[#4c2527] hover:opacity-95 active:scale-[0.98] transition-all shadow-md cursor-pointer"
                  >
                    <ShoppingBag size={16} />
                    <span>Adicionar à Sacola de Encomendas</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 6. Gaveta Lateral / Slide-over Drawer da Sacola de Pedidos */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
            {/* Backdrop clicável no desktop */}
            <div className="hidden sm:block absolute inset-0" onClick={() => setIsCartOpen(false)} />

            {/* Container da Gaveta (Full-height slide-over no desktop, bottom sheet no mobile) */}
            <div className="relative w-full sm:max-w-md h-auto max-h-[92dvh] sm:max-h-none sm:h-full flex flex-col rounded-t-3xl sm:rounded-none sm:rounded-l-3xl bg-[#fff8f7] dark:bg-[#1f191b] border-t sm:border-t-0 sm:border-l border-stone-200/80 dark:border-stone-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-right duration-200">
              
              {/* Header do Carrinho */}
              <div className="p-4 sm:p-5 flex items-center justify-between border-b border-stone-200/60 dark:border-[#ebcdcd]/10">
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
              <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3">
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
                            className="w-full px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-[#161214] border border-stone-200 dark:border-stone-700 text-[#221a1a] dark:text-[#e8e0e3] focus:outline-none focus:ring-1 focus:ring-[#613d3e]"
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
                      className="w-full p-2.5 text-xs rounded-xl bg-white dark:bg-[#261f22] border border-stone-200 dark:border-stone-700 text-[#221a1a] dark:text-[#e8e0e3] focus:outline-none focus:ring-1 focus:ring-[#613d3e]"
                    />
                  </div>
                )}
              </div>

              {/* Footer do Carrinho com Envio WhatsApp */}
              {cart.length > 0 && (
                <div className="p-4 sm:p-5 bg-white/90 dark:bg-[#161214]/90 border-t border-stone-200/80 dark:border-stone-800 space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span>Subtotal Estimado:</span>
                    <span className="text-lg text-[#613d3e] dark:text-[#f4b7b9] tabular-nums font-extrabold">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  <button
                    onClick={handleSendToWhatsApp}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer"
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

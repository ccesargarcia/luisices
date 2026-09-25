import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router';
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
  Sparkle,
  CheckCircle2,
  Tag,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  HelpCircle,
  Building2,
  Percent,
  BadgePercent,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import {
  normalizePhoneForWhatsApp,
  formatPhoneForDisplay,
  generateCatalogOrderWhatsAppMessage,
  generateProductInquiryWhatsAppMessage,
  generateBespokeConsultationWhatsAppMessage,
} from '../utils/whatsapp';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BannerCarousel, CatalogBannerItem } from '../components/catalog/BannerCarousel';
import {
  InstitutionalPillarItem,
  InstitutionalStepItem,
  InstitutionalFeatureItem,
  InstitutionalFaqItem,
  InstitutionalCustomSection,
} from '../../services/firebaseSettingsService';
import { firebaseCatalogOrderService } from '../../services/firebaseCatalogOrderService';
import { toCdnUrl } from '../utils/cdnUtils';
import { FormattedDescription } from '../components/FormattedDescription';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

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
  order?: number;
  createdAt?: string;
}

export interface CartItem {
  id: string;
  product: CatalogProduct;
  quantity: number;
  customName?: string;
}

export function PublicCatalog() {

  // Controle de tema: recupera preferência salva no localStorage para persistir entre recarregamentos
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('luisices_catalog_theme');
      if (saved) return saved === 'dark';
    } catch {}
    return false;
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('luisices_public_store_settings') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.catalogDefaultSort) return parsed.catalogDefaultSort;
      }
    } catch {}
    return 'destaque';
  });
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState<boolean>(false);
  const [bottomSheetSearchQuery, setBottomSheetSearchQuery] = useState<string>('');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown flutuante de categorias ao clicar fora ou pressionar ESC
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsCategoryDropdownOpen(false);
        setIsBottomSheetOpen(false);
      }
    }
    if (isCategoryDropdownOpen || isBottomSheetOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoryDropdownOpen, isBottomSheetOpen]);

  // Produtos reais carregados em tempo real via Firestore (IndexedDB nativo do SDK)
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Limpeza de caches obsoletos de produtos no localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('luisices_public_catalog_products');
    } catch {}
  }, []);

  // Informações do negócio e customizações da lojinha (recuperadas do localStorage para evitar qualquer flash no reload)
  const [businessInfo, setBusinessInfo] = useState(() => {
    let saved: any = null;
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('luisices_public_store_settings') : null;
      if (raw) saved = JSON.parse(raw);
    } catch {}

    return {
      name: saved?.catalogStoreName || saved?.name || saved?.businessName || 'Luisices Papelaria Personalizada',
      tagline: saved?.catalogStoreTagline !== undefined ? saved.catalogStoreTagline : (saved?.tagline || saved?.businessTagline || ''),
      whatsapp: saved?.catalogWhatsappPhone || saved?.whatsappPhone || saved?.businessPhone || saved?.whatsapp || '',
      instagram: saved?.instagramUrl
        ? saved.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')
        : (saved?.instagram || ''),
      instagramColab: saved?.instagramColabUrl
        ? saved.instagramColabUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')
        : (saved?.instagramColab || ''),
      website: saved?.websiteUrl || saved?.website || '',
      logo: saved?.catalogLogo || saved?.logo || '',
      banner: saved?.catalogBanner || saved?.banner || '',
      banners: (saved?.catalogBanners || saved?.banners || []) as CatalogBannerItem[],
      bannerInterval: Number(saved?.catalogBannerInterval || saved?.bannerInterval) || 5,
      bannerAutoPlay: saved?.catalogBannerAutoPlay !== undefined ? Boolean(saved.catalogBannerAutoPlay) : (saved?.bannerAutoPlay ?? true),
      bannerFixed: saved?.catalogBannerFixed !== undefined ? Boolean(saved.catalogBannerFixed) : (saved?.bannerFixed ?? false),
      headerBackground: saved?.catalogHeaderBackground || saved?.headerBackground || '',
      headerBgColor: saved?.catalogHeaderBgColor || saved?.headerBgColor || '',
      headerTextColor: (saved?.catalogHeaderTextColor || saved?.headerTextColor || 'dark') as 'dark' | 'light',
      headerLogoPosition: (saved?.catalogHeaderLogoPosition || saved?.headerLogoPosition || 'left') as 'left' | 'center' | 'full',
      headerHeight: (saved?.catalogHeaderHeight || saved?.headerHeight || 'normal') as 'compact' | 'normal' | 'large',
      headerHideText: Boolean(saved?.catalogHeaderHideText ?? saved?.headerHideText ?? false),
      categoryFilterStyle: (saved?.catalogCategoryFilterStyle || 'dropdown') as 'dropdown' | 'carousel' | 'bottom_sheet',
      cardDensity: (saved?.catalogCardDensity || 'compact') as 'compact' | 'editorial',
      imageAspect: (saved?.catalogImageAspect || 'square') as 'square' | 'portrait',
      showBadgeCustomizable: saved?.catalogShowBadgeCustomizable !== undefined ? Boolean(saved.catalogShowBadgeCustomizable) : true,
      showBadgeLeadTime: saved?.catalogShowBadgeLeadTime !== undefined ? Boolean(saved.catalogShowBadgeLeadTime) : true,
      showBadgeBestSeller: saved?.catalogShowBadgeBestSeller !== undefined ? Boolean(saved.catalogShowBadgeBestSeller) : true,
      showBadgeNew: saved?.catalogShowBadgeNew !== undefined ? Boolean(saved.catalogShowBadgeNew) : true,
      storeMode: (saved?.catalogStoreMode || 'cart') as 'cart' | 'direct_inquiry' | 'portfolio',
      showFloatingWhatsApp: saved?.catalogShowFloatingWhatsApp !== undefined ? Boolean(saved.catalogShowFloatingWhatsApp) : true,
      floatingWhatsAppText: saved?.catalogFloatingWhatsAppText || 'Fale Conosco no WhatsApp',
      pixDiscountText: saved?.catalogPixDiscountText || '',
      advanceNoticeText: saved?.catalogAdvanceNoticeText || '',
      minOrderAmount: Number(saved?.catalogMinOrderAmount) || 0,
      backgroundStyle: (saved?.catalogBackgroundStyle || 'atmospheric') as 'atmospheric' | 'solid',
      typographyStyle: (saved?.catalogTypographyStyle || 'modern') as 'modern' | 'editorial',
      defaultSort: (saved?.catalogDefaultSort || 'destaque') as string,
      badge: saved?.catalogBadge !== undefined ? saved.catalogBadge : '',
      statusText: saved?.catalogStatusText !== undefined ? saved.catalogStatusText : '',
      announcement: saved?.catalogAnnouncement !== undefined ? saved.catalogAnnouncement : '',
      showHero: saved?.catalogShowHero !== undefined ? Boolean(saved.catalogShowHero) : (saved?.showHero !== undefined ? Boolean(saved.showHero) : false),
      heroTitle: saved?.catalogHeroTitle || saved?.heroTitle || '',
      heroDescription: saved?.catalogHeroDescription || saved?.heroDescription || '',
      whatsappGreeting: saved?.catalogWhatsappGreeting || saved?.whatsappGreeting || 'Olá! Gostaria de encomendar pelo catálogo do Ateliê:',
      whatsappCustomizationLabel: saved?.catalogWhatsappCustomizationLabel || saved?.whatsappCustomizationLabel || 'Nome/Personalização:',
      whatsappFooter: saved?.catalogWhatsappFooter || saved?.whatsappFooter || 'Poderia me passar as opções de frete/retirada e a chave PIX para confirmar?',
      footerText: saved?.catalogFooterText || saved?.footerText || '',
      footerLocation: saved?.catalogFooterLocation || saved?.footerLocation || '',
      footerBusinessHours: saved?.catalogFooterBusinessHours || saved?.footerBusinessHours || '',
      footerNotice: saved?.catalogFooterNotice || saved?.footerNotice || '',
      footerCopyright: saved?.catalogFooterCopyright || saved?.footerCopyright || `© ${new Date().getFullYear()} Luisices. Todos os direitos reservados.`,

      // 1. Quem Somos
      showAbout: saved?.catalogShowAbout !== undefined ? Boolean(saved.catalogShowAbout) : false,
      aboutBadge: saved?.catalogAboutBadge || '',
      aboutTitle: saved?.catalogAboutTitle || '',
      aboutText: saved?.catalogAboutText || '',
      aboutImageUrl: saved?.catalogAboutImageUrl ? toCdnUrl(saved.catalogAboutImageUrl) : '',
      aboutPillars: (Array.isArray(saved?.catalogAboutPillars) && saved.catalogAboutPillars.length > 0
        ? saved.catalogAboutPillars
        : [
            { id: 'p1', title: saved?.catalogAboutPillar1Title || '', text: saved?.catalogAboutPillar1Text || '' },
            { id: 'p2', title: saved?.catalogAboutPillar2Title || '', text: saved?.catalogAboutPillar2Text || '' },
            { id: 'p3', title: saved?.catalogAboutPillar3Title || '', text: saved?.catalogAboutPillar3Text || '' },
          ]
      ).filter((p: InstitutionalPillarItem) => Boolean(p.title || p.text)),
      aboutPillar1Title: saved?.catalogAboutPillar1Title || '',
      aboutPillar1Text: saved?.catalogAboutPillar1Text || '',
      aboutPillar2Title: saved?.catalogAboutPillar2Title || '',
      aboutPillar2Text: saved?.catalogAboutPillar2Text || '',
      aboutPillar3Title: saved?.catalogAboutPillar3Title || '',
      aboutPillar3Text: saved?.catalogAboutPillar3Text || '',

      // 2. Como Funciona
      showHowItWorks: saved?.catalogShowHowItWorks !== undefined ? Boolean(saved.catalogShowHowItWorks) : false,
      howItWorksBadge: saved?.catalogHowItWorksBadge || '',
      howItWorksTitle: saved?.catalogHowItWorksTitle || '',
      howItWorksSubtitle: saved?.catalogHowItWorksSubtitle || '',
      howItWorksSteps: (Array.isArray(saved?.catalogHowItWorksSteps) && saved.catalogHowItWorksSteps.length > 0
        ? saved.catalogHowItWorksSteps
        : [
            { id: 's1', title: saved?.catalogHowItWorksStep1Title || '', text: saved?.catalogHowItWorksStep1Text || '' },
            { id: 's2', title: saved?.catalogHowItWorksStep2Title || '', text: saved?.catalogHowItWorksStep2Text || '' },
            { id: 's3', title: saved?.catalogHowItWorksStep3Title || '', text: saved?.catalogHowItWorksStep3Text || '' },
            { id: 's4', title: saved?.catalogHowItWorksStep4Title || '', text: saved?.catalogHowItWorksStep4Text || '' },
          ]
      ).filter((st: InstitutionalStepItem) => Boolean(st.title || st.text)),
      howItWorksStep1Title: saved?.catalogHowItWorksStep1Title || '',
      howItWorksStep1Text: saved?.catalogHowItWorksStep1Text || '',
      howItWorksStep2Title: saved?.catalogHowItWorksStep2Title || '',
      howItWorksStep2Text: saved?.catalogHowItWorksStep2Text || '',
      howItWorksStep3Title: saved?.catalogHowItWorksStep3Title || '',
      howItWorksStep3Text: saved?.catalogHowItWorksStep3Text || '',
      howItWorksStep4Title: saved?.catalogHowItWorksStep4Title || '',
      howItWorksStep4Text: saved?.catalogHowItWorksStep4Text || '',

      // 3. Diferenciais
      showFeatures: saved?.catalogShowFeatures !== undefined ? Boolean(saved.catalogShowFeatures) : false,
      featuresBadge: saved?.catalogFeaturesBadge || '',
      featuresTitle: saved?.catalogFeaturesTitle || '',
      featureItems: (Array.isArray(saved?.catalogFeatureItems) && saved.catalogFeatureItems.length > 0
        ? saved.catalogFeatureItems
        : [
            { id: 'f1', title: saved?.catalogFeature1Title || '', text: saved?.catalogFeature1Text || '' },
            { id: 'f2', title: saved?.catalogFeature2Title || '', text: saved?.catalogFeature2Text || '' },
            { id: 'f3', title: saved?.catalogFeature3Title || '', text: saved?.catalogFeature3Text || '' },
            { id: 'f4', title: saved?.catalogFeature4Title || '', text: saved?.catalogFeature4Text || '' },
          ]
      ).filter((f: InstitutionalFeatureItem) => Boolean(f.title || f.text)),
      feature1Title: saved?.catalogFeature1Title || '',
      feature1Text: saved?.catalogFeature1Text || '',
      feature2Title: saved?.catalogFeature2Title || '',
      feature2Text: saved?.catalogFeature2Text || '',
      feature3Title: saved?.catalogFeature3Title || '',
      feature3Text: saved?.catalogFeature3Text || '',
      feature4Title: saved?.catalogFeature4Title || '',
      feature4Text: saved?.catalogFeature4Text || '',

      // 4. FAQ
      showFaq: saved?.catalogShowFaq !== undefined ? Boolean(saved.catalogShowFaq) : false,
      faqBadge: saved?.catalogFaqBadge || '',
      faqTitle: saved?.catalogFaqTitle || '',
      faqItems: (Array.isArray(saved?.catalogFaqItems) && saved.catalogFaqItems.length > 0
        ? saved.catalogFaqItems
        : [
            { id: 'faq1', question: saved?.catalogFaq1Q || '', answer: saved?.catalogFaq1A || '' },
            { id: 'faq2', question: saved?.catalogFaq2Q || '', answer: saved?.catalogFaq2A || '' },
            { id: 'faq3', question: saved?.catalogFaq3Q || '', answer: saved?.catalogFaq3A || '' },
            { id: 'faq4', question: saved?.catalogFaq4Q || '', answer: saved?.catalogFaq4A || '' },
            { id: 'faq5', question: saved?.catalogFaq5Q || '', answer: saved?.catalogFaq5A || '' },
          ]
      ).filter((faq: InstitutionalFaqItem) => Boolean(faq.question || faq.answer)),
      faq1Q: saved?.catalogFaq1Q || '',
      faq1A: saved?.catalogFaq1A || '',
      faq2Q: saved?.catalogFaq2Q || '',
      faq2A: saved?.catalogFaq2A || '',
      faq3Q: saved?.catalogFaq3Q || '',
      faq3A: saved?.catalogFaq3A || '',
      faq4Q: saved?.catalogFaq4Q || '',
      faq4A: saved?.catalogFaq4A || '',
      faq5Q: saved?.catalogFaq5Q || '',
      faq5A: saved?.catalogFaq5A || '',

      // 5. Seções Extras
      customSections: Array.isArray(saved?.catalogCustomSections)
        ? saved.catalogCustomSections.filter((sec: InstitutionalCustomSection) => Boolean(sec.title || sec.content))
        : [],
    };
  });

  // Estado da Sacola com persistência em localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('luisices_catalog_cart');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item: any, idx: number) => ({
        ...item,
        id: item.id || `cart-${idx}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      }));
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedProductPreview, setSelectedProductPreview] = useState<CatalogProduct | null>(null);
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [previewCustomName, setPreviewCustomName] = useState<string>('');
  const [submittedOrderInfo, setSubmittedOrderInfo] = useState<{ orderCode: string; whatsappUrl: string } | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<boolean>(false);
  const [headerBgError, setHeaderBgError] = useState<boolean>(false);

  // Estado de publicação da loja (feature flag principal)
  const [storePublished, setStorePublished] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem('luisices_public_store_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.storePublished !== undefined ? Boolean(parsed.storePublished) : true;
      }
    } catch {}
    return true; // padrão: publicada
  });
  const [storeUnpublishMessage, setStoreUnpublishMessage] = useState<string>(() => {
    try {
      const cached = localStorage.getItem('luisices_public_store_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.storeUnpublishMessage || '';
      }
    } catch {}
    return '';
  });
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>(() => {
    try {
      const cached = localStorage.getItem('luisices_public_store_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        return { enableOnlineOrders: true, enableDarkMode: true, ...(parsed.featureFlags || {}) };
      }
    } catch {}
    return { enableOnlineOrders: true, enableDarkMode: true };
  });

  useEffect(() => {
    setLogoError(false);
  }, [businessInfo.logo]);

  useEffect(() => {
    setHeaderBgError(false);
  }, [businessInfo.headerBackground]);

  // Isolar o tema da lojinha: persiste a escolha da lojinha e restaura o tema do painel ao desmontar
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

    try {
      localStorage.setItem('luisices_catalog_theme', isDarkMode ? 'dark' : 'light');
    } catch {}

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

  // Alternar tema Claro / Escuro da lojinha (persistindo no localStorage sem alterar o tema administrativo)
  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('luisices_catalog_theme', next ? 'dark' : 'light');
      } catch {}
      return next;
    });
  };

  // Salvar carrinho
  useEffect(() => {
    try {
      localStorage.setItem('luisices_catalog_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Carregar configurações públicas da loja com cache local inteligente
  useEffect(() => {
    let isMounted = true;

    const applySettings = (s: any) => {
      setBusinessInfo((prev: typeof businessInfo) => ({
        name: s.catalogStoreName || s.name || (s.businessName !== undefined && s.businessName !== '' ? s.businessName : prev.name),
        tagline: s.catalogStoreTagline !== undefined ? s.catalogStoreTagline : (s.businessTagline !== undefined ? s.businessTagline : (s.tagline || '')),
        whatsapp: s.catalogWhatsappPhone || s.whatsappPhone || s.businessPhone || '',
        instagram: s.instagramUrl ? s.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '') : '',
        instagramColab: s.instagramColabUrl ? s.instagramColabUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '') : '',
        website: s.websiteUrl || '',
        logo: toCdnUrl(s.catalogLogo) || '',
        banner: toCdnUrl(s.catalogBanner) || '',
        banners: Array.isArray(s.catalogBanners) && s.catalogBanners.length > 0
          ? s.catalogBanners.map((b: CatalogBannerItem) => ({ ...b, imageUrl: toCdnUrl(b.imageUrl) }))
          : (s.catalogBanner ? [{ id: 'b-default', imageUrl: toCdnUrl(s.catalogBanner) }] : []),
        bannerInterval: Number(s.catalogBannerInterval) || prev.bannerInterval || 5,
        bannerAutoPlay: s.catalogBannerAutoPlay !== undefined ? Boolean(s.catalogBannerAutoPlay) : true,
        bannerFixed: s.catalogBannerFixed !== undefined ? Boolean(s.catalogBannerFixed) : false,
        headerBackground: toCdnUrl(s.catalogHeaderBackground) || '',
        headerBgColor: s.catalogHeaderBgColor || '',
        headerTextColor: s.catalogHeaderTextColor || 'dark',
        headerLogoPosition: s.catalogHeaderLogoPosition || 'left',
        headerHeight: s.catalogHeaderHeight || 'normal',
        headerHideText: Boolean(s.catalogHeaderHideText),
        categoryFilterStyle: (s.catalogCategoryFilterStyle || prev.categoryFilterStyle || 'dropdown') as 'dropdown' | 'carousel' | 'bottom_sheet',
        cardDensity: (s.catalogCardDensity || prev.cardDensity || 'compact') as 'compact' | 'editorial',
        imageAspect: (s.catalogImageAspect || prev.imageAspect || 'square') as 'square' | 'portrait',
        showBadgeCustomizable: s.catalogShowBadgeCustomizable !== undefined ? Boolean(s.catalogShowBadgeCustomizable) : prev.showBadgeCustomizable,
        showBadgeLeadTime: s.catalogShowBadgeLeadTime !== undefined ? Boolean(s.catalogShowBadgeLeadTime) : prev.showBadgeLeadTime,
        showBadgeBestSeller: s.catalogShowBadgeBestSeller !== undefined ? Boolean(s.catalogShowBadgeBestSeller) : prev.showBadgeBestSeller,
        showBadgeNew: s.catalogShowBadgeNew !== undefined ? Boolean(s.catalogShowBadgeNew) : prev.showBadgeNew,
        storeMode: (s.catalogStoreMode || prev.storeMode || 'cart') as 'cart' | 'direct_inquiry' | 'portfolio',
        showFloatingWhatsApp: s.catalogShowFloatingWhatsApp !== undefined ? Boolean(s.catalogShowFloatingWhatsApp) : prev.showFloatingWhatsApp,
        floatingWhatsAppText: s.catalogFloatingWhatsAppText !== undefined ? s.catalogFloatingWhatsAppText : prev.floatingWhatsAppText,
        pixDiscountText: s.catalogPixDiscountText !== undefined ? s.catalogPixDiscountText : prev.pixDiscountText,
        advanceNoticeText: s.catalogAdvanceNoticeText !== undefined ? s.catalogAdvanceNoticeText : prev.advanceNoticeText,
        minOrderAmount: s.catalogMinOrderAmount !== undefined ? Number(s.catalogMinOrderAmount) : prev.minOrderAmount,
        backgroundStyle: (s.catalogBackgroundStyle || prev.backgroundStyle || 'atmospheric') as 'atmospheric' | 'solid',
        typographyStyle: (s.catalogTypographyStyle || prev.typographyStyle || 'modern') as 'modern' | 'editorial',
        defaultSort: (s.catalogDefaultSort || prev.defaultSort || 'destaque') as string,
        badge: s.catalogBadge !== undefined ? s.catalogBadge : '',
        statusText: s.catalogStatusText !== undefined ? s.catalogStatusText : '',
        announcement: s.catalogAnnouncement !== undefined ? s.catalogAnnouncement : '',
        heroTitle: s.catalogHeroTitle !== undefined ? s.catalogHeroTitle : '',
        heroDescription: s.catalogHeroDescription !== undefined ? s.catalogHeroDescription : '',
        showHero: s.catalogShowHero !== undefined ? Boolean(s.catalogShowHero) : false,
        whatsappGreeting: s.catalogWhatsappGreeting || prev.whatsappGreeting,
        whatsappCustomizationLabel: s.catalogWhatsappCustomizationLabel || prev.whatsappCustomizationLabel,
        whatsappFooter: s.catalogWhatsappFooter || prev.whatsappFooter,
        footerText: s.catalogFooterText !== undefined ? s.catalogFooterText : '',
        footerLocation: s.catalogFooterLocation !== undefined ? s.catalogFooterLocation : '',
        footerBusinessHours: s.catalogFooterBusinessHours !== undefined ? s.catalogFooterBusinessHours : '',
        footerNotice: s.catalogFooterNotice !== undefined ? s.catalogFooterNotice : '',
        footerCopyright: s.catalogFooterCopyright !== undefined ? s.catalogFooterCopyright : prev.footerCopyright,

        // 1. Quem Somos
        showAbout: s.catalogShowAbout !== undefined ? Boolean(s.catalogShowAbout) : false,
        aboutBadge: s.catalogAboutBadge || '',
        aboutTitle: s.catalogAboutTitle || '',
        aboutText: s.catalogAboutText || '',
        aboutImageUrl: toCdnUrl(s.catalogAboutImageUrl) || '',
        aboutPillars: (Array.isArray(s.catalogAboutPillars) && s.catalogAboutPillars.length > 0
          ? s.catalogAboutPillars
          : [
              { id: 'p1', title: s.catalogAboutPillar1Title || '', text: s.catalogAboutPillar1Text || '' },
              { id: 'p2', title: s.catalogAboutPillar2Title || '', text: s.catalogAboutPillar2Text || '' },
              { id: 'p3', title: s.catalogAboutPillar3Title || '', text: s.catalogAboutPillar3Text || '' },
            ]
        ).filter((p: InstitutionalPillarItem) => Boolean(p.title || p.text)),
        aboutPillar1Title: s.catalogAboutPillar1Title || '',
        aboutPillar1Text: s.catalogAboutPillar1Text || '',
        aboutPillar2Title: s.catalogAboutPillar2Title || '',
        aboutPillar2Text: s.catalogAboutPillar2Text || '',
        aboutPillar3Title: s.catalogAboutPillar3Title || '',
        aboutPillar3Text: s.catalogAboutPillar3Text || '',

        // 2. Como Funciona
        showHowItWorks: s.catalogShowHowItWorks !== undefined ? Boolean(s.catalogShowHowItWorks) : false,
        howItWorksBadge: s.catalogHowItWorksBadge || '',
        howItWorksTitle: s.catalogHowItWorksTitle || '',
        howItWorksSubtitle: s.catalogHowItWorksSubtitle || '',
        howItWorksSteps: (Array.isArray(s.catalogHowItWorksSteps) && s.catalogHowItWorksSteps.length > 0
          ? s.catalogHowItWorksSteps
          : [
              { id: 's1', title: s.catalogHowItWorksStep1Title || '', text: s.catalogHowItWorksStep1Text || '' },
              { id: 's2', title: s.catalogHowItWorksStep2Title || '', text: s.catalogHowItWorksStep2Text || '' },
              { id: 's3', title: s.catalogHowItWorksStep3Title || '', text: s.catalogHowItWorksStep3Text || '' },
              { id: 's4', title: s.catalogHowItWorksStep4Title || '', text: s.catalogHowItWorksStep4Text || '' },
            ]
        ).filter((st: InstitutionalStepItem) => Boolean(st.title || st.text)),
        howItWorksStep1Title: s.catalogHowItWorksStep1Title || '',
        howItWorksStep1Text: s.catalogHowItWorksStep1Text || '',
        howItWorksStep2Title: s.catalogHowItWorksStep2Title || '',
        howItWorksStep2Text: s.catalogHowItWorksStep2Text || '',
        howItWorksStep3Title: s.catalogHowItWorksStep3Title || '',
        howItWorksStep3Text: s.catalogHowItWorksStep3Text || '',
        howItWorksStep4Title: s.catalogHowItWorksStep4Title || '',
        howItWorksStep4Text: s.catalogHowItWorksStep4Text || '',

        // 3. Diferenciais
        showFeatures: s.catalogShowFeatures !== undefined ? Boolean(s.catalogShowFeatures) : false,
        featuresBadge: s.catalogFeaturesBadge || '',
        featuresTitle: s.catalogFeaturesTitle || '',
        featureItems: (Array.isArray(s.catalogFeatureItems) && s.catalogFeatureItems.length > 0
          ? s.catalogFeatureItems
          : [
              { id: 'f1', title: s.catalogFeature1Title || '', text: s.catalogFeature1Text || '' },
              { id: 'f2', title: s.catalogFeature2Title || '', text: s.catalogFeature2Text || '' },
              { id: 'f3', title: s.catalogFeature3Title || '', text: s.catalogFeature3Text || '' },
              { id: 'f4', title: s.catalogFeature4Title || '', text: s.catalogFeature4Text || '' },
            ]
        ).filter((f: InstitutionalFeatureItem) => Boolean(f.title || f.text)),
        feature1Title: s.catalogFeature1Title || '',
        feature1Text: s.catalogFeature1Text || '',
        feature2Title: s.catalogFeature2Title || '',
        feature2Text: s.catalogFeature2Text || '',
        feature3Title: s.catalogFeature3Title || '',
        feature3Text: s.catalogFeature3Text || '',
        feature4Title: s.catalogFeature4Title || '',
        feature4Text: s.catalogFeature4Text || '',

        // 4. FAQ
        showFaq: s.catalogShowFaq !== undefined ? Boolean(s.catalogShowFaq) : false,
        faqBadge: s.catalogFaqBadge || '',
        faqTitle: s.catalogFaqTitle || '',
        faqItems: (Array.isArray(s.catalogFaqItems) && s.catalogFaqItems.length > 0
          ? s.catalogFaqItems
          : [
              { id: 'faq1', question: s.catalogFaq1Q || '', answer: s.catalogFaq1A || '' },
              { id: 'faq2', question: s.catalogFaq2Q || '', answer: s.catalogFaq2A || '' },
              { id: 'faq3', question: s.catalogFaq3Q || '', answer: s.catalogFaq3A || '' },
              { id: 'faq4', question: s.catalogFaq4Q || '', answer: s.catalogFaq4A || '' },
              { id: 'faq5', question: s.catalogFaq5Q || '', answer: s.catalogFaq5A || '' },
            ]
        ).filter((faq: InstitutionalFaqItem) => Boolean(faq.question || faq.answer)),
        faq1Q: s.catalogFaq1Q || '',
        faq1A: s.catalogFaq1A || '',
        faq2Q: s.catalogFaq2Q || '',
        faq2A: s.catalogFaq2A || '',
        faq3Q: s.catalogFaq3Q || '',
        faq3A: s.catalogFaq3A || '',
        faq4Q: s.catalogFaq4Q || '',
        faq4A: s.catalogFaq4A || '',
        faq5Q: s.catalogFaq5Q || '',
        faq5A: s.catalogFaq5A || '',

        // 5. Seções Extras
        customSections: Array.isArray(s.catalogCustomSections)
          ? s.catalogCustomSections.filter((sec: InstitutionalCustomSection) => Boolean(sec.title || sec.content))
          : [],
      }));

      setStorePublished(s.storePublished !== undefined ? Boolean(s.storePublished) : true);
      setStoreUnpublishMessage(s.storeUnpublishMessage || '');
      if (s.featureFlags && typeof s.featureFlags === 'object') {
        setFeatureFlags((prev) => ({ ...prev, ...s.featureFlags }));
      }
    };

    // Tentar carregar do cache local primeiro para renderização imediata
    try {
      const cached = localStorage.getItem('luisices_public_store_settings');
      if (cached) {
        applySettings(JSON.parse(cached));
      }
    } catch {}

    // Buscar versão atualizada no Firestore
    getDoc(doc(db, 'storeSettings', 'public'))
      .then((publicSettingsSnap) => {
        if (!isMounted) return;
        if (publicSettingsSnap.exists()) {
          const s = publicSettingsSnap.data();
          try {
            localStorage.setItem('luisices_public_store_settings', JSON.stringify(s));
          } catch {}
          applySettings(s);
        }
      })
      .catch((settingsErr) => {
        console.warn('Configurações públicas locais em uso:', settingsErr);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Carregar produtos da vitrine via getDocs pontual com cache para visitantes
  useEffect(() => {
    let isMounted = true;

    const processProducts = (docs: Array<{ id: string; data: () => any }>) => {
      const storeList: CatalogProduct[] = [];
      docs.forEach((d) => {
        const data = d.data();
        if (data.name && Number(data.price ?? data.unitPrice) > 0 && data.active !== false) {
          const rawLead = data.leadTimeDays;
          const leadTimeDays = rawLead !== undefined && rawLead !== null && !isNaN(Number(rawLead))
            ? Math.max(0, Number(rawLead))
            : 5;
          const rawImg = data.imageUrl || data.photoUrl || (data.images && data.images[0]);
          storeList.push({
            id: d.id,
            name: data.name,
            category: data.category || 'Geral',
            price: Number(data.price ?? data.unitPrice) || 0,
            description: data.description || 'Produto artesanal confeccionado com carinho sob encomenda.',
            leadTimeDays,
            imageUrl: toCdnUrl(rawImg) || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
            badge: data.badge || undefined,
            isCustomizable: data.isCustomizable ?? true,
            order: data.order !== undefined ? Number(data.order) : undefined,
            createdAt: data.createdAt?.toDate?.()?.toISOString() ?? (typeof data.createdAt === 'string' ? data.createdAt : undefined),
          });
        }
      });

      // Ordenar produtos por prioridade configurada (ordem do ateliê ou mais recentes primeiro)
      storeList.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
          return a.order - b.order;
        }
        if (a.order !== undefined && b.order === undefined) return -1;
        if (a.order === undefined && b.order !== undefined) return 1;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      if (!isMounted) return;
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
    };

    getDocs(collection(db, 'storeProducts'))
      .then((snap) => {
        if (!isMounted) return;
        processProducts(snap.docs.map((d) => ({ id: d.id, data: () => d.data() })));
      })
      .catch((err) => {
        console.warn('Erro ao carregar produtos da vitrine pública:', err);
        if (isMounted) setLoadingProducts(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);



  // Travar o scroll de fundo enquanto modal, sacola ou gaveta estiverem abertos
  const isAnyModalOpen = Boolean(isCartOpen || selectedProductPreview || submittedOrderInfo || isBottomSheetOpen);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyModalOpen]);

  // Fechar modal, gaveta ou sacola com a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (submittedOrderInfo) {
          setSubmittedOrderInfo(null);
        } else if (selectedProductPreview) {
          setSelectedProductPreview(null);
        } else if (isCartOpen) {
          setIsCartOpen(false);
        } else if (isBottomSheetOpen) {
          setIsBottomSheetOpen(false);
        } else if (isCategoryDropdownOpen) {
          setIsCategoryDropdownOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProductPreview, isCartOpen, submittedOrderInfo, isBottomSheetOpen, isCategoryDropdownOpen]);

  // Categorias dinâmicas derivadas dos produtos
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    const unique = Array.from(set).sort((a, b) => a.localeCompare(b));
    return ['todos', ...unique];
  }, [products]);

  // Helpers para Seleção Múltipla de Categorias
  const isAllCategories = selectedCategories.length === 0 || selectedCategories.includes('todos');

  const isCategorySelected = useCallback((cat: string) => {
    if (cat.toLowerCase() === 'todos') {
      return isAllCategories;
    }
    return !isAllCategories && selectedCategories.some((c) => c.toLowerCase() === cat.toLowerCase());
  }, [isAllCategories, selectedCategories]);

  const toggleCategory = useCallback((cat: string) => {
    if (cat.toLowerCase() === 'todos') {
      setSelectedCategories([]);
      return;
    }
    setSelectedCategories((prev) => {
      const isSelected = prev.some((c) => c.toLowerCase() === cat.toLowerCase());
      if (isSelected) {
        return prev.filter((c) => c.toLowerCase() !== cat.toLowerCase());
      } else {
        const clean = prev.filter((c) => c.toLowerCase() !== 'todos');
        return [...clean, cat];
      }
    });
  }, []);

  const removeCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c.toLowerCase() !== cat.toLowerCase()));
  }, []);

  const clearCategories = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  // Contadores dinâmicos de produtos por categoria em tempo real
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { todos: products.length };
    products.forEach((p) => {
      if (p.category) {
        const cat = p.category;
        map[cat] = (map[cat] || 0) + 1;
      }
    });
    return map;
  }, [products]);

  // Lista de temas filtrada na busca interna da Gaveta / Bottom Sheet
  const filteredCategoriesForSheet = useMemo(() => {
    if (!bottomSheetSearchQuery.trim()) return categories;
    const q = bottomSheetSearchQuery.toLowerCase().trim();
    return categories.filter((c) =>
      c === 'todos' ? 'todos os temas & ocasiões todas as peças'.includes(q) : c.toLowerCase().includes(q)
    );
  }, [categories, bottomSheetSearchQuery]);

  // Filtragem dinâmica e ordenação com suporte a Seleção Múltipla de Temas
  const filteredProducts = useMemo(() => {
    let list = products.filter((prod) => {
      const matchesCat = isAllCategories || selectedCategories.some((c) => c.toLowerCase() === prod.category.toLowerCase());
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
  }, [products, isAllCategories, selectedCategories, searchQuery, sortBy]);

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

  const cleanInstagramColab = useMemo(() => {
    if (!businessInfo.instagramColab) return '';
    return businessInfo.instagramColab.replace(/[^a-zA-Z0-9._]/g, '');
  }, [businessInfo.instagramColab]);

  // Ações da Sacola
  const addToCart = useCallback((product: CatalogProduct, customName?: string, quantity: number = 1) => {
    if (featureFlags.enableOnlineOrders === false) return;
    const trimmedCustom = (customName || '').trim();
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && (item.customName || '').trim() === trimmedCustom
      );
      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      const newItemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      return [...prev, { id: newItemId, product, quantity, customName: trimmedCustom || undefined }];
    });
  }, []);

  const updateQuantity = useCallback((cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === cartItemId) {
            const newQ = item.quantity + delta;
            return newQ > 0 ? { ...item, quantity: newQ } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  }, []);

  const removeFromCart = useCallback((cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  }, []);

  // Consultoria dinâmica sobre projetos sob medida
  const handleOpenBespokeWhatsApp = useCallback(() => {
    const cleanPhone = normalizePhoneForWhatsApp(businessInfo.whatsapp);
    if (!cleanPhone) {
      alert('O número de WhatsApp da loja ainda não foi configurado pelo ateliê.');
      return;
    }
    const catLabel = !isAllCategories ? selectedCategories.join(', ') : undefined;
    const msg = generateBespokeConsultationWhatsAppMessage({
      businessName: businessInfo.name,
      category: catLabel,
    });
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [businessInfo.whatsapp, businessInfo.name, isAllCategories, selectedCategories]);

  // Envio de Pedido no WhatsApp com Deep Link formatado e registro no histórico
  const handleSendToWhatsApp = async () => {
    if (submittingOrder) return;

    const cleanPhone = normalizePhoneForWhatsApp(businessInfo.whatsapp);
    if (!cleanPhone) {
      alert('O número de WhatsApp da loja ainda não foi configurado pelo ateliê. Por favor, entre em contato através das redes sociais ou site.');
      return;
    }

    setSubmittingOrder(true);

    const orderCode = `LJ-${Math.floor(1000 + Math.random() * 9000)}`;

    const msg = generateCatalogOrderWhatsAppMessage({
      orderCode,
      businessName: businessInfo.name,
      items: cart.map((item) => ({
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        leadTimeDays: item.product.leadTimeDays,
        customName: item.customName,
        category: item.product.category,
      })),
      subtotal,
      customerNotes,
      greeting: businessInfo.whatsappGreeting,
      footer: businessInfo.whatsappFooter,
      customizationLabel: businessInfo.whatsappCustomizationLabel,
    });

    const encoded = encodeURIComponent(msg);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;

    // Registrar no histórico de pedidos do Firestore (coleção catalogOrders)
    try {
      await firebaseCatalogOrderService.createCatalogOrder({
        orderCode,
        customerNotes: customerNotes.trim() || undefined,
        items: cart.map((item) => {
          const itemData: any = {
            productId: item.product.id,
            productName: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            leadTimeDays: item.product.leadTimeDays,
          };
          if (item.customName && item.customName.trim()) {
            itemData.customName = item.customName.trim();
          }
          if (item.product.imageUrl) {
            itemData.imageUrl = item.product.imageUrl;
          }
          return itemData;
        }),
        totalItems: totalItemsCount,
        subtotal,
        status: 'received',
      });
      console.log('Pedido registrado no Firestore:', orderCode);
    } catch (err) {
      console.error('Erro ao registrar pedido no Firestore:', err);
    } finally {
      setSubmittingOrder(false);
    }

    // Abrir o WhatsApp
    window.open(whatsappUrl, '_blank');

    // Abre o modal de confirmação com o código do pedido
    setSubmittedOrderInfo({ orderCode, whatsappUrl });
  };

  const handleOpenPreview = (product: CatalogProduct) => {
    setSelectedProductPreview(product);
    setPreviewCustomName('');
  };

  // ─── Página de Loja Despublicada (Manutenção / Fora do Ar) ───
  if (!storePublished) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>

        <div
          className={`min-h-[100dvh] flex flex-col items-center justify-center text-[#221a1a] dark:text-[#e8e0e3] transition-colors duration-500 font-sans
          bg-[#fff8f7] dark:bg-[#161214]
          [background-image:linear-gradient(135deg,#fceee9_0%,#fff8f7_52%,#ede7f6_100%)]
          dark:[background-image:none]
          relative selection:bg-[#613d3e] selection:text-white px-6`}
        >
          {/* Camada de Gradientes Atmosféricos Fixos */}
          <div className="fixed inset-0 pointer-events-none opacity-80 dark:opacity-40 z-0">
            <div className="absolute top-0 left-0 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full bg-[#f7d6d0] dark:bg-[#5b3234] blur-3xl -translate-x-1/3 -translate-y-1/3" />
            <div className="absolute top-1/3 right-0 w-80 sm:w-[450px] h-80 sm:h-[450px] rounded-full bg-[#d1c4e9] dark:bg-[#28192d] blur-3xl translate-x-1/4" />
            <div className="absolute bottom-10 left-1/4 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full bg-[#bbdefb] dark:bg-[#121c20] blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center max-w-md space-y-6 animate-in fade-in-50 duration-700">
            {/* Logo da loja */}
            {businessInfo.logo && !logoError && (
              <img
                src={businessInfo.logo}
                alt={businessInfo.name}
                onError={() => setLogoError(true)}
                className="h-20 sm:h-24 w-auto object-contain drop-shadow-md"
              />
            )}


            {/* Ícone de manutenção */}
            <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20">
              <ShieldAlert className="size-10 sm:size-12 text-amber-600 dark:text-amber-400" />
            </div>

            {/* Título */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {businessInfo.name || 'Loja'}
              </h1>
              <p className="text-base sm:text-lg text-[#613d3e]/80 dark:text-[#d4a0a2]/80 font-medium">
                Estamos em manutenção
              </p>
            </div>

            {/* Mensagem personalizada ou padrão */}
            <div className="p-5 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#613d3e]/10 dark:border-white/10 backdrop-blur-sm shadow-sm max-w-sm">
              <p className="text-sm sm:text-base text-[#221a1a]/70 dark:text-[#e8e0e3]/70 leading-relaxed">
                {storeUnpublishMessage || 'Nossa loja está temporariamente fora do ar para atualizações. Voltaremos em breve com novidades! 💕'}
              </p>
            </div>

            {/* Botão de contato via WhatsApp */}
            {businessInfo.whatsapp && (
              <a
                href={`https://wa.me/${normalizePhoneForWhatsApp(businessInfo.whatsapp)}?text=${encodeURIComponent('Olá! Vi que a loja está em manutenção. Gostaria de saber quando volta ao ar.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
              >
                <MessageCircle className="size-5" />
                Falar pelo WhatsApp
              </a>
            )}

            {/* Redes sociais */}
            <div className="flex items-center gap-3 pt-2">
              {businessInfo.instagram && (
                <a
                  href={`https://instagram.com/${businessInfo.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-[#E1306C]/10 hover:bg-[#E1306C]/20 transition-colors"
                  title="Instagram"
                >
                  <Instagram className="size-5 text-[#E1306C]" />
                </a>
              )}
              {sanitizedWebsiteUrl && (
                <a
                  href={sanitizedWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-[#613d3e]/10 hover:bg-[#613d3e]/20 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
                  title="Website"
                >
                  <Globe className="size-5 text-[#613d3e] dark:text-[#d4a0a2]" />
                </a>
              )}
            </div>

            {/* Rodapé */}
            <p className="text-[11px] text-[#221a1a]/40 dark:text-[#e8e0e3]/30 pt-4">
              {businessInfo.footerCopyright || `© ${new Date().getFullYear()} ${businessInfo.name}. Todos os direitos reservados.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const titleFontClass = businessInfo.typographyStyle === 'editorial' ? 'font-serif' : 'font-sans';

  return (
    <div className={isDarkMode ? 'dark' : ''}>

      {/* 
        Container Principal com Iluminação Atmosférica Radial (Glassmorphism & Depth) ou Papel Clean Solid
      */}
      <div
        className={`min-h-[100dvh] flex flex-col justify-between text-[#221a1a] dark:text-[#e8e0e3] transition-colors duration-300 font-sans
        ${businessInfo.backgroundStyle === 'solid'
          ? 'bg-stone-50 dark:bg-[#161214]'
          : 'bg-[#fff8f7] dark:bg-[#161214] [background-image:linear-gradient(135deg,#fceee9_0%,#fff8f7_52%,#ede7f6_100%)] dark:[background-image:none]'}
        relative selection:bg-[#613d3e] selection:text-white ${featureFlags.enableOnlineOrders !== false && businessInfo.storeMode === 'cart' && totalItemsCount > 0 ? 'pb-24 sm:pb-20' : 'pb-4'}`}
      >
        {/* Camada de Gradientes Atmosféricos Fixos (desativada no modo clean solid) */}
        {businessInfo.backgroundStyle !== 'solid' && (
          <div className="fixed inset-0 pointer-events-none opacity-80 dark:opacity-40 z-0">
            <div className="absolute top-0 left-0 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full bg-[#f7d6d0] dark:bg-[#5b3234] blur-3xl -translate-x-1/3 -translate-y-1/3" />
            <div className="absolute top-1/3 right-0 w-80 sm:w-[450px] h-80 sm:h-[450px] rounded-full bg-[#d1c4e9] dark:bg-[#28192d] blur-3xl translate-x-1/4" />
            <div className="absolute bottom-10 left-1/4 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full bg-[#bbdefb] dark:bg-[#121c20] blur-3xl" />
          </div>
        )}

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
              <span className={`font-black text-base sm:text-lg tracking-tight ${titleFontClass} ${
                businessInfo.headerTextColor === 'light' ? 'text-white' : 'text-[#613d3e] dark:text-[#f4b7b9]'
              }`}>
                {businessInfo.name}
              </span>
            </div>
          )}
        </header>

        {/* 2. BARRA DE AÇÕES DA LOJINHA: BUSCA, SACOLA, REDES & TEMA */}
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

                {cleanInstagramColab && (
                  <a
                    href={`https://instagram.com/${cleanInstagramColab}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-medium bg-stone-100/90 dark:bg-[#2b2225]/80 hover:bg-stone-200/80 dark:hover:bg-[#34292d] text-stone-700 dark:text-stone-200 border border-stone-200/80 dark:border-[#ebcdcd]/20 transition-all shadow-2xs cursor-pointer"
                    title={`Instagram @${cleanInstagramColab}`}
                  >
                    <Instagram size={15} className="text-[#E1306C]" />
                    <span className="hidden md:inline text-xs">@{cleanInstagramColab}</span>
                  </a>
                )}

                {featureFlags.enableDarkMode !== false && (
                <button
                  onClick={toggleTheme}
                  title={isDarkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
                  className="p-2.5 rounded-xl sm:rounded-2xl bg-stone-100/90 dark:bg-[#2b2225]/80 hover:bg-stone-200/80 dark:hover:bg-[#34292d] text-[#504444] dark:text-[#e8e0e3] border border-stone-200/80 dark:border-[#ebcdcd]/20 transition-all shadow-2xs cursor-pointer"
                  aria-label="Alternar tema"
                >
                  {isDarkMode ? <Sun size={16} className="text-[#fbbf24]" /> : <Moon size={16} className="text-[#613d3e]" />}
                </button>
                )}
              </div>

              {/* Botão Principal da Sacola (Apenas exibido no modo 'cart' com pedidos ativos) */}
              {featureFlags.enableOnlineOrders !== false && businessInfo.storeMode === 'cart' && (
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
              )}

              {/* Botão de Consulta Direta Geral no WhatsApp (quando em modo direct_inquiry) */}
              {businessInfo.storeMode === 'direct_inquiry' && businessInfo.whatsapp && (
              <a
                href={`https://wa.me/${normalizePhoneForWhatsApp(businessInfo.whatsapp)}?text=${encodeURIComponent(
                  generateBespokeConsultationWhatsAppMessage({
                    businessName: businessInfo.name,
                    notes: 'Olá! Gostaria de tirar dúvidas pelo Catálogo Online.',
                  })
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl sm:rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white transition-all shadow-sm font-bold text-xs sm:text-sm cursor-pointer"
                aria-label="Falar no WhatsApp"
              >
                <MessageCircle size={17} />
                <span>WhatsApp</span>
              </a>
              )}
            </div>

          </div>

          {/* Destaques Comerciais & Condições de Pagamento (PIX, Antecedência, Pedido Mínimo) */}
          {(businessInfo.pixDiscountText || businessInfo.advanceNoticeText || businessInfo.minOrderAmount > 0) && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2.5 text-xs">
              {businessInfo.pixDiscountText && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold shadow-2xs backdrop-blur-xs">
                  <Percent size={11} className="text-emerald-600 dark:text-emerald-400" />
                  <span>{businessInfo.pixDiscountText}</span>
                </span>
              )}
              {businessInfo.advanceNoticeText && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30 font-medium shadow-2xs backdrop-blur-xs">
                  <Clock size={11} className="text-amber-600 dark:text-amber-400" />
                  <span>{businessInfo.advanceNoticeText}</span>
                </span>
              )}
              {businessInfo.minOrderAmount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium shadow-2xs backdrop-blur-xs">
                  <ShoppingBag size={11} />
                  <span>Pedido mínimo: {formatCurrency(businessInfo.minOrderAmount)}</span>
                </span>
              )}
            </div>
          )}
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
        <main className="relative z-10 flex-1">
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
                  {(businessInfo.badge || businessInfo.statusText) && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {businessInfo.badge ? (
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#613d3e]/10 dark:bg-[#f4b7b9]/15 text-[#613d3e] dark:text-[#f4b7b9]">
                          {businessInfo.badge}
                        </span>
                      ) : null}
                      {businessInfo.statusText ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#504444] dark:text-[#c9c0b8] font-medium bg-stone-100/80 dark:bg-[#161214]/60 px-3 py-1 rounded-full border border-stone-200/60 dark:border-stone-800">
                          <span className="size-2 rounded-full bg-[#10B981] animate-pulse shrink-0" />
                          {businessInfo.statusText}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>

                {businessInfo.heroDescription ? (
                  <p className="text-xs sm:text-sm text-[#504444] dark:text-[#c9c0b8] leading-relaxed max-w-2xl">
                    {businessInfo.heroDescription}
                  </p>
                ) : null}

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

          {/* Barra de Filtros & Navegação de Temas (Configurável: Dropdown / Carrossel / Bottom Sheet) */}
          {businessInfo.categoryFilterStyle === 'carousel' ? (
            /* FORMATO 2: CARROSSEL DE CHIPS HORIZONTAIS COM SELEÇÃO MÚLTIPLA */
            <div className="space-y-3">
              {/* Barra Superior de Contagem e Seletor de Ordenação */}
              <div className="flex items-center justify-between gap-2 text-xs text-[#504444] dark:text-[#c9c0b8] pt-1">
                <span className="font-medium">
                  <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'criação encontrada' : 'criações encontradas'}
                  {!isAllCategories && (
                    <span className="ml-1 text-[#613d3e] dark:text-[#f4b7b9] font-bold">
                      ({selectedCategories.length} {selectedCategories.length === 1 ? 'tema ativo' : 'temas ativos'})
                    </span>
                  )}
                </span>

                <div className="flex items-center gap-1.5">
                  <ArrowUpDown size={13} className="text-stone-400 dark:text-stone-500" />
                  <label htmlFor="catalog-sort" className="hidden sm:inline text-xs text-stone-500 dark:text-stone-400 font-medium">
                    Ordenar:
                  </label>
                  <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
                    <SelectTrigger id="catalog-sort" aria-label="Ordenar produtos" className="h-8 text-xs w-[130px] bg-white/90 dark:bg-[#161214]/90 border-stone-200 dark:border-stone-700">
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="destaque" className="text-xs">Destaques</SelectItem>
                      <SelectItem value="preco-menor" className="text-xs">Menor preço</SelectItem>
                      <SelectItem value="preco-maior" className="text-xs">Maior preço</SelectItem>
                      <SelectItem value="nome-az" className="text-xs">Nome (A - Z)</SelectItem>
                      <SelectItem value="prazo" className="text-xs">Menor prazo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Carrossel Horizontal em Linha Única com Contadores */}
              <div className="relative group">
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#fff8f7] dark:from-[#161214] to-transparent pointer-events-none z-10" />
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth flex-nowrap -mx-1 px-1">
                  {categories.map((cat) => {
                    const isActive = isCategorySelected(cat);
                    const count = categoryCounts[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer shadow-xs ${
                          isActive
                            ? 'bg-[#613d3e] dark:bg-[#f4b7b9] text-white dark:text-[#4c2527] shadow-sm scale-102 ring-2 ring-[#613d3e]/20 dark:ring-[#f4b7b9]/30'
                            : 'bg-white/70 dark:bg-[#1f191b]/80 border border-stone-200/70 dark:border-[#ebcdcd]/15 text-[#504444] dark:text-[#c9c0b8] hover:bg-white dark:hover:bg-[#2b2225]'
                        }`}
                      >
                        {cat === 'todos' && <Sparkles size={12} />}
                        <span className="capitalize">{cat === 'todos' ? 'Todos os temas' : cat}</span>
                        {typeof count === 'number' && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                            isActive
                              ? 'bg-white/20 dark:bg-black/20 text-white dark:text-[#4c2527]'
                              : 'bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : businessInfo.categoryFilterStyle === 'bottom_sheet' ? (
            /* FORMATO 3: GAVETA / BOTTOM SHEET (ESTILO APP NATIVO) */
            <div className="space-y-3">
              <div className="min-h-12 py-2 px-3.5 sm:px-4 rounded-2xl bg-white/85 dark:bg-[#1f191b]/90 backdrop-blur-md border border-stone-200/70 dark:border-[#ebcdcd]/15 flex flex-wrap items-center justify-between gap-2.5 text-xs text-[#504444] dark:text-[#c9c0b8] shadow-xs">
                
                {/* Lado Esquerdo: Botão Principal de Filtro + Pills Multi-seleção */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsBottomSheetOpen(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#613d3e] dark:bg-[#f4b7b9] text-white dark:text-[#4c2527] font-bold text-xs shadow-sm hover:opacity-95 active:scale-95 transition cursor-pointer min-h-[44px]"
                    aria-label="Abrir gaveta de temas e ocasiões"
                  >
                    <SlidersHorizontal size={14} />
                    <span>Temas &amp; Ocasiões</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 dark:bg-black/20 text-[10px] font-black tabular-nums">
                      {isAllCategories ? products.length : `${selectedCategories.length} sel.`}
                    </span>
                  </button>

                  {/* Pills dos temas selecionados */}
                  {!isAllCategories && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {selectedCategories.map((cat) => (
                        <div key={cat} className="flex items-center gap-1.5 bg-[#613d3e]/10 dark:bg-[#f4b7b9]/15 text-[#613d3e] dark:text-[#f4b7b9] px-2.5 py-1 rounded-xl text-xs font-semibold border border-[#613d3e]/20 dark:border-[#f4b7b9]/30">
                          <span className="capitalize truncate max-w-[130px] sm:max-w-none">{cat}</span>
                          <button
                            type="button"
                            onClick={() => removeCategory(cat)}
                            className="hover:opacity-75 p-0.5 cursor-pointer ml-0.5"
                            title={`Remover filtro de ${cat}`}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {selectedCategories.length > 1 && (
                        <button
                          type="button"
                          onClick={clearCategories}
                          className="text-[11px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline cursor-pointer px-1"
                        >
                          Limpar todos
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Status da Seleção Atual + Seletor de Ordenação */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown size={13} className="text-stone-400 dark:text-stone-500" />
                    <label htmlFor="catalog-sort" className="hidden sm:inline text-xs text-stone-500 dark:text-stone-400 font-medium">
                      Ordenar:
                    </label>
                    <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
                      <SelectTrigger id="catalog-sort" aria-label="Ordenar produtos" className="h-8 text-xs w-[130px] bg-white/90 dark:bg-[#161214]/90 border-stone-200 dark:border-stone-700">
                        <SelectValue placeholder="Ordenar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="destaque" className="text-xs">Destaques</SelectItem>
                        <SelectItem value="preco-menor" className="text-xs">Menor preço</SelectItem>
                        <SelectItem value="preco-maior" className="text-xs">Maior preço</SelectItem>
                        <SelectItem value="nome-az" className="text-xs">Nome (A - Z)</SelectItem>
                        <SelectItem value="prazo" className="text-xs">Menor prazo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* FORMATO 1: DROPDOWN COMPACTO COM METADADOS (CONCEITO 3 - PADRÃO) */
            <div className="relative z-30" ref={categoryDropdownRef}>
              <div className="min-h-12 py-2 px-3.5 sm:px-4 rounded-2xl bg-white/85 dark:bg-[#1f191b]/90 backdrop-blur-md border border-stone-200/70 dark:border-[#ebcdcd]/15 flex flex-wrap items-center justify-between gap-2.5 text-xs text-[#504444] dark:text-[#c9c0b8] shadow-xs">
                
                {/* Lado Esquerdo: Metadados com Gatilho Interativo de Dropdown */}
                <div className="flex items-center gap-1.5 flex-wrap font-medium">
                  <span>Mostrando <strong className="text-[#221a1a] dark:text-[#e8e0e3] font-bold">{filteredProducts.length} {filteredProducts.length === 1 ? 'criação' : 'criações'}</strong> em</span>
                  
                  <button 
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#613d3e]/10 dark:bg-[#f4b7b9]/15 hover:bg-[#613d3e]/20 dark:hover:bg-[#f4b7b9]/25 text-[#613d3e] dark:text-[#f4b7b9] font-bold text-xs border border-[#613d3e]/25 dark:border-[#f4b7b9]/30 transition active:scale-95 cursor-pointer shadow-2xs"
                    title="Explorar temas e ocasiões do ateliê"
                  >
                    <SlidersHorizontal size={13} className="shrink-0" />
                    <span className="capitalize">
                      {isAllCategories ? 'Temas & Ocasiões' : (selectedCategories.length === 1 ? selectedCategories[0] : `${selectedCategories.length} temas sel.`)}
                    </span>
                    <ChevronDown size={14} className={`shrink-0 transform transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {!isAllCategories && (
                    <button
                      type="button"
                      onClick={clearCategories}
                      className="text-[11px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline cursor-pointer ml-1"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Lado Direito: Seletor de Ordenação */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown size={13} className="text-stone-400 dark:text-stone-500" />
                    <label htmlFor="catalog-sort" className="hidden sm:inline text-xs text-stone-500 dark:text-stone-400 font-medium">
                      Ordenar:
                    </label>
                    <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
                      <SelectTrigger id="catalog-sort" aria-label="Ordenar produtos" className="h-8 text-xs w-[130px] bg-white/90 dark:bg-[#161214]/90 border-stone-200 dark:border-stone-700">
                        <SelectValue placeholder="Ordenar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="destaque" className="text-xs">Destaques</SelectItem>
                        <SelectItem value="preco-menor" className="text-xs">Menor preço</SelectItem>
                        <SelectItem value="preco-maior" className="text-xs">Maior preço</SelectItem>
                        <SelectItem value="nome-az" className="text-xs">Nome (A - Z)</SelectItem>
                        <SelectItem value="prazo" className="text-xs">Menor prazo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* FLOATING DROPDOWN POPOVER (Temas & Ocasiões) */}
              {isCategoryDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 p-4 rounded-2xl bg-[#1e1a1c]/95 dark:bg-[#1a1618]/95 backdrop-blur-2xl border border-[#d39a9c]/40 shadow-2xl z-50 text-white space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  
                  {/* Cabeçalho do Popover */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="size-4 text-[#d39a9c]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#d39a9c]">
                        TEMAS &amp; OCASIÕES DO ATELIÊ
                      </span>
                    </div>
                    
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-[#d39a9c]/40 text-[#d39a9c] font-bold bg-[#d39a9c]/10">
                      {isAllCategories ? `${products.length} Peças` : `${selectedCategories.length} selecionados`}
                    </span>
                  </div>

                  {/* Subtítulo */}
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 pt-1">
                    SELECIONE UM OU MAIS TEMAS
                  </div>

                  {/* Lista de Categorias com Contadores Dinâmicos em Tempo Real */}
                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {categories.map((cat) => {
                      const isActive = isCategorySelected(cat);
                      const count = categoryCounts[cat] ?? 0;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl transition text-xs font-medium cursor-pointer ${
                            isActive 
                              ? 'bg-[#d39a9c]/20 text-white border border-[#d39a9c]/40 shadow-sm'
                              : 'hover:bg-white/5 text-white/70 hover:text-white border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`size-3.5 rounded border flex items-center justify-center transition-colors ${
                              isActive ? 'bg-[#d39a9c] border-[#d39a9c] text-[#1e1a1c]' : 'border-white/30 bg-transparent'
                            }`}>
                              {isActive && <Check className="size-2.5 stroke-[3]" />}
                            </div>
                            <span className="capitalize">{cat === 'todos' ? 'Todos os temas & ocasiões' : cat}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`text-[11px] font-bold ${isActive ? 'text-[#d39a9c]' : 'text-white/50'}`}>
                              {count}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Rodapé de Ações do Popover */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <button 
                      type="button"
                      onClick={() => clearCategories()}
                      className="text-xs text-white/70 hover:text-[#d39a9c] font-medium transition cursor-pointer"
                    >
                      {isAllCategories ? `Todos (${products.length})` : 'Limpar seleção'}
                    </button>

                    <button 
                      type="button"
                      onClick={() => setIsCategoryDropdownOpen(false)}
                      className="px-4 py-1.5 rounded-xl bg-[#d39a9c] text-[#161214] hover:bg-[#c4898b] font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-sm"
                    >
                      CONCLUÍDO ({filteredProducts.length})
                    </button>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* 3. Grid Responsivo de Produtos (Densidade customizável: Compacto ou Editorial) */}
          <div className={
            businessInfo.cardDensity === 'editorial'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8'
              : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6'
          }>
            {loadingProducts && products.length === 0 ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="flex flex-col h-full rounded-2xl bg-white/70 dark:bg-[#1f191b]/85 border border-white/60 dark:border-[#ebcdcd]/15 p-3 space-y-3 animate-pulse"
                >
                  <div className={`w-full rounded-xl bg-stone-200/80 dark:bg-stone-800 ${businessInfo.imageAspect === 'portrait' ? 'aspect-[4/5]' : 'aspect-square'}`} />
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
                  {/* Imagem do Produto (Proporção customizável: Quadrado 1:1 ou Retrato 4:5 Lookbook) */}
                  <div 
                    className={`relative w-full overflow-hidden bg-stone-100 dark:bg-stone-900 cursor-pointer ${
                      businessInfo.imageAspect === 'portrait' ? 'aspect-[4/5]' : 'aspect-square'
                    }`}
                    onClick={() => handleOpenPreview(prod)}
                  >
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="bg-white/95 dark:bg-black/90 text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md text-stone-900 dark:text-stone-100">
                        <Eye size={13} /> Ver detalhes
                      </span>
                    </div>

                    {/* Badge de Destaque / Categoria (se habilitado) */}
                    {prod.badge && (businessInfo.showBadgeBestSeller || businessInfo.showBadgeNew) && (
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
                    <div className="space-y-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-[#613d3e]/10 dark:bg-[#f4b7b9]/15 text-[#613d3e] dark:text-[#f4b7b9] border border-[#613d3e]/20 dark:border-[#f4b7b9]/20 w-fit max-w-full">
                        <Tag size={10} className="shrink-0" />
                        <span className="truncate">{prod.category || 'Geral'}</span>
                      </span>
                      <h3 
                        className={`text-xs sm:text-sm font-bold text-[#221a1a] dark:text-[#e8e0e3] line-clamp-2 leading-snug cursor-pointer group-hover:text-[#613d3e] dark:group-hover:text-[#f4b7b9] transition-colors ${titleFontClass}`}
                        onClick={() => handleOpenPreview(prod)}
                        title={prod.name}
                      >
                        {prod.name}
                      </h3>
                    </div>

                    {/* Prazo de Confecção, Selo Personalizável & Preço Desktop */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between gap-1">
                        {businessInfo.showBadgeLeadTime && (
                          <div className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md">
                            <Clock size={11} />
                            <span>{prod.leadTimeDays > 0 ? `Até ${prod.leadTimeDays} dias úteis` : 'Pronta entrega'}</span>
                          </div>
                        )}
                        {businessInfo.showBadgeCustomizable && prod.isCustomizable && (
                          <span className="text-[10px] font-semibold text-[#613d3e] dark:text-[#f4b7b9] inline-flex items-center gap-0.5 ml-auto">
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

                    {/* Botão de Ação Dinâmico baseado no Store Mode */}
                    {businessInfo.storeMode === 'cart' && featureFlags.enableOnlineOrders !== false ? (
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
                    ) : businessInfo.storeMode === 'direct_inquiry' && businessInfo.whatsapp ? (
                      <a
                        href={`https://wa.me/${normalizePhoneForWhatsApp(businessInfo.whatsapp)}?text=${encodeURIComponent(
                          generateProductInquiryWhatsAppMessage({
                            businessName: businessInfo.name,
                            productName: prod.name,
                            price: prod.price,
                            category: prod.category,
                            leadTimeDays: prod.leadTimeDays,
                          })
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full mt-2 py-2 sm:py-2.5 px-3 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 bg-[#10B981] hover:bg-[#059669] text-white active:scale-98 transition-all shadow-xs cursor-pointer"
                        title="Pedir direto no WhatsApp"
                      >
                        <MessageCircle size={13} className="shrink-0" />
                        <span>Pedir no WhatsApp</span>
                      </a>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPreview(prod);
                        }}
                        className="w-full mt-2 py-2 sm:py-2.5 px-3 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 bg-stone-100 dark:bg-stone-800 text-[#613d3e] dark:text-[#f4b7b9] border border-[#613d3e]/20 dark:border-[#f4b7b9]/20 hover:bg-[#613d3e]/10 active:scale-98 transition-all cursor-pointer"
                        title="Ver detalhes do produto"
                      >
                        <Eye size={13} className="shrink-0" />
                        <span>Ver Detalhes</span>
                      </button>
                    )}
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
              {products.length > 0 && (searchQuery || !isAllCategories) && (
                <button
                  onClick={() => { setSearchQuery(''); clearCategories(); }}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-[#613d3e] text-white cursor-pointer"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}



          {/* SEÇÕES INSTITUCIONAIS MODULARES (Controladas via Toggles & Listas Dinâmicas) */}

          {/* 1. QUEM SOMOS / SOBRE O ATELIÊ */}
          {businessInfo.showAbout && (businessInfo.aboutText || businessInfo.aboutTitle || businessInfo.aboutImageUrl || (businessInfo.aboutPillars && businessInfo.aboutPillars.length > 0)) && (
            <section className="mt-12 p-6 sm:p-10 rounded-3xl bg-white/70 dark:bg-[#1f191b]/70 backdrop-blur-md border border-white/60 dark:border-[#ebcdcd]/15 shadow-sm space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                {businessInfo.aboutImageUrl && (
                  <div className="relative w-full lg:w-1/3 aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden shadow-md border border-stone-200/60 dark:border-stone-800 shrink-0 bg-stone-100 dark:bg-stone-900">
                    <img
                      src={businessInfo.aboutImageUrl}
                      alt={businessInfo.aboutTitle || 'Sobre o Ateliê'}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className={`space-y-4 ${businessInfo.aboutImageUrl ? 'w-full lg:w-2/3' : 'w-full'}`}>
                  {businessInfo.aboutBadge && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#613d3e]/10 dark:bg-[#f4b7b9]/15 text-[#613d3e] dark:text-[#f4b7b9] border border-[#613d3e]/20 dark:border-[#f4b7b9]/20">
                      <Heart size={12} className="text-rose-500 fill-rose-500/20" />
                      <span>{businessInfo.aboutBadge}</span>
                    </span>
                  )}
                  {businessInfo.aboutTitle && (
                    <h3 className="text-xl sm:text-2xl font-black text-[#221a1a] dark:text-[#e8e0e3] tracking-tight leading-tight">
                      {businessInfo.aboutTitle}
                    </h3>
                  )}
                  {businessInfo.aboutText && (
                    <div className="text-xs sm:text-sm text-[#504444] dark:text-[#c9c0b8] leading-relaxed whitespace-pre-line">
                      {businessInfo.aboutText}
                    </div>
                  )}

                  {/* Pilares do Ateliê (Dinâmicos) */}
                  {businessInfo.aboutPillars && businessInfo.aboutPillars.length > 0 && (
                    <div className={`grid grid-cols-1 ${businessInfo.aboutPillars.length === 2 ? 'sm:grid-cols-2' : businessInfo.aboutPillars.length >= 3 ? 'sm:grid-cols-3' : ''} gap-3 pt-3`}>
                      {businessInfo.aboutPillars.map((p, idx) => (
                        <div key={p.id || idx} className="p-3.5 rounded-2xl bg-stone-50/80 dark:bg-[#261f22]/80 border border-stone-200/60 dark:border-stone-800 space-y-1">
                          <h4 className="text-xs font-bold text-[#613d3e] dark:text-[#f4b7b9]">
                            {p.title}
                          </h4>
                          {p.text && (
                            <p className="text-[11px] text-[#504444] dark:text-[#c9c0b8] leading-snug">
                              {p.text}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* 2. COMO FUNCIONA A ENCOMENDA (PASSO A PASSO DINÂMICO) */}
          {businessInfo.showHowItWorks && (businessInfo.howItWorksTitle || (businessInfo.howItWorksSteps && businessInfo.howItWorksSteps.length > 0)) && (
            <section className="mt-12 p-6 sm:p-10 rounded-3xl bg-white/70 dark:bg-[#1f191b]/70 backdrop-blur-md border border-white/60 dark:border-[#ebcdcd]/15 shadow-sm space-y-8 animate-in fade-in duration-300">
              <div className="text-center max-w-xl mx-auto space-y-2">
                {businessInfo.howItWorksBadge && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#613d3e]/10 dark:bg-[#f4b7b9]/15 text-[#613d3e] dark:text-[#f4b7b9] border border-[#613d3e]/20 dark:border-[#f4b7b9]/20">
                    <Clock size={12} />
                    <span>{businessInfo.howItWorksBadge}</span>
                  </span>
                )}
                {businessInfo.howItWorksTitle && (
                  <h3 className="text-xl sm:text-2xl font-black text-[#221a1a] dark:text-[#e8e0e3] tracking-tight">
                    {businessInfo.howItWorksTitle}
                  </h3>
                )}
                {businessInfo.howItWorksSubtitle && (
                  <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                    {businessInfo.howItWorksSubtitle}
                  </p>
                )}
              </div>

              {businessInfo.howItWorksSteps && businessInfo.howItWorksSteps.length > 0 && (
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${businessInfo.howItWorksSteps.length >= 4 ? 'lg:grid-cols-4' : businessInfo.howItWorksSteps.length === 3 ? 'lg:grid-cols-3' : ''} gap-4`}>
                  {businessInfo.howItWorksSteps.map((s, idx) => (
                    <div
                      key={s.id || idx}
                      className="relative p-5 rounded-2xl bg-stone-50/80 dark:bg-[#261f22]/80 border border-stone-200/70 dark:border-stone-800 flex flex-col justify-between space-y-3 hover:border-[#613d3e]/30 transition-all shadow-2xs"
                    >
                      <div className="space-y-2">
                        <div className="size-8 rounded-xl bg-[#613d3e] dark:bg-[#f4b7b9] text-white dark:text-[#4c2527] font-black text-sm flex items-center justify-center shadow-xs">
                          {idx + 1}
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#221a1a] dark:text-[#e8e0e3]">
                          {s.title}
                        </h4>
                        {s.text && (
                          <p className="text-[11px] sm:text-xs text-[#504444] dark:text-[#c9c0b8] leading-relaxed">
                            {s.text}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 3. DIFERENCIAIS DA MARCA (DINÂMICOS) */}
          {businessInfo.showFeatures && (businessInfo.featuresTitle || (businessInfo.featureItems && businessInfo.featureItems.length > 0)) && (
            <section className="mt-12 p-6 sm:p-10 rounded-3xl bg-white/70 dark:bg-[#1f191b]/70 backdrop-blur-md border border-white/60 dark:border-[#ebcdcd]/15 shadow-sm space-y-8 animate-in fade-in duration-300">
              <div className="text-center max-w-xl mx-auto space-y-2">
                {businessInfo.featuresBadge && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    <Sparkles size={12} className="text-amber-500" />
                    <span>{businessInfo.featuresBadge}</span>
                  </span>
                )}
                {businessInfo.featuresTitle && (
                  <h3 className="text-xl sm:text-2xl font-black text-[#221a1a] dark:text-[#e8e0e3] tracking-tight">
                    {businessInfo.featuresTitle}
                  </h3>
                )}
              </div>

              {businessInfo.featureItems && businessInfo.featureItems.length > 0 && (
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${businessInfo.featureItems.length >= 4 ? 'lg:grid-cols-4' : businessInfo.featureItems.length === 3 ? 'lg:grid-cols-3' : ''} gap-4`}>
                  {businessInfo.featureItems.map((f, idx) => {
                    const icons = [Heart, ShieldCheck, Truck, Sparkles];
                    const colors = [
                      'text-rose-500 bg-rose-500/10',
                      'text-emerald-500 bg-emerald-500/10',
                      'text-blue-500 bg-blue-500/10',
                      'text-amber-500 bg-amber-500/10',
                    ];
                    const Icon = icons[idx % icons.length];
                    const color = colors[idx % colors.length];
                    return (
                      <div
                        key={f.id || idx}
                        className="p-5 rounded-2xl bg-stone-50/80 dark:bg-[#261f22]/80 border border-stone-200/70 dark:border-stone-800 space-y-2.5 hover:border-[#613d3e]/30 transition-all shadow-2xs"
                      >
                        <div className={`size-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                          <Icon size={18} />
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#221a1a] dark:text-[#e8e0e3]">
                          {f.title}
                        </h4>
                        {f.text && (
                          <p className="text-[11px] sm:text-xs text-[#504444] dark:text-[#c9c0b8] leading-relaxed">
                            {f.text}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* 4. PERGUNTAS FREQUENTES (FAQ DINÂMICO) */}
          {businessInfo.showFaq && (businessInfo.faqTitle || (businessInfo.faqItems && businessInfo.faqItems.length > 0)) && (
            <section className="mt-12 p-6 sm:p-10 rounded-3xl bg-white/70 dark:bg-[#1f191b]/70 backdrop-blur-md border border-white/60 dark:border-[#ebcdcd]/15 shadow-sm space-y-6 animate-in fade-in duration-300">
              <div className="text-center max-w-xl mx-auto space-y-2">
                {businessInfo.faqBadge && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                    <HelpCircle size={12} className="text-indigo-500" />
                    <span>{businessInfo.faqBadge}</span>
                  </span>
                )}
                {businessInfo.faqTitle && (
                  <h3 className="text-xl sm:text-2xl font-black text-[#221a1a] dark:text-[#e8e0e3] tracking-tight">
                    {businessInfo.faqTitle}
                  </h3>
                )}
              </div>

              {businessInfo.faqItems && businessInfo.faqItems.length > 0 && (
                <div className="max-w-2xl mx-auto space-y-3">
                  {businessInfo.faqItems.map((faq, idx) => {
                    const isOpen = expandedFaq === idx;
                    return (
                      <div
                        key={faq.id || idx}
                        className="rounded-2xl border border-stone-200/70 dark:border-stone-800 bg-stone-50/80 dark:bg-[#261f22]/80 overflow-hidden transition-all shadow-2xs"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaq(isOpen ? null : idx)}
                          className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer hover:bg-stone-100/60 dark:hover:bg-stone-800/40 transition-colors"
                        >
                          <span className="text-xs sm:text-sm font-bold text-[#221a1a] dark:text-[#e8e0e3]">
                            {faq.question}
                          </span>
                          <ChevronDown
                            size={16}
                            className={`text-stone-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#613d3e] dark:text-[#f4b7b9]' : ''}`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-[#504444] dark:text-[#c9c0b8] leading-relaxed border-t border-stone-200/40 dark:border-stone-800/60 animate-in fade-in-50 duration-150 whitespace-pre-line">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* 5. SEÇÕES EXTRAS CUSTOMIZADAS */}
          {businessInfo.customSections && businessInfo.customSections.length > 0 && (
            <div className="space-y-8 mt-12">
              {businessInfo.customSections.map((sec, idx) => (
                <section
                  key={sec.id || idx}
                  className="p-6 sm:p-10 rounded-3xl bg-white/70 dark:bg-[#1f191b]/70 backdrop-blur-md border border-white/60 dark:border-[#ebcdcd]/15 shadow-sm space-y-4 animate-in fade-in duration-300"
                >
                  {sec.badge && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#613d3e]/10 dark:bg-[#f4b7b9]/15 text-[#613d3e] dark:text-[#f4b7b9] border border-[#613d3e]/20 dark:border-[#f4b7b9]/20">
                      <Sparkles size={12} />
                      <span>{sec.badge}</span>
                    </span>
                  )}
                  {sec.title && (
                    <h3 className="text-xl sm:text-2xl font-black text-[#221a1a] dark:text-[#e8e0e3] tracking-tight">
                      {sec.title}
                    </h3>
                  )}
                  {sec.content && (
                    <div className="text-xs sm:text-sm text-[#504444] dark:text-[#c9c0b8] leading-relaxed whitespace-pre-line">
                      {sec.content}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}

          {/* Footer Institucional Responsivo com Multi-colunas */}
          <footer className="mt-8 pt-8 pb-6 border-t border-stone-200/60 dark:border-[#ebcdcd]/15 text-xs text-[#504444] dark:text-[#c9c0b8]">
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
                <div className="flex flex-col items-center md:items-start gap-2 pt-1">
                  {businessInfo.whatsapp ? (
                    <button
                      onClick={handleOpenBespokeWhatsApp}
                      className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                    >
                      <MessageCircle size={14} />
                      <span>WhatsApp Oficial: {formatPhoneForDisplay(businessInfo.whatsapp)}</span>
                    </button>
                  ) : null}

                  {/* Redes Sociais em formato horizontal harmônico e elegante */}
                  {(cleanInstagram || cleanInstagramColab || sanitizedWebsiteUrl) && (
                    <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap pt-0.5">
                      {cleanInstagram && (
                        <a
                          href={`https://instagram.com/${cleanInstagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100/90 dark:bg-stone-800/80 hover:bg-stone-200/90 dark:hover:bg-stone-700/80 text-stone-700 dark:text-stone-300 border border-stone-200/70 dark:border-stone-700/60 transition-colors"
                          title={`Instagram @${cleanInstagram}`}
                        >
                          <Instagram size={13} className="text-[#E1306C]" />
                          <span>@{cleanInstagram}</span>
                        </a>
                      )}

                      {cleanInstagramColab && (
                        <a
                          href={`https://instagram.com/${cleanInstagramColab}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100/90 dark:bg-stone-800/80 hover:bg-stone-200/90 dark:hover:bg-stone-700/80 text-stone-700 dark:text-stone-300 border border-stone-200/70 dark:border-stone-700/60 transition-colors"
                          title={`Instagram @${cleanInstagramColab}`}
                        >
                          <Instagram size={13} className="text-[#E1306C]" />
                          <span>@{cleanInstagramColab}</span>
                        </a>
                      )}

                      {sanitizedWebsiteUrl && (
                        <a
                          href={sanitizedWebsiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100/90 dark:bg-stone-800/80 hover:bg-stone-200/90 dark:hover:bg-stone-700/80 text-stone-700 dark:text-stone-300 border border-stone-200/70 dark:border-stone-700/60 transition-colors"
                          title="Site Oficial"
                        >
                          <Globe size={13} className="text-stone-500" />
                          <span>Site</span>
                        </a>
                      )}
                    </div>
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
        {featureFlags.enableOnlineOrders !== false && totalItemsCount > 0 && !isCartOpen && !selectedProductPreview && (
          <aside className="fixed bottom-0 inset-x-0 sm:bottom-6 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-floating-bar p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-2.5 sm:px-5 bg-white/95 dark:bg-[#161214]/95 backdrop-blur-xl border-t sm:border border-stone-200/80 dark:border-[#ebcdcd]/20 sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
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

        {/* GAVETA DESLIZANTE / BOTTOM SHEET DE TEMAS & OCASIÕES (Mobile & Web) */}
        {isBottomSheetOpen && (
          <div className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            {/* Backdrop Escuro com Blur */}
            <div 
              className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity" 
              onClick={() => setIsBottomSheetOpen(false)}
              aria-hidden="true"
            />

            {/* Container da Gaveta (Bottom Sheet no celular com safe-area / Modal elegante centralizado no Desktop) */}
            <div 
              className="relative w-full sm:max-w-lg max-h-[88dvh] sm:max-h-[80vh] rounded-t-3xl sm:rounded-3xl bg-[#1e1a1c]/95 dark:bg-[#161214]/98 backdrop-blur-2xl border-t sm:border border-[#d39a9c]/35 shadow-2xl z-10 text-white flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4"
              role="dialog"
              aria-modal="true"
              aria-label="Filtro de temas e ocasiões"
            >
              {/* Grab handle mobile */}
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

              {/* Cabeçalho da Gaveta */}
              <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-4 text-[#d39a9c]" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#d39a9c] font-sans">
                    TEMAS &amp; OCASIÕES DO ATELIÊ
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-[#d39a9c]/40 text-[#d39a9c] font-bold bg-[#d39a9c]/10">
                    {products.length} {products.length === 1 ? 'Peça' : 'Peças'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsBottomSheetOpen(false)}
                    className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                    aria-label="Fechar gaveta"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Campo de Busca Rápida de Temas dentro da Gaveta */}
              <div className="px-5 pt-3 pb-1 shrink-0">
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    placeholder="Buscar tema (ex: Batizado, Safari, Planners)..."
                    value={bottomSheetSearchQuery}
                    onChange={(e) => setBottomSheetSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-[#d39a9c] transition"
                  />
                  {bottomSheetSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBottomSheetSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de Opções Rolável com Altura Mínima de Toque >= 44px */}
              <div className="p-5 overflow-y-auto max-h-[50dvh] space-y-1.5 custom-scrollbar flex-1">
                {filteredCategoriesForSheet.map((cat) => {
                  const isActive = isCategorySelected(cat);
                  const count = categoryCounts[cat] ?? 0;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl transition text-xs font-medium cursor-pointer min-h-[48px] ${
                        isActive 
                          ? 'bg-[#d39a9c]/20 text-white border border-[#d39a9c]/40 shadow-sm'
                          : 'hover:bg-white/5 text-white/70 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`size-4.5 rounded-lg border flex items-center justify-center transition-colors ${
                          isActive 
                            ? 'bg-[#d39a9c] border-[#d39a9c] text-[#1e1a1c]' 
                            : 'border-white/30 bg-transparent'
                        }`}>
                          {isActive && <Check className="size-3.5 stroke-[3]" />}
                        </div>
                        <span className="capitalize font-semibold">{cat === 'todos' ? 'Todos os temas & ocasiões' : cat}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-[#d39a9c] text-[#1e1a1c]' : 'bg-white/10 text-white/60'}`}>
                          {count}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {filteredCategoriesForSheet.length === 0 && (
                  <div className="py-8 text-center text-white/50 text-xs">
                    Nenhum tema encontrado para "{bottomSheetSearchQuery}".
                  </div>
                )}
              </div>

              {/* Rodapé da Gaveta */}
              <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={clearCategories}
                  className="text-xs text-white/70 hover:text-[#d39a9c] font-medium transition cursor-pointer px-2 py-1.5"
                >
                  {isAllCategories ? `Todos (${products.length})` : 'Limpar seleção'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsBottomSheetOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#d39a9c] hover:bg-[#c4898b] text-[#1e1a1c] font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-md min-h-[44px] flex items-center justify-center"
                >
                  APLICAR ({filteredProducts.length})
                </button>
              </div>

            </div>
          </div>
        )}

        {/* 5. Modal Responsivo de Prévia / Personalização (2 Colunas no Desktop) */}
        {selectedProductPreview && (
          <div className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
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
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80';
                  }}
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
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#613d3e]/10 dark:bg-[#f4b7b9]/15 text-[#613d3e] dark:text-[#f4b7b9] border border-[#613d3e]/20 dark:border-[#f4b7b9]/20 mb-1">
                        <Tag size={11} className="shrink-0" />
                        <span>{selectedProductPreview.category || 'Geral'}</span>
                      </span>
                      <h3 className="text-base sm:text-xl font-extrabold text-[#221a1a] dark:text-[#e8e0e3] leading-snug">
                        {selectedProductPreview.name}
                      </h3>
                    </div>
                    <span className="text-base sm:text-xl font-extrabold text-[#613d3e] dark:text-[#f4b7b9] tabular-nums shrink-0">
                      {formatCurrency(selectedProductPreview.price)}
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm text-[#504444] dark:text-[#c9c0b8] leading-relaxed">
                    <FormattedDescription text={selectedProductPreview.description} />
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                    <Clock size={14} className="shrink-0" />
                    <span>Prazo de confecção: <strong>{selectedProductPreview.leadTimeDays > 0 ? `até ${selectedProductPreview.leadTimeDays} dias úteis` : 'Pronta entrega'}</strong></span>
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

                {/* Ação de Adicionar ou Consulta direta via WhatsApp */}
                <div className="pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-0 border-t border-stone-200/50 dark:border-stone-800 shrink-0 bg-[#fff8f7] dark:bg-[#1f191b] space-y-2">
                  {featureFlags.enableOnlineOrders !== false ? (
                    <>
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

                      {businessInfo.whatsapp && (
                        <a
                          href={`https://wa.me/${normalizePhoneForWhatsApp(businessInfo.whatsapp)}?text=${encodeURIComponent(
                            generateProductInquiryWhatsAppMessage({
                              businessName: businessInfo.name,
                              productName: selectedProductPreview.name,
                              price: selectedProductPreview.price,
                              category: selectedProductPreview.category,
                              leadTimeDays: selectedProductPreview.leadTimeDays,
                              customName: previewCustomName,
                            })
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 border border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 active:scale-98 transition-all cursor-pointer"
                        >
                          <MessageCircle size={15} />
                          <span>Tirar dúvidas deste item no WhatsApp</span>
                        </a>
                      )}
                    </>
                  ) : (
                    <a
                      href={`https://wa.me/${normalizePhoneForWhatsApp(businessInfo.whatsapp)}?text=${encodeURIComponent(
                        generateProductInquiryWhatsAppMessage({
                          businessName: businessInfo.name,
                          productName: selectedProductPreview.name,
                          price: selectedProductPreview.price,
                          category: selectedProductPreview.category,
                          leadTimeDays: selectedProductPreview.leadTimeDays,
                          customName: previewCustomName,
                        })
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white transition-all shadow-md cursor-pointer"
                    >
                      <MessageCircle size={16} />
                      <span>Consultar no WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 6. Gaveta Lateral / Slide-over Drawer da Sacola de Pedidos */}
        {isCartOpen && featureFlags.enableOnlineOrders !== false && (
          <div className="fixed inset-0 z-drawer flex items-end sm:items-stretch sm:justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
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
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-white/80 dark:bg-[#261f22] border border-stone-200/70 dark:border-[#ebcdcd]/10 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80';
                            }}
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
                          onClick={() => removeFromCart(item.id)}
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
                                prev.map((ci) =>
                                  ci.id === item.id ? { ...ci, customName: val } : ci
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
                          {item.product.leadTimeDays > 0 ? `Prazo: ${item.product.leadTimeDays} dias úteis` : 'Pronta entrega'}
                        </span>
                        <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-[#161214] rounded-lg p-0.5 border border-stone-200 dark:border-stone-700">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer"
                            aria-label="Diminuir quantidade"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs font-bold px-2 tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
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
                  {/* Desconto PIX no Carrinho */}
                  {businessInfo.pixDiscountText && (
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                      <Percent size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{businessInfo.pixDiscountText}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm font-bold">
                    <span>Subtotal Estimado:</span>
                    <span className="text-lg text-[#613d3e] dark:text-[#f4b7b9] tabular-nums font-extrabold">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  {/* Validação de Valor Mínimo de Pedido */}
                  {businessInfo.minOrderAmount > 0 && subtotal < businessInfo.minOrderAmount && (
                    <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-medium">
                      <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>
                        Pedido mínimo de <strong>{formatCurrency(businessInfo.minOrderAmount)}</strong>. Adicione mais <strong>{formatCurrency(businessInfo.minOrderAmount - subtotal)}</strong> para finalizar.
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handleSendToWhatsApp}
                    disabled={submittingOrder || (businessInfo.minOrderAmount > 0 && subtotal < businessInfo.minOrderAmount)}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submittingOrder ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Registrando e abrindo WhatsApp...</span>
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        <span>Confirmar & Enviar Pedido no WhatsApp</span>
                      </>
                    )}
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

        {/* 6. MODAL DE CONFIRMAÇÃO DE PEDIDO ENVIADO */}
        {submittedOrderInfo && (
          <div 
            className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setSubmittedOrderInfo(null)}
          >
            <div 
              className="bg-white dark:bg-[#1f191b] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200/80 dark:border-[#ebcdcd]/20 relative text-center space-y-5 animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSubmittedOrderInfo(null)}
                className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={18} />
              </button>

              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#613d3e]/10 dark:bg-[#f4b7b9]/15 text-[#613d3e] dark:text-[#f4b7b9] font-mono font-bold text-xs">
                  Pedido #{submittedOrderInfo.orderCode}
                </div>
                <h3 className="text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                  Pedido Enviado com Sucesso!
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                  Seu pedido foi registrado em nosso ateliê e a conversa foi iniciada no WhatsApp. Nossa equipe já tem acesso à sua seleção de itens!
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800 text-left space-y-1.5 text-xs text-stone-600 dark:text-stone-300">
                <div className="flex items-center gap-2 font-semibold text-stone-800 dark:text-stone-200">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Próximos passos no WhatsApp:</span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Envie a mensagem no aplicativo e informe seu CEP para cálculo do frete e opções de pagamento (PIX ou Cartão).
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <a
                  href={submittedOrderInfo.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <MessageCircle size={16} />
                  <span>Reabrir WhatsApp</span>
                </a>

                <button
                  onClick={() => {
                    setCart([]);
                    setCustomerNotes('');
                    setIsCartOpen(false);
                    setSubmittedOrderInfo(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  Concluir e Limpar Sacola
                </button>

                <button
                  onClick={() => setSubmittedOrderInfo(null)}
                  className="w-full py-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Continuar Comprando
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 7. BOTÃO FLUTUANTE DO WHATSAPP */}
        {businessInfo.showFloatingWhatsApp && businessInfo.whatsapp && (
          <aside aria-label="Atendimento WhatsApp" className="fixed bottom-6 right-6 z-40 flex items-center gap-2 group">
            {businessInfo.floatingWhatsAppText && (
              <div className="hidden sm:flex items-center px-3 py-1.5 rounded-full bg-white dark:bg-[#1f191b] border border-stone-200/80 dark:border-[#ebcdcd]/20 shadow-lg text-xs font-semibold text-stone-800 dark:text-stone-200 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <span>{businessInfo.floatingWhatsAppText}</span>
              </div>
            )}
            <a
              href={`https://wa.me/${normalizePhoneForWhatsApp(businessInfo.whatsapp)}?text=${encodeURIComponent(
                generateBespokeConsultationWhatsAppMessage({
                  businessName: businessInfo.name,
                  notes: 'Olá! Estou navegando pelo Catálogo Online e gostaria de tirar algumas dúvidas.',
                })
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative size-14 rounded-full bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer ring-4 ring-white/60 dark:ring-[#161214]/60"
              title={businessInfo.floatingWhatsAppText || 'Fale Conosco no WhatsApp'}
              aria-label="Atendimento direto no WhatsApp"
            >
              <MessageCircle size={28} className="fill-white/20" />
              <span className="absolute top-1 right-1 size-3.5 bg-emerald-300 rounded-full border-2 border-white dark:border-[#161214] animate-ping" />
            </a>
          </aside>
        )}
      </div>
    </div>
  );
}

export default PublicCatalog;

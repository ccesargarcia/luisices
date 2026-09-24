import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettings } from '../../hooks/useUserSettings';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../components/ui/dialog';
import {
  Store,
  Globe,
  ExternalLink,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Loader2,
  Clock,
  MapPin,
  FileText,
  AtSign,
  Phone,
  Info,
  HelpCircle,
  Bell,
  Building2,
  Upload,
  X,
  Eye,
  ShoppingBag,
  Wand2,
  Heart,
  Image as ImageIcon,
  Layers,
  Palette,
  AlignLeft,
  AlignCenter,
  Sun,
  Moon,
  Search,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  ToggleLeft,
  Power,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { BannerCarousel, CatalogBannerItem } from '../components/catalog/BannerCarousel';
import { formatPhoneForDisplay } from '../utils/whatsapp';

export const STORE_TEMPLATES = [
  {
    id: 'afetiva',
    name: 'Papelaria Afetiva & Festas',
    icon: '🌸',
    tag: 'Mais Popular',
    description: 'Estilo acolhedor e carinhoso, perfeito para ateliês de encadernação, lembrancinhas e peças artesanais.',
    data: {
      catalogBadge: 'Atelier Afetivo',
      catalogStatusText: 'Atendimento WhatsApp ativo • Encomendas abertas',
      catalogAnnouncement: '✨ Encomendas abertas com envio carinhoso para todo o Brasil!',
      catalogHeroTitle: 'Catálogo & Vitrine Afetiva',
      catalogStoreTagline: 'Papelaria artesanal feita à mão para momentos únicos',
      catalogHeroDescription: 'Cadernos, planners, mimos e lembrancinhas personalizados com acabamento artesanal de alto padrão. Faça sua encomenda direta pelo WhatsApp!',
      catalogWhatsappGreeting: 'Olá! Gostaria de encomendar pelo catálogo do Ateliê:',
      catalogWhatsappCustomizationLabel: 'Nome para a personalização:',
      catalogWhatsappFooter: 'Poderia me passar as opções de frete/retirada e a chave PIX para confirmar o pedido?',
      catalogFooterText: 'Papelaria artesanal feita à mão com afeto e dedicação para eternizar momentos únicos. ❤️',
      catalogFooterLocation: 'Enviamos com carinho para todo o Brasil 📦',
      catalogFooterBusinessHours: 'Segunda a Sexta, das 9h às 18h',
      catalogFooterNotice: 'Produção artesanal sob encomenda. Os prazos começam a contar após a aprovação da arte.',
    }
  },
  {
    id: 'maternidade',
    name: 'Maternidade & Primeiros Anos',
    icon: '🍼',
    tag: 'Delicado',
    description: 'Foco em mães e bebês, perfeito para livros do bebê, cadernetas de saúde e lembrancinhas de batizado.',
    data: {
      catalogBadge: 'Maternidade & Baby',
      catalogStatusText: 'Atendimento com carinho para mamães',
      catalogAnnouncement: '🍼 Cadernetas de vacinação e kits de maternidade com acabamento protetor premium.',
      catalogHeroTitle: 'Coleção Maternidade & Primeiros Anos',
      catalogStoreTagline: 'Lembranças e encadernações delicadas para a chegada do seu bebê',
      catalogHeroDescription: 'Cadernetas de vacina personalizadas, livros de recordação, caixas cartonadas e lembrancinhas afetivas para momentos inesquecíveis.',
      catalogWhatsappGreeting: 'Olá! Gostaria de encomendar itens de maternidade pelo catálogo:',
      catalogWhatsappCustomizationLabel: 'Nome do bebê e tema escolhido:',
      catalogWhatsappFooter: 'Por favor, me envie as opções de frete e o prazo de confecção para o meu CEP.',
      catalogFooterText: 'Feito com amor e cuidado para acolher as memórias mais preciosas da sua família. 👶',
      catalogFooterLocation: 'Ateliê com envio seguro para todo o país ✈️',
      catalogFooterBusinessHours: 'Segunda a Sexta, das 9h às 17h',
      catalogFooterNotice: 'Recomendamos encomendar com antecedência de 20 a 30 dias da data prevista do parto.',
    }
  },
  {
    id: 'minimalista',
    name: 'Ateliê Minimalista & Planners',
    icon: '🌿',
    tag: 'Elegante',
    description: 'Design contemporâneo, limpo e refinado para planners, agendas, blocos de notas e encadernação artística.',
    data: {
      catalogBadge: 'Design & Papel',
      catalogStatusText: 'Ateliê aberto para encomendas',
      catalogAnnouncement: '📓 Planners permanentes e blocos de anotações com capa dura e hot stamping.',
      catalogHeroTitle: 'Planners, Agendas & Papelaria Autoral',
      catalogStoreTagline: 'Organização e encadernação artística em design clean e sofisticado',
      catalogHeroDescription: 'Peças pensadas para quem valoriza estética funcional, papéis nobres de alta gramatura e acabamento artístico refinado.',
      catalogWhatsappGreeting: 'Olá! Gostaria de encomendar pelo catálogo autoral:',
      catalogWhatsappCustomizationLabel: 'Nome ou iniciais na capa:',
      catalogWhatsappFooter: 'Poderia confirmar a disponibilidade e as opções de pagamento (PIX / Cartão)?',
      catalogFooterText: 'Papelaria funcional e atemporal criada para inspirar a sua rotina diária.',
      catalogFooterLocation: 'Produção artesanal sob demanda • Envio para todo o Brasil',
      catalogFooterBusinessHours: 'Segunda a Sábado, das 10h às 19h',
      catalogFooterNotice: 'Trabalhamos exclusivamente com papéis certificados FSC e laminação acetinada de toque aveludado.',
    }
  },
  {
    id: 'festas',
    name: 'Kits de Festa & Scraps Criativos',
    icon: '🎈',
    tag: 'Colorido',
    description: 'Alegre e vibrante, ideal para temas infantis, papelaria de festa, caixas personalizadas e topos de bolo.',
    data: {
      catalogBadge: 'Festas & Mimos',
      catalogStatusText: 'Agenda de festas e comemorações aberta',
      catalogAnnouncement: '🎉 Consulte nossos combos especiais "Pegue e Monte" para comemorações em casa!',
      catalogHeroTitle: 'Kits de Festa & Lembrancinhas Temáticas',
      catalogStoreTagline: 'Papelaria criativa e personalizados que transformam qualquer comemoração',
      catalogHeroDescription: 'Caixas milk, pirâmides, topos de bolo, adesivos e lembranças personalizadas para a festa dos sonhos.',
      catalogWhatsappGreeting: 'Olá! Quero solicitar um orçamento de festa pelo catálogo:',
      catalogWhatsappCustomizationLabel: 'Nome do aniversariante, idade e data do evento:',
      catalogWhatsappFooter: 'Qual o prazo de confecção para a minha data e as opções de frete?',
      catalogFooterText: 'A alegria da sua celebração traduzida em recortes especiais e muito afeto!',
      catalogFooterLocation: 'Enviamos kits com montagem prática para todo o Brasil 📦',
      catalogFooterBusinessHours: 'Segunda a Sexta, das 9h às 18h',
      catalogFooterNotice: 'Personalizamos em qualquer tema sob consulta. As artes são enviadas para prévia antes da impressão.',
    }
  }
];

export const HEADER_COLOR_PRESETS = [
  { name: 'Branco Puro', color: '#ffffff', textColor: 'dark' as const },
  { name: 'Rosê Suave', color: '#fceee9', textColor: 'dark' as const },
  { name: 'Rosa Quartzo', color: '#fae6e7', textColor: 'dark' as const },
  { name: 'Pêssego Nude', color: '#fceede', textColor: 'dark' as const },
  { name: 'Lavanda Floral', color: '#f3eef8', textColor: 'dark' as const },
  { name: 'Creme Vanilla', color: '#fbf8f2', textColor: 'dark' as const },
  { name: 'Grafite Nobre', color: '#1f191b', textColor: 'light' as const },
  { name: 'Vinho Marsala', color: '#613d3e', textColor: 'light' as const },
  { name: 'Dourado Suave', color: '#fcf4e6', textColor: 'dark' as const },
];

export function StoreCustomization() {
  const { isAdmin, hasPermission } = useAuth();
  const canEdit = isAdmin || hasPermission((p) => Boolean(p?.store || p?.settings));

  const { 
    settings, 
    loading, 
    updateSettings, 
    uploadCatalogLogo, 
    removeCatalogLogo,
    uploadCatalogBanner,
    uploadCatalogBannerImage,
    deleteCatalogBannerImage,
    removeCatalogBanner,
    uploadCatalogHeaderBackground,
    removeCatalogHeaderBackground,
    uploadCatalogAboutImage,
    removeCatalogAboutImage,
    toggleStorePublished,
  } = useUserSettings();
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingHeaderBackground, setUploadingHeaderBackground] = useState(false);
  const [uploadingAboutImage, setUploadingAboutImage] = useState(false);
  const [currentCatalogLogo, setCurrentCatalogLogo] = useState<string | null>(null);
  const [currentCatalogBanner, setCurrentCatalogBanner] = useState<string | null>(null);
  const [currentCatalogAboutImage, setCurrentCatalogAboutImage] = useState<string | null>(null);
  const [catalogBanners, setCatalogBanners] = useState<CatalogBannerItem[]>([]);
  const [catalogBannerInterval, setCatalogBannerInterval] = useState<number>(5);
  const [catalogBannerAutoPlay, setCatalogBannerAutoPlay] = useState<boolean>(true);
  const [currentCatalogHeaderBackground, setCurrentCatalogHeaderBackground] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('identity');

  // Estado dos campos do formulário
  const [formData, setFormData] = useState({
    catalogStoreName: '',
    catalogStoreTagline: '',
    catalogWhatsappPhone: '',
    instagramUrl: '',
    instagramColabUrl: '',
    websiteUrl: '',
    catalogBadge: '',
    catalogStatusText: '',
    catalogHeroTitle: '',
    catalogHeroDescription: '',
    catalogAnnouncement: '',
    catalogWhatsappGreeting: '',
    catalogWhatsappCustomizationLabel: '',
    catalogWhatsappFooter: '',
    catalogFooterText: '',
    catalogFooterLocation: '',
    catalogFooterBusinessHours: '',
    catalogFooterCopyright: '',
    catalogFooterNotice: '',
    catalogBannerFixed: false,
    catalogHeaderBgColor: '',
    catalogHeaderTextColor: 'dark' as 'dark' | 'light',
    catalogHeaderLogoPosition: 'left' as 'left' | 'center' | 'full',
    catalogHeaderHeight: 'normal' as 'compact' | 'normal' | 'large',
    catalogHeaderHideText: false,
    catalogShowHero: true,

    // Seção 1: Quem Somos / Sobre o Ateliê
    catalogShowAbout: false,
    catalogAboutBadge: '',
    catalogAboutTitle: '',
    catalogAboutText: '',
    catalogAboutPillar1Title: '',
    catalogAboutPillar1Text: '',
    catalogAboutPillar2Title: '',
    catalogAboutPillar2Text: '',
    catalogAboutPillar3Title: '',
    catalogAboutPillar3Text: '',

    // Seção 2: Como Funciona a Encomenda
    catalogShowHowItWorks: false,
    catalogHowItWorksBadge: '',
    catalogHowItWorksTitle: '',
    catalogHowItWorksSubtitle: '',
    catalogHowItWorksStep1Title: '',
    catalogHowItWorksStep1Text: '',
    catalogHowItWorksStep2Title: '',
    catalogHowItWorksStep2Text: '',
    catalogHowItWorksStep3Title: '',
    catalogHowItWorksStep3Text: '',
    catalogHowItWorksStep4Title: '',
    catalogHowItWorksStep4Text: '',

    // Seção 3: Diferenciais da Marca
    catalogShowFeatures: false,
    catalogFeaturesBadge: '',
    catalogFeaturesTitle: '',
    catalogFeature1Title: '',
    catalogFeature1Text: '',
    catalogFeature2Title: '',
    catalogFeature2Text: '',
    catalogFeature3Title: '',
    catalogFeature3Text: '',
    catalogFeature4Title: '',
    catalogFeature4Text: '',

    // Seção 4: Dúvidas Frequentes (FAQ)
    catalogShowFaq: false,
    catalogFaqBadge: '',
    catalogFaqTitle: '',
    catalogFaq1Q: '',
    catalogFaq1A: '',
    catalogFaq2Q: '',
    catalogFaq2A: '',
    catalogFaq3Q: '',
    catalogFaq3A: '',
    catalogFaq4Q: '',
    catalogFaq4A: '',
    catalogFaq5Q: '',
    catalogFaq5A: '',
  });

  const [dataLoaded, setDataLoaded] = useState(false);

  // Estado de publicação e feature flags
  const [storePublished, setStorePublished] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem("luisices_public_store_settings");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.storePublished !== undefined) return Boolean(parsed.storePublished);
      }
    } catch {}
    return true;
  });
  const [togglingPublished, setTogglingPublished] = useState(false);

  const handleTogglePublished = async (newPublished: boolean) => {
    if (!canEdit) {
      toast.error('Você não tem permissão para alterar a visibilidade da loja.');
      return;
    }
    setTogglingPublished(true);
    setStorePublished(newPublished);
    try {
      await toggleStorePublished(newPublished, storeUnpublishMessage);
      try {
        const cached = localStorage.getItem("luisices_public_store_settings");
        const parsed = cached ? JSON.parse(cached) : {};
        parsed.storePublished = newPublished;
        parsed.storeUnpublishMessage = storeUnpublishMessage;
        localStorage.setItem("luisices_public_store_settings", JSON.stringify(parsed));
      } catch {}
      if (newPublished) {
        toast.success("🟢 Loja publicada com sucesso! A vitrine está online.");
      } else {
        toast.warning("🔴 Loja despublicada! A vitrine está em modo manutenção.");
      }
    } catch (err) {
      console.error("Erro ao alternar publicação da loja:", err);
      setStorePublished(!newPublished);
      toast.error("Erro ao atualizar status de publicação da loja.");
    } finally {
      setTogglingPublished(false);
    }
  };
  const [storeUnpublishMessage, setStoreUnpublishMessage] = useState<string>('');
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({
    enableOnlineOrders: true,
    enableDarkMode: true,
  });
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Carregar dados quando settings estiver pronto ou carregar de storeSettings/public
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      // Inicia com catalogLogo e catalogBanner exclusivos da lojinha (sem fallback para o logo do painel)
      let loadedLogo: string | null = settings?.catalogLogo || null;
      let loadedBanner: string | null = settings?.catalogBanner || null;
      let loadedHeaderBg: string | null = settings?.catalogHeaderBackground || null;
      let loadedAboutImg: string | null = settings?.catalogAboutImageUrl || null;

      // Dados exclusivos da lojinha — totalmente desacoplados do painel interno.
      let data = {
        catalogStoreName: settings?.catalogStoreName || '',
        catalogStoreTagline: settings?.catalogStoreTagline || '',
        catalogWhatsappPhone: formatPhoneForDisplay(settings?.catalogWhatsappPhone || ''),
        instagramUrl: '',
        instagramColabUrl: '',
        websiteUrl: '',
        catalogBadge: settings?.catalogBadge || '',
        catalogStatusText: settings?.catalogStatusText || '',
        catalogHeroTitle: settings?.catalogHeroTitle || '',
        catalogHeroDescription: settings?.catalogHeroDescription || '',
        catalogAnnouncement: settings?.catalogAnnouncement || '',
        catalogWhatsappGreeting: settings?.catalogWhatsappGreeting || '',
        catalogWhatsappCustomizationLabel: settings?.catalogWhatsappCustomizationLabel || '',
        catalogWhatsappFooter: settings?.catalogWhatsappFooter || '',
        catalogFooterText: settings?.catalogFooterText || '',
        catalogFooterLocation: settings?.catalogFooterLocation || '',
        catalogFooterBusinessHours: settings?.catalogFooterBusinessHours || '',
        catalogFooterCopyright: settings?.catalogFooterCopyright || '',
        catalogFooterNotice: settings?.catalogFooterNotice || '',
        catalogBannerFixed: settings?.catalogBannerFixed || false,
        catalogHeaderBgColor: settings?.catalogHeaderBgColor || '',
        catalogHeaderTextColor: (settings?.catalogHeaderTextColor || 'dark') as 'dark' | 'light',
        catalogHeaderLogoPosition: (settings?.catalogHeaderLogoPosition || 'left') as 'left' | 'center' | 'full',
        catalogHeaderHeight: (settings?.catalogHeaderHeight || 'normal') as 'compact' | 'normal' | 'large',
        catalogHeaderHideText: Boolean(settings?.catalogHeaderHideText),
        catalogShowHero: settings?.catalogShowHero !== undefined ? Boolean(settings.catalogShowHero) : true,

        // 1. Quem Somos
        catalogShowAbout: settings?.catalogShowAbout !== undefined ? Boolean(settings.catalogShowAbout) : false,
        catalogAboutBadge: settings?.catalogAboutBadge || '',
        catalogAboutTitle: settings?.catalogAboutTitle || '',
        catalogAboutText: settings?.catalogAboutText || '',
        catalogAboutPillar1Title: settings?.catalogAboutPillar1Title || '',
        catalogAboutPillar1Text: settings?.catalogAboutPillar1Text || '',
        catalogAboutPillar2Title: settings?.catalogAboutPillar2Title || '',
        catalogAboutPillar2Text: settings?.catalogAboutPillar2Text || '',
        catalogAboutPillar3Title: settings?.catalogAboutPillar3Title || '',
        catalogAboutPillar3Text: settings?.catalogAboutPillar3Text || '',

        // 2. Como Funciona
        catalogShowHowItWorks: settings?.catalogShowHowItWorks !== undefined ? Boolean(settings.catalogShowHowItWorks) : false,
        catalogHowItWorksBadge: settings?.catalogHowItWorksBadge || '',
        catalogHowItWorksTitle: settings?.catalogHowItWorksTitle || '',
        catalogHowItWorksSubtitle: settings?.catalogHowItWorksSubtitle || '',
        catalogHowItWorksStep1Title: settings?.catalogHowItWorksStep1Title || '',
        catalogHowItWorksStep1Text: settings?.catalogHowItWorksStep1Text || '',
        catalogHowItWorksStep2Title: settings?.catalogHowItWorksStep2Title || '',
        catalogHowItWorksStep2Text: settings?.catalogHowItWorksStep2Text || '',
        catalogHowItWorksStep3Title: settings?.catalogHowItWorksStep3Title || '',
        catalogHowItWorksStep3Text: settings?.catalogHowItWorksStep3Text || '',
        catalogHowItWorksStep4Title: settings?.catalogHowItWorksStep4Title || '',
        catalogHowItWorksStep4Text: settings?.catalogHowItWorksStep4Text || '',

        // 3. Diferenciais
        catalogShowFeatures: settings?.catalogShowFeatures !== undefined ? Boolean(settings.catalogShowFeatures) : false,
        catalogFeaturesBadge: settings?.catalogFeaturesBadge || '',
        catalogFeaturesTitle: settings?.catalogFeaturesTitle || '',
        catalogFeature1Title: settings?.catalogFeature1Title || '',
        catalogFeature1Text: settings?.catalogFeature1Text || '',
        catalogFeature2Title: settings?.catalogFeature2Title || '',
        catalogFeature2Text: settings?.catalogFeature2Text || '',
        catalogFeature3Title: settings?.catalogFeature3Title || '',
        catalogFeature3Text: settings?.catalogFeature3Text || '',
        catalogFeature4Title: settings?.catalogFeature4Title || '',
        catalogFeature4Text: settings?.catalogFeature4Text || '',

        // 4. FAQ
        catalogShowFaq: settings?.catalogShowFaq !== undefined ? Boolean(settings.catalogShowFaq) : false,
        catalogFaqBadge: settings?.catalogFaqBadge || '',
        catalogFaqTitle: settings?.catalogFaqTitle || '',
        catalogFaq1Q: settings?.catalogFaq1Q || '',
        catalogFaq1A: settings?.catalogFaq1A || '',
        catalogFaq2Q: settings?.catalogFaq2Q || '',
        catalogFaq2A: settings?.catalogFaq2A || '',
        catalogFaq3Q: settings?.catalogFaq3Q || '',
        catalogFaq3A: settings?.catalogFaq3A || '',
        catalogFaq4Q: settings?.catalogFaq4Q || '',
        catalogFaq4A: settings?.catalogFaq4A || '',
        catalogFaq5Q: settings?.catalogFaq5Q || '',
        catalogFaq5A: settings?.catalogFaq5A || '',
      };

      // Carrega os dados compartilhados públicos da loja do Firestore
      let pubData: any = null;
      try {
        const publicSnap = await getDoc(doc(db, 'storeSettings', 'public'));
        if (publicSnap.exists() && !isCancelled) {
          const pub = publicSnap.data();
          pubData = pub;
          // Prioriza estritamente o catalogLogo exclusivo da loja pública
          if (pub.catalogLogo) {
            loadedLogo = pub.catalogLogo;
          } else {
            loadedLogo = null;
          }

          // Prioriza estritamente o catalogBanner exclusivo da loja pública
          if (pub.catalogBanner) {
            loadedBanner = pub.catalogBanner;
          } else {
            loadedBanner = null;
          }

          // Fundo personalizado da barra superior fixa
          if (pub.catalogHeaderBackground) {
            loadedHeaderBg = pub.catalogHeaderBackground;
          } else {
            loadedHeaderBg = null;
          }

          // Imagem institucional Sobre Nós
          if (pub.catalogAboutImageUrl) {
            loadedAboutImg = pub.catalogAboutImageUrl;
          } else {
            loadedAboutImg = null;
          }

          // Merge exclusivo da lojinha — totalmente desacoplado do painel interno.
          data = {
            catalogStoreName: pub.catalogStoreName || pub.name || pub.businessName || settings?.catalogStoreName || '',
            catalogStoreTagline: pub.catalogStoreTagline !== undefined ? pub.catalogStoreTagline : (pub.tagline || pub.businessTagline || settings?.catalogStoreTagline || ''),
            catalogWhatsappPhone: formatPhoneForDisplay(pub.catalogWhatsappPhone || pub.whatsappPhone || ''),
            instagramUrl: pub.instagramUrl || '',
            instagramColabUrl: pub.instagramColabUrl || '',
            websiteUrl: pub.websiteUrl || '',
            catalogBadge: pub.catalogBadge || data.catalogBadge,
            catalogStatusText: pub.catalogStatusText || data.catalogStatusText,
            catalogHeroTitle: pub.catalogHeroTitle || data.catalogHeroTitle,
            catalogHeroDescription: pub.catalogHeroDescription || data.catalogHeroDescription,
            catalogAnnouncement: pub.catalogAnnouncement !== undefined ? pub.catalogAnnouncement : data.catalogAnnouncement,
            catalogWhatsappGreeting: pub.catalogWhatsappGreeting || data.catalogWhatsappGreeting,
            catalogWhatsappCustomizationLabel: pub.catalogWhatsappCustomizationLabel || data.catalogWhatsappCustomizationLabel,
            catalogWhatsappFooter: pub.catalogWhatsappFooter || data.catalogWhatsappFooter,
            catalogFooterText: pub.catalogFooterText || data.catalogFooterText,
            catalogFooterLocation: pub.catalogFooterLocation || data.catalogFooterLocation,
            catalogFooterBusinessHours: pub.catalogFooterBusinessHours || data.catalogFooterBusinessHours,
            catalogFooterCopyright: pub.catalogFooterCopyright || data.catalogFooterCopyright,
            catalogFooterNotice: pub.catalogFooterNotice || data.catalogFooterNotice,
            catalogBannerFixed: pub.catalogBannerFixed !== undefined ? Boolean(pub.catalogBannerFixed) : (settings?.catalogBannerFixed || false),
            catalogHeaderBgColor: pub.catalogHeaderBgColor !== undefined ? pub.catalogHeaderBgColor : data.catalogHeaderBgColor,
            catalogHeaderTextColor: pub.catalogHeaderTextColor || data.catalogHeaderTextColor,
            catalogHeaderLogoPosition: pub.catalogHeaderLogoPosition || data.catalogHeaderLogoPosition,
            catalogHeaderHeight: pub.catalogHeaderHeight || data.catalogHeaderHeight,
            catalogHeaderHideText: pub.catalogHeaderHideText !== undefined ? Boolean(pub.catalogHeaderHideText) : data.catalogHeaderHideText,
            catalogShowHero: pub.catalogShowHero !== undefined ? Boolean(pub.catalogShowHero) : data.catalogShowHero,

            // 1. Quem Somos
            catalogShowAbout: pub.catalogShowAbout !== undefined ? Boolean(pub.catalogShowAbout) : data.catalogShowAbout,
            catalogAboutBadge: pub.catalogAboutBadge !== undefined ? pub.catalogAboutBadge : data.catalogAboutBadge,
            catalogAboutTitle: pub.catalogAboutTitle !== undefined ? pub.catalogAboutTitle : data.catalogAboutTitle,
            catalogAboutText: pub.catalogAboutText !== undefined ? pub.catalogAboutText : data.catalogAboutText,
            catalogAboutPillar1Title: pub.catalogAboutPillar1Title !== undefined ? pub.catalogAboutPillar1Title : data.catalogAboutPillar1Title,
            catalogAboutPillar1Text: pub.catalogAboutPillar1Text !== undefined ? pub.catalogAboutPillar1Text : data.catalogAboutPillar1Text,
            catalogAboutPillar2Title: pub.catalogAboutPillar2Title !== undefined ? pub.catalogAboutPillar2Title : data.catalogAboutPillar2Title,
            catalogAboutPillar2Text: pub.catalogAboutPillar2Text !== undefined ? pub.catalogAboutPillar2Text : data.catalogAboutPillar2Text,
            catalogAboutPillar3Title: pub.catalogAboutPillar3Title !== undefined ? pub.catalogAboutPillar3Title : data.catalogAboutPillar3Title,
            catalogAboutPillar3Text: pub.catalogAboutPillar3Text !== undefined ? pub.catalogAboutPillar3Text : data.catalogAboutPillar3Text,

            // 2. Como Funciona
            catalogShowHowItWorks: pub.catalogShowHowItWorks !== undefined ? Boolean(pub.catalogShowHowItWorks) : data.catalogShowHowItWorks,
            catalogHowItWorksBadge: pub.catalogHowItWorksBadge !== undefined ? pub.catalogHowItWorksBadge : data.catalogHowItWorksBadge,
            catalogHowItWorksTitle: pub.catalogHowItWorksTitle !== undefined ? pub.catalogHowItWorksTitle : data.catalogHowItWorksTitle,
            catalogHowItWorksSubtitle: pub.catalogHowItWorksSubtitle !== undefined ? pub.catalogHowItWorksSubtitle : data.catalogHowItWorksSubtitle,
            catalogHowItWorksStep1Title: pub.catalogHowItWorksStep1Title !== undefined ? pub.catalogHowItWorksStep1Title : data.catalogHowItWorksStep1Title,
            catalogHowItWorksStep1Text: pub.catalogHowItWorksStep1Text !== undefined ? pub.catalogHowItWorksStep1Text : data.catalogHowItWorksStep1Text,
            catalogHowItWorksStep2Title: pub.catalogHowItWorksStep2Title !== undefined ? pub.catalogHowItWorksStep2Title : data.catalogHowItWorksStep2Title,
            catalogHowItWorksStep2Text: pub.catalogHowItWorksStep2Text !== undefined ? pub.catalogHowItWorksStep2Text : data.catalogHowItWorksStep2Text,
            catalogHowItWorksStep3Title: pub.catalogHowItWorksStep3Title !== undefined ? pub.catalogHowItWorksStep3Title : data.catalogHowItWorksStep3Title,
            catalogHowItWorksStep3Text: pub.catalogHowItWorksStep3Text !== undefined ? pub.catalogHowItWorksStep3Text : data.catalogHowItWorksStep3Text,
            catalogHowItWorksStep4Title: pub.catalogHowItWorksStep4Title !== undefined ? pub.catalogHowItWorksStep4Title : data.catalogHowItWorksStep4Title,
            catalogHowItWorksStep4Text: pub.catalogHowItWorksStep4Text !== undefined ? pub.catalogHowItWorksStep4Text : data.catalogHowItWorksStep4Text,

            // 3. Diferenciais
            catalogShowFeatures: pub.catalogShowFeatures !== undefined ? Boolean(pub.catalogShowFeatures) : data.catalogShowFeatures,
            catalogFeaturesBadge: pub.catalogFeaturesBadge !== undefined ? pub.catalogFeaturesBadge : data.catalogFeaturesBadge,
            catalogFeaturesTitle: pub.catalogFeaturesTitle !== undefined ? pub.catalogFeaturesTitle : data.catalogFeaturesTitle,
            catalogFeature1Title: pub.catalogFeature1Title !== undefined ? pub.catalogFeature1Title : data.catalogFeature1Title,
            catalogFeature1Text: pub.catalogFeature1Text !== undefined ? pub.catalogFeature1Text : data.catalogFeature1Text,
            catalogFeature2Title: pub.catalogFeature2Title !== undefined ? pub.catalogFeature2Title : data.catalogFeature2Title,
            catalogFeature2Text: pub.catalogFeature2Text !== undefined ? pub.catalogFeature2Text : data.catalogFeature2Text,
            catalogFeature3Title: pub.catalogFeature3Title !== undefined ? pub.catalogFeature3Title : data.catalogFeature3Title,
            catalogFeature3Text: pub.catalogFeature3Text !== undefined ? pub.catalogFeature3Text : data.catalogFeature3Text,
            catalogFeature4Title: pub.catalogFeature4Title !== undefined ? pub.catalogFeature4Title : data.catalogFeature4Title,
            catalogFeature4Text: pub.catalogFeature4Text !== undefined ? pub.catalogFeature4Text : data.catalogFeature4Text,

            // 4. FAQ
            catalogShowFaq: pub.catalogShowFaq !== undefined ? Boolean(pub.catalogShowFaq) : data.catalogShowFaq,
            catalogFaqBadge: pub.catalogFaqBadge !== undefined ? pub.catalogFaqBadge : data.catalogFaqBadge,
            catalogFaqTitle: pub.catalogFaqTitle !== undefined ? pub.catalogFaqTitle : data.catalogFaqTitle,
            catalogFaq1Q: pub.catalogFaq1Q !== undefined ? pub.catalogFaq1Q : data.catalogFaq1Q,
            catalogFaq1A: pub.catalogFaq1A !== undefined ? pub.catalogFaq1A : data.catalogFaq1A,
            catalogFaq2Q: pub.catalogFaq2Q !== undefined ? pub.catalogFaq2Q : data.catalogFaq2Q,
            catalogFaq2A: pub.catalogFaq2A !== undefined ? pub.catalogFaq2A : data.catalogFaq2A,
            catalogFaq3Q: pub.catalogFaq3Q !== undefined ? pub.catalogFaq3Q : data.catalogFaq3Q,
            catalogFaq3A: pub.catalogFaq3A !== undefined ? pub.catalogFaq3A : data.catalogFaq3A,
            catalogFaq4Q: pub.catalogFaq4Q !== undefined ? pub.catalogFaq4Q : data.catalogFaq4Q,
            catalogFaq4A: pub.catalogFaq4A !== undefined ? pub.catalogFaq4A : data.catalogFaq4A,
            catalogFaq5Q: pub.catalogFaq5Q !== undefined ? pub.catalogFaq5Q : data.catalogFaq5Q,
            catalogFaq5A: pub.catalogFaq5A !== undefined ? pub.catalogFaq5A : data.catalogFaq5A,
          };
        }
      } catch (err) {
        console.warn('Aviso ao ler storeSettings/public:', err);
      }

      if (!isCancelled) {
        setCurrentCatalogLogo(loadedLogo);
        setCurrentCatalogBanner(loadedBanner);
        setCurrentCatalogHeaderBackground(loadedHeaderBg);
        setCurrentCatalogAboutImage(loadedAboutImg);

        // Carrega múltiplos banners rotativos (carrossel / propaganda)
        let loadedBanners: CatalogBannerItem[] = [];
        if (Array.isArray(pubData?.catalogBanners) && pubData.catalogBanners.length > 0) {
          loadedBanners = pubData.catalogBanners;
        } else if (Array.isArray(settings?.catalogBanners) && settings.catalogBanners.length > 0) {
          loadedBanners = settings.catalogBanners;
        } else if (loadedBanner) {
          loadedBanners = [{ id: 'b-default', imageUrl: loadedBanner }];
        }
        setCatalogBanners(loadedBanners);

        const loadedInterval = Number(pubData?.catalogBannerInterval || settings?.catalogBannerInterval) || 5;
        setCatalogBannerInterval(loadedInterval);

        const loadedAutoPlay = pubData?.catalogBannerAutoPlay !== undefined
          ? Boolean(pubData.catalogBannerAutoPlay)
          : (settings?.catalogBannerAutoPlay !== undefined ? Boolean(settings.catalogBannerAutoPlay) : true);
        setCatalogBannerAutoPlay(loadedAutoPlay);

        if (!dataLoaded) {
          setFormData(data);
          setDataLoaded(true);

          // Carregar estado de publicação e feature flags
          const loadedPublished = pubData?.storePublished !== undefined
            ? Boolean(pubData.storePublished)
            : (settings?.storePublished !== undefined ? Boolean(settings.storePublished) : true);
          setStorePublished(loadedPublished);

          const loadedUnpublishMsg = pubData?.storeUnpublishMessage || settings?.storeUnpublishMessage || '';
          setStoreUnpublishMessage(loadedUnpublishMsg);

          const defaultFlags = { enableOnlineOrders: true, enableDarkMode: true };
          const loadedFlags = pubData?.featureFlags || settings?.featureFlags || defaultFlags;
          setFeatureFlags({ ...defaultFlags, ...loadedFlags });
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [settings]);

  const handleLogoUpload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato inválido. Use imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5 MB.');
      return;
    }

    setUploadingLogo(true);
    try {
      const url = await uploadCatalogLogo(file, currentCatalogLogo || undefined);
      setCurrentCatalogLogo(url);
      try {
        const cached = localStorage.getItem('luisices_public_store_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.logo = url;
          parsed.catalogLogo = url;
          localStorage.setItem('luisices_public_store_settings', JSON.stringify(parsed));
        }
      } catch {}
      toast.success('Logo exclusivo da lojinha atualizado com sucesso!');
    } catch (error) {
      console.error('Erro no upload do logo da lojinha:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer upload do logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoRemove = async () => {
    if (!confirm('Deseja realmente remover o logo exclusivo da lojinha pública?')) return;
    setUploadingLogo(true);
    const previousLogo = currentCatalogLogo;
    try {
      setCurrentCatalogLogo(null);
      await removeCatalogLogo(previousLogo || undefined);
      try {
        const cached = localStorage.getItem('luisices_public_store_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.logo = '';
          parsed.catalogLogo = '';
          localStorage.setItem('luisices_public_store_settings', JSON.stringify(parsed));
        }
      } catch {}
      toast.success('Logo exclusivo da lojinha removido!');
    } catch (error) {
      console.error('Erro ao remover logo da lojinha:', error);
      setCurrentCatalogLogo(previousLogo);
      toast.error('Erro ao remover logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleAddBanner = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato inválido. Use imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5 MB.');
      return;
    }

    setUploadingBanner(true);
    try {
      const url = await uploadCatalogBannerImage(file);
      const newBanner: CatalogBannerItem = {
        id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        imageUrl: url,
        title: '',
        linkUrl: '',
      };
      const updated = [...catalogBanners, newBanner];
      setCatalogBanners(updated);
      setCurrentCatalogBanner(updated[0]?.imageUrl || url);

      try {
        const cached = localStorage.getItem('luisices_public_store_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.banner = updated[0]?.imageUrl || url;
          parsed.catalogBanner = updated[0]?.imageUrl || url;
          parsed.banners = updated;
          parsed.catalogBanners = updated;
          parsed.bannerInterval = catalogBannerInterval;
          parsed.catalogBannerInterval = catalogBannerInterval;
          parsed.bannerAutoPlay = catalogBannerAutoPlay;
          parsed.catalogBannerAutoPlay = catalogBannerAutoPlay;
          localStorage.setItem('luisices_public_store_settings', JSON.stringify(parsed));
        }
      } catch {}

      toast.success(`Banner #${updated.length} adicionado ao carrossel!`);
    } catch (error) {
      console.error('Erro ao adicionar banner:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleRemoveBanner = async (index: number) => {
    const bannerToRemove = catalogBanners[index];
    if (!bannerToRemove) return;
    if (!confirm(`Deseja realmente remover o Banner #${index + 1}?`)) return;

    const updated = catalogBanners.filter((_, i) => i !== index);
    setCatalogBanners(updated);
    setCurrentCatalogBanner(updated[0]?.imageUrl || null);

    try {
      await deleteCatalogBannerImage(bannerToRemove.imageUrl);
    } catch (err) {
      console.warn('Erro ao deletar imagem do storage:', err);
    }

    try {
      const cached = localStorage.getItem('luisices_public_store_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.banner = updated[0]?.imageUrl || '';
        parsed.catalogBanner = updated[0]?.imageUrl || '';
        parsed.banners = updated;
        parsed.catalogBanners = updated;
        localStorage.setItem('luisices_public_store_settings', JSON.stringify(parsed));
      }
    } catch {}

    toast.success('Banner removido do carrossel!');
  };

  const handleMoveBanner = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= catalogBanners.length) return;

    const updated = [...catalogBanners];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    setCatalogBanners(updated);
    setCurrentCatalogBanner(updated[0]?.imageUrl || null);
  };

  const handleUpdateBannerField = (index: number, field: 'title' | 'linkUrl', value: string) => {
    setCatalogBanners((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  };

  const handleBannerUpload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato inválido. Use imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5 MB.');
      return;
    }

    setUploadingBanner(true);
    try {
      const url = await uploadCatalogBanner(file, currentCatalogBanner || undefined);
      setCurrentCatalogBanner(url);
      setCatalogBanners((prev) => {
        if (prev.length === 0) {
          return [{ id: `b-${Date.now()}`, imageUrl: url }];
        }
        return prev.map((b, idx) => (idx === 0 ? { ...b, imageUrl: url } : b));
      });
      try {
        const cached = localStorage.getItem('luisices_public_store_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.banner = url;
          parsed.catalogBanner = url;
          localStorage.setItem('luisices_public_store_settings', JSON.stringify(parsed));
        }
      } catch {}
      toast.success('Banner de capa da lojinha atualizado com sucesso!');
    } catch (error) {
      console.error('Erro no upload do banner da lojinha:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer upload do banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleBannerRemove = async () => {
    if (!confirm('Deseja realmente remover o banner de capa da lojinha pública?')) return;
    setUploadingBanner(true);
    const previousBanner = currentCatalogBanner;
    try {
      setCurrentCatalogBanner(null);
      setCatalogBanners([]);
      await removeCatalogBanner(previousBanner || undefined);
      try {
        const cached = localStorage.getItem('luisices_public_store_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.banner = '';
          parsed.catalogBanner = '';
          parsed.banners = [];
          parsed.catalogBanners = [];
          localStorage.setItem('luisices_public_store_settings', JSON.stringify(parsed));
        }
      } catch {}
      toast.success('Banner de capa da lojinha removido!');
    } catch (error) {
      console.error('Erro ao remover banner da lojinha:', error);
      setCurrentCatalogBanner(previousBanner);
      toast.error('Erro ao remover banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleHeaderBackgroundUpload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato inválido. Use imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5 MB.');
      return;
    }

    setUploadingHeaderBackground(true);
    try {
      const url = await uploadCatalogHeaderBackground(file, currentCatalogHeaderBackground || undefined);
      setCurrentCatalogHeaderBackground(url);
      try {
        const cached = localStorage.getItem('luisices_public_store_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.headerBackground = url;
          parsed.catalogHeaderBackground = url;
          localStorage.setItem('luisices_public_store_settings', JSON.stringify(parsed));
        }
      } catch {}
      toast.success('Fundo da barra superior atualizado com sucesso!');
    } catch (error) {
      console.error('Erro no upload do fundo da barra superior:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer upload da imagem');
    } finally {
      setUploadingHeaderBackground(false);
    }
  };

  const handleHeaderBackgroundRemove = async () => {
    if (!confirm('Deseja realmente remover a imagem de fundo da barra superior?')) return;
    setUploadingHeaderBackground(true);
    const previousBg = currentCatalogHeaderBackground;
    try {
      setCurrentCatalogHeaderBackground(null);
      await removeCatalogHeaderBackground(previousBg || undefined);
      try {
        const cached = localStorage.getItem('luisices_public_store_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.headerBackground = '';
          parsed.catalogHeaderBackground = '';
          localStorage.setItem('luisices_public_store_settings', JSON.stringify(parsed));
        }
      } catch {}
      toast.success('Fundo da barra superior removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover fundo da barra superior:', error);
      setCurrentCatalogHeaderBackground(previousBg);
      toast.error('Erro ao remover fundo');
    } finally {
      setUploadingHeaderBackground(false);
    }
  };

  const handleAboutImageUpload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato inválido. Use imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5 MB.');
      return;
    }

    setUploadingAboutImage(true);
    try {
      const url = await uploadCatalogAboutImage(file, currentCatalogAboutImage || undefined);
      setCurrentCatalogAboutImage(url);
      try {
        const cached = localStorage.getItem('luisices_public_store_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.catalogAboutImageUrl = url;
          localStorage.setItem('luisices_public_store_settings', JSON.stringify(parsed));
        }
      } catch {}
      toast.success('Foto institucional da seção "Quem Somos" atualizada com sucesso!');
    } catch (error) {
      console.error('Erro no upload da foto institucional:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer upload da foto');
    } finally {
      setUploadingAboutImage(false);
    }
  };

  const handleAboutImageRemove = async () => {
    if (!confirm('Deseja realmente remover a foto institucional?')) return;
    setUploadingAboutImage(true);
    const previousImg = currentCatalogAboutImage;
    try {
      setCurrentCatalogAboutImage(null);
      await removeCatalogAboutImage(previousImg || undefined);
      try {
        const cached = localStorage.getItem('luisices_public_store_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.catalogAboutImageUrl = '';
          localStorage.setItem('luisices_public_store_settings', JSON.stringify(parsed));
        }
      } catch {}
      toast.success('Foto institucional removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover foto institucional:', error);
      setCurrentCatalogAboutImage(previousImg);
      toast.error('Erro ao remover imagem');
    } finally {
      setUploadingAboutImage(false);
    }
  };

  const fillInstitutionalDefaults = () => {
    setFormData((prev) => ({
      ...prev,
      catalogShowAbout: true,
      catalogAboutBadge: 'Sobre Nós',
      catalogAboutTitle: 'Feito à Mão com Afeto & Dedicação',
      catalogAboutText: 'No Ateliê Luisices, acreditamos que a papelaria personalizada vai muito além do papel: ela materializa memórias, celebra novas fases e acolhe com carinho momentos únicos. Cada peça é desenhada e produzida artesanalmente com os mais nobres materiais.',
      catalogAboutPillar1Title: 'Produção Artesanal',
      catalogAboutPillar1Text: 'Corte, dobra, montagem e laminação feitos à mão com rigoroso controle de acabamento.',
      catalogAboutPillar2Title: 'Materiais Nobres',
      catalogAboutPillar2Text: 'Papéis especiais de alta gramatura, laminação fosca/holográfica e acabamentos duradouros.',
      catalogAboutPillar3Title: 'Afeto em Cada Detalhe',
      catalogAboutPillar3Text: 'Personalização exclusiva com seu nome, tema e cores para tornar seu momento inesquecível.',

      catalogShowHowItWorks: true,
      catalogHowItWorksBadge: 'Passo a Passo',
      catalogHowItWorksTitle: 'Como Funciona sua Encomenda?',
      catalogHowItWorksSubtitle: 'Um processo simples, transparente e carinhoso do pedido até a sua entrega',
      catalogHowItWorksStep1Title: '1. Escolha seus Mimos',
      catalogHowItWorksStep1Text: 'Explore os produtos na vitrine e adicione à sacola os itens desejados.',
      catalogHowItWorksStep2Title: '2. Envie pelo WhatsApp',
      catalogHowItWorksStep2Text: 'Informe o nome para personalização e clique para enviar a sacola direto no WhatsApp.',
      catalogHowItWorksStep3Title: '3. Prévia & Aprovação',
      catalogHowItWorksStep3Text: 'Enviamos a arte digital para você conferir e aprovar cada detalhe antes da impressão.',
      catalogHowItWorksStep4Title: '4. Confecção & Envio',
      catalogHowItWorksStep4Text: 'Produzimos com todo o carinho e despachamos com embalagem segura para o seu endereço.',

      catalogShowFeatures: true,
      catalogFeaturesBadge: 'Diferenciais do Ateliê',
      catalogFeaturesTitle: 'Por que escolher a Luisices?',
      catalogFeature1Title: 'Atendimento Humanizado',
      catalogFeature1Text: 'Conversa direta pelo WhatsApp para tirar dúvidas e alinhar sua arte com calma.',
      catalogFeature2Title: 'Laminação Protetora',
      catalogFeature2Text: 'Capas e peças protegidas contra respingos e sujeira, com toque suave e aveludado.',
      catalogFeature3Title: 'Embalagem Reforçada',
      catalogFeature3Text: 'Seus mimos viajam com proteção extra para chegarem impecáveis até você.',
      catalogFeature4Title: 'Arte Sob Medida',
      catalogFeature4Text: 'Criações autorais e adaptações em qualquer tema para transformar sua festa ou rotina.',

      catalogShowFaq: true,
      catalogFaqBadge: 'Tire suas Dúvidas',
      catalogFaqTitle: 'Perguntas Frequentes (FAQ)',
      catalogFaq1Q: 'Qual é o prazo médio de produção?',
      catalogFaq1A: 'O prazo varia de acordo com cada produto (geralmente entre 5 a 10 dias úteis) e começa a contar após a aprovação da arte final.',
      catalogFaq2Q: 'Vocês enviam para todo o Brasil?',
      catalogFaq2A: 'Sim! Enviamos para todo o território nacional via Correios (PAC/Sedex) ou transportadora, com código de rastreio.',
      catalogFaq3Q: 'Posso personalizar com qualquer tema ou nome?',
      catalogFaq3A: 'Sim! Todos os nossos produtos personalizáveis podem ser adaptados com seu tema, nome, idade ou paleta de cores desejada.',
      catalogFaq4Q: 'Como funciona o pagamento?',
      catalogFaq4A: 'Aceitamos PIX (com confirmação imediata) e Cartão de Crédito. Os dados são fornecidos diretamente no WhatsApp.',
      catalogFaq5Q: 'Consigo ver uma prévia antes da confecção?',
      catalogFaq5A: 'Com certeza! Antes de imprimir qualquer produto, enviamos a prévia digital no WhatsApp para sua total aprovação.',
    }));
    toast.success('Sugestões preenchidas com sucesso! Revise os campos e clique em Salvar Alterações.');
  };

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const [showTemplates, setShowTemplates] = useState(false);

  const applyTemplate = (templateId: string) => {
    const tmpl = STORE_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;

    setFormData((prev) => ({
      ...prev,
      ...tmpl.data,
    }));
    toast.success(`Modelo "${tmpl.name}" aplicado! Revise os textos e clique em Salvar Alterações.`);
  };

  const handleSave = async () => {
    if (!canEdit) {
      toast.error('Você não tem permissão para salvar personalizações da loja.');
      return;
    }
    setSaving(true);
    try {
      await updateSettings({
        ...formData,
        catalogStoreName: formData.catalogStoreName,
        catalogStoreTagline: formData.catalogStoreTagline,
        catalogLogo: currentCatalogLogo || '',
        catalogBanner: catalogBanners[0]?.imageUrl || currentCatalogBanner || '',
        catalogBanners,
        catalogBannerInterval,
        catalogBannerAutoPlay,
        catalogBannerFixed: Boolean(formData.catalogBannerFixed),
        catalogHeaderBackground: currentCatalogHeaderBackground || '',
        catalogHeaderBgColor: formData.catalogHeaderBgColor,
        catalogHeaderTextColor: formData.catalogHeaderTextColor,
        catalogHeaderLogoPosition: formData.catalogHeaderLogoPosition,
        catalogHeaderHeight: formData.catalogHeaderHeight,
        catalogHeaderHideText: Boolean(formData.catalogHeaderHideText),
        catalogShowHero: Boolean(formData.catalogShowHero),

        // 1. Quem Somos
        catalogShowAbout: Boolean(formData.catalogShowAbout),
        catalogAboutBadge: formData.catalogAboutBadge,
        catalogAboutTitle: formData.catalogAboutTitle,
        catalogAboutText: formData.catalogAboutText,
        catalogAboutImageUrl: currentCatalogAboutImage || '',
        catalogAboutPillar1Title: formData.catalogAboutPillar1Title,
        catalogAboutPillar1Text: formData.catalogAboutPillar1Text,
        catalogAboutPillar2Title: formData.catalogAboutPillar2Title,
        catalogAboutPillar2Text: formData.catalogAboutPillar2Text,
        catalogAboutPillar3Title: formData.catalogAboutPillar3Title,
        catalogAboutPillar3Text: formData.catalogAboutPillar3Text,

        // 2. Como Funciona
        catalogShowHowItWorks: Boolean(formData.catalogShowHowItWorks),
        catalogHowItWorksBadge: formData.catalogHowItWorksBadge,
        catalogHowItWorksTitle: formData.catalogHowItWorksTitle,
        catalogHowItWorksSubtitle: formData.catalogHowItWorksSubtitle,
        catalogHowItWorksStep1Title: formData.catalogHowItWorksStep1Title,
        catalogHowItWorksStep1Text: formData.catalogHowItWorksStep1Text,
        catalogHowItWorksStep2Title: formData.catalogHowItWorksStep2Title,
        catalogHowItWorksStep2Text: formData.catalogHowItWorksStep2Text,
        catalogHowItWorksStep3Title: formData.catalogHowItWorksStep3Title,
        catalogHowItWorksStep3Text: formData.catalogHowItWorksStep3Text,
        catalogHowItWorksStep4Title: formData.catalogHowItWorksStep4Title,
        catalogHowItWorksStep4Text: formData.catalogHowItWorksStep4Text,

        // 3. Diferenciais
        catalogShowFeatures: Boolean(formData.catalogShowFeatures),
        catalogFeaturesBadge: formData.catalogFeaturesBadge,
        catalogFeaturesTitle: formData.catalogFeaturesTitle,
        catalogFeature1Title: formData.catalogFeature1Title,
        catalogFeature1Text: formData.catalogFeature1Text,
        catalogFeature2Title: formData.catalogFeature2Title,
        catalogFeature2Text: formData.catalogFeature2Text,
        catalogFeature3Title: formData.catalogFeature3Title,
        catalogFeature3Text: formData.catalogFeature3Text,
        catalogFeature4Title: formData.catalogFeature4Title,
        catalogFeature4Text: formData.catalogFeature4Text,

        // 4. FAQ
        catalogShowFaq: Boolean(formData.catalogShowFaq),
        catalogFaqBadge: formData.catalogFaqBadge,
        catalogFaqTitle: formData.catalogFaqTitle,
        catalogFaq1Q: formData.catalogFaq1Q,
        catalogFaq1A: formData.catalogFaq1A,
        catalogFaq2Q: formData.catalogFaq2Q,
        catalogFaq2A: formData.catalogFaq2A,
        catalogFaq3Q: formData.catalogFaq3Q,
        catalogFaq3A: formData.catalogFaq3A,
        catalogFaq4Q: formData.catalogFaq4Q,
        catalogFaq4A: formData.catalogFaq4A,
        catalogFaq5Q: formData.catalogFaq5Q,
        catalogFaq5A: formData.catalogFaq5A,

        storePublished,
        storeUnpublishMessage,
        featureFlags,
      });
      // Salva no cache do navegador para a lojinha atualizar instantaneamente
      try {
        const publicData = {
          catalogStoreName: formData.catalogStoreName,
          name: formData.catalogStoreName || 'Luisices Papelaria Personalizada',
          businessName: formData.catalogStoreName || 'Luisices Papelaria Personalizada',
          catalogStoreTagline: formData.catalogStoreTagline,
          tagline: formData.catalogStoreTagline,
          businessTagline: formData.catalogStoreTagline,
          whatsapp: formData.catalogWhatsappPhone,
          catalogWhatsappPhone: formData.catalogWhatsappPhone,
          instagram: formData.instagramUrl ? formData.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '') : '',
          instagramColab: formData.instagramColabUrl ? formData.instagramColabUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '') : '',
          instagramColabUrl: formData.instagramColabUrl,
          website: formData.websiteUrl,
          logo: currentCatalogLogo || '',
          banner: catalogBanners[0]?.imageUrl || currentCatalogBanner || '',
          catalogBanner: catalogBanners[0]?.imageUrl || currentCatalogBanner || '',
          banners: catalogBanners,
          catalogBanners: catalogBanners,
          bannerInterval: catalogBannerInterval,
          catalogBannerInterval: catalogBannerInterval,
          bannerAutoPlay: catalogBannerAutoPlay,
          catalogBannerAutoPlay: catalogBannerAutoPlay,
          bannerFixed: Boolean(formData.catalogBannerFixed),
          catalogBannerFixed: Boolean(formData.catalogBannerFixed),
          headerBackground: currentCatalogHeaderBackground || '',
          headerBgColor: formData.catalogHeaderBgColor,
          headerTextColor: formData.catalogHeaderTextColor,
          headerLogoPosition: formData.catalogHeaderLogoPosition,
          headerHeight: formData.catalogHeaderHeight,
          headerHideText: Boolean(formData.catalogHeaderHideText),
          badge: formData.catalogBadge,
          statusText: formData.catalogStatusText,
          announcement: formData.catalogAnnouncement,
          heroTitle: formData.catalogHeroTitle,
          heroDescription: formData.catalogHeroDescription,
          showHero: Boolean(formData.catalogShowHero),
          catalogShowHero: Boolean(formData.catalogShowHero),

          // 1. Quem Somos
          catalogShowAbout: Boolean(formData.catalogShowAbout),
          catalogAboutBadge: formData.catalogAboutBadge,
          catalogAboutTitle: formData.catalogAboutTitle,
          catalogAboutText: formData.catalogAboutText,
          catalogAboutImageUrl: currentCatalogAboutImage || '',
          catalogAboutPillar1Title: formData.catalogAboutPillar1Title,
          catalogAboutPillar1Text: formData.catalogAboutPillar1Text,
          catalogAboutPillar2Title: formData.catalogAboutPillar2Title,
          catalogAboutPillar2Text: formData.catalogAboutPillar2Text,
          catalogAboutPillar3Title: formData.catalogAboutPillar3Title,
          catalogAboutPillar3Text: formData.catalogAboutPillar3Text,

          // 2. Como Funciona
          catalogShowHowItWorks: Boolean(formData.catalogShowHowItWorks),
          catalogHowItWorksBadge: formData.catalogHowItWorksBadge,
          catalogHowItWorksTitle: formData.catalogHowItWorksTitle,
          catalogHowItWorksSubtitle: formData.catalogHowItWorksSubtitle,
          catalogHowItWorksStep1Title: formData.catalogHowItWorksStep1Title,
          catalogHowItWorksStep1Text: formData.catalogHowItWorksStep1Text,
          catalogHowItWorksStep2Title: formData.catalogHowItWorksStep2Title,
          catalogHowItWorksStep2Text: formData.catalogHowItWorksStep2Text,
          catalogHowItWorksStep3Title: formData.catalogHowItWorksStep3Title,
          catalogHowItWorksStep3Text: formData.catalogHowItWorksStep3Text,
          catalogHowItWorksStep4Title: formData.catalogHowItWorksStep4Title,
          catalogHowItWorksStep4Text: formData.catalogHowItWorksStep4Text,

          // 3. Diferenciais
          catalogShowFeatures: Boolean(formData.catalogShowFeatures),
          catalogFeaturesBadge: formData.catalogFeaturesBadge,
          catalogFeaturesTitle: formData.catalogFeaturesTitle,
          catalogFeature1Title: formData.catalogFeature1Title,
          catalogFeature1Text: formData.catalogFeature1Text,
          catalogFeature2Title: formData.catalogFeature2Title,
          catalogFeature2Text: formData.catalogFeature2Text,
          catalogFeature3Title: formData.catalogFeature3Title,
          catalogFeature3Text: formData.catalogFeature3Text,
          catalogFeature4Title: formData.catalogFeature4Title,
          catalogFeature4Text: formData.catalogFeature4Text,

          // 4. FAQ
          catalogShowFaq: Boolean(formData.catalogShowFaq),
          catalogFaqBadge: formData.catalogFaqBadge,
          catalogFaqTitle: formData.catalogFaqTitle,
          catalogFaq1Q: formData.catalogFaq1Q,
          catalogFaq1A: formData.catalogFaq1A,
          catalogFaq2Q: formData.catalogFaq2Q,
          catalogFaq2A: formData.catalogFaq2A,
          catalogFaq3Q: formData.catalogFaq3Q,
          catalogFaq3A: formData.catalogFaq3A,
          catalogFaq4Q: formData.catalogFaq4Q,
          catalogFaq4A: formData.catalogFaq4A,
          catalogFaq5Q: formData.catalogFaq5Q,
          catalogFaq5A: formData.catalogFaq5A,

          whatsappGreeting: formData.catalogWhatsappGreeting,
          whatsappCustomizationLabel: formData.catalogWhatsappCustomizationLabel,
          whatsappFooter: formData.catalogWhatsappFooter,
          footerText: formData.catalogFooterText,
          footerLocation: formData.catalogFooterLocation,
          footerBusinessHours: formData.catalogFooterBusinessHours,
          footerNotice: formData.catalogFooterNotice,
          footerCopyright: formData.catalogFooterCopyright,
          storePublished,
          storeUnpublishMessage,
          featureFlags,
        };
        localStorage.setItem('luisices_public_store_settings', JSON.stringify(publicData));
      } catch {}
      toast.success('Configurações da lojinha salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar personalizações:', err);
      toast.error('Erro ao salvar configurações da lojinha');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 mb-4">
          <ShieldAlert className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Acesso restrito</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
          Seu perfil de usuário não possui permissão para personalizar a loja online. Solicite liberação a um administrador se necessário.
        </p>
      </div>
    );
  }

  const cleanInstagram = formData.instagramUrl
    ? formData.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')
    : 'luisicesatelie';

  const cleanInstagramColab = formData.instagramColabUrl
    ? formData.instagramColabUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')
    : '';

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Store className="size-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Personalizar Lojinha
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Configure todos os textos, mensagens de pedido, faixa de aviso e rodapé da sua vitrine pública online.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => handleTogglePublished(!storePublished)}
              disabled={togglingPublished}
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                storePublished
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 hover:bg-red-500/20"
              }`}
              title="Clique para alternar o status da vitrine"
            >
              <span className={`size-2 rounded-full ${storePublished ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
              <span>{storePublished ? "Loja Publicada (Online)" : "Loja Despublicada (Manutenção)"}</span>
              <span className="text-[10px] opacity-75 underline ml-1">
                {togglingPublished ? "Salvando..." : storePublished ? "Despublicar Loja" : "Publicar Loja"}
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowHelpModal(true)}
            className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
          >
            <HelpCircle className="size-4 text-primary" />
            <span>Ajuda & FAQ da Lojinha</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowTemplates((prev) => !prev)}
            className={`gap-2 ${showTemplates ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300' : 'border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-50/70'}`}
          >
            <Wand2 className="size-4 text-amber-500" />
            <span>{showTemplates ? 'Ocultar Modelos' : 'Modelos & Inspirações'}</span>
          </Button>

          <a href="/catalogo" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
              <Globe className="size-4" />
              <span className="hidden sm:inline">Ver Lojinha Online</span>
              <ExternalLink className="size-3.5 opacity-60" />
            </Button>
          </a>
          <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-sm">
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Caixa de Modelos & Inspirações Prontas */}
      {showTemplates && (
        <Card className="border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs animate-in fade-in-50 duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Wand2 className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-amber-950 dark:text-amber-200">
                    Modelos de Inspiração Prontos para Uso
                  </CardTitle>
                  <CardDescription className="text-xs text-amber-800/80 dark:text-amber-300/80">
                    Escolha um tema para preencher automaticamente os textos da vitrine. Você poderá editar cada campo à vontade antes de salvar!
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50"
                onClick={() => setShowTemplates(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {STORE_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-3.5 rounded-xl border border-amber-200/70 dark:border-amber-800/40 bg-card flex flex-col justify-between hover:shadow-md transition-all space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-2xl">{tmpl.icon}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {tmpl.tag}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-foreground leading-tight">
                      {tmpl.name}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {tmpl.description}
                    </p>
                    <div className="p-2 rounded-lg bg-muted/50 text-[10px] space-y-0.5 text-muted-foreground font-mono">
                      <p className="truncate"><span className="font-semibold text-foreground">Slogan:</span> {tmpl.data.catalogStoreTagline}</p>
                      <p className="truncate"><span className="font-semibold text-foreground">Selo:</span> {tmpl.data.catalogBadge}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applyTemplate(tmpl.id)}
                    className="w-full text-xs font-semibold gap-1.5 border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white dark:hover:text-black transition-colors"
                  >
                    <Wand2 className="size-3" />
                    Aplicar este Modelo
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid Principal: Formulário de Configuração (2/3) + Prévia Visual (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Formulário com Abas (2 Colunas) */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex flex-wrap w-full h-auto p-1 bg-muted/60">
              <TabsTrigger value="identity" className="text-xs py-2">
                Logo & Vitrine
              </TabsTrigger>
              <TabsTrigger value="institutional" className="text-xs py-2">
                <Building2 className="size-3 mr-1 inline" />
                Institucional & Sobre
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="text-xs py-2">
                WhatsApp
              </TabsTrigger>
              <TabsTrigger value="footer" className="text-xs py-2">
                Rodapé
              </TabsTrigger>
              <TabsTrigger value="contact" className="text-xs py-2">
                Loja & Contato
              </TabsTrigger>
              <TabsTrigger value="operations" className="text-xs py-2">
                <Power className="size-3 mr-1 inline" />
                Operação
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: Logo & Vitrine */}
            <TabsContent value="identity" className="space-y-5 pt-3">
              {/* Card de Gestão dos Banners Rotativos (Vitrine / Propaganda 4:1) */}
              <Card className="border-primary/25 shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="size-4 text-primary" />
                      Banners Rotativos & Vitrine de Propaganda (Carrossel)
                    </CardTitle>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                      {catalogBanners.length} {catalogBanners.length === 1 ? 'propaganda ativa' : 'propagandas ativas'}
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Crie uma vitrine em carrossel rotativo no topo do seu catálogo. Adicione quantos banners desejar, reordene e defina a velocidade da transição automática estilo propaganda comercial.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Barra de Controles de Rotação Automática e Intervalo */}
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Switch
                        id="banner-autoplay-toggle"
                        checked={catalogBannerAutoPlay}
                        onCheckedChange={(checked) => setCatalogBannerAutoPlay(checked)}
                      />
                      <div>
                        <Label htmlFor="banner-autoplay-toggle" className="text-xs font-semibold cursor-pointer">
                          Rotação Automática
                        </Label>
                        <p className="text-[10px] text-muted-foreground">
                          {catalogBannerAutoPlay ? 'Alterna os banners de forma automática' : 'Troca pausada (apenas manual)'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Tempo por banner:</span>
                      <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border/80">
                        {[
                          { val: 3, label: '3s' },
                          { val: 5, label: '5s' },
                          { val: 7, label: '7s' },
                          { val: 10, label: '10s' },
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setCatalogBannerInterval(item.val)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                              catalogBannerInterval === item.val
                                ? 'bg-primary text-primary-foreground shadow-2xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Prévia em Tempo Real do Carrossel */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5">
                        <Eye className="size-3.5 text-primary" />
                        Prévia em Tempo Real
                      </span>
                      {catalogBanners.length > 1 && (
                        <span className="text-[11px] text-primary/80">
                          {catalogBannerAutoPlay ? `Alternando a cada ${catalogBannerInterval} segundos` : 'Pausado na visualização'}
                        </span>
                      )}
                    </div>

                    {catalogBanners.length > 0 ? (
                      <div className="border border-border/80 rounded-2xl overflow-hidden shadow-xs bg-muted/20">
                        <BannerCarousel
                          banners={catalogBanners}
                          intervalSeconds={catalogBannerInterval}
                          autoPlay={catalogBannerAutoPlay}
                          aspectRatioClass="aspect-[4/1]"
                          roundedClass="rounded-2xl"
                          storeName={formData.catalogStoreName || 'Ateliê'}
                        />
                      </div>
                    ) : (
                      <div className="relative w-full aspect-[4/1] rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center p-4 text-center text-muted-foreground gap-1.5">
                        <ImageIcon className="size-7 opacity-40 text-primary" />
                        <p className="text-xs font-semibold text-foreground/80">Nenhum banner cadastrado</p>
                        <p className="text-[10px] opacity-75 max-w-md">
                          Adicione banners no formato panorâmico 4:1 (recomendado: 1584 x 396 px) para criar o carrossel de propaganda.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Botão de Adicionar Novo Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <Label htmlFor="store-banner-upload-multi" className="cursor-pointer inline-block">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        disabled={uploadingBanner}
                        className="gap-2 shadow-xs"
                        asChild
                      >
                        <span>
                          {uploadingBanner ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              Enviando banner...
                            </>
                          ) : (
                            <>
                              <Plus className="size-4" />
                              Adicionar Banner / Propaganda
                            </>
                          )}
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="store-banner-upload-multi"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) void handleAddBanner(file);
                      }}
                    />
                    <span className="text-[11px] text-muted-foreground">
                      JPG, PNG ou WebP até 5MB • Formato Panorâmico 4:1
                    </span>
                  </div>

                  {/* Lista Ordenável de Banners Cadastrados */}
                  {catalogBanners.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                        <span>Banners Cadastrados ({catalogBanners.length})</span>
                        <span className="text-[10px] font-normal">Use as setas para reordenar a sequência de exibição</span>
                      </div>
                      <div className="space-y-2.5">
                        {catalogBanners.map((banner, index) => (
                          <div
                            key={banner.id || `banner-${index}`}
                            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl border border-border/70 bg-card/60 hover:border-primary/40 transition-colors shadow-2xs"
                          >
                            {/* Thumbnail & Posição */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                {index + 1}
                              </span>
                              <div className="w-28 sm:w-32 aspect-[4/1] rounded-lg overflow-hidden border border-border/80 bg-muted shrink-0 shadow-2xs">
                                <img
                                  src={banner.imageUrl}
                                  alt={banner.title || `Banner ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>

                            {/* Título e Link */}
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full min-w-0">
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Legenda / Título (opcional)</Label>
                                <Input
                                  placeholder="Ex: Volta às Aulas com 15% OFF"
                                  value={banner.title || ''}
                                  onChange={(e) => handleUpdateBannerField(index, 'title', e.target.value)}
                                  className="h-8 text-xs bg-background/80"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Link de Clique (opcional)</Label>
                                <Input
                                  placeholder="Ex: https://instagram.com/... ou link promocional"
                                  value={banner.linkUrl || ''}
                                  onChange={(e) => handleUpdateBannerField(index, 'linkUrl', e.target.value)}
                                  className="h-8 text-xs bg-background/80"
                                />
                              </div>
                            </div>

                            {/* Controles de Ordenação e Remoção */}
                            <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={index === 0}
                                onClick={() => handleMoveBanner(index, 'up')}
                                title="Subir posição (exibir antes)"
                                className="size-8 text-muted-foreground hover:text-foreground"
                              >
                                <ArrowUp className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={index === catalogBanners.length - 1}
                                onClick={() => handleMoveBanner(index, 'down')}
                                title="Descer posição (exibir depois)"
                                className="size-8 text-muted-foreground hover:text-foreground"
                              >
                                <ArrowDown className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveBanner(index)}
                                title="Remover este banner"
                                className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground">
                    💡 <strong>Dica Pro:</strong> Os banners em estilo carrossel giram automaticamente para seus clientes enquanto navegam pelos seus produtos, aumentando a visualização de lançamentos e promoções.
                  </p>
                </CardContent>
              </Card>

              {/* Card de Upload do Logo */}
              <Card className="border-primary/25 shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="size-4 text-primary" />
                      Logo Exclusivo da Lojinha Online
                    </CardTitle>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                      Exclusivo da Vitrine
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Configure a logo da sua marca para a vitrine pública online. O novo cabeçalho da loja exibirá sua logo com proporções naturais (horizontal ou quadrada), com destaque nobre no topo da loja e presença constante na barra de navegação.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {currentCatalogLogo ? (
                      <div className="relative group h-20 min-w-[90px] max-w-[240px] rounded-xl overflow-hidden border border-border bg-muted/40 p-2 flex items-center justify-center shrink-0 shadow-2xs">
                        <img
                          src={currentCatalogLogo}
                          alt="Logo da Lojinha Online"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          className="max-h-full w-auto object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-20 w-36 rounded-xl border-2 border-dashed border-border bg-muted/20 flex flex-col items-center justify-center text-muted-foreground shrink-0 gap-1 p-2">
                        <Building2 className="size-6 opacity-50" />
                        <span className="text-[10px] text-center">Sem logo cadastrado</span>
                      </div>
                    )}

                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <Label htmlFor="store-logo-upload" className="cursor-pointer">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingLogo}
                            className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
                            asChild
                          >
                            <span>
                              {uploadingLogo ? (
                                <>
                                  <Loader2 className="size-3.5 animate-spin" />
                                  Enviando logo da lojinha...
                                </>
                              ) : (
                                <>
                                  <Upload className="size-3.5" />
                                  {currentCatalogLogo ? 'Trocar Logo da Lojinha' : 'Enviar Logo Completo'}
                                </>
                              )}
                            </span>
                          </Button>
                        </Label>
                        <Input
                          id="store-logo-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) void handleLogoUpload(file);
                          }}
                        />

                        {currentCatalogLogo && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={uploadingLogo}
                            onClick={handleLogoRemove}
                            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                          >
                            <X className="size-3.5" />
                            Remover Logo da Lojinha
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {currentCatalogLogo
                          ? '✅ Logo completo ativo na vitrine online pública. Exibido em destaque no cabeçalho e na barra de busca fixa.'
                          : '💡 Dica: Envie o logotipo completo do seu ateliê (horizontal ou quadrado, de preferência em PNG transparente ou WebP).'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Personalização Completa da Barra Superior Fixa */}
              <Card className="border-primary/25 shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Palette className="size-4 text-primary" />
                      Barra Superior Fixa com Imagem (Full-Width)
                    </CardTitle>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                      Fixa no Topo
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Esta barra acompanha o cliente durante toda a navegação exibindo exclusivamente sua arte/imagem de ponta a ponta. Os demais itens (busca, sacola e redes) ficam organizados na barra de ações dedicada da página.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                  {/* 1. Prévia em Tempo Real da Barra Superior */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        <Eye className="size-3.5 text-primary" />
                        Prévia da Barra Fixa em Tempo Real
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        Como seus clientes verão no topo do catálogo
                      </span>
                    </div>

                    {/* Barra Fixa Superior com Imagem */}
                    <div
                      className="relative w-full rounded-2xl border overflow-hidden transition-all duration-200 shadow-sm flex items-center justify-center border-border/80 select-none"
                      style={{
                        backgroundColor: formData.catalogHeaderBgColor || '#ffffff',
                        height: formData.catalogHeaderHeight === 'compact' ? '56px' : formData.catalogHeaderHeight === 'large' ? '88px' : '72px',
                      }}
                    >
                      {currentCatalogHeaderBackground ? (
                        <img
                          src={currentCatalogHeaderBackground}
                          alt="Arte de fundo da barra superior"
                          className="w-full h-full object-cover object-center"
                        />
                      ) : currentCatalogLogo ? (
                        <div className="h-full py-2 flex items-center justify-center px-4">
                          <img
                            src={currentCatalogLogo}
                            alt="Logo"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            className="max-h-full w-auto object-contain"
                          />
                        </div>
                      ) : (
                        <span className={`text-xs font-bold ${formData.catalogHeaderTextColor === 'light' ? 'text-white' : 'text-stone-700'}`}>
                          {formData.catalogStoreName || 'Luisices Papelaria'}
                        </span>
                      )}
                    </div>

                    {/* Barra de Ações Simulada (Busca e Sacola em área dedicada) */}
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5 flex items-center justify-between gap-2.5">
                      <div className="flex-1 relative flex items-center gap-2 bg-background rounded-lg border border-border/70 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                        <Search size={13} className="opacity-60 shrink-0" />
                        <span className="truncate">Buscar produtos, temas, lembranças...</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#613d3e] text-white text-[11px] font-bold shadow-2xs shrink-0">
                        <ShoppingBag size={12} />
                        <span>Sacola (R$ 0,00)</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Upload de Imagem/Arte de Fundo da Barra Superior */}
                  <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-bold flex items-center gap-1.5">
                          <ImageIcon className="size-3.5 text-primary" />
                          Arte / Imagem de Fundo da Barra (Full-Width)
                        </Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Preenche toda a barra superior fixa com sua arte, padrão ou textura visual personalizada.
                        </p>
                      </div>
                      {currentCatalogHeaderBackground && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                          Arte Ativa
                        </span>
                      )}
                    </div>

                    {currentCatalogHeaderBackground && (
                      <div className="relative w-full h-14 rounded-lg overflow-hidden border border-border shadow-2xs">
                        <img
                          src={currentCatalogHeaderBackground}
                          alt="Arte de fundo da barra superior"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <Label htmlFor="header-bg-upload" className="cursor-pointer">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingHeaderBackground}
                          className="gap-2 border-primary/30 text-primary hover:bg-primary/5 text-xs"
                          asChild
                        >
                          <span>
                            {uploadingHeaderBackground ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Enviando imagem da barra...
                              </>
                            ) : (
                              <>
                                <Upload className="size-3.5" />
                                {currentCatalogHeaderBackground ? 'Trocar Imagem de Fundo' : 'Enviar Imagem para a Barra'}
                              </>
                            )}
                          </span>
                        </Button>
                      </Label>
                      <Input
                        id="header-bg-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file) void handleHeaderBackgroundUpload(file);
                        }}
                      />

                      {currentCatalogHeaderBackground && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={uploadingHeaderBackground}
                          onClick={handleHeaderBackgroundRemove}
                          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                        >
                          <X className="size-3.5" />
                          Remover Imagem de Fundo
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      💡 Recomendação: Use imagens panorâmicas horizontais (ex: 1920x100px ou texturas contínuas, WebP ou PNG até 5MB).
                    </p>
                  </div>

                  {/* 3. Cor de Fundo da Barra Superior */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Palette className="size-3.5 text-primary" />
                        Cor de Fundo da Barra Superior
                      </Label>
                      {formData.catalogHeaderBgColor && (
                        <button
                          type="button"
                          onClick={() => handleChange('catalogHeaderBgColor', '')}
                          className="text-[11px] text-primary hover:underline"
                        >
                          Restaurar Padrão
                        </button>
                      )}
                    </div>

                    {/* Presets de Cor */}
                    <div className="flex flex-wrap gap-2">
                      {HEADER_COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            handleChange('catalogHeaderBgColor', preset.color);
                            handleChange('catalogHeaderTextColor', preset.textColor);
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all ${
                            formData.catalogHeaderBgColor.toLowerCase() === preset.color.toLowerCase()
                              ? 'ring-2 ring-primary border-transparent font-bold scale-105'
                              : 'border-border/80 hover:border-primary/50 text-muted-foreground'
                          }`}
                        >
                          <span
                            className="size-3.5 rounded-full border border-black/10 shrink-0 shadow-2xs"
                            style={{ backgroundColor: preset.color }}
                          />
                          <span>{preset.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Seletor Customizado Hexadecimal */}
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center gap-2">
                        <input
                          type="color"
                          id="m-header-color-picker"
                          value={formData.catalogHeaderBgColor || '#ffffff'}
                          onChange={(e) => handleChange('catalogHeaderBgColor', e.target.value)}
                          className="size-9 rounded-lg border border-border cursor-pointer p-0.5 bg-background"
                        />
                        <Label htmlFor="m-header-color-picker" className="text-xs font-semibold cursor-pointer">
                          Seletor de Cor Livre
                        </Label>
                      </div>
                      <div className="w-32">
                        <Input
                          placeholder="#ffffff"
                          value={formData.catalogHeaderBgColor}
                          onChange={(e) => handleChange('catalogHeaderBgColor', e.target.value)}
                          className="text-xs uppercase font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Contraste de Texto & Ícones */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">
                      Contraste dos Textos e Ícones da Barra
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleChange('catalogHeaderTextColor', 'dark')}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                          formData.catalogHeaderTextColor === 'dark'
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border/80 hover:border-border'
                        }`}
                      >
                        <Moon className={`size-4 mt-0.5 shrink-0 ${formData.catalogHeaderTextColor === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="text-xs font-semibold">Texto Escuro (Padrão)</p>
                          <p className="text-[10px] text-muted-foreground">Ideal para fundos claros, tons pastel ou fundos brancos.</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChange('catalogHeaderTextColor', 'light')}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                          formData.catalogHeaderTextColor === 'light'
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border/80 hover:border-border'
                        }`}
                      >
                        <Sun className={`size-4 mt-0.5 shrink-0 ${formData.catalogHeaderTextColor === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="text-xs font-semibold">Texto Claro (Branco)</p>
                          <p className="text-[10px] text-muted-foreground">Ideal para artes escuras, cores intensas ou Marsala.</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 5. Posição da Logo & Altura da Barra */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <AlignLeft className="size-3.5 text-primary" />
                        Posição da Logo na Barra Fixa
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleChange('catalogHeaderLogoPosition', 'left')}
                          className={`p-2.5 rounded-lg border text-center transition-all ${
                            formData.catalogHeaderLogoPosition !== 'center'
                              ? 'border-primary bg-primary/5 font-semibold text-primary'
                              : 'border-border/80 text-muted-foreground hover:border-border text-xs'
                          }`}
                        >
                          <AlignLeft className="size-4 mx-auto mb-1" />
                          <span className="text-xs">À Esquerda</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChange('catalogHeaderLogoPosition', 'center')}
                          className={`p-2.5 rounded-lg border text-center transition-all ${
                            formData.catalogHeaderLogoPosition === 'center'
                              ? 'border-primary bg-primary/5 font-semibold text-primary'
                              : 'border-border/80 text-muted-foreground hover:border-border text-xs'
                          }`}
                        >
                          <AlignCenter className="size-4 mx-auto mb-1" />
                          <span className="text-xs">Centralizada</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">
                        Altura da Barra Fixa
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'compact', label: 'Compacta', sub: '58px' },
                          { id: 'normal', label: 'Padrão', sub: '68px' },
                          { id: 'large', label: 'Ampla', sub: '88px' },
                        ].map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => handleChange('catalogHeaderHeight', h.id)}
                            className={`p-2 rounded-lg border text-center transition-all ${
                              formData.catalogHeaderHeight === h.id
                                ? 'border-primary bg-primary/5 font-semibold text-primary'
                                : 'border-border/80 text-muted-foreground hover:border-border'
                            }`}
                          >
                            <span className="text-xs block">{h.label}</span>
                            <span className="text-[10px] opacity-70 block">{h.sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 6. Switch: Ocultar texto ao lado da logo */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/10">
                    <div className="space-y-0.5 pr-4">
                      <Label htmlFor="m-hide-text" className="text-xs font-semibold cursor-pointer">
                        Ocultar nome do ateliê em texto ao lado da logo
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Ative se seu logotipo já possui o nome por extenso, evitando que o nome apareça duplicado.
                      </p>
                    </div>
                    <Switch
                      id="m-hide-text"
                      checked={Boolean(formData.catalogHeaderHideText)}
                      onCheckedChange={(checked) => handleChange('catalogHeaderHideText', checked)}
                    />
                  </div>

                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    Identidade do Cabeçalho & Barra Superior
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Define o selo afetivo da marca, o status de atendimento e anúncios de campanhas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="m-badge" className="text-xs font-semibold">
                        Selo da Marca (Badge)
                      </Label>
                      <Input
                        id="m-badge"
                        placeholder="Ex: Atelier, Papelaria Afetiva, Personalizados"
                        value={formData.catalogBadge}
                        onChange={(e) => handleChange('catalogBadge', e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">Pílula ao lado do nome do ateliê</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="m-status" className="text-xs font-semibold">
                        Status do Atendimento
                      </Label>
                      <Input
                        id="m-status"
                        placeholder="Ex: Atendimento WhatsApp ativo"
                        value={formData.catalogStatusText}
                        onChange={(e) => handleChange('catalogStatusText', e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">Frase ao lado da luz pulsante no topo</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-announcement" className="text-xs font-semibold flex items-center gap-1.5">
                      <Bell className="size-3.5 text-amber-500" />
                      Faixa de Aviso Promocional (Opcional)
                    </Label>
                    <Input
                      id="m-announcement"
                      placeholder="Ex: ✨ Agenda de Páscoa aberta! Encomendas com entrega até 25/03"
                      value={formData.catalogAnnouncement}
                      onChange={(e) => handleChange('catalogAnnouncement', e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Deixe em branco para ocultar. Quando preenchido, exibe um banner dourado no topo da lojinha.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    Apresentação & Vitrine (Banner Hero)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    O cartão de boas-vindas logo abaixo do cabeçalho da lojinha.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Switch: Exibir Apresentação & Vitrine */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/10">
                    <div className="space-y-0.5 pr-4">
                      <Label htmlFor="m-show-hero" className="text-xs font-semibold cursor-pointer">
                        Exibir cartão de Apresentação & Vitrine (Banner Hero)
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Ative para exibir o cartão de boas-vindas com dados do ateliê, slogan e selos de confiança. Desative caso queira ir direto para a vitrine de produtos.
                      </p>
                    </div>
                    <Switch
                      id="m-show-hero"
                      checked={Boolean(formData.catalogShowHero)}
                      onCheckedChange={(checked) => handleChange('catalogShowHero', checked)}
                    />
                  </div>

                  {!formData.catalogShowHero && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium px-1">
                      ⚠️ Este cartão está desativado e não será exibido no catálogo público.
                    </p>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="m-hero-title" className="text-xs font-semibold">
                      Título Superior da Vitrine (Selo Pequeno)
                    </Label>
                    <Input
                      id="m-hero-title"
                      placeholder="Ex: Catálogo & Vitrine Afetiva"
                      value={formData.catalogHeroTitle}
                      onChange={(e) => handleChange('catalogHeroTitle', e.target.value)}
                    />
                  </div>

                  {/* Frase Principal de Destaque / Slogan do Banner */}
                  <div className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="m-hero-tagline" className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-primary" />
                        Frase de Destaque / Slogan Principal do Banner
                      </Label>
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Texto Central da Vitrine
                      </span>
                    </div>
                    <Input
                      id="m-hero-tagline"
                      className="bg-background font-medium text-sm"
                      placeholder="Ex: Papelaria artesanal feita à mão para momentos únicos"
                      value={formData.catalogStoreTagline}
                      onChange={(e) => handleChange('catalogStoreTagline', e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Este é o texto principal exibido com destaque central no banner da vitrine da lojinha.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-hero-desc" className="text-xs font-semibold">
                      Texto de Boas-vindas / Instruções de Encomenda
                    </Label>
                    <Textarea
                      id="m-hero-desc"
                      rows={3}
                      placeholder="Ex: Escolha suas peças, informe o nome para personalização e envie o pedido formatado diretamente no nosso WhatsApp."
                      value={formData.catalogHeroDescription}
                      onChange={(e) => handleChange('catalogHeroDescription', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA: Institucional & Sobre (Modular & Toggles) */}
            <TabsContent value="institutional" className="space-y-5 pt-3">
              {/* Header / Banner de Sugestões Prontas */}
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-primary">
                    <Building2 className="size-4" />
                    <span>Seções Institucionais & Confiança da Marca</span>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                    Ative e personalize seções modulares para tornar seu catálogo mais profissional e confiável: <strong>Quem Somos</strong>, <strong>Como Funciona a Encomenda</strong>, <strong>Diferenciais</strong> e <strong>Perguntas Frequentes (FAQ)</strong>.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fillInstitutionalDefaults}
                  className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 shrink-0 text-xs font-semibold"
                >
                  <Sparkles className="size-3.5" />
                  Preencher com Sugestões
                </Button>
              </div>

              {/* 1. SEÇÃO QUEM SOMOS / SOBRE O ATELIÊ */}
              <Card className={`shadow-xs transition-colors ${formData.catalogShowAbout ? 'border-primary/30' : 'border-border/60 opacity-90'}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Heart className="size-4 text-rose-500" />
                        1. Quem Somos / Sobre o Ateliê
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Apresente a história, carinho artesanal e propósito do seu ateliê para encantar os visitantes.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${formData.catalogShowAbout ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                        {formData.catalogShowAbout ? 'Ativa no Catálogo' : 'Oculta'}
                      </span>
                      <Switch
                        id="toggle-show-about"
                        checked={Boolean(formData.catalogShowAbout)}
                        onCheckedChange={(checked) => handleChange('catalogShowAbout', checked)}
                      />
                    </div>
                  </div>
                </CardHeader>

                {formData.catalogShowAbout && (
                  <CardContent className="space-y-5 pt-0 border-t border-border/40 animate-in fade-in-50 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="inst-about-badge" className="text-xs font-semibold">
                          Selo Superior (Badge)
                        </Label>
                        <Input
                          id="inst-about-badge"
                          placeholder="Ex: Sobre Nós ou Nosso Ateliê"
                          value={formData.catalogAboutBadge}
                          onChange={(e) => handleChange('catalogAboutBadge', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="inst-about-title" className="text-xs font-semibold">
                          Título Principal da Seção
                        </Label>
                        <Input
                          id="inst-about-title"
                          placeholder="Ex: Feito à Mão com Afeto & Dedicação"
                          value={formData.catalogAboutTitle}
                          onChange={(e) => handleChange('catalogAboutTitle', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="inst-about-text" className="text-xs font-semibold">
                        História / Apresentação do Ateliê
                      </Label>
                      <Textarea
                        id="inst-about-text"
                        rows={4}
                        placeholder="Conte como o ateliê nasceu, seu amor pela encadernação/papelaria e o cuidado em cada pedido..."
                        value={formData.catalogAboutText}
                        onChange={(e) => handleChange('catalogAboutText', e.target.value)}
                        className="text-xs leading-relaxed"
                      />
                    </div>

                    {/* Foto Institucional / Foto da Artesã ou Ateliê */}
                    <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold flex items-center gap-1.5">
                          <ImageIcon className="size-3.5 text-primary" />
                          Foto Institucional (Artesã ou Ateliê)
                        </Label>
                        <span className="text-[10px] text-muted-foreground">Opcional • Formato 4:3 ou 1:1</span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        {currentCatalogAboutImage ? (
                          <div className="relative size-24 rounded-2xl overflow-hidden border border-border shadow-xs shrink-0 bg-muted">
                            <img
                              src={currentCatalogAboutImage}
                              alt="Foto Institucional"
                              className="size-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="size-24 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground/60 shrink-0 bg-background/50">
                            <ImageIcon className="size-6" />
                            <span className="text-[9px] mt-1">Sem foto</span>
                          </div>
                        )}

                        <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                            <Label htmlFor="inst-about-img-upload" className="cursor-pointer">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={uploadingAboutImage}
                                className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5"
                                asChild
                              >
                                <span>
                                  {uploadingAboutImage ? (
                                    <>
                                      <Loader2 className="size-3.5 animate-spin" />
                                      Enviando foto...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="size-3.5" />
                                      {currentCatalogAboutImage ? 'Trocar Foto' : 'Enviar Foto'}
                                    </>
                                  )}
                                </span>
                              </Button>
                            </Label>
                            <Input
                              id="inst-about-img-upload"
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) void handleAboutImageUpload(file);
                              }}
                            />

                            {currentCatalogAboutImage && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={uploadingAboutImage}
                                onClick={handleAboutImageRemove}
                                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                              >
                                <X className="size-3.5" />
                                Remover Foto
                              </Button>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            JPG, PNG ou WebP até 5MB. Uma foto acolhedora da artesã ou do ambiente do ateliê gera grande conexão e confiança.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 3 Pilares do Ateliê */}
                    <div className="space-y-3 pt-1">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-primary" />
                        3 Pilares / Destaques do Ateliê (Cards Curtos)
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl border border-border/80 bg-background space-y-2">
                          <Label className="text-[11px] font-semibold text-primary">Pilar 1</Label>
                          <Input
                            placeholder="Título (ex: Produção Artesanal)"
                            value={formData.catalogAboutPillar1Title}
                            onChange={(e) => handleChange('catalogAboutPillar1Title', e.target.value)}
                            className="text-xs font-medium"
                          />
                          <Textarea
                            rows={2}
                            placeholder="Descrição curta do pilar..."
                            value={formData.catalogAboutPillar1Text}
                            onChange={(e) => handleChange('catalogAboutPillar1Text', e.target.value)}
                            className="text-xs"
                          />
                        </div>

                        <div className="p-3 rounded-xl border border-border/80 bg-background space-y-2">
                          <Label className="text-[11px] font-semibold text-primary">Pilar 2</Label>
                          <Input
                            placeholder="Título (ex: Materiais Nobres)"
                            value={formData.catalogAboutPillar2Title}
                            onChange={(e) => handleChange('catalogAboutPillar2Title', e.target.value)}
                            className="text-xs font-medium"
                          />
                          <Textarea
                            rows={2}
                            placeholder="Descrição curta do pilar..."
                            value={formData.catalogAboutPillar2Text}
                            onChange={(e) => handleChange('catalogAboutPillar2Text', e.target.value)}
                            className="text-xs"
                          />
                        </div>

                        <div className="p-3 rounded-xl border border-border/80 bg-background space-y-2">
                          <Label className="text-[11px] font-semibold text-primary">Pilar 3</Label>
                          <Input
                            placeholder="Título (ex: Afeto em Cada Detalhe)"
                            value={formData.catalogAboutPillar3Title}
                            onChange={(e) => handleChange('catalogAboutPillar3Title', e.target.value)}
                            className="text-xs font-medium"
                          />
                          <Textarea
                            rows={2}
                            placeholder="Descrição curta do pilar..."
                            value={formData.catalogAboutPillar3Text}
                            onChange={(e) => handleChange('catalogAboutPillar3Text', e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* 2. SEÇÃO COMO FUNCIONA A ENCOMENDA */}
              <Card className={`shadow-xs transition-colors ${formData.catalogShowHowItWorks ? 'border-primary/30' : 'border-border/60 opacity-90'}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="size-4 text-primary" />
                        2. Como Funciona a Encomenda (Passo a Passo)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Explique aos clientes de forma visual e simples as 4 etapas da encomenda até a entrega.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${formData.catalogShowHowItWorks ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                        {formData.catalogShowHowItWorks ? 'Ativa no Catálogo' : 'Oculta'}
                      </span>
                      <Switch
                        id="toggle-show-how-it-works"
                        checked={Boolean(formData.catalogShowHowItWorks)}
                        onCheckedChange={(checked) => handleChange('catalogShowHowItWorks', checked)}
                      />
                    </div>
                  </div>
                </CardHeader>

                {formData.catalogShowHowItWorks && (
                  <CardContent className="space-y-4 pt-0 border-t border-border/40 animate-in fade-in-50 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="inst-hiw-badge" className="text-xs font-semibold">
                          Selo Superior (Badge)
                        </Label>
                        <Input
                          id="inst-hiw-badge"
                          placeholder="Ex: Passo a Passo"
                          value={formData.catalogHowItWorksBadge}
                          onChange={(e) => handleChange('catalogHowItWorksBadge', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="inst-hiw-title" className="text-xs font-semibold">
                          Título da Seção
                        </Label>
                        <Input
                          id="inst-hiw-title"
                          placeholder="Ex: Como Funciona sua Encomenda?"
                          value={formData.catalogHowItWorksTitle}
                          onChange={(e) => handleChange('catalogHowItWorksTitle', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-1">
                        <Label htmlFor="inst-hiw-sub" className="text-xs font-semibold">
                          Subtítulo Explicativo
                        </Label>
                        <Input
                          id="inst-hiw-sub"
                          placeholder="Ex: Um processo simples do pedido até a sua porta"
                          value={formData.catalogHowItWorksSubtitle}
                          onChange={(e) => handleChange('catalogHowItWorksSubtitle', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="p-3.5 rounded-xl border border-border/80 bg-background space-y-2">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                          Etapa 1
                        </span>
                        <Input
                          placeholder="Título da Etapa 1 (ex: 1. Escolha seus Mimos)"
                          value={formData.catalogHowItWorksStep1Title}
                          onChange={(e) => handleChange('catalogHowItWorksStep1Title', e.target.value)}
                          className="text-xs font-semibold"
                        />
                        <Textarea
                          rows={2}
                          placeholder="Texto da etapa..."
                          value={formData.catalogHowItWorksStep1Text}
                          onChange={(e) => handleChange('catalogHowItWorksStep1Text', e.target.value)}
                          className="text-xs"
                        />
                      </div>

                      <div className="p-3.5 rounded-xl border border-border/80 bg-background space-y-2">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                          Etapa 2
                        </span>
                        <Input
                          placeholder="Título da Etapa 2 (ex: 2. Envie pelo WhatsApp)"
                          value={formData.catalogHowItWorksStep2Title}
                          onChange={(e) => handleChange('catalogHowItWorksStep2Title', e.target.value)}
                          className="text-xs font-semibold"
                        />
                        <Textarea
                          rows={2}
                          placeholder="Texto da etapa..."
                          value={formData.catalogHowItWorksStep2Text}
                          onChange={(e) => handleChange('catalogHowItWorksStep2Text', e.target.value)}
                          className="text-xs"
                        />
                      </div>

                      <div className="p-3.5 rounded-xl border border-border/80 bg-background space-y-2">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                          Etapa 3
                        </span>
                        <Input
                          placeholder="Título da Etapa 3 (ex: 3. Prévia & Aprovação)"
                          value={formData.catalogHowItWorksStep3Title}
                          onChange={(e) => handleChange('catalogHowItWorksStep3Title', e.target.value)}
                          className="text-xs font-semibold"
                        />
                        <Textarea
                          rows={2}
                          placeholder="Texto da etapa..."
                          value={formData.catalogHowItWorksStep3Text}
                          onChange={(e) => handleChange('catalogHowItWorksStep3Text', e.target.value)}
                          className="text-xs"
                        />
                      </div>

                      <div className="p-3.5 rounded-xl border border-border/80 bg-background space-y-2">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                          Etapa 4
                        </span>
                        <Input
                          placeholder="Título da Etapa 4 (ex: 4. Confecção & Envio)"
                          value={formData.catalogHowItWorksStep4Title}
                          onChange={(e) => handleChange('catalogHowItWorksStep4Title', e.target.value)}
                          className="text-xs font-semibold"
                        />
                        <Textarea
                          rows={2}
                          placeholder="Texto da etapa..."
                          value={formData.catalogHowItWorksStep4Text}
                          onChange={(e) => handleChange('catalogHowItWorksStep4Text', e.target.value)}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* 3. SEÇÃO DIFERENCIAIS DA MARCA */}
              <Card className={`shadow-xs transition-colors ${formData.catalogShowFeatures ? 'border-primary/30' : 'border-border/60 opacity-90'}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="size-4 text-amber-500" />
                        3. Diferenciais do Ateliê (Qualidade & Garantia)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Destaque 4 motivos e garantias que tornam sua papelaria única (ex: atendimento, acabamento, envio seguro).
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${formData.catalogShowFeatures ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                        {formData.catalogShowFeatures ? 'Ativa no Catálogo' : 'Oculta'}
                      </span>
                      <Switch
                        id="toggle-show-features"
                        checked={Boolean(formData.catalogShowFeatures)}
                        onCheckedChange={(checked) => handleChange('catalogShowFeatures', checked)}
                      />
                    </div>
                  </div>
                </CardHeader>

                {formData.catalogShowFeatures && (
                  <CardContent className="space-y-4 pt-0 border-t border-border/40 animate-in fade-in-50 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="inst-feat-badge" className="text-xs font-semibold">
                          Selo Superior (Badge)
                        </Label>
                        <Input
                          id="inst-feat-badge"
                          placeholder="Ex: Nossos Diferenciais"
                          value={formData.catalogFeaturesBadge}
                          onChange={(e) => handleChange('catalogFeaturesBadge', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="inst-feat-title" className="text-xs font-semibold">
                          Título da Seção
                        </Label>
                        <Input
                          id="inst-feat-title"
                          placeholder="Ex: Por que escolher a Luisices?"
                          value={formData.catalogFeaturesTitle}
                          onChange={(e) => handleChange('catalogFeaturesTitle', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-xl border border-border/80 bg-background space-y-2">
                        <Label className="text-[11px] font-semibold text-primary">Diferencial 1</Label>
                        <Input
                          placeholder="Título (ex: Atendimento Humanizado)"
                          value={formData.catalogFeature1Title}
                          onChange={(e) => handleChange('catalogFeature1Title', e.target.value)}
                          className="text-xs font-medium"
                        />
                        <Textarea
                          rows={2}
                          placeholder="Descrição do diferencial..."
                          value={formData.catalogFeature1Text}
                          onChange={(e) => handleChange('catalogFeature1Text', e.target.value)}
                          className="text-xs"
                        />
                      </div>

                      <div className="p-3 rounded-xl border border-border/80 bg-background space-y-2">
                        <Label className="text-[11px] font-semibold text-primary">Diferencial 2</Label>
                        <Input
                          placeholder="Título (ex: Laminação Protetora)"
                          value={formData.catalogFeature2Title}
                          onChange={(e) => handleChange('catalogFeature2Title', e.target.value)}
                          className="text-xs font-medium"
                        />
                        <Textarea
                          rows={2}
                          placeholder="Descrição do diferencial..."
                          value={formData.catalogFeature2Text}
                          onChange={(e) => handleChange('catalogFeature2Text', e.target.value)}
                          className="text-xs"
                        />
                      </div>

                      <div className="p-3 rounded-xl border border-border/80 bg-background space-y-2">
                        <Label className="text-[11px] font-semibold text-primary">Diferencial 3</Label>
                        <Input
                          placeholder="Título (ex: Embalagem Reforçada)"
                          value={formData.catalogFeature3Title}
                          onChange={(e) => handleChange('catalogFeature3Title', e.target.value)}
                          className="text-xs font-medium"
                        />
                        <Textarea
                          rows={2}
                          placeholder="Descrição do diferencial..."
                          value={formData.catalogFeature3Text}
                          onChange={(e) => handleChange('catalogFeature3Text', e.target.value)}
                          className="text-xs"
                        />
                      </div>

                      <div className="p-3 rounded-xl border border-border/80 bg-background space-y-2">
                        <Label className="text-[11px] font-semibold text-primary">Diferencial 4</Label>
                        <Input
                          placeholder="Título (ex: Arte Sob Medida)"
                          value={formData.catalogFeature4Title}
                          onChange={(e) => handleChange('catalogFeature4Title', e.target.value)}
                          className="text-xs font-medium"
                        />
                        <Textarea
                          rows={2}
                          placeholder="Descrição do diferencial..."
                          value={formData.catalogFeature4Text}
                          onChange={(e) => handleChange('catalogFeature4Text', e.target.value)}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* 4. SEÇÃO PERGUNTAS FREQUENTES (FAQ) */}
              <Card className={`shadow-xs transition-colors ${formData.catalogShowFaq ? 'border-primary/30' : 'border-border/60 opacity-90'}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <CardTitle className="text-base flex items-center gap-2">
                        <HelpCircle className="size-4 text-indigo-500" />
                        4. Dúvidas Frequentes (FAQ)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Responda antecipadamente às principais dúvidas sobre prazos, envio, pagamento e aprovação de arte.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${formData.catalogShowFaq ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                        {formData.catalogShowFaq ? 'Ativa no Catálogo' : 'Oculta'}
                      </span>
                      <Switch
                        id="toggle-show-faq"
                        checked={Boolean(formData.catalogShowFaq)}
                        onCheckedChange={(checked) => handleChange('catalogShowFaq', checked)}
                      />
                    </div>
                  </div>
                </CardHeader>

                {formData.catalogShowFaq && (
                  <CardContent className="space-y-4 pt-0 border-t border-border/40 animate-in fade-in-50 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="inst-faq-badge" className="text-xs font-semibold">
                          Selo Superior (Badge)
                        </Label>
                        <Input
                          id="inst-faq-badge"
                          placeholder="Ex: Tire suas Dúvidas"
                          value={formData.catalogFaqBadge}
                          onChange={(e) => handleChange('catalogFaqBadge', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="inst-faq-title" className="text-xs font-semibold">
                          Título da Seção
                        </Label>
                        <Input
                          id="inst-faq-title"
                          placeholder="Ex: Perguntas Frequentes (FAQ)"
                          value={formData.catalogFaqTitle}
                          onChange={(e) => handleChange('catalogFaqTitle', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      {/* FAQ Item 1 */}
                      <div className="p-3.5 rounded-xl border border-border/80 bg-background space-y-2">
                        <Label className="text-[11px] font-semibold text-primary">Pergunta 1</Label>
                        <Input
                          placeholder="Pergunta (ex: Qual é o prazo médio de produção?)"
                          value={formData.catalogFaq1Q}
                          onChange={(e) => handleChange('catalogFaq1Q', e.target.value)}
                          className="text-xs font-medium"
                        />
                        <Textarea
                          rows={2}
                          placeholder="Resposta clara e objetiva..."
                          value={formData.catalogFaq1A}
                          onChange={(e) => handleChange('catalogFaq1A', e.target.value)}
                          className="text-xs"
                        />
                      </div>

                      {/* FAQ Item 2 */}
                      <div className="p-3.5 rounded-xl border border-border/80 bg-background space-y-2">
                        <Label className="text-[11px] font-semibold text-primary">Pergunta 2</Label>
                        <Input
                          placeholder="Pergunta (ex: Vocês enviam para todo o Brasil?)"
                          value={formData.catalogFaq2Q}
                          onChange={(e) => handleChange('catalogFaq2Q', e.target.value)}
                          className="text-xs font-medium"
                        />
                        <Textarea
                          rows={2}
                          placeholder="Resposta..."
                          value={formData.catalogFaq2A}
                          onChange={(e) => handleChange('catalogFaq2A', e.target.value)}
                          className="text-xs"
                        />
                      </div>

                      {/* FAQ Item 3 */}
                      <div className="p-3.5 rounded-xl border border-border/80 bg-background space-y-2">
                        <Label className="text-[11px] font-semibold text-primary">Pergunta 3</Label>
                        <Input
                          placeholder="Pergunta (ex: Posso personalizar com qualquer tema ou nome?)"
                          value={formData.catalogFaq3Q}
                          onChange={(e) => handleChange('catalogFaq3Q', e.target.value)}
                          className="text-xs font-medium"
                        />
                        <Textarea
                          rows={2}
                          placeholder="Resposta..."
                          value={formData.catalogFaq3A}
                          onChange={(e) => handleChange('catalogFaq3A', e.target.value)}
                          className="text-xs"
                        />
                      </div>

                      {/* FAQ Item 4 */}
                      <div className="p-3.5 rounded-xl border border-border/80 bg-background space-y-2">
                        <Label className="text-[11px] font-semibold text-primary">Pergunta 4</Label>
                        <Input
                          placeholder="Pergunta (ex: Como funciona o pagamento?)"
                          value={formData.catalogFaq4Q}
                          onChange={(e) => handleChange('catalogFaq4Q', e.target.value)}
                          className="text-xs font-medium"
                        />
                        <Textarea
                          rows={2}
                          placeholder="Resposta..."
                          value={formData.catalogFaq4A}
                          onChange={(e) => handleChange('catalogFaq4A', e.target.value)}
                          className="text-xs"
                        />
                      </div>

                      {/* FAQ Item 5 */}
                      <div className="p-3.5 rounded-xl border border-border/80 bg-background space-y-2">
                        <Label className="text-[11px] font-semibold text-primary">Pergunta 5</Label>
                        <Input
                          placeholder="Pergunta (ex: Consigo ver uma prévia antes da confecção?)"
                          value={formData.catalogFaq5Q}
                          onChange={(e) => handleChange('catalogFaq5Q', e.target.value)}
                          className="text-xs font-medium"
                        />
                        <Textarea
                          rows={2}
                          placeholder="Resposta..."
                          value={formData.catalogFaq5A}
                          onChange={(e) => handleChange('catalogFaq5A', e.target.value)}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </TabsContent>

            {/* ABA 2: WhatsApp & Checkout */}
            <TabsContent value="whatsapp" className="space-y-5 pt-3">
              <Card className="border-emerald-500/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <MessageCircle className="size-4" />
                    Formato da Mensagem de Pedido no WhatsApp
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Personalize como os dados da sacola e os itens encomendados são formatados ao clicar em "Enviar Pedido".
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-wa-greeting" className="text-xs font-semibold">
                      Saudação Inicial
                    </Label>
                    <Input
                      id="m-wa-greeting"
                      placeholder="Ex: Olá! Gostaria de encomendar pelo catálogo do Ateliê:"
                      value={formData.catalogWhatsappGreeting}
                      onChange={(e) => handleChange('catalogWhatsappGreeting', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="m-wa-label" className="text-xs font-semibold">
                        Rótulo da Personalização
                      </Label>
                      <Input
                        id="m-wa-label"
                        placeholder="Ex: Nome/Personalização:"
                        value={formData.catalogWhatsappCustomizationLabel}
                        onChange={(e) => handleChange('catalogWhatsappCustomizationLabel', e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="m-wa-footer" className="text-xs font-semibold">
                        Fechamento / Chave PIX
                      </Label>
                      <Input
                        id="m-wa-footer"
                        placeholder="Ex: Poderia me passar as opções de frete/retirada e a chave PIX para confirmar?"
                        value={formData.catalogWhatsappFooter}
                        onChange={(e) => handleChange('catalogWhatsappFooter', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-muted/40 border border-emerald-500/20 space-y-1.5 font-mono text-xs">
                    <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider mb-1 font-sans">
                      📱 Exemplo da mensagem enviada ao seu WhatsApp:
                    </p>
                    <p className="text-emerald-600 dark:text-emerald-400">
                      {formData.catalogWhatsappGreeting || 'Olá! Gostaria de encomendar pelo catálogo do Ateliê:'}
                    </p>
                    <p>• 1x Planner Espiral Floral 2025 - R$ 89,90</p>
                    <p className="pl-3 text-[11px] italic">
                      ↳ {formData.catalogWhatsappCustomizationLabel || 'Nome/Personalização:'} Cecília Martins
                    </p>
                    <p className="font-semibold text-foreground">✨ Subtotal Estimado: R$ 89,90</p>
                    <p className="text-emerald-600 dark:text-emerald-400">
                      {formData.catalogWhatsappFooter || 'Poderia me passar as opções de frete/retirada e a chave PIX para confirmar?'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 3: Rodapé & Políticas */}
            <TabsContent value="footer" className="space-y-5 pt-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="size-4 text-primary" />
                    Rodapé da Lojinha (Footer)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Mensagem de encerramento, endereço/envio, horários de atendimento e aviso de prazos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-footer-text" className="text-xs font-semibold">
                      Texto Afetivo / Sobre o Ateliê
                    </Label>
                    <Textarea
                      id="m-footer-text"
                      rows={2}
                      placeholder="Ex: Papelaria artesanal feita à mão com afeto e dedicação para eternizar momentos únicos. ❤️"
                      value={formData.catalogFooterText}
                      onChange={(e) => handleChange('catalogFooterText', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="m-footer-loc" className="text-xs font-semibold flex items-center gap-1">
                        <MapPin className="size-3.5 text-muted-foreground" /> Localização & Envio
                      </Label>
                      <Input
                        id="m-footer-loc"
                        placeholder="Ex: São Paulo - SP • Enviamos com carinho para todo o Brasil 📦"
                        value={formData.catalogFooterLocation}
                        onChange={(e) => handleChange('catalogFooterLocation', e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="m-footer-hours" className="text-xs font-semibold flex items-center gap-1">
                        <Clock className="size-3.5 text-muted-foreground" /> Horário de Atendimento
                      </Label>
                      <Input
                        id="m-footer-hours"
                        placeholder="Ex: Segunda a Sexta, das 9h às 18h"
                        value={formData.catalogFooterBusinessHours}
                        onChange={(e) => handleChange('catalogFooterBusinessHours', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-footer-notice" className="text-xs font-semibold">
                      Aviso sobre Prazos e Políticas
                    </Label>
                    <Input
                      id="m-footer-notice"
                      placeholder="Ex: Produção artesanal sob encomenda. Os prazos começam a contar após a aprovação da arte."
                      value={formData.catalogFooterNotice}
                      onChange={(e) => handleChange('catalogFooterNotice', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-footer-copy" className="text-xs font-semibold">
                      Texto de Direitos Autorais / Copyright
                    </Label>
                    <Input
                      id="m-footer-copy"
                      placeholder={`Ex: © ${new Date().getFullYear()} Luisices. Todos os direitos reservados.`}
                      value={formData.catalogFooterCopyright}
                      onChange={(e) => handleChange('catalogFooterCopyright', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 4: Loja & Contato */}
            <TabsContent value="contact" className="space-y-5 pt-3">
              {/* Resumo do Logo */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20">
                <div className="flex items-center gap-3">
                  {currentCatalogLogo ? (
                    <img
                      src={currentCatalogLogo}
                      alt="Logo da Lojinha"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      className="size-12 rounded-lg object-contain border border-border bg-white p-1"
                    />
                  ) : (
                    <div className="size-12 rounded-lg border border-dashed border-border bg-muted/40 flex items-center justify-center text-muted-foreground">
                      <Building2 className="size-5 opacity-60" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold">Logo Exclusivo da Lojinha</p>
                    <p className="text-[11px] text-muted-foreground">
                      {currentCatalogLogo ? 'Logo específico da lojinha configurado e ativo' : 'Nenhum logo específico configurado'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('identity')}
                  className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                >
                  <Building2 className="size-3.5" />
                  {currentCatalogLogo ? 'Trocar Logo' : 'Enviar Logo Exclusivo'}
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Store className="size-4 text-primary" />
                    Dados Gerais do Negócio
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Informações principais exibidas no topo e nos links de contato da lojinha.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="m-biz-name" className="text-xs font-semibold">
                        Nome da Lojinha Online (Vitrine Pública)
                      </Label>
                      <Input
                        id="m-biz-name"
                        placeholder="Ex: Luisices Papelaria"
                        value={formData.catalogStoreName}
                        onChange={(e) => handleChange('catalogStoreName', e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Nome exibido exclusivamente na vitrine e catálogo público. Não altera o nome interno do ateliê/sistema.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="m-biz-phone" className="text-xs font-semibold flex items-center gap-1">
                        <Phone className="size-3.5 text-muted-foreground" />
                        WhatsApp de Recebimento de Pedidos (Exclusivo da Lojinha)
                      </Label>
                      <Input
                        id="m-biz-phone"
                        placeholder="Ex: (11) 99999-9999"
                        value={formData.catalogWhatsappPhone}
                        onChange={(e) => handleChange('catalogWhatsappPhone', formatPhoneForDisplay(e.target.value))}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Número dedicado para receber pedidos dos clientes via catálogo online. Não altera o WhatsApp institucional do ateliê.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-biz-tag" className="text-xs font-semibold">
                      Slogan da Lojinha Online
                    </Label>
                    <Input
                      id="m-biz-tag"
                      placeholder="Ex: Papelaria artesanal feita à mão para momentos únicos"
                      value={formData.catalogStoreTagline}
                      onChange={(e) => handleChange('catalogStoreTagline', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="m-biz-insta" className="text-xs font-semibold flex items-center gap-1">
                        <AtSign className="size-3.5 text-muted-foreground" />
                        Instagram Principal
                      </Label>
                      <Input
                        id="m-biz-insta"
                        placeholder="Ex: https://instagram.com/luisicesatelie"
                        value={formData.instagramUrl}
                        onChange={(e) => handleChange('instagramUrl', e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="m-biz-insta-colab" className="text-xs font-semibold flex items-center gap-1">
                        <AtSign className="size-3.5 text-[#E1306C]" />
                        Instagram Parceiro / Colab (Opcional)
                      </Label>
                      <Input
                        id="m-biz-insta-colab"
                        placeholder="Ex: https://instagram.com/parceiro_atelie"
                        value={formData.instagramColabUrl}
                        onChange={(e) => handleChange('instagramColabUrl', e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Exibido na lojinha para cenários de colabs, parceiros ou marcas parceiras.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-biz-web" className="text-xs font-semibold flex items-center gap-1">
                      <Globe className="size-3.5 text-muted-foreground" />
                      Website Oficial (Opcional)
                    </Label>
                    <Input
                      id="m-biz-web"
                      placeholder="Ex: https://luisices.com.br"
                      value={formData.websiteUrl}
                      onChange={(e) => handleChange('websiteUrl', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 5: Operação — Publicação & Feature Flags */}
            <TabsContent value="operations" className="space-y-5 pt-3">
              {/* Card Principal: Publicação da Loja */}
              <Card className={`shadow-xs transition-colors ${!storePublished ? 'border-red-500/40 bg-red-50/30 dark:bg-red-950/20' : 'border-green-500/25'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Power className={`size-4 ${storePublished ? 'text-green-600' : 'text-red-500'}`} />
                      Publicação da Loja
                    </CardTitle>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${storePublished ? 'bg-green-500/15 text-green-700 dark:text-green-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'}`}>
                      {storePublished ? '🟢 Publicada' : '🔴 Fora do Ar'}
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Controle se a sua loja pública está visível para os clientes. Ao despublicar, os visitantes verão uma página de manutenção com a mensagem que você definir abaixo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Toggle Publicar / Despublicar */}
                  <div className={`p-4 rounded-xl border transition-colors ${!storePublished ? 'bg-red-50/50 dark:bg-red-950/30 border-red-500/30' : 'bg-green-50/50 dark:bg-green-950/20 border-green-500/30'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Switch
                          id="store-published-toggle"
                          checked={storePublished}
                          disabled={togglingPublished}
                          onCheckedChange={(checked) => handleTogglePublished(checked)}
                        />
                        <div>
                          <Label htmlFor="store-published-toggle" className="text-sm font-bold cursor-pointer">
                            {storePublished ? 'Loja Publicada' : 'Loja Despublicada'}
                          </Label>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {storePublished
                              ? 'A vitrine pública está aberta e acessível para os clientes.'
                              : 'Os clientes verão uma página de manutenção ao acessar a loja.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mensagem personalizada (exibida quando despublicada) */}
                  {!storePublished && (
                    <div className="space-y-2 animate-in fade-in-50 duration-200">
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-500/30">
                        <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-800 dark:text-amber-300">
                          <span className="font-bold">Atenção:</span> A loja está fora do ar. Os visitantes verão a mensagem abaixo ao acessar o catálogo. Salve para aplicar.
                        </p>
                      </div>

                      <Label htmlFor="unpublish-message" className="text-xs font-semibold">
                        Mensagem de Manutenção Personalizada
                      </Label>
                      <Textarea
                        id="unpublish-message"
                        rows={3}
                        placeholder="Ex: Estamos preparando novidades incríveis! Voltamos em breve com peças especiais para você. 💕"
                        value={storeUnpublishMessage}
                        onChange={(e) => setStoreUnpublishMessage(e.target.value)}
                        className="text-sm"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Deixe em branco para usar a mensagem padrão. A página de manutenção inclui seu logo, WhatsApp e redes sociais automaticamente.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card: Feature Flags */}
              <Card className="border-primary/25 shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="size-4 text-primary" />
                      Feature Flags
                    </CardTitle>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Controle de Funcionalidades
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Ative ou desative funcionalidades da loja sem precisar fazer um novo deploy. As mudanças são aplicadas em tempo real após salvar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Toggle: Pedidos Online */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-green-500/10">
                        <ShoppingBag className="size-4 text-green-600" />
                      </div>
                      <div>
                        <Label className="text-xs font-bold cursor-pointer">Pedidos Online (Sacola)</Label>
                        <p className="text-[10px] text-muted-foreground">
                          Habilita o carrinho de compras e envio de pedidos via WhatsApp.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={featureFlags.enableOnlineOrders !== false}
                      onCheckedChange={(checked) => setFeatureFlags((prev) => ({ ...prev, enableOnlineOrders: checked }))}
                    />
                  </div>

                  {/* Toggle: Modo Escuro */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-indigo-500/10">
                        <Moon className="size-4 text-indigo-600" />
                      </div>
                      <div>
                        <Label className="text-xs font-bold cursor-pointer">Modo Escuro</Label>
                        <p className="text-[10px] text-muted-foreground">
                          Permite que os visitantes alternem para o tema escuro na lojinha.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={featureFlags.enableDarkMode !== false}
                      onCheckedChange={(checked) => setFeatureFlags((prev) => ({ ...prev, enableDarkMode: checked }))}
                    />
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Info className="size-3 opacity-60" />
                      Novas feature flags serão adicionadas automaticamente conforme novas funcionalidades forem implementadas.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2 px-8">
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Salvar Todas as Configurações
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Coluna Lateral: Prévia Visual ao Vivo (1 Coluna) */}
        <div className="lg:col-span-1 lg:sticky lg:top-6 space-y-4">
          <Card className="overflow-hidden border-primary/25 shadow-md">
            <CardHeader className="bg-primary/5 py-3 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Eye className="size-3.5" />
                  <span>Prévia Visual da Lojinha</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                  Modo Claro
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0 text-xs bg-[#fff8f7] text-[#221a1a]">
              {/* Aviso do Topo */}
              {formData.catalogAnnouncement && (
                <div className="px-3 py-1.5 bg-amber-400/20 text-amber-900 border-b border-amber-400/30 text-[10px] font-semibold text-center flex items-center justify-center gap-1">
                  <Sparkles size={11} className="text-amber-600 shrink-0" />
                  <span className="truncate">{formData.catalogAnnouncement}</span>
                </div>
              )}

              {/* Header simulado: Apenas a barra fixa com imagem */}
              <div
                className="w-full border-b relative overflow-hidden transition-all duration-200 flex items-center justify-center select-none"
                style={{
                  backgroundColor: formData.catalogHeaderBgColor || '#ffffff',
                  height: formData.catalogHeaderHeight === 'compact' ? '42px' : formData.catalogHeaderHeight === 'large' ? '58px' : '48px',
                }}
              >
                {currentCatalogHeaderBackground ? (
                  <img
                    src={currentCatalogHeaderBackground}
                    alt="Arte da barra"
                    className="w-full h-full object-cover object-center"
                  />
                ) : currentCatalogLogo ? (
                  <div className="h-full py-1.5 flex items-center justify-center px-2">
                    <img
                      src={currentCatalogLogo}
                      alt="Logo"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      className="max-h-full w-auto object-contain"
                    />
                  </div>
                ) : (
                  <span className={`text-[11px] font-bold ${formData.catalogHeaderTextColor === 'light' ? 'text-white' : 'text-[#613d3e]'}`}>
                    {formData.catalogStoreName || 'Luisices'}
                  </span>
                )}
              </div>

              {/* Barra de Ações simulada: Busca e Sacola */}
              <div className="p-2 mx-2.5 mt-2 rounded-xl bg-white/80 border border-stone-200/70 flex items-center justify-between gap-1.5 shadow-2xs">
                <div className="flex-1 flex items-center gap-1.5 bg-stone-100/90 rounded-lg px-2 py-1 text-[10px] text-stone-500">
                  <Search size={11} className="opacity-60 shrink-0" />
                  <span className="truncate">Buscar mimos...</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#613d3e] text-white text-[10px] font-bold shrink-0">
                  <ShoppingBag size={10} />
                  <span>R$ 0,00</span>
                </div>
              </div>

              {/* Banner de Capa simulado (se houver) */}
              {catalogBanners.length > 0 ? (
                <div className="m-2.5 rounded-xl overflow-hidden border border-white/60 shadow-2xs">
                  <BannerCarousel
                    banners={catalogBanners}
                    intervalSeconds={catalogBannerInterval}
                    autoPlay={catalogBannerAutoPlay}
                    aspectRatioClass="aspect-[3.5/1]"
                    roundedClass="rounded-xl"
                    storeName={formData.catalogStoreName || 'Ateliê'}
                  />
                </div>
              ) : currentCatalogBanner ? (
                <div className="m-2.5 rounded-xl overflow-hidden border border-white/60 shadow-2xs">
                  <div className="relative w-full aspect-[3.5/1] bg-gradient-to-r from-[#fceee9] via-[#f7d6d0] to-[#ede7f6] overflow-hidden flex items-center justify-center text-stone-400">
                    <img src={currentCatalogBanner} alt="Capa da Loja" className="w-full h-full object-cover" />
                  </div>
                </div>
              ) : null}

              {/* Informações da Loja / Apresentação (Hero) */}
              {formData.catalogShowHero && (
                <div className="m-2.5 p-3 rounded-xl border border-white/60 shadow-2xs bg-white/70">
                  <div className="flex items-center gap-2 mb-1.5">
                    {currentCatalogLogo ? (
                      <div className="size-9 rounded-lg overflow-hidden border border-border/80 p-0.5 bg-white shrink-0 flex items-center justify-center">
                        <img
                          src={currentCatalogLogo}
                          alt="Logo"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          className="max-h-full w-auto object-contain"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs leading-tight text-[#221a1a] truncate">
                        {formData.catalogStoreName || 'Luisices'}
                      </p>
                      <p className="font-semibold text-[10px] text-[#613d3e] leading-snug truncate">
                        {formData.catalogStoreTagline || 'Papelaria artesanal feita à mão'}
                      </p>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#613d3e]/10 text-[#613d3e] font-semibold shrink-0">
                      {formData.catalogBadge || 'Atelier'}
                    </span>
                  </div>

                  <p className="text-[9px] text-stone-600 leading-snug line-clamp-2 pt-0.5">
                    {formData.catalogHeroDescription || 'Escolha suas peças, informe o nome para personalização e envie o pedido...'}
                  </p>
                </div>
              )}

              {/* Miniatura de Produto simulado */}
              <div className="p-2.5 mx-2.5 rounded-lg bg-white/50 border border-stone-200/50 flex items-center gap-2">
                <div className="size-10 rounded bg-stone-200 shrink-0 flex items-center justify-center text-stone-400">
                  <Store size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[11px] truncate">Planner Espiral Floral 2025</p>
                  <p className="text-[10px] text-[#613d3e] font-bold">R$ 89,90</p>
                </div>
              </div>

              {/* Rodapé simulado */}
              <div className="p-3 mt-3 border-t border-stone-200/60 bg-white/40 text-center space-y-1 text-[10px] text-stone-600">
                {currentCatalogLogo ? (
                  <img
                    src={currentCatalogLogo}
                    alt="Logo da Lojinha"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    className="max-h-7 w-auto object-contain mx-auto mb-1.5"
                  />
                ) : null}
                <p className="font-bold text-[#613d3e] text-[11px]">
                  {formData.catalogStoreName || 'Luisices'}
                </p>
                {formData.catalogFooterText && (
                  <p className="text-[9px] line-clamp-2 italic px-1">
                    "{formData.catalogFooterText}"
                  </p>
                )}
                {formData.catalogFooterLocation && (
                  <p className="text-[9px] flex items-center justify-center gap-0.5">
                    <MapPin size={9} /> {formData.catalogFooterLocation}
                  </p>
                )}
                {cleanInstagram && (
                  <p className="text-[9px] text-stone-500 flex items-center justify-center gap-1.5 flex-wrap">
                    <span>@{cleanInstagram}</span>
                    {cleanInstagramColab && (
                      <>
                        <span>•</span>
                        <span>@{cleanInstagramColab}</span>
                      </>
                    )}
                  </p>
                )}
                <p className="text-[8px] text-stone-400 pt-1">
                  {formData.catalogFooterCopyright || `© ${new Date().getFullYear()} ${formData.catalogStoreName || 'Luisices'}`}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Ajuda & Guia Completo da Lojinha */}
      <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
        <DialogContent size="3xl" noPadding className="max-h-[88dvh] flex flex-col overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <HelpCircle className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Central de Ajuda & Guia da Lojinha
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Tudo o que você precisa saber sobre o funcionamento e recursos da sua vitrine pública online.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogBody className="p-6 space-y-5 text-sm">
            {/* Seção 1: Publicação & Manutenção */}
            <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🟢</span>
                <h3 className="font-bold text-sm text-foreground">
                  Publicação da Loja & Modo Manutenção
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Na aba <strong>"Operação"</strong>, você encontra a chave <strong>"Loja Publicada"</strong>. Ao desligar essa chave e salvar:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>A vitrine sai do ar instantaneamente sem precisar fazer deploy.</li>
                <li>Os visitantes veem uma tela acolhedora de manutenção com a logo do seu ateliê.</li>
                <li>Você pode personalizar a mensagem explicativa (ex: aviso de férias, atualização de catálogo ou reforma).</li>
                <li>O botão direto de WhatsApp continua visível para os clientes entrarem em contato com você.</li>
              </ul>
            </div>

            {/* Seção 2: Feature Flags (Pedidos Online) */}
            <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <h3 className="font-bold text-sm text-foreground">
                  Feature Flags: Pedidos Online vs. Modo Vitrine
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Também na aba <strong>"Operação"</strong>, você pode controlar funcionalidades específicas:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>
                  <strong>Pedidos Online (Sacola):</strong> Se o ateliê estiver com capacidade lotada, desative essa opção. A loja continua no ar exibindo suas peças, mas sem carrinho. O botão de compra vira <em>"Ver Detalhes"</em> e direciona o cliente para tirar dúvidas no WhatsApp.
                </li>
                <li>
                  <strong>Modo Escuro:</strong> Permite que os clientes alternem entre o tema claro e escuro. Por padrão, o tema claro sempre valoriza as fotos dos seus mimos e papelaria.
                </li>
              </ul>
            </div>

            {/* Seção 3: Banners Rotativos & Carrossel */}
            <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🖼️</span>
                <h3 className="font-bold text-sm text-foreground">
                  Banners Rotativos & Vitrine de Propaganda
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Na aba <strong>"Logo & Vitrine"</strong>, você pode montar um carrossel no topo do catálogo:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li><strong>Formato Recomendado:</strong> Imagens na proporção 4:1 (estilo banner do LinkedIn, ex: 1200x300px ou 1600x400px).</li>
                <li><strong>Rotação Automática:</strong> Alterne a velocidade da propaganda (3s, 5s, 7s ou 10s).</li>
                <li><strong>Efeito Parallax / Vitrine Fixa:</strong> Mantém o banner fixo no fundo com os produtos rolando suavemente por cima.</li>
              </ul>
            </div>

            {/* Seção 4: Barra Superior Fixa (Header) */}
            <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🎨</span>
                <h3 className="font-bold text-sm text-foreground">
                  Personalização da Barra Superior Fixa
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A barra superior acompanha o cliente enquanto ele rola a página da loja:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li><strong>Arte de Fundo:</strong> Você pode enviar uma imagem personalizada que preenche toda a barra.</li>
                <li><strong>Cores Pré-definidas:</strong> Escolha entre tons afetivos (Rosê, Lavanda, Pêssego, Vinho Marsala) ou digite sua cor hex.</li>
                <li><strong>Contraste:</strong> Defina textos/ícones escuros para fundos claros ou textos brancos para fundos escuros.</li>
                <li><strong>Posição da Logo:</strong> À esquerda, centralizada ou ocupando a barra.</li>
              </ul>
            </div>

            {/* Seção 5: Pedidos no WhatsApp & Histórico */}
            <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">💬</span>
                <h3 className="font-bold text-sm text-foreground">
                  Como Funcionam os Pedidos da Lojinha
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Quando o cliente finaliza o pedido na sacola da lojinha:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>O sistema gera um código de pedido único e rastreável (ex: <code>#LJ-1234</code>).</li>
                <li>Abre o WhatsApp oficial configurado para a lojinha com uma mensagem limpa contendo todos os produtos, quantidades, nomes de personalização e subtotal.</li>
                <li>O pedido é salvo automaticamente no painel em <strong>"Pedidos da Lojinha"</strong> para que sua equipe confira e avance para a produção.</li>
              </ul>
            </div>

            {/* Seção 6: Endereço & Domínios */}
            <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🌐</span>
                <h3 className="font-bold text-sm text-foreground">
                  Links de Acesso & Domínios
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sua vitrine pública pode ser acessada e divulgada de várias formas:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li><code>loja.luisices.com.br</code> ou <code>catalogo.luisices.com.br</code> (subdomínios diretos para bio do Instagram).</li>
                <li><code>luisices.com.br/loja</code> ou <code>luisices.com.br/catalogo</code>.</li>
                <li>Em desenvolvimento, atende igualmente por <code>loja.dev.luisices.com.br</code> e <code>dev.luisices.com.br/loja</code>.</li>
                <li>Todas as rotas abrem a vitrine completa de forma responsiva no celular ou computador.</li>
              </ul>
            </div>
          </DialogBody>

          <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 flex justify-end">
            <Button type="button" onClick={() => setShowHelpModal(false)} className="px-6">
              Fechar Guia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StoreCustomization;

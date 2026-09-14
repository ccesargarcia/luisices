import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useUserSettings } from '../../hooks/useUserSettings';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
      businessTagline: 'Papelaria artesanal feita à mão para momentos únicos',
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
      businessTagline: 'Lembranças e encadernações delicadas para a chegada do seu bebê',
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
      businessTagline: 'Organização e encadernação artística em design clean e sofisticado',
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
      businessTagline: 'Papelaria criativa e personalizados que transformam qualquer comemoração',
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
  } = useUserSettings();
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingHeaderBackground, setUploadingHeaderBackground] = useState(false);
  const [currentCatalogLogo, setCurrentCatalogLogo] = useState<string | null>(null);
  const [currentCatalogBanner, setCurrentCatalogBanner] = useState<string | null>(null);
  const [catalogBanners, setCatalogBanners] = useState<CatalogBannerItem[]>([]);
  const [catalogBannerInterval, setCatalogBannerInterval] = useState<number>(5);
  const [catalogBannerAutoPlay, setCatalogBannerAutoPlay] = useState<boolean>(true);
  const [currentCatalogHeaderBackground, setCurrentCatalogHeaderBackground] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('identity');

  // Estado dos campos do formulário
  const [formData, setFormData] = useState({
    businessName: '',
    businessTagline: '',
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
  });

  const [dataLoaded, setDataLoaded] = useState(false);

  // Estado de publicação e feature flags
  const [storePublished, setStorePublished] = useState<boolean>(true);
  const [storeUnpublishMessage, setStoreUnpublishMessage] = useState<string>('');
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({
    enableOnlineOrders: true,
    enableDarkMode: true,
  });

  // Carregar dados quando settings estiver pronto ou carregar de storeSettings/public
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      // Inicia com catalogLogo e catalogBanner exclusivos da lojinha (sem fallback para o logo do painel)
      let loadedLogo: string | null = settings?.catalogLogo || null;
      let loadedBanner: string | null = settings?.catalogBanner || null;
      let loadedHeaderBg: string | null = settings?.catalogHeaderBackground || null;
      // Dados exclusivos da lojinha — sem fallback para o painel de Configurações.
      // Os valores só vêm de storeSettings/public (gerenciado pela tela Personalizar Lojinha).
      let data = {
        businessName: '',
        businessTagline: '',
        catalogWhatsappPhone: formatPhoneForDisplay(settings?.catalogWhatsappPhone || ''),
        instagramUrl: '',
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

          // Merge exclusivo da lojinha — sem fallback para dados do painel de Configurações.
          data = {
            businessName: pub.businessName || '',
            businessTagline: pub.businessTagline || '',
            catalogWhatsappPhone: formatPhoneForDisplay(pub.catalogWhatsappPhone || ''),
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
          };
        }
      } catch (err) {
        console.warn('Aviso ao ler storeSettings/public:', err);
      }

      if (!isCancelled) {
        setCurrentCatalogLogo(loadedLogo);
        setCurrentCatalogBanner(loadedBanner);
        setCurrentCatalogHeaderBackground(loadedHeaderBg);

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
    setSaving(true);
    try {
      await updateSettings({
        ...formData,
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
        storePublished,
        storeUnpublishMessage,
        featureFlags,
      });
      // Salva no cache do navegador para a lojinha atualizar instantaneamente
      try {
        const publicData = {
          name: formData.businessName || 'Luisices Papelaria Personalizada',
          tagline: formData.businessTagline,
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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
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
                      <p className="truncate"><span className="font-semibold text-foreground">Slogan:</span> {tmpl.data.businessTagline}</p>
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
                          storeName={formData.businessName || 'Ateliê'}
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
                          {formData.businessName || 'Luisices Papelaria'}
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
                      value={formData.businessTagline}
                      onChange={(e) => handleChange('businessTagline', e.target.value)}
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
                        Nome da Loja / Ateliê
                      </Label>
                      <Input
                        id="m-biz-name"
                        placeholder="Ex: Luisices"
                        value={formData.businessName}
                        onChange={(e) => handleChange('businessName', e.target.value)}
                      />
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
                      Slogan da Loja
                    </Label>
                    <Input
                      id="m-biz-tag"
                      placeholder="Ex: Papelaria artesanal feita à mão para momentos únicos"
                      value={formData.businessTagline}
                      onChange={(e) => handleChange('businessTagline', e.target.value)}
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
                          onCheckedChange={(checked) => setStorePublished(checked)}
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
                    {formData.businessName || 'Luisices'}
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
                    storeName={formData.businessName || 'Ateliê'}
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
                        {formData.businessName || 'Luisices'}
                      </p>
                      <p className="font-semibold text-[10px] text-[#613d3e] leading-snug truncate">
                        {formData.businessTagline || 'Papelaria artesanal feita à mão'}
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
                  {formData.businessName || 'Luisices'}
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
                  {formData.catalogFooterCopyright || `© ${new Date().getFullYear()} ${formData.businessName || 'Luisices'}`}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

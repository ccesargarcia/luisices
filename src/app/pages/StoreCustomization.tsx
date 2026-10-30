import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettings } from '../../hooks/useUserSettings';
import { secureRandomId } from '../utils/random';
import { firebaseAiAgentService } from '../../services/firebaseAiAgentService';
import { parseLlmJson } from '../../lib/robustJsonParser';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../components/ui/dialog';
import { StoreWhatsappTab } from '../components/store-customization/StoreWhatsappTab';
import { StoreFooterTab } from '../components/store-customization/StoreFooterTab';
import { StoreContactTab } from '../components/store-customization/StoreContactTab';
import { StoreOperationsTab } from '../components/store-customization/StoreOperationsTab';
import { StoreInstitutionalTab } from '../components/store-customization/StoreInstitutionalTab';
import { StoreIdentityTab } from '../components/store-customization/StoreIdentityTab';
import { StoreAiInstitutionalModal } from '../components/store-customization/StoreAiInstitutionalModal';
import {
  Store,
  Globe,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Loader2,
  MapPin,
  HelpCircle,
  Building2,
  X,
  Eye,
  ShoppingBag,
  Wand2,
  Search,
  Power,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { BannerCarousel, CatalogBannerItem } from '../components/catalog/BannerCarousel';
import {
  firebaseSettingsService,
  InstitutionalPillarItem,
  InstitutionalStepItem,
  InstitutionalFeatureItem,
  InstitutionalFaqItem,
  InstitutionalCustomSection,
} from '../../services/firebaseSettingsService';
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
  },
  {
    id: 'natal',
    name: 'Natal Encantado & Fim de Ano',
    icon: '🎄',
    tag: 'Sazonal',
    description: 'Caixas de panetone, lembrancinhas natalinas, cartões de presente, mimos corporativos e embalagens de luxo.',
    data: {
      catalogBadge: 'Especial de Natal',
      catalogStatusText: 'Agenda de Natal aberta • Vagas limitadas',
      catalogAnnouncement: '🎄 Encomendas de Natal abertas! Garanta suas caixas e lembrancinhas natalinas com antecedência.',
      catalogHeroTitle: 'Coleção Natal Encantado & Fim de Ano',
      catalogStoreTagline: 'Lembranças afetivas e embalagens de luxo para celebrar o Natal com quem você ama',
      catalogHeroDescription: 'Caixas para panetones, mini bebidas, porta-chocolates, cartões e mimos corporativos com acabamento em hot stamping dourado.',
      catalogWhatsappGreeting: 'Olá! Gostaria de encomendar itens da Coleção de Natal pelo catálogo:',
      catalogWhatsappCustomizationLabel: 'Nome/Texto para a personalização e tema natalino:',
      catalogWhatsappFooter: 'Poderia me informar as datas limite de envio para entrega antes do Natal e a chave PIX?',
      catalogFooterText: 'Que a magia do Natal encha o seu lar de luz, amor e doces memórias feitas à mão. ✨🎄',
      catalogFooterLocation: 'Enviamos para todo o Brasil com embalagem reforçada 📦',
      catalogFooterBusinessHours: 'Segunda a Sábado, das 8h às 19h (Horário Especial de Fim de Ano)',
      catalogFooterNotice: 'Recomendamos antecipar seus pedidos de fim de ano devido à alta demanda dos Correios e transportadoras.',
    }
  },
  {
    id: 'pascoa',
    name: 'Páscoa Afetiva & Chocolates',
    icon: '🐰',
    tag: 'Sazonal',
    description: 'Caixas para ovos de colher, kits confeiteiro, cestas de doces e lembrancinhas lúdicas para a Páscoa.',
    data: {
      catalogBadge: 'Páscoa Especial',
      catalogStatusText: 'Agenda de Páscoa aberta • Encomendas ativas',
      catalogAnnouncement: '🐰 Coleção de Páscoa aberta! Embalagens para ovos de colher e caixas personalizadas.',
      catalogHeroTitle: 'Coleção Páscoa Afetiva & Doçura',
      catalogStoreTagline: 'Embalagens artesanais e encantos de Páscoa para surpreender quem você ama',
      catalogHeroDescription: 'Caixas reforçadas para ovos de colher (150g a 500g), caixas cenário 3D, kits confeiteiro infantil e mimos especiais.',
      catalogWhatsappGreeting: 'Olá! Gostaria de encomendar embalagens e itens de Páscoa pelo catálogo:',
      catalogWhatsappCustomizationLabel: 'Nome da criança/pessoa e gramatura do ovo ou doce:',
      catalogWhatsappFooter: 'Por favor, confirme a data limite de envio e os métodos de pagamento disponíveis.',
      catalogFooterText: 'Doçura, afeto e delicadeza em cada detalhe para uma Páscoa inesquecível. 🍫🐰',
      catalogFooterLocation: 'Produção artesanal • Envio seguro para todo o Brasil ✈️',
      catalogFooterBusinessHours: 'Segunda a Sexta, das 9h às 18h',
      catalogFooterNotice: 'Caixas enviadas desmontadas para otimizar o frete com fácil montagem por encaixe.',
    }
  },
  {
    id: 'casamento',
    name: 'Casamentos, Noivados & Bodas',
    icon: '💍',
    tag: 'Luxo',
    description: 'Convites finos, caixas para padrinhos, lágrimas de alegria, menus e papelaria completa para o grande dia.',
    data: {
      catalogBadge: 'Papelaria Fina',
      catalogStatusText: 'Atendimento exclusivo para Noivas & Cerimonialistas',
      catalogAnnouncement: '💍 Convites de casamento com lacre de cera, relevo seco e lamicote rosé/dourado.',
      catalogHeroTitle: 'Casamentos, Noivados & Momentos Únicos',
      catalogStoreTagline: 'Papelaria fina e encadernação de luxo para eternizar a sua história de amor',
      catalogHeroDescription: 'Identidade visual completa para seu evento: convites artesanais, caixas cartonadas para padrinhos, votos dos noivos e lembranças requintadas.',
      catalogWhatsappGreeting: 'Olá! Sou noiva/cerimonialista e gostaria de orçar a papelaria do nosso casamento:',
      catalogWhatsappCustomizationLabel: 'Nomes dos noivos, data do casamento e paleta de cores:',
      catalogWhatsappFooter: 'Poderia me enviar o catálogo completo de papéis especiais, lacres e opções de frete?',
      catalogFooterText: 'Cada detalhe pensado com sofisticação para o dia mais especial da sua vida. 💒✨',
      catalogFooterLocation: 'Atendimento personalizado com envio seguro para todo o Brasil',
      catalogFooterBusinessHours: 'Segunda a Sexta, das 9h às 18h (Atendimento com hora marcada)',
      catalogFooterNotice: 'Para convites e caixas de padrinhos, recomendamos solicitar com 3 a 6 meses de antecedência do evento.',
    }
  },
  {
    id: 'batizado',
    name: 'Batizados & Eucaristia',
    icon: '🕊️',
    tag: 'Delicado',
    description: 'Caixas de lembrança com mini terço, livretos de oração, convites para padrinhos de batismo e topos de bolo sacros.',
    data: {
      catalogBadge: 'Batizado & Sacro',
      catalogStatusText: 'Produção artesanal com amor e devoção',
      catalogAnnouncement: '🕊️ Lembrancinhas e caixas para padrinhos de batizado com papéis texturizados nobres.',
      catalogHeroTitle: 'Batizados, Eucaristia & Momentos Especiais',
      catalogStoreTagline: 'Papelaria delicada e lembranças abençoadas para celebrar a vida e a fé',
      catalogHeroDescription: 'Lembrancinhas com mini terço, caixas cartonadas com almofada, convites para padrinhos de consagração e cadernos de recordação.',
      catalogWhatsappGreeting: 'Olá! Gostaria de encomendar itens de batizado pelo catálogo do Ateliê:',
      catalogWhatsappCustomizationLabel: 'Nome da criança, nome dos padrinhos e data do batismo:',
      catalogWhatsappFooter: 'Por favor, confirme as opções de frete e o prazo de produção para a minha data.',
      catalogFooterText: 'Um momento sagrado celebrado com pureza, delicadeza e afeto em cada dobra de papel. 🕊️🤍',
      catalogFooterLocation: 'Enviamos para todo o Brasil com todo cuidado 📦',
      catalogFooterBusinessHours: 'Segunda a Sexta, das 9h às 18h',
      catalogFooterNotice: 'Personalizamos os textos das orações e dedicatórias conforme o desejo da família.',
    }
  },
  {
    id: 'volta_aulas',
    name: 'Volta às Aulas & Planners',
    icon: '🎒',
    tag: 'Sazonal',
    description: 'Kits de etiquetas escolares à prova d\'água, agendas escolares personalizadas, cadernos e planners pedagógicos.',
    data: {
      catalogBadge: 'Volta às Aulas',
      catalogStatusText: 'Produção rápida de etiquetas escolares e planners',
      catalogAnnouncement: '🎒 Etiquetas escolares laváveis e plastificadas para livros, cadernos e materiais!',
      catalogHeroTitle: 'Volta às Aulas, Agendas & Organização',
      catalogStoreTagline: 'Etiquetas escolares impermeáveis e encadernações duráveis para o ano letivo',
      catalogHeroDescription: 'Combos completos de etiquetas adesivas para uniformes e materiais, agendas escolares e planners para professores e estudantes.',
      catalogWhatsappGreeting: 'Olá! Gostaria de encomendar kits escolares pelo catálogo:',
      catalogWhatsappCustomizationLabel: 'Nome do aluno, turma, série e tema escolhido:',
      catalogWhatsappFooter: 'Qual o prazo de envio para o meu CEP para receber antes do início das aulas?',
      catalogFooterText: 'Organização, cor e praticidade para um ano escolar incrível e cheio de descobertas! 📚✏️',
      catalogFooterLocation: 'Envio rápido para todo o Brasil 🚀',
      catalogFooterBusinessHours: 'Segunda a Sábado, das 8h às 19h',
      catalogFooterNotice: 'Etiquetas impressas em vinil adesivo resistente à água e ao micro-ondas.',
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
  { name: 'Verde Natalino', color: '#1b3b2b', textColor: 'light' as const },
  { name: 'Vermelho Rubi Natal', color: '#851c22', textColor: 'light' as const },
  { name: 'Amarelo Páscoa', color: '#fef9e7', textColor: 'dark' as const },
  { name: 'Azul Céu Batizado', color: '#eef6fc', textColor: 'dark' as const },
  { name: 'Lilás Festivo', color: '#f7f0fa', textColor: 'dark' as const },
];

export function StoreCustomization() {
  const { user, isAdmin, hasPermission } = useAuth();
  const canEdit = isAdmin || hasPermission((p) => Boolean(p?.store || p?.settings));

  const { 
    settings, 
    loading, 
    updateSettings, 
    uploadCatalogLogo, 
    removeCatalogLogo,
    uploadCatalogBannerImage,
    deleteCatalogBannerImage,
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
  const [pendingBannerImageDeletes, setPendingBannerImageDeletes] = useState<string[]>([]);
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
    catalogCategoryFilterStyle: 'dropdown' as 'dropdown' | 'carousel' | 'bottom_sheet',
    catalogCardDensity: 'compact' as 'compact' | 'editorial',
    catalogImageAspect: 'square' as 'square' | 'portrait',
    catalogShowBadgeCustomizable: true,
    catalogShowBadgeLeadTime: true,
    catalogShowBadgeBestSeller: true,
    catalogShowBadgeNew: true,
    catalogStoreMode: 'cart' as 'cart' | 'direct_inquiry' | 'portfolio',
    catalogShowFloatingWhatsApp: true,
    catalogFloatingWhatsAppText: 'Fale Conosco no WhatsApp',
    catalogPixDiscountText: '',
    catalogAdvanceNoticeText: '',
    catalogMinOrderAmount: 0,
    catalogBackgroundStyle: 'atmospheric' as 'atmospheric' | 'solid',
    catalogTypographyStyle: 'modern' as 'modern' | 'editorial',
    catalogDefaultSort: 'destaque' as 'destaque' | 'preco-menor' | 'preco-maior' | 'nome-az' | 'prazo',
    catalogPrimaryColor: '',
    catalogButtonRadius: 'md' as 'none' | 'sm' | 'md' | 'lg' | 'full',
    catalogButtonStyle: 'solid' as 'solid' | 'soft' | 'outline',
    catalogProductsPerPage: 12 as number,

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

    // Listas Dinâmicas / Itens Expansíveis
    catalogAboutPillars: [
      { id: 'p1', title: '', text: '' },
      { id: 'p2', title: '', text: '' },
      { id: 'p3', title: '', text: '' },
    ] as InstitutionalPillarItem[],
    catalogHowItWorksSteps: [
      { id: 's1', title: '', text: '' },
      { id: 's2', title: '', text: '' },
      { id: 's3', title: '', text: '' },
      { id: 's4', title: '', text: '' },
    ] as InstitutionalStepItem[],
    catalogFeatureItems: [
      { id: 'f1', title: '', text: '' },
      { id: 'f2', title: '', text: '' },
      { id: 'f3', title: '', text: '' },
      { id: 'f4', title: '', text: '' },
    ] as InstitutionalFeatureItem[],
    catalogFaqItems: [
      { id: 'faq1', question: '', answer: '' },
      { id: 'faq2', question: '', answer: '' },
      { id: 'faq3', question: '', answer: '' },
      { id: 'faq4', question: '', answer: '' },
      { id: 'faq5', question: '', answer: '' },
    ] as InstitutionalFaqItem[],
    catalogCustomSections: [] as InstitutionalCustomSection[],
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
  
  const [togglingSales, setTogglingSales] = useState(false);
  const handleToggleSales = async (enable: boolean) => {
    if (!canEdit || !user) {
      toast.error('Você não tem permissão para alterar configurações da loja');
      return;
    }
    setTogglingSales(true);
    const updatedFlags = { ...featureFlags, enableOnlineOrders: enable };
    setFeatureFlags(updatedFlags);
    try {
      await firebaseSettingsService.updateStoreFeatureFlags(user.uid, updatedFlags);
      try {
        const cached = localStorage.getItem("luisices_public_store_settings");
        const parsed = cached ? JSON.parse(cached) : {};
        parsed.featureFlags = updatedFlags;
        localStorage.setItem("luisices_public_store_settings", JSON.stringify(parsed));
      } catch {}
      if (enable) {
        toast.success("🔵 Vendas retomadas! O catálogo está recebendo pedidos.");
      } else {
        toast.warning("🟠 Vendas pausadas! O catálogo continua visível mas sem botões de compra.");
      }
    } catch (err) {
      console.error("Erro ao alternar vendas da loja:", err);
      setFeatureFlags(featureFlags);
      toast.error("Erro ao atualizar status de vendas.");
    } finally {
      setTogglingSales(false);
    }
  };

  const [storeUnpublishMessage, setStoreUnpublishMessage] = useState<string>('');
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({
    enableOnlineOrders: true,
    enableDarkMode: true,
  });
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiNiche, setAiNiche] = useState('papelaria');
  const [aiCustomContext, setAiCustomContext] = useState('');

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
        catalogCategoryFilterStyle: (settings?.catalogCategoryFilterStyle || 'dropdown') as 'dropdown' | 'carousel' | 'bottom_sheet',
        catalogCardDensity: (settings?.catalogCardDensity || 'compact') as 'compact' | 'editorial',
        catalogImageAspect: (settings?.catalogImageAspect || 'square') as 'square' | 'portrait',
        catalogShowBadgeCustomizable: settings?.catalogShowBadgeCustomizable !== undefined ? Boolean(settings.catalogShowBadgeCustomizable) : true,
        catalogShowBadgeLeadTime: settings?.catalogShowBadgeLeadTime !== undefined ? Boolean(settings.catalogShowBadgeLeadTime) : true,
        catalogShowBadgeBestSeller: settings?.catalogShowBadgeBestSeller !== undefined ? Boolean(settings.catalogShowBadgeBestSeller) : true,
        catalogShowBadgeNew: settings?.catalogShowBadgeNew !== undefined ? Boolean(settings.catalogShowBadgeNew) : true,
        catalogStoreMode: (settings?.catalogStoreMode || 'cart') as 'cart' | 'direct_inquiry' | 'portfolio',
        catalogShowFloatingWhatsApp: settings?.catalogShowFloatingWhatsApp !== undefined ? Boolean(settings.catalogShowFloatingWhatsApp) : true,
        catalogFloatingWhatsAppText: settings?.catalogFloatingWhatsAppText || 'Fale Conosco no WhatsApp',
        catalogPixDiscountText: settings?.catalogPixDiscountText || '',
        catalogAdvanceNoticeText: settings?.catalogAdvanceNoticeText || '',
        catalogMinOrderAmount: Number(settings?.catalogMinOrderAmount) || 0,
        catalogBackgroundStyle: (settings?.catalogBackgroundStyle || 'atmospheric') as 'atmospheric' | 'solid',
        catalogTypographyStyle: (settings?.catalogTypographyStyle || 'modern') as 'modern' | 'editorial',
        catalogDefaultSort: (settings?.catalogDefaultSort || 'destaque') as 'destaque' | 'preco-menor' | 'preco-maior' | 'nome-az' | 'prazo',
        catalogPrimaryColor: settings?.catalogPrimaryColor || '',
        catalogButtonRadius: (settings?.catalogButtonRadius || 'md') as 'none' | 'sm' | 'md' | 'lg' | 'full',
        catalogButtonStyle: (settings?.catalogButtonStyle || 'solid') as 'solid' | 'soft' | 'outline',
        catalogProductsPerPage: settings?.catalogProductsPerPage !== undefined ? Number(settings.catalogProductsPerPage) : 12,

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
            catalogCategoryFilterStyle: pub.catalogCategoryFilterStyle || data.catalogCategoryFilterStyle,
            catalogCardDensity: pub.catalogCardDensity || data.catalogCardDensity,
            catalogImageAspect: pub.catalogImageAspect || data.catalogImageAspect,
            catalogShowBadgeCustomizable: pub.catalogShowBadgeCustomizable !== undefined ? Boolean(pub.catalogShowBadgeCustomizable) : data.catalogShowBadgeCustomizable,
            catalogShowBadgeLeadTime: pub.catalogShowBadgeLeadTime !== undefined ? Boolean(pub.catalogShowBadgeLeadTime) : data.catalogShowBadgeLeadTime,
            catalogShowBadgeBestSeller: pub.catalogShowBadgeBestSeller !== undefined ? Boolean(pub.catalogShowBadgeBestSeller) : data.catalogShowBadgeBestSeller,
            catalogShowBadgeNew: pub.catalogShowBadgeNew !== undefined ? Boolean(pub.catalogShowBadgeNew) : data.catalogShowBadgeNew,
            catalogStoreMode: pub.catalogStoreMode || data.catalogStoreMode,
            catalogShowFloatingWhatsApp: pub.catalogShowFloatingWhatsApp !== undefined ? Boolean(pub.catalogShowFloatingWhatsApp) : data.catalogShowFloatingWhatsApp,
            catalogFloatingWhatsAppText: pub.catalogFloatingWhatsAppText !== undefined ? pub.catalogFloatingWhatsAppText : data.catalogFloatingWhatsAppText,
            catalogPixDiscountText: pub.catalogPixDiscountText !== undefined ? pub.catalogPixDiscountText : data.catalogPixDiscountText,
            catalogAdvanceNoticeText: pub.catalogAdvanceNoticeText !== undefined ? pub.catalogAdvanceNoticeText : data.catalogAdvanceNoticeText,
            catalogMinOrderAmount: pub.catalogMinOrderAmount !== undefined ? Number(pub.catalogMinOrderAmount) : data.catalogMinOrderAmount,
            catalogBackgroundStyle: pub.catalogBackgroundStyle || data.catalogBackgroundStyle,
            catalogTypographyStyle: pub.catalogTypographyStyle || data.catalogTypographyStyle,
            catalogDefaultSort: pub.catalogDefaultSort || data.catalogDefaultSort,
            catalogPrimaryColor: pub.catalogPrimaryColor || data.catalogPrimaryColor,
            catalogButtonRadius: pub.catalogButtonRadius || data.catalogButtonRadius,
            catalogButtonStyle: pub.catalogButtonStyle || data.catalogButtonStyle,
            catalogProductsPerPage: pub.catalogProductsPerPage !== undefined ? Number(pub.catalogProductsPerPage) : (data.catalogProductsPerPage ?? 12),

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

        // Listas dinâmicas institucionais
        let loadedPillars: InstitutionalPillarItem[] = [];
        if (Array.isArray(pubData?.catalogAboutPillars) && pubData.catalogAboutPillars.length > 0) {
          loadedPillars = pubData.catalogAboutPillars;
        } else if (Array.isArray(settings?.catalogAboutPillars) && settings.catalogAboutPillars.length > 0) {
          loadedPillars = settings.catalogAboutPillars;
        } else {
          loadedPillars = [
            { id: 'p1', title: data.catalogAboutPillar1Title || '', text: data.catalogAboutPillar1Text || '' },
            { id: 'p2', title: data.catalogAboutPillar2Title || '', text: data.catalogAboutPillar2Text || '' },
            { id: 'p3', title: data.catalogAboutPillar3Title || '', text: data.catalogAboutPillar3Text || '' },
          ];
        }

        let loadedSteps: InstitutionalStepItem[] = [];
        if (Array.isArray(pubData?.catalogHowItWorksSteps) && pubData.catalogHowItWorksSteps.length > 0) {
          loadedSteps = pubData.catalogHowItWorksSteps;
        } else if (Array.isArray(settings?.catalogHowItWorksSteps) && settings.catalogHowItWorksSteps.length > 0) {
          loadedSteps = settings.catalogHowItWorksSteps;
        } else {
          loadedSteps = [
            { id: 's1', title: data.catalogHowItWorksStep1Title || '', text: data.catalogHowItWorksStep1Text || '' },
            { id: 's2', title: data.catalogHowItWorksStep2Title || '', text: data.catalogHowItWorksStep2Text || '' },
            { id: 's3', title: data.catalogHowItWorksStep3Title || '', text: data.catalogHowItWorksStep3Text || '' },
            { id: 's4', title: data.catalogHowItWorksStep4Title || '', text: data.catalogHowItWorksStep4Text || '' },
          ];
        }

        let loadedFeatures: InstitutionalFeatureItem[] = [];
        if (Array.isArray(pubData?.catalogFeatureItems) && pubData.catalogFeatureItems.length > 0) {
          loadedFeatures = pubData.catalogFeatureItems;
        } else if (Array.isArray(settings?.catalogFeatureItems) && settings.catalogFeatureItems.length > 0) {
          loadedFeatures = settings.catalogFeatureItems;
        } else {
          loadedFeatures = [
            { id: 'f1', title: data.catalogFeature1Title || '', text: data.catalogFeature1Text || '' },
            { id: 'f2', title: data.catalogFeature2Title || '', text: data.catalogFeature2Text || '' },
            { id: 'f3', title: data.catalogFeature3Title || '', text: data.catalogFeature3Text || '' },
            { id: 'f4', title: data.catalogFeature4Title || '', text: data.catalogFeature4Text || '' },
          ];
        }

        let loadedFaqs: InstitutionalFaqItem[] = [];
        if (Array.isArray(pubData?.catalogFaqItems) && pubData.catalogFaqItems.length > 0) {
          loadedFaqs = pubData.catalogFaqItems;
        } else if (Array.isArray(settings?.catalogFaqItems) && settings.catalogFaqItems.length > 0) {
          loadedFaqs = settings.catalogFaqItems;
        } else {
          loadedFaqs = [
            { id: 'faq1', question: data.catalogFaq1Q || '', answer: data.catalogFaq1A || '' },
            { id: 'faq2', question: data.catalogFaq2Q || '', answer: data.catalogFaq2A || '' },
            { id: 'faq3', question: data.catalogFaq3Q || '', answer: data.catalogFaq3A || '' },
            { id: 'faq4', question: data.catalogFaq4Q || '', answer: data.catalogFaq4A || '' },
            { id: 'faq5', question: data.catalogFaq5Q || '', answer: data.catalogFaq5A || '' },
          ];
        }

        let loadedCustomSections: InstitutionalCustomSection[] = [];
        if (Array.isArray(pubData?.catalogCustomSections)) {
          loadedCustomSections = pubData.catalogCustomSections;
        } else if (Array.isArray(settings?.catalogCustomSections)) {
          loadedCustomSections = settings.catalogCustomSections;
        }

        if (!dataLoaded) {
          setFormData({
            ...data,
            catalogAboutPillars: loadedPillars,
            catalogHowItWorksSteps: loadedSteps,
            catalogFeatureItems: loadedFeatures,
            catalogFaqItems: loadedFaqs,
            catalogCustomSections: loadedCustomSections,
          });
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
        id: `b-${Date.now()}-${secureRandomId()}`,
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

    setPendingBannerImageDeletes((pending) => [...new Set([...pending, bannerToRemove.imageUrl])]);

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
    const defaultPillars: InstitutionalPillarItem[] = [
      { id: 'p1', title: 'Produção Artesanal', text: 'Corte, dobra, montagem e laminação feitos à mão com rigoroso controle de acabamento.' },
      { id: 'p2', title: 'Materiais Nobres', text: 'Papéis especiais de alta gramatura, laminação fosca/holográfica e acabamentos duradouros.' },
      { id: 'p3', title: 'Afeto em Cada Detalhe', text: 'Personalização exclusiva com seu nome, tema e cores para tornar seu momento inesquecível.' },
    ];

    const defaultSteps: InstitutionalStepItem[] = [
      { id: 's1', title: '1. Escolha seus Mimos', text: 'Explore os produtos na vitrine e adicione à sacola os itens desejados.' },
      { id: 's2', title: '2. Envie pelo WhatsApp', text: 'Informe o nome para personalização e clique para enviar a sacola direto no WhatsApp.' },
      { id: 's3', title: '3. Prévia & Aprovação', text: 'Enviamos a arte digital para você conferir e aprovar cada detalhe antes da impressão.' },
      { id: 's4', title: '4. Confecção & Envio', text: 'Produzimos com todo o carinho e despachamos com embalagem segura para o seu endereço.' },
    ];

    const defaultFeatures: InstitutionalFeatureItem[] = [
      { id: 'f1', title: 'Atendimento Humanizado', text: 'Conversa direta pelo WhatsApp para tirar dúvidas e alinhar sua arte com calma.' },
      { id: 'f2', title: 'Laminação Protetora', text: 'Capas e peças protegidas contra respingos e sujeira, com toque suave e aveludado.' },
      { id: 'f3', title: 'Embalagem Reforçada', text: 'Seus mimos viajam com proteção extra para chegarem impecáveis até você.' },
      { id: 'f4', title: 'Arte Sob Medida', text: 'Criações autorais e adaptações em qualquer tema para transformar sua festa ou rotina.' },
    ];

    const defaultFaqs: InstitutionalFaqItem[] = [
      { id: 'faq1', question: 'Qual é o prazo médio de produção?', answer: 'O prazo varia de acordo com cada produto (geralmente entre 5 a 10 dias úteis) e começa a contar após a aprovação da arte final.' },
      { id: 'faq2', question: 'Vocês enviam para todo o Brasil?', answer: 'Sim! Enviamos para todo o território nacional via Correios (PAC/Sedex) ou transportadora, com código de rastreio.' },
      { id: 'faq3', question: 'Posso personalizar com qualquer tema ou nome?', answer: 'Sim! Todos os nossos produtos personalizáveis podem ser adaptados com seu tema, nome, idade ou paleta de cores desejada.' },
      { id: 'faq4', question: 'Como funciona o pagamento?', answer: 'Aceitamos PIX (com confirmação imediata) e Cartão de Crédito. Os dados são fornecidos diretamente no WhatsApp.' },
      { id: 'faq5', question: 'Consigo ver uma prévia antes da confecção?', answer: 'Com certeza! Antes de imprimir qualquer produto, enviamos a prévia digital no WhatsApp para sua total aprovação.' },
    ];

    setFormData((prev) => ({
      ...prev,
      catalogShowAbout: true,
      catalogAboutBadge: 'Sobre Nós',
      catalogAboutTitle: 'Feito à Mão com Afeto & Dedicação',
      catalogAboutText: 'No Ateliê Luisices, acreditamos que a papelaria personalizada vai muito além do papel: ela materializa memórias, celebra novas fases e acolhe com carinho momentos únicos. Cada peça é desenhada e produzida artesanalmente com os mais nobres materiais.',
      catalogAboutPillars: defaultPillars,
      catalogAboutPillar1Title: defaultPillars[0].title,
      catalogAboutPillar1Text: defaultPillars[0].text,
      catalogAboutPillar2Title: defaultPillars[1].title,
      catalogAboutPillar2Text: defaultPillars[1].text,
      catalogAboutPillar3Title: defaultPillars[2].title,
      catalogAboutPillar3Text: defaultPillars[2].text,

      catalogShowHowItWorks: true,
      catalogHowItWorksBadge: 'Passo a Passo',
      catalogHowItWorksTitle: 'Como Funciona sua Encomenda?',
      catalogHowItWorksSubtitle: 'Um processo simples, transparente e carinhoso do pedido até a sua entrega',
      catalogHowItWorksSteps: defaultSteps,
      catalogHowItWorksStep1Title: defaultSteps[0].title,
      catalogHowItWorksStep1Text: defaultSteps[0].text,
      catalogHowItWorksStep2Title: defaultSteps[1].title,
      catalogHowItWorksStep2Text: defaultSteps[1].text,
      catalogHowItWorksStep3Title: defaultSteps[2].title,
      catalogHowItWorksStep3Text: defaultSteps[2].text,
      catalogHowItWorksStep4Title: defaultSteps[3].title,
      catalogHowItWorksStep4Text: defaultSteps[3].text,

      catalogShowFeatures: true,
      catalogFeaturesBadge: 'Diferenciais do Ateliê',
      catalogFeaturesTitle: 'Por que escolher a Luisices?',
      catalogFeatureItems: defaultFeatures,
      catalogFeature1Title: defaultFeatures[0].title,
      catalogFeature1Text: defaultFeatures[0].text,
      catalogFeature2Title: defaultFeatures[1].title,
      catalogFeature2Text: defaultFeatures[1].text,
      catalogFeature3Title: defaultFeatures[2].title,
      catalogFeature3Text: defaultFeatures[2].text,
      catalogFeature4Title: defaultFeatures[3].title,
      catalogFeature4Text: defaultFeatures[3].text,

      catalogShowFaq: true,
      catalogFaqBadge: 'Tire suas Dúvidas',
      catalogFaqTitle: 'Perguntas Frequentes (FAQ)',
      catalogFaqItems: defaultFaqs,
      catalogFaq1Q: defaultFaqs[0].question,
      catalogFaq1A: defaultFaqs[0].answer,
      catalogFaq2Q: defaultFaqs[1].question,
      catalogFaq2A: defaultFaqs[1].answer,
      catalogFaq3Q: defaultFaqs[2].question,
      catalogFaq3A: defaultFaqs[2].answer,
      catalogFaq4Q: defaultFaqs[3].question,
      catalogFaq4A: defaultFaqs[3].answer,
      catalogFaq5Q: defaultFaqs[4].question,
      catalogFaq5A: defaultFaqs[4].answer,
    }));
    toast.success('Sugestões preenchidas com sucesso! Revise os campos e clique em Salvar Alterações.');
  };

  const handleGenerateWithAi = async () => {
    setGeneratingAi(true);
    const storeName = formData.catalogStoreName.trim() || 'Luisices Ateliê';
    const tagline = formData.catalogStoreTagline.trim() || 'Papelaria afetiva e personalizados';

    const nicheDescriptions: Record<string, string> = {
      papelaria: 'Papelaria personalizada e afetiva, cadernos, planners, blocos e encadernação artesanal',
      maternidade: 'Maternidade e bebês, cadernetas de vacinação, livros do bebê, kits de nascimento e batizado',
      minimalista: 'Papelaria minimalista de alto padrão, planners executivos, capas neutras e design contemporâneo',
      festas: 'Kits de festa, topos de bolo, lembrancinhas temáticas, caixinhas personalizadas e scraps criativos',
      personalizado: aiCustomContext.trim() || 'Ateliê criativo de presentes e papelaria sob medida',
    };

    const targetNiche = nicheDescriptions[aiNiche] || nicheDescriptions.papelaria;
    const extraContext = aiCustomContext.trim() ? `\nDetalhes adicionais fornecidos pelo ateliê: "${aiCustomContext.trim()}"` : '';

    const prompt = `Você é um copywriter e estrategista de marketing especialista em marcas de artesanato e ateliês de papelaria personalizada.
Gere o conteúdo institucional completo para o catálogo online da loja "${storeName}".
Slogan da loja: "${tagline}".
Nicho principal: "${targetNiche}".${extraContext}

IMPORTANTE:
- Retorne ESTRITAMENTE um objeto JSON válido.
- Para textos com mais de um parágrafo, use \\n para quebras de linha (nunca insira quebras de linha literais dentro das strings).
- Preencha todos os campos do modelo abaixo:
{
  "catalogAboutBadge": "Selo curto (ex: Sobre Nós)",
  "catalogAboutTitle": "Título acolhedor e atrativo",
  "catalogAboutText": "História e propósito do ateliê em 2 a 3 parágrafos carinhosos e profissionais.",
  "catalogAboutPillar1Title": "Título do Pilar 1 (ex: Produção Artesanal)",
  "catalogAboutPillar1Text": "Descrição breve do pilar 1 (1-2 frases)",
  "catalogAboutPillar2Title": "Título do Pilar 2 (ex: Materiais Nobres)",
  "catalogAboutPillar2Text": "Descrição breve do pilar 2 (1-2 frases)",
  "catalogAboutPillar3Title": "Título do Pilar 3 (ex: Feito com Afeto)",
  "catalogAboutPillar3Text": "Descrição breve do pilar 3 (1-2 frases)",
  "catalogHowItWorksBadge": "Selo curto (ex: Passo a Passo)",
  "catalogHowItWorksTitle": "Título da seção Como Funciona",
  "catalogHowItWorksSubtitle": "Subtítulo amigável explicando a simplicidade",
  "catalogHowItWorksStep1Title": "1. Escolha no Catálogo",
  "catalogHowItWorksStep1Text": "Texto explicativo do passo 1",
  "catalogHowItWorksStep2Title": "2. Envie pelo WhatsApp",
  "catalogHowItWorksStep2Text": "Texto explicativo do passo 2",
  "catalogHowItWorksStep3Title": "3. Aprovação da Arte",
  "catalogHowItWorksStep3Text": "Texto explicativo do passo 3",
  "catalogHowItWorksStep4Title": "4. Produção & Envio",
  "catalogHowItWorksStep4Text": "Texto explicativo do passo 4",
  "catalogFeaturesBadge": "Selo curto de diferenciais",
  "catalogFeaturesTitle": "Título da seção de diferenciais",
  "catalogFeature1Title": "Diferencial 1 (título)",
  "catalogFeature1Text": "Diferencial 1 (descrição)",
  "catalogFeature2Title": "Diferencial 2 (título)",
  "catalogFeature2Text": "Diferencial 2 (descrição)",
  "catalogFeature3Title": "Diferencial 3 (título)",
  "catalogFeature3Text": "Diferencial 3 (descrição)",
  "catalogFeature4Title": "Diferencial 4 (título)",
  "catalogFeature4Text": "Diferencial 4 (descrição)",
  "catalogFaqBadge": "Selo curto FAQ",
  "catalogFaqTitle": "Título da seção FAQ",
  "catalogFaq1Q": "Pergunta 1 (prazo)",
  "catalogFaq1A": "Resposta 1",
  "catalogFaq2Q": "Pergunta 2 (envio / frete)",
  "catalogFaq2A": "Resposta 2",
  "catalogFaq3Q": "Pergunta 3 (personalização de tema/nome)",
  "catalogFaq3A": "Resposta 3",
  "catalogFaq4Q": "Pergunta 4 (formas de pagamento)",
  "catalogFaq4A": "Resposta 4",
  "catalogFaq5Q": "Pergunta 5 (aprovação de prévia)",
  "catalogFaq5A": "Resposta 5"
}`;

    try {
      const response = await firebaseAiAgentService.sendMessage(prompt);
      const rawText = typeof response === 'string'
        ? response
        : (response && typeof response === 'object' && 'reply' in response)
          ? String((response as { reply?: string }).reply || '')
          : '';

      if (!rawText.trim()) {
        throw new Error('A IA não retornou conteúdo.');
      }

      const defaultFallback: Record<string, string> = {
        catalogAboutBadge: 'Sobre Nós',
        catalogAboutTitle: 'Feito à Mão com Afeto & Dedicação',
        catalogAboutText: 'Somos um ateliê apaixonado por transformar momentos especiais em memórias inesquecíveis.',
        catalogAboutPillar1Title: 'Produção Artesanal',
        catalogAboutPillar1Text: 'Cada mimo é elaborado individualmente com cuidado minucioso.',
        catalogAboutPillar2Title: 'Materiais Nobres',
        catalogAboutPillar2Text: 'Papéis de alta gramatura, laminação especial e acabamento premium.',
        catalogAboutPillar3Title: 'Afeto em Cada Detalhe',
        catalogAboutPillar3Text: 'Criamos itens personalizados com amor para encantar você e seus convidados.',
        catalogHowItWorksBadge: 'Passo a Passo',
        catalogHowItWorksTitle: 'Como Funciona sua Encomenda?',
        catalogHowItWorksSubtitle: 'Um processo simples, rápido e transparente do início à entrega',
        catalogHowItWorksStep1Title: '1. Escolha seus Mimos',
        catalogHowItWorksStep1Text: 'Navegue pelo catálogo e adicione os itens ao seu carrinho.',
        catalogHowItWorksStep2Title: '2. Envie pelo WhatsApp',
        catalogHowItWorksStep2Text: 'Finalize o pedido para enviar os detalhes direto para nossa equipe.',
        catalogHowItWorksStep3Title: '3. Prévia & Aprovação',
        catalogHowItWorksStep3Text: 'Personalizamos a arte com seu tema e enviamos para sua aprovação antes de produzir.',
        catalogHowItWorksStep4Title: '4. Confecção & Envio',
        catalogHowItWorksStep4Text: 'Produzimos com todo carinho, embalamos com segurança e despachamos com código de rastreio.',
        catalogFeaturesBadge: 'Por Que Nos Escolher',
        catalogFeaturesTitle: 'Nossos Diferenciais',
        catalogFeature1Title: 'Atendimento Humanizado',
        catalogFeature1Text: 'Suporte dedicado via WhatsApp para tirar todas as dúvidas e acompanhar seu pedido.',
        catalogFeature2Title: 'Laminação Protetora',
        catalogFeature2Text: 'Acabamento que garante cores vivas e maior durabilidade às suas peças.',
        catalogFeature3Title: 'Embalagem Reforçada',
        catalogFeature3Text: 'Seus produtos chegam intactos e impecáveis no conforto da sua casa.',
        catalogFeature4Title: 'Arte Sob Medida',
        catalogFeature4Text: 'Desenvolvemos temas exclusivos com o nome e estilo que você desejar.',
        catalogFaqBadge: 'Dúvidas Comuns',
        catalogFaqTitle: 'Perguntas Frequentes',
        catalogFaq1Q: 'Qual é o prazo médio de confecção dos personalizados?',
        catalogFaq1A: 'Nosso prazo padrão de confecção varia de 5 a 10 dias úteis após a aprovação da arte, mais o prazo do frete escolhido.',
        catalogFaq2Q: 'Vocês enviam para todo o Brasil?',
        catalogFaq2A: 'Sim! Enviamos para todo o território nacional através dos Correios e das principais transportadoras.',
        catalogFaq3Q: 'Posso personalizar com qualquer tema ou nome?',
        catalogFaq3A: 'Com certeza! Adaptamos o design com o tema, nome, idade e cores que você preferir.',
        catalogFaq4Q: 'Como funciona o pagamento?',
        catalogFaq4A: 'Aceitamos Pix (com confirmação instantânea) e Cartão de Crédito. Para encomendas personalizadas, a produção é iniciada após o pagamento.',
        catalogFaq5Q: 'Consigo ver uma prévia antes da confecção?',
        catalogFaq5A: 'Sim! Sempre enviamos a arte digital para sua conferência e aprovação antes de iniciar a impressão e montagem.',
      };

      const parsed = parseLlmJson<Record<string, string>>(rawText, defaultFallback);

      const aiPillars: InstitutionalPillarItem[] = [
        { id: 'p1', title: parsed.catalogAboutPillar1Title || 'Produção Artesanal', text: parsed.catalogAboutPillar1Text || '' },
        { id: 'p2', title: parsed.catalogAboutPillar2Title || 'Materiais Nobres', text: parsed.catalogAboutPillar2Text || '' },
        { id: 'p3', title: parsed.catalogAboutPillar3Title || 'Afeto em Cada Detalhe', text: parsed.catalogAboutPillar3Text || '' },
      ];

      const aiSteps: InstitutionalStepItem[] = [
        { id: 's1', title: parsed.catalogHowItWorksStep1Title || '1. Escolha seus Mimos', text: parsed.catalogHowItWorksStep1Text || '' },
        { id: 's2', title: parsed.catalogHowItWorksStep2Title || '2. Envie pelo WhatsApp', text: parsed.catalogHowItWorksStep2Text || '' },
        { id: 's3', title: parsed.catalogHowItWorksStep3Title || '3. Prévia & Aprovação', text: parsed.catalogHowItWorksStep3Text || '' },
        { id: 's4', title: parsed.catalogHowItWorksStep4Title || '4. Confecção & Envio', text: parsed.catalogHowItWorksStep4Text || '' },
      ];

      const aiFeatures: InstitutionalFeatureItem[] = [
        { id: 'f1', title: parsed.catalogFeature1Title || 'Atendimento Humanizado', text: parsed.catalogFeature1Text || '' },
        { id: 'f2', title: parsed.catalogFeature2Title || 'Laminação Protetora', text: parsed.catalogFeature2Text || '' },
        { id: 'f3', title: parsed.catalogFeature3Title || 'Embalagem Reforçada', text: parsed.catalogFeature3Text || '' },
        { id: 'f4', title: parsed.catalogFeature4Title || 'Arte Sob Medida', text: parsed.catalogFeature4Text || '' },
      ];

      const aiFaqs: InstitutionalFaqItem[] = [
        { id: 'faq1', question: parsed.catalogFaq1Q || 'Qual é o prazo médio de produção?', answer: parsed.catalogFaq1A || '' },
        { id: 'faq2', question: parsed.catalogFaq2Q || 'Vocês enviam para todo o Brasil?', answer: parsed.catalogFaq2A || '' },
        { id: 'faq3', question: parsed.catalogFaq3Q || 'Posso personalizar com qualquer tema ou nome?', answer: parsed.catalogFaq3A || '' },
        { id: 'faq4', question: parsed.catalogFaq4Q || 'Como funciona o pagamento?', answer: parsed.catalogFaq4A || '' },
        { id: 'faq5', question: parsed.catalogFaq5Q || 'Consigo ver uma prévia antes da confecção?', answer: parsed.catalogFaq5A || '' },
      ];

      setFormData((prev) => ({
        ...prev,
        catalogShowAbout: true,
        catalogAboutBadge: parsed.catalogAboutBadge || 'Sobre Nós',
        catalogAboutTitle: parsed.catalogAboutTitle || 'Feito à Mão com Afeto & Dedicação',
        catalogAboutText: parsed.catalogAboutText || prev.catalogAboutText,
        catalogAboutPillars: aiPillars,
        catalogAboutPillar1Title: aiPillars[0].title,
        catalogAboutPillar1Text: aiPillars[0].text,
        catalogAboutPillar2Title: aiPillars[1].title,
        catalogAboutPillar2Text: aiPillars[1].text,
        catalogAboutPillar3Title: aiPillars[2].title,
        catalogAboutPillar3Text: aiPillars[2].text,

        catalogShowHowItWorks: true,
        catalogHowItWorksBadge: parsed.catalogHowItWorksBadge || 'Passo a Passo',
        catalogHowItWorksTitle: parsed.catalogHowItWorksTitle || 'Como Funciona sua Encomenda?',
        catalogHowItWorksSubtitle: parsed.catalogHowItWorksSubtitle || 'Um processo simples e transparente',
        catalogHowItWorksSteps: aiSteps,
        catalogHowItWorksStep1Title: aiSteps[0].title,
        catalogHowItWorksStep1Text: aiSteps[0].text,
        catalogHowItWorksStep2Title: aiSteps[1].title,
        catalogHowItWorksStep2Text: aiSteps[1].text,
        catalogHowItWorksStep3Title: aiSteps[2].title,
        catalogHowItWorksStep3Text: aiSteps[2].text,
        catalogHowItWorksStep4Title: aiSteps[3].title,
        catalogHowItWorksStep4Text: aiSteps[3].text,

        catalogShowFeatures: true,
        catalogFeaturesBadge: parsed.catalogFeaturesBadge || 'Diferenciais do Ateliê',
        catalogFeaturesTitle: parsed.catalogFeaturesTitle || 'Por que escolher nosso ateliê?',
        catalogFeatureItems: aiFeatures,
        catalogFeature1Title: aiFeatures[0].title,
        catalogFeature1Text: aiFeatures[0].text,
        catalogFeature2Title: aiFeatures[1].title,
        catalogFeature2Text: aiFeatures[1].text,
        catalogFeature3Title: aiFeatures[2].title,
        catalogFeature3Text: aiFeatures[2].text,
        catalogFeature4Title: aiFeatures[3].title,
        catalogFeature4Text: aiFeatures[3].text,

        catalogShowFaq: true,
        catalogFaqBadge: parsed.catalogFaqBadge || 'Tire suas Dúvidas',
        catalogFaqTitle: parsed.catalogFaqTitle || 'Perguntas Frequentes (FAQ)',
        catalogFaqItems: aiFaqs,
        catalogFaq1Q: aiFaqs[0].question,
        catalogFaq1A: aiFaqs[0].answer,
        catalogFaq2Q: aiFaqs[1].question,
        catalogFaq2A: aiFaqs[1].answer,
        catalogFaq3Q: aiFaqs[2].question,
        catalogFaq3A: aiFaqs[2].answer,
        catalogFaq4Q: aiFaqs[3].question,
        catalogFaq4A: aiFaqs[3].answer,
        catalogFaq5Q: aiFaqs[4].question,
        catalogFaq5A: aiFaqs[4].answer,
      }));

      setShowAiModal(false);
      toast.success('✨ Conteúdo gerado com IA com sucesso! Revise os campos e clique em Salvar Alterações.');
    } catch (err) {
      console.warn('Erro ou indisponibilidade da IA:', err);
      fillInstitutionalDefaults();
      setShowAiModal(false);
      toast.info('A IA está temporariamente indisponível. Aplicamos as sugestões manuais padrão para você não perder tempo!');
    } finally {
      setGeneratingAi(false);
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
    if (!canEdit) {
      toast.error('Você não tem permissão para salvar personalizações da loja.');
      return;
    }
    setSaving(true);
    try {
      // Sincroniza campos legados para retrocompatibilidade
      const p1 = formData.catalogAboutPillars[0] || { title: '', text: '' };
      const p2 = formData.catalogAboutPillars[1] || { title: '', text: '' };
      const p3 = formData.catalogAboutPillars[2] || { title: '', text: '' };

      const s1 = formData.catalogHowItWorksSteps[0] || { title: '', text: '' };
      const s2 = formData.catalogHowItWorksSteps[1] || { title: '', text: '' };
      const s3 = formData.catalogHowItWorksSteps[2] || { title: '', text: '' };
      const s4 = formData.catalogHowItWorksSteps[3] || { title: '', text: '' };

      const f1 = formData.catalogFeatureItems[0] || { title: '', text: '' };
      const f2 = formData.catalogFeatureItems[1] || { title: '', text: '' };
      const f3 = formData.catalogFeatureItems[2] || { title: '', text: '' };
      const f4 = formData.catalogFeatureItems[3] || { title: '', text: '' };

      const faq1 = formData.catalogFaqItems[0] || { question: '', answer: '' };
      const faq2 = formData.catalogFaqItems[1] || { question: '', answer: '' };
      const faq3 = formData.catalogFaqItems[2] || { question: '', answer: '' };
      const faq4 = formData.catalogFaqItems[3] || { question: '', answer: '' };
      const faq5 = formData.catalogFaqItems[4] || { question: '', answer: '' };

      const payload = {
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
        catalogPrimaryColor: formData.catalogPrimaryColor,
        catalogButtonRadius: formData.catalogButtonRadius,
        catalogButtonStyle: formData.catalogButtonStyle,

        // 1. Quem Somos
        catalogShowAbout: Boolean(formData.catalogShowAbout),
        catalogAboutBadge: formData.catalogAboutBadge,
        catalogAboutTitle: formData.catalogAboutTitle,
        catalogAboutText: formData.catalogAboutText,
        catalogAboutImageUrl: currentCatalogAboutImage || '',
        catalogAboutPillars: formData.catalogAboutPillars,
        catalogAboutPillar1Title: p1.title,
        catalogAboutPillar1Text: p1.text,
        catalogAboutPillar2Title: p2.title,
        catalogAboutPillar2Text: p2.text,
        catalogAboutPillar3Title: p3.title,
        catalogAboutPillar3Text: p3.text,

        // 2. Como Funciona
        catalogShowHowItWorks: Boolean(formData.catalogShowHowItWorks),
        catalogHowItWorksBadge: formData.catalogHowItWorksBadge,
        catalogHowItWorksTitle: formData.catalogHowItWorksTitle,
        catalogHowItWorksSubtitle: formData.catalogHowItWorksSubtitle,
        catalogHowItWorksSteps: formData.catalogHowItWorksSteps,
        catalogHowItWorksStep1Title: s1.title,
        catalogHowItWorksStep1Text: s1.text,
        catalogHowItWorksStep2Title: s2.title,
        catalogHowItWorksStep2Text: s2.text,
        catalogHowItWorksStep3Title: s3.title,
        catalogHowItWorksStep3Text: s3.text,
        catalogHowItWorksStep4Title: s4.title,
        catalogHowItWorksStep4Text: s4.text,

        // 3. Diferenciais
        catalogShowFeatures: Boolean(formData.catalogShowFeatures),
        catalogFeaturesBadge: formData.catalogFeaturesBadge,
        catalogFeaturesTitle: formData.catalogFeaturesTitle,
        catalogFeatureItems: formData.catalogFeatureItems,
        catalogFeature1Title: f1.title,
        catalogFeature1Text: f1.text,
        catalogFeature2Title: f2.title,
        catalogFeature2Text: f2.text,
        catalogFeature3Title: f3.title,
        catalogFeature3Text: f3.text,
        catalogFeature4Title: f4.title,
        catalogFeature4Text: f4.text,

        // 4. FAQ
        catalogShowFaq: Boolean(formData.catalogShowFaq),
        catalogFaqBadge: formData.catalogFaqBadge,
        catalogFaqTitle: formData.catalogFaqTitle,
        catalogFaqItems: formData.catalogFaqItems,
        catalogFaq1Q: faq1.question,
        catalogFaq1A: faq1.answer,
        catalogFaq2Q: faq2.question,
        catalogFaq2A: faq2.answer,
        catalogFaq3Q: faq3.question,
        catalogFaq3A: faq3.answer,
        catalogFaq4Q: faq4.question,
        catalogFaq4A: faq4.answer,
        catalogFaq5Q: faq5.question,
        catalogFaq5A: faq5.answer,

        // 5. Seções Extras Customizadas
        catalogCustomSections: formData.catalogCustomSections,

        storePublished,
        storeUnpublishMessage,
        featureFlags,
      };

      await updateSettings(payload);
      if (pendingBannerImageDeletes.length > 0) {
        await Promise.all(pendingBannerImageDeletes.map((url) => deleteCatalogBannerImage(url)));
        setPendingBannerImageDeletes([]);
      }

      // Salva no cache do navegador para a lojinha atualizar instantaneamente
      try {
        const publicData = {
          ...payload,
          name: formData.catalogStoreName || 'Luisices Papelaria Personalizada',
          businessName: formData.catalogStoreName || 'Luisices Papelaria Personalizada',
          tagline: formData.catalogStoreTagline,
          businessTagline: formData.catalogStoreTagline,
          whatsapp: formData.catalogWhatsappPhone,
          instagram: formData.instagramUrl ? formData.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '') : '',
          instagramColab: formData.instagramColabUrl ? formData.instagramColabUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '') : '',
          logo: currentCatalogLogo || '',
          banner: catalogBanners[0]?.imageUrl || currentCatalogBanner || '',
          catalogBanner: catalogBanners[0]?.imageUrl || currentCatalogBanner || '',
          banners: catalogBanners,
          bannerInterval: catalogBannerInterval,
          bannerAutoPlay: catalogBannerAutoPlay,
          bannerFixed: Boolean(formData.catalogBannerFixed),
          headerBackground: currentCatalogHeaderBackground || '',
          showHero: Boolean(formData.catalogShowHero),
          catalogPrimaryColor: formData.catalogPrimaryColor,
          catalogButtonRadius: formData.catalogButtonRadius,
          catalogButtonStyle: formData.catalogButtonStyle,
          whatsappGreeting: formData.catalogWhatsappGreeting,
          whatsappCustomizationLabel: formData.catalogWhatsappCustomizationLabel,
          whatsappFooter: formData.catalogWhatsappFooter,
          footerText: formData.catalogFooterText,
          footerLocation: formData.catalogFooterLocation,
          footerBusinessHours: formData.catalogFooterBusinessHours,
          footerNotice: formData.catalogFooterNotice,
          footerCopyright: formData.catalogFooterCopyright,
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

            <button
              type="button"
              disabled={togglingSales}
              onClick={() => handleToggleSales(featureFlags.enableOnlineOrders === false)}
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                featureFlags.enableOnlineOrders !== false
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
              } ${togglingSales ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Pausar ou ativar vendas de todo o catálogo de uma vez"
            >
              <span className={`size-2 rounded-full ${featureFlags.enableOnlineOrders !== false ? "bg-blue-500 animate-pulse" : "bg-amber-500"}`} />
              <span>{featureFlags.enableOnlineOrders !== false ? "Vendas Ativas" : "Vendas Pausadas"}</span>
              <span className="text-[10px] opacity-75 underline ml-1">
                {togglingSales ? "Salvando..." : featureFlags.enableOnlineOrders !== false ? "Pausar Vendas" : "Retomar Vendas"}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Formulário com Abas (2 Colunas) */}
        <div className="w-full space-y-6">
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
              <StoreIdentityTab
                formData={formData}
                handleChange={handleChange}
                catalogBanners={catalogBanners}
                catalogBannerAutoPlay={catalogBannerAutoPlay}
                setCatalogBannerAutoPlay={setCatalogBannerAutoPlay}
                catalogBannerInterval={catalogBannerInterval}
                setCatalogBannerInterval={setCatalogBannerInterval}
                uploadingBanner={uploadingBanner}
                handleAddBanner={handleAddBanner}
                handleRemoveBanner={handleRemoveBanner}
                handleUpdateBannerField={handleUpdateBannerField}
                handleMoveBanner={handleMoveBanner}
                currentCatalogLogo={currentCatalogLogo}
                uploadingLogo={uploadingLogo}
                handleLogoUpload={handleLogoUpload}
                handleLogoRemove={handleLogoRemove}
                currentCatalogHeaderBackground={currentCatalogHeaderBackground}
                uploadingHeaderBackground={uploadingHeaderBackground}
                handleHeaderBackgroundUpload={handleHeaderBackgroundUpload}
                handleHeaderBackgroundRemove={handleHeaderBackgroundRemove}
              />
            </TabsContent>

            {/* ABA: Institucional & Sobre (Modular & Toggles) */}
            <TabsContent value="institutional" className="space-y-5 pt-3">
              <StoreInstitutionalTab
                formData={formData}
                handleChange={handleChange}
                setFormData={setFormData}
                fillInstitutionalDefaults={fillInstitutionalDefaults}
                setShowAiModal={setShowAiModal}
                currentCatalogAboutImage={currentCatalogAboutImage}
                uploadingAboutImage={uploadingAboutImage}
                handleAboutImageUpload={handleAboutImageUpload}
                handleAboutImageRemove={handleAboutImageRemove}
              />
            </TabsContent>

            {/* ABA: WhatsApp & Checkout */}
            <TabsContent value="whatsapp" className="space-y-5 pt-3">
              <StoreWhatsappTab
                formData={formData}
                handleChange={handleChange}
              />
            </TabsContent>

            {/* ABA: Rodapé & Políticas */}
            <TabsContent value="footer" className="space-y-5 pt-3">
              <StoreFooterTab
                formData={formData}
                handleChange={handleChange}
              />
            </TabsContent>

            {/* ABA: Loja & Contato */}
            <TabsContent value="contact" className="space-y-5 pt-3">
              <StoreContactTab
                formData={formData}
                handleChange={handleChange}
                currentCatalogLogo={currentCatalogLogo}
                setActiveTab={setActiveTab}
                formatPhoneForDisplay={formatPhoneForDisplay}
              />
            </TabsContent>

            {/* ABA: Operação — Publicação & Feature Flags */}
            <TabsContent value="operations" className="space-y-5 pt-3">
              <StoreOperationsTab
                formData={formData}
                handleChange={handleChange}
                storePublished={storePublished}
                togglingPublished={togglingPublished}
                handleTogglePublished={handleTogglePublished}
                storeUnpublishMessage={storeUnpublishMessage}
                setStoreUnpublishMessage={setStoreUnpublishMessage}
                featureFlags={featureFlags}
                setFeatureFlags={setFeatureFlags}
              />
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
        <div className="hidden">
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

      {/* Modal de Sugestão Institucional com IA */}
      <StoreAiInstitutionalModal
        isOpen={showAiModal}
        onOpenChange={setShowAiModal}
        aiNiche={aiNiche}
        setAiNiche={setAiNiche}
        aiCustomContext={aiCustomContext}
        setAiCustomContext={setAiCustomContext}
        storeName={formData.catalogStoreName}
        generatingAi={generatingAi}
        handleGenerateWithAi={handleGenerateWithAi}
        fillInstitutionalDefaults={fillInstitutionalDefaults}
      />
    </div>
  );
}

export default StoreCustomization;

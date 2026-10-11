import {
  InstitutionalPillarItem,
  InstitutionalStepItem,
  InstitutionalFeatureItem,
  InstitutionalFaqItem,
  InstitutionalCustomSection,
} from '../../../services/firebaseSettingsService';

export interface StoreCustomizationFormData {
  catalogStoreName: string;
  catalogStoreTagline: string;
  catalogWhatsappPhone: string;
  instagramUrl: string;
  instagramColabUrl: string;
  websiteUrl: string;
  catalogBadge: string;
  catalogStatusText: string;
  catalogHeroTitle: string;
  catalogHeroDescription: string;
  catalogAnnouncement: string;
  catalogWhatsappGreeting: string;
  catalogWhatsappCustomizationLabel: string;
  catalogWhatsappFooter: string;
  catalogFooterText: string;
  catalogFooterLocation: string;
  catalogFooterBusinessHours: string;
  catalogFooterCopyright: string;
  catalogFooterNotice: string;
  catalogBannerFixed: boolean;
  catalogHeaderBgColor: string;
  catalogHeaderTextColor: 'dark' | 'light';
  catalogHeaderLogoPosition: 'left' | 'center' | 'full';
  catalogHeaderHeight: 'compact' | 'normal' | 'large';
  catalogHeaderHideText: boolean;
  catalogShowHero: boolean;
  catalogCategoryFilterStyle: 'dropdown' | 'carousel' | 'bottom_sheet';
  catalogCardDensity: 'compact' | 'editorial';
  catalogImageAspect: 'square' | 'portrait';
  catalogShowBadgeCustomizable: boolean;
  catalogShowBadgeLeadTime: boolean;
  catalogShowBadgeBestSeller: boolean;
  catalogShowBadgeNew: boolean;
  catalogStoreMode: 'cart' | 'direct_inquiry' | 'portfolio';
  catalogShowFloatingWhatsApp: boolean;
  catalogFloatingWhatsAppText: string;
  catalogPixDiscountText: string;
  catalogAdvanceNoticeText: string;
  catalogMinOrderAmount: number;
  catalogBackgroundStyle: 'atmospheric' | 'solid';
  catalogTypographyStyle: 'modern' | 'editorial';
  catalogDefaultSort: 'destaque' | 'preco-menor' | 'preco-maior' | 'nome-az' | 'prazo';
  catalogPrimaryColor: string;
  catalogButtonRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  catalogButtonStyle: 'solid' | 'soft' | 'outline';
  catalogProductsPerPage: number;

  // Seção 1: Quem Somos / Sobre o Ateliê
  catalogShowAbout: boolean;
  catalogAboutBadge: string;
  catalogAboutTitle: string;
  catalogAboutText: string;
  catalogAboutPillar1Title: string;
  catalogAboutPillar1Text: string;
  catalogAboutPillar2Title: string;
  catalogAboutPillar2Text: string;
  catalogAboutPillar3Title: string;
  catalogAboutPillar3Text: string;

  // Seção 2: Como Funciona a Encomenda
  catalogShowHowItWorks: boolean;
  catalogHowItWorksBadge: string;
  catalogHowItWorksTitle: string;
  catalogHowItWorksSubtitle: string;
  catalogHowItWorksStep1Title: string;
  catalogHowItWorksStep1Text: string;
  catalogHowItWorksStep2Title: string;
  catalogHowItWorksStep2Text: string;
  catalogHowItWorksStep3Title: string;
  catalogHowItWorksStep3Text: string;
  catalogHowItWorksStep4Title: string;
  catalogHowItWorksStep4Text: string;

  // Seção 3: Diferenciais da Marca
  catalogShowFeatures: boolean;
  catalogFeaturesBadge: string;
  catalogFeaturesTitle: string;
  catalogFeature1Title: string;
  catalogFeature1Text: string;
  catalogFeature2Title: string;
  catalogFeature2Text: string;
  catalogFeature3Title: string;
  catalogFeature3Text: string;
  catalogFeature4Title: string;
  catalogFeature4Text: string;

  // Seção 4: Dúvidas Frequentes (FAQ)
  catalogShowFaq: boolean;
  catalogFaqBadge: string;
  catalogFaqTitle: string;
  catalogFaq1Q: string;
  catalogFaq1A: string;
  catalogFaq2Q: string;
  catalogFaq2A: string;
  catalogFaq3Q: string;
  catalogFaq3A: string;
  catalogFaq4Q: string;
  catalogFaq4A: string;
  catalogFaq5Q: string;
  catalogFaq5A: string;

  // Listas Dinâmicas / Itens Expansíveis
  catalogAboutPillars: InstitutionalPillarItem[];
  catalogHowItWorksSteps: InstitutionalStepItem[];
  catalogFeatureItems: InstitutionalFeatureItem[];
  catalogFaqItems: InstitutionalFaqItem[];
  catalogCustomSections: InstitutionalCustomSection[];
}

export type StoreCustomizationHandleChange = (field: any, value: any) => void;

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

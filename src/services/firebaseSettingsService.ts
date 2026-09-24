/**
 * Firebase Settings Service
 *
 * Serviço para gerenciar configurações e personalização do usuário
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface CatalogBannerItem {
  id: string;
  imageUrl: string;
  title?: string;
  linkUrl?: string;
}

export interface InstitutionalPillarItem {
  id: string;
  title: string;
  text: string;
}

export interface InstitutionalStepItem {
  id: string;
  title: string;
  text: string;
}

export interface InstitutionalFeatureItem {
  id: string;
  title: string;
  text: string;
}

export interface InstitutionalFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface InstitutionalCustomSection {
  id: string;
  title: string;
  badge?: string;
  content: string;
}

export interface UserSettings {
  userId: string;

  // Personalização visual
  avatar?: string; // URL da imagem
  logo?: string; // URL da logo
  banner?: string; // URL do banner

  // Informações do negócio
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  businessNumber?: string;
  businessComplement?: string;
  businessZipCode?: string;
  businessCity?: string;
  businessState?: string;

  // Identidade do negócio
  businessTagline?: string;      // Slogan exibido no cabeçalho
  instagramUrl?: string;         // Link para o Instagram
  instagramColabUrl?: string;    // Link para o Instagram de Parceria / Colab
  websiteUrl?: string;           // Link para o site
  whatsappPhone?: string;        // Número WhatsApp (ex: 5511999999999)

  // Tema e cores
  primaryColor?: string;
  accentColor?: string;
  colorTheme?: 'default' | 'rose' | 'purple' | 'blue' | 'green' | 'orange' | 'custom';
  customColorHex?: string;       // Cor hex personalizada quando colorTheme === 'custom'

  // Preferências de exibição
  compactCards?: boolean;

  // WhatsApp template
  whatsappGreeting?: string;   // Ex: "Olá {nome}! Segue o orçamento *{numero}*:"
  whatsappSignature?: string;  // Ex: "Atenciosamente, Papelaria XYZ"

  // Dashboard preferences
  dashboardCards?: string[];
  defaultReportPeriod?: 'week' | 'month' | 'quarter' | 'year';
  navOrder?: string[]; // hrefs na ordem desejada

  // Operação padrão
  defaultDeliveryDays?: number;  // Dias à frente para pré-preencher data de entrega
  defaultPaymentMethod?: string; // Método de pagamento padrão ao criar pedido

  // Alertas
  deliveryAlertDays?: number;    // Dias antes do prazo para mostrar alerta (padrão 3)

  // Customizações do Catálogo Online Público (Lojinha)
  catalogStoreName?: string;                 // Nome exclusivo da lojinha pública online (desacoplado do businessName do painel)
  catalogStoreTagline?: string;              // Slogan/Subtítulo exclusivo da lojinha pública online (desacoplado do painel)
  catalogWhatsappPhone?: string;             // WhatsApp exclusivo de recebimento de pedidos da Lojinha (segregado do ateliê)
  catalogLogo?: string;                      // Logo exclusivo da lojinha pública online (independente do painel)
  catalogBanner?: string;                    // Banner de capa exclusivo da lojinha pública online (formato LinkedIn / 4:1)
  catalogBanners?: CatalogBannerItem[];       // Lista de banners rotativos (estilo propaganda)
  catalogBannerInterval?: number;            // Tempo de transição em segundos (ex: 3, 5, 7, 10)
  catalogBannerAutoPlay?: boolean;           // Rotação automática ativa (autoplay)
  catalogBannerFixed?: boolean;              // Efeito Parallax/Vitrine: banner fixo ao fundo com produtos rolando por cima
  // Personalização da Barra Superior Fixa (Header)
  catalogHeaderBackground?: string;          // Imagem de fundo que preenche toda a barra superior fixa
  catalogHeaderBgColor?: string;             // Cor de fundo personalizada da barra superior (hex, ex: #ffffff, #fceee9, etc.)
  catalogHeaderTextColor?: 'dark' | 'light'; // Contraste dos elementos (escuro para fundos claros, claro para fundos escuros)
  catalogHeaderLogoPosition?: 'left' | 'center' | 'full'; // Posição da logo na barra (esquerda, centro ou ocupando a barra)
  catalogHeaderHeight?: 'compact' | 'normal' | 'large'; // Altura da barra fixa (compact: 60px, normal: 74px, large: 90px)
  catalogHeaderHideText?: boolean;           // Ocultar texto do nome caso a logo já contenha o nome
  catalogShowHero?: boolean;                 // Exibir ou ocultar cartão de apresentação/vitrine (hero)

  catalogBadge?: string;                      // Selo no header (ex: "Atelier", "Papelaria Afetiva")
  catalogStatusText?: string;                // Texto do status (ex: "Atendimento WhatsApp ativo")
  catalogHeroTitle?: string;                 // Título no banner principal (ex: "Catálogo & Vitrine Afetiva")
  catalogHeroDescription?: string;           // Texto explicativo no hero
  catalogAnnouncement?: string;              // Faixa de aviso/alerta no topo da página
  catalogWhatsappGreeting?: string;          // Saudação inicial do pedido no WhatsApp
  catalogWhatsappCustomizationLabel?: string;// Rótulo de personalização (ex: "Nome/Personalização:")
  catalogWhatsappFooter?: string;            // Fechamento da mensagem do WhatsApp
  catalogFooterText?: string;                // Texto afetivo/institucional no rodapé
  catalogFooterLocation?: string;            // Localização e frete no rodapé
  catalogFooterBusinessHours?: string;       // Horário de atendimento no rodapé
  catalogFooterCopyright?: string;           // Linha de copyright no rodapé
  catalogFooterNotice?: string;              // Aviso sobre prazos e políticas no rodapé

  // Seções Institucionais & Quem Somos (Modular / Toggles)
  // 1. Quem Somos / Sobre o Ateliê
  catalogShowAbout?: boolean;
  catalogAboutBadge?: string;
  catalogAboutTitle?: string;
  catalogAboutText?: string;
  catalogAboutImageUrl?: string;
  catalogAboutPillar1Title?: string;
  catalogAboutPillar1Text?: string;
  catalogAboutPillar2Title?: string;
  catalogAboutPillar2Text?: string;
  catalogAboutPillar3Title?: string;
  catalogAboutPillar3Text?: string;

  // 2. Como Funciona a Encomenda
  catalogShowHowItWorks?: boolean;
  catalogHowItWorksBadge?: string;
  catalogHowItWorksTitle?: string;
  catalogHowItWorksSubtitle?: string;
  catalogHowItWorksStep1Title?: string;
  catalogHowItWorksStep1Text?: string;
  catalogHowItWorksStep2Title?: string;
  catalogHowItWorksStep2Text?: string;
  catalogHowItWorksStep3Title?: string;
  catalogHowItWorksStep3Text?: string;
  catalogHowItWorksStep4Title?: string;
  catalogHowItWorksStep4Text?: string;

  // 3. Diferenciais da Marca
  catalogShowFeatures?: boolean;
  catalogFeaturesBadge?: string;
  catalogFeaturesTitle?: string;
  catalogFeature1Title?: string;
  catalogFeature1Text?: string;
  catalogFeature2Title?: string;
  catalogFeature2Text?: string;
  catalogFeature3Title?: string;
  catalogFeature3Text?: string;
  catalogFeature4Title?: string;
  catalogFeature4Text?: string;

  // 4. Dúvidas Frequentes (FAQ)
  catalogShowFaq?: boolean;
  catalogFaqBadge?: string;
  catalogFaqTitle?: string;
  catalogFaq1Q?: string;
  catalogFaq1A?: string;
  catalogFaq2Q?: string;
  catalogFaq2A?: string;
  catalogFaq3Q?: string;
  catalogFaq3A?: string;
  catalogFaq4Q?: string;
  catalogFaq4A?: string;
  catalogFaq5Q?: string;
  catalogFaq5A?: string;

  // Listas Dinâmicas / Itens Expansíveis (Botão + Adicionar / Remover)
  catalogAboutPillars?: InstitutionalPillarItem[];
  catalogHowItWorksSteps?: InstitutionalStepItem[];
  catalogFeatureItems?: InstitutionalFeatureItem[];
  catalogFaqItems?: InstitutionalFaqItem[];
  catalogCustomSections?: InstitutionalCustomSection[];

  // Publicação e Feature Flags
  storePublished?: boolean;                  // Loja publicada (true) ou despublicada (false) — controle de visibilidade
  storeUnpublishMessage?: string;            // Mensagem personalizada exibida quando a loja está despublicada
  featureFlags?: Record<string, boolean>;    // Feature toggles genéricos (ex: enableOnlineOrders, enableDarkMode, enableCoupons)

  // Metadata
  updatedAt: Date;
}

export class FirebaseSettingsService {
  /**
   * Obter configurações do usuário
   */
  async getSettings(userId: string): Promise<UserSettings | null> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const rawDate = data.updatedAt;
      const updatedAt = typeof rawDate?.toDate === 'function' 
        ? rawDate.toDate() 
        : (rawDate ? new Date(rawDate) : new Date());

      return {
        ...data,
        updatedAt,
      } as UserSettings;
    }

    return null;
  }

  /**
   * Atualizar configurações do usuário
   */
    /**
   * Alternar publicação da loja (publicada / despublicada)
   * Atualiza imediatamente em users/{userId}/settings/profile e storeSettings/public.
   */
  async toggleStorePublished(
    userId: string,
    storePublished: boolean,
    storeUnpublishMessage?: string
  ): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    const updatePayload: Record<string, any> = {
      storePublished,
      updatedAt: new Date(),
    };
    if (storeUnpublishMessage !== undefined) {
      updatePayload.storeUnpublishMessage = storeUnpublishMessage;
    }
    await setDoc(docRef, updatePayload, { merge: true });

    try {
      const publicPayload: Record<string, any> = {
        storePublished,
        updatedAt: new Date(),
      };
      if (storeUnpublishMessage !== undefined) {
        publicPayload.storeUnpublishMessage = storeUnpublishMessage;
      }
      await setDoc(doc(db, 'storeSettings', 'public'), publicPayload, { merge: true });
    } catch (e) {
      console.warn('Erro ao sincronizar storePublished na storeSettings pública:', e);
    }
  }

  async updateSettings(
    userId: string,
    settings: Partial<Omit<UserSettings, 'userId' | 'updatedAt'>>
  ): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');

    const cleanSettings: Record<string, any> = { ...settings };
    if (settings.catalogWhatsappPhone === '' || settings.catalogWhatsappPhone === null) cleanSettings.catalogWhatsappPhone = null;
    if (settings.catalogLogo === '' || settings.catalogLogo === null) cleanSettings.catalogLogo = null;
    if (settings.catalogHeaderBackground === '' || settings.catalogHeaderBackground === null) cleanSettings.catalogHeaderBackground = null;
    if (settings.catalogBanner === '' || settings.catalogBanner === null) cleanSettings.catalogBanner = null;
    if (settings.catalogBanners !== undefined && settings.catalogBanners.length === 0) cleanSettings.catalogBanners = null;

    const data = {
      ...cleanSettings,
      userId,
      updatedAt: new Date(),
    };

    await setDoc(docRef, data, { merge: true });

    // Sincronizar dados públicos da loja para o catálogo online público.
    // IMPORTANTE: apenas campos exclusivos da lojinha (catalog*) são sincronizados para storeSettings/public.
    // Campos do painel (businessName, businessTagline, whatsappPhone, instagramUrl, websiteUrl) NÃO
    // vazam para a lojinha — a lojinha gerencia seus próprios valores de forma independente via StoreCustomization.
    try {
      const publicData: Record<string, any> = { updatedAt: new Date() };

      // Somente sincroniza dados de identidade/contato quando o save vem da tela da Lojinha
      // (StoreCustomization), identificado pela presença de ao menos um campo catalog*.
      const hasCatalogFields = Object.keys(settings).some((key) => key.startsWith('catalog'));
      // Sincroniza nome e identidade exclusivos da lojinha pública online
      if (settings.catalogStoreName !== undefined) {
        publicData.catalogStoreName = settings.catalogStoreName;
        publicData.name = settings.catalogStoreName;
        publicData.businessName = settings.catalogStoreName;
      }
      if (settings.catalogStoreTagline !== undefined) {
        publicData.catalogStoreTagline = settings.catalogStoreTagline;
        publicData.tagline = settings.catalogStoreTagline;
        publicData.businessTagline = settings.catalogStoreTagline;
      }
      if (hasCatalogFields) {
        if (settings.instagramUrl !== undefined) publicData.instagramUrl = settings.instagramUrl;
        if (settings.instagramColabUrl !== undefined) publicData.instagramColabUrl = settings.instagramColabUrl;
        if (settings.websiteUrl !== undefined) publicData.websiteUrl = settings.websiteUrl;
      }

      // WhatsApp exclusivo da lojinha pública online — sem fallback para o painel.
      if (settings.catalogWhatsappPhone !== undefined) {
        if (settings.catalogWhatsappPhone && settings.catalogWhatsappPhone.trim() !== '') {
          publicData.catalogWhatsappPhone = settings.catalogWhatsappPhone;
          publicData.whatsappPhone = settings.catalogWhatsappPhone;
        } else {
          publicData.catalogWhatsappPhone = null;
          publicData.whatsappPhone = null;
        }
      }
      
      // Logo exclusivo da lojinha pública online (não usa o logo interno do painel)
      if (settings.catalogLogo !== undefined) {
        if (settings.catalogLogo && settings.catalogLogo.trim() !== '') {
          publicData.catalogLogo = settings.catalogLogo;
        } else {
          publicData.catalogLogo = null;
          publicData.logo = null; // Limpa resquício de logo legado no catálogo público
        }
      }

      // Banner exclusivo da lojinha pública online (formato LinkedIn / 4:1)
      if (settings.catalogBanner !== undefined) {
        if (settings.catalogBanner && settings.catalogBanner.trim() !== '') {
          publicData.catalogBanner = settings.catalogBanner;
        } else {
          publicData.catalogBanner = null;
        }
      }

      if (settings.catalogBannerFixed !== undefined) {
        publicData.catalogBannerFixed = Boolean(settings.catalogBannerFixed);
      }

      // Personalização da Barra Superior Fixa
      if (settings.catalogHeaderBackground !== undefined) {
        publicData.catalogHeaderBackground = settings.catalogHeaderBackground && settings.catalogHeaderBackground.trim() !== ''
          ? settings.catalogHeaderBackground
          : null;
      }
      if (settings.catalogHeaderBgColor !== undefined) publicData.catalogHeaderBgColor = settings.catalogHeaderBgColor;
      if (settings.catalogHeaderTextColor !== undefined) publicData.catalogHeaderTextColor = settings.catalogHeaderTextColor;
      if (settings.catalogHeaderLogoPosition !== undefined) publicData.catalogHeaderLogoPosition = settings.catalogHeaderLogoPosition;
      if (settings.catalogHeaderHeight !== undefined) publicData.catalogHeaderHeight = settings.catalogHeaderHeight;
      if (settings.catalogHeaderHideText !== undefined) publicData.catalogHeaderHideText = settings.catalogHeaderHideText;

      // Banners Rotativos (Carrossel / Propaganda)
      if (settings.catalogBanners !== undefined) {
        publicData.catalogBanners = settings.catalogBanners.length > 0 ? settings.catalogBanners : null;
      }
      if (settings.catalogBannerInterval !== undefined) {
        publicData.catalogBannerInterval = settings.catalogBannerInterval;
      }
      if (settings.catalogBannerAutoPlay !== undefined) {
        publicData.catalogBannerAutoPlay = settings.catalogBannerAutoPlay;
      }

      // Customizações da Lojinha / Catálogo
      if (settings.catalogBadge !== undefined) publicData.catalogBadge = settings.catalogBadge;
      if (settings.catalogStatusText !== undefined) publicData.catalogStatusText = settings.catalogStatusText;
      if (settings.catalogHeroTitle !== undefined) publicData.catalogHeroTitle = settings.catalogHeroTitle;
      if (settings.catalogHeroDescription !== undefined) publicData.catalogHeroDescription = settings.catalogHeroDescription;
      if (settings.catalogShowHero !== undefined) publicData.catalogShowHero = settings.catalogShowHero;
      if (settings.catalogAnnouncement !== undefined) publicData.catalogAnnouncement = settings.catalogAnnouncement;
      if (settings.catalogWhatsappGreeting !== undefined) publicData.catalogWhatsappGreeting = settings.catalogWhatsappGreeting;
      if (settings.catalogWhatsappCustomizationLabel !== undefined) publicData.catalogWhatsappCustomizationLabel = settings.catalogWhatsappCustomizationLabel;
      if (settings.catalogWhatsappFooter !== undefined) publicData.catalogWhatsappFooter = settings.catalogWhatsappFooter;
      if (settings.catalogFooterText !== undefined) publicData.catalogFooterText = settings.catalogFooterText;
      if (settings.catalogFooterLocation !== undefined) publicData.catalogFooterLocation = settings.catalogFooterLocation;
      if (settings.catalogFooterBusinessHours !== undefined) publicData.catalogFooterBusinessHours = settings.catalogFooterBusinessHours;
      if (settings.catalogFooterCopyright !== undefined) publicData.catalogFooterCopyright = settings.catalogFooterCopyright;
      if (settings.catalogFooterNotice !== undefined) publicData.catalogFooterNotice = settings.catalogFooterNotice;

      // 1. Quem Somos / Sobre o Ateliê
      if (settings.catalogShowAbout !== undefined) publicData.catalogShowAbout = settings.catalogShowAbout;
      if (settings.catalogAboutBadge !== undefined) publicData.catalogAboutBadge = settings.catalogAboutBadge;
      if (settings.catalogAboutTitle !== undefined) publicData.catalogAboutTitle = settings.catalogAboutTitle;
      if (settings.catalogAboutText !== undefined) publicData.catalogAboutText = settings.catalogAboutText;
      if (settings.catalogAboutImageUrl !== undefined) publicData.catalogAboutImageUrl = settings.catalogAboutImageUrl;
      if (settings.catalogAboutPillar1Title !== undefined) publicData.catalogAboutPillar1Title = settings.catalogAboutPillar1Title;
      if (settings.catalogAboutPillar1Text !== undefined) publicData.catalogAboutPillar1Text = settings.catalogAboutPillar1Text;
      if (settings.catalogAboutPillar2Title !== undefined) publicData.catalogAboutPillar2Title = settings.catalogAboutPillar2Title;
      if (settings.catalogAboutPillar2Text !== undefined) publicData.catalogAboutPillar2Text = settings.catalogAboutPillar2Text;
      if (settings.catalogAboutPillar3Title !== undefined) publicData.catalogAboutPillar3Title = settings.catalogAboutPillar3Title;
      if (settings.catalogAboutPillar3Text !== undefined) publicData.catalogAboutPillar3Text = settings.catalogAboutPillar3Text;

      // 2. Como Funciona
      if (settings.catalogShowHowItWorks !== undefined) publicData.catalogShowHowItWorks = settings.catalogShowHowItWorks;
      if (settings.catalogHowItWorksBadge !== undefined) publicData.catalogHowItWorksBadge = settings.catalogHowItWorksBadge;
      if (settings.catalogHowItWorksTitle !== undefined) publicData.catalogHowItWorksTitle = settings.catalogHowItWorksTitle;
      if (settings.catalogHowItWorksSubtitle !== undefined) publicData.catalogHowItWorksSubtitle = settings.catalogHowItWorksSubtitle;
      if (settings.catalogHowItWorksStep1Title !== undefined) publicData.catalogHowItWorksStep1Title = settings.catalogHowItWorksStep1Title;
      if (settings.catalogHowItWorksStep1Text !== undefined) publicData.catalogHowItWorksStep1Text = settings.catalogHowItWorksStep1Text;
      if (settings.catalogHowItWorksStep2Title !== undefined) publicData.catalogHowItWorksStep2Title = settings.catalogHowItWorksStep2Title;
      if (settings.catalogHowItWorksStep2Text !== undefined) publicData.catalogHowItWorksStep2Text = settings.catalogHowItWorksStep2Text;
      if (settings.catalogHowItWorksStep3Title !== undefined) publicData.catalogHowItWorksStep3Title = settings.catalogHowItWorksStep3Title;
      if (settings.catalogHowItWorksStep3Text !== undefined) publicData.catalogHowItWorksStep3Text = settings.catalogHowItWorksStep3Text;
      if (settings.catalogHowItWorksStep4Title !== undefined) publicData.catalogHowItWorksStep4Title = settings.catalogHowItWorksStep4Title;
      if (settings.catalogHowItWorksStep4Text !== undefined) publicData.catalogHowItWorksStep4Text = settings.catalogHowItWorksStep4Text;

      // 3. Diferenciais
      if (settings.catalogShowFeatures !== undefined) publicData.catalogShowFeatures = settings.catalogShowFeatures;
      if (settings.catalogFeaturesBadge !== undefined) publicData.catalogFeaturesBadge = settings.catalogFeaturesBadge;
      if (settings.catalogFeaturesTitle !== undefined) publicData.catalogFeaturesTitle = settings.catalogFeaturesTitle;
      if (settings.catalogFeature1Title !== undefined) publicData.catalogFeature1Title = settings.catalogFeature1Title;
      if (settings.catalogFeature1Text !== undefined) publicData.catalogFeature1Text = settings.catalogFeature1Text;
      if (settings.catalogFeature2Title !== undefined) publicData.catalogFeature2Title = settings.catalogFeature2Title;
      if (settings.catalogFeature2Text !== undefined) publicData.catalogFeature2Text = settings.catalogFeature2Text;
      if (settings.catalogFeature3Title !== undefined) publicData.catalogFeature3Title = settings.catalogFeature3Title;
      if (settings.catalogFeature3Text !== undefined) publicData.catalogFeature3Text = settings.catalogFeature3Text;
      if (settings.catalogFeature4Title !== undefined) publicData.catalogFeature4Title = settings.catalogFeature4Title;
      if (settings.catalogFeature4Text !== undefined) publicData.catalogFeature4Text = settings.catalogFeature4Text;

      // 4. Dúvidas Frequentes (FAQ)
      if (settings.catalogShowFaq !== undefined) publicData.catalogShowFaq = settings.catalogShowFaq;
      if (settings.catalogFaqBadge !== undefined) publicData.catalogFaqBadge = settings.catalogFaqBadge;
      if (settings.catalogFaqTitle !== undefined) publicData.catalogFaqTitle = settings.catalogFaqTitle;
      if (settings.catalogFaq1Q !== undefined) publicData.catalogFaq1Q = settings.catalogFaq1Q;
      if (settings.catalogFaq1A !== undefined) publicData.catalogFaq1A = settings.catalogFaq1A;
      if (settings.catalogFaq2Q !== undefined) publicData.catalogFaq2Q = settings.catalogFaq2Q;
      if (settings.catalogFaq2A !== undefined) publicData.catalogFaq2A = settings.catalogFaq2A;
      if (settings.catalogFaq3Q !== undefined) publicData.catalogFaq3Q = settings.catalogFaq3Q;
      if (settings.catalogFaq3A !== undefined) publicData.catalogFaq3A = settings.catalogFaq3A;
      if (settings.catalogFaq4Q !== undefined) publicData.catalogFaq4Q = settings.catalogFaq4Q;
      if (settings.catalogFaq4A !== undefined) publicData.catalogFaq4A = settings.catalogFaq4A;
      if (settings.catalogFaq5Q !== undefined) publicData.catalogFaq5Q = settings.catalogFaq5Q;
      if (settings.catalogFaq5A !== undefined) publicData.catalogFaq5A = settings.catalogFaq5A;

      // Publicação e Feature Flags — sincronizados instantaneamente para a loja pública
      if (settings.storePublished !== undefined) publicData.storePublished = settings.storePublished;
      if (settings.storeUnpublishMessage !== undefined) publicData.storeUnpublishMessage = settings.storeUnpublishMessage;
      if (settings.featureFlags !== undefined) publicData.featureFlags = settings.featureFlags;

      if (Object.keys(publicData).length > 1) {
        await setDoc(doc(db, 'storeSettings', 'public'), publicData, { merge: true });
      }
    } catch (e) {
      console.warn('Erro ao sincronizar storeSettings pública:', e);
    }
  }

  /**
   * Atualizar avatar
   */
  async updateAvatar(userId: string, avatarUrl: string | null): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    await setDoc(
      docRef,
      {
        avatar: avatarUrl === null ? null : avatarUrl,
        userId,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  /**
   * Atualizar logo do painel administrativo
   */
  async updateLogo(userId: string, logoUrl: string | null): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    await setDoc(
      docRef,
      {
        logo: logoUrl === null ? null : logoUrl,
        userId,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  /**
   * Atualizar logo exclusivo do catálogo / lojinha pública online
   */
  async updateCatalogLogo(userId: string, catalogLogoUrl: string | null): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    const isRemove = catalogLogoUrl === null || catalogLogoUrl === '';

    await setDoc(
      docRef,
      {
        catalogLogo: isRemove ? null : catalogLogoUrl,
        userId,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    try {
      await setDoc(
        doc(db, 'storeSettings', 'public'),
        {
          catalogLogo: isRemove ? null : catalogLogoUrl,
          ...(isRemove ? { logo: null } : {}),
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Erro ao sincronizar catalogLogo em storeSettings pública:', e);
    }
  }

  /**
   * Atualizar banner exclusivo do catálogo / lojinha pública online (formato LinkedIn / 4:1)
   */
  async updateCatalogBanner(userId: string, catalogBannerUrl: string | null): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    const isRemove = catalogBannerUrl === null || catalogBannerUrl === '';

    await setDoc(
      docRef,
      {
        catalogBanner: isRemove ? null : catalogBannerUrl,
        userId,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    try {
      await setDoc(
        doc(db, 'storeSettings', 'public'),
        {
          catalogBanner: isRemove ? null : catalogBannerUrl,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Erro ao sincronizar catalogBanner em storeSettings pública:', e);
    }
  }

  /**
   * Atualizar imagem de fundo da barra superior fixa do catálogo
   */
  async updateCatalogHeaderBackground(userId: string, backgroundUrl: string | null): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    const isRemove = backgroundUrl === null || backgroundUrl === '';

    await setDoc(
      docRef,
      {
        catalogHeaderBackground: isRemove ? null : backgroundUrl,
        userId,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    try {
      await setDoc(
        doc(db, 'storeSettings', 'public'),
        {
          catalogHeaderBackground: isRemove ? null : backgroundUrl,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Erro ao sincronizar catalogHeaderBackground em storeSettings pública:', e);
    }
  }

  /**
   * Atualizar banner
   */
  async updateBanner(userId: string, bannerUrl: string | null): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    await setDoc(
      docRef,
      {
        banner: bannerUrl === null ? null : bannerUrl,
        userId,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  /**
   * Atualizar imagem da seção Quem Somos / Sobre o Ateliê
   */
  async updateCatalogAboutImage(userId: string, imageUrl: string | null): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    const isRemove = imageUrl === null || imageUrl === '';

    await setDoc(
      docRef,
      {
        catalogAboutImageUrl: isRemove ? null : imageUrl,
        userId,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    try {
      await setDoc(
        doc(db, 'storeSettings', 'public'),
        {
          catalogAboutImageUrl: isRemove ? null : imageUrl,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Erro ao sincronizar catalogAboutImageUrl em storeSettings pública:', e);
    }
  }

  /**
   * Resetar para configurações padrão
   */
  async resetToDefaults(userId: string): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    await setDoc(docRef, {
      userId,
      updatedAt: new Date(),
    });
  }
}

export const firebaseSettingsService = new FirebaseSettingsService();

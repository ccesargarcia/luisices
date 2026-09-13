/**
 * Firebase Settings Service
 *
 * Serviço para gerenciar configurações e personalização do usuário
 */

import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
      return {
        ...data,
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as UserSettings;
    }

    return null;
  }

  /**
   * Atualizar configurações do usuário
   */
  async updateSettings(
    userId: string,
    settings: Partial<Omit<UserSettings, 'userId' | 'updatedAt'>>
  ): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');

    // Verificar se documento existe
    const docSnap = await getDoc(docRef);

    const data = {
      ...settings,
      userId,
      updatedAt: new Date(),
    };

    if (docSnap.exists()) {
      await updateDoc(docRef, data);
    } else {
      await setDoc(docRef, data);
    }

    // Sincronizar dados públicos da loja para o catálogo online público
    try {
      const publicData: Record<string, any> = { updatedAt: new Date() };
      if (settings.businessName !== undefined) publicData.businessName = settings.businessName;
      if (settings.businessTagline !== undefined) publicData.businessTagline = settings.businessTagline;
      if (settings.whatsappPhone !== undefined) publicData.whatsappPhone = settings.whatsappPhone;
      else if (settings.businessPhone !== undefined) publicData.whatsappPhone = settings.businessPhone;
      if (settings.instagramUrl !== undefined) publicData.instagramUrl = settings.instagramUrl;
      if (settings.websiteUrl !== undefined) publicData.websiteUrl = settings.websiteUrl;
      if (settings.logo !== undefined) publicData.logo = settings.logo;

      // Customizações da Lojinha / Catálogo
      if (settings.catalogBadge !== undefined) publicData.catalogBadge = settings.catalogBadge;
      if (settings.catalogStatusText !== undefined) publicData.catalogStatusText = settings.catalogStatusText;
      if (settings.catalogHeroTitle !== undefined) publicData.catalogHeroTitle = settings.catalogHeroTitle;
      if (settings.catalogHeroDescription !== undefined) publicData.catalogHeroDescription = settings.catalogHeroDescription;
      if (settings.catalogAnnouncement !== undefined) publicData.catalogAnnouncement = settings.catalogAnnouncement;
      if (settings.catalogWhatsappGreeting !== undefined) publicData.catalogWhatsappGreeting = settings.catalogWhatsappGreeting;
      if (settings.catalogWhatsappCustomizationLabel !== undefined) publicData.catalogWhatsappCustomizationLabel = settings.catalogWhatsappCustomizationLabel;
      if (settings.catalogWhatsappFooter !== undefined) publicData.catalogWhatsappFooter = settings.catalogWhatsappFooter;
      if (settings.catalogFooterText !== undefined) publicData.catalogFooterText = settings.catalogFooterText;
      if (settings.catalogFooterLocation !== undefined) publicData.catalogFooterLocation = settings.catalogFooterLocation;
      if (settings.catalogFooterBusinessHours !== undefined) publicData.catalogFooterBusinessHours = settings.catalogFooterBusinessHours;
      if (settings.catalogFooterCopyright !== undefined) publicData.catalogFooterCopyright = settings.catalogFooterCopyright;
      if (settings.catalogFooterNotice !== undefined) publicData.catalogFooterNotice = settings.catalogFooterNotice;

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
        avatar: avatarUrl === null ? deleteField() : avatarUrl,
        userId,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  /**
   * Atualizar logo
   */
  async updateLogo(userId: string, logoUrl: string | null): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    await setDoc(
      docRef,
      {
        logo: logoUrl === null ? deleteField() : logoUrl,
        userId,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    try {
      await setDoc(
        doc(db, 'storeSettings', 'public'),
        {
          logo: logoUrl || null,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Erro ao sincronizar logo em storeSettings pública:', e);
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
        banner: bannerUrl === null ? deleteField() : bannerUrl,
        userId,
        updatedAt: new Date(),
      },
      { merge: true }
    );
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

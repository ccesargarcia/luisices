import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettings } from '../../hooks/useUserSettings';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { applyColorTheme, type ColorThemeKey } from '../utils/colorThemes';
import { DEFAULT_DASHBOARD_CARDS } from '../utils/dashboardCards';
import { Badge } from '../components/ui/badge';
import { AvatarLogoSection } from '../components/settings/AvatarLogoSection';
import { BusinessInfoSection, type BusinessInfo } from '../components/settings/BusinessInfoSection';
import { OperationsSection } from '../components/settings/OperationsSection';
import { AppearanceSection } from '../components/settings/AppearanceSection';
import { DashboardPrefsSection } from '../components/settings/DashboardPrefsSection';
import { NavigationOrderSection, DEFAULT_NAV_ORDER } from '../components/settings/NavigationOrderSection';
import { CardDensitySection } from '../components/settings/CardDensitySection';
import { WhatsAppTemplateSection } from '../components/settings/WhatsAppTemplateSection';
import { PermissionsSection } from '../components/settings/PermissionsSection';
import { DangerZoneSection } from '../components/settings/DangerZoneSection';

export function Settings() {
  const { user, userProfile, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const {
    settings,
    loading,
    updateSettings,
    uploadAvatar,
    uploadLogo,
    uploadBanner,
    removeAvatar,
    removeLogo,
    removeBanner,
    resetToDefaults,
  } = useUserSettings();

  const [uploading, setUploading] = useState<'avatar' | 'logo' | 'banner' | null>(null);
  const [savingBusinessInfo, setSavingBusinessInfo] = useState(false);
  const [savingPersonalization, setSavingPersonalization] = useState(false);
  const [savingDashboardPrefs, setSavingDashboardPrefs] = useState(false);
  const [selectedColorTheme, setSelectedColorTheme] = useState<ColorThemeKey>('default');
  const [selectedCards, setSelectedCards] = useState<string[]>(DEFAULT_DASHBOARD_CARDS);
  const [defaultReportPeriod, setDefaultReportPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [compactCards, setCompactCards] = useState(false);
  const [savingDisplayPrefs, setSavingDisplayPrefs] = useState(false);
  const [savingOperations, setSavingOperations] = useState(false);
  const [deliveryAlertDays, setDeliveryAlertDays] = useState(3);
  const [defaultDeliveryDays, setDefaultDeliveryDays] = useState(0);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#7c3aed');

  const [navOrder, setNavOrder] = useState<string[]>(DEFAULT_NAV_ORDER);
  const [savingNavOrder, setSavingNavOrder] = useState(false);
  const [whatsappGreeting, setWhatsappGreeting] = useState('');
  const [whatsappSignature, setWhatsappSignature] = useState('');
  const [savingWhatsappTemplate, setSavingWhatsappTemplate] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    businessName: settings?.businessName || '',
    businessPhone: settings?.businessPhone || '',
    businessEmail: settings?.businessEmail || '',
    businessAddress: settings?.businessAddress || '',
    businessTagline: settings?.businessTagline || '',
    instagramUrl: settings?.instagramUrl || '',
    websiteUrl: settings?.websiteUrl || '',
    whatsappPhone: settings?.whatsappPhone || '',
  });

  // Atualizar business info quando settings carregar
  useEffect(() => {
    if (settings) {
      setBusinessInfo({
        businessName: settings.businessName || '',
        businessPhone: settings.businessPhone || '',
        businessEmail: settings.businessEmail || '',
        businessAddress: settings.businessAddress || '',
        businessTagline: settings.businessTagline || '',
        instagramUrl: settings.instagramUrl || '',
        websiteUrl: settings.websiteUrl || '',
        whatsappPhone: settings.whatsappPhone || '',
      });
      setSelectedColorTheme((settings.colorTheme as ColorThemeKey) || 'default');
      setSelectedCards(settings.dashboardCards ?? DEFAULT_DASHBOARD_CARDS);
      setDefaultReportPeriod(settings.defaultReportPeriod ?? 'month');
      setCompactCards(settings.compactCards ?? false);
      const savedOrder =
        settings.navOrder && settings.navOrder.length > 0 ? settings.navOrder : DEFAULT_NAV_ORDER;
      const allHrefs = DEFAULT_NAV_ORDER;
      const merged = [
        ...savedOrder.filter((h) => allHrefs.includes(h)),
        ...allHrefs.filter((h) => !savedOrder.includes(h)),
      ];
      setNavOrder(merged);
      setWhatsappGreeting(settings.whatsappGreeting ?? '');
      setWhatsappSignature(settings.whatsappSignature ?? '');
      setDeliveryAlertDays(settings.deliveryAlertDays ?? 3);
      setDefaultDeliveryDays(settings.defaultDeliveryDays ?? 0);
      setDefaultPaymentMethod(settings.defaultPaymentMethod ?? '');
      setCustomColorHex(settings.customColorHex ?? '#7c3aed');
    }
  }, [settings]);

  const handleImageUpload = async (file: File, type: 'avatar' | 'logo' | 'banner') => {
    setUploading(type);
    try {
      if (type === 'avatar') {
        await uploadAvatar(file);
      } else if (type === 'logo') {
        await uploadLogo(file);
      } else {
        await uploadBanner(file);
      }
      toast.success(
        `${type === 'avatar' ? 'Avatar' : type === 'logo' ? 'Logo' : 'Banner'} atualizado com sucesso!`
      );
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer upload');
    } finally {
      setUploading(null);
    }
  };

  const handleImageRemove = async (type: 'avatar' | 'logo' | 'banner') => {
    if (
      !confirm(
        `Deseja realmente remover ${type === 'avatar' ? 'o avatar' : type === 'logo' ? 'o logo' : 'o banner'}?`
      )
    ) {
      return;
    }

    setUploading(type);
    try {
      if (type === 'avatar') {
        await removeAvatar();
      } else if (type === 'logo') {
        await removeLogo();
      } else {
        await removeBanner();
      }
      toast.success(
        `${type === 'avatar' ? 'Avatar' : type === 'logo' ? 'Logo' : 'Banner'} removido com sucesso!`
      );
    } catch (error) {
      console.error('Erro ao remover:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao remover imagem');
    } finally {
      setUploading(null);
    }
  };

  const handleBusinessInfoSave = async () => {
    setSavingBusinessInfo(true);
    try {
      await updateSettings(businessInfo);
      toast.success('Informações atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar informações');
    } finally {
      setSavingBusinessInfo(false);
    }
  };

  const handleDashboardPrefsSave = async () => {
    setSavingDashboardPrefs(true);
    try {
      await updateSettings({ dashboardCards: selectedCards, defaultReportPeriod });
      toast.success('Preferências do dashboard salvas!');
    } catch {
      toast.error('Erro ao salvar preferências');
    } finally {
      setSavingDashboardPrefs(false);
    }
  };

  const handlePersonalizationSave = async () => {
    setSavingPersonalization(true);
    try {
      await updateSettings({
        colorTheme: selectedColorTheme,
        ...(selectedColorTheme === 'custom' ? { customColorHex } : {}),
      });
      applyColorTheme(
        selectedColorTheme,
        selectedColorTheme === 'custom' ? customColorHex : undefined
      );
      toast.success('Personalização salva com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar personalização');
    } finally {
      setSavingPersonalization(false);
    }
  };

  const handleOperationsSave = async () => {
    setSavingOperations(true);
    try {
      await updateSettings({
        deliveryAlertDays,
        defaultDeliveryDays,
        defaultPaymentMethod: defaultPaymentMethod || undefined,
      });
      toast.success('Preferências de operação salvas!');
    } catch {
      toast.error('Erro ao salvar preferências');
    } finally {
      setSavingOperations(false);
    }
  };

  const handleNavOrderSave = async (order: string[]) => {
    setSavingNavOrder(true);
    try {
      await updateSettings({ navOrder: order });
      toast.success('Ordem de navegação salva!');
    } catch {
      toast.error('Erro ao salvar ordem de navegação');
    } finally {
      setSavingNavOrder(false);
    }
  };

  const handleDensitySave = async (compact: boolean) => {
    setSavingDisplayPrefs(true);
    try {
      await updateSettings({ compactCards: compact });
      toast.success('Preferência de densidade salva!');
    } catch {
      toast.error('Erro ao salvar preferência');
    } finally {
      setSavingDisplayPrefs(false);
    }
  };

  const handleWhatsappSave = async () => {
    setSavingWhatsappTemplate(true);
    try {
      await updateSettings({ whatsappGreeting, whatsappSignature });
      toast.success('Template do WhatsApp salvo!');
    } catch {
      toast.error('Erro ao salvar template');
    } finally {
      setSavingWhatsappTemplate(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Deseja realmente resetar todas as personalizações?')) return;

    try {
      await resetToDefaults();
      setBusinessInfo({
        businessName: '',
        businessPhone: '',
        businessEmail: '',
        businessAddress: '',
        businessTagline: '',
        instagramUrl: '',
        websiteUrl: '',
        whatsappPhone: '',
      });
      toast.success('Configurações resetadas com sucesso!');
    } catch (error) {
      toast.error('Erro ao resetar configurações');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const userInitials =
    user?.displayName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || user?.email?.[0].toUpperCase() || '?';

  const isDevEnvironment = import.meta.env.VITE_FIREBASE_PROJECT_ID?.endsWith('-dev') ?? false;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Configurações</h1>
          {isDevEnvironment && (
            <Badge
              variant="outline"
              className="bg-yellow-500/10 text-yellow-600 border-yellow-400 font-mono text-xs"
            >
              🚧 DEV
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-2">
          Personalize seu dashboard com logo, cores e informações do negócio
        </p>
      </div>

      {/* Avatar e Logo */}
      <AvatarLogoSection
        avatarUrl={settings?.avatar}
        logoUrl={settings?.logo}
        userInitials={userInitials}
        uploading={uploading}
        onImageUpload={handleImageUpload}
        onImageRemove={handleImageRemove}
      />

      {/* Informações do Negócio */}
      <BusinessInfoSection
        businessInfo={businessInfo}
        onChange={setBusinessInfo}
        onSave={handleBusinessInfoSave}
        saving={savingBusinessInfo}
      />

      {/* Preferências do Dashboard */}
      <DashboardPrefsSection
        selectedCards={selectedCards}
        onSelectedCardsChange={setSelectedCards}
        defaultReportPeriod={defaultReportPeriod}
        onDefaultReportPeriodChange={setDefaultReportPeriod}
        onSave={handleDashboardPrefsSave}
        saving={savingDashboardPrefs}
      />

      {/* Operação Padrão */}
      <OperationsSection
        deliveryAlertDays={deliveryAlertDays}
        onDeliveryAlertDaysChange={setDeliveryAlertDays}
        defaultDeliveryDays={defaultDeliveryDays}
        onDefaultDeliveryDaysChange={setDefaultDeliveryDays}
        defaultPaymentMethod={defaultPaymentMethod}
        onDefaultPaymentMethodChange={setDefaultPaymentMethod}
        onSave={handleOperationsSave}
        saving={savingOperations}
      />

      {/* Personalização / Aparência */}
      <AppearanceSection
        theme={theme}
        onThemeChange={setTheme}
        selectedColorTheme={selectedColorTheme}
        onColorThemeChange={setSelectedColorTheme}
        customColorHex={customColorHex}
        onCustomColorHexChange={setCustomColorHex}
        onSave={handlePersonalizationSave}
        saving={savingPersonalization}
      />

      {/* Ordem de Navegação */}
      <NavigationOrderSection
        navOrder={navOrder}
        onNavOrderChange={setNavOrder}
        onSave={handleNavOrderSave}
        saving={savingNavOrder}
      />

      {/* Densidade dos Cards */}
      <CardDensitySection
        compactCards={compactCards}
        onCompactCardsChange={setCompactCards}
        onSave={handleDensitySave}
        saving={savingDisplayPrefs}
      />

      {/* Template WhatsApp */}
      <WhatsAppTemplateSection
        whatsappGreeting={whatsappGreeting}
        onWhatsappGreetingChange={setWhatsappGreeting}
        whatsappSignature={whatsappSignature}
        onWhatsappSignatureChange={setWhatsappSignature}
        onSave={handleWhatsappSave}
        saving={savingWhatsappTemplate}
      />

      {/* Minhas Permissões */}
      <PermissionsSection userProfile={userProfile} isAdmin={isAdmin} />

      {/* Zona de Perigo */}
      <DangerZoneSection onReset={handleReset} />
    </div>
  );
}

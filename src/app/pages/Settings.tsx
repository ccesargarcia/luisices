import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettings } from '../../hooks/useUserSettings';
import {
  Loader2,
  Building2,
  SlidersHorizontal,
  Palette,
  Sparkles,
  ShieldAlert,
  Store,
  ExternalLink,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { applyColorTheme, type ColorThemeKey } from '../utils/colorThemes';
import { DEFAULT_DASHBOARD_CARDS } from '../utils/dashboardCards';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

import { AvatarLogoSection } from '../components/settings/AvatarLogoSection';
import { BusinessInfoSection, type BusinessInfo } from '../components/settings/BusinessInfoSection';
import { OperationsSection } from '../components/settings/OperationsSection';
import { AppearanceSection } from '../components/settings/AppearanceSection';
import { DashboardPrefsSection } from '../components/settings/DashboardPrefsSection';
import { NavigationOrderSection, DEFAULT_NAV_ORDER } from '../components/settings/NavigationOrderSection';
import { CardDensitySection } from '../components/settings/CardDensitySection';
import { WhatsAppTemplateSection } from '../components/settings/WhatsAppTemplateSection';
import { AiSettingsSection } from '../components/settings/AiSettingsSection';
import { AlexaSettingsSection } from '../components/settings/AlexaSettingsSection';
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

  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = ['empresa', 'operacao', 'aparencia', 'integracoes', 'avancado'] as const;
  type TabType = typeof validTabs[number];

  const tabParam = searchParams.get('tab') as TabType;
  const initialTab: TabType = validTabs.includes(tabParam)
    ? tabParam === 'integracoes' && !isAdmin
      ? 'empresa'
      : tabParam
    : 'empresa';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  const handleTabChange = (val: string) => {
    const nextTab = val as TabType;
    setActiveTab(nextTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', nextTab);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    const currentTabParam = searchParams.get('tab') as TabType;
    if (currentTabParam && validTabs.includes(currentTabParam) && currentTabParam !== activeTab) {
      if (currentTabParam === 'integracoes' && !isAdmin) {
        setActiveTab('empresa');
      } else {
        setActiveTab(currentTabParam);
      }
    }
  }, [searchParams, isAdmin]);

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
  const [autoArchiveCompletedOrders, setAutoArchiveCompletedOrders] = useState(false);
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
    businessNumber: settings?.businessNumber || '',
    businessComplement: settings?.businessComplement || '',
    businessZipCode: settings?.businessZipCode || '',
    businessCity: settings?.businessCity || '',
    businessState: settings?.businessState || '',
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
        businessNumber: settings.businessNumber || '',
        businessComplement: settings.businessComplement || '',
        businessZipCode: settings.businessZipCode || '',
        businessCity: settings.businessCity || '',
        businessState: settings.businessState || '',
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
      setAutoArchiveCompletedOrders(settings.autoArchiveCompletedOrders ?? false);
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
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer upload da imagem');
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
      toast.success('Informações da empresa salvas com sucesso!');
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
      toast.success('Aparência salva com sucesso!');
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
        autoArchiveCompletedOrders,
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
    if (!confirm('Deseja realmente restaurar todas as personalizações padrão?')) return;

    try {
      await resetToDefaults();
      setBusinessInfo({
        businessName: '',
        businessPhone: '',
        businessEmail: '',
        businessAddress: '',
        businessNumber: '',
        businessComplement: '',
        businessZipCode: '',
        businessCity: '',
        businessState: '',
        businessTagline: '',
        instagramUrl: '',
        websiteUrl: '',
        whatsappPhone: '',
      });
      toast.success('Configurações resetadas com sucesso!');
    } catch (error) {
      toast.error('Não foi possível restaurar as configurações padrão.');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Configurações</h1>
            {isDevEnvironment && (
              <Badge
                variant="outline"
                className="bg-yellow-500/10 text-yellow-600 border-yellow-400 font-mono text-xs"
              >
                🚧 DEV
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Gerencie identidade visual, operação, integrações e dados do ateliê
          </p>
        </div>
      </div>

      {/* Navegação por Abas */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <div className="overflow-x-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
          <TabsList className="h-auto p-1 gap-1 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <TabsTrigger value="empresa" className="gap-2 px-3.5 py-2 text-xs sm:text-sm">
              <Building2 className="size-4 shrink-0" />
              <span>Empresa & Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="operacao" className="gap-2 px-3.5 py-2 text-xs sm:text-sm">
              <SlidersHorizontal className="size-4 shrink-0" />
              <span>Operação & Prazos</span>
            </TabsTrigger>
            <TabsTrigger value="aparencia" className="gap-2 px-3.5 py-2 text-xs sm:text-sm">
              <Palette className="size-4 shrink-0" />
              <span>Aparência & Interface</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="integracoes" className="gap-2 px-3.5 py-2 text-xs sm:text-sm">
                <Sparkles className="size-4 shrink-0" />
                <span>Integrações & IA</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="avancado" className="gap-2 px-3.5 py-2 text-xs sm:text-sm">
              <ShieldAlert className="size-4 shrink-0" />
              <span>Avançado</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── ABA 1: EMPRESA & PERFIL ────────────────────────────── */}
        <TabsContent value="empresa" className="space-y-6">
          <AvatarLogoSection
            avatarUrl={settings?.avatar}
            logoUrl={settings?.logo}
            userInitials={userInitials}
            uploading={uploading}
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
          />

          <BusinessInfoSection
            businessInfo={businessInfo}
            onChange={setBusinessInfo}
            onSave={handleBusinessInfoSave}
            saving={savingBusinessInfo}
          />
        </TabsContent>

        {/* ─── ABA 2: OPERAÇÃO & PRAZOS ──────────────────────────── */}
        <TabsContent value="operacao" className="space-y-6">
          <OperationsSection
            deliveryAlertDays={deliveryAlertDays}
            onDeliveryAlertDaysChange={setDeliveryAlertDays}
            defaultDeliveryDays={defaultDeliveryDays}
            onDefaultDeliveryDaysChange={setDefaultDeliveryDays}
            defaultPaymentMethod={defaultPaymentMethod}
            onDefaultPaymentMethodChange={setDefaultPaymentMethod}
            autoArchiveCompletedOrders={autoArchiveCompletedOrders}
            onAutoArchiveCompletedOrdersChange={setAutoArchiveCompletedOrders}
            onSave={handleOperationsSave}
            saving={savingOperations}
          />

          <WhatsAppTemplateSection
            whatsappGreeting={whatsappGreeting}
            onWhatsappGreetingChange={setWhatsappGreeting}
            whatsappSignature={whatsappSignature}
            onWhatsappSignatureChange={setWhatsappSignature}
            onSave={handleWhatsappSave}
            saving={savingWhatsappTemplate}
          />
        </TabsContent>

        {/* ─── ABA 3: APARÊNCIA & TELAS ──────────────────────────── */}
        <TabsContent value="aparencia" className="space-y-6">
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

          <CardDensitySection
            compactCards={compactCards}
            onCompactCardsChange={setCompactCards}
            onSave={handleDensitySave}
            saving={savingDisplayPrefs}
          />

          <DashboardPrefsSection
            selectedCards={selectedCards}
            onSelectedCardsChange={setSelectedCards}
            defaultReportPeriod={defaultReportPeriod}
            onDefaultReportPeriodChange={setDefaultReportPeriod}
            onSave={handleDashboardPrefsSave}
            saving={savingDashboardPrefs}
          />

          <NavigationOrderSection
            navOrder={navOrder}
            onNavOrderChange={setNavOrder}
            onSave={handleNavOrderSave}
            saving={savingNavOrder}
          />
        </TabsContent>

        {/* ─── ABA 4: INTEGRAÇÕES & IA (ADMIN) ──────────────────── */}
        {isAdmin && (
          <TabsContent value="integracoes" className="space-y-6">
            {/* Atalho para Vitrine / Catálogo Público */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Store className="size-5 text-primary" />
                      Lojinha Online & Vitrine Pública
                    </CardTitle>
                    <CardDescription>
                      Personalize banners rotativos, cabeçalho de destaque, avisos de entrega e rodapé da sua vitrine pública.
                    </CardDescription>
                  </div>
                  <Link to="/personalizar-lojinha">
                    <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                      <ExternalLink className="size-4" />
                      Abrir Personalização Completa
                    </Button>
                  </Link>
                </div>
              </CardHeader>
            </Card>

            {/* Monitoramento de IA */}
            <AiSettingsSection isAdmin={isAdmin} />

            {/* Alexa Skill */}
            <AlexaSettingsSection isAdmin={isAdmin} />
          </TabsContent>
        )}

        {/* ─── ABA 5: AVANÇADO & SEGURANÇA ───────────────────────── */}
        <TabsContent value="avancado" className="space-y-6">
          {/* Informações da Conta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                Minha Conta & Nível de Acesso
              </CardTitle>
              <CardDescription>
                Informações da conta autenticada no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border/70 bg-muted/20">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{user?.displayName || 'Usuário do Ateliê'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-xs">
                    {isAdmin ? 'Administrador' : 'Colaborador'}
                  </Badge>
                  {isAdmin && (
                    <Link to="/usuarios">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                        <Users className="size-3.5" />
                        Gerenciar Equipe & Permissões
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reset / Zona de Perigo */}
          <DangerZoneSection onReset={handleReset} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Settings;

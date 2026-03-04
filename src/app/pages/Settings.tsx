import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettings } from '../../hooks/useUserSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, Upload, X, Building2, Mail, Phone, MapPin, Palette, Sun, Moon, Monitor, Check, LayoutGrid, MessageSquare, GripVertical, AtSign, Globe, Truck, CreditCard, Bell, ShieldCheck, Lock } from 'lucide-react';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { COLOR_THEMES, applyColorTheme, type ColorThemeKey } from '../utils/colorThemes';
import { DASHBOARD_CARD_CONFIGS, DEFAULT_DASHBOARD_CARDS } from '../utils/dashboardCards';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { LayoutDashboard } from 'lucide-react';
import { Badge } from '../components/ui/badge';

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
  const [saving, setSaving] = useState(false);
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

  const NAV_ITEMS = [
    { href: '/',           label: 'Dashboard' },
    { href: '/agenda',     label: 'Agenda Semanal' },
    { href: '/clientes',   label: 'Clientes' },
    { href: '/relatorios', label: 'Relatórios' },
    { href: '/orcamentos', label: 'Orçamentos' },
    { href: '/produtos',   label: 'Produtos' },
    { href: '/galeria',    label: 'Galeria' },
  ];
  const DEFAULT_NAV_ORDER = NAV_ITEMS.map(i => i.href);
  const [navOrder, setNavOrder] = useState<string[]>(DEFAULT_NAV_ORDER);
  const [savingNavOrder, setSavingNavOrder] = useState(false);
  const [dragNavIdx, setDragNavIdx] = useState<number | null>(null);
  const [whatsappGreeting, setWhatsappGreeting] = useState('');
  const [whatsappSignature, setWhatsappSignature] = useState('');
  const [savingWhatsappTemplate, setSavingWhatsappTemplate] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({
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
      // Merge saved order with any new nav items added since last save
      const savedOrder = settings.navOrder && settings.navOrder.length > 0 ? settings.navOrder : DEFAULT_NAV_ORDER;
      const allHrefs = DEFAULT_NAV_ORDER;
      const merged = [...savedOrder.filter(h => allHrefs.includes(h)), ...allHrefs.filter(h => !savedOrder.includes(h))];
      setNavOrder(merged);
      setWhatsappGreeting(settings.whatsappGreeting ?? '');
      setWhatsappSignature(settings.whatsappSignature ?? '');
      setDeliveryAlertDays(settings.deliveryAlertDays ?? 3);
      setDefaultDeliveryDays(settings.defaultDeliveryDays ?? 0);
      setDefaultPaymentMethod(settings.defaultPaymentMethod ?? '');
      setCustomColorHex(settings.customColorHex ?? '#7c3aed');
    }
  }, [settings]);

  const handleImageUpload = async (
    file: File,
    type: 'avatar' | 'logo' | 'banner'
  ) => {
    setUploading(type);
    try {
      let url: string;
      if (type === 'avatar') {
        url = await uploadAvatar(file);
      } else if (type === 'logo') {
        url = await uploadLogo(file);
      } else {
        url = await uploadBanner(file);
      }

      toast.success(`${type === 'avatar' ? 'Avatar' : type === 'logo' ? 'Logo' : 'Banner'} atualizado com sucesso!`);
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer upload');
    } finally {
      setUploading(null);
    }
  };

  const handleImageRemove = async (type: 'avatar' | 'logo' | 'banner') => {
    if (!confirm(`Deseja realmente remover ${type === 'avatar' ? 'o avatar' : type === 'logo' ? 'o logo' : 'o banner'}?`)) {
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

      toast.success(`${type === 'avatar' ? 'Avatar' : type === 'logo' ? 'Logo' : 'Banner'} removido com sucesso!`);
    } catch (error) {
      console.error('Erro ao remover:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao remover imagem');
    } finally {
      setUploading(null);
    }
  };

  const handleBusinessInfoSave = async () => {
    setSaving(true);
    try {
      await updateSettings(businessInfo);
      toast.success('Informações atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar informações');
    } finally {
      setSaving(false);
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
      applyColorTheme(selectedColorTheme, selectedColorTheme === 'custom' ? customColorHex : undefined);
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

  const handleReset = async () => {
    if (!confirm('Deseja realmente resetar todas as personalizações?')) return;

    try {
      await resetToDefaults();
      setBusinessInfo({
        businessName: '',
        businessPhone: '',
        businessEmail: '',
        businessAddress: '',
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

  const userInitials = user?.displayName
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
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-400 font-mono text-xs">
              🚧 DEV
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-2">
          Personalize seu dashboard com logo, cores e informações do negócio
        </p>
      </div>

      {/* Avatar e Logo */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Avatar */}
        <Card>
          <CardHeader>
            <CardTitle>Avatar</CardTitle>
            <CardDescription>
              Sua foto de perfil (PNG, JPG - máx 5MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-20">
                <AvatarImage src={settings?.avatar} alt="Avatar" />
                <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 flex gap-2">
                <Label htmlFor="avatar-upload" className="cursor-pointer flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading === 'avatar'}
                    className="w-full"
                    asChild
                  >
                    <span>
                      {uploading === 'avatar' ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Upload className="size-4 mr-2" />
                          Escolher imagem
                        </>
                      )}
                    </span>
                  </Button>
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'avatar');
                  }}
                />
                {settings?.avatar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={uploading === 'avatar'}
                    onClick={() => handleImageRemove('avatar')}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle>Logo do Negócio</CardTitle>
            <CardDescription>
              Logo da sua papelaria (PNG, JPG - máx 5MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings?.logo ? (
              <div className="relative">
                <img
                  src={settings.logo}
                  alt="Logo"
                  className="h-20 object-contain bg-muted rounded-lg p-2"
                />
              </div>
            ) : (
              <div className="h-20 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                <Building2 className="size-8" />
              </div>
            )}

            <div className="flex gap-2">
              <Label htmlFor="logo-upload" className="cursor-pointer flex-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={uploading === 'logo'}
                  asChild
                >
                  <span>
                    {uploading === 'logo' ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload className="size-4 mr-2" />
                        {settings?.logo ? 'Trocar logo' : 'Enviar logo'}
                      </>
                    )}
                  </span>
                </Button>
              </Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, 'logo');
                }}
              />
              {settings?.logo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={uploading === 'logo'}
                  onClick={() => handleImageRemove('logo')}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações do Negócio */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Negócio</CardTitle>
          <CardDescription>
            Dados da sua papelaria que aparecerão no dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">
                <Building2 className="size-4 inline mr-2" />
                Nome do Negócio
              </Label>
              <Input
                id="businessName"
                placeholder="Papelaria Exemplo"
                value={businessInfo.businessName}
                onChange={(e) =>
                  setBusinessInfo({ ...businessInfo, businessName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessPhone">
                <Phone className="size-4 inline mr-2" />
                Telefone
              </Label>
              <Input
                id="businessPhone"
                placeholder="(11) 99999-9999"
                value={businessInfo.businessPhone}
                onChange={(e) =>
                  setBusinessInfo({ ...businessInfo, businessPhone: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessEmail">
                <Mail className="size-4 inline mr-2" />
                Email
              </Label>
              <Input
                id="businessEmail"
                type="email"
                placeholder="contato@papelaria.com"
                value={businessInfo.businessEmail}
                onChange={(e) =>
                  setBusinessInfo({ ...businessInfo, businessEmail: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessAddress">
                <MapPin className="size-4 inline mr-2" />
                Endereço
              </Label>
              <Input
                id="businessAddress"
                placeholder="Rua Exemplo, 123 - São Paulo"
                value={businessInfo.businessAddress}
                onChange={(e) =>
                  setBusinessInfo({ ...businessInfo, businessAddress: e.target.value })
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="businessTagline">
                <Palette className="size-4 inline mr-2" />
                Slogan / Descrição curta
              </Label>
              <Input
                id="businessTagline"
                placeholder="Ex: Sua papelaria criativa favorita!"
                value={businessInfo.businessTagline}
                onChange={(e) =>
                  setBusinessInfo({ ...businessInfo, businessTagline: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">Aparece abaixo do nome do negócio no cabeçalho</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagramUrl">
                <AtSign className="size-4 inline mr-2" />
                Instagram
              </Label>
              <Input
                id="instagramUrl"
                placeholder="https://instagram.com/suapapelaria"
                value={businessInfo.instagramUrl}
                onChange={(e) =>
                  setBusinessInfo({ ...businessInfo, instagramUrl: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsappPhone">
                <MessageSquare className="size-4 inline mr-2" />
                WhatsApp
              </Label>
              <Input
                id="whatsappPhone"
                placeholder="5511999999999"
                value={businessInfo.whatsappPhone}
                onChange={(e) =>
                  setBusinessInfo({ ...businessInfo, whatsappPhone: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">Código do país + DDD + número, sem espaços</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteUrl">
                <Globe className="size-4 inline mr-2" />
                Site / Link
              </Label>
              <Input
                id="websiteUrl"
                placeholder="https://suapapelaria.com.br"
                value={businessInfo.websiteUrl}
                onChange={(e) =>
                  setBusinessInfo({ ...businessInfo, websiteUrl: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleBusinessInfoSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Informações'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferências do Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="size-5" />
            Preferências do Dashboard
          </CardTitle>
          <CardDescription>
            Escolha quais cards exibir e o período padrão dos relatórios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cards visíveis */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Cards / Métricas visíveis</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DASHBOARD_CARD_CONFIGS.map((card) => {
                const checked = selectedCards.includes(card.id);
                return (
                  <div key={card.id} className="flex items-start gap-3">
                    <Checkbox
                      id={`card-${card.id}`}
                      checked={checked}
                      onCheckedChange={(v) =>
                        setSelectedCards((prev) =>
                          v ? [...prev, card.id] : prev.filter((id) => id !== card.id)
                        )
                      }
                    />
                    <div className="leading-none">
                      <label htmlFor={`card-${card.id}`} className="text-sm font-medium cursor-pointer">
                        {card.label}
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedCards(DEFAULT_DASHBOARD_CARDS)}
              >
                Selecionar todos
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCards([])}
              >
                Desmarcar todos
              </Button>
            </div>
          </div>

          {/* Período padrão dos relatórios */}
          <div className="space-y-2">
            <Label className="text-sm font-medium" htmlFor="default-period">
              Período padrão dos relatórios
            </Label>
            <Select
              value={defaultReportPeriod}
              onValueChange={(v) => setDefaultReportPeriod(v as typeof defaultReportPeriod)}
            >
              <SelectTrigger id="default-period" className="w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Última Semana</SelectItem>
                <SelectItem value="month">Último Mês</SelectItem>
                <SelectItem value="quarter">Último Trimestre</SelectItem>
                <SelectItem value="year">Último Ano</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O relatório sempre abrirá neste período por padrão
            </p>
          </div>

          <Button onClick={handleDashboardPrefsSave} disabled={savingDashboardPrefs}>
            {savingDashboardPrefs ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Preferências'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Operação Padrão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="size-5" />
            Operação Padrão
          </CardTitle>
          <CardDescription>
            Valores pré-preenchidos ao criar novos pedidos e alertas de prazo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Alerta de entregas */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Bell className="size-4" />
              Alerta de prazo — dias de antecedência
            </Label>
            <Select
              value={String(deliveryAlertDays)}
              onValueChange={(v) => setDeliveryAlertDays(Number(v))}
            >
              <SelectTrigger className="w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 dia</SelectItem>
                <SelectItem value="2">2 dias</SelectItem>
                <SelectItem value="3">3 dias (padrão)</SelectItem>
                <SelectItem value="5">5 dias</SelectItem>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="14">14 dias</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Pedidos com prazo dentro deste período aparecem no painel de alertas
            </p>
          </div>

          {/* Data de entrega padrão */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Truck className="size-4" />
              Data de entrega padrão ao criar pedido
            </Label>
            <Select
              value={String(defaultDeliveryDays)}
              onValueChange={(v) => setDefaultDeliveryDays(Number(v))}
            >
              <SelectTrigger className="w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Não pré-preencher</SelectItem>
                <SelectItem value="1">Amanhã (+1 dia)</SelectItem>
                <SelectItem value="2">+2 dias</SelectItem>
                <SelectItem value="3">+3 dias</SelectItem>
                <SelectItem value="5">+5 dias</SelectItem>
                <SelectItem value="7">+7 dias</SelectItem>
                <SelectItem value="14">+14 dias</SelectItem>
                <SelectItem value="30">+30 dias</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A data de entrega será pré-preenchida com esta antecedência ao abrir o diálogo de novo pedido
            </p>
          </div>

          {/* Método de pagamento padrão */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="size-4" />
              Método de pagamento padrão
            </Label>
            <Select
              value={defaultPaymentMethod || 'none'}
              onValueChange={(v) => setDefaultPaymentMethod(v === 'none' ? '' : v)}
            >
              <SelectTrigger className="w-60">
                <SelectValue placeholder="Não pré-selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não pré-selecionar</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="credit">Cartão de Crédito</SelectItem>
                <SelectItem value="debit">Cartão de Débito</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O método será pré-selecionado no formulário de novo pedido
            </p>
          </div>

          <Button onClick={handleOperationsSave} disabled={savingOperations}>
            {savingOperations ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Operação'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Personalização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="size-5" />
            Personalização
          </CardTitle>
          <CardDescription>
            Tema visual e cores do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tema claro/escuro */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Aparência</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
                className="flex-1 gap-2"
              >
                <Sun className="size-4" />
                Claro
              </Button>
              <Button
                type="button"
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="flex-1 gap-2"
              >
                <Moon className="size-4" />
                Escuro
              </Button>
              <Button
                type="button"
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('system')}
                className="flex-1 gap-2"
              >
                <Monitor className="size-4" />
                Sistema
              </Button>
            </div>
          </div>

          {/* Cor do tema */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Cor do Tema</Label>
            <div className="flex flex-wrap gap-3">
              {COLOR_THEMES.map((colorTheme) => (
                <button
                  key={colorTheme.key}
                  type="button"
                  title={colorTheme.label}
                  onClick={() => setSelectedColorTheme(colorTheme.key)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <span
                    className="flex items-center justify-center size-10 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: colorTheme.displayColor,
                      borderColor: selectedColorTheme === colorTheme.key ? colorTheme.displayColor : 'transparent',
                      boxShadow: selectedColorTheme === colorTheme.key ? `0 0 0 2px white, 0 0 0 4px ${colorTheme.displayColor}` : undefined,
                    }}
                  >
                    {selectedColorTheme === colorTheme.key && (
                      <Check className="size-4 text-white drop-shadow" />
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">{colorTheme.label}</span>
                </button>
              ))}
            {/* Cor personalizada */}
            <button
              type="button"
              title="Cor personalizada"
              onClick={() => setSelectedColorTheme('custom')}
              className="flex flex-col items-center gap-1.5 group"
            >
              <span
                className="flex items-center justify-center size-10 rounded-full border-2 transition-all overflow-hidden"
                style={{
                  background: selectedColorTheme === 'custom'
                    ? customColorHex
                    : 'conic-gradient(red, orange, yellow, green, blue, violet, red)',
                  borderColor: selectedColorTheme === 'custom' ? customColorHex : 'transparent',
                  boxShadow: selectedColorTheme === 'custom'
                    ? `0 0 0 2px white, 0 0 0 4px ${customColorHex}`
                    : undefined,
                }}
              >
                {selectedColorTheme === 'custom' && (
                  <Check className="size-4 text-white drop-shadow" />
                )}
              </span>
              <span className="text-xs text-muted-foreground">Personalizar</span>
            </button>
          </div>
          {selectedColorTheme === 'custom' && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
              <input
                type="color"
                value={customColorHex}
                onChange={(e) => setCustomColorHex(e.target.value)}
                className="size-9 cursor-pointer rounded border flex-shrink-0"
                title="Escolher cor"
              />
              <div className="flex-1">
                <Input
                  value={customColorHex}
                  onChange={(e) => setCustomColorHex(e.target.value)}
                  placeholder="#7c3aed"
                  className="w-32 font-mono text-sm"
                />
              </div>
              <span className="text-xs text-muted-foreground">Código hexadecimal da cor</span>
            </div>
          )}
        </div>

          <Button
            onClick={handlePersonalizationSave}
            disabled={savingPersonalization}
          >
            {savingPersonalization ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Personalização'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Densidade dos Cards */}
      {/* Ordem de navegação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="size-5" />
            Ordem da Navegação
          </CardTitle>
          <CardDescription>
            Arraste os itens para reorganizar a ordem dos botões do menu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            {navOrder.map((href, idx) => {
              const item = NAV_ITEMS.find(i => i.href === href);
              if (!item) return null;
              return (
                <div
                  key={href}
                  draggable
                  onDragStart={() => setDragNavIdx(idx)}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragNavIdx === null || dragNavIdx === idx) return;
                    const next = [...navOrder];
                    const [moved] = next.splice(dragNavIdx, 1);
                    next.splice(idx, 0, moved);
                    setNavOrder(next);
                    setDragNavIdx(null);
                  }}
                  onDragEnd={() => setDragNavIdx(null)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md border bg-card cursor-grab active:cursor-grabbing select-none transition-opacity ${
                    dragNavIdx === idx ? 'opacity-40' : 'opacity-100'
                  }`}
                >
                  <GripVertical className="size-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                setSavingNavOrder(true);
                try {
                  await updateSettings({ navOrder });
                  toast.success('Ordem de navegação salva!');
                } catch {
                  toast.error('Erro ao salvar ordem de navegação');
                } finally {
                  setSavingNavOrder(false);
                }
              }}
              disabled={savingNavOrder}
            >
              {savingNavOrder ? <><Loader2 className="size-4 mr-2 animate-spin" />Salvando...</> : 'Salvar Ordem'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setNavOrder(DEFAULT_NAV_ORDER)}
            >
              Restaurar padrão
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="size-5" />
            Densidade dos Cards
          </CardTitle>
          <CardDescription>
            Escolha o estilo de exibição dos cards de pedidos e orçamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCompactCards(false)}
              className={`flex-1 rounded-lg border-2 p-4 text-center transition-all ${
                !compactCards ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div className="mb-2 space-y-1.5">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
              <span className="text-sm font-medium">Confortável</span>
              <p className="text-xs text-muted-foreground mt-1">Mais espaçamento e informações</p>
            </button>
            <button
              type="button"
              onClick={() => setCompactCards(true)}
              className={`flex-1 rounded-lg border-2 p-4 text-center transition-all ${
                compactCards ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div className="mb-2 space-y-1">
                <div className="h-2 w-full rounded bg-muted" />
                <div className="h-2 w-3/4 rounded bg-muted" />
              </div>
              <span className="text-sm font-medium">Compacto</span>
              <p className="text-xs text-muted-foreground mt-1">Mais cards na tela</p>
            </button>
          </div>
          <Button
            onClick={async () => {
              setSavingDisplayPrefs(true);
              try {
                await updateSettings({ compactCards });
                toast.success('Preferência de densidade salva!');
              } catch {
                toast.error('Erro ao salvar preferência');
              } finally {
                setSavingDisplayPrefs(false);
              }
            }}
            disabled={savingDisplayPrefs}
          >
            {savingDisplayPrefs ? <><Loader2 className="size-4 mr-2 animate-spin" />Salvando...</> : 'Salvar Densidade'}
          </Button>
        </CardContent>
      </Card>

      {/* Template WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="size-5" />
            Template do WhatsApp
          </CardTitle>
          <CardDescription>
            Personalize a mensagem enviada ao compartilhar um orçamento. Use {'{nome}'} para o nome do cliente e {'{numero}'} para o número do orçamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Cabeçalho / Saudação</Label>
            <Textarea
              placeholder="Ex: Olá {nome}! Segue o orçamento *{numero}*:"
              value={whatsappGreeting}
              onChange={(e) => setWhatsappGreeting(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Deixe em branco para usar o padrão</p>
          </div>
          <div className="space-y-2">
            <Label>Assinatura / Rodapé</Label>
            <Textarea
              placeholder="Ex: Atenciosamente,\nPapelaria XYZ"
              value={whatsappSignature}
              onChange={(e) => setWhatsappSignature(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Aparece ao final da mensagem</p>
          </div>
          <Button
            onClick={async () => {
              setSavingWhatsappTemplate(true);
              try {
                await updateSettings({ whatsappGreeting, whatsappSignature });
                toast.success('Template do WhatsApp salvo!');
              } catch {
                toast.error('Erro ao salvar template');
              } finally {
                setSavingWhatsappTemplate(false);
              }
            }}
            disabled={savingWhatsappTemplate}
          >
            {savingWhatsappTemplate ? <><Loader2 className="size-4 mr-2 animate-spin" />Salvando...</> : 'Salvar Template'}
          </Button>
        </CardContent>
      </Card>

      {/* Minhas Permissões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            Minhas Permissões
          </CardTitle>
          <CardDescription>
            Acesso e permissões atribuídos ao seu perfil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!userProfile ? (
            <p className="text-muted-foreground text-sm">Carregando perfil...</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Badge variant={isAdmin ? "default" : "secondary"} className="text-sm">
                  {isAdmin ? (
                    <><ShieldCheck className="size-3.5 mr-1" /> Admin</>
                  ) : (
                    <>Usuário</>
                  )}
                </Badge>
                {userProfile.active ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-400 text-xs">
                    ✓ Ativo
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    Inativo
                  </Badge>
                )}
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold">Módulos permitidos:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {userProfile.permissions.dashboard && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-green-600" /> Dashboard
                    </div>
                  )}
                  {userProfile.permissions.orders?.view && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-green-600" /> Pedidos
                    </div>
                  )}
                  {userProfile.permissions.customers?.view && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-green-600" /> Clientes
                    </div>
                  )}
                  {userProfile.permissions.products?.view && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-green-600" /> Produtos
                    </div>
                  )}
                  {userProfile.permissions.quotes?.view && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-green-600" /> Orçamentos
                    </div>
                  )}
                  {userProfile.permissions.gallery?.view && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-green-600" /> Galeria
                    </div>
                  )}
                  {userProfile.permissions.reports && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-green-600" /> Relatórios
                    </div>
                  )}
                  {userProfile.permissions.exchanges && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-green-600" /> Permutas
                    </div>
                  )}
                  {userProfile.permissions.settings && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-green-600" /> Configurações
                    </div>
                  )}
                  {userProfile.permissions.users?.view && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-green-600" /> Usuários
                    </div>
                  )}
                </div>

                {!isAdmin && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Lock className="size-3" />
                      Módulos bloqueados não aparecem no menu de navegação
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Zona de Perigo */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
          <CardDescription>
            Ações irreversíveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Resetar as configurações irá remover todas as personalizações, incluindo imagens enviadas.
            </AlertDescription>
          </Alert>
          <Button
            variant="destructive"
            className="mt-4"
            onClick={handleReset}
          >
            <X className="size-4 mr-2" />
            Resetar Todas as Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

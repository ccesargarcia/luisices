import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettings } from '../../hooks/useUserSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, Upload, X, Building2, Mail, Phone, MapPin, Palette, Sun, Moon, Monitor, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { COLOR_THEMES, applyColorTheme, type ColorThemeKey } from '../utils/colorThemes';
import { DASHBOARD_CARD_CONFIGS, DEFAULT_DASHBOARD_CARDS } from '../utils/dashboardCards';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { LayoutDashboard } from 'lucide-react';

export function Settings() {
  const { user } = useAuth();
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
  const [businessInfo, setBusinessInfo] = useState({
    businessName: settings?.businessName || '',
    businessPhone: settings?.businessPhone || '',
    businessEmail: settings?.businessEmail || '',
    businessAddress: settings?.businessAddress || '',
  });

  // Atualizar business info quando settings carregar
  useEffect(() => {
    if (settings) {
      setBusinessInfo({
        businessName: settings.businessName || '',
        businessPhone: settings.businessPhone || '',
        businessEmail: settings.businessEmail || '',
        businessAddress: settings.businessAddress || '',
      });
      setSelectedColorTheme((settings.colorTheme as ColorThemeKey) || 'default');
      setSelectedCards(settings.dashboardCards ?? DEFAULT_DASHBOARD_CARDS);
      setDefaultReportPeriod(settings.defaultReportPeriod ?? 'month');
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
      await updateSettings({ colorTheme: selectedColorTheme });
      applyColorTheme(selectedColorTheme);
      toast.success('Personalização salva com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar personalização');
    } finally {
      setSavingPersonalization(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
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
            </div>
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

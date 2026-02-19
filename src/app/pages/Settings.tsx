import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettings } from '../../hooks/useUserSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, Upload, X, Building2, Mail, Phone, MapPin, Palette } from 'lucide-react';
import { toast } from 'sonner';

export function Settings() {
  const { user } = useAuth();
  const {
    settings,
    loading,
    updateSettings,
    uploadAvatar,
    uploadLogo,
    uploadBanner,
    resetToDefaults,
  } = useUserSettings();

  const [uploading, setUploading] = useState<'avatar' | 'logo' | 'banner' | null>(null);
  const [saving, setSaving] = useState(false);
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
    }
  }, [settings]);

  const handleImageUpload = async (
    file: File,
    type: 'avatar' | 'logo' | 'banner'
  ) => {
    setUploading(type);
    try {
      console.log('Iniciando upload de', type, file.name);
      let url: string;
      if (type === 'avatar') {
        url = await uploadAvatar(file);
        console.log('Avatar uploaded:', url);
      } else if (type === 'logo') {
        url = await uploadLogo(file);
        console.log('Logo uploaded:', url);
      } else {
        url = await uploadBanner(file);
        console.log('Banner uploaded:', url);
      }
      
      toast.success(`${type === 'avatar' ? 'Avatar' : type === 'logo' ? 'Logo' : 'Banner'} atualizado com sucesso!`);
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer upload');
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
              
              <div className="flex-1">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading === 'avatar'}
                    asChild
                  >
                    <span>
                      {uploading === 'avatar' ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Enviando...
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

            <Label htmlFor="logo-upload" className="cursor-pointer">
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
                      Enviando...
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

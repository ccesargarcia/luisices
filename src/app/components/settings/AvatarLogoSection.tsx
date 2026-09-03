import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Loader2, Upload, X, Building2 } from 'lucide-react';

interface AvatarLogoSectionProps {
  avatarUrl?: string;
  logoUrl?: string;
  userInitials: string;
  uploading: 'avatar' | 'logo' | 'banner' | null;
  onImageUpload: (file: File, type: 'avatar' | 'logo' | 'banner') => Promise<void>;
  onImageRemove: (type: 'avatar' | 'logo' | 'banner') => Promise<void>;
}

export function AvatarLogoSection({
  avatarUrl,
  logoUrl,
  userInitials,
  uploading,
  onImageUpload,
  onImageRemove,
}: AvatarLogoSectionProps) {
  const acceptedImageTypes = 'image/jpeg,image/png,image/webp';

  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'avatar' | 'logo' | 'banner',
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void onImageUpload(file, type);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
          <CardDescription>Sua foto de perfil (JPG, PNG ou WebP; máximo de 5 MB)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Avatar className="size-20">
              <AvatarImage src={avatarUrl} alt="Avatar" />
              <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
            </Avatar>

            <div className="flex w-full flex-1 gap-2 sm:w-auto">
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
                accept={acceptedImageTypes}
                className="hidden"
                onChange={(e) => {
                  handleImageChange(e, 'avatar');
                }}
              />
              {avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={uploading === 'avatar'}
                  onClick={() => onImageRemove('avatar')}
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
          <CardDescription>Logo da sua papelaria (JPG, PNG ou WebP; máximo de 5 MB)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoUrl ? (
            <div className="relative">
              <img
                src={logoUrl}
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
                      {logoUrl ? 'Trocar logo' : 'Enviar logo'}
                    </>
                  )}
                </span>
              </Button>
            </Label>
            <Input
              id="logo-upload"
              type="file"
              accept={acceptedImageTypes}
              className="hidden"
              onChange={(e) => {
                handleImageChange(e, 'logo');
              }}
            />
            {logoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={uploading === 'logo'}
                onClick={() => onImageRemove('logo')}
                className="text-destructive hover:text-destructive"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

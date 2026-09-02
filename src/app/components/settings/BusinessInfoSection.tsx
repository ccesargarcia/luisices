import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Palette,
  AtSign,
  MessageSquare,
  Globe,
  Loader2,
} from 'lucide-react';

export interface BusinessInfo {
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  businessTagline: string;
  instagramUrl: string;
  websiteUrl: string;
  whatsappPhone: string;
}

interface BusinessInfoSectionProps {
  businessInfo: BusinessInfo;
  onChange: (info: BusinessInfo) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

export function BusinessInfoSection({
  businessInfo,
  onChange,
  onSave,
  saving,
}: BusinessInfoSectionProps) {
  return (
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
                onChange({ ...businessInfo, businessName: e.target.value })
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
                onChange({ ...businessInfo, businessPhone: e.target.value })
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
                onChange({ ...businessInfo, businessEmail: e.target.value })
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
                onChange({ ...businessInfo, businessAddress: e.target.value })
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
                onChange({ ...businessInfo, businessTagline: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Aparece abaixo do nome do negócio no cabeçalho
            </p>
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
                onChange({ ...businessInfo, instagramUrl: e.target.value })
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
                onChange({ ...businessInfo, whatsappPhone: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Código do país + DDD + número, sem espaços
            </p>
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
                onChange({ ...businessInfo, websiteUrl: e.target.value })
              }
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={onSave} disabled={saving}>
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
  );
}

import React, { useEffect, useState } from 'react';
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
  businessNumber: string;
  businessComplement: string;
  businessZipCode: string;
  businessCity: string;
  businessState: string;
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
  const [zipLookupLoading, setZipLookupLoading] = useState(false);
  const [zipLookupError, setZipLookupError] = useState('');

  useEffect(() => {
    const digits = businessInfo.businessZipCode.replace(/\D/g, '');
    if (digits.length !== 8) {
      setZipLookupError('');
      return;
    }

    const controller = new AbortController();
    const lookupZipCode = async () => {
      setZipLookupLoading(true);
      setZipLookupError('');
      try {
        const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: controller.signal });
        if (!response.ok) throw new Error('Falha na consulta');
        const address = await response.json();
        if (address.erro) {
          setZipLookupError('CEP não encontrado. Confira o número informado.');
          return;
        }
        onChange({
          ...businessInfo,
          businessAddress: address.logradouro || businessInfo.businessAddress,
          businessCity: address.localidade || businessInfo.businessCity,
          businessState: address.uf || businessInfo.businessState,
          businessNumber: businessInfo.businessNumber,
          businessComplement: businessInfo.businessComplement,
          businessZipCode: businessInfo.businessZipCode,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setZipLookupError('Não foi possível consultar o CEP. Preencha o endereço manualmente.');
        }
      } finally {
        if (!controller.signal.aborted) setZipLookupLoading(false);
      }
    };
    lookupZipCode();
    return () => controller.abort();
  }, [businessInfo.businessZipCode]);

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

          <div className="space-y-2">
            <Label htmlFor="businessZipCode">CEP</Label>
            <div className="relative">
              <Input
                id="businessZipCode"
                inputMode="numeric"
                placeholder="00000-000"
                value={businessInfo.businessZipCode}
                onChange={(e) => onChange({
                  ...businessInfo,
                  businessZipCode: e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9),
                })}
              />
              {zipLookupLoading && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
            </div>
            {zipLookupError && <p className="text-xs text-destructive" role="status">{zipLookupError}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="space-y-2">
              <Label htmlFor="businessNumber">Número</Label>
              <Input
                id="businessNumber"
                placeholder="Ex.: 120"
                value={businessInfo.businessNumber}
                onChange={(e) => onChange({ ...businessInfo, businessNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessComplement">Complemento</Label>
              <Input
                id="businessComplement"
                placeholder="Sala, bloco, loja..."
                value={businessInfo.businessComplement}
                onChange={(e) => onChange({ ...businessInfo, businessComplement: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessCity">Cidade</Label>
              <Input
                id="businessCity"
                placeholder="Cidade"
                value={businessInfo.businessCity}
                onChange={(e) => onChange({ ...businessInfo, businessCity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessState">Estado</Label>
              <Input
                id="businessState"
                placeholder="UF"
                maxLength={2}
                value={businessInfo.businessState}
                onChange={(e) => onChange({ ...businessInfo, businessState: e.target.value.toUpperCase() })}
              />
            </div>
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

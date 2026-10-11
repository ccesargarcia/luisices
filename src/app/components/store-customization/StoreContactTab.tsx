import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Building2, Store, Phone, AtSign, Globe } from 'lucide-react';
import { StoreCustomizationFormData, StoreCustomizationHandleChange } from './types';

export interface StoreContactTabProps {
  formData: StoreCustomizationFormData;
  handleChange: StoreCustomizationHandleChange;
  currentCatalogLogo: string | null;
  setActiveTab: (tab: string) => void;
  formatPhoneForDisplay: (phone: string) => string;
}

export function StoreContactTab({
  formData,
  handleChange,
  currentCatalogLogo,
  setActiveTab,
  formatPhoneForDisplay,
}: StoreContactTabProps) {
  return (
    <div className="space-y-5">
      {/* Resumo do Logo */}
      <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20">
        <div className="flex items-center gap-3">
          {currentCatalogLogo ? (
            <img
              src={currentCatalogLogo}
              alt="Logo da Lojinha"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              className="size-12 rounded-lg object-contain border border-border bg-white p-1"
            />
          ) : (
            <div className="size-12 rounded-lg border border-dashed border-border bg-muted/40 flex items-center justify-center text-muted-foreground">
              <Building2 className="size-5 opacity-60" />
            </div>
          )}
          <div>
            <p className="text-xs font-semibold">Logo Exclusivo da Lojinha</p>
            <p className="text-[11px] text-muted-foreground">
              {currentCatalogLogo
                ? 'Logo específico da lojinha configurado e ativo'
                : 'Nenhum logo específico configurado'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setActiveTab('identity')}
          className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
        >
          <Building2 className="size-3.5" />
          {currentCatalogLogo ? 'Trocar Logo' : 'Enviar Logo Exclusivo'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="size-4 text-primary" />
            Dados Gerais do Negócio
          </CardTitle>
          <CardDescription className="text-xs">
            Informações principais exibidas no topo e nos links de contato da lojinha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-biz-name" className="text-xs font-semibold">
                Nome da Lojinha Online (Vitrine Pública)
              </Label>
              <Input
                id="m-biz-name"
                placeholder="Ex: Luisices Papelaria"
                value={formData.catalogStoreName}
                onChange={(e) => handleChange('catalogStoreName', e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Nome exibido exclusivamente na vitrine e catálogo público. Não altera o nome interno do ateliê/sistema.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-biz-phone" className="text-xs font-semibold flex items-center gap-1">
                <Phone className="size-3.5 text-muted-foreground" />
                WhatsApp de Recebimento de Pedidos (Exclusivo da Lojinha)
              </Label>
              <Input
                id="m-biz-phone"
                placeholder="Ex: (11) 99999-9999"
                value={formData.catalogWhatsappPhone}
                onChange={(e) => handleChange('catalogWhatsappPhone', formatPhoneForDisplay(e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground">
                Número dedicado para receber pedidos dos clientes via catálogo online. Não altera o WhatsApp institucional do ateliê.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-biz-tag" className="text-xs font-semibold">
              Slogan da Lojinha Online
            </Label>
            <Input
              id="m-biz-tag"
              placeholder="Ex: Papelaria artesanal feita à mão para momentos únicos"
              value={formData.catalogStoreTagline}
              onChange={(e) => handleChange('catalogStoreTagline', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-biz-insta" className="text-xs font-semibold flex items-center gap-1">
                <AtSign className="size-3.5 text-muted-foreground" />
                Instagram Principal
              </Label>
              <Input
                id="m-biz-insta"
                placeholder="Ex: https://instagram.com/luisicesatelie"
                value={formData.instagramUrl}
                onChange={(e) => handleChange('instagramUrl', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-biz-insta-colab" className="text-xs font-semibold flex items-center gap-1">
                <AtSign className="size-3.5 text-[#E1306C]" />
                Instagram Parceiro / Colab (Opcional)
              </Label>
              <Input
                id="m-biz-insta-colab"
                placeholder="Ex: https://instagram.com/parceiro_atelie"
                value={formData.instagramColabUrl}
                onChange={(e) => handleChange('instagramColabUrl', e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Exibido na lojinha para cenários de colabs, parceiros ou marcas parceiras.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-biz-web" className="text-xs font-semibold flex items-center gap-1">
              <Globe className="size-3.5 text-muted-foreground" />
              Website Oficial (Opcional)
            </Label>
            <Input
              id="m-biz-web"
              placeholder="Ex: https://luisices.com.br"
              value={formData.websiteUrl}
              onChange={(e) => handleChange('websiteUrl', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

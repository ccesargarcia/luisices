import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Layers,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ImageIcon,
  Building2,
  Upload,
  X,
  Loader2,
  Sparkles,
  SlidersHorizontal,
  Check,
  LayoutGrid,
  Type,
  ArrowUpDown,
  Smartphone,
  Eye,
  Palette,
  Search,
  ShoppingBag,
  Moon,
  Sun,
  AlignLeft,
  AlignCenter,
  Bell,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { BannerCarousel, CatalogBannerItem } from '../catalog/BannerCarousel';
import {
  StoreCustomizationFormData,
  StoreCustomizationHandleChange,
  HEADER_COLOR_PRESETS,
} from './types';

export interface StoreIdentityTabProps {
  formData: StoreCustomizationFormData;
  handleChange: StoreCustomizationHandleChange;
  // Banners
  catalogBanners: CatalogBannerItem[];
  catalogBannerAutoPlay: boolean;
  setCatalogBannerAutoPlay: (val: boolean) => void;
  catalogBannerInterval: number;
  setCatalogBannerInterval: (val: number) => void;
  uploadingBanner: boolean;
  handleAddBanner: (file: File) => Promise<void>;
  handleRemoveBanner: (index: number) => Promise<void>;
  handleUpdateBannerField: (index: number, field: 'title' | 'linkUrl', value: string) => void;
  handleMoveBanner: (index: number, dir: 'up' | 'down') => void;
  // Logo
  currentCatalogLogo: string | null;
  uploadingLogo: boolean;
  handleLogoUpload: (file: File) => Promise<void>;
  handleLogoRemove: () => Promise<void>;
  // Header background
  currentCatalogHeaderBackground: string | null;
  uploadingHeaderBackground: boolean;
  handleHeaderBackgroundUpload: (file: File) => Promise<void>;
  handleHeaderBackgroundRemove: () => Promise<void>;
}

export function StoreIdentityTab({
  formData,
  handleChange,
  catalogBanners,
  catalogBannerAutoPlay,
  setCatalogBannerAutoPlay,
  catalogBannerInterval,
  setCatalogBannerInterval,
  uploadingBanner,
  handleAddBanner,
  handleRemoveBanner,
  handleUpdateBannerField,
  handleMoveBanner,
  currentCatalogLogo,
  uploadingLogo,
  handleLogoUpload,
  handleLogoRemove,
  currentCatalogHeaderBackground,
  uploadingHeaderBackground,
  handleHeaderBackgroundUpload,
  handleHeaderBackgroundRemove,
}: StoreIdentityTabProps) {
  return (
    <div className="space-y-5">
              {/* Card de Gestão dos Banners Rotativos (Vitrine / Propaganda 4:1) */}
              <Card className="border-primary/25 shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="size-4 text-primary" />
                      Banners Rotativos & Vitrine de Propaganda (Carrossel)
                    </CardTitle>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                      {catalogBanners.length} {catalogBanners.length === 1 ? 'propaganda ativa' : 'propagandas ativas'}
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Crie uma vitrine em carrossel rotativo no topo do seu catálogo. Adicione quantos banners desejar, reordene e defina a velocidade da transição automática estilo propaganda comercial.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Barra de Controles de Rotação Automática e Intervalo */}
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Switch
                        id="banner-autoplay-toggle"
                        checked={catalogBannerAutoPlay}
                        onCheckedChange={(checked) => setCatalogBannerAutoPlay(checked)}
                      />
                      <div>
                        <Label htmlFor="banner-autoplay-toggle" className="text-xs font-semibold cursor-pointer">
                          Rotação Automática
                        </Label>
                        <p className="text-[10px] text-muted-foreground">
                          {catalogBannerAutoPlay ? 'Alterna os banners de forma automática' : 'Troca pausada (apenas manual)'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Tempo por banner:</span>
                      <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border/80">
                        {[
                          { val: 3, label: '3s' },
                          { val: 5, label: '5s' },
                          { val: 7, label: '7s' },
                          { val: 10, label: '10s' },
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setCatalogBannerInterval(item.val)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                              catalogBannerInterval === item.val
                                ? 'bg-primary text-primary-foreground shadow-2xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Prévia em Tempo Real do Carrossel */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5">
                        <Eye className="size-3.5 text-primary" />
                        Prévia em Tempo Real
                      </span>
                      {catalogBanners.length > 1 && (
                        <span className="text-[11px] text-primary/80">
                          {catalogBannerAutoPlay ? `Alternando a cada ${catalogBannerInterval} segundos` : 'Pausado na visualização'}
                        </span>
                      )}
                    </div>

                    {catalogBanners.length > 0 ? (
                      <div className="border border-border/80 rounded-2xl overflow-hidden shadow-xs bg-muted/20">
                        <BannerCarousel
                          banners={catalogBanners}
                          intervalSeconds={catalogBannerInterval}
                          autoPlay={catalogBannerAutoPlay}
                          aspectRatioClass="aspect-[4/1]"
                          roundedClass="rounded-2xl"
                          storeName={formData.catalogStoreName || 'Ateliê'}
                        />
                      </div>
                    ) : (
                      <div className="relative w-full aspect-[4/1] rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center p-4 text-center text-muted-foreground gap-1.5">
                        <ImageIcon className="size-7 opacity-40 text-primary" />
                        <p className="text-xs font-semibold text-foreground/80">Nenhum banner cadastrado</p>
                        <p className="text-[10px] opacity-75 max-w-md">
                          Adicione banners no formato panorâmico 4:1 (recomendado: 1584 x 396 px) para criar o carrossel de propaganda.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Botão de Adicionar Novo Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <Label htmlFor="store-banner-upload-multi" className="cursor-pointer inline-block">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        disabled={uploadingBanner}
                        className="gap-2 shadow-xs"
                        asChild
                      >
                        <span>
                          {uploadingBanner ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              Enviando banner...
                            </>
                          ) : (
                            <>
                              <Plus className="size-4" />
                              Adicionar Banner / Propaganda
                            </>
                          )}
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="store-banner-upload-multi"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) void handleAddBanner(file);
                      }}
                    />
                    <span className="text-[11px] text-muted-foreground">
                      JPG, PNG ou WebP até 5MB • Formato Panorâmico 4:1
                    </span>
                  </div>

                  {/* Lista Ordenável de Banners Cadastrados */}
                  {catalogBanners.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                        <span>Banners Cadastrados ({catalogBanners.length})</span>
                        <span className="text-[10px] font-normal">Use as setas para reordenar a sequência de exibição</span>
                      </div>
                      <div className="space-y-2.5">
                        {catalogBanners.map((banner, index) => (
                          <div
                            key={banner.id || `banner-${index}`}
                            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl border border-border/70 bg-card/60 hover:border-primary/40 transition-colors shadow-2xs"
                          >
                            {/* Thumbnail & Posição */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                {index + 1}
                              </span>
                              <div className="w-28 sm:w-32 aspect-[4/1] rounded-lg overflow-hidden border border-border/80 bg-muted shrink-0 shadow-2xs">
                                <img
                                  src={banner.imageUrl}
                                  alt={banner.title || `Banner ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>

                            {/* Título e Link */}
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full min-w-0">
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Legenda / Título (opcional)</Label>
                                <Input
                                  placeholder="Ex: Volta às Aulas com 15% OFF"
                                  value={banner.title || ''}
                                  onChange={(e) => handleUpdateBannerField(index, 'title', e.target.value)}
                                  className="h-8 text-xs bg-background/80"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Link de Clique (opcional)</Label>
                                <Input
                                  placeholder="Ex: https://instagram.com/... ou link promocional"
                                  value={banner.linkUrl || ''}
                                  onChange={(e) => handleUpdateBannerField(index, 'linkUrl', e.target.value)}
                                  className="h-8 text-xs bg-background/80"
                                />
                              </div>
                            </div>

                            {/* Controles de Ordenação e Remoção */}
                            <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={index === 0}
                                onClick={() => handleMoveBanner(index, 'up')}
                                title="Subir posição (exibir antes)"
                                className="size-8 text-muted-foreground hover:text-foreground"
                              >
                                <ArrowUp className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={index === catalogBanners.length - 1}
                                onClick={() => handleMoveBanner(index, 'down')}
                                title="Descer posição (exibir depois)"
                                className="size-8 text-muted-foreground hover:text-foreground"
                              >
                                <ArrowDown className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveBanner(index)}
                                title="Remover este banner"
                                className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground">
                    💡 <strong>Dica Pro:</strong> Os banners em estilo carrossel giram automaticamente para seus clientes enquanto navegam pelos seus produtos, aumentando a visualização de lançamentos e promoções.
                  </p>
                </CardContent>
              </Card>

              {/* Card de Upload do Logo */}
              <Card className="border-primary/25 shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="size-4 text-primary" />
                      Logo Exclusivo da Lojinha Online
                    </CardTitle>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                      Exclusivo da Vitrine
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Configure a logo da sua marca para a vitrine pública online. O novo cabeçalho da loja exibirá sua logo com proporções naturais (horizontal ou quadrada), com destaque nobre no topo da loja e presença constante na barra de navegação.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {currentCatalogLogo ? (
                      <div className="relative group h-20 min-w-[90px] max-w-[240px] rounded-xl overflow-hidden border border-border bg-muted/40 p-2 flex items-center justify-center shrink-0 shadow-2xs">
                        <img
                          src={currentCatalogLogo}
                          alt="Logo da Lojinha Online"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          className="max-h-full w-auto object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-20 w-36 rounded-xl border-2 border-dashed border-border bg-muted/20 flex flex-col items-center justify-center text-muted-foreground shrink-0 gap-1 p-2">
                        <Building2 className="size-6 opacity-50" />
                        <span className="text-[10px] text-center">Sem logo cadastrado</span>
                      </div>
                    )}

                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <Label htmlFor="store-logo-upload" className="cursor-pointer">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingLogo}
                            className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
                            asChild
                          >
                            <span>
                              {uploadingLogo ? (
                                <>
                                  <Loader2 className="size-3.5 animate-spin" />
                                  Enviando logo da lojinha...
                                </>
                              ) : (
                                <>
                                  <Upload className="size-3.5" />
                                  {currentCatalogLogo ? 'Trocar Logo da Lojinha' : 'Enviar Logo Completo'}
                                </>
                              )}
                            </span>
                          </Button>
                        </Label>
                        <Input
                          id="store-logo-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) void handleLogoUpload(file);
                          }}
                        />

                        {currentCatalogLogo && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={uploadingLogo}
                            onClick={handleLogoRemove}
                            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                          >
                            <X className="size-3.5" />
                            Remover Logo da Lojinha
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {currentCatalogLogo
                          ? '✅ Logo completo ativo na vitrine online pública. Exibido em destaque no cabeçalho e na barra de busca fixa.'
                          : '💡 Dica: Envie o logotipo completo do seu ateliê (horizontal ou quadrado, de preferência em PNG transparente ou WebP).'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Personalização Completa da Barra Superior Fixa */}
              <Card className="border-primary/25 shadow-xs">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Palette className="size-4 text-primary" />
                      Barra Superior Fixa com Imagem (Full-Width)
                    </CardTitle>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                      Fixa no Topo
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Esta barra acompanha o cliente durante toda a navegação exibindo exclusivamente sua arte/imagem de ponta a ponta. Os demais itens (busca, sacola e redes) ficam organizados na barra de ações dedicada da página.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                  {/* 1. Prévia em Tempo Real da Barra Superior */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        <Eye className="size-3.5 text-primary" />
                        Prévia da Barra Fixa em Tempo Real
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        Como seus clientes verão no topo do catálogo
                      </span>
                    </div>

                    {/* Barra Fixa Superior com Imagem */}
                    <div
                      className="relative w-full rounded-2xl border overflow-hidden transition-all duration-200 shadow-sm flex items-center justify-center border-border/80 select-none"
                      style={{
                        backgroundColor: formData.catalogHeaderBgColor || '#ffffff',
                        height: formData.catalogHeaderHeight === 'compact' ? '56px' : formData.catalogHeaderHeight === 'large' ? '88px' : '72px',
                      }}
                    >
                      {currentCatalogHeaderBackground ? (
                        <img
                          src={currentCatalogHeaderBackground}
                          alt="Arte de fundo da barra superior"
                          className="w-full h-full object-cover object-center"
                        />
                      ) : currentCatalogLogo ? (
                        <div className="h-full py-2 flex items-center justify-center px-4">
                          <img
                            src={currentCatalogLogo}
                            alt="Logo"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            className="max-h-full w-auto object-contain"
                          />
                        </div>
                      ) : (
                        <span className={`text-xs font-bold ${formData.catalogHeaderTextColor === 'light' ? 'text-white' : 'text-stone-700'}`}>
                          {formData.catalogStoreName || 'Luisices Papelaria'}
                        </span>
                      )}
                    </div>

                    {/* Barra de Ações Simulada (Busca e Sacola em área dedicada) */}
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5 flex items-center justify-between gap-2.5">
                      <div className="flex-1 relative flex items-center gap-2 bg-background rounded-lg border border-border/70 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                        <Search size={13} className="opacity-60 shrink-0" />
                        <span className="truncate">Buscar produtos, temas, lembranças...</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#613d3e] text-white text-[11px] font-bold shadow-2xs shrink-0">
                        <ShoppingBag size={12} />
                        <span>Sacola (R$ 0,00)</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Upload de Imagem/Arte de Fundo da Barra Superior */}
                  <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-bold flex items-center gap-1.5">
                          <ImageIcon className="size-3.5 text-primary" />
                          Arte / Imagem de Fundo da Barra (Full-Width)
                        </Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Preenche toda a barra superior fixa com sua arte, padrão ou textura visual personalizada.
                        </p>
                      </div>
                      {currentCatalogHeaderBackground && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                          Arte Ativa
                        </span>
                      )}
                    </div>

                    {currentCatalogHeaderBackground && (
                      <div className="relative w-full h-14 rounded-lg overflow-hidden border border-border shadow-2xs">
                        <img
                          src={currentCatalogHeaderBackground}
                          alt="Arte de fundo da barra superior"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <Label htmlFor="header-bg-upload" className="cursor-pointer">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingHeaderBackground}
                          className="gap-2 border-primary/30 text-primary hover:bg-primary/5 text-xs"
                          asChild
                        >
                          <span>
                            {uploadingHeaderBackground ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Enviando imagem da barra...
                              </>
                            ) : (
                              <>
                                <Upload className="size-3.5" />
                                {currentCatalogHeaderBackground ? 'Trocar Imagem de Fundo' : 'Enviar Imagem para a Barra'}
                              </>
                            )}
                          </span>
                        </Button>
                      </Label>
                      <Input
                        id="header-bg-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file) void handleHeaderBackgroundUpload(file);
                        }}
                      />

                      {currentCatalogHeaderBackground && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={uploadingHeaderBackground}
                          onClick={handleHeaderBackgroundRemove}
                          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                        >
                          <X className="size-3.5" />
                          Remover Imagem de Fundo
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      💡 Recomendação: Use imagens panorâmicas horizontais (ex: 1920x100px ou texturas contínuas, WebP ou PNG até 5MB).
                    </p>
                  </div>

                  {/* 3. Cor de Fundo da Barra Superior */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Palette className="size-3.5 text-primary" />
                        Cor de Fundo da Barra Superior
                      </Label>
                      {formData.catalogHeaderBgColor && (
                        <button
                          type="button"
                          onClick={() => handleChange('catalogHeaderBgColor', '')}
                          className="text-[11px] text-primary hover:underline"
                        >
                          Restaurar Padrão
                        </button>
                      )}
                    </div>

                    {/* Presets de Cor */}
                    <div className="flex flex-wrap gap-2">
                      {HEADER_COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            handleChange('catalogHeaderBgColor', preset.color);
                            handleChange('catalogHeaderTextColor', preset.textColor);
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all ${
                            formData.catalogHeaderBgColor.toLowerCase() === preset.color.toLowerCase()
                              ? 'ring-2 ring-primary border-transparent font-bold scale-105'
                              : 'border-border/80 hover:border-primary/50 text-muted-foreground'
                          }`}
                        >
                          <span
                            className="size-3.5 rounded-full border border-black/10 shrink-0 shadow-2xs"
                            style={{ backgroundColor: preset.color }}
                          />
                          <span>{preset.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Seletor Customizado Hexadecimal */}
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center gap-2">
                        <input
                          type="color"
                          id="m-header-color-picker"
                          value={formData.catalogHeaderBgColor || '#ffffff'}
                          onChange={(e) => handleChange('catalogHeaderBgColor', e.target.value)}
                          className="size-9 rounded-lg border border-border cursor-pointer p-0.5 bg-background"
                        />
                        <Label htmlFor="m-header-color-picker" className="text-xs font-semibold cursor-pointer">
                          Seletor de Cor Livre
                        </Label>
                      </div>
                      <div className="w-32">
                        <Input
                          placeholder="#ffffff"
                          value={formData.catalogHeaderBgColor}
                          onChange={(e) => handleChange('catalogHeaderBgColor', e.target.value)}
                          className="text-xs uppercase font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Contraste de Texto & Ícones */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">
                      Contraste dos Textos e Ícones da Barra
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleChange('catalogHeaderTextColor', 'dark')}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                          formData.catalogHeaderTextColor === 'dark'
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border/80 hover:border-border'
                        }`}
                      >
                        <Moon className={`size-4 mt-0.5 shrink-0 ${formData.catalogHeaderTextColor === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="text-xs font-semibold">Texto Escuro (Padrão)</p>
                          <p className="text-[10px] text-muted-foreground">Ideal para fundos claros, tons pastel ou fundos brancos.</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChange('catalogHeaderTextColor', 'light')}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                          formData.catalogHeaderTextColor === 'light'
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border/80 hover:border-border'
                        }`}
                      >
                        <Sun className={`size-4 mt-0.5 shrink-0 ${formData.catalogHeaderTextColor === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="text-xs font-semibold">Texto Claro (Branco)</p>
                          <p className="text-[10px] text-muted-foreground">Ideal para artes escuras, cores intensas ou Marsala.</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 5. Posição da Logo & Altura da Barra */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <AlignLeft className="size-3.5 text-primary" />
                        Posição da Logo na Barra Fixa
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleChange('catalogHeaderLogoPosition', 'left')}
                          className={`p-2.5 rounded-lg border text-center transition-all ${
                            formData.catalogHeaderLogoPosition !== 'center'
                              ? 'border-primary bg-primary/5 font-semibold text-primary'
                              : 'border-border/80 text-muted-foreground hover:border-border text-xs'
                          }`}
                        >
                          <AlignLeft className="size-4 mx-auto mb-1" />
                          <span className="text-xs">À Esquerda</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChange('catalogHeaderLogoPosition', 'center')}
                          className={`p-2.5 rounded-lg border text-center transition-all ${
                            formData.catalogHeaderLogoPosition === 'center'
                              ? 'border-primary bg-primary/5 font-semibold text-primary'
                              : 'border-border/80 text-muted-foreground hover:border-border text-xs'
                          }`}
                        >
                          <AlignCenter className="size-4 mx-auto mb-1" />
                          <span className="text-xs">Centralizada</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">
                        Altura da Barra Fixa
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'compact', label: 'Compacta', sub: '58px' },
                          { id: 'normal', label: 'Padrão', sub: '68px' },
                          { id: 'large', label: 'Ampla', sub: '88px' },
                        ].map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => handleChange('catalogHeaderHeight', h.id)}
                            className={`p-2 rounded-lg border text-center transition-all ${
                              formData.catalogHeaderHeight === h.id
                                ? 'border-primary bg-primary/5 font-semibold text-primary'
                                : 'border-border/80 text-muted-foreground hover:border-border'
                            }`}
                          >
                            <span className="text-xs block">{h.label}</span>
                            <span className="text-[10px] opacity-70 block">{h.sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 6. Switch: Ocultar texto ao lado da logo */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/10">
                    <div className="space-y-0.5 pr-4">
                      <Label htmlFor="m-hide-text" className="text-xs font-semibold cursor-pointer">
                        Ocultar nome do ateliê em texto ao lado da logo
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Ative se seu logotipo já possui o nome por extenso, evitando que o nome apareça duplicado.
                      </p>
                    </div>
                    <Switch
                      id="m-hide-text"
                      checked={Boolean(formData.catalogHeaderHideText)}
                      onCheckedChange={(checked) => handleChange('catalogHeaderHideText', checked)}
                    />
                  </div>

                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    Identidade do Cabeçalho & Barra Superior
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Define o selo afetivo da marca, o status de atendimento e anúncios de campanhas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="m-badge" className="text-xs font-semibold">
                        Selo da Marca (Badge)
                      </Label>
                      <Input
                        id="m-badge"
                        placeholder="Ex: Atelier, Papelaria Afetiva, Personalizados"
                        value={formData.catalogBadge}
                        onChange={(e) => handleChange('catalogBadge', e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">Pílula ao lado do nome do ateliê</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="m-status" className="text-xs font-semibold">
                        Status do Atendimento
                      </Label>
                      <Input
                        id="m-status"
                        placeholder="Ex: Atendimento WhatsApp ativo"
                        value={formData.catalogStatusText}
                        onChange={(e) => handleChange('catalogStatusText', e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">Frase ao lado da luz pulsante no topo</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-announcement" className="text-xs font-semibold flex items-center gap-1.5">
                      <Bell className="size-3.5 text-amber-500" />
                      Faixa de Aviso Promocional (Opcional)
                    </Label>
                    <Input
                      id="m-announcement"
                      placeholder="Ex: ✨ Agenda de Páscoa aberta! Encomendas com entrega até 25/03"
                      value={formData.catalogAnnouncement}
                      onChange={(e) => handleChange('catalogAnnouncement', e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Deixe em branco para ocultar. Quando preenchido, exibe um banner dourado no topo da lojinha.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    Apresentação & Vitrine (Banner Hero)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    O cartão de boas-vindas logo abaixo do cabeçalho da lojinha.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Switch: Exibir Apresentação & Vitrine */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/10">
                    <div className="space-y-0.5 pr-4">
                      <Label htmlFor="m-show-hero" className="text-xs font-semibold cursor-pointer">
                        Exibir cartão de Apresentação & Vitrine (Banner Hero)
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Ative para exibir o cartão de boas-vindas com dados do ateliê, slogan e selos de confiança. Desative caso queira ir direto para a vitrine de produtos.
                      </p>
                    </div>
                    <Switch
                      id="m-show-hero"
                      checked={Boolean(formData.catalogShowHero)}
                      onCheckedChange={(checked) => handleChange('catalogShowHero', checked)}
                    />
                  </div>

                  {!formData.catalogShowHero && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium px-1">
                      ⚠️ Este cartão está desativado e não será exibido no catálogo público.
                    </p>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="m-hero-title" className="text-xs font-semibold">
                      Título Superior da Vitrine (Selo Pequeno)
                    </Label>
                    <Input
                      id="m-hero-title"
                      placeholder="Ex: Catálogo & Vitrine Afetiva"
                      value={formData.catalogHeroTitle}
                      onChange={(e) => handleChange('catalogHeroTitle', e.target.value)}
                    />
                  </div>

                  {/* Frase Principal de Destaque / Slogan do Banner */}
                  <div className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="m-hero-tagline" className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-primary" />
                        Frase de Destaque / Slogan Principal do Banner
                      </Label>
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Texto Central da Vitrine
                      </span>
                    </div>
                    <Input
                      id="m-hero-tagline"
                      className="bg-background font-medium text-sm"
                      placeholder="Ex: Papelaria artesanal feita à mão para momentos únicos"
                      value={formData.catalogStoreTagline}
                      onChange={(e) => handleChange('catalogStoreTagline', e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Este é o texto principal exibido com destaque central no banner da vitrine da lojinha.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-hero-desc" className="text-xs font-semibold">
                      Texto de Boas-vindas / Instruções de Encomenda
                    </Label>
                    <Textarea
                      id="m-hero-desc"
                      rows={3}
                      placeholder="Ex: Escolha suas peças, informe o nome para personalização e envie o pedido formatado diretamente no nosso WhatsApp."
                      value={formData.catalogHeroDescription}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('catalogHeroDescription', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card de Estilo de Filtros & Navegação de Temas */}
              <Card className="border-primary/25 shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <SlidersHorizontal className="size-4 text-primary" />
                      Estilo de Filtros & Navegação de Temas
                    </CardTitle>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                      Mobile & Web
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Escolha como os clientes navegam pelos seus temas e ocasiões (ex: Batizados, Planners, Topos de Bolo) no catálogo público.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Opção 1: Dropdown */}
                    <button
                      type="button"
                      onClick={() => handleChange('catalogCategoryFilterStyle', 'dropdown')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                        formData.catalogCategoryFilterStyle === 'dropdown'
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/40 font-semibold text-foreground shadow-xs'
                          : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <SlidersHorizontal className="size-3.5 text-primary" />
                            Dropdown Compacto
                          </span>
                          {formData.catalogCategoryFilterStyle === 'dropdown' && (
                            <Check className="size-3.5 text-primary" />
                          )}
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-85">
                          Barra única minimalista com menu flutuante e contadores dinâmicos.
                        </p>
                      </div>
                      <span className="text-[10px] text-primary font-medium">Recomendado • Mais limpo</span>
                    </button>

                    {/* Opção 2: Carrossel */}
                    <button
                      type="button"
                      onClick={() => handleChange('catalogCategoryFilterStyle', 'carousel')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                        formData.catalogCategoryFilterStyle === 'carousel'
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/40 font-semibold text-foreground shadow-xs'
                          : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <LayoutGrid className="size-3.5 text-primary" />
                            Carrossel de Chips
                          </span>
                          {formData.catalogCategoryFilterStyle === 'carousel' && (
                            <Check className="size-3.5 text-primary" />
                          )}
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-85">
                          Linha horizontal com scroll lateral suave e todos os temas visíveis de imediato.
                        </p>
                      </div>
                      <span className="text-[10px] text-primary font-medium">Descoberta rápida</span>
                    </button>

                    {/* Opção 3: Bottom Sheet */}
                    <button
                      type="button"
                      onClick={() => handleChange('catalogCategoryFilterStyle', 'bottom_sheet')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                        formData.catalogCategoryFilterStyle === 'bottom_sheet'
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/40 font-semibold text-foreground shadow-xs'
                          : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Layers className="size-3.5 text-primary" />
                            Gaveta / Bottom Sheet
                          </span>
                          {formData.catalogCategoryFilterStyle === 'bottom_sheet' && (
                            <Check className="size-3.5 text-primary" />
                          )}
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-85">
                          Botão moderno que abre uma gaveta deslizante com busca e contadores.
                        </p>
                      </div>
                      <span className="text-[10px] text-primary font-medium">Estilo App Nativo</span>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Grid, Densidade & Exibição dos Produtos */}
              <Card className="border-primary/25 shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <LayoutGrid className="size-4 text-primary" />
                      Grid, Densidade & Proporção das Fotos
                    </CardTitle>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                      Vitrine dos Cards
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Personalize o layout dos cartões de produtos, tamanho das imagens e a densidade da grade tanto no celular quanto no computador.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* 1. Densidade do Grid */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Smartphone className="size-3.5 text-primary" />
                      Densidade do Grid de Produtos
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleChange('catalogCardDensity', 'compact')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          formData.catalogCardDensity === 'compact'
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/40 font-semibold text-foreground shadow-xs'
                            : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">Compacto E-commerce (Padrão)</span>
                          {formData.catalogCardDensity === 'compact' && <Check className="size-3.5 text-primary" />}
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-85">
                          2 colunas no celular e até 4 no desktop. Exibe mais produtos simultaneamente na tela.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChange('catalogCardDensity', 'editorial')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          formData.catalogCardDensity === 'editorial'
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/40 font-semibold text-foreground shadow-xs'
                            : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">Editorial & Lookbook</span>
                          {formData.catalogCardDensity === 'editorial' && <Check className="size-3.5 text-primary" />}
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-85">
                          1 coluna ampla no celular e 3 no desktop. Foco máximo em fotos grandes e detalhes de luxo.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* 2. Proporção das Imagens */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <ImageIcon className="size-3.5 text-primary" />
                      Proporção da Imagem dos Produtos
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleChange('catalogImageAspect', 'square')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          formData.catalogImageAspect === 'square'
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/40 font-semibold text-foreground shadow-xs'
                            : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">Quadrado 1:1 (Padrão)</span>
                          {formData.catalogImageAspect === 'square' && <Check className="size-3.5 text-primary" />}
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-85">
                          Proporção simétrica clássica de e-commerce e catálogo de produtos.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChange('catalogImageAspect', 'portrait')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          formData.catalogImageAspect === 'portrait'
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/40 font-semibold text-foreground shadow-xs'
                            : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">Retrato 4:5 (Lookbook)</span>
                          {formData.catalogImageAspect === 'portrait' && <Check className="size-3.5 text-primary" />}
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-85">
                          Formato vertical estendido, valorizando cadernos, planners e fotos de papelaria afetiva.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* 3. Limite de Produtos por Exibição (Paginação & Carregar Mais) */}
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Layers className="size-3.5 text-primary" />
                        Produtos por Exibição (Botão "Carregar Mais")
                      </Label>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {formData.catalogProductsPerPage === 0 ? 'Sem limite (Todos)' : `${formData.catalogProductsPerPage} itens`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { label: '12 itens', value: 12, desc: 'Rápido & leve' },
                        { label: '24 itens', value: 24, desc: 'Equilibrado' },
                        { label: '36 itens', value: 36, desc: 'Amplo' },
                        { label: '48 itens', value: 48, desc: 'Catálogo grande' },
                        { label: 'Todos', value: 0, desc: 'Sem paginação' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleChange('catalogProductsPerPage', opt.value)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                            formData.catalogProductsPerPage === opt.value
                              ? 'border-primary bg-primary/10 ring-2 ring-primary/40 font-semibold text-foreground shadow-xs'
                              : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40 text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">{opt.label}</span>
                            {formData.catalogProductsPerPage === opt.value && <Check className="size-3.5 text-primary" />}
                          </div>
                          <span className="text-[10px] leading-tight opacity-75">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Define a quantidade inicial de produtos renderizados na vitrine. Ao atingir o limite, um botão elegante <strong>"Carregar Mais"</strong> com barra de progresso permite que o cliente continue visualizando o restante do catálogo de forma rápida e fluida.
                    </p>
                  </div>

                  {/* 4. Selos e Indicadores nos Cards de Produto */}
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <BadgeCheck className="size-3.5 text-primary" />
                      Selos e Indicadores Visuais nos Cards
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/10">
                        <div className="space-y-0.5 pr-2">
                          <Label htmlFor="m-badge-custom" className="text-xs font-semibold cursor-pointer">
                            Selo "Personalizável"
                          </Label>
                          <p className="text-[10px] text-muted-foreground">Ícone de brilho indicando que o produto aceita nome/tema.</p>
                        </div>
                        <Switch
                          id="m-badge-custom"
                          checked={formData.catalogShowBadgeCustomizable}
                          onCheckedChange={(checked) => handleChange('catalogShowBadgeCustomizable', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/10">
                        <div className="space-y-0.5 pr-2">
                          <Label htmlFor="m-badge-lead" className="text-xs font-semibold cursor-pointer">
                            Prazo de Confecção
                          </Label>
                          <p className="text-[10px] text-muted-foreground">Pílula com o tempo de produção em dias úteis ou pronta entrega.</p>
                        </div>
                        <Switch
                          id="m-badge-lead"
                          checked={formData.catalogShowBadgeLeadTime}
                          onCheckedChange={(checked) => handleChange('catalogShowBadgeLeadTime', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/10">
                        <div className="space-y-0.5 pr-2">
                          <Label htmlFor="m-badge-bestseller" className="text-xs font-semibold cursor-pointer">
                            Selo de Destaque / Mais Vendido
                          </Label>
                          <p className="text-[10px] text-muted-foreground">Etiqueta destacada no canto da foto para produtos em alta.</p>
                        </div>
                        <Switch
                          id="m-badge-bestseller"
                          checked={formData.catalogShowBadgeBestSeller}
                          onCheckedChange={(checked) => handleChange('catalogShowBadgeBestSeller', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/10">
                        <div className="space-y-0.5 pr-2">
                          <Label htmlFor="m-badge-new" className="text-xs font-semibold cursor-pointer">
                            Selo de Novidades
                          </Label>
                          <p className="text-[10px] text-muted-foreground">Identificador visual para novos lançamentos do ateliê.</p>
                        </div>
                        <Switch
                          id="m-badge-new"
                          checked={formData.catalogShowBadgeNew}
                          onCheckedChange={(checked) => handleChange('catalogShowBadgeNew', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Atmosfera Visual, Tipografia & Ordenação */}
              <Card className="border-primary/25 shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Palette className="size-4 text-primary" />
                      Atmosfera Visual, Tipografia & Ordenação
                    </CardTitle>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                      Design System
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Defina o clima estético da loja (glassmorphism ou minimalismo puro), o estilo tipográfico e como os produtos são ordenados por padrão.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* 1. Estilo de Fundo & Superfície */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary" />
                      Estilo de Fundo & Superfície
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleChange('catalogBackgroundStyle', 'atmospheric')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          formData.catalogBackgroundStyle === 'atmospheric'
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/40 font-semibold text-foreground shadow-xs'
                            : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">Liquid Glassmorphism (Padrão)</span>
                          {formData.catalogBackgroundStyle === 'atmospheric' && <Check className="size-3.5 text-primary" />}
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-85">
                          Efeito de vidro translúcido com orbes de cor suaves e desfoque moderno.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChange('catalogBackgroundStyle', 'solid')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          formData.catalogBackgroundStyle === 'solid'
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/40 font-semibold text-foreground shadow-xs'
                            : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">Papel Clean Minimalista</span>
                          {formData.catalogBackgroundStyle === 'solid' && <Check className="size-3.5 text-primary" />}
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-85">
                          Fundo plano e sólido com bordas nítidas, máxima velocidade e legibilidade.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* 2. Estilo Tipográfico */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Type className="size-3.5 text-primary" />
                      Estilo Tipográfico dos Títulos
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleChange('catalogTypographyStyle', 'modern')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          formData.catalogTypographyStyle === 'modern'
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/40 font-semibold text-foreground shadow-xs'
                            : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground font-sans">Sans-Serif Moderno (Padrão)</span>
                          {formData.catalogTypographyStyle === 'modern' && <Check className="size-3.5 text-primary" />}
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-85">
                          Letras limpas e contemporâneas, alta legibilidade no mobile.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChange('catalogTypographyStyle', 'editorial')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          formData.catalogTypographyStyle === 'editorial'
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/40 font-semibold text-foreground shadow-xs'
                            : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground font-serif">Serif Editorial & Luxo</span>
                          {formData.catalogTypographyStyle === 'editorial' && <Check className="size-3.5 text-primary" />}
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-85">
                          Tipografia nobre estilo revista e ateliê de alta costura e papelaria fina.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* NOVO: Tema de Cores e Botões */}
                  <div className="space-y-4 pt-3 border-t border-border/60">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Palette className="size-3.5 text-primary" />
                      Cores e Botões da Lojinha
                    </Label>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Cor Primária (Botões e Destaques)</Label>
                      <div className="flex items-center gap-3">
                        <div className="relative flex items-center gap-2">
                          <input
                            type="color"
                            id="m-primary-color-picker"
                            value={formData.catalogPrimaryColor || '#f97316'}
                            onChange={(e) => handleChange('catalogPrimaryColor', e.target.value)}
                            className="size-9 rounded-lg border border-border cursor-pointer p-0.5 bg-background"
                          />
                        </div>
                        <div className="w-32">
                          <Input
                            placeholder="#f97316"
                            value={formData.catalogPrimaryColor}
                            onChange={(e) => handleChange('catalogPrimaryColor', e.target.value)}
                            className="text-xs uppercase font-mono"
                          />
                        </div>
                        {formData.catalogPrimaryColor && (
                          <button
                            type="button"
                            onClick={() => handleChange('catalogPrimaryColor', '')}
                            className="text-[11px] text-primary hover:underline"
                          >
                            Restaurar Padrão
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Arredondamento dos Botões</Label>
                        <Select 
                          value={formData.catalogButtonRadius} 
                          onValueChange={(val: string) => handleChange('catalogButtonRadius', val)}
                        >
                          <SelectTrigger className="text-xs bg-background">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Quadrado (Sem arredondamento)</SelectItem>
                            <SelectItem value="sm">Suave (Arredondamento leve)</SelectItem>
                            <SelectItem value="md">Médio (Padrão)</SelectItem>
                            <SelectItem value="lg">Grande (Bem arredondado)</SelectItem>
                            <SelectItem value="full">Pílula (Totalmente redondo)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Estilo dos Botões</Label>
                        <Select 
                          value={formData.catalogButtonStyle} 
                          onValueChange={(val: string) => handleChange('catalogButtonStyle', val)}
                        >
                          <SelectTrigger className="text-xs bg-background">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="solid">Sólido (Preenchido)</SelectItem>
                            <SelectItem value="soft">Suave (Fundo claro)</SelectItem>
                            <SelectItem value="outline">Contorno (Vazado)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* 3. Ordenação Padrão dos Produtos */}
                  <div className="space-y-2 pt-4 border-t border-border/60">
                    <Label htmlFor="m-default-sort" className="text-xs font-bold flex items-center gap-1.5">
                      <ArrowUpDown className="size-3.5 text-primary" />
                      Ordenação Padrão ao Abrir a Vitrine
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { val: 'destaque', label: 'Destaque / Ateliê' },
                        { val: 'preco-menor', label: 'Menor Preço' },
                        { val: 'preco-maior', label: 'Maior Preço' },
                        { val: 'nome-az', label: 'Nome (A-Z)' },
                        { val: 'prazo', label: 'Menor Prazo' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => handleChange('catalogDefaultSort', item.val)}
                          className={`p-2.5 rounded-xl border text-xs text-center transition-all cursor-pointer ${
                            formData.catalogDefaultSort === item.val
                              ? 'border-primary bg-primary/10 ring-1 ring-primary font-bold text-foreground'
                              : 'border-border/70 bg-muted/20 hover:border-border text-muted-foreground'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
    </div>
  );
}

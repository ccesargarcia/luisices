import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  LayoutTemplate,
  Sliders,
  Sparkles,
  Globe,
  Plus,
  Search,
  HelpCircle,
  Eye,
  Loader2,
  ArrowUp,
  PanelTop,
  PanelBottom,
  CheckCircle2,
} from 'lucide-react';

export interface HeaderFooterCustomizationProps {
  // Header
  headerSticky: boolean;
  onHeaderStickyChange: (val: boolean) => void;
  headerLogoStyle: 'full' | 'icon' | 'hidden';
  onHeaderLogoStyleChange: (val: 'full' | 'icon' | 'hidden') => void;
  headerShowTagline: boolean;
  onHeaderShowTaglineChange: (val: boolean) => void;
  headerShowQuickNew: boolean;
  onHeaderShowQuickNewChange: (val: boolean) => void;
  headerShowAiCopilot: boolean;
  onHeaderShowAiCopilotChange: (val: boolean) => void;
  headerShowCatalogLink: boolean;
  onHeaderShowCatalogLinkChange: (val: boolean) => void;
  headerShowQuickSearch: boolean;
  onHeaderShowQuickSearchChange: (val: boolean) => void;
  headerShowHelpCenter: boolean;
  onHeaderShowHelpCenterChange: (val: boolean) => void;
  headerStyle: 'blur' | 'solid' | 'bordered';
  onHeaderStyleChange: (val: 'blur' | 'solid' | 'bordered') => void;

  // Footer
  footerMode: 'compact' | 'complete' | 'hidden';
  onFooterModeChange: (val: 'compact' | 'complete' | 'hidden') => void;
  footerShowSocialLinks: boolean;
  onFooterShowSocialLinksChange: (val: boolean) => void;
  footerShowContactInfo: boolean;
  onFooterShowContactInfoChange: (val: boolean) => void;
  footerShowVersion: boolean;
  onFooterShowVersionChange: (val: boolean) => void;
  footerShowScrollToTop: boolean;
  onFooterShowScrollToTopChange: (val: boolean) => void;

  onSave: () => Promise<void>;
  saving: boolean;
}

export function HeaderFooterCustomizationSection({
  headerSticky,
  onHeaderStickyChange,
  headerLogoStyle,
  onHeaderLogoStyleChange,
  headerShowTagline,
  onHeaderShowTaglineChange,
  headerShowQuickNew,
  onHeaderShowQuickNewChange,
  headerShowAiCopilot,
  onHeaderShowAiCopilotChange,
  headerShowCatalogLink,
  onHeaderShowCatalogLinkChange,
  headerShowQuickSearch,
  onHeaderShowQuickSearchChange,
  headerShowHelpCenter,
  onHeaderShowHelpCenterChange,
  headerStyle,
  onHeaderStyleChange,
  footerMode,
  onFooterModeChange,
  footerShowSocialLinks,
  onFooterShowSocialLinksChange,
  footerShowContactInfo,
  onFooterShowContactInfoChange,
  footerShowVersion,
  onFooterShowVersionChange,
  footerShowScrollToTop,
  onFooterShowScrollToTopChange,
  onSave,
  saving,
}: HeaderFooterCustomizationProps) {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutTemplate className="size-5 text-primary" />
          Personalização do Cabeçalho & Rodapé
        </CardTitle>
        <CardDescription>
          Controle quais atalhos, botões e informações aparecem na barra superior e no rodapé do sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* ─── SEÇÃO 1: CABEÇALHO SUPERIOR ─────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <PanelTop className="size-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Barra Superior (Cabeçalho)
            </h3>
          </div>

          {/* Chave de Cabeçalho Fixo (Sticky) */}
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-primary/20 bg-primary/5">
            <div className="space-y-0.5 pr-2">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-semibold text-foreground cursor-pointer">
                  Cabeçalho Fixo ao Rolar a Página (Sticky)
                </Label>
                <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.2 rounded">
                  Recomendado
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Mantém a barra de navegação superior, atalhos rápidos e busca sempre visíveis no topo enquanto você rola a tela.
              </p>
            </div>
            <Switch
              checked={headerSticky}
              onCheckedChange={onHeaderStickyChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Estilo do Logo */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Exibição da Logomarca no Topo</Label>
              <Select
                value={headerLogoStyle}
                onValueChange={(val: 'full' | 'icon' | 'hidden') => onHeaderLogoStyleChange(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Logo Completa + Nome da Empresa</SelectItem>
                  <SelectItem value="icon">Apenas Ícone Símbolo + Nome</SelectItem>
                  <SelectItem value="hidden">Apenas Nome em Texto (Sem Logo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estilo Visual do Fundo */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Estilo Visual do Cabeçalho</Label>
              <Select
                value={headerStyle}
                onValueChange={(val: 'blur' | 'solid' | 'bordered') => onHeaderStyleChange(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blur">Vidro Fosco (Translúcido com Blur)</SelectItem>
                  <SelectItem value="solid">Sólido Opaco (Card Padrão)</SelectItem>
                  <SelectItem value="bordered">Minimalista (Borda Fina e Clean)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggles do Cabeçalho */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="space-y-0.5 pr-2">
                <Label className="text-xs font-medium cursor-pointer">Exibir Slogan da Empresa</Label>
                <p className="text-[11px] text-muted-foreground">Subtítulo abaixo do nome no topo</p>
              </div>
              <Switch
                checked={headerShowTagline}
                onCheckedChange={onHeaderShowTaglineChange}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="space-y-0.5 pr-2">
                <Label className="text-xs font-medium cursor-pointer">Barra de Busca Rápida (Ctrl+K)</Label>
                <p className="text-[11px] text-muted-foreground">Localizar páginas, clientes e pedidos</p>
              </div>
              <Switch
                checked={headerShowQuickSearch}
                onCheckedChange={onHeaderShowQuickSearchChange}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="space-y-0.5 pr-2">
                <Label className="text-xs font-medium cursor-pointer">Botão "+ Novo" (Ações Rápidas)</Label>
                <p className="text-[11px] text-muted-foreground">Criar pedido, orçamento ou cliente</p>
              </div>
              <Switch
                checked={headerShowQuickNew}
                onCheckedChange={onHeaderShowQuickNewChange}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="space-y-0.5 pr-2">
                <Label className="text-xs font-medium cursor-pointer">Botão do Copiloto de IA</Label>
                <p className="text-[11px] text-muted-foreground">Atalho para assistente inteligente</p>
              </div>
              <Switch
                checked={headerShowAiCopilot}
                onCheckedChange={onHeaderShowAiCopilotChange}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="space-y-0.5 pr-2">
                <Label className="text-xs font-medium cursor-pointer">Atalho para Catálogo Online</Label>
                <p className="text-[11px] text-muted-foreground">Botão direto para abrir a vitrine pública</p>
              </div>
              <Switch
                checked={headerShowCatalogLink}
                onCheckedChange={onHeaderShowCatalogLinkChange}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="space-y-0.5 pr-2">
                <Label className="text-xs font-medium cursor-pointer">Ícone da Central de Ajuda</Label>
                <p className="text-[11px] text-muted-foreground">Acesso rápido aos tutoriais e manuais</p>
              </div>
              <Switch
                checked={headerShowHelpCenter}
                onCheckedChange={onHeaderShowHelpCenterChange}
              />
            </div>
          </div>
        </div>

        {/* ─── SEÇÃO 2: RODAPÉ INFERIOR ─────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <PanelBottom className="size-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Rodapé do Sistema (Footer)
            </h3>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Modo de Exibição do Rodapé</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button
                type="button"
                variant={footerMode === 'compact' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFooterModeChange('compact')}
                className="justify-start text-xs h-9 gap-2"
              >
                <CheckCircle2 className={`size-3.5 ${footerMode === 'compact' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                Compacto (1 Linha Clean)
              </Button>
              <Button
                type="button"
                variant={footerMode === 'complete' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFooterModeChange('complete')}
                className="justify-start text-xs h-9 gap-2"
              >
                <CheckCircle2 className={`size-3.5 ${footerMode === 'complete' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                Completo (3 Colunas)
              </Button>
              <Button
                type="button"
                variant={footerMode === 'hidden' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFooterModeChange('hidden')}
                className="justify-start text-xs h-9 gap-2"
              >
                <CheckCircle2 className={`size-3.5 ${footerMode === 'hidden' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                Ocultar Rodapé (Tela Total)
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              O modo compacto preserva o espaço vertical na esteira de produção e telas operacionais.
            </p>
          </div>

          {footerMode !== 'hidden' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="space-y-0.5 pr-2">
                  <Label className="text-xs font-medium cursor-pointer">Exibir Redes Sociais</Label>
                  <p className="text-[11px] text-muted-foreground">Botões de Instagram, WhatsApp, E-mail e Site</p>
                </div>
                <Switch
                  checked={footerShowSocialLinks}
                  onCheckedChange={onFooterShowSocialLinksChange}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="space-y-0.5 pr-2">
                  <Label className="text-xs font-medium cursor-pointer">Exibir Dados de Contato</Label>
                  <p className="text-[11px] text-muted-foreground">Telefone comercial, e-mail e endereço</p>
                </div>
                <Switch
                  checked={footerShowContactInfo}
                  onCheckedChange={onFooterShowContactInfoChange}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="space-y-0.5 pr-2">
                  <Label className="text-xs font-medium cursor-pointer">Exibir Versão & Status</Label>
                  <p className="text-[11px] text-muted-foreground">Número de versão do sistema e badge de ambiente</p>
                </div>
                <Switch
                  checked={footerShowVersion}
                  onCheckedChange={onFooterShowVersionChange}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="space-y-0.5 pr-2">
                  <Label className="text-xs font-medium cursor-pointer">Botão "Voltar ao Topo"</Label>
                  <p className="text-[11px] text-muted-foreground">Atalho flutuante para rolagem suave</p>
                </div>
                <Switch
                  checked={footerShowScrollToTop}
                  onCheckedChange={onFooterShowScrollToTopChange}
                />
              </div>
            </div>
          )}
        </div>

        {/* Botão de Salvar */}
        <div className="pt-2 border-t border-border">
          <Button onClick={onSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Salvando preferências...
              </>
            ) : (
              'Salvar preferências de cabeçalho e rodapé'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

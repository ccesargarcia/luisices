import React from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  ShoppingBag,
  Globe,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Store,
  Info,
  Clock,
  MapPin,
  FileText,
  Loader2,
  CheckCircle2,
  Bell,
  Phone,
} from 'lucide-react';
import { formatPhoneForDisplay } from '../../utils/whatsapp';

export interface CatalogCustomizationSettings {
  catalogWhatsappPhone?: string;
  catalogBadge?: string;
  catalogStatusText?: string;
  catalogHeroTitle?: string;
  catalogHeroDescription?: string;
  catalogAnnouncement?: string;
  catalogWhatsappGreeting?: string;
  catalogWhatsappCustomizationLabel?: string;
  catalogWhatsappFooter?: string;
  catalogFooterText?: string;
  catalogFooterLocation?: string;
  catalogFooterBusinessHours?: string;
  catalogFooterCopyright?: string;
  catalogFooterNotice?: string;
}

interface CatalogSettingsSectionProps {
  settings: CatalogCustomizationSettings;
  onChange: (settings: CatalogCustomizationSettings) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

export function CatalogSettingsSection({
  settings,
  onChange,
  onSave,
  saving,
}: CatalogSettingsSectionProps) {
  const updateField = (field: keyof CatalogCustomizationSettings, value: string) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Store className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold">
                Catálogo Online & Lojinha Pública
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                Personalize todos os textos, mensagens, avisos e rodapé exibidos para seus clientes na vitrine pública.
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/personalizar-lojinha">
              <Button size="sm" className="gap-2 shadow-xs">
                <Store className="size-4" />
                <span>Abrir Painel Dedicado</span>
              </Button>
            </Link>
            <a href="/catalogo" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
                <Globe className="size-4" />
                <span>Ver Catálogo</span>
                <ExternalLink className="size-3.5 opacity-60" />
              </Button>
            </a>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-2">
        {/* 1. Identidade & Avisos do Topo */}
        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
            <Sparkles className="size-4 text-primary" />
            <span>Identidade & Barra Superior</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-badge" className="text-xs font-medium">
                Selo do Cabeçalho
              </Label>
              <Input
                id="c-badge"
                placeholder="Ex: Atelier, Papelaria Afetiva, Lojinha"
                value={settings.catalogBadge || ''}
                onChange={(e) => updateField('catalogBadge', e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Pílula destacada ao lado do nome da loja</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-status" className="text-xs font-medium">
                Texto de Status do Atendimento
              </Label>
              <Input
                id="c-status"
                placeholder="Ex: Atendimento WhatsApp ativo"
                value={settings.catalogStatusText || ''}
                onChange={(e) => updateField('catalogStatusText', e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Exibido com luz pulsante no topo</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-announcement" className="text-xs font-medium flex items-center gap-1.5">
              <Bell className="size-3.5 text-amber-500" />
              Faixa de Aviso / Alerta Promocional (Opcional)
            </Label>
            <Input
              id="c-announcement"
              placeholder="Ex: ✨ Agenda de Páscoa aberta! Encomendas com entrega até 25/03"
              value={settings.catalogAnnouncement || ''}
              onChange={(e) => updateField('catalogAnnouncement', e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Deixe em branco para ocultar. Quando preenchido, surge como um banner de destaque dourado no topo.
            </p>
          </div>
        </div>

        {/* 2. Banner Principal / Hero */}
        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
            <FileText className="size-4 text-primary" />
            <span>Apresentação & Vitrine (Banner Hero)</span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-hero-title" className="text-xs font-medium">
              Título da Vitrine
            </Label>
            <Input
              id="c-hero-title"
              placeholder="Ex: Catálogo & Vitrine Afetiva"
              value={settings.catalogHeroTitle || ''}
              onChange={(e) => updateField('catalogHeroTitle', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-hero-desc" className="text-xs font-medium">
              Texto de Boas-vindas / Instruções
            </Label>
            <Textarea
              id="c-hero-desc"
              rows={2}
              placeholder="Ex: Escolha suas peças, informe o nome para personalização e envie o pedido formatado diretamente no nosso WhatsApp."
              value={settings.catalogHeroDescription || ''}
              onChange={(e) => updateField('catalogHeroDescription', e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Explica aos clientes como fazer o pedido pela lojinha.
            </p>
          </div>
        </div>

        {/* 3. Checkout & Mensagem do WhatsApp */}
        <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 font-semibold text-sm text-emerald-700 dark:text-emerald-400">
            <MessageCircle className="size-4" />
            <span>WhatsApp e Formato do Pedido</span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-wa-phone" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
              <Phone className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              WhatsApp de Recebimento de Pedidos (Exclusivo da Lojinha)
            </Label>
            <Input
              id="c-wa-phone"
              placeholder="Ex: (11) 99999-9999"
              value={formatPhoneForDisplay(settings.catalogWhatsappPhone || '')}
              onChange={(e) => updateField('catalogWhatsappPhone', formatPhoneForDisplay(e.target.value))}
            />
            <p className="text-[11px] text-muted-foreground">
              Número de WhatsApp para onde os clientes enviarão os pedidos da vitrine pública. Segregado do WhatsApp institucional do ateliê.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-wa-greeting" className="text-xs font-medium">
              Saudação Inicial da Mensagem
            </Label>
            <Input
              id="c-wa-greeting"
              placeholder="Ex: Olá! Gostaria de encomendar pelo catálogo do Ateliê:"
              value={settings.catalogWhatsappGreeting || ''}
              onChange={(e) => updateField('catalogWhatsappGreeting', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-wa-label" className="text-xs font-medium">
                Rótulo da Personalização
              </Label>
              <Input
                id="c-wa-label"
                placeholder="Ex: Nome/Personalização:"
                value={settings.catalogWhatsappCustomizationLabel || ''}
                onChange={(e) => updateField('catalogWhatsappCustomizationLabel', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-wa-footer" className="text-xs font-medium">
                Fechamento / Chave PIX
              </Label>
              <Input
                id="c-wa-footer"
                placeholder="Ex: Poderia me passar as opções de frete/retirada e a chave PIX para confirmar?"
                value={settings.catalogWhatsappFooter || ''}
                onChange={(e) => updateField('catalogWhatsappFooter', e.target.value)}
              />
            </div>
          </div>

          {/* Prévia ilustrativa da mensagem */}
          <div className="p-3 rounded-lg bg-background border border-emerald-500/20 text-xs space-y-1 font-mono text-muted-foreground">
            <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider mb-1">
              📱 Prévia da mensagem que chegará no seu WhatsApp:
            </p>
            <p className="text-emerald-600 dark:text-emerald-400">
              {settings.catalogWhatsappGreeting || 'Olá! Gostaria de encomendar pelo catálogo do Ateliê:'}
            </p>
            <p>• 1x Planner Espiral Floral 2025 - R$ 89,90</p>
            <p className="pl-3 text-[11px] italic">
              ↳ {settings.catalogWhatsappCustomizationLabel || 'Nome/Personalização:'} Maria Eduarda
            </p>
            <p className="font-semibold text-foreground">Total Estimado: R$ 89,90</p>
            <p className="text-emerald-600 dark:text-emerald-400">
              {settings.catalogWhatsappFooter || 'Poderia me passar as opções de frete/retirada e a chave PIX para confirmar?'}
            </p>
          </div>
        </div>

        {/* 4. Rodapé da Lojinha (Footer Completo) */}
        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
            <Info className="size-4 text-primary" />
            <span>Rodapé da Lojinha (Footer)</span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-footer-text" className="text-xs font-medium">
              Texto Afetivo / Sobre o Ateliê
            </Label>
            <Textarea
              id="c-footer-text"
              rows={2}
              placeholder="Ex: Papelaria artesanal feita à mão com afeto e dedicação para eternizar momentos únicos. ❤️"
              value={settings.catalogFooterText || ''}
              onChange={(e) => updateField('catalogFooterText', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-footer-loc" className="text-xs font-medium flex items-center gap-1">
                <MapPin className="size-3 text-muted-foreground" /> Localização & Envio
              </Label>
              <Input
                id="c-footer-loc"
                placeholder="Ex: São Paulo - SP • Enviamos com carinho para todo o Brasil 📦"
                value={settings.catalogFooterLocation || ''}
                onChange={(e) => updateField('catalogFooterLocation', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-footer-hours" className="text-xs font-medium flex items-center gap-1">
                <Clock className="size-3 text-muted-foreground" /> Horário de Atendimento
              </Label>
              <Input
                id="c-footer-hours"
                placeholder="Ex: Segunda a Sexta, das 9h às 18h"
                value={settings.catalogFooterBusinessHours || ''}
                onChange={(e) => updateField('catalogFooterBusinessHours', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-footer-notice" className="text-xs font-medium">
              Aviso sobre Prazos e Políticas
            </Label>
            <Input
              id="c-footer-notice"
              placeholder="Ex: Produção artesanal sob encomenda. Os prazos começam a contar após a aprovação da arte."
              value={settings.catalogFooterNotice || ''}
              onChange={(e) => updateField('catalogFooterNotice', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-footer-copy" className="text-xs font-medium">
              Texto de Direitos Autorais / Copyright
            </Label>
            <Input
              id="c-footer-copy"
              placeholder="Ex: © 2025 Luisices Ateliê. Todos os direitos reservados."
              value={settings.catalogFooterCopyright || ''}
              onChange={(e) => updateField('catalogFooterCopyright', e.target.value)}
            />
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end pt-2">
          <Button onClick={onSave} disabled={saving} className="gap-2 px-6">
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Salvar Personalizações da Lojinha
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

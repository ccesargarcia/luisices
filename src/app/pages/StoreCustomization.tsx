import React, { useState, useEffect } from 'react';
import { useUserSettings } from '../../hooks/useUserSettings';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Store,
  Globe,
  ExternalLink,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Loader2,
  Clock,
  MapPin,
  FileText,
  AtSign,
  Phone,
  Info,
  Bell,
  Eye,
  ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';

export function StoreCustomization() {
  const { settings, loading, updateSettings } = useUserSettings();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('identity');

  // Estado dos campos do formulário
  const [formData, setFormData] = useState({
    businessName: '',
    businessTagline: '',
    whatsappPhone: '',
    instagramUrl: '',
    websiteUrl: '',
    catalogBadge: '',
    catalogStatusText: '',
    catalogHeroTitle: '',
    catalogHeroDescription: '',
    catalogAnnouncement: '',
    catalogWhatsappGreeting: '',
    catalogWhatsappCustomizationLabel: '',
    catalogWhatsappFooter: '',
    catalogFooterText: '',
    catalogFooterLocation: '',
    catalogFooterBusinessHours: '',
    catalogFooterCopyright: '',
    catalogFooterNotice: '',
  });

  // Carregar dados quando settings estiver pronto
  useEffect(() => {
    if (settings) {
      setFormData({
        businessName: settings.businessName || '',
        businessTagline: settings.businessTagline || '',
        whatsappPhone: settings.whatsappPhone || settings.businessPhone || '',
        instagramUrl: settings.instagramUrl || '',
        websiteUrl: settings.websiteUrl || '',
        catalogBadge: settings.catalogBadge || '',
        catalogStatusText: settings.catalogStatusText || '',
        catalogHeroTitle: settings.catalogHeroTitle || '',
        catalogHeroDescription: settings.catalogHeroDescription || '',
        catalogAnnouncement: settings.catalogAnnouncement || '',
        catalogWhatsappGreeting: settings.catalogWhatsappGreeting || '',
        catalogWhatsappCustomizationLabel: settings.catalogWhatsappCustomizationLabel || '',
        catalogWhatsappFooter: settings.catalogWhatsappFooter || '',
        catalogFooterText: settings.catalogFooterText || '',
        catalogFooterLocation: settings.catalogFooterLocation || '',
        catalogFooterBusinessHours: settings.catalogFooterBusinessHours || '',
        catalogFooterCopyright: settings.catalogFooterCopyright || '',
        catalogFooterNotice: settings.catalogFooterNotice || '',
      });
    }
  }, [settings]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(formData);
      toast.success('Configurações da lojinha salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar personalizações:', err);
      toast.error('Erro ao salvar configurações da lojinha');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const cleanInstagram = formData.instagramUrl
    ? formData.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')
    : 'luisicesatelie';

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Store className="size-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Personalizar Lojinha
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Configure todos os textos, mensagens de pedido, faixa de aviso e rodapé da sua vitrine pública online.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/catalogo" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
              <Globe className="size-4" />
              <span className="hidden sm:inline">Ver Lojinha Online</span>
              <ExternalLink className="size-3.5 opacity-60" />
            </Button>
          </a>
          <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-sm">
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Grid Principal: Formulário de Configuração (2/3) + Prévia Visual (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Formulário com Abas (2 Colunas) */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full h-auto p-1 bg-muted/60">
              <TabsTrigger value="identity" className="text-xs py-2">
                Vitrine & Banner
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="text-xs py-2">
                WhatsApp
              </TabsTrigger>
              <TabsTrigger value="footer" className="text-xs py-2">
                Rodapé
              </TabsTrigger>
              <TabsTrigger value="contact" className="text-xs py-2">
                Loja & Contato
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: Identidade & Banner */}
            <TabsContent value="identity" className="space-y-5 pt-3">
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
                  <div className="space-y-1.5">
                    <Label htmlFor="m-hero-title" className="text-xs font-semibold">
                      Título da Vitrine
                    </Label>
                    <Input
                      id="m-hero-title"
                      placeholder="Ex: Catálogo & Vitrine Afetiva"
                      value={formData.catalogHeroTitle}
                      onChange={(e) => handleChange('catalogHeroTitle', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-hero-desc" className="text-xs font-semibold">
                      Texto de Boas-vindas / Instruções
                    </Label>
                    <Textarea
                      id="m-hero-desc"
                      rows={3}
                      placeholder="Ex: Escolha suas peças, informe o nome para personalização e envie o pedido formatado diretamente no nosso WhatsApp."
                      value={formData.catalogHeroDescription}
                      onChange={(e) => handleChange('catalogHeroDescription', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 2: WhatsApp & Checkout */}
            <TabsContent value="whatsapp" className="space-y-5 pt-3">
              <Card className="border-emerald-500/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <MessageCircle className="size-4" />
                    Formato da Mensagem de Pedido no WhatsApp
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Personalize como os dados da sacola e os itens encomendados são formatados ao clicar em "Enviar Pedido".
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-wa-greeting" className="text-xs font-semibold">
                      Saudação Inicial
                    </Label>
                    <Input
                      id="m-wa-greeting"
                      placeholder="Ex: Olá! Gostaria de encomendar pelo catálogo do Ateliê:"
                      value={formData.catalogWhatsappGreeting}
                      onChange={(e) => handleChange('catalogWhatsappGreeting', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="m-wa-label" className="text-xs font-semibold">
                        Rótulo da Personalização
                      </Label>
                      <Input
                        id="m-wa-label"
                        placeholder="Ex: Nome/Personalização:"
                        value={formData.catalogWhatsappCustomizationLabel}
                        onChange={(e) => handleChange('catalogWhatsappCustomizationLabel', e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="m-wa-footer" className="text-xs font-semibold">
                        Fechamento / Chave PIX
                      </Label>
                      <Input
                        id="m-wa-footer"
                        placeholder="Ex: Poderia me passar as opções de frete/retirada e a chave PIX para confirmar?"
                        value={formData.catalogWhatsappFooter}
                        onChange={(e) => handleChange('catalogWhatsappFooter', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-muted/40 border border-emerald-500/20 space-y-1.5 font-mono text-xs">
                    <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider mb-1 font-sans">
                      📱 Exemplo da mensagem enviada ao seu WhatsApp:
                    </p>
                    <p className="text-emerald-600 dark:text-emerald-400">
                      {formData.catalogWhatsappGreeting || 'Olá! Gostaria de encomendar pelo catálogo do Ateliê:'}
                    </p>
                    <p>• 1x Planner Espiral Floral 2025 - R$ 89,90</p>
                    <p className="pl-3 text-[11px] italic">
                      ↳ {formData.catalogWhatsappCustomizationLabel || 'Nome/Personalização:'} Cecília Martins
                    </p>
                    <p className="font-semibold text-foreground">✨ Subtotal Estimado: R$ 89,90</p>
                    <p className="text-emerald-600 dark:text-emerald-400">
                      {formData.catalogWhatsappFooter || 'Poderia me passar as opções de frete/retirada e a chave PIX para confirmar?'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 3: Rodapé & Políticas */}
            <TabsContent value="footer" className="space-y-5 pt-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="size-4 text-primary" />
                    Rodapé da Lojinha (Footer)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Mensagem de encerramento, endereço/envio, horários de atendimento e aviso de prazos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-footer-text" className="text-xs font-semibold">
                      Texto Afetivo / Sobre o Ateliê
                    </Label>
                    <Textarea
                      id="m-footer-text"
                      rows={2}
                      placeholder="Ex: Papelaria artesanal feita à mão com afeto e dedicação para eternizar momentos únicos. ❤️"
                      value={formData.catalogFooterText}
                      onChange={(e) => handleChange('catalogFooterText', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="m-footer-loc" className="text-xs font-semibold flex items-center gap-1">
                        <MapPin className="size-3.5 text-muted-foreground" /> Localização & Envio
                      </Label>
                      <Input
                        id="m-footer-loc"
                        placeholder="Ex: São Paulo - SP • Enviamos com carinho para todo o Brasil 📦"
                        value={formData.catalogFooterLocation}
                        onChange={(e) => handleChange('catalogFooterLocation', e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="m-footer-hours" className="text-xs font-semibold flex items-center gap-1">
                        <Clock className="size-3.5 text-muted-foreground" /> Horário de Atendimento
                      </Label>
                      <Input
                        id="m-footer-hours"
                        placeholder="Ex: Segunda a Sexta, das 9h às 18h"
                        value={formData.catalogFooterBusinessHours}
                        onChange={(e) => handleChange('catalogFooterBusinessHours', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-footer-notice" className="text-xs font-semibold">
                      Aviso sobre Prazos e Políticas
                    </Label>
                    <Input
                      id="m-footer-notice"
                      placeholder="Ex: Produção artesanal sob encomenda. Os prazos começam a contar após a aprovação da arte."
                      value={formData.catalogFooterNotice}
                      onChange={(e) => handleChange('catalogFooterNotice', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-footer-copy" className="text-xs font-semibold">
                      Texto de Direitos Autorais / Copyright
                    </Label>
                    <Input
                      id="m-footer-copy"
                      placeholder={`Ex: © ${new Date().getFullYear()} Luisices. Todos os direitos reservados.`}
                      value={formData.catalogFooterCopyright}
                      onChange={(e) => handleChange('catalogFooterCopyright', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 4: Loja & Contato */}
            <TabsContent value="contact" className="space-y-5 pt-3">
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
                        Nome da Loja / Ateliê
                      </Label>
                      <Input
                        id="m-biz-name"
                        placeholder="Ex: Luisices"
                        value={formData.businessName}
                        onChange={(e) => handleChange('businessName', e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="m-biz-phone" className="text-xs font-semibold flex items-center gap-1">
                        <Phone className="size-3.5 text-muted-foreground" />
                        WhatsApp de Recebimento de Pedidos
                      </Label>
                      <Input
                        id="m-biz-phone"
                        placeholder="Ex: (11) 99999-9999"
                        value={formData.whatsappPhone}
                        onChange={(e) => handleChange('whatsappPhone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-biz-tag" className="text-xs font-semibold">
                      Slogan da Loja
                    </Label>
                    <Input
                      id="m-biz-tag"
                      placeholder="Ex: Papelaria artesanal feita à mão para momentos únicos"
                      value={formData.businessTagline}
                      onChange={(e) => handleChange('businessTagline', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="m-biz-insta" className="text-xs font-semibold flex items-center gap-1">
                        <AtSign className="size-3.5 text-muted-foreground" />
                        Instagram
                      </Label>
                      <Input
                        id="m-biz-insta"
                        placeholder="Ex: https://instagram.com/luisicesatelie"
                        value={formData.instagramUrl}
                        onChange={(e) => handleChange('instagramUrl', e.target.value)}
                      />
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2 px-8">
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Salvar Todas as Configurações
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Coluna Lateral: Prévia Visual ao Vivo (1 Coluna) */}
        <div className="lg:col-span-1 sticky top-6 space-y-4">
          <Card className="overflow-hidden border-primary/25 shadow-md">
            <CardHeader className="bg-primary/5 py-3 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Eye className="size-3.5" />
                  <span>Prévia Visual da Lojinha</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                  Modo Claro
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0 text-xs bg-[#fff8f7] text-[#221a1a]">
              {/* Aviso do Topo */}
              {formData.catalogAnnouncement && (
                <div className="px-3 py-1.5 bg-amber-400/20 text-amber-900 border-b border-amber-400/30 text-[10px] font-semibold text-center flex items-center justify-center gap-1">
                  <Sparkles size={11} className="text-amber-600 shrink-0" />
                  <span className="truncate">{formData.catalogAnnouncement}</span>
                </div>
              )}

              {/* Header simulado */}
              <div className="p-3 bg-white/80 border-b border-stone-200/60 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-[#613d3e]">
                      {formData.businessName || 'Luisices'}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#613d3e]/10 text-[#613d3e] font-medium">
                      {formData.catalogBadge || 'Atelier'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-stone-500">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span className="truncate max-w-[170px]">
                      {formData.catalogStatusText || 'Atendimento WhatsApp ativo'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="size-6 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                    <ShoppingBag size={12} />
                  </div>
                </div>
              </div>

              {/* Hero Banner simulado */}
              <div className="p-3.5 m-2.5 rounded-xl bg-white/70 border border-white/60 shadow-2xs space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-[#613d3e]">
                  <Sparkles size={11} />
                  <span>{formData.catalogHeroTitle || 'Catálogo & Vitrine Afetiva'}</span>
                </div>
                <p className="font-bold text-xs leading-tight text-[#221a1a]">
                  {formData.businessTagline || 'Papelaria artesanal feita à mão'}
                </p>
                <p className="text-[10px] text-stone-600 leading-snug line-clamp-2">
                  {formData.catalogHeroDescription || 'Escolha suas peças, informe o nome para personalização e envie o pedido...'}
                </p>
              </div>

              {/* Miniatura de Produto simulado */}
              <div className="p-2.5 mx-2.5 rounded-lg bg-white/50 border border-stone-200/50 flex items-center gap-2">
                <div className="size-10 rounded bg-stone-200 shrink-0 flex items-center justify-center text-stone-400">
                  <Store size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[11px] truncate">Planner Espiral Floral 2025</p>
                  <p className="text-[10px] text-[#613d3e] font-bold">R$ 89,90</p>
                </div>
              </div>

              {/* Rodapé simulado */}
              <div className="p-3 mt-3 border-t border-stone-200/60 bg-white/40 text-center space-y-1 text-[10px] text-stone-600">
                <p className="font-bold text-[#613d3e] text-[11px]">
                  {formData.businessName || 'Luisices'}
                </p>
                {formData.catalogFooterText && (
                  <p className="text-[9px] line-clamp-2 italic px-1">
                    "{formData.catalogFooterText}"
                  </p>
                )}
                {formData.catalogFooterLocation && (
                  <p className="text-[9px] flex items-center justify-center gap-0.5">
                    <MapPin size={9} /> {formData.catalogFooterLocation}
                  </p>
                )}
                {cleanInstagram && (
                  <p className="text-[9px] text-stone-500">
                    @{cleanInstagram}
                  </p>
                )}
                <p className="text-[8px] text-stone-400 pt-1">
                  {formData.catalogFooterCopyright || `© ${new Date().getFullYear()} ${formData.businessName || 'Luisices'}`}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

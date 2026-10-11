import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import {
  Power,
  ShieldAlert,
  Zap,
  ShoppingBag,
  Moon,
  Info,
  Check,
  MessageCircle,
  Eye,
  Percent,
  Clock,
} from 'lucide-react';
import { StoreCustomizationFormData, StoreCustomizationHandleChange } from './types';

export interface StoreOperationsTabProps {
  formData: StoreCustomizationFormData;
  handleChange: StoreCustomizationHandleChange;
  storePublished: boolean;
  togglingPublished: boolean;
  handleTogglePublished: (checked: boolean) => void;
  storeUnpublishMessage: string;
  setStoreUnpublishMessage: (val: string) => void;
  featureFlags: Record<string, boolean>;
  setFeatureFlags: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function StoreOperationsTab({
  formData,
  handleChange,
  storePublished,
  togglingPublished,
  handleTogglePublished,
  storeUnpublishMessage,
  setStoreUnpublishMessage,
  featureFlags,
  setFeatureFlags,
}: StoreOperationsTabProps) {
  return (
    <div className="space-y-5">
      {/* Card Principal: Publicação da Loja */}
      <Card
        className={`shadow-xs transition-colors ${
          !storePublished
            ? 'border-red-500/40 bg-red-50/30 dark:bg-red-950/20'
            : 'border-green-500/25'
        }`}
      >
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Power className={`size-4 ${storePublished ? 'text-green-600' : 'text-red-500'}`} />
              Publicação da Loja
            </CardTitle>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                storePublished
                  ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                  : 'bg-red-500/15 text-red-600 dark:text-red-400'
              }`}
            >
              {storePublished ? '🟢 Publicada' : '🔴 Fora do Ar'}
            </span>
          </div>
          <CardDescription className="text-xs">
            Controle se a sua loja pública está visível para os clientes. Ao despublicar, os visitantes verão uma página de manutenção com a mensagem que você definir abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle Publicar / Despublicar */}
          <div
            className={`p-4 rounded-xl border transition-colors ${
              !storePublished
                ? 'bg-red-50/50 dark:bg-red-950/30 border-red-500/30'
                : 'bg-green-50/50 dark:bg-green-950/20 border-green-500/30'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Switch
                  id="store-published-toggle"
                  checked={storePublished}
                  disabled={togglingPublished}
                  onCheckedChange={(checked) => handleTogglePublished(checked)}
                />
                <div>
                  <Label htmlFor="store-published-toggle" className="text-sm font-bold cursor-pointer">
                    {storePublished ? 'Loja Publicada' : 'Loja Despublicada'}
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {storePublished
                      ? 'A vitrine pública está aberta e acessível para os clientes.'
                      : 'Os clientes verão uma página de manutenção ao acessar a loja.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mensagem personalizada (exibida quando despublicada) */}
          {!storePublished && (
            <div className="space-y-2 animate-in fade-in-50 duration-200">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-500/30">
                <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  <span className="font-bold">Atenção:</span> A loja está fora do ar. Os visitantes verão a mensagem abaixo ao acessar o catálogo. Salve para aplicar.
                </p>
              </div>

              <Label htmlFor="unpublish-message" className="text-xs font-semibold">
                Mensagem de Manutenção Personalizada
              </Label>
              <Textarea
                id="unpublish-message"
                rows={3}
                placeholder="Ex: Estamos preparando novidades incríveis! Voltamos em breve com peças especiais para você. 💕"
                value={storeUnpublishMessage}
                onChange={(e) => setStoreUnpublishMessage(e.target.value)}
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Deixe em branco para usar a mensagem padrão. A página de manutenção inclui seu logo, WhatsApp e redes sociais automaticamente.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card: Feature Flags */}
      <Card className="border-primary/25 shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="size-4 text-primary" />
              Feature Flags
            </CardTitle>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Controle de Funcionalidades
            </span>
          </div>
          <CardDescription className="text-xs">
            Ative ou desative funcionalidades da loja sem precisar fazer um novo deploy. As mudanças são aplicadas em tempo real após salvar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Toggle: Pedidos Online */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-green-500/10">
                <ShoppingBag className="size-4 text-green-600" />
              </div>
              <div>
                <Label className="text-xs font-bold cursor-pointer">Pedidos Online (Sacola)</Label>
                <p className="text-[10px] text-muted-foreground">
                  Habilita o carrinho de compras e envio de pedidos via WhatsApp.
                </p>
              </div>
            </div>
            <Switch
              checked={featureFlags.enableOnlineOrders !== false}
              onCheckedChange={(checked) =>
                setFeatureFlags((prev) => ({ ...prev, enableOnlineOrders: checked }))
              }
            />
          </div>

          {/* Toggle: Modo Escuro */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-indigo-500/10">
                <Moon className="size-4 text-indigo-600" />
              </div>
              <div>
                <Label className="text-xs font-bold cursor-pointer">Modo Escuro</Label>
                <p className="text-[10px] text-muted-foreground">
                  Permite que os visitantes alternem para o tema escuro na lojinha.
                </p>
              </div>
            </div>
            <Switch
              checked={featureFlags.enableDarkMode !== false}
              onCheckedChange={(checked) =>
                setFeatureFlags((prev) => ({ ...prev, enableDarkMode: checked }))
              }
            />
          </div>

          <div className="pt-2">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Info className="size-3 opacity-60" />
              Novas feature flags serão adicionadas automaticamente conforme novas funcionalidades forem implementadas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card: Modo de Operação da Loja */}
      <Card className="border-primary/25 shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="size-4 text-primary" />
              Modo de Operação da Vitrine Online
            </CardTitle>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
              Fluxo de Venda
            </span>
          </div>
          <CardDescription className="text-xs">
            Escolha como os clientes interagem com os seus produtos e como os pedidos chegam até o seu WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Modo 1: Sacola de Encomendas */}
            <button
              type="button"
              onClick={() => handleChange('catalogStoreMode', 'cart')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                formData.catalogStoreMode === 'cart'
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/40 font-semibold text-foreground shadow-xs'
                  : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40 text-muted-foreground'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShoppingBag className="size-3.5 text-primary" />
                    Sacola de Encomendas (Padrão)
                  </span>
                  {formData.catalogStoreMode === 'cart' && <Check className="size-3.5 text-primary" />}
                </div>
                <p className="text-[11px] leading-relaxed opacity-85">
                  Clientes adicionam múltiplos mimos à sacola, personalizam cada item e enviam o pedido consolidado no WhatsApp.
                </p>
              </div>
              <span className="text-[10px] text-primary font-medium">Recomendado para Ateliês</span>
            </button>

            {/* Modo 2: Consulta Direta por Produto */}
            <button
              type="button"
              onClick={() => handleChange('catalogStoreMode', 'direct_inquiry')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                formData.catalogStoreMode === 'direct_inquiry'
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/40 font-semibold text-foreground shadow-xs'
                  : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40 text-muted-foreground'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MessageCircle className="size-3.5 text-primary" />
                    Consulta Rápida Direta
                  </span>
                  {formData.catalogStoreMode === 'direct_inquiry' && <Check className="size-3.5 text-primary" />}
                </div>
                <p className="text-[11px] leading-relaxed opacity-85">
                  Botão de WhatsApp direto em cada card de produto, abrindo uma conversa imediata sobre aquela peça específica.
                </p>
              </div>
              <span className="text-[10px] text-primary font-medium">Atendimento 1 a 1</span>
            </button>

            {/* Modo 3: Portfólio / Vitrine Pura */}
            <button
              type="button"
              onClick={() => handleChange('catalogStoreMode', 'portfolio')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                formData.catalogStoreMode === 'portfolio'
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/40 font-semibold text-foreground shadow-xs'
                  : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40 text-muted-foreground'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Eye className="size-3.5 text-primary" />
                    Catálogo / Portfólio Lookbook
                  </span>
                  {formData.catalogStoreMode === 'portfolio' && <Check className="size-3.5 text-primary" />}
                </div>
                <p className="text-[11px] leading-relaxed opacity-85">
                  Exibe apenas fotos e detalhes das peças. Sem carrinho ou botões de compra direta na vitrine.
                </p>
              </div>
              <span className="text-[10px] text-primary font-medium">Apenas Exibição</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Card: Botão Flutuante do WhatsApp */}
      <Card className="border-primary/25 shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="size-4 text-emerald-600" />
              Botão Flutuante do WhatsApp
            </CardTitle>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              Conversão Rápida
            </span>
          </div>
          <CardDescription className="text-xs">
            Exibe um botão flutuante com a logo do WhatsApp fixo no canto inferior da tela em todas as páginas do catálogo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20">
            <div className="space-y-0.5 pr-4">
              <Label htmlFor="m-floating-wa-toggle" className="text-xs font-semibold cursor-pointer">
                Exibir Botão Flutuante do WhatsApp
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Permite que os clientes cliquem e iniciem uma conversa no WhatsApp a qualquer momento durante a navegação.
              </p>
            </div>
            <Switch
              id="m-floating-wa-toggle"
              checked={formData.catalogShowFloatingWhatsApp}
              onCheckedChange={(checked) => handleChange('catalogShowFloatingWhatsApp', checked)}
            />
          </div>

          {formData.catalogShowFloatingWhatsApp && (
            <div className="space-y-1.5 animate-in fade-in-50 duration-200">
              <Label htmlFor="m-floating-wa-text" className="text-xs font-semibold">
                Mensagem de Chamada / Tooltip do Botão Flutuante
              </Label>
              <Input
                id="m-floating-wa-text"
                placeholder="Ex: Fale Conosco no WhatsApp"
                value={formData.catalogFloatingWhatsAppText}
                onChange={(e) => handleChange('catalogFloatingWhatsAppText', e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Texto amigável que aparece ao passar o cursor sobre o botão flutuante.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card: Condições Comerciais, PIX & Pedido Mínimo */}
      <Card className="border-primary/25 shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="size-4 text-primary" />
              Condições Comerciais & Destaques de Pagamento
            </CardTitle>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
              Transparência
            </span>
          </div>
          <CardDescription className="text-xs">
            Configure selos de desconto no PIX, avisos de produção antecipada e valor mínimo de encomenda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-pix-text" className="text-xs font-semibold flex items-center gap-1.5">
                <Percent className="size-3.5 text-emerald-600" />
                Destaque de Desconto no PIX (Opcional)
              </Label>
              <Input
                id="m-pix-text"
                placeholder="Ex: 5% de desconto à vista no PIX"
                value={formData.catalogPixDiscountText}
                onChange={(e) => handleChange('catalogPixDiscountText', e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Exibido com destaque em selo verde na vitrine e na sacola de compras.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-min-order" className="text-xs font-semibold flex items-center gap-1.5">
                <ShoppingBag className="size-3.5 text-primary" />
                Valor Mínimo de Pedido (R$)
              </Label>
              <Input
                id="m-min-order"
                type="number"
                min={0}
                step={5}
                placeholder="0.00"
                value={formData.catalogMinOrderAmount || ''}
                onChange={(e) => handleChange('catalogMinOrderAmount', parseFloat(e.target.value) || 0)}
              />
              <p className="text-[10px] text-muted-foreground">
                Deixe 0 para desativar. Se preenchido, a sacola avisará caso o subtotal seja menor.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-advance-text" className="text-xs font-semibold flex items-center gap-1.5">
              <Clock className="size-3.5 text-amber-500" />
              Aviso de Produção & Antecedência (Opcional)
            </Label>
            <Input
              id="m-advance-text"
              placeholder="Ex: Peças 100% artesanais • Reserve sua data com 15 dias de antecedência"
              value={formData.catalogAdvanceNoticeText}
              onChange={(e) => handleChange('catalogAdvanceNoticeText', e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Frase em faixa de aviso para orientar os clientes sobre o planejamento de encomendas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

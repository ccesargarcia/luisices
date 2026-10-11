import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { MessageCircle } from 'lucide-react';
import { StoreCustomizationFormData, StoreCustomizationHandleChange } from './types';

export interface StoreWhatsappTabProps {
  formData: StoreCustomizationFormData;
  handleChange: StoreCustomizationHandleChange;
}

export function StoreWhatsappTab({ formData, handleChange }: StoreWhatsappTabProps) {
  return (
    <div className="space-y-5">
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

      {/* Card do Botão Flutuante do WhatsApp */}
      <Card className="border-emerald-500/20">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <MessageCircle className="size-4" />
              Botão Flutuante do WhatsApp (Fixo no Canto Inferior)
            </CardTitle>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              Atendimento Direto
            </span>
          </div>
          <CardDescription className="text-xs">
            Exibe um botão flutuante com a logo do WhatsApp fixado no canto inferior direito para contato rápido dos clientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20">
            <div className="space-y-0.5 pr-4">
              <Label htmlFor="wa-tab-floating-toggle" className="text-xs font-semibold cursor-pointer">
                Exibir Botão Flutuante do WhatsApp no Catálogo
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Permite que os visitantes cliquem para iniciar uma conversa diretamente no seu WhatsApp a qualquer momento.
              </p>
            </div>
            <Switch
              id="wa-tab-floating-toggle"
              checked={formData.catalogShowFloatingWhatsApp}
              onCheckedChange={(checked) => handleChange('catalogShowFloatingWhatsApp', checked)}
            />
          </div>

          {formData.catalogShowFloatingWhatsApp && (
            <div className="space-y-1.5 animate-in fade-in-50 duration-200">
              <Label htmlFor="wa-tab-floating-text" className="text-xs font-semibold">
                Texto do Balão / Tooltip do Botão
              </Label>
              <Input
                id="wa-tab-floating-text"
                placeholder="Ex: Fale Conosco no WhatsApp"
                value={formData.catalogFloatingWhatsAppText}
                onChange={(e) => handleChange('catalogFloatingWhatsAppText', e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Mensagem explicativa exibida ao passar o mouse sobre o botão flutuante.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Info, MapPin, Clock } from 'lucide-react';
import { StoreCustomizationFormData, StoreCustomizationHandleChange } from './types';

export interface StoreFooterTabProps {
  formData: StoreCustomizationFormData;
  handleChange: StoreCustomizationHandleChange;
}

export function StoreFooterTab({ formData, handleChange }: StoreFooterTabProps) {
  return (
    <div className="space-y-5">
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
    </div>
  );
}

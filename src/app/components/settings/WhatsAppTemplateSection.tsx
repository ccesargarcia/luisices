import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { MessageSquare, Loader2 } from 'lucide-react';

interface WhatsAppTemplateSectionProps {
  whatsappGreeting: string;
  onWhatsappGreetingChange: (greeting: string) => void;
  whatsappSignature: string;
  onWhatsappSignatureChange: (signature: string) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

export function WhatsAppTemplateSection({
  whatsappGreeting,
  onWhatsappGreetingChange,
  whatsappSignature,
  onWhatsappSignatureChange,
  onSave,
  saving,
}: WhatsAppTemplateSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="size-5" />
          Template do WhatsApp
        </CardTitle>
        <CardDescription>
          Personalize a mensagem enviada ao compartilhar um orçamento. Use {'{nome}'} para o nome
          do cliente e {'{numero}'} para o número do orçamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Cabeçalho / Saudação</Label>
          <Textarea
            placeholder="Ex: Olá {nome}! Segue o orçamento *{numero}*:"
            value={whatsappGreeting}
            onChange={(e) => onWhatsappGreetingChange(e.target.value)}
            rows={2}
          />
          <p className="text-xs text-muted-foreground">Deixe em branco para usar o padrão</p>
        </div>
        <div className="space-y-2">
          <Label>Assinatura / Rodapé</Label>
          <Textarea
            placeholder="Ex: Atenciosamente,\nPapelaria XYZ"
            value={whatsappSignature}
            onChange={(e) => onWhatsappSignatureChange(e.target.value)}
            rows={2}
          />
          <p className="text-xs text-muted-foreground">Aparece ao final da mensagem</p>
        </div>
        <Button onClick={onSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Template'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

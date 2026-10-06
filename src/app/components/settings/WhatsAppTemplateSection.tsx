import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { MessageSquare, Loader2, Sparkles, Eye, CheckCheck } from 'lucide-react';

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
  const insertTag = (tag: string, target: 'greeting' | 'signature') => {
    if (target === 'greeting') {
      onWhatsappGreetingChange(
        whatsappGreeting ? `${whatsappGreeting} ${tag}` : `Olá ${tag}! Segue o orçamento:`
      );
    } else {
      onWhatsappSignatureChange(
        whatsappSignature ? `${whatsappSignature} ${tag}` : `Atenciosamente,\n${tag}`
      );
    }
  };

  const previewGreeting = (whatsappGreeting || 'Olá {nome}! Segue o orçamento *{numero}*:')
    .replace('{nome}', 'Mariana Silva')
    .replace('{numero}', '#ORC-2026-089');

  const previewSignature = (whatsappSignature || 'Atenciosamente,\nAteliê Criativo')
    .replace('{nome}', 'Mariana Silva')
    .replace('{numero}', '#ORC-2026-089');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="size-5 text-emerald-500" />
          Template de Mensagens do WhatsApp
        </CardTitle>
        <CardDescription>
          Personalize as mensagens automáticas enviadas aos clientes ao compartilhar orçamentos e pedidos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Formulário de Edição */}
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Cabeçalho / Saudação Inicial</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Inserir tag:</span>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-muted text-[11px] py-0 px-1.5"
                    onClick={() => insertTag('{nome}', 'greeting')}
                    title="Clique para inserir {nome}"
                  >
                    + {'{nome}'}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-muted text-[11px] py-0 px-1.5"
                    onClick={() => insertTag('{numero}', 'greeting')}
                    title="Clique para inserir {numero}"
                  >
                    + {'{numero}'}
                  </Badge>
                </div>
              </div>
              <Textarea
                placeholder="Ex: Olá {nome}! Segue o orçamento *{numero}*:"
                value={whatsappGreeting}
                onChange={(e) => onWhatsappGreetingChange(e.target.value)}
                rows={3}
                className="font-mono text-xs sm:text-sm"
              />
              <p className="text-xs text-muted-foreground">Deixe em branco para utilizar a saudação padrão do sistema.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Assinatura / Rodapé Final</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Inserir tag:</span>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-muted text-[11px] py-0 px-1.5"
                    onClick={() => insertTag('{nome}', 'signature')}
                    title="Clique para inserir {nome}"
                  >
                    + {'{nome}'}
                  </Badge>
                </div>
              </div>
              <Textarea
                placeholder="Ex: Atenciosamente,\nAteliê Criativo"
                value={whatsappSignature}
                onChange={(e) => onWhatsappSignatureChange(e.target.value)}
                rows={3}
                className="font-mono text-xs sm:text-sm"
              />
              <p className="text-xs text-muted-foreground">Adicionado automaticamente após a listagem de itens e valores.</p>
            </div>
          </div>

          {/* Pré-visualização ao Vivo */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Eye className="size-3.5" />
              <span>Pré-visualização do WhatsApp (Exemplo Real)</span>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 dark:bg-emerald-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-emerald-500/10 pb-2">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-foreground">Conversa com Cliente</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  WhatsApp Web / App
                </Badge>
              </div>

              {/* Balão estilo WhatsApp */}
              <div className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-950 dark:text-emerald-100 rounded-2xl rounded-tl-none p-3.5 shadow-sm text-xs leading-relaxed space-y-2 border border-emerald-200 dark:border-emerald-800">
                <p className="font-medium whitespace-pre-wrap">{previewGreeting}</p>
                <div className="pl-2 border-l-2 border-emerald-400/50 space-y-1 text-[11px] opacity-90">
                  <p>• 1x Agenda Personalizada 2026 — R$ 65,00</p>
                  <p>• 2x Canecas Esmaltadas — R$ 70,00</p>
                  <p className="font-semibold pt-1 text-emerald-700 dark:text-emerald-300">Total: R$ 135,00</p>
                </div>
                <p className="text-[11px] whitespace-pre-wrap opacity-95 pt-1">{previewSignature}</p>
                <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 pt-1">
                  <span>14:32</span>
                  <CheckCheck className="size-3 text-emerald-600 dark:text-emerald-400 inline" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={onSave} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando Template...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Salvar Template
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

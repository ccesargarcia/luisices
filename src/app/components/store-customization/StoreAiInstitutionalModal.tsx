import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Bot, Sparkles, Loader2 } from 'lucide-react';

export interface StoreAiInstitutionalModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  aiNiche: string;
  setAiNiche: (niche: string) => void;
  aiCustomContext: string;
  setAiCustomContext: (context: string) => void;
  storeName: string;
  generatingAi: boolean;
  handleGenerateWithAi: () => void;
  fillInstitutionalDefaults: () => void;
}

export function StoreAiInstitutionalModal({
  isOpen,
  onOpenChange,
  aiNiche,
  setAiNiche,
  aiCustomContext,
  setAiCustomContext,
  storeName,
  generatingAi,
  handleGenerateWithAi,
  fillInstitutionalDefaults,
}: StoreAiInstitutionalModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent size="lg" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Bot className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Gerador Institucional com IA (Gemini)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Crie textos profissionais e acolhedores para <strong>Quem Somos</strong>, <strong>Como Funciona</strong>, <strong>Diferenciais</strong> e <strong>FAQ</strong> adaptados ao seu público.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="p-6 space-y-4 text-sm overflow-y-auto">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Selecione o estilo ou nicho do seu ateliê:
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { id: 'papelaria', title: '🌸 Papelaria Afetiva & Geral', desc: 'Encadernação, cadernos, agendas e mimos artesanais' },
                { id: 'maternidade', title: '🍼 Maternidade & Bebê', desc: 'Cadernetas de vacina, livros do bebê e batizado' },
                { id: 'minimalista', title: '🌿 Minimalista & Planners', desc: 'Design clean, executivo, sofisticado e atemporal' },
                { id: 'festas', title: '🎈 Festas & Lembrancinhas', desc: 'Kits temáticos, topos de bolo, caixinhas e scraps' },
                { id: 'personalizado', title: '✏️ Nicho Customizado', desc: 'Descreva livremente os detalhes do seu segmento' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAiNiche(item.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    aiNiche === item.id
                      ? 'border-primary bg-primary/10 shadow-xs'
                      : 'border-border/70 hover:border-border hover:bg-muted/30'
                  }`}
                >
                  <div className="text-xs font-bold text-foreground">{item.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <Label htmlFor="ai-custom-context" className="text-xs font-semibold text-foreground">
              Informações adicionais ou diferenciais do seu ateliê (Opcional):
            </Label>
            <Textarea
              id="ai-custom-context"
              rows={3}
              placeholder="Ex: Trabalhamos desde 2020 em Campinas-SP, enviamos brindes em todas as encomendas, usamos laminação holográfica e caixas reforçadas..."
              value={aiCustomContext}
              onChange={(e) => setAiCustomContext(e.target.value)}
              className="text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              A IA usará o nome da sua loja (<strong>{storeName || 'Luisices Ateliê'}</strong>) e o slogan para personalizar o copywriting.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
            <Sparkles className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <p className="leading-relaxed text-[11px]">
              <strong>Garantia de Disponibilidade:</strong> Caso a IA esteja temporariamente instável ou sem sinal, o sistema aplicará o modelo padrão predefinido sem travar ou deixar seus campos vazios.
            </p>
          </div>
        </DialogBody>

        <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={generatingAi}
            onClick={() => {
              fillInstitutionalDefaults();
              onOpenChange(false);
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Usar sugestão manual
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={generatingAi}
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={generatingAi}
              onClick={handleGenerateWithAi}
              className="text-xs gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground min-w-[130px]"
            >
              {generatingAi ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Gerando com IA...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  Gerar Conteúdo
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

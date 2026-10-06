import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Palette,
  Check,
  Loader2,
  Sparkles,
  Star,
  Package,
} from 'lucide-react';
import { COLOR_THEMES, type ColorThemeKey } from '../../utils/colorThemes';
import { ThemeSelector } from './ThemeSelector';
import { getThemePreset } from '../../utils/themePresets';

interface AppearanceSectionProps {
  theme: string | undefined;
  onThemeChange: (theme: string) => void;
  selectedColorTheme: ColorThemeKey;
  onColorThemeChange: (colorTheme: ColorThemeKey) => void;
  customColorHex: string;
  onCustomColorHexChange: (hex: string) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

export function AppearanceSection({
  theme,
  onThemeChange,
  selectedColorTheme,
  onColorThemeChange,
  customColorHex,
  onCustomColorHexChange,
  onSave,
  saving,
}: AppearanceSectionProps) {
  const currentThemeObj = COLOR_THEMES.find((t) => t.key === selectedColorTheme);
  const activePreset = getThemePreset(theme);

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="size-5 text-primary" />
          Aparência e Temas Visuais
        </CardTitle>
        <CardDescription>
          Escolha o tema visual do sistema e personalize a atmosfera de trabalho do ateliê.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* ─── SELETOR DE TEMAS MODERNO COM TAILWIND ─────────────────────── */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Seletor de Temas do Sistema</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Alterne instantaneamente entre os temas clássicos ou atmosféricos modernos com variáveis de CSS dedicadas.
            </p>
          </div>

          <ThemeSelector
            currentTheme={theme}
            onThemeChange={onThemeChange}
          />
        </div>

        {/* ─── COLEÇÃO DE PALETAS DE CORES DE DESTAQUE ────────────────────── */}
        <div className="space-y-4 pt-4 border-t border-border/70">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold">Paleta de Destaques (Botões & Foco)</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ajuste fino opcional da tonalidade primária aplicada a botões de ação e anéis de foco.
              </p>
            </div>
            {selectedColorTheme === 'default' && (
              <Badge variant="outline" className="text-[10px] gap-1 bg-primary/10 text-primary border-primary/30">
                <Star className="size-2.5" /> Padrão do Tema
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {COLOR_THEMES.map((colorTheme) => {
              const isSelected = selectedColorTheme === colorTheme.key;
              const isDefaultTheme = colorTheme.key === 'default';

              return (
                <button
                  key={colorTheme.key}
                  type="button"
                  onClick={() => onColorThemeChange(colorTheme.key)}
                  className={`group relative flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40'
                      : 'border-border/70 hover:border-border hover:bg-muted/40'
                  }`}
                >
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full shadow-2xs mt-0.5 transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: colorTheme.displayColor,
                    }}
                  >
                    {isSelected && (
                      <Check className="size-3 text-white drop-shadow-sm" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-xs truncate text-foreground">
                        {colorTheme.label}
                      </p>
                      {isDefaultTheme && (
                        <span className="text-[9px] font-mono text-primary font-bold">★</span>
                      )}
                    </div>
                    {colorTheme.description && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1 leading-tight mt-0.5">
                        {colorTheme.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Opção de Cor Personalizada */}
            <button
              type="button"
              onClick={() => onColorThemeChange('custom')}
              className={`group relative flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedColorTheme === 'custom'
                  ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40'
                  : 'border-border/70 hover:border-border hover:bg-muted/40'
              }`}
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-2xs mt-0.5"
                style={{
                  background:
                    selectedColorTheme === 'custom'
                      ? customColorHex
                      : 'linear-gradient(135deg, #f43f5e, #8b5cf6, #3b82f6, #10b981)',
                }}
              >
                {selectedColorTheme === 'custom' && (
                  <Check className="size-3 text-white drop-shadow-sm" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-xs truncate text-foreground">Personalizar</p>
                <p className="text-[10px] text-muted-foreground line-clamp-1 leading-tight mt-0.5">
                  Escolha qualquer cor Hex
                </p>
              </div>
            </button>
          </div>

          {/* Input Hex Personalizado */}
          {selectedColorTheme === 'custom' && (
            <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center animate-in fade-in duration-200">
              <input
                type="color"
                value={customColorHex}
                onChange={(e) => onCustomColorHexChange(e.target.value)}
                className="size-9 cursor-pointer rounded border border-border flex-shrink-0"
                title="Escolher cor personalizada"
              />
              <div className="w-full flex-1 sm:w-auto">
                <Input
                  value={customColorHex}
                  onChange={(e) => onCustomColorHexChange(e.target.value)}
                  placeholder="#7c3aed"
                  className="w-full font-mono text-sm sm:w-36 h-9"
                />
              </div>
              <span className="text-xs text-muted-foreground">
                Cor customizada para botões e detalhes
              </span>
            </div>
          )}
        </div>

        {/* ─── PRÉ-VISUALIZAÇÃO EM TEMPO REAL ─────────────────────────────── */}
        <div className="space-y-2 pt-2 border-t border-border/70">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pré-visualização Ativa
            </Label>
            <span className="text-[11px] font-medium text-primary">
              {activePreset.name} • {selectedColorTheme === 'default' ? 'Destaque Original' : currentThemeObj?.label || 'Custom'}
            </span>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                  <Package className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground leading-none">
                    Exemplo de Pedido • Topo de Bolo 3D
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tema: <strong>{activePreset.name}</strong> ({activePreset.subtitle})
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-xs font-semibold">
                Em Produção
              </Badge>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
              <div className="flex items-center gap-2">
                <Button size="sm" className="h-8 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs">
                  Ação Primária
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs font-medium">
                  Secundário
                </Button>
              </div>
              <span className="text-xs font-mono font-bold text-primary">
                R$ 145,00
              </span>
            </div>
          </div>
        </div>

        {/* Botão de Salvar */}
        <div className="pt-2 border-t border-border">
          <Button onClick={onSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Salvando tema...
              </>
            ) : (
              'Salvar preferências de aparência'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

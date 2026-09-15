import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Palette, Sun, Moon, Monitor, Check, Loader2 } from 'lucide-react';
import { COLOR_THEMES, type ColorThemeKey } from '../../utils/colorThemes';

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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="size-5" />
          Aparência e identidade visual
        </CardTitle>
        <CardDescription>Defina o ambiente de trabalho e a cor dos destaques do sistema.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tema claro/escuro */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Modo de exibição</Label>
            <p className="mt-1 text-xs text-muted-foreground">Escolha como o sistema deve aparecer neste dispositivo.</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button
              type="button"
              variant={theme === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onThemeChange('light')}
              className="flex-1 gap-2"
            >
              <Sun className="size-4" />
              Claro
            </Button>
            <Button
              type="button"
              variant={theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onThemeChange('dark')}
              className="flex-1 gap-2"
            >
              <Moon className="size-4" />
              Escuro
            </Button>
            <Button
              type="button"
              variant={theme === 'system' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onThemeChange('system')}
              className="flex-1 gap-2"
            >
              <Monitor className="size-4" />
              Sistema
            </Button>
          </div>
        </div>

        {/* Cor do tema */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Cor de destaque</Label>
            <p className="mt-1 text-xs text-muted-foreground">Aplicada em botões, links, ícones e estados ativos.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            {COLOR_THEMES.map((colorTheme) => (
              <button
                key={colorTheme.key}
                type="button"
                title={colorTheme.label}
                onClick={() => onColorThemeChange(colorTheme.key)}
                className="group flex flex-col items-center gap-1.5"
              >
                <span
                  className="flex size-11 items-center justify-center rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  style={{
                    backgroundColor: colorTheme.displayColor,
                    borderColor:
                      selectedColorTheme === colorTheme.key
                        ? colorTheme.displayColor
                        : 'transparent',
                    boxShadow:
                      selectedColorTheme === colorTheme.key
                        ? `0 0 0 2px var(--background), 0 0 0 4px ${colorTheme.displayColor}`
                        : undefined,
                  }}
                >
                  {selectedColorTheme === colorTheme.key && (
                    <Check className="size-4 text-white drop-shadow" />
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{colorTheme.label}</span>
              </button>
            ))}
            {/* Cor personalizada */}
            <button
              type="button"
              title="Cor personalizada"
              onClick={() => onColorThemeChange('custom')}
                className="group flex flex-col items-center gap-1.5"
            >
              <span
                className="flex size-11 items-center justify-center overflow-hidden rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                style={{
                  background:
                    selectedColorTheme === 'custom'
                      ? customColorHex
                      : 'linear-gradient(135deg, #7b5455, #d8bfd1, #b9c9d0)',
                  borderColor:
                    selectedColorTheme === 'custom' ? customColorHex : 'transparent',
                  boxShadow:
                    selectedColorTheme === 'custom'
                        ? `0 0 0 2px var(--background), 0 0 0 4px ${customColorHex}`
                      : undefined,
                }}
              >
                {selectedColorTheme === 'custom' && (
                  <Check className="size-4 text-white drop-shadow" />
                )}
              </span>
              <span className="text-xs text-muted-foreground">Personalizar</span>
            </button>
          </div>
          {selectedColorTheme === 'custom' && (
            <div className="glass-chip flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center">
              <input
                type="color"
                value={customColorHex}
                onChange={(e) => onCustomColorHexChange(e.target.value)}
                className="size-9 cursor-pointer rounded border flex-shrink-0"
                title="Escolher cor"
              />
              <div className="w-full flex-1 sm:w-auto">
                <Input
                  value={customColorHex}
                  onChange={(e) => onCustomColorHexChange(e.target.value)}
                  placeholder="#7c3aed"
                  className="w-full font-mono text-sm sm:w-32"
                />
              </div>
              <span className="text-xs text-muted-foreground">Hexadecimal</span>
            </div>
          )}
        </div>

        <div className="glass-panel flex flex-col gap-4 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">Pré-visualização</p>
            <p className="mt-1 text-xs text-muted-foreground">Veja como a cor aparece nos elementos da interface.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">Ativo</span>
            <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Ação</span>
          </div>
        </div>

        <Button onClick={onSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar alterações'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

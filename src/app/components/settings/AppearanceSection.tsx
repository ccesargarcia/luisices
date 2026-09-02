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
          Personalização
        </CardTitle>
        <CardDescription>Tema visual e cores do sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tema claro/escuro */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Aparência</Label>
          <div className="flex gap-2">
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
          <Label className="text-sm font-medium">Cor do Tema</Label>
          <div className="flex flex-wrap gap-3">
            {COLOR_THEMES.map((colorTheme) => (
              <button
                key={colorTheme.key}
                type="button"
                title={colorTheme.label}
                onClick={() => onColorThemeChange(colorTheme.key)}
                className="flex flex-col items-center gap-1.5 group"
              >
                <span
                  className="flex items-center justify-center size-10 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: colorTheme.displayColor,
                    borderColor:
                      selectedColorTheme === colorTheme.key
                        ? colorTheme.displayColor
                        : 'transparent',
                    boxShadow:
                      selectedColorTheme === colorTheme.key
                        ? `0 0 0 2px white, 0 0 0 4px ${colorTheme.displayColor}`
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
              className="flex flex-col items-center gap-1.5 group"
            >
              <span
                className="flex items-center justify-center size-10 rounded-full border-2 transition-all overflow-hidden"
                style={{
                  background:
                    selectedColorTheme === 'custom'
                      ? customColorHex
                      : 'conic-gradient(red, orange, yellow, green, blue, violet, red)',
                  borderColor:
                    selectedColorTheme === 'custom' ? customColorHex : 'transparent',
                  boxShadow:
                    selectedColorTheme === 'custom'
                      ? `0 0 0 2px white, 0 0 0 4px ${customColorHex}`
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
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
              <input
                type="color"
                value={customColorHex}
                onChange={(e) => onCustomColorHexChange(e.target.value)}
                className="size-9 cursor-pointer rounded border flex-shrink-0"
                title="Escolher cor"
              />
              <div className="flex-1">
                <Input
                  value={customColorHex}
                  onChange={(e) => onCustomColorHexChange(e.target.value)}
                  placeholder="#7c3aed"
                  className="w-32 font-mono text-sm"
                />
              </div>
              <span className="text-xs text-muted-foreground">Código hexadecimal da cor</span>
            </div>
          )}
        </div>

        <Button onClick={onSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Personalização'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

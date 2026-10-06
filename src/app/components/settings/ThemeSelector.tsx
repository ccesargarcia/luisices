import React from 'react';
import { useTheme } from 'next-themes';
import {
  Sun,
  Moon,
  Waves,
  Trees,
  Flame,
  Monitor,
  Check,
  Sparkles,
} from 'lucide-react';
import { THEME_PRESETS, type ThemePreset, type AppThemeId } from '../../utils/themePresets';
import { triggerHaptic } from '../../utils/haptics';

interface ThemeSelectorProps {
  currentTheme?: string;
  onThemeChange?: (themeId: string) => void;
  className?: string;
}

export function ThemeSelector({
  currentTheme,
  onThemeChange,
  className = '',
}: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();
  const activeTheme = currentTheme ?? theme ?? 'system';

  const handleSelectTheme = (themeId: AppThemeId) => {
    triggerHaptic('selection');
    if (onThemeChange) {
      onThemeChange(themeId);
    } else {
      setTheme(themeId);
    }
  };

  const standardThemes = THEME_PRESETS.filter((t) => t.category === 'standard');
  const customThemes = THEME_PRESETS.filter((t) => t.category === 'custom');
  const systemTheme = THEME_PRESETS.find((t) => t.category === 'system');

  const renderThemeIcon = (iconName: ThemePreset['iconName'], className = 'size-4') => {
    switch (iconName) {
      case 'sun':
        return <Sun className={className} />;
      case 'moon':
        return <Moon className={className} />;
      case 'waves':
        return <Waves className={className} />;
      case 'trees':
        return <Trees className={className} />;
      case 'flame':
        return <Flame className={className} />;
      case 'monitor':
        return <Monitor className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  const renderThemeCard = (preset: ThemePreset) => {
    const isSelected = activeTheme === preset.id;

    return (
      <button
        key={preset.id}
        type="button"
        onClick={() => handleSelectTheme(preset.id)}
        className={`group relative flex flex-col w-full text-left rounded-xl p-3.5 border transition-all duration-200 cursor-pointer overflow-hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${
          isSelected
            ? 'border-primary/80 bg-primary/5 shadow-md ring-2 ring-primary/60 ring-offset-2 ring-offset-background'
            : 'border-border/70 hover:border-border hover:bg-muted/30 bg-card/40'
        }`}
      >
        {/* Visual Mini Mockup Swatch */}
        <div
          className="relative w-full h-24 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 p-2.5 flex flex-col justify-between mb-3 shadow-inner transition-transform group-hover:scale-[1.02]"
          style={{
            background: preset.gradient,
            backgroundColor: preset.backgroundColor,
          }}
        >
          {/* Mock Window Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-red-400/80" />
              <span className="size-2 rounded-full bg-amber-400/80" />
              <span className="size-2 rounded-full bg-emerald-400/80" />
            </div>
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium backdrop-blur-xs"
              style={{
                backgroundColor: preset.cardColor,
                color: preset.textColor,
                border: `1px solid ${preset.borderColor}`,
              }}
            >
              {renderThemeIcon(preset.iconName, 'size-2.5')}
              <span>{preset.name.split(' ')[0]}</span>
            </div>
          </div>

          {/* Mock Content Surface */}
          <div
            className="rounded-md p-2 flex items-center justify-between shadow-xs backdrop-blur-md"
            style={{
              backgroundColor: preset.cardColor,
              color: preset.textColor,
              border: `1px solid ${preset.borderColor}`,
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="size-4 rounded flex items-center justify-center shrink-0 shadow-xs"
                style={{
                  backgroundColor: preset.primaryColor,
                  color: preset.isDarkBase && preset.id !== 'light' ? '#06130d' : '#ffffff',
                }}
              >
                <Sparkles className="size-2.5" />
              </span>
              <span className="text-[10px] font-semibold truncate" style={{ color: preset.textColor }}>
                Interface Ateliê
              </span>
            </div>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs"
              style={{
                backgroundColor: preset.primaryColor,
                color: preset.isDarkBase && preset.id !== 'light' ? '#0a1a12' : '#ffffff',
              }}
            >
              Ativo
            </span>
          </div>
        </div>

        {/* Theme Information */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <div
                className="size-5 rounded-md flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${preset.primaryColor}22`,
                  color: preset.primaryColor,
                }}
              >
                {renderThemeIcon(preset.iconName, 'size-3')}
              </div>
              <h4 className="font-semibold text-xs text-foreground truncate">
                {preset.name}
              </h4>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-1 font-medium">
              {preset.subtitle}
            </p>
          </div>

          {/* Active Checkmark */}
          {isSelected ? (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs animate-in zoom-in-50 duration-150">
              <Check className="size-3" />
            </span>
          ) : (
            <span className="size-5 shrink-0 rounded-full border border-border/80 group-hover:border-primary/50 transition-colors" />
          )}
        </div>

        <p className="text-[10px] text-muted-foreground/90 mt-2 line-clamp-2 leading-relaxed">
          {preset.description}
        </p>
      </button>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ─── TEMAS PADRÕES DO SISTEMA (CLARO / ESCURO) ────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Temas Clássicos Padrão
            </span>
            <span className="text-[10px] text-muted-foreground/80 font-normal">
              (Essenciais para o dia a dia)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {standardThemes.map((preset) => renderThemeCard(preset))}
        </div>
      </div>

      {/* ─── TEMAS MODERNOS CUSTOMIZADOS ──────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Temas Modernos & Atmosféricos
            </span>
            <span className="text-[10px] text-muted-foreground/80 font-normal">
              (Variáveis de CSS globais com iluminação imersiva)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {customThemes.map((preset) => renderThemeCard(preset))}
        </div>
      </div>

      {/* ─── MODO AUTOMÁTICO (SISTEMA) ─────────────────────────────────── */}
      {systemTheme && (
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Preferência de Sistema
            </span>
          </div>
          <div className="max-w-md">
            {renderThemeCard(systemTheme)}
          </div>
        </div>
      )}
    </div>
  );
}

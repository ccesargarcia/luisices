import { Moon, Sun, Waves, Trees, Flame, Monitor, Check, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { THEME_PRESETS } from '../../utils/themePresets';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const getActiveIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="size-4 text-amber-500" />;
      case 'dark':
        return <Moon className="size-4 text-rose-300" />;
      case 'deep-ocean':
        return <Waves className="size-4 text-cyan-400" />;
      case 'forest-glow':
        return <Trees className="size-4 text-emerald-400" />;
      case 'sunset-amber':
        return <Flame className="size-4 text-amber-400" />;
      default:
        return (
          <>
            <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-muted-foreground" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-muted-foreground" />
          </>
        );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 sm:size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer shrink-0 transition-colors"
          title="Alternar tema visual"
        >
          {getActiveIcon()}
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border-border/80">
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Palette className="size-3.5 text-primary" /> Temas Padrão
        </DropdownMenuLabel>
        
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className="flex items-center justify-between px-2.5 py-2 cursor-pointer text-xs rounded-md"
        >
          <div className="flex items-center gap-2">
            <span className="size-3.5 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center">
              <Sun className="size-2.5" />
            </span>
            <span className="font-medium">Claro (Warm Paper)</span>
          </div>
          {theme === 'light' && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className="flex items-center justify-between px-2.5 py-2 cursor-pointer text-xs rounded-md"
        >
          <div className="flex items-center gap-2">
            <span className="size-3.5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Moon className="size-2.5" />
            </span>
            <span className="font-medium">Escuro (Midnight)</span>
          </div>
          {theme === 'dark' && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuLabel className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
          Temas Modernos
        </DropdownMenuLabel>

        <DropdownMenuItem
          onClick={() => setTheme('deep-ocean')}
          className="flex items-center justify-between px-2.5 py-2 cursor-pointer text-xs rounded-md"
        >
          <div className="flex items-center gap-2">
            <span className="size-3.5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Waves className="size-2.5" />
            </span>
            <span className="font-medium">Deep Ocean</span>
          </div>
          {theme === 'deep-ocean' && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme('forest-glow')}
          className="flex items-center justify-between px-2.5 py-2 cursor-pointer text-xs rounded-md"
        >
          <div className="flex items-center gap-2">
            <span className="size-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Trees className="size-2.5" />
            </span>
            <span className="font-medium">Forest Glow</span>
          </div>
          {theme === 'forest-glow' && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme('sunset-amber')}
          className="flex items-center justify-between px-2.5 py-2 cursor-pointer text-xs rounded-md"
        >
          <div className="flex items-center gap-2">
            <span className="size-3.5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <Flame className="size-2.5" />
            </span>
            <span className="font-medium">Sunset Amber</span>
          </div>
          {theme === 'sunset-amber' && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className="flex items-center justify-between px-2.5 py-2 cursor-pointer text-xs rounded-md text-muted-foreground hover:text-foreground"
        >
          <div className="flex items-center gap-2">
            <span className="size-3.5 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
              <Monitor className="size-2.5" />
            </span>
            <span>Automático (Sistema)</span>
          </div>
          {theme === 'system' && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

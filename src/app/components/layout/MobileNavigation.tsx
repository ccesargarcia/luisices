import React from 'react';
import { Link } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { MoreHorizontal, HelpCircle, Settings as SettingsIcon } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

export interface MobileNavItem {
  name: string;
  href: string;
  icon: any;
  badge?: number;
  badgeVariant?: 'emerald' | 'amber';
}

interface MobileNavigationProps {
  primaryNav: MobileNavItem[];
  moreNav: MobileNavItem[];
  currentPath: string;
  canAccessSettings: boolean;
}

export function MobileNavigation({
  primaryNav,
  moreNav,
  currentPath,
  canAccessSettings,
}: MobileNavigationProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-bottom-nav flex border-t border-white/40 bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl md:hidden touch-manipulation select-none">
      {primaryNav.map((item) => {
        const isActive = currentPath === item.href;
        const badgeCount = item.badge ?? 0;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => triggerHaptic('light')}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-all duration-75 min-w-0 active:scale-95 active:opacity-80 cursor-pointer',
              isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="relative flex items-center justify-center">
              <item.icon className="size-5 shrink-0" />
              {badgeCount > 0 && (
                <span
                  className={cn(
                    'absolute -top-1 -right-1 size-2 rounded-full ring-2 ring-card animate-pulse',
                    item.badgeVariant === 'amber' ? 'bg-amber-500' : 'bg-emerald-600'
                  )}
                />
              )}
            </div>
            <span className="truncate w-full text-center px-0.5 leading-tight">
              {item.name.split(' ')[0]}
            </span>
          </Link>
        );
      })}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Mais opções"
            className={cn(
              'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer',
              moreNav.some((item) => currentPath === item.href) && 'text-primary',
            )}
          >
            <div className="relative flex items-center justify-center">
              <MoreHorizontal className="size-5 shrink-0" />
              {moreNav.some((item) => (item.badge ?? 0) > 0) && (
                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-emerald-600 ring-2 ring-card animate-pulse" />
              )}
            </div>
            <span className="truncate px-0.5 leading-tight">Mais</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" sideOffset={8} className="mb-2 w-56 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {moreNav.map((item) => {
            const badgeCount = item.badge ?? 0;
            return (
              <DropdownMenuItem key={item.href} asChild>
                <Link to={item.href} className="flex cursor-pointer items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <item.icon className="size-4" />
                    <span>{item.name}</span>
                  </div>
                  {badgeCount > 0 && (
                    <Badge
                      className={cn(
                        'text-[10px] h-4 px-1.5 font-bold',
                        item.badgeVariant === 'amber'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-600 text-white'
                      )}
                    >
                      {badgeCount}
                    </Badge>
                  )}
                </Link>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/ajuda" className="flex cursor-pointer items-center gap-2">
              <HelpCircle className="size-4" />
              Central de Ajuda
            </Link>
          </DropdownMenuItem>
          {canAccessSettings && (
            <DropdownMenuItem asChild>
              <Link to="/configuracoes" className="flex cursor-pointer items-center gap-2">
                <SettingsIcon className="size-4" />
                Configurações
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}

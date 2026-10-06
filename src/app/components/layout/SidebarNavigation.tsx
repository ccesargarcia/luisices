import React from 'react';
import { Link } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import {
  Package2,
  ChevronDown,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export interface NavChildItem {
  name: string;
  href: string;
  icon: any;
  check?: (p: any) => boolean;
  adminOnly?: boolean;
}

export interface NavItem {
  name: string;
  href?: string;
  icon: any;
  badge?: number;
  badgeVariant?: 'emerald' | 'amber';
  badgeTitle?: string;
  children?: NavChildItem[];
  check?: (p: any) => boolean;
  adminOnly?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SidebarNavigationProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  businessName: string;
  businessTagline?: string;
  logo?: string;
  navGroups: NavGroup[];
  currentPath: string;
  storeSubmenuOpen: boolean;
  onToggleStoreSubmenu: () => void;
}

export function SidebarNavigation({
  sidebarCollapsed,
  onToggleSidebar,
  businessName,
  businessTagline,
  logo,
  navGroups,
  currentPath,
  storeSubmenuOpen,
  onToggleStoreSubmenu,
}: SidebarNavigationProps) {
  const hasLogo = Boolean(logo);

  return (
    <aside
      className={cn(
        'hidden md:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-white/40 bg-sidebar/70 py-4 shadow-[0_8px_32px_rgb(123_84_85_/_8%)] backdrop-blur-2xl transition-[width] duration-300',
        sidebarCollapsed ? 'w-20' : 'w-72',
      )}
    >
      {/* Cabeçalho / Identidade */}
      <div className={cn('mb-4 flex items-center px-5', sidebarCollapsed ? 'justify-center' : 'gap-3')}>
        {hasLogo ? (
          <img
            src={logo}
            alt={businessName}
            className={cn(
              'h-10 w-10 shrink-0 rounded-full border border-white/40 object-contain shadow-sm',
              sidebarCollapsed && 'h-9 w-9'
            )}
          />
        ) : (
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-primary text-primary-foreground shadow-sm',
              sidebarCollapsed && 'size-9'
            )}
          >
            <Package2 className="size-5" />
          </div>
        )}
        <div
          className={cn(
            'min-w-0 overflow-hidden transition-opacity duration-200',
            sidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100'
          )}
        >
          <h2 className="truncate text-base font-bold tracking-tight text-primary leading-tight">{businessName}</h2>
          <p className="truncate text-xs text-muted-foreground">{businessTagline || 'Sistema de Gestão'}</p>
        </div>
      </div>

      {/* Navegação Principal */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden pr-1.5 custom-scrollbar">
        {navGroups.map((group, groupIdx) => (
          <div key={group.title} className="flex flex-col">
            {!sidebarCollapsed ? (
              <div className="text-[10px] font-bold tracking-wider text-muted-foreground/70 px-4 pt-3 pb-1 uppercase select-none">
                {group.title}
              </div>
            ) : (
              groupIdx > 0 && <div className="my-1 border-t border-border/20 mx-3" />
            )}
            {group.items.map((item) => {
              // Item com Submenu (Ex: Lojinha Online)
              if (item.children && item.children.length > 0) {
                const isChildActive = item.children.some((c) => currentPath === c.href);

                if (sidebarCollapsed) {
                  return (
                    <DropdownMenu key={item.name}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          title={item.name}
                          className={cn(
                            'flex items-center justify-center border-l-4 py-2.5 text-sm font-medium transition-colors w-full cursor-pointer',
                            isChildActive
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-transparent text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground'
                          )}
                        >
                          <item.icon className="size-5 shrink-0" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start" className="w-48 ml-2">
                        <DropdownMenuLabel className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                          {item.name}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {item.children.map((child) => {
                          const isSubActive = currentPath === child.href;
                          return (
                            <DropdownMenuItem key={child.href} asChild>
                              <Link
                                to={child.href}
                                className={cn(
                                  'flex items-center gap-2 cursor-pointer text-xs',
                                  isSubActive && 'font-bold text-primary bg-primary/10'
                                )}
                              >
                                <child.icon className="size-4" />
                                <span>{child.name}</span>
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                return (
                  <div key={item.name} className="flex flex-col">
                    <button
                      type="button"
                      onClick={onToggleStoreSubmenu}
                      className={cn(
                        'flex items-center justify-between border-l-4 px-5 py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer w-full text-left',
                        isChildActive
                          ? 'border-primary/60 text-primary font-semibold'
                          : 'border-transparent text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <item.icon className="size-5 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={cn(
                          'transition-transform duration-200 shrink-0 text-muted-foreground',
                          storeSubmenuOpen ? 'rotate-180 text-primary' : ''
                        )}
                      />
                    </button>

                    {storeSubmenuOpen && (
                      <div className="flex flex-col pl-9 pr-3 space-y-0.5 py-0.5">
                        {item.children.map((child) => {
                          const isSubActive = currentPath === child.href;
                          return (
                            <Link
                              key={child.href}
                              to={child.href}
                              className={cn(
                                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                                isSubActive
                                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                                  : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
                              )}
                            >
                              <child.icon className="size-3.5 shrink-0" />
                              <span className="truncate">{child.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Item Padrão
              const isActive = currentPath === item.href;
              const badgeCount = item.badge ?? 0;

              return (
                <Link
                  key={item.name}
                  to={item.href || '/'}
                  title={sidebarCollapsed ? item.name : undefined}
                  className={cn(
                    'flex items-center border-l-4 py-2 text-xs sm:text-sm font-medium transition-colors',
                    sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-5',
                    isActive
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-transparent text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground'
                  )}
                >
                  <div className={cn('flex items-center', sidebarCollapsed ? 'justify-center' : 'gap-3.5')}>
                    <div className="relative flex items-center justify-center">
                      <item.icon className="size-5 shrink-0" />
                      {sidebarCollapsed && badgeCount > 0 && (
                        <span
                          className={cn(
                            'absolute -top-1 -right-1 size-2 rounded-full ring-2 ring-sidebar animate-pulse',
                            item.badgeVariant === 'amber' ? 'bg-amber-500' : 'bg-emerald-600'
                          )}
                        />
                      )}
                    </div>
                    {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                  </div>
                  {!sidebarCollapsed && badgeCount > 0 && (
                    <Badge
                      className={cn(
                        'text-[10px] h-4 px-1.5 font-bold',
                        item.badgeVariant === 'amber'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-600 text-white'
                      )}
                      title={item.badgeTitle ? `${badgeCount} ${item.badgeTitle}` : undefined}
                    >
                      {badgeCount}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Rodapé da Barra Lateral */}
      <div className="border-t border-border/40 pt-2 px-3 space-y-1">
        <Link
          to="/ajuda"
          title={sidebarCollapsed ? 'Central de Ajuda' : undefined}
          className={cn(
            'flex items-center rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground',
            sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3',
            currentPath === '/ajuda' && 'bg-primary/10 text-primary font-semibold'
          )}
        >
          <HelpCircle className="size-4 shrink-0" />
          {!sidebarCollapsed && <span>Central de Ajuda</span>}
        </Link>
        <button
          type="button"
          onClick={onToggleSidebar}
          className={cn(
            'flex w-full items-center rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground cursor-pointer',
            sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'
          )}
          title={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="size-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="size-4 shrink-0" />
              <span>Recolher menu</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

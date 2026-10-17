import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ThemeToggle } from '../common/ThemeToggle';
import { NotificationBell } from '../NotificationBell';
import { AdminTeamFilter } from '../AdminTeamFilter';
import {
  Plus,
  PackagePlus,
  FileText,
  UserPlus,
  Sparkles,
  Globe,
  ExternalLink,
  HelpCircle,
  Settings as SettingsIcon,
  Store,
  Info,
  LogOut,
  Package2,
  Search,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '../ui/utils';

export interface TopHeaderProps {
  businessName: string;
  logo?: string;
  businessTagline?: string;
  avatarUrl?: string;
  userDisplayName?: string;
  userEmail?: string;
  userInitials: string;
  isDevEnvironment: boolean;
  canQuickCreate: boolean;
  canCreateOrder: boolean;
  canCreateQuote: boolean;
  canCreateCustomer: boolean;
  canAccessAiCopilot: boolean;
  canAccessSettings: boolean;
  onOpenNewOrder: () => void;
  onOpenNewCustomer: () => void;
  onOpenAiCopilot: () => void;
  onOpenAbout: () => void;
  onLogout: () => void;
  onOpenSearch?: () => void;

  // Personalização
  headerLogoStyle?: 'full' | 'icon' | 'hidden';
  headerShowTagline?: boolean;
  headerShowQuickNew?: boolean;
  headerShowAiCopilot?: boolean;
  headerShowCatalogLink?: boolean;
  headerShowQuickSearch?: boolean;
  headerShowHelpCenter?: boolean;
  headerStyle?: 'blur' | 'solid' | 'bordered';
  headerVariant?: 'floating' | 'slim' | 'dual';
}

export function TopHeader({
  businessName,
  logo,
  businessTagline,
  avatarUrl,
  userDisplayName,
  userEmail,
  userInitials,
  isDevEnvironment,
  canQuickCreate,
  canCreateOrder,
  canCreateQuote,
  canCreateCustomer,
  canAccessAiCopilot,
  canAccessSettings,
  onOpenNewOrder,
  onOpenNewCustomer,
  onOpenAiCopilot,
  onOpenAbout,
  onLogout,
  onOpenSearch,
  headerLogoStyle = 'full',
  headerShowTagline = true,
  headerShowQuickNew = true,
  headerShowAiCopilot = true,
  headerShowCatalogLink = true,
  headerShowQuickSearch = true,
  headerShowHelpCenter = true,
  headerStyle = 'blur',
  headerVariant = 'floating',
}: TopHeaderProps) {
  const navigate = useNavigate();
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const hasLogo = Boolean(logo) && headerLogoStyle !== 'hidden';
  const showIconOnly = headerLogoStyle === 'icon';

  return (
    <div
      className={cn(
        'w-full transition-all',
        headerVariant === 'floating'
          ? cn(
              'max-md:rounded-2xl max-md:border max-md:border-white/50 max-md:dark:border-white/10 max-md:bg-card/90 max-md:backdrop-blur-xl max-md:shadow-xs max-md:px-3 max-md:py-1.5',
              'md:px-4 md:py-2.5',
              headerStyle === 'solid' && 'md:bg-card md:text-card-foreground',
              headerStyle === 'bordered' && 'md:bg-background/95 md:border-b md:border-border/80'
            )
          : cn(
              'px-3 sm:px-4 py-2 sm:py-2.5',
              headerStyle === 'solid' && 'bg-card text-card-foreground',
              headerStyle === 'bordered' && 'bg-background/95 border-b border-border/80'
            )
      )}
    >
      <div className="flex items-center justify-between gap-1.5 xs:gap-2 md:gap-3">
        {/* Identificação / Logo no Topo */}
        <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 min-w-0 flex-1 md:max-w-[280px] xl:max-w-none">
          {hasLogo && !showIconOnly ? (
            <img
              src={logo}
              alt={businessName}
              className="h-7 xs:h-8 md:h-9 max-h-8 md:max-h-9 max-w-[80px] xs:max-w-[105px] md:max-w-[140px] object-contain min-w-0 rounded-md shrink-0"
              onError={(e) => {
                const target = e.currentTarget;
                const fallback = getCdnFallbackUrl(logo);
                if (fallback && target.src !== fallback) {
                  target.src = fallback;
                  return;
                }
                target.style.display = 'none';
              }}
            />
          ) : headerLogoStyle !== 'hidden' && businessName ? (
            <div className="flex items-center justify-center size-7 xs:size-8 sm:size-9 bg-primary text-primary-foreground rounded-lg shrink-0 shadow-xs">
              <Package2 className="size-3.5 xs:size-4 sm:size-5" />
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {businessName ? (
                <h1
                  className="font-bold text-xs xs:text-sm sm:text-base md:text-lg truncate text-foreground leading-tight tracking-tight"
                  title={businessName}
                >
                  {businessName}
                </h1>
              ) : null}
              {isDevEnvironment && (
                <Badge
                  variant="outline"
                  className="bg-yellow-500/10 text-yellow-600 border-yellow-400 font-mono text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 sm:h-5 hidden xs:inline-flex shrink-0"
                >
                  DEV
                </Badge>
              )}
            </div>
            {headerShowTagline && (
              <div>
                <p className="text-[11px] sm:text-xs text-muted-foreground hidden md:block truncate leading-none mt-0.5">
                  {businessTagline || 'Sistema de Gestão de Pedidos'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Barra / Atalho de Busca Rápida (Global Search) - Apenas em telas amplas (xl+) */}
        {headerShowQuickSearch && onOpenSearch && (
          <div className="hidden xl:flex items-center flex-1 min-w-0 max-w-xs mx-2">
            <button
              type="button"
              data-testid="header-search-bar"
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-border/70 bg-muted/30 hover:bg-muted/70 hover:border-primary/30 text-muted-foreground hover:text-foreground text-xs transition-all shadow-2xs group cursor-pointer"
              title="Buscar no sistema (Ctrl + K)"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                <span className="truncate">Buscar páginas, clientes, pedidos...</span>
              </div>
              <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-background/90 border rounded text-muted-foreground group-hover:text-foreground shrink-0 shadow-2xs">
                Ctrl K
              </kbd>
            </button>
          </div>
        )}

        {/* Ações do Cabeçalho */}
        <div className="flex items-center justify-end gap-1 sm:gap-1.5 shrink-0 max-w-full">
          {/* Botão de Busca Rápida Mobile/Tablet (se não estiver no modo dual, onde fica na sub-barra) */}
          {headerShowQuickSearch && onOpenSearch && headerVariant !== 'dual' && (
            <Button
              variant="ghost"
              size="icon"
              data-testid="header-search-btn"
              onClick={onOpenSearch}
              className="size-8 sm:size-9 text-muted-foreground hover:text-foreground rounded-full sm:rounded-lg shrink-0 xl:hidden"
              title="Buscar no sistema (Ctrl + K)"
              aria-label="Buscar no sistema"
            >
              <Search className="size-4" />
            </Button>
          )}

          {/* Botão "+ Novo" Ações Rápidas */}
          {headerShowQuickNew && canQuickCreate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="gap-1 sm:gap-1.5 h-8 sm:h-9 bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90 px-2.5 sm:px-3 cursor-pointer shrink-0 rounded-full sm:rounded-md text-xs"
                  title="Criar novo (+ Novo)"
                  aria-label="Criar novo"
                >
                  <Plus className="size-3.5 sm:size-4 shrink-0" />
                  <span className="text-xs font-semibold">Novo</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                  Ações Rápidas
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {canCreateOrder && (
                  <DropdownMenuItem
                    onClick={onOpenNewOrder}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <PackagePlus className="size-4 text-primary shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">Novo Pedido</span>
                      <span className="text-[11px] text-muted-foreground">Cadastrar na esteira</span>
                    </div>
                  </DropdownMenuItem>
                )}
                {canCreateQuote && (
                  <DropdownMenuItem
                    onClick={() => navigate('/orcamentos?novo=1')}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <FileText className="size-4 text-primary shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">Novo Orçamento</span>
                      <span className="text-[11px] text-muted-foreground">Gerar proposta</span>
                    </div>
                  </DropdownMenuItem>
                )}
                {canCreateCustomer && (
                  <DropdownMenuItem
                    onClick={onOpenNewCustomer}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <UserPlus className="size-4 text-primary shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">Novo Cliente</span>
                      <span className="text-[11px] text-muted-foreground">Cadastrar contato</span>
                    </div>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Botão Copiloto de IA - Visível no mobile e desktop */}
          {headerShowAiCopilot && canAccessAiCopilot && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAiCopilot}
              className="gap-1 sm:gap-1.5 h-8 sm:h-9 text-xs sm:text-sm font-medium border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors shadow-2xs px-2 sm:px-2.5 shrink-0 rounded-full sm:rounded-md"
              title="Abrir Copiloto de IA Interno"
              aria-label="Abrir Copiloto de IA"
            >
              <Sparkles className="size-3.5 sm:size-4 text-amber-500 shrink-0" />
              <span className="text-[11px] font-semibold sm:hidden">IA</span>
              <span className="hidden xl:inline">Copiloto</span>
            </Button>
          )}

          {/* Atalho Catálogo Online (desktop xl+) */}
          {headerShowCatalogLink && (
            <a
              href="/catalogo"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 transition-colors shrink-0"
              title="Abrir Catálogo Online público em nova aba"
            >
              <Globe className="size-3.5" />
              <span>Catálogo</span>
              <ExternalLink className="size-3 opacity-60" />
            </a>
          )}

          <div className="hidden md:inline-flex"><AdminTeamFilter variant="header" /></div>
          <NotificationBell />

          <div className="hidden md:inline-flex shrink-0">
            <ThemeToggle />
          </div>

          {headerShowHelpCenter && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/ajuda')}
              className="relative size-8 sm:size-9 rounded-full text-muted-foreground hover:text-foreground hidden lg:inline-flex shrink-0"
              title="Central de Ajuda & Guia de Uso"
              aria-label="Central de Ajuda"
            >
              <HelpCircle className="size-4" />
            </Button>
          )}

          {/* Ações secundárias no celular: preserva uma única linha no cabeçalho */}
          <Popover open={mobileActionsOpen} onOpenChange={setMobileActionsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden size-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Mais ações do cabeçalho"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 max-w-[calc(100vw-1.5rem)] p-3 md:hidden">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Ações do sistema</p>
              <div className="flex flex-col gap-2">
                {headerShowQuickSearch && onOpenSearch && headerVariant === 'dual' && (
                  <Button variant="ghost" onClick={() => { setMobileActionsOpen(false); onOpenSearch(); }} className="justify-start gap-2">
                    <Search className="size-4" /> Buscar no sistema
                  </Button>
                )}
                <AdminTeamFilter variant="inline" className="w-full min-w-0 [&>span]:min-w-0 [&>span]:flex-1" />
                <div className="flex items-center justify-between gap-2 border-t pt-2">
                  <span className="text-sm text-muted-foreground">Tema visual</span>
                  <ThemeToggle />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Menu do Usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" aria-label="Abrir menu do usuário" className="relative size-8 sm:size-9 rounded-full shrink-0 p-0 ml-0.5 ring-1 ring-border/50">
                <Avatar className="size-8 sm:size-9">
                  <AvatarImage src={avatarUrl} alt="Avatar" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{userDisplayName || 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a
                  href="/catalogo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer flex items-center"
                >
                  <Globe className="size-4 mr-2" />
                  Ver Catálogo Online
                  <ExternalLink className="size-3 ml-auto opacity-50" />
                </a>
              </DropdownMenuItem>
              {canAccessSettings && (
                <DropdownMenuItem onClick={() => navigate('/personalizar-lojinha')} className="cursor-pointer">
                  <Store className="size-4 mr-2" />
                  Personalizar Lojinha
                </DropdownMenuItem>
              )}
              {canAccessSettings && (
                <DropdownMenuItem onClick={() => navigate('/configuracoes')} className="cursor-pointer">
                  <SettingsIcon className="size-4 mr-2" />
                  Configurações
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigate('/ajuda')} className="cursor-pointer">
                <HelpCircle className="size-4 mr-2" />
                Central de Ajuda
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenAbout} className="cursor-pointer">
                <Info className="size-4 mr-2" />
                Sobre
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-600 dark:text-red-400 cursor-pointer">
                <LogOut className="size-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sub-barra exclusiva para headerVariant === 'dual' no mobile */}
      {headerVariant === 'dual' && headerShowQuickSearch && onOpenSearch && (
        <div className="w-full flex items-center gap-2 pt-2 mt-1.5 border-t border-border/40 md:hidden">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/70 bg-muted/30 hover:bg-muted/60 text-muted-foreground text-xs transition-colors cursor-pointer"
            title="Buscar no sistema (Ctrl + K)"
          >
            <Search className="size-3.5 text-muted-foreground" />
            <span className="truncate">Buscar páginas, clientes, pedidos...</span>
          </button>
        </div>
      )}
    </div>
  );
}

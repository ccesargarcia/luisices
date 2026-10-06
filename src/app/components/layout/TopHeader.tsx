import React from 'react';
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
} from 'lucide-react';

interface TopHeaderProps {
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
}: TopHeaderProps) {
  const navigate = useNavigate();
  const hasLogo = Boolean(logo);

  return (
    <div className="w-full px-3 sm:px-4 py-2 sm:py-3">
      <div className="flex items-center justify-between gap-2">
        {/* Identificação / Logo no Topo */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasLogo ? (
            <img
              src={logo}
              alt={businessName}
              className="h-8 sm:h-9 max-h-8 sm:max-h-9 max-w-[85px] sm:max-w-[140px] object-contain shrink-0 rounded-md"
            />
          ) : (
            <div className="flex items-center justify-center size-8 sm:size-9 bg-primary text-primary-foreground rounded-lg shrink-0 shadow-xs">
              <Package2 className="size-4 sm:size-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-bold text-sm sm:text-base md:text-xl line-clamp-2 sm:truncate text-foreground leading-tight" title={businessName}>
                {businessName}
              </h1>
              {isDevEnvironment && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-400 font-mono text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 sm:h-5 hidden xs:inline-flex shrink-0">
                  DEV
                </Badge>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground hidden sm:block truncate">
                {businessTagline || 'Sistema de Gestão de Pedidos'}
              </p>
            </div>
          </div>
        </div>

        {/* Ações do Cabeçalho */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {canQuickCreate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="gap-1 sm:gap-1.5 h-8 sm:h-9 bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90 px-2 sm:px-3 cursor-pointer shrink-0 rounded-lg sm:rounded-md"
                  title="Criar novo (+ Novo)"
                >
                  <Plus className="size-4 shrink-0" />
                  <span className="hidden sm:inline">Novo</span>
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

          {canAccessAiCopilot && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAiCopilot}
              className="gap-1.5 h-8 sm:h-9 text-xs sm:text-sm font-medium border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors shadow-xs px-2 sm:px-2.5 shrink-0"
              title="Abrir Copiloto de IA Interno"
            >
              <Sparkles className="size-3.5 sm:size-4 text-amber-500 shrink-0" />
              <span className="hidden md:inline">Copiloto</span>
            </Button>
          )}

          <a
            href="/catalogo"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 transition-colors shrink-0"
            title="Abrir Catálogo Online público em nova aba"
          >
            <Globe className="size-3.5" />
            <span>Catálogo</span>
            <ExternalLink className="size-3 opacity-60" />
          </a>

          <AdminTeamFilter variant="header" className="hidden md:inline-flex" />
          <NotificationBell />

          <div className="hidden sm:inline-flex shrink-0">
            <ThemeToggle />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/ajuda')}
            className="relative size-9 rounded-full text-muted-foreground hover:text-foreground hidden lg:inline-flex shrink-0"
            title="Central de Ajuda & Guia de Uso"
            aria-label="Central de Ajuda"
          >
            <HelpCircle className="size-4" />
          </Button>

          {/* Menu do Usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative size-8 sm:size-10 rounded-full shrink-0">
                <Avatar className="size-8 sm:size-10">
                  <AvatarImage src={avatarUrl} alt="Avatar" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{userDisplayName || 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
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
              <DropdownMenuItem onClick={onLogout} className="text-red-600 cursor-pointer">
                <LogOut className="size-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

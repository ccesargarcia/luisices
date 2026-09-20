import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, Calendar, Users, Package2, Package, LogOut, Settings as SettingsIcon, BarChart3, FileText, ShoppingBag, Images, AtSign, Globe, Phone, Mail, MapPin, MessageCircle, MessageSquare, ArrowLeftRight, UserCog, Info, PanelLeftClose, PanelLeftOpen, MoreHorizontal, HelpCircle, Coins, ExternalLink, Store, Palette, ChevronDown, ChevronRight, ClipboardList, Sparkles, Plus, PackagePlus, UserPlus } from 'lucide-react';
import { cn } from '../components/ui/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrdersContext';
import { useUserSettings } from '../../hooks/useUserSettings';
import { applyColorTheme } from '../utils/colorThemes';
import { normalizePhoneForWhatsApp } from '../utils/whatsapp';
import { normalizeInstagramUrl, normalizeWebsiteUrl } from '../utils/urlUtils';
import { trackPageView } from '../../services/analyticsService';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { ThemeToggle } from '../../components/ThemeToggle';
import { NotificationBell } from '../components/NotificationBell';
import { AdminTeamFilter } from '../components/AdminTeamFilter';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogBody,
  DialogFooter,
} from '../components/ui/dialog';
import { AiCopilotSheet } from '../components/AiCopilotSheet';
import { NewOrderDialog } from '../components/NewOrderDialog';
import { CustomerFormDialog } from '../components/customers/CustomerFormDialog';
import { AiOrderDraft } from '../types';

import { firebaseWhatsAppService } from '../../services/firebaseWhatsAppService';

/** Converte Date para string "YYYY-MM-DD" local (evita shift UTC à noite no Brasil) */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, userProfile, hasPermission } = useAuth();
  const { orders } = useOrders();
  const { settings } = useUserSettings();

  const [aiCopilotOpen, setAiCopilotOpen] = useState(false);
  const [aiOrderDraft, setAiOrderDraft] = useState<AiOrderDraft | null>(null);
  const [aiNewOrderModalOpen, setAiNewOrderModalOpen] = useState(false);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [unreadWhatsAppCount, setUnreadWhatsAppCount] = useState(0);

  // Quantidade de pedidos ativos com entrega prevista para a data atual
  const todayDeliveriesCount = useMemo(() => {
    const todayString = toLocalDateStr(new Date());
    return (orders || []).filter(
      (o) => o.deliveryDate === todayString && o.status !== 'completed' && o.status !== 'cancelled'
    ).length;
  }, [orders]);

  const canCreateOrder = isAdmin || hasPermission((p) => p.orders?.create ?? false);
  const canCreateQuote = isAdmin || hasPermission((p) => p.quotes?.create ?? false);
  const canCreateCustomer = isAdmin || hasPermission((p) => p.customers?.create ?? false);
  const canQuickCreate = canCreateOrder || canCreateQuote || canCreateCustomer;

  // Escuta contagem de mensagens não lidas do WhatsApp em tempo real
  useEffect(() => {
    const unsubscribe = firebaseWhatsAppService.subscribeConversations((chats) => {
      const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      setUnreadWhatsAppCount(totalUnread);
    });
    return () => unsubscribe();
  }, []);

  const handleApplyAiOrderDraft = (draft: AiOrderDraft) => {
    setAiOrderDraft(draft);
    setAiNewOrderModalOpen(true);
  };

  // Apply color theme CSS vars whenever settings change
  useEffect(() => {
    applyColorTheme(settings?.colorTheme ?? 'default', settings?.customColorHex);
  }, [settings?.colorTheme, settings?.customColorHex]);

  // Track page views with Firebase Analytics
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    }
  };

  const getUserInitials = () => {
    if (!user?.displayName) return user?.email?.[0].toUpperCase() || 'U';
    const names = user.displayName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.displayName[0].toUpperCase();
  };

  const [storeSubmenuOpen, setStoreSubmenuOpen] = useState(true);

  // Auto-expandir submenu da lojinha se estiver em uma rota da lojinha
  useEffect(() => {
    if (
      location.pathname.startsWith('/produtos-lojinha') ||
      location.pathname.startsWith('/personalizar-lojinha') ||
      location.pathname.startsWith('/pedidos-lojinha')
    ) {
      setStoreSubmenuOpen(true);
    }
  }, [location.pathname]);

  const rawNavGroups = useMemo(() => [
    {
      title: 'OPERAÇÃO DIÁRIA',
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard, check: (p: any) => p.dashboard },
        {
          name: 'Agenda Semanal',
          href: '/agenda',
          icon: Calendar,
          check: (p: any) => p.orders?.view,
          badge: todayDeliveriesCount,
          badgeVariant: 'amber' as const,
          badgeTitle: 'para hoje',
        },
        {
          name: 'Atendimento WhatsApp',
          href: '/whatsapp',
          icon: MessageSquare,
          badge: unreadWhatsAppCount,
          badgeVariant: 'emerald' as const,
          badgeTitle: 'não lidas',
          check: (p: any) => Boolean(p?.whatsapp),
        },
      ],
    },
    {
      title: 'VENDAS & CLIENTES',
      items: [
        { name: 'Clientes', href: '/clientes', icon: Users, check: (p: any) => p.customers?.view },
        { name: 'Orçamentos', href: '/orcamentos', icon: FileText, check: (p: any) => p.quotes?.view },
        { name: 'Permutas & Parcerias', href: '/permutas', icon: ArrowLeftRight, check: (p: any) => Boolean(p?.exchanges) },
        {
          name: 'Lojinha Online',
          icon: Store,
          check: (p: any) => Boolean(p?.store || p?.storeProducts?.view),
          children: [
            {
              name: 'Pedidos Recebidos',
              href: '/pedidos-lojinha',
              icon: ClipboardList,
              check: (p: any) => Boolean(p?.store || p?.storeProducts?.view || p?.orders?.view),
            },
            {
              name: 'Produtos da Lojinha',
              href: '/produtos-lojinha',
              icon: ShoppingBag,
              check: (p: any) => Boolean(p?.storeProducts?.view ?? p?.store ?? false),
            },
            {
              name: 'Aparência & Vitrine',
              href: '/personalizar-lojinha',
              icon: Palette,
              check: (p: any) => Boolean(p?.store),
            },
          ],
        },
      ],
    },
    {
      title: 'ATELIÊ & PRODUÇÃO',
      items: [
        { name: 'Produtos do Ateliê', href: '/produtos', icon: Package, check: (p: any) => p.products?.view },
        { name: 'Precificação & Custos', href: '/precificacao', icon: Coins, check: (p: any) => Boolean(p?.pricing) },
        { name: 'Galeria de Artes', href: '/galeria', icon: Images, check: (p: any) => p.gallery?.view },
      ],
    },
    {
      title: 'GESTÃO & AJUSTES',
      items: [
        { name: 'Relatórios', href: '/relatorios', icon: BarChart3, check: (p: any) => Boolean(p?.reports) },
        { name: 'Central de E-mails', href: '/emails', icon: Mail, check: (p: any) => p.emails ?? false },
        { name: 'Equipe & Usuários', href: '/usuarios', icon: UserCog, check: (p: any) => p.users?.view },
        { name: 'Configurações', href: '/configuracoes', icon: SettingsIcon, check: (p: any) => Boolean(p?.settings) || userProfile?.role === 'admin' },
      ],
    },
  ], [todayDeliveriesCount, unreadWhatsAppCount, userProfile?.role]);

  const filteredNavGroups = useMemo(() => {
    if (!userProfile) return [];
    return rawNavGroups
      .map((group) => {
        const allowedItems = group.items
          .map((item: any) => {
            if (item.adminOnly && userProfile.role !== 'admin') return null;
            if (item.children) {
              const allowedChildren = item.children.filter((child: any) => {
                if (child.adminOnly && userProfile.role !== 'admin') return false;
                return hasPermission(child.check);
              });
              if (allowedChildren.length === 0) return null;
              return { ...item, children: allowedChildren };
            }
            if (hasPermission(item.check)) return item;
            return null;
          })
          .filter(Boolean) as any[];

        if (allowedItems.length === 0) return null;
        return {
          title: group.title,
          items: allowedItems,
        };
      })
      .filter(Boolean) as { title: string; items: any[] }[];
  }, [userProfile, hasPermission, rawNavGroups]);

  const flatNavForMobile = useMemo(() => {
    const list: { name: string; href: string; icon: any; badge?: number; badgeVariant?: 'emerald' | 'amber' }[] = [];
    filteredNavGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children) {
          item.children.forEach((c: any) => list.push(c));
        } else if (item.href) {
          list.push(item);
        }
      });
    });
    return list;
  }, [filteredNavGroups]);

  const mobilePrimaryNav = flatNavForMobile.slice(0, 4);
  const mobileMoreNav = flatNavForMobile.slice(4);
  const canAccessSettings = isAdmin || hasPermission((p) => Boolean(p?.settings));
  const canAccessAiCopilot = isAdmin || hasPermission((p) => Boolean(p?.aiCopilot));

  const businessName = settings?.businessName || 'Papelaria Personalizada';
  const hasLogo = !!settings?.logo;
  const isDevEnvironment = import.meta.env.VITE_FIREBASE_PROJECT_ID?.endsWith('-dev') ?? false;
  const appVersion = __APP_VERSION__ || '0.0.0';
  const [aboutOpen, setAboutOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return window.localStorage.getItem('luisices-sidebar-collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem('luisices-sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-clip bg-transparent flex flex-col">
      <aside className={cn(
        'hidden md:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-white/40 bg-sidebar/70 py-4 shadow-[0_8px_32px_rgb(123_84_85_/_8%)] backdrop-blur-2xl transition-[width] duration-300',
        sidebarCollapsed ? 'w-20' : 'w-72',
      )}>
        <div className={cn('mb-4 flex items-center px-5', sidebarCollapsed ? 'justify-center' : 'gap-3')}>
          {hasLogo ? (
            <img src={settings.logo} alt={businessName} className={cn('h-10 w-10 shrink-0 rounded-full border border-white/40 object-contain shadow-sm', sidebarCollapsed && 'h-9 w-9')} />
          ) : (
            <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-primary text-primary-foreground shadow-sm', sidebarCollapsed && 'size-9')}>
              <Package2 className="size-5" />
            </div>
          )}
          <div className={cn('min-w-0 overflow-hidden transition-opacity duration-200', sidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100')}>
            <h2 className="truncate text-base font-bold tracking-tight text-primary leading-tight">{businessName}</h2>
            <p className="truncate text-xs text-muted-foreground">{settings?.businessTagline || 'Sistema de Gestão'}</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden pr-1.5 custom-scrollbar">
          {filteredNavGroups.map((group, groupIdx) => (
            <div key={group.title} className="flex flex-col">
              {!sidebarCollapsed ? (
                <div className="text-[10px] font-bold tracking-wider text-muted-foreground/70 px-4 pt-3 pb-1 uppercase select-none">
                  {group.title}
                </div>
              ) : (
                groupIdx > 0 && <div className="my-1 border-t border-border/20 mx-3" />
              )}
              {group.items.map((item: any) => {
                // Caso 1: Item com submenu (Lojinha Online)
                if (item.children && item.children.length > 0) {
                  const isChildActive = item.children.some((c: any) => location.pathname === c.href);

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
                          {item.children.map((child: any) => {
                            const isSubActive = location.pathname === child.href;
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
                        onClick={() => setStoreSubmenuOpen(prev => !prev)}
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
                          className={cn('transition-transform duration-200 shrink-0 text-muted-foreground', storeSubmenuOpen ? 'rotate-180 text-primary' : '')}
                        />
                      </button>

                      {storeSubmenuOpen && (
                        <div className="flex flex-col pl-9 pr-3 space-y-0.5 py-0.5">
                          {item.children.map((child: any) => {
                            const isSubActive = location.pathname === child.href;
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

                // Caso 2: Item normal de navegação
                const isActive = location.pathname === item.href;
                const badgeCount = item.badge ?? 0;
                const badgeLabel = item.badgeTitle ? `(${badgeCount} ${item.badgeTitle})` : `(${badgeCount})`;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    title={sidebarCollapsed ? (badgeCount > 0 ? `${item.name} ${badgeLabel}` : item.name) : undefined}
                    className={cn(
                      'relative flex items-center border-l-4 px-5 py-2 text-xs sm:text-sm font-medium transition-colors',
                      sidebarCollapsed ? 'justify-center' : 'justify-between',
                      isActive
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-transparent text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground',
                    )}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative flex items-center justify-center">
                        <item.icon className="size-5 shrink-0" />
                        {sidebarCollapsed && badgeCount > 0 && (
                          <span
                            className={cn(
                              'absolute -top-1 -right-1 size-2.5 rounded-full ring-2 ring-background animate-pulse',
                              item.badgeVariant === 'amber' ? 'bg-amber-500' : 'bg-emerald-600'
                            )}
                          />
                        )}
                      </div>
                      <span className={cn('truncate transition-opacity duration-200', sidebarCollapsed ? 'hidden' : 'inline')}>
                        {item.name}
                      </span>
                    </div>

                    {!sidebarCollapsed && badgeCount > 0 && (
                      <Badge
                        className={cn(
                          'text-[10px] h-4.5 px-1.5 font-bold rounded-full shadow-xs shrink-0 ml-1',
                          item.badgeVariant === 'amber'
                            ? 'bg-amber-500/15 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-600 hover:bg-emerald-600 text-white animate-pulse'
                        )}
                      >
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <Link
          to="/ajuda"
          title={sidebarCollapsed ? 'Central de Ajuda' : undefined}
          className={cn(
            'mx-4 flex items-center rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors',
            location.pathname === '/ajuda'
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground',
            sidebarCollapsed ? 'justify-center' : 'gap-3.5',
          )}
        >
          <HelpCircle className="size-4.5 shrink-0" />
          <span className={sidebarCollapsed ? 'hidden' : 'inline'}>Central de Ajuda</span>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          className="mx-auto mt-1 text-muted-foreground hover:text-primary"
        >
          {sidebarCollapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
        </Button>
      </aside>

      <header className={cn(
        'min-w-0 border-b border-white/40 bg-card/85 backdrop-blur-2xl transition-[margin,width] duration-300',
        sidebarCollapsed ? 'md:ml-20 md:w-[calc(100%-5rem)]' : 'md:ml-72 md:w-[calc(100%-18rem)]',
      )}>
        <div className="w-full px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {hasLogo ? (
                <img
                  src={settings.logo}
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
                    {settings?.businessTagline || 'Sistema de Gestão de Pedidos'}
                  </p>
                </div>
              </div>
            </div>

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
                        onClick={() => setIsNewOrderOpen(true)}
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
                        onClick={() => setIsNewCustomerOpen(true)}
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
                  onClick={() => setAiCopilotOpen(true)}
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
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative size-8 sm:size-10 rounded-full shrink-0">
                  <Avatar className="size-8 sm:size-10">
                    <AvatarImage src={settings?.avatar} alt="Avatar" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.displayName || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
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
                {canAccessSettings && <DropdownMenuItem onClick={() => navigate('/personalizar-lojinha')} className="cursor-pointer">
                  <Store className="size-4 mr-2" />
                  Personalizar Lojinha
                </DropdownMenuItem>}
                {canAccessSettings && <DropdownMenuItem onClick={() => navigate('/configuracoes')} className="cursor-pointer">
                  <SettingsIcon className="size-4 mr-2" />
                  Configurações
                </DropdownMenuItem>}
                <DropdownMenuItem onClick={() => navigate('/ajuda')} className="cursor-pointer">
                  <HelpCircle className="size-4 mr-2" />
                  Central de Ajuda
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAboutOpen(true)} className="cursor-pointer">
                  <Info className="size-4 mr-2" />
                  Sobre
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="size-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className={cn(
        'min-w-0 w-full flex-1 px-3 py-4 pb-24 transition-[margin,width] duration-300 sm:px-4 sm:py-8 md:pb-8',
        sidebarCollapsed ? 'md:ml-20 md:w-[calc(100%-5rem)]' : 'md:ml-72 md:w-[calc(100%-18rem)]',
      )}>
        <Outlet />
      </main>

      <footer className={cn(
        'mt-auto min-w-0 border-t border-white/40 bg-card/85 backdrop-blur-2xl transition-[margin,width] duration-300 pb-16 md:pb-0',
        sidebarCollapsed ? 'md:ml-20 md:w-[calc(100%-5rem)]' : 'md:ml-72 md:w-[calc(100%-18rem)]',
      )}>
        <div className="w-full px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Identidade */}
            <div className="flex items-center gap-3 min-w-0">
              {settings?.logo ? (
                <img src={settings.logo} alt={businessName} className="h-8 object-contain flex-shrink-0 opacity-80" />
              ) : (
                <div className="flex items-center justify-center size-8 bg-primary text-primary-foreground rounded-md flex-shrink-0">
                  <Package2 className="size-4" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{businessName}</p>
                {settings?.businessTagline && (
                  <p className="text-xs text-muted-foreground truncate">{settings.businessTagline}</p>
                )}
              </div>
            </div>

            {/* Informações de contato */}
            {(settings?.businessPhone || settings?.businessEmail || settings?.businessAddress) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {settings.businessPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3" />
                    {settings.businessPhone}
                  </span>
                )}
                {settings.businessEmail && (
                  <span className="flex items-center gap-1">
                    <Mail className="size-3" />
                    {settings.businessEmail}
                  </span>
                )}
                {settings.businessAddress && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {settings.businessAddress}
                  </span>
                )}
              </div>
            )}

            {/* Links sociais + copyright */}
            <div className="flex flex-col items-start sm:items-end gap-2">
              <div className="flex items-center gap-2">
                {settings?.instagramUrl && (
                  <a
                    href={normalizeInstagramUrl(settings.instagramUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Instagram"
                    className="flex items-center justify-center size-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                  >
                    <AtSign className="size-3.5" />
                  </a>
                )}
                {settings?.whatsappPhone && (
                  <a
                    href={`https://wa.me/${normalizePhoneForWhatsApp(settings.whatsappPhone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="WhatsApp"
                    className="flex items-center justify-center size-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                  >
                    <MessageCircle className="size-3.5" />
                  </a>
                )}
                {settings?.businessEmail && (
                  <a
                    href={`mailto:${settings.businessEmail}`}
                    title={settings.businessEmail}
                    className="flex items-center justify-center size-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                  >
                    <Mail className="size-3.5" />
                  </a>
                )}
                {settings?.websiteUrl && (
                  <a
                    href={normalizeWebsiteUrl(settings.websiteUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Site"
                    className="flex items-center justify-center size-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                  >
                    <Globe className="size-3.5" />
                  </a>
                )}
              </div>
              <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="size-3" />
                    v{appVersion} · © {new Date().getFullYear()} {businessName}
                  </button>
                </DialogTrigger>
                <DialogContent size="md" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
                  <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
                    <DialogTitle className="flex items-center gap-2">
                      {settings?.logo ? (
                        <img src={settings.logo} alt={businessName} className="h-8 object-contain" />
                      ) : (
                        <div className="flex items-center justify-center size-8 bg-primary text-primary-foreground rounded-md">
                          <Package2 className="size-4" />
                        </div>
                      )}
                      {businessName}
                    </DialogTitle>
                  </DialogHeader>
                  <DialogBody className="p-4 sm:p-6 space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-muted-foreground">Versão</span>
                      <Badge variant="secondary" className="font-mono">{appVersion}</Badge>
                    </div>
                    {settings?.businessTagline && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-muted-foreground">Descrição</span>
                        <span>{settings.businessTagline}</span>
                      </div>
                    )}
                    {settings?.businessEmail && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-muted-foreground">Email</span>
                        <span>{settings.businessEmail}</span>
                      </div>
                    )}
                    {settings?.businessPhone && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-muted-foreground">Telefone</span>
                        <span>{settings.businessPhone}</span>
                      </div>
                    )}
                    {isDevEnvironment && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-muted-foreground">Ambiente</span>
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-400 font-mono">DEV</Badge>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      © {new Date().getFullYear()} {businessName}. Todos os direitos reservados.
                    </p>
                  </DialogBody>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </footer>

      {/* Navegação inferior — somente mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-bottom-nav flex border-t border-white/40 bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl md:hidden">
        {mobilePrimaryNav.map((item: any) => {
          const isActive = location.pathname === item.href;
          const badgeCount = item.badge ?? 0;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors min-w-0',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
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
                'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground',
                mobileMoreNav.some((item) => location.pathname === item.href) && 'text-primary',
              )}
            >
              <div className="relative flex items-center justify-center">
                <MoreHorizontal className="size-5 shrink-0" />
                {mobileMoreNav.some((item: any) => (item.badge ?? 0) > 0) && (
                  <span className="absolute -top-1 -right-1 size-2 rounded-full bg-emerald-600 ring-2 ring-card animate-pulse" />
                )}
              </div>
              <span className="truncate px-0.5 leading-tight">Mais</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" sideOffset={8} className="mb-2 w-56 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {mobileMoreNav.map((item: any) => {
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
            {canAccessSettings && <DropdownMenuItem asChild>
              <Link to="/configuracoes" className="flex cursor-pointer items-center gap-2">
                <SettingsIcon className="size-4" />
                Configurações
              </Link>
            </DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      {/* Copiloto de IA Interno & Modais Globais de Ação Rápida */}
      {canAccessAiCopilot && (
        <AiCopilotSheet
          open={aiCopilotOpen}
          onOpenChange={setAiCopilotOpen}
          onApplyOrderDraft={handleApplyAiOrderDraft}
        />
      )}
      <NewOrderDialog
        open={isNewOrderOpen || aiNewOrderModalOpen}
        onOpenChange={(open) => {
          setIsNewOrderOpen(open);
          setAiNewOrderModalOpen(open);
          if (!open) {
            setAiOrderDraft(null);
          }
        }}
        initialDraft={aiOrderDraft}
        hideTrigger={true}
      />
      <CustomerFormDialog
        open={isNewCustomerOpen}
        onOpenChange={setIsNewCustomerOpen}
        userId={user?.uid}
      />
    </div>
  );
}

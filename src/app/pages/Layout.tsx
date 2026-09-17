import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, Calendar, Users, Package2, Package, LogOut, Settings as SettingsIcon, BarChart3, FileText, ShoppingBag, Images, AtSign, Globe, Phone, Mail, MapPin, MessageCircle, ArrowLeftRight, UserCog, Info, PanelLeftClose, PanelLeftOpen, MoreHorizontal, HelpCircle, Coins, ExternalLink, Store, Palette, ChevronDown, ChevronRight, ClipboardList, Sparkles } from 'lucide-react';
import { cn } from '../components/ui/utils';
import { useAuth } from '../../contexts/AuthContext';
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
} from '../components/ui/dialog';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, userProfile, hasPermission } = useAuth();
  const { settings } = useUserSettings();

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

  // Lembrar a última tela acessada no sistema administrativo para retorno inteligente
  useEffect(() => {
    const p = location.pathname;
    if (
      p &&
      p !== "/" &&
      !p.startsWith("/login") &&
      !p.startsWith("/registrar") &&
      !p.startsWith("/recuperar-senha") &&
      !p.startsWith("/action") &&
      !p.startsWith("/catalogo") &&
      !p.startsWith("/loja") &&
      !p.startsWith("/catalog") &&
      !p.startsWith("/lojinha")
    ) {
      try {
        localStorage.setItem("luisices_last_admin_route", p + location.search);
      } catch {}
    }
  }, [location.pathname, location.search]);

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

  const allNavItems = [
    { name: 'Dashboard',       href: '/',           icon: LayoutDashboard, check: (p: any) => p.dashboard },
    { name: 'Agenda Semanal', href: '/agenda',      icon: Calendar,        check: (p: any) => p.orders?.view },
    { name: 'Clientes',       href: '/clientes',    icon: Users,           check: (p: any) => p.customers?.view },
    { name: 'Relatórios',     href: '/relatorios',  icon: BarChart3,       check: (p: any) => p.reports, allowUserRole: true },
    { name: 'Orçamentos',     href: '/orcamentos',  icon: FileText,        check: (p: any) => p.quotes?.view },
    { name: 'Produtos do Ateliê', href: '/produtos', icon: Package,        check: (p: any) => p.products?.view },
    { name: 'Estúdio IA',     href: '/estudio-ia',  icon: Sparkles,       adminOnly: true, check: () => false },
    { name: 'Precificação',   href: '/precificacao',icon: Coins,           check: (p: any) => p.pricing ?? false, allowUserRole: true },
    { name: 'Galeria',        href: '/galeria',     icon: Images,          check: (p: any) => p.gallery?.view },
    { name: 'Permutas',       href: '/permutas',    icon: ArrowLeftRight,  check: (p: any) => p.exchanges, allowUserRole: true },
    {
      name: 'Lojinha Online',
      icon: Store,
      check: (p: any) => Boolean(p.store || p.storeProducts?.view),
      allowUserRole: true,
      children: [
        {
          name: 'Pedidos Recebidos',
          href: '/pedidos-lojinha',
          icon: ClipboardList,
          check: (p: any) => Boolean(p.store || p.storeProducts?.view || p.orders?.view),
          allowUserRole: true,
        },
        {
          name: 'Produtos da Lojinha',
          href: '/produtos-lojinha',
          icon: ShoppingBag,
          check: (p: any) => Boolean(p.storeProducts?.view ?? p.store ?? false),
          allowUserRole: true,
        },
        {
          name: 'Aparência & Vitrine',
          href: '/personalizar-lojinha',
          icon: Palette,
          check: (p: any) => Boolean(p.store ?? false),
          allowUserRole: true,
        },
      ],
    },
    { name: 'E-mails',        href: '/emails',      icon: Mail,            check: (p: any) => p.emails ?? false },
    { name: 'Usuários',       href: '/usuarios',    icon: UserCog,         check: (p: any) => p.users?.view },
  ];

  const navigation = useMemo(() => {
    if (!userProfile) return [];
    return allNavItems
      .map(item => {
        if ((item as any).adminOnly) {
          return userProfile.role === 'admin' ? item : null;
        }
        if (item.children) {
          const allowedChildren = item.children.filter(child => {
            if ((child as any).adminOnly) return userProfile.role === 'admin';
            if (child.allowUserRole && (userProfile.role === 'user' || userProfile.role === 'admin')) return true;
            return hasPermission(child.check);
          });
          if (allowedChildren.length === 0) return null;
          return { ...item, children: allowedChildren };
        }
        if ((item as any).allowUserRole && (userProfile.role === 'user' || userProfile.role === 'admin')) return item;
        if (hasPermission(item.check)) return item;
        return null;
      })
      .filter(Boolean) as any[];
  }, [userProfile, hasPermission]);

  const orderedNav = useMemo(() => {
    const order = settings?.navOrder;
    if (!order || order.length === 0) return navigation;
    return [...navigation].sort((a, b) => {
      const aKey = a.href || a.name;
      const bKey = b.href || b.name;
      const ai = order.indexOf(aKey);
      const bi = order.indexOf(bKey);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [settings?.navOrder, navigation]);

  const flatNavForMobile = useMemo(() => {
    const list: { name: string; href: string; icon: any }[] = [];
    navigation.forEach(item => {
      if (item.children) {
        item.children.forEach((c: any) => list.push(c));
      } else if (item.href) {
        list.push(item);
      }
    });
    return list;
  }, [navigation]);

  const mobilePrimaryNav = flatNavForMobile.slice(0, 4);
  const mobileMoreNav = flatNavForMobile.slice(4);
  const canAccessSettings = userProfile?.role === 'user' || hasPermission((p) => p.settings);

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
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {orderedNav.map((item) => {
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
            return (
              <Link
                key={item.href}
                to={item.href}
                title={sidebarCollapsed ? item.name : undefined}
                className={cn(
                  'flex items-center border-l-4 px-5 py-2 text-xs sm:text-sm font-medium transition-colors',
                  sidebarCollapsed ? 'justify-center' : 'gap-3.5',
                  isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-transparent text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground',
                )}
              >
                <item.icon className="size-5 shrink-0" />
                <span className={cn('truncate transition-opacity duration-200', sidebarCollapsed ? 'hidden' : 'inline')}>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        {canAccessSettings && <Link
          to="/configuracoes"
          title={sidebarCollapsed ? 'Configurações' : undefined}
          className={cn(
            'mx-4 flex items-center rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors',
            location.pathname === '/configuracoes'
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground',
            sidebarCollapsed ? 'justify-center' : 'gap-3.5',
          )}
        >
          <SettingsIcon className="size-4.5 shrink-0" />
          <span className={sidebarCollapsed ? 'hidden' : 'inline'}>Configurações</span>
        </Link>}
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
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {hasLogo ? (
                <img
                  src={settings.logo}
                  alt={businessName}
                  className="h-9 object-contain flex-shrink-0"
                />
              ) : (
                <div className="flex items-center justify-center size-9 bg-primary text-primary-foreground rounded-lg flex-shrink-0">
                  <Package2 className="size-5" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-base sm:text-xl truncate">{businessName}</h1>
                  {isDevEnvironment && (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-400 font-mono text-[10px] px-1.5 py-0 h-5 hidden sm:inline-flex">
                      DEV
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {settings?.businessTagline || 'Sistema de Gestão de Pedidos'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <a
                href={`/catalogo?return=${encodeURIComponent(location.pathname + location.search)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  try {
                    localStorage.setItem("luisices_last_admin_route", location.pathname + location.search);
                    sessionStorage.setItem("luisices_last_admin_route", location.pathname + location.search);
                  } catch {}
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                title="Abrir Catálogo Online público em nova aba"
              >
                <Globe className="size-3.5" />
                <span>Catálogo</span>
                <ExternalLink className="size-3 opacity-60" />
              </a>
              <AdminTeamFilter variant="header" />
              <NotificationBell />
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/ajuda')}
                className="relative size-9 rounded-full text-muted-foreground hover:text-foreground"
                title="Central de Ajuda & Guia de Uso"
                aria-label="Central de Ajuda"
              >
                <HelpCircle className="size-4" />
              </Button>
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative size-10 rounded-full">
                  <Avatar>
                    <AvatarImage src={settings?.avatar} alt="Avatar" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
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
                    href={`/catalogo?return=${encodeURIComponent(location.pathname + location.search)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      try {
                        localStorage.setItem("luisices_last_admin_route", location.pathname + location.search);
                        sessionStorage.setItem("luisices_last_admin_route", location.pathname + location.search);
                      } catch {}
                    }}
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
        'min-w-0 w-full flex-1 px-3 py-4 pb-24 transition-[margin,width] duration-300 sm:px-4 sm:py-8 sm:pb-8',
        sidebarCollapsed ? 'md:ml-20 md:w-[calc(100%-5rem)]' : 'md:ml-72 md:w-[calc(100%-18rem)]',
      )}>
        <Outlet />
      </main>

      <footer className={cn(
        'mt-auto min-w-0 border-t border-white/40 bg-card/85 backdrop-blur-2xl transition-[margin,width] duration-300',
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
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
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
                  <div className="space-y-3 text-sm">
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
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </footer>

      {/* Navegação inferior — somente mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-white/40 bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl sm:hidden">
        {mobilePrimaryNav.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors min-w-0',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="size-5 shrink-0" />
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
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground',
                mobileMoreNav.some((item) => location.pathname === item.href) && 'text-primary',
              )}
            >
              <MoreHorizontal className="size-5 shrink-0" />
              <span className="truncate px-0.5 leading-tight">Mais</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" sideOffset={8} className="mb-2 w-52">
            {mobileMoreNav.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link to={item.href} className="flex cursor-pointer items-center gap-2">
                  <item.icon className="size-4" />
                  {item.name}
                </Link>
              </DropdownMenuItem>
            ))}
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
    </div>
  );
}

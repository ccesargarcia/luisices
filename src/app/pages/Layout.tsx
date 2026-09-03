import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, Calendar, Users, Package2, LogOut, Settings as SettingsIcon, BarChart3, FileText, ShoppingBag, Images, AtSign, Globe, Phone, Mail, MapPin, MessageCircle, ArrowLeftRight, UserCog, Info, PanelLeftClose, PanelLeftOpen, MoreHorizontal } from 'lucide-react';
import { cn } from '../components/ui/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettings } from '../../hooks/useUserSettings';
import { applyColorTheme } from '../utils/colorThemes';
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

  const allNavItems = [
    { name: 'Dashboard',       href: '/',           icon: LayoutDashboard, check: (p: any) => p.dashboard },
    { name: 'Agenda Semanal', href: '/agenda',      icon: Calendar,        check: (p: any) => p.orders?.view },
    { name: 'Clientes',       href: '/clientes',    icon: Users,           check: (p: any) => p.customers?.view },
    { name: 'Relatórios',     href: '/relatorios',  icon: BarChart3,       check: (p: any) => p.reports },
    { name: 'Orçamentos',     href: '/orcamentos',  icon: FileText,        check: (p: any) => p.quotes?.view },
    { name: 'Produtos',       href: '/produtos',    icon: ShoppingBag,     check: (p: any) => p.products?.view },
    { name: 'Galeria',        href: '/galeria',     icon: Images,          check: (p: any) => p.gallery?.view },
    { name: 'Permutas',       href: '/permutas',    icon: ArrowLeftRight,  check: (p: any) => p.exchanges },
    { name: 'Usuários',       href: '/usuarios',    icon: UserCog,         check: (p: any) => p.users?.view },
  ];

  const navigation = useMemo(() => {
    if (!userProfile) return [];
    return allNavItems.filter(item => hasPermission(item.check));
  }, [userProfile, hasPermission]);

  const orderedNav = useMemo(() => {
    const order = settings?.navOrder;
    if (!order || order.length === 0) return navigation;
    return [...navigation].sort((a, b) => {
      const ai = order.indexOf(a.href);
      const bi = order.indexOf(b.href);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [settings?.navOrder]);

  const mobilePrimaryNav = orderedNav.slice(0, 4);
  const mobileMoreNav = orderedNav.slice(4);
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
    <div className="min-h-screen overflow-x-hidden bg-transparent flex flex-col">
      <aside className={cn(
        'hidden md:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-white/40 bg-sidebar/70 py-8 shadow-[0_8px_32px_rgb(123_84_85_/_8%)] backdrop-blur-2xl transition-[width] duration-300',
        sidebarCollapsed ? 'w-20' : 'w-72',
      )}>
        <div className={cn('mb-8 flex items-center px-6', sidebarCollapsed ? 'justify-center' : 'gap-4')}>
          {hasLogo ? (
            <img src={settings.logo} alt={businessName} className={cn('h-12 w-12 shrink-0 rounded-full border border-white/40 object-contain shadow-sm', sidebarCollapsed && 'h-10 w-10')} />
          ) : (
            <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-full border border-white/40 bg-primary text-primary-foreground shadow-sm', sidebarCollapsed && 'size-10')}>
              <Package2 className="size-6" />
            </div>
          )}
          <div className={cn('min-w-0 overflow-hidden transition-opacity duration-200', sidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100')}>
            <h2 className="truncate text-lg font-bold tracking-tight text-primary">{businessName}</h2>
            <p className="truncate text-sm text-muted-foreground">{settings?.businessTagline || 'Sistema de Gestão'}</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-2">
          {orderedNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                title={sidebarCollapsed ? item.name : undefined}
                className={cn(
                  'flex items-center border-l-4 px-6 py-3 text-sm font-medium transition-colors',
                  sidebarCollapsed ? 'justify-center' : 'gap-4',
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
            'mx-6 flex items-center rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground',
            sidebarCollapsed ? 'justify-center' : 'gap-4',
          )}
        >
          <SettingsIcon className="size-5" />
          <span className={sidebarCollapsed ? 'hidden' : 'inline'}>Configurações</span>
        </Link>}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          className="mx-auto mt-3 text-muted-foreground hover:text-primary"
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
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {settings?.businessTagline || 'Sistema de Gestão de Pedidos'}
                  </p>
                  {settings?.instagramUrl && (
                    <a
                      href={settings.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Instagram"
                      className="text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                    >
                      <AtSign className="size-3" />
                    </a>
                  )}
                  {settings?.websiteUrl && (
                    <a
                      href={settings.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Site"
                      className="text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                    >
                      <Globe className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
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
                {canAccessSettings && <DropdownMenuItem onClick={() => navigate('/configuracoes')} className="cursor-pointer">
                  <SettingsIcon className="size-4 mr-2" />
                  Configurações
                </DropdownMenuItem>}
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

      <nav className="hidden">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex overflow-x-auto scrollbar-none">
            {orderedNav.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                  )}
                >
                  <item.icon className="size-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

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
                    href={settings.instagramUrl}
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
                    href={`https://wa.me/${settings.whatsappPhone.replace(/\D/g, '')}`}
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
                    href={settings.websiteUrl}
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
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-white/40 bg-card/90 backdrop-blur-2xl sm:hidden">
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
